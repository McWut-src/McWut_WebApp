using FamilyVault.Files.Contracts;

namespace FamilyVault.Files.Security;

public static class StoryFiles
{
    public static string BodyFileName(string? title)
    {
        var name = (title ?? "").Trim();
        if (name.Length == 0)
        {
            name = "Story";
        }

        if (name.Length > 200)
        {
            name = name[..200].Trim();
        }

        if (name.Length == 0)
        {
            name = "Story";
        }

        return name + ".txt";
    }

    public static StoredFile? FindBody(string? title, IEnumerable<StoredFile> files)
    {
        var expected = BodyFileName(title);
        return files
            .Where(file => IsPlain(file.ContentType)
                && string.Equals(file.OriginalFileName, expected, StringComparison.OrdinalIgnoreCase))
            .OrderByDescending(file => file.CreatedAt)
            .ThenByDescending(file => file.Id)
            .FirstOrDefault();
    }

    private static bool IsPlain(string? contentType)
    {
        if (string.IsNullOrWhiteSpace(contentType))
        {
            return false;
        }

        var semi = contentType.IndexOf(';');
        var type = semi >= 0 ? contentType[..semi] : contentType;
        return type.Trim().Equals("text/plain", StringComparison.OrdinalIgnoreCase);
    }
}
