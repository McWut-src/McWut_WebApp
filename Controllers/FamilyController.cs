using FamilyVault.Files.Contracts;
using McWutWebApp.Hosting;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace McWutWebApp.Controllers;

[ApiController]
[Authorize]
[ServiceFilter(typeof(UpsertFamilyMemberFilter))]
[Route("api/family")]
public sealed class FamilyController(IFamilyRoster roster) : ControllerBase
{
    [HttpGet("members")]
    public async Task<ActionResult<IReadOnlyList<FamilyMember>>> Members(CancellationToken cancellationToken)
    {
        var self = User.RequireVaultUserId();
        var members = await roster.ListAsync(cancellationToken);
        return Ok(members.Where(m => m.UserId != self).ToList());
    }
}
