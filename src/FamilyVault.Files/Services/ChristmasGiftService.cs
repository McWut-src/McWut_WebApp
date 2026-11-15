using FamilyVault.Files.Contracts;
using FamilyVault.Files.Data;
using FamilyVault.Files.Data.Entities;
using FamilyVault.Files.Security;
using Microsoft.EntityFrameworkCore;

namespace FamilyVault.Files.Services;

public sealed class ChristmasGiftService(ApplicationDbContext db, TimeProvider time)
{
    public async Task<IReadOnlyList<ChristmasGiftMemberSummaryDto>> GetMembersAsync(
        Guid viewerUserId,
        CancellationToken cancellationToken = default)
    {
        var members = await db.FamilyMembers.AsNoTracking()
            .OrderBy(m => m.DisplayName)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        var kidUserIds = await GetKidUserIdsAsync(cancellationToken).ConfigureAwait(false);

        var itemCounts = await db.ChristmasGiftItems.AsNoTracking()
            .Where(x => !x.IsAdultSurprise && !x.IsDeletedByOwner)
            .GroupBy(g => g.OwnerUserId)
            .Select(g => new
            {
                OwnerUserId = g.Key,
                Total = g.Count()
            })
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        var countMap = itemCounts.ToDictionary(x => x.OwnerUserId, x => x.Total);

        var summaries = members.Select(m => new ChristmasGiftMemberSummaryDto(
            m.UserId,
            m.DisplayName,
            m.Email,
            m.AccentColor,
            kidUserIds.Contains(m.UserId),
            countMap.TryGetValue(m.UserId, out var total) ? total : 0)).ToList();

        // Sort: viewer first, then kids, then other adults
        return summaries
            .OrderByDescending(s => s.UserId == viewerUserId)
            .ThenByDescending(s => s.IsKid)
            .ThenBy(s => s.DisplayName)
            .ToList();
    }

    public async Task<IReadOnlyList<ChristmasGiftItemDto>> GetItemsAsync(
        Guid ownerUserId,
        Guid viewerUserId,
        CancellationToken cancellationToken = default)
    {
        var rows = await db.ChristmasGiftItems.AsNoTracking()
            .Where(g => g.OwnerUserId == ownerUserId && !g.IsAdultSurprise && !g.IsDeletedByOwner)
            .OrderBy(g => g.SortOrder)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        if (rows.Count == 0)
        {
            return [];
        }

        // SQLite cannot ORDER BY DateTimeOffset; sort in memory after load.
        var items = rows
            .OrderBy(g => g.SortOrder)
            .ThenBy(g => g.CreatedAt)
            .ToList();

        var isOwner = viewerUserId == ownerUserId;
        return items
            .Select(item => MapToDto(item, isOwner))
            .ToList();
    }

    public async Task<ChristmasGiftItemDto> CreateItemAsync(
        Guid ownerUserId,
        CreateChristmasGiftItemRequest request,
        CancellationToken cancellationToken = default)
    {
        var (title, description, url, mediaType) = ValidateAndNormalizeInput(
            request.Title,
            request.Description,
            request.Url,
            request.ImageFileId,
            request.ImageType);

        if (request.ImageFileId.HasValue)
        {
            await EnsureAttachmentExistsAsync(request.ImageFileId.Value, cancellationToken).ConfigureAwait(false);
        }

        var maxSort = await db.ChristmasGiftItems
            .Where(g => g.OwnerUserId == ownerUserId)
            .Select(g => (int?)g.SortOrder)
            .MaxAsync(cancellationToken)
            .ConfigureAwait(false) ?? 0;

        var entity = new ChristmasGiftItemEntity
        {
            Id = Guid.NewGuid(),
            OwnerUserId = ownerUserId,
            Title = title,
            Description = description,
            Url = url,
            ImageFileId = request.ImageFileId,
            ImageType = mediaType,
            Occasion = "anytime",
            IsAdultSurprise = false,
            IsDeletedByOwner = false,
            ClaimStatus = "claimed",
            CreatedAt = time.GetUtcNow(),
            SortOrder = maxSort + 1
        };

        db.ChristmasGiftItems.Add(entity);
        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        return MapToDto(entity, isOwner: true);
    }

    public async Task<ChristmasGiftItemDto> UpdateItemAsync(
        Guid ownerUserId,
        Guid itemId,
        UpdateChristmasGiftItemRequest request,
        CancellationToken cancellationToken = default)
    {
        var item = await db.ChristmasGiftItems
            .FirstOrDefaultAsync(g => g.Id == itemId, cancellationToken)
            .ConfigureAwait(false);

        if (item is null || item.IsDeletedByOwner || item.IsAdultSurprise)
        {
            throw new VaultNotFoundException();
        }

        if (item.OwnerUserId != ownerUserId)
        {
            throw new ChristmasGiftValidationException("You can only edit items on your own gift list.");
        }

        var (title, description, url, mediaType) = ValidateAndNormalizeInput(
            request.Title,
            request.Description,
            request.Url,
            request.ImageFileId,
            request.ImageType);

        if (request.ImageFileId.HasValue && request.ImageFileId != item.ImageFileId)
        {
            await EnsureAttachmentExistsAsync(request.ImageFileId.Value, cancellationToken).ConfigureAwait(false);
        }

        item.Title = title;
        item.Description = description;
        item.Url = url;
        item.ImageFileId = request.ImageFileId;
        item.ImageType = mediaType;
        item.UpdatedAt = time.GetUtcNow();

        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        return MapToDto(item, isOwner: true);
    }

