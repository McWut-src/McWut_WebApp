using FamilyVault.Files.Contracts;
using FamilyVault.Files.Data.Entities;
using FamilyVault.Files.Security;
using FamilyVault.Files.Services;
using Microsoft.AspNetCore.Identity;

namespace FamilyVault.Files.Tests;

public class FileAccessServiceTests
{
    private static readonly DateTimeOffset Now = DateTimeOffset.Parse("2026-06-01T00:00:00Z");

    [Fact]
    public async Task Owner_is_allowed_all_intents()
    {
        await using var fx = new SqliteFixture();
        await fx.SeedMembersAsync();
        var file = await SeedReadyFileAsync(fx);
        var access = CreateAccess(fx);

        var decision = await access.AuthorizeFileAsync(new AccessContext(SqliteFixture.OwnerId, null, null), file.Id, AccessIntent.Manage);

        Assert.True(decision.Allowed);
        Assert.False(decision.RequiresPassword);
    }

    [Fact]
    public async Task Unknown_file_is_denied()
    {
        await using var fx = new SqliteFixture();
        await fx.SeedMembersAsync();
        var access = CreateAccess(fx);

        var decision = await access.AuthorizeFileAsync(new AccessContext(SqliteFixture.OwnerId, null, null), Guid.NewGuid(), AccessIntent.Download);

        Assert.Equal(AccessDecision.Deny, decision);
    }

    [Fact]
    public async Task Stranger_without_token_is_denied()
    {
        await using var fx = new SqliteFixture();
        await fx.SeedMembersAsync();
        var file = await SeedReadyFileAsync(fx);
        var access = CreateAccess(fx);

        var decision = await access.AuthorizeFileAsync(new AccessContext(SqliteFixture.StrangerId, null, null), file.Id, AccessIntent.Download);

        Assert.Equal(AccessDecision.Deny, decision);
    }

    [Fact]
    public async Task Grant_view_allows_preview_but_not_download()
    {
        await using var fx = new SqliteFixture();
        await fx.SeedMembersAsync();
        var file = await SeedReadyFileAsync(fx);
        fx.Db.FileGrants.Add(new FileGrantEntity
        {
            Id = Guid.NewGuid(),
            TargetKind = ShareTargetKind.File,
            TargetId = file.Id,
            UserId = SqliteFixture.OtherId,
            Permission = FilePermission.View,
            GrantedByUserId = SqliteFixture.OwnerId,
            GrantedAt = Now
        });
        await fx.Db.SaveChangesAsync();
        var access = CreateAccess(fx);
        var ctx = new AccessContext(SqliteFixture.OtherId, null, null);

        Assert.True((await access.AuthorizeFileAsync(ctx, file.Id, AccessIntent.Preview)).Allowed);
        Assert.False((await access.AuthorizeFileAsync(ctx, file.Id, AccessIntent.Download)).Allowed);
        Assert.False((await access.AuthorizeFileAsync(ctx, file.Id, AccessIntent.Manage)).Allowed);
    }

    [Fact]
    public async Task Drop_grant_covers_files_in_the_drop()
    {
        await using var fx = new SqliteFixture();
        await fx.SeedMembersAsync();
        var drop = await SeedDropAsync(fx);
        var file = await SeedReadyFileAsync(fx, drop.Id);
        fx.Db.FileGrants.Add(new FileGrantEntity
        {
            Id = Guid.NewGuid(),
            TargetKind = ShareTargetKind.Drop,
            TargetId = drop.Id,
            UserId = SqliteFixture.OtherId,
            Permission = FilePermission.Download,
            GrantedByUserId = SqliteFixture.OwnerId,
            GrantedAt = Now
        });
        await fx.Db.SaveChangesAsync();
        var access = CreateAccess(fx);

        var decision = await access.AuthorizeFileAsync(new AccessContext(SqliteFixture.OtherId, null, null), file.Id, AccessIntent.Download);

        Assert.True(decision.Allowed);
    }

    [Fact]
    public async Task Valid_token_allows_download()
    {
        await using var fx = new SqliteFixture();
        await fx.SeedMembersAsync();
        var file = await SeedReadyFileAsync(fx);
        var token = await SeedLinkAsync(fx, ShareTargetKind.File, file.Id);
        var access = CreateAccess(fx);

        var decision = await access.AuthorizeFileAsync(new AccessContext(null, token, null), file.Id, AccessIntent.Download);

        Assert.True(decision.Allowed);
    }

    [Fact]
    public async Task Token_cannot_manage()
    {
        await using var fx = new SqliteFixture();
        await fx.SeedMembersAsync();
        var file = await SeedReadyFileAsync(fx);
        var token = await SeedLinkAsync(fx, ShareTargetKind.File, file.Id);
        var access = CreateAccess(fx);

        var decision = await access.AuthorizeFileAsync(new AccessContext(null, token, null), file.Id, AccessIntent.Manage);

        Assert.Equal(AccessDecision.Deny, decision);
    }

    [Fact]
    public async Task Missing_password_returns_requires_password()
    {
        await using var fx = new SqliteFixture();
        await fx.SeedMembersAsync();
        var hasher = new PasswordHasher<object>();
        var file = await SeedReadyFileAsync(fx, passwordHash: PasswordHashing.Hash(hasher, "secret"));
        var token = await SeedLinkAsync(fx, ShareTargetKind.File, file.Id);
        var access = CreateAccess(fx, hasher);

        var decision = await access.AuthorizeFileAsync(new AccessContext(null, token, null), file.Id, AccessIntent.Download);

        Assert.False(decision.Allowed);
        Assert.True(decision.RequiresPassword);
    }

