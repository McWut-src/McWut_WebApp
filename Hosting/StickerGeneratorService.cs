using System.Text;
using FamilyVault.Files.Contracts;
using FamilyVault.Files.Data;
using FamilyVault.Files.Security;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace McWutWebApp.Hosting;

public sealed record CustomStickerView(Guid Id, string Slug, string Label, bool CanDelete);

public sealed class StickerGeneratorService(
    ApplicationDbContext db,
    IObjectStore store,
    IUploadSessionService uploads,
    AdminStickerKeyService adminKeyService,
    GoogleGeminiClient geminiClient,
    OpenRouterClient openRouter,
    IMemoryCache cache,
    TimeProvider time)
{
    private const string FreeModelsCacheKey = "openrouter-sticker-free-models";

    public async Task<IReadOnlyList<CustomStickerView>> ListAsync(
        Guid userId,
        bool isAdmin,
        CancellationToken cancellationToken)
    {
        var rows = await db.StoredFiles.AsNoTracking()
            .Where(f => f.IsChatOnly
                        && f.ContentType == DirectMessageRules.CustomStickerContentType
                        && f.DeletedAt == null
                        && f.Status == FileStatus.Ready)
            .ToListAsync(cancellationToken);

        return rows
            .OrderByDescending(f => f.CreatedAt)
            .Select(f => new CustomStickerView(
                f.Id,
                "custom-" + f.Id.ToString("N"),
                Path.GetFileNameWithoutExtension(f.OriginalFileName),
                f.OwnerUserId == userId || isAdmin))
            .ToList();
    }

    public async Task<CustomStickerView> GenerateAsync(
        Guid userId,
        string? themeId,
        string? prompt,
        CancellationToken cancellationToken)
    {
        var theme = StickerGeneratorRules.NormalizeTheme(themeId);
        var cleanPrompt = StickerGeneratorRules.NormalizePrompt(prompt);
        var (apiKey, provider) = await adminKeyService.RequireKeyAsync(cancellationToken);

        var messages = StickerGeneratorRules.BuildMessages(theme, cleanPrompt);
        string? cleanSvg = null;

        if (string.Equals(provider, "Google Gemini", StringComparison.OrdinalIgnoreCase))
        {
            try
            {
                var raw = await geminiClient.GenerateStickerSvgAsync(apiKey, messages, cancellationToken);
                cleanSvg = StickerGeneratorRules.SanitizeSvg(raw);
            }
            catch (GoogleGeminiRejectedException ex)
            {
                throw new DirectMessageValidationException(ex.Message);
            }
        }
        else
        {
            // OpenRouter fallback provider
            var candidates = await GetCandidateFreeModelsAsync(apiKey, cancellationToken);
            if (candidates.Count == 0)
            {
                throw new DirectMessageValidationException("No free AI models are currently available on OpenRouter.");
            }

            Exception? lastError = null;
            foreach (var candidate in candidates.Take(3))
            {
                try
                {
                    var sb = new StringBuilder();
                    await foreach (var delta in openRouter.StreamAsync(apiKey, candidate.Id, messages, cancellationToken))
                    {
                        sb.Append(delta);
                    }

                    cleanSvg = StickerGeneratorRules.SanitizeSvg(sb.ToString());
                    break;
                }
                catch (Exception ex) when (ex is OpenRouterRejectedException or DirectMessageValidationException)
                {
                    lastError = ex;
                }
            }

            if (string.IsNullOrEmpty(cleanSvg))
            {
                if (lastError is not null)
                {
                    throw lastError;
                }

                throw new DirectMessageValidationException("Could not generate the sticker right now. Try again in a moment.");
            }
        }

        var label = $"{cleanPrompt} · {theme.Label}";
        var fileName = $"{label}.svg";
        var bytes = Encoding.UTF8.GetBytes(cleanSvg);

        var session = await uploads.BeginAsync(
            new BeginUploadRequest(
                userId,
                fileName,
                DirectMessageRules.CustomStickerContentType,
                bytes.Length,
                null,
                Retention.Forever(),
                null,
                IsChatOnly: true),
            cancellationToken);

        await using (var stream = new MemoryStream(bytes))
        {
            await uploads.PutAsync(session.SessionId, userId, stream, cancellationToken);
        }

        var stored = await uploads.CompleteAsync(session.SessionId, userId, cancellationToken);
        return new CustomStickerView(
            stored.Id,
            "custom-" + stored.Id.ToString("N"),
            label,
            CanDelete: true);
    }

    public async Task<Stream> OpenSvgAsync(Guid stickerId, CancellationToken cancellationToken)
    {
        var row = await db.StoredFiles.AsNoTracking()
            .FirstOrDefaultAsync(
                f => f.Id == stickerId
                     && f.IsChatOnly
                     && f.ContentType == DirectMessageRules.CustomStickerContentType
                     && f.DeletedAt == null
                     && f.Status == FileStatus.Ready,
                cancellationToken)
            ?? throw new VaultNotFoundException();

        return await store.OpenReadAsync(row.StorageKey, range: null, cancellationToken);
    }

    public async Task DeleteAsync(Guid userId, bool isAdmin, Guid stickerId, CancellationToken cancellationToken)
    {
        var row = await db.StoredFiles
            .FirstOrDefaultAsync(
                f => f.Id == stickerId
                     && f.IsChatOnly
                     && f.ContentType == DirectMessageRules.CustomStickerContentType
                     && f.DeletedAt == null,
                cancellationToken)
            ?? throw new VaultNotFoundException();

        if (row.OwnerUserId != userId && !isAdmin)
        {
            throw new VaultNotFoundException();
        }

        row.DeletedAt = time.GetUtcNow();
        await db.SaveChangesAsync(cancellationToken);
    }

    private async Task<IReadOnlyList<OpenRouterListedModel>> GetCandidateFreeModelsAsync(
        string apiKey,
        CancellationToken cancellationToken)
    {
        if (cache.TryGetValue(FreeModelsCacheKey, out IReadOnlyList<OpenRouterListedModel>? cached)
            && cached is { Count: > 0 })
        {
            return cached;
        }

        var models = await openRouter.ListFreeAsync(apiKey, cancellationToken);
        var ranked = models
            .OrderByDescending(ScoreModelForSvg)
            .ThenByDescending(m => m.ContextLength ?? 0)
            .ToList();

        if (ranked.Count > 0)
        {
            cache.Set(FreeModelsCacheKey, (IReadOnlyList<OpenRouterListedModel>)ranked, TimeSpan.FromMinutes(15));
        }

        return ranked;
    }

    private static int ScoreModelForSvg(OpenRouterListedModel model)
    {
        var id = model.Id.ToLowerInvariant();
        if (id.Contains("gemini-2.5") || id.Contains("gemini-2.0")) return 100;
        if (id.Contains("qwen") && (id.Contains("coder") || id.Contains("72b") || id.Contains("32b") || id.Contains("2.5") || id.Contains("3"))) return 95;
        if (id.Contains("deepseek") && (id.Contains("chat") || id.Contains("v3") || id.Contains("r1"))) return 90;
        if (id.Contains("claude")) return 90;
        if (id.Contains("gpt-4") || id.Contains("o3") || id.Contains("o4")) return 88;
        if (id.Contains("llama-3.3") || id.Contains("llama-3.1-70b")) return 85;
        if (id.Contains("mistral") || id.Contains("codestral")) return 80;
        if (id.Contains("gemma-3") || id.Contains("gemma-2-27b")) return 75;
        return 50;
    }
}
