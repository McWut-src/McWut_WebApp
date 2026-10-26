using FamilyVault.Files.Configuration;
using FamilyVault.Files.Contracts;
using FamilyVault.Files.Data.Entities;
using FamilyVault.Files.Security;
using FamilyVault.Files.Services;
using FamilyVault.Files.Storage;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;

namespace FamilyVault.Files.Tests;

public class KidsChatEnhancementsTests
{
    private static readonly DateTimeOffset Now = DateTimeOffset.Parse("2026-10-24T12:00:00Z");
    private static readonly Guid FourthMemberId = Guid.Parse("dddddddd-dddd-dddd-dddd-dddddddddddd");

    [Fact]
    public async Task Three_kids_can_chat_in_a_private_group_and_non_members_cannot_access_it()
    {
        await using var fx = new SqliteFixture();
        await fx.SeedMembersAsync();
        fx.Db.FamilyMembers.Add(new FamilyMemberEntity
        {
            UserId = FourthMemberId,
            DisplayName = "CousinLeo",
            Email = "leo@family.test",
            AccentColor = "#1f6feb",
            FirstSeenAt = Now,
            LastSeenAt = Now
        });
        await fx.Db.SaveChangesAsync();

        var clock = new TestTimeProvider(Now);
        var typing = new TypingPresenceService(clock);
        var messages = new DirectMessageService(fx.Db, clock, typing);

        // Kid 1 (OwnerId) starts a private group with Kid 2 (OtherId) and Kid 3 (FourthMemberId).
        // StrangerId is NOT invited.
        var group = await messages.CreateGroupAsync(
            SqliteFixture.OwnerId,
            [SqliteFixture.OtherId, FourthMemberId],
            title: null);

        Assert.True(group.IsGroup);
        Assert.Null(group.CustomTitle);
        Assert.Equal("Other, CousinLeo", group.Name);
        Assert.Equal(3, group.Members!.Count);

        // Creating an unnamed group with the exact same 3 kids returns the same group conversation.
        var duplicate = await messages.CreateGroupAsync(
            FourthMemberId,
            [SqliteFixture.OwnerId, SqliteFixture.OtherId],
            title: null);
        Assert.Equal(group.Id, duplicate.Id);

        // Creating multiple named groups by the same creator succeeds without unique-index collisions.
        var namedGroupA = await messages.CreateGroupAsync(
            SqliteFixture.OwnerId,
            [SqliteFixture.OtherId, FourthMemberId],
            title: "Minecraft Builders");
        var namedGroupB = await messages.CreateGroupAsync(
            SqliteFixture.OwnerId,
            [SqliteFixture.OtherId, FourthMemberId],
            title: "Art Club");
        Assert.NotEqual(namedGroupA.Id, namedGroupB.Id);
        Assert.Equal("Minecraft Builders", namedGroupA.Name);
        Assert.Equal("Art Club", namedGroupB.Name);

        // Send a message in the first group and check per-member unread counts & read receipts.
        var firstMsg = await messages.SendAsync(SqliteFixture.OwnerId, group.Id, "Hey cousins!");
        Assert.False(firstMsg.ReadByOther);
        Assert.Equal(0, await messages.UnreadCountAsync(SqliteFixture.OwnerId));
        Assert.Equal(1, await messages.UnreadCountAsync(SqliteFixture.OtherId));
        Assert.Equal(1, await messages.UnreadCountAsync(FourthMemberId));
        Assert.Equal(0, await messages.UnreadCountAsync(SqliteFixture.StrangerId));

        // Non-member (StrangerId) cannot list, read, send, react, or rename the private group.
        Assert.Empty(await messages.ListAsync(SqliteFixture.StrangerId));
        await Assert.ThrowsAsync<VaultNotFoundException>(() =>
            messages.ThreadAsync(SqliteFixture.StrangerId, group.Id, null, null));
        await Assert.ThrowsAsync<VaultNotFoundException>(() =>
            messages.SendAsync(SqliteFixture.StrangerId, group.Id, "Let me in"));
        await Assert.ThrowsAsync<VaultNotFoundException>(() =>
            messages.ToggleReactionAsync(SqliteFixture.StrangerId, group.Id, firstMsg.Id, "👍"));
        await Assert.ThrowsAsync<VaultNotFoundException>(() =>
            messages.UpdateGroupAsync(SqliteFixture.StrangerId, group.Id, "Hacked", true, null));

        // Kid 2 reads the message -> Kid 2 unread drops to 0, Kid 3 still has 1 unread, and Kid 1 sees ReadByOther = true.
        await messages.MarkReadAsync(SqliteFixture.OtherId, group.Id, firstMsg.Id);
        Assert.Equal(0, await messages.UnreadCountAsync(SqliteFixture.OtherId));
        Assert.Equal(1, await messages.UnreadCountAsync(FourthMemberId));

        var ownerThread = await messages.ThreadAsync(SqliteFixture.OwnerId, group.Id, null, null);
        Assert.True(Assert.Single(ownerThread.Messages).ReadByOther);
        Assert.Contains(firstMsg.Id, ownerThread.ReadMessageIds!);
    }

