namespace FamilyVault.Files.Hosting;

/// <summary>
/// Decides when background work may open the database.
/// SQLite opens it during startup. SQL Server waits for a real request.
/// </summary>
public interface IStartupDatabaseContact
{
    bool DeferBackgroundWork { get; }

    Task WaitForRealUseAsync(CancellationToken cancellationToken);
}

public sealed class ImmediateStartupDatabaseContact : IStartupDatabaseContact
{
    public bool DeferBackgroundWork => false;

    public Task WaitForRealUseAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}
