using FamilyVault.Files.Contracts;
using FamilyVault.Files.Services;
using McWutWebApp.Hosting;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace McWutWebApp.Pages.Gifts;

[Authorize]
public class IndexModel(IFamilyRoster roster) : PageModel
{
    public bool IsKid { get; private set; }
    public Guid CurrentUserId { get; private set; }
    public string CurrentUserName { get; private set; } = "You";
    public string? CurrentUserColor { get; private set; }

    public async Task OnGetAsync()
    {
        IsKid = User.IsInRole(IdentitySeed.KidRole);
        CurrentUserId = User.RequireVaultUserId();
        var member = await roster.GetAsync(CurrentUserId, HttpContext.RequestAborted);
        CurrentUserName = MemberNames.Shown(member?.DisplayName, User.Identity?.Name);
        CurrentUserColor = MemberColors.Normalize(member?.AccentColor);
    }
}
