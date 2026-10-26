using FamilyVault.Files.Contracts;
using McWutWebApp.Hosting;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace McWutWebApp.Pages;

public class IndexModel(IFamilyRoster roster, PersonalizationService personalization) : PageModel
{
    public string? HelloName { get; private set; }
    public string? AccentColor { get; private set; }
    public string? BadgeUrl { get; private set; }
    public string? StatusTag { get; private set; }
    public bool IsKid { get; private set; }

    public async Task OnGetAsync()
    {
        IsKid = User.IsInRole(IdentitySeed.KidRole);
        var id = User.GetVaultUserId();
        if (id is null)
        {
            return;
        }

        var member = await roster.GetAsync(id.Value, HttpContext.RequestAborted);
        HelloName = MemberNames.Shown(member?.DisplayName, User.Identity?.Name);
        AccentColor = MemberColors.Normalize(member?.AccentColor);
        var flair = await personalization.GetSettingsAsync(id.Value, HttpContext.RequestAborted);
        BadgeUrl = PersonalizationService.ResolveBadgeUrl(flair.HeaderBadge);
        StatusTag = string.IsNullOrWhiteSpace(flair.StatusTag) ? null : flair.StatusTag;
    }
}
