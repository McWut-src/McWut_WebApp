using FamilyVault.Files.Contracts;
using FamilyVault.Files.Data.Entities;
using FamilyVault.Files.Security;
using FamilyVault.Files.Services;

namespace FamilyVault.Files.Tests;

public class DirectMessageRulesTests
{
    [Fact]
    public void Trims_and_keeps_a_line_break()
    {
        var body = DirectMessageRules.Normalize("  Hello\r\nthere  ");

        Assert.Equal("Hello\nthere", body);
        Assert.Equal("Hello there", DirectMessageRules.Preview(body));
    }

    [Fact]
    public void Keeps_markup_as_text()
    {
        Assert.Equal("<b>hi</b>", DirectMessageRules.Normalize("<b>hi</b>"));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("\n\t")]
    public void Rejects_an_empty_message(string? body)
    {
        var error = Assert.Throws<DirectMessageValidationException>(() => DirectMessageRules.Normalize(body));
        Assert.Equal("Write a message.", error.Message);
    }

    [Fact]
    public void Rejects_a_message_over_the_limit()
    {
        var error = Assert.Throws<DirectMessageValidationException>(() => DirectMessageRules.Normalize(new string('a', 2001)));
        Assert.Equal("Keep a message to 2000 characters.", error.Message);
    }

    [Fact]
    public void Preview_stops_at_eighty_characters()
    {
        var preview = DirectMessageRules.Preview(new string('a', 90));

        Assert.Equal(81, preview.Length);
        Assert.EndsWith("…", preview);
    }
}

public class DirectMessageServiceTests
{
    private static readonly DateTimeOffset Now = DateTimeOffset.Parse("2026-10-14T15:00:00Z");

    [Fact]
    public async Task Two_members_can_exchange_a_message_and_a_stranger_cannot_read_it()
    {
        await using var fx = new SqliteFixture();
        await fx.SeedMembersAsync();
        var clock = new TestTimeProvider(Now);
        var messages = new DirectMessageService(fx.Db, clock);

        var opened = await messages.OpenAsync(SqliteFixture.OwnerId, SqliteFixture.OtherId);
        var again = await messages.OpenAsync(SqliteFixture.OtherId, SqliteFixture.OwnerId);
        Assert.Equal(opened.Id, again.Id);

        var sent = await messages.SendAsync(SqliteFixture.OwnerId, opened.Id, "  Hello\nthere  ");
        Assert.True(sent.Mine);
        Assert.Equal("Hello\nthere", sent.Body);

        var ownerList = await messages.ListAsync(SqliteFixture.OwnerId);
        var ownerRow = Assert.Single(ownerList);
        Assert.Equal("Other", ownerRow.Name);
        Assert.Equal("Hello there", ownerRow.Preview);
        Assert.True(ownerRow.FromMe);
        Assert.Equal(0, ownerRow.Unread);

        var otherList = await messages.ListAsync(SqliteFixture.OtherId);
        var otherRow = Assert.Single(otherList);
        Assert.Equal("Owner", otherRow.Name);
        Assert.Equal(1, otherRow.Unread);
        Assert.False(otherRow.FromMe);
        Assert.Equal(1, await messages.UnreadCountAsync(SqliteFixture.OtherId));
        Assert.Equal(0, await messages.UnreadCountAsync(SqliteFixture.OwnerId));

        var thread = await messages.ThreadAsync(SqliteFixture.OtherId, opened.Id, null, null);
        var message = Assert.Single(thread.Messages);
        Assert.False(message.Mine);
        Assert.False(thread.HasOlder);

        await messages.MarkReadAsync(SqliteFixture.OtherId, opened.Id, message.Id);
        Assert.Equal(0, await messages.UnreadCountAsync(SqliteFixture.OtherId));

        await Assert.ThrowsAsync<VaultNotFoundException>(() => messages.ThreadAsync(SqliteFixture.StrangerId, opened.Id, null, null));
        await Assert.ThrowsAsync<VaultNotFoundException>(() => messages.SendAsync(SqliteFixture.StrangerId, opened.Id, "nope"));
        Assert.Empty(await messages.ListAsync(SqliteFixture.StrangerId));
    }

