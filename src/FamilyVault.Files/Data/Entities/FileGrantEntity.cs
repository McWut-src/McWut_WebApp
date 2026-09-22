using FamilyVault.Files.Contracts;

namespace FamilyVault.Files.Data.Entities;

public sealed class FileGrantEntity
{
    public Guid Id { get; set; }
    public ShareTargetKind TargetKind { get; set; }
    public Guid TargetId { get; set; }
    public Guid UserId { get; set; }
    public FamilyMemberEntity User { get; set; } = null!;
    public FilePermission Permission { get; set; }
    public Guid GrantedByUserId { get; set; }
    public DateTimeOffset GrantedAt { get; set; }
}
