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

        var name = CleanName(fileName);
        if (name.Equals("dockerfile", StringComparison.OrdinalIgnoreCase) ||
            name.Equals("makefile", StringComparison.OrdinalIgnoreCase))
        {
            return "text/plain";
        }

        return extension switch
        {
            ".txt" or ".text" or ".log" => "text/plain",
            ".csv" => "text/csv",
            ".tsv" => "text/tab-separated-values",
            ".json" => "application/json",
            ".xml" or ".xaml" or ".props" or ".targets" => "application/xml",
            ".yaml" or ".yml" => "text/yaml",
            ".toml" => "text/plain",
            ".ini" or ".env" or ".conf" or ".config" or ".properties" or ".cfg" or ".editorconfig" or ".gitattributes" or ".gitignore" => "text/plain",
            ".sql" => "text/sql",
            ".sh" or ".bash" or ".zsh" => "text/x-shellscript",
            ".ps1" or ".psm1" => "text/x-powershell",
            ".bat" or ".cmd" => "text/plain",
            ".py" or ".pyw" => "text/x-python",
            ".js" or ".mjs" or ".cjs" => "text/javascript",
            ".jsx" => "text/jsx",
            ".ts" => "text/typescript",
            ".tsx" => "text/tsx",
            ".cs" or ".csx" => "text/x-csharp",
            ".csproj" or ".sln" => "text/plain",
            ".c" or ".h" or ".cpp" or ".hpp" or ".cc" or ".cxx" => "text/x-c",
            ".rs" => "text/x-rust",
            ".go" => "text/x-go",
            ".java" or ".kt" or ".kts" or ".scala" => "text/x-java",
            ".rb" => "text/x-ruby",
            ".php" => "text/x-php",
            ".swift" => "text/x-swift",
            ".css" or ".scss" or ".sass" or ".less" => "text/css",
            ".dockerfile" => "text/plain",
            ".mp4" or ".m4v" => "video/mp4",
            ".webm" => "video/webm",
            ".mov" => "video/quicktime",
            ".mp3" => "audio/mpeg",
            ".m4a" => "audio/mp4",
            ".wav" => "audio/wav",
            ".ogg" => "audio/ogg",
            _ => type
        };
    }

    public static bool IsMarkdown(string? contentType, string? fileName)
    {
        var type = Media(contentType);
        if (type is "text/markdown" or "text/x-markdown" or OpenRouterRules.ChatContentType)
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
        if (type is "text/html" or "image/svg+xml")
        {
            return false;
        }

        if (IsInlineText(contentType))
        {
            return true;
        }

        if (!IsGeneric(type))
        {
            return false;
        }

        return IsReadableFileName(fileName);
    }

    public static bool IsReadableFileName(string? fileName)
    {
        var name = CleanName(fileName);
        if (string.IsNullOrEmpty(name))
        {
            return false;
        }

        if (name.Equals("dockerfile", StringComparison.OrdinalIgnoreCase) ||
            name.Equals("makefile", StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        var extension = Extension(fileName);
        return extension switch
        {
            ".txt" or ".text" or ".log" or ".csv" or ".tsv" or ".json" => true,
            ".xml" or ".xaml" or ".props" or ".targets" => true,
            ".yaml" or ".yml" or ".toml" => true,
            ".ini" or ".env" or ".conf" or ".config" or ".properties" or ".cfg" or ".editorconfig" or ".gitattributes" or ".gitignore" => true,
            ".sql" => true,
            ".sh" or ".bash" or ".zsh" or ".ps1" or ".psm1" or ".bat" or ".cmd" => true,
            ".py" or ".pyw" => true,
            ".js" or ".mjs" or ".cjs" or ".jsx" or ".ts" or ".tsx" => true,
            ".cs" or ".csx" or ".csproj" or ".sln" => true,
            ".c" or ".h" or ".cpp" or ".hpp" or ".cc" or ".cxx" => true,
            ".rs" or ".go" or ".java" or ".kt" or ".kts" or ".scala" or ".rb" or ".php" or ".swift" => true,
            ".css" or ".scss" or ".sass" or ".less" => true,
            ".dockerfile" => true,
            _ => false
        };
    }

    public static bool IsInlineText(string? contentType)
    {
        var type = Media(contentType);
        if (string.IsNullOrEmpty(type) || type is "text/html" or "image/svg+xml")
        {
            return false;
        }

        if (type.StartsWith("text/"))
        {
            return true;
        }

        return type is "application/json"
            or "text/json"
            or "application/xml"
            or "text/xml"
            or "application/javascript"
            or "application/x-javascript"
            or "application/x-yaml"
            or "application/toml"
            or "application/sql"
            or OpenRouterRules.ChatContentType;
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

    private static string CleanName(string? fileName)
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

        return name.Trim();
    }

    private static string Extension(string? fileName)
    {
        var name = CleanName(fileName);
        if (string.IsNullOrEmpty(name))
        {
            return "";
        }

        var dot = name.LastIndexOf('.');
        if (dot < 0 || dot == name.Length - 1)
        {
            return "";
        }

        return name[dot..].ToLowerInvariant();
    }
}
