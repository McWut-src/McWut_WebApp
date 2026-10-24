namespace FamilyVault.Files.Data.Entities;

public sealed class DirectConversationMemberEntity
{
    public Guid Id { get; set; }
    public Guid ConversationId { get; set; }
    public Guid UserId { get; set; }
    public int UnreadCount { get; set; }
    public long LastReadSequence { get; set; }
    public DateTimeOffset JoinedAt { get; set; }
}
