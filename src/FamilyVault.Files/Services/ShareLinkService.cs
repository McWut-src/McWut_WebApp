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
            Token = ShareTokenGenerator.Create(),
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
}
