namespace FamilyVault.Files.Data.Entities;

public sealed class DropEntity
{
    public Guid Id { get; set; }
    public Guid OwnerUserId { get; set; }
    public FamilyMemberEntity Owner { get; set; } = null!;
    public string Title { get; set; } = "";
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? ExpiresAt { get; set; }
    public int? MaxDownloads { get; set; }
    public int DownloadCount { get; set; }
    public string? PasswordHash { get; set; }
    public DateTimeOffset? DeletedAt { get; set; }
    public ICollection<StoredFileEntity> Files { get; set; } = new List<StoredFileEntity>();
}
