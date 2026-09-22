using Microsoft.EntityFrameworkCore;

namespace FamilyVault.Files.Data;

public sealed class SqlServerApplicationDbContext(DbContextOptions<SqlServerApplicationDbContext> options)
    : ApplicationDbContext(options);