    [Fact]
    public async Task Reading_an_earlier_message_leaves_a_later_one_unread()
    {
        await using var fx = new SqliteFixture();
        await fx.SeedMembersAsync();
        var messages = new DirectMessageService(fx.Db, new TestTimeProvider(Now));
        var opened = await messages.OpenAsync(SqliteFixture.OwnerId, SqliteFixture.OtherId);
        var first = await messages.SendAsync(SqliteFixture.OtherId, opened.Id, "one");
        await messages.SendAsync(SqliteFixture.OtherId, opened.Id, "two");

        await messages.MarkReadAsync(SqliteFixture.OwnerId, opened.Id, first.Id);

        Assert.Equal(1, await messages.UnreadCountAsync(SqliteFixture.OwnerId));
    }

    [Fact]
    public async Task A_person_cannot_message_themselves_or_someone_missing()
    {
        await using var fx = new SqliteFixture();
        await fx.SeedMembersAsync();
        var messages = new DirectMessageService(fx.Db, new TestTimeProvider(Now));

        var self = await Assert.ThrowsAsync<DirectMessageValidationException>(() => messages.OpenAsync(SqliteFixture.OwnerId, SqliteFixture.OwnerId));
        Assert.Equal("Choose another person.", self.Message);
        var missing = await Assert.ThrowsAsync<DirectMessageValidationException>(() => messages.OpenAsync(SqliteFixture.OwnerId, Guid.NewGuid()));
        Assert.Equal("That person is not on this site.", missing.Message);
    }

    [Fact]
    public async Task Names_use_the_part_before_at_and_a_bad_color_falls_back()
    {
        await using var fx = new SqliteFixture();
        await fx.SeedMembersAsync();
        var other = await fx.Db.FamilyMembers.FindAsync(SqliteFixture.OtherId);
        Assert.NotNull(other);
        other.DisplayName = "other@family.test";
        other.AccentColor = "red";
        await fx.Db.SaveChangesAsync();

        var messages = new DirectMessageService(fx.Db, new TestTimeProvider(Now));
        var opened = await messages.OpenAsync(SqliteFixture.OwnerId, SqliteFixture.OtherId);

        Assert.Equal("other", opened.Name);
        Assert.Equal("#0b1f3a", opened.Color);
    }

    [Fact]
    public async Task A_long_thread_keeps_the_latest_page_and_can_load_earlier()
    {
        await using var fx = new SqliteFixture();
        await fx.SeedMembersAsync();
        var messages = new DirectMessageService(fx.Db, new TestTimeProvider(Now));
        var opened = await messages.OpenAsync(SqliteFixture.OwnerId, SqliteFixture.OtherId);
        DirectMessageView? first = null;
        for (var i = 0; i < DirectMessageService.PageSize + 1; i++)
        {
            var sent = await messages.SendAsync(SqliteFixture.OwnerId, opened.Id, "m" + i);
            first ??= sent;
        }

        var page = await messages.ThreadAsync(SqliteFixture.OtherId, opened.Id, null, null);
        Assert.Equal(DirectMessageService.PageSize, page.Messages.Count);
        Assert.True(page.HasOlder);
        Assert.Equal("m" + DirectMessageService.PageSize, page.Messages[^1].Body);
        Assert.DoesNotContain(page.Messages, row => row.Id == first!.Id);

        var earlier = await messages.ThreadAsync(SqliteFixture.OtherId, opened.Id, null, page.Messages[0].Id);
        Assert.Contains(earlier.Messages, row => row.Id == first!.Id);
    }

    [Fact]
    public async Task ThreadAsync_with_afterId_returns_only_newer_messages()
    {
        await using var fx = new SqliteFixture();
        await fx.SeedMembersAsync();
        var messages = new DirectMessageService(fx.Db, new TestTimeProvider(Now));
        var opened = await messages.OpenAsync(SqliteFixture.OwnerId, SqliteFixture.OtherId);

        var m1 = await messages.SendAsync(SqliteFixture.OwnerId, opened.Id, "first");
        var m2 = await messages.SendAsync(SqliteFixture.OtherId, opened.Id, "second");
        var m3 = await messages.SendAsync(SqliteFixture.OwnerId, opened.Id, "third");

        var delta = await messages.ThreadAsync(SqliteFixture.OwnerId, opened.Id, afterId: m1.Id, beforeId: null);

        Assert.Equal(2, delta.Messages.Count);
        Assert.Equal(m2.Id, delta.Messages[0].Id);
        Assert.Equal(m3.Id, delta.Messages[1].Id);
    }
}
