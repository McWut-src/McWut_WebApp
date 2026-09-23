using McWutWebApp.Hosting;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace McWutWebApp.Pages.Admin;

[Authorize(Roles = IdentitySeed.AdminRole)]
public class InvitesModel(InviteService invites) : PageModel
{
    [BindProperty]
    public string? Email { get; set; }

    [BindProperty]
    public int DaysValid { get; set; } = 7;

    public string? CreatedUrl { get; private set; }
    public IReadOnlyList<FamilyVault.Files.Data.Entities.InviteEntity> Items { get; private set; } = [];

    public async Task OnGetAsync(CancellationToken cancellationToken)
    {
        Items = await invites.ListAsync(cancellationToken);
    }

    public async Task<IActionResult> OnPostAsync(CancellationToken cancellationToken)
    {
        var userId = User.RequireVaultUserId();
        var invite = await invites.CreateAsync(userId, Email, DaysValid, cancellationToken);
        CreatedUrl = $"{Request.Scheme}://{Request.Host}/join/{invite.Token}";
        Items = await invites.ListAsync(cancellationToken);
        return Page();
    }
}
