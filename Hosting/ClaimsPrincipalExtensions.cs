using System.Security.Claims;

namespace McWutWebApp.Hosting;

public static class ClaimsPrincipalExtensions
{
    public static Guid? GetVaultUserId(this ClaimsPrincipal user)
    {
        var raw = user.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(raw, out var id) ? id : null;
    }

    public static Guid RequireVaultUserId(this ClaimsPrincipal user) =>
        user.GetVaultUserId() ?? throw new UnauthorizedAccessException("The signed-in user has no id.");

    public static FamilyVault.Files.Contracts.FamilyMember ToFamilyMember(this ClaimsPrincipal user)
    {
        var id = user.RequireVaultUserId();
        var email = user.FindFirstValue(ClaimTypes.Email) ?? user.Identity?.Name;
        var name = user.Identity?.Name ?? email ?? "Family member";
        return new FamilyVault.Files.Contracts.FamilyMember(id, email, name);
    }
}
