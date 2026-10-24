namespace FamilyVault.Files.Data.Entities;

public sealed class DirectMessageReactionEntity
{
    public Guid Id { get; set; }
    public Guid MessageId { get; set; }
    public Guid UserId { get; set; }
    public string Emoji { get; set; } = "";
    public DateTimeOffset CreatedAt { get; set; }
}
