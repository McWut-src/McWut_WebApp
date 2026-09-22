using FamilyVault.Files.Contracts;

namespace McWutWebApp.Hosting;

public static class AccessContextFactory
{
    public const string SharePasswordCookie = ".FamilyVault.Share";
    public const string SharePasswordHeader = "X-Share-Password";

    public static AccessContext From(HttpRequest request, Guid? userId)
    {
        string? token = null;
        if (request.RouteValues.TryGetValue("token", out var routeToken) && routeToken is string route && !string.IsNullOrWhiteSpace(route))
        {
            token = route;
        }
        else
        {
            token = request.Query["token"].FirstOrDefault();
        }

        string? password = null;
        if (request.Headers.TryGetValue(SharePasswordHeader, out var header) && !string.IsNullOrWhiteSpace(header))
        {
            password = header.ToString();
        }
        else if (request.HasFormContentType && request.Form.TryGetValue("password", out var form) && !string.IsNullOrWhiteSpace(form))
        {
            password = form.ToString();
        }
        else if (request.Cookies.TryGetValue(SharePasswordCookie, out var cookie) && !string.IsNullOrWhiteSpace(cookie))
        {
            password = cookie;
        }

        return new AccessContext(
            userId,
            string.IsNullOrWhiteSpace(token) ? null : token,
            string.IsNullOrWhiteSpace(password) ? null : password);
    }
}
