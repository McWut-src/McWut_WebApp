using FamilyVault.Files.Contracts;
using FamilyVault.Files.Security;
using FamilyVault.Files.Services;

namespace FamilyVault.Files.Tests;

public class GameCustomLevelTests
{
    private static readonly DateTimeOffset Now = DateTimeOffset.Parse("2026-11-11T15:00:00Z");

    [Fact]
    public void Rules_normalize_valid_level_and_guarantee_spawn_platform()
    {
        var raw = """
        {
          "finishX": 1850,
          "strips": [
            { "pts": [[400, 420], [900, 360], [1950, 420]], "boost": true }
          ],
          "loops": [ { "x": 1200, "y": 275, "r": 150 } ],
          "springs": [ { "x": 700, "y": 395 } ],
          "wreckingBalls": [ { "pivotX": 1500, "pivotY": 130, "length": 210 } ],
          "crates": [ { "x": 850, "y": 370 } ],
          "stars": [ { "x": 650, "y": 310 } ]
        }
        """;

        var normalized = GameLevelRules.ValidateAndNormalizeLevelJson("wacky-wheels", raw);
        Assert.Contains("\"finishX\":1850", normalized);
        // Spawn platform [-120,420]..[280,420] automatically prepended since first strip started at 400
        Assert.Contains("[-120,420]", normalized);

        Assert.Throws<GameScoreValidationException>(() => GameLevelRules.ValidateTitle("   "));
        Assert.Throws<GameScoreValidationException>(() => GameLevelRules.ValidateAndNormalizeLevelJson("stack-3d", raw));
        Assert.Throws<GameScoreValidationException>(() => GameLevelRules.ValidateAndNormalizeLevelJson("wacky-wheels", "{bad json"));
    }

    [Fact]
    public void Rules_normalize_spike_strips_and_enforce_cap()
    {
        var raw = """
        {
          "finishX": 1850,
          "strips": [
            { "pts": [[-120, 420], [900, 360], [1950, 420]] }
          ],
          "spikes": [
            { "x": 700, "y": 405, "w": 64 },
            { "x": 1200, "y": 300, "w": 9999 }
          ]
        }
        """;

        var normalized = GameLevelRules.ValidateAndNormalizeLevelJson("wacky-wheels", raw);
        Assert.Contains("\"spikes\":[{\"x\":700,\"y\":405,\"w\":64},{\"x\":1200,\"y\":300,\"w\":120}]", normalized);

        var spikes = string.Join(",", Enumerable.Repeat("""{ "x": 600, "y": 400 }""", GameLevelRules.MaxSpikes + 1));
        var tooMany = $$"""{ "strips": [{ "pts": [[-120, 420], [400, 420]] }], "spikes": [{{spikes}}] }""";
        Assert.Throws<GameScoreValidationException>(() =>
            GameLevelRules.ValidateAndNormalizeLevelJson("wacky-wheels", tooMany));
    }

    [Fact]
    public void Rules_normalize_bridges_checkpoints_tnt_fans_and_seesaws_with_caps()
    {
        var raw = """
        {
          "finishX": 3200,
          "strips": [
            { "pts": [[-120, 420], [800, 420]] },
            { "pts": [[900, 260], [1400, 260]], "bridge": true }
          ],
          "checkpoints": [ { "x": 1500, "y": 420 } ],
          "tntCrates": [ { "x": 1950, "y": 420 } ],
          "fans": [ { "x": 2200, "y": 500, "w": 999, "h": 50, "power": 9999 } ],
          "seesaws": [ { "x": 2500, "y": 380, "len": 500, "maxAngle": 2.0 } ]
        }
        """;

        var normalized = GameLevelRules.ValidateAndNormalizeLevelJson("wacky-wheels", raw);
        Assert.Contains("\"bridge\":true", normalized);
        Assert.Contains("\"checkpoints\":[{\"x\":1500,\"y\":420}]", normalized);
        Assert.Contains("\"tntCrates\":[{\"x\":1950,\"y\":420}]", normalized);
        Assert.Contains("\"fans\":[{\"x\":2200,\"y\":500,\"w\":160,\"h\":100,\"power\":2400}]", normalized);
        Assert.Contains("\"seesaws\":[{\"x\":2500,\"y\":380,\"len\":360,\"maxAngle\":0.65}]", normalized);

        var tooManyFans = string.Join(",", Enumerable.Repeat("""{ "x": 600, "y": 400 }""", GameLevelRules.MaxFans + 1));
        Assert.Throws<GameScoreValidationException>(() =>
            GameLevelRules.ValidateAndNormalizeLevelJson("wacky-wheels", $$"""{ "strips": [{ "pts": [[-120, 420], [400, 420]] }], "fans": [{{tooManyFans}}] }"""));

        var tooManySeesaws = string.Join(",", Enumerable.Repeat("""{ "x": 600, "y": 400 }""", GameLevelRules.MaxSeesaws + 1));
        Assert.Throws<GameScoreValidationException>(() =>
            GameLevelRules.ValidateAndNormalizeLevelJson("wacky-wheels", $$"""{ "strips": [{ "pts": [[-120, 420], [400, 420]] }], "seesaws": [{{tooManySeesaws}}] }"""));
    }

