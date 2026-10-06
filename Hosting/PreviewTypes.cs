namespace McWutWebApp.Hosting;

/// <summary>
/// Types we will show in the browser. SVG and HTML stay downloads so a file cannot run script.
/// </summary>
public static class PreviewTypes
{
    public static bool IsInline(string? contentType) =>
        IsImage(contentType) || FamilyVault.Files.Security.ReadableFiles.IsInlineText(contentType);

    public static bool IsImage(string? contentType)
    {
        var type = Normalize(contentType);
        return type is "image/jpeg" or "image/png" or "image/gif" or "image/webp";
    }

    public static bool IsPlainText(string? contentType) =>
        Normalize(contentType) == "text/plain";

    private static string Normalize(string? contentType)
    {
        if (string.IsNullOrWhiteSpace(contentType))
        {
            return "";
        }

        var semi = contentType.IndexOf(';');
        var type = semi >= 0 ? contentType[..semi] : contentType;
        return type.Trim().ToLowerInvariant();
    }
}
