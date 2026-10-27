using FamilyVault.Files.Contracts;
using FamilyVault.Files.Data.Entities;
using FamilyVault.Files.Security;
using Microsoft.EntityFrameworkCore;

namespace FamilyVault.Files.Services;

public sealed partial class DirectMessageService
{
    public async Task<IReadOnlyList<DirectMessageReactionSummary>> ToggleReactionAsync(
        Guid userId,
        Guid conversationId,
        Guid messageId,
        string? emoji,
        CancellationToken cancellationToken = default)
    {
        await RequireParticipantWithMembersAsync(userId, conversationId, tracking: false, cancellationToken).ConfigureAwait(false);
        var cleanEmoji = DirectMessageRules.NormalizeReaction(emoji);

        var now = time.GetUtcNow();
        var message = await db.DirectMessages.AsNoTracking()
            .FirstOrDefaultAsync(m => m.Id == messageId && m.ConversationId == conversationId, cancellationToken)
            .ConfigureAwait(false)
            ?? throw new VaultNotFoundException();
        if (message.ExpiresAt is DateTimeOffset exp && exp <= now)
        {
            throw new VaultNotFoundException();
        }

        var existing = await db.DirectMessageReactions
            .FirstOrDefaultAsync(
                r => r.MessageId == messageId && r.UserId == userId && r.Emoji == cleanEmoji,
                cancellationToken)
            .ConfigureAwait(false);
        if (existing is not null)
        {
            db.DirectMessageReactions.Remove(existing);
        }
        else
        {
            db.DirectMessageReactions.Add(new DirectMessageReactionEntity
            {
                Id = Guid.NewGuid(),
                MessageId = messageId,
                UserId = userId,
                Emoji = cleanEmoji,
                CreatedAt = now
            });
        }

        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        var loaded = await LoadReactionsAsync([messageId], userId, cancellationToken).ConfigureAwait(false);
        return loaded.GetValueOrDefault(messageId) ?? [];
    }

    private async Task<Dictionary<Guid, IReadOnlyList<DirectMessageReactionSummary>>> LoadReactionsAsync(
        IReadOnlyCollection<Guid> messageIds,
        Guid viewerUserId,
        CancellationToken cancellationToken)
    {
        if (messageIds.Count == 0)
        {
            return [];
        }

        var rows = await db.DirectMessageReactions.AsNoTracking()
            .Where(r => messageIds.Contains(r.MessageId))
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);
        if (rows.Count == 0)
        {
            return [];
        }

        var members = await MembersAsync(rows.Select(r => r.UserId), cancellationToken).ConfigureAwait(false);
        var result = new Dictionary<Guid, IReadOnlyList<DirectMessageReactionSummary>>();
        foreach (var messageGroup in rows.GroupBy(r => r.MessageId))
        {
            var summaries = messageGroup
                .OrderBy(r => r.CreatedAt)
                .GroupBy(r => r.Emoji, StringComparer.Ordinal)
                .Select(emojiGroup =>
                {
                    var names = emojiGroup
                        .Select(r =>
                        {
                            var m = members.GetValueOrDefault(r.UserId);
                            return MemberLabel.Shown(m?.DisplayName, m?.Email);
                        })
                        .Distinct(StringComparer.OrdinalIgnoreCase)
                        .ToList();
                    return new DirectMessageReactionSummary(
                        emojiGroup.Key,
                        emojiGroup.Count(),
                        emojiGroup.Any(r => r.UserId == viewerUserId),
                        names);
                })
                .ToList();
            result[messageGroup.Key] = summaries;
        }

        return result;
    }
}
