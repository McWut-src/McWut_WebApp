using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace McWutWebApp.Pages.Account;

public class PasswordModel(UserManager<IdentityUser> users, SignInManager<IdentityUser> signIn) : PageModel
{
    [BindProperty]
    public string CurrentPassword { get; set; } = "";

    [BindProperty]
    public string NewPassword { get; set; } = "";

    [BindProperty]
    public string ConfirmPassword { get; set; } = "";

    public string? Notice { get; private set; }
    public int RequiredLength { get; private set; }

    public IActionResult OnGet() => RedirectToPage("/Profile/Index");

    public async Task<IActionResult> OnPostAsync()
    {
        RequiredLength = users.Options.Password.RequiredLength;
        if (!string.Equals(NewPassword, ConfirmPassword, StringComparison.Ordinal))
        {
            ModelState.AddModelError(nameof(ConfirmPassword), "The two new passwords do not match.");
            return Page();
        }

        var user = await users.GetUserAsync(User);
        if (user is null)
        {
            return Challenge();
        }

        var result = await users.ChangePasswordAsync(user, CurrentPassword, NewPassword);
        if (!result.Succeeded)
        {
            foreach (var error in result.Errors)
            {
                ModelState.AddModelError(string.Empty, error.Description);
            }

            return Page();
        }

        await signIn.RefreshSignInAsync(user);
        Notice = "Password changed. You stay signed in. Use the new password next time.";
        CurrentPassword = "";
        NewPassword = "";
        ConfirmPassword = "";
        return Page();
    }
}
