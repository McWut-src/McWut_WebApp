using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using FamilyVault.Files.Contracts;
using McWutWebApp.Hosting;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace McWutWebApp.Pages.Profile;

public class IndexModel(IFamilyRoster roster, UserManager<IdentityUser> users, SignInManager<IdentityUser> signIn) : PageModel
{
    [BindProperty]
    public string? DisplayName { get; set; }

    [BindProperty]
    public string? AccentColor { get; set; }

    [BindProperty]
    [Required(ErrorMessage = "Enter your current password.")]
    public string CurrentPassword { get; set; } = "";

    [BindProperty]
    [Required(ErrorMessage = "Enter a new password.")]
    public string NewPassword { get; set; } = "";

    [BindProperty]
    [Required(ErrorMessage = "Enter the new password again.")]
    public string ConfirmPassword { get; set; } = "";

    public string? Notice { get; private set; }
    public int RequiredLength { get; private set; }

    public async Task<IActionResult> OnGetAsync()
    {
        RequiredLength = users.Options.Password.RequiredLength;
        await LoadAsync();
        return Page();
    }

    public async Task<IActionResult> OnPostProfileAsync()
    {
        ModelState.Remove(nameof(CurrentPassword));
        ModelState.Remove(nameof(NewPassword));
        ModelState.Remove(nameof(ConfirmPassword));
        RequiredLength = users.Options.Password.RequiredLength;
        var name = (DisplayName ?? "").Trim();
        if (name.Length == 0)
        {
            ModelState.AddModelError(nameof(DisplayName), "Add a name.");
        }
        else if (name.Length > 40)
        {
            ModelState.AddModelError(nameof(DisplayName), "Keep the name to 40 characters.");
        }
        else if (name.Contains('@') || name.Any(ch => char.IsControl(ch)))
        {
            ModelState.AddModelError(nameof(DisplayName), "Use a name, not an email address.");
        }

        var color = MemberColors.Normalize(AccentColor);
        if (color is null)
        {
            ModelState.AddModelError(nameof(AccentColor), "Choose a color.");
        }

        if (!ModelState.IsValid)
        {
            AccentColor = color ?? MemberColors.Fallback;
            return Page();
        }

        var id = User.RequireVaultUserId();
        var email = User.FindFirstValue(ClaimTypes.Email) ?? User.Identity?.Name;
        await roster.UpdateProfileAsync(id, email, name, color, HttpContext.RequestAborted);
        DisplayName = name;
        AccentColor = color;
        Notice = "Saved.";
        return Page();
    }

    public async Task<IActionResult> OnPostPasswordAsync()
    {
        ModelState.Remove(nameof(DisplayName));
        ModelState.Remove(nameof(AccentColor));
        RequiredLength = users.Options.Password.RequiredLength;
        await LoadAsync();
        if (!string.Equals(NewPassword, ConfirmPassword, StringComparison.Ordinal))
        {
            ModelState.AddModelError(nameof(ConfirmPassword), "Those two do not match.");
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

    private async Task LoadAsync()
    {
        var id = User.RequireVaultUserId();
        var member = await roster.GetAsync(id, HttpContext.RequestAborted);
        var email = User.FindFirstValue(ClaimTypes.Email) ?? User.Identity?.Name;
        if (member is null)
        {
            await roster.UpsertAsync(User.ToFamilyMember(), HttpContext.RequestAborted);
            member = await roster.GetAsync(id, HttpContext.RequestAborted);
        }

        var stored = member?.DisplayName;
        DisplayName = string.IsNullOrWhiteSpace(stored) || stored.Contains('@')
            ? ""
            : stored.Trim();
        AccentColor = MemberColors.Normalize(member?.AccentColor) ?? MemberColors.Fallback;
        if (string.IsNullOrWhiteSpace(DisplayName) && !string.IsNullOrWhiteSpace(email))
        {
            var local = email.Split('@')[0];
            if (!string.IsNullOrWhiteSpace(local))
            {
                DisplayName = local;
            }
        }
    }
}
