using System.Globalization;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace FamilyVault.Files.Security;

public sealed class OpenRouterValidationException(string message) : Exception(message);

public sealed record OpenRouterTurn(string Role, string Content);

public readonly record struct OpenRouterTurnInput(string? Role, string? Content);

public sealed record OpenRouterChat(string Model, IReadOnlyList<OpenRouterTurn> Messages);

public sealed record OpenRouterListedModel(
    string Id,
    string Name,
    int? ContextLength = null,
    int? MaxOutput = null,
    string? About = null,
    string? Expires = null,
    string? Inputs = null);

public sealed record OpenRouterChatFile(string Title, string FileName, string Markdown);

public sealed record OpenRouterModelPage(IReadOnlyList<OpenRouterListedModel> Models, string? Next);

public readonly record struct OpenRouterStreamPiece(string? Content, string? Reasoning, string? Error);

public static partial class OpenRouterRules
{
    public const int MessageMax = 8000;
    public const int MaxMessages = 40;
    public const int TotalMax = 64000;
    public const int ModelMax = 200;
    public const int AboutMax = 280;

    /// <summary>
    /// Saved chats use this type so My files can list them apart from notes. It is still read as Markdown.
    /// </summary>
    public const string ChatContentType = "text/x-mcwut-chat";

    /// <summary>
    /// Sent with a chat when Markdown is on. It is not part of the saved transcript.
    /// </summary>
    public const string MarkdownInstruction =
        "Reply in Markdown. Use only what this page can draw: headings, paragraphs, bold, italic, strikethrough, lists, task lists, pipe tables, fenced code, and links written as bare http or https addresses. For a diagram, use a fenced mermaid block. It may be a flowchart, a sequence diagram, a gantt chart, or a mindmap. Any link or image must be an absolute http or https address. Do not write raw HTML.";

    [GeneratedRegex("^sk-or-v1-[0-9a-fA-F]{64}$", RegexOptions.CultureInvariant)]
    private static partial Regex KeyPattern();

    [GeneratedRegex("^[A-Za-z0-9][A-Za-z0-9._:/-]{0,199}$", RegexOptions.CultureInvariant)]
    private static partial Regex ModelPattern();

    [GeneratedRegex("sk-or-v1-[0-9a-fA-F]{64}", RegexOptions.CultureInvariant | RegexOptions.IgnoreCase)]
    private static partial Regex SecretPattern();

    [GeneratedRegex("^[0-9]{4}-[0-9]{2}-[0-9]{2}$", RegexOptions.CultureInvariant)]
    private static partial Regex ExpiresPattern();

    [GeneratedRegex(@"\[([^\]\r\n]{1,80})\]\([^)\s]+\)", RegexOptions.CultureInvariant)]
    private static partial Regex LinkPattern();

    [GeneratedRegex(@"\s+", RegexOptions.CultureInvariant)]
    private static partial Regex SpacePattern();

    public static string NormalizeKey(string? key)
    {
        var clean = (key ?? "").Trim();
        if (!KeyPattern().IsMatch(clean))
        {
            throw new OpenRouterValidationException("That is not an OpenRouter key.");
        }

        return clean;
    }

    public static string Hint(string key) => key.Length >= 4 ? key[^4..] : "";

    public static bool IsModelId(string? model)
    {
        var value = (model ?? "").Trim();
        return value.Length is > 0 and <= ModelMax && ModelPattern().IsMatch(value);
    }

    public static bool IsFree(string? prompt, string? completion, string? request, string? image) =>
        IsZeroPrice(prompt, required: true)
        && IsZeroPrice(completion, required: true)
        && IsZeroPrice(request, required: false)
        && IsZeroPrice(image, required: false);

    public static OpenRouterChat NormalizeChat(string? model, IReadOnlyList<OpenRouterTurnInput>? messages)
    {
        var cleanModel = (model ?? "").Trim();
        if (!IsModelId(cleanModel))
        {
            throw new OpenRouterValidationException("Choose a free model.");
        }

        if (messages is null || messages.Count == 0)
        {
            throw new OpenRouterValidationException("Write a message.");
        }

        if (messages.Count > MaxMessages)
        {
            throw new OpenRouterValidationException("This chat is too long. Start a new chat.");
        }

        var turns = new List<OpenRouterTurn>(messages.Count);
        var total = 0;
        var hasUser = false;
        foreach (var message in messages)
        {
            var role = (message.Role ?? "").Trim().ToLowerInvariant();
            if (role is not ("user" or "assistant" or "system"))
            {
                throw new OpenRouterValidationException("A message has to be from you or the model.");
            }

            var content = (message.Content ?? "").Trim();
            if (content.Length == 0)
            {
                throw new OpenRouterValidationException("Write a message.");
            }

            if (content.Length > MessageMax)
            {
                throw new OpenRouterValidationException($"A message must be {MessageMax} characters or fewer.");
            }

            total += content.Length;
            if (total > TotalMax)
            {
                throw new OpenRouterValidationException("This chat is too long. Start a new chat.");
            }

            if (role == "user")
            {
                hasUser = true;
            }

            turns.Add(new OpenRouterTurn(role, content));
        }

        if (!hasUser)
        {
            throw new OpenRouterValidationException("Write a message.");
        }

        return new OpenRouterChat(cleanModel, turns);
    }

