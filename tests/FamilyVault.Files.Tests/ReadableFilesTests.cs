using FamilyVault.Files.Security;

namespace FamilyVault.Files.Tests;

public class ReadableFilesTests
{
    [Theory]
    [InlineData("notes.md", "application/octet-stream", "text/markdown")]
    [InlineData("Notes.MD", "", "text/markdown")]
    [InlineData("readme.md", "text/plain", "text/markdown")]
    [InlineData("note.txt", "application/octet-stream", "text/plain")]
    [InlineData("data.json", "application/octet-stream", "application/json")]
    [InlineData("page.html", "application/octet-stream", "application/octet-stream")]
    [InlineData("page.html", "text/html", "text/html")]
    [InlineData("pic.svg", "image/svg+xml", "image/svg+xml")]
    [InlineData("photo.png", "image/png", "image/png")]
    public void Infers_text_types_and_leaves_markup_alone(string name, string declared, string expected)
    {
        Assert.Equal(expected, ReadableFiles.InferContentType(name, declared));
    }

    [Theory]
    [InlineData("notes.md", "application/octet-stream", true, true)]
    [InlineData("note.txt", "text/plain", true, false)]
    [InlineData("data.csv", "text/csv", true, false)]
    [InlineData("data.json", "application/json", true, false)]
    [InlineData("page.html", "text/html", false, false)]
    [InlineData("page.html", "application/octet-stream", false, false)]
    [InlineData("pic.svg", "image/svg+xml", false, false)]
    [InlineData("photo.png", "image/png", false, false)]
    public void Readable_means_text_not_html_or_svg(string name, string type, bool readable, bool markdown)
    {
        Assert.Equal(readable, ReadableFiles.IsReadable(type, name));
        Assert.Equal(markdown, ReadableFiles.IsMarkdown(type, name));
    }
}
