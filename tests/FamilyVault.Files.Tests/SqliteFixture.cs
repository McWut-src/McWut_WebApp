using FamilyVault.Files.Data;
using FamilyVault.Files.Data.Entities;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace FamilyVault.Files.Tests;

internal sealed class SqliteFixture : IAsyncDisposable
{
    private readonly SqliteConnection _connection;

    public SqliteFixture()
    {
        _connection = new SqliteConnection("Data Source=:memory:");
        _connection.Open();
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseSqlite(_connection)
            .Options;
        Db = new ApplicationDbContext(options);
        Db.Database.EnsureCreated();
    }

    public ApplicationDbContext Db { get; }

    public static readonly Guid OwnerId = Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
    public static readonly Guid OtherId = Guid.Parse("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb");
    public static readonly Guid StrangerId = Guid.Parse("cccccccc-cccc-cccc-cccc-cccccccccccc");

    public async Task SeedMembersAsync()
    {
        var now = DateTimeOffset.Parse("2026-01-01T00:00:00Z");
        Db.FamilyMembers.AddRange(
            new FamilyMemberEntity { UserId = OwnerId, DisplayName = "Owner", Email = "owner@family.test", FirstSeenAt = now, LastSeenAt = now },
            new FamilyMemberEntity { UserId = OtherId, DisplayName = "Other", Email = "other@family.test", FirstSeenAt = now, LastSeenAt = now },
            new FamilyMemberEntity { UserId = StrangerId, DisplayName = "Stranger", Email = "stranger@family.test", FirstSeenAt = now, LastSeenAt = now });
        await Db.SaveChangesAsync();
    }

    public async ValueTask DisposeAsync()
    {
        await Db.DisposeAsync();
        await _connection.DisposeAsync();
    }
}
