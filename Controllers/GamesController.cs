using FamilyVault.Files.Security;
using FamilyVault.Files.Services;
using McWutWebApp.Hosting;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace McWutWebApp.Controllers;

[ApiController]
[Authorize]
[AutoValidateAntiforgeryToken]
[ServiceFilter(typeof(UpsertFamilyMemberFilter))]
[Route("api/games")]
public sealed class GamesController(GameScoreService scores, GameCustomLevelService levels) : ControllerBase
{
    [HttpGet]
    public ActionResult<IReadOnlyList<GameCatalogEntry>> Catalog()
    {
        return Ok(GameScoreRules.Catalog);
    }

    [HttpGet("me/bests")]
    public async Task<ActionResult<IReadOnlyDictionary<string, int>>> MyBests(
        CancellationToken cancellationToken = default)
    {
        var userId = User.RequireVaultUserId();
        var bests = await scores.GetMyBestScoresAsync(userId, cancellationToken);
        return Ok(bests);
    }

    [HttpGet("{gameKey}/leaderboard")]
    public async Task<ActionResult<GameLeaderboardView>> Leaderboard(
        string gameKey,
        [FromQuery] int limit = GameScoreService.DefaultLeaderboardLimit,
        CancellationToken cancellationToken = default)
    {
        var userId = User.RequireVaultUserId();
        var board = await scores.GetLeaderboardAsync(
            userId,
            gameKey,
            limit,
            PersonalizationService.ResolveBadgeUrl,
            cancellationToken);
        return Ok(board);
    }

    [HttpPost("{gameKey}/scores")]
    public async Task<ActionResult<GameScoreSubmissionView>> SubmitScore(
        string gameKey,
        [FromBody] SubmitGameScoreBody body,
        CancellationToken cancellationToken = default)
    {
        var userId = User.RequireVaultUserId();
        var result = await scores.SubmitScoreAsync(
            userId,
            gameKey,
            body.Score,
            body.MaxCombo,
            PersonalizationService.ResolveBadgeUrl,
            cancellationToken);
        return Ok(result);
    }

    [HttpGet("{gameKey}/levels")]
    public async Task<ActionResult<IReadOnlyList<GameCustomLevelSummaryView>>> ListLevels(
        string gameKey,
        [FromQuery] int limit = GameCustomLevelService.DefaultListLimit,
        CancellationToken cancellationToken = default)
    {
        var userId = User.RequireVaultUserId();
        var list = await levels.ListLevelsAsync(
            userId,
            gameKey,
            limit,
            PersonalizationService.ResolveBadgeUrl,
            cancellationToken);
        return Ok(list);
    }

    [HttpGet("{gameKey}/levels/{levelId:guid}")]
    public async Task<ActionResult<GameCustomLevelDetailView>> GetLevel(
        string gameKey,
        Guid levelId,
        CancellationToken cancellationToken = default)
    {
        var userId = User.RequireVaultUserId();
        var detail = await levels.GetLevelAsync(
            userId,
            gameKey,
            levelId,
            PersonalizationService.ResolveBadgeUrl,
            cancellationToken);
        return Ok(detail);
    }

    [HttpPost("{gameKey}/levels")]
    public async Task<ActionResult<GameCustomLevelDetailView>> CreateLevel(
        string gameKey,
        [FromBody] SaveGameCustomLevelBody body,
        CancellationToken cancellationToken = default)
    {
        var userId = User.RequireVaultUserId();
        var created = await levels.SaveLevelAsync(
            userId,
            gameKey,
            levelId: null,
            new SaveGameCustomLevelInput(body.Title, body.Description, body.LevelJson),
            PersonalizationService.ResolveBadgeUrl,
            cancellationToken);
        return Ok(created);
    }

    [HttpPut("{gameKey}/levels/{levelId:guid}")]
    public async Task<ActionResult<GameCustomLevelDetailView>> UpdateLevel(
        string gameKey,
        Guid levelId,
        [FromBody] SaveGameCustomLevelBody body,
        CancellationToken cancellationToken = default)
    {
        var userId = User.RequireVaultUserId();
        var updated = await levels.SaveLevelAsync(
            userId,
            gameKey,
            levelId,
            new SaveGameCustomLevelInput(body.Title, body.Description, body.LevelJson),
            PersonalizationService.ResolveBadgeUrl,
            cancellationToken);
        return Ok(updated);
    }

    [HttpDelete("{gameKey}/levels/{levelId:guid}")]
    public async Task<IActionResult> DeleteLevel(
        string gameKey,
        Guid levelId,
        CancellationToken cancellationToken = default)
    {
        var userId = User.RequireVaultUserId();
        await levels.DeleteLevelAsync(
            userId,
            User.IsInRole(IdentitySeed.AdminRole),
            gameKey,
            levelId,
            cancellationToken);
        return NoContent();
    }

    [HttpPost("{gameKey}/levels/{levelId:guid}/runs")]
    public async Task<ActionResult<RecordCustomLevelRunView>> RecordLevelRun(
        string gameKey,
        Guid levelId,
        [FromBody] RecordCustomLevelRunBody body,
        CancellationToken cancellationToken = default)
    {
        var userId = User.RequireVaultUserId();
        var result = await levels.RecordRunAsync(
            userId,
            gameKey,
            levelId,
            body.Completed,
            body.Score,
            body.ElapsedMs,
            PersonalizationService.ResolveBadgeUrl,
            cancellationToken);
        return Ok(result);
    }
}

public sealed class SubmitGameScoreBody
{
    public int Score { get; set; }
    public int MaxCombo { get; set; }
}

public sealed class SaveGameCustomLevelBody
{
    public string Title { get; set; } = "";
    public string? Description { get; set; }
    public string LevelJson { get; set; } = "";
}

public sealed class RecordCustomLevelRunBody
{
    public bool Completed { get; set; }
    public int Score { get; set; }
    public int ElapsedMs { get; set; }
}
