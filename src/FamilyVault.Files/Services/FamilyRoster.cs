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
                DisplayName = string.IsNullOrWhiteSpace(member.DisplayName) ? "Member" : member.DisplayName,
                FirstSeenAt = now,
                LastSeenAt = now
            });
        }
        else
        {
            var dirty = false;
            if (member.Email is not null && member.Email != existing.Email)
            {
                existing.Email = member.Email;
                dirty = true;
            }

            if (string.IsNullOrWhiteSpace(existing.DisplayName))
            {
                existing.DisplayName = string.IsNullOrWhiteSpace(member.DisplayName) ? "Member" : member.DisplayName.Trim();
                dirty = true;
            }

            if (existing.LastSeenAt == default || now - existing.LastSeenAt >= TimeSpan.FromMinutes(5))
            {
                existing.LastSeenAt = now;
                dirty = true;
            }

            if (dirty)
            {
                await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
            }
        }
    }

    public async Task UpdateProfileAsync(Guid userId, string? email, string displayName, string? accentColor, CancellationToken cancellationToken = default)
    {
        var now = time.GetUtcNow();
        var row = await db.FamilyMembers.FirstOrDefaultAsync(m => m.UserId == userId, cancellationToken).ConfigureAwait(false);
        if (row is null)
        {
            db.FamilyMembers.Add(new FamilyMemberEntity
            {
                UserId = userId,
                Email = email,
                DisplayName = displayName.Trim(),
                AccentColor = accentColor,
                FirstSeenAt = now,
                LastSeenAt = now
            });
        }
        else
        {
            row.DisplayName = displayName.Trim();
            row.AccentColor = accentColor;
            if (!string.IsNullOrWhiteSpace(email))
            {
                row.Email = email;
            }

            row.LastSeenAt = now;
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
