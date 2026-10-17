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
    [InlineData("facebook.com", "https://facebook.com/")]
    [InlineData("www.facebook.com/login", "https://www.facebook.com/login")]
    [InlineData("192.168.1.1", "https://192.168.1.1/")]
    public void Prepends_https_to_bare_domain(string input, string expected)
    {
        var fields = PasswordVaultRules.Normalize("Social", "user", "pw", input, "");

        Assert.Equal(expected, fields.Url);
    }

    [Theory]
    [InlineData("javascript:alert(1)")]
    [InlineData("javascript:80")]
    [InlineData("ftp://files.example")]
    [InlineData("not a url")]
    [InlineData("justaword")]
    public void Rejects_unsafe_url(string url)
    {
        Assert.Throws<PasswordVaultValidationException>(() => PasswordVaultRules.Normalize("Site", "", "", url, ""));
    }

    [Fact]
    public void Parses_exported_vault_json()
    {
        const string json = """
            {
              "items": [
                {
                  "name": "  Bank  ",
                  "username": "vince",
                  "password": "secret",
                  "url": "https://bank.example",
                  "information": "checking"
                },
                {
                  "name": "Router",
                  "username": "admin",
                  "password": "pw",
                  "url": null,
                  "information": ""
                }
              ]
            }
            """;

        var items = PasswordVaultRules.ParseExportJson(json);

        Assert.Equal(2, items.Count);
        Assert.Equal("Bank", items[0].Name);
        Assert.Equal("vince", items[0].Username);
        Assert.Equal("secret", items[0].Password);
        Assert.Equal("https://bank.example/", items[0].Url);
        Assert.Equal("checking", items[0].Notes);
        Assert.Equal("Router", items[1].Name);
        Assert.Null(items[1].Url);
    }

    [Theory]
    [InlineData("")]
    [InlineData("not json")]
    [InlineData("{}")]
    [InlineData("{\"items\":[]}")]
    public void Rejects_invalid_or_empty_import_json(string json)
    {
        Assert.Throws<PasswordVaultValidationException>(() => PasswordVaultRules.ParseExportJson(json));
    }
}