    public static IReadOnlyList<OpenRouterTurn> ForMarkdownReply(IReadOnlyList<OpenRouterTurn> messages)
    {
        if (messages.Count > 0
            && messages[0].Role == "system"
            && messages[0].Content == MarkdownInstruction)
        {
            return messages;
        }

        var sent = new List<OpenRouterTurn>(messages.Count + 1)
        {
            new("system", MarkdownInstruction)
        };
        sent.AddRange(messages);
        return sent;
    }

    public static OpenRouterChatFile ToChatFile(string? modelName, OpenRouterChat chat)
    {
        var title = ChatTitle(chat);
        var label = ModelLabel(modelName, chat.Model);
        var body = new StringBuilder();
        body.Append("# ").Append(title).Append("\n\n");
        body.Append("Model: ").Append(label);
        if (!label.Contains(chat.Model, StringComparison.Ordinal))
        {
            body.Append(" (").Append(chat.Model).Append(')');
        }

        body.Append('\n');
        foreach (var turn in chat.Messages)
        {
            var heading = turn.Role switch
            {
                "assistant" => "Reply",
                "system" => "Note",
                _ => "You"
            };
            body.Append("\n## ").Append(heading).Append("\n\n");
            body.Append(Redact(turn.Content)).Append('\n');
        }

        return new OpenRouterChatFile(title, title + ".md", body.ToString());
    }

    public static OpenRouterModelPage ParseModelPage(string json)
    {
        try
        {
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;
            if (!root.TryGetProperty("data", out var data) || data.ValueKind != JsonValueKind.Array)
            {
                throw new JsonException();
            }

            var models = new List<OpenRouterListedModel>();
            foreach (var item in data.EnumerateArray())
            {
                if (item.ValueKind != JsonValueKind.Object)
                {
                    continue;
                }

                var id = item.TryGetProperty("id", out var idValue) ? idValue.GetString() : null;
                if (!IsModelId(id) || !item.TryGetProperty("pricing", out var pricing) || !IsFreePricing(pricing))
                {
                    continue;
                }

                var name = item.TryGetProperty("name", out var nameValue) ? nameValue.GetString() : null;
                var label = string.IsNullOrWhiteSpace(name) ? id! : name.Trim();
                models.Add(new OpenRouterListedModel(
                    id!,
                    label,
                    ReadCount(item, "context_length"),
                    ReadMaxOutput(item),
                    ReadAbout(item),
                    ReadExpires(item),
                    ReadInputs(item)));
            }

            string? next = null;
            if (root.TryGetProperty("links", out var links)
                && links.ValueKind == JsonValueKind.Object
                && links.TryGetProperty("next", out var nextValue)
                && nextValue.ValueKind == JsonValueKind.String)
            {
                next = nextValue.GetString();
            }

            return new OpenRouterModelPage(models, string.IsNullOrWhiteSpace(next) ? null : next);
        }
        catch (JsonException)
        {
            throw new OpenRouterValidationException("OpenRouter returned an unexpected list.");
        }
    }

    public static string? ReadReply(string json)
    {
        try
        {
            using var doc = JsonDocument.Parse(json);
            if (!doc.RootElement.TryGetProperty("choices", out var choices) || choices.ValueKind != JsonValueKind.Array)
            {
                return null;
            }

            foreach (var choice in choices.EnumerateArray())
            {
                if (!choice.TryGetProperty("message", out var message))
                {
                    continue;
                }

                var text = ReadContent(message);
                if (!string.IsNullOrWhiteSpace(text))
                {
                    return text.Trim();
                }
            }
        }
        catch (JsonException)
        {
            return null;
        }

        return null;
    }

