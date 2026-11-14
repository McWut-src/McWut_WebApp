using FamilyVault.Files.Contracts;
using FamilyVault.Files.Data.Entities;
using FamilyVault.Files.Security;
using FamilyVault.Files.Services;
using Microsoft.AspNetCore.Identity;

namespace FamilyVault.Files.Tests;

public class ChristmasGiftTests
{
    private static readonly DateTimeOffset Now = DateTimeOffset.Parse("2026-12-01T12:00:00Z");

    [Fact]
    public void Rules_validate_title_description_url_and_claim_notes()
    {
        // Title validation
        Assert.Equal("LEGO Set", ChristmasGiftRules.ValidateTitle("  LEGO Set  "));
        Assert.Throws<ChristmasGiftValidationException>(() => ChristmasGiftRules.ValidateTitle(""));
        Assert.Throws<ChristmasGiftValidationException>(() => ChristmasGiftRules.ValidateTitle("   "));
        Assert.Throws<ChristmasGiftValidationException>(() => ChristmasGiftRules.ValidateTitle(new string('a', 201)));

        // Description validation
        Assert.Null(ChristmasGiftRules.ValidateDescription(null));
        Assert.Null(ChristmasGiftRules.ValidateDescription("   "));
        Assert.Equal("Size M", ChristmasGiftRules.ValidateDescription("  Size M  "));
        Assert.Throws<ChristmasGiftValidationException>(() => ChristmasGiftRules.ValidateDescription(new string('b', 2001)));

        // URL validation
        Assert.Null(ChristmasGiftRules.ValidateUrl(null));
        Assert.Null(ChristmasGiftRules.ValidateUrl("   "));
        Assert.Equal("https://amazon.com/item", ChristmasGiftRules.ValidateUrl("amazon.com/item"));
        Assert.Equal("https://target.com/product", ChristmasGiftRules.ValidateUrl("https://target.com/product"));
        Assert.Throws<ChristmasGiftValidationException>(() => ChristmasGiftRules.ValidateUrl("javascript:alert(1)"));
        Assert.Throws<ChristmasGiftValidationException>(() => ChristmasGiftRules.ValidateUrl("ftp://files.example.com"));

        // Claim notes validation
        Assert.Null(ChristmasGiftRules.ValidateClaimNotes(null));
        Assert.Equal("Bought on Amazon", ChristmasGiftRules.ValidateClaimNotes("  Bought on Amazon  "));
        Assert.Throws<ChristmasGiftValidationException>(() => ChristmasGiftRules.ValidateClaimNotes(new string('c', 501)));
    }

    [Fact]
    public async Task Wishlist_owner_can_add_edit_delete_and_reorder_items()
    {
        await using var fx = new SqliteFixture();
        await fx.SeedMembersAsync();

        var time = new TestTimeProvider(Now);
        var service = new ChristmasGiftService(fx.Db, time);

        // 1. Add items
        var item1 = await service.CreateItemAsync(
            SqliteFixture.OwnerId,
            new CreateChristmasGiftItemRequest("Roller Skates", "Size 8, red", "https://skates.example.com", null, null));

        var item2 = await service.CreateItemAsync(
            SqliteFixture.OwnerId,
            new CreateChristmasGiftItemRequest("Headphones", "Wireless", null, null, null));

        Assert.Equal("Roller Skates", item1.Title);
        Assert.Equal(1, item1.SortOrder);
        Assert.Equal("Headphones", item2.Title);
        Assert.Equal(2, item2.SortOrder);

        // 2. Edit item
        var updated = await service.UpdateItemAsync(
            SqliteFixture.OwnerId,
            item1.Id,
            new UpdateChristmasGiftItemRequest("Roller Skates Pro", "Size 8.5, red", "https://skates.example.com", null, null));

        Assert.Equal("Roller Skates Pro", updated.Title);
        Assert.Equal("Size 8.5, red", updated.Description);

        // 3. Other user cannot edit someone else's item
        await Assert.ThrowsAsync<ChristmasGiftValidationException>(() =>
            service.UpdateItemAsync(SqliteFixture.OtherId, item1.Id, new UpdateChristmasGiftItemRequest("Hacked", null, null, null, null)));

        // 4. Reorder items
        await service.ReorderItemsAsync(SqliteFixture.OwnerId, [item2.Id, item1.Id]);
        var listAfterReorder = await service.GetItemsAsync(SqliteFixture.OwnerId, SqliteFixture.OwnerId, viewerIsKid: false);
        Assert.Equal(item2.Id, listAfterReorder[0].Id);
        Assert.Equal(item1.Id, listAfterReorder[1].Id);

        // 5. Delete item
        await service.DeleteItemAsync(SqliteFixture.OwnerId, item2.Id);
        var remaining = await service.GetItemsAsync(SqliteFixture.OwnerId, SqliteFixture.OwnerId, viewerIsKid: false);
        Assert.Single(remaining);
        Assert.Equal(item1.Id, remaining[0].Id);
    }

