namespace FamilyVault.Files.Data.Entities;

public sealed class DirectConversationEntity
{
    public Guid Id { get; set; }
    public Guid LowUserId { get; set; }
    public Guid HighUserId { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public string? LastPreview { get; set; }
    public Guid? LastSenderUserId { get; set; }
    public DateTimeOffset? LastSentAt { get; set; }
    public int LowUnread { get; set; }
    public int HighUnread { get; set; }
    public long NextSequence { get; set; }
}
