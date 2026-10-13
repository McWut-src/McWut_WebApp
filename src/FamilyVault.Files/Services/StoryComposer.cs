using FamilyVault.Files.Contracts;
using FamilyVault.Files.Data;
using FamilyVault.Files.Data.Entities;
using FamilyVault.Files.Security;

namespace FamilyVault.Files.Services;

public static class StoryComposer
{
    public static Story? Compose(DropEntity drop, IReadOnlyList<StoredFileEntity> files, DateTimeOffset now)
    {
        if (!drop.IsStory || drop.DeletedAt is not null)
        {
            return null;
        }

        if (drop.ExpiresAt is DateTimeOffset exp && exp <= now)
        {
            return null;
        }

        var live = files
            .Where(file => file.DropId == drop.Id
                && file.DeletedAt is null
                && file.Status == FileStatus.Ready
                && (file.ExpiresAt is null || file.ExpiresAt > now))
            .ToList();
        if (live.Count == 0)
        {
            return null;
        }

        var records = live.Select(file => file.ToRecord()).ToList();
        var body = StoryFiles.FindBody(drop.Title, records);
        var attachments = records
            .Where(file => body is null || file.Id != body.Id)
            .OrderBy(file => file.OriginalFileName, StringComparer.OrdinalIgnoreCase)
            .ToList();
        return new Story(
            drop.Id,
            drop.OwnerUserId,
            drop.Title,
            drop.CreatedAt,
            drop.ExpiresAt,
            drop.PasswordHash is not null,
            body,
            attachments);
    }
}
