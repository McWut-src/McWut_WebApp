namespace FamilyVault.Files.Services;

public sealed record GameLeaderboardEntryView(
    int Rank,
    Guid UserId,
    string DisplayName,
    string AccentColor,
    string? StatusTag,
    string? HeaderBadge,
    string? BadgeUrl,
    int BestScore,
    int BestCombo,
    int GamesPlayed,
    DateTimeOffset AchievedAt,
    bool IsMe);

public sealed record GameLeaderboardView(
    string GameKey,
    int TotalPlayers,
    int TotalGamesPlayed,
    GameLeaderboardEntryView? MyRecord,
    IReadOnlyList<GameLeaderboardEntryView> Entries);

public sealed record GameScoreSubmissionView(
    bool IsNewBest,
    int SubmittedScore,
    int SubmittedCombo,
    int BestScore,
    int BestCombo,
    int? Rank,
    GameLeaderboardView Leaderboard);
