using System.Text;

namespace FamilyVault.Files.Security;

public sealed class DirectMessageValidationException(string message) : Exception(message);

public static class DirectMessageRules
{
    public const int BodyMax = 2000;
    public const int PreviewMax = 80;

    public static string Normalize(string? body)
    {
        var text = (body ?? "").Replace("\r\n", "\n").Replace('\r', '\n');
        var cleaned = new StringBuilder(text.Length);
        foreach (var character in text)
        {
            if (character is '\n' or '\t' || !char.IsControl(character))
            {
                cleaned.Append(character);
            }
        }

        var value = cleaned.ToString().Trim();
        if (value.Length == 0)
        {
            throw new DirectMessageValidationException("Write a message.");
        }

        if (value.Length > BodyMax)
        {
            throw new DirectMessageValidationException($"Keep a message to {BodyMax} characters.");
        }

        return value;
    }

    public static string Preview(string body)
    {
        var flat = body.Replace('\n', ' ').Replace('\t', ' ');
        while (flat.Contains("  ", StringComparison.Ordinal))
        {
            flat = flat.Replace("  ", " ", StringComparison.Ordinal);
        }

        flat = flat.Trim();
        if (flat.Length <= PreviewMax)
        {
            return flat;
        }

        var cut = flat[..PreviewMax].TrimEnd();
        if (cut.Length > 0 && char.IsHighSurrogate(cut[^1]))
        {
            cut = cut[..^1];
        }

        return cut + "…";
    }
}