    [Fact]
    public async Task Adult_can_claim_and_unclaim_gift_on_kid_list_while_kid_never_sees_it()
    {
        await using var fx = new SqliteFixture();
        await fx.SeedMembersAsync();

        var time = new TestTimeProvider(Now);
        var service = new ChristmasGiftService(fx.Db, time);

        // Setup: SqliteFixture.OwnerId is Kid, OtherId is Aunt (Adult), StrangerId is Uncle (Adult)
        var kidId = SqliteFixture.OwnerId;
        var auntId = SqliteFixture.OtherId;
        var uncleId = SqliteFixture.StrangerId;

        // Seed IdentityUser rows so user roles FKs are satisfied
        fx.Db.Users.AddRange(
            new IdentityUser { Id = kidId.ToString(), UserName = "kid@family.test", Email = "kid@family.test" },
            new IdentityUser { Id = auntId.ToString(), UserName = "aunt@family.test", Email = "aunt@family.test" },
            new IdentityUser { Id = uncleId.ToString(), UserName = "uncle@family.test", Email = "uncle@family.test" });

        // Seed "Kid" role in Identity tables for kidId
        var kidRoleId = Guid.NewGuid().ToString();
        fx.Db.Roles.Add(new IdentityRole { Id = kidRoleId, Name = "Kid", NormalizedName = "KID" });
        fx.Db.UserRoles.Add(new IdentityUserRole<string> { RoleId = kidRoleId, UserId = kidId.ToString() });
        await fx.Db.SaveChangesAsync();

        // Kid adds a wish
        var gift = await service.CreateItemAsync(
            kidId,
            new CreateChristmasGiftItemRequest("Nintendo Switch OLED", "White joy-cons", "https://nintendo.example.com", null, null));

        // Aunt (Adult) views kid's list
        var auntViewBefore = await service.GetItemsAsync(kidId, viewerUserId: auntId, viewerIsKid: false);
        Assert.Single(auntViewBefore);
        Assert.False(auntViewBefore[0].IsClaimed);
        Assert.True(auntViewBefore[0].CanClaim);
        Assert.False(auntViewBefore[0].CanUnclaim);

        // Aunt claims the gift
        var claimed = await service.ClaimItemAsync(
            viewerUserId: auntId,
            viewerIsKid: false,
            gift.Id,
            new ClaimChristmasGiftRequest("Ordered from BestBuy, arriving Dec 20"));

        Assert.True(claimed.IsClaimed);
        Assert.Equal(auntId, claimed.ClaimedByUserId);
        Assert.Equal("Other", claimed.ClaimedByName);
        Assert.Equal("Ordered from BestBuy, arriving Dec 20", claimed.ClaimNotes);
        Assert.True(claimed.IsClaimedByMe);
        Assert.True(claimed.CanUnclaim);

        // Uncle (another Adult) views kid's list
        var uncleView = await service.GetItemsAsync(kidId, viewerUserId: uncleId, viewerIsKid: false);
        Assert.Single(uncleView);
        Assert.True(uncleView[0].IsClaimed);
        Assert.Equal("Other", uncleView[0].ClaimedByName); // Uncle sees Aunt claimed it!
        Assert.Equal("Ordered from BestBuy, arriving Dec 20", uncleView[0].ClaimNotes);
        Assert.False(uncleView[0].IsClaimedByMe); // Not claimed by uncle
        Assert.False(uncleView[0].CanClaim); // Cannot duplicate claim
        Assert.False(uncleView[0].CanUnclaim);

        // === CRITICAL PRIVACY TEST: KID VIEWS THEIR OWN LIST ===
        var kidView = await service.GetItemsAsync(kidId, viewerUserId: kidId, viewerIsKid: true);
        Assert.Single(kidView);
        Assert.Null(kidView[0].IsClaimed); // Kid NEVER sees claim status!
        Assert.Null(kidView[0].ClaimedByUserId); // Null
        Assert.Null(kidView[0].ClaimedByName); // Null
        Assert.Null(kidView[0].ClaimNotes); // Null
        Assert.Null(kidView[0].ClaimedAt); // Null
        Assert.False(kidView[0].IsClaimedByMe);
        Assert.False(kidView[0].CanClaim);
        Assert.False(kidView[0].CanUnclaim);
        Assert.True(kidView[0].CanEdit); // Kid can still edit/delete their own wish

        // Aunt unclaims
        var unclaimed = await service.UnclaimItemAsync(
            viewerUserId: auntId,
            viewerIsKid: false,
            viewerIsAdmin: false,
            gift.Id);
        Assert.False(unclaimed.IsClaimed);
        Assert.Null(unclaimed.ClaimedByUserId);
        Assert.True(unclaimed.CanClaim);
    }