    [Fact]
    public async Task Group_members_can_rename_group_and_invite_another_member()
    {
        await using var fx = new SqliteFixture();
        await fx.SeedMembersAsync();
        fx.Db.FamilyMembers.Add(new FamilyMemberEntity
        {
            UserId = FourthMemberId,
            DisplayName = "Maya",
            Email = "maya@family.test",
            FirstSeenAt = Now,
            LastSeenAt = Now
        });
        await fx.Db.SaveChangesAsync();

        var messages = new DirectMessageService(fx.Db, new TestTimeProvider(Now));
        var group = await messages.CreateGroupAsync(
            SqliteFixture.OwnerId,
            [SqliteFixture.OtherId, FourthMemberId],
            title: "Kids Room");

        await messages.SendAsync(SqliteFixture.OwnerId, group.Id, "Message before Stranger joins");

        var updated = await messages.UpdateGroupAsync(
            SqliteFixture.OtherId,
            group.Id,
            title: "Super Squad",
            updateTitle: true,
            addUserIds: [SqliteFixture.StrangerId]);

        Assert.Equal("Super Squad", updated.Name);
        Assert.Equal("Super Squad", updated.CustomTitle);
        Assert.Equal(4, updated.Members!.Count);

        // Newly invited member starts with 0 unread for prior messages, then gets unread on new messages.
        Assert.Equal(0, await messages.UnreadCountAsync(SqliteFixture.StrangerId));
        await messages.SendAsync(FourthMemberId, group.Id, "Welcome!");
        Assert.Equal(1, await messages.UnreadCountAsync(SqliteFixture.StrangerId));
    }

