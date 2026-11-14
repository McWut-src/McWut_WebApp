namespace FamilyVault.Files.Data.Entities;

public sealed class ChristmasGiftItemEntity
{
    public Guid Id { get; set; }
    public Guid OwnerUserId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Url { get; set; }
    public Guid? ImageFileId { get; set; }
    public string? ImageType { get; set; }
    public Guid? ClaimedByUserId { get; set; }
    public DateTimeOffset? ClaimedAt { get; set; }
    public string? ClaimNotes { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? UpdatedAt { get; set; }
    public int SortOrder { get; set; }
    public string Occasion { get; set; } = "anytime";
    public string? CategoryTag { get; set; }
    public bool IsMostWanted { get; set; }
    public bool IsAdultSurprise { get; set; }
    public Guid? CreatedByUserId { get; set; }
    public bool IsDeletedByOwner { get; set; }
    public string ClaimStatus { get; set; } = "claimed";
    public bool OpenToSplit { get; set; }
    public string? SplitContributorIdsJson { get; set; }
}
