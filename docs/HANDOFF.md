# McWut handoff

**For:** Vince  
**Written:** 8 October 2026  
**Repo:** https://github.com/McWut-src/McWut_WebApp  
**Folder:** `C:\vince\McWutWebApp`  
**Live site:** https://mcwut.com and https://www.mcwut.com

Read this when you are working alone. Pushing code does **not** change the live site. You promote after QA. The steps are below.

An agent should read [AGENT.md](AGENT.md) first. The archive copy `docs/archive/AGENT.md` is an old brief.

---

## What the site is

A private family file drop. Home is the dashboard. Profile, the color picker, the icon sidebar, and signed-in Privacy are on https://mcwut.com. The live image is `ca-mcwut--0000015`.

- Sign in with email and password. Before you are signed in, the site shows that form and nothing else. Open Register is **404**. New people join only from a link you create under **Invites**. A file share link (`/s/…`) and an invite link (`/join/…`) still open without an account.
- After sign-in, home is four cards: **My files**, **Vault**, **URLs**, **Profile**. The sidebar uses the same order and can fold down to icons.
- **My files** (`/files`): drop files, or paste text, then **Save**. The file is private and kept forever. **Options** can keep it for 1, 7, or 30 days, and can set a password that a later share link asks for. A pasted note can be named there. With no name it is saved as `note`. The link icon on a file makes a public `/s/` link of eight letters or digits. That link lasts 7 days. Older longer `/s/...` links still open.
- **URLs** (`/urls`): **Shorten a link**. Paste a long address, including one that starts with `www`. You get another `/s/` link. Opening it sends the person to that address. It stays until you delete it. The same page lists every public link you have made, including file shares from My files. View shows the link. Quick open follows it. Delete stops the link. A file stays in My files.
- Old `/Vault`, `/Vault/Shared`, and `/files/shared` redirect to My files. Member tagging is hidden. See [LATER-MEMBER-SHARING.md](LATER-MEMBER-SHARING.md).
- Photos (jpeg, png, gif, webp) show as thumbnails on My files. Click one for a large view. Previous and Next move between photos. Opening that view does not count as a download. SVG and HTML stay downloads. A short note or a Markdown file can be read on My files and on the share page. Opening that view does not count as a download.
- **People** (`/admin/people`): turn an account off or back on. Files stay. You cannot turn yourself off, and the last admin must stay on. A turned-off person is signed out on their next click.
- **Reset password** (`/admin/reset-password`): admin sets a new McWut sign-in password for any account. Separate from the personal Passwords vault.
- **Status** (`/admin/status`): database reachable, storage kind, counts. No passwords on this page.
- **Passwords** (`/passwords`): your own saved logins. Search on top, list on the left, details on the right. Another member cannot open your list.
- **Profile** (`/profile`): the name the family will see, a color kept for later, and the password you use to sign in. The color is not shown on a public link. `/account/password` opens this page. Privacy is linked from here, and only while you are signed in.
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

Database migration `AddShortLinks` (SQLite `20261007004423`, SQL Server `20261007004430`). Production applied the SQL Server migration on revision `0000012`.

- **URLs** (`/urls`) holds **Shorten a link** and the list of public links. A public web address, including one that starts with `www`, becomes an `/s/` link. Opening it redirects to that address. It stays until you delete it. Only `http` and `https` public addresses are accepted. File and upload share links from My files are on the same list. Deleting a share link leaves the file in My files.
- A file share link still shows the file. New file links stay short: `/s/` plus eight letters or digits. Older longer file links still open. Invite links stay long.
- A note, `.txt`, `.csv`, `.json`, or `.md` file can be read on My files and on the share page. Markdown is formatted. Opening that view does not count as a download. HTML and SVG stay downloads.

