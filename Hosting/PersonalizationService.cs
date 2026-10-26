using System.Text;
using System.Text.Json;
using FamilyVault.Files.Contracts;
using FamilyVault.Files.Data;
using FamilyVault.Files.Data.Entities;
using FamilyVault.Files.Security;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace McWutWebApp.Hosting;

public sealed record PersonalizationSettings(
    string StatusTag = "",
    string HeaderBadge = "none",
    string HeaderMotif = "none",
    string BackgroundTile = "none",
    string ChimeTheme = "classic");

public sealed record CustomSvgItemView(
    Guid Id,
    string Kind,
    string Value,
    string Label,
    string Url);

public sealed record PresetOption(string Value, string Label, string Url);

public sealed record PaletteSwatch(string Hex, string Label);

public sealed record TeenColorSwatch(string Hex, string Label);

public sealed record PersonalizationStateView(
    PersonalizationSettings Settings,
    IReadOnlyList<CustomSvgItemView> CustomItems,
    string? BadgeUrl,
    string? MotifUrl,
    string? TileUrl);

public sealed class PersonalizationService(
    ApplicationDbContext db,
    IObjectStore store,
    IUploadSessionService uploads,
    AdminStickerKeyService adminKeyService,
    GoogleGeminiClient geminiClient,
    OpenRouterClient openRouter,
    IMemoryCache cache,
    TimeProvider time)
{
    public const string BadgeContentType = "image/x-mcwut-badge+svg";
    public const string MotifContentType = "image/x-mcwut-motif+svg";
    public const string TileContentType = "image/x-mcwut-tile+svg";

    public const string LegacyBadgeContentType = "image/svg+xml;badge=1";
    public const string LegacyMotifContentType = "image/svg+xml;motif=1";
    public const string LegacyTileContentType = "image/svg+xml;bgtile=1";

    private static readonly byte[] FlairXorMask =
        new Guid("464c4149-5253-4554-5449-4e4753563130").ToByteArray();

    private const string FreeModelsCacheKey = "openrouter-sticker-free-models";

    public static readonly IReadOnlyList<PaletteSwatch> Swatches =
    [
        new("#0b1f3a", "Executive Navy"),
        new("#334155", "Classic Slate"),
        new("#1e3a8a", "Oxford Blue"),
        new("#065f46", "Forest Green"),
        new("#881337", "Deep Bordeaux"),
        new("#b45309", "Rich Cognac"),
        new("#581c87", "Royal Plum"),
        new("#78350f", "Warm Espresso")
    ];

    public static readonly IReadOnlyList<TeenColorSwatch> TeenSwatches =
        Swatches.Select(s => new TeenColorSwatch(s.Hex, s.Label)).ToList();

    public static readonly IReadOnlyList<(string Id, string Label)> ChimeThemes =
    [
        ("classic", "Classic Studio Chime"),
        ("soft-bell", "Soft Crystal Bell"),
        ("acoustic-wood", "Warm Acoustic Marimba"),
        ("executive-pulse", "Executive Discrete Pulse"),
        ("minimal-tap", "Minimalist Studio Tick")
    ];

    public static readonly IReadOnlyList<PresetOption> BadgePresets =
    [
        new("none", "None", ""),
        new("preset:crest-shield", "Executive Crest", "/api/personalization/preset/badge/crest-shield.svg"),
        new("preset:compass-star", "Compass Star", "/api/personalization/preset/badge/compass-star.svg"),
        new("preset:quill-pen", "Quill & Ink", "/api/personalization/preset/badge/quill-pen.svg"),
        new("preset:anchor-seal", "Sovereign Anchor", "/api/personalization/preset/badge/anchor-seal.svg"),
        new("preset:crown-regal", "Royal Coronet", "/api/personalization/preset/badge/crown-regal.svg"),
        new("preset:monogram-seal", "Signet Monogram", "/api/personalization/preset/badge/monogram-seal.svg"),
        new("preset:summit-peak", "Alpine Summit", "/api/personalization/preset/badge/summit-peak.svg"),
        new("preset:geometric-gem", "Diamond Facet", "/api/personalization/preset/badge/geometric-gem.svg")
    ];

    public static readonly IReadOnlyList<PresetOption> MotifPresets =
    [
        new("none", "Solid Bar (Default)", ""),
        new("preset:metro-grid", "Architectural Grid", "/api/personalization/preset/motif/metro-grid.svg"),
        new("preset:horizon-waves", "Serene Waves", "/api/personalization/preset/motif/horizon-waves.svg"),
        new("preset:summit-ridge", "Alpine Horizon", "/api/personalization/preset/motif/summit-ridge.svg"),
        new("preset:herringbone", "Herringbone Weave", "/api/personalization/preset/motif/herringbone.svg"),
        new("preset:constellation", "Night Constellation", "/api/personalization/preset/motif/constellation.svg")
    ];

    public static readonly IReadOnlyList<PresetOption> TilePresets =
    [
        new("none", "Clean Solid (Default)", ""),
        new("preset:linen-weave", "Fine Linen Texture", "/api/personalization/preset/tile/linen-weave.svg"),
        new("preset:architect-dots", "Architectural Dot Matrix", "/api/personalization/preset/tile/architect-dots.svg"),
        new("preset:diamond-lattice", "Diamond Lattice", "/api/personalization/preset/tile/diamond-lattice.svg"),
        new("preset:isometric-cubes", "Isometric Tessellation", "/api/personalization/preset/tile/isometric-cubes.svg"),
        new("preset:art-deco", "Art Deco Geometry", "/api/personalization/preset/tile/art-deco.svg"),
        new("preset:botanical-leaf", "Botanical Laurel", "/api/personalization/preset/tile/botanical-leaf.svg")
    ];

    public static Guid DeriveFlairKeyId(Guid userId)
    {
        var bytes = userId.ToByteArray();
        for (var i = 0; i < 16; i++)
        {
            bytes[i] ^= FlairXorMask[i];
        }

        return new Guid(bytes);
    }

    public async Task<PersonalizationSettings> GetSettingsAsync(Guid userId, CancellationToken cancellationToken)
    {
        var cacheKey = "user-flair-" + userId.ToString("N");
        if (cache.TryGetValue(cacheKey, out PersonalizationSettings? cached) && cached is not null)
        {
            return cached;
        }

        var row = await db.UserPersonalizations.AsNoTracking()
            .FirstOrDefaultAsync(x => x.UserId == userId, cancellationToken);

        PersonalizationSettings settings;
        if (row is not null)
        {
            settings = NormalizeSettings(new PersonalizationSettings(
                row.StatusTag,
                row.HeaderBadge,
                row.HeaderMotif,
                row.BackgroundTile,
                row.ChimeTheme));
        }
        else
        {
            // Backwards compatibility: check legacy OpenRouterKeys row
            var legacyId = DeriveFlairKeyId(userId);
            var legacyRow = await db.OpenRouterKeys.AsNoTracking()
                .FirstOrDefaultAsync(x => x.UserId == legacyId, cancellationToken);
            if (legacyRow is not null && !string.IsNullOrWhiteSpace(legacyRow.KeyCipher))
            {
                try
                {
                    var parsed = JsonSerializer.Deserialize<PersonalizationSettings>(legacyRow.KeyCipher);
                    settings = parsed is not null ? NormalizeSettings(parsed) : new();
                }
                catch (JsonException)
                {
                    settings = new();
                }
            }
            else
            {
                settings = new();
            }
        }

        cache.Set(cacheKey, settings, TimeSpan.FromHours(12));
        return settings;
    }

    public async Task<PersonalizationStateView> GetStateAsync(Guid userId, CancellationToken cancellationToken)
    {
        var settings = await GetSettingsAsync(userId, cancellationToken);
        var customs = await ListCustomItemsAsync(userId, cancellationToken);
        return new PersonalizationStateView(
            settings,
            customs,
            ResolveBadgeUrl(settings.HeaderBadge),
            ResolveMotifUrl(settings.HeaderMotif),
            ResolveTileUrl(settings.BackgroundTile));
    }

    public async Task<PersonalizationStateView> SaveSettingsAsync(
        Guid userId,
        PersonalizationSettings input,
        CancellationToken cancellationToken)
    {
        var clean = NormalizeSettings(input);
        var now = time.GetUtcNow();
        var row = await db.UserPersonalizations.FirstOrDefaultAsync(x => x.UserId == userId, cancellationToken);
        if (row is null)
        {
            row = new UserPersonalizationEntity
            {
                UserId = userId,
                StatusTag = clean.StatusTag,
                HeaderBadge = clean.HeaderBadge,
                HeaderMotif = clean.HeaderMotif,
                BackgroundTile = clean.BackgroundTile,
                ChimeTheme = clean.ChimeTheme,
                UpdatedAt = now
            };
            db.UserPersonalizations.Add(row);
        }
        else
        {
            row.StatusTag = clean.StatusTag;
            row.HeaderBadge = clean.HeaderBadge;
            row.HeaderMotif = clean.HeaderMotif;
            row.BackgroundTile = clean.BackgroundTile;
            row.ChimeTheme = clean.ChimeTheme;
            row.UpdatedAt = now;
        }

        // Clean up legacy OpenRouterKeys entry if it exists
        var legacyId = DeriveFlairKeyId(userId);
        var legacyRow = await db.OpenRouterKeys.FirstOrDefaultAsync(x => x.UserId == legacyId, cancellationToken);
        if (legacyRow is not null)
        {
            db.OpenRouterKeys.Remove(legacyRow);
        }

        await db.SaveChangesAsync(cancellationToken);

        var cacheKey = "user-flair-" + userId.ToString("N");
        cache.Set(cacheKey, clean, TimeSpan.FromHours(12));

        var customs = await ListCustomItemsAsync(userId, cancellationToken);
        return new PersonalizationStateView(
            clean,
            customs,
            ResolveBadgeUrl(clean.HeaderBadge),
            ResolveMotifUrl(clean.HeaderMotif),
            ResolveTileUrl(clean.BackgroundTile));
    }

    public async Task<IReadOnlyList<CustomSvgItemView>> ListCustomItemsAsync(
        Guid userId,
        CancellationToken cancellationToken)
    {
        var rows = await db.StoredFiles.AsNoTracking()
            .Where(f => f.OwnerUserId == userId
                        && f.IsChatOnly
                        && (f.ContentType == BadgeContentType
                            || f.ContentType == MotifContentType
                            || f.ContentType == TileContentType
                            || f.ContentType == LegacyBadgeContentType
                            || f.ContentType == LegacyMotifContentType
                            || f.ContentType == LegacyTileContentType
                            || (f.ContentType == "image/svg+xml" && f.OriginalFileName.EndsWith(".svg")))
                        && f.DeletedAt == null
                        && f.Status == FileStatus.Ready)
            .ToListAsync(cancellationToken);

        return rows
            .OrderByDescending(f => f.CreatedAt)
            .Select(f =>
            {
                var kind = f.ContentType switch
                {
                    BadgeContentType or LegacyBadgeContentType => "badge",
                    MotifContentType or LegacyMotifContentType => "motif",
                    TileContentType or LegacyTileContentType => "tile",
                    _ => (f.OriginalFileName.Contains("Motif", StringComparison.OrdinalIgnoreCase)
                          ? "motif"
                          : (f.OriginalFileName.Contains("Tile", StringComparison.OrdinalIgnoreCase)
                             ? "tile"
                             : "badge"))
                };
                return new CustomSvgItemView(
                    f.Id,
                    kind,
                    "custom:" + f.Id.ToString("N"),
                    Path.GetFileNameWithoutExtension(f.OriginalFileName),
                    $"/api/personalization/svg/{f.Id:N}.svg");
            })
            .ToList();
    }

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

    public async Task<Stream> OpenCustomSvgAsync(Guid id, CancellationToken cancellationToken)
    {
        var row = await db.StoredFiles.AsNoTracking()
            .FirstOrDefaultAsync(
                f => f.Id == id
                     && f.IsChatOnly
                     && (f.ContentType == BadgeContentType
                         || f.ContentType == MotifContentType
                         || f.ContentType == TileContentType
                         || f.ContentType == LegacyBadgeContentType
                         || f.ContentType == LegacyMotifContentType
                         || f.ContentType == LegacyTileContentType
                         || (f.ContentType == "image/svg+xml" && f.OriginalFileName.EndsWith(".svg")))
                     && f.DeletedAt == null
                     && f.Status == FileStatus.Ready,
                cancellationToken)
            ?? throw new VaultNotFoundException();

        return await store.OpenReadAsync(row.StorageKey, range: null, cancellationToken);
    }

    public async Task DeleteCustomSvgAsync(Guid userId, bool isAdmin, Guid id, CancellationToken cancellationToken)
    {
        var row = await db.StoredFiles
            .FirstOrDefaultAsync(
                f => f.Id == id
                     && f.IsChatOnly
                     && (f.ContentType == BadgeContentType
                         || f.ContentType == MotifContentType
                         || f.ContentType == TileContentType
                         || f.ContentType == LegacyBadgeContentType
                         || f.ContentType == LegacyMotifContentType
                         || f.ContentType == LegacyTileContentType
                         || (f.ContentType == "image/svg+xml" && f.OriginalFileName.EndsWith(".svg")))
                     && f.DeletedAt == null,
                cancellationToken)
            ?? throw new VaultNotFoundException();

        if (row.OwnerUserId != userId && !isAdmin)
        {
            throw new VaultNotFoundException();
        }

        row.DeletedAt = time.GetUtcNow();
        await db.SaveChangesAsync(cancellationToken);

        var customRef = "custom:" + id.ToString("N");
        var current = await GetSettingsAsync(userId, cancellationToken);
        var changed = false;
        if (string.Equals(current.HeaderBadge, customRef, StringComparison.OrdinalIgnoreCase))
        {
            current = current with { HeaderBadge = "none" };
            changed = true;
        }
        if (string.Equals(current.HeaderMotif, customRef, StringComparison.OrdinalIgnoreCase))
        {
            current = current with { HeaderMotif = "none" };
            changed = true;
        }
        if (string.Equals(current.BackgroundTile, customRef, StringComparison.OrdinalIgnoreCase))
        {
            current = current with { BackgroundTile = "none" };
            changed = true;
        }
        if (changed)
        {
            await SaveSettingsAsync(userId, current, cancellationToken);
        }
    }

    public static string? ResolveBadgeUrl(string? value)
    {
        if (string.IsNullOrWhiteSpace(value) || value.Equals("none", StringComparison.OrdinalIgnoreCase))
        {
            return null;
        }

        foreach (var preset in BadgePresets)
        {
            if (string.Equals(preset.Value, value, StringComparison.OrdinalIgnoreCase) && !string.IsNullOrEmpty(preset.Url))
            {
                return preset.Url;
            }
        }

        if (value.StartsWith("preset:", StringComparison.OrdinalIgnoreCase))
        {
            var slug = value["preset:".Length..];
            if (GetPresetSvg("badge", slug) is not null)
            {
                return $"/api/personalization/preset/badge/{slug}.svg";
            }
        }

        if (value.StartsWith("custom:", StringComparison.OrdinalIgnoreCase)
            && Guid.TryParse(value["custom:".Length..], out var id))
        {
            return $"/api/personalization/svg/{id:N}.svg";
        }

        return null;
    }

    public static string? ResolveMotifUrl(string? value)
    {
        if (string.IsNullOrWhiteSpace(value) || value.Equals("none", StringComparison.OrdinalIgnoreCase))
        {
            return null;
        }

        foreach (var preset in MotifPresets)
        {
            if (string.Equals(preset.Value, value, StringComparison.OrdinalIgnoreCase) && !string.IsNullOrEmpty(preset.Url))
            {
                return preset.Url;
            }
        }

        if (value.StartsWith("preset:", StringComparison.OrdinalIgnoreCase))
        {
            var slug = value["preset:".Length..];
            if (GetPresetSvg("motif", slug) is not null)
            {
                return $"/api/personalization/preset/motif/{slug}.svg";
            }
        }

        if (value.StartsWith("custom:", StringComparison.OrdinalIgnoreCase)
            && Guid.TryParse(value["custom:".Length..], out var id))
        {
            return $"/api/personalization/svg/{id:N}.svg";
        }

        return null;
    }

    public static string? ResolveTileUrl(string? value)
    {
        if (string.IsNullOrWhiteSpace(value) || value.Equals("none", StringComparison.OrdinalIgnoreCase))
        {
            return null;
        }

        foreach (var preset in TilePresets)
        {
            if (string.Equals(preset.Value, value, StringComparison.OrdinalIgnoreCase) && !string.IsNullOrEmpty(preset.Url))
            {
                return preset.Url;
            }
        }

        if (value.StartsWith("preset:", StringComparison.OrdinalIgnoreCase))
        {
            var slug = value["preset:".Length..];
            if (GetPresetSvg("tile", slug) is not null)
            {
                return $"/api/personalization/preset/tile/{slug}.svg";
            }
        }

        if (value.StartsWith("custom:", StringComparison.OrdinalIgnoreCase)
            && Guid.TryParse(value["custom:".Length..], out var id))
        {
            return $"/api/personalization/svg/{id:N}.svg";
        }

        return null;
    }

    public static string? GetPresetSvg(string kind, string slug)
    {
        var key = $"{kind.ToLowerInvariant()}:{slug.ToLowerInvariant()}";
        return key switch
        {
            // --- PROFESSIONAL BADGES (64x64) ---
            "badge:crest-shield" => """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="6" y="6" width="52" height="52" rx="12" fill="#0b1f3a" stroke="#d97706" stroke-width="2.5"/><path d="M32 14c8 6 15 6 15 15 0 11-7 18-15 21-8-3-15-10-15-21 0-9 7-9 15-15z" fill="#1e3a8a" stroke="#f59e0b" stroke-width="2"/><polygon points="32,22 34.5,28 41,28.5 36,33 37.5,39 32,35.5 26.5,39 28,33 23,28.5 29.5,28" fill="#facc15"/></svg>""",
            "badge:compass-star" => """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="25" fill="#0f172a" stroke="#94a3b8" stroke-width="2.5"/><circle cx="32" cy="32" r="20" fill="none" stroke="#475569" stroke-width="1.5" stroke-dasharray="2 3"/><polygon points="32,13 36,28 32,32" fill="#f1f5f9"/><polygon points="32,13 28,28 32,32" fill="#94a3b8"/><polygon points="51,32 36,36 32,32" fill="#f1f5f9"/><polygon points="51,32 36,28 32,32" fill="#94a3b8"/><polygon points="32,51 28,36 32,32" fill="#f1f5f9"/><polygon points="32,51 36,36 32,32" fill="#94a3b8"/><polygon points="13,32 28,28 32,32" fill="#f1f5f9"/><polygon points="13,32 28,36 32,32" fill="#94a3b8"/><circle cx="32" cy="32" r="3" fill="#0284c7"/></svg>""",
            "badge:quill-pen" => """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="6" y="6" width="52" height="52" rx="12" fill="#1f2937" stroke="#d97706" stroke-width="2"/><path d="M44 14l6 6-22 22-9 3 3-9 22-22z" fill="#f3f4f6" stroke="#d97706" stroke-width="2"/><path d="M19 42l-5 8 8-5z" fill="#d97706"/><line x1="28" y1="30" x2="42" y2="16" stroke="#1f2937" stroke-width="1.5"/><circle cx="28" cy="30" r="1.5" fill="#1f2937"/></svg>""",
            "badge:anchor-seal" => """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="25" fill="#0b1f3a" stroke="#d97706" stroke-width="2.5"/><circle cx="32" cy="18" r="4.5" fill="none" stroke="#facc15" stroke-width="2.5"/><line x1="32" y1="23" x2="32" y2="47" stroke="#facc15" stroke-width="3"/><line x1="20" y1="26" x2="44" y2="26" stroke="#facc15" stroke-width="2.5" stroke-linecap="round"/><path d="M17 38c3 9 12 11 15 11s12-2 15-11" fill="none" stroke="#facc15" stroke-width="3" stroke-linecap="round"/><polygon points="14,37 20,38 17,42" fill="#facc15"/><polygon points="50,37 44,38 47,42" fill="#facc15"/></svg>""",
            "badge:crown-regal" => """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="6" y="6" width="52" height="52" rx="12" fill="#18181b" stroke="#ca8a04" stroke-width="2.5"/><path d="M14 44h36l-3-18-9 8-6-14-6 14-9-8z" fill="#eab308" stroke="#facc15" stroke-width="2" stroke-linejoin="round"/><circle cx="32" cy="19" r="2.5" fill="#fef08a"/><circle cx="20" cy="25" r="2" fill="#fef08a"/><circle cx="44" cy="25" r="2" fill="#fef08a"/><rect x="16" y="41" width="32" height="3" rx="1.5" fill="#ca8a04"/></svg>""",
            "badge:monogram-seal" => """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="25" fill="#881337" stroke="#fbbf24" stroke-width="2.5"/><circle cx="32" cy="32" r="21" fill="none" stroke="#fcd34d" stroke-width="1.2" stroke-dasharray="3 2"/><path d="M22 41v-18h4l6 11 6-11h4v18h-4v-11l-5 9.5h-2l-5-9.5v11z" fill="#fef3c7"/></svg>""",
            "badge:summit-peak" => """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="25" fill="#0f172a" stroke="#38bdf8" stroke-width="2.5"/><circle cx="42" cy="21" r="5" fill="#facc15"/><polygon points="12,47 28,23 44,47" fill="#334155"/><polygon points="28,23 33,31 28,34 23,31" fill="#f8fafc"/><polygon points="28,47 42,27 54,47" fill="#1e293b"/><polygon points="42,27 46,33 42,35 38,33" fill="#f8fafc"/></svg>""",
            "badge:geometric-gem" => """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="6" y="6" width="52" height="52" rx="12" fill="#064e3b" stroke="#34d399" stroke-width="2.5"/><polygon points="21,21 43,21 51,31 32,49 13,31" fill="#059669" stroke="#6ee7b7" stroke-width="2" stroke-linejoin="round"/><polygon points="21,21 32,31 43,21" fill="#10b981"/><polygon points="13,31 32,31 21,21" fill="#34d399"/><polygon points="43,21 32,31 51,31" fill="#047857"/><polygon points="13,31 32,31 32,49" fill="#065f46"/><polygon points="51,31 32,31 32,49" fill="#047857"/></svg>""",

            // --- LEGACY BADGES (for backward compatibility) ---
            "badge:voxel-sword" => """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="6" y="6" width="52" height="52" rx="12" fill="#0f172a" stroke="#22d3ee" stroke-width="3"/><path d="M42 14h8v8l-6 6-8-8z" fill="#67e8f9"/><path d="M24 32l12-12 8 8-12 12z" fill="#22d3ee"/><path d="M16 40l8-8 8 8-8 8z" fill="#06b6d4"/><rect x="14" y="34" width="8" height="8" fill="#facc15" stroke="#111827" stroke-width="2"/><rect x="22" y="42" width="8" height="8" fill="#facc15" stroke="#111827" stroke-width="2"/><rect x="12" y="44" width="8" height="8" fill="#92400e" stroke="#111827" stroke-width="2"/></svg>""",
            "badge:voxel-creeper" => """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="6" y="6" width="52" height="52" rx="10" fill="#22c55e" stroke="#111827" stroke-width="3.5"/><rect x="10" y="10" width="12" height="12" fill="#4ade80" opacity="0.5"/><rect x="40" y="38" width="14" height="14" fill="#15803d" opacity="0.5"/><rect x="14" y="18" width="12" height="12" fill="#111827"/><rect x="38" y="18" width="12" height="12" fill="#111827"/><rect x="26" y="30" width="12" height="16" fill="#111827"/><rect x="20" y="36" width="6" height="16" fill="#111827"/><rect x="38" y="36" width="6" height="16" fill="#111827"/></svg>""",
            "badge:hoops-ball" => """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="25" fill="#f97316" stroke="#111827" stroke-width="3.5"/><path d="M7 32h50M32 7v50" stroke="#111827" stroke-width="3"/><path d="M14 14c10 8 10 28 0 36M50 14c-10 8-10 28 0 36" fill="none" stroke="#111827" stroke-width="3"/><circle cx="24" cy="22" r="4" fill="#fdba74" opacity="0.6"/></svg>""",
            "badge:dojo-belt" => """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="25" fill="#dc2626" stroke="#facc15" stroke-width="3.5"/><circle cx="32" cy="32" r="17" fill="#fef2f2"/><path d="M10 30h44v7H10z" fill="#111827"/><rect x="26" y="27" width="12" height="12" rx="2" fill="#1f2937" stroke="#facc15" stroke-width="2"/><path d="M28 39l-8 14 7 2 5-12M36 39l8 14-7 2-5-12" fill="#111827"/></svg>""",
            "badge:gamer-pad" => """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="6" y="6" width="52" height="52" rx="14" fill="#1e1b4b" stroke="#a855f7" stroke-width="3"/><path d="M16 24h32a8 8 0 0 1 7.8 9.8l-2.4 11A5 5 0 0 1 48.5 49a5 5 0 0 1-4-2l-3.5-5H23l-3.5 5a5 5 0 0 1-4 2 5 5 0 0 1-4.9-4.2l-2.4-11A8 8 0 0 1 16 24z" fill="#312e81" stroke="#22d3ee" stroke-width="2.5"/><path d="M22 30v8M18 34h8" stroke="#e2e8f0" stroke-width="2.5" stroke-linecap="round"/><circle cx="43" cy="31" r="2.2" fill="#4ade80"/><circle cx="47" cy="35" r="2.2" fill="#f43f5e"/><circle cx="39" cy="35" r="2.2" fill="#22d3ee"/></svg>""",
            "badge:meme-moai" => """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="25" fill="#334155" stroke="#94a3b8" stroke-width="3"/><path d="M22 14h22l-2 36H20l-2-14 4-4z" fill="#64748b" stroke="#0f172a" stroke-width="3" stroke-linejoin="round"/><path d="M20 24h24v5H20z" fill="#0f172a"/><path d="M30 24v16h-6l2-16z" fill="#94a3b8" stroke="#0f172a" stroke-width="2.5"/><path d="M24 44h14" stroke="#0f172a" stroke-width="3" stroke-linecap="round"/></svg>""",
            "badge:yt-play" => """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="6" y="13" width="52" height="38" rx="11" fill="#e11d48" stroke="#111827" stroke-width="3.5"/><polygon points="26,22 26,42 43,32" fill="#ffffff" stroke="#111827" stroke-width="2" stroke-linejoin="round"/></svg>""",
            "badge:crown-gold" => """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="25" fill="#1e293b" stroke="#facc15" stroke-width="3"/><polygon points="14,44 12,22 24,31 32,17 40,31 52,22 50,44" fill="#facc15" stroke="#111827" stroke-width="2.5" stroke-linejoin="round"/><circle cx="32" cy="36" r="3" fill="#ef4444"/><circle cx="21" cy="37" r="2.2" fill="#22d3ee"/><circle cx="43" cy="37" r="2.2" fill="#22d3ee"/></svg>""",

            // --- PROFESSIONAL HEADER MOTIFS (120x56) ---
            "motif:metro-grid" => """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 56"><g fill="none" stroke="#ffffff" stroke-opacity="0.35" stroke-width="1.2"><line x1="0" y1="12" x2="120" y2="12"/><line x1="0" y1="28" x2="120" y2="28"/><line x1="0" y1="44" x2="120" y2="44"/><line x1="20" y1="0" x2="20" y2="56" stroke-dasharray="2 3"/><line x1="60" y1="0" x2="60" y2="56" stroke-dasharray="2 3"/><line x1="100" y1="0" x2="100" y2="56" stroke-dasharray="2 3"/><circle cx="60" cy="28" r="4" fill="#ffffff" fill-opacity="0.5"/></g></svg>""",
            "motif:horizon-waves" => """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 56"><path d="M0 24 Q 30 14, 60 24 T 120 24" fill="none" stroke="#ffffff" stroke-opacity="0.45" stroke-width="2"/><path d="M0 34 Q 30 24, 60 34 T 120 34" fill="none" stroke="#ffffff" stroke-opacity="0.30" stroke-width="1.6"/><path d="M0 44 Q 30 36, 60 44 T 120 44" fill="none" stroke="#ffffff" stroke-opacity="0.18" stroke-width="1.2"/></svg>""",
            "motif:summit-ridge" => """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 56"><polygon points="0,56 18,34 36,44 60,18 84,38 98,28 120,56" fill="#ffffff" fill-opacity="0.22"/><polyline points="0,56 18,34 36,44 60,18 84,38 98,28 120,56" fill="none" stroke="#ffffff" stroke-opacity="0.6" stroke-width="1.8"/></svg>""",
            "motif:herringbone" => """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 56"><g fill="none" stroke="#ffffff" stroke-opacity="0.35" stroke-width="1.6" stroke-linecap="round"><path d="M10 14 L20 28 L10 42"/><path d="M30 14 L40 28 L30 42"/><path d="M50 14 L60 28 L50 42"/><path d="M70 14 L80 28 L70 42"/><path d="M90 14 L100 28 L90 42"/><path d="M110 14 L120 28 L110 42"/></g></svg>""",
            "motif:constellation" => """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 56"><g fill="none" stroke="#ffffff" stroke-opacity="0.32" stroke-width="1"><line x1="16" y1="20" x2="42" y2="12"/><line x1="42" y1="12" x2="68" y2="34"/><line x1="68" y1="34" x2="94" y2="18"/><line x1="94" y1="18" x2="110" y2="36"/></g><g fill="#ffffff" fill-opacity="0.75"><circle cx="16" cy="20" r="2.5"/><circle cx="42" cy="12" r="3"/><circle cx="68" cy="34" r="3"/><circle cx="94" cy="18" r="3.5"/><circle cx="110" cy="36" r="2"/><circle cx="56" cy="44" r="1.5"/></g></svg>""",

            // --- LEGACY HEADER MOTIFS ---
            "motif:voxel-clouds" => """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 56"><g fill="#ffffff" fill-opacity="0.32"><rect x="8" y="12" width="16" height="8"/><rect x="14" y="6" width="12" height="6"/><rect x="52" y="18" width="22" height="8"/><rect x="58" y="12" width="10" height="6"/><rect x="92" y="10" width="18" height="8"/></g><g fill="#4ade80" fill-opacity="0.4"><rect x="0" y="44" width="24" height="12"/><rect x="24" y="38" width="24" height="18"/><rect x="48" y="46" width="24" height="10"/><rect x="72" y="40" width="24" height="16"/><rect x="96" y="44" width="24" height="12"/></g></svg>""",
            "motif:court-arcs" => """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 56"><g fill="none" stroke="#ffffff" stroke-opacity="0.42" stroke-width="2.5"><circle cx="60" cy="28" r="18"/><line x1="60" y1="0" x2="60" y2="56"/><path d="M0 10a26 26 0 0 1 28 18 26 26 0 0 1-28 18"/><path d="M120 10a26 26 0 0 0-28 18 26 26 0 0 0 28 18"/></g><circle cx="60" cy="28" r="5" fill="#f97316" fill-opacity="0.65"/></svg>""",
            "motif:dojo-sun" => """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 56"><circle cx="60" cy="46" r="24" fill="#ef4444" fill-opacity="0.5"/><g stroke="#facc15" stroke-opacity="0.4" stroke-width="3"><line x1="60" y1="46" x2="10" y2="6"/><line x1="60" y1="46" x2="35" y2="0"/><line x1="60" y1="46" x2="60" y2="0"/><line x1="60" y1="46" x2="85" y2="0"/><line x1="60" y1="46" x2="110" y2="6"/></g></svg>""",
            "motif:cyber-circuit" => """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 56"><g fill="none" stroke="#22d3ee" stroke-opacity="0.55" stroke-width="2" stroke-linecap="round"><path d="M0 16h24l10 12h26"/><path d="M48 42h30l12-16h30"/><path d="M12 44h18l8-8"/></g><g fill="#a855f7" fill-opacity="0.75"><circle cx="60" cy="28" r="3.5"/><circle cx="48" cy="42" r="3"/><circle cx="38" cy="36" r="2.5"/><circle cx="90" cy="26" r="3"/></g></svg>""",
            "motif:meme-stars" => """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 56"><g fill="#facc15" fill-opacity="0.65"><polygon points="20,8 23,16 31,19 23,22 20,30 17,22 9,19 17,16"/><polygon points="88,12 90,18 96,20 90,22 88,28 86,22 80,20 86,18"/><circle cx="52" cy="16" r="3"/><circle cx="106" cy="38" r="3.5"/><rect x="44" y="34" width="8" height="8" transform="rotate(20 48 38)" fill="#22d3ee"/></g></svg>""",

            // --- PROFESSIONAL BACKGROUND TILES (80x80) ---
            "tile:linen-weave" => """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><g stroke="#64748b" stroke-width="1" opacity="0.65"><line x1="0" y1="20" x2="80" y2="20" stroke-dasharray="3 5"/><line x1="0" y1="60" x2="80" y2="60" stroke-dasharray="3 5"/><line x1="20" y1="0" x2="20" y2="80" stroke-dasharray="3 5"/><line x1="60" y1="0" x2="60" y2="80" stroke-dasharray="3 5"/></g></svg>""",
            "tile:architect-dots" => """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><g fill="#64748b" opacity="0.7"><circle cx="20" cy="20" r="1.75"/><circle cx="60" cy="20" r="1.75"/><circle cx="20" cy="60" r="1.75"/><circle cx="60" cy="60" r="1.75"/><circle cx="40" cy="40" r="1"/></g></svg>""",
            "tile:diamond-lattice" => """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><g fill="none" stroke="#64748b" stroke-width="1.2" opacity="0.65"><polygon points="40,6 74,40 40,74 6,40"/><circle cx="40" cy="40" r="2.5"/></g></svg>""",
            "tile:isometric-cubes" => """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><g fill="none" stroke="#64748b" stroke-width="1.2" opacity="0.7"><path d="M20 10l15 8v16l-15 8-15-8V18z"/><path d="M20 26l15-8M20 26l-15-8M20 26v16"/><path d="M60 50l15 8v16l-15 8-15-8V58z"/><path d="M60 66l15-8M60 66l-15-8M60 66v16"/></g></svg>""",
            "tile:art-deco" => """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><g fill="none" stroke="#64748b" stroke-width="1.2" opacity="0.7"><path d="M0 40a40 40 0 0 1 40-40"/><path d="M0 40a26 26 0 0 1 26-26"/><path d="M0 40a12 12 0 0 1 12-12"/><path d="M40 80a40 40 0 0 1 40-40"/><path d="M40 80a26 26 0 0 1 26-26"/><path d="M40 80a12 12 0 0 1 12-12"/></g></svg>""",
            "tile:botanical-leaf" => """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><g fill="none" stroke="#64748b" stroke-width="1.2" opacity="0.7" stroke-linecap="round"><path d="M12 68 Q 28 40, 48 20"/><path d="M22 56c-4-4-2-10 4-10 6 0 8 6 4 10z" fill="#64748b" fill-opacity="0.18"/><path d="M34 44c4-4 10-2 10 4 0 6-6 8-10 4z" fill="#64748b" fill-opacity="0.18"/><path d="M44 28c-4-4-2-10 4-10 6 0 8 6 4 10z" fill="#64748b" fill-opacity="0.18"/></g></svg>""",

            // --- LEGACY BACKGROUND TILES ---
            "tile:voxel-grid" => """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><g fill="none" stroke="#64748b" stroke-width="1.75" opacity="0.85"><rect x="8" y="8" width="22" height="22" rx="2"/><path d="M8 15h22M15 8v22"/><rect x="48" y="48" width="22" height="22" rx="2"/><path d="M48 55h22M55 48v22"/><rect x="52" y="12" width="14" height="14"/><rect x="12" y="52" width="14" height="14"/></g></svg>""",
            "tile:hoops-court" => """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><g fill="none" stroke="#64748b" stroke-width="1.75" opacity="0.85"><circle cx="22" cy="22" r="12"/><path d="M10 22h24M22 10v24"/><path d="M14 14c5 4 5 12 0 16M30 14c-5 4-5 12 0 16"/><circle cx="60" cy="60" r="10"/><path d="M46 46h28v10"/></g></svg>""",
            "tile:dojo-stars" => """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><g fill="none" stroke="#64748b" stroke-width="1.75" stroke-linejoin="round" opacity="0.85"><polygon points="22,6 26,18 38,22 26,26 22,38 18,26 6,22 18,18"/><circle cx="22" cy="22" r="3"/><polygon points="60,44 64,56 76,60 64,64 60,76 56,64 44,60 56,56"/><circle cx="60" cy="60" r="3"/></g></svg>""",
            "tile:gamer-dpad" => """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><g fill="none" stroke="#64748b" stroke-width="1.75" stroke-linejoin="round" opacity="0.85"><path d="M18 10h8v8h8v8h-8v8h-8v-8h-8v-8h8z"/><circle cx="58" cy="22" r="8"/><polygon points="22,50 30,66 14,66"/><rect x="50" y="50" width="16" height="16" rx="2"/><path d="M53 53l10 10M63 53l-10 10" opacity="0.5"/></g></svg>""",
            "tile:meme-icons" => """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><g fill="none" stroke="#64748b" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" opacity="0.85"><polygon points="22,8 25,18 35,21 25,24 22,34 19,24 9,21 19,18"/><path d="M58 10c6 8 10 12 10 18a10 10 0 0 1-20 0c0-6 4-10 10-18z"/><rect x="14" y="48" width="18" height="22" rx="4"/><path d="M18 55h10M20 62h6"/><circle cx="58" cy="58" r="11"/><path d="M54 55h.01M62 55h.01M53 62h10"/></g></svg>""",
            "tile:cyber-hex" => """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><g fill="none" stroke="#64748b" stroke-width="1.6" opacity="0.85"><polygon points="24,8 38,16 38,32 24,40 10,32 10,16"/><polygon points="60,44 74,52 74,68 60,76 46,68 46,52"/><path d="M38 24h14l8 20"/><circle cx="52" cy="24" r="2.5"/></g></svg>""",
            _ => null
        };
    }

    private static PersonalizationSettings NormalizeSettings(PersonalizationSettings input)
    {
        var tag = StickerGeneratorRules.NormalizeStatusTag(input.StatusTag);
        var badge = NormalizeRef(input.HeaderBadge, BadgePresets);
        var motif = NormalizeRef(input.HeaderMotif, MotifPresets);
        var tile = NormalizeRef(input.BackgroundTile, TilePresets);
        var chime = NormalizeChime(input.ChimeTheme);
        return new PersonalizationSettings(tag, badge, motif, tile, chime);
    }

    private static string NormalizeRef(string? value, IReadOnlyList<PresetOption> presets)
    {
        var clean = (value ?? "none").Trim();
        foreach (var preset in presets)
        {
            if (string.Equals(preset.Value, clean, StringComparison.OrdinalIgnoreCase))
            {
                return preset.Value;
            }
        }

        if (clean.StartsWith("preset:", StringComparison.OrdinalIgnoreCase))
        {
            var slug = clean["preset:".Length..];
            if (GetPresetSvg("badge", slug) is not null
                || GetPresetSvg("motif", slug) is not null
                || GetPresetSvg("tile", slug) is not null)
            {
                return clean;
            }
        }

        if (clean.StartsWith("custom:", StringComparison.OrdinalIgnoreCase)
            && Guid.TryParse(clean["custom:".Length..], out var id))
        {
            return "custom:" + id.ToString("N");
        }

        return "none";
    }

    private static string NormalizeChime(string? chime)
    {
        var clean = (chime ?? "classic").Trim().ToLowerInvariant();
        clean = clean switch
        {
            "arcade-8bit" => "soft-bell",
            "voxel-pop" => "acoustic-wood",
            "court-buzzer" => "executive-pulse",
            "dojo-gong" => "minimal-tap",
            _ => clean
        };
        foreach (var (id, _) in ChimeThemes)
        {
            if (id == clean)
            {
                return id;
            }
        }

        return "classic";
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
