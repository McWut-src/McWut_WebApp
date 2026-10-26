using FamilyVault.Files.Contracts;
using FamilyVault.Files.Data;
using FamilyVault.Files.Data.Entities;
using FamilyVault.Files.Security;
using Microsoft.EntityFrameworkCore;

namespace FamilyVault.Files.Services;

public sealed record DirectMemberChip(
    Guid UserId,
    string Name,
    string Color);

public sealed record DirectConversationView(
    Guid Id,
    Guid UserId,
    string Name,
    string Color,
    string? Preview,
    DateTimeOffset? SentAt,
    bool FromMe,
    int Unread,
    bool IsGroup = false,
    string? CustomTitle = null,
    IReadOnlyList<DirectMemberChip>? Members = null);

public sealed record DirectMessageReactionSummary(
    string Emoji,
    int Count,
    bool Mine,
    IReadOnlyList<string> Names);

public sealed record DirectMessageAttachmentView(
    Guid FileId,
    string Kind,
    string FileName,
    string ContentType,
    long SizeBytes,
    DateTimeOffset? ExpiresAt);

public sealed record DirectMessageQuoteView(
    Guid? MessageId,
    string Author,
    string Snippet);

public sealed record DirectMessageView(
    Guid Id,
    string Body,
    DateTimeOffset SentAt,
    bool Mine,
    Guid SenderUserId = default,
    string SenderName = "",
    string SenderColor = "#0b1f3a",
    DateTimeOffset? ExpiresAt = null,
    bool ReadByOther = false,
    DirectMessageAttachmentView? Attachment = null,
    DirectMessageQuoteView? Quote = null,
    IReadOnlyList<DirectMessageReactionSummary>? Reactions = null);

public sealed record DirectReactionSync(
    Guid MessageId,
    IReadOnlyList<DirectMessageReactionSummary> Reactions);

public sealed record DirectThread(
    IReadOnlyList<DirectMessageView> Messages,
    bool HasOlder,
    IReadOnlyList<string>? Typing = null,
    IReadOnlyList<Guid>? ReadMessageIds = null,
    IReadOnlyList<DirectReactionSync>? ReactionUpdates = null);

public sealed record SendDirectMessageRequest(
    string? Body,
    Guid? AttachmentFileId = null,
    string? AttachmentType = null,
    Guid? ReplyToMessageId = null);

