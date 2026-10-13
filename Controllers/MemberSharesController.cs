using FamilyVault.Files.Contracts;
using McWutWebApp.Hosting;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace McWutWebApp.Controllers;

[ApiController]
[Authorize]
[AutoValidateAntiforgeryToken]
[Route("api/member-shares")]
public sealed class MemberSharesController(IGrantService grants) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<OutgoingMemberShare>>> List(CancellationToken cancellationToken)
    {
        var rows = await grants.ListOutgoingAsync(User.RequireVaultUserId(), cancellationToken);
        return Ok(rows);
    }

    [HttpDelete("{fileId:guid}/{userId:guid}")]
    public async Task<IActionResult> Revoke(Guid fileId, Guid userId, [FromQuery] string? kind, CancellationToken cancellationToken)
    {
        var target = string.Equals(kind, "drop", StringComparison.OrdinalIgnoreCase)
            ? ShareTargetKind.Drop
            : ShareTargetKind.File;
        await grants.RevokeAsync(target, fileId, userId, User.RequireVaultUserId(), cancellationToken);
        return NoContent();
    }
}
