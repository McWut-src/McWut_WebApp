# McWut handoff

**For:** Vince  
**Written:** 6 October 2026  
**Repo:** https://github.com/McWut-src/McWut_WebApp  
**Folder:** `C:\vince\McWutWebApp`  
**Live site:** https://mcwut.com and https://www.mcwut.com

Read this when you are working alone. Pushing code does **not** change the live site. You promote after QA. The steps are below.

---

## What the site is

A private family file drop.

- Sign in with email and password. Open Register is **404**. New people join only from a link you create under **Invites**.
- **My files** (`/files`): drop files, or paste text. You get a link. Default keep time is 7 days (also 1 day, 30 days, or forever). Optional password. That link is how a file is shared.
- Old `/Vault`, `/Vault/Shared`, and `/files/shared` redirect to My files. Member tagging is hidden. See [LATER-MEMBER-SHARING.md](LATER-MEMBER-SHARING.md).
- Photos (jpeg, png, gif, webp) show as thumbnails on My files. Click one for a large view. Previous and Next move between photos. Opening that view does not count as a download. SVG and HTML stay downloads. A short text note still shows on the share page.
- **People** (`/admin/people`): turn an account off or back on. Files stay. You cannot turn yourself off, and the last admin must stay on. A turned-off person is signed out on their next click.
- **Reset password** (`/admin/reset-password`): admin sets a new McWut sign-in password for any account. Separate from the personal Passwords vault.
- **Status** (`/admin/status`): database reachable, storage kind, counts. No passwords on this page.
- **Passwords** (`/passwords`): your own saved logins. Search on top, list on the left, details on the right. Another member cannot open your list.
- **Password** in the header (`/account/password`): change the password you use to sign in to McWut.
- `/health` returns the text `ok`. Leave that alone. Azure uses it.

Internal project names stay `McWutWebApp` and `FamilyVault.*`. Renaming them breaks Docker and Azure for no benefit to people using the site.

---

## Accounts

| Where | Who | Password |
|---|---|---|
| Dev and Docker QA | `vince@mcwut.com` | `vince` (admin) |
| Dev and Docker QA | `member@mcwut.com` | `member` |
| Production | `vince@mcwut.com` | The Azure secret `website-admin-password`. **Not** `vince`. |

Dev/QA toy users exist only because the environment is Development. Production does not seed `member@`.

---

## What was added in the last change

No new database migration.

- **Reset password** (`/admin/reset-password`): admin-only page to set a new sign-in password for any account. Uses Identity password reset (security stamp updates). Confirm dialog before save. Does not change account on/off (that stays on People).

Already on the site before this build: photo gallery, password vault, paste, People, Status, lockout, filename escaping.

Still not built, on purpose: separate small thumbnail files, video previews, email, public Register, renaming `FamilyVault`.

---

## Run on this PC (Dev)

1. Open `McWutWebApp.slnx` in Visual Studio, profile **https**, or:

```powershell
cd C:\vince\McWutWebApp
dotnet run --launch-profile https --project McWutWebApp.csproj
```

2. Browser: https://localhost:7047  
3. Sign in as `vince@mcwut.com` / `vince`.

Data: `App_Data\mcwut.db` and `App_Data\vault`. Not in git.

## Prove it in Docker (QA)

Docker Desktop must say **Engine running**. Stop Visual Studio first if you are unsure which site you are looking at.

```powershell
cd C:\vince\McWutWebApp
docker compose up --build
```

Browser: **http://localhost:8080** (plain http). Same toy logins. This database is a Docker volume, not `App_Data`, and not Azure.

Stop:

```powershell
cd C:\vince\McWutWebApp
docker compose down
```

## Click-through (Dev and QA)

1. Header says **McWut**.
2. After sign-in: **My files**, **Vault**, and for admin **Invites**, **People**, **Reset password**, **Status**. There is no Shared files item and no Tag a member control. Header **Password** opens the sign-in password change. `/files/shared` redirects to My files.
3. https://localhost:7047/Identity/Account/Register (or :8080) is **404**.
4. Paste a sentence, upload, open the `/s/...` link in a private window. The sentence is visible. Download works.
5. Drop a real photo. A thumbnail shows in My files. Click it. The large view opens. The share page shows the photo too.
6. **People**: turn `member@` off. That login says the account is turned off. Turn it back on. Sign-in works again.
7. **Reset password**: as admin, set `member@` to a temporary password, sign in as member with it, then set it back to `member`.
8. **Status** loads and does not show a connection string.
9. `/health` is `ok`.
10. **Passwords**: create a login, copy the username and password, open the URL, edit, and save. Sign in as the other toy user and confirm that list does not show the first user's login.
11. **Password** in the header changes the sign-in password. Change the toy password back to `vince` or `member` when you are done.

Tests:

```powershell
cd C:\vince\McWutWebApp
dotnet test tests\FamilyVault.Files.Tests\FamilyVault.Files.Tests.csproj
```

There is no browser test project. The file tests do not cover the Razor pages. Click through after a UI change.

---

## How a change gets to mcwut.com

Three worlds. Do not mix their data.

