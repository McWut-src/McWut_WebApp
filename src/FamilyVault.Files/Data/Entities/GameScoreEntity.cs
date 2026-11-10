namespace FamilyVault.Files.Data.Entities;

public sealed class GameScoreEntity
{
    public Guid Id { get; set; }
    public string GameKey { get; set; } = "";
    public Guid UserId { get; set; }
    public int BestScore { get; set; }
    public int BestCombo { get; set; }
    public int GamesPlayed { get; set; }
    public DateTimeOffset AchievedAt { get; set; }
    public DateTimeOffset LastPlayedAt { get; set; }
}
