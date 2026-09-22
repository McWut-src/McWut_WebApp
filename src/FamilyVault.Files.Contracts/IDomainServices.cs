namespace FamilyVault.Files.Contracts;

public interface IFileLibrary
{
    Task<IReadOnlyList<StoredFile>> ListOwnedAsync(Guid ownerUserId, CancellationToken cancellationToken = default);
    Task<StoredFile?> GetAsync(Guid fileId, CancellationToken cancellationToken = default);
    Task<StoredFile> UpdateAsync(Guid fileId, UpdateStoredFileRequest request, CancellationToken cancellationToken = default);
    Task DeleteAsync(Guid fileId, CancellationToken cancellationToken = default);
}

public interface IDropService
{
    Task<Drop> CreateAsync(Guid ownerUserId, CreateDropRequest request, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Drop>> ListOwnedAsync(Guid ownerUserId, CancellationToken cancellationToken = default);
    Task<Drop?> GetAsync(Guid dropId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<StoredFile>> ListFilesAsync(Guid dropId, CancellationToken cancellationToken = default);
    Task<Drop> UpdateAsync(Guid dropId, UpdateDropRequest request, CancellationToken cancellationToken = default);
    Task DeleteAsync(Guid dropId, CancellationToken cancellationToken = default);
}

public interface IUploadSessionService
{
    Task<UploadSession> BeginAsync(BeginUploadRequest request, CancellationToken cancellationToken = default);
    Task PutAsync(Guid sessionId, Guid ownerUserId, Stream content, CancellationToken cancellationToken = default);
    Task<StoredFile> CompleteAsync(Guid sessionId, Guid ownerUserId, CancellationToken cancellationToken = default);
    Task AbortAsync(Guid sessionId, Guid ownerUserId, CancellationToken cancellationToken = default);
}

public interface IShareLinkService
{
    Task<ShareLink> CreateAsync(ShareTargetKind targetKind, Guid targetId, Guid createdByUserId, CreateShareLinkRequest request, CancellationToken cancellationToken = default);
    Task RevokeAsync(string token, Guid actorUserId, CancellationToken cancellationToken = default);
    Task<ShareLink?> ResolveAsync(string token, CancellationToken cancellationToken = default);
}

public interface IGrantService
{
    Task<FileGrant> GrantAsync(ShareTargetKind targetKind, Guid targetId, Guid userId, FilePermission permission, Guid grantedByUserId, CancellationToken cancellationToken = default);
    Task RevokeAsync(ShareTargetKind targetKind, Guid targetId, Guid userId, Guid actorUserId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<FileGrant>> ListAsync(ShareTargetKind targetKind, Guid targetId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<StoredFile>> ListSharedWithMeAsync(Guid userId, CancellationToken cancellationToken = default);
}

public interface IFileAccessService
{
    Task<AccessDecision> AuthorizeFileAsync(AccessContext context, Guid fileId, AccessIntent intent, CancellationToken cancellationToken = default);
    Task<AccessDecision> AuthorizeDropAsync(AccessContext context, Guid dropId, AccessIntent intent, CancellationToken cancellationToken = default);
}

public interface IFileContentService
{
    Task<OpenedContent> OpenDownloadAsync(AccessContext context, Guid fileId, ByteRange? range, CancellationToken cancellationToken = default);
    Task<OpenedContent> OpenPreviewAsync(AccessContext context, Guid fileId, ByteRange? range, CancellationToken cancellationToken = default);
    Task<OpenedContent> OpenDropArchiveAsync(AccessContext context, Guid dropId, CancellationToken cancellationToken = default);
}

public interface IFileLifecycle
{
    Task SweepExpiredAsync(CancellationToken cancellationToken = default);
    Task SweepAbandonedUploadsAsync(CancellationToken cancellationToken = default);
    Task SweepSoftDeletedAsync(CancellationToken cancellationToken = default);
}

public interface IQuotaService
{
    Task EnsureCanAcceptAsync(Guid ownerUserId, long additionalBytes, CancellationToken cancellationToken = default);
}

public interface IContentScanner
{
    Task<ScanResult> ScanAsync(Stream content, CancellationToken cancellationToken = default);
}

public interface IFileAudit
{
    Task RecordAsync(string action, ShareTargetKind targetKind, Guid targetId, Guid? actorUserId, string? shareToken, string? detail, CancellationToken cancellationToken = default);
}

public interface IFamilyRoster
{
    Task UpsertAsync(FamilyMember member, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<FamilyMember>> ListAsync(CancellationToken cancellationToken = default);
    Task<FamilyMember?> GetAsync(Guid userId, CancellationToken cancellationToken = default);
}
