namespace FamilyVault.Files.Data.Entities;

public sealed class UserPersonalizationEntity
{
    public Guid UserId { get; set; }
    public string StatusTag { get; set; } = "";
    public string HeaderBadge { get; set; } = "none";
    public string HeaderMotif { get; set; } = "none";
    public string BackgroundTile { get; set; } = "none";
    public string ChimeTheme { get; set; } = "classic";
    public DateTimeOffset UpdatedAt { get; set; }

    public FamilyMemberEntity? User { get; set; }
}
