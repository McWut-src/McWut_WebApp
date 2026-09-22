using FamilyVault.Files.Contracts;
using FamilyVault.Files.Data;
using Microsoft.AspNetCore.Identity;

namespace McWutWebApp.Hosting;

public static class IdentitySeed
{
    public const string AdminEmail = "vince@mcwut.com";
    public const string AdminPassword = "vince";
    public const string DemoEmail = "family@mcwut.com";
    public const string DemoPassword = "family";
    public const string AdminRole = "Admin";

    public static async Task SeedAsync(IHost host, CancellationToken cancellationToken = default)
    {
        using var scope = host.Services.CreateScope();
        var users = scope.ServiceProvider.GetRequiredService<UserManager<IdentityUser>>();
        var roles = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();
        var roster = scope.ServiceProvider.GetRequiredService<IFamilyRoster>();

        if (!await roles.RoleExistsAsync(AdminRole))
        {
            await roles.CreateAsync(new IdentityRole(AdminRole));
        }

        await EnsureUserAsync(users, roster, AdminEmail, AdminPassword, AdminRole, cancellationToken);
        await EnsureUserAsync(users, roster, DemoEmail, DemoPassword, role: null, cancellationToken);
    }

    private static async Task EnsureUserAsync(
        UserManager<IdentityUser> users,
        IFamilyRoster roster,
        string email,
        string password,
        string? role,
        CancellationToken cancellationToken)
    {
        var user = await users.FindByEmailAsync(email);
        if (user is null)
        {
            user = new IdentityUser
            {
                Id = Guid.NewGuid().ToString(),
                UserName = email,
                Email = email,
                EmailConfirmed = true
            };
            var created = await users.CreateAsync(user, password);
            if (!created.Succeeded)
            {
                throw new InvalidOperationException(
                    $"Could not create {email}: {string.Join(", ", created.Errors.Select(e => e.Description))}");
            }
        }

        if (role is not null && !await users.IsInRoleAsync(user, role))
        {
            await users.AddToRoleAsync(user, role);
        }

        if (!Guid.TryParse(user.Id, out var userId))
        {
            throw new InvalidOperationException($"User id for {email} is not a GUID.");
        }

        await roster.UpsertAsync(new FamilyMember(userId, email, email), cancellationToken);
    }
}
