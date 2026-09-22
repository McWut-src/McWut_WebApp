using System.ComponentModel.DataAnnotations;

namespace FamilyVault.Files.Configuration;

public sealed class FilesOptions
{
    public const string SectionName = "Files";

    [Required]
    public string Provider { get; set; } = "Local";

    public LocalFilesOptions Local { get; set; } = new();

    public AzureFilesOptions Azure { get; set; } = new();

    [Range(1, 36500)]
    public int DefaultRetentionDays { get; set; } = 7;

    [Range(1, long.MaxValue)]
    public long MaxFileSizeBytes { get; set; } = 104_857_600;

    [Range(1, long.MaxValue)]
    public long QuotaBytesPerUser { get; set; } = 1_073_741_824;

    [Range(1, 1440)]
    public int SweepIntervalMinutes { get; set; } = 15;

    [Range(1, 720)]
    public int AbandonedUploadHours { get; set; } = 24;

    [Range(0, 365)]
    public int SoftDeleteGraceDays { get; set; } = 7;

    /// <summary>
    /// When true, any type is accepted except <see cref="DeniedContentTypes"/>.
    /// Family/dev default: do not block HTML, HEIC, Office, etc.
    /// </summary>
    public bool AllowAnyContentType { get; set; } = true;

    public List<string> DeniedContentTypes { get; set; } =
    [
        "application/x-msdownload",
        "application/x-msdos-program",
        "application/x-executable",
        "application/x-dosexec",
        "application/vnd.microsoft.portable-executable"
    ];

    public List<string> AllowedContentTypes { get; set; } =
    [
        "application/pdf",
        "application/octet-stream",
        "application/zip",
        "application/msword",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
        "text/plain",
        "video/mp4",
        "audio/mpeg"
    ];
}

public sealed class LocalFilesOptions
{
    [Required]
    public string RootPath { get; set; } = "App_Data/vault";
}

public sealed class AzureFilesOptions
{
    public string ConnectionString { get; set; } = "";
    public string Container { get; set; } = "vault";
    public string KeysContainer { get; set; } = "keys";
}
