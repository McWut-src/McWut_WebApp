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

            if (!Uri.TryCreate(cleanUrl, UriKind.Absolute, out var parsed)
                || (parsed.Scheme != Uri.UriSchemeHttp && parsed.Scheme != Uri.UriSchemeHttps))
            {
                throw new PasswordVaultValidationException("URL must start with http:// or https://.");
            }

            cleanUrl = parsed.AbsoluteUri;
        }

        return new PasswordVaultFields(cleanName, cleanUsername, cleanPassword, cleanUrl, cleanNotes);
    }
}
