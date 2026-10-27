using FamilyVault.Files.Contracts;
using FamilyVault.Files.Data;
using FamilyVault.Files.Data.Entities;
using FamilyVault.Files.Security;
using Microsoft.EntityFrameworkCore;

namespace FamilyVault.Files.Services;

public sealed partial class DirectMessageService(
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
