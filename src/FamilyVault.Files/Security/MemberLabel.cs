namespace FamilyVault.Files.Security;

public static class MemberLabel
{
    public const string FallbackName = "Member";
    public const string DarkInk = "#0b1f3a";
    public const string PaleInk = "#ffffff";

    public static string Shown(string? displayName, string? email)
    {
        var name = (displayName ?? "").Trim();
        if (name.Length > 0 && !name.Contains('@'))
        {
            return name;
        }

        var local = LocalPart(email);
        if (local.Length == 0)
        {
            local = LocalPart(name);
        }

        return local.Length > 0 ? local : FallbackName;
    }

    public static string VaultFileName(string? displayName, string? email)
    {
        var stem = Shown(displayName, email);
        var cleaned = new string(stem.Where(c => c is not ('\\' or '/' or ':' or '*' or '?' or '"' or '<' or '>' or '|') && !char.IsControl(c)).ToArray());
        cleaned = cleaned.Trim().TrimEnd('.');
        if (cleaned.Length == 0)
        {
            cleaned = "vault";
        }

        if (cleaned.Length > 60)
        {
            cleaned = cleaned[..60].TrimEnd().TrimEnd('.');
        }

        return cleaned + ".json";
    }

    public static bool Pale(string? hex)
    {
        if (string.IsNullOrWhiteSpace(hex) || hex.Length != 7 || hex[0] != '#')
        {
            return false;
        }

        if (!int.TryParse(hex.AsSpan(1, 2), System.Globalization.NumberStyles.HexNumber, null, out var r)
            || !int.TryParse(hex.AsSpan(3, 2), System.Globalization.NumberStyles.HexNumber, null, out var g)
            || !int.TryParse(hex.AsSpan(5, 2), System.Globalization.NumberStyles.HexNumber, null, out var b))
        {
            return false;
        }

        return (r * 299 + g * 587 + b * 114) / 1000 > 160;
    }

    public static string Ink(string? hex) => Pale(hex) ? DarkInk : PaleInk;

    private static string LocalPart(string? value)
    {
        var text = (value ?? "").Trim();
        var at = text.IndexOf('@');
        if (at <= 0)
        {
            return "";
        }

        return text[..at].Trim();
    }
}
