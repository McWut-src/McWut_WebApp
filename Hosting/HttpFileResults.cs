using FamilyVault.Files.Contracts;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Net.Http.Headers;
using System.Text;

namespace McWutWebApp.Hosting;

public static class HttpFileResults
{
    public static IActionResult File(OpenedContent content)
    {
        var utf8Name = Uri.EscapeDataString(content.FileName);
        var asciiFallback = ToAsciiFallback(content.FileName);
        var disposition = $"attachment; filename=\"{asciiFallback}\"; filename*=UTF-8''{utf8Name}";
        return new HeaderFileResult(content, disposition);
    }

    private static string ToAsciiFallback(string fileName)
    {
        var builder = new StringBuilder(fileName.Length);
        foreach (var c in fileName)
        {
            builder.Append(c < 127 && c > 31 && c != '"' ? c : '_');
        }

        var value = builder.ToString();
        return string.IsNullOrEmpty(value) ? "download" : value;
    }

    private sealed class HeaderFileResult(OpenedContent content, string disposition) : IActionResult
    {
        public async Task ExecuteResultAsync(ActionContext context)
        {
            var response = context.HttpContext.Response;
            response.Headers[HeaderNames.ContentDisposition] = disposition;
            response.ContentType = content.ContentType;
            response.ContentLength = content.ContentLength;
            if (content.IsPartial && content.RangeStart is long start && content.RangeEnd is long end)
            {
                response.StatusCode = StatusCodes.Status206PartialContent;
                response.Headers[HeaderNames.ContentRange] = $"bytes {start}-{end}/{content.TotalLength}";
            }

            await content.Stream.CopyToAsync(response.Body, context.HttpContext.RequestAborted);
            await content.DisposeAsync();
        }
    }
}

public static class RangeHeader
{
    public static ByteRange? Parse(HttpRequest request)
    {
        var header = request.Headers[HeaderNames.Range].ToString();
        if (string.IsNullOrEmpty(header))
        {
            return null;
        }

        if (!header.StartsWith("bytes=", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidRangeException();
        }

        var spec = header["bytes=".Length..];
        if (spec.Contains(','))
        {
            throw new InvalidRangeException();
        }

        var parts = spec.Split('-', 2);
        if (parts.Length != 2 || !long.TryParse(parts[0], out var from))
        {
            throw new InvalidRangeException();
        }

        long? to = string.IsNullOrEmpty(parts[1]) ? null : long.Parse(parts[1]);
        return new ByteRange(from, to);
    }
}
