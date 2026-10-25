using System.Text.Json;
using System.Text.RegularExpressions;
using FamilyVault.Files.Security;

namespace McWutWebApp.Hosting;

public sealed class GoogleGeminiRejectedException(string message) : Exception(message);

public sealed partial class GoogleGeminiClient(HttpClient http)
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    public static bool IsValidKey(string? key)
    {
        var clean = (key ?? "").Trim();
        if (clean.Length < 16)
        {
            return false;
        }

        // OpenRouter keys have their own prefix
        if (clean.StartsWith("sk-or-v1-", StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        // Google Gemini keys (classic "AIza...", new "AQ.Ab8...", or any alphanumeric key with ._-)
        return clean.All(ch => char.IsLetterOrDigit(ch) || ch is '.' or '-' or '_');
    }

    public static string NormalizeKey(string? key)
    {
        var clean = (key ?? "").Trim();
        if (!IsValidKey(clean))
        {
            throw new DirectMessageValidationException("Enter a valid Google Gemini API key or OpenRouter key.");
        }

        return clean;
    }

    public async Task<string> GenerateStickerSvgAsync(
        string apiKey,
        IReadOnlyList<OpenRouterTurn> turns,
        CancellationToken cancellationToken)
    {
        var systemInstruction = turns.FirstOrDefault(t => t.Role == "system")?.Content ?? "";
        var userPrompt = turns.FirstOrDefault(t => t.Role == "user")?.Content ?? "";

        var payload = new
        {
            system_instruction = new
            {
                parts = new object[]
                {
                    new { text = systemInstruction }
                }
            },
            contents = new object[]
            {
                new
                {
                    role = "user",
                    parts = new object[]
                    {
                        new { text = userPrompt }
                    }
                }
            },
            generationConfig = new
            {
                temperature = 0.4,
                maxOutputTokens = 8192,
                thinkingConfig = new
                {
                    thinkingBudget = 0
                }
            }
        };

        // Model hierarchy: gemini-3.8-flash exclusively (gemini-2.x is deprecated for new users)
        var models = new[] { "gemini-3.8-flash" };
        string? lastError = null;

        foreach (var model in models)
        {
            var uri = $"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={Uri.EscapeDataString(apiKey)}";
            using var request = new HttpRequestMessage(HttpMethod.Post, uri)
            {
                Content = new StringContent(JsonSerializer.Serialize(payload, Json), System.Text.Encoding.UTF8, "application/json")
            };

            HttpResponseMessage response;
            try
            {
                response = await http.SendAsync(request, cancellationToken);
            }
            catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
            {
                lastError = "Google Gemini API took too long to respond. The server may be under high load.";
                continue;
            }
            catch (HttpRequestException)
            {
                lastError = "Google Gemini API could not be reached.";
                continue;
            }

            using (response)
            {
                var body = await response.Content.ReadAsStringAsync(cancellationToken);
                if (response.IsSuccessStatusCode)
                {
                    var text = ExtractCandidateText(body);
                    if (!string.IsNullOrWhiteSpace(text))
                    {
                        return text;
                    }
                }
                else
                {
                    lastError = ParseErrorMessage(body) ?? $"Google Gemini error ({response.StatusCode}).";
                }
            }
        }

        throw new GoogleGeminiRejectedException(lastError ?? "Google Gemini did not return a response.");
    }

    private static string? ExtractCandidateText(string json)
    {
        try
        {
            using var doc = JsonDocument.Parse(json);
            if (!doc.RootElement.TryGetProperty("candidates", out var candidates) || candidates.GetArrayLength() == 0)
            {
                return null;
            }

            var first = candidates[0];
            if (!first.TryGetProperty("content", out var content) || !content.TryGetProperty("parts", out var parts))
            {
                return null;
            }

            var sb = new System.Text.StringBuilder();
            foreach (var part in parts.EnumerateArray())
            {
                if (part.TryGetProperty("text", out var textEl))
                {
                    sb.Append(textEl.GetString());
                }
            }

            return sb.ToString();
        }
        catch
        {
            return null;
        }
    }

    private static string? ParseErrorMessage(string json)
    {
        try
        {
            using var doc = JsonDocument.Parse(json);
            if (doc.RootElement.TryGetProperty("error", out var errorEl) && errorEl.TryGetProperty("message", out var msgEl))
            {
                return msgEl.GetString();
            }
        }
        catch
        {
            /* Fallback below */
        }

        return null;
    }
}
