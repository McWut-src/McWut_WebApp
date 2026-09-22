using FamilyVault.Files.Contracts;

namespace FamilyVault.Files.Security;

public static class FileNameSanitizer
{
    public static string Sanitize(string? original)
    {
        if (string.IsNullOrWhiteSpace(original))
        {
            throw new InvalidFileNameException("File name is required.");
        }

        var name = original.Trim();
        if (name.Length > 255)
        {
            throw new InvalidFileNameException("File name must be 255 characters or fewer.");
        }

        if (name.Contains("..", StringComparison.Ordinal)
            || name.Contains('/', StringComparison.Ordinal)
            || name.Contains('\\', StringComparison.Ordinal)
            || name.Any(char.IsControl))
        {
            throw new InvalidFileNameException("File name contains invalid path characters.");
        }

        if (name is "." or "..")
        {
            throw new InvalidFileNameException("File name is invalid.");
        }

        return name;
    }
}
