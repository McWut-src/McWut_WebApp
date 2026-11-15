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
    public void Rules_validate_title_description_url_media_type_and_content()
    {
        // Title is optional, trimmed, max 200
        Assert.Equal(string.Empty, ChristmasGiftRules.ValidateTitle(null));
        Assert.Equal(string.Empty, ChristmasGiftRules.ValidateTitle("   "));
        Assert.Equal("LEGO Set", ChristmasGiftRules.ValidateTitle("  LEGO Set  "));
        Assert.Throws<ChristmasGiftValidationException>(() => ChristmasGiftRules.ValidateTitle(new string('a', 201)));

        // Description is optional, trimmed, max 2000
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

        // Media type normalization
        Assert.Null(ChristmasGiftRules.NormalizeMediaType(null));
        Assert.Null(ChristmasGiftRules.NormalizeMediaType("  "));
        Assert.Equal("photo", ChristmasGiftRules.NormalizeMediaType("photo"));
        Assert.Equal("photo", ChristmasGiftRules.NormalizeMediaType("IMAGE"));
        Assert.Equal("drawing", ChristmasGiftRules.NormalizeMediaType(" Drawing "));
        Assert.Equal("voice", ChristmasGiftRules.NormalizeMediaType("voice"));
        Assert.Equal("voice", ChristmasGiftRules.NormalizeMediaType("Audio"));
        Assert.Throws<ChristmasGiftValidationException>(() => ChristmasGiftRules.NormalizeMediaType("video"));

        // Content presence check
        Assert.Throws<ChristmasGiftValidationException>(() => ChristmasGiftRules.EnsureHasContent("", null, null, null));
        ChristmasGiftRules.EnsureHasContent("Red Bike", null, null, null);
        ChristmasGiftRules.EnsureHasContent("", "Just a note", null, null);
        ChristmasGiftRules.EnsureHasContent("", null, "https://example.com", null);
        ChristmasGiftRules.EnsureHasContent("", null, null, Guid.NewGuid());
    }

    [Fact]
    public async Task Owner_can_add_all_five_item_types_including_without_title()
    {
        await using var fx = new SqliteFixture();
        await fx.SeedMembersAsync();

        var time = new TestTimeProvider(Now);
        var service = new ChristmasGiftService(fx.Db, time);

        var photoId = SeedStoredFile(fx, SqliteFixture.OwnerId, "bike.jpg", "image/jpeg");
        var voiceId = SeedStoredFile(fx, SqliteFixture.OwnerId, "wish.webm", "audio/webm");
        var drawingId = SeedStoredFile(fx, SqliteFixture.OwnerId, "dragon.png", "image/png");
        await fx.Db.SaveChangesAsync();

        // 1. Text only
        var textItem = await service.CreateItemAsync(
            SqliteFixture.OwnerId,
            new CreateChristmasGiftItemRequest("Blue Skateboard", "With green wheels", null, null, null));

        // 2. URL only (no title)
        var urlItem = await service.CreateItemAsync(
            SqliteFixture.OwnerId,
            new CreateChristmasGiftItemRequest(null, null, "lego.com/castle", null, null));

        // 3. URL pasted into title field
        var urlInTitleItem = await service.CreateItemAsync(
            SqliteFixture.OwnerId,
            new CreateChristmasGiftItemRequest("https://target.com/puzzles", null, null, null, null));

        // 4. Image only (no title)
        var photoItem = await service.CreateItemAsync(
            SqliteFixture.OwnerId,
            new CreateChristmasGiftItemRequest(null, null, null, photoId, "image"));

        // 5. Voice note only (no title)
        var voiceItem = await service.CreateItemAsync(
            SqliteFixture.OwnerId,
            new CreateChristmasGiftItemRequest(null, null, null, voiceId, "audio"));

        // 6. Drawing only (no title)
        var drawingItem = await service.CreateItemAsync(
            SqliteFixture.OwnerId,
            new CreateChristmasGiftItemRequest(null, null, null, drawingId, "drawing"));

        // Empty submission rejected
        await Assert.ThrowsAsync<ChristmasGiftValidationException>(() =>
            service.CreateItemAsync(SqliteFixture.OwnerId, new CreateChristmasGiftItemRequest("  ", " ", null, null, null)));

        Assert.Equal("Blue Skateboard", textItem.Title);
        Assert.Equal(string.Empty, urlItem.Title);
        Assert.Equal("https://lego.com/castle", urlItem.Url);
        Assert.Equal(string.Empty, urlInTitleItem.Title);
        Assert.Equal("https://target.com/puzzles", urlInTitleItem.Url);
        Assert.Equal("photo", photoItem.ImageType);
        Assert.Equal("voice", voiceItem.ImageType);
        Assert.Equal("drawing", drawingItem.ImageType);

        var items = await service.GetItemsAsync(SqliteFixture.OwnerId, SqliteFixture.OwnerId);
        Assert.Equal(6, items.Count);
        Assert.All(items, i => Assert.True(i.CanEdit && i.CanDelete));

        var otherView = await service.GetItemsAsync(SqliteFixture.OwnerId, SqliteFixture.OtherId);
        Assert.Equal(6, otherView.Count);
        Assert.All(otherView, i => Assert.False(i.CanEdit || i.CanDelete));

        var members = await service.GetMembersAsync(SqliteFixture.OtherId);
        var ownerSummary = members.Single(m => m.UserId == SqliteFixture.OwnerId);
        Assert.Equal(6, ownerSummary.ItemCount);
    }

    [Fact]
    public async Task Owner_can_edit_delete_and_reorder_while_others_cannot()
    {
        await using var fx = new SqliteFixture();
        await fx.SeedMembersAsync();

        var time = new TestTimeProvider(Now);
        var service = new ChristmasGiftService(fx.Db, time);

        var photoId = SeedStoredFile(fx, SqliteFixture.OwnerId, "skates.png", "image/png");
        await fx.Db.SaveChangesAsync();

        var item1 = await service.CreateItemAsync(
            SqliteFixture.OwnerId,
            new CreateChristmasGiftItemRequest("Roller Skates", "Size 8, red", "https://skates.example.com", photoId, "photo"));

        var item2 = await service.CreateItemAsync(
            SqliteFixture.OwnerId,
            new CreateChristmasGiftItemRequest("Headphones", "Wireless", null, null, null));

        // Edit keeps or clears attachment cleanly
        var updated = await service.UpdateItemAsync(
            SqliteFixture.OwnerId,
            item1.Id,
            new UpdateChristmasGiftItemRequest("Roller Skates Pro", "Size 8.5, red", "https://skates.example.com", null, null));

        Assert.Equal("Roller Skates Pro", updated.Title);
        Assert.Equal("Size 8.5, red", updated.Description);
        Assert.Null(updated.ImageFileId);
        Assert.Null(updated.ImageType);

        // Other user cannot edit or delete someone else's item
        await Assert.ThrowsAsync<ChristmasGiftValidationException>(() =>
            service.UpdateItemAsync(SqliteFixture.OtherId, item1.Id, new UpdateChristmasGiftItemRequest("Hacked", null, null, null, null)));
        await Assert.ThrowsAsync<ChristmasGiftValidationException>(() =>
            service.DeleteItemAsync(SqliteFixture.OtherId, actorIsAdmin: false, item1.Id));

        // Reorder items
        await service.ReorderItemsAsync(SqliteFixture.OwnerId, [item2.Id, item1.Id]);
        var listAfterReorder = await service.GetItemsAsync(SqliteFixture.OwnerId, SqliteFixture.OwnerId);
        Assert.Equal(item2.Id, listAfterReorder[0].Id);
        Assert.Equal(item1.Id, listAfterReorder[1].Id);

        // Delete item permanently removes it
        await service.DeleteItemAsync(SqliteFixture.OwnerId, item2.Id);
        Assert.Null(await fx.Db.ChristmasGiftItems.FindAsync(item2.Id));
        var remaining = await service.GetItemsAsync(SqliteFixture.OwnerId, SqliteFixture.OwnerId);
        Assert.Single(remaining);
        Assert.Equal(item1.Id, remaining[0].Id);
    }

    [Fact]
    public async Task Gift_attachments_for_image_voice_and_drawing_are_accessible_to_family_members()
    {
        await using var fx = new SqliteFixture();
        await fx.SeedMembersAsync();

        var time = new TestTimeProvider(Now);
        var service = new ChristmasGiftService(fx.Db, time);
        var access = new FileAccessService(fx.Db, time, new PasswordHasher<object>());

        var photoId = SeedStoredFile(fx, SqliteFixture.OwnerId, "wish-photo.jpg", "image/jpeg");
        var voiceId = SeedStoredFile(fx, SqliteFixture.OwnerId, "wish-voice.webm", "audio/webm");
        await fx.Db.SaveChangesAsync();

        // Before attaching to gift list, another member cannot preview them
        var decisionBefore = await access.AuthorizeFileAsync(
            new AccessContext(SqliteFixture.OtherId, null, null),
            voiceId,
            AccessIntent.Preview);
        Assert.Equal(AccessDecision.Deny, decisionBefore);

        await service.CreateItemAsync(
            SqliteFixture.OwnerId,
            new CreateChristmasGiftItemRequest(null, null, null, photoId, "photo"));
        await service.CreateItemAsync(
            SqliteFixture.OwnerId,
            new CreateChristmasGiftItemRequest(null, null, null, voiceId, "voice"));

        // After attaching, other family members can preview both image and voice note
        var photoAfter = await access.AuthorizeFileAsync(
            new AccessContext(SqliteFixture.OtherId, null, null),
            photoId,
            AccessIntent.Preview);
        var voiceAfter = await access.AuthorizeFileAsync(
            new AccessContext(SqliteFixture.OtherId, null, null),
            voiceId,
            AccessIntent.Preview);
        Assert.True(photoAfter.Allowed);
        Assert.True(voiceAfter.Allowed);
    }

    private static Guid SeedStoredFile(SqliteFixture fx, Guid ownerUserId, string fileName, string contentType)
    {
        var fileId = Guid.NewGuid();
        fx.Db.StoredFiles.Add(new StoredFileEntity
        {
            Id = fileId,
            OwnerUserId = ownerUserId,
            OriginalFileName = fileName,
            ContentType = contentType,
            StorageKey = $"keys/{fileId:N}-{fileName}",
            SizeBytes = 1024,
            Status = FileStatus.Ready,
            CreatedAt = Now,
            IsChatOnly = true
        });
        return fileId;
    }
}
