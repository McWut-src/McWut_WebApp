using FamilyVault.Files.Configuration;
using FamilyVault.Files.Contracts;
using Microsoft.Extensions.Options;

namespace McWutWebApp.Hosting;

public sealed class RetentionMapper(TimeProvider time, IOptions<FilesOptions> options)
{
    public Retention FromDto(RetentionInput? input)
    {
        if (input is null)
        {
            return Retention.Days(time, options.Value.DefaultRetentionDays);
        }

        int? max = input.MaxDownloads;
        if (input.Days is null or 0)
        {
            return new Retention(null, max);
        }

        return new Retention(time.GetUtcNow().AddDays(input.Days.Value), max);
    }
}

public sealed class RetentionInput
{
    public int? Days { get; set; }
    public int? MaxDownloads { get; set; }
}