    [Fact]
    public async Task Voice_notes_auto_expire_and_purge_after_seven_days()
    {
        await using var fx = new SqliteFixture();
        await fx.SeedMembersAsync();
        var clock = new TestTimeProvider(Now);
        var root = Directory.CreateTempSubdirectory();
        try
        {
            var options = Options.Create(new FilesOptions
            {
                Local = new LocalFilesOptions { RootPath = root.FullName },
                SoftDeleteGraceDays = 7
            });
            var store = new LocalDiskObjectStore(options, new TestEnv());
            var access = new FileAccessService(fx.Db, clock, new PasswordHasher<object>());
            var messages = new DirectMessageService(fx.Db, clock);
            var lifecycle = new FileLifecycle(fx.Db, store, clock, options);

            var voiceFile = new StoredFileEntity
            {
                Id = Guid.NewGuid(),
                OwnerUserId = SqliteFixture.OwnerId,
                OriginalFileName = "voice-note.webm",
                ContentType = "audio/webm",
                SizeBytes = 6,
                StorageKey = $"{SqliteFixture.OwnerId:N}/{Guid.NewGuid():N}",
                Status = FileStatus.Ready,
                IsChatOnly = true,
                CreatedAt = Now,
                ExpiresAt = null // Even if omitted on upload, DirectMessageService enforces 7-day expiry
            };
            fx.Db.StoredFiles.Add(voiceFile);
            await fx.Db.SaveChangesAsync();

            await using (var audioStream = new MemoryStream("opus!!"u8.ToArray()))
            {
                await store.PutAsync(voiceFile.StorageKey, audioStream, 6);
            }

            var conv = await messages.OpenAsync(SqliteFixture.OwnerId, SqliteFixture.OtherId);
            var sent = await messages.SendAsync(
                SqliteFixture.OwnerId,
                conv.Id,
                new SendDirectMessageRequest(
                    Body: "",
                    AttachmentFileId: voiceFile.Id,
                    AttachmentType: "audio"));

            var expectedExpiry = Now.AddDays(7);
            Assert.Equal(expectedExpiry, sent.ExpiresAt);
            Assert.NotNull(sent.Attachment);
            Assert.Equal("audio", sent.Attachment!.Kind);
            Assert.Equal(expectedExpiry, sent.Attachment.ExpiresAt);

            // Recipient can stream/download the voice note before 7 days.
            var recipientCtx = new AccessContext(SqliteFixture.OtherId, null, null);
            Assert.True((await access.AuthorizeFileAsync(recipientCtx, voiceFile.Id, AccessIntent.Download)).Allowed);

            // Advance clock past 7 days (7 days + 1 minute).
            clock.UtcNow = Now.AddDays(7).AddMinutes(1);

            // Immediately hidden from ThreadAsync and denied by FileAccessService even before background sweep runs.
            var threadAfterExpiry = await messages.ThreadAsync(SqliteFixture.OtherId, conv.Id, null, null);
            Assert.Empty(threadAfterExpiry.Messages);
            Assert.False((await access.AuthorizeFileAsync(recipientCtx, voiceFile.Id, AccessIntent.Download)).Allowed);

            // Background sweep deletes the audio blob, soft-deletes StoredFile, and deletes the DirectMessage row.
            await lifecycle.SweepExpiredAsync();

            Assert.False(await store.ExistsAsync(voiceFile.StorageKey));
            Assert.Null(await fx.Db.DirectMessages.FindAsync(sent.Id));
            Assert.NotNull((await fx.Db.StoredFiles.FindAsync(voiceFile.Id))!.DeletedAt);
        }
        finally
        {
            root.Delete(true);
        }
    }

    [Fact]
    public async Task Reactions_stickers_and_quote_replies_work_and_prevent_cross_chat_quote_leaks()
    {
        await using var fx = new SqliteFixture();
        await fx.SeedMembersAsync();
        var clock = new TestTimeProvider(Now);
        var messages = new DirectMessageService(fx.Db, clock);

        var chat1 = await messages.OpenAsync(SqliteFixture.OwnerId, SqliteFixture.OtherId);
        var secretChat = await messages.OpenAsync(SqliteFixture.OtherId, SqliteFixture.StrangerId);
        var secretMsg = await messages.SendAsync(SqliteFixture.StrangerId, secretChat.Id, "Top secret");

        // Send a sticker in chat1
        Assert.True(DirectMessageRules.TryParseSticker("[sticker:unicorn-magic]", out var slug));
        Assert.Equal("unicorn-magic", slug);
        Assert.False(DirectMessageRules.TryParseSticker("[sticker:not-real]", out _));

        var stickerMsg = await messages.SendAsync(SqliteFixture.OwnerId, chat1.Id, "[sticker:unicorn-magic]");
        var list = await messages.ListAsync(SqliteFixture.OtherId);
        Assert.Equal("🎨 Sticker", Assert.Single(list, c => c.Id == chat1.Id).Preview);

        // Quote-reply to the sticker message
        var reply = await messages.SendAsync(
            SqliteFixture.OtherId,
            chat1.Id,
            new SendDirectMessageRequest(
                Body: "Love that unicorn!",
                ReplyToMessageId: stickerMsg.Id));
        Assert.NotNull(reply.Quote);
        Assert.Equal(stickerMsg.Id, reply.Quote!.MessageId);
        Assert.Equal("Owner", reply.Quote.Author);
        Assert.Equal("🎨 Sticker", reply.Quote.Snippet);

        // Attempting to quote a message from a different conversation ignores the foreign ReplyToMessageId
        var crossQuoteAttempt = await messages.SendAsync(
            SqliteFixture.OtherId,
            chat1.Id,
            new SendDirectMessageRequest(
                Body: "Trying to quote another thread",
                ReplyToMessageId: secretMsg.Id));
        Assert.Null(crossQuoteAttempt.Quote);

        // Emoji reactions: Owner & Other react with ❤️, then Owner toggles ❤️ off; invalid emoji is rejected
        var r1 = await messages.ToggleReactionAsync(SqliteFixture.OwnerId, chat1.Id, reply.Id, "❤️");
        Assert.Single(r1);
        Assert.Equal(1, r1[0].Count);
        Assert.True(r1[0].Mine);

        var r2 = await messages.ToggleReactionAsync(SqliteFixture.OtherId, chat1.Id, reply.Id, "❤️");
        Assert.Single(r2);
        Assert.Equal(2, r2[0].Count);
        Assert.Contains("Owner", r2[0].Names);
        Assert.Contains("Other", r2[0].Names);

        var r3 = await messages.ToggleReactionAsync(SqliteFixture.OwnerId, chat1.Id, reply.Id, "❤️");
        Assert.Single(r3);
        Assert.Equal(1, r3[0].Count);
        Assert.False(r3[0].Mine);

        await Assert.ThrowsAsync<DirectMessageValidationException>(() =>
            messages.ToggleReactionAsync(SqliteFixture.OwnerId, chat1.Id, reply.Id, "🚫"));

        // Verify each meme/youth reaction is accepted
        foreach (var em in new[] { "💀", "😭", "🔥", "👍", "🗿", "👀", "🫡" })
        {
            var reactRes = await messages.ToggleReactionAsync(SqliteFixture.OwnerId, chat1.Id, reply.Id, em);
            Assert.Contains(reactRes, r => r.Emoji == em && r.Mine);
        }
    }

