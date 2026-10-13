using FamilyVault.Files.Security;

namespace McWutWebApp.Hosting;

public static class MemberColors
{
    public const string Fallback = "#0b1f3a";

    public static string? Normalize(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        var trimmed = value.Trim();
        if (trimmed.Length != 7 || trimmed[0] != '#')
        {
            return null;
        }

        for (var i = 1; i < trimmed.Length; i++)
        {
            if (!Uri.IsHexDigit(trimmed[i]))
            {
                return null;
            }
        }

        return trimmed.ToLowerInvariant();
    }
}

public static class MemberNames
{
    public static string Shown(string? displayName, string? accountName) =>
        MemberLabel.Shown(displayName, accountName);
}
