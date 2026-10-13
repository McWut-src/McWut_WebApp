using FamilyVault.Files.Contracts;
using FamilyVault.Files.Data;
using FamilyVault.Files.Data.Entities;
using FamilyVault.Files.Security;
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

        if (targetKind == ShareTargetKind.Drop && await IsStoryAsync(targetId, cancellationToken).ConfigureAwait(false))
        {
            // A story is shared as a whole, and only to be read.
            permission = FilePermission.Download;
        }

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

    public async Task<IReadOnlyDictionary<Guid, IReadOnlyList<MemberTag>>> ListTagsForOwnerAsync(
        Guid ownerUserId,
        CancellationToken cancellationToken = default)
    {
        var now = time.GetUtcNow();
        var files = await db.StoredFiles.AsNoTracking()
            .Where(f => f.OwnerUserId == ownerUserId && f.DeletedAt == null && f.Status != FileStatus.Failed)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);
        var liveIds = files
            .Where(f => f.ExpiresAt is null || f.ExpiresAt > now)
            .Select(f => f.Id)
            .ToList();
        if (liveIds.Count == 0)
        {
            return new Dictionary<Guid, IReadOnlyList<MemberTag>>();
        }

        var grants = await db.FileGrants.AsNoTracking()
            .Where(g => g.TargetKind == ShareTargetKind.File && liveIds.Contains(g.TargetId))
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);
        var members = await MembersByIdAsync(grants.Select(g => g.UserId), cancellationToken).ConfigureAwait(false);
        return grants
            .GroupBy(g => g.TargetId)
            .ToDictionary(
                group => group.Key,
                group => (IReadOnlyList<MemberTag>)group
                    .OrderBy(g => g.GrantedAt)
                    .Select(g => TagFor(members, g.UserId))
                    .ToList());
    }

    public async Task<IReadOnlyList<IncomingFile>> ListIncomingAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var now = time.GetUtcNow();
        var grants = await db.FileGrants.AsNoTracking()
            .Where(g => g.UserId == userId)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);
        if (grants.Count == 0)
        {
            return [];
        }

        var fileIds = grants.Where(g => g.TargetKind == ShareTargetKind.File).Select(g => g.TargetId).ToList();
        var dropIds = grants.Where(g => g.TargetKind == ShareTargetKind.Drop).Select(g => g.TargetId).ToList();
        var files = await db.StoredFiles.AsNoTracking()
            .Where(f => f.DeletedAt == null
                        && f.Status == FileStatus.Ready
                        && (fileIds.Contains(f.Id) || (f.DropId != null && dropIds.Contains(f.DropId.Value))))
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);
        var storyDropIds = await StoryDropIdsAsync(dropIds, cancellationToken).ConfigureAwait(false);
        var directFileIds = grants
            .Where(g => g.TargetKind == ShareTargetKind.File)
            .Select(g => g.TargetId)
            .ToHashSet();
        var live = files
            .Where(f => f.ExpiresAt is null || f.ExpiresAt > now)
            .Where(f => f.DropId is null || !storyDropIds.Contains(f.DropId.Value) || directFileIds.Contains(f.Id))
            .OrderByDescending(f => f.CreatedAt)
            .ToList();
        var members = await MembersByIdAsync(live.Select(f => SharerId(f, grants)), cancellationToken).ConfigureAwait(false);
        return live
            .Select(f => new IncomingFile(f.ToRecord(), TagFor(members, SharerId(f, grants))))
            .ToList();
    }

    public async Task<IReadOnlyList<IncomingStory>> ListIncomingStoriesAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var now = time.GetUtcNow();
        var grants = await db.FileGrants.AsNoTracking()
            .Where(g => g.UserId == userId && g.TargetKind == ShareTargetKind.Drop)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);
        if (grants.Count == 0)
        {
            return [];
        }

        var dropIds = grants.Select(g => g.TargetId).ToList();
        var drops = await db.Drops.AsNoTracking()
            .Where(d => dropIds.Contains(d.Id) && d.IsStory && d.DeletedAt == null)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);
        var liveDrops = drops
            .Where(d => d.ExpiresAt is null || d.ExpiresAt > now)
            .ToList();
        if (liveDrops.Count == 0)
        {
            return [];
        }

        var ids = liveDrops.Select(d => d.Id).ToList();
        var files = await db.StoredFiles.AsNoTracking()
            .Where(f => f.DropId != null && ids.Contains(f.DropId.Value) && f.DeletedAt == null && f.Status == FileStatus.Ready)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);
        var stories = liveDrops
            .Select(drop => StoryComposer.Compose(drop, files, now))
            .OfType<Story>()
            .ToList();
        var members = await MembersByIdAsync(
            stories.Select(story => grants.First(g => g.TargetId == story.Id).GrantedByUserId),
            cancellationToken).ConfigureAwait(false);
        return stories
            .OrderByDescending(story => story.CreatedAt)
            .Select(story =>
            {
                var grant = grants.First(g => g.TargetId == story.Id);
                return new IncomingStory(story, TagFor(members, grant.GrantedByUserId));
            })
            .ToList();
    }

    public async Task<IReadOnlyDictionary<Guid, IReadOnlyList<MemberTag>>> ListTagsAsync(
        ShareTargetKind targetKind,
        IReadOnlyCollection<Guid> targetIds,
        CancellationToken cancellationToken = default)
    {
        if (targetIds.Count == 0)
        {
            return new Dictionary<Guid, IReadOnlyList<MemberTag>>();
        }

        var ids = targetIds.Distinct().ToList();
        var grants = await db.FileGrants.AsNoTracking()
            .Where(g => g.TargetKind == targetKind && ids.Contains(g.TargetId))
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);
        var members = await MembersByIdAsync(grants.Select(g => g.UserId), cancellationToken).ConfigureAwait(false);
        return grants
            .GroupBy(g => g.TargetId)
            .ToDictionary(
                group => group.Key,
                group => (IReadOnlyList<MemberTag>)group
                    .OrderBy(g => g.GrantedAt)
                    .Select(g => TagFor(members, g.UserId))
                    .ToList());
    }

    public async Task<IReadOnlyList<OutgoingMemberShare>> ListOutgoingAsync(
        Guid ownerUserId,
        CancellationToken cancellationToken = default)
    {
        var now = time.GetUtcNow();
        var files = await db.StoredFiles.AsNoTracking()
            .Where(f => f.OwnerUserId == ownerUserId && f.DeletedAt == null && f.Status == FileStatus.Ready)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);
        var live = files
            .Where(f => f.ExpiresAt is null || f.ExpiresAt > now)
            .ToDictionary(f => f.Id);
        var fileShares = new List<OutgoingMemberShare>();
        if (live.Count > 0)
        {
            var ids = live.Keys.ToList();
            var grants = await db.FileGrants.AsNoTracking()
                .Where(g => g.TargetKind == ShareTargetKind.File && ids.Contains(g.TargetId))
                .ToListAsync(cancellationToken)
                .ConfigureAwait(false);
            var members = await MembersByIdAsync(grants.Select(g => g.UserId), cancellationToken).ConfigureAwait(false);
            fileShares.AddRange(grants.Select(g =>
            {
                var file = live[g.TargetId];
                var tag = TagFor(members, g.UserId);
                return new OutgoingMemberShare(file.Id, file.OriginalFileName, tag.UserId, tag.DisplayName, tag.Color, g.GrantedAt);
            }));
        }

        var drops = await db.Drops.AsNoTracking()
            .Where(d => d.OwnerUserId == ownerUserId && d.DeletedAt == null && d.IsStory)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);
        var liveDrops = drops
            .Where(d => d.ExpiresAt is null || d.ExpiresAt > now)
            .ToList();
        var storyShares = new List<OutgoingMemberShare>();
        if (liveDrops.Count > 0)
        {
            var dropIds = liveDrops.Select(d => d.Id).ToList();
            var storyFiles = await db.StoredFiles.AsNoTracking()
                .Where(f => f.DropId != null && dropIds.Contains(f.DropId.Value) && f.DeletedAt == null && f.Status == FileStatus.Ready)
                .ToListAsync(cancellationToken)
                .ConfigureAwait(false);
            var withFiles = liveDrops
                .Where(d => StoryComposer.Compose(d, storyFiles, now) is not null)
                .Select(d => d.Id)
                .ToList();
            if (withFiles.Count > 0)
            {
                var grants = await db.FileGrants.AsNoTracking()
                    .Where(g => g.TargetKind == ShareTargetKind.Drop && withFiles.Contains(g.TargetId))
                    .ToListAsync(cancellationToken)
                    .ConfigureAwait(false);
                var members = await MembersByIdAsync(grants.Select(g => g.UserId), cancellationToken).ConfigureAwait(false);
                var titles = liveDrops.ToDictionary(d => d.Id, d => d.Title);
                storyShares.AddRange(grants.Select(g =>
                {
                    var tag = TagFor(members, g.UserId);
                    return new OutgoingMemberShare(
                        g.TargetId,
                        titles.TryGetValue(g.TargetId, out var title) && !string.IsNullOrWhiteSpace(title) ? title : "Story",
                        tag.UserId,
                        tag.DisplayName,
                        tag.Color,
                        g.GrantedAt,
                        ShareTargetKind.Drop);
                }));
            }
        }

        return fileShares
            .Concat(storyShares)
            .OrderByDescending(row => row.GrantedAt)
            .ToList();
    }

    private async Task<bool> IsStoryAsync(Guid dropId, CancellationToken cancellationToken)
    {
        var drop = await db.Drops.AsNoTracking()
            .FirstOrDefaultAsync(d => d.Id == dropId && d.DeletedAt == null, cancellationToken)
            .ConfigureAwait(false);
        return drop?.IsStory == true;
    }

    private async Task<HashSet<Guid>> StoryDropIdsAsync(List<Guid> dropIds, CancellationToken cancellationToken)
    {
        if (dropIds.Count == 0)
        {
            return [];
        }

        var ids = await db.Drops.AsNoTracking()
            .Where(d => dropIds.Contains(d.Id) && d.IsStory && d.DeletedAt == null)
            .Select(d => d.Id)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);
        return ids.ToHashSet();
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

    private async Task<Dictionary<Guid, FamilyMemberEntity>> MembersByIdAsync(
        IEnumerable<Guid> ids,
        CancellationToken cancellationToken)
    {
        var keys = ids.Where(id => id != Guid.Empty).Distinct().ToList();
        if (keys.Count == 0)
        {
            return new Dictionary<Guid, FamilyMemberEntity>();
        }

        var rows = await db.FamilyMembers.AsNoTracking()
            .Where(m => keys.Contains(m.UserId))
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);
        return rows.ToDictionary(m => m.UserId);
    }

    private static Guid SharerId(StoredFileEntity file, IReadOnlyList<FileGrantEntity> grants)
    {
        var fileGrant = grants.FirstOrDefault(g => g.TargetKind == ShareTargetKind.File && g.TargetId == file.Id);
        if (fileGrant is not null)
        {
            return fileGrant.GrantedByUserId;
        }

        if (file.DropId is Guid dropId)
        {
            var dropGrant = grants.FirstOrDefault(g => g.TargetKind == ShareTargetKind.Drop && g.TargetId == dropId);
            if (dropGrant is not null)
            {
                return dropGrant.GrantedByUserId;
            }
        }

        return file.OwnerUserId;
    }

    private static MemberTag TagFor(IReadOnlyDictionary<Guid, FamilyMemberEntity> members, Guid userId)
    {
        members.TryGetValue(userId, out var member);
        return new MemberTag(userId, MemberLabel.Shown(member?.DisplayName, member?.Email), ShownColor(member?.AccentColor));
    }

    private static string ShownColor(string? value)
    {
        const string fallback = "#0b1f3a";
        if (string.IsNullOrWhiteSpace(value))
        {
            return fallback;
        }

        var trimmed = value.Trim();
        if (trimmed.Length != 7 || trimmed[0] != '#')
        {
            return fallback;
        }

        for (var i = 1; i < trimmed.Length; i++)
        {
            if (!Uri.IsHexDigit(trimmed[i]))
            {
                return fallback;
            }
        }

        return trimmed.ToLowerInvariant();
    }
}
