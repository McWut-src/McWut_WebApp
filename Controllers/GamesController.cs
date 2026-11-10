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
public sealed class GamesController(GameScoreService scores) : ControllerBase
{
    [HttpGet]
    public ActionResult<IReadOnlyList<GameCatalogEntry>> Catalog()
    {
        return Ok(GameScoreRules.Catalog);
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
}

public sealed class SubmitGameScoreBody
{
    public int Score { get; set; }
    public int MaxCombo { get; set; }
}
