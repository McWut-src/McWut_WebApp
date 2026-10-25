using System.Text;

namespace FamilyVault.Files.Security;

public sealed class DirectMessageValidationException(string message) : Exception(message);

public enum AttachmentType
{
    Photo,
    Drawing,
    Audio,
    File,
    Unknown
}

public static class DirectMessageRules
{
    public const int BodyMax = 2000;
    public const int PreviewMax = 80;
    public const int TitleMax = 80;
    public const int QuoteSnippetMax = 160;
    public const int VoiceRetentionDays = 7;
    public const string CustomStickerContentType = "image/x-mcwut-sticker+svg";

    public static readonly IReadOnlyList<string> AllowedReactions =
    [
        "❤️", "💀", "😭", "🔥", "👍", "🗿", "👀", "🫡", "😂", "😮", "😢", "🎉", "🦄", "🧢", "🤡", "🥋", "🛹", "✨", "💯", "🍕", "🎮"
    ];

    public static readonly HashSet<string> AllowedStickers = new(StringComparer.Ordinal)
    {
        // Featured Memes & Emotions
        "meme-rock-side-eye",
        "meme-six-seven",
        "meme-lol",
        "meme-lmao",
        "meme-big-w",
        "meme-take-l",
        "meme-bruh",
        "meme-this-is-fine",
        "meme-head-empty",
        "meme-im-dead",
        "emotion-rage-mode",
        "emotion-ugly-cry",
        "emotion-eye-roll",

        // Memes
        "meme-skull",
        "meme-side-eye",
        "meme-crying-laughing",
        "meme-chad-stone",
        "meme-cap",
        "meme-fire",
        "meme-clown",
        "meme-salute",
        "meme-shades",
        "meme-dizzy",

        // Karate & Skate
        "karate-kick",
        "karate-board-break",
        "karate-headband",
        "karate-trophy",
        "skate-deck",
        "skate-halfpipe",
        "skate-sneaker",
        "skate-cone-ollie",

        // Quebec, Montreal & Val-David
        "valdavid-climb",
        "valdavid-pine",
        "valdavid-chalet",
        "mtl-cone",
        "mtl-bagel",
        "mtl-metro",
        "mtl-poutine",
        "mtl-farine",
        "qc-fleurdelis",
        "qc-sirop",

        // Street, Grunge, Y2K & Vibes
        "patched-heart",
        "flame-heart",
        "barbed-heart",
        "chrome-bolt",
        "skull-cans",
        "cherry-bomb",
        "halo-horn-smiley",
        "shades-smiley",
        "chain-smiley",
        "iridescent-cd",
        "spiked-flail",
        "area-alien",
        "ufo-beam",
        "toxic-slime",
        "toxic-potion",
        "flip-phone",
        "cyber-pocket",
        "boombox",
        "vhs-tape",
        "doom-cassette",
        "glitch-tv",
        "glitch-eye",
        "crying-star",
        "sleepy-moon",
        "storm-cloud",
        "spooky-cutie",
        "mushroom-charm",
        "cyber-butterfly",
        "wired-rose",
        "rhinestone-crown",
        "magic-8ball",
        "fuzzy-dice",
        "safety-pin",
        "rocket-blast",
        "roller-skate",
        "vibe-controller",
        "vibe-headphones",
        "vibe-boba",
        "vibe-polaroid",
        "vibe-star",
        "vibe-battery",
        "vibe-cassette",
        "vibe-spraycan",

        // Legacy fallbacks
        "cat-party",
        "dog-cool",
        "unicorn-magic",
        "dino-roar",
        "panda-wave",
        "fox-laugh",
        "pizza-yum",
        "star-super",
        "heart-sparkle",
        "trophy-win",
        "controller-game",
        "rainbow-sun",
        "penguin-chill",
        "owl-sleepy",
        "high-five"
    };

    public static string Normalize(string? body)
    {
        var value = NormalizeOptional(body);
        if (value.Length == 0)
        {
            throw new DirectMessageValidationException("Write a message.");
        }

        return value;
    }

    public static string NormalizeOptional(string? body)
    {
        var text = (body ?? "").Replace("\r\n", "\n").Replace('\r', '\n');
        var cleaned = new StringBuilder(text.Length);
        foreach (var character in text)
        {
            if (character is '\n' or '\t' || !char.IsControl(character))
            {
                cleaned.Append(character);
            }
        }

        var value = cleaned.ToString().Trim();
        if (value.Length > BodyMax)
        {
            throw new DirectMessageValidationException($"Keep a message to {BodyMax} characters.");
        }

        return value;
    }

