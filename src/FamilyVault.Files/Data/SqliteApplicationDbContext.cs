using Microsoft.EntityFrameworkCore;

namespace FamilyVault.Files.Data;

public sealed class SqliteApplicationDbContext(DbContextOptions<SqliteApplicationDbContext> options)
    : ApplicationDbContext(options);
