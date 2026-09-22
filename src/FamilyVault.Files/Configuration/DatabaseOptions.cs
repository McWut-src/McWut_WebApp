using System.ComponentModel.DataAnnotations;

namespace FamilyVault.Files.Configuration;

public sealed class DatabaseOptions
{
    public const string SectionName = "Database";

    [Required]
    public string Provider { get; set; } = "Sqlite";
}
