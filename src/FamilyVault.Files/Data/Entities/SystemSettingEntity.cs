namespace FamilyVault.Files.Data.Entities;

public sealed class SystemSettingEntity
{
    public string Key { get; set; } = "";
    public string ValueCipher { get; set; } = "";
    public DateTimeOffset UpdatedAt { get; set; }
}
