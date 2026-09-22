using FamilyVault.Files.Contracts;
using McWutWebApp.Hosting;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace McWutWebApp.Controllers;

[ApiController]
[Authorize]
[AutoValidateAntiforgeryToken]
[ServiceFilter(typeof(UpsertFamilyMemberFilter))]
[Route("api/drops")]
public sealed class DropsController(
    IDropService drops,
    IUploadSessionService uploads,
    IShareLinkService links,
    IGrantService grants,
    IFileAccessService access,
    IFileContentService content,
    RetentionMapper retention) : ControllerBase
{
    [HttpPost]
    public async Task<ActionResult<Drop>> Create([FromBody] CreateDropBody body, CancellationToken cancellationToken)
    {
        var userId = User.RequireVaultUserId();
        var drop = await drops.CreateAsync(
            userId,
            new CreateDropRequest(body.Title, retention.FromDto(body.Retention), body.Password),
            cancellationToken);
        return Created($"/api/drops/{drop.Id}", drop);
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<Drop>>> List(CancellationToken cancellationToken) =>
        Ok(await drops.ListOwnedAsync(User.RequireVaultUserId(), cancellationToken));

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<object>> Get(Guid id, CancellationToken cancellationToken)
    {
        await EnsureAsync(id, AccessIntent.List, cancellationToken);
        var drop = await drops.GetAsync(id, cancellationToken) ?? throw new VaultNotFoundException();
        var files = await drops.ListFilesAsync(id, cancellationToken);
        return Ok(new { drop, files });
    }

    [HttpPatch("{id:guid}")]
    public async Task<ActionResult<Drop>> Patch(Guid id, [FromBody] PatchDropBody body, CancellationToken cancellationToken)
    {
        await EnsureAsync(id, AccessIntent.Manage, cancellationToken);
        var updated = await drops.UpdateAsync(
            id,
            new UpdateDropRequest(body.Title, body.Retention is null ? null : retention.FromDto(body.Retention), body.Password, body.ClearPassword),
            cancellationToken);
        return Ok(updated);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        await EnsureAsync(id, AccessIntent.Manage, cancellationToken);
        await drops.DeleteAsync(id, cancellationToken);
        return NoContent();
    }

    [HttpPost("{id:guid}/files")]
    public async Task<ActionResult<UploadSession>> BeginFile(Guid id, [FromBody] BeginUploadBody body, CancellationToken cancellationToken)
    {
        await EnsureAsync(id, AccessIntent.Manage, cancellationToken);
        var session = await uploads.BeginAsync(
            new BeginUploadRequest(
                User.RequireVaultUserId(),
                body.FileName,
                body.ContentType,
                body.SizeBytes,
                id,
                retention.FromDto(body.Retention),
                body.Password),
            cancellationToken);
        return Ok(session);
    }

    [HttpPost("{id:guid}/links")]
    public async Task<ActionResult<LinkResponse>> CreateLink(Guid id, [FromBody] CreateLinkBody? body, CancellationToken cancellationToken)
    {
        await EnsureAsync(id, AccessIntent.Manage, cancellationToken);
        var link = await links.CreateAsync(
            ShareTargetKind.Drop,
            id,
            User.RequireVaultUserId(),
            new CreateShareLinkRequest(retention.FromDto(body?.Retention), body?.Password, body?.AllowPreview ?? true),
            cancellationToken);
        return Ok(ToLinkResponse(link));
    }

    [HttpPost("{id:guid}/grants")]
    public async Task<ActionResult<FileGrant>> Grant(Guid id, [FromBody] GrantBody body, CancellationToken cancellationToken)
    {
        await EnsureAsync(id, AccessIntent.Manage, cancellationToken);
        var grant = await grants.GrantAsync(ShareTargetKind.Drop, id, body.UserId, body.Permission, User.RequireVaultUserId(), cancellationToken);
        return Ok(grant);
    }

    [HttpDelete("{id:guid}/grants/{userId:guid}")]
    public async Task<IActionResult> RevokeGrant(Guid id, Guid userId, CancellationToken cancellationToken)
    {
        await EnsureAsync(id, AccessIntent.Manage, cancellationToken);
        await grants.RevokeAsync(ShareTargetKind.Drop, id, userId, User.RequireVaultUserId(), cancellationToken);
        return NoContent();
    }

    [HttpGet("{id:guid}/archive")]
    [AllowAnonymous]
    [IgnoreAntiforgeryToken]
    public async Task<IActionResult> Archive(Guid id, CancellationToken cancellationToken)
    {
        var ctx = AccessContextFactory.From(Request, User.GetVaultUserId());
        var opened = await content.OpenDropArchiveAsync(ctx, id, cancellationToken);
        return HttpFileResults.File(opened);
    }

    private async Task EnsureAsync(Guid id, AccessIntent intent, CancellationToken cancellationToken)
    {
        var decision = await access.AuthorizeDropAsync(AccessContextFactory.From(Request, User.GetVaultUserId()), id, intent, cancellationToken);
        if (decision.RequiresPassword)
        {
            throw new PasswordRequiredException();
        }

        if (!decision.Allowed)
        {
            throw new VaultNotFoundException();
        }
    }

    private LinkResponse ToLinkResponse(ShareLink link) => new()
    {
        Token = link.Token,
        Url = $"{Request.Scheme}://{Request.Host}/s/{link.Token}",
        ExpiresAt = link.ExpiresAt,
        HasPassword = link.HasPassword,
        AllowPreview = link.AllowPreview
    };
}