    public static OpenRouterStreamPiece ReadStreamPiece(string json)
    {
        try
        {
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;
            if (root.TryGetProperty("error", out var error))
            {
                string? message = error.ValueKind switch
                {
                    JsonValueKind.String => error.GetString(),
                    JsonValueKind.Object when error.TryGetProperty("message", out var nested) && nested.ValueKind == JsonValueKind.String => nested.GetString(),
                    _ => null
                };
                return new OpenRouterStreamPiece(null, null, Scrub(message) ?? "OpenRouter could not answer.");
            }

            if (!root.TryGetProperty("choices", out var choices) || choices.ValueKind != JsonValueKind.Array)
            {
                return default;
            }

            foreach (var choice in choices.EnumerateArray())
            {
                if (!choice.TryGetProperty("delta", out var delta) || delta.ValueKind != JsonValueKind.Object)
                {
                    continue;
                }

                var content = ReadContent(delta);
                if (string.IsNullOrEmpty(content))
                {
                    content = null;
                }

                string? reasoning = null;
                if (delta.TryGetProperty("reasoning", out var reasoningValue) && reasoningValue.ValueKind == JsonValueKind.String)
                {
                    reasoning = reasoningValue.GetString();
                }
                else if (delta.TryGetProperty("reasoning_content", out var alternate) && alternate.ValueKind == JsonValueKind.String)
                {
                    reasoning = alternate.GetString();
                }

                if (string.IsNullOrEmpty(reasoning))
                {
                    reasoning = null;
                }

                if (content is not null || reasoning is not null)
                {
                    return new OpenRouterStreamPiece(content, reasoning, null);
                }
            }
        }
        catch (JsonException)
        {
            return default;
        }

        return default;
    }

    public static string? ReadErrorMessage(string json)
    {
        try
        {
            using var doc = JsonDocument.Parse(json);
            if (!doc.RootElement.TryGetProperty("error", out var error))
            {
                return null;
            }

            string? message = error.ValueKind switch
            {
                JsonValueKind.String => error.GetString(),
                JsonValueKind.Object when error.TryGetProperty("message", out var nested) && nested.ValueKind == JsonValueKind.String => nested.GetString(),
                _ => null
            };
            return Scrub(message);
        }
        catch (JsonException)
        {
            return null;
        }
    }

    private static string ChatTitle(OpenRouterChat chat)
    {
        var source = chat.Messages.First(message => message.Role == "user").Content;
        var line = source.Split('\n', 2)[0].Split('\r', 2)[0];
        var buffer = new StringBuilder(line.Length);
        foreach (var ch in Redact(line))
        {
            if (char.IsControl(ch))
            {
                buffer.Append(' ');
            }
            else if (ch is '/' or '\\')
            {
                buffer.Append('-');
            }
            else
            {
                buffer.Append(ch);
            }
        }

        var name = SpacePattern().Replace(buffer.ToString(), " ").Trim().Trim('.');
        while (name.Contains("..", StringComparison.Ordinal))
        {
            name = name.Replace("..", ".", StringComparison.Ordinal);
        }

        name = name.Trim().Trim('.');
        if (name.Length > 80)
        {
            name = name[..80].Trim().Trim('.');
        }

        if (name.Length == 0 || name.Equals("[key removed]", StringComparison.OrdinalIgnoreCase))
        {
            return "Chat";
        }

        return name;
    }

    private static string ModelLabel(string? name, string id)
    {
        var clean = SpacePattern().Replace(Redact(name ?? ""), " ").Trim();
        var buffer = new StringBuilder(clean.Length);
        foreach (var ch in clean)
        {
            if (!char.IsControl(ch))
            {
                buffer.Append(ch);
            }
        }

        clean = buffer.ToString().Trim();
        if (clean.Length > 120)
        {
            clean = clean[..120].Trim();
        }

        if (clean.Length == 0 || clean.Contains("sk-or", StringComparison.OrdinalIgnoreCase))
        {
            return id;
        }

        return clean;
    }

    private static string Redact(string text) => SecretPattern().Replace(text, "[key removed]");

    private static int? ReadCount(JsonElement item, string name)
    {
        if (!item.TryGetProperty(name, out var value))
        {
            return null;
        }

        return Positive(value);
    }

    private static int? ReadMaxOutput(JsonElement item)
    {
        if (!item.TryGetProperty("top_provider", out var top) || top.ValueKind != JsonValueKind.Object)
        {
            return null;
        }

        if (!top.TryGetProperty("max_completion_tokens", out var value))
        {
            return null;
        }

        return Positive(value);
    }

    private static int? Positive(JsonElement value)
    {
        if (value.ValueKind != JsonValueKind.Number || !value.TryGetInt32(out var number))
        {
            return null;
        }

        return number is > 0 and <= 10_000_000 ? number : null;
    }

