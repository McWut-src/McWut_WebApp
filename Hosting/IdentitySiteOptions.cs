namespace McWutWebApp.Hosting;

public sealed class IdentitySiteOptions
{
    public const string SectionName = "Identity";

    public bool AllowRegistration { get; set; } = true;
    public bool SeedDemoUsers { get; set; }
    public string? ProductionAdminEmail { get; set; }
    public string? ProductionAdminPassword { get; set; }
}
