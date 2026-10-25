using System.Security.Cryptography;
using FamilyVault.Files.Data;
using FamilyVault.Files.Data.Entities;
using FamilyVault.Files.Security;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace McWutWebApp.Hosting;

public sealed record OpenRouterKeyStatus(bool Configured, string? Hint);

public sealed class OpenRouterKeyService(
    ApplicationDbContext db,
    IDataProtectionProvider protection,
    TimeProvider time,
    IMemoryCache cache)
{
    private static readonly MemoryCacheEntryOptions KeyCacheOptions = new()
    {
        SlidingExpiration = TimeSpan.FromHours(2),
        AbsoluteExpirationRelativeToNow = TimeSpan.FromHours(12)
    };

    private readonly IDataProtector _protector = protection.CreateProtector("McWut.OpenRouter.v1");

    public async Task<OpenRouterKeyStatus> GetStatusAsync(Guid userId, CancellationToken cancellationToken)
    {
        var row = await db.OpenRouterKeys.AsNoTracking()
            .FirstOrDefaultAsync(x => x.UserId == userId, cancellationToken);
        if (row is null)
        {
            cache.Remove(CacheKey(userId));
            return new OpenRouterKeyStatus(false, null);
        }

        if (!TryUnprotect(row.KeyCipher, out var key))
        {
            cache.Remove(CacheKey(userId));
            return new OpenRouterKeyStatus(true, null);
        }

        // Keep the key in memory so a later chat does not open SQL again.
        cache.Set(CacheKey(userId), key, KeyCacheOptions);
        return new OpenRouterKeyStatus(true, OpenRouterRules.Hint(key));
    }

    public async Task<OpenRouterKeyStatus> SaveAsync(Guid userId, string? key, CancellationToken cancellationToken)
    {
        var clean = OpenRouterRules.NormalizeKey(key);
        var row = await db.OpenRouterKeys.FirstOrDefaultAsync(x => x.UserId == userId, cancellationToken);
        if (row is null)
        {
            row = new OpenRouterKeyEntity { UserId = userId };
            db.OpenRouterKeys.Add(row);
        }

        row.KeyCipher = _protector.Protect(clean);
        row.UpdatedAt = time.GetUtcNow();
        await db.SaveChangesAsync(cancellationToken);
        cache.Set(CacheKey(userId), clean, KeyCacheOptions);
        return new OpenRouterKeyStatus(true, OpenRouterRules.Hint(clean));
    }

    public async Task DeleteAsync(Guid userId, CancellationToken cancellationToken)
    {
        var row = await db.OpenRouterKeys.FirstOrDefaultAsync(x => x.UserId == userId, cancellationToken);
        if (row is not null)
        {
            db.OpenRouterKeys.Remove(row);
            await db.SaveChangesAsync(cancellationToken);
        }

        cache.Remove(CacheKey(userId));
    }

    public async Task<string> RequireKeyAsync(Guid userId, CancellationToken cancellationToken)
    {
        if (cache.TryGetValue(CacheKey(userId), out string? cached) && !string.IsNullOrEmpty(cached))
        {
            return cached;
        }

        var row = await db.OpenRouterKeys.AsNoTracking()
            .FirstOrDefaultAsync(x => x.UserId == userId, cancellationToken);
        if (row is null)
        {
            throw new OpenRouterValidationException("Save an OpenRouter key first.");
        }

        if (!TryUnprotect(row.KeyCipher, out var key))
        {
            throw new OpenRouterValidationException("The saved key could not be read. Save it again.");
        }

        cache.Set(CacheKey(userId), key, KeyCacheOptions);
        return key;
    }

    public async Task<string> RequireKeyWithFallbackAsync(Guid userId, CancellationToken cancellationToken)
    {
        if (cache.TryGetValue(CacheKey(userId), out string? cached) && !string.IsNullOrEmpty(cached))
        {
            return cached;
        }

        var rows = await db.OpenRouterKeys.AsNoTracking().ToListAsync(cancellationToken);
        var own = rows.FirstOrDefault(x => x.UserId == userId);
        if (own is not null && TryUnprotect(own.KeyCipher, out var ownKey))
        {
            cache.Set(CacheKey(userId), ownKey, KeyCacheOptions);
            return ownKey;
        }

        foreach (var fallbackRow in rows.OrderByDescending(x => x.UpdatedAt))
        {
            if (TryUnprotect(fallbackRow.KeyCipher, out var sharedKey))
            {
                return sharedKey;
            }
        }

        throw new OpenRouterValidationException("Save an OpenRouter key on Profile first.");
    }

    private bool TryUnprotect(string cipher, out string key)
    {
        key = "";
        if (cipher.Length == 0)
        {
            return false;
        }

        try
        {
            key = _protector.Unprotect(cipher);
            return key.Length > 0;
        }
        catch (CryptographicException)
        {
            return false;
        }
    }

    private static string CacheKey(Guid userId) => "openrouter-key:" + userId.ToString("N");
}
