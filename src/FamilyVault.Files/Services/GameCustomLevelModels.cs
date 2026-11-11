namespace FamilyVault.Files.Services;

public sealed record GameCustomLevelSummaryView(
    Guid Id,
    string GameKey,
    string Title,
    string Description,
    Guid AuthorUserId,
    string AuthorName,
    string AuthorColor,
    string? AuthorStatusTag,
    string? AuthorBadgeUrl,
    int PlaysCount,
    int ClearsCount,
    int BestScore,
    int? BestTimeMs,
    string? RecordHolderName,
    string? RecordHolderColor,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt,
    bool IsMine);

public sealed record GameCustomLevelDetailView(
    GameCustomLevelSummaryView Summary,
    string LevelJson);

public sealed record SaveGameCustomLevelInput(
    string Title,
    string? Description,
    string LevelJson);

public sealed record RecordCustomLevelRunView(
    bool IsNewRecord,
    GameCustomLevelSummaryView Level);
