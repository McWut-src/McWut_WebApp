using Microsoft.AspNetCore.Identity;

namespace FamilyVault.Files.Security;

public static class PasswordHashing
{
    private static readonly object HasherUser = new();

    public static string Hash(IPasswordHasher<object> hasher, string password) =>
        hasher.HashPassword(HasherUser, password);

    public static bool Verify(IPasswordHasher<object> hasher, string hash, string password)
    {
        var result = hasher.VerifyHashedPassword(HasherUser, hash, password);
        return result is PasswordVerificationResult.Success or PasswordVerificationResult.SuccessRehashNeeded;
    }
}
