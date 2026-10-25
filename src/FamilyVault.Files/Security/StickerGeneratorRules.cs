using System.Text;
using System.Text.RegularExpressions;
using System.Xml;
using System.Xml.Linq;

namespace FamilyVault.Files.Security;

public sealed record StickerThemePreset(string Id, string Label, string StyleDirection);

public static partial class StickerGeneratorRules
{
    public const int MaxWords = 5;
    public const int MaxPromptChars = 50;
    public const int MaxSvgBytes = 32768;

    public static readonly IReadOnlyList<StickerThemePreset> Themes =
    [
        new("street-skate", "Street & Skate", "Bold street-art skateboard deck graphic style, thick dark ink outlines (#111827), dynamic tilted angles, vibrant urban pop colors, die-cut white vinyl border."),
        new("y2k-chrome", "Y2K Chrome", "Futuristic Y2K metallic chrome style, liquid silver and iridescent cyan/pink linearGradients, glossy white specular highlights, 4-point star sparkles."),
        new("cyber-neon", "Cyber Neon", "Electric cyberpunk neon badge style, dark slate backing (#0f172a) with glowing cyan (#22d3ee), magenta (#f472b6), and lime (#a3e635) vector strokes."),
        new("comic-boom", "Comic Pop / Boom", "Classic action comic book pop-art style, jagged starburst backing, punchy primary colors (yellow, red, royal blue), expressive cartoon motion lines."),
        new("graffiti-tag", "Graffiti Tag", "Urban aerosol spray-paint bubble style, vibrant gradient fills, playful paint drips and splatters, chunky white die-cut sticker outline."),
        new("anime-chibi", "Anime Chibi", "Expressive chibi mascot style, oversized sparkling eyes with glossy catchlights, cute rounded proportions, dynamic emotion lines."),
        new("retro-pixel", "Retro Arcade / 16-Bit", "Crisp 16-bit retro video game arcade aesthetic built from clean geometric vector blocks and high-contrast vibrant palette."),
        new("dojo-karate", "Dojo & Martial Arts", "Dynamic martial arts dojo emblem style, high-energy action speed lines, bold crimson and gold accents, black-belt badge framing."),
        new("valdavid-outdoors", "Val-David Outdoors", "Laurentian mountain adventure patch style, pine forest greens, granite crag grays, warm sunset amber, outdoor climbing/nature badge."),
        new("mtl-quebec", "Montreal & Quebec Vibes", "Iconic Quebec and Montreal local pop-art sticker style, royal blue, construction-cone orange, and warm maple gold, bold graphic shapes."),
        new("spooky-cute", "Spooky Cute", "Playful pastel-goth kawaii style, friendly spooky motifs, lavender (#c084fc), mint (#6ee7b7), and deep midnight ink (#1e1b4b)."),
        new("gamer-badge", "Esports / Gamer Badge", "Pro gaming crest shield style, glowing trophy gold and electric violet gradients, angular esports vector geometry."),
        new("vaporwave", "Vaporwave Sunset", "80s synthwave sunset style, magenta-to-orange horizon stripes, neon teal grid accents, retro futuristic vibe."),
        new("cozy-lofi", "Cozy Lo-Fi", "Warm pastel illustration style, soft rounded shapes, cozy study-beats palette (peach,rose, warm cream, soft indigo), gentle sparkles."),
        new("holo-foil", "Holographic Foil", "Iridescent rainbow prism foil style, multi-stop pastel rainbow gradients, shimmering metallic sticker sheen and star reflections."),
        new("3d-mascot", "Chunky 3D Vinyl Toy", "Designer vinyl toy mascot aesthetic, smooth multi-stop gradients, soft 3D shading, bold silhouette, glossy highlights.")
    ];

    private static readonly HashSet<string> BlockedTerms = new(StringComparer.OrdinalIgnoreCase)
    {
        "nude", "naked", "nsfw", "porn", "sex", "sexy", "xxx", "erotic", "hentai", "boob", "boobs", "breast", "penis", "vagina", "dick", "cock", "pussy", "ass", "butt", "fetish",
        "fuck", "shit", "bitch", "cunt", "slut", "whore", "bastard", "asshole", "motherfucker", "fag", "faggot", "nigger", "nigga", "retard",
        "kill", "murder", "suicide", "die", "blood", "gore", "corpse", "decapitate", "torture", "terrorist", "hitler", "nazi", "swastika",
        "gun", "rifle", "pistol", "cocaine", "heroin", "meth", "weed", "marijuana", "bong", "cigarette", "vape", "alcohol", "vodka", "beer"
    };

