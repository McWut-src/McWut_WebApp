using FamilyVault.Files.Contracts;
using FamilyVault.Files.Data;
using FamilyVault.Files.Data.Entities;
using FamilyVault.Files.Security;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace FamilyVault.Files.Services;

public sealed class FileAccessService(
    ApplicationDbContext db,
    TimeProvider time,
    IPasswordHasher<object> passwordHasher) : IFileAccessService
{
    public async Task<AccessDecision> AuthorizeFileAsync(
        AccessContext context,
        Guid fileId,
        AccessIntent intent,
        CancellationToken cancellationToken = default)
    {
        var file = await db.StoredFiles.AsNoTracking()
            .FirstOrDefaultAsync(f => f.Id == fileId, cancellationToken)
            .ConfigureAwait(false);
        if (file is null || file.DeletedAt is not null)
        {
            return AccessDecision.Deny;
        }

        if (!IsUsable(file.Status, file.ExpiresAt, file.MaxDownloads, file.DownloadCount, intent))
        {
            return AccessDecision.Deny;
        }

        if (context.UserId is Guid owner && owner == file.OwnerUserId)
        {
            return AccessDecision.Allow;
        }

        if (context.UserId is Guid userId)
        {
            var grant = await FindGrantAsync(userId, ShareTargetKind.File, fileId, file.DropId, cancellationToken).ConfigureAwait(false);
            if (grant is not null && grant.Permission.Covers(intent))
            {
                return AccessDecision.Allow;
            }
        }

        if (!string.IsNullOrWhiteSpace(context.ShareToken))
        {
            return await AuthorizeTokenAsync(
                    context,
                    intent,
                    ShareTargetKind.File,
                    fileId,
                    file.DropId,
                    file.PasswordHash,
                    cancellationToken)
                .ConfigureAwait(false);
        }

        return AccessDecision.Deny;
    }

    public async Task<AccessDecision> AuthorizeDropAsync(
        AccessContext context,
        Guid dropId,
        AccessIntent intent,
        CancellationToken cancellationToken = default)
    {
        var drop = await db.Drops.AsNoTracking()
            .FirstOrDefaultAsync(d => d.Id == dropId, cancellationToken)
            .ConfigureAwait(false);
        if (drop is null || drop.DeletedAt is not null)
        {
            return AccessDecision.Deny;
        }

        if (!IsUsable(FileStatus.Ready, drop.ExpiresAt, drop.MaxDownloads, drop.DownloadCount, intent))
        {
            return AccessDecision.Deny;
        }

        if (context.UserId is Guid owner && owner == drop.OwnerUserId)
        {
            return AccessDecision.Allow;
        }

        if (context.UserId is Guid userId)
        {
            var grant = await FindGrantAsync(userId, ShareTargetKind.Drop, dropId, parentDropId: null, cancellationToken).ConfigureAwait(false);
            if (grant is not null && grant.Permission.Covers(intent))
            {
                return AccessDecision.Allow;
            }
        }

        if (!string.IsNullOrWhiteSpace(context.ShareToken))
        {
            return await AuthorizeTokenAsync(
                    context,
                    intent,
                    ShareTargetKind.Drop,
                    dropId,
                    parentDropId: null,
                    drop.PasswordHash,
                    cancellationToken)
                .ConfigureAwait(false);
        }

        return AccessDecision.Deny;
    }

    private bool IsUsable(FileStatus status, DateTimeOffset? expiresAt, int? maxDownloads, int downloadCount, AccessIntent intent)
    {
        var now = time.GetUtcNow();
        if (expiresAt is DateTimeOffset exp && exp <= now)
        {
            return false;
        }

        if (status == FileStatus.Failed)
        {
            return false;
        }

        if (status == FileStatus.Pending)
        {
            return intent is AccessIntent.List or AccessIntent.Manage;
        }

        if (intent is AccessIntent.Download or AccessIntent.Preview
            && maxDownloads is int max
            && downloadCount >= max)
        {
            return false;
        }

        return true;
    }

    private async Task<FileGrantEntity?> FindGrantAsync(
        Guid userId,
        ShareTargetKind kind,
        Guid targetId,
        Guid? parentDropId,
        CancellationToken cancellationToken)
    {
        var grants = await db.FileGrants.AsNoTracking()
            .Where(g => g.UserId == userId)
            .Where(g =>
                (g.TargetKind == kind && g.TargetId == targetId)
                || (parentDropId != null && g.TargetKind == ShareTargetKind.Drop && g.TargetId == parentDropId))
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);
        return grants.OrderByDescending(g => g.Permission).FirstOrDefault();
    }

    private async Task<AccessDecision> AuthorizeTokenAsync(
        AccessContext context,
        AccessIntent intent,
        ShareTargetKind kind,
        Guid targetId,
        Guid? parentDropId,
        string? targetPasswordHash,
        CancellationToken cancellationToken)
    {
        if (intent == AccessIntent.Manage)
        {
            return AccessDecision.Deny;
        }

        var link = await db.ShareLinks.AsNoTracking()
            .FirstOrDefaultAsync(l => l.Token == context.ShareToken, cancellationToken)
            .ConfigureAwait(false);
        if (link is null || link.RevokedAt is not null)
        {
            return AccessDecision.Deny;
        }

        var now = time.GetUtcNow();
        if (link.ExpiresAt is DateTimeOffset exp && exp <= now)
        {
            return AccessDecision.Deny;
        }

        if (link.MaxDownloads is int max && link.DownloadCount >= max)
        {
            return AccessDecision.Deny;
        }

        var matches = (link.TargetKind == kind && link.TargetId == targetId)
            || (kind == ShareTargetKind.File && parentDropId is Guid dropId && link.TargetKind == ShareTargetKind.Drop && link.TargetId == dropId);
        if (!matches)
        {
            return AccessDecision.Deny;
        }

        if (intent == AccessIntent.Preview && !link.AllowPreview)
        {
            return AccessDecision.Deny;
        }

        var hash = link.PasswordHash ?? targetPasswordHash;
        if (hash is not null)
        {
            if (string.IsNullOrEmpty(context.ProvidedPassword))
            {
                return AccessDecision.PasswordRequired;
            }

            if (!PasswordHashing.Verify(passwordHasher, hash, context.ProvidedPassword))
            {
                return AccessDecision.PasswordRequired;
            }
        }

        return AccessDecision.Allow;
    }
}
