# Agent brief: Family vault file drop

Hand this file to Copilot / Grok / any build agent that is working **inside the existing ASP.NET Core solution**.

The host app already has:

- ASP.NET Core
- ASP.NET Core Identity
- Users (invitation-only)
- An `ApplicationDbContext` (or equivalent) and an `ApplicationUser` (or equivalent)

This pack is **contracts only**. Do not treat the records in `FamilyVault.Files.Contracts` as EF entities. Map them.

---

## 0. Rename before you start

Search-replace if needed:

| Placeholder | Meaning |
|---|---|
| `FamilyVault.Files` | Root namespace of the contracts project |
| `ApplicationUser` | Existing Identity user class |
| `ApplicationDbContext` | Existing Identity / app DbContext |
| `OwnerUserId` / `UserId` as `Guid` | Identity primary key. If the app uses `string` keys, change every `Guid` user id in contracts **or** parse at the adapter boundary. Prefer adapting at the boundary so contracts stay `Guid`. |

Do **not** scaffold a new Identity UI or a second user table.

---

## 1. Add the contracts project to the existing solution

Copy `src/FamilyVault.Files.Contracts/` into the solution (suggested: `src/FamilyVault.Files.Contracts/`).

```bash
dotnet sln add src/FamilyVault.Files.Contracts/FamilyVault.Files.Contracts.csproj
dotnet add <WebProject>.csproj reference src/FamilyVault.Files.Contracts/FamilyVault.Files.Contracts.csproj
```

Retarget `net8.0` if the host is `net9.0` / `net10.0`.

Create two **new** projects later (not in this pack):

- `FamilyVault.Files` — application services that implement the domain interfaces
- `FamilyVault.Files.Azure` — `IObjectStore` + optional `IDirectAccessObjectStore`

The web project references application services. Only the Azure project references `Azure.Storage.Blobs`.

```
Web / Identity host
  -> FamilyVault.Files            (domain services, EF)
       -> FamilyVault.Files.Contracts
  -> FamilyVault.Files.Azure      (optional, IObjectStore impl)
       -> FamilyVault.Files.Contracts
```

---

## 2. Hard rules

1. **Bytes vs records.** `IObjectStore` stores bytes under an opaque key (`{fileId:N}` or `{ownerId:N}/{fileId:N}`). Original file name, TTL, password, grants, and share tokens live in SQL.
2. **No Azure types** outside `FamilyVault.Files.Azure`.
3. **Streams, never `byte[]`**, for file content.
4. **Passwords.** Hash with `PasswordHasher<ApplicationUser>` or `IPasswordHasher<>`. Never store plaintext. Password is a gate, not encryption of the blob.
5. **Share tokens.** Cryptographically random, ≥128 bits, URL-safe. Never use integer ids in public URLs.
6. **One access choke point.** Every download/preview/list of a shared item goes through `IFileAccessService`.
7. **Default TTL is 7 days.** `Retention.Default()` / `Retention.Week()`. `Forever` = null expiry. One-time = `MaxDownloads = 1`.
8. **Link TTL ≠ file TTL.** Revoking a link does not delete the file or family grants.
9. **Do not use Azure Blob lifecycle as the only cleaner.** Implement `IFileLifecycle` as a hosted service. Azure lifecycle may be added later as an extra.
10. **Do not implement a full Drive folder tree in v1.** Drops (buckets) + a flat owned library are enough.

---

## 3. Implement in this order

Stop after each slice and keep it compiling.

### Slice A — persistence (no HTTP yet)

Add tables to the **existing** `ApplicationDbContext`. Suggested entities (EF, not the contract records):

**StoredFileEntity**

- `Id` Guid PK
- `OwnerUserId` Guid (or string) FK → Identity user
- `OriginalFileName` string (sanitized, max 255)
- `ContentType` string
- `SizeBytes` long
- `StorageKey` string unique
- `Status` int (`FileStatus`)
- `CreatedAt` DateTimeOffset
- `ExpiresAt` DateTimeOffset? 
- `MaxDownloads` int?
- `DownloadCount` int
- `PasswordHash` string?
- `DropId` Guid? FK
- `ChecksumSha256` string?
- `DeletedAt` DateTimeOffset?

**DropEntity**

- `Id`, `OwnerUserId`, `Title`, `CreatedAt`, `ExpiresAt`, `MaxDownloads`, `DownloadCount`, `PasswordHash`, `DeletedAt`

**ShareLinkEntity**