    [Fact]
    public async Task Kids_cannot_claim_gifts_and_owners_cannot_claim_their_own_gifts()
    {
        await using var fx = new SqliteFixture();
        await fx.SeedMembersAsync();

        var time = new TestTimeProvider(Now);
        var service = new ChristmasGiftService(fx.Db, time);

        var gift = await service.CreateItemAsync(
            SqliteFixture.OwnerId,
            new CreateChristmasGiftItemRequest("Teddy Bear", null, null, null, null));

        // 1. Kid calling ClaimItemAsync throws exception
        await Assert.ThrowsAsync<ChristmasGiftValidationException>(() =>
            service.ClaimItemAsync(SqliteFixture.OtherId, viewerIsKid: true, gift.Id, new ClaimChristmasGiftRequest(null)));

        // 2. Owner attempting to claim their own gift throws exception
        await Assert.ThrowsAsync<ChristmasGiftValidationException>(() =>
            service.ClaimItemAsync(SqliteFixture.OwnerId, viewerIsKid: false, gift.Id, new ClaimChristmasGiftRequest(null)));
    }

    [Fact]
    public async Task Christmas_gift_image_attachment_is_accessible_to_family_members()
    {
        await using var fx = new SqliteFixture();
        await fx.SeedMembersAsync();

        var time = new TestTimeProvider(Now);
        var service = new ChristmasGiftService(fx.Db, time);
        var access = new FileAccessService(fx.Db, time, new PasswordHasher<object>());

        // 1. Create a StoredFile
        var fileId = Guid.NewGuid();
        fx.Db.StoredFiles.Add(new StoredFileEntity
        {
            Id = fileId,
            OwnerUserId = SqliteFixture.OwnerId,
            OriginalFileName = "wish-photo.jpg",
            ContentType = "image/jpeg",
            StorageKey = "keys/wish-photo.jpg",
            SizeBytes = 1024,
            Status = FileStatus.Ready,
            CreatedAt = Now,
            IsChatOnly = true
        });
        await fx.Db.SaveChangesAsync();

        // Before attaching to gift, another member cannot preview it
        var decisionBefore = await access.AuthorizeFileAsync(
            new AccessContext(SqliteFixture.OtherId, null, null),
            fileId,
            AccessIntent.Preview);
        Assert.Equal(AccessDecision.Deny, decisionBefore);

        // Attach to gift
        await service.CreateItemAsync(
            SqliteFixture.OwnerId,
            new CreateChristmasGiftItemRequest("Bicycle", null, null, fileId, "photo"));

        // After attaching, other family member can preview it!
        var decisionAfter = await access.AuthorizeFileAsync(
            new AccessContext(SqliteFixture.OtherId, null, null),
            fileId,
            AccessIntent.Preview);
        Assert.True(decisionAfter.Allowed);
    }

