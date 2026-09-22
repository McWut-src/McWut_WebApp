using FamilyVault.Files.Contracts;

namespace FamilyVault.Files.Data.Entities;

public sealed class StoredFileEntity
{
    public Guid Id { get; set; }
    public Guid OwnerUserId { get; set; }
    public FamilyMemberEntity Owner { get; set; } = null!;
    public string OriginalFileName { get; set; } = "";
    public string ContentType { get; set; } = "";
    public long SizeBytes { get; set; }
    public string StorageKey { get; set; } = "";
    public FileStatus Status { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? ExpiresAt { get; set; }
    public int? MaxDownloads { get; set; }
    public int DownloadCount { get; set; }
    public string? PasswordHash { get; set; }
    public Guid? DropId { get; set; }
    public DropEntity? Drop { get; set; }
    public string? ChecksumSha256 { get; set; }
    public DateTimeOffset? DeletedAt { get; set; }
}
