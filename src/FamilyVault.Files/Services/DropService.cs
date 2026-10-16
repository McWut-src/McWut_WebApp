using FamilyVault.Files.Contracts;
using FamilyVault.Files.Data;
using FamilyVault.Files.Data.Entities;
using FamilyVault.Files.Security;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace FamilyVault.Files.Services;

public sealed class DropService(
    ApplicationDbContext db,
    IFileLibrary files,
    TimeProvider time,
    IPasswordHasher<object> passwordHasher) : IDropService
{
    public async Task<Drop> CreateAsync(Guid ownerUserId, CreateDropRequest request, CancellationToken cancellationToken = default)
    {
        var now = time.GetUtcNow();
        var drop = new DropEntity
        {
            Id = Guid.NewGuid(),
            OwnerUserId = ownerUserId,
            Title = string.IsNullOrWhiteSpace(request.Title) ? "Drop" : request.Title.Trim(),
            CreatedAt = now,
            ExpiresAt = request.Retention.ExpiresAt,
            MaxDownloads = request.Retention.MaxDownloads,
            PasswordHash = string.IsNullOrEmpty(request.Password) ? null : PasswordHashing.Hash(passwordHasher, request.Password),
            IsStory = request.IsStory
        };
        db.Drops.Add(drop);
        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        return drop.ToRecord();
    }

    public async Task<IReadOnlyList<Drop>> ListOwnedAsync(Guid ownerUserId, CancellationToken cancellationToken = default)
    {
        var now = time.GetUtcNow();
        var rows = await db.Drops.AsNoTracking()
            .Where(d => d.OwnerUserId == ownerUserId && d.DeletedAt == null)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);
        return rows
            .Where(d => d.ExpiresAt is null || d.ExpiresAt > now)
            .OrderByDescending(d => d.CreatedAt)
            .Select(d => d.ToRecord())
            .ToList();
    }

    public async Task<Drop?> GetAsync(Guid dropId, CancellationToken cancellationToken = default)
    {
        var row = await db.Drops.AsNoTracking()
            .FirstOrDefaultAsync(d => d.Id == dropId && d.DeletedAt == null, cancellationToken)
            .ConfigureAwait(false);
        return row?.ToRecord();
    }

    public async Task<IReadOnlyList<StoredFile>> ListFilesAsync(Guid dropId, CancellationToken cancellationToken = default)
    {
        var now = time.GetUtcNow();
        var rows = await db.StoredFiles.AsNoTracking()
            .Where(f => f.DropId == dropId && f.DeletedAt == null && f.Status == FileStatus.Ready)
            .OrderBy(f => f.OriginalFileName)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);
        return rows
            .Where(f => f.ExpiresAt is null || f.ExpiresAt > now)
            .Select(f => f.ToRecord())
            .ToList();
    }

    public async Task<Drop> UpdateAsync(Guid dropId, UpdateDropRequest request, CancellationToken cancellationToken = default)
    {
        var drop = await db.Drops.FirstOrDefaultAsync(d => d.Id == dropId && d.DeletedAt == null, cancellationToken).ConfigureAwait(false)
            ?? throw new VaultNotFoundException();

        if (request.Title is not null)
        {
            drop.Title = string.IsNullOrWhiteSpace(request.Title) ? drop.Title : request.Title.Trim();
        }

        if (request.Retention is { } retention)
        {
            drop.ExpiresAt = retention.ExpiresAt;
            drop.MaxDownloads = retention.MaxDownloads;
        }

        if (request.ClearPassword)
        {
            drop.PasswordHash = null;
        }
        else if (!string.IsNullOrEmpty(request.Password))
        {
            drop.PasswordHash = PasswordHashing.Hash(passwordHasher, request.Password);
        }

        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        return drop.ToRecord();
    }

    public async Task<Story> UpdateStoryAsync(Guid dropId, Guid ownerUserId, string? title, string? text, CancellationToken cancellationToken = default)
    {
        var drop = await db.Drops.FirstOrDefaultAsync(d => d.Id == dropId && d.OwnerUserId == ownerUserId && d.DeletedAt == null && d.IsStory, cancellationToken).ConfigureAwait(false)
            ?? throw new VaultNotFoundException();

        var now = time.GetUtcNow();
        var dropFiles = await db.StoredFiles.AsNoTracking()
            .Where(f => f.DropId == dropId && f.DeletedAt == null && f.Status == FileStatus.Ready)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);
        var currentStory = StoryComposer.Compose(drop, dropFiles, now) ?? throw new VaultNotFoundException();
        var bodyFile = currentStory.Body ?? throw new VaultNotFoundException();

        var cleanTitle = string.IsNullOrWhiteSpace(title) ? drop.Title : title.Trim();
        if (cleanTitle.Length > 200)
        {
            cleanTitle = cleanTitle[..200].Trim();
        }

        if (cleanTitle.Length == 0)
        {
            cleanTitle = "Story";
        }

        drop.Title = cleanTitle;
        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        await files.UpdateTextAsync(bodyFile.Id, StoryFiles.BodyFileName(cleanTitle), text, cancellationToken).ConfigureAwait(false);

        var updatedFiles = await db.StoredFiles.AsNoTracking()
            .Where(f => f.DropId == dropId && f.DeletedAt == null && f.Status == FileStatus.Ready)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);
        return StoryComposer.Compose(drop, updatedFiles, now) ?? throw new VaultNotFoundException();
    }

    public async Task DeleteAsync(Guid dropId, CancellationToken cancellationToken = default)
    {
        var now = time.GetUtcNow();
        var drop = await db.Drops.FirstOrDefaultAsync(d => d.Id == dropId && d.DeletedAt == null, cancellationToken).ConfigureAwait(false)
            ?? throw new VaultNotFoundException();
        drop.DeletedAt = now;
        var files = await db.StoredFiles.Where(f => f.DropId == dropId && f.DeletedAt == null).ToListAsync(cancellationToken).ConfigureAwait(false);
        foreach (var file in files)
        {
            file.DeletedAt = now;
        }

        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
    }

    public async Task<IReadOnlyList<Story>> ListOwnedStoriesAsync(Guid ownerUserId, CancellationToken cancellationToken = default)
    {
        var now = time.GetUtcNow();
        var drops = await db.Drops.AsNoTracking()
            .Where(d => d.OwnerUserId == ownerUserId && d.DeletedAt == null && d.IsStory)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);
        return await ComposeAsync(drops, now, cancellationToken).ConfigureAwait(false);
    }

    private async Task<IReadOnlyList<Story>> ComposeAsync(
        List<DropEntity> drops,
        DateTimeOffset now,
        CancellationToken cancellationToken)
    {
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
        return liveDrops
            .Select(drop => StoryComposer.Compose(drop, files, now))
            .OfType<Story>()
            .OrderByDescending(story => story.CreatedAt)
            .ToList();
    }
}
