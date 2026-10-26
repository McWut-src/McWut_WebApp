using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.AspNetCore.RateLimiting;

namespace McWutWebApp.Areas.Identity.Pages.Account;

[AllowAnonymous]
[EnableRateLimiting("login")]
public class LoginModel(SignInManager<IdentityUser> signInManager) : PageModel
{
    [BindProperty]
    public InputModel Input { get; set; } = new();

    public string? ReturnUrl { get; set; }

    public class InputModel
    {
        [Required]
        [EmailAddress]
        public string Email { get; set; } = "";

        [Required]
        [DataType(DataType.Password)]
        public string Password { get; set; } = "";

        public bool RememberMe { get; set; }
    }

    public void OnGet(string? returnUrl = null)
    {
        ReturnUrl = returnUrl ?? Url.Content("~/");
    }

    public async Task<IActionResult> OnPostAsync(string? returnUrl = null)
    {
        returnUrl ??= Url.Content("~/");
        if (!ModelState.IsValid)
        {
            ReturnUrl = returnUrl;
            return Page();
        }

        var result = await signInManager.PasswordSignInAsync(Input.Email, Input.Password, Input.RememberMe, lockoutOnFailure: true);
        if (result.Succeeded)
        {
            return LocalRedirect(returnUrl);
        }

        if (result.IsLockedOut)
        {
            var user = await signInManager.UserManager.FindByEmailAsync(Input.Email);
            if (user?.LockoutEnd is { } lockoutEnd && lockoutEnd > DateTimeOffset.UtcNow.AddDays(30))
            {
                ModelState.AddModelError(string.Empty, "This account is turned off. Ask an admin to turn it back on.");
            }
            else
            {
                ModelState.AddModelError(string.Empty, "Too many failed attempts. This account is temporarily locked for 10 minutes. Please try again shortly.");
            }

            ReturnUrl = returnUrl;
            return Page();
        }

        ModelState.AddModelError(string.Empty, "Invalid email or password.");
        ReturnUrl = returnUrl;
        return Page();
    }
}
