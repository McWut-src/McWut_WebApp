using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace McWutWebApp.Pages
{
    public class IndexModel(IHostEnvironment environment) : PageModel
    {
        public bool ShowDevCredentials { get; private set; }

        public IActionResult OnGet()
        {
            if (User.Identity?.IsAuthenticated == true)
            {
                return RedirectToPage("/Vault/Index");
            }

            ShowDevCredentials = environment.IsDevelopment();
            return Page();
        }
    }
}
