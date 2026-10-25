using System.Security.Claims;
using Microsoft.AspNetCore.Identity;

namespace McWutWebApp.Hosting;

/// <summary>
/// A turned-off account must stop working even if they still have a sign-in cookie.
/// Also synchronizes role changes (such as Kid status) into the active session immediately.
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
            if (user is not null)
            {
                if (await users.IsLockedOutAsync(user))
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

                var isKidInDb = await users.IsInRoleAsync(user, IdentitySeed.KidRole);
                var isKidInClaim = context.User.IsInRole(IdentitySeed.KidRole);
                if (isKidInDb != isKidInClaim && context.User.Identity is ClaimsIdentity identity)
                {
                    var roleClaimType = identity.RoleClaimType ?? ClaimTypes.Role;
                    if (isKidInDb)
                    {
                        identity.AddClaim(new Claim(roleClaimType, IdentitySeed.KidRole));
                    }
                    else
                    {
                        var claim = identity.FindFirst(c => c.Type == roleClaimType && string.Equals(c.Value, IdentitySeed.KidRole, StringComparison.OrdinalIgnoreCase));
                        if (claim is not null)
                        {
                            identity.RemoveClaim(claim);
                        }
                    }

                    await signIn.RefreshSignInAsync(user);
                }
            }
        }

        await next(context);
    }

    private static bool IsQuietPath(PathString path) =>
        path.StartsWithSegments("/health")
        || path.StartsWithSegments("/css")
        || path.StartsWithSegments("/js")
        || path.StartsWithSegments("/lib")
        || path.StartsWithSegments("/img")
        || path.StartsWithSegments("/api/messages/typing")
        || path.StartsWithSegments("/favicon.ico");
}
