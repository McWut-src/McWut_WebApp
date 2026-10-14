using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Runtime.CompilerServices;
using System.Text;
using System.Text.Json;
using FamilyVault.Files.Security;

namespace McWutWebApp.Hosting;

public sealed class OpenRouterRejectedException(string message) : Exception(message);

public sealed class OpenRouterClient(HttpClient http)
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    public async Task EnsureKeyAsync(string apiKey, CancellationToken cancellationToken)
    {
        await SendAsync(HttpMethod.Get, new Uri(http.BaseAddress!, "key"), apiKey, content: null, cancellationToken);
    }

    public async Task<IReadOnlyList<OpenRouterListedModel>> ListFreeAsync(string apiKey, CancellationToken cancellationToken)
    {
        var current = new Uri(http.BaseAddress!, "models?max_price=0&max_output_price=0&output_modalities=text");
        var models = new List<OpenRouterListedModel>();
        for (var page = 0; page < 5; page++)
        {
            var body = await SendAsync(HttpMethod.Get, current, apiKey, content: null, cancellationToken);
            var parsed = OpenRouterRules.ParseModelPage(body);
            models.AddRange(parsed.Models);
            var next = NextUri(current, parsed.Next);
            if (next is null || next == current)
            {
                break;
            }

            current = next;
        }

        return models;
    }

    public async IAsyncEnumerable<string> StreamAsync(
        string apiKey,
        string model,
        IReadOnlyList<OpenRouterTurn> messages,
        [EnumeratorCancellation] CancellationToken cancellationToken)
    {
        var payload = new
        {
            model,
            stream = true,
            messages = messages.Select(turn => new { role = turn.Role, content = turn.Content })
        };
        using var request = new HttpRequestMessage(HttpMethod.Post, new Uri(http.BaseAddress!, "chat/completions"));
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
        request.Headers.TryAddWithoutValidation("HTTP-Referer", "https://mcwut.com");
        request.Headers.TryAddWithoutValidation("X-OpenRouter-Title", "McWut");
        request.Content = JsonContent.Create(payload, options: Json);

        HttpResponseMessage response;
        try
        {
            response = await http.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, cancellationToken);
        }
        catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            throw new OpenRouterRejectedException("OpenRouter took too long.");
        }
        catch (HttpRequestException)
        {
            throw new OpenRouterRejectedException("OpenRouter could not be reached.");
        }

        using (response)
        {
            if (!response.IsSuccessStatusCode)
            {
                var body = await response.Content.ReadAsStringAsync(cancellationToken);
                throw new OpenRouterRejectedException(Failure(response.StatusCode, body));
            }

            await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
            using var reader = new StreamReader(stream);
            var sawContent = false;
            var reasoning = new StringBuilder();
            while (true)
            {
                string? line;
                try
                {
                    line = await reader.ReadLineAsync(cancellationToken);
                }
                catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
                {
                    throw new OpenRouterRejectedException("OpenRouter took too long.");
                }
                catch (HttpRequestException)
                {
                    throw new OpenRouterRejectedException("OpenRouter could not be reached.");
                }

                if (line is null)
                {
                    break;
                }

                if (line.Length == 0 || line[0] == ':')
                {
                    continue;
                }

                if (!line.StartsWith("data:", StringComparison.Ordinal))
                {
                    continue;
                }

                var data = line[5..].TrimStart();
                if (data.Equals("[DONE]", StringComparison.Ordinal))
                {
                    break;
                }

                var piece = OpenRouterRules.ReadStreamPiece(data);
                if (!string.IsNullOrWhiteSpace(piece.Error))
                {
                    throw new OpenRouterRejectedException(piece.Error);
                }

                if (!string.IsNullOrEmpty(piece.Content))
                {
                    if (!string.IsNullOrWhiteSpace(piece.Content))
                    {
                        sawContent = true;
                    }

                    yield return piece.Content;
                }

                if (!string.IsNullOrEmpty(piece.Reasoning))
                {
                    reasoning.Append(piece.Reasoning);
                }
            }

            if (!sawContent && reasoning.Length > 0)
            {
                yield return reasoning.ToString();
                yield break;
            }

            if (!sawContent)
            {
                throw new OpenRouterRejectedException("The model returned nothing.");
            }
        }
    }

    private async Task<string> SendAsync(
        HttpMethod method,
        Uri address,
        string apiKey,
        HttpContent? content,
        CancellationToken cancellationToken)
    {
        using var request = new HttpRequestMessage(method, address);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
        request.Headers.TryAddWithoutValidation("HTTP-Referer", "https://mcwut.com");
        request.Headers.TryAddWithoutValidation("X-OpenRouter-Title", "McWut");
        request.Content = content;
        try
        {
            using var response = await http.SendAsync(request, cancellationToken);
            var body = await response.Content.ReadAsStringAsync(cancellationToken);
            if (response.IsSuccessStatusCode)
            {
                return body;
            }

            throw new OpenRouterRejectedException(Failure(response.StatusCode, body));
        }
        catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            throw new OpenRouterRejectedException("OpenRouter took too long.");
        }
        catch (HttpRequestException)
        {
            throw new OpenRouterRejectedException("OpenRouter could not be reached.");
        }
    }

    private static string Failure(System.Net.HttpStatusCode status, string body)
    {
        if (status is System.Net.HttpStatusCode.Unauthorized or System.Net.HttpStatusCode.Forbidden)
        {
            return "OpenRouter rejected the key.";
        }

        var message = OpenRouterRules.ReadErrorMessage(body);
        if (!string.IsNullOrWhiteSpace(message))
        {
            return message;
        }

        return status switch
        {
            System.Net.HttpStatusCode.PaymentRequired => "OpenRouter says that request is not free.",
            System.Net.HttpStatusCode.TooManyRequests => "OpenRouter is busy. Try again in a moment.",
            System.Net.HttpStatusCode.NotFound => "OpenRouter could not find that model.",
            _ => "OpenRouter could not answer."
        };
    }

    private static Uri? NextUri(Uri current, string? next)
    {
        if (string.IsNullOrWhiteSpace(next) || !Uri.TryCreate(current, next, out var resolved))
        {
            return null;
        }

        if (!resolved.Scheme.Equals(Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase)
            || !resolved.Host.Equals("openrouter.ai", StringComparison.OrdinalIgnoreCase))
        {
            return null;
        }

        return resolved;
    }
}
