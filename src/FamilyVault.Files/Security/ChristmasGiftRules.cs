using FamilyVault.Files.Contracts;

namespace FamilyVault.Files.Security;

public static class ChristmasGiftRules
{
    public const int MaxTitleLength = 200;
    public const int MaxDescriptionLength = 2000;
    public const int MaxUrlLength = 2048;

    public static string ValidateTitle(string? title)
    {
        if (string.IsNullOrWhiteSpace(title))
        {
            return string.Empty;
        }

        var trimmed = title.Trim();
        if (trimmed.Length > MaxTitleLength)
        {
            throw new ChristmasGiftValidationException($"Gift title must be {MaxTitleLength} characters or fewer.");
        }

        return trimmed;
    }

    public static string? ValidateDescription(string? description)
    {
        if (string.IsNullOrWhiteSpace(description))
        {
            return null;
        }

        var trimmed = description.Trim();
        if (trimmed.Length > MaxDescriptionLength)
        {
            throw new ChristmasGiftValidationException($"Notes must be {MaxDescriptionLength} characters or fewer.");
        }

        return trimmed;
    }

    public static string? ValidateUrl(string? url)
    {
        if (string.IsNullOrWhiteSpace(url))
        {
            return null;
        }

        var candidate = url.Trim();
        if (!candidate.Contains("://", StringComparison.Ordinal))
        {
            candidate = "https://" + candidate;
        }

        if (candidate.Length > MaxUrlLength)
        {
            throw new ChristmasGiftValidationException($"Link URL must be {MaxUrlLength} characters or fewer.");
        }

        if (!Uri.TryCreate(candidate, UriKind.Absolute, out var uri))
        {
            throw new ChristmasGiftValidationException("Please enter a valid web link (http or https).");
        }

        if (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps)
        {
            throw new ChristmasGiftValidationException("Only web links starting with http or https are accepted.");
        }

        return uri.ToString();
    }

    public static string? NormalizeMediaType(string? mediaType)
    {
        if (string.IsNullOrWhiteSpace(mediaType))
        {
            return null;
        }

        return mediaType.Trim().ToLowerInvariant() switch
        {
            "photo" or "image" => "photo",
            "drawing" => "drawing",
            "voice" or "audio" => "voice",
            _ => throw new ChristmasGiftValidationException("Attachment type must be photo, drawing, or voice.")
        };
    }

    public static void EnsureHasContent(string title, string? description, string? url, Guid? imageFileId)
    {
        if (string.IsNullOrWhiteSpace(title)
            && string.IsNullOrWhiteSpace(description)
            && string.IsNullOrWhiteSpace(url)
            && !imageFileId.HasValue)
        {
            throw new ChristmasGiftValidationException("Add some text, a link, an image, a voice note, or a drawing.");
        }
    }
}

public sealed class ChristmasGiftValidationException : VaultException
{
    public ChristmasGiftValidationException(string message) : base(message)
    {
    }
}
