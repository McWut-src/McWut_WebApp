using FamilyVault.Files.Configuration;
using FamilyVault.Files.Contracts;
using FamilyVault.Files.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace FamilyVault.Files.Services;

public sealed class QuotaService(ApplicationDbContext db, IOptions<FilesOptions> options) : IQuotaService
{
    public async Task EnsureCanAcceptAsync(Guid ownerUserId, long additionalBytes, CancellationToken cancellationToken = default)
    {
        var used = await db.StoredFiles
            .Where(f => f.OwnerUserId == ownerUserId && f.DeletedAt == null && f.Status != FileStatus.Failed)
            .SumAsync(f => f.SizeBytes, cancellationToken)
            .ConfigureAwait(false);

        var quota = options.Value.QuotaBytesPerUser;
        if (used + additionalBytes > quota)
        {
            throw new QuotaExceededException(used, additionalBytes, quota);
        }
    }
}
