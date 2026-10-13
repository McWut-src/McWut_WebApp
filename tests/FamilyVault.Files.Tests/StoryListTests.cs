using FamilyVault.Files.Contracts;
using FamilyVault.Files.Data.Entities;
using FamilyVault.Files.Security;
using FamilyVault.Files.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace FamilyVault.Files.Tests;

public class StoryListTests
{
    private static readonly DateTimeOffset Now = DateTimeOffset.Parse("2026-10-13T12:00:00Z");

    [Fact]
    public async Task Owned_story_keeps_the_words_with_the_files_and_leaves_a_plain_drop_alone()
    {
        await using var fx = new SqliteFixture();
        await fx.SeedMembersAsync();
        var story = await SeedDropAsync(fx, "Beach day", isStory: true);
        var photo = await SeedFileAsync(fx, story.Id, "shore.jpg", "image/jpeg", Now.AddMinutes(-2));
        var words = await SeedFileAsync(fx, story.Id, "Beach day.txt", "text/plain", Now.AddMinutes(-1));
        var plain = await SeedDropAsync(fx, "Drop", isStory: false);
        var loose = await SeedFileAsync(fx, plain.Id, "notes.txt", "text/plain", Now.AddMinutes(-3));

        var listed = await CreateDrops(fx).ListOwnedStoriesAsync(SqliteFixture.OwnerId);

        var only = Assert.Single(listed);
        Assert.Equal(story.Id, only.Id);
        Assert.Equal("Beach day", only.Title);
        Assert.Equal(words.Id, only.Body!.Id);
        var attachment = Assert.Single(only.Attachments);
        Assert.Equal(photo.Id, attachment.Id);
        Assert.DoesNotContain(listed, item => item.Attachments.Any(file => file.Id == loose.Id));
    }

    [Fact]
    public async Task Incoming_story_is_one_item_and_its_files_stay_out_of_the_file_list()
    {
        await using var fx = new SqliteFixture();
        await fx.SeedMembersAsync();
        var story = await SeedDropAsync(fx, "Trip", isStory: true);
        await SeedFileAsync(fx, story.Id, "Trip.txt", "text/plain", Now.AddMinutes(-2));
        await SeedFileAsync(fx, story.Id, "map.pdf", "application/pdf", Now.AddMinutes(-1));
        var plain = await SeedDropAsync(fx, "Drop", isStory: false);
        var loose = await SeedFileAsync(fx, plain.Id, "loose.txt", "text/plain", Now.AddMinutes(-3));
        var grants = CreateGrants(fx);
        await grants.GrantAsync(ShareTargetKind.Drop, story.Id, SqliteFixture.OtherId, FilePermission.Manage, SqliteFixture.OwnerId);
        await grants.GrantAsync(ShareTargetKind.Drop, plain.Id, SqliteFixture.OtherId, FilePermission.Download, SqliteFixture.OwnerId);

        var stories = await grants.ListIncomingStoriesAsync(SqliteFixture.OtherId);
        var files = await grants.ListIncomingAsync(SqliteFixture.OtherId);

        var incoming = Assert.Single(stories);
        Assert.Equal("Trip", incoming.Story.Title);
        Assert.Equal("Trip.txt", incoming.Story.Body!.OriginalFileName);
        Assert.Equal("map.pdf", Assert.Single(incoming.Story.Attachments).OriginalFileName);
        Assert.Equal(SqliteFixture.OwnerId, incoming.From.UserId);
        Assert.Equal(loose.Id, Assert.Single(files).File.Id);
        var stored = await fx.Db.FileGrants.SingleAsync(g => g.TargetId == story.Id);
        Assert.Equal(FilePermission.Download, stored.Permission);
    }

    [Fact]
    public async Task Outgoing_lists_a_story_once_as_a_drop()
    {
        await using var fx = new SqliteFixture();
        await fx.SeedMembersAsync();
        var story = await SeedDropAsync(fx, "Picnic", isStory: true);
        await SeedFileAsync(fx, story.Id, "Picnic.txt", "text/plain", Now.AddMinutes(-1));
        var grants = CreateGrants(fx);
        await grants.GrantAsync(ShareTargetKind.Drop, story.Id, SqliteFixture.OtherId, FilePermission.View, SqliteFixture.OwnerId);

        var row = Assert.Single(await grants.ListOutgoingAsync(SqliteFixture.OwnerId));

        Assert.Equal(story.Id, row.FileId);
        Assert.Equal("Picnic", row.Label);
        Assert.Equal(ShareTargetKind.Drop, row.Kind);
        Assert.Equal("Other", row.DisplayName);
    }

    [Fact]
    public void Body_file_is_the_latest_plain_text_with_the_title()
    {
        var older = File("note.txt", Now.AddMinutes(-2));
        var newer = File("Note.txt", Now.AddMinutes(-1));
        var other = File("photo.jpg", Now, "image/jpeg");

        var body = StoryFiles.FindBody("Note", new[] { older, other, newer });

        Assert.Equal(newer.Id, body!.Id);
    }

    private static StoredFile File(string name, DateTimeOffset createdAt, string contentType = "text/plain") => new(
        Guid.NewGuid(),
        SqliteFixture.OwnerId,
        name,
        contentType,
        4,
        FileStatus.Ready,
        createdAt,
        null,
        null,
        0,
        false,
        null,
        null);

    private static DropService CreateDrops(SqliteFixture fx) =>
        new(fx.Db, new TestTimeProvider(Now), new PasswordHasher<object>());

    private static GrantService CreateGrants(SqliteFixture fx)
    {
        var time = new TestTimeProvider(Now);
        return new GrantService(fx.Db, time, new FileAuditService(fx.Db, time));
    }

    private static async Task<DropEntity> SeedDropAsync(SqliteFixture fx, string title, bool isStory)
    {
        var drop = new DropEntity
        {
            Id = Guid.NewGuid(),
            OwnerUserId = SqliteFixture.OwnerId,
            Title = title,
            CreatedAt = Now.AddHours(-1),
            ExpiresAt = Now.AddDays(7),
            IsStory = isStory
        };
        fx.Db.Drops.Add(drop);
        await fx.Db.SaveChangesAsync();
        return drop;
    }

    private static async Task<StoredFileEntity> SeedFileAsync(
        SqliteFixture fx,
        Guid dropId,
        string name,
        string contentType,
        DateTimeOffset createdAt)
    {
        var file = new StoredFileEntity
        {
            Id = Guid.NewGuid(),
            OwnerUserId = SqliteFixture.OwnerId,
            OriginalFileName = name,
            ContentType = contentType,
            SizeBytes = 4,
            Status = FileStatus.Ready,
            CreatedAt = createdAt,
            ExpiresAt = Now.AddDays(7),
            DropId = dropId
        };
        file.StorageKey = StorageKeys.For(SqliteFixture.OwnerId, file.Id);
        fx.Db.StoredFiles.Add(file);
        await fx.Db.SaveChangesAsync();
        return file;
    }
}
