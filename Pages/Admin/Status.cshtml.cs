using FamilyVault.Files.Contracts;
using FamilyVault.Files.Data;
using McWutWebApp.Hosting;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;

namespace McWutWebApp.Pages.Admin;

[Authorize(Roles = IdentitySeed.AdminRole)]
public class StatusModel(
    ApplicationDbContext db,
    IConfiguration configuration,
    IWebHostEnvironment environment,
    ILogger<StatusModel> logger) : PageModel
{
    public string EnvironmentName { get; private set; } = "";
    public string DatabaseProvider { get; private set; } = "";
    public string StorageProvider { get; private set; } = "";
    public bool DatabaseOk { get; private set; }
    public int UserCount { get; private set; }
    public int FileCount { get; private set; }
    public int OpenInviteCount { get; private set; }
    public string? Problem { get; private set; }

    public async Task OnGetAsync(CancellationToken cancellationToken)
    {
        EnvironmentName = environment.EnvironmentName;
        DatabaseProvider = configuration["Database:Provider"] ?? "Sqlite";
        StorageProvider = configuration["Files:Provider"] ?? "Local";

        try
        {
            DatabaseOk = await db.Database.CanConnectAsync(cancellationToken);
            if (!DatabaseOk)
            {
                Problem = "The database did not accept a connection.";
                return;
            }

            var now = DateTimeOffset.UtcNow;
            UserCount = await db.Users.CountAsync(cancellationToken);
            FileCount = await db.StoredFiles.CountAsync(
                f => f.DeletedAt == null && f.Status == FileStatus.Ready,
                cancellationToken);
            OpenInviteCount = await db.Invites.CountAsync(
                i => i.UsedAt == null && i.ExpiresAt > now,
                cancellationToken);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            DatabaseOk = false;
            Problem = "The database check failed.";
            logger.LogError(ex, "Admin status check failed.");
        }
    }
}
