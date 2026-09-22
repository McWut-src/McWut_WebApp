using FamilyVault.Files.Contracts;
using FamilyVault.Files.Data.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace FamilyVault.Files.Data;

public class ApplicationDbContext : IdentityDbContext<IdentityUser>
{
    public ApplicationDbContext(DbContextOptions options) : base(options)
    {
    }

    public DbSet<FamilyMemberEntity> FamilyMembers => Set<FamilyMemberEntity>();
    public DbSet<StoredFileEntity> StoredFiles => Set<StoredFileEntity>();
    public DbSet<DropEntity> Drops => Set<DropEntity>();
    public DbSet<ShareLinkEntity> ShareLinks => Set<ShareLinkEntity>();
    public DbSet<FileGrantEntity> FileGrants => Set<FileGrantEntity>();
    public DbSet<UploadSessionEntity> UploadSessions => Set<UploadSessionEntity>();
    public DbSet<FileAuditEntity> FileAudits => Set<FileAuditEntity>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<FamilyMemberEntity>(b =>
        {
            b.ToTable("FamilyMembers");
            b.HasKey(x => x.UserId);
            b.Property(x => x.DisplayName).HasMaxLength(256).IsRequired();
            b.Property(x => x.Email).HasMaxLength(256);
        });

        modelBuilder.Entity<StoredFileEntity>(b =>
        {
            b.ToTable("StoredFiles");
            b.HasKey(x => x.Id);
            b.Property(x => x.OriginalFileName).HasMaxLength(255).IsRequired();
            b.Property(x => x.ContentType).HasMaxLength(255).IsRequired();
            b.Property(x => x.StorageKey).HasMaxLength(128).IsRequired();
            b.Property(x => x.PasswordHash).HasMaxLength(256);
            b.Property(x => x.ChecksumSha256).HasMaxLength(64);
            b.Property(x => x.Status).HasConversion<int>();
            b.HasIndex(x => x.StorageKey).IsUnique();
            b.HasIndex(x => new { x.OwnerUserId, x.Status, x.DeletedAt });
            b.HasIndex(x => x.ExpiresAt);
            b.HasOne(x => x.Owner)
                .WithMany()
                .HasForeignKey(x => x.OwnerUserId)
                .OnDelete(DeleteBehavior.Restrict);
            b.HasOne(x => x.Drop)
                .WithMany(d => d.Files)
                .HasForeignKey(x => x.DropId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<DropEntity>(b =>
        {
            b.ToTable("Drops");
            b.HasKey(x => x.Id);
            b.Property(x => x.Title).HasMaxLength(200).IsRequired();
            b.Property(x => x.PasswordHash).HasMaxLength(256);
            b.HasIndex(x => new { x.OwnerUserId, x.DeletedAt });
            b.HasOne(x => x.Owner)
                .WithMany()
                .HasForeignKey(x => x.OwnerUserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<ShareLinkEntity>(b =>
        {
            b.ToTable("ShareLinks");
            b.HasKey(x => x.Id);
            b.Property(x => x.Token).HasMaxLength(64).IsRequired();
            b.Property(x => x.PasswordHash).HasMaxLength(256);
            b.Property(x => x.TargetKind).HasConversion<int>();
            b.HasIndex(x => x.Token).IsUnique();
            b.HasIndex(x => new { x.TargetKind, x.TargetId });
        });

        modelBuilder.Entity<FileGrantEntity>(b =>
        {
            b.ToTable("FileGrants");
            b.HasKey(x => x.Id);
            b.Property(x => x.TargetKind).HasConversion<int>();
            b.Property(x => x.Permission).HasConversion<int>();
            b.HasIndex(x => x.UserId);
            b.HasIndex(x => new { x.TargetKind, x.TargetId });
            b.HasIndex(x => new { x.TargetKind, x.TargetId, x.UserId }).IsUnique();
            b.HasOne(x => x.User)
                .WithMany()
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<UploadSessionEntity>(b =>
        {
            b.ToTable("UploadSessions");
            b.HasKey(x => x.SessionId);
            b.Property(x => x.StorageKey).HasMaxLength(128).IsRequired();
            b.Property(x => x.Status).HasConversion<int>();
            b.HasIndex(x => x.ExpiresAt);
            b.HasOne(x => x.File)
                .WithMany()
                .HasForeignKey(x => x.FileId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<FileAuditEntity>(b =>
        {
            b.ToTable("FileAudits");
            b.HasKey(x => x.Id);
            b.Property(x => x.Action).HasMaxLength(64).IsRequired();
            b.Property(x => x.ShareToken).HasMaxLength(64);
            b.Property(x => x.Detail).HasMaxLength(1024);
            b.Property(x => x.TargetKind).HasConversion<int>();
            b.HasIndex(x => x.At);
        });
    }
}