    public Task DeleteItemAsync(
        Guid ownerUserId,
        Guid itemId,
        CancellationToken cancellationToken = default)
        => DeleteItemAsync(ownerUserId, actorIsAdmin: false, itemId, cancellationToken);

    public async Task DeleteItemAsync(
        Guid actorUserId,
        bool actorIsAdmin,
        Guid itemId,
        CancellationToken cancellationToken = default)
    {
        var item = await db.ChristmasGiftItems
            .FirstOrDefaultAsync(g => g.Id == itemId, cancellationToken)
            .ConfigureAwait(false);

        if (item is null || item.IsDeletedByOwner || item.IsAdultSurprise)
        {
            throw new VaultNotFoundException();
        }

        if (item.OwnerUserId != actorUserId && !actorIsAdmin)
        {
            throw new ChristmasGiftValidationException("You can only delete items on your own gift list.");
        }

        db.ChristmasGiftItems.Remove(item);
        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
    }

    public async Task ReorderItemsAsync(
        Guid ownerUserId,
        IReadOnlyList<Guid> itemIds,
        CancellationToken cancellationToken = default)
    {
        if (itemIds.Count == 0)
        {
            return;
        }

        var items = await db.ChristmasGiftItems
            .Where(g => g.OwnerUserId == ownerUserId && !g.IsAdultSurprise && !g.IsDeletedByOwner)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        var map = items.ToDictionary(i => i.Id);
        var order = 1;
        foreach (var id in itemIds)
        {
            if (map.TryGetValue(id, out var item))
            {
                item.SortOrder = order++;
            }
        }

        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
    }

    private static (string Title, string? Description, string? Url, string? MediaType) ValidateAndNormalizeInput(
        string? rawTitle,
        string? rawDescription,
        string? rawUrl,
        Guid? imageFileId,
        string? rawImageType)
    {
        var trimmedTitle = rawTitle?.Trim();
        if (string.IsNullOrWhiteSpace(rawUrl)
            && !string.IsNullOrWhiteSpace(trimmedTitle)
            && (trimmedTitle.StartsWith("http://", StringComparison.OrdinalIgnoreCase)
                || trimmedTitle.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
            && !trimmedTitle.Any(char.IsWhiteSpace))
        {
            rawUrl = trimmedTitle;
            rawTitle = string.Empty;
        }

        var title = ChristmasGiftRules.ValidateTitle(rawTitle);
        var description = ChristmasGiftRules.ValidateDescription(rawDescription);
        var url = ChristmasGiftRules.ValidateUrl(rawUrl);
        var mediaType = imageFileId.HasValue
            ? ChristmasGiftRules.NormalizeMediaType(rawImageType) ?? "photo"
            : null;

        ChristmasGiftRules.EnsureHasContent(title, description, url, imageFileId);
        return (title, description, url, mediaType);
    }

    private async Task EnsureAttachmentExistsAsync(Guid fileId, CancellationToken cancellationToken)
    {
        var file = await db.StoredFiles.AsNoTracking()
            .FirstOrDefaultAsync(f => f.Id == fileId && f.DeletedAt == null, cancellationToken)
            .ConfigureAwait(false);
        if (file is null)
        {
            throw new VaultNotFoundException();
        }
    }

    private static ChristmasGiftItemDto MapToDto(ChristmasGiftItemEntity item, bool isOwner)
        => new(
            item.Id,
            item.OwnerUserId,
            item.Title,
            item.Description,
            item.Url,
            item.ImageFileId,
            item.ImageType,
            item.CreatedAt,
            item.SortOrder,
            CanEdit: isOwner,
            CanDelete: isOwner);

    private async Task<HashSet<Guid>> GetKidUserIdsAsync(CancellationToken cancellationToken)
    {
        var kidRoleId = await db.Roles.AsNoTracking()
            .Where(r => r.Name == "Kid")
            .Select(r => r.Id)
            .FirstOrDefaultAsync(cancellationToken)
            .ConfigureAwait(false);

        if (kidRoleId is null)
        {
            return [];
        }

        var rawUserIds = await db.UserRoles.AsNoTracking()
            .Where(ur => ur.RoleId == kidRoleId)
            .Select(ur => ur.UserId)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        return rawUserIds
            .Select(id => Guid.TryParse(id, out var g) ? g : Guid.Empty)
            .Where(g => g != Guid.Empty)
            .ToHashSet();
    }
}