    [Fact]
    public async Task Correct_password_allows_download()
    {
        await using var fx = new SqliteFixture();
        await fx.SeedMembersAsync();
        var hasher = new PasswordHasher<object>();
        var file = await SeedReadyFileAsync(fx, passwordHash: PasswordHashing.Hash(hasher, "secret"));
        var token = await SeedLinkAsync(fx, ShareTargetKind.File, file.Id);
        var access = CreateAccess(fx, hasher);

        var decision = await access.AuthorizeFileAsync(new AccessContext(null, token, "secret"), file.Id, AccessIntent.Download);

        Assert.True(decision.Allowed);
    }

    [Fact]
    public async Task Preview_denied_when_link_disallows_preview()
    {
        await using var fx = new SqliteFixture();
        await fx.SeedMembersAsync();
        var file = await SeedReadyFileAsync(fx);
        var token = await SeedLinkAsync(fx, ShareTargetKind.File, file.Id, allowPreview: false);
        var access = CreateAccess(fx);

        var preview = await access.AuthorizeFileAsync(new AccessContext(null, token, null), file.Id, AccessIntent.Preview);
        var download = await access.AuthorizeFileAsync(new AccessContext(null, token, null), file.Id, AccessIntent.Download);

        Assert.False(preview.Allowed);
        Assert.True(download.Allowed);
    }

    [Fact]
    public async Task Expired_file_is_denied_even_to_owner()
    {
        await using var fx = new SqliteFixture();
        await fx.SeedMembersAsync();
        var file = await SeedReadyFileAsync(fx, expiresAt: Now.AddDays(-1));
        var access = CreateAccess(fx);

        var decision = await access.AuthorizeFileAsync(new AccessContext(SqliteFixture.OwnerId, null, null), file.Id, AccessIntent.Download);

        Assert.Equal(AccessDecision.Deny, decision);
    }

    [Fact]
    public async Task Deleted_file_is_denied()
    {
        await using var fx = new SqliteFixture();
        await fx.SeedMembersAsync();
        var file = await SeedReadyFileAsync(fx, deletedAt: Now);
        var access = CreateAccess(fx);

        var decision = await access.AuthorizeFileAsync(new AccessContext(SqliteFixture.OwnerId, null, null), file.Id, AccessIntent.Download);

        Assert.Equal(AccessDecision.Deny, decision);
    }

    [Fact]
    public async Task Owner_wins_when_token_and_grant_are_also_present()
    {
        await using var fx = new SqliteFixture();
        await fx.SeedMembersAsync();
        var hasher = new PasswordHasher<object>();
        var file = await SeedReadyFileAsync(fx, passwordHash: PasswordHashing.Hash(hasher, "secret"));
        var token = await SeedLinkAsync(fx, ShareTargetKind.File, file.Id);
        var access = CreateAccess(fx, hasher);

        var decision = await access.AuthorizeFileAsync(
            new AccessContext(SqliteFixture.OwnerId, token, null),
            file.Id,
            AccessIntent.Manage);

        Assert.True(decision.Allowed);
        Assert.False(decision.RequiresPassword);
    }

    [Fact]
    public async Task Drop_token_opens_child_file()
    {
        await using var fx = new SqliteFixture();
        await fx.SeedMembersAsync();
        var drop = await SeedDropAsync(fx);
        var file = await SeedReadyFileAsync(fx, drop.Id);
        var token = await SeedLinkAsync(fx, ShareTargetKind.Drop, drop.Id);
        var access = CreateAccess(fx);

        var decision = await access.AuthorizeFileAsync(new AccessContext(null, token, null), file.Id, AccessIntent.Download);

        Assert.True(decision.Allowed);
    }

    private static FileAccessService CreateAccess(SqliteFixture fx, IPasswordHasher<object>? hasher = null) =>
        new(fx.Db, new TestTimeProvider(Now), hasher ?? new PasswordHasher<object>());

    private static async Task<StoredFileEntity> SeedReadyFileAsync(
        SqliteFixture fx,
        Guid? dropId = null,
        string? passwordHash = null,
        DateTimeOffset? expiresAt = null,
        DateTimeOffset? deletedAt = null)
    {
        var file = new StoredFileEntity
        {
            Id = Guid.NewGuid(),
            OwnerUserId = SqliteFixture.OwnerId,
            OriginalFileName = "doc.pdf",
            ContentType = "application/pdf",
            SizeBytes = 12,
            StorageKey = StorageKeys.For(SqliteFixture.OwnerId, Guid.NewGuid()),
            Status = FileStatus.Ready,
            CreatedAt = Now.AddHours(-1),
            ExpiresAt = expiresAt ?? Now.AddDays(7),
            PasswordHash = passwordHash,
            DropId = dropId,
            DeletedAt = deletedAt
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
            Title = "Family drop",
            CreatedAt = Now.AddHours(-1),
            ExpiresAt = Now.AddDays(7)
        };
        fx.Db.Drops.Add(drop);
        await fx.Db.SaveChangesAsync();
        return drop;
    }

    private static async Task<string> SeedLinkAsync(
        SqliteFixture fx,
        ShareTargetKind kind,
        Guid targetId,
        bool allowPreview = true)
    {
        var token = ShareTokenGenerator.Create();
        fx.Db.ShareLinks.Add(new ShareLinkEntity
        {
            Id = Guid.NewGuid(),
            Token = token,
            TargetKind = kind,
            TargetId = targetId,
            CreatedByUserId = SqliteFixture.OwnerId,
            CreatedAt = Now,
            ExpiresAt = Now.AddDays(7),
            AllowPreview = allowPreview
        });
        await fx.Db.SaveChangesAsync();
        return token;
    }
}
