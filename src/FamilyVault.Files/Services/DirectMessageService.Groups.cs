using FamilyVault.Files.Contracts;
using FamilyVault.Files.Data.Entities;
using FamilyVault.Files.Security;
using Microsoft.EntityFrameworkCore;

namespace FamilyVault.Files.Services;

public sealed partial class DirectMessageService
{
    public async Task<DirectConversationView> CreateGroupAsync(
        Guid userId,
        IReadOnlyCollection<Guid>? memberUserIds,
        string? title,
        CancellationToken cancellationToken = default)
    {
        var others = (memberUserIds ?? [])
            .Where(id => id != Guid.Empty && id != userId)
            .Distinct()
            .ToList();
        if (others.Count == 0)
        {
            throw new DirectMessageValidationException("Choose at least one person.");
        }

        var cleanTitle = DirectMessageRules.NormalizeTitle(title);
        if (others.Count == 1 && cleanTitle is null)
        {
            return await OpenAsync(userId, others[0], cancellationToken).ConfigureAwait(false);
        }

        var participantIds = others.Append(userId).Distinct().OrderBy(id => id).ToList();
        var members = await MembersAsync(participantIds, cancellationToken).ConfigureAwait(false);
        foreach (var otherId in others)
        {
            if (!members.ContainsKey(otherId))
            {
                throw new DirectMessageValidationException("That person is not on this site.");
            }
        }

        if (cleanTitle is null)
        {
            var myGroupIds = await db.DirectConversationMembers.AsNoTracking()
                .Where(m => m.UserId == userId)
                .Select(m => m.ConversationId)
                .ToListAsync(cancellationToken)
                .ConfigureAwait(false);
            if (myGroupIds.Count > 0)
            {
                var candidateConvs = await db.DirectConversations.AsNoTracking()
                    .Where(c => myGroupIds.Contains(c.Id) && c.IsGroup && c.Title == null)
                    .ToListAsync(cancellationToken)
                    .ConfigureAwait(false);
                if (candidateConvs.Count > 0)
                {
                    var candidateIds = candidateConvs.Select(c => c.Id).ToList();
                    var candidateMembers = await db.DirectConversationMembers.AsNoTracking()
                        .Where(m => candidateIds.Contains(m.ConversationId))
                        .ToListAsync(cancellationToken)
                        .ConfigureAwait(false);
                    var grouped = candidateMembers.GroupBy(m => m.ConversationId);
                    foreach (var grp in grouped)
                    {
                        var ids = grp.Select(m => m.UserId).OrderBy(id => id).ToList();
                        if (ids.SequenceEqual(participantIds))
                        {
                            var match = candidateConvs.First(c => c.Id == grp.Key);
                            var myRow = grp.First(m => m.UserId == userId);
                            CacheGroupTyping(match.Id, grp, members);
                            return ToGroupView(match, userId, myRow.UnreadCount, grp.OrderBy(x => x.JoinedAt).ToList(), members);
                        }
                    }
                }
            }
        }

        var now = time.GetUtcNow();
        var conversation = new DirectConversationEntity
        {
            Id = Guid.NewGuid(),
            LowUserId = userId,
            HighUserId = userId,
            IsGroup = true,
            Title = cleanTitle,
            CreatedAt = now
        };
        db.DirectConversations.Add(conversation);

        var memberEntities = new List<DirectConversationMemberEntity>(participantIds.Count);
        foreach (var pid in participantIds)
        {
            var entity = new DirectConversationMemberEntity
            {
                Id = Guid.NewGuid(),
                ConversationId = conversation.Id,
                UserId = pid,
                UnreadCount = 0,
                LastReadSequence = 0,
                JoinedAt = now
            };
            memberEntities.Add(entity);
            db.DirectConversationMembers.Add(entity);
        }

        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        CacheGroupTyping(conversation.Id, memberEntities, members);
        return ToGroupView(conversation, userId, 0, memberEntities, members);
    }

