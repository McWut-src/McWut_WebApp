using FamilyVault.Files.Services;
using McWutWebApp.Hosting;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace McWutWebApp.Controllers;

[ApiController]
[Authorize]
[ServiceFilter(typeof(UpsertFamilyMemberFilter))]
[Route("api/gifts")]
public sealed class GiftsController(ChristmasGiftService service) : ControllerBase
{
    [HttpGet("members")]
    public async Task<ActionResult<IReadOnlyList<ChristmasGiftMemberSummaryDto>>> GetMembers(CancellationToken cancellationToken)
    {
        var viewerUserId = User.RequireVaultUserId();
        var viewerIsKid = User.IsInRole(IdentitySeed.KidRole);
        var members = await service.GetMembersAsync(viewerUserId, viewerIsKid, cancellationToken);
        return Ok(members);
    }

    [HttpGet("list/{ownerUserId:guid}")]
    public async Task<ActionResult<IReadOnlyList<ChristmasGiftItemDto>>> GetList(Guid ownerUserId, CancellationToken cancellationToken)
    {
        var viewerUserId = User.RequireVaultUserId();
        var viewerIsKid = User.IsInRole(IdentitySeed.KidRole);
        var items = await service.GetItemsAsync(ownerUserId, viewerUserId, viewerIsKid, cancellationToken);
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

    [HttpPost("{id:guid}/most-wanted")]
    public async Task<ActionResult<ChristmasGiftItemDto>> ToggleMostWanted(Guid id, CancellationToken cancellationToken)
    {
        var ownerUserId = User.RequireVaultUserId();
        var item = await service.ToggleMostWantedAsync(ownerUserId, id, cancellationToken);
        return Ok(item);
    }

    [HttpPost("list/{ownerUserId:guid}/surprise")]
    public async Task<ActionResult<ChristmasGiftItemDto>> CreateAdultSurprise(
        Guid ownerUserId,
        [FromBody] CreateAdultSurpriseRequest request,
        CancellationToken cancellationToken)
    {
        if (User.IsInRole(IdentitySeed.KidRole))
        {
            return Forbid();
        }

        var adultUserId = User.RequireVaultUserId();
        var item = await service.CreateAdultSurpriseAsync(
            adultUserId,
            viewerIsKid: false,
            ownerUserId,
            request,
            cancellationToken);
        return Ok(item);
    }

    [HttpPost("reorder")]
    public async Task<IActionResult> Reorder([FromBody] IReadOnlyList<Guid> itemIds, CancellationToken cancellationToken)
    {
        var ownerUserId = User.RequireVaultUserId();
        await service.ReorderItemsAsync(ownerUserId, itemIds ?? [], cancellationToken);
        return Ok();
    }

    [HttpPost("{id:guid}/claim")]
    public async Task<ActionResult<ChristmasGiftItemDto>> Claim(Guid id, [FromBody] ClaimChristmasGiftRequest? request, CancellationToken cancellationToken)
    {
        if (User.IsInRole(IdentitySeed.KidRole))
        {
            return Forbid();
        }

        var viewerUserId = User.RequireVaultUserId();
        var item = await service.ClaimItemAsync(
            viewerUserId,
            viewerIsKid: false,
            id,
            request ?? new ClaimChristmasGiftRequest(null),
            cancellationToken);
        return Ok(item);
    }

    [HttpPost("{id:guid}/unclaim")]
    public async Task<ActionResult<ChristmasGiftItemDto>> Unclaim(Guid id, CancellationToken cancellationToken)
    {
        if (User.IsInRole(IdentitySeed.KidRole))
        {
            return Forbid();
        }

        var viewerUserId = User.RequireVaultUserId();
        var isAdmin = User.IsInRole(IdentitySeed.AdminRole);
        var item = await service.UnclaimItemAsync(
            viewerUserId,
            viewerIsKid: false,
            isAdmin,
            id,
            cancellationToken);
        return Ok(item);
    }

    [HttpPost("{id:guid}/claim-status")]
    public async Task<ActionResult<ChristmasGiftItemDto>> UpdateClaimStatus(
        Guid id,
        [FromBody] UpdateClaimStatusRequest request,
        CancellationToken cancellationToken)
    {
        if (User.IsInRole(IdentitySeed.KidRole))
        {
            return Forbid();
        }

        var viewerUserId = User.RequireVaultUserId();
        var item = await service.UpdateClaimStatusAsync(
            viewerUserId,
            viewerIsKid: false,
            id,
            request,
            cancellationToken);
        return Ok(item);
    }

    [HttpPost("{id:guid}/split-toggle")]
    public async Task<ActionResult<ChristmasGiftItemDto>> ToggleSplit(Guid id, CancellationToken cancellationToken)
    {
        if (User.IsInRole(IdentitySeed.KidRole))
        {
            return Forbid();
        }

        var viewerUserId = User.RequireVaultUserId();
        var item = await service.ToggleSplitAsync(
            viewerUserId,
            viewerIsKid: false,
            id,
            cancellationToken);
        return Ok(item);
    }

    [HttpGet("my-claims")]
    public async Task<ActionResult<IReadOnlyList<MyClaimedGiftItemDto>>> GetMyClaims(CancellationToken cancellationToken)
    {
        if (User.IsInRole(IdentitySeed.KidRole))
        {
            return Forbid();
        }

        var adultUserId = User.RequireVaultUserId();
        var items = await service.GetMyClaimsAsync(adultUserId, viewerIsKid: false, cancellationToken);
        return Ok(items);
    }

    [HttpGet("profile/{ownerUserId:guid}")]
    public async Task<ActionResult<GiftMemberProfileDto>> GetMemberProfile(Guid ownerUserId, CancellationToken cancellationToken)
    {
        var profile = await service.GetMemberProfileAsync(ownerUserId, cancellationToken);
        return Ok(profile);
    }

    [HttpPut("profile")]
    public async Task<ActionResult<GiftMemberProfileDto>> UpdateMyProfile(
        [FromBody] UpdateGiftMemberProfileRequest request,
        CancellationToken cancellationToken)
    {
        var userId = User.RequireVaultUserId();
        var profile = await service.UpdateMemberProfileAsync(userId, request, cancellationToken);
        return Ok(profile);
    }
}
