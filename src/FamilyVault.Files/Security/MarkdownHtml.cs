using Markdig;
using Markdig.Renderers;
using Markdig.Renderers.Html;
using Markdig.Renderers.Html.Inlines;
using Markdig.Syntax.Inlines;

namespace FamilyVault.Files.Security;

/// <summary>
/// Turns a note into HTML. Notes are untrusted: raw HTML is left as text,
/// and a link or image is emitted only for an absolute http(s) URL.
/// A fenced <c>mermaid</c> block stays as text inside <c>pre.mermaid</c> so the browser can draw it.
/// </summary>
public static class MarkdownHtml
{
    private static readonly MarkdownPipeline Pipeline = new MarkdownPipelineBuilder()
        .DisableHtml()
        .UseEmphasisExtras()
        .UsePipeTables()
        .UseListExtras()
        .UseTaskLists()
        .UseAutoLinks()
        .UseDiagrams()
        .Use(new SafeLinkExtension())
        .Build();

    public static string ToHtml(string? markdown)
    {
        if (string.IsNullOrEmpty(markdown))
        {
            return "";
        }

        if (markdown.Length > ReadableFiles.MaxPreviewBytes)
        {
            return "<p class=\"note-skip\">This note is too long to read here.</p>";
        }

        return Markdown.ToHtml(markdown, Pipeline);
    }

    private sealed class SafeLinkExtension : IMarkdownExtension
    {
        public void Setup(MarkdownPipelineBuilder pipeline)
        {
        }

        public void Setup(MarkdownPipeline pipeline, IMarkdownRenderer renderer)
        {
            if (renderer is not HtmlRenderer html)
            {
                return;
            }

            for (var i = 0; i < html.ObjectRenderers.Count; i++)
            {
                if (html.ObjectRenderers[i] is LinkInlineRenderer)
                {
                    html.ObjectRenderers[i] = new SafeLinkInlineRenderer();
                    return;
                }
            }
        }
    }

    private sealed class SafeLinkInlineRenderer : HtmlObjectRenderer<LinkInline>
    {
        protected override void Write(HtmlRenderer renderer, LinkInline link)
        {
            var url = link.GetDynamicUrl != null ? link.GetDynamicUrl() ?? link.Url : link.Url;
            if (!renderer.EnableHtmlForInline || !IsSafeHttp(url))
            {
                WriteLabel(renderer, link);
                return;
            }

            if (link.IsImage)
            {
                renderer.Write("<img src=\"");
                renderer.WriteEscapeUrl(url);
                renderer.Write("\" alt=\"");
                WriteLabel(renderer, link);
                renderer.Write("\" referrerpolicy=\"no-referrer\" />");
                return;
            }

            renderer.Write("<a href=\"");
            renderer.WriteEscapeUrl(url);
            renderer.Write("\" rel=\"noopener noreferrer\"");
            if (!string.IsNullOrEmpty(link.Title))
            {
                renderer.Write(" title=\"");
                renderer.WriteEscape(link.Title);
                renderer.Write("\"");
            }

            renderer.Write(">");
            renderer.WriteChildren(link);
            renderer.Write("</a>");
        }

        private static void WriteLabel(HtmlRenderer renderer, LinkInline link)
        {
            var was = renderer.EnableHtmlForInline;
            renderer.EnableHtmlForInline = false;
            renderer.WriteChildren(link);
            renderer.EnableHtmlForInline = was;
        }

        private static bool IsSafeHttp(string? url)
        {
            if (string.IsNullOrEmpty(url) || url.Length > 2000)
            {
                return false;
            }

            foreach (var c in url)
            {
                if (c <= 32 || c is '<' or '>' or '"' or '\'' or '`' or '\\' or '\u007f')
                {
                    return false;
                }
            }

            if (!Uri.TryCreate(url, UriKind.Absolute, out var parsed))
            {
                return false;
            }

            if (!string.IsNullOrEmpty(parsed.UserInfo))
            {
                return false;
            }

            return parsed.Scheme.Equals("http", StringComparison.OrdinalIgnoreCase)
                   || parsed.Scheme.Equals("https", StringComparison.OrdinalIgnoreCase);
        }
    }
}
