using Microsoft.Data.Sqlite;
using Microsoft.Extensions.Hosting;

namespace FamilyVault.Files;

internal static class SqlitePath
{
    public static string ResolveConnectionString(string connectionString, IHostEnvironment environment)
    {
        var builder = new SqliteConnectionStringBuilder(connectionString);
        if (string.IsNullOrWhiteSpace(builder.DataSource))
        {
            builder.DataSource = "App_Data/mcwut.db";
        }

        if (!Path.IsPathRooted(builder.DataSource))
        {
            builder.DataSource = Path.GetFullPath(Path.Combine(environment.ContentRootPath, builder.DataSource));
        }

        var directory = Path.GetDirectoryName(builder.DataSource);
        if (!string.IsNullOrEmpty(directory))
        {
            Directory.CreateDirectory(directory);
        }

        return builder.ToString();
    }
}
