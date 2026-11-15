using FamilyVault.Files.Services;
using McWutWebApp.Hosting;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace McWutWebApp.Controllers;

[ApiController]
[Authorize]
[AutoValidateAntiforgeryToken]
[ServiceFilter(typeof(UpsertFamilyMemberFilter))]
[Route("api/gifts")]
public sealed class GiftsController(ChristmasGiftService service) : ControllerBase
{
    [HttpGet("members")]
    public async Task<ActionResult<IReadOnlyList<ChristmasGiftMemberSummaryDto>>> GetMembers(CancellationToken cancellationToken)
    {
        var viewerUserId = User.RequireVaultUserId();
        var members = await service.GetMembersAsync(viewerUserId, cancellationToken);
        return Ok(members);
    }

    [HttpGet("list/{ownerUserId:guid}")]
    public async Task<ActionResult<IReadOnlyList<ChristmasGiftItemDto>>> GetList(Guid ownerUserId, CancellationToken cancellationToken)
    {
        var viewerUserId = User.RequireVaultUserId();
        var items = await service.GetItemsAsync(ownerUserId, viewerUserId, cancellationToken);
        return Ok(items);
    }

    [HttpPost]
    public async Task<ActionResult<ChristmasGiftItemDto>> Create([FromBody] CreateChristmasGiftItemRequest request, CancellationToken cancellationToken)
    {
        var ownerUserId = User.RequireVaultUserId();
        var item = await service.CreateItemAsync(ownerUserId, request, cancellationToken);
        return Ok(item);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<ChristmasGiftItemDto>> Update(Guid id, [FromBody] UpdateChristmasGiftItemRequest request, CancellationToken cancellationToken)
    {
        var ownerUserId = User.RequireVaultUserId();
        var item = await service.UpdateItemAsync(ownerUserId, id, request, cancellationToken);
        return Ok(item);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var actorUserId = User.RequireVaultUserId();
        var isAdmin = User.IsInRole(IdentitySeed.AdminRole);
        await service.DeleteItemAsync(actorUserId, isAdmin, id, cancellationToken);
        return NoContent();
    }

    [HttpPost("reorder")]
    public async Task<IActionResult> Reorder([FromBody] IReadOnlyList<Guid> itemIds, CancellationToken cancellationToken)
    {
        var ownerUserId = User.RequireVaultUserId();
        await service.ReorderItemsAsync(ownerUserId, itemIds ?? [], cancellationToken);
        return Ok();
    }
}
