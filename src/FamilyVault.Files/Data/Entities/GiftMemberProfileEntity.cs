namespace FamilyVault.Files.Data.Entities;

public sealed class GiftMemberProfileEntity
{
    public Guid UserId { get; set; }
    public string? ShirtSize { get; set; }
    public string? ShoeSize { get; set; }
    public string? PantsSize { get; set; }
    public string? FavoriteColors { get; set; }
    public string? InterestsAndAvoid { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
