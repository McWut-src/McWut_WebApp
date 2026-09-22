using FamilyVault.Files.Configuration;
using FamilyVault.Files.Contracts;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;

namespace FamilyVault.Files.Storage;

public sealed class LocalDiskObjectStore : IObjectStore, IObjectStoreCapabilities
{
    private readonly string _root;

    public LocalDiskObjectStore(IOptions<FilesOptions> options, IHostEnvironment environment)
    {
        var configured = options.Value.Local.RootPath;
        _root = Path.IsPathRooted(configured)
            ? Path.GetFullPath(configured)
            : Path.GetFullPath(Path.Combine(environment.ContentRootPath, configured));
        Directory.CreateDirectory(_root);
    }

    public bool SupportsDirectUpload => false;
    public bool SupportsDirectRead => false;

    public async Task PutAsync(string storageKey, Stream content, long? expectedLength, CancellationToken cancellationToken = default)
    {
        var dest = Resolve(storageKey);
        Directory.CreateDirectory(Path.GetDirectoryName(dest)!);
        var temp = dest + ".tmp";
        try
        {
            await using (var output = new FileStream(temp, FileMode.Create, FileAccess.Write, FileShare.None, 64 * 1024, FileOptions.Asynchronous))
            {
                await content.CopyToAsync(output, cancellationToken).ConfigureAwait(false);
                if (expectedLength is long expected && output.Length != expected)
                {
                    throw new IOException($"Stored length {output.Length} did not match expected {expected}.");
                }
            }

            File.Move(temp, dest, overwrite: true);
        }
        catch
        {
            if (File.Exists(temp))
            {
                File.Delete(temp);
            }

            throw;
        }
    }

    public Task<Stream> OpenReadAsync(string storageKey, ByteRange? range, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        var path = Resolve(storageKey);
        var stream = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.Read, 64 * 1024, FileOptions.Asynchronous);
        if (range is null)
        {
            return Task.FromResult<Stream>(stream);
        }

        try
        {
            var length = stream.Length;
            if (range.From < 0 || range.From >= length)
            {
                throw new InvalidRangeException();
            }

            var end = range.To ?? (length - 1);
            if (end < range.From || end >= length)
            {
                throw new InvalidRangeException();
            }

            stream.Seek(range.From, SeekOrigin.Begin);
            return Task.FromResult<Stream>(new RangeReadStream(stream, end - range.From + 1));
        }
        catch
        {
            stream.Dispose();
            throw;
        }
    }

    public Task DeleteAsync(string storageKey, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        var path = Resolve(storageKey);
        if (File.Exists(path))
        {
            File.Delete(path);
        }

        return Task.CompletedTask;
    }

    public Task<bool> ExistsAsync(string storageKey, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        return Task.FromResult(File.Exists(Resolve(storageKey)));
    }

    private string Resolve(string storageKey)
    {
        if (string.IsNullOrWhiteSpace(storageKey)
            || storageKey.Contains("..", StringComparison.Ordinal)
            || Path.IsPathRooted(storageKey)
            || storageKey.Contains('\0'))
        {
            throw new InvalidOperationException("Invalid storage key.");
        }

        var combined = Path.GetFullPath(Path.Combine(_root, storageKey.Replace('/', Path.DirectorySeparatorChar)));
        var rootWithSep = _root.TrimEnd(Path.DirectorySeparatorChar) + Path.DirectorySeparatorChar;
        if (!combined.StartsWith(rootWithSep, StringComparison.OrdinalIgnoreCase)
            && !string.Equals(combined, _root, StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Invalid storage key.");
        }

        return combined;
    }
}
