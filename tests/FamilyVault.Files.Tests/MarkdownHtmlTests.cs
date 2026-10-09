using FamilyVault.Files.Security;

namespace FamilyVault.Files.Tests;

public class MarkdownHtmlTests
{
    [Fact]
    public void Renders_common_markdown()
    {
        var html = MarkdownHtml.ToHtml("# Title\n\nHello **world** and ~~gone~~.\n\n- a\n- b\n\n| A | B |\n| - | - |\n| 1 | 2 |\n");

        Assert.Contains("<h1>Title</h1>", html, StringComparison.Ordinal);
        Assert.Contains("<strong>world</strong>", html, StringComparison.Ordinal);
        Assert.Contains("<del>gone</del>", html, StringComparison.Ordinal);
        Assert.Contains("<li>a</li>", html, StringComparison.Ordinal);
        Assert.Contains("<table>", html, StringComparison.Ordinal);
    }

    [Theory]
    [InlineData("See <script>alert(1)</script>")]
    [InlineData("<img src=x onerror=alert(1)>")]
    [InlineData("# <script>alert(1)</script>")]
    public void Raw_html_stays_text(string markdown)
    {
        var html = MarkdownHtml.ToHtml(markdown);

        Assert.DoesNotContain("<script", html, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("<img", html, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("&lt;", html, StringComparison.Ordinal);
    }

    [Fact]
    public void Keeps_https_links_and_images()
    {
        var html = MarkdownHtml.ToHtml("[site](https://example.com/a?b=1&c=2)\n\n![pic](https://example.com/a.png)");

        Assert.Contains("href=\"https://example.com/a?b=1&amp;c=2\"", html, StringComparison.Ordinal);
        Assert.Contains("rel=\"noopener noreferrer\"", html, StringComparison.Ordinal);
        Assert.Contains("<img src=\"https://example.com/a.png\"", html, StringComparison.Ordinal);
        Assert.Contains("referrerpolicy=\"no-referrer\"", html, StringComparison.Ordinal);
        Assert.DoesNotContain("target=", html, StringComparison.Ordinal);
    }

    [Theory]
    [InlineData("[click](javascript:alert(1))")]
    [InlineData("[click](javascript&#58;alert(1))")]
    [InlineData("[click](JavaScript:alert(1))")]
    [InlineData("[click](data:text/html,hi)")]
    [InlineData("[click](https://user:pass@example.com/)")]
    [InlineData("[click](/files)")]
    [InlineData("ftp://example.com/file")]
    [InlineData("[me](mailto:a@b.c)")]
    public void Drops_unsafe_links(string markdown)
    {
        var html = MarkdownHtml.ToHtml(markdown);

        Assert.DoesNotContain("<a ", html, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("javascript:", html, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("user:pass", html, StringComparison.Ordinal);
    }

    [Theory]
    [InlineData("![alt](javascript:alert(1))")]
    [InlineData("![alt](data:text/html,<script>alert(1)</script>)")]
    public void Drops_unsafe_images(string markdown)
    {
        var html = MarkdownHtml.ToHtml(markdown);

        Assert.DoesNotContain("<img", html, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("<script", html, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("alt", html, StringComparison.Ordinal);
    }

    [Fact]
    public void Mermaid_fence_keeps_gantt_and_mindmap_source()
    {
        var html = MarkdownHtml.ToHtml("""
            ```mermaid
            gantt
                title Plan
                dateFormat YYYY-MM-DD
                section Work
                Task :a1, 2026-01-01, 7d
            ```

            ```mermaid
            mindmap
              root((Home))
                Files
                Vault
            ```
            """);

        Assert.Equal(2, Count(html, "<pre class=\"mermaid\">"));
        Assert.Contains("gantt", html, StringComparison.Ordinal);
        Assert.Contains("mindmap", html, StringComparison.Ordinal);
        Assert.Contains("root((Home))", html, StringComparison.Ordinal);
        Assert.DoesNotContain("<code", html, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void Mermaid_source_cannot_break_out_of_the_block()
    {
        var html = MarkdownHtml.ToHtml("""
            ```mermaid
            mindmap
              root((</pre><script>alert(1)</script>))
            ```
            """);

        Assert.DoesNotContain("<script", html, StringComparison.OrdinalIgnoreCase);
        Assert.Equal(1, Count(html, "<pre"));
        Assert.Equal(1, Count(html, "</pre>"));
        Assert.Contains("&lt;", html, StringComparison.Ordinal);
        Assert.Contains("mindmap", html, StringComparison.Ordinal);
    }

    [Fact]
    public void Ordinary_code_is_escaped()
    {
        var html = MarkdownHtml.ToHtml("```\n<script>alert(1)</script>\n```");

        Assert.Contains("<pre><code>", html, StringComparison.Ordinal);
        Assert.DoesNotContain("<script>", html, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("&lt;script&gt;", html, StringComparison.Ordinal);
    }

    [Fact]
    public void Refuses_an_oversized_note()
    {
        var html = MarkdownHtml.ToHtml(new string('a', (int)ReadableFiles.MaxPreviewBytes + 1));

        Assert.Contains("too long", html, StringComparison.Ordinal);
        Assert.DoesNotContain("<script", html, StringComparison.OrdinalIgnoreCase);
        Assert.True(html.Length < 200);
    }

    [Fact]
    public void Empty_input_is_empty_html()
    {
        Assert.Equal("", MarkdownHtml.ToHtml(null));
        Assert.Equal("", MarkdownHtml.ToHtml(""));
    }

    private static int Count(string text, string value)
    {
        var count = 0;
        var index = 0;
        while ((index = text.IndexOf(value, index, StringComparison.Ordinal)) >= 0)
        {
            count++;
            index += value.Length;
        }

        return count;
    }
}