    [Fact]
    public void Rules_normalize_occasion_category_claim_status_and_profile_fields()
    {
        Assert.Equal("anytime", ChristmasGiftRules.NormalizeOccasion(null));
        Assert.Equal("anytime", ChristmasGiftRules.NormalizeOccasion("  "));
        Assert.Equal("birthday", ChristmasGiftRules.NormalizeOccasion("Birthday "));
        Assert.Equal("christmas", ChristmasGiftRules.NormalizeOccasion("CHRISTMAS"));
        Assert.Equal("holiday", ChristmasGiftRules.NormalizeOccasion("holiday"));
        Assert.Throws<ChristmasGiftValidationException>(() => ChristmasGiftRules.NormalizeOccasion("graduation"));

        Assert.Null(ChristmasGiftRules.NormalizeCategoryTag(null));
        Assert.Null(ChristmasGiftRules.NormalizeCategoryTag("none"));
        Assert.Equal("under-25", ChristmasGiftRules.NormalizeCategoryTag("UNDER-25"));
        Assert.Equal("small", ChristmasGiftRules.NormalizeCategoryTag(" small "));
        Assert.Equal("big-wish", ChristmasGiftRules.NormalizeCategoryTag("big-wish"));
        Assert.Throws<ChristmasGiftValidationException>(() => ChristmasGiftRules.NormalizeCategoryTag("luxury"));

        Assert.Equal("claimed", ChristmasGiftRules.NormalizeClaimStatus(null));
        Assert.Equal("ordered", ChristmasGiftRules.NormalizeClaimStatus(" Ordered "));
        Assert.Equal("wrapped", ChristmasGiftRules.NormalizeClaimStatus("WRAPPED"));
        Assert.Throws<ChristmasGiftValidationException>(() => ChristmasGiftRules.NormalizeClaimStatus("shipped"));

        Assert.Null(ChristmasGiftRules.ValidateOptionalField("   ", ChristmasGiftRules.MaxSizeLength, "Shirt size"));
        Assert.Equal("Youth M", ChristmasGiftRules.ValidateOptionalField("  Youth M  ", ChristmasGiftRules.MaxSizeLength, "Shirt size"));
        Assert.Throws<ChristmasGiftValidationException>(() =>
            ChristmasGiftRules.ValidateOptionalField(new string('x', 65), ChristmasGiftRules.MaxSizeLength, "Shirt size"));
    }

