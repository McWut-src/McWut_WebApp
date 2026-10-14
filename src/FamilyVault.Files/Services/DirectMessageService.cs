using FamilyVault.Files.Contracts;
using FamilyVault.Files.Data;
using FamilyVault.Files.Data.Entities;
using FamilyVault.Files.Security;
using Microsoft.EntityFrameworkCore;

namespace FamilyVault.Files.Services;

public sealed record DirectConversationView(
    Guid Id,
    Guid UserId,
    string Name,
    string Color,
    string? Preview,
    DateTimeOffset? SentAt,
    bool FromMe,
    int Unread);

public sealed record DirectMessageView(
    Guid Id,
    string Body,
    DateTimeOffset SentAt,
    bool Mine);

public sealed record DirectThread(
    IReadOnlyList<DirectMessageView> Messages,
    bool HasOlder);

public sealed class DirectMessageService(ApplicationDbContext db, TimeProvider time)
{
    public const int PageSize = 200;

    public async Task<int> UnreadCountAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var low = await db.DirectConversations.AsNoTracking()
            .Where(row => row.LowUserId == userId)
            .SumAsync(row => (int?)row.LowUnread, cancellationToken)
            .ConfigureAwait(false) ?? 0;
        var high = await db.DirectConversations.AsNoTracking()
            .Where(row => row.HighUserId == userId)
            .SumAsync(row => (int?)row.HighUnread, cancellationToken)
            .ConfigureAwait(false) ?? 0;
        return low + high;
    }

    public async Task<IReadOnlyList<DirectConversationView>> ListAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var rows = await db.DirectConversations.AsNoTracking()
            .Where(row => row.LowUserId == userId || row.HighUserId == userId)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);
        rows.Sort((left, right) => (right.LastSentAt ?? right.CreatedAt).CompareTo(left.LastSentAt ?? left.CreatedAt));
        var members = await MembersAsync(rows.Select(row => OtherId(row, userId)), cancellationToken).ConfigureAwait(false);
        return rows.Select(row => ToView(row, userId, members.GetValueOrDefault(OtherId(row, userId)))).ToList();
    }

    public async Task<DirectConversationView> OpenAsync(Guid userId, Guid otherUserId, CancellationToken cancellationToken = default)
    {
        if (otherUserId == Guid.Empty || otherUserId == userId)
        {
            throw new DirectMessageValidationException("Choose another person.");
        }

        var other = await db.FamilyMembers.AsNoTracking()
            .FirstOrDefaultAsync(member => member.UserId == otherUserId, cancellationToken)
            .ConfigureAwait(false);
        if (other is null)
        {
            throw new DirectMessageValidationException("That person is not on this site.");
        }

        var (low, high) = Pair(userId, otherUserId);
        var existing = await db.DirectConversations
            .FirstOrDefaultAsync(row => row.LowUserId == low && row.HighUserId == high, cancellationToken)
            .ConfigureAwait(false);
        if (existing is null)
        {
            existing = new DirectConversationEntity
            {
                Id = Guid.NewGuid(),
                LowUserId = low,
                HighUserId = high,
                CreatedAt = time.GetUtcNow()
            };
            db.DirectConversations.Add(existing);
            try
            {
                await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
            }
            catch (DbUpdateException)
            {
                db.Entry(existing).State = EntityState.Detached;
                existing = await db.DirectConversations
                    .FirstAsync(row => row.LowUserId == low && row.HighUserId == high, cancellationToken)
                    .ConfigureAwait(false);
            }
        }

        return ToView(existing, userId, other);
    }

    public async Task<DirectThread> ThreadAsync(
        Guid userId,
        Guid conversationId,
        Guid? afterId,
        Guid? beforeId,
        CancellationToken cancellationToken = default)
    {
        await RequireParticipantAsync(userId, conversationId, tracking: false, cancellationToken).ConfigureAwait(false);
        var rows = await db.DirectMessages.AsNoTracking()
            .Where(row => row.ConversationId == conversationId)
            .OrderBy(row => row.Sequence)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        if (afterId is Guid after)
        {
            var marker = rows.FindIndex(row => row.Id == after);
            var newer = marker < 0 ? [] : rows.Skip(marker + 1).ToList();
            return new DirectThread(newer.Select(row => ToMessage(row, userId)).ToList(), false);
        }

        if (beforeId is Guid before)
        {
            var marker = rows.FindIndex(row => row.Id == before);
            var earlier = marker <= 0 ? [] : rows.Take(marker).TakeLast(PageSize).ToList();
            return new DirectThread(earlier.Select(row => ToMessage(row, userId)).ToList(), marker > PageSize);
        }

        var page = rows.TakeLast(PageSize).ToList();
        return new DirectThread(page.Select(row => ToMessage(row, userId)).ToList(), rows.Count > page.Count);
    }

    public async Task<DirectMessageView> SendAsync(
        Guid userId,
        Guid conversationId,
        string? body,
        CancellationToken cancellationToken = default)
    {
        var text = DirectMessageRules.Normalize(body);
        var conversation = await RequireParticipantAsync(userId, conversationId, tracking: true, cancellationToken).ConfigureAwait(false);
        var now = time.GetUtcNow();
        conversation.NextSequence++;
        var message = new DirectMessageEntity
        {
            Id = Guid.NewGuid(),
            ConversationId = conversation.Id,
            SenderUserId = userId,
            Body = text,
            SentAt = now,
            Sequence = conversation.NextSequence
        };
        conversation.LastPreview = DirectMessageRules.Preview(text);
        conversation.LastSenderUserId = userId;
        conversation.LastSentAt = now;
        if (conversation.LowUserId == userId)
        {
            conversation.HighUnread++;
        }
        else
        {
            conversation.LowUnread++;
        }

        db.DirectMessages.Add(message);
        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        return ToMessage(message, userId);
    }

    public async Task MarkReadAsync(
        Guid userId,
        Guid conversationId,
        Guid throughId,
        CancellationToken cancellationToken = default)
    {
        var conversation = await RequireParticipantAsync(userId, conversationId, tracking: true, cancellationToken).ConfigureAwait(false);
        var through = await db.DirectMessages.AsNoTracking()
            .FirstOrDefaultAsync(row => row.Id == throughId && row.ConversationId == conversationId, cancellationToken)
            .ConfigureAwait(false);
        if (through is null)
        {
            return;
        }

        var other = OtherId(conversation, userId);
        var remaining = await db.DirectMessages.CountAsync(
                row => row.ConversationId == conversationId && row.SenderUserId == other && row.Sequence > through.Sequence,
                cancellationToken)
            .ConfigureAwait(false);
        if (conversation.LowUserId == userId)
        {
            conversation.LowUnread = remaining;
        }
        else
        {
            conversation.HighUnread = remaining;
        }

        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
    }

    private async Task<DirectConversationEntity> RequireParticipantAsync(
        Guid userId,
        Guid conversationId,
        bool tracking,
        CancellationToken cancellationToken)
    {
        var query = tracking ? db.DirectConversations : db.DirectConversations.AsNoTracking();
        var row = await query.FirstOrDefaultAsync(item => item.Id == conversationId, cancellationToken).ConfigureAwait(false);
        if (row is null || (row.LowUserId != userId && row.HighUserId != userId))
        {
            throw new VaultNotFoundException();
        }

        return row;
    }

    private async Task<Dictionary<Guid, FamilyMemberEntity>> MembersAsync(IEnumerable<Guid> userIds, CancellationToken cancellationToken)
    {
        var ids = userIds.Distinct().ToList();
        if (ids.Count == 0)
        {
            return [];
        }

        var rows = await db.FamilyMembers.AsNoTracking()
            .Where(member => ids.Contains(member.UserId))
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);
        return rows.ToDictionary(member => member.UserId);
    }

    private static DirectConversationView ToView(DirectConversationEntity row, Guid userId, FamilyMemberEntity? other)
    {
        var unread = row.LowUserId == userId ? row.LowUnread : row.HighUnread;
        return new DirectConversationView(
            row.Id,
            OtherId(row, userId),
            MemberLabel.Shown(other?.DisplayName, other?.Email),
            ShownColor(other?.AccentColor),
            row.LastPreview,
            row.LastSentAt,
            row.LastSenderUserId == userId,
            unread);
    }

    private static DirectMessageView ToMessage(DirectMessageEntity row, Guid userId) =>
        new(row.Id, row.Body, row.SentAt, row.SenderUserId == userId);

    private static Guid OtherId(DirectConversationEntity row, Guid userId) =>
        row.LowUserId == userId ? row.HighUserId : row.LowUserId;

    private static (Guid Low, Guid High) Pair(Guid left, Guid right) =>
        left.CompareTo(right) < 0 ? (left, right) : (right, left);

    private static string ShownColor(string? value)
    {
        const string fallback = "#0b1f3a";
        if (string.IsNullOrWhiteSpace(value))
        {
            return fallback;
        }

        var trimmed = value.Trim();
        if (trimmed.Length != 7 || trimmed[0] != '#')
        {
            return fallback;
        }

        for (var i = 1; i < trimmed.Length; i++)
        {
            if (!Uri.IsHexDigit(trimmed[i]))
            {
                return fallback;
            }
        }

        return trimmed.ToLowerInvariant();
    }
}
