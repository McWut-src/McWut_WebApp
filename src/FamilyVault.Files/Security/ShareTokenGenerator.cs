using System.Security.Cryptography;

namespace FamilyVault.Files.Security;

public static class ShareTokenGenerator
{
    private const string ShortAlphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    /// <summary>Long token for invites. Existing share links keep working because lookup is exact.</summary>
    public static string Create()
    {
        Span<byte> bytes = stackalloc byte[16];
        RandomNumberGenerator.Fill(bytes);
        return Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');
    }

    /// <summary>Eight letters and digits, for a short public share URL. Unbiased over the 62-character alphabet.</summary>
    public static string CreateShort()
    {
        const int length = 8;
        Span<char> chars = stackalloc char[length];
        Span<byte> buffer = stackalloc byte[1];
        var written = 0;
        while (written < length)
        {
            RandomNumberGenerator.Fill(buffer);
            // 62 * 4 = 248. Drop the remainder so modulo does not favor the early characters.
            if (buffer[0] >= 248)
            {
                continue;
            }

            chars[written++] = ShortAlphabet[buffer[0] % ShortAlphabet.Length];
        }

        return new string(chars);
    }
}
