namespace McWutWebApp.Hosting;

/// <summary>
/// Types we will show in the browser. SVG and HTML stay downloads so a file cannot run script.
/// </summary>
public static class PreviewTypes
{
    public static bool IsInline(string? contentType) =>
        IsImage(contentType) || IsMedia(contentType) || FamilyVault.Files.Security.ReadableFiles.IsInlineText(contentType);

    public static bool IsImage(string? contentType)
    {
        var type = Normalize(contentType);
        return type is "image/jpeg" or "image/png" or "image/gif" or "image/webp";
    }

    public static bool IsVideo(string? contentType)
    {
        var type = Normalize(contentType);
        return type is "video/mp4" or "video/webm" or "video/quicktime" or "video/ogg";
    }

    public static bool IsAudio(string? contentType)
    {
        var type = Normalize(contentType);
        return type is "audio/mpeg" or "audio/mp3" or "audio/mp4" or "audio/x-m4a" or "audio/wav" or "audio/x-wav" or "audio/ogg" or "audio/webm";
    }

    public static bool IsMedia(string? contentType) =>
        IsVideo(contentType) || IsAudio(contentType);

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
