namespace FamilyVault.Files.Azure;

public sealed class AzureBlobOptions
{
    public const string SectionName = "Files:Azure";

    public string ConnectionString { get; set; } = "";
    public string Container { get; set; } = "vault";
    public string KeysContainer { get; set; } = "keys";
}