- `Id`, `Token` unique, `TargetKind`, `TargetId`, `CreatedByUserId`, `CreatedAt`, `ExpiresAt`, `MaxDownloads`, `DownloadCount`, `PasswordHash`, `AllowPreview`, `RevokedAt`

**FileGrantEntity**

- `Id`, `TargetKind`, `TargetId`, `UserId` FK, `Permission`, `GrantedByUserId`, `GrantedAt`
- Unique (`TargetKind`, `TargetId`, `UserId`)

**UploadSessionEntity**

- `SessionId`, `FileId`, `OwnerUserId`, `StorageKey`, `ExpectedSize`, `BytesReceived`, `ExpiresAt`, `Status`

**FileAuditEntity**

- `Id`, `At`, `Action`, `TargetKind`, `TargetId`, `ActorUserId`, `ShareToken`, `Detail`

Indexes:

- `StoredFile (OwnerUserId, Status, DeletedAt)`
- `StoredFile (ExpiresAt)` where not deleted
- `ShareLink (Token)`
- `FileGrant (UserId)`
- `FileGrant (TargetKind, TargetId)`

Migration against the existing Identity database. Do not create a second context unless the host already uses bounded contexts.

Map entity → contract records in the application project (`ToRecord()`). Never return `PasswordHash` through the contract records (`HasPassword` only).

### Slice B — local object store (so the app runs without Azure)

Implement `IObjectStore` + `IObjectStoreCapabilities` on local disk under a configured folder (e.g. `App_Data/vault`).

- `SupportsDirectUpload = false`
- `SupportsDirectRead = false`
- Range reads: seek the file stream

Register it in Development. Production can swap to Azure later without touching controllers.

### Slice C — domain services

Implement:

- `IFileLibrary`
- `IDropService`
- `IUploadSessionService` (single-shot stream is fine for v1; chunked append can be a second pass)
- `IShareLinkService`
- `IGrantService` (validate `UserId` exists in Identity)
- `IFileAccessService`
- `IFileContentService`
- `IFileLifecycle`
- `IQuotaService` (config: max bytes per user; fail with a typed exception)
- `IContentScanner` → no-op `new ScanResult(true, null)`
- `IFileAudit`

**Access rules for `IFileAccessService`**

Allow when any of these is true (and the file/drop is `Ready`, not deleted, not expired, download cap not exceeded):

1. `context.UserId == OwnerUserId` → all intents.
2. Signed-in user has a `FileGrant` on the file **or** its parent drop, permission ≥ intent (`View` covers List/Preview, `Download` covers Download, `Manage` covers Manage).
3. Valid, unrevoked, unexpired share token for the file or its parent drop. If the link or the target has a password, `ProvidedPassword` must verify. Token with `AllowPreview = false` cannot Preview. Anonymous token cannot Manage.

If a password is required and missing, return `Allowed = false, RequiresPassword = true` (HTTP 401 with a distinct payload, not a generic 404).

Unknown / unauthorized targets: prefer **404** over 403 so tokens cannot be enumerated.

### Slice D — HTTP API on the existing web app

Use the existing auth cookie / bearer. Do not invent a new login.

All mutating file endpoints: `[Authorize]`.

Suggested routes (adapt to the host’s style: MVC or Minimal APIs):

```
POST   /api/drops
GET    /api/drops
GET    /api/drops/{id}
POST   /api/drops/{id}/files                 // begin upload into a drop
PATCH  /api/drops/{id}                       // retention, password, title
DELETE /api/drops/{id}

GET    /api/files                            // owned library
GET    /api/files/shared-with-me
GET    /api/files/{id}
PATCH  /api/files/{id}                       // retention, password
DELETE /api/files/{id}

POST   /api/uploads                          // begin (owned file, optional dropId)
PUT    /api/uploads/{sessionId}              // body stream or chunk
POST   /api/uploads/{sessionId}/complete
DELETE /api/uploads/{sessionId}

POST   /api/files/{id}/links
POST   /api/drops/{id}/links
DELETE /api/links/{token}

POST   /api/files/{id}/grants                // body: userId, permission
DELETE /api/files/{id}/grants/{userId}
POST   /api/drops/{id}/grants
DELETE /api/drops/{id}/grants/{userId}

GET    /api/files/{id}/content               // [Authorize] or anonymous + token
GET    /api/drops/{id}/archive
GET    /s/{token}                            // public resolve page / download
```

Public link endpoints:

- Allow anonymous.
- Accept `?token=` or route token.
- Accept password via `X-Share-Password` header or form field (not query string).
- Build `AccessContext` from `User.GetUserId()` when present **plus** the token.