    private static readonly HashSet<string> AllowedElements = new(StringComparer.OrdinalIgnoreCase)
    {
        "svg", "g", "path", "circle", "ellipse", "rect", "line", "polyline", "polygon",
        "text", "tspan", "defs", "linearGradient", "radialGradient", "stop",
        "filter", "feDropShadow", "feGaussianBlur", "feOffset", "feBlend", "feMerge", "feMergeNode", "feFlood", "feComposite",
        "clipPath", "mask"
    };

    private static readonly HashSet<string> ShapeElements = new(StringComparer.OrdinalIgnoreCase)
    {
        "path", "circle", "ellipse", "rect", "line", "polyline", "polygon", "text"
    };

    private static readonly HashSet<string> AllowedAttributes = new(StringComparer.OrdinalIgnoreCase)
    {
        "id", "viewBox", "xmlns", "width", "height", "x", "y", "x1", "y1", "x2", "y2",
        "cx", "cy", "r", "rx", "ry", "d", "points", "transform",
        "fill", "fill-opacity", "fill-rule", "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin", "stroke-dasharray", "stroke-dashoffset", "stroke-opacity",
        "opacity", "filter", "clip-path", "mask",
        "offset", "stop-color", "stop-opacity", "gradientUnits", "gradientTransform", "spreadMethod", "fx", "fy",
        "dx", "dy", "stdDeviation", "flood-color", "flood-opacity", "in", "in2", "result", "mode", "operator", "k1", "k2", "k3", "k4",
        "font-family", "font-size", "font-weight", "font-style", "text-anchor", "dominant-baseline", "letter-spacing"
    };

    [GeneratedRegex(@"[^\p{L}\p{N}]+", RegexOptions.CultureInvariant)]
    private static partial Regex WordSplitRegex();

    [GeneratedRegex(@"\s+", RegexOptions.CultureInvariant)]
    private static partial Regex SpaceCollapseRegex();

    public static StickerThemePreset NormalizeTheme(string? themeId)
    {
        var clean = (themeId ?? "").Trim();
        foreach (var theme in Themes)
        {
            if (string.Equals(theme.Id, clean, StringComparison.OrdinalIgnoreCase))
            {
                return theme;
            }
        }

        return Themes[0];
    }

    public static string NormalizePrompt(string? prompt)
    {
        if (string.IsNullOrWhiteSpace(prompt))
        {
            throw new DirectMessageValidationException("Write 1 to 5 words for your sticker.");
        }

        var sb = new StringBuilder(prompt.Length);
        foreach (var ch in prompt)
        {
            if (!char.IsControl(ch) && ch is not ('<' or '>' or '`' or '{' or '}'))
            {
                sb.Append(ch);
            }
        }

        var collapsed = SpaceCollapseRegex().Replace(sb.ToString(), " ").Trim();
        if (collapsed.Length == 0)
        {
            throw new DirectMessageValidationException("Write 1 to 5 words for your sticker.");
        }

        if (collapsed.Length > MaxPromptChars)
        {
            throw new DirectMessageValidationException($"Keep your sticker prompt to {MaxPromptChars} characters.");
        }

        var words = collapsed.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        if (words.Length is 0 or > MaxWords)
        {
            throw new DirectMessageValidationException($"Keep your sticker prompt to {MaxWords} words max.");
        }

        var tokens = WordSplitRegex().Split(collapsed);
        foreach (var token in tokens)
        {
            if (!string.IsNullOrEmpty(token) && BlockedTerms.Contains(token))
            {
                throw new DirectMessageValidationException("Keep your sticker idea friendly and family-safe.");
            }
        }

        return collapsed;
    }

    public static IReadOnlyList<OpenRouterTurn> BuildMessages(StickerThemePreset theme, string cleanPrompt)
    {
        var system = """
            You are an expert vector illustrator designing die-cut vinyl SVG stickers for a family chat app.
            Output ONLY raw valid SVG code starting with <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"> and ending with </svg>.
            Do NOT wrap the output in markdown explanations, and do NOT write any chain-of-thought comments. Begin immediately with <svg> and end with </svg>.
            Design rules:
            1. Canvas: viewBox="0 0 120 120". Keep all artwork within coordinates 8..112 so nothing clips.
            2. Concise SVG: Keep the SVG clean and efficient (under 40-60 elements) so it completes without truncation.
            3. Die-cut sticker style: Include a <defs> block with a drop shadow (<filter id="ds"><feDropShadow dx="0" dy="4" stdDeviation="3" flood-color="#0f172a" flood-opacity="0.32"/></filter>) and vibrant <linearGradient> or <radialGradient> definitions.
            3. Wrap the main artwork in <g filter="url(#ds)"> with a bold white die-cut backing outline (stroke="#ffffff" stroke-width="6") and crisp dark outlines (stroke="#111827" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round").
            4. Layer from back to front: sticker backing shape -> main subject silhouette -> expressive details (eyes, mouth, props, highlights, sparkles) -> optional bold punchy caption badge if relevant.
            5. Child-safe guardrail: The illustration must be 100% wholesome, playful, and kid-safe. If the subject is inappropriate, violent, or unsafe, draw a cute confused robot with a question mark instead.
            6. Never use <script>, <image>, <foreignObject>, <style>, or external URLs. Use only standard SVG geometric paths and shapes.
            """;

        var user = $"Theme style: {theme.Label} ({theme.StyleDirection})\nSticker subject (5 words max): {cleanPrompt}\nDraw a rich, expressive, instantly recognizable die-cut SVG sticker for this subject now.";

        return
        [
            new OpenRouterTurn("system", system),
            new OpenRouterTurn("user", user)
        ];
    }

