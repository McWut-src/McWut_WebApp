using FamilyVault.Files.Contracts;
using FamilyVault.Files.Data.Entities;
using FamilyVault.Files.Security;
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
    public DbSet<InviteEntity> Invites => Set<InviteEntity>();
    public DbSet<PasswordVaultItemEntity> PasswordVaultItems => Set<PasswordVaultItemEntity>();
    public DbSet<ShortLinkEntity> ShortLinks => Set<ShortLinkEntity>();
    public DbSet<OpenRouterKeyEntity> OpenRouterKeys => Set<OpenRouterKeyEntity>();
    public DbSet<UserPersonalizationEntity> UserPersonalizations => Set<UserPersonalizationEntity>();
    public DbSet<SystemSettingEntity> SystemSettings => Set<SystemSettingEntity>();
    public DbSet<DirectConversationEntity> DirectConversations => Set<DirectConversationEntity>();
    public DbSet<DirectConversationMemberEntity> DirectConversationMembers => Set<DirectConversationMemberEntity>();
    public DbSet<DirectMessageEntity> DirectMessages => Set<DirectMessageEntity>();
    public DbSet<DirectMessageReactionEntity> DirectMessageReactions => Set<DirectMessageReactionEntity>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<FamilyMemberEntity>(b =>
        {
            b.ToTable("FamilyMembers");
            b.HasKey(x => x.UserId);
            b.Property(x => x.DisplayName).HasMaxLength(256).IsRequired();
            b.Property(x => x.Email).HasMaxLength(256);
            b.Property(x => x.AccentColor).HasMaxLength(7);
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
            b.Property(x => x.IsChatOnly).HasDefaultValue(false);
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
            b.Property(x => x.IsStory).HasDefaultValue(false);
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

        modelBuilder.Entity<InviteEntity>(b =>
        {
            b.ToTable("Invites");
            b.HasKey(x => x.Id);
            b.Property(x => x.Token).HasMaxLength(64).IsRequired();
            b.Property(x => x.Email).HasMaxLength(256);
            b.HasIndex(x => x.Token).IsUnique();
        });

        modelBuilder.Entity<PasswordVaultItemEntity>(b =>
        {
            b.ToTable("PasswordVaultItems");
            b.HasKey(x => x.Id);
            b.Property(x => x.Name).HasMaxLength(PasswordVaultRules.NameMax).IsRequired();
            b.Property(x => x.UsernameCipher).IsRequired();
            b.Property(x => x.PasswordCipher).IsRequired();
            b.Property(x => x.UrlCipher).IsRequired();
            b.Property(x => x.NotesCipher).IsRequired();
            b.HasIndex(x => new { x.OwnerUserId, x.Name });
        });

        modelBuilder.Entity<ShortLinkEntity>(b =>
        {
            b.ToTable("ShortLinks");
            b.HasKey(x => x.Id);
            b.Property(x => x.Token).HasMaxLength(64).IsRequired();
            b.Property(x => x.TargetUrl).HasMaxLength(ShortLinkRules.UrlMax).IsRequired();
            b.HasIndex(x => x.Token).IsUnique();
            b.HasIndex(x => x.OwnerUserId);
        });

        modelBuilder.Entity<OpenRouterKeyEntity>(b =>
        {
            b.ToTable("OpenRouterKeys");
            b.HasKey(x => x.UserId);
            b.Property(x => x.KeyCipher).IsRequired();
        });

        modelBuilder.Entity<DirectConversationEntity>(b =>
        {
            b.ToTable("DirectConversations");
            b.HasKey(x => x.Id);
            b.Property(x => x.IsGroup).HasDefaultValue(false);
            b.Property(x => x.Title).HasMaxLength(80);
            b.Property(x => x.LastPreview).HasMaxLength(120);
            b.Property(x => x.LowReadSequence).HasDefaultValue(0L);
            b.Property(x => x.HighReadSequence).HasDefaultValue(0L);
            b.HasIndex(x => new { x.LowUserId, x.HighUserId });
            b.HasIndex(x => x.HighUserId);
            b.HasOne<FamilyMemberEntity>()
                .WithMany()
                .HasForeignKey(x => x.LowUserId)
                .OnDelete(DeleteBehavior.Restrict);
            b.HasOne<FamilyMemberEntity>()
                .WithMany()
                .HasForeignKey(x => x.HighUserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<DirectConversationMemberEntity>(b =>
        {
            b.ToTable("DirectConversationMembers");
            b.HasKey(x => x.Id);
            b.HasIndex(x => new { x.ConversationId, x.UserId }).IsUnique();
            b.HasIndex(x => x.UserId);
            b.HasOne<DirectConversationEntity>()
                .WithMany()
                .HasForeignKey(x => x.ConversationId)
                .OnDelete(DeleteBehavior.Cascade);
            b.HasOne<FamilyMemberEntity>()
                .WithMany()
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<DirectMessageEntity>(b =>
        {
            b.ToTable("DirectMessages");
            b.HasKey(x => x.Id);
            b.Property(x => x.Body).HasMaxLength(DirectMessageRules.BodyMax).IsRequired();
            b.Property(x => x.AttachmentType).HasMaxLength(24);
            b.Property(x => x.QuotedAuthor).HasMaxLength(80);
            b.Property(x => x.QuotedSnippet).HasMaxLength(200);
            b.HasIndex(x => new { x.ConversationId, x.Sequence }).IsUnique();
            b.HasIndex(x => x.AttachmentFileId);
            b.HasIndex(x => x.ExpiresAt);
            b.HasOne<DirectConversationEntity>()
                .WithMany()
                .HasForeignKey(x => x.ConversationId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<DirectMessageReactionEntity>(b =>
        {
            b.ToTable("DirectMessageReactions");
            b.HasKey(x => x.Id);
            b.Property(x => x.Emoji).HasMaxLength(16).IsRequired();
            b.HasIndex(x => new { x.MessageId, x.UserId, x.Emoji }).IsUnique();
            b.HasOne<DirectMessageEntity>()
                .WithMany()
                .HasForeignKey(x => x.MessageId)
                .OnDelete(DeleteBehavior.Cascade);
            b.HasOne<FamilyMemberEntity>()
                .WithMany()
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<UserPersonalizationEntity>(b =>
        {
            b.ToTable("UserPersonalizations");
            b.HasKey(x => x.UserId);
            b.Property(x => x.StatusTag).HasMaxLength(30).IsRequired();
            b.Property(x => x.HeaderBadge).HasMaxLength(64).IsRequired();
            b.Property(x => x.HeaderMotif).HasMaxLength(64).IsRequired();
            b.Property(x => x.BackgroundTile).HasMaxLength(64).IsRequired();
            b.Property(x => x.ChimeTheme).HasMaxLength(32).IsRequired();
            b.HasOne(x => x.User)
                .WithMany()
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<SystemSettingEntity>(b =>
        {
            b.ToTable("SystemSettings");
            b.HasKey(x => x.Key);
            b.Property(x => x.Key).HasMaxLength(64).IsRequired();
            b.Property(x => x.ValueCipher).IsRequired();
        });
    }
}
