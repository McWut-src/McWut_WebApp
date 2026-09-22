using FamilyVault.Files.Contracts;
using FamilyVault.Files.Data;
using FamilyVault.Files.Data.Entities;

namespace FamilyVault.Files.Services;

public sealed class FileAuditService(ApplicationDbContext db, TimeProvider time) : IFileAudit
{
    public async Task RecordAsync(
        string action,
        ShareTargetKind targetKind,
        Guid targetId,
        Guid? actorUserId,
        string? shareToken,
        string? detail,
        CancellationToken cancellationToken = default)
    {
        db.FileAudits.Add(new FileAuditEntity
        {
            Id = Guid.NewGuid(),
            At = time.GetUtcNow(),
            Action = action,
            TargetKind = targetKind,
            TargetId = targetId,
            ActorUserId = actorUserId,
            ShareToken = shareToken,
            Detail = detail
        });
        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
    }
}
