namespace FamilyVault.Files.Contracts;

public sealed record Retention(DateTimeOffset? ExpiresAt, int? MaxDownloads)
{
    public static Retention Week(TimeProvider time) =>
        new(time.GetUtcNow().AddDays(7), null);

    public static Retention Days(TimeProvider time, int days) =>
        new(time.GetUtcNow().AddDays(days), null);

    public static Retention Forever() => new(null, null);

    public static Retention OneTime(TimeProvider time) =>
        new(time.GetUtcNow().AddDays(7), 1);

    public static Retention Default(TimeProvider time) => Week(time);
}
