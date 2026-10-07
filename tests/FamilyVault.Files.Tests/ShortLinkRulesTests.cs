using FamilyVault.Files.Security;
using FamilyVault.Files.Services;

namespace FamilyVault.Files.Tests;

public class ShortLinkRulesTests
{
    [Theory]
    [InlineData("www.mlongurl.com/somemoresuftt?id=3", "https://www.mlongurl.com/somemoresuftt?id=3")]
    [InlineData("https://example.com/a/b?x=1&y=2", "https://example.com/a/b?x=1&y=2")]
    [InlineData("http://example.com/path", "http://example.com/path")]
    [InlineData("  Example.com/Notes  ", "https://example.com/Notes")]
    public void Accepts_public_web_addresses(string input, string expected)
    {
        Assert.Equal(expected, ShortLinkRules.Normalize(input));
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("javascript:alert(1)")]
    [InlineData("data:text/html,hi")]
    [InlineData("file:///c/secret")]
    [InlineData("http://localhost/admin")]
    [InlineData("http://127.0.0.1/")]
    [InlineData("http://192.168.1.20/camera")]
    [InlineData("http://10.0.0.5/")]
    [InlineData("https://user:secret@example.com/")]
    public void Rejects_addresses_that_are_not_public_web_links(string input)
    {
        Assert.Throws<ShortLinkValidationException>(() => ShortLinkRules.Normalize(input));
    }

    [Fact]
    public async Task Owner_can_create_resolve_and_delete()
    {
        await using var fx = new SqliteFixture();
        var time = new TestTimeProvider(DateTimeOffset.Parse("2026-10-06T00:00:00Z"));
        var service = new ShortLinkService(fx.Db, time);

        var created = await service.CreateAsync(SqliteFixture.OwnerId, "www.mlongurl.com/somemoresuftt?id=3");
        Assert.Matches("^[A-Za-z0-9]{8}$", created.Token);
        Assert.Equal("https://www.mlongurl.com/somemoresuftt?id=3", created.TargetUrl);

        time.UtcNow = time.UtcNow.AddMinutes(1);
        var newer = await service.CreateAsync(SqliteFixture.OwnerId, "https://example.com/newer");
        var listed = await service.ListOwnedAsync(SqliteFixture.OwnerId);
        Assert.Equal(new[] { newer.Token, created.Token }, listed.Select(item => item.Token).ToArray());

        var resolved = await service.ResolveAsync(created.Token);
        Assert.Equal(created.TargetUrl, resolved?.TargetUrl);

        await Assert.ThrowsAsync<FamilyVault.Files.Contracts.VaultNotFoundException>(() =>
            service.DeleteAsync(created.Token, SqliteFixture.StrangerId));
        Assert.NotNull(await service.ResolveAsync(created.Token));

        await service.DeleteAsync(created.Token, SqliteFixture.OwnerId);
        Assert.Null(await service.ResolveAsync(created.Token));
    }
}
