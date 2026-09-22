using FamilyVault.Files.Contracts;

namespace FamilyVault.Files.Data.Entities;

public sealed class ShareLinkEntity
{
    public Guid Id { get; set; }
    public string Token { get; set; } = "";
    public ShareTargetKind TargetKind { get; set; }
    public Guid TargetId { get; set; }
    public Guid CreatedByUserId { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? ExpiresAt { get; set; }
    public int? MaxDownloads { get; set; }
    public int DownloadCount { get; set; }
    public string? PasswordHash { get; set; }
    public bool AllowPreview { get; set; } = true;
    public DateTimeOffset? RevokedAt { get; set; }
}
