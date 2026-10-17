namespace FamilyVault.Files.Security;

public sealed class PasswordVaultValidationException(string message) : Exception(message);

public sealed record PasswordVaultFields(string Name, string Username, string Password, string? Url, string Notes);

public static class PasswordVaultRules
{
    public const int NameMax = 200;
    public const int UsernameMax = 256;
    public const int PasswordMax = 1024;
    public const int UrlMax = 2000;
    public const int NotesMax = 8000;

    public static PasswordVaultFields Normalize(
        string? name,
        string? username,
        string? password,
        string? url,
        string? notes)
    {
        var cleanName = (name ?? "").Trim();
        if (cleanName.Length == 0)
        {
            throw new PasswordVaultValidationException("Name is required.");
        }

        if (cleanName.Length > NameMax)
        {
            throw new PasswordVaultValidationException($"Name must be {NameMax} characters or fewer.");
        }

        var cleanUsername = username ?? "";
        if (cleanUsername.Length > UsernameMax)
        {
            throw new PasswordVaultValidationException($"Username must be {UsernameMax} characters or fewer.");
        }

        var cleanPassword = password ?? "";
        if (cleanPassword.Length > PasswordMax)
        {
            throw new PasswordVaultValidationException($"Password must be {PasswordMax} characters or fewer.");
        }

        var cleanNotes = notes ?? "";
        if (cleanNotes.Length > NotesMax)
        {
            throw new PasswordVaultValidationException($"Information must be {NotesMax} characters or fewer.");
        }

        string? cleanUrl = string.IsNullOrWhiteSpace(url) ? null : url.Trim();
        if (cleanUrl is not null)
        {
            if (cleanUrl.Length > UrlMax)
            {
                throw new PasswordVaultValidationException($"URL must be {UrlMax} characters or fewer.");
            }

            if (cleanUrl.StartsWith("//", StringComparison.Ordinal))
            {
                cleanUrl = "https:" + cleanUrl;
            }
            else if (!cleanUrl.Contains("://", StringComparison.Ordinal))
            {
                cleanUrl = "https://" + cleanUrl;
            }

            if (!Uri.TryCreate(cleanUrl, UriKind.Absolute, out var parsed)
                || (parsed.Scheme != Uri.UriSchemeHttp && parsed.Scheme != Uri.UriSchemeHttps)
                || !IsValidHost(parsed))
            {
                throw new PasswordVaultValidationException("Enter a web address like facebook.com or https://facebook.com.");
            }

            cleanUrl = parsed.AbsoluteUri;
        }

        return new PasswordVaultFields(cleanName, cleanUsername, cleanPassword, cleanUrl, cleanNotes);
    }

    private static bool IsValidHost(Uri parsed)
    {
        var host = parsed.IdnHost;
        if (string.IsNullOrWhiteSpace(host) || !string.IsNullOrEmpty(parsed.UserInfo))
        {
            return false;
        }

        if (parsed.HostNameType is UriHostNameType.IPv4 or UriHostNameType.IPv6)
        {
            return true;
        }

        if (host.Equals("localhost", StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        return host.Contains('.', StringComparison.Ordinal)
            && !host.StartsWith('.')
            && !host.EndsWith('.')
            && !host.Contains("..", StringComparison.Ordinal);
    }

    public const int MaxImportItems = 500;

    public static IReadOnlyList<PasswordVaultFields> ParseExportJson(string? json)
    {
        if (string.IsNullOrWhiteSpace(json))
        {
            throw new PasswordVaultValidationException("Choose a vault JSON file.");
        }

        try
        {
            using var doc = System.Text.Json.JsonDocument.Parse(json);
            var root = doc.RootElement;
            System.Text.Json.JsonElement itemsElement;
            if (root.ValueKind == System.Text.Json.JsonValueKind.Array)
            {
                itemsElement = root;
            }
            else if (root.ValueKind == System.Text.Json.JsonValueKind.Object
                     && root.TryGetProperty("items", out var nested)
                     && nested.ValueKind == System.Text.Json.JsonValueKind.Array)
            {
                itemsElement = nested;
            }
            else
            {
                throw new PasswordVaultValidationException("That file is not a password vault copy.");
            }

            var list = new List<PasswordVaultFields>();
            foreach (var item in itemsElement.EnumerateArray())
            {
                if (item.ValueKind != System.Text.Json.JsonValueKind.Object)
                {
                    throw new PasswordVaultValidationException("That file is not a password vault copy.");
                }

                if (list.Count >= MaxImportItems)
                {
                    throw new PasswordVaultValidationException($"Import is limited to {MaxImportItems} logins at a time.");
                }

                var name = ReadString(item, "name");
                var username = ReadString(item, "username");
                var password = ReadString(item, "password");
                var url = ReadString(item, "url");
                var info = ReadString(item, "information") ?? ReadString(item, "notes");
                list.Add(Normalize(name, username, password, url, info));
            }

            if (list.Count == 0)
            {
                throw new PasswordVaultValidationException("That file has no logins to import.");
            }

            return list;
        }
        catch (System.Text.Json.JsonException)
        {
            throw new PasswordVaultValidationException("That file is not valid JSON.");
        }
    }

    private static string? ReadString(System.Text.Json.JsonElement obj, string propertyName)
    {
        foreach (var prop in obj.EnumerateObject())
        {
            if (prop.Name.Equals(propertyName, StringComparison.OrdinalIgnoreCase))
            {
                return prop.Value.ValueKind == System.Text.Json.JsonValueKind.String ? prop.Value.GetString() : null;
            }
        }

        return null;
    }
}
