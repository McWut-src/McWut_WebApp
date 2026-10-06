namespace FamilyVault.Files.Security;

/// <summary>
/// Which uploads can be read as text. HTML and SVG are never included, so a file cannot run script.
/// </summary>
public static class ReadableFiles
{
    public const long MaxPreviewBytes = 200_000;

    public static string InferContentType(string? fileName, string? declaredType)
    {
        var type = Media(declaredType);
        if (string.IsNullOrEmpty(type))
        {
            type = "application/octet-stream";
        }

        var extension = Extension(fileName);
        if (extension is ".md" or ".markdown" && (IsGeneric(type) || type == "text/plain"))
        {
            return "text/markdown";
        }

        if (!IsGeneric(type))
        {
            return type;
        }

        return extension switch
        {
            ".txt" or ".text" or ".log" => "text/plain",
            ".csv" => "text/csv",
            ".json" => "application/json",
            _ => type
        };
    }

    public static bool IsMarkdown(string? contentType, string? fileName)
    {
        var type = Media(contentType);
        if (type is "text/markdown" or "text/x-markdown")
        {
            return true;
        }

        var extension = Extension(fileName);
        return extension is ".md" or ".markdown" && (IsGeneric(type) || type == "text/plain");
    }

    public static bool IsReadable(string? contentType, string? fileName)
    {
        if (IsMarkdown(contentType, fileName))
        {
            return true;
        }

        var type = Media(contentType);
        if (type is "text/plain" or "text/csv" or "application/json" or "text/json")
        {
            return true;
        }

        if (!IsGeneric(type))
        {
            return false;
        }

        var extension = Extension(fileName);
        return extension is ".txt" or ".text" or ".log" or ".csv" or ".json";
    }

    public static bool IsInlineText(string? contentType)
    {
        var type = Media(contentType);
        return type is "text/plain" or "text/markdown" or "text/x-markdown" or "text/csv" or "application/json" or "text/json";
    }

    private static bool IsGeneric(string type) =>
        type is "" or "application/octet-stream" or "binary/octet-stream";

    private static string Media(string? contentType)
    {
        if (string.IsNullOrWhiteSpace(contentType))
        {
            return "";
        }

        var semi = contentType.IndexOf(';');
        var type = semi >= 0 ? contentType[..semi] : contentType;
        return type.Trim().ToLowerInvariant();
    }

    private static string Extension(string? fileName)
    {
        if (string.IsNullOrWhiteSpace(fileName))
        {
            return "";
        }

        var name = fileName.Trim();
        var slash = Math.Max(name.LastIndexOf('/'), name.LastIndexOf('\\'));
        if (slash >= 0)
        {
            name = name[(slash + 1)..];
        }

        var dot = name.LastIndexOf('.');
        if (dot <= 0 || dot == name.Length - 1)
        {
            return "";
        }

        return name[dot..].ToLowerInvariant();
    }
}
