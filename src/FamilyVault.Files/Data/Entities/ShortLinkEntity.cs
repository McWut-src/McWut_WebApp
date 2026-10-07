namespace FamilyVault.Files.Data.Entities;

public sealed class ShortLinkEntity
{
    public Guid Id { get; set; }
    public string Token { get; set; } = "";
    public string TargetUrl { get; set; } = "";
    public Guid OwnerUserId { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}
