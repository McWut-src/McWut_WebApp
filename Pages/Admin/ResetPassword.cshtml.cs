using System.Security.Claims;
using McWutWebApp.Hosting;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.EntityFrameworkCore;

namespace McWutWebApp.Pages.Admin;

[Authorize(Roles = IdentitySeed.AdminRole)]
public class ResetPasswordModel(UserManager<IdentityUser> users) : PageModel
{
    [BindProperty]
    public string? UserId { get; set; }

    [BindProperty]
    public string NewPassword { get; set; } = "";

    [BindProperty]
    public string ConfirmPassword { get; set; } = "";

    public string? Notice { get; private set; }
    public string? Error { get; private set; }
    public int RequiredLength { get; private set; }
    public IReadOnlyList<SelectListItem> Accounts { get; private set; } = [];

    public async Task OnGetAsync()
    {
        RequiredLength = users.Options.Password.RequiredLength;
        await LoadAccountsAsync();
    }

    public async Task<IActionResult> OnPostAsync()
    {
        RequiredLength = users.Options.Password.RequiredLength;
        await LoadAccountsAsync();

        if (string.IsNullOrWhiteSpace(UserId))
        {
            Error = "Choose whose password to reset.";
            return Page();
        }

        if (!string.Equals(NewPassword, ConfirmPassword, StringComparison.Ordinal))
        {
            Error = "The two new passwords do not match.";
            return Page();
        }

        var account = await users.FindByIdAsync(UserId);
        if (account is null)
        {
            Error = "That account was not found.";
            return Page();
        }

        var token = await users.GeneratePasswordResetTokenAsync(account);
        var result = await users.ResetPasswordAsync(account, token, NewPassword);
        if (!result.Succeeded)
        {
            Error = string.Join(" ", result.Errors.Select(e => e.Description));
            return Page();
        }

        var email = account.Email ?? account.UserName ?? "that account";
        var selfId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.Equals(account.Id, selfId, StringComparison.Ordinal))
        {
            Notice = $"Password reset for {email}. Sign in again with the new password if the site asks.";
        }
        else
        {
            Notice = $"Password reset for {email}. They sign in with the new password next time.";
        }

        UserId = account.Id;
        NewPassword = "";
        ConfirmPassword = "";
        return Page();
    }

    private async Task LoadAccountsAsync()
    {
        var accounts = await users.Users.OrderBy(u => u.Email).ToListAsync();
        Accounts = accounts
            .Select(a => new SelectListItem(a.Email ?? a.UserName ?? a.Id, a.Id))
            .ToList();
    }
}
