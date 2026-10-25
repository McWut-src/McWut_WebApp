using System.Text.Json;
using FamilyVault.Files.Security;
using McWutWebApp.Hosting;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.Mvc;

namespace McWutWebApp.Controllers;

[ApiController]
[Authorize]
[DisallowKids]
[AutoValidateAntiforgeryToken]
[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
[Route("api/ai")]
public sealed class AiController(AiChatService ai) : ControllerBase
{
    private static readonly JsonSerializerOptions Ndjson = new(JsonSerializerDefaults.Web);
    [HttpGet("key")]
    public async Task<ActionResult<OpenRouterKeyStatus>> Key(CancellationToken cancellationToken) =>
        Ok(await ai.GetStatusAsync(User.RequireVaultUserId(), cancellationToken));

    [HttpPut("key")]
    public async Task<ActionResult<OpenRouterKeyStatus>> SaveKey([FromBody] AiKeyBody body, CancellationToken cancellationToken) =>
        Ok(await ai.SaveAsync(User.RequireVaultUserId(), body.Key, cancellationToken));

    [HttpDelete("key")]
    public async Task<IActionResult> DeleteKey(CancellationToken cancellationToken)
    {
        await ai.DeleteAsync(User.RequireVaultUserId(), cancellationToken);
        return NoContent();
    }

    [HttpGet("models")]
    public async Task<ActionResult<IReadOnlyList<OpenRouterListedModel>>> Models([FromQuery] bool paid = false, CancellationToken cancellationToken = default) =>
        Ok(await ai.ListModelsAsync(User.RequireVaultUserId(), paid, cancellationToken));

    [HttpPost("chat")]
    public async Task Chat([FromBody] AiChatBody body, CancellationToken cancellationToken)
    {
        var prepared = await ai.PrepareChatAsync(
            User.RequireVaultUserId(),
            body.Model,
            body.Messages?.Select(message => new OpenRouterTurnInput(message.Role, message.Content)).ToList(),
            body.Markdown,
            body.Paid,
            cancellationToken);

        // Flush each line. A buffered body would leave the page waiting on the whole reply.
        Response.ContentType = "application/x-ndjson; charset=utf-8";
        Response.Headers.CacheControl = "no-store";
        Response.Headers["X-Accel-Buffering"] = "no";
        HttpContext.Features.Get<IHttpResponseBodyFeature>()?.DisableBuffering();

        try
        {
            await foreach (var delta in ai.StreamReplyAsync(User.RequireVaultUserId(), prepared, cancellationToken))
            {
                await WriteEventAsync(new { delta }, cancellationToken);
            }

            await WriteEventAsync(new { done = true }, cancellationToken);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
        }
        catch (OpenRouterRejectedException) when (!Response.HasStarted)
        {
            throw;
        }
        catch (OpenRouterRejectedException ex)
        {
            await WriteEventAsync(new { error = ex.Message }, CancellationToken.None);
        }
    }

    [HttpPost("preview")]
    public ActionResult Preview([FromBody] AiPreviewBody body)
    {
        var text = body.Text ?? "";
        if (text.Length > ReadableFiles.MaxPreviewBytes)
        {
            return BadRequest(new { error = "That reply is too long to draw." });
        }

        return Ok(new { html = MarkdownHtml.ToHtml(text) });
    }

    private async Task WriteEventAsync(object payload, CancellationToken cancellationToken)
    {
        await Response.WriteAsync(JsonSerializer.Serialize(payload, Ndjson), cancellationToken);
        await Response.WriteAsync("\n", cancellationToken);
        await Response.Body.FlushAsync(cancellationToken);
    }

    [HttpPost("chats")]
    public async Task<ActionResult<SavedChat>> SaveChat([FromBody] AiChatBody body, CancellationToken cancellationToken) =>
        Ok(await ai.SaveChatAsync(
            User.RequireVaultUserId(),
            body.Model,
            body.ModelName,
            body.Messages?.Select(message => new OpenRouterTurnInput(message.Role, message.Content)).ToList(),
            cancellationToken));
}

public sealed class AiKeyBody
{
    public string? Key { get; set; }
}

public sealed class AiChatBody
{
    public string? Model { get; set; }
    public string? ModelName { get; set; }
    public bool Markdown { get; set; }
    public bool Paid { get; set; }
    public List<AiChatMessageBody>? Messages { get; set; }
}

public sealed class AiPreviewBody
{
    public string? Text { get; set; }
}

public sealed class AiChatMessageBody
{
    public string? Role { get; set; }
    public string? Content { get; set; }
}
