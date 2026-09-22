namespace FamilyVault.Files.Tests;

internal sealed class TestTimeProvider : TimeProvider
{
    public TestTimeProvider(DateTimeOffset utcNow) => UtcNow = utcNow;

    public DateTimeOffset UtcNow { get; set; }

    public override DateTimeOffset GetUtcNow() => UtcNow;
}
