namespace FamilyVault.Files.Security;

public sealed class GameScoreValidationException(string message) : Exception(message);

public sealed record GameCatalogEntry(
    string Key,
    string Title,
    string Subtitle,
    string EngineLabel,
    bool IsAvailable);

public static class GameScoreRules
{
    public const string Stack3dKey = "stack-3d";
    public const string MiniCrosswordKey = "mini-crossword";
    public const string MinesweeperKey = "minesweeper";
    public const string NeonSlopeKey = "neon-slope";
    public const string Merge2048Key = "merge-2048";
    public const string WackyWheelsKey = "wacky-wheels";
    public const string BrickBreakerKey = "brick-breaker";
    public const string HextrisKey = "hextris";
    public const string MemeMergeKey = "meme-merge";

    public const int MaxScore = 10_000;
    public const int MaxCombo = 10_000;

    public static IReadOnlyList<GameCatalogEntry> Catalog { get; } =
    [
        new(Stack3dKey, "Stack 3D", "Precision timing tower builder. Slice overhangs and chain perfect combos.", "Three.js 3D", true),
        new(MiniCrosswordKey, "Mini Crossword", "Bite-sized 5×5 crossword pack with smart clues, pencil mode, and speed bonuses.", "Alpine / Grid", true),
        new(MinesweeperKey, "Minesweeper", "Neon minefield with cascading reveals, touch flagging, and explosive particle chains.", "Canvas 2D", true),
        new(NeonSlopeKey, "Neon Slope", "High-speed endless 3D tunnel runner.", "Three.js 3D", true),
        new(Merge2048Key, "2048 Neon", "Slide and merge tiles to reach 2048 and beyond.", "Neon Grid", true),
        new(WackyWheelsKey, "Wacky Wheels", "Slapstick ragdoll obstacle course. Balance, boost, and flip your way to the finish line.", "Canvas 2D / Physics", true),
        new(BrickBreakerKey, "Cyber Breakout", "Arcade paddle physics with multiball and laser power-ups.", "Canvas 2D", true),
        new(HextrisKey, "Hextris Neon", "Hexagonal match-3 puzzle. Rotate the hexagon, catch incoming bars, and chain combos.", "Canvas 2D", true),
        new(MemeMergeKey, "Meme Merge", "Drop and merge classic memes with juicy physics to summon The Rock.", "Canvas 2D / Physics", true)
    ];

    public static string NormalizeGameKey(string? gameKey)
    {
        var key = (gameKey ?? "").Trim().ToLowerInvariant();
        foreach (var entry in Catalog)
        {
            if (entry.Key == key)
            {
                if (!entry.IsAvailable)
                {
                    throw new GameScoreValidationException("That game is not available yet.");
                }

                return entry.Key;
            }
        }

        throw new GameScoreValidationException("Choose a valid game.");
    }

    public static (int Score, int Combo) ValidateScore(int score, int maxCombo)
    {
        if (score < 0 || score > MaxScore)
        {
            throw new GameScoreValidationException($"Score must be between 0 and {MaxScore}.");
        }

        if (maxCombo < 0 || maxCombo > MaxCombo)
        {
            throw new GameScoreValidationException($"Combo must be between 0 and {MaxCombo}.");
        }

        var clampedCombo = Math.Min(maxCombo, score);
        return (score, clampedCombo);
    }
}
