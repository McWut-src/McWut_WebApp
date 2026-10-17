using System.Security.Cryptography;
using FamilyVault.Files.Contracts;
using FamilyVault.Files.Data;
using FamilyVault.Files.Data.Entities;
using FamilyVault.Files.Security;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;

namespace McWutWebApp.Hosting;

public sealed record PasswordVaultItemView(
    Guid Id,
    string Name,
    string Username,
    string Password,
    string? Url,
    string Information,
    bool Unreadable,
    DateTimeOffset UpdatedAt,
    IReadOnlyList<MemberTag>? SharedWith = null,
    MemberTag? SharedBy = null);

public sealed record PasswordVaultImportResult(int Added, int Skipped, Guid? FirstAddedId);

public sealed class PasswordVaultService(
    ApplicationDbContext db,
    IDataProtectionProvider protection,
    TimeProvider time)
{
    private readonly IDataProtector _protector = protection.CreateProtector("McWut.PasswordVault.v1");

    /// <summary>The person's own logins (with who they are shared with), then logins other members shared with them.</summary>
    public async Task<IReadOnlyList<PasswordVaultItemView>> ListAsync(Guid userId, CancellationToken cancellationToken)
    {
        var owned = await db.PasswordVaultItems.AsNoTracking()
            .Where(x => x.OwnerUserId == userId)
            .OrderBy(x => x.Name)
            .ThenBy(x => x.Id)
            .ToListAsync(cancellationToken);
        var ownedIds = owned.Select(x => x.Id).ToList();

        List<FileGrantEntity> outgoing = ownedIds.Count == 0
            ? []
            : await db.FileGrants.AsNoTracking()
                .Where(g => g.TargetKind == ShareTargetKind.Password && ownedIds.Contains(g.TargetId))
                .ToListAsync(cancellationToken);

        var incoming = await db.FileGrants.AsNoTracking()
            .Where(g => g.TargetKind == ShareTargetKind.Password && g.UserId == userId)
            .ToListAsync(cancellationToken);
        var incomingIds = incoming.Select(g => g.TargetId).ToList();
        List<PasswordVaultItemEntity> shared = incomingIds.Count == 0
            ? []
            : await db.PasswordVaultItems.AsNoTracking()
                .Where(x => incomingIds.Contains(x.Id) && x.OwnerUserId != userId)
                .ToListAsync(cancellationToken);

        var members = await MembersByIdAsync(
            outgoing.Select(g => g.UserId).Concat(shared.Select(x => x.OwnerUserId)),
            cancellationToken);

        var result = owned
            .Select(row => Read(row) with
            {
                SharedWith = outgoing
                    .Where(g => g.TargetId == row.Id)
                    .OrderBy(g => g.GrantedAt)
                    .Select(g => TagFor(members, g.UserId))
                    .ToList()
            })
            .ToList();
        result.AddRange(shared
            .OrderBy(x => x.Name)
            .ThenBy(x => x.Id)
            .Select(row => Read(row) with { SharedBy = TagFor(members, row.OwnerUserId) }));
        return result;
    }

    public async Task<PasswordVaultItemView> GetAsync(Guid userId, Guid id, CancellationToken cancellationToken)
    {
        var row = await db.PasswordVaultItems.AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken)
            ?? throw new VaultNotFoundException();
        if (row.OwnerUserId == userId)
        {
            return Read(row);
        }

        var granted = await db.FileGrants.AsNoTracking()
            .AnyAsync(g => g.TargetKind == ShareTargetKind.Password && g.TargetId == id && g.UserId == userId, cancellationToken);
        if (!granted)
        {
            throw new VaultNotFoundException();
        }

        var members = await MembersByIdAsync([row.OwnerUserId], cancellationToken);
        return Read(row) with { SharedBy = TagFor(members, row.OwnerUserId) };
    }

    public async Task<PasswordVaultItemView> CreateAsync(
        Guid ownerUserId,
        string? name,
        string? username,
        string? password,
        string? url,
        string? information,
        CancellationToken cancellationToken)
    {
        var fields = PasswordVaultRules.Normalize(name, username, password, url, information);
        var now = time.GetUtcNow();
        var row = new PasswordVaultItemEntity
        {
            Id = Guid.NewGuid(),
            OwnerUserId = ownerUserId,
            Name = fields.Name,
            UsernameCipher = Protect(fields.Username),
            PasswordCipher = Protect(fields.Password),
            UrlCipher = Protect(fields.Url ?? ""),
            NotesCipher = Protect(fields.Notes),
            CreatedAt = now,
            UpdatedAt = now
        };
        db.PasswordVaultItems.Add(row);
        await db.SaveChangesAsync(cancellationToken);
        return Read(row) with { SharedWith = [] };
    }

    public async Task<PasswordVaultItemView> UpdateAsync(
        Guid ownerUserId,
        Guid id,
        string? name,
        string? username,
        string? password,
        string? url,
        string? information,
        CancellationToken cancellationToken)
    {
        var fields = PasswordVaultRules.Normalize(name, username, password, url, information);
        var row = await FindOwnedAsync(ownerUserId, id, tracking: true, cancellationToken);
        row.Name = fields.Name;
        row.UsernameCipher = Protect(fields.Username);
        row.PasswordCipher = Protect(fields.Password);
        row.UrlCipher = Protect(fields.Url ?? "");
        row.NotesCipher = Protect(fields.Notes);
        row.UpdatedAt = time.GetUtcNow();
        await db.SaveChangesAsync(cancellationToken);
        return Read(row) with { SharedWith = await TagsForAsync(id, cancellationToken) };
    }

    public async Task DeleteAsync(Guid ownerUserId, Guid id, CancellationToken cancellationToken)
    {
        var row = await FindOwnedAsync(ownerUserId, id, tracking: true, cancellationToken);
        var grants = await db.FileGrants
            .Where(g => g.TargetKind == ShareTargetKind.Password && g.TargetId == id)
            .ToListAsync(cancellationToken);
        db.FileGrants.RemoveRange(grants);
        db.PasswordVaultItems.Remove(row);
        await db.SaveChangesAsync(cancellationToken);
    }

    /// <summary>Lets another member read one of the owner's logins. They cannot edit, delete, or share it.</summary>
    public async Task<IReadOnlyList<MemberTag>> ShareAsync(Guid ownerUserId, Guid id, Guid memberUserId, CancellationToken cancellationToken)
    {
        await FindOwnedAsync(ownerUserId, id, tracking: false, cancellationToken);
        if (memberUserId == ownerUserId)
        {
            throw new VaultNotFoundException();
        }

        var memberExists = await db.FamilyMembers.AsNoTracking().AnyAsync(m => m.UserId == memberUserId, cancellationToken);
        if (!memberExists)
        {
            throw new VaultNotFoundException();
        }

        var existing = await db.FileGrants
            .AnyAsync(g => g.TargetKind == ShareTargetKind.Password && g.TargetId == id && g.UserId == memberUserId, cancellationToken);
        if (!existing)
        {
            db.FileGrants.Add(new FileGrantEntity
            {
                Id = Guid.NewGuid(),
                TargetKind = ShareTargetKind.Password,
                TargetId = id,
                UserId = memberUserId,
                Permission = FilePermission.View,
                GrantedByUserId = ownerUserId,
                GrantedAt = time.GetUtcNow()
            });
            await db.SaveChangesAsync(cancellationToken);
        }

        return await TagsForAsync(id, cancellationToken);
    }

    public async Task<IReadOnlyList<MemberTag>> UnshareAsync(Guid ownerUserId, Guid id, Guid memberUserId, CancellationToken cancellationToken)
    {
        await FindOwnedAsync(ownerUserId, id, tracking: false, cancellationToken);
        var grant = await db.FileGrants
            .FirstOrDefaultAsync(g => g.TargetKind == ShareTargetKind.Password && g.TargetId == id && g.UserId == memberUserId, cancellationToken);
        if (grant is not null)
        {
            db.FileGrants.Remove(grant);
            await db.SaveChangesAsync(cancellationToken);
        }

        return await TagsForAsync(id, cancellationToken);
    }

    /// <summary>Only the person's own logins. Shared logins are not exported or used for duplicate checks.</summary>
    public async Task<IReadOnlyList<PasswordVaultItemView>> ListOwnedAsync(Guid ownerUserId, CancellationToken cancellationToken)
    {
        var rows = await db.PasswordVaultItems.AsNoTracking()
            .Where(x => x.OwnerUserId == ownerUserId)
            .OrderBy(x => x.Name)
            .ThenBy(x => x.Id)
            .ToListAsync(cancellationToken);
        return rows.Select(Read).ToList();
    }

    public async Task<PasswordVaultImportResult> ImportAsync(Guid ownerUserId, string? json, CancellationToken cancellationToken)
    {
        var parsed = PasswordVaultRules.ParseExportJson(json);
        var existing = await ListOwnedAsync(ownerUserId, cancellationToken);
        var existingKeys = new HashSet<(string Name, string Username, string Password, string Url, string Info)>(
            existing.Select(x => (x.Name, x.Username, x.Password, x.Url ?? "", x.Information)));

        var now = time.GetUtcNow();
        var added = 0;
        var skipped = 0;
        Guid? firstAddedId = null;

        foreach (var fields in parsed)
        {
            var key = (fields.Name, fields.Username, fields.Password, fields.Url ?? "", fields.Notes);
            if (!existingKeys.Add(key))
            {
                skipped++;
                continue;
            }

            var row = new PasswordVaultItemEntity
            {
                Id = Guid.NewGuid(),
                OwnerUserId = ownerUserId,
                Name = fields.Name,
                UsernameCipher = Protect(fields.Username),
                PasswordCipher = Protect(fields.Password),
                UrlCipher = Protect(fields.Url ?? ""),
                NotesCipher = Protect(fields.Notes),
                CreatedAt = now,
                UpdatedAt = now
            };
            db.PasswordVaultItems.Add(row);
            firstAddedId ??= row.Id;
            added++;
        }

        if (added > 0)
        {
            await db.SaveChangesAsync(cancellationToken);
        }

        return new PasswordVaultImportResult(added, skipped, firstAddedId);
    }

    private async Task<PasswordVaultItemEntity> FindOwnedAsync(
        Guid ownerUserId,
        Guid id,
        bool tracking,
        CancellationToken cancellationToken)
    {
        var query = tracking ? db.PasswordVaultItems : db.PasswordVaultItems.AsNoTracking();
        var row = await query.FirstOrDefaultAsync(x => x.Id == id && x.OwnerUserId == ownerUserId, cancellationToken);
        return row ?? throw new VaultNotFoundException();
    }

    private async Task<IReadOnlyList<MemberTag>> TagsForAsync(Guid id, CancellationToken cancellationToken)
    {
        var grants = await db.FileGrants.AsNoTracking()
            .Where(g => g.TargetKind == ShareTargetKind.Password && g.TargetId == id)
            .ToListAsync(cancellationToken);
        var members = await MembersByIdAsync(grants.Select(g => g.UserId), cancellationToken);
        return grants
            .OrderBy(g => g.GrantedAt)
            .Select(g => TagFor(members, g.UserId))
            .ToList();
    }

    private async Task<Dictionary<Guid, FamilyMemberEntity>> MembersByIdAsync(IEnumerable<Guid> ids, CancellationToken cancellationToken)
    {
        var keys = ids.Distinct().ToList();
        if (keys.Count == 0)
        {
            return [];
        }

        var rows = await db.FamilyMembers.AsNoTracking()
            .Where(m => keys.Contains(m.UserId))
            .ToListAsync(cancellationToken);
        return rows.ToDictionary(m => m.UserId);
    }

    private static MemberTag TagFor(IReadOnlyDictionary<Guid, FamilyMemberEntity> members, Guid userId)
    {
        members.TryGetValue(userId, out var member);
        return new MemberTag(userId, MemberLabel.Shown(member?.DisplayName, member?.Email), ShownColor(member?.AccentColor));
    }

    private static string ShownColor(string? value)
    {
        var trimmed = (value ?? "").Trim();
        if (trimmed.Length == 7 && trimmed[0] == '#' && trimmed.Skip(1).All(Uri.IsHexDigit))
        {
            return trimmed.ToLowerInvariant();
        }

        return "#0b1f3a";
    }

    private string Protect(string value) => value.Length == 0 ? "" : _protector.Protect(value);

    private PasswordVaultItemView Read(PasswordVaultItemEntity row)
    {
        var unreadable = false;
        var username = Unprotect(row.UsernameCipher, ref unreadable);
        var password = Unprotect(row.PasswordCipher, ref unreadable);
        var url = Unprotect(row.UrlCipher, ref unreadable);
        var notes = Unprotect(row.NotesCipher, ref unreadable);
        return new PasswordVaultItemView(
            row.Id,
            row.Name,
            username,
            password,
            string.IsNullOrEmpty(url) ? null : url,
            notes,
            unreadable,
            row.UpdatedAt);
    }

    private string Unprotect(string cipher, ref bool unreadable)
    {
        if (cipher.Length == 0)
        {
            return "";
        }

        try
        {
            return _protector.Unprotect(cipher);
        }
        catch (CryptographicException)
        {
            unreadable = true;
            return "";
        }
    }
}
