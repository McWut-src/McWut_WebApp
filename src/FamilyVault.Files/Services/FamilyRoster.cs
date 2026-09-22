using FamilyVault.Files.Contracts;
using FamilyVault.Files.Data;
using FamilyVault.Files.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace FamilyVault.Files.Services;

public sealed class FamilyRoster(ApplicationDbContext db, TimeProvider time) : IFamilyRoster
{
    public async Task UpsertAsync(FamilyMember member, CancellationToken cancellationToken = default)
    {
        var now = time.GetUtcNow();
        var existing = await db.FamilyMembers.FirstOrDefaultAsync(m => m.UserId == member.UserId, cancellationToken).ConfigureAwait(false);
        if (existing is null)
        {
            db.FamilyMembers.Add(new FamilyMemberEntity
            {
                UserId = member.UserId,
                Email = member.Email,
                DisplayName = string.IsNullOrWhiteSpace(member.DisplayName) ? "Family member" : member.DisplayName,
                FirstSeenAt = now,
                LastSeenAt = now
            });
        }
        else
        {
            existing.Email = member.Email ?? existing.Email;
            if (!string.IsNullOrWhiteSpace(member.DisplayName))
            {
                existing.DisplayName = member.DisplayName;
            }

            existing.LastSeenAt = now;
        }

        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
    }

    public async Task<IReadOnlyList<FamilyMember>> ListAsync(CancellationToken cancellationToken = default)
    {
        var rows = await db.FamilyMembers
            .AsNoTracking()
            .OrderBy(m => m.DisplayName)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);
        return rows.Select(m => m.ToRecord()).ToList();
    }

    public async Task<FamilyMember?> GetAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var row = await db.FamilyMembers.AsNoTracking()
            .FirstOrDefaultAsync(m => m.UserId == userId, cancellationToken)
            .ConfigureAwait(false);
        return row?.ToRecord();
    }
}
