using Azure;
using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using FamilyVault.Files.Contracts;
using Microsoft.Extensions.Options;

namespace FamilyVault.Files.Azure;

public sealed class AzureBlobObjectStore : IObjectStore, IObjectStoreCapabilities
{
    private readonly BlobContainerClient _container;

    public AzureBlobObjectStore(IOptions<AzureBlobOptions> options)
    {
        var value = options.Value;
        if (string.IsNullOrWhiteSpace(value.ConnectionString))
        {
            throw new InvalidOperationException("Files:Azure:ConnectionString is required.");
        }

        var service = new BlobServiceClient(value.ConnectionString);
        _container = service.GetBlobContainerClient(value.Container);
        _container.CreateIfNotExists(PublicAccessType.None);
    }

    public bool SupportsDirectUpload => false;
    public bool SupportsDirectRead => false;

    public async Task PutAsync(string storageKey, Stream content, long? expectedLength, CancellationToken cancellationToken = default)
    {
        var blob = _container.GetBlobClient(storageKey);
        var options = new BlobUploadOptions
        {
            HttpHeaders = new BlobHttpHeaders { ContentType = "application/octet-stream" }
        };
        await blob.UploadAsync(content, options, cancellationToken).ConfigureAwait(false);
        if (expectedLength is long expected)
        {
            var props = await blob.GetPropertiesAsync(cancellationToken: cancellationToken).ConfigureAwait(false);
            if (props.Value.ContentLength != expected)
            {
                await blob.DeleteIfExistsAsync(cancellationToken: cancellationToken).ConfigureAwait(false);
                throw new IOException($"Stored length {props.Value.ContentLength} did not match expected {expected}.");
            }
        }
    }

    public async Task<Stream> OpenReadAsync(string storageKey, ByteRange? range, CancellationToken cancellationToken = default)
    {
        var blob = _container.GetBlobClient(storageKey);
        if (range is null)
        {
            var response = await blob.DownloadStreamingAsync(cancellationToken: cancellationToken).ConfigureAwait(false);
            return response.Value.Content;
        }

        if (range.From < 0)
        {
            throw new InvalidRangeException();
        }

        var httpRange = range.To is long to
            ? new HttpRange(range.From, to - range.From + 1)
            : new HttpRange(range.From);
        try
        {
            var response = await blob.DownloadStreamingAsync(new BlobDownloadOptions { Range = httpRange }, cancellationToken)
                .ConfigureAwait(false);
            return response.Value.Content;
        }
        catch (RequestFailedException ex) when (ex.Status == 416)
        {
            throw new InvalidRangeException();
        }
    }

    public async Task DeleteAsync(string storageKey, CancellationToken cancellationToken = default)
    {
        var blob = _container.GetBlobClient(storageKey);
        await blob.DeleteIfExistsAsync(cancellationToken: cancellationToken).ConfigureAwait(false);
    }

    public async Task<bool> ExistsAsync(string storageKey, CancellationToken cancellationToken = default)
    {
        var blob = _container.GetBlobClient(storageKey);
        return await blob.ExistsAsync(cancellationToken).ConfigureAwait(false);
    }
}
