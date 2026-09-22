using FamilyVault.Files.Contracts;
using McWutWebApp.Hosting;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace McWutWebApp.Controllers;

[ApiController]
[Authorize]
[AutoValidateAntiforgeryToken]
[ServiceFilter(typeof(UpsertFamilyMemberFilter))]
[Route("api/uploads")]
public sealed class UploadsController(
    IUploadSessionService uploads,
    RetentionMapper retention) : ControllerBase
{
    [HttpPost]
    public async Task<ActionResult<UploadSession>> Begin([FromBody] BeginUploadBody body, CancellationToken cancellationToken)
    {
        var session = await uploads.BeginAsync(
            new BeginUploadRequest(
                User.RequireVaultUserId(),
                body.FileName,
                body.ContentType,
                body.SizeBytes,
                body.DropId,
                retention.FromDto(body.Retention),
                body.Password),
            cancellationToken);
        return Ok(session);
    }

    [HttpPut("{sessionId:guid}")]
    [RequestSizeLimit(104_857_600)]
    public async Task<IActionResult> Put(Guid sessionId, CancellationToken cancellationToken)
    {
        await uploads.PutAsync(sessionId, User.RequireVaultUserId(), Request.Body, cancellationToken);
        return NoContent();
    }

    [HttpPost("{sessionId:guid}/complete")]
    public async Task<ActionResult<StoredFile>> Complete(Guid sessionId, CancellationToken cancellationToken)
    {
        var file = await uploads.CompleteAsync(sessionId, User.RequireVaultUserId(), cancellationToken);
        return Ok(file);
    }

    [HttpDelete("{sessionId:guid}")]
    public async Task<IActionResult> Abort(Guid sessionId, CancellationToken cancellationToken)
    {
        await uploads.AbortAsync(sessionId, User.RequireVaultUserId(), cancellationToken);
        return NoContent();
    }
}
