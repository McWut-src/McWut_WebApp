using FamilyVault.Files.Contracts;
using McWutWebApp.Hosting;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace McWutWebApp.Pages.Share;

[AllowAnonymous]
public class IndexModel(
    IShareLinkService links,
    IFileAccessService access,
    IFileLibrary library,
    IDropService drops) : PageModel
{
    [BindProperty(SupportsGet = true)]
    public string Token { get; set; } = "";

    [BindProperty]
    public string? Password { get; set; }

    public bool RequiresPassword { get; private set; }
    public string? Error { get; private set; }
    public ShareLink? Link { get; private set; }
    public Drop? Drop { get; private set; }
    public IReadOnlyList<StoredFile> Files { get; private set; } = [];

    public async Task<IActionResult> OnGetAsync(CancellationToken cancellationToken)
    {
        return await LoadAsync(cancellationToken);
    }

    public async Task<IActionResult> OnPostAsync(CancellationToken cancellationToken)
    {
        var result = await LoadAsync(cancellationToken);
        if (!RequiresPassword && Link is not null && !string.IsNullOrEmpty(Password))
        {
            Response.Cookies.Append(
                AccessContextFactory.SharePasswordCookie,
                Password,
                new CookieOptions
                {
                    HttpOnly = true,
                    Secure = Request.IsHttps,
                    SameSite = SameSiteMode.Strict,
                    Path = "/",
                    MaxAge = TimeSpan.FromHours(8)
                });
        }

        return result;
    }

    private async Task<IActionResult> LoadAsync(CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(Token))
        {
            return NotFound();
        }

        Link = await links.ResolveAsync(Token, cancellationToken);
        if (Link is null)
        {
            return NotFound();
        }

        var ctx = AccessContextFactory.From(Request, User.GetVaultUserId());
        if (Link.TargetKind == ShareTargetKind.File)
        {
            var decision = await access.AuthorizeFileAsync(ctx, Link.TargetId, AccessIntent.List, cancellationToken);
            if (decision.RequiresPassword)
            {
                RequiresPassword = true;
                if (Request.HasFormContentType)
                {
                    Error = "That password did not work.";
                }

                return Page();
            }

            if (!decision.Allowed)
            {
                return NotFound();
            }

            var file = await library.GetAsync(Link.TargetId, cancellationToken);
            if (file is null)
            {
                return NotFound();
            }

            Files = [file];
            return Page();
        }

        var dropDecision = await access.AuthorizeDropAsync(ctx, Link.TargetId, AccessIntent.List, cancellationToken);
        if (dropDecision.RequiresPassword)
        {
            RequiresPassword = true;
            if (Request.HasFormContentType)
            {
                Error = "That password did not work.";
            }

            return Page();
        }

        if (!dropDecision.Allowed)
        {
            return NotFound();
        }

        Drop = await drops.GetAsync(Link.TargetId, cancellationToken);
        Files = await drops.ListFilesAsync(Link.TargetId, cancellationToken);
        return Page();
    }
}
