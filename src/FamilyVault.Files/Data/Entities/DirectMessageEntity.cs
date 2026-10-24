namespace FamilyVault.Files.Data.Entities;

public sealed class DirectMessageEntity
{
    public Guid Id { get; set; }
    public Guid ConversationId { get; set; }
    public Guid SenderUserId { get; set; }
    public string Body { get; set; } = "";
    public DateTimeOffset SentAt { get; set; }
    public DateTimeOffset? ExpiresAt { get; set; }
    public long Sequence { get; set; }
    public Guid? AttachmentFileId { get; set; }
    public string? AttachmentType { get; set; }
    public Guid? ReplyToMessageId { get; set; }
    public string? QuotedAuthor { get; set; }
    public string? QuotedSnippet { get; set; }
}
