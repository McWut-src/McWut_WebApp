using FamilyVault.Files.Contracts;
using FamilyVault.Files.Data.Entities;
using FamilyVault.Files.Security;
using FamilyVault.Files.Services;
using Microsoft.AspNetCore.Identity;

namespace FamilyVault.Files.Tests;

public class ShareLinkListTests
{
    [Fact]
    public async Task Owner_sees_file_and_drop_links_and_not_revoked_or_someone_elses()
    {
        await using var fx = new SqliteFixture();
        await fx.SeedMembersAsync();
        var time = new TestTimeProvider(DateTimeOffset.Parse("2026-10-07T12:00:00Z"));
        var service = new ShareLinkService(fx.Db, time, new PasswordHasher<object>(), new FileAuditService(fx.Db, time));

        var notes = await SeedFileAsync(fx, "notes.txt");
        var gone = await SeedFileAsync(fx, "gone.txt");
        var drop = await SeedDropAsync(fx, "Holiday");

        var notesLink = await service.CreateAsync(
            ShareTargetKind.File,
            notes.Id,
            SqliteFixture.OwnerId,
            new CreateShareLinkRequest(Retention.Days(time, 7), "secret", true));

        time.UtcNow = time.UtcNow.AddMinutes(1);
        var dropLink = await service.CreateAsync(
            ShareTargetKind.Drop,
            drop.Id,
            SqliteFixture.OwnerId,
            new CreateShareLinkRequest(Retention.Forever(), null, true));

        time.UtcNow = time.UtcNow.AddMinutes(1);
        var expiredLink = await service.CreateAsync(
            ShareTargetKind.File,
            notes.Id,
            SqliteFixture.OwnerId,
            new CreateShareLinkRequest(new Retention(time.UtcNow.AddMinutes(-1), null), null, true));

        time.UtcNow = time.UtcNow.AddMinutes(1);
        var deletedLink = await service.CreateAsync(
            ShareTargetKind.File,
            gone.Id,
            SqliteFixture.OwnerId,
            new CreateShareLinkRequest(Retention.Days(time, 7), null, true));
        gone.DeletedAt = time.UtcNow;
        await fx.Db.SaveChangesAsync();

        time.UtcNow = time.UtcNow.AddMinutes(1);
        var strangerLink = await service.CreateAsync(
            ShareTargetKind.File,
            notes.Id,
            SqliteFixture.StrangerId,
            new CreateShareLinkRequest(Retention.Days(time, 1), null, true));

        await service.RevokeAsync(dropLink.Token, SqliteFixture.OwnerId);

        var listed = await service.ListOwnedAsync(SqliteFixture.OwnerId);
        Assert.Equal(
            new[] { deletedLink.Token, expiredLink.Token, notesLink.Token },
            listed.Select(item => item.Token).ToArray());

        var notesRow = listed.Single(item => item.Token == notesLink.Token);
        Assert.Equal("notes.txt", notesRow.Label);
        Assert.Equal(ShareTargetKind.File, notesRow.TargetKind);
        Assert.True(notesRow.HasPassword);
        Assert.False(notesRow.Expired);

        var expiredRow = listed.Single(item => item.Token == expiredLink.Token);
        Assert.True(expiredRow.Expired);
        Assert.False(expiredRow.HasPassword);

        Assert.Equal("Deleted file", listed.Single(item => item.Token == deletedLink.Token).Label);
        Assert.DoesNotContain(listed, item => item.Token == dropLink.Token);
        Assert.DoesNotContain(listed, item => item.Token == strangerLink.Token);

        var strangerList = await service.ListOwnedAsync(SqliteFixture.StrangerId);
        Assert.Equal(new[] { strangerLink.Token }, strangerList.Select(item => item.Token).ToArray());
    }

    private static async Task<StoredFileEntity> SeedFileAsync(SqliteFixture fx, string name)
    {
        var file = new StoredFileEntity
        {
            Id = Guid.NewGuid(),
            OwnerUserId = SqliteFixture.OwnerId,
            OriginalFileName = name,
            ContentType = "text/plain",
            SizeBytes = 4,
            Status = FileStatus.Ready,
            CreatedAt = DateTimeOffset.Parse("2026-10-07T11:00:00Z")
        };
        file.StorageKey = StorageKeys.For(SqliteFixture.OwnerId, file.Id);
        fx.Db.StoredFiles.Add(file);
        await fx.Db.SaveChangesAsync();
        return file;
    }

    private static async Task<DropEntity> SeedDropAsync(SqliteFixture fx, string title)
    {
        var drop = new DropEntity
        {
            Id = Guid.NewGuid(),
            OwnerUserId = SqliteFixture.OwnerId,
            Title = title,
            CreatedAt = DateTimeOffset.Parse("2026-10-07T11:00:00Z")
        };
        fx.Db.Drops.Add(drop);
        await fx.Db.SaveChangesAsync();
        return drop;
    }
}
