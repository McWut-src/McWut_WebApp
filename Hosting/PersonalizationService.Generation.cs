using System.Text;
using FamilyVault.Files.Contracts;
using FamilyVault.Files.Security;
using Microsoft.Extensions.Caching.Memory;

namespace McWutWebApp.Hosting;

public sealed partial class PersonalizationService
{
    public async Task<CustomSvgItemView> GenerateCustomSvgAsync(
        Guid userId,
        string? kind,
        string? themeId,
        string? prompt,
        CancellationToken cancellationToken)
    {
        var cleanKind = (kind ?? "badge").Trim().ToLowerInvariant();
        if (cleanKind is not ("badge" or "motif" or "tile"))
        {
            throw new DirectMessageValidationException("Choose badge, motif, or tile.");
        }

        var theme = StickerGeneratorRules.NormalizeTheme(themeId);
        var cleanPrompt = StickerGeneratorRules.NormalizePrompt(prompt);
        var (apiKey, provider) = await adminKeyService.RequireKeyAsync(cancellationToken);

        var (messages, viewBox, contentType) = cleanKind switch
        {
            "badge" => (StickerGeneratorRules.BuildBadgeMessages(theme, cleanPrompt), "0 0 64 64", BadgeContentType),
            "motif" => (StickerGeneratorRules.BuildHeaderMotifMessages(theme, cleanPrompt), "0 0 120 56", MotifContentType),
            _ => (StickerGeneratorRules.BuildBackgroundTileMessages(theme, cleanPrompt), "0 0 80 80", TileContentType)
        };

        string? cleanSvg = null;
        if (string.Equals(provider, "Google Gemini", StringComparison.OrdinalIgnoreCase))
        {
            try
            {
                var raw = await geminiClient.GenerateStickerSvgAsync(apiKey, messages, cancellationToken);
                cleanSvg = StickerGeneratorRules.SanitizeSvg(
                    raw,
                    viewBox,
                    StickerGeneratorRules.MaxSmallSvgBytes,
                    StickerGeneratorRules.MaxSmallSvgElements);
            }
            catch (GoogleGeminiRejectedException ex)
            {
                throw new DirectMessageValidationException(ex.Message);
            }
        }
        else
        {
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

                    cleanSvg = StickerGeneratorRules.SanitizeSvg(
                        sb.ToString(),
                        viewBox,
                        StickerGeneratorRules.MaxSmallSvgBytes,
                        StickerGeneratorRules.MaxSmallSvgElements);
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

                throw new DirectMessageValidationException("Could not generate the SVG right now. Try again in a moment.");
            }
        }

        var label = $"{cleanPrompt} · {theme.Label}";
        var fileName = $"{label}.svg";
        var bytes = Encoding.UTF8.GetBytes(cleanSvg);

        var session = await uploads.BeginAsync(
            new BeginUploadRequest(
                userId,
                fileName,
                contentType,
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
        var item = new CustomSvgItemView(
            stored.Id,
            cleanKind,
            "custom:" + stored.Id.ToString("N"),
            label,
            $"/api/personalization/svg/{stored.Id:N}.svg");

        // Auto-apply the newly generated item to the user's profile
        var current = await GetSettingsAsync(userId, cancellationToken);
        var updated = cleanKind switch
        {
            "badge" => current with { HeaderBadge = item.Value },
            "motif" => current with { HeaderMotif = item.Value },
            _ => current with { BackgroundTile = item.Value }
        };
        await SaveSettingsAsync(userId, updated, cancellationToken);

        return item;
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
            .OrderByDescending(m => m.Id.Contains("gemini", StringComparison.OrdinalIgnoreCase) ? 100 : 50)
            .ThenByDescending(m => m.ContextLength ?? 0)
            .ToList();

        if (ranked.Count > 0)
        {
            cache.Set(FreeModelsCacheKey, (IReadOnlyList<OpenRouterListedModel>)ranked, TimeSpan.FromMinutes(15));
        }

        return ranked;
    }
}
