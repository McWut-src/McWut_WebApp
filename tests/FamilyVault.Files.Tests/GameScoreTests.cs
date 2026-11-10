using FamilyVault.Files.Data.Entities;
using FamilyVault.Files.Security;
using FamilyVault.Files.Services;

namespace FamilyVault.Files.Tests;

public class GameScoreTests
{
    private static readonly DateTimeOffset Now = DateTimeOffset.Parse("2026-11-10T18:00:00Z");

    [Fact]
    public void Rules_normalize_stack_3d_and_reject_unavailable_or_unknown_games()
    {
        Assert.Equal("stack-3d", GameScoreRules.NormalizeGameKey("  STACK-3D "));
        Assert.Throws<GameScoreValidationException>(() => GameScoreRules.NormalizeGameKey("neon-slope"));
        Assert.Throws<GameScoreValidationException>(() => GameScoreRules.NormalizeGameKey("unknown-game"));
    }

    [Fact]
    public void Rules_validate_score_and_clamp_combo_to_score()
    {
        var (score, combo) = GameScoreRules.ValidateScore(24, 30);
        Assert.Equal(24, score);
        Assert.Equal(24, combo);

        Assert.Throws<GameScoreValidationException>(() => GameScoreRules.ValidateScore(-1, 0));
        Assert.Throws<GameScoreValidationException>(() => GameScoreRules.ValidateScore(20_000, 0));
        Assert.Throws<GameScoreValidationException>(() => GameScoreRules.ValidateScore(10, -1));
    }

    [Fact]
    public async Task Submitting_scores_tracks_personal_best_games_played_and_global_ranks()
    {
        await using var fx = new SqliteFixture();
        await fx.SeedMembersAsync();

        var owner = await fx.Db.FamilyMembers.FindAsync(SqliteFixture.OwnerId);
        owner!.DisplayName = "Vince";
        owner.AccentColor = "#2563eb";

        var other = await fx.Db.FamilyMembers.FindAsync(SqliteFixture.OtherId);
        other!.DisplayName = "Alex";
        other.AccentColor = "#10b981";

        fx.Db.UserPersonalizations.Add(new UserPersonalizationEntity
        {
            UserId = SqliteFixture.OwnerId,
            StatusTag = "GG",
            HeaderBadge = "preset:crown-gold",
            HeaderMotif = "none",
            BackgroundTile = "none",
            ChimeTheme = "classic",
            UpdatedAt = Now
        });
        await fx.Db.SaveChangesAsync();

        var clock = new TestTimeProvider(Now);
        var service = new GameScoreService(fx.Db, clock);

        // First score by Owner
        var first = await service.SubmitScoreAsync(
            SqliteFixture.OwnerId,
            "stack-3d",
            score: 18,
            maxCombo: 4,
            badgeUrlResolver: b => b == "preset:crown-gold" ? "/api/personalization/preset/badge/crown-gold.svg" : null);

        Assert.True(first.IsNewBest);
        Assert.Equal(18, first.BestScore);
        Assert.Equal(4, first.BestCombo);
        Assert.Equal(1, first.Rank);
        Assert.Single(first.Leaderboard.Entries);
        Assert.Equal("Vince", first.Leaderboard.Entries[0].DisplayName);
        Assert.Equal("#2563eb", first.Leaderboard.Entries[0].AccentColor);
        Assert.Equal("GG", first.Leaderboard.Entries[0].StatusTag);
        Assert.Equal("/api/personalization/preset/badge/crown-gold.svg", first.Leaderboard.Entries[0].BadgeUrl);

        // Lower score by Owner does not overwrite BestScore, increments GamesPlayed, but updates BestCombo if higher
        clock.UtcNow = Now.AddMinutes(2);
        var second = await service.SubmitScoreAsync(SqliteFixture.OwnerId, "stack-3d", score: 12, maxCombo: 7);
        Assert.False(second.IsNewBest);
        Assert.Equal(18, second.BestScore);
        Assert.Equal(7, second.BestCombo);
        Assert.Equal(2, second.Leaderboard.MyRecord!.GamesPlayed);

        // Other member posts a higher score -> takes #1 spot
        clock.UtcNow = Now.AddMinutes(5);
        var otherSub = await service.SubmitScoreAsync(SqliteFixture.OtherId, "stack-3d", score: 29, maxCombo: 5);
        Assert.True(otherSub.IsNewBest);
        Assert.Equal(1, otherSub.Rank);

        // Verify Owner's perspective on the leaderboard
        var ownerBoard = await service.GetLeaderboardAsync(SqliteFixture.OwnerId, "stack-3d");
        Assert.Equal(2, ownerBoard.TotalPlayers);
        Assert.Equal(3, ownerBoard.TotalGamesPlayed);
        Assert.Equal(2, ownerBoard.MyRecord!.Rank);
        Assert.Equal("Alex", ownerBoard.Entries[0].DisplayName);
        Assert.False(ownerBoard.Entries[0].IsMe);
        Assert.Equal("Vince", ownerBoard.Entries[1].DisplayName);
        Assert.True(ownerBoard.Entries[1].IsMe);
    }
}
