namespace FamilyVault.Files.Data.Entities;

public sealed class GameCustomLevelEntity
{
    public Guid Id { get; set; }
    public string GameKey { get; set; } = "";
    public Guid AuthorUserId { get; set; }
    public string Title { get; set; } = "";
    public string Description { get; set; } = "";
    public string LevelJson { get; set; } = "";
    public int PlaysCount { get; set; }
    public int ClearsCount { get; set; }
    public int BestScore { get; set; }
    public int? BestTimeMs { get; set; }
    public Guid? RecordHolderUserId { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
