using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace FamilyVault.Files.Data;

public sealed class DesignTimeDbContextFactory : IDesignTimeDbContextFactory<ApplicationDbContext>
{
    public ApplicationDbContext CreateDbContext(string[] args)
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseSqlite("Data Source=App_Data/mcwut.db")
            .Options;
        return new ApplicationDbContext(options);
    }
}
