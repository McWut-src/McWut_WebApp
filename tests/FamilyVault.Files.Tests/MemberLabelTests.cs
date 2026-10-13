using FamilyVault.Files.Security;

namespace FamilyVault.Files.Tests;

public class MemberLabelTests
{
    [Fact]
    public void Chosen_name_is_kept()
    {
        Assert.Equal("Ada", MemberLabel.Shown("Ada", "ada@family.test"));
        Assert.Equal("Ada.json", MemberLabel.VaultFileName("Ada", "ada@family.test"));
    }

    [Theory]
    [InlineData("", "vince@mcwut.com", "vince")]
    [InlineData("vince@mcwut.com", "vince@mcwut.com", "vince")]
    [InlineData(null, "member@mcwut.com", "member")]
    public void Missing_name_uses_the_email_local_part(string? displayName, string email, string expected)
    {
        Assert.Equal(expected, MemberLabel.Shown(displayName, email));
        Assert.Equal(expected + ".json", MemberLabel.VaultFileName(displayName, email));
    }

    [Fact]
    public void File_name_drops_characters_a_file_cannot_use()
    {
        Assert.Equal("Ada Lovelace.json", MemberLabel.VaultFileName("Ada Lovelace", "a@b.c"));
        Assert.Equal("Ada.json", MemberLabel.VaultFileName("A/da", "a@b.c"));
    }

    [Fact]
    public void Pale_bar_uses_navy_ink_and_dark_bar_uses_white()
    {
        Assert.Equal(MemberLabel.DarkInk, MemberLabel.Ink("#fff3a0"));
        Assert.Equal(MemberLabel.PaleInk, MemberLabel.Ink("#0b1f3a"));
        Assert.True(MemberLabel.Pale("#ffffff"));
        Assert.False(MemberLabel.Pale("#0b1f3a"));
    }
}
