using FamilyVault.Files.Contracts;
using McWutWebApp.Hosting;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace McWutWebApp.Controllers;

[ApiController]
[Authorize]
[AutoValidateAntiforgeryToken]
[ServiceFilter(typeof(UpsertFamilyMemberFilter))]
[Route("api/files")]
public sealed class FilesController(
    IFileLibrary library,
    IGrantService grants,
    IShareLinkService links,
    IFileAccessService access,
    IFileContentService content,
    RetentionMapper retention) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<StoredFile>>> List(CancellationToken cancellationToken) =>
        Ok(await library.ListOwnedAsync(User.RequireVaultUserId(), cancellationToken));

    [HttpGet("shared-with-me")]
    public async Task<ActionResult<IReadOnlyList<StoredFile>>> SharedWithMe(CancellationToken cancellationToken) =>
        Ok(await grants.ListSharedWithMeAsync(User.RequireVaultUserId(), cancellationToken));

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<StoredFile>> Get(Guid id, CancellationToken cancellationToken)
    {
        await EnsureAsync(id, AccessIntent.List, cancellationToken);
        var file = await library.GetAsync(id, cancellationToken) ?? throw new VaultNotFoundException();
        return Ok(file);
    }

    [HttpPatch("{id:guid}")]
    public async Task<ActionResult<StoredFile>> Patch(Guid id, [FromBody] PatchFileBody body, CancellationToken cancellationToken)
    {
        await EnsureAsync(id, AccessIntent.Manage, cancellationToken);
        var updated = await library.UpdateAsync(
            id,
            new UpdateStoredFileRequest(body.Retention is null ? null : retention.FromDto(body.Retention), body.Password, body.ClearPassword),
            cancellationToken);
        return Ok(updated);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        await EnsureAsync(id, AccessIntent.Manage, cancellationToken);
        await library.DeleteAsync(id, cancellationToken);
        return NoContent();
    }

    [HttpPost("{id:guid}/links")]
    public async Task<ActionResult<LinkResponse>> CreateLink(Guid id, [FromBody] CreateLinkBody? body, CancellationToken cancellationToken)
    {
        await EnsureAsync(id, AccessIntent.Manage, cancellationToken);
        var link = await links.CreateAsync(
            ShareTargetKind.File,
            id,
            User.RequireVaultUserId(),
            new CreateShareLinkRequest(retention.FromDto(body?.Retention), body?.Password, body?.AllowPreview ?? true),
            cancellationToken);
        return Ok(new LinkResponse
        {
            Token = link.Token,
            Url = $"{Request.Scheme}://{Request.Host}/s/{link.Token}",
            ExpiresAt = link.ExpiresAt,
            HasPassword = link.HasPassword,
            AllowPreview = link.AllowPreview
        });
    }

    [HttpPost("{id:guid}/grants")]
    public async Task<ActionResult<FileGrant>> Grant(Guid id, [FromBody] GrantBody body, CancellationToken cancellationToken)
    {
        await EnsureAsync(id, AccessIntent.Manage, cancellationToken);
        var grant = await grants.GrantAsync(ShareTargetKind.File, id, body.UserId, body.Permission, User.RequireVaultUserId(), cancellationToken);
        return Ok(grant);
    }

    [HttpGet("{id:guid}/grants")]
    public async Task<ActionResult<IReadOnlyList<FileGrant>>> ListGrants(Guid id, CancellationToken cancellationToken)
    {
        await EnsureAsync(id, AccessIntent.Manage, cancellationToken);
        return Ok(await grants.ListAsync(ShareTargetKind.File, id, cancellationToken));
    }

    [HttpDelete("{id:guid}/grants/{userId:guid}")]
    public async Task<IActionResult> RevokeGrant(Guid id, Guid userId, CancellationToken cancellationToken)
    {
        await EnsureAsync(id, AccessIntent.Manage, cancellationToken);
        await grants.RevokeAsync(ShareTargetKind.File, id, userId, User.RequireVaultUserId(), cancellationToken);
        return NoContent();
    }

    [HttpGet("{id:guid}/content")]
    [AllowAnonymous]
    [IgnoreAntiforgeryToken]
    public async Task<IActionResult> Content(Guid id, [FromQuery] bool preview, CancellationToken cancellationToken)
    {
        var ctx = AccessContextFactory.From(Request, User.GetVaultUserId());
        var range = RangeHeader.Parse(Request);
        var opened = preview
            ? await content.OpenPreviewAsync(ctx, id, range, cancellationToken)
            : await content.OpenDownloadAsync(ctx, id, range, cancellationToken);
        return HttpFileResults.File(opened);
    }

    private async Task EnsureAsync(Guid id, AccessIntent intent, CancellationToken cancellationToken)
    {
        var decision = await access.AuthorizeFileAsync(AccessContextFactory.From(Request, User.GetVaultUserId()), id, intent, cancellationToken);
        if (decision.RequiresPassword)
        {
            throw new PasswordRequiredException();
        }

        if (!decision.Allowed)
        {
            throw new VaultNotFoundException();
        }
    }
}