    [Fact]
    public async Task Most_wanted_stars_enforce_max_three_per_member_across_create_update_and_toggle()
    {
        await using var fx = new SqliteFixture();
        await fx.SeedMembersAsync();

        var time = new TestTimeProvider(Now);
        var service = new ChristmasGiftService(fx.Db, time);

        var star1 = await service.CreateItemAsync(SqliteFixture.OwnerId,
            new CreateChristmasGiftItemRequest("Star 1", null, null, null, null, "birthday", "big-wish", IsMostWanted: true));
        await service.CreateItemAsync(SqliteFixture.OwnerId,
            new CreateChristmasGiftItemRequest("Star 2", null, null, null, null, "christmas", null, IsMostWanted: true));
        await service.CreateItemAsync(SqliteFixture.OwnerId,
            new CreateChristmasGiftItemRequest("Star 3", null, null, null, null, "anytime", null, IsMostWanted: true));

        Assert.True(star1.IsMostWanted);
        Assert.Equal("birthday", star1.Occasion);
        Assert.Equal("big-wish", star1.CategoryTag);

        // 4th starred item on create is rejected
        await Assert.ThrowsAsync<ChristmasGiftValidationException>(() =>
            service.CreateItemAsync(SqliteFixture.OwnerId,
                new CreateChristmasGiftItemRequest("Star 4", null, null, null, null, IsMostWanted: true)));

        // Unstarred 4th item can be created, then toggling it while 3 are active throws
        var plain = await service.CreateItemAsync(SqliteFixture.OwnerId,
            new CreateChristmasGiftItemRequest("Star 4", null, null, null, null));
        await Assert.ThrowsAsync<ChristmasGiftValidationException>(() =>
            service.ToggleMostWantedAsync(SqliteFixture.OwnerId, plain.Id));

        // Unstar star1, then star plain via toggle succeeds
        var unstarred = await service.ToggleMostWantedAsync(SqliteFixture.OwnerId, star1.Id);
        Assert.False(unstarred.IsMostWanted);

        var toggled = await service.ToggleMostWantedAsync(SqliteFixture.OwnerId, plain.Id);
        Assert.True(toggled.IsMostWanted);

        // Re-starring star1 via UpdateItemAsync throws while 3 others are starred
        await Assert.ThrowsAsync<ChristmasGiftValidationException>(() =>
            service.UpdateItemAsync(SqliteFixture.OwnerId, star1.Id,
                new UpdateChristmasGiftItemRequest("Star 1", null, null, null, null, "birthday", null, IsMostWanted: true)));
    }

    [Fact]
    public async Task Member_sizes_and_favorites_profile_upserts_cleanly()
    {
        await using var fx = new SqliteFixture();
        await fx.SeedMembersAsync();

        var time = new TestTimeProvider(Now);
        var service = new ChristmasGiftService(fx.Db, time);

        var initial = await service.GetMemberProfileAsync(SqliteFixture.OwnerId);
        Assert.Null(initial.ShirtSize);

        var updated = await service.UpdateMemberProfileAsync(SqliteFixture.OwnerId,
            new UpdateGiftMemberProfileRequest("Youth L", "6Y", "12 Regular", "Teal, Gold", "LEGO, astronomy"));
        Assert.Equal("Youth L", updated.ShirtSize);
        Assert.Equal("6Y", updated.ShoeSize);
        Assert.Equal("12 Regular", updated.PantsSize);
        Assert.Equal("Teal, Gold", updated.FavoriteColors);
        Assert.Equal("LEGO, astronomy", updated.InterestsAndAvoid);

        var secondUpdate = await service.UpdateMemberProfileAsync(SqliteFixture.OwnerId,
            new UpdateGiftMemberProfileRequest("Adult S", null, null, "Green", null));
        Assert.Equal("Adult S", secondUpdate.ShirtSize);
        Assert.Null(secondUpdate.ShoeSize);

        var loaded = await service.GetMemberProfileAsync(SqliteFixture.OwnerId);
        Assert.Equal("Adult S", loaded.ShirtSize);
        Assert.Equal("Green", loaded.FavoriteColors);
    }

