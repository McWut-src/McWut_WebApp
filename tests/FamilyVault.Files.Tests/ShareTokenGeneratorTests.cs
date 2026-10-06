using FamilyVault.Files.Security;

namespace FamilyVault.Files.Tests;

public class ShareTokenGeneratorTests
{
    [Fact]
    public void Short_share_token_is_eight_letters_or_digits()
    {
        var seen = new HashSet<string>();
        for (var i = 0; i < 40; i++)
        {
            var token = ShareTokenGenerator.CreateShort();
            Assert.Matches("^[A-Za-z0-9]{8}$", token);
            seen.Add(token);
        }

        Assert.True(seen.Count > 30);
    }

    [Fact]
    public void Invite_token_stays_long()
    {
        var token = ShareTokenGenerator.Create();
        Assert.True(token.Length >= 20);
        Assert.DoesNotContain('+', token);
        Assert.DoesNotContain('/', token);
    }
}
