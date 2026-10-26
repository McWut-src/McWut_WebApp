using FamilyVault.Files.Data;
using FamilyVault.Files.Hosting;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Storage;

namespace McWutWebApp.Hosting;

/// <summary>
/// Opens Azure SQL only for a request that needs it, and only when that database already exists.
/// Migrate creates a missing database, and a plain create on this server becomes provisioned
/// General Purpose with 2 vCores. That database cannot pause.
/// </summary>
public sealed class SqlServerDatabaseGate(
    IServiceScopeFactory scopes,
    ILogger<SqlServerDatabaseGate> logger) : IStartupDatabaseContact
{
    private const int NotChecked = 0;
    private const int Ready = 1;
    private const int Missing = 2;

    private readonly SemaphoreSlim _gate = new(1, 1);
    private readonly TaskCompletionSource _realUse = new(TaskCreationOptions.RunContinuationsAsynchronously);
    private int _state = NotChecked;

    public bool DeferBackgroundWork => true;

    public void ResetState()
    {
        Volatile.Write(ref _state, NotChecked);
    }

    public Task WaitForRealUseAsync(CancellationToken cancellationToken) =>
        _realUse.Task.WaitAsync(cancellationToken);

    public static bool RequestNeedsDatabase(HttpContext context)
    {
        var path = context.Request.Path;
        if (IsQuiet(path))
        {
            return false;
        }

        if (context.User.Identity?.IsAuthenticated == true)
        {
            return true;
        }

        if (path.StartsWithSegments("/s") || path.StartsWithSegments("/join"))
        {
            return true;
        }

        return HttpMethods.IsPost(context.Request.Method)
               && path.StartsWithSegments("/Identity/Account");
    }

    public async Task<bool> EnsureReadyAsync(CancellationToken cancellationToken)
    {
        var state = Volatile.Read(ref _state);
        if (state == Ready)
        {
            return true;
        }

        if (state == Missing)
        {
            return false;
        }

        await _gate.WaitAsync(cancellationToken).ConfigureAwait(false);
        try
        {
            state = Volatile.Read(ref _state);
            if (state == Ready)
            {
                return true;
            }

            if (state == Missing)
            {
                return false;
            }

            var existence = await DatabaseExistsAsync(cancellationToken).ConfigureAwait(false);
            if (existence == DatabaseExistence.Missing)
            {
                Volatile.Write(ref _state, Missing);
                logger.LogWarning("SQL database does not exist. Startup will not create it.");
                return false;
            }

            if (existence == DatabaseExistence.Unknown)
            {
                return false;
            }

            try
            {
                await MigrateAndSeedAsync(cancellationToken).ConfigureAwait(false);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                logger.LogError(ex, "Database migrate or identity seed failed.");
                return false;
            }

            Volatile.Write(ref _state, Ready);
            _realUse.TrySetResult();
            logger.LogInformation("Database migrate and identity seed finished.");
            return true;
        }
        finally
        {
            _gate.Release();
        }
    }

    private async Task<DatabaseExistence> DatabaseExistsAsync(CancellationToken cancellationToken)
    {
        using var scope = scopes.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var creator = db.Database.GetService<IRelationalDatabaseCreator>();
        if (creator is null)
        {
            logger.LogWarning("SQL database existence check is unavailable.");
            return DatabaseExistence.Unknown;
        }

        try
        {
            var exists = await creator.ExistsAsync(cancellationToken).ConfigureAwait(false);
            return exists ? DatabaseExistence.Present : DatabaseExistence.Missing;
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            logger.LogWarning(ex, "SQL database existence check failed.");
            return DatabaseExistence.Unknown;
        }
    }

    private async Task MigrateAndSeedAsync(CancellationToken cancellationToken)
    {
        var delay = TimeSpan.FromSeconds(2);
        for (var attempt = 1; attempt <= 4; attempt++)
        {
            try
            {
                using var scope = scopes.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
                await db.Database.MigrateAsync(cancellationToken).ConfigureAwait(false);
                await IdentitySeed.SeedAsync(scopes, cancellationToken).ConfigureAwait(false);
                return;
            }
            catch (Exception ex) when (attempt < 4 && IsPausing(ex) && !cancellationToken.IsCancellationRequested)
            {
                logger.LogWarning(ex, "SQL is waking. Retrying migrate in {DelaySeconds} seconds.", delay.TotalSeconds);
                await Task.Delay(delay, cancellationToken).ConfigureAwait(false);
                delay = TimeSpan.FromSeconds(Math.Min(8, delay.TotalSeconds * 2));
            }
        }
    }

    private enum DatabaseExistence
    {
        Present,
        Missing,
        Unknown
    }

    private static bool IsQuiet(PathString path) =>
        path.StartsWithSegments("/health")
        || path.StartsWithSegments("/css")
        || path.StartsWithSegments("/js")
        || path.StartsWithSegments("/lib")
        || path.StartsWithSegments("/img")
        || path.StartsWithSegments("/api/messages/typing")
        || path.StartsWithSegments("/favicon.ico")
        || path.StartsWithSegments("/favicon.svg");

    public static bool IsPausing(Exception exception)
    {
        for (var current = exception; current is not null; current = current.InnerException)
        {
            var number = current.GetType().GetProperty("Number")?.GetValue(current);
            if (number is int code && code is 40613 or 42119 or 49918 or 49919 or 49920)
            {
                return true;
            }
        }

        return false;
    }
}
