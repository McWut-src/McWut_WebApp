using Microsoft.AspNetCore.Identity;

namespace McWutWebApp.Hosting;

/// <summary>
/// A turned-off account must stop working even if they still have a sign-in cookie.
/// </summary>
public sealed class RejectLockedOutUsersMiddleware(RequestDelegate next)
{
    public async Task InvokeAsync(
        HttpContext context,
        UserManager<IdentityUser> users,
        SignInManager<IdentityUser> signIn)
    {
        if (context.User.Identity?.IsAuthenticated == true && !IsQuietPath(context.Request.Path))
        {
            var user = await users.GetUserAsync(context.User);
            if (user is not null && await users.IsLockedOutAsync(user))
            {
                await signIn.SignOutAsync();
                if (context.Request.Path.StartsWithSegments("/api"))
                {
                    context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                    return;
                }

                context.Response.Redirect("/Identity/Account/Login");
                return;
            }
        }

        await next(context);
    }

    private static bool IsQuietPath(PathString path) =>
        path.StartsWithSegments("/health")
        || path.StartsWithSegments("/css")
        || path.StartsWithSegments("/js")
        || path.StartsWithSegments("/lib")
        || path.StartsWithSegments("/favicon.ico");
}
