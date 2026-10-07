using FamilyVault.Files.Contracts;
using McWutWebApp.Hosting;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace McWutWebApp.Controllers;

[ApiController]
[Authorize]
[AutoValidateAntiforgeryToken]
[Route("api/links")]
public sealed class LinksController(IShareLinkService links) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<OwnedLinkResponse>>> List(CancellationToken cancellationToken)
    {
        var rows = await links.ListOwnedAsync(User.RequireVaultUserId(), cancellationToken);
        return Ok(rows.Select(ToResponse).ToList());
    }

    [HttpDelete("{token}")]
    public async Task<IActionResult> Revoke(string token, CancellationToken cancellationToken)
    {
        await links.RevokeAsync(token, User.RequireVaultUserId(), cancellationToken);
        return NoContent();
    }

    private OwnedLinkResponse ToResponse(OwnedShareLink row) => new()
    {
        Token = row.Token,
        Url = $"{Request.Scheme}://{Request.Host}/s/{row.Token}",
        Kind = row.TargetKind == ShareTargetKind.Drop ? "drop" : "file",
        Label = row.Label,
        CreatedAt = row.CreatedAt,
        ExpiresAt = row.ExpiresAt,
        HasPassword = row.HasPassword,
        Expired = row.Expired
    };
}

public sealed class OwnedLinkResponse
{
    public required string Token { get; init; }
    public required string Url { get; init; }
    public required string Kind { get; init; }
    public required string Label { get; init; }
    public DateTimeOffset CreatedAt { get; init; }
    public DateTimeOffset? ExpiresAt { get; init; }
    public bool HasPassword { get; init; }
    public bool Expired { get; init; }
}