    public static string? NormalizeTitle(string? title)
    {
        if (string.IsNullOrWhiteSpace(title))
        {
            return null;
        }

        var cleaned = new StringBuilder(title.Length);
        foreach (var character in title)
        {
            if (!char.IsControl(character))
            {
                cleaned.Append(character);
            }
        }

        var value = CollapseSpaces(cleaned.ToString());
        if (value.Length == 0)
        {
            return null;
        }

        if (value.Length > TitleMax)
        {
            throw new DirectMessageValidationException($"Keep a group name to {TitleMax} characters.");
        }

        return value;
    }

    public static string NormalizeReaction(string? emoji)
    {
        var trimmed = (emoji ?? "").Trim();
        if (trimmed == "❤")
        {
            trimmed = "❤️";
        }

        foreach (var allowed in AllowedReactions)
        {
            if (string.Equals(allowed, trimmed, StringComparison.Ordinal))
            {
                return allowed;
            }
        }

        throw new DirectMessageValidationException("Choose one of the reactions.");
    }

    public static bool TryParseSticker(string? body, out string slug)
    {
        slug = "";
        if (string.IsNullOrWhiteSpace(body))
        {
            return false;
        }

        var trimmed = body.Trim();
        if (!trimmed.StartsWith("[sticker:", StringComparison.Ordinal) || !trimmed.EndsWith(']'))
        {
            return false;
        }

        var candidate = trimmed["[sticker:".Length..^1];
        if (!AllowedStickers.Contains(candidate) && !TryParseCustomStickerId(candidate, out _))
        {
            return false;
        }

        slug = candidate;
        return true;
    }

    public static bool TryParseCustomStickerId(string? slug, out Guid fileId)
    {
        fileId = Guid.Empty;
        if (string.IsNullOrWhiteSpace(slug) || !slug.StartsWith("custom-", StringComparison.Ordinal))
        {
            return false;
        }

        var hex = slug["custom-".Length..];
        return hex.Length == 32 && Guid.TryParseExact(hex, "N", out fileId);
    }

    public static string Preview(string body) => Truncate(CollapseSpaces(body), PreviewMax);

    public static AttachmentType ParseAttachmentType(string? value) =>
        value switch
        {
            "photo" => AttachmentType.Photo,
            "drawing" => AttachmentType.Drawing,
            "audio" => AttachmentType.Audio,
            "file" => AttachmentType.File,
            _ => AttachmentType.Unknown
        };

    private static string FormatAttachmentPreview(AttachmentType type, string? fileName, int maxLength)
    {
        var formatted = type switch
        {
            AttachmentType.Photo => "📷 Photo",
            AttachmentType.Drawing => "🎨 Drawing",
            AttachmentType.Audio => "🎤 Voice note",
            AttachmentType.File => string.IsNullOrWhiteSpace(fileName)
                ? "📎 File"
                : "📎 " + CollapseSpaces(fileName),
            _ => "Message"
        };

        return Truncate(formatted, maxLength);
    }

    public static string FormatPreview(
        string body,
        string? attachmentType,
        string? attachmentFileName = null,
        string? senderPrefix = null)
    {
        string content;
        if (TryParseSticker(body, out _))
        {
            content = "🎨 Sticker";
        }
        else if (!string.IsNullOrWhiteSpace(body))
        {
            content = CollapseSpaces(body);
        }
        else
        {
            var type = ParseAttachmentType(attachmentType);
            content = FormatAttachmentPreview(type, attachmentFileName, PreviewMax);
            if (!string.IsNullOrWhiteSpace(senderPrefix))
            {
                content = $"{CollapseSpaces(senderPrefix)}: {content}";
            }

            return Truncate(content, PreviewMax);
        }

        if (!string.IsNullOrWhiteSpace(senderPrefix))
        {
            content = $"{CollapseSpaces(senderPrefix)}: {content}";
        }

        return Truncate(content, PreviewMax);
    }

    public static string FormatQuoteSnippet(string body, string? attachmentType, string? attachmentFileName = null)
    {
        if (TryParseSticker(body, out _))
        {
            return "🎨 Sticker";
        }

        if (!string.IsNullOrWhiteSpace(body))
        {
            return Truncate(CollapseSpaces(body), QuoteSnippetMax);
        }

        var type = ParseAttachmentType(attachmentType);
        return FormatAttachmentPreview(type, attachmentFileName, QuoteSnippetMax);
    }

    private static string CollapseSpaces(string text)
    {
        var flat = text.Replace('\n', ' ').Replace('\r', ' ').Replace('\t', ' ');
        while (flat.Contains("  ", StringComparison.Ordinal))
        {
            flat = flat.Replace("  ", " ", StringComparison.Ordinal);
        }

        return flat.Trim();
    }

    private static string Truncate(string flat, int max)
    {
        if (flat.Length <= max)
        {
            return flat;
        }

        var cut = flat[..max].TrimEnd();
        if (cut.Length > 0 && char.IsHighSurrogate(cut[^1]))
        {
            cut = cut[..^1];
        }

        return cut + "…";
    }
}
