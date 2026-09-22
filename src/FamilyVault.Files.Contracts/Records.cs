namespace FamilyVault.Files.Contracts;

public sealed record StoredFile(
    Guid Id,
    Guid OwnerUserId,
    string OriginalFileName,
    string ContentType,
    long SizeBytes,
    FileStatus Status,
    DateTimeOffset CreatedAt,
    DateTimeOffset? ExpiresAt,
    int? MaxDownloads,
    int DownloadCount,
    bool HasPassword,
    Guid? DropId,
    string? ChecksumSha256);

public sealed record Drop(
    Guid Id,
    Guid OwnerUserId,
    string Title,
    DateTimeOffset CreatedAt,
    DateTimeOffset? ExpiresAt,
    int? MaxDownloads,
    int DownloadCount,
    bool HasPassword);

public sealed record ShareLink(
    Guid Id,
    string Token,
    ShareTargetKind TargetKind,
    Guid TargetId,
    Guid CreatedByUserId,
    DateTimeOffset CreatedAt,
    DateTimeOffset? ExpiresAt,
    int? MaxDownloads,
    int DownloadCount,
    bool HasPassword,
    bool AllowPreview,
    DateTimeOffset? RevokedAt);

public sealed record FileGrant(
    Guid Id,
    ShareTargetKind TargetKind,
    Guid TargetId,
    Guid UserId,
    FilePermission Permission,
    Guid GrantedByUserId,
    DateTimeOffset GrantedAt);

public sealed record UploadSession(
    Guid SessionId,
    Guid FileId,
    Guid OwnerUserId,
    string StorageKey,
    long ExpectedSize,
    long BytesReceived,
    DateTimeOffset ExpiresAt,
    UploadSessionStatus Status);

public sealed record FileAuditEvent(
    Guid Id,
    DateTimeOffset At,
    string Action,
    ShareTargetKind TargetKind,
    Guid TargetId,
    Guid? ActorUserId,
    string? ShareToken,
    string? Detail);

public sealed record FamilyMember(
    Guid UserId,
    string? Email,
    string DisplayName);

public sealed record ByteRange(long From, long? To);

public sealed record ScanResult(bool Allowed, string? Reason);

public sealed class OpenedContent : IAsyncDisposable
{
    public required Stream Stream { get; init; }
    public required string FileName { get; init; }
    public required string ContentType { get; init; }
    public required long ContentLength { get; init; }
    public required long TotalLength { get; init; }
    public bool IsPartial { get; init; }
    public long? RangeStart { get; init; }
    public long? RangeEnd { get; init; }

    public ValueTask DisposeAsync() => Stream.DisposeAsync();
}
