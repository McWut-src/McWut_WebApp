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
    [HttpDelete("{token}")]
    public async Task<IActionResult> Revoke(string token, CancellationToken cancellationToken)
    {
        await links.RevokeAsync(token, User.RequireVaultUserId(), cancellationToken);
        return NoContent();
    }
}
