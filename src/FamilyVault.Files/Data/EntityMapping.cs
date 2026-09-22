using FamilyVault.Files.Contracts;
using FamilyVault.Files.Data.Entities;

namespace FamilyVault.Files.Data;

public static class EntityMapping
{
    public static StoredFile ToRecord(this StoredFileEntity e) => new(
        e.Id,
        e.OwnerUserId,
        e.OriginalFileName,
        e.ContentType,
        e.SizeBytes,
        e.Status,
        e.CreatedAt,
        e.ExpiresAt,
        e.MaxDownloads,
        e.DownloadCount,
        e.PasswordHash is not null,
        e.DropId,
        e.ChecksumSha256);

    public static Drop ToRecord(this DropEntity e) => new(
        e.Id,
        e.OwnerUserId,
        e.Title,
        e.CreatedAt,
        e.ExpiresAt,
        e.MaxDownloads,
        e.DownloadCount,
        e.PasswordHash is not null);

    public static ShareLink ToRecord(this ShareLinkEntity e) => new(
        e.Id,
        e.Token,
        e.TargetKind,
        e.TargetId,
        e.CreatedByUserId,
        e.CreatedAt,
        e.ExpiresAt,
        e.MaxDownloads,
        e.DownloadCount,
        e.PasswordHash is not null,
        e.AllowPreview,
        e.RevokedAt);

    public static FileGrant ToRecord(this FileGrantEntity e) => new(
        e.Id,
        e.TargetKind,
        e.TargetId,
        e.UserId,
        e.Permission,
        e.GrantedByUserId,
        e.GrantedAt);

    public static UploadSession ToRecord(this UploadSessionEntity e) => new(
        e.SessionId,
        e.FileId,
        e.OwnerUserId,
        e.StorageKey,
        e.ExpectedSize,
        e.BytesReceived,
        e.ExpiresAt,
        e.Status);

    public static FamilyMember ToRecord(this FamilyMemberEntity e) => new(
        e.UserId,
        e.Email,
        e.DisplayName);
}
