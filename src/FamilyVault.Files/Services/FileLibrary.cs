using FamilyVault.Files.Contracts;
using FamilyVault.Files.Data;
using FamilyVault.Files.Security;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace FamilyVault.Files.Services;

public sealed class FileLibrary(
    ApplicationDbContext db,
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

    public async Task DeleteAsync(Guid fileId, CancellationToken cancellationToken = default)
    {
        var file = await db.StoredFiles.FirstOrDefaultAsync(f => f.Id == fileId && f.DeletedAt == null, cancellationToken).ConfigureAwait(false)
            ?? throw new VaultNotFoundException();
        file.DeletedAt = time.GetUtcNow();
        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
    }
}
