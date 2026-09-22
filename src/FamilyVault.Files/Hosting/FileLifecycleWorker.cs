using FamilyVault.Files.Configuration;
using FamilyVault.Files.Contracts;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace FamilyVault.Files.Hosting;

public sealed class FileLifecycleWorker(
    IServiceScopeFactory scopeFactory,
    IOptions<FilesOptions> options,
    ILogger<FileLifecycleWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var interval = TimeSpan.FromMinutes(Math.Max(1, options.Value.SweepIntervalMinutes));
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = scopeFactory.CreateScope();
                var lifecycle = scope.ServiceProvider.GetRequiredService<IFileLifecycle>();
                await lifecycle.SweepExpiredAsync(stoppingToken).ConfigureAwait(false);
                await lifecycle.SweepAbandonedUploadsAsync(stoppingToken).ConfigureAwait(false);
                await lifecycle.SweepSoftDeletedAsync(stoppingToken).ConfigureAwait(false);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "File lifecycle sweep failed.");
            }

            try
            {
                await Task.Delay(interval, stoppingToken).ConfigureAwait(false);
            }
            catch (OperationCanceledException)
            {
                break;
            }
        }
    }
}
