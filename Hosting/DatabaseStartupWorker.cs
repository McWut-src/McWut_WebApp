using FamilyVault.Files.Data;
using Microsoft.EntityFrameworkCore;

namespace McWutWebApp.Hosting;

/// <summary>
/// Runs SQL migrate + identity seed after Kestrel is listening.
/// Container Apps probes TCP 8080; blocking migrate in Program before Run() looks like a crash.
/// </summary>
public sealed class DatabaseStartupWorker(
    IServiceScopeFactory scopes,
    ILogger<DatabaseStartupWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        try
        {
            using (var scope = scopes.CreateScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
                await db.Database.MigrateAsync(stoppingToken).ConfigureAwait(false);
            }

            await IdentitySeed.SeedAsync(scopes, stoppingToken).ConfigureAwait(false);
            logger.LogInformation("Database migrate and identity seed finished.");
        }
        catch (Exception ex)
        {
            logger.LogCritical(ex, "Database migrate or identity seed failed.");
        }
    }
}
