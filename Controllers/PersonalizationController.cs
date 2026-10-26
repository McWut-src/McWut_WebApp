using System.Text;
using McWutWebApp.Hosting;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace McWutWebApp.Controllers;

[ApiController]
[Authorize]
[AutoValidateAntiforgeryToken]
[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
[ServiceFilter(typeof(UpsertFamilyMemberFilter))]
[Route("api/personalization")]
public sealed class PersonalizationController(PersonalizationService personalization) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<PersonalizationStateView>> Get(CancellationToken cancellationToken) =>
        Ok(await personalization.GetStateAsync(User.RequireVaultUserId(), cancellationToken));

    [HttpPut]
    public async Task<ActionResult<PersonalizationStateView>> Save(
        [FromBody] PersonalizationSaveBody body,
        CancellationToken cancellationToken) =>
        Ok(await personalization.SaveSettingsAsync(
            User.RequireVaultUserId(),
            new PersonalizationSettings(
                body.StatusTag ?? "",
                body.HeaderBadge ?? "none",
                body.HeaderMotif ?? "none",
                body.BackgroundTile ?? "none",
                body.ChimeTheme ?? "classic"),
            cancellationToken));

    [HttpPost("generate")]
    public async Task<ActionResult<CustomSvgItemView>> Generate(
        [FromBody] PersonalizationGenerateBody body,
        CancellationToken cancellationToken) =>
        Ok(await personalization.GenerateCustomSvgAsync(
            User.RequireVaultUserId(),
            body.Kind,
            body.Theme,
            body.Prompt,
            cancellationToken));

    [HttpGet("svg/{id:guid}.svg")]
    [IgnoreAntiforgeryToken]
    [ResponseCache(Duration = 31536000, Location = ResponseCacheLocation.Client)]
    public async Task<IActionResult> CustomSvg(Guid id, CancellationToken cancellationToken)
    {
        var stream = await personalization.OpenCustomSvgAsync(id, cancellationToken);
        Response.Headers.ContentSecurityPolicy = "default-src 'none'; style-src 'unsafe-inline'";
        return File(stream, "image/svg+xml");
    }

    [HttpGet("preset/{kind}/{slug}.svg")]
    [IgnoreAntiforgeryToken]
    [ResponseCache(Duration = 31536000, Location = ResponseCacheLocation.Client)]
    public IActionResult PresetSvg(string kind, string slug)
    {
        var svg = PersonalizationService.GetPresetSvg(kind, slug);
        if (svg is null)
        {
            return NotFound();
        }

        Response.Headers.ContentSecurityPolicy = "default-src 'none'; style-src 'unsafe-inline'";
        return Content(svg, "image/svg+xml", Encoding.UTF8);
    }

    [HttpDelete("svg/{id:guid}")]
    public async Task<IActionResult> DeleteSvg(Guid id, CancellationToken cancellationToken)
    {
        await personalization.DeleteCustomSvgAsync(
            User.RequireVaultUserId(),
            User.IsInRole(IdentitySeed.AdminRole),
            id,
            cancellationToken);
        return NoContent();
    }
}

public sealed class PersonalizationSaveBody
{
    public string? StatusTag { get; set; }
    public string? HeaderBadge { get; set; }
    public string? HeaderMotif { get; set; }
    public string? BackgroundTile { get; set; }
    public string? ChimeTheme { get; set; }
}

public sealed class PersonalizationGenerateBody
{
    public string? Kind { get; set; }
    public string? Theme { get; set; }
    public string? Prompt { get; set; }
}
