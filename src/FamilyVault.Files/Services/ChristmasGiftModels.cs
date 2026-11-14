namespace FamilyVault.Files.Services;

public sealed record CreateChristmasGiftItemRequest(
    string Title,
    string? Description,
    string? Url,
    Guid? ImageFileId,
    string? ImageType,
    string? Occasion = null,
    string? CategoryTag = null,
    bool IsMostWanted = false);

public sealed record UpdateChristmasGiftItemRequest(
    string Title,
    string? Description,
    string? Url,
    Guid? ImageFileId,
    string? ImageType,
    string? Occasion = null,
    string? CategoryTag = null,
    bool IsMostWanted = false);

public sealed record ClaimChristmasGiftRequest(
    string? ClaimNotes,
    bool OpenToSplit = false,
    string? ClaimStatus = null);

public sealed record CreateAdultSurpriseRequest(
    string Title,
    string? Description,
    string? Url,
    string? Occasion = null,
    string? ClaimNotes = null,
    bool OpenToSplit = false);

public sealed record UpdateClaimStatusRequest(
    string Status,
    string? ClaimNotes = null,
    bool? OpenToSplit = null);

public sealed record GiftMemberProfileDto(
    Guid UserId,
    string? ShirtSize,
    string? ShoeSize,
    string? PantsSize,
    string? FavoriteColors,
    string? InterestsAndAvoid);

public sealed record UpdateGiftMemberProfileRequest(
    string? ShirtSize,
    string? ShoeSize,
    string? PantsSize,
    string? FavoriteColors,
    string? InterestsAndAvoid);

public sealed record ChristmasGiftItemDto(
    Guid Id,
    Guid OwnerUserId,
    string Title,
    string? Description,
    string? Url,
    Guid? ImageFileId,
    string? ImageType,
    DateTimeOffset CreatedAt,
    int SortOrder,
    string Occasion,
    string? CategoryTag,
    bool IsMostWanted,
    bool IsAdultSurprise,
    string? CreatedByName,
    bool IsDeletedByOwner,
    bool? IsClaimed,
    Guid? ClaimedByUserId,
    string? ClaimedByName,
    string? ClaimedByAccentColor,
    string? ClaimNotes,
    DateTimeOffset? ClaimedAt,
    string? ClaimStatus,
    bool OpenToSplit,
    IReadOnlyList<string> SplitHelperNames,
    bool IsSplitByMe,
    bool CanChipIn,
    bool IsClaimedByMe,
    bool CanClaim,
    bool CanUnclaim,
    bool CanEdit,
    bool CanDelete);

public sealed record ChristmasGiftMemberSummaryDto(
    Guid UserId,
    string DisplayName,
    string? Email,
    string? AccentColor,
    bool IsKid,
    int ItemCount,
    int? ClaimedCount);

public sealed record MyClaimedGiftItemDto(
    Guid RecipientUserId,
    string RecipientName,
    string? RecipientAccentColor,
    bool RecipientIsKid,
    ChristmasGiftItemDto Item);
