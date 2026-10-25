using McWutWebApp.Hosting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace McWutWebApp.Pages.Ai;

public class IndexModel : PageModel
{
    public IActionResult OnGet()
    {
        if (User.IsInRole(IdentitySeed.KidRole))
        {
            return RedirectToPage("/Index");
        }

        Response.Headers.CacheControl = "no-store";
        return Page();
    }
}
