using FamilyVault.Files.Contracts;

namespace FamilyVault.Files.Services;

public sealed class NoOpContentScanner : IContentScanner
{
    public Task<ScanResult> ScanAsync(Stream content, CancellationToken cancellationToken = default) =>
        Task.FromResult(new ScanResult(true, null));
}
