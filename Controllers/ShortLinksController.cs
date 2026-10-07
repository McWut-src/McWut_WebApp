using FamilyVault.Files.Contracts;
using McWutWebApp.Hosting;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace McWutWebApp.Controllers;

[ApiController]
[Authorize]
[AutoValidateAntiforgeryToken]
[Route("api/short-links")]
public sealed class ShortLinksController(IShortLinkService links) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ShortLinkResponse>>> List(CancellationToken cancellationToken)
    {
        var rows = await links.ListOwnedAsync(User.RequireVaultUserId(), cancellationToken);
        return Ok(rows.Select(ToResponse).ToList());
    }

    [HttpPost]
    public async Task<ActionResult<ShortLinkResponse>> Create([FromBody] CreateShortLinkBody body, CancellationToken cancellationToken)
    {
        var row = await links.CreateAsync(User.RequireVaultUserId(), body.Url, cancellationToken);
        return Ok(ToResponse(row));
    }

    [HttpDelete("{token}")]
    public async Task<IActionResult> Delete(string token, CancellationToken cancellationToken)
    {
        await links.DeleteAsync(token, User.RequireVaultUserId(), cancellationToken);
        return NoContent();
    }

    private ShortLinkResponse ToResponse(ShortLink row) => new()
    {
        Token = row.Token,
        Url = $"{Request.Scheme}://{Request.Host}/s/{row.Token}",
        TargetUrl = row.TargetUrl,
        CreatedAt = row.CreatedAt
    };
}

public sealed class CreateShortLinkBody
{
    public string Url { get; set; } = "";
}

public sealed class ShortLinkResponse
{
    public required string Token { get; init; }
    public required string Url { get; init; }
    public required string TargetUrl { get; init; }
    public DateTimeOffset CreatedAt { get; init; }
}