| | Dev | QA | Prod |
|---|---|---|---|
| Where | Visual Studio | Docker on this PC | Azure Container App **ca-mcwut**, group **McWutStorage** |
| URL | https://localhost:7047 | http://localhost:8080 | https://mcwut.com |
| Data | SQLite in `App_Data` | Other SQLite in a Docker volume | Azure SQL `sql-mcwut` + Blob container `vault` |

1. Change code. Click through in Dev.
2. `docker compose up --build` and click through on :8080.
3. Commit and push `main`. GitHub Action **Publish to GHCR** builds  
   `ghcr.io/mcwut-src/mcwut_webapp:<full commit SHA>` and the tag `:qa`.  
   It does **not** move the live site.
4. Wait until that Action is green.
5. Point Azure at that SHA image. Do not use `:latest` unless you tagged it on purpose.

Portal: resource group **McWutStorage** → Container App **ca-mcwut** → new revision → image  
`ghcr.io/mcwut-src/mcwut_webapp:FULL_SHA`  
Leave secrets `sql-connection`, `storage-connection`, `website-admin-password` in place.

Or, if `az` is already logged in on this PC (this only changes the image):

```powershell
az containerapp update --name ca-mcwut --resource-group McWutStorage --image ghcr.io/mcwut-src/mcwut_webapp:FULL_SHA
```

6. Wait until the new revision is Healthy.
7. Check, without using the Dev password:
   - https://mcwut.com/health → `ok`
   - https://www.mcwut.com/health → `ok`
   - https://mcwut.com/Identity/Account/Register → 404
   - Sign in as `vince@mcwut.com` with the **prod** password
   - Upload a non-empty file, open the link in a private window, download

Longer notes: [tutorials/05-promote-prod.md](tutorials/05-promote-prod.md).

### If the new revision is bad

Portal → **ca-mcwut** → **Revisions** → activate the previous healthy revision. That is the rollback. Do not delete the SQL server or the storage account.

---

## Do not

- Put prod SQL or storage connection strings into `appsettings.json` or `docker-compose.yml`.
- Turn on `Identity:AllowRegistration`.
- Delete Azure SQL or the storage account as part of a deploy.
- Rename `McWutWebApp.csproj` or the `FamilyVault` projects.
- Expect `git push` to change https://mcwut.com.

Secrets live in the Azure Container App, not in git. An old example of the *names* is in `docs/archive/azure-containerapp.env.example`. The values in that file are placeholders.

---

## Where the code lives

| Path | What |
|---|---|
| `McWutWebApp.csproj`, `Program.cs`, `Pages/`, `Controllers/` | The website |
| `Pages/Vault/` | My files screen. URL is `/files`, not `/Vault`. `/files/shared` redirects here. |
| `Pages/Passwords/` | Saved logins at `/passwords`. API is `Controllers/PasswordsController.cs` |
| `Pages/Account/Password.cshtml` | Change the McWut sign-in password |
| `wwwroot/js/passwords.js` | Search, list, edit, copy, open |
| `Pages/Admin/` | Invites, People, Reset password, Status |
| `Pages/Join/` | `/join/{token}` |
| `Pages/Share/` | `/s/{token}` |
| `wwwroot/js/vault.js` | Upload, paste, list, tag |
| `src/FamilyVault.Files` | Database, files, links, cleanup |
| `src/FamilyVault.Files.Azure` | Blob storage when `Files:Provider` is Azure |
| `src/FamilyVault.Files.Contracts` | Shared types |
| `tests/FamilyVault.Files.Tests` | File rules |
| `.github/workflows/ghcr.yml` | Builds the image. `:latest` only on a `v*` tag or a manual run with promote_prod checked |
| `Dockerfile`, `docker-compose.yml` | QA on this PC |

Startup listens on port 8080 **before** it migrates the database, so Azure’s probe does not kill the container. Migration runs in `Hosting/DatabaseStartupWorker.cs`.

---

## Promotion log

**6 October 2026, evening.** Production was moved on purpose to the admin reset-password build.

| | Revision | Image |
|---|---|---|
| Previous (rollback) | `ca-mcwut--0000008` | `ghcr.io/mcwut-src/mcwut_webapp:967bc98ef760e396a81a92e66becd261d80c9c44` |
| Live | `ca-mcwut--0000009` | `ghcr.io/mcwut-src/mcwut_webapp:666a1bcf7d29e84cdd823e6b49e6cd772d5a5ecf` |

`0000009` has 100% of the traffic and was Healthy. `0000008` is the photo-gallery build and stays available with no traffic. Older revision `ca-mcwut--0000007` is the password-vault image `d5f7461c29d0c3aed0550af0e971885aed82d46e`.

Checked while signed out, on `0000009`: both hosts `/health` return `ok`, Register is 404, `/files` and `/admin/reset-password` redirect to sign-in, and `/js/vault.js` still has the photo gallery. The log line `Database migrate and identity seed finished.` appeared. Sign in as admin and open **Reset password** to set another person's McWut login.

Rollback, if the new site is wrong and you want the previous one:

```powershell
az containerapp ingress traffic set --name ca-mcwut --resource-group McWutStorage --revision-weight ca-mcwut--0000008=100
```

Do not delete the SQL server or the storage account. A later docs-only commit does not change the live image. Azure is pinned to the full SHA above.
