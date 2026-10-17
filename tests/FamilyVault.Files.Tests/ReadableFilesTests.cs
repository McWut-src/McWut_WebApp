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
    [InlineData("Chat.md", "text/x-mcwut-chat", "text/x-mcwut-chat")]
    [InlineData("notes.md", "text/markdown", "text/markdown")]
    [InlineData("clip.mp4", "application/octet-stream", "video/mp4")]
    [InlineData("voice.mp3", "application/octet-stream", "audio/mpeg")]
    public void Infers_text_types_and_leaves_markup_alone(string name, string declared, string expected)
    {
        Assert.Equal(expected, ReadableFiles.InferContentType(name, declared));
    }

    [Theory]
    [InlineData("notes.md", "application/octet-stream", true, true)]
    [InlineData("note.txt", "text/plain", true, false)]
    [InlineData("data.csv", "text/csv", true, false)]
    [InlineData("data.json", "application/json", true, false)]
    [InlineData("app.py", "application/octet-stream", true, false)]
    [InlineData("script.js", "application/javascript", true, false)]
    [InlineData("index.ts", "application/octet-stream", true, false)]
    [InlineData("Program.cs", "application/octet-stream", true, false)]
    [InlineData("styles.css", "text/css", true, false)]
    [InlineData("config.yaml", "application/octet-stream", true, false)]
    [InlineData("config.yml", "text/yaml", true, false)]
    [InlineData("setup.sh", "application/octet-stream", true, false)]
    [InlineData("query.sql", "application/octet-stream", true, false)]
    [InlineData("pom.xml", "application/octet-stream", true, false)]
    [InlineData(".env", "application/octet-stream", true, false)]
    [InlineData(".gitignore", "application/octet-stream", true, false)]
    [InlineData("Dockerfile", "application/octet-stream", true, false)]
    [InlineData("page.html", "text/html", false, false)]
    [InlineData("page.html", "application/octet-stream", false, false)]
    [InlineData("pic.svg", "image/svg+xml", false, false)]
    [InlineData("photo.png", "image/png", false, false)]
    [InlineData("Chat.md", "text/x-mcwut-chat", true, true)]
    public void Readable_means_text_not_html_or_svg(string name, string type, bool readable, bool markdown)
    {
        Assert.Equal(readable, ReadableFiles.IsReadable(type, name));
        Assert.Equal(markdown, ReadableFiles.IsMarkdown(type, name));
    }

    [Fact]
    public void A_saved_chat_can_be_shown_in_the_browser()
    {
        Assert.True(ReadableFiles.IsInlineText("text/x-mcwut-chat"));
        Assert.False(ReadableFiles.IsInlineText("text/html"));
        Assert.True(ReadableFiles.IsInlineText("text/x-python"));
        Assert.True(ReadableFiles.IsInlineText("application/json"));
        Assert.True(ReadableFiles.IsInlineText("application/xml"));
        Assert.True(ReadableFiles.IsInlineText("text/yaml"));
    }
}
