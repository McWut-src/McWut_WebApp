using FamilyVault.Files.Data.Entities;
using Microsoft.EntityFrameworkCore;

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
}
