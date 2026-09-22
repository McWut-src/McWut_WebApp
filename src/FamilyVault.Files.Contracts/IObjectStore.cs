namespace FamilyVault.Files.Contracts;

public interface IObjectStore
{
    Task PutAsync(string storageKey, Stream content, long? expectedLength, CancellationToken cancellationToken = default);
    Task<Stream> OpenReadAsync(string storageKey, ByteRange? range, CancellationToken cancellationToken = default);
    Task DeleteAsync(string storageKey, CancellationToken cancellationToken = default);
    Task<bool> ExistsAsync(string storageKey, CancellationToken cancellationToken = default);
}

public interface IObjectStoreCapabilities
{
    bool SupportsDirectUpload { get; }
    bool SupportsDirectRead { get; }
}

public interface IDirectAccessObjectStore
{
    Task<Uri> GetDirectUploadUriAsync(string storageKey, TimeSpan ttl, CancellationToken cancellationToken = default);
    Task<Uri> GetDirectReadUriAsync(string storageKey, TimeSpan ttl, CancellationToken cancellationToken = default);
}
