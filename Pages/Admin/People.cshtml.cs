using System.Security.Claims;
using McWutWebApp.Hosting;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;

namespace McWutWebApp.Pages.Admin;

[Authorize(Roles = IdentitySeed.AdminRole)]
public class PeopleModel(UserManager<IdentityUser> users) : PageModel
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

    private async Task LoadAsync()
    {
        var selfId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var rows = new List<PersonRow>();
        var accounts = await users.Users.OrderBy(u => u.Email).ToListAsync();
        foreach (var account in accounts)
        {
            var roles = await users.GetRolesAsync(account);
            var disabled = await users.IsLockedOutAsync(account);
            rows.Add(new PersonRow(
                account.Id,
                account.Email ?? account.UserName ?? "(no email)",
                roles.Count == 0 ? "Member" : string.Join(", ", roles),
                disabled,
                string.Equals(account.Id, selfId, StringComparison.Ordinal)));
        }

        People = rows;
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

    public sealed record PersonRow(string Id, string Email, string Roles, bool Disabled, bool IsSelf);
}
