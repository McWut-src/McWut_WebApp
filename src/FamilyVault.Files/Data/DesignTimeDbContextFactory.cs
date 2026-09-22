using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace FamilyVault.Files.Data;

public sealed class SqliteDesignTimeDbContextFactory : IDesignTimeDbContextFactory<SqliteApplicationDbContext>
{
    public SqliteApplicationDbContext CreateDbContext(string[] args)
    {
        var options = new DbContextOptionsBuilder<SqliteApplicationDbContext>()
            .UseSqlite("Data Source=App_Data/mcwut.db")
            .Options;
        return new SqliteApplicationDbContext(options);
    }
}

public sealed class SqlServerDesignTimeDbContextFactory : IDesignTimeDbContextFactory<SqlServerApplicationDbContext>
{
    public SqlServerApplicationDbContext CreateDbContext(string[] args)
    {
        var options = new DbContextOptionsBuilder<SqlServerApplicationDbContext>()
            .UseSqlServer("Server=127.0.0.1,1433;Database=sql-mcwut;User Id=sa;Password=unused;TrustServerCertificate=True")
            .Options;
        return new SqlServerApplicationDbContext(options);
    }
}
