using System.Security.Cryptography;
using FamilyVault.Files.Configuration;
using FamilyVault.Files.Contracts;
using FamilyVault.Files.Data;
using FamilyVault.Files.Data.Entities;
using FamilyVault.Files.Security;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace FamilyVault.Files.Services;

public sealed class UploadSessionService(
    ApplicationDbContext db,
    IObjectStore store,
    IQuotaService quota,
    IContentScanner scanner,
    TimeProvider time,
    IPasswordHasher<object> passwordHasher,
    IOptions<FilesOptions> options) : IUploadSessionService
{
    public async Task<UploadSession> BeginAsync(BeginUploadRequest request, CancellationToken cancellationToken = default)
    {
        var name = FileNameSanitizer.Sanitize(request.OriginalFileName);
        if (request.SizeBytes <= 0)
        {
            throw new InvalidFileNameException("That file is empty. Choose a file that has some content.");
        }

        if (request.SizeBytes > options.Value.MaxFileSizeBytes)
        {
            throw new FileTooLargeException(request.SizeBytes, options.Value.MaxFileSizeBytes);
        }

        var contentType = NormalizeContentType(request.ContentType);
        EnsureContentTypeAllowed(contentType, options.Value);

        if (request.DropId is Guid dropId)
        {
            var dropExists = await db.Drops.AsNoTracking()
                .AnyAsync(d => d.Id == dropId && d.DeletedAt == null && d.OwnerUserId == request.OwnerUserId, cancellationToken)
                .ConfigureAwait(false);
            if (!dropExists)
            {
                throw new VaultNotFoundException();
            }
        }

        await quota.EnsureCanAcceptAsync(request.OwnerUserId, request.SizeBytes, cancellationToken).ConfigureAwait(false);

        var now = time.GetUtcNow();
        var fileId = Guid.NewGuid();
        var storageKey = StorageKeys.For(request.OwnerUserId, fileId);
        var file = new StoredFileEntity
        {
            Id = fileId,
            OwnerUserId = request.OwnerUserId,
            OriginalFileName = name,
            ContentType = contentType,
            SizeBytes = request.SizeBytes,
            StorageKey = storageKey,
            Status = FileStatus.Pending,
            CreatedAt = now,
            ExpiresAt = request.Retention.ExpiresAt,
            MaxDownloads = request.Retention.MaxDownloads,
            PasswordHash = string.IsNullOrEmpty(request.Password) ? null : PasswordHashing.Hash(passwordHasher, request.Password),
            DropId = request.DropId
        };
        var session = new UploadSessionEntity
        {
            SessionId = Guid.NewGuid(),
            FileId = fileId,
            OwnerUserId = request.OwnerUserId,
            StorageKey = storageKey,
            ExpectedSize = request.SizeBytes,
            BytesReceived = 0,
            ExpiresAt = now.AddHours(options.Value.AbandonedUploadHours),
            Status = UploadSessionStatus.Open
        };
        db.StoredFiles.Add(file);
        db.UploadSessions.Add(session);
        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        return session.ToRecord();
    }

    public async Task PutAsync(Guid sessionId, Guid ownerUserId, Stream content, CancellationToken cancellationToken = default)
    {
        var session = await db.UploadSessions
            .Include(s => s.File)
            .FirstOrDefaultAsync(s => s.SessionId == sessionId && s.OwnerUserId == ownerUserId, cancellationToken)
            .ConfigureAwait(false)
            ?? throw new VaultNotFoundException();

        if (session.Status != UploadSessionStatus.Open || session.File.DeletedAt is not null)
        {
            throw new VaultNotFoundException();
        }

        using var hasher = IncrementalHash.CreateHash(HashAlgorithmName.SHA256);
        var hashing = new HashingStream(content, hasher);
        try
        {
            await store.PutAsync(session.StorageKey, hashing, session.ExpectedSize, cancellationToken).ConfigureAwait(false);
            session.BytesReceived = session.ExpectedSize;
            session.File.ChecksumSha256 = Convert.ToHexString(hasher.GetHashAndReset()).ToLowerInvariant();
            await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        }
        catch
        {
            session.File.Status = FileStatus.Failed;
            session.Status = UploadSessionStatus.Aborted;
            await db.SaveChangesAsync(CancellationToken.None).ConfigureAwait(false);
            throw;
        }
    }

    public async Task<StoredFile> CompleteAsync(Guid sessionId, Guid ownerUserId, CancellationToken cancellationToken = default)
    {
        var session = await db.UploadSessions
            .Include(s => s.File)
            .FirstOrDefaultAsync(s => s.SessionId == sessionId && s.OwnerUserId == ownerUserId, cancellationToken)
            .ConfigureAwait(false)
            ?? throw new VaultNotFoundException();

        if (session.Status != UploadSessionStatus.Open || session.BytesReceived <= 0)
        {
            throw new VaultNotFoundException();
        }

        await using var stored = await store.OpenReadAsync(session.StorageKey, range: null, cancellationToken).ConfigureAwait(false);
        var scan = await scanner.ScanAsync(stored, cancellationToken).ConfigureAwait(false);
        if (!scan.Allowed)
        {
            session.File.Status = FileStatus.Failed;
            session.Status = UploadSessionStatus.Aborted;
            await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
            throw new VaultNotFoundException();
        }

        session.File.Status = FileStatus.Ready;
        session.Status = UploadSessionStatus.Completed;
        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        return session.File.ToRecord();
    }

    public async Task AbortAsync(Guid sessionId, Guid ownerUserId, CancellationToken cancellationToken = default)
    {
        var session = await db.UploadSessions
            .Include(s => s.File)
            .FirstOrDefaultAsync(s => s.SessionId == sessionId && s.OwnerUserId == ownerUserId, cancellationToken)
            .ConfigureAwait(false)
            ?? throw new VaultNotFoundException();

        session.Status = UploadSessionStatus.Aborted;
        session.File.Status = FileStatus.Failed;
        session.File.DeletedAt = time.GetUtcNow();
        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
    }

    private sealed class HashingStream(Stream inner, IncrementalHash hasher) : Stream
    {
        public override bool CanRead => inner.CanRead;
        public override bool CanSeek => false;
        public override bool CanWrite => false;
        public override long Length => throw new NotSupportedException();
        public override long Position
        {
            get => throw new NotSupportedException();
            set => throw new NotSupportedException();
        }

        public override int Read(byte[] buffer, int offset, int count)
        {
            var read = inner.Read(buffer, offset, count);
            if (read > 0)
            {
                hasher.AppendData(buffer, offset, read);
            }

            return read;
        }

        public override async Task<int> ReadAsync(byte[] buffer, int offset, int count, CancellationToken cancellationToken)
        {
            var read = await inner.ReadAsync(buffer.AsMemory(offset, count), cancellationToken).ConfigureAwait(false);
            if (read > 0)
            {
                hasher.AppendData(buffer, offset, read);
            }

            return read;
        }

        public override async ValueTask<int> ReadAsync(Memory<byte> buffer, CancellationToken cancellationToken = default)
        {
            var read = await inner.ReadAsync(buffer, cancellationToken).ConfigureAwait(false);
            if (read > 0)
            {
                hasher.AppendData(buffer.Span[..read]);
            }

            return read;
        }

        public override void Flush() => inner.Flush();
        public override long Seek(long offset, SeekOrigin origin) => throw new NotSupportedException();
        public override void SetLength(long value) => throw new NotSupportedException();
        public override void Write(byte[] buffer, int offset, int count) => throw new NotSupportedException();
    }

    private static string NormalizeContentType(string? contentType)
    {
        if (string.IsNullOrWhiteSpace(contentType))
        {
            return "application/octet-stream";
        }

        var media = contentType.Split(';', 2)[0].Trim();
        return string.IsNullOrWhiteSpace(media) ? "application/octet-stream" : media;
    }

    private static void EnsureContentTypeAllowed(string contentType, FilesOptions files)
    {
        if (files.DeniedContentTypes.Contains(contentType, StringComparer.OrdinalIgnoreCase))
        {
            throw new InvalidContentTypeException(contentType);
        }

        if (files.AllowAnyContentType)
        {
            return;
        }

        if (!files.AllowedContentTypes.Contains(contentType, StringComparer.OrdinalIgnoreCase))
        {
            throw new InvalidContentTypeException(contentType);
        }
    }
}
