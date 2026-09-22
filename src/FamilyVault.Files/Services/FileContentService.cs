using System.IO.Compression;
using FamilyVault.Files.Contracts;
using FamilyVault.Files.Data;
using FamilyVault.Files.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace FamilyVault.Files.Services;

public sealed class FileContentService(
    ApplicationDbContext db,
    IObjectStore store,
    IFileAccessService access,
    IFileAudit audit,
    TimeProvider time) : IFileContentService
{
    public Task<OpenedContent> OpenDownloadAsync(AccessContext context, Guid fileId, ByteRange? range, CancellationToken cancellationToken = default) =>
        OpenFileAsync(context, fileId, AccessIntent.Download, range, increment: true, cancellationToken);

    public Task<OpenedContent> OpenPreviewAsync(AccessContext context, Guid fileId, ByteRange? range, CancellationToken cancellationToken = default) =>
        OpenFileAsync(context, fileId, AccessIntent.Preview, range, increment: false, cancellationToken);

    public async Task<OpenedContent> OpenDropArchiveAsync(AccessContext context, Guid dropId, CancellationToken cancellationToken = default)
    {
        var decision = await access.AuthorizeDropAsync(context, dropId, AccessIntent.Download, cancellationToken).ConfigureAwait(false);
        ThrowFor(decision);

        var now = time.GetUtcNow();
        var drop = await db.Drops.FirstOrDefaultAsync(d => d.Id == dropId && d.DeletedAt == null, cancellationToken).ConfigureAwait(false)
            ?? throw new VaultNotFoundException();

        var files = await db.StoredFiles
            .Where(f => f.DropId == dropId && f.DeletedAt == null && f.Status == FileStatus.Ready)
            .OrderBy(f => f.OriginalFileName)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);
        if (files.Count == 0)
        {
            throw new VaultNotFoundException();
        }

        await IncrementDropAsync(drop, cancellationToken).ConfigureAwait(false);
        if (!string.IsNullOrWhiteSpace(context.ShareToken))
        {
            await IncrementLinkAsync(context.ShareToken, cancellationToken).ConfigureAwait(false);
        }

        var tempPath = Path.GetTempFileName();
        var zipStream = new FileStream(tempPath, FileMode.Create, FileAccess.ReadWrite, FileShare.None, 64 * 1024, FileOptions.DeleteOnClose);
        try
        {
            using (var zip = new ZipArchive(zipStream, ZipArchiveMode.Create, leaveOpen: true))
            {
                var usedNames = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
                foreach (var file in files)
                {
                    var entryName = UniqueZipName(file.OriginalFileName, usedNames);
                    var entry = zip.CreateEntry(entryName, CompressionLevel.Fastest);
                    await using var entryStream = entry.Open();
                    await using var source = await store.OpenReadAsync(file.StorageKey, range: null, cancellationToken).ConfigureAwait(false);
                    await source.CopyToAsync(entryStream, cancellationToken).ConfigureAwait(false);
                    file.DownloadCount++;
                }
            }

            await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
            zipStream.Position = 0;
            await audit.RecordAsync("Download", ShareTargetKind.Drop, dropId, context.UserId, context.ShareToken, "archive", cancellationToken).ConfigureAwait(false);
            var fileName = string.IsNullOrWhiteSpace(drop.Title) ? "drop.zip" : drop.Title + ".zip";
            return new OpenedContent
            {
                Stream = zipStream,
                FileName = fileName,
                ContentType = "application/zip",
                ContentLength = zipStream.Length,
                TotalLength = zipStream.Length
            };
        }
        catch
        {
            await zipStream.DisposeAsync().ConfigureAwait(false);
            throw;
        }
    }

    private async Task<OpenedContent> OpenFileAsync(
        AccessContext context,
        Guid fileId,
        AccessIntent intent,
        ByteRange? range,
        bool increment,
        CancellationToken cancellationToken)
    {
        var decision = await access.AuthorizeFileAsync(context, fileId, intent, cancellationToken).ConfigureAwait(false);
        ThrowFor(decision);

        var file = await db.StoredFiles.FirstOrDefaultAsync(f => f.Id == fileId && f.DeletedAt == null, cancellationToken).ConfigureAwait(false)
            ?? throw new VaultNotFoundException();

        ByteRange? validated = null;
        var isPartial = false;
        long? rangeStart = null;
        long? rangeEnd = null;
        var length = file.SizeBytes;
        if (range is not null)
        {
            if (range.From < 0 || range.From >= file.SizeBytes)
            {
                throw new InvalidRangeException();
            }

            var end = range.To ?? (file.SizeBytes - 1);
            if (end < range.From || end >= file.SizeBytes)
            {
                throw new InvalidRangeException();
            }

            validated = new ByteRange(range.From, end);
            isPartial = range.From != 0 || end != file.SizeBytes - 1;
            rangeStart = range.From;
            rangeEnd = end;
            length = end - range.From + 1;
        }

        if (increment && !isPartial)
        {
            await IncrementFileAsync(file, cancellationToken).ConfigureAwait(false);
            if (file.DropId is Guid dropId)
            {
                var drop = await db.Drops.FirstOrDefaultAsync(d => d.Id == dropId, cancellationToken).ConfigureAwait(false);
                if (drop is not null)
                {
                    await IncrementDropAsync(drop, cancellationToken).ConfigureAwait(false);
                }
            }

            if (!string.IsNullOrWhiteSpace(context.ShareToken))
            {
                await IncrementLinkAsync(context.ShareToken, cancellationToken).ConfigureAwait(false);
            }
        }

        var stream = await store.OpenReadAsync(file.StorageKey, validated, cancellationToken).ConfigureAwait(false);
        await audit.RecordAsync(intent == AccessIntent.Preview ? "Preview" : "Download", ShareTargetKind.File, fileId, context.UserId, context.ShareToken, null, cancellationToken).ConfigureAwait(false);
        return new OpenedContent
        {
            Stream = stream,
            FileName = file.OriginalFileName,
            ContentType = file.ContentType,
            ContentLength = length,
            TotalLength = file.SizeBytes,
            IsPartial = isPartial,
            RangeStart = rangeStart,
            RangeEnd = rangeEnd
        };
    }

    private async Task IncrementFileAsync(StoredFileEntity file, CancellationToken cancellationToken)
    {
        if (file.MaxDownloads is int max)
        {
            var rows = await db.StoredFiles
                .Where(f => f.Id == file.Id && f.DownloadCount < max)
                .ExecuteUpdateAsync(s => s.SetProperty(f => f.DownloadCount, f => f.DownloadCount + 1), cancellationToken)
                .ConfigureAwait(false);
            if (rows == 0)
            {
                throw new VaultNotFoundException();
            }

            file.DownloadCount++;
            return;
        }

        await db.StoredFiles
            .Where(f => f.Id == file.Id)
            .ExecuteUpdateAsync(s => s.SetProperty(f => f.DownloadCount, f => f.DownloadCount + 1), cancellationToken)
            .ConfigureAwait(false);
        file.DownloadCount++;
    }

    private async Task IncrementDropAsync(DropEntity drop, CancellationToken cancellationToken)
    {
        if (drop.MaxDownloads is int max)
        {
            var rows = await db.Drops
                .Where(d => d.Id == drop.Id && d.DownloadCount < max)
                .ExecuteUpdateAsync(s => s.SetProperty(d => d.DownloadCount, d => d.DownloadCount + 1), cancellationToken)
                .ConfigureAwait(false);
            if (rows == 0)
            {
                throw new VaultNotFoundException();
            }

            drop.DownloadCount++;
            return;
        }

        await db.Drops
            .Where(d => d.Id == drop.Id)
            .ExecuteUpdateAsync(s => s.SetProperty(d => d.DownloadCount, d => d.DownloadCount + 1), cancellationToken)
            .ConfigureAwait(false);
        drop.DownloadCount++;
    }

    private async Task IncrementLinkAsync(string token, CancellationToken cancellationToken)
    {
        var link = await db.ShareLinks.FirstOrDefaultAsync(l => l.Token == token, cancellationToken).ConfigureAwait(false);
        if (link is null)
        {
            return;
        }

        if (link.MaxDownloads is int max)
        {
            var rows = await db.ShareLinks
                .Where(l => l.Id == link.Id && l.DownloadCount < max)
                .ExecuteUpdateAsync(s => s.SetProperty(l => l.DownloadCount, l => l.DownloadCount + 1), cancellationToken)
                .ConfigureAwait(false);
            if (rows == 0)
            {
                throw new VaultNotFoundException();
            }

            return;
        }

        await db.ShareLinks
            .Where(l => l.Id == link.Id)
            .ExecuteUpdateAsync(s => s.SetProperty(l => l.DownloadCount, l => l.DownloadCount + 1), cancellationToken)
            .ConfigureAwait(false);
    }

    private static void ThrowFor(AccessDecision decision)
    {
        if (decision.RequiresPassword)
        {
            throw new PasswordRequiredException();
        }

        if (!decision.Allowed)
        {
            throw new VaultNotFoundException();
        }
    }

    private static string UniqueZipName(string original, HashSet<string> used)
    {
        if (used.Add(original))
        {
            return original;
        }

        var name = Path.GetFileNameWithoutExtension(original);
        var ext = Path.GetExtension(original);
        var i = 2;
        string candidate;
        do
        {
            candidate = $"{name} ({i}){ext}";
            i++;
        } while (!used.Add(candidate));

        return candidate;
    }
}
