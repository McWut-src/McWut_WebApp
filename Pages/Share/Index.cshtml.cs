using System.Text;
using FamilyVault.Files.Contracts;
using FamilyVault.Files.Security;
using McWutWebApp.Hosting;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace McWutWebApp.Pages.Share;

[AllowAnonymous]
public class IndexModel(
    IShareLinkService links,
    IShortLinkService shortcuts,
    IFileAccessService access,
    IFileLibrary library,
    IDropService drops,
    IFileContentService content) : PageModel
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
    public IReadOnlyDictionary<Guid, ShareNote> Notes { get; private set; } = new Dictionary<Guid, ShareNote>();

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

        var shortcut = await shortcuts.ResolveAsync(Token, cancellationToken);
        if (shortcut is not null)
        {
            return Redirect(shortcut.TargetUrl);
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
            await LoadPreviewsAsync(ctx, cancellationToken);
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
        await LoadPreviewsAsync(ctx, cancellationToken);
        return Page();
    }

    private async Task LoadPreviewsAsync(AccessContext ctx, CancellationToken cancellationToken)
    {
        if (Link is not { AllowPreview: true })
        {
            return;
        }

        var notes = new Dictionary<Guid, ShareNote>();
        var shown = 0;
        foreach (var file in Files)
        {
            if (!ReadableFiles.IsReadable(file.ContentType, file.OriginalFileName))
            {
                continue;
            }

            var markdown = ReadableFiles.IsMarkdown(file.ContentType, file.OriginalFileName);
            if (file.SizeBytes is <= 0 or > ReadableFiles.MaxPreviewBytes)
            {
                notes[file.Id] = new ShareNote(null, markdown, "This note is too long to read here. Download it.");
                continue;
            }

            if (shown >= 12)
            {
                notes[file.Id] = new ShareNote(null, markdown, "Download this note to read it.");
                continue;
            }

            try
            {
                await using var opened = await content.OpenPreviewAsync(ctx, file.Id, range: null, cancellationToken);
                using var reader = new StreamReader(opened.Stream, Encoding.UTF8, detectEncodingFromByteOrderMarks: true, leaveOpen: true);
                notes[file.Id] = new ShareNote(await reader.ReadToEndAsync(cancellationToken), markdown, null);
                shown++;
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                // A preview must not hide the download.
            }
        }

        Notes = notes;
    }
}

public sealed record ShareNote(string? Text, bool Markdown, string? Notice);
