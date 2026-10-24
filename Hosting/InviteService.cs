using FamilyVault.Files.Data;
using FamilyVault.Files.Data.Entities;
using FamilyVault.Files.Security;
using Microsoft.EntityFrameworkCore;

namespace McWutWebApp.Hosting;

public sealed class InviteService(ApplicationDbContext db, TimeProvider time)
{
    public async Task<InviteEntity> CreateAsync(Guid createdByUserId, string? email, int daysValid, CancellationToken cancellationToken)
    {
        var now = time.GetUtcNow();
        var invite = new InviteEntity
        {
            Id = Guid.NewGuid(),
            Token = ShareTokenGenerator.Create(),
            Email = string.IsNullOrWhiteSpace(email) ? null : email.Trim(),
            CreatedByUserId = createdByUserId,
            CreatedAt = now,
            ExpiresAt = now.AddDays(daysValid <= 0 ? 7 : daysValid)
        };
        db.Invites.Add(invite);
        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        return invite;
    }

    public async Task<List<InviteEntity>> ListAsync(CancellationToken cancellationToken)
    {
        var rows = await db.Invites.AsNoTracking().ToListAsync(cancellationToken).ConfigureAwait(false);
        return rows.OrderByDescending(i => i.CreatedAt).Take(50).ToList();
    }

    public async Task<InviteEntity?> FindUsableAsync(string token, CancellationToken cancellationToken)
    {
        var row = await db.Invites
            .FirstOrDefaultAsync(i => i.Token == token && i.UsedAt == null, cancellationToken)
            .ConfigureAwait(false);
        return row is not null && row.ExpiresAt > time.GetUtcNow() ? row : null;
    }

    public async Task MarkUsedAsync(InviteEntity invite, Guid userId, CancellationToken cancellationToken)
    {
        invite.UsedAt = time.GetUtcNow();
        invite.UsedByUserId = userId;
        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
    }
}