Already on the site before this build: photo gallery, password vault, paste, People, Reset password, Status, lockout, filename escaping.

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
2. After sign-in, home shows **My files**, **Vault**, **URLs**, and **Profile**. The sidebar matches. It can fold to icons. For admin: **Invites**, **People**, **Reset password**, **Status**. There is no Shared files item and no Tag a member control. `/files/shared` redirects to My files. Signed out, `/` and `/Privacy` are the sign-in form, with no privacy link and no toy passwords.
3. https://localhost:7047/Identity/Account/Register (or :8080) is **404**.
4. Paste a sentence and **Save**. The status is Saved, and there is no share box. The file is in the list with no removal date. Open **Options**, set Keep to 1 day and a password, name the note, and Save again. That row shows a date and the word password. You can still read it while signed in. The link icon copies a short `/s/` link (eight letters after `/s/`). That link lasts 7 days. Open it in a private window: it asks for the password, then the sentence is visible. Download works. Upload a `.md` file and read it on My files and on its share link. On **URLs**, shorten `www.example.com/page?id=3` and open that short link: it goes to that address. The same page lists that link and the file share link. Delete removes the link.
5. Drop a real photo. A thumbnail shows in My files. Click it. The large view opens. The share page shows the photo too.
6. **People**: turn `member@` off. That login says the account is turned off. Turn it back on. Sign-in works again.
7. **Reset password**: as admin, set `member@` to a temporary password, sign in as member with it, then set it back to `member`.
8. **Status** loads and does not show a connection string.
9. `/health` is `ok`.
10. **Passwords**: create a login, copy the username and password, open the URL, edit, and save. Sign in as the other toy user and confirm that list does not show the first user's login.
11. **Profile** sets a name and a color, and changes the sign-in password. Change the toy password back to `vince` or `member` when you are done. `/account/password` opens Profile.

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
   - Save a non-empty file. It stays in My files with no share link. Use the link icon for a public link, then open that in a private window and download

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
| `Pages/Urls/` | URLs at `/urls`. Shorten a web address, and list, open, or delete public links. |
| `Pages/Passwords/` | Saved logins at `/passwords`. API is `Controllers/PasswordsController.cs` |
| `Pages/Profile/` | Name, color, and your own sign-in password, at `/profile` |
| `Pages/Account/Password.cshtml` | Old address. Opening it goes to Profile |
| `wwwroot/js/passwords.js` | Search, list, edit, copy, open |
| `Pages/Admin/` | Invites, People, Reset password, Status |
| `Pages/Join/` | `/join/{token}` |
| `Pages/Share/` | `/s/{token}`. A file link shows the file. A shortened address redirects. |
| `Controllers/ShortLinksController.cs` | Create, list, and delete a shortened address |
| `wwwroot/js/urls.js` | Shorten a link, and view, open, copy, or delete public links |
| `wwwroot/js/vault.js` | Upload, paste, list, share link, reader |
| `wwwroot/js/reader.js` | Plain text and Markdown reading |
| `src/FamilyVault.Files` | Database, files, links, cleanup |
| `src/FamilyVault.Files.Azure` | Blob storage when `Files:Provider` is Azure |
| `src/FamilyVault.Files.Contracts` | Shared types |
| `tests/FamilyVault.Files.Tests` | File rules |
| `.github/workflows/ghcr.yml` | Builds the image. `:latest` only on a `v*` tag or a manual run with promote_prod checked |
| `Dockerfile`, `docker-compose.yml` | QA on this PC |

Startup listens on port 8080 **before** it migrates the database, so Azure’s probe does not kill the container. Migration runs in `Hosting/DatabaseStartupWorker.cs`.

---

## Promotion log

**8 October 2026, 01:43 UTC.** Production was moved on purpose to the signed-in home, Profile, and color picker.

| | Revision | Image |
|---|---|---|
| Previous (rollback) | `ca-mcwut--0000014` | `ghcr.io/mcwut-src/mcwut_webapp:abd8ec755a8666aabf8907e12815528f5e37ebee` |
| Live | `ca-mcwut--0000015` | `ghcr.io/mcwut-src/mcwut_webapp:849b4934fca968afea4a80e634f226dac9086b6e` |

`0000015` has 100% of the traffic and was Healthy. `0000014` is the previous build, private saves that stay forever. It has no traffic and can be brought back.

Checked while signed out, on `0000015`: both hosts `/health` return `ok`, Register is 404, and `/`, `/Privacy`, `/profile`, and `/files` redirect to sign-in. The sign-in page shows McWut, email, password, and Remember me. It does not show a privacy link, an invitation sentence, or a toy password. `/favicon.svg` is the house mark. SQL was paused (error 40613) and the app retried. Startup logged `Database migrate and identity seed finished.` at 01:43 UTC. That run applied `AddMemberColor`. Sign in and open Profile to pick a color. Save on My files still stores a private file.

Rollback, if the new site is wrong and you want the previous one:

```powershell
az containerapp ingress traffic set --name ca-mcwut --resource-group McWutStorage --revision-weight ca-mcwut--0000014=100
```

Do not delete the SQL server or the storage account. A later docs-only commit does not change the live image. Azure is pinned to the full SHA above.
