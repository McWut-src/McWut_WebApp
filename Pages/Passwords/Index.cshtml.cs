using Microsoft.AspNetCore.Mvc.RazorPages;

namespace McWutWebApp.Pages.Passwords;

public class IndexModel : PageModel
{
    public void OnGet()
    {
        Response.Headers.CacheControl = "no-store";
    }
}
