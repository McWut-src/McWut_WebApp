using FamilyVault.Files.Contracts;
using FamilyVault.Files.Data.Entities;
using FamilyVault.Files.Security;
using FamilyVault.Files.Services;
using Microsoft.EntityFrameworkCore;

namespace FamilyVault.Files.Tests;

/// <summary>
/// Guards the member-sharing invariants that decide who may share what.
/// A grant must only ever be created or revoked by the item's owner, and a
/// story shared through a drop is always read-only for the recipient.
/// </summary>
public class GrantServiceTests
{
    private static readonly DateTimeOffset Now = DateTimeOffset.Parse("2026-10-13T12:00:00Z");

    [Fact]
    public async Task A_non_owner_cannot_grant_a_share()
    {
        await using var fx = new SqliteFixture();
        await fx.SeedMembersAsync();
        var file = await SeedFileAsync(fx, "note.txt", owner: SqliteFixture.OwnerId);

        // Other owns no file here; they must not be able to grant access.
        var grants = CreateGrants(fx);
        await Assert.ThrowsAsync<VaultNotFoundException>(
            () => grants.GrantAsync(ShareTargetKind.File, file.Id, SqliteFixture.OtherId, FilePermission.Download, SqliteFixture.OtherId));
    }

    [Fact]
    public async Task The_owner_can_grant_a_share()
    {
        await using var fx = new SqliteFixture();
        await fx.SeedMembersAsync();
        var file = await SeedFileAsync(fx, "note.txt", owner: SqliteFixture.OwnerId);

        var grants = CreateGrants(fx);
        var grant = await grants.GrantAsync(ShareTargetKind.File, file.Id, SqliteFixture.OtherId, FilePermission.View, SqliteFixture.OwnerId);

        Assert.Equal(SqliteFixture.OtherId, grant.UserId);
        Assert.Equal(FilePermission.View, grant.Permission);
        Assert.Equal(SqliteFixture.OwnerId, grant.GrantedByUserId);
    }

    [Fact]
    public async Task A_user_cannot_grant_themselves_access()
    {
        await using var fx = new SqliteFixture();
        await fx.SeedMembersAsync();
        var file = await SeedFileAsync(fx, "note.txt", owner: SqliteFixture.OwnerId);

        var grants = CreateGrants(fx);
        // Owner acting as both the grantor and the target is meaningless.
        await Assert.ThrowsAsync<VaultNotFoundException>(
            () => grants.GrantAsync(ShareTargetKind.File, file.Id, SqliteFixture.OwnerId, FilePermission.Download, SqliteFixture.OwnerId));
    }

    [Fact]
    public async Task A_grant_to_a_member_without_a_row_is_rejected()
    {
        await using var fx = new SqliteFixture();
        await fx.SeedMembersAsync();
        var file = await SeedFileAsync(fx, "note.txt", owner: SqliteFixture.OwnerId);

        var grants = CreateGrants(fx);
        await Assert.ThrowsAsync<VaultNotFoundException>(
            () => grants.GrantAsync(ShareTargetKind.File, file.Id, Guid.NewGuid(), FilePermission.Download, SqliteFixture.OwnerId));
    }

    [Fact]
    public async Task A_story_shared_through_a_drop_is_always_download_only()
    {
        await using var fx = new SqliteFixture();
        await fx.SeedMembersAsync();
        var drop = await SeedStoryDropAsync(fx);

        var grants = CreateGrants(fx);
        // Ask for View; the service must downgrade it to Download.
        var grant = await grants.GrantAsync(ShareTargetKind.Drop, drop.Id, SqliteFixture.OtherId, FilePermission.View, SqliteFixture.OwnerId);

        Assert.Equal(FilePermission.Download, grant.Permission);
    }

    [Fact]
    public async Task Only_the_owner_can_revoke_a_grant()
    {
        await using var fx = new SqliteFixture();
        await fx.SeedMembersAsync();
        var file = await SeedFileAsync(fx, "note.txt", owner: SqliteFixture.OwnerId);

        var grants = CreateGrants(fx);
        await grants.GrantAsync(ShareTargetKind.File, file.Id, SqliteFixture.OtherId, FilePermission.Download, SqliteFixture.OwnerId);

        // A stranger cannot revoke someone else's share.
        await Assert.ThrowsAsync<VaultNotFoundException>(
            () => grants.RevokeAsync(ShareTargetKind.File, file.Id, file.Id, SqliteFixture.StrangerId));
    }

    [Fact]
    public async Task The_owner_can_revoke_a_grant_and_it_disappears()
    {
        await using var fx = new SqliteFixture();
        await fx.SeedMembersAsync();
        var file = await SeedFileAsync(fx, "note.txt", owner: SqliteFixture.OwnerId);

        var grants = CreateGrants(fx);
        await grants.GrantAsync(ShareTargetKind.File, file.Id, SqliteFixture.OtherId, FilePermission.Download, SqliteFixture.OwnerId);

        await grants.RevokeAsync(ShareTargetKind.File, file.Id, SqliteFixture.OtherId, SqliteFixture.OwnerId);

        var remaining = await grants.ListAsync(ShareTargetKind.File, file.Id);
        Assert.Empty(remaining);
    }

    [Fact]
    public async Task Revoking_an_unknown_grant_is_rejected()
    {
        await using var fx = new SqliteFixture();
        await fx.SeedMembersAsync();
        var file = await SeedFileAsync(fx, "note.txt", owner: SqliteFixture.OwnerId);

        var grants = CreateGrants(fx);
        await Assert.ThrowsAsync<VaultNotFoundException>(
            () => grants.RevokeAsync(ShareTargetKind.File, file.Id, file.Id, SqliteFixture.OwnerId));
    }

    private static GrantService CreateGrants(SqliteFixture fx)
    {
        var time = new TestTimeProvider(Now);
        return new GrantService(fx.Db, time, new FileAuditService(fx.Db, time));
    }

    private static async Task<DropEntity> SeedStoryDropAsync(SqliteFixture fx)
    {
        var drop = new DropEntity
        {
            Id = Guid.NewGuid(),
            OwnerUserId = SqliteFixture.OwnerId,
            Title = "Story",
            IsStory = true,
            CreatedAt = Now.AddHours(-1),
            ExpiresAt = Now.AddDays(7)
        };
        fx.Db.Drops.Add(drop);
        await fx.Db.SaveChangesAsync();
        return drop;
    }

    private static async Task<StoredFileEntity> SeedFileAsync(
        SqliteFixture fx,
        string name,
        Guid owner = default,
        DateTimeOffset? expiresAt = null)
    {
        var ownerId = owner != Guid.Empty ? owner : SqliteFixture.OwnerId;
        var file = new StoredFileEntity
        {
            Id = Guid.NewGuid(),
            OwnerUserId = ownerId,
            OriginalFileName = name,
            ContentType = "text/plain",
            SizeBytes = 4,
            Status = FileStatus.Ready,
            CreatedAt = Now.AddHours(-1),
            ExpiresAt = expiresAt ?? Now.AddDays(7)
        };
        file.StorageKey = StorageKeys.For(ownerId, file.Id);
        fx.Db.StoredFiles.Add(file);
        await fx.Db.SaveChangesAsync();
        return file;
    }
}
