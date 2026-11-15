namespace FamilyVault.Files.Services;

public sealed record CreateChristmasGiftItemRequest(
    string? Title,
    string? Description,
    string? Url,
    Guid? ImageFileId,
    string? ImageType);

public sealed record UpdateChristmasGiftItemRequest(
    string? Title,
    string? Description,
    string? Url,
    Guid? ImageFileId,
    string? ImageType);

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
    bool CanEdit,
    bool CanDelete);

public sealed record ChristmasGiftMemberSummaryDto(
    Guid UserId,
    string DisplayName,
    string? Email,
    string? AccentColor,
    bool IsKid,
    int ItemCount);
