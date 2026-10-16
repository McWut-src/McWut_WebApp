using System.Text;
using System.Text.Json;
using FamilyVault.Files.Contracts;
using FamilyVault.Files.Security;
using McWutWebApp.Hosting;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace McWutWebApp.Controllers;

[ApiController]
[Authorize]
[AutoValidateAntiforgeryToken]
[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
[Route("api/passwords")]
public sealed class PasswordsController(PasswordVaultService vault, IFamilyRoster roster) : ControllerBase
{
    private static readonly JsonSerializerOptions ExportJson = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<PasswordVaultItemView>>> List(CancellationToken cancellationToken) =>
        Ok(await vault.ListAsync(User.RequireVaultUserId(), cancellationToken));

    [HttpGet("export")]
    public async Task<IActionResult> Export(CancellationToken cancellationToken)
    {
        var userId = User.RequireVaultUserId();
        var member = await roster.GetAsync(userId, cancellationToken);
        var rows = await vault.ListAsync(userId, cancellationToken);
        var body = JsonSerializer.Serialize(new
        {
            items = rows.Select(row => new
            {
                row.Name,
                row.Username,
                row.Password,
                row.Url,
                row.Information
            })
        }, ExportJson);
        var fileName = MemberLabel.VaultFileName(member?.DisplayName, member?.Email ?? User.Identity?.Name);
        return File(Encoding.UTF8.GetBytes(body), "application/json", fileName);
    }

    [HttpPost("import")]
    public async Task<ActionResult<PasswordVaultImportResult>> Import(CancellationToken cancellationToken)
    {
        using var reader = new StreamReader(Request.Body, Encoding.UTF8);
        var json = await reader.ReadToEndAsync(cancellationToken);
        return Ok(await vault.ImportAsync(User.RequireVaultUserId(), json, cancellationToken));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<PasswordVaultItemView>> Get(Guid id, CancellationToken cancellationToken) =>
        Ok(await vault.GetAsync(User.RequireVaultUserId(), id, cancellationToken));

    [HttpPost]
    public async Task<ActionResult<PasswordVaultItemView>> Create([FromBody] PasswordVaultBody body, CancellationToken cancellationToken)
    {
        var created = await vault.CreateAsync(
            User.RequireVaultUserId(),
            body.Name,
            body.Username,
            body.Password,
            body.Url,
            body.Information,
            cancellationToken);
        return Created($"/api/passwords/{created.Id}", created);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<PasswordVaultItemView>> Update(Guid id, [FromBody] PasswordVaultBody body, CancellationToken cancellationToken) =>
        Ok(await vault.UpdateAsync(
            User.RequireVaultUserId(),
            id,
            body.Name,
            body.Username,
            body.Password,
            body.Url,
            body.Information,
            cancellationToken));

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        await vault.DeleteAsync(User.RequireVaultUserId(), id, cancellationToken);
        return NoContent();
    }
}

public sealed class PasswordVaultBody
{
    public string? Name { get; set; }
    public string? Username { get; set; }
    public string? Password { get; set; }
    public string? Url { get; set; }
    public string? Information { get; set; }
}
