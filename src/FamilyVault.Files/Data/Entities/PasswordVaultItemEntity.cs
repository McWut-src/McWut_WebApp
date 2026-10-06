namespace FamilyVault.Files.Data.Entities;

public sealed class PasswordVaultItemEntity
{
    public Guid Id { get; set; }
    public Guid OwnerUserId { get; set; }
    public string Name { get; set; } = "";
    public string UsernameCipher { get; set; } = "";
    public string PasswordCipher { get; set; } = "";
    public string UrlCipher { get; set; } = "";
    public string NotesCipher { get; set; } = "";
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
