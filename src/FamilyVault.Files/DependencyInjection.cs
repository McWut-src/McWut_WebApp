using FamilyVault.Files.Configuration;
using FamilyVault.Files.Contracts;
using FamilyVault.Files.Data;
using FamilyVault.Files.Hosting;
using FamilyVault.Files.Services;
using FamilyVault.Files.Storage;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace FamilyVault.Files;

public static class DependencyInjection
{
    public static IServiceCollection AddFamilyVaultFiles(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        services.AddOptions<FilesOptions>()
            .Bind(configuration.GetSection(FilesOptions.SectionName))
            .ValidateDataAnnotations()
            .ValidateOnStart();

        services.AddDbContext<ApplicationDbContext>((sp, options) =>
        {
            var environment = sp.GetRequiredService<IHostEnvironment>();
            var connectionString = configuration.GetConnectionString("DefaultConnection")
                                   ?? "Data Source=App_Data/mcwut.db";
            options.UseSqlite(SqlitePath.ResolveConnectionString(connectionString, environment));
        });

        services.AddSingleton(TimeProvider.System);
        services.AddOptions<PasswordHasherOptions>();
        services.AddSingleton<IPasswordHasher<object>, PasswordHasher<object>>();
        services.AddSingleton<IObjectStore, LocalDiskObjectStore>();
        services.AddSingleton<IObjectStoreCapabilities>(sp => (LocalDiskObjectStore)sp.GetRequiredService<IObjectStore>());

        services.AddScoped<IFamilyRoster, FamilyRoster>();
        services.AddScoped<IQuotaService, QuotaService>();
        services.AddScoped<IContentScanner, NoOpContentScanner>();
        services.AddScoped<IFileAudit, FileAuditService>();
        services.AddScoped<IFileAccessService, FileAccessService>();
        services.AddScoped<IFileLibrary, FileLibrary>();
        services.AddScoped<IDropService, DropService>();
        services.AddScoped<IUploadSessionService, UploadSessionService>();
        services.AddScoped<IShareLinkService, ShareLinkService>();
        services.AddScoped<IGrantService, GrantService>();
        services.AddScoped<IFileContentService, FileContentService>();
        services.AddScoped<IFileLifecycle, FileLifecycle>();
        services.AddHostedService<FileLifecycleWorker>();

        return services;
    }

    public static async Task InitializeFamilyVaultAsync(this IHost host, CancellationToken cancellationToken = default)
    {
        using var scope = host.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        await db.Database.MigrateAsync(cancellationToken).ConfigureAwait(false);
    }
}
