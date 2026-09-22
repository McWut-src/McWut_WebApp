namespace FamilyVault.Files.Data.Entities;

public sealed class FamilyMemberEntity
{
    public Guid UserId { get; set; }
    public string? Email { get; set; }
    public string DisplayName { get; set; } = "";
    public DateTimeOffset FirstSeenAt { get; set; }
    public DateTimeOffset LastSeenAt { get; set; }
}
