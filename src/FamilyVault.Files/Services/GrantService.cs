using FamilyVault.Files.Contracts;
using FamilyVault.Files.Data;
using FamilyVault.Files.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace FamilyVault.Files.Services;

public sealed class GrantService(
    ApplicationDbContext db,
    TimeProvider time,
    IFileAudit audit) : IGrantService
{
    public async Task<FileGrant> GrantAsync(
        ShareTargetKind targetKind,
        Guid targetId,
        Guid userId,
        FilePermission permission,
        Guid grantedByUserId,
        CancellationToken cancellationToken = default)
    {
        var targetOwner = await GetOwnerAsync(targetKind, targetId, cancellationToken).ConfigureAwait(false);
        if (targetOwner != grantedByUserId)
        {
            throw new VaultNotFoundException();
        }

        if (userId == grantedByUserId)
        {
            throw new VaultNotFoundException();
        }

        var member = await db.FamilyMembers.AsNoTracking()
            .FirstOrDefaultAsync(m => m.UserId == userId, cancellationToken)
            .ConfigureAwait(false)
            ?? throw new VaultNotFoundException();

        var existing = await db.FileGrants
            .FirstOrDefaultAsync(g => g.TargetKind == targetKind && g.TargetId == targetId && g.UserId == userId, cancellationToken)
            .ConfigureAwait(false);
        if (existing is not null)
        {
            existing.Permission = permission;
            existing.GrantedByUserId = grantedByUserId;
            existing.GrantedAt = time.GetUtcNow();
            await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
            await audit.RecordAsync("Grant", targetKind, targetId, grantedByUserId, null, member.UserId.ToString("N"), cancellationToken).ConfigureAwait(false);
            return existing.ToRecord();
        }

        var grant = new FileGrantEntity
        {
            Id = Guid.NewGuid(),
            TargetKind = targetKind,
            TargetId = targetId,
            UserId = userId,
            Permission = permission,
            GrantedByUserId = grantedByUserId,
            GrantedAt = time.GetUtcNow()
        };
        db.FileGrants.Add(grant);
        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        await audit.RecordAsync("Grant", targetKind, targetId, grantedByUserId, null, userId.ToString("N"), cancellationToken).ConfigureAwait(false);
        return grant.ToRecord();
    }

    public async Task RevokeAsync(
        ShareTargetKind targetKind,
        Guid targetId,
        Guid userId,
        Guid actorUserId,
        CancellationToken cancellationToken = default)
    {
        var targetOwner = await GetOwnerAsync(targetKind, targetId, cancellationToken).ConfigureAwait(false);
        if (targetOwner != actorUserId)
        {
            throw new VaultNotFoundException();
        }

        var grant = await db.FileGrants
            .FirstOrDefaultAsync(g => g.TargetKind == targetKind && g.TargetId == targetId && g.UserId == userId, cancellationToken)
            .ConfigureAwait(false)
            ?? throw new VaultNotFoundException();
        db.FileGrants.Remove(grant);
        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
    }

    public async Task<IReadOnlyList<FileGrant>> ListAsync(ShareTargetKind targetKind, Guid targetId, CancellationToken cancellationToken = default)
    {
        var rows = await db.FileGrants.AsNoTracking()
            .Where(g => g.TargetKind == targetKind && g.TargetId == targetId)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);
        return rows.OrderBy(g => g.GrantedAt).Select(g => g.ToRecord()).ToList();
    }

    public async Task<IReadOnlyList<StoredFile>> ListSharedWithMeAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var now = time.GetUtcNow();
        var grants = await db.FileGrants.AsNoTracking()
            .Where(g => g.UserId == userId)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        var fileIds = grants.Where(g => g.TargetKind == ShareTargetKind.File).Select(g => g.TargetId).ToList();
        var dropIds = grants.Where(g => g.TargetKind == ShareTargetKind.Drop).Select(g => g.TargetId).ToList();

        var files = await db.StoredFiles.AsNoTracking()
            .Where(f => f.DeletedAt == null
                        && f.Status == FileStatus.Ready
                        && (fileIds.Contains(f.Id) || (f.DropId != null && dropIds.Contains(f.DropId.Value))))
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);
        return files
            .Where(f => f.ExpiresAt is null || f.ExpiresAt > now)
            .OrderByDescending(f => f.CreatedAt)
            .Select(f => f.ToRecord())
            .ToList();
    }

    private async Task<Guid> GetOwnerAsync(ShareTargetKind kind, Guid targetId, CancellationToken cancellationToken)
    {
        if (kind == ShareTargetKind.File)
        {
            var file = await db.StoredFiles.AsNoTracking()
                .FirstOrDefaultAsync(f => f.Id == targetId && f.DeletedAt == null, cancellationToken)
                .ConfigureAwait(false)
                ?? throw new VaultNotFoundException();
            return file.OwnerUserId;
        }

        var drop = await db.Drops.AsNoTracking()
            .FirstOrDefaultAsync(d => d.Id == targetId && d.DeletedAt == null, cancellationToken)
            .ConfigureAwait(false)
            ?? throw new VaultNotFoundException();
        return drop.OwnerUserId;
    }
}