    [Fact]
    public async Task Adult_secret_surprises_stay_hidden_from_recipient_and_kids()
    {
        await using var fx = new SqliteFixture();
        await fx.SeedMembersAsync();

        var time = new TestTimeProvider(Now);
        var service = new ChristmasGiftService(fx.Db, time);

        // Kid cannot create secret surprises
        await Assert.ThrowsAsync<ChristmasGiftValidationException>(() =>
            service.CreateAdultSurpriseAsync(SqliteFixture.OtherId, viewerIsKid: true, SqliteFixture.OwnerId,
                new CreateAdultSurpriseRequest("Secret", null, null)));

        // Adult cannot add secret surprise to own list
        await Assert.ThrowsAsync<ChristmasGiftValidationException>(() =>
            service.CreateAdultSurpriseAsync(SqliteFixture.OwnerId, viewerIsKid: false, SqliteFixture.OwnerId,
                new CreateAdultSurpriseRequest("Self Surprise", null, null)));

        // Adult (OwnerId) adds secret off-list surprise to OtherId (Kid)
        var surprise = await service.CreateAdultSurpriseAsync(
            SqliteFixture.OwnerId,
            viewerIsKid: false,
            SqliteFixture.OtherId,
            new CreateAdultSurpriseRequest("Telescope", "Starter refractor", "https://shop.example.com", "birthday", "Hidden in attic", OpenToSplit: true));

        Assert.True(surprise.IsAdultSurprise);
        Assert.True(surprise.IsClaimed);
        Assert.True(surprise.IsClaimedByMe);
        Assert.True(surprise.OpenToSplit);
        Assert.Equal("birthday", surprise.Occasion);

        // Recipient / Kid sees zero items and 0 ItemCount
        var kidList = await service.GetItemsAsync(SqliteFixture.OtherId, viewerUserId: SqliteFixture.OtherId, viewerIsKid: true);
        Assert.Empty(kidList);

        var kidMembers = await service.GetMembersAsync(SqliteFixture.OtherId, viewerIsKid: true);
        var kidSummary = kidMembers.Single(m => m.UserId == SqliteFixture.OtherId);
        Assert.Equal(0, kidSummary.ItemCount);

        // Another adult (StrangerId) sees the secret surprise and can chip in
        var strangerView = await service.GetItemsAsync(SqliteFixture.OtherId, viewerUserId: SqliteFixture.StrangerId, viewerIsKid: false);
        var seenSurprise = Assert.Single(strangerView);
        Assert.True(seenSurprise.IsAdultSurprise);
        Assert.True(seenSurprise.CanChipIn);
        Assert.Equal("Owner", seenSurprise.CreatedByName);

        // StrangerId cannot delete OwnerId's secret surprise
        await Assert.ThrowsAsync<ChristmasGiftValidationException>(() =>
            service.DeleteItemAsync(SqliteFixture.StrangerId, actorIsAdmin: false, surprise.Id));

        // OwnerId can delete their own secret surprise
        await service.DeleteItemAsync(SqliteFixture.OwnerId, actorIsAdmin: false, surprise.Id);
        var afterDelete = await service.GetItemsAsync(SqliteFixture.OtherId, viewerUserId: SqliteFixture.StrangerId, viewerIsKid: false);
        Assert.Empty(afterDelete);
    }

