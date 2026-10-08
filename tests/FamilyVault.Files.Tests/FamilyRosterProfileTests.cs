using FamilyVault.Files.Contracts;
using FamilyVault.Files.Data.Entities;
using FamilyVault.Files.Services;

namespace FamilyVault.Files.Tests;

public class FamilyRosterProfileTests
{
    [Fact]
    public async Task Chosen_name_and_color_survive_a_later_upsert()
    {
        await using var fx = new SqliteFixture();
        var time = new TestTimeProvider(DateTimeOffset.Parse("2026-10-07T12:00:00Z"));
        var roster = new FamilyRoster(fx.Db, time);
        var id = Guid.Parse("dddddddd-dddd-dddd-dddd-dddddddddddd");

        await roster.UpdateProfileAsync(id, "ada@family.test", "Ada", "#0f7a6a");

        var saved = await roster.GetAsync(id);
        Assert.NotNull(saved);
        Assert.Equal("Ada", saved.DisplayName);
        Assert.Equal("#0f7a6a", saved.AccentColor);
        Assert.Equal("ada@family.test", saved.Email);

        time.UtcNow = time.UtcNow.AddMinutes(1);
        await roster.UpsertAsync(new FamilyMember(id, "ada@family.test", "ada@family.test"));

        var after = await roster.GetAsync(id);
        Assert.NotNull(after);
        Assert.Equal("Ada", after.DisplayName);
        Assert.Equal("#0f7a6a", after.AccentColor);
    }

    [Fact]
    public async Task Upsert_fills_a_blank_name_and_keeps_the_color()
    {
        await using var fx = new SqliteFixture();
        var time = new TestTimeProvider(DateTimeOffset.Parse("2026-10-07T12:00:00Z"));
        var roster = new FamilyRoster(fx.Db, time);
        var id = Guid.Parse("eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee");
        var seen = DateTimeOffset.Parse("2026-10-01T00:00:00Z");
        fx.Db.FamilyMembers.Add(new FamilyMemberEntity
        {
            UserId = id,
            Email = "sam@family.test",
            DisplayName = "",
            AccentColor = "#a33b4a",
            FirstSeenAt = seen,
            LastSeenAt = seen
        });
        await fx.Db.SaveChangesAsync();

        await roster.UpsertAsync(new FamilyMember(id, "sam@family.test", "sam@family.test"));

        var after = await roster.GetAsync(id);
        Assert.NotNull(after);
        Assert.Equal("sam@family.test", after.DisplayName);
        Assert.Equal("#a33b4a", after.AccentColor);
    }
}