    [Fact]
    public async Task Chat_attachments_authorize_participants_without_cluttering_my_files_or_exposing_to_strangers()
    {
        await using var fx = new SqliteFixture();
        await fx.SeedMembersAsync();
        var clock = new TestTimeProvider(Now);
        var hasher = new PasswordHasher<object>();
        var access = new FileAccessService(fx.Db, clock, hasher);
        var library = new FileLibrary(fx.Db, null!, null!, clock, hasher);
        var messages = new DirectMessageService(fx.Db, clock);

        var chatSnap = new StoredFileEntity
        {
            Id = Guid.NewGuid(),
            OwnerUserId = SqliteFixture.OwnerId,
            OriginalFileName = "doodle.png",
            ContentType = "image/png",
            SizeBytes = 128,
            StorageKey = $"{SqliteFixture.OwnerId:N}/snap",
            Status = FileStatus.Ready,
            IsChatOnly = true,
            CreatedAt = Now
        };
        var savedDriveFile = new StoredFileEntity
        {
            Id = Guid.NewGuid(),
            OwnerUserId = SqliteFixture.OwnerId,
            OriginalFileName = "vacation.jpg",
            ContentType = "image/jpeg",
            SizeBytes = 256,
            StorageKey = $"{SqliteFixture.OwnerId:N}/vacation",
            Status = FileStatus.Ready,
            IsChatOnly = false,
            CreatedAt = Now
        };
        var otherPrivateFile = new StoredFileEntity
        {
            Id = Guid.NewGuid(),
            OwnerUserId = SqliteFixture.StrangerId,
            OriginalFileName = "stranger.pdf",
            ContentType = "application/pdf",
            SizeBytes = 512,
            StorageKey = $"{SqliteFixture.StrangerId:N}/doc",
            Status = FileStatus.Ready,
            IsChatOnly = false,
            CreatedAt = Now
        };
        fx.Db.StoredFiles.AddRange(chatSnap, savedDriveFile, otherPrivateFile);
        await fx.Db.SaveChangesAsync();

        // My files lists savedDriveFile, NOT chatSnap (IsChatOnly = true).
        var owned = await library.ListOwnedAsync(SqliteFixture.OwnerId);
        var singleOwned = Assert.Single(owned);
        Assert.Equal(savedDriveFile.Id, singleOwned.Id);

        var conv = await messages.OpenAsync(SqliteFixture.OwnerId, SqliteFixture.OtherId);

        // Cannot attach someone else's file into chat.
        await Assert.ThrowsAsync<VaultNotFoundException>(() =>
            messages.SendAsync(
                SqliteFixture.OwnerId,
                conv.Id,
                new SendDirectMessageRequest("Look", otherPrivateFile.Id, "file")));

        // Attach both chatSnap and savedDriveFile in chat with OtherId.
        await messages.SendAsync(
            SqliteFixture.OwnerId,
            conv.Id,
            new SendDirectMessageRequest("", chatSnap.Id, "drawing"));
        await messages.SendAsync(
            SqliteFixture.OwnerId,
            conv.Id,
            new SendDirectMessageRequest("From my drive", savedDriveFile.Id, "photo"));

        var otherCtx = new AccessContext(SqliteFixture.OtherId, null, null);
        var strangerCtx = new AccessContext(SqliteFixture.StrangerId, null, null);

        // Chat participant can preview and download, but cannot Manage (delete/update) Owner's file.
        Assert.True((await access.AuthorizeFileAsync(otherCtx, chatSnap.Id, AccessIntent.Preview)).Allowed);
        Assert.True((await access.AuthorizeFileAsync(otherCtx, chatSnap.Id, AccessIntent.Download)).Allowed);
        Assert.True((await access.AuthorizeFileAsync(otherCtx, savedDriveFile.Id, AccessIntent.Preview)).Allowed);
        Assert.False((await access.AuthorizeFileAsync(otherCtx, savedDriveFile.Id, AccessIntent.Manage)).Allowed);

        // Stranger outside the conversation is strictly denied.
        Assert.False((await access.AuthorizeFileAsync(strangerCtx, chatSnap.Id, AccessIntent.Preview)).Allowed);
        Assert.False((await access.AuthorizeFileAsync(strangerCtx, savedDriveFile.Id, AccessIntent.Download)).Allowed);
    }

