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
    DateTimeOffset UpdatedAt);

public sealed class PasswordVaultService(
    ApplicationDbContext db,
    IDataProtectionProvider protection,
    TimeProvider time)
{
    private readonly IDataProtector _protector = protection.CreateProtector("McWut.PasswordVault.v1");

    public async Task<IReadOnlyList<PasswordVaultItemView>> ListAsync(Guid ownerUserId, CancellationToken cancellationToken)
    {
        var rows = await db.PasswordVaultItems.AsNoTracking()
            .Where(x => x.OwnerUserId == ownerUserId)
            .OrderBy(x => x.Name)
            .ThenBy(x => x.Id)
            .ToListAsync(cancellationToken);
        return rows.Select(Read).ToList();
    }

    public async Task<PasswordVaultItemView> GetAsync(Guid ownerUserId, Guid id, CancellationToken cancellationToken)
    {
        var row = await FindOwnedAsync(ownerUserId, id, tracking: false, cancellationToken);
        return Read(row);
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
        return Read(row);
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
        return Read(row);
    }

    public async Task DeleteAsync(Guid ownerUserId, Guid id, CancellationToken cancellationToken)
    {
        var row = await FindOwnedAsync(ownerUserId, id, tracking: true, cancellationToken);
        db.PasswordVaultItems.Remove(row);
        await db.SaveChangesAsync(cancellationToken);
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