    public async Task<DirectConversationView> UpdateGroupAsync(
        Guid userId,
        Guid conversationId,
        string? title,
        bool updateTitle,
        IReadOnlyCollection<Guid>? addUserIds,
        CancellationToken cancellationToken = default)
    {
        var (conversation, groupMembers) = await RequireParticipantWithMembersAsync(
            userId,
            conversationId,
            tracking: true,
            cancellationToken).ConfigureAwait(false);
        if (!conversation.IsGroup)
        {
            throw new DirectMessageValidationException("Only a group chat can be updated.");
        }

        if (updateTitle)
        {
            conversation.Title = DirectMessageRules.NormalizeTitle(title);
        }

        var existingIds = groupMembers.Select(m => m.UserId).ToHashSet();
        var toAdd = (addUserIds ?? [])
            .Where(id => id != Guid.Empty && !existingIds.Contains(id))
            .Distinct()
            .ToList();
        if (toAdd.Count > 0)
        {
            var checkMembers = await MembersAsync(toAdd, cancellationToken).ConfigureAwait(false);
            foreach (var addId in toAdd)
            {
                if (!checkMembers.ContainsKey(addId))
                {
                    throw new DirectMessageValidationException("That person is not on this site.");
                }
            }

            var now = time.GetUtcNow();
            foreach (var addId in toAdd)
            {
                var added = new DirectConversationMemberEntity
                {
                    Id = Guid.NewGuid(),
                    ConversationId = conversation.Id,
                    UserId = addId,
                    UnreadCount = 0,
                    LastReadSequence = conversation.NextSequence,
                    JoinedAt = now
                };
                groupMembers.Add(added);
                db.DirectConversationMembers.Add(added);
            }
        }

        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        var allMembers = await MembersAsync(groupMembers.Select(m => m.UserId), cancellationToken).ConfigureAwait(false);
        CacheGroupTyping(conversation.Id, groupMembers, allMembers);
        var myRow = groupMembers.First(m => m.UserId == userId);
        return ToGroupView(conversation, userId, myRow.UnreadCount, groupMembers.OrderBy(x => x.JoinedAt).ToList(), allMembers);
    }

    private void CacheGroupTyping(
        Guid conversationId,
        IEnumerable<DirectConversationMemberEntity> groupMembers,
        IReadOnlyDictionary<Guid, FamilyMemberEntity> members)
    {
        if (typing is null)
        {
            return;
        }

        typing.CacheParticipants(
            conversationId,
            groupMembers.Select(gm =>
            {
                var m = members.GetValueOrDefault(gm.UserId);
                return (gm.UserId, MemberLabel.Shown(m?.DisplayName, m?.Email));
            }));
    }

    private static DirectConversationView ToGroupView(
        DirectConversationEntity row,
        Guid userId,
        int unread,
        IReadOnlyList<DirectConversationMemberEntity> groupMembers,
        IReadOnlyDictionary<Guid, FamilyMemberEntity> members)
    {
        var chips = groupMembers
            .Select(gm =>
            {
                var m = members.GetValueOrDefault(gm.UserId);
                return new DirectMemberChip(
                    gm.UserId,
                    MemberLabel.Shown(m?.DisplayName, m?.Email),
                    ShownColor(m?.AccentColor));
            })
            .ToList();

        var otherChips = chips.Where(c => c.UserId != userId).ToList();
        var fallbackName = otherChips.Count > 0
            ? string.Join(", ", otherChips.Select(c => c.Name))
            : "Group chat";
        var displayTitle = !string.IsNullOrWhiteSpace(row.Title) ? row.Title : fallbackName;
        var primaryColor = otherChips.FirstOrDefault()?.Color ?? "#1d5fd0";

        return new DirectConversationView(
            row.Id,
            Guid.Empty,
            displayTitle,
            primaryColor,
            row.LastPreview,
            row.LastSentAt,
            row.LastSenderUserId == userId,
            unread,
            IsGroup: true,
            CustomTitle: row.Title,
            Members: chips);
    }
}