    [Fact]
    public async Task In_memory_typing_presence_caches_members_clears_on_send_and_expires_after_ttl()
    {
        await using var fx = new SqliteFixture();
        await fx.SeedMembersAsync();
        var clock = new TestTimeProvider(Now);
        var typing = new TypingPresenceService(clock);
        var messages = new DirectMessageService(fx.Db, clock, typing);

        var conv = await messages.OpenAsync(SqliteFixture.OwnerId, SqliteFixture.OtherId);

        // Stranger is not a cached participant -> RecordTyping returns false.
        Assert.False(typing.RecordTyping(conv.Id, SqliteFixture.StrangerId));

        // OtherId starts typing -> Owner sees "Other", Other does not see themselves.
        Assert.True(typing.RecordTyping(conv.Id, SqliteFixture.OtherId));
        Assert.Equal(["Other"], typing.GetTypingNames(conv.Id, SqliteFixture.OwnerId));
        Assert.Empty(typing.GetTypingNames(conv.Id, SqliteFixture.OtherId));

        var threadWhileTyping = await messages.ThreadAsync(SqliteFixture.OwnerId, conv.Id, null, null);
        Assert.Equal(["Other"], threadWhileTyping.Typing);

        // Sending a message immediately clears typing indicator.
        await messages.SendAsync(SqliteFixture.OtherId, conv.Id, "Done typing!");
        Assert.Empty(typing.GetTypingNames(conv.Id, SqliteFixture.OwnerId));

        // Typing again expires automatically after 4 seconds (TypingTtl).
        Assert.True(typing.RecordTyping(conv.Id, SqliteFixture.OtherId));
        clock.UtcNow = Now.AddSeconds(5);
        Assert.Empty(typing.GetTypingNames(conv.Id, SqliteFixture.OwnerId));
    }

