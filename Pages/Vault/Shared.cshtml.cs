using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace McWutWebApp.Pages.Vault;

public class SharedModel : PageModel
{
    public IActionResult OnGet() => RedirectToPage("/Vault/Index");
}
