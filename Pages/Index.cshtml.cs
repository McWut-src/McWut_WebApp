using FamilyVault.Files.Contracts;
using McWutWebApp.Hosting;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace McWutWebApp.Pages;

public class IndexModel(IFamilyRoster roster) : PageModel
{
    public string? HelloName { get; private set; }
    public string? AccentColor { get; private set; }

    public async Task OnGetAsync()
    {
        var id = User.GetVaultUserId();
        if (id is null)
        {
            return;
        }

        var member = await roster.GetAsync(id.Value, HttpContext.RequestAborted);
        HelloName = MemberNames.Hello(member?.DisplayName);
        AccentColor = MemberColors.Normalize(member?.AccentColor);
    }
}
