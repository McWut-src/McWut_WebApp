using FamilyVault.Files.Configuration;
using FamilyVault.Files.Contracts;
using FamilyVault.Files.Data.Entities;
using FamilyVault.Files.Services;
using FamilyVault.Files.Storage;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;

namespace FamilyVault.Files.Tests;

public class FileLifecycleTests
{
    [Fact]
    public async Task SweepExpired_soft_deletes_expired_ready_files()
    {
        await using var fx = new SqliteFixture();
        await fx.SeedMembersAsync();
        var now = DateTimeOffset.Parse("2026-06-01T00:00:00Z");
        var time = new TestTimeProvider(now);
        var root = Directory.CreateTempSubdirectory();
        try
        {
            var options = Options.Create(new FilesOptions
            {
                Local = new LocalFilesOptions { RootPath = root.FullName },
                SoftDeleteGraceDays = 7
            });
            var store = new LocalDiskObjectStore(options, new TestEnv());
            var file = new StoredFileEntity
            {
                Id = Guid.NewGuid(),
                OwnerUserId = SqliteFixture.OwnerId,
                OriginalFileName = "old.txt",
                ContentType = "text/plain",
                SizeBytes = 4,
                StorageKey = $"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/{Guid.NewGuid():N}",
                Status = FileStatus.Ready,
                CreatedAt = now.AddDays(-10),
                ExpiresAt = now.AddDays(-1)
            };
            file.StorageKey = $"{SqliteFixture.OwnerId:N}/{file.Id:N}";
            fx.Db.StoredFiles.Add(file);
            await fx.Db.SaveChangesAsync();
            await using (var bytes = new MemoryStream("data"u8.ToArray()))
            {
                await store.PutAsync(file.StorageKey, bytes, 4);
            }

            var lifecycle = new FileLifecycle(fx.Db, store, time, options);
            await lifecycle.SweepExpiredAsync();

            Assert.NotNull((await fx.Db.StoredFiles.FindAsync(file.Id))!.DeletedAt);
            Assert.False(await store.ExistsAsync(file.StorageKey));
        }
        finally
        {
            root.Delete(true);
        }
    }

    private sealed class TestEnv : IHostEnvironment
    {
        public string EnvironmentName { get; set; } = "Development";
        public string ApplicationName { get; set; } = "tests";
        public string ContentRootPath { get; set; } = Path.GetTempPath();
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    }
}
