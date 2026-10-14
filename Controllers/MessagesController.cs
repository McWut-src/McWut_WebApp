using FamilyVault.Files.Services;
using McWutWebApp.Hosting;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace McWutWebApp.Controllers;

[ApiController]
[Authorize]
[AutoValidateAntiforgeryToken]
[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
[ServiceFilter(typeof(UpsertFamilyMemberFilter))]
[Route("api/messages")]
public sealed class MessagesController(DirectMessageService messages) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<DirectConversationView>>> List(CancellationToken cancellationToken) =>
        Ok(await messages.ListAsync(User.RequireVaultUserId(), cancellationToken));

    [HttpPost]
    public async Task<ActionResult<DirectConversationView>> Open([FromBody] MessageOpenBody body, CancellationToken cancellationToken) =>
        Ok(await messages.OpenAsync(User.RequireVaultUserId(), body.UserId, cancellationToken));

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<DirectThread>> Thread(Guid id, Guid? after, Guid? before, CancellationToken cancellationToken) =>
        Ok(await messages.ThreadAsync(User.RequireVaultUserId(), id, after, before, cancellationToken));

    [HttpPost("{id:guid}")]
    public async Task<ActionResult<DirectMessageView>> Send(Guid id, [FromBody] MessageSendBody body, CancellationToken cancellationToken) =>
        Ok(await messages.SendAsync(User.RequireVaultUserId(), id, body.Body, cancellationToken));

    [HttpPost("{id:guid}/read")]
    public async Task<IActionResult> Read(Guid id, [FromBody] MessageReadBody body, CancellationToken cancellationToken)
    {
        await messages.MarkReadAsync(User.RequireVaultUserId(), id, body.ThroughId, cancellationToken);
        return NoContent();
    }
}

public sealed class MessageOpenBody
{
    public Guid UserId { get; set; }
}

public sealed class MessageSendBody
{
    public string? Body { get; set; }
}

public sealed class MessageReadBody
{
    public Guid ThroughId { get; set; }
}
