using System.Security.Claims;
using McWutWebApp.Hosting;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;

namespace McWutWebApp.Pages.Admin;

[Authorize(Roles = IdentitySeed.AdminRole)]
public class PeopleModel(UserManager<IdentityUser> users, RoleManager<IdentityRole> roleManager) : PageModel
{
    public IReadOnlyList<PersonRow> People { get; private set; } = [];
    public string? Notice { get; private set; }
    public string? Error { get; private set; }

    public async Task OnGetAsync() => await LoadAsync();

    public async Task<IActionResult> OnPostDisableAsync(string id, CancellationToken cancellationToken)
    {
        var error = await ChangeAsync(id, disable: true);
        if (error is null)
        {
            Notice = "Account turned off. They are signed out the next time the site sees them. Their files stay.";
        }
        else
        {
            Error = error;
        }

        await LoadAsync();
        return Page();
    }

    public async Task<IActionResult> OnPostEnableAsync(string id, CancellationToken cancellationToken)
    {
        var error = await ChangeAsync(id, disable: false);
        if (error is null)
        {
            Notice = "Account turned back on. They can sign in again.";
        }
        else
        {
            Error = error;
        }

        await LoadAsync();
        return Page();
    }

    public async Task<IActionResult> OnPostSetKidAsync(string id, bool isKid, CancellationToken cancellationToken)
    {
        var error = await ChangeKidAsync(id, isKid);
        if (error is null)
        {
            Notice = isKid
                ? "Account marked as a kid. AI features are disabled for them."
                : "Account marked as adult. AI features are enabled for them.";
        }
        else
        {
            Error = error;
        }

        await LoadAsync();
        return Page();
    }

    public async Task<IActionResult> OnPostToggleKidAsync(string id, CancellationToken cancellationToken)
    {
        var account = await users.FindByIdAsync(id);
        var currentlyKid = account is not null && await users.IsInRoleAsync(account, IdentitySeed.KidRole);
        return await OnPostSetKidAsync(id, !currentlyKid, cancellationToken);
    }

    private async Task LoadAsync()
    {
        var selfId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var rows = new List<PersonRow>();
        var accounts = await users.Users.OrderBy(u => u.Email).ToListAsync();
        foreach (var account in accounts)
        {
            var roles = await users.GetRolesAsync(account);
            var disabled = await users.IsLockedOutAsync(account);
            var isKid = roles.Contains(IdentitySeed.KidRole, StringComparer.OrdinalIgnoreCase);
            var isAdmin = roles.Contains(IdentitySeed.AdminRole, StringComparer.OrdinalIgnoreCase);
            var displayRoles = roles
                .Where(r => !string.Equals(r, IdentitySeed.KidRole, StringComparison.OrdinalIgnoreCase))
                .ToList();

            rows.Add(new PersonRow(
                account.Id,
                account.Email ?? account.UserName ?? "(no email)",
                displayRoles.Count == 0 ? "Member" : string.Join(", ", displayRoles),
                disabled,
                isKid,
                isAdmin,
                string.Equals(account.Id, selfId, StringComparison.Ordinal)));
        }

        People = rows;
    }

    private async Task<string?> ChangeKidAsync(string? id, bool isKid)
    {
        if (string.IsNullOrWhiteSpace(id))
        {
            return "Missing account.";
        }

        var account = await users.FindByIdAsync(id);
        if (account is null)
        {
            return "That account was not found.";
        }

        var selfId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.Equals(account.Id, selfId, StringComparison.Ordinal))
        {
            return "You cannot change kid status on your own account.";
        }

        if (isKid && await users.IsInRoleAsync(account, IdentitySeed.AdminRole))
        {
            return "An admin cannot be marked as a kid.";
        }

        if (!await roleManager.RoleExistsAsync(IdentitySeed.KidRole))
        {
            await roleManager.CreateAsync(new IdentityRole(IdentitySeed.KidRole));
        }

        var currentlyKid = await users.IsInRoleAsync(account, IdentitySeed.KidRole);
        if (isKid != currentlyKid)
        {
            var result = isKid
                ? await users.AddToRoleAsync(account, IdentitySeed.KidRole)
                : await users.RemoveFromRoleAsync(account, IdentitySeed.KidRole);

            if (!result.Succeeded)
            {
                return isKid
                    ? "Could not mark this account as a kid."
                    : "Could not remove kid status from this account.";
            }

            await users.UpdateSecurityStampAsync(account);
        }

        return null;
    }

    private async Task<string?> ChangeAsync(string? id, bool disable)
    {
        if (string.IsNullOrWhiteSpace(id))
        {
            return "Missing account.";
        }

        var account = await users.FindByIdAsync(id);
        if (account is null)
        {
            return "That account was not found.";
        }

        var selfId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.Equals(account.Id, selfId, StringComparison.Ordinal))
        {
            return "You cannot turn off your own account.";
        }

        if (disable && await users.IsInRoleAsync(account, IdentitySeed.AdminRole))
        {
            var enabledAdmins = 0;
            foreach (var admin in await users.GetUsersInRoleAsync(IdentitySeed.AdminRole))
            {
                if (!await users.IsLockedOutAsync(admin))
                {
                    enabledAdmins++;
                }
            }

            if (enabledAdmins <= 1)
            {
                return "Leave at least one admin who can sign in.";
            }
        }

        if (disable)
        {
            var enabled = await users.SetLockoutEnabledAsync(account, true);
            if (!enabled.Succeeded)
            {
                return "Could not turn this account off.";
            }

            var locked = await users.SetLockoutEndDateAsync(account, DateTimeOffset.UtcNow.AddYears(100));
            return locked.Succeeded ? null : "Could not turn this account off.";
        }

        var cleared = await users.SetLockoutEndDateAsync(account, null);
        return cleared.Succeeded ? null : "Could not turn this account back on.";
    }

    public sealed record PersonRow(string Id, string Email, string Roles, bool Disabled, bool IsKid, bool IsAdmin, bool IsSelf);
}
