using FamilyVault.Files.Configuration;
using FamilyVault.Files.Contracts;
using FamilyVault.Files.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace FamilyVault.Files.Services;

public sealed class FileLifecycle(
    ApplicationDbContext db,
    IObjectStore store,
    TimeProvider time,
    IOptions<FilesOptions> options) : IFileLifecycle
{
    public async Task SweepExpiredAsync(CancellationToken cancellationToken = default)
    {
        var now = time.GetUtcNow();
        var fileCandidates = await db.StoredFiles
            .Where(f => f.DeletedAt == null && (f.ExpiresAt != null || f.MaxDownloads != null))
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);
        var files = fileCandidates.Where(f =>
                (f.ExpiresAt is DateTimeOffset fileExpiry && fileExpiry <= now)
                || (f.MaxDownloads is int fileMax && f.DownloadCount >= fileMax))
            .ToList();

        foreach (var file in files)
        {
            await TryDeleteBlobAsync(file.StorageKey, cancellationToken).ConfigureAwait(false);
            file.DeletedAt = now;
        }

        var dropCandidates = await db.Drops
            .Where(d => d.DeletedAt == null && (d.ExpiresAt != null || d.MaxDownloads != null))
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);
        var drops = dropCandidates.Where(d =>
                (d.ExpiresAt is DateTimeOffset dropExpiry && dropExpiry <= now)
                || (d.MaxDownloads is int dropMax && d.DownloadCount >= dropMax))
            .ToList();
        foreach (var drop in drops)
        {
            drop.DeletedAt = now;
        }

        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
    }

    public async Task SweepAbandonedUploadsAsync(CancellationToken cancellationToken = default)
    {
        var now = time.GetUtcNow();
        var openSessions = await db.UploadSessions
            .Include(s => s.File)
            .Where(s => s.Status == UploadSessionStatus.Open)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);
        var sessions = openSessions.Where(s => s.ExpiresAt <= now).ToList();

        foreach (var session in sessions)
        {
            session.Status = UploadSessionStatus.Aborted;
            session.File.Status = FileStatus.Failed;
            session.File.DeletedAt = now;
            await TryDeleteBlobAsync(session.StorageKey, cancellationToken).ConfigureAwait(false);
        }

        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
    }

    public async Task SweepSoftDeletedAsync(CancellationToken cancellationToken = default)
    {
        var cutoff = time.GetUtcNow().AddDays(-options.Value.SoftDeleteGraceDays);
        var deletedFiles = await db.StoredFiles
            .Where(f => f.DeletedAt != null)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);
        var files = deletedFiles.Where(f => f.DeletedAt <= cutoff).ToList();

        foreach (var file in files)
        {
            await TryDeleteBlobAsync(file.StorageKey, cancellationToken).ConfigureAwait(false);
            db.StoredFiles.Remove(file);
        }

        var deletedDrops = await db.Drops
            .Where(d => d.DeletedAt != null)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);
        var drops = deletedDrops.Where(d => d.DeletedAt <= cutoff).ToList();
        foreach (var drop in drops)
        {
            db.Drops.Remove(drop);
        }

        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
    }

    private async Task TryDeleteBlobAsync(string storageKey, CancellationToken cancellationToken)
    {
        try
        {
            if (await store.ExistsAsync(storageKey, cancellationToken).ConfigureAwait(false))
            {
                await store.DeleteAsync(storageKey, cancellationToken).ConfigureAwait(false);
            }
        }
        catch
        {
            // Sweeper continues; a later pass retries remaining blobs.
        }
    }
}
