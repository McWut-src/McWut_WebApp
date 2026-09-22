using FamilyVault.Files.Contracts;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace FamilyVault.Files.Azure;

public static class DependencyInjection
{
    public static IServiceCollection AddFamilyVaultAzure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        services.AddOptions<AzureBlobOptions>()
            .Bind(configuration.GetSection(AzureBlobOptions.SectionName))
            .Validate(o => !string.IsNullOrWhiteSpace(o.ConnectionString), "Files:Azure:ConnectionString is required.")
            .ValidateOnStart();

        services.AddSingleton<IObjectStore, AzureBlobObjectStore>();
        services.AddSingleton<IObjectStoreCapabilities>(sp =>
            (IObjectStoreCapabilities)sp.GetRequiredService<IObjectStore>());
        return services;
    }
}
