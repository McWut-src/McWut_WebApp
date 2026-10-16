using FamilyVault.Files.Security;

namespace FamilyVault.Files.Tests;

public class OpenRouterRulesTests
{
    private static string SampleKey(char fill) => "sk-or-v1-" + new string(fill, 64);

    private static readonly string Key = SampleKey('a');

    [Fact]
    public void Accepts_a_key_and_keeps_the_last_four()
    {
        var clean = OpenRouterRules.NormalizeKey("  " + Key + "\n");

        Assert.Equal(Key, clean);
        Assert.Equal("aaaa", OpenRouterRules.Hint(clean));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("sk-or-v1-short")]
    [InlineData("sk-abc")]
    [InlineData("not a key")]
    public void Rejects_a_bad_key(string? key)
    {
        Assert.Throws<OpenRouterValidationException>(() => OpenRouterRules.NormalizeKey(key));
    }

    [Fact]
    public void Zero_prices_are_free()
    {
        Assert.True(OpenRouterRules.IsFree("0", "0.0", "0", null));
        Assert.False(OpenRouterRules.IsFree("0.00001", "0", "0", "0"));
        Assert.False(OpenRouterRules.IsFree(null, "0", "0", "0"));
        Assert.False(OpenRouterRules.IsFree("0", "0", "1", "0"));
    }

    [Fact]
    public void Model_list_keeps_only_free_models()
    {
        const string json = """
            {
              "data": [
                {"id":"paid/one","name":"Paid","pricing":{"prompt":"0.00001","completion":"0","request":"0","image":"0"}},
                {"id":"free/one:free","name":" Free One ","pricing":{"prompt":"0","completion":0,"request":"0","image":"0"}},
                {"id":"free/extra","name":"Extra","pricing":{"prompt":"0","completion":"0","internal_reasoning":"0.2"}},
                {"id":"not a model","name":"Bad","pricing":{"prompt":"0","completion":"0"}}
              ],
              "links": { "next": "/api/v1/models?offset=2" }
            }
            """;

        var page = OpenRouterRules.ParseModelPage(json);

        var model = Assert.Single(page.Models);
        Assert.Equal("free/one:free", model.Id);
        Assert.Equal("Free One", model.Name);
        Assert.False(model.Paid);
        Assert.Null(model.ContextLength);
        Assert.Null(model.About);
        Assert.Equal("/api/v1/models?offset=2", page.Next);

        var withPaid = OpenRouterRules.ParseModelPage(json, includePaid: true);
        Assert.Equal(3, withPaid.Models.Count);
        Assert.True(withPaid.Models[0].Paid);
        Assert.False(withPaid.Models[1].Paid);
        Assert.True(withPaid.Models[2].Paid);
    }

    [Fact]
    public void Model_list_keeps_context_and_a_short_note()
    {
        var longAbout = new string('a', 40) + " " + new string('b', 300);
        var json = $$"""
            {
              "data": [
                {
                  "id": "free/one:free",
                  "name": "Free One",
                  "description": "A small [model](https://example.com) for notes. {{longAbout}}",
                  "context_length": 8192,
                  "expiration_date": "2026-10-31",
                  "architecture": { "input_modalities": ["text", "image", "audio"] },
                  "top_provider": { "max_completion_tokens": 1024 },
                  "pricing": {"prompt":"0","completion":"0"}
                },
                {
                  "id": "free/secret:free",
                  "name": "Secret",
                  "description": "{{SampleKey('a')}}",
                  "context_length": 100,
                  "pricing": {"prompt":"0","completion":"0"}
                }
              ]
            }
            """;

        var page = OpenRouterRules.ParseModelPage(json);

        Assert.Equal(2, page.Models.Count);
        var model = page.Models[0];
        Assert.Equal(8192, model.ContextLength);
        Assert.Equal(1024, model.MaxOutput);
        Assert.Equal("2026-10-31", model.Expires);
        Assert.Equal("images, audio", model.Inputs);
        Assert.StartsWith("A small model for notes.", model.About);
        Assert.EndsWith("…", model.About);
        Assert.True(model.About!.Length <= OpenRouterRules.AboutMax + 1);
        Assert.Null(page.Models[1].About);
    }

