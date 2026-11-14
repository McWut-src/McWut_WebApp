using System.Text.Json;
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
        bool viewerIsKid,
        CancellationToken cancellationToken = default)
    {
        var members = await db.FamilyMembers.AsNoTracking()
            .OrderBy(m => m.DisplayName)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        var kidUserIds = await GetKidUserIdsAsync(cancellationToken).ConfigureAwait(false);

        var itemCounts = await db.ChristmasGiftItems.AsNoTracking()
            .GroupBy(g => g.OwnerUserId)
            .Select(g => new
            {
                OwnerUserId = g.Key,
                Total = g.Count(x => !x.IsAdultSurprise && !x.IsDeletedByOwner),
                Claimed = g.Count(x => x.ClaimedByUserId != null && !x.IsDeletedByOwner)
            })
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        var countMap = itemCounts.ToDictionary(x => x.OwnerUserId);

        var summaries = members.Select(m =>
        {
            var isKid = kidUserIds.Contains(m.UserId);
            var total = countMap.TryGetValue(m.UserId, out var c) ? c.Total : 0;
            var claimed = countMap.TryGetValue(m.UserId, out var c2) ? c2.Claimed : 0;
            return new ChristmasGiftMemberSummaryDto(
                m.UserId,
                m.DisplayName,
                m.Email,
                m.AccentColor,
                isKid,
                total,
                viewerIsKid ? null : claimed);
        }).ToList();

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
        bool viewerIsKid,
        CancellationToken cancellationToken = default)
    {
        var rows = await db.ChristmasGiftItems.AsNoTracking()
            .Where(g => g.OwnerUserId == ownerUserId)
            .OrderBy(g => g.SortOrder)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        if (rows.Count == 0)
        {
            return [];
        }

        var isOwner = viewerUserId == ownerUserId;
        var canSeeClaims = !isOwner && !viewerIsKid;

        var filtered = canSeeClaims
            ? rows
            : rows.Where(i => !i.IsAdultSurprise && !i.IsDeletedByOwner).ToList();

        if (filtered.Count == 0)
        {
            return [];
        }

        var items = filtered
            .OrderByDescending(g => g.IsMostWanted)
            .ThenBy(g => g.SortOrder)
            .ThenBy(g => g.CreatedAt)
            .ToList();

        Dictionary<Guid, FamilyMemberEntity> memberLookup = [];
        if (canSeeClaims)
        {
            memberLookup = await LoadReferencedMembersAsync(items, cancellationToken).ConfigureAwait(false);
        }

        return items
            .Select(item => MapToDto(item, viewerUserId, isOwner, canSeeClaims, memberLookup))
            .ToList();
    }

    public async Task<ChristmasGiftItemDto> CreateItemAsync(
        Guid ownerUserId,
        CreateChristmasGiftItemRequest request,
        CancellationToken cancellationToken = default)
    {
        var title = ChristmasGiftRules.ValidateTitle(request.Title);
        var description = ChristmasGiftRules.ValidateDescription(request.Description);
        var url = ChristmasGiftRules.ValidateUrl(request.Url);
        var occasion = ChristmasGiftRules.NormalizeOccasion(request.Occasion);
        var categoryTag = ChristmasGiftRules.NormalizeCategoryTag(request.CategoryTag);

        if (request.ImageFileId.HasValue)
        {
            var file = await db.StoredFiles.AsNoTracking()
                .FirstOrDefaultAsync(f => f.Id == request.ImageFileId.Value && f.DeletedAt == null, cancellationToken)
                .ConfigureAwait(false);
            if (file is null)
            {
                throw new VaultNotFoundException();
            }
        }

        if (request.IsMostWanted)
        {
            await EnsureMostWantedQuotaAsync(ownerUserId, excludeItemId: null, cancellationToken).ConfigureAwait(false);
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
            ImageType = string.IsNullOrWhiteSpace(request.ImageType) ? null : request.ImageType.Trim().ToLowerInvariant(),
            Occasion = occasion,
            CategoryTag = categoryTag,
            IsMostWanted = request.IsMostWanted,
            IsAdultSurprise = false,
            IsDeletedByOwner = false,
            ClaimStatus = "claimed",
            CreatedAt = time.GetUtcNow(),
            SortOrder = maxSort + 1
        };

        db.ChristmasGiftItems.Add(entity);
        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        return MapToDto(entity, ownerUserId, isOwner: true, canSeeClaims: false, []);
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

        if (item is null || item.IsDeletedByOwner)
        {
            throw new VaultNotFoundException();
        }

        if (item.OwnerUserId != ownerUserId || item.IsAdultSurprise)
        {
            throw new ChristmasGiftValidationException("You can only edit items on your own wishlist.");
        }

        var title = ChristmasGiftRules.ValidateTitle(request.Title);
        var description = ChristmasGiftRules.ValidateDescription(request.Description);
        var url = ChristmasGiftRules.ValidateUrl(request.Url);
        var occasion = ChristmasGiftRules.NormalizeOccasion(request.Occasion);
        var categoryTag = ChristmasGiftRules.NormalizeCategoryTag(request.CategoryTag);

        if (request.IsMostWanted && !item.IsMostWanted)
        {
            await EnsureMostWantedQuotaAsync(ownerUserId, excludeItemId: item.Id, cancellationToken).ConfigureAwait(false);
        }

        if (request.ImageFileId.HasValue && request.ImageFileId != item.ImageFileId)
        {
            var file = await db.StoredFiles.AsNoTracking()
                .FirstOrDefaultAsync(f => f.Id == request.ImageFileId.Value && f.DeletedAt == null, cancellationToken)
                .ConfigureAwait(false);
            if (file is null)
            {
                throw new VaultNotFoundException();
            }
        }

        item.Title = title;
        item.Description = description;
        item.Url = url;
        item.Occasion = occasion;
        item.CategoryTag = categoryTag;
        item.IsMostWanted = request.IsMostWanted;
        item.ImageFileId = request.ImageFileId;
        item.ImageType = string.IsNullOrWhiteSpace(request.ImageType) ? null : request.ImageType.Trim().ToLowerInvariant();
        item.UpdatedAt = time.GetUtcNow();

        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        return MapToDto(item, ownerUserId, isOwner: true, canSeeClaims: false, []);
    }

    public async Task<ChristmasGiftItemDto> ToggleMostWantedAsync(
        Guid ownerUserId,
        Guid itemId,
        CancellationToken cancellationToken = default)
    {
        var item = await db.ChristmasGiftItems
            .FirstOrDefaultAsync(g => g.Id == itemId, cancellationToken)
            .ConfigureAwait(false);

        if (item is null || item.IsDeletedByOwner)
        {
            throw new VaultNotFoundException();
        }

        if (item.OwnerUserId != ownerUserId || item.IsAdultSurprise)
        {
            throw new ChristmasGiftValidationException("You can only star items on your own wishlist.");
        }

        if (!item.IsMostWanted)
        {
            await EnsureMostWantedQuotaAsync(ownerUserId, excludeItemId: item.Id, cancellationToken).ConfigureAwait(false);
        }

        item.IsMostWanted = !item.IsMostWanted;
        item.UpdatedAt = time.GetUtcNow();

        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        return MapToDto(item, ownerUserId, isOwner: true, canSeeClaims: false, []);
    }

    public async Task<ChristmasGiftItemDto> CreateAdultSurpriseAsync(
        Guid adultUserId,
        bool viewerIsKid,
        Guid recipientUserId,
        CreateAdultSurpriseRequest request,
        CancellationToken cancellationToken = default)
    {
        if (viewerIsKid)
        {
            throw new ChristmasGiftValidationException("Kids cannot create secret surprises.");
        }

        if (adultUserId == recipientUserId)
        {
            throw new ChristmasGiftValidationException("You cannot add a secret surprise to your own wishlist.");
        }

        var recipientExists = await db.FamilyMembers.AsNoTracking()
            .AnyAsync(m => m.UserId == recipientUserId, cancellationToken)
            .ConfigureAwait(false);
        if (!recipientExists)
        {
            throw new VaultNotFoundException();
        }

        var title = ChristmasGiftRules.ValidateTitle(request.Title);
        var description = ChristmasGiftRules.ValidateDescription(request.Description);
        var url = ChristmasGiftRules.ValidateUrl(request.Url);
        var occasion = ChristmasGiftRules.NormalizeOccasion(request.Occasion);
        var claimNotes = ChristmasGiftRules.ValidateClaimNotes(request.ClaimNotes);

        var maxSort = await db.ChristmasGiftItems
            .Where(g => g.OwnerUserId == recipientUserId)
            .Select(g => (int?)g.SortOrder)
            .MaxAsync(cancellationToken)
            .ConfigureAwait(false) ?? 0;

        var now = time.GetUtcNow();
        var entity = new ChristmasGiftItemEntity
        {
            Id = Guid.NewGuid(),
            OwnerUserId = recipientUserId,
            CreatedByUserId = adultUserId,
            Title = title,
            Description = description,
            Url = url,
            Occasion = occasion,
            IsAdultSurprise = true,
            IsDeletedByOwner = false,
            ClaimedByUserId = adultUserId,
            ClaimedAt = now,
            ClaimNotes = claimNotes,
            ClaimStatus = "claimed",
            OpenToSplit = request.OpenToSplit,
            CreatedAt = now,
            SortOrder = maxSort + 1
        };

        db.ChristmasGiftItems.Add(entity);
        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        var members = await LoadReferencedMembersAsync([entity], cancellationToken).ConfigureAwait(false);
        return MapToDto(entity, adultUserId, isOwner: false, canSeeClaims: true, members);
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

        if (item is null)
        {
            throw new VaultNotFoundException();
        }

        if (item.IsAdultSurprise)
        {
            if (item.CreatedByUserId != actorUserId && item.ClaimedByUserId != actorUserId && !actorIsAdmin)
            {
                throw new ChristmasGiftValidationException("You can only delete secret surprises you created or claimed.");
            }

            db.ChristmasGiftItems.Remove(item);
            await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
            return;
        }

        if (item.OwnerUserId != actorUserId || item.IsDeletedByOwner)
        {
            throw new ChristmasGiftValidationException("You can only delete items on your own wishlist.");
        }

        // Soft-delete protection: if an adult already claimed this gift, keep it visible to adults
        // while hiding it from the owner so we never spoil a surprise or blindside the buyer.
        if (item.ClaimedByUserId.HasValue)
        {
            item.IsDeletedByOwner = true;
            item.IsMostWanted = false;
            item.UpdatedAt = time.GetUtcNow();
        }
        else
        {
            db.ChristmasGiftItems.Remove(item);
        }

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

    public async Task<ChristmasGiftItemDto> ClaimItemAsync(
        Guid viewerUserId,
        bool viewerIsKid,
        Guid itemId,
        ClaimChristmasGiftRequest request,
        CancellationToken cancellationToken = default)
    {
        if (viewerIsKid)
        {
            throw new ChristmasGiftValidationException("Kids cannot claim gifts.");
        }

        var item = await db.ChristmasGiftItems
            .FirstOrDefaultAsync(g => g.Id == itemId, cancellationToken)
            .ConfigureAwait(false);

        if (item is null)
        {
            throw new VaultNotFoundException();
        }

        if (item.IsDeletedByOwner)
        {
            throw new ChristmasGiftValidationException("This item was removed by its owner.");
        }

        if (item.OwnerUserId == viewerUserId)
        {
            throw new ChristmasGiftValidationException("You cannot claim a gift on your own wishlist.");
        }

        if (item.ClaimedByUserId.HasValue && item.ClaimedByUserId.Value != viewerUserId)
        {
            throw new ChristmasGiftValidationException("This gift has already been claimed by another family member.");
        }

        item.ClaimedByUserId = viewerUserId;
        item.ClaimedAt = time.GetUtcNow();
        item.ClaimNotes = ChristmasGiftRules.ValidateClaimNotes(request.ClaimNotes);
        item.OpenToSplit = request.OpenToSplit;
        item.ClaimStatus = ChristmasGiftRules.NormalizeClaimStatus(request.ClaimStatus);

        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        var members = await LoadReferencedMembersAsync([item], cancellationToken).ConfigureAwait(false);
        return MapToDto(item, viewerUserId, isOwner: false, canSeeClaims: true, members);
    }

    public async Task<ChristmasGiftItemDto> UnclaimItemAsync(
        Guid viewerUserId,
        bool viewerIsKid,
        bool viewerIsAdmin,
        Guid itemId,
        CancellationToken cancellationToken = default)
    {
        if (viewerIsKid)
        {
            throw new ChristmasGiftValidationException("Kids cannot unclaim gifts.");
        }

        var item = await db.ChristmasGiftItems
            .FirstOrDefaultAsync(g => g.Id == itemId, cancellationToken)
            .ConfigureAwait(false);

        if (item is null)
        {
            throw new VaultNotFoundException();
        }

        if (item.ClaimedByUserId.HasValue)
        {
            if (item.ClaimedByUserId.Value != viewerUserId && !viewerIsAdmin)
            {
                throw new ChristmasGiftValidationException("You can only unclaim gifts that you claimed.");
            }

            if (item.IsDeletedByOwner)
            {
                db.ChristmasGiftItems.Remove(item);
                await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

                item.ClaimedByUserId = null;
                item.ClaimedAt = null;
                item.ClaimNotes = null;
                item.ClaimStatus = "claimed";
                item.OpenToSplit = false;
                item.SplitContributorIdsJson = null;

                return MapToDto(item, viewerUserId, isOwner: false, canSeeClaims: true, []);
            }

            item.ClaimedByUserId = null;
            item.ClaimedAt = null;
            item.ClaimNotes = null;
            item.ClaimStatus = "claimed";
            item.OpenToSplit = false;
            item.SplitContributorIdsJson = null;

            await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        }

        return MapToDto(item, viewerUserId, isOwner: false, canSeeClaims: true, []);
    }

    public async Task<ChristmasGiftItemDto> UpdateClaimStatusAsync(
        Guid viewerUserId,
        bool viewerIsKid,
        Guid itemId,
        UpdateClaimStatusRequest request,
        CancellationToken cancellationToken = default)
    {
        if (viewerIsKid)
        {
            throw new ChristmasGiftValidationException("Kids cannot update claim status.");
        }

        var item = await db.ChristmasGiftItems
            .FirstOrDefaultAsync(g => g.Id == itemId, cancellationToken)
            .ConfigureAwait(false);

        if (item is null)
        {
            throw new VaultNotFoundException();
        }

        var splitIds = ParseSplitIds(item.SplitContributorIdsJson);
        if (item.ClaimedByUserId != viewerUserId && !splitIds.Contains(viewerUserId))
        {
            throw new ChristmasGiftValidationException("Only the claiming adult or a split contributor can update this claim.");
        }

        item.ClaimStatus = ChristmasGiftRules.NormalizeClaimStatus(request.Status);
        if (request.ClaimNotes is not null)
        {
            item.ClaimNotes = ChristmasGiftRules.ValidateClaimNotes(request.ClaimNotes);
        }
        if (request.OpenToSplit.HasValue && item.ClaimedByUserId == viewerUserId)
        {
            item.OpenToSplit = request.OpenToSplit.Value;
        }
        item.UpdatedAt = time.GetUtcNow();

        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        var members = await LoadReferencedMembersAsync([item], cancellationToken).ConfigureAwait(false);
        return MapToDto(item, viewerUserId, isOwner: false, canSeeClaims: true, members);
    }

    public async Task<ChristmasGiftItemDto> ToggleSplitAsync(
        Guid viewerUserId,
        bool viewerIsKid,
        Guid itemId,
        CancellationToken cancellationToken = default)
    {
        if (viewerIsKid)
        {
            throw new ChristmasGiftValidationException("Kids cannot join group gifts.");
        }

        var item = await db.ChristmasGiftItems
            .FirstOrDefaultAsync(g => g.Id == itemId, cancellationToken)
            .ConfigureAwait(false);

        if (item is null)
        {
            throw new VaultNotFoundException();
        }

        if (item.OwnerUserId == viewerUserId)
        {
            throw new ChristmasGiftValidationException("You cannot split a gift on your own wishlist.");
        }

        if (!item.ClaimedByUserId.HasValue || !item.OpenToSplit)
        {
            throw new ChristmasGiftValidationException("This gift is not open for group splitting.");
        }

        if (item.ClaimedByUserId.Value == viewerUserId)
        {
            throw new ChristmasGiftValidationException("You are already the primary claimer of this gift.");
        }

        var splitIds = ParseSplitIds(item.SplitContributorIdsJson);
        if (!splitIds.Remove(viewerUserId))
        {
            splitIds.Add(viewerUserId);
        }

        item.SplitContributorIdsJson = splitIds.Count == 0
            ? null
            : JsonSerializer.Serialize(splitIds);
        item.UpdatedAt = time.GetUtcNow();

        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        var members = await LoadReferencedMembersAsync([item], cancellationToken).ConfigureAwait(false);
        return MapToDto(item, viewerUserId, isOwner: false, canSeeClaims: true, members);
    }

    public async Task<IReadOnlyList<MyClaimedGiftItemDto>> GetMyClaimsAsync(
        Guid adultUserId,
        bool viewerIsKid,
        CancellationToken cancellationToken = default)
    {
        if (viewerIsKid)
        {
            throw new ChristmasGiftValidationException("Kids do not have access to a shopping list.");
        }

        var claimedItems = await db.ChristmasGiftItems.AsNoTracking()
            .Where(g => g.ClaimedByUserId != null)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        var mine = claimedItems
            .Where(g => g.ClaimedByUserId == adultUserId || ParseSplitIds(g.SplitContributorIdsJson).Contains(adultUserId))
            .ToList();

        if (mine.Count == 0)
        {
            return [];
        }

        var members = await db.FamilyMembers.AsNoTracking()
            .ToDictionaryAsync(m => m.UserId, cancellationToken)
            .ConfigureAwait(false);
        var kidUserIds = await GetKidUserIdsAsync(cancellationToken).ConfigureAwait(false);

        var results = mine.Select(item =>
        {
            members.TryGetValue(item.OwnerUserId, out var recipient);
            var dto = MapToDto(item, adultUserId, isOwner: false, canSeeClaims: true, members);
            return new MyClaimedGiftItemDto(
                item.OwnerUserId,
                recipient?.DisplayName ?? "Member",
                recipient?.AccentColor,
                kidUserIds.Contains(item.OwnerUserId),
                dto);
        })
        .OrderBy(r => r.RecipientName, StringComparer.OrdinalIgnoreCase)
        .ThenBy(r => r.Item.IsDeletedByOwner)
        .ThenBy(r => r.Item.SortOrder)
        .ThenBy(r => r.Item.CreatedAt)
        .ToList();

        return results;
    }

    public async Task<GiftMemberProfileDto> GetMemberProfileAsync(
        Guid ownerUserId,
        CancellationToken cancellationToken = default)
    {
        var profile = await db.GiftMemberProfiles.AsNoTracking()
            .FirstOrDefaultAsync(p => p.UserId == ownerUserId, cancellationToken)
            .ConfigureAwait(false);

        if (profile is null)
        {
            return new GiftMemberProfileDto(ownerUserId, null, null, null, null, null);
        }

        return new GiftMemberProfileDto(
            profile.UserId,
            profile.ShirtSize,
            profile.ShoeSize,
            profile.PantsSize,
            profile.FavoriteColors,
            profile.InterestsAndAvoid);
    }

    public async Task<GiftMemberProfileDto> UpdateMemberProfileAsync(
        Guid userId,
        UpdateGiftMemberProfileRequest request,
        CancellationToken cancellationToken = default)
    {
        var shirt = ChristmasGiftRules.ValidateOptionalField(request.ShirtSize, ChristmasGiftRules.MaxSizeLength, "Shirt size");
        var shoe = ChristmasGiftRules.ValidateOptionalField(request.ShoeSize, ChristmasGiftRules.MaxSizeLength, "Shoe size");
        var pants = ChristmasGiftRules.ValidateOptionalField(request.PantsSize, ChristmasGiftRules.MaxSizeLength, "Pants size");
        var colors = ChristmasGiftRules.ValidateOptionalField(request.FavoriteColors, ChristmasGiftRules.MaxFavoriteColorsLength, "Favorite colors");
        var interests = ChristmasGiftRules.ValidateOptionalField(request.InterestsAndAvoid, ChristmasGiftRules.MaxInterestsLength, "Interests & avoid notes");

        var now = time.GetUtcNow();
        var existing = await db.GiftMemberProfiles
            .FirstOrDefaultAsync(p => p.UserId == userId, cancellationToken)
            .ConfigureAwait(false);

        if (existing is null)
        {
            existing = new GiftMemberProfileEntity
            {
                UserId = userId,
                ShirtSize = shirt,
                ShoeSize = shoe,
                PantsSize = pants,
                FavoriteColors = colors,
                InterestsAndAvoid = interests,
                UpdatedAt = now
            };
            db.GiftMemberProfiles.Add(existing);
        }
        else
        {
            existing.ShirtSize = shirt;
            existing.ShoeSize = shoe;
            existing.PantsSize = pants;
            existing.FavoriteColors = colors;
            existing.InterestsAndAvoid = interests;
            existing.UpdatedAt = now;
        }

        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        return new GiftMemberProfileDto(
            existing.UserId,
            existing.ShirtSize,
            existing.ShoeSize,
            existing.PantsSize,
            existing.FavoriteColors,
            existing.InterestsAndAvoid);
    }

    private async Task EnsureMostWantedQuotaAsync(
        Guid ownerUserId,
        Guid? excludeItemId,
        CancellationToken cancellationToken)
    {
        var count = await db.ChristmasGiftItems.AsNoTracking()
            .CountAsync(
                g => g.OwnerUserId == ownerUserId
                     && !g.IsAdultSurprise
                     && !g.IsDeletedByOwner
                     && g.IsMostWanted
                     && (!excludeItemId.HasValue || g.Id != excludeItemId.Value),
                cancellationToken)
            .ConfigureAwait(false);

        if (count >= ChristmasGiftRules.MaxMostWanted)
        {
            throw new ChristmasGiftValidationException(
                $"You can mark up to {ChristmasGiftRules.MaxMostWanted} items as Most Wanted.");
        }
    }

    private async Task<Dictionary<Guid, FamilyMemberEntity>> LoadReferencedMembersAsync(
        IReadOnlyList<ChristmasGiftItemEntity> items,
        CancellationToken cancellationToken)
    {
        var ids = new HashSet<Guid>();
        foreach (var item in items)
        {
            if (item.ClaimedByUserId.HasValue) ids.Add(item.ClaimedByUserId.Value);
            if (item.CreatedByUserId.HasValue) ids.Add(item.CreatedByUserId.Value);
            foreach (var splitId in ParseSplitIds(item.SplitContributorIdsJson))
            {
                ids.Add(splitId);
            }
        }

        if (ids.Count == 0)
        {
            return [];
        }

        return await db.FamilyMembers.AsNoTracking()
            .Where(m => ids.Contains(m.UserId))
            .ToDictionaryAsync(m => m.UserId, cancellationToken)
            .ConfigureAwait(false);
    }

    private static ChristmasGiftItemDto MapToDto(
        ChristmasGiftItemEntity item,
        Guid viewerUserId,
        bool isOwner,
        bool canSeeClaims,
        Dictionary<Guid, FamilyMemberEntity> members)
    {
        if (!canSeeClaims)
        {
            return new ChristmasGiftItemDto(
                item.Id,
                item.OwnerUserId,
                item.Title,
                item.Description,
                item.Url,
                item.ImageFileId,
                item.ImageType,
                item.CreatedAt,
                item.SortOrder,
                item.Occasion,
                item.CategoryTag,
                item.IsMostWanted,
                IsAdultSurprise: false,
                CreatedByName: null,
                IsDeletedByOwner: false,
                IsClaimed: null,
                ClaimedByUserId: null,
                ClaimedByName: null,
                ClaimedByAccentColor: null,
                ClaimNotes: null,
                ClaimedAt: null,
                ClaimStatus: null,
                OpenToSplit: false,
                SplitHelperNames: [],
                IsSplitByMe: false,
                CanChipIn: false,
                IsClaimedByMe: false,
                CanClaim: false,
                CanUnclaim: false,
                CanEdit: isOwner,
                CanDelete: isOwner);
        }

        var isClaimed = item.ClaimedByUserId != null;
        var isClaimedByMe = item.ClaimedByUserId == viewerUserId;

        string? claimerName = null;
        string? claimerColor = null;
        if (item.ClaimedByUserId.HasValue && members.TryGetValue(item.ClaimedByUserId.Value, out var cm))
        {
            claimerName = cm.DisplayName;
            claimerColor = cm.AccentColor;
        }

        string? createdByName = null;
        if (item.CreatedByUserId.HasValue && members.TryGetValue(item.CreatedByUserId.Value, out var cr))
        {
            createdByName = cr.DisplayName;
        }

        var splitIds = ParseSplitIds(item.SplitContributorIdsJson);
        var splitNames = splitIds
            .Select(id => members.TryGetValue(id, out var m) ? m.DisplayName : "Family Member")
            .ToList();
        var isSplitByMe = splitIds.Contains(viewerUserId);
        var canChipIn = isClaimed && item.OpenToSplit && !isClaimedByMe;
        var canDelete = item.IsAdultSurprise && (item.CreatedByUserId == viewerUserId || item.ClaimedByUserId == viewerUserId);

        return new ChristmasGiftItemDto(
            item.Id,
            item.OwnerUserId,
            item.Title,
            item.Description,
            item.Url,
            item.ImageFileId,
            item.ImageType,
            item.CreatedAt,
            item.SortOrder,
            item.Occasion,
            item.CategoryTag,
            item.IsMostWanted,
            item.IsAdultSurprise,
            createdByName,
            item.IsDeletedByOwner,
            IsClaimed: isClaimed,
            ClaimedByUserId: item.ClaimedByUserId,
            ClaimedByName: claimerName,
            ClaimedByAccentColor: claimerColor,
            ClaimNotes: item.ClaimNotes,
            ClaimedAt: item.ClaimedAt,
            ClaimStatus: isClaimed ? item.ClaimStatus : null,
            OpenToSplit: isClaimed && item.OpenToSplit,
            SplitHelperNames: splitNames,
            IsSplitByMe: isSplitByMe,
            CanChipIn: canChipIn,
            IsClaimedByMe: isClaimedByMe,
            CanClaim: !isClaimed && !item.IsDeletedByOwner,
            CanUnclaim: isClaimedByMe,
            CanEdit: false,
            CanDelete: canDelete);
    }

    private static List<Guid> ParseSplitIds(string? json)
    {
        if (string.IsNullOrWhiteSpace(json))
        {
            return [];
        }

        try
        {
            var parsed = JsonSerializer.Deserialize<List<Guid>>(json);
            return parsed?.Distinct().ToList() ?? [];
        }
        catch (JsonException)
        {
            return [];
        }
    }

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
