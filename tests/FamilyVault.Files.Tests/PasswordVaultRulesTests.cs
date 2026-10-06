using FamilyVault.Files.Security;

namespace FamilyVault.Files.Tests;

public class PasswordVaultRulesTests
{
    [Fact]
    public void Trims_name_and_keeps_https_url()
    {
        var fields = PasswordVaultRules.Normalize("  Bank  ", "ada", "secret", "https://bank.example/login", "note");

        Assert.Equal("Bank", fields.Name);
        Assert.Equal("ada", fields.Username);
        Assert.Equal("secret", fields.Password);
        Assert.Equal("https://bank.example/login", fields.Url);
        Assert.Equal("note", fields.Notes);
    }

    [Fact]
    public void Empty_url_is_omitted()
    {
        var fields = PasswordVaultRules.Normalize("Mail", "", "", "   ", "");

        Assert.Null(fields.Url);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void Rejects_empty_name(string? name)
    {
        Assert.Throws<PasswordVaultValidationException>(() => PasswordVaultRules.Normalize(name, "", "", null, ""));
    }

    [Theory]
    [InlineData("javascript:alert(1)")]
    [InlineData("ftp://files.example")]
    [InlineData("not a url")]
    public void Rejects_unsafe_url(string url)
    {
        Assert.Throws<PasswordVaultValidationException>(() => PasswordVaultRules.Normalize("Site", "", "", url, ""));
    }
}
