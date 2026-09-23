namespace FamilyVault.Files.Data.Entities;

public sealed class InviteEntity
{
    public Guid Id { get; set; }
    public string Token { get; set; } = "";
    public string? Email { get; set; }
    public Guid CreatedByUserId { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset ExpiresAt { get; set; }
    public DateTimeOffset? UsedAt { get; set; }
    public Guid? UsedByUserId { get; set; }
}
