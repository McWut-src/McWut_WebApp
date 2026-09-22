using System.Text;
using FamilyVault.Files.Configuration;
using FamilyVault.Files.Contracts;
using FamilyVault.Files.Services;
using FamilyVault.Files.Storage;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;

namespace FamilyVault.Files.Tests;

public class UploadDownloadSliceTests
{
    [Fact]
    public async Task Anonymous_token_downloads_file_after_owner_upload()
    {
        await using var fx = new SqliteFixture();
        await fx.SeedMembersAsync();
        var root = Directory.CreateTempSubdirectory();
        try
        {
            var now = DateTimeOffset.Parse("2026-06-01T00:00:00Z");
            var time = new TestTimeProvider(now);
            var hasher = new PasswordHasher<object>();
            var options = Options.Create(new FilesOptions
            {
                Local = new LocalFilesOptions { RootPath = root.FullName },
                MaxFileSizeBytes = 10_000,
                QuotaBytesPerUser = 1_000_000,
                AbandonedUploadHours = 24,
                AllowedContentTypes = ["text/plain"]
            });
            var store = new LocalDiskObjectStore(options, new TestHostEnvironment());
            var quota = new QuotaService(fx.Db, options);
            var scanner = new NoOpContentScanner();
            var uploads = new UploadSessionService(fx.Db, store, quota, scanner, time, hasher, options);
            var access = new FileAccessService(fx.Db, time, hasher);
            var audit = new FileAuditService(fx.Db, time);
            var links = new ShareLinkService(fx.Db, time, hasher, audit);
            var content = new FileContentService(fx.Db, store, access, audit, time);

            var payload = Encoding.UTF8.GetBytes("hello family");
            await using var beginStream = new MemoryStream(payload);
            var session = await uploads.BeginAsync(new BeginUploadRequest(
                SqliteFixture.OwnerId,
                "note.txt",
                "text/plain",
                payload.Length,
                null,
                Retention.Week(time),
                null));
            await uploads.PutAsync(session.SessionId, SqliteFixture.OwnerId, beginStream);
            var file = await uploads.CompleteAsync(session.SessionId, SqliteFixture.OwnerId);
            Assert.Equal(FileStatus.Ready, file.Status);

            var link = await links.CreateAsync(
                ShareTargetKind.File,
                file.Id,
                SqliteFixture.OwnerId,
                new CreateShareLinkRequest(Retention.Week(time), null, true));

            var opened = await content.OpenDownloadAsync(new AccessContext(null, link.Token, null), file.Id, range: null);
            await using (opened)
            {
                using var reader = new StreamReader(opened.Stream);
                Assert.Equal("hello family", await reader.ReadToEndAsync());
            }

            var denied = await access.AuthorizeFileAsync(
                new AccessContext(SqliteFixture.StrangerId, null, null),
                file.Id,
                AccessIntent.Download);
            Assert.Equal(AccessDecision.Deny, denied);
        }
        finally
        {
            root.Delete(true);
        }
    }

    private sealed class TestHostEnvironment : IHostEnvironment
    {
        public string EnvironmentName { get; set; } = "Development";
        public string ApplicationName { get; set; } = "tests";
        public string ContentRootPath { get; set; } = Path.GetTempPath();
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    }
}
