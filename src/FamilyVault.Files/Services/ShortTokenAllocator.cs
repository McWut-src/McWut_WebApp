using FamilyVault.Files.Data;
using FamilyVault.Files.Security;
using Microsoft.EntityFrameworkCore;

namespace FamilyVault.Files.Services;

internal static class ShortTokenAllocator
{
    public static async Task<string> AllocateAsync(ApplicationDbContext db, CancellationToken cancellationToken)
    {
        for (var attempt = 0; attempt < 5; attempt++)
        {
            var token = ShareTokenGenerator.CreateShort();
            var taken = await db.ShareLinks.AsNoTracking().AnyAsync(x => x.Token == token, cancellationToken).ConfigureAwait(false)
                || await db.ShortLinks.AsNoTracking().AnyAsync(x => x.Token == token, cancellationToken).ConfigureAwait(false);
            if (!taken)
            {
                return token;
            }
        }

        return ShareTokenGenerator.CreateShort();
    }
}
