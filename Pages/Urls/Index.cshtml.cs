using Microsoft.AspNetCore.Mvc.RazorPages;

namespace McWutWebApp.Pages.Urls;

public class IndexModel : PageModel
{
    public void OnGet()
    {
        Response.Headers.CacheControl = "no-store";
    }
}
