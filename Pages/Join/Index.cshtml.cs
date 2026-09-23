using FamilyVault.Files.Contracts;
using McWutWebApp.Hosting;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace McWutWebApp.Pages.Join;

[AllowAnonymous]
public class IndexModel(
    InviteService invites,
    UserManager<IdentityUser> users,
    SignInManager<IdentityUser> signIn,
    IFamilyRoster roster) : PageModel
{
    [BindProperty(SupportsGet = true)]
    public string Token { get; set; } = "";

    [BindProperty]
    public string Email { get; set; } = "";

    [BindProperty]
    public string Password { get; set; } = "";

    [BindProperty]
    public string ConfirmPassword { get; set; } = "";

    public bool EmailLocked { get; private set; }
    public string? Error { get; private set; }

    public async Task<IActionResult> OnGetAsync(CancellationToken cancellationToken)
    {
        var invite = await invites.FindUsableAsync(Token, cancellationToken);
        if (invite is null)
        {
            return NotFound();
        }

        if (!string.IsNullOrEmpty(invite.Email))
        {
            Email = invite.Email;
            EmailLocked = true;
        }

        return Page();
    }

    public async Task<IActionResult> OnPostAsync(CancellationToken cancellationToken)
    {
        var invite = await invites.FindUsableAsync(Token, cancellationToken);
        if (invite is null)
        {
            return NotFound();
        }

        if (!string.IsNullOrEmpty(invite.Email))
        {
            EmailLocked = true;
            Email = invite.Email;
        }

        if (string.IsNullOrWhiteSpace(Email) || string.IsNullOrEmpty(Password))
        {
            Error = "Email and password are required.";
            return Page();
        }

        if (Password != ConfirmPassword)
        {
            Error = "Passwords do not match.";
            return Page();
        }

        if (invite.Email is not null && !string.Equals(invite.Email, Email.Trim(), StringComparison.OrdinalIgnoreCase))
        {
            Error = "This invite is for a different email address.";
            return Page();
        }

        var user = new IdentityUser
        {
            Id = Guid.NewGuid().ToString(),
            UserName = Email.Trim(),
            Email = Email.Trim(),
            EmailConfirmed = true
        };
        var created = await users.CreateAsync(user, Password);
        if (!created.Succeeded)
        {
            Error = string.Join(" ", created.Errors.Select(e => e.Description));
            return Page();
        }

        if (!Guid.TryParse(user.Id, out var userId))
        {
            Error = "Could not create the account.";
            return Page();
        }

        await roster.UpsertAsync(new FamilyMember(userId, user.Email, user.Email), cancellationToken);
        await invites.MarkUsedAsync(invite, userId, cancellationToken);
        await signIn.SignInAsync(user, isPersistent: true);
        return RedirectToPage("/Vault/Index");
    }
}