    public static string SanitizeSvg(string? rawOutput)
    {
        if (string.IsNullOrWhiteSpace(rawOutput))
        {
            throw new DirectMessageValidationException("The AI did not return a sticker. Try again.");
        }

        var start = rawOutput.IndexOf("<svg", StringComparison.OrdinalIgnoreCase);
        var end = rawOutput.LastIndexOf("</svg>", StringComparison.OrdinalIgnoreCase);
        if (start < 0 || end <= start)
        {
            throw new DirectMessageValidationException("The AI did not return valid SVG artwork. Try again.");
        }

        var xmlSlice = rawOutput[start..(end + "</svg>".Length)];
        if (Encoding.UTF8.GetByteCount(xmlSlice) > MaxSvgBytes)
        {
            throw new DirectMessageValidationException("The generated sticker was too large. Try a simpler idea.");
        }

        XDocument doc;
        try
        {
            var settings = new XmlReaderSettings
            {
                DtdProcessing = DtdProcessing.Prohibit,
                XmlResolver = null
            };
            using var stringReader = new StringReader(xmlSlice);
            using var xmlReader = XmlReader.Create(stringReader, settings);
            doc = XDocument.Load(xmlReader, LoadOptions.None);
        }
        catch (XmlException)
        {
            throw new DirectMessageValidationException("The AI returned malformed SVG shapes. Try again.");
        }

        var root = doc.Root;
        if (root is null || !string.Equals(root.Name.LocalName, "svg", StringComparison.OrdinalIgnoreCase))
        {
            throw new DirectMessageValidationException("The AI did not return an SVG root element.");
        }

        XNamespace svgNs = "http://www.w3.org/2000/svg";
        SanitizeElementRecursive(root, svgNs);

        root.SetAttributeValue("viewBox", "0 0 120 120");

        var hasVisibleShape = root.Descendants()
            .Any(el => ShapeElements.Contains(el.Name.LocalName));
        if (!hasVisibleShape)
        {
            throw new DirectMessageValidationException("The AI returned an empty sticker. Try again.");
        }

        return root.ToString(SaveOptions.DisableFormatting);
    }

    private static void SanitizeElementRecursive(XElement element, XNamespace svgNs)
    {
        element.Name = svgNs + element.Name.LocalName;

        var children = element.Elements().ToList();
        foreach (var child in children)
        {
            if (!AllowedElements.Contains(child.Name.LocalName))
            {
                child.Remove();
                continue;
            }

            SanitizeElementRecursive(child, svgNs);
        }

        var attrs = element.Attributes().ToList();
        foreach (var attr in attrs)
        {
            if (attr.IsNamespaceDeclaration)
            {
                if (attr.Name.LocalName is not "xmlns")
                {
                    attr.Remove();
                }

                continue;
            }

            var name = attr.Name.LocalName;
            var val = (attr.Value ?? "").Trim();
            if (!AllowedAttributes.Contains(name)
                || name.StartsWith("on", StringComparison.OrdinalIgnoreCase)
                || ContainsUnsafeReference(val))
            {
                attr.Remove();
                continue;
            }

            if (attr.Name.Namespace != XNamespace.None)
            {
                attr.Remove();
                element.SetAttributeValue(name, val);
            }
        }
    }

    private static bool ContainsUnsafeReference(string value)
    {
        if (value.Contains("javascript:", StringComparison.OrdinalIgnoreCase)
            || value.Contains("data:", StringComparison.OrdinalIgnoreCase)
            || value.Contains("http://", StringComparison.OrdinalIgnoreCase)
            || value.Contains("https://", StringComparison.OrdinalIgnoreCase)
            || value.Contains("//", StringComparison.OrdinalIgnoreCase)
            || value.Contains("<script", StringComparison.OrdinalIgnoreCase)
            || value.Contains("expression(", StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        var urlIdx = value.IndexOf("url(", StringComparison.OrdinalIgnoreCase);
        if (urlIdx >= 0)
        {
            var after = value[(urlIdx + 4)..].TrimStart(' ', '\'', '"');
            if (!after.StartsWith('#'))
            {
                return true;
            }
        }

        return false;
    }
}