Downloads:

- `Content-Disposition: attachment; filename="..."` with RFC 5987 filename.
- Support `Range` on `IFileContentService.OpenDownloadAsync`.
- Increment download counters (file, drop, and/or link) only after a successful open, and only for full downloads if you distinguish preview vs download.

Upload:

- Reject empty names, path segments (`..`, `/`, `\`), and control characters.
- Cap size from config (`Files:MaxFileSizeBytes`).
- Check quota before `BeginAsync`.
- Create SQL row `Pending` first, then accept bytes, then `Ready`.
- If the store put fails, mark `Failed` and leave the sweeper to delete orphans.

### Slice E — hosted sweeper

`IHostedService` / `BackgroundService` every N minutes:

1. `SweepExpiredAsync` — `ExpiresAt <= UtcNow` or `MaxDownloads` reached → delete blob, mark deleted.
2. `SweepAbandonedUploadsAsync` — Pending sessions older than e.g. 24h.
3. `SweepSoftDeletedAsync` — `DeletedAt` older than grace (e.g. 7 days) → hard delete blob if still present.

Use a scoped `IServiceScopeFactory`. Do not capture DbContext on the singleton worker.

### Slice F — Azure Blob (only after A–E work on disk)

New project `FamilyVault.Files.Azure`:

- `AzureBlobObjectStore : IObjectStore, IDirectAccessObjectStore, IObjectStoreCapabilities`
- Container private (no public anonymous blob access).
- SAS for direct upload/download with short TTL (minutes).
- Blob name = `StorageKey`, not original file name.
- Register with config:

```
Files:Provider = Azure | Local
Files:Azure:ConnectionString
Files:Azure:Container
Files:Local:RootPath
Files:DefaultRetentionDays = 7
Files:MaxFileSizeBytes
Files:QuotaBytesPerUser
```

Keep the local provider for tests and dev.

---

## 4. Identity integration details

- Current user id: existing extension the app already uses (`User.GetUserId()`, `UserManager`, claims). Convert to `Guid` at the controller/endpoint edge if Identity keys are strings that are actually GUIDs.
- Grants: resolve the target user with `UserManager<ApplicationUser>.FindByIdAsync`. Do not accept emails as the stored grant key; look up then store the id.
- Invitation-only is already enforced by Identity. Do not add a second invite system for files.
- Authorization policies are optional. If used:

```csharp
options.AddPolicy("FileOwnerOrGranted", ...);
```

  The policy handler should call `IFileAccessService`, not duplicate rules.

- For link downloads when the user is also signed in, evaluate **both** doors (grant and token). Owner always wins.

---

## 5. UI notes (only if asked)

v1 screens, in order:

1. Signed-in drop zone (drag and drop) → create drop + files, default 7-day TTL, optional password, copy link.
2. “My files” list with expiry badge, download count, revoke link, tag family member (user picker from existing users).
3. Public `/s/{token}` page: password prompt if needed, file list, download / download-all.
4. “Shared with me” list for tagged users.

Do not build a full Google Drive folder browser in v1.

---

## 6. Security checklist

- [ ] Store container / disk root not publicly reachable
- [ ] Opaque blob keys
- [ ] Share tokens unguessable and revocable
- [ ] Passwords hashed
- [ ] Password never in query string or logs
- [ ] 404 for missing and unauthorized
- [ ] Filename sanitization + content-type allow/deny list
- [ ] Max size + quota
- [ ] Range header validation
- [ ] Audit row on download / grant / link create
- [ ] CSRF on cookie-auth mutating endpoints (existing antiforgery)
- [ ] Do not return other users’ emails in grant lists beyond what the host already exposes to family members

---

## 7. What this pack does **not** include

- Azure implementation
- EF entities / migrations
- Controllers / Razor / JS dropzone
- tus.io server (add later if wifi drops become a real problem)
- Virus scanning implementation
- End-to-end encryption
- Folder hierarchy
- Notifications (“you were tagged”) — hook via `IFileAudit` or a domain event later

---

## 8. Definition of done for the first vertical slice

A signed-in family user can:

1. Drag a file into the existing site
2. Get a link that expires in 7 days
3. Optionally set a password and a different TTL (including forever)
4. Open that link on another machine (anonymous) and download
5. Tag another existing Identity user so they see the file when logged in, without the link
6. Have expired files disappear from the UI and from storage after the sweeper runs

Until that works on the **local** `IObjectStore`, do not start Azure.
