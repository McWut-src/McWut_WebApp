using FamilyVault.Files.Contracts;

namespace FamilyVault.Files.Data.Entities;

public sealed class FileAuditEntity
{
    public Guid Id { get; set; }
    public DateTimeOffset At { get; set; }
    public string Action { get; set; } = "";
    public ShareTargetKind TargetKind { get; set; }
    public Guid TargetId { get; set; }
    public Guid? ActorUserId { get; set; }
    public string? ShareToken { get; set; }
    public string? Detail { get; set; }
}
