using FamilyVault.Files.Contracts;
using FamilyVault.Files.Data.Entities;
using FamilyVault.Files.Security;
using FamilyVault.Files.Services;
using Microsoft.EntityFrameworkCore;

namespace FamilyVault.Files.Tests;

public class MemberShareListTests
{
    private static readonly DateTimeOffset Now = DateTimeOffset.Parse("2026-10-13T12:00:00Z");

    [Fact]
    public async Task Incoming_drops_expired_and_deleted_files_and_names_the_sharer()
    {
        await using var fx = new SqliteFixture();
        await fx.SeedMembersAsync();
        var owner = await fx.Db.FamilyMembers.SingleAsync(m => m.UserId == SqliteFixture.OwnerId);
        owner.DisplayName = "Vince";
        owner.AccentColor = "#C45A12";
        await fx.Db.SaveChangesAsync();

        var live = await SeedFileAsync(fx, "live.txt");
        var expired = await SeedFileAsync(fx, "old.txt", Now.AddMinutes(-1));
        var deleted = await SeedFileAsync(fx, "gone.txt", deletedAt: Now);
        AddGrant(fx, live.Id, SqliteFixture.OtherId, SqliteFixture.OwnerId);
        AddGrant(fx, expired.Id, SqliteFixture.OtherId, SqliteFixture.OwnerId);
        AddGrant(fx, deleted.Id, SqliteFixture.OtherId, SqliteFixture.OwnerId);
        await fx.Db.SaveChangesAsync();

        var incoming = await CreateGrants(fx).ListIncomingAsync(SqliteFixture.OtherId);

        var row = Assert.Single(incoming);
        Assert.Equal(live.Id, row.File.Id);
        Assert.Equal(SqliteFixture.OwnerId, row.From.UserId);
        Assert.Equal("Vince", row.From.DisplayName);
        Assert.Equal("#c45a12", row.From.Color);
    }

    [Fact]
    public async Task Incoming_prefers_a_file_grant_over_a_drop_grant()
    {
        await using var fx = new SqliteFixture();
        await fx.SeedMembersAsync();
        var drop = await SeedDropAsync(fx);
        var file = await SeedFileAsync(fx, "inside.txt", dropId: drop.Id);
        AddGrant(fx, file.Id, SqliteFixture.OtherId, SqliteFixture.OwnerId);
        fx.Db.FileGrants.Add(new FileGrantEntity
        {
            Id = Guid.NewGuid(),
            TargetKind = ShareTargetKind.Drop,
            TargetId = drop.Id,
            UserId = SqliteFixture.OtherId,
            Permission = FilePermission.Download,
            GrantedByUserId = SqliteFixture.StrangerId,
            GrantedAt = Now
        });
        await fx.Db.SaveChangesAsync();

        var incoming = await CreateGrants(fx).ListIncomingAsync(SqliteFixture.OtherId);

        var row = Assert.Single(incoming);
        Assert.Equal(SqliteFixture.OwnerId, row.From.UserId);
        Assert.Equal("Owner", row.From.DisplayName);
    }

    [Fact]
    public async Task Outgoing_returns_name_and_color_and_skips_expired_and_deleted()
    {
        await using var fx = new SqliteFixture();
        await fx.SeedMembersAsync();
        var other = await fx.Db.FamilyMembers.SingleAsync(m => m.UserId == SqliteFixture.OtherId);
        other.DisplayName = "Sam";
        other.AccentColor = "#C45A12";
        await fx.Db.SaveChangesAsync();

        var older = await SeedFileAsync(fx, "older.txt");
        var newer = await SeedFileAsync(fx, "newer.txt");
        var expired = await SeedFileAsync(fx, "old.txt", Now.AddMinutes(-1));
        var deleted = await SeedFileAsync(fx, "gone.txt", deletedAt: Now);
        var time = new TestTimeProvider(Now);
        var grants = new GrantService(fx.Db, time, new FileAuditService(fx.Db, time));
        await grants.GrantAsync(ShareTargetKind.File, older.Id, SqliteFixture.OtherId, FilePermission.Download, SqliteFixture.OwnerId);
        time.UtcNow = Now.AddMinutes(1);
        await grants.GrantAsync(ShareTargetKind.File, newer.Id, SqliteFixture.OtherId, FilePermission.View, SqliteFixture.OwnerId);
        AddGrant(fx, expired.Id, SqliteFixture.OtherId, SqliteFixture.OwnerId);
        AddGrant(fx, deleted.Id, SqliteFixture.OtherId, SqliteFixture.OwnerId);
        await fx.Db.SaveChangesAsync();

        var listed = await grants.ListOutgoingAsync(SqliteFixture.OwnerId);

        Assert.Equal(new[] { "newer.txt", "older.txt" }, listed.Select(row => row.Label).ToArray());
        Assert.All(listed, row =>
        {
            Assert.Equal("Sam", row.DisplayName);
            Assert.Equal("#c45a12", row.Color);
            Assert.Equal(SqliteFixture.OtherId, row.UserId);
        });
    }

