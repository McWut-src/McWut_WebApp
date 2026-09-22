using System.Security.Cryptography;

namespace FamilyVault.Files.Security;

public static class ShareTokenGenerator
{
    public static string Create()
    {
        Span<byte> bytes = stackalloc byte[16];
        RandomNumberGenerator.Fill(bytes);
        return Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');
    }
}
