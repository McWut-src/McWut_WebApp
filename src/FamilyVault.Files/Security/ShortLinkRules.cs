using System.Net;
using System.Net.Sockets;

namespace FamilyVault.Files.Security;

public sealed class ShortLinkValidationException(string message) : Exception(message);

public static class ShortLinkRules
{
    public const int UrlMax = 2000;

    public static string Normalize(string? input)
    {
        var raw = (input ?? "").Trim();
        if (raw.Length == 0)
        {
            throw new ShortLinkValidationException("Paste a web address.");
        }

        if (raw.Length > UrlMax)
        {
            throw new ShortLinkValidationException($"That address must be {UrlMax} characters or fewer.");
        }

        if (raw.StartsWith("//", StringComparison.Ordinal))
        {
            raw = "https:" + raw;
        }
        else if (!raw.Contains("://", StringComparison.Ordinal))
        {
            raw = "https://" + raw;
        }

        if (!Uri.TryCreate(raw, UriKind.Absolute, out var parsed)
            || (parsed.Scheme != Uri.UriSchemeHttp && parsed.Scheme != Uri.UriSchemeHttps)
            || string.IsNullOrEmpty(parsed.IdnHost)
            || !string.IsNullOrEmpty(parsed.UserInfo)
            || IsBlockedHost(parsed.IdnHost))
        {
            throw new ShortLinkValidationException("That address is not a web link you can shorten.");
        }

        var absolute = parsed.GetComponents(
            UriComponents.Scheme | UriComponents.Host | UriComponents.Port | UriComponents.Path | UriComponents.Query,
            UriFormat.UriEscaped);
        if (parsed.Fragment.Length > 0)
        {
            absolute += parsed.Fragment;
        }

        if (absolute.Length > UrlMax)
        {
            throw new ShortLinkValidationException($"That address must be {UrlMax} characters or fewer.");
        }

        return absolute;
    }

    private static bool IsBlockedHost(string host)
    {
        if (host.Equals("localhost", StringComparison.OrdinalIgnoreCase)
            || host.EndsWith(".localhost", StringComparison.OrdinalIgnoreCase)
            || host.EndsWith(".local", StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        var candidate = host.Trim('[', ']');
        if (!IPAddress.TryParse(candidate, out var ip))
        {
            return false;
        }

        if (IPAddress.IsLoopback(ip))
        {
            return true;
        }

        if (ip.IsIPv4MappedToIPv6)
        {
            ip = ip.MapToIPv4();
        }

        var bytes = ip.GetAddressBytes();
        if (ip.AddressFamily == AddressFamily.InterNetwork && bytes.Length == 4)
        {
            return bytes[0] is 0 or 10 or 127
                || (bytes[0] == 169 && bytes[1] == 254)
                || (bytes[0] == 192 && bytes[1] == 168)
                || (bytes[0] == 172 && bytes[1] is >= 16 and <= 31);
        }

        if (bytes.Length == 16)
        {
            if ((bytes[0] & 0xfe) == 0xfc)
            {
                return true;
            }

            if (bytes[0] == 0xfe && (bytes[1] & 0xc0) == 0x80)
            {
                return true;
            }
        }

        return false;
    }
}
