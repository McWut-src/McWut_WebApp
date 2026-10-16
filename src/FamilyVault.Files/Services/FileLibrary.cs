using System.Security.Cryptography;
using System.Text;
using FamilyVault.Files.Contracts;
using FamilyVault.Files.Data;
using FamilyVault.Files.Security;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace FamilyVault.Files.Services;

public sealed class FileLibrary(
    ApplicationDbContext db,
    IObjectStore store,
    IQuotaService quota,
    TimeProvider time,
    IPasswordHasher<object> passwordHasher) : IFileLibrary
{
    public async Task<IReadOnlyList<StoredFile>> ListOwnedAsync(Guid ownerUserId, CancellationToken cancellationToken = default)
    {
        var now = time.GetUtcNow();
        var rows = await db.StoredFiles.AsNoTracking()
            .Where(f => f.OwnerUserId == ownerUserId
                        && f.DeletedAt == null
                        && f.Status != FileStatus.Failed)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);
        return rows
            .Where(f => f.ExpiresAt is null || f.ExpiresAt > now)
            .OrderByDescending(f => f.CreatedAt)
            .Select(f => f.ToRecord())
            .ToList();
    }

    public async Task<StoredFile?> GetAsync(Guid fileId, CancellationToken cancellationToken = default)
    {
        var row = await db.StoredFiles.AsNoTracking()
            .FirstOrDefaultAsync(f => f.Id == fileId && f.DeletedAt == null, cancellationToken)
            .ConfigureAwait(false);
        return row?.ToRecord();
    }

    public async Task<StoredFile> UpdateAsync(Guid fileId, UpdateStoredFileRequest request, CancellationToken cancellationToken = default)
    {
        var file = await db.StoredFiles.FirstOrDefaultAsync(f => f.Id == fileId && f.DeletedAt == null, cancellationToken).ConfigureAwait(false)
            ?? throw new VaultNotFoundException();

        if (request.Retention is { } retention)
        {
            file.ExpiresAt = retention.ExpiresAt;
            file.MaxDownloads = retention.MaxDownloads;
        }

        if (request.ClearPassword)
        {
            file.PasswordHash = null;
        }
        else if (!string.IsNullOrEmpty(request.Password))
        {
            file.PasswordHash = PasswordHashing.Hash(passwordHasher, request.Password);
        }

        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        return file.ToRecord();
    }

    public async Task<StoredFile> UpdateTextAsync(Guid fileId, string? fileName, string? text, CancellationToken cancellationToken = default)
    {
        var file = await db.StoredFiles.FirstOrDefaultAsync(f => f.Id == fileId && f.DeletedAt == null && f.Status == FileStatus.Ready, cancellationToken).ConfigureAwait(false)
            ?? throw new VaultNotFoundException();

        if (!ReadableFiles.IsReadable(file.ContentType, file.OriginalFileName))
        {
            throw new InvalidFileNameException("Only text and Markdown notes can be edited.");
        }

        var body = text ?? "";
        if (string.IsNullOrWhiteSpace(body))
        {
            throw new InvalidFileNameException("Write something before saving.");
        }

        var bytes = Encoding.UTF8.GetBytes(body);
        if (bytes.Length > ReadableFiles.MaxPreviewBytes)
        {
            throw new FileTooLargeException(bytes.Length, ReadableFiles.MaxPreviewBytes);
        }

        var delta = bytes.Length - file.SizeBytes;
        if (delta > 0)
        {
            await quota.EnsureCanAcceptAsync(file.OwnerUserId, delta, cancellationToken).ConfigureAwait(false);
        }

        if (!string.IsNullOrWhiteSpace(fileName))
        {
            var currentExt = Path.GetExtension(file.OriginalFileName);
            var trimmed = fileName.Trim();
            if (!string.IsNullOrEmpty(currentExt) && string.IsNullOrEmpty(Path.GetExtension(trimmed)))
            {
                trimmed += currentExt;
            }

            file.OriginalFileName = FileNameSanitizer.Sanitize(trimmed);
            if (file.ContentType != OpenRouterRules.ChatContentType)
            {
                file.ContentType = ReadableFiles.InferContentType(file.OriginalFileName, file.ContentType);
            }
        }

        await using var stream = new MemoryStream(bytes);
        await store.PutAsync(file.StorageKey, stream, bytes.Length, cancellationToken).ConfigureAwait(false);
        file.SizeBytes = bytes.Length;
        file.ChecksumSha256 = Convert.ToHexString(SHA256.HashData(bytes)).ToLowerInvariant();
        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        return file.ToRecord();
    }

    public async Task DeleteAsync(Guid fileId, CancellationToken cancellationToken = default)
    {
        var file = await db.StoredFiles.FirstOrDefaultAsync(f => f.Id == fileId && f.DeletedAt == null, cancellationToken).ConfigureAwait(false)
            ?? throw new VaultNotFoundException();
        file.DeletedAt = time.GetUtcNow();
        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
    }
}
