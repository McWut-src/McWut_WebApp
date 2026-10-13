using FamilyVault.Files.Contracts;
using McWutWebApp.Hosting;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace McWutWebApp.Controllers;

[ApiController]
[Authorize]
[AutoValidateAntiforgeryToken]
[ServiceFilter(typeof(UpsertFamilyMemberFilter))]
[Route("api/stories")]
public sealed class StoriesController(IDropService drops, IGrantService grants) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<StoryResponse>>> List(CancellationToken cancellationToken)
    {
        var userId = User.RequireVaultUserId();
        var stories = await drops.ListOwnedStoriesAsync(userId, cancellationToken);
        var tags = await grants.ListTagsAsync(ShareTargetKind.Drop, stories.Select(story => story.Id).ToList(), cancellationToken);
        return Ok(stories.Select(story => ToResponse(story) with
        {
            SharedWith = tags.TryGetValue(story.Id, out var shared) ? shared : []
        }).ToList());
    }

    [HttpGet("shared-with-me")]
    public async Task<ActionResult<IReadOnlyList<StoryResponse>>> SharedWithMe(CancellationToken cancellationToken)
    {
        var rows = await grants.ListIncomingStoriesAsync(User.RequireVaultUserId(), cancellationToken);
        return Ok(rows.Select(row => ToResponse(row.Story) with
        {
            FromUserId = row.From.UserId,
            FromName = row.From.DisplayName,
            FromColor = row.From.Color
        }).ToList());
    }

    private static StoryResponse ToResponse(Story story) => new(
        story.Id,
        story.OwnerUserId,
        story.Title,
        story.CreatedAt,
        story.ExpiresAt,
        story.HasPassword,
        story.Body,
        story.Attachments);
}
