using FamilyVault.Files.Configuration;
using FamilyVault.Files.Contracts;
using FamilyVault.Files.Data.Entities;
using FamilyVault.Files.Security;
using FamilyVault.Files.Services;
using FamilyVault.Files.Storage;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;

namespace FamilyVault.Files.Tests;

public class PersonalizationAndSystemSettingsTests
{
    [Fact]
    public async Task Can_save_and_retrieve_user_personalization_and_system_setting()
    {
        await using var fx = new SqliteFixture();
        await fx.SeedMembersAsync();

        var now = DateTimeOffset.Parse("2026-10-26T12:00:00Z");

        var personalization = new UserPersonalizationEntity
        {
            UserId = SqliteFixture.OwnerId,
            StatusTag = "Gamer",
            HeaderBadge = "preset:gamer-pad",
            HeaderMotif = "preset:cyber-circuit",
            BackgroundTile = "none",
            ChimeTheme = "arcade-8bit",
            UpdatedAt = now
        };
        fx.Db.UserPersonalizations.Add(personalization);

        var setting = new SystemSettingEntity
        {
            Key = "SiteAiKey",
            ValueCipher = "encrypted-secret",
            UpdatedAt = now
        };
        fx.Db.SystemSettings.Add(setting);

        await fx.Db.SaveChangesAsync();

        var readP = await fx.Db.UserPersonalizations.AsNoTracking().FirstOrDefaultAsync(p => p.UserId == SqliteFixture.OwnerId);
        Assert.NotNull(readP);
        Assert.Equal("Gamer", readP.StatusTag);
        Assert.Equal("preset:gamer-pad", readP.HeaderBadge);
        Assert.Equal("arcade-8bit", readP.ChimeTheme);

        var readS = await fx.Db.SystemSettings.AsNoTracking().FirstOrDefaultAsync(s => s.Key == "SiteAiKey");
        Assert.NotNull(readS);
        Assert.Equal("encrypted-secret", readS.ValueCipher);
    }

    [Fact]
    public async Task Custom_personalization_svg_preserves_content_type_on_upload()
    {
        await using var fx = new SqliteFixture();
        await fx.SeedMembersAsync();

        var root = Directory.CreateTempSubdirectory();
        try
        {
            var options = Options.Create(new FilesOptions
            {
                Local = new LocalFilesOptions { RootPath = root.FullName },
                AllowAnyContentType = true
            });
            var store = new LocalDiskObjectStore(options, new TestHostEnv());
            var quota = new QuotaService(fx.Db, options);
            var scanner = new NoOpContentScanner();
            var time = new TestTimeProvider(DateTimeOffset.Parse("2026-10-26T12:00:00Z"));
            var hasher = new PasswordHasher<object>();
            var uploads = new UploadSessionService(fx.Db, store, quota, scanner, time, hasher, options);

            var session = await uploads.BeginAsync(new BeginUploadRequest(
                SqliteFixture.OwnerId,
                "Flaming V.svg",
                "image/x-mcwut-badge+svg",
                128,
                null,
                Retention.Forever(),
                null,
                IsChatOnly: true));

            var file = await fx.Db.StoredFiles.FindAsync(session.FileId);
            Assert.NotNull(file);
            Assert.Equal("image/x-mcwut-badge+svg", file.ContentType);
            Assert.True(file.IsChatOnly);
        }
        finally
        {
            root.Delete(true);
        }
    }

    private sealed class TestHostEnv : IHostEnvironment
    {
        public string EnvironmentName { get; set; } = "Development";
        public string ApplicationName { get; set; } = "tests";
        public string ContentRootPath { get; set; } = Path.GetTempPath();
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    }
}
