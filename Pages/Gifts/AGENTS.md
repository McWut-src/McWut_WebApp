# Gifts (`/gifts`)

Family Gift & Wish List page supporting generic multi-occasion wishlists (`anytime`, `birthday`, `christmas`, `holiday`), text/link/photo/doodle items, pinned **Sizes & Favorites** member profiles, and adult-only secret coordination.

## Rules & Invariants

1. **Shared conventions:** Inherits all rules from `AGENTS.md` and `docs/AGENT.md`.
2. **Kid & Owner Privacy Boundary:**
   - The `Kid` role (`IdentitySeed.KidRole`, `"Kid"`) restricts claiming and secret visibility **strictly** in `ChristmasGiftService` and `GiftsController`.
   - When `isOwner` is `true` OR `viewerIsKid` is `true`:
     - `ClaimedByUserId`, `ClaimedByName`, `ClaimedByAccentColor`, `ClaimNotes`, `ClaimedAt`, `ClaimStatus`, `OpenToSplit`, `SplitHelperNames`, `IsSplitByMe`, `CanChipIn`, `IsClaimed`, `IsClaimedByMe`, `CanClaim`, and `CanUnclaim` are ALWAYS `null`/`false`/empty.
     - **Adult-only Off-List Surprises (`IsAdultSurprise = true`)** are NEVER returned in `GetItemsAsync` and NEVER counted in `GetMembersAsync` (`ItemCount`).
     - **Soft-Deleted Claimed Items (`IsDeletedByOwner = true`)** are NEVER returned to the list owner or any kid, and NEVER counted in `GetMembersAsync` (`ItemCount`).
   - All claim, unclaim, status update, split toggle, secret surprise creation, and `my-claims` shopping list endpoints return `400`/`403` if invoked by a `Kid` user.
3. **Most Wanted Quota:** Each user may mark at most **3** items (`ChristmasGiftRules.MaxMostWanted = 3`) with `IsMostWanted = true` (`⭐`). Enforced server-side on create, update, and `/most-wanted` toggle.
4. **Soft-Delete Protection on Claimed Items:**
   - If the list owner deletes an item that is unclaimed (`ClaimedByUserId == null`), it is hard-deleted (`DELETE`).
   - If the list owner deletes an item already claimed by an adult, `IsDeletedByOwner` is set to `true` so the owner sees it disappear immediately (without learning it was claimed), while adults see a warning banner until the claimer calls `/unclaim` (which permanently deletes the row).
5. **Group Split & Claim Stages:**
   - `ClaimStatus` transitions: `claimed` -> `ordered` -> `wrapped` (allowed for claimer and split contributors).
   - When `OpenToSplit = true`, other non-claimer adults can toggle `/split-toggle` to join/leave `SplitContributorIdsJson`, exposing `SplitHelperNames` to adult viewers.
6. **Pinned Member Sizes & Favorites (`GiftMemberProfiles`):**
   - One profile row per `FamilyMemberEntity` (`ShirtSize`, `PantsSize`, `ShoeSize`, `FavoriteColors`, `InterestsAndAvoid`), editable via `PUT /api/gifts/profile` by the owner and readable by all family members via `GET /api/gifts/profile/{ownerUserId}`.
7. **Media Upload Isolation & Draw-on-Photo:**
   - Photos and composited PNG drawings (including background catalog photos uploaded onto `#gifts-doodle-bg` under `#gifts-doodle-draw`) are uploaded through `/api/uploads` with `isChatOnly: true` so they do not clutter `/files`.
   - `FileAccessService.HasChristmasGiftAttachmentAccessAsync` grants family-wide preview/download access to attached gift images, and `FileLifecycle` protects referenced files from chat-only cleanup.
8. **SQLite `DateTimeOffset` Constraint:** Load rows ordered by `SortOrder` in EF/SQLite and sort by `CreatedAt` in memory via LINQ-to-Objects.

## Key Files
- `Pages/Gifts/Index.cshtml` / `Index.cshtml.cs` — Generic multi-occasion UI, pinned profile bar, occasion filters, composer, shopping list tab, Draw-on-Photo doodle modal, claim/edit/profile/surprise modals.
- `wwwroot/js/gifts.js` — Drag-drop, clipboard paste, 2-layer Draw-on-Photo canvas, shopping list view, shared `buildGiftCard` renderer, claim stage & split actions.
- `wwwroot/css/site.css` — `.gifts-*`, `.gift-*`, and `.doodle-*` styling with `[data-theme="dark"]` support.
- `Controllers/GiftsController.cs` — `/api/gifts/members`, `/api/gifts/list/{ownerUserId}`, `POST /api/gifts`, `PUT/DELETE /api/gifts/{id}`, `/reorder`, `/{id}/most-wanted`, `/list/{ownerUserId}/surprise`, `/{id}/claim`, `/{id}/unclaim`, `/{id}/claim-status`, `/{id}/split-toggle`, `/my-claims`, `/profile/{ownerUserId}`, `PUT /profile`.
- `src/FamilyVault.Files/Data/Entities/ChristmasGiftItemEntity.cs` & `GiftMemberProfileEntity.cs`
- `src/FamilyVault.Files/Security/ChristmasGiftRules.cs`
- `src/FamilyVault.Files/Services/ChristmasGiftService.cs` & `ChristmasGiftModels.cs`
