namespace FamilyVault.Files.Security;

public static class StorageKeys
{
    public static string For(Guid ownerUserId, Guid fileId) => $"{ownerUserId:N}/{fileId:N}";
}