    [Fact]
    public async Task Soft_delete_protects_claimed_items_for_adults_while_hiding_from_owner()
    {
        await using var fx = new SqliteFixture();
        await fx.SeedMembersAsync();

        var time = new TestTimeProvider(Now);
        var service = new ChristmasGiftService(fx.Db, time);

        var unclaimedItem = await service.CreateItemAsync(SqliteFixture.OtherId,
            new CreateChristmasGiftItemRequest("Markers", null, null, null, null));
        var claimedItem = await service.CreateItemAsync(SqliteFixture.OtherId,
            new CreateChristmasGiftItemRequest("Red Bike", "Size 20", null, null, null));

        await service.ClaimItemAsync(SqliteFixture.OwnerId, viewerIsKid: false, claimedItem.Id,
            new ClaimChristmasGiftRequest("Bought already", OpenToSplit: false));

        // Deleting unclaimed item hard-deletes immediately
        await service.DeleteItemAsync(SqliteFixture.OtherId, actorIsAdmin: false, unclaimedItem.Id);
        Assert.Null(await fx.Db.ChristmasGiftItems.FindAsync(unclaimedItem.Id));

        // Kid deleting claimed item soft-deletes it cleanly so kid thinks it's gone
        await service.DeleteItemAsync(SqliteFixture.OtherId, actorIsAdmin: false, claimedItem.Id);

        var kidView = await service.GetItemsAsync(SqliteFixture.OtherId, viewerUserId: SqliteFixture.OtherId, viewerIsKid: true);
        Assert.Empty(kidView);

        // Claiming adult still sees the soft-deleted item with IsDeletedByOwner = true
        var adultView = await service.GetItemsAsync(SqliteFixture.OtherId, viewerUserId: SqliteFixture.OwnerId, viewerIsKid: false);
        var preserved = Assert.Single(adultView);
        Assert.True(preserved.IsDeletedByOwner);
        Assert.True(preserved.IsClaimedByMe);
        Assert.True(preserved.CanUnclaim);

        // Unclaiming the soft-deleted item permanently removes it
        await service.UnclaimItemAsync(SqliteFixture.OwnerId, viewerIsKid: false, viewerIsAdmin: false, claimedItem.Id);
        Assert.Null(await fx.Db.ChristmasGiftItems.FindAsync(claimedItem.Id));
    }

    [Fact]
    public async Task Claim_status_stages_group_split_and_adult_shopping_list_work_together()
    {
        await using var fx = new SqliteFixture();
        await fx.SeedMembersAsync();

        var time = new TestTimeProvider(Now);
        var service = new ChristmasGiftService(fx.Db, time);

        // OwnerId adds a big-ticket item
        var gift = await service.CreateItemAsync(SqliteFixture.OwnerId,
            new CreateChristmasGiftItemRequest("Nintendo Switch", null, null, null, null, "christmas", "big-wish", IsMostWanted: true));

        // OtherId (as an adult) claims it open to split
        var claimed = await service.ClaimItemAsync(SqliteFixture.OtherId, viewerIsKid: false, gift.Id,
            new ClaimChristmasGiftRequest("Splitting 50/50", OpenToSplit: true));
        Assert.True(claimed.OpenToSplit);
        Assert.Equal("claimed", claimed.ClaimStatus);

        // Advance status claimed -> ordered -> wrapped without wiping ClaimNotes
        var ordered = await service.UpdateClaimStatusAsync(SqliteFixture.OtherId, viewerIsKid: false, gift.Id,
            new UpdateClaimStatusRequest("ordered"));
        Assert.Equal("ordered", ordered.ClaimStatus);
        Assert.Equal("Splitting 50/50", ordered.ClaimNotes);

        var wrapped = await service.UpdateClaimStatusAsync(SqliteFixture.OtherId, viewerIsKid: false, gift.Id,
            new UpdateClaimStatusRequest("wrapped"));
        Assert.Equal("wrapped", wrapped.ClaimStatus);

        // StrangerId (second adult) chips in
        var chippedIn = await service.ToggleSplitAsync(SqliteFixture.StrangerId, viewerIsKid: false, gift.Id);
        Assert.True(chippedIn.IsSplitByMe);
        Assert.Contains("Stranger", chippedIn.SplitHelperNames);

        // Both claiming adult and split helper see it in My Shopping List
        var otherShopping = await service.GetMyClaimsAsync(SqliteFixture.OtherId, viewerIsKid: false);
        Assert.Single(otherShopping);
        Assert.Equal("Owner", otherShopping[0].RecipientName);

        var strangerShopping = await service.GetMyClaimsAsync(SqliteFixture.StrangerId, viewerIsKid: false);
        Assert.Single(strangerShopping);
        Assert.True(strangerShopping[0].Item.IsSplitByMe);

        // Kid is forbidden from My Shopping List
        await Assert.ThrowsAsync<ChristmasGiftValidationException>(() =>
            service.GetMyClaimsAsync(SqliteFixture.OtherId, viewerIsKid: true));
    }
}