    private static string? ReadExpires(JsonElement item)
    {
        if (!item.TryGetProperty("expiration_date", out var value) || value.ValueKind != JsonValueKind.String)
        {
            return null;
        }

        var text = value.GetString();
        return text is not null && ExpiresPattern().IsMatch(text) ? text : null;
    }

    private static string? ReadInputs(JsonElement item)
    {
        if (!item.TryGetProperty("architecture", out var architecture) || architecture.ValueKind != JsonValueKind.Object)
        {
            return null;
        }

        if (!architecture.TryGetProperty("input_modalities", out var modalities) || modalities.ValueKind != JsonValueKind.Array)
        {
            return null;
        }

        var images = false;
        var audio = false;
        var video = false;
        foreach (var modality in modalities.EnumerateArray())
        {
            if (modality.ValueKind != JsonValueKind.String)
            {
                continue;
            }

            switch ((modality.GetString() ?? "").Trim().ToLowerInvariant())
            {
                case "image":
                    images = true;
                    break;
                case "audio":
                    audio = true;
                    break;
                case "video":
                    video = true;
                    break;
            }
        }

        var parts = new List<string>();
        if (images)
        {
            parts.Add("images");
        }

        if (audio)
        {
            parts.Add("audio");
        }

        if (video)
        {
            parts.Add("video");
        }

        return parts.Count == 0 ? null : string.Join(", ", parts);
    }

    private static string? ReadAbout(JsonElement item)
    {
        if (!item.TryGetProperty("description", out var value) || value.ValueKind != JsonValueKind.String)
        {
            return null;
        }

        var raw = value.GetString() ?? "";
        if (raw.Contains("sk-or", StringComparison.OrdinalIgnoreCase))
        {
            return null;
        }

        var text = SpacePattern().Replace(LinkPattern().Replace(raw, "$1"), " ").Trim();
        if (text.Length == 0)
        {
            return null;
        }

        if (text.Length <= AboutMax)
        {
            return text;
        }

        var cut = text.LastIndexOf(' ', AboutMax);
        var shortened = (cut > 180 ? text[..cut] : text[..AboutMax]).TrimEnd();
        return shortened + "…";
    }

    private static bool IsFreePricing(JsonElement pricing)
    {
        if (pricing.ValueKind != JsonValueKind.Object)
        {
            return false;
        }

        var sawPrompt = false;
        var sawCompletion = false;
        foreach (var property in pricing.EnumerateObject())
        {
            var raw = PriceText(property.Value);
            if (raw is null)
            {
                continue;
            }

            if (!IsZeroPrice(raw, required: true))
            {
                return false;
            }

            if (property.NameEquals("prompt"))
            {
                sawPrompt = true;
            }

            if (property.NameEquals("completion"))
            {
                sawCompletion = true;
            }
        }

        return sawPrompt && sawCompletion;
    }

    private static string? PriceText(JsonElement value) => value.ValueKind switch
    {
        JsonValueKind.String => value.GetString(),
        JsonValueKind.Number => value.GetRawText(),
        _ => null
    };

    private static bool IsZeroPrice(string? raw, bool required)
    {
        if (string.IsNullOrWhiteSpace(raw))
        {
            return !required;
        }

        return decimal.TryParse(raw.Trim(), NumberStyles.Number, CultureInfo.InvariantCulture, out var price)
               && price == 0m;
    }

    private static string? ReadContent(JsonElement message)
    {
        if (!message.TryGetProperty("content", out var content))
        {
            return null;
        }

        if (content.ValueKind == JsonValueKind.String)
        {
            return content.GetString();
        }

        if (content.ValueKind != JsonValueKind.Array)
        {
            return null;
        }

        var parts = new List<string>();
        foreach (var part in content.EnumerateArray())
        {
            if (part.ValueKind == JsonValueKind.String)
            {
                parts.Add(part.GetString() ?? "");
            }
            else if (part.ValueKind == JsonValueKind.Object
                     && part.TryGetProperty("text", out var text)
                     && text.ValueKind == JsonValueKind.String)
            {
                parts.Add(text.GetString() ?? "");
            }
        }

        return string.Join("\n", parts.Where(part => part.Length > 0));
    }

    private static string? Scrub(string? message)
    {
        if (string.IsNullOrWhiteSpace(message) || message.Contains("sk-or", StringComparison.OrdinalIgnoreCase))
        {
            return null;
        }

        var trimmed = message.Trim();
        return trimmed.Length > 240 ? trimmed[..240] : trimmed;
    }
}
