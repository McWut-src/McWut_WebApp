using FamilyVault.Files.Contracts;
using FamilyVault.Files.Data;
using FamilyVault.Files.Data.Entities;
using FamilyVault.Files.Security;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace FamilyVault.Files.Services;

public sealed class ShareLinkService(
    ApplicationDbContext db,
    TimeProvider time,
    IPasswordHasher<object> passwordHasher,
    IFileAudit audit) : IShareLinkService
{
    public async Task<ShareLink> CreateAsync(
        ShareTargetKind targetKind,
        Guid targetId,
        Guid createdByUserId,
        CreateShareLinkRequest request,
        CancellationToken cancellationToken = default)
    {
        if (targetKind == ShareTargetKind.File)
        {
            var exists = await db.StoredFiles.AsNoTracking()
                .AnyAsync(f => f.Id == targetId && f.DeletedAt == null, cancellationToken)
                .ConfigureAwait(false);
            if (!exists)
            {
                throw new VaultNotFoundException();
            }
        }
        else
        {
            var exists = await db.Drops.AsNoTracking()
                .AnyAsync(d => d.Id == targetId && d.DeletedAt == null, cancellationToken)
                .ConfigureAwait(false);
            if (!exists)
            {
                throw new VaultNotFoundException();
            }
        }

        var link = new ShareLinkEntity
        {
            Id = Guid.NewGuid(),
            Token = await ShortTokenAllocator.AllocateAsync(db, cancellationToken).ConfigureAwait(false),
            TargetKind = targetKind,
            TargetId = targetId,
            CreatedByUserId = createdByUserId,
            CreatedAt = time.GetUtcNow(),
            ExpiresAt = request.Retention.ExpiresAt,
            MaxDownloads = request.Retention.MaxDownloads,
            PasswordHash = string.IsNullOrEmpty(request.Password) ? null : PasswordHashing.Hash(passwordHasher, request.Password),
            AllowPreview = request.AllowPreview
        };
        db.ShareLinks.Add(link);
        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        await audit.RecordAsync("LinkCreate", targetKind, targetId, createdByUserId, link.Token, null, cancellationToken).ConfigureAwait(false);
        return link.ToRecord();
    }

    public async Task<IReadOnlyList<OwnedShareLink>> ListOwnedAsync(Guid createdByUserId, CancellationToken cancellationToken = default)
    {
        // SQLite cannot ORDER BY DateTimeOffset. Sort after the rows are loaded.
        var rows = await db.ShareLinks.AsNoTracking()
            .Where(link => link.CreatedByUserId == createdByUserId && link.RevokedAt == null)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        var fileIds = rows.Where(link => link.TargetKind == ShareTargetKind.File).Select(link => link.TargetId).Distinct().ToList();
        var dropIds = rows.Where(link => link.TargetKind == ShareTargetKind.Drop).Select(link => link.TargetId).Distinct().ToList();
        var files = await LoadFilesAsync(fileIds, cancellationToken).ConfigureAwait(false);
        var drops = await LoadDropsAsync(dropIds, cancellationToken).ConfigureAwait(false);
        var now = time.GetUtcNow();
        return rows
            .OrderByDescending(link => link.CreatedAt)
            .Select(link => ToOwned(link, files, drops, now))
            .ToList();
    }

    public async Task RevokeAsync(string token, Guid actorUserId, CancellationToken cancellationToken = default)
    {
        var link = await db.ShareLinks.FirstOrDefaultAsync(l => l.Token == token, cancellationToken).ConfigureAwait(false)
            ?? throw new VaultNotFoundException();
        if (link.CreatedByUserId != actorUserId || link.RevokedAt is not null)
        {
            throw new VaultNotFoundException();
        }

        link.RevokedAt = time.GetUtcNow();
        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
    }

    public async Task<ShareLink?> ResolveAsync(string token, CancellationToken cancellationToken = default)
    {
        var link = await db.ShareLinks.AsNoTracking()
            .FirstOrDefaultAsync(l => l.Token == token, cancellationToken)
            .ConfigureAwait(false);
        if (link is null || link.RevokedAt is not null)
        {
            return null;
        }

        var now = time.GetUtcNow();
        if (link.ExpiresAt is DateTimeOffset exp && exp <= now)
        {
            return null;
        }

        return link.ToRecord();
    }

    private async Task<Dictionary<Guid, StoredFileEntity>> LoadFilesAsync(List<Guid> ids, CancellationToken cancellationToken)
    {
        if (ids.Count == 0)
        {
            return [];
        }

        return await db.StoredFiles.AsNoTracking()
            .Where(file => ids.Contains(file.Id))
            .ToDictionaryAsync(file => file.Id, cancellationToken)
            .ConfigureAwait(false);
    }

    private async Task<Dictionary<Guid, DropEntity>> LoadDropsAsync(List<Guid> ids, CancellationToken cancellationToken)
    {
        if (ids.Count == 0)
        {
            return [];
        }

        return await db.Drops.AsNoTracking()
            .Where(drop => ids.Contains(drop.Id))
            .ToDictionaryAsync(drop => drop.Id, cancellationToken)
            .ConfigureAwait(false);
    }

    private static OwnedShareLink ToOwned(
        ShareLinkEntity link,
        Dictionary<Guid, StoredFileEntity> files,
        Dictionary<Guid, DropEntity> drops,
        DateTimeOffset now)
    {
        var expired = link.ExpiresAt is DateTimeOffset exp && exp <= now;
        return new OwnedShareLink(
            link.Token,
            link.TargetKind,
            link.TargetId,
            LabelFor(link, files, drops),
            link.CreatedAt,
            link.ExpiresAt,
            link.PasswordHash is not null,
            expired);
    }

    private static string LabelFor(
        ShareLinkEntity link,
        Dictionary<Guid, StoredFileEntity> files,
        Dictionary<Guid, DropEntity> drops)
    {
        if (link.TargetKind == ShareTargetKind.File)
        {
            if (!files.TryGetValue(link.TargetId, out var file) || file.DeletedAt is not null)
            {
                return "Deleted file";
            }

            return file.OriginalFileName;
        }

        if (!drops.TryGetValue(link.TargetId, out var drop) || drop.DeletedAt is not null)
        {
            return "Deleted share";
        }

        return string.IsNullOrWhiteSpace(drop.Title) ? "Shared files" : drop.Title;
    }
}
