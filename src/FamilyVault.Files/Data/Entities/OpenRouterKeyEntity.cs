namespace FamilyVault.Files.Data.Entities;

public sealed class OpenRouterKeyEntity
{
    public Guid UserId { get; set; }
    public string KeyCipher { get; set; } = "";
    public DateTimeOffset UpdatedAt { get; set; }
}