    [Fact]
    public void A_saved_chat_is_a_titled_note_without_a_key()
    {
        var key = SampleKey('b');
        var chat = OpenRouterRules.NormalizeChat("free/one:free",
        [
            new("user", "Plan the weekend\nBring " + key),
            new("assistant", "Saturday works.")
        ]);

        var file = OpenRouterRules.ToChatFile("Free One", chat);

        Assert.Equal("Plan the weekend", file.Title);
        Assert.Equal("Plan the weekend.md", file.FileName);
        Assert.Equal(OpenRouterRules.ChatContentType, "text/x-mcwut-chat");
        Assert.Contains("Model: Free One (free/one:free)", file.Markdown);
        Assert.Contains("[key removed]", file.Markdown);
        Assert.DoesNotContain("sk-or-v1-", file.Markdown, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("## You", file.Markdown);
        Assert.Contains("## Reply", file.Markdown);

        var secretTitle = OpenRouterRules.ToChatFile(null, OpenRouterRules.NormalizeChat("free/one",
            [new("user", key)]));
        Assert.Equal("Chat", secretTitle.Title);
        Assert.Equal("Chat.md", secretTitle.FileName);
    }

    [Fact]
    public void Chat_trims_and_rejects_a_long_thread()
    {
        var chat = OpenRouterRules.NormalizeChat(" free/one:free ",
        [
            new(" system ", "  Be brief. "),
            new("user", "  Hello ")
        ]);

        Assert.Equal("free/one:free", chat.Model);
        Assert.Equal(2, chat.Messages.Count);
        Assert.Equal("system", chat.Messages[0].Role);
        Assert.Equal("Be brief.", chat.Messages[0].Content);
        Assert.Equal("Hello", chat.Messages[1].Content);
        Assert.Throws<OpenRouterValidationException>(() => OpenRouterRules.NormalizeChat("paid/one", null));
        Assert.Throws<OpenRouterValidationException>(() => OpenRouterRules.NormalizeChat("free/one",
            [new("tool", "no")]));
        Assert.Throws<OpenRouterValidationException>(() => OpenRouterRules.NormalizeChat("free/one",
            Enumerable.Repeat(new OpenRouterTurnInput("user", "hi"), OpenRouterRules.MaxMessages + 1).ToList()));
    }

    [Fact]
    public void Reply_and_error_text_stay_plain()
    {
        Assert.Equal("Hello there", OpenRouterRules.ReadReply("""
            {"choices":[{"message":{"role":"assistant","content":" Hello there "}}]}
            """));
        Assert.Equal("Hello\nthere", OpenRouterRules.ReadReply("""
            {"choices":[{"message":{"content":[{"type":"text","text":"Hello"},{"type":"text","text":"there"}]}}]}
            """));
        Assert.Equal("Busy", OpenRouterRules.ReadErrorMessage("""{"error":{"message":" Busy "}}"""));
        Assert.Null(OpenRouterRules.ReadErrorMessage("""{"error":{"message":"bad sk-or-v1-secret"}}"""));
    }

    [Fact]
    public void Markdown_instruction_names_the_viewer_and_hides_keys()
    {
        var text = OpenRouterRules.MarkdownInstruction;
        Assert.Contains("mermaid", text, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("table", text, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("gantt", text, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("mindmap", text, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("sk-or", text, StringComparison.OrdinalIgnoreCase);

        var chat = OpenRouterRules.NormalizeChat("free/one",
            Enumerable.Repeat(new OpenRouterTurnInput("user", "hi"), OpenRouterRules.MaxMessages).ToList());
        var sent = OpenRouterRules.ForMarkdownReply(chat.Messages);
        Assert.Equal(OpenRouterRules.MaxMessages + 1, sent.Count);
        Assert.Equal("system", sent[0].Role);
        Assert.Equal(text, sent[0].Content);
        Assert.Equal(OpenRouterRules.MaxMessages, chat.Messages.Count);
        Assert.Equal(sent.Count, OpenRouterRules.ForMarkdownReply(sent).Count);
    }

    [Fact]
    public void Stream_piece_reads_content_reasoning_and_a_scrubbed_error()
    {
        var content = OpenRouterRules.ReadStreamPiece("""{"choices":[{"delta":{"content":"Hi"}}]}""");
        Assert.Equal("Hi", content.Content);
        Assert.Null(content.Reasoning);
        Assert.Null(content.Error);

        var thought = OpenRouterRules.ReadStreamPiece("""{"choices":[{"delta":{"reasoning":"think"}}]}""");
        Assert.Null(thought.Content);
        Assert.Equal("think", thought.Reasoning);

        var alternate = OpenRouterRules.ReadStreamPiece("""{"choices":[{"delta":{"reasoning_content":"more"}}]}""");
        Assert.Equal("more", alternate.Reasoning);

        var empty = OpenRouterRules.ReadStreamPiece("""{"choices":[{"delta":{"role":"assistant","content":""}}]}""");
        Assert.Null(empty.Content);
        Assert.Null(empty.Error);

        var secret = OpenRouterRules.ReadStreamPiece("""{"error":{"message":"bad sk-or-v1-secret"}}""");
        Assert.Equal("OpenRouter could not answer.", secret.Error);
        Assert.DoesNotContain("sk-or", secret.Error, StringComparison.OrdinalIgnoreCase);
    }
}
