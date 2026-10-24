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

    [HttpPost("groups")]
    public async Task<ActionResult<DirectConversationView>> CreateGroup([FromBody] MessageGroupCreateBody body, CancellationToken cancellationToken) =>
        Ok(await messages.CreateGroupAsync(User.RequireVaultUserId(), body.UserIds, body.Title, cancellationToken));

    [HttpPatch("{id:guid}/group")]
    public async Task<ActionResult<DirectConversationView>> UpdateGroup(Guid id, [FromBody] MessageGroupUpdateBody body, CancellationToken cancellationToken) =>
        Ok(await messages.UpdateGroupAsync(User.RequireVaultUserId(), id, body.Title, body.UpdateTitle, body.AddUserIds, cancellationToken));

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<DirectThread>> Thread(Guid id, Guid? after, Guid? before, CancellationToken cancellationToken) =>
        Ok(await messages.ThreadAsync(User.RequireVaultUserId(), id, after, before, cancellationToken));

    [HttpPost("{id:guid}")]
    public async Task<ActionResult<DirectMessageView>> Send(Guid id, [FromBody] MessageSendBody body, CancellationToken cancellationToken) =>
        Ok(await messages.SendAsync(
            User.RequireVaultUserId(),
            id,
            new SendDirectMessageRequest(body.Body, body.AttachmentFileId, body.AttachmentType, body.ReplyToMessageId),
            cancellationToken));

    [HttpPost("{id:guid}/read")]
    public async Task<IActionResult> Read(Guid id, [FromBody] MessageReadBody body, CancellationToken cancellationToken)
    {
        await messages.MarkReadAsync(User.RequireVaultUserId(), id, body.ThroughId, cancellationToken);
        return NoContent();
    }

    [HttpPost("{id:guid}/reactions")]
    public async Task<ActionResult<IReadOnlyList<DirectMessageReactionSummary>>> ToggleReaction(
        Guid id,
        [FromBody] MessageReactionBody body,
        CancellationToken cancellationToken) =>
        Ok(await messages.ToggleReactionAsync(User.RequireVaultUserId(), id, body.MessageId, body.Emoji, cancellationToken));
}

[ApiController]
[Authorize]
[AutoValidateAntiforgeryToken]
[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
[Route("api/messages/typing")]
public sealed class MessagesTypingController(TypingPresenceService typing) : ControllerBase
{
    [HttpPost("{id:guid}")]
    public IActionResult Typing(Guid id)
    {
        typing.RecordTyping(id, User.RequireVaultUserId());
        return NoContent();
    }
}

public sealed class MessageOpenBody
{
    public Guid UserId { get; set; }
}

public sealed class MessageGroupCreateBody
{
    public IReadOnlyList<Guid>? UserIds { get; set; }
    public string? Title { get; set; }
}

public sealed class MessageGroupUpdateBody
{
    public string? Title { get; set; }
    public bool UpdateTitle { get; set; }
    public IReadOnlyList<Guid>? AddUserIds { get; set; }
}

public sealed class MessageSendBody
{
    public string? Body { get; set; }
    public Guid? AttachmentFileId { get; set; }
    public string? AttachmentType { get; set; }
    public Guid? ReplyToMessageId { get; set; }
}

public sealed class MessageReadBody
{
    public Guid ThroughId { get; set; }
}

public sealed class MessageReactionBody
{
    public Guid MessageId { get; set; }
    public string? Emoji { get; set; }
}
