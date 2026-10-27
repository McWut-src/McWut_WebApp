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