    [Fact]
    public void Sticker_generator_rules_enforce_five_word_limit_child_safety_and_svg_sanitization()
    {
        Assert.Equal(19, StickerGeneratorRules.Themes.Count);
        Assert.Equal("dojo-karate", StickerGeneratorRules.NormalizeTheme("dojo-karate").Id);
        Assert.Equal("voxel-craft", StickerGeneratorRules.NormalizeTheme("voxel-craft").Id);
        Assert.Equal("hoops-court", StickerGeneratorRules.NormalizeTheme("hoops-court").Id);
        Assert.Equal("meme-pop", StickerGeneratorRules.NormalizeTheme("meme-pop").Id);
        Assert.Equal("voxel-craft", StickerGeneratorRules.NormalizeTheme("unknown-theme").Id);

        // Gamer status tag normalization & safety
        Assert.Equal("", StickerGeneratorRules.NormalizeStatusTag(null));
        Assert.Equal("Diamond Rank 💎", StickerGeneratorRules.NormalizeStatusTag("  Diamond   Rank 💎 "));
        Assert.Throws<DirectMessageValidationException>(() =>
            StickerGeneratorRules.NormalizeStatusTag("This status tag is way too long to fit in thirty characters"));
        Assert.Throws<DirectMessageValidationException>(() =>
            StickerGeneratorRules.NormalizeStatusTag("Bad gun tag"));

        // Prompt normalization: 1..5 words allowed, >5 words or blocked words rejected
        Assert.Equal("ninja cat eating poutine", StickerGeneratorRules.NormalizePrompt("  ninja   cat eating poutine "));
        Assert.Throws<DirectMessageValidationException>(() => StickerGeneratorRules.NormalizePrompt(""));
        Assert.Throws<DirectMessageValidationException>(() => StickerGeneratorRules.NormalizePrompt("one two three four five six"));
        Assert.Throws<DirectMessageValidationException>(() => StickerGeneratorRules.NormalizePrompt("cool gun sticker"));

        // Custom sticker slug recognition in DirectMessageRules
        var customId = Guid.NewGuid();
        var customToken = $"[sticker:custom-{customId:N}]";
        Assert.True(DirectMessageRules.TryParseSticker(customToken, out var parsedSlug));
        Assert.Equal($"custom-{customId:N}", parsedSlug);
        Assert.Equal("🎨 Sticker", DirectMessageRules.FormatPreview(customToken, null));

        // SVG sanitization strips scripts, event handlers, foreignObject, and external URLs while keeping valid shapes
        var rawModelReply = """
            Here is your sticker:
            ```svg
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" onload="alert(1)">
              <script>alert('xss')</script>
              <foreignObject><div>bad</div></foreignObject>
              <defs>
                <filter id="ds"><feDropShadow dx="0" dy="4" stdDeviation="3"/></filter>
              </defs>
              <g filter="url(#ds)" onclick="evil()">
                <circle cx="60" cy="60" r="45" fill="#facc15" stroke="#111827" stroke-width="4" />
                <path d="M40 70 Q60 85 80 70" fill="none" stroke="#111827" stroke-width="4" style="background:url(https://evil.example/x)" />
              </g>
            </svg>
            ```
            """;

        var cleanSvg = StickerGeneratorRules.SanitizeSvg(rawModelReply);
        Assert.Contains("viewBox=\"0 0 120 120\"", cleanSvg);
        Assert.Contains("<circle", cleanSvg);
        Assert.Contains("filter=\"url(#ds)\"", cleanSvg);
        Assert.DoesNotContain("<script", cleanSvg, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("foreignObject", cleanSvg, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("onload", cleanSvg, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("onclick", cleanSvg, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("evil.example", cleanSvg, StringComparison.OrdinalIgnoreCase);

        // Small SVG sanitization enforces custom viewBox and maxElements cap
        var cleanBadge = StickerGeneratorRules.SanitizeSvg(rawModelReply, "0 0 64 64", StickerGeneratorRules.MaxSmallSvgBytes, maxElements: 1);
        Assert.Contains("viewBox=\"0 0 64 64\"", cleanBadge);
        Assert.Contains("<circle", cleanBadge);
        Assert.DoesNotContain("<path", cleanBadge);
    }

    private sealed class TestEnv : IHostEnvironment
    {
        public string EnvironmentName { get; set; } = "Development";
        public string ApplicationName { get; set; } = "tests";
        public string ContentRootPath { get; set; } = Path.GetTempPath();
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    }
}
