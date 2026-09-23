using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace McWutWebApp.Areas.Identity.Pages.Account;

[AllowAnonymous]
public class ForgotPasswordModel : PageModel
{
    public IActionResult OnGet() => RedirectToPage("./Login");

    public IActionResult OnPost() => RedirectToPage("./Login");
}
