using FamilyVault.Files.Security;
using McWutWebApp.Hosting;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace McWutWebApp.Pages.Admin;

[Authorize(Roles = IdentitySeed.AdminRole)]
public class StickersModel(AdminStickerKeyService adminKeys) : PageModel
{
    public AdminStickerKeyStatus Status { get; private set; } = new(false, null, null);
    public string? Notice { get; private set; }
    public string? Error { get; private set; }

    public async Task OnGetAsync(CancellationToken cancellationToken)
    {
        Status = await adminKeys.GetStatusAsync(cancellationToken);
    }

    public async Task<IActionResult> OnPostAsync([FromForm] string? apiKey, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(apiKey))
        {
            Error = "Please enter an API key.";
            Status = await adminKeys.GetStatusAsync(cancellationToken);
            return Page();
        }

        try
        {
            Status = await adminKeys.SaveAsync(apiKey, cancellationToken);
            Notice = $"Saved {Status.Provider} API key for sticker generation.";
        }
        catch (DirectMessageValidationException ex)
        {
            Error = ex.Message;
            Status = await adminKeys.GetStatusAsync(cancellationToken);
        }

        return Page();
    }

    public async Task<IActionResult> OnPostDeleteAsync(CancellationToken cancellationToken)
    {
        await adminKeys.DeleteAsync(cancellationToken);
        Status = new AdminStickerKeyStatus(false, null, null);
        Notice = "Removed sticker AI API key.";
        return Page();
    }
}
