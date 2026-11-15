# Gifts area rules

Follow [docs/AGENT.md](../../docs/AGENT.md) for shared rules (auth, file lifecycle, icons, and UI styling).

## Purpose & Behavior
- `/gifts` is a simple, kid-friendly family gift list where each member has one list visible to the whole signed-in family.
- Any item can combine or stand alone with any supported media/content: **URL** (`Url`), **Image** (`ImageType = "photo"`), **Text** (`Title` / `Description`), **Voice** (`ImageType = "voice"`), or **Drawing** (`ImageType = "drawing"`). Title is optional as long as at least one field or attachment has content (`ChristmasGiftRules.EnsureHasContent`).
- **No claiming or hidden coordination**: no secret claims, status stages, splits, off-list surprises, occasion filters, budget tags, star quotas, or member sizes/favorites profiles.
- List owners can add, edit, move up/down (reorder), and hard-delete their own items. Other family members see read-only lists with no edit, delete, or claim controls.

## Architecture & Key Files
- **UI**: `Pages/Gifts/Index.cshtml`, `Pages/Gifts/Index.cshtml.cs`, `wwwroot/js/gifts.js`, styles in `wwwroot/css/site.css`.
- **API**: `Controllers/GiftsController.cs` (`[AutoValidateAntiforgeryToken]`, `/api/gifts/members`, `/api/gifts/list/{ownerUserId}`, `POST /api/gifts`, `PUT /api/gifts/{id}`, `DELETE /api/gifts/{id}`, `POST /api/gifts/reorder`).
- **Rules & Service**: `src/FamilyVault.Files/Security/ChristmasGiftRules.cs`, `src/FamilyVault.Files/Services/ChristmasGiftModels.cs`, `src/FamilyVault.Files/Services/ChristmasGiftService.cs`.
- **Media Storage**: Attachments upload as `isChatOnly: true` with `retention: { days: 0 }` (3-step `/api/uploads` -> `PUT` -> `POST /complete`). `FileAccessService.HasChristmasGiftAttachmentAccessAsync` grants family preview/download access, and `FileLifecycle` protects referenced `ImageFileId`s from the unlinked chat-file sweeper.
- **Schema Compatibility**: `ChristmasGiftItemEntity` keeps existing nullable/defaulted legacy columns so SQLite and Azure SQL schemas require no destructive migrations; `GetItemsAsync` filters `!IsAdultSurprise && !IsDeletedByOwner`.