public sealed class DirectMessageService(
    ApplicationDbContext db,
    TimeProvider time,
    TypingPresenceService? typing = null)
{
    public const int PageSize = 200;
    public const int LiveSyncWindow = 30;

    public async Task<int> UnreadCountAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var low = await db.DirectConversations.AsNoTracking()
            .Where(row => !row.IsGroup && row.LowUserId == userId)
            .SumAsync(row => (int?)row.LowUnread, cancellationToken)
            .ConfigureAwait(false) ?? 0;
        var high = await db.DirectConversations.AsNoTracking()
            .Where(row => !row.IsGroup && row.HighUserId == userId)
            .SumAsync(row => (int?)row.HighUnread, cancellationToken)
            .ConfigureAwait(false) ?? 0;
        var group = await db.DirectConversationMembers.AsNoTracking()
            .Where(row => row.UserId == userId)
            .SumAsync(row => (int?)row.UnreadCount, cancellationToken)
            .ConfigureAwait(false) ?? 0;
        return low + high + group;
    }

    public async Task<IReadOnlyList<DirectConversationView>> ListAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var directRows = await db.DirectConversations.AsNoTracking()
            .Where(row => !row.IsGroup && (row.LowUserId == userId || row.HighUserId == userId))
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        var myMemberships = await db.DirectConversationMembers.AsNoTracking()
            .Where(row => row.UserId == userId)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        var groupRows = new List<DirectConversationEntity>();
        var allGroupMembers = new List<DirectConversationMemberEntity>();
        if (myMemberships.Count > 0)
        {
            var groupIds = myMemberships.Select(m => m.ConversationId).Distinct().ToList();
            groupRows = await db.DirectConversations.AsNoTracking()
                .Where(row => row.IsGroup && groupIds.Contains(row.Id))
                .ToListAsync(cancellationToken)
                .ConfigureAwait(false);
            allGroupMembers = await db.DirectConversationMembers.AsNoTracking()
                .Where(row => groupIds.Contains(row.ConversationId))
                .ToListAsync(cancellationToken)
                .ConfigureAwait(false);
        }

        var neededMemberIds = directRows.Select(row => OtherId(row, userId))
            .Concat(allGroupMembers.Select(m => m.UserId))
            .Append(userId);
        var members = await MembersAsync(neededMemberIds, cancellationToken).ConfigureAwait(false);

        var myUnreadByConv = myMemberships.ToDictionary(m => m.ConversationId, m => m.UnreadCount);
        var groupMembersByConv = allGroupMembers
            .GroupBy(m => m.ConversationId)
            .ToDictionary(g => g.Key, g => g.OrderBy(x => x.JoinedAt).ToList());

        var combined = new List<(DateTimeOffset SortAt, DirectConversationView View)>(directRows.Count + groupRows.Count);
        foreach (var row in directRows)
        {
            var other = members.GetValueOrDefault(OtherId(row, userId));
            combined.Add((row.LastSentAt ?? row.CreatedAt, ToDirectView(row, userId, other)));
        }

        foreach (var row in groupRows)
        {
            var groupMemberRows = groupMembersByConv.GetValueOrDefault(row.Id) ?? [];
            var unread = myUnreadByConv.GetValueOrDefault(row.Id, 0);
            combined.Add((row.LastSentAt ?? row.CreatedAt, ToGroupView(row, userId, unread, groupMemberRows, members)));
        }

        combined.Sort((left, right) => right.SortAt.CompareTo(left.SortAt));
        return combined.Select(item => item.View).ToList();
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
            .FirstOrDefaultAsync(row => !row.IsGroup && row.LowUserId == low && row.HighUserId == high, cancellationToken)
            .ConfigureAwait(false);
        if (existing is null)
        {
            existing = new DirectConversationEntity
            {
                Id = Guid.NewGuid(),
                LowUserId = low,
                HighUserId = high,
                IsGroup = false,
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
                    .FirstAsync(row => !row.IsGroup && row.LowUserId == low && row.HighUserId == high, cancellationToken)
                    .ConfigureAwait(false);
            }
        }

        if (typing is not null)
        {
            var self = await db.FamilyMembers.AsNoTracking()
                .FirstOrDefaultAsync(member => member.UserId == userId, cancellationToken)
                .ConfigureAwait(false);
            typing.CacheParticipants(existing.Id,
            [
                (userId, MemberLabel.Shown(self?.DisplayName, self?.Email)),
                (otherUserId, MemberLabel.Shown(other.DisplayName, other.Email))
            ]);
        }

        return ToDirectView(existing, userId, other);
    }

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

    public async Task<DirectThread> ThreadAsync(
        Guid userId,
        Guid conversationId,
        Guid? afterId,
        Guid? beforeId,
        CancellationToken cancellationToken = default)
    {
        var (conversation, groupMembers) = await RequireParticipantWithMembersAsync(
            userId,
            conversationId,
            tracking: false,
            cancellationToken).ConfigureAwait(false);

        var now = time.GetUtcNow();
        List<DirectMessageEntity> selectedRows;
        var hasOlder = false;

        if (afterId is Guid after)
        {
            var markerSeq = await db.DirectMessages.AsNoTracking()
                .Where(row => row.ConversationId == conversationId && row.Id == after)
                .Select(row => (long?)row.Sequence)
                .FirstOrDefaultAsync(cancellationToken)
                .ConfigureAwait(false);

            if (markerSeq is long seq)
            {
                var fetched = await db.DirectMessages.AsNoTracking()
                    .Where(row => row.ConversationId == conversationId && row.Sequence > seq)
                    .OrderBy(row => row.Sequence)
                    .Take(PageSize)
                    .ToListAsync(cancellationToken)
                    .ConfigureAwait(false);
                selectedRows = fetched.Where(row => row.ExpiresAt is null || row.ExpiresAt > now).ToList();
            }
            else
            {
                selectedRows = [];
            }
        }
        else if (beforeId is Guid before)
        {
            var markerSeq = await db.DirectMessages.AsNoTracking()
                .Where(row => row.ConversationId == conversationId && row.Id == before)
                .Select(row => (long?)row.Sequence)
                .FirstOrDefaultAsync(cancellationToken)
                .ConfigureAwait(false);

            if (markerSeq is long seq)
            {
                var fetched = await db.DirectMessages.AsNoTracking()
                    .Where(row => row.ConversationId == conversationId && row.Sequence < seq)
                    .OrderByDescending(row => row.Sequence)
                    .Take(PageSize + 1)
                    .ToListAsync(cancellationToken)
                    .ConfigureAwait(false);
                hasOlder = fetched.Count > PageSize;
                selectedRows = fetched.Take(PageSize)
                    .Where(row => row.ExpiresAt is null || row.ExpiresAt > now)
                    .OrderBy(row => row.Sequence)
                    .ToList();
            }
            else
            {
                selectedRows = [];
            }
        }
        else
        {
            var fetched = await db.DirectMessages.AsNoTracking()
                .Where(row => row.ConversationId == conversationId)
                .OrderByDescending(row => row.Sequence)
                .Take(PageSize + 1)
                .ToListAsync(cancellationToken)
                .ConfigureAwait(false);
            hasOlder = fetched.Count > PageSize;
            selectedRows = fetched.Take(PageSize)
                .Where(row => row.ExpiresAt is null || row.ExpiresAt > now)
                .OrderBy(row => row.Sequence)
                .ToList();
        }

        var syncWindow = await db.DirectMessages.AsNoTracking()
            .Where(row => row.ConversationId == conversationId)
            .OrderByDescending(row => row.Sequence)
            .Take(LiveSyncWindow)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        var messageIdsForReactions = selectedRows.Select(r => r.Id)
            .Concat(syncWindow.Select(r => r.Id))
            .Distinct()
            .ToList();

        var reactionsByMessage = await LoadReactionsAsync(messageIdsForReactions, userId, cancellationToken).ConfigureAwait(false);
        var attachmentIds = selectedRows
            .Where(r => r.AttachmentFileId is not null)
            .Select(r => r.AttachmentFileId!.Value)
            .Distinct()
            .ToList();
        var attachmentsById = await LoadAttachmentsAsync(attachmentIds, now, cancellationToken).ConfigureAwait(false);

        var participantUserIds = conversation.IsGroup
            ? groupMembers.Select(m => m.UserId)
            : [conversation.LowUserId, conversation.HighUserId];
        var senderAndParticipantIds = participantUserIds.Concat(selectedRows.Select(r => r.SenderUserId));
        var memberLookup = await MembersAsync(senderAndParticipantIds, cancellationToken).ConfigureAwait(false);

        if (typing is not null)
        {
            typing.CacheParticipants(
                conversation.Id,
                participantUserIds.Distinct().Select(uid =>
                {
                    var m = memberLookup.GetValueOrDefault(uid);
                    return (uid, MemberLabel.Shown(m?.DisplayName, m?.Email));
                }));
        }

        var otherMaxReadSeq = GetOtherMaxReadSequence(conversation, groupMembers, userId);

        var views = selectedRows
            .Select(row => ToMessage(row, userId, otherMaxReadSeq, memberLookup, attachmentsById, reactionsByMessage))
            .ToList();

        var readMessageIds = syncWindow
            .Where(row => row.SenderUserId == userId && row.Sequence <= otherMaxReadSeq)
            .Select(row => row.Id)
            .ToList();

        var reactionUpdates = syncWindow
            .Select(row => new DirectReactionSync(row.Id, reactionsByMessage.GetValueOrDefault(row.Id) ?? []))
            .ToList();

        var typingNames = typing?.GetTypingNames(conversationId, userId) ?? [];
        return new DirectThread(views, hasOlder, typingNames, readMessageIds, reactionUpdates);
    }

    public Task<DirectMessageView> SendAsync(
        Guid userId,
        Guid conversationId,
        string? body,
        CancellationToken cancellationToken = default) =>
        SendAsync(userId, conversationId, new SendDirectMessageRequest(body), cancellationToken);

    public async Task<DirectMessageView> SendAsync(
        Guid userId,
        Guid conversationId,
        SendDirectMessageRequest request,
        CancellationToken cancellationToken = default)
    {
        var (conversation, groupMembers) = await RequireParticipantWithMembersAsync(
            userId,
            conversationId,
            tracking: true,
            cancellationToken).ConfigureAwait(false);

        var now = time.GetUtcNow();
        StoredFileEntity? attachedFile = null;
        string? attachmentKind = null;
        DateTimeOffset? messageExpiresAt = null;

        if (request.AttachmentFileId is Guid fileId)
        {
            attachedFile = await db.StoredFiles
                .FirstOrDefaultAsync(
                    f => f.Id == fileId
                         && f.OwnerUserId == userId
                         && f.DeletedAt == null
                         && f.Status == FileStatus.Ready,
                    cancellationToken)
                .ConfigureAwait(false)
                ?? throw new VaultNotFoundException();

            if (attachedFile.ExpiresAt is DateTimeOffset fileExp && fileExp <= now)
            {
                throw new VaultNotFoundException();
            }

            attachmentKind = ResolveAttachmentKind(request.AttachmentType, attachedFile.ContentType);
            if (attachmentKind == "audio")
            {
                var voiceExpiry = now.AddDays(DirectMessageRules.VoiceRetentionDays);
                messageExpiresAt = voiceExpiry;
                if (attachedFile.IsChatOnly && (attachedFile.ExpiresAt is null || attachedFile.ExpiresAt > voiceExpiry))
                {
                    attachedFile.ExpiresAt = voiceExpiry;
                }
            }
        }

        var text = attachedFile is null
            ? DirectMessageRules.Normalize(request.Body)
            : DirectMessageRules.NormalizeOptional(request.Body);

        Guid? replyToId = null;
        string? quotedAuthor = null;
        string? quotedSnippet = null;
        if (request.ReplyToMessageId is Guid targetId)
        {
            var target = await db.DirectMessages.AsNoTracking()
                .FirstOrDefaultAsync(
                    m => m.Id == targetId && m.ConversationId == conversationId,
                    cancellationToken)
                .ConfigureAwait(false);
            if (target is not null && (target.ExpiresAt is null || target.ExpiresAt > now))
            {
                var quoteMember = await db.FamilyMembers.AsNoTracking()
                    .FirstOrDefaultAsync(m => m.UserId == target.SenderUserId, cancellationToken)
                    .ConfigureAwait(false);
                string? targetFileName = null;
                if (target.AttachmentFileId is Guid targetFileId)
                {
                    targetFileName = await db.StoredFiles.AsNoTracking()
                        .Where(f => f.Id == targetFileId)
                        .Select(f => f.OriginalFileName)
                        .FirstOrDefaultAsync(cancellationToken)
                        .ConfigureAwait(false);
                }

                replyToId = target.Id;
                quotedAuthor = MemberLabel.Shown(quoteMember?.DisplayName, quoteMember?.Email);
                quotedSnippet = DirectMessageRules.FormatQuoteSnippet(target.Body, target.AttachmentType, targetFileName);
            }
        }

        var senderMember = await db.FamilyMembers.AsNoTracking()
            .FirstOrDefaultAsync(m => m.UserId == userId, cancellationToken)
            .ConfigureAwait(false);
        var senderShown = MemberLabel.Shown(senderMember?.DisplayName, senderMember?.Email);
        var senderColor = ShownColor(senderMember?.AccentColor);

        conversation.NextSequence++;
        var message = new DirectMessageEntity
        {
            Id = Guid.NewGuid(),
            ConversationId = conversation.Id,
            SenderUserId = userId,
            Body = text,
            SentAt = now,
            ExpiresAt = messageExpiresAt,
            Sequence = conversation.NextSequence,
            AttachmentFileId = attachedFile?.Id,
            AttachmentType = attachmentKind,
            ReplyToMessageId = replyToId,
            QuotedAuthor = quotedAuthor,
            QuotedSnippet = quotedSnippet
        };

        conversation.LastPreview = DirectMessageRules.FormatPreview(
            text,
            attachmentKind,
            attachedFile?.OriginalFileName,
            conversation.IsGroup ? senderShown : null);
        conversation.LastSenderUserId = userId;
        conversation.LastSentAt = now;

        if (conversation.IsGroup)
        {
            foreach (var member in groupMembers)
            {
                if (member.UserId == userId)
                {
                    member.LastReadSequence = conversation.NextSequence;
                }
                else
                {
                    member.UnreadCount++;
                }
            }
        }
        else if (conversation.LowUserId == userId)
        {
            conversation.LowReadSequence = conversation.NextSequence;
            conversation.HighUnread++;
        }
        else
        {
            conversation.HighReadSequence = conversation.NextSequence;
            conversation.LowUnread++;
        }

        db.DirectMessages.Add(message);
        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        typing?.ClearTyping(conversation.Id, userId);

        var attachmentView = attachedFile is null || attachmentKind is null
            ? null
            : new DirectMessageAttachmentView(
                attachedFile.Id,
                attachmentKind,
                attachedFile.OriginalFileName,
                attachedFile.ContentType,
                attachedFile.SizeBytes,
                attachedFile.ExpiresAt);

        var quoteView = quotedAuthor is not null && quotedSnippet is not null
            ? new DirectMessageQuoteView(replyToId, quotedAuthor, quotedSnippet)
            : null;

        return new DirectMessageView(
            message.Id,
            message.Body,
            message.SentAt,
            Mine: true,
            SenderUserId: userId,
            SenderName: senderShown,
            SenderColor: senderColor,
            ExpiresAt: message.ExpiresAt,
            ReadByOther: false,
            Attachment: attachmentView,
            Quote: quoteView,
            Reactions: []);
    }

    public async Task MarkReadAsync(
        Guid userId,
        Guid conversationId,
        Guid throughId,
        CancellationToken cancellationToken = default)
    {
        var (conversation, groupMembers) = await RequireParticipantWithMembersAsync(
            userId,
            conversationId,
            tracking: true,
            cancellationToken).ConfigureAwait(false);

        var through = await db.DirectMessages.AsNoTracking()
            .FirstOrDefaultAsync(row => row.Id == throughId && row.ConversationId == conversationId, cancellationToken)
            .ConfigureAwait(false);
        if (through is null)
        {
            return;
        }

        var now = time.GetUtcNow();
        var afterMessages = await db.DirectMessages.AsNoTracking()
            .Where(row => row.ConversationId == conversationId
                          && row.SenderUserId != userId
                          && row.Sequence > through.Sequence)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);
        var remaining = afterMessages.Count(row => row.ExpiresAt is null || row.ExpiresAt > now);

        if (conversation.IsGroup)
        {
            var myMember = groupMembers.First(m => m.UserId == userId);
            if (through.Sequence > myMember.LastReadSequence)
            {
                myMember.LastReadSequence = through.Sequence;
            }

            myMember.UnreadCount = remaining;
        }
        else if (conversation.LowUserId == userId)
        {
            if (through.Sequence > conversation.LowReadSequence)
            {
                conversation.LowReadSequence = through.Sequence;
            }

            conversation.LowUnread = remaining;
        }
        else
        {
            if (through.Sequence > conversation.HighReadSequence)
            {
                conversation.HighReadSequence = through.Sequence;
            }

            conversation.HighUnread = remaining;
        }

        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
    }

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

    private async Task<(DirectConversationEntity Conversation, List<DirectConversationMemberEntity> GroupMembers)> RequireParticipantWithMembersAsync(
        Guid userId,
        Guid conversationId,
        bool tracking,
        CancellationToken cancellationToken)
    {
        var convQuery = tracking ? db.DirectConversations : db.DirectConversations.AsNoTracking();
        var row = await convQuery
            .FirstOrDefaultAsync(item => item.Id == conversationId, cancellationToken)
            .ConfigureAwait(false)
            ?? throw new VaultNotFoundException();

        if (!row.IsGroup)
        {
            if (row.LowUserId != userId && row.HighUserId != userId)
            {
                throw new VaultNotFoundException();
            }

            return (row, []);
        }

        var memberQuery = tracking ? db.DirectConversationMembers : db.DirectConversationMembers.AsNoTracking();
        var members = await memberQuery
            .Where(m => m.ConversationId == conversationId)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);
        if (members.All(m => m.UserId != userId))
        {
            throw new VaultNotFoundException();
        }

        return (row, members);
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

    private async Task<Dictionary<Guid, StoredFileEntity>> LoadAttachmentsAsync(
        IReadOnlyCollection<Guid> fileIds,
        DateTimeOffset now,
        CancellationToken cancellationToken)
    {
        if (fileIds.Count == 0)
        {
            return [];
        }

        var files = await db.StoredFiles.AsNoTracking()
            .Where(f => fileIds.Contains(f.Id) && f.DeletedAt == null && f.Status == FileStatus.Ready)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);
        return files
            .Where(f => f.ExpiresAt is null || f.ExpiresAt > now)
            .ToDictionary(f => f.Id);
    }

    private async Task<Dictionary<Guid, FamilyMemberEntity>> MembersAsync(IEnumerable<Guid> userIds, CancellationToken cancellationToken)
    {
        var ids = userIds.Where(id => id != Guid.Empty).Distinct().ToList();
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

    private static long GetOtherMaxReadSequence(
        DirectConversationEntity conversation,
        IReadOnlyList<DirectConversationMemberEntity> groupMembers,
        Guid userId)
    {
        if (!conversation.IsGroup)
        {
            return conversation.LowUserId == userId
                ? conversation.HighReadSequence
                : conversation.LowReadSequence;
        }

        long max = 0;
        foreach (var member in groupMembers)
        {
            if (member.UserId != userId && member.LastReadSequence > max)
            {
                max = member.LastReadSequence;
            }
        }

        return max;
    }

    private static DirectConversationView ToDirectView(
        DirectConversationEntity row,
        Guid userId,
        FamilyMemberEntity? other)
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
            unread,
            IsGroup: false);
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

    private static DirectMessageView ToMessage(
        DirectMessageEntity row,
        Guid userId,
        long otherMaxReadSeq,
        IReadOnlyDictionary<Guid, FamilyMemberEntity> members,
        IReadOnlyDictionary<Guid, StoredFileEntity> attachments,
        IReadOnlyDictionary<Guid, IReadOnlyList<DirectMessageReactionSummary>> reactions)
    {
        var sender = members.GetValueOrDefault(row.SenderUserId);
        var senderName = MemberLabel.Shown(sender?.DisplayName, sender?.Email);
        var senderColor = ShownColor(sender?.AccentColor);

        DirectMessageAttachmentView? attachmentView = null;
        if (row.AttachmentFileId is Guid fileId && attachments.TryGetValue(fileId, out var file))
        {
            var kind = ResolveAttachmentKind(row.AttachmentType, file.ContentType);
            attachmentView = new DirectMessageAttachmentView(
                file.Id,
                kind,
                file.OriginalFileName,
                file.ContentType,
                file.SizeBytes,
                file.ExpiresAt);
        }

        DirectMessageQuoteView? quoteView = null;
        if (!string.IsNullOrWhiteSpace(row.QuotedAuthor) && !string.IsNullOrWhiteSpace(row.QuotedSnippet))
        {
            quoteView = new DirectMessageQuoteView(row.ReplyToMessageId, row.QuotedAuthor, row.QuotedSnippet);
        }

        var mine = row.SenderUserId == userId;
        var readByOther = mine && row.Sequence <= otherMaxReadSeq;
        return new DirectMessageView(
            row.Id,
            row.Body,
            row.SentAt,
            mine,
            row.SenderUserId,
            senderName,
            senderColor,
            row.ExpiresAt,
            readByOther,
            attachmentView,
            quoteView,
            reactions.GetValueOrDefault(row.Id) ?? []);
    }

    private static string ResolveAttachmentKind(string? requestedType, string contentType)
    {
        if (requestedType is "audio" or "drawing" or "photo" or "file")
        {
            return requestedType;
        }

        if (contentType.StartsWith("audio/", StringComparison.OrdinalIgnoreCase))
        {
            return "audio";
        }

        if (contentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase))
        {
            return "photo";
        }

        return "file";
    }

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
