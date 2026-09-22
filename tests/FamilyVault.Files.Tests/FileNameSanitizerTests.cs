using FamilyVault.Files.Contracts;
using FamilyVault.Files.Security;

namespace FamilyVault.Files.Tests;

public class FileNameSanitizerTests
{
    [Fact]
    public void Accepts_simple_name()
    {
        Assert.Equal("photo.jpg", FileNameSanitizer.Sanitize("photo.jpg"));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void Rejects_empty(string? name)
    {
        Assert.Throws<InvalidFileNameException>(() => FileNameSanitizer.Sanitize(name));
    }

    [Theory]
    [InlineData("../secret.txt")]
    [InlineData("foo/bar.txt")]
    [InlineData("foo\\bar.txt")]
    [InlineData("a\nb.txt")]
    [InlineData(".")]
    [InlineData("..")]
    public void Rejects_path_segments_and_controls(string name)
    {
        Assert.Throws<InvalidFileNameException>(() => FileNameSanitizer.Sanitize(name));
    }

    [Fact]
    public void Rejects_too_long()
    {
        Assert.Throws<InvalidFileNameException>(() => FileNameSanitizer.Sanitize(new string('a', 256)));
    }
}