    [Fact]
    public async Task Email_name_and_bad_color_fall_back()
    {
        await using var fx = new SqliteFixture();
        await fx.SeedMembersAsync();
        var other = await fx.Db.FamilyMembers.SingleAsync(m => m.UserId == SqliteFixture.OtherId);
        other.DisplayName = "sam@family.test";
        other.AccentColor = "red";
        await fx.Db.SaveChangesAsync();
        var file = await SeedFileAsync(fx, "note.txt");
        var grants = CreateGrants(fx);
        await grants.GrantAsync(ShareTargetKind.File, file.Id, SqliteFixture.OtherId, FilePermission.Download, SqliteFixture.OwnerId);

        var outgoing = Assert.Single(await grants.ListOutgoingAsync(SqliteFixture.OwnerId));
        Assert.Equal("other", outgoing.DisplayName);
        Assert.DoesNotContain("@", outgoing.DisplayName);
        Assert.Equal("#0b1f3a", outgoing.Color);

        var owner = await fx.Db.FamilyMembers.SingleAsync(m => m.UserId == SqliteFixture.OwnerId);
        owner.DisplayName = " ";
        owner.AccentColor = "#abc";
        await fx.Db.SaveChangesAsync();
        var incoming = Assert.Single(await grants.ListIncomingAsync(SqliteFixture.OtherId));
        Assert.Equal("owner", incoming.From.DisplayName);
        Assert.DoesNotContain("@", incoming.From.DisplayName);
        Assert.Equal("#0b1f3a", incoming.From.Color);
    }

    [Fact]
    public async Task Tags_follow_live_owned_files_only()
    {
        await using var fx = new SqliteFixture();
        await fx.SeedMembersAsync();
        var live = await SeedFileAsync(fx, "live.txt");
        var expired = await SeedFileAsync(fx, "old.txt", Now.AddMinutes(-1));
        AddGrant(fx, live.Id, SqliteFixture.OtherId, SqliteFixture.OwnerId);
        AddGrant(fx, expired.Id, SqliteFixture.StrangerId, SqliteFixture.OwnerId);
        await fx.Db.SaveChangesAsync();

        var tags = await CreateGrants(fx).ListTagsForOwnerAsync(SqliteFixture.OwnerId);

        var only = Assert.Single(tags);
        Assert.Equal(live.Id, only.Key);
        var tag = Assert.Single(only.Value);
        Assert.Equal(SqliteFixture.OtherId, tag.UserId);
        Assert.Equal("Other", tag.DisplayName);
        Assert.Equal("#0b1f3a", tag.Color);
    }

    [Fact]
    public async Task Grant_stores_the_permission_it_is_given()
    {
        await using var fx = new SqliteFixture();
        await fx.SeedMembersAsync();
        var file = await SeedFileAsync(fx, "note.txt");
        var grants = CreateGrants(fx);

        var grant = await grants.GrantAsync(
            ShareTargetKind.File,
            file.Id,
            SqliteFixture.OtherId,
            FilePermission.View,
            SqliteFixture.OwnerId);

        Assert.Equal(FilePermission.View, grant.Permission);
    }

    private static GrantService CreateGrants(SqliteFixture fx)
    {
        var time = new TestTimeProvider(Now);
        return new GrantService(fx.Db, time, new FileAuditService(fx.Db, time));
    }

    private static void AddGrant(SqliteFixture fx, Guid fileId, Guid userId, Guid grantedBy)
    {
        fx.Db.FileGrants.Add(new FileGrantEntity
        {
            Id = Guid.NewGuid(),
            TargetKind = ShareTargetKind.File,
            TargetId = fileId,
            UserId = userId,
            Permission = FilePermission.Download,
            GrantedByUserId = grantedBy,
            GrantedAt = Now
        });
    }

    private static async Task<StoredFileEntity> SeedFileAsync(
        SqliteFixture fx,
        string name,
        DateTimeOffset? expiresAt = null,
        DateTimeOffset? deletedAt = null,
        Guid? dropId = null)
    {
        var file = new StoredFileEntity
        {
            Id = Guid.NewGuid(),
            OwnerUserId = SqliteFixture.OwnerId,
            OriginalFileName = name,
            ContentType = "text/plain",
            SizeBytes = 4,
            Status = FileStatus.Ready,
            CreatedAt = Now.AddHours(-1),
            ExpiresAt = expiresAt ?? Now.AddDays(7),
            DeletedAt = deletedAt,
            DropId = dropId
        };
        file.StorageKey = StorageKeys.For(SqliteFixture.OwnerId, file.Id);
        fx.Db.StoredFiles.Add(file);
        await fx.Db.SaveChangesAsync();
        return file;
    }

    private static async Task<DropEntity> SeedDropAsync(SqliteFixture fx)
    {
        var drop = new DropEntity
        {
            Id = Guid.NewGuid(),
            OwnerUserId = SqliteFixture.OwnerId,
            Title = "Drop",
            CreatedAt = Now.AddHours(-1),
            ExpiresAt = Now.AddDays(7)
        };
        fx.Db.Drops.Add(drop);
        await fx.Db.SaveChangesAsync();
        return drop;
    }
}