    [Fact]
    public async Task Members_can_publish_browse_play_set_records_and_manage_own_levels()
    {
        await using var fx = new SqliteFixture();
        await fx.SeedMembersAsync();

        var vince = await fx.Db.FamilyMembers.FindAsync(SqliteFixture.OwnerId);
        vince!.DisplayName = "Vince";
        vince.AccentColor = "#2563eb";

        var alex = await fx.Db.FamilyMembers.FindAsync(SqliteFixture.OtherId);
        alex!.DisplayName = "Alex";
        alex.AccentColor = "#10b981";
        await fx.Db.SaveChangesAsync();

        var clock = new TestTimeProvider(Now);
        var service = new GameCustomLevelService(fx.Db, clock);

        var sampleJson = """
        {
          "finishX": 1600,
          "strips": [{ "pts": [[-100, 420], [800, 380], [1750, 420]] }],
          "stars": [{ "x": 520, "y": 330 }, { "x": 1100, "y": 340 }]
        }
        """;

        // Vince publishes a custom level
        var created = await service.SaveLevelAsync(
            SqliteFixture.OwnerId,
            "wacky-wheels",
            levelId: null,
            new SaveGameCustomLevelInput("Loop Canyon", "Jump the ramp and grab both stars!", sampleJson));

        Assert.Equal("Loop Canyon", created.Summary.Title);
        Assert.Equal("Vince", created.Summary.AuthorName);
        Assert.Equal("#2563eb", created.Summary.AuthorColor);
        Assert.True(created.Summary.IsMine);

        // Alex browses Member Levels and sees Vince's level
        var listForAlex = await service.ListLevelsAsync(SqliteFixture.OtherId, "wacky-wheels");
        Assert.Single(listForAlex);
        Assert.False(listForAlex[0].IsMine);
        Assert.Equal("Vince", listForAlex[0].AuthorName);

        // Alex cannot overwrite or delete Vince's level
        await Assert.ThrowsAsync<GameScoreValidationException>(() =>
            service.SaveLevelAsync(
                SqliteFixture.OtherId,
                "wacky-wheels",
                created.Summary.Id,
                new SaveGameCustomLevelInput("Hacked", null, sampleJson)));

        await Assert.ThrowsAsync<GameScoreValidationException>(() =>
            service.DeleteLevelAsync(SqliteFixture.OtherId, isAdmin: false, "wacky-wheels", created.Summary.Id));

        // Alex plays & clears Vince's level -> sets Course Record!
        clock.UtcNow = Now.AddMinutes(3);
        var run1 = await service.RecordRunAsync(
            SqliteFixture.OtherId,
            "wacky-wheels",
            created.Summary.Id,
            completed: true,
            score: 4820,
            elapsedMs: 11_400);

        Assert.True(run1.IsNewRecord);
        Assert.Equal(1, run1.Level.PlaysCount);
        Assert.Equal(1, run1.Level.ClearsCount);
        Assert.Equal(4820, run1.Level.BestScore);
        Assert.Equal(11_400, run1.Level.BestTimeMs);
        Assert.Equal("Alex", run1.Level.RecordHolderName);
        Assert.Equal("#10b981", run1.Level.RecordHolderColor);

        // Vince beats the record on his own level
        clock.UtcNow = Now.AddMinutes(5);
        var run2 = await service.RecordRunAsync(
            SqliteFixture.OwnerId,
            "wacky-wheels",
            created.Summary.Id,
            completed: true,
            score: 5300,
            elapsedMs: 9_800);

        Assert.True(run2.IsNewRecord);
        Assert.Equal(2, run2.Level.PlaysCount);
        Assert.Equal(2, run2.Level.ClearsCount);
        Assert.Equal("Vince", run2.Level.RecordHolderName);

        // Vince deletes his level
        await service.DeleteLevelAsync(SqliteFixture.OwnerId, isAdmin: false, "wacky-wheels", created.Summary.Id);
        await Assert.ThrowsAsync<VaultNotFoundException>(() =>
            service.GetLevelAsync(SqliteFixture.OwnerId, "wacky-wheels", created.Summary.Id));
    }
}
