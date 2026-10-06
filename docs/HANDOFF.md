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
- **My files** (`/files`): drop files, or paste text. You get a link. Default keep time is 7 days (also 1 day, 30 days, or forever). Optional password.
- **Shared files** (`/files/shared`): files another member tagged you on. No link needed.
- Old `/Vault` and `/Vault/Shared` redirect to the new URLs.
- Photos (jpeg, png, gif, webp) show a small preview. A short text note shows on the share page. Previews do not count as downloads. SVG and HTML stay downloads.
- **People** (`/admin/people`): turn an account off or back on. Files stay. You cannot turn yourself off, and the last admin must stay on. A turned-off person is signed out on their next click.
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

Database migration `AddPasswordVault` for SQLite and for SQL Server. Startup applies it. Table `PasswordVaultItems`.

- **Passwords** (`/passwords`): each signed-in person has their own list. Fields are name, username, password, URL, and information. Copy is on the username, password, and URL. Open shows up when the URL is `http://` or `https://`. Edit, Save, and Delete. Search matches name, username, URL, and information.
- The name is stored as text so the list can show it. Username, password, URL, and notes are encrypted with this site's data-protection key (purpose `McWut.PasswordVault.v1`). Another member's request for your item is 404. Losing the key ring makes an item unreadable; saving a new copy replaces it.
- **Change sign-in password** (`/account/password`). That is the McWut login, separate from a saved login. After a change you stay signed in.
- Privacy page says the vault is stored.

Already on the site before this build: paste, image and text previews, People, Status, lockout, filename escaping.

Still not built, on purpose: generated thumbnail files, video previews, email, public Register, renaming `FamilyVault`.

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
2. After sign-in: **My files**, **Shared files**, **Passwords**, and for admin **Invites**, **People**, **Status**. Header **Password** opens the sign-in password change.
3. https://localhost:7047/Identity/Account/Register (or :8080) is **404**.
4. Paste a sentence, upload, open the `/s/...` link in a private window. The sentence is visible. Download works.
5. Drop a real photo. A small picture shows in the list. The share page shows it too.
6. **People**: turn `member@` off. That login says the account is turned off. Turn it back on. Sign-in works again.
7. **Status** loads and does not show a connection string.
8. `/health` is `ok`.
9. **Passwords**: create a login, copy the username and password, open the URL, edit, and save. Sign in as the other toy user and confirm that list does not show the first user's login.
10. **Password** in the header changes the sign-in password. Change the toy password back to `vince` or `member` when you are done.

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
| `Pages/Vault/` | My files and Shared files screens. URLs are `/files`, not `/Vault` |
| `Pages/Passwords/` | Saved logins at `/passwords`. API is `Controllers/PasswordsController.cs` |
| `Pages/Account/Password.cshtml` | Change the McWut sign-in password |
| `wwwroot/js/passwords.js` | Search, list, edit, copy, open |
| `Pages/Admin/` | Invites, People, Status |
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

**6 October 2026.** Production was moved on purpose.

| | Revision | Image |
|---|---|---|
| Previous (rollback) | `ca-mcwut--0000004` | `ghcr.io/mcwut-src/mcwut_webapp:53c1826167badfec9ca28afafeac8d65b8afd685` |
| Live | `ca-mcwut--0000006` | `ghcr.io/mcwut-src/mcwut_webapp:6d86a22f309c6ef2503d9d144feed7197d381316` |

`ca-mcwut--0000005` was the paste / people / preview build (`fd92b73`). It was replaced the same day by `0000006`, which is that build plus “keep trying the database”.

Checked while signed out, on `0000006`: both hosts `/health` return `ok`, Register is 404, the home page says McWut and mentions paste, `/Vault` redirects to `/files`. Logs show migrate **retrying** (not a crash).

**Sign-in and upload were not checked on `0000006`.** At that time Azure SQL `sql-mcwut` was paused (error 42119). On 6 October 2026 Vince said the database is being paid for again, and both public hosts returned `/health` `ok` from `4.172.131.145`.

The app retries migrate and the admin seed until they succeed (every 5 seconds, then longer, up to 5 minutes). Look for the log line `Database migrate and identity seed finished.` Then sign in with the **prod** password (Azure secret `website-admin-password`, not `vince`) and upload one real file. The password-vault migration runs in that same step. It creates `PasswordVaultItems`. Do not restart the container just to migrate.

Rollback, if the new site is wrong and you want the old one:

```powershell
az containerapp ingress traffic set --name ca-mcwut --resource-group McWutStorage --revision-weight ca-mcwut--0000004=100
```

Do not delete the SQL server or the storage account.
