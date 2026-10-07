using FamilyVault.Files.Contracts;
using FamilyVault.Files.Data;
using FamilyVault.Files.Data.Entities;
using FamilyVault.Files.Security;
using Microsoft.EntityFrameworkCore;

namespace FamilyVault.Files.Services;

public sealed class ShortLinkService(ApplicationDbContext db, TimeProvider time) : IShortLinkService
{
    public async Task<ShortLink> CreateAsync(Guid ownerUserId, string? url, CancellationToken cancellationToken = default)
    {
        var target = ShortLinkRules.Normalize(url);
        var row = new ShortLinkEntity
        {
            Id = Guid.NewGuid(),
            Token = await ShortTokenAllocator.AllocateAsync(db, cancellationToken).ConfigureAwait(false),
            TargetUrl = target,
            OwnerUserId = ownerUserId,
            CreatedAt = time.GetUtcNow()
        };
        db.ShortLinks.Add(row);
        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        return ToRecord(row);
    }

    public async Task<IReadOnlyList<ShortLink>> ListOwnedAsync(Guid ownerUserId, CancellationToken cancellationToken = default)
    {
        // SQLite cannot ORDER BY DateTimeOffset. Sort after the rows are loaded.
        var rows = await db.ShortLinks.AsNoTracking()
            .Where(x => x.OwnerUserId == ownerUserId)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);
        return rows
            .OrderByDescending(x => x.CreatedAt)
            .Take(100)
            .Select(ToRecord)
            .ToList();
    }

    public async Task DeleteAsync(string token, Guid actorUserId, CancellationToken cancellationToken = default)
    {
        var row = await db.ShortLinks.FirstOrDefaultAsync(x => x.Token == token, cancellationToken).ConfigureAwait(false)
            ?? throw new VaultNotFoundException();
        if (row.OwnerUserId != actorUserId)
        {
            throw new VaultNotFoundException();
        }

        db.ShortLinks.Remove(row);
        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
    }

    public async Task<ShortLink?> ResolveAsync(string token, CancellationToken cancellationToken = default)
    {
        var row = await db.ShortLinks.AsNoTracking()
            .FirstOrDefaultAsync(x => x.Token == token, cancellationToken)
            .ConfigureAwait(false);
        return row is null ? null : ToRecord(row);
    }

    private static ShortLink ToRecord(ShortLinkEntity row) =>
        new(row.Id, row.Token, row.TargetUrl, row.OwnerUserId, row.CreatedAt);
}
