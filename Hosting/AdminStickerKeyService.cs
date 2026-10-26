using System.Security.Cryptography;
using FamilyVault.Files.Data;
using FamilyVault.Files.Data.Entities;
using FamilyVault.Files.Security;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace McWutWebApp.Hosting;

public sealed record AdminStickerKeyStatus(bool Configured, string? Provider, string? Hint);

public sealed class AdminStickerKeyService(
    ApplicationDbContext db,
    IDataProtectionProvider protection,
    IConfiguration configuration,
    TimeProvider time,
    IMemoryCache cache)
{
    // Well-known Guid for backwards compatibility during migration
    public static readonly Guid AdminStickerKeyId = new("00000000-0000-0000-0000-00000057494b"); // "STIK" in hex
    private const string SettingKey = "SiteAiKey";
    private const string CacheKey = "admin-sticker-ai-key";
    private readonly IDataProtector _protector = protection.CreateProtector("McWut.AdminStickerKey.v1");

    public async Task<AdminStickerKeyStatus> GetStatusAsync(CancellationToken cancellationToken)
    {
        var (key, provider) = await ResolveKeyAsync(cancellationToken);
        if (string.IsNullOrEmpty(key))
        {
            return new AdminStickerKeyStatus(false, null, null);
        }

        var hint = key.Length >= 4 ? key[^4..] : "";
        return new AdminStickerKeyStatus(true, provider, hint);
    }

    public async Task<AdminStickerKeyStatus> SaveAsync(string? key, CancellationToken cancellationToken)
    {
        var clean = (key ?? "").Trim();
        string provider;
        if (clean.StartsWith("sk-or-v1-", StringComparison.OrdinalIgnoreCase))
        {
            provider = "OpenRouter";
        }
        else if (GoogleGeminiClient.IsValidKey(clean))
        {
            provider = "Google Gemini";
        }
        else
        {
            throw new DirectMessageValidationException("Enter a valid API key (Google Gemini or OpenRouter).");
        }

        var row = await db.SystemSettings.FirstOrDefaultAsync(x => x.Key == SettingKey, cancellationToken);
        if (row is null)
        {
            row = new SystemSettingEntity { Key = SettingKey };
            db.SystemSettings.Add(row);
        }

        row.ValueCipher = _protector.Protect($"{provider}:{clean}");
        row.UpdatedAt = time.GetUtcNow();

        // Clean up legacy OpenRouterKeys entry if it exists
        var legacyRow = await db.OpenRouterKeys.FirstOrDefaultAsync(x => x.UserId == AdminStickerKeyId, cancellationToken);
        if (legacyRow is not null)
        {
            db.OpenRouterKeys.Remove(legacyRow);
        }

        await db.SaveChangesAsync(cancellationToken);

        cache.Set(CacheKey, (clean, provider), TimeSpan.FromHours(12));
        var hint = clean.Length >= 4 ? clean[^4..] : "";
        return new AdminStickerKeyStatus(true, provider, hint);
    }

    public async Task DeleteAsync(CancellationToken cancellationToken)
    {
        var row = await db.SystemSettings.FirstOrDefaultAsync(x => x.Key == SettingKey, cancellationToken);
        if (row is not null)
        {
            db.SystemSettings.Remove(row);
        }

        var legacyRow = await db.OpenRouterKeys.FirstOrDefaultAsync(x => x.UserId == AdminStickerKeyId, cancellationToken);
        if (legacyRow is not null)
        {
            db.OpenRouterKeys.Remove(legacyRow);
        }

        await db.SaveChangesAsync(cancellationToken);

        cache.Remove(CacheKey);
    }

    public async Task<(string Key, string Provider)> RequireKeyAsync(CancellationToken cancellationToken)
    {
        var resolved = await ResolveKeyAsync(cancellationToken);
        if (string.IsNullOrEmpty(resolved.Key))
        {
            throw new DirectMessageValidationException("The Admin has not configured the Site AI API key yet in Admin > Site AI.");
        }

        return resolved;
    }

    private async Task<(string Key, string Provider)> ResolveKeyAsync(CancellationToken cancellationToken)
    {
        if (cache.TryGetValue(CacheKey, out (string Key, string Provider) cached) && !string.IsNullOrEmpty(cached.Key))
        {
            return cached;
        }

        // 1. Check SystemSettings database entry
        var row = await db.SystemSettings.AsNoTracking()
            .FirstOrDefaultAsync(x => x.Key == SettingKey, cancellationToken);
        if (row is not null && TryUnprotect(row.ValueCipher, out var plain))
        {
            var colon = plain.IndexOf(':');
            if (colon > 0)
            {
                var prov = plain[..colon];
                var k = plain[(colon + 1)..];
                var res = (k, prov);
                cache.Set(CacheKey, res, TimeSpan.FromHours(12));
                return res;
            }
        }

        // Fallback: Check legacy OpenRouterKeys entry
        var legacyRow = await db.OpenRouterKeys.AsNoTracking()
            .FirstOrDefaultAsync(x => x.UserId == AdminStickerKeyId, cancellationToken);
        if (legacyRow is not null && TryUnprotect(legacyRow.KeyCipher, out var legacyPlain))
        {
            var colon = legacyPlain.IndexOf(':');
            if (colon > 0)
            {
                var prov = legacyPlain[..colon];
                var k = legacyPlain[(colon + 1)..];
                var res = (k, prov);
                cache.Set(CacheKey, res, TimeSpan.FromHours(12));
                return res;
            }
        }

        // 2. Fallback to Environment Variables (if set)
        var envGemini = configuration["Gemini:ApiKey"] ?? configuration["Gemini__ApiKey"];
        if (!string.IsNullOrWhiteSpace(envGemini) && GoogleGeminiClient.IsValidKey(envGemini))
        {
            var res = (envGemini.Trim(), "Google Gemini");
            cache.Set(CacheKey, res, TimeSpan.FromHours(12));
            return res;
        }

        var envOpenRouter = configuration["OpenRouter:StickerApiKey"] ?? configuration["OpenRouter__StickerApiKey"];
        if (!string.IsNullOrWhiteSpace(envOpenRouter))
        {
            var res = (envOpenRouter.Trim(), "OpenRouter");
            cache.Set(CacheKey, res, TimeSpan.FromHours(12));
            return res;
        }

        return ("", "");
    }

    private bool TryUnprotect(string cipher, out string plain)
    {
        plain = "";
        if (string.IsNullOrEmpty(cipher)) return false;
        try
        {
            plain = _protector.Unprotect(cipher);
            return plain.Length > 0;
        }
        catch (CryptographicException)
        {
            return false;
        }
    }
}
