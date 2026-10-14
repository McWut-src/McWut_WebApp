namespace FamilyVault.Files.Data.Entities;

public sealed class DirectMessageEntity
{
    public Guid Id { get; set; }
    public Guid ConversationId { get; set; }
    public Guid SenderUserId { get; set; }
    public string Body { get; set; } = "";
    public DateTimeOffset SentAt { get; set; }
    public long Sequence { get; set; }
}
