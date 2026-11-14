using FamilyVault.Files.Contracts;

namespace FamilyVault.Files.Security;

public static class ChristmasGiftRules
{
    public const int MaxTitleLength = 200;
    public const int MaxDescriptionLength = 2000;
    public const int MaxUrlLength = 2048;
    public const int MaxClaimNotesLength = 500;
    public const int MaxMostWanted = 3;
    public const int MaxSizeLength = 64;
    public const int MaxFavoriteColorsLength = 200;
    public const int MaxInterestsLength = 500;

    private static readonly HashSet<string> ValidOccasions = new(StringComparer.OrdinalIgnoreCase)
    {
        "anytime", "birthday", "christmas", "holiday"
    };

    private static readonly HashSet<string> ValidCategoryTags = new(StringComparer.OrdinalIgnoreCase)
    {
        "under-25", "small", "big-wish"
    };

    private static readonly HashSet<string> ValidClaimStatuses = new(StringComparer.OrdinalIgnoreCase)
    {
        "claimed", "ordered", "wrapped"
    };

    public static string ValidateTitle(string? title)
    {
        if (string.IsNullOrWhiteSpace(title))
        {
            throw new ChristmasGiftValidationException("A title is required for your gift item.");
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

    public static string? ValidateClaimNotes(string? notes)
    {
        if (string.IsNullOrWhiteSpace(notes))
        {
            return null;
        }

        var trimmed = notes.Trim();
        if (trimmed.Length > MaxClaimNotesLength)
        {
            throw new ChristmasGiftValidationException($"Claim notes must be {MaxClaimNotesLength} characters or fewer.");
        }

        return trimmed;
    }

    public static string NormalizeOccasion(string? occasion)
    {
        if (string.IsNullOrWhiteSpace(occasion))
        {
            return "anytime";
        }

        var trimmed = occasion.Trim().ToLowerInvariant();
        if (!ValidOccasions.Contains(trimmed))
        {
            throw new ChristmasGiftValidationException("Occasion must be anytime, birthday, christmas, or holiday.");
        }

        return trimmed;
    }

    public static string? NormalizeCategoryTag(string? tag)
    {
        if (string.IsNullOrWhiteSpace(tag))
        {
            return null;
        }

        var trimmed = tag.Trim().ToLowerInvariant();
        if (trimmed == "none")
        {
            return null;
        }

        if (!ValidCategoryTags.Contains(trimmed))
        {
            throw new ChristmasGiftValidationException("Category tag must be under-25, small, big-wish, or none.");
        }

        return trimmed;
    }

    public static string NormalizeClaimStatus(string? status)
    {
        if (string.IsNullOrWhiteSpace(status))
        {
            return "claimed";
        }

        var trimmed = status.Trim().ToLowerInvariant();
        if (!ValidClaimStatuses.Contains(trimmed))
        {
            throw new ChristmasGiftValidationException("Claim status must be claimed, ordered, or wrapped.");
        }

        return trimmed;
    }

    public static string? ValidateOptionalField(string? value, int maxLength, string fieldLabel)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        var trimmed = value.Trim();
        if (trimmed.Length > maxLength)
        {
            throw new ChristmasGiftValidationException($"{fieldLabel} must be {maxLength} characters or fewer.");
        }

        return trimmed;
    }
}

public sealed class ChristmasGiftValidationException : VaultException
{
    public ChristmasGiftValidationException(string message) : base(message)
    {
    }
}
