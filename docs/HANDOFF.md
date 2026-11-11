# McWut handoff

**For:** Vince  
**Written:** 9 October 2026  
**Repo:** https://github.com/McWut-src/McWut_WebApp  
**Folder:** `C:\vince\McWutWebApp`  
**Live site:** https://mcwut.com and https://www.mcwut.com

Read this when you are working alone. Pushing code does **not** change the live site. You promote after QA. The steps are below.

An agent should read [AGENT.md](AGENT.md) first. The archive copy `docs/archive/AGENT.md` is an old brief.

---

## What the site is

A private family file drop. Home is the dashboard. Profile, the color picker, the icon sidebar, and signed-in Privacy are on https://mcwut.com. Markdown notes, including Mermaid diagrams, are rendered there too. AI, Games, and Messages are there too. The live revision is `ca-mcwut--0000042`.

- Sign in with email and password. Before you are signed in, the site shows that form and nothing else. Open Register is **404**. New people join only from a link you create under **Invites**. A file share link (`/s/…`) and an invite link (`/join/…`) still open without an account.
- After sign-in, home is six cards: **My files**, **Vault**, **URLs**, **Messages**, **AI**, **Profile**. The sidebar uses the same order and can fold down to icons. The phone bar has the same six icons.
- **My files** (`/files`): drop files, or write a **Story**, then **Save**. The file is private and kept forever. Words alone stay a text file. Words saved with one or more files become one story in the Stories section. A chat saved from AI appears under **Chats**, and only when there is one. **Options** can keep it for 1, 7, or 30 days, and can set a password that a later share link asks for. A pasted note can be named there. With no title it is saved as `note`. The link icon on a file makes a public `/s/` link of eight letters or digits. That link lasts 7 days. Older longer `/s/...` links still open.
- **URLs** (`/urls`): **Shorten a link**. Paste a long address, including one that starts with `www`. You get another `/s/` link. Opening it sends the person to that address. It stays until you delete it. The same page lists every public link you have made, including file shares from My files. View shows the link. Quick open follows it. Delete stops the link. A file stays in My files.
- Old `/Vault`, `/Vault/Shared`, and `/files/shared` redirect to My files. A people icon titled “Share with a member” shares a file or a story. The other person can open and download it only. See [LATER-MEMBER-SHARING.md](LATER-MEMBER-SHARING.md).
- Photos (jpeg, png, gif, webp) show as thumbnails on My files. Click one for a large view. Previous and Next move between photos. Audio and video files (mp4, webm, mov, mp3, m4a, wav, ogg) play inline on My files, inside stories, and on the share page. Opening a preview does not count as a download. SVG and HTML stay downloads. A short note or a Markdown file can be read on My files and on the share page, and the owner can edit a note or a story in place without changing its share link. Markdown is rendered on the server. A Mermaid diagram in that file, including a Gantt chart or a mindmap, is drawn in the browser. Opening that view does not count as a download.
- **People** (`/admin/people`): turn an account off or back on. Files stay. You cannot turn yourself off, and the last admin must stay on. A turned-off person is signed out on their next click.
- **Reset password** (`/admin/reset-password`): admin sets a new McWut sign-in password for any account. Separate from the personal Passwords vault.
- **Status** (`/admin/status`): database reachable, storage kind, counts. No passwords on this page.
- **Passwords** (`/passwords`): your own saved logins. Search on top, list on the left, details on the right. Another member cannot open your list. **Download copy** saves a JSON file named from your name, or the part of your email before `@`. **Import copy** restores logins from a downloaded JSON copy and skips duplicates. The file contains the passwords. The site does not keep a second copy.
- **Profile** (`/profile`): the name shown in the menu, a color for the bar and the menu, light or dark on this browser, the password you use to sign in, and the OpenRouter key for AI. A pale color uses dark text. A dark color uses pale text. The color is not shown on a public link. `/account/password` opens this page. Privacy is linked from here, and only while you are signed in. The signed-in header is that name. Sign-in and public pages still say McWut.
- **Messages** (`/messages`): write to another member. **New** lists the other people. Search filters threads by member or preview, and links in messages (`http(s)://`, `/s/…`, `/files#…`) are clickable. Only the two of you can read the thread. The menu shows how many are unread. Opening the thread clears that count.
- **AI** (`/ai`): with no key, or a key OpenRouter rejects, the page tells you how to make an account and a key, and the chat stays off. The key itself is on **Profile**. It is stored encrypted, and the page never shows the whole key again. A working key shows free models by default (including context length when OpenRouter sends it), and checking **Paid models** includes paid OpenRouter models. Sending a message streams the reply. The rest of the page stays usable, and Send becomes Stop. **Markdown** is on unless you turn it off. A Markdown reply is drawn like a note, including a Mermaid diagram when the reply has one. The chat stays in this browser until you choose **Save**, which puts it in **Chats** on My files, or **New chat**. **Copy link** makes a public `/s/` link and lists it on URLs.
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

Still not built, on purpose: separate small thumbnail files, email, public Register, renaming `FamilyVault`.

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
2. After sign-in, home shows **My files**, **Vault**, **URLs**, **Messages**, **AI**, and **Profile**. The sidebar matches. It can fold to icons. For admin: **Invites**, **People**, **Reset password**, **Status**. There is no Shared files item and no control labeled Tag a member. A people icon on a file shares it with a member. `/files/shared` redirects to My files. Signed out, `/` and `/Privacy` are the sign-in form, with no privacy link and no toy passwords.
3. https://localhost:7047/Identity/Account/Register (or :8080) is **404**.
4. Paste a sentence and **Save**. The status is Saved, and there is no share box. The file is in the list with no removal date. Open **Options**, set Keep to 1 day and a password, name the note, and Save again. That row shows a date and the word password. You can still read it while signed in. The link icon copies a short `/s/` link (eight letters after `/s/`). That link lasts 7 days. Open it in a private window: it asks for the password, then the sentence is visible. Download works. Upload a `.md` file and read it on My files and on its share link. A Mermaid block in that file, including a Gantt chart or a mindmap, is drawn. On **URLs**, shorten `www.example.com/page?id=3` and open that short link: it goes to that address. The same page lists that link and the file share link. Delete removes the link.
5. Drop a real photo. A thumbnail shows in My files. Click it. The large view opens. The share page shows the photo too. Add a photo and write a story, then Save. It appears under Stories, not as a loose photo. Open it: the words and the photo are both there. Share it with the other member. They can read the whole story and cannot delete it.
6. **People**: turn `member@` off. That login says the account is turned off. Turn it back on. Sign-in works again.
7. **Reset password**: as admin, set `member@` to a temporary password, sign in as member with it, then set it back to `member`.
8. **Status** loads and does not show a connection string.
9. `/health` is `ok`.
10. **Passwords**: create a login, copy the username and password, open the URL, edit, and save. Sign in as the other toy user and confirm that list does not show the first user's login.
11. **Profile** sets a name and a color, and changes the sign-in password. Change the toy password back to `vince` or `member` when you are done. `/account/password` opens Profile.
12. As `vince@`, share a file with `member@` from the people icon. The row shows that member’s color. **URLs** lists the share with the same color and no public address. Sign in as `member@`: **From others** shows the file, open and download work, and there is no delete. As `vince@`, **Remove share** on URLs. The other member no longer sees the file.
13. **Messages**: as `vince@`, choose **New**, pick `member@`, and send a sentence. Sign in as `member@`. The Messages item shows a count. Open the thread, see the sentence, and reply. Sign back in as `vince@` and see the reply. The Privacy page says only the two of you can read it.
14. **AI** with no key shows the short OpenRouter steps and no chat box. On **Profile**, a bad key is refused. A key OpenRouter accepts shows only the last four characters. Removing it clears it. The page does not show the whole key. With a working key, the chat is available. Sending a message shows Waiting… and the rest of the page still works. Send becomes Stop. With Markdown on, the reply is drawn like a note. **Save** puts that chat under **Chats** on My files. **Copy link** copies a 7-day `/s/` link, and URLs lists it.

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
| `Pages/Profile/` | Name, color, your own sign-in password, and the OpenRouter key, at `/profile` |
| `Pages/Messages/` | Messages at `/messages`. A private thread with another member. API is `Controllers/MessagesController.cs` |
| `Pages/Ai/` | AI at `/ai`. A chat when the key works. Save stores it in Chats. |
| `Pages/Account/Password.cshtml` | Old address. Opening it goes to Profile |
| `wwwroot/js/passwords.js` | Search, list, edit, copy, open |
| `Pages/Admin/` | Invites, People, Reset password, Status |
| `Pages/Join/` | `/join/{token}` |
| `Pages/Share/` | `/s/{token}`. A file link shows the file. A shortened address redirects. |
| `Controllers/ShortLinksController.cs` | Create, list, and delete a shortened address |
| `wwwroot/js/messages.js` | Conversation list, thread, and send |
| `wwwroot/js/urls.js` | Shorten a link, and view, open, copy, or delete public links |
| `wwwroot/js/vault.js` | Upload, paste, list, share link, reader |
| `wwwroot/js/reader.js` | Plain text reading, and Mermaid diagrams in a Markdown note |
| `src/FamilyVault.Files` | Database, files, links, cleanup |
| `src/FamilyVault.Files.Azure` | Blob storage when `Files:Provider` is Azure |
| `src/FamilyVault.Files.Contracts` | Shared types |
| `tests/FamilyVault.Files.Tests` | File rules |
| `.github/workflows/ghcr.yml` | Builds the image. `:latest` only on a `v*` tag or a manual run with promote_prod checked |
| `Dockerfile`, `docker-compose.yml` | QA on this PC |

Startup listens on port 8080 without opening Azure SQL, so a cold start does not wake or create the database. Dev and Docker still migrate SQLite in `Hosting/DatabaseStartupWorker.cs`. Production migrates in `Hosting/SqlServerDatabaseGate.cs` on the first request that needs the database, and only when `sql-mcwut` already exists.

---

## Promotion log

**11 November 2026, 17:19 UTC.** Production was moved on purpose to fix inverted steering controls in **Neon Slope** (`neon-slope`) — aligning Three.js 3D camera coordinate mapping (+Z forward, camera at -6.8 looking at +16.0) with screen-space steering so Left steers left (positive target velocity `targetVx = 14.5`) and Right steers right (negative target velocity `targetVx = -14.5`), while updating the 2D canvas wireframe fallback projection (`sx = width / 2 - (x - camX) * scale`) and rail/grid endpoints to guarantee coordinate parity across desktop keyboard, on-screen touch buttons, and direct viewport taps.

| | Revision | Image |
|---|---|---|
| Previous (rollback) | `ca-mcwut--0000041` | `ghcr.io/mcwut-src/mcwut_webapp:8309a3e392e571d352cdd2b3004cca3964a3e449` |
| Live | `ca-mcwut--0000042` | `ghcr.io/mcwut-src/mcwut_webapp:dfbab575adb4defa423f40109b70d944561f81e3` |

`0000042` has 100% of the traffic and is Healthy. `0000041` is the previous revision and can be brought back. The new revision’s startup log says it is listening.

Checked while signed out, on `0000042`: both hosts `/health` return `ok`, Register is 404, and `/files` and `/games` redirect to sign-in. Static asset `/js/games.js` serves the verified Neon Slope steering fix (`if (slopeInput.left) targetVx = 14.5;`).

Rollback, if the new site is wrong and you want the previous one:

```powershell
az containerapp revision activate --name ca-mcwut --resource-group McWutStorage --revision ca-mcwut--0000041
az containerapp ingress traffic set --name ca-mcwut --resource-group McWutStorage --revision-weight ca-mcwut--0000041=100
```

**11 November 2026, 15:46 UTC.** Production was moved on purpose to add the **Interactive Visual Level Editor** and **Community Member Levels** to **Wacky Wheels** (`wacky-wheels`) — enabling members to sketch custom courses directly on the canvas (rolling hills, boost launch ramps, 360° Sonic stunt loops, springboards, swinging wrecking balls, breakable crates, stars, and finish gate with 25-step Undo and live test drive), publish and share them across the family with shareable deep links (`/games?game=wacky-wheels&level={id}`), remix courses, and compete for Course Champion records (score & fastest clear time) backed by `GameCustomLevels` table, `GameLevelRules`, and `GameCustomLevelService`.

| | Revision | Image |
|---|---|---|
| Previous (rollback) | `ca-mcwut--0000040` | `ghcr.io/mcwut-src/mcwut_webapp:31a05847441baf7da30b1bab9424447c56464b30` |
| Live | `ca-mcwut--0000041` | `ghcr.io/mcwut-src/mcwut_webapp:8309a3e392e571d352cdd2b3004cca3964a3e449` |

`0000041` has 100% of the traffic and is Healthy. `0000040` is the previous revision and can be brought back. The new revision’s startup log says it is listening.

Checked while signed out, on `0000041`: both hosts `/health` return `ok` with security headers, Register is 404, and `/files` and `/games` redirect to sign-in. Static assets `/js/games.js` and `/css/site.css` contain the verified level editor, community levels list, and styles.

Rollback, if the new site is wrong and you want the previous one:

```powershell
az containerapp revision activate --name ca-mcwut --resource-group McWutStorage --revision ca-mcwut--0000040
az containerapp ingress traffic set --name ca-mcwut --resource-group McWutStorage --revision-weight ca-mcwut--0000040=100
```

**11 November 2026, 14:53 UTC.** Production was moved on purpose to add **Wacky Wheels** (`wacky-wheels`) to the `/games` arcade hub — expanding the arcade to 6 live playable games with a family-friendly Canvas 2D ragdoll physics stunt obstacle course featuring a 2-wheel spring/damper suspension buggy, 5-segment articulated Lego-style toy rider with breakable snap-joints and star/confetti bursts, rolling hills, turbo launch ramp, 360° loop-the-loop, springboards, swinging wrecking balls, breakable crates, 15 bonus stars, checkered finish gate, synthesized Web Audio effects, mobile touch controls, and global high scores.

| | Revision | Image |
|---|---|---|
| Previous (rollback) | `ca-mcwut--0000039` | `ghcr.io/mcwut-src/mcwut_webapp:2e7db963af69b8b2fb7d13a95660c669aa45a573` |
| Live | `ca-mcwut--0000040` | `ghcr.io/mcwut-src/mcwut_webapp:31a05847441baf7da30b1bab9424447c56464b30` |

`0000040` has 100% of the traffic and is Healthy. `0000039` is the previous revision and can be brought back. The new revision’s startup log says it is listening.

Checked while signed out, on `0000040`: both hosts `/health` return `ok` with security headers, Register is 404, and `/files` and `/games` redirect to sign-in. Static assets `/js/games.js` and `/css/site.css` contain the verified Wacky Wheels ragdoll physics engine and styles.

Rollback, if the new site is wrong and you want the previous one:

```powershell
az containerapp revision activate --name ca-mcwut --resource-group McWutStorage --revision ca-mcwut--0000039
az containerapp ingress traffic set --name ca-mcwut --resource-group McWutStorage --revision-weight ca-mcwut--0000039=100
```

**11 November 2026, 11:28 UTC.** Production was moved on purpose to transform `/games` into a dedicated **Arcade Hub Landing Page** — replacing immediate Stack 3D boot with a modern game catalog grid featuring all 6 arcade titles (**Stack 3D**, **Mini Crossword**, **Minesweeper**, **Neon Slope**, **2048 Neon**, and **Cyber Breakout** [Coming Soon]) and an **Arcade Hall of Fame** leaderboard preview card with filter pills. Includes seamless stage routing, `All Games` back navigation, deep-link persistence (`/games?game=...`), browser `popstate` support, responsive mobile single-column layout, and 3D physics loop idling when off-stage.

| | Revision | Image |
|---|---|---|
| Previous (rollback) | `ca-mcwut--0000038` | `ghcr.io/mcwut-src/mcwut_webapp:ca40bd118f820a590d8275b97fb9525c7424aa64` |
| Live | `ca-mcwut--0000039` | `ghcr.io/mcwut-src/mcwut_webapp:2e7db963af69b8b2fb7d13a95660c669aa45a573` |

`0000039` has 100% of the traffic and is Healthy. `0000038` is the previous revision and can be brought back. The new revision’s startup log says it is listening.

Checked while signed out, on `0000039`: both hosts `/health` return `ok` with security headers, Register is 404, and `/files` and `/games` redirect to sign-in. Static assets `/js/games.js` and `/css/site.css` contain the verified Arcade Hub landing page, catalog grid, and stage router.

Rollback, if the new site is wrong and you want the previous one:

```powershell
az containerapp revision activate --name ca-mcwut --resource-group McWutStorage --revision ca-mcwut--0000038
az containerapp ingress traffic set --name ca-mcwut --resource-group McWutStorage --revision-weight ca-mcwut--0000038=100
```

**11 November 2026, 11:00 UTC.** Production was moved on purpose to add **Neon Slope** (`neon-slope`) and **2048 Neon** (`merge-2048`) to the `/games` arcade hub — expanding the arcade to 5 live playable games featuring Three.js 3D downhill endless running with procedural tracks, obstacles, gem bonuses, jump physics, and 2D canvas fallback, alongside a reactive 4×4 number merging grid with smooth CSS animations, Web Audio chord chimes, single-step undo, touch swipe / D-pad controls, and shared global high scores with member profile flair.

| | Revision | Image |
|---|---|---|
| Previous (rollback) | `ca-mcwut--0000037` | `ghcr.io/mcwut-src/mcwut_webapp:85496f81e8b83616d9fe2a4feb5281215e978367` |
| Live | `ca-mcwut--0000038` | `ghcr.io/mcwut-src/mcwut_webapp:ca40bd118f820a590d8275b97fb9525c7424aa64` |

`0000038` has 100% of the traffic and is Healthy. `0000037` is the previous revision and can be brought back. The new revision’s startup log says it is listening.

Checked while signed out, on `0000038`: both hosts `/health` return `ok` with security headers, Register is 404, and `/files` and `/games` redirect to sign-in. Static assets `/js/games.js` and `/css/site.css` contain the verified Neon Slope and 2048 Neon engines and styles.

Rollback, if the new site is wrong and you want the previous one:

```powershell
az containerapp revision activate --name ca-mcwut --resource-group McWutStorage --revision ca-mcwut--0000037
az containerapp ingress traffic set --name ca-mcwut --resource-group McWutStorage --revision-weight ca-mcwut--0000037=100
```

**11 November 2026, 03:05 UTC.** Production was moved on purpose to add the **Minesweeper** (`minesweeper`) game to the `/games` arcade hub — a Canvas 2D neon minefield with Easy/Medium/Hard fields, first-click safety, tap/long-press and right-click flagging, a Flag mode toggle for touch, cascade combo scoring, speed bonuses, explosion particle chains, confetti on a clean sweep, and seamless switching alongside **Stack 3D** and **Mini Crossword** with integrated global high scores.

| | Revision | Image |
|---|---|---|
| Previous (rollback) | `ca-mcwut--0000036` | `ghcr.io/mcwut-src/mcwut_webapp:e8524b9335df5938c21d278aa1b36cdc4be752e9` |
| Live | `ca-mcwut--0000037` | `ghcr.io/mcwut-src/mcwut_webapp:85496f81e8b83616d9fe2a4feb5281215e978367` |

`0000037` has 100% of the traffic and is Healthy. `0000036` is the previous revision and can be brought back. The new revision’s startup log says it is listening.

Checked while signed out, on `0000037`: both hosts `/health` return `ok` with security headers, Register is 404, and `/files` and `/games` redirect to sign-in. Static assets `/js/games.js` and `/css/site.css` contain the verified Minesweeper engine and styles.

Rollback, if the new site is wrong and you want the previous one:

```powershell
az containerapp revision activate --name ca-mcwut --resource-group McWutStorage --revision ca-mcwut--0000036
az containerapp ingress traffic set --name ca-mcwut --resource-group McWutStorage --revision-weight ca-mcwut--0000036=100
```

**11 November 2026, 02:15 UTC.** Production was moved on purpose to add the **Mini Crossword** (`mini-crossword`) game to the `/games` arcade hub — a bite-sized 5×5 crossword pack with curated smart clues, on-screen responsive touch QWERTY keyboard, interactive clue list navigation, pencil mode, check/hint helpers, clean-word combo scoring, victory solve celebrations, and seamless switching alongside **Stack 3D** with integrated global high scores.

| | Revision | Image |
|---|---|---|
| Previous (rollback) | `ca-mcwut--0000035` | `ghcr.io/mcwut-src/mcwut_webapp:5811fd462a1ce035119d0de88f18c88954843e6c` |
| Live | `ca-mcwut--0000036` | `ghcr.io/mcwut-src/mcwut_webapp:e8524b9335df5938c21d278aa1b36cdc4be752e9` |

`0000036` has 100% of the traffic and is Healthy. `0000035` is the previous revision and can be brought back. The new revision’s startup log says it is listening.

Checked while signed out, on `0000036`: both hosts `/health` return `ok` with security headers, Register is 404, `/games` redirects to sign-in, and static assets `/js/games.js` and `/css/site.css` contain the verified Mini Crossword engine and styles.

Rollback, if the new site is wrong and you want the previous one:

```powershell
az containerapp revision activate --name ca-mcwut --resource-group McWutStorage --revision ca-mcwut--0000035
az containerapp ingress traffic set --name ca-mcwut --resource-group McWutStorage --revision-weight ca-mcwut--0000035=100
```

**10 November 2026, 22:55 UTC.** Production was moved on purpose to add the `/games` arcade hub with **Stack 3D** (vendored Three.js 3D isometric tower builder with overhang slicing physics, 3+ combo slab expansion, synthesized Web Audio sound effects, and automatic 2D isometric canvas fallback) and a global high-score leaderboard (`GameScores` table via `AddGameScores` migration, `GameScoreService`, and `GamesController`) showing member color pills, emblems, status tags, and combo streaks.

| | Revision | Image |
|---|---|---|
| Previous (rollback) | `ca-mcwut--0000034` | `ghcr.io/mcwut-src/mcwut_webapp:c674c61ca2e6c6103605a634fc2dc29ce73a0d18` |
| Live | `ca-mcwut--0000035` | `ghcr.io/mcwut-src/mcwut_webapp:5811fd462a1ce035119d0de88f18c88954843e6c` |

`0000035` has 100% of the traffic and is Healthy. `0000034` is the previous revision and can be brought back. The new revision’s startup log says it is listening.

Checked while signed out, on `0000035`: both hosts `/health` return `ok` with security headers, Register is 404, and `/files` and `/games` redirect to sign-in. This build adds migration `AddGameScores`. That migration runs on the first request that needs the database, and only if `sql-mcwut` already exists.

Rollback, if the new site is wrong and you want the previous one:

```powershell
az containerapp revision activate --name ca-mcwut --resource-group McWutStorage --revision ca-mcwut--0000034
az containerapp ingress traffic set --name ca-mcwut --resource-group McWutStorage --revision-weight ca-mcwut--0000034=100
```

**10 November 2026, 22:03 UTC.** Production was moved on purpose to fix modal dialog layering over profile background wallpaper: removed the `z-index: 1` stacking context restriction from `.app-main` on profiles with active background tiles, transitioned the wallpaper pseudo-element to `body.has-bg-tile::before` with non-blocking pointer events, and ensured `#message-doodle-modal` and `#message-files-modal` mount directly to `document.body` so Bootstrap's `.modal-backdrop` stays behind dialogs and never blocks canvas drawing or file selection.

| | Revision | Image |
|---|---|---|
| Previous (rollback) | `ca-mcwut--0000033` | `ghcr.io/mcwut-src/mcwut_webapp:bf8fb0946b96b917be156a7514328e12a44f814b` |
| Live | `ca-mcwut--0000034` | `ghcr.io/mcwut-src/mcwut_webapp:c674c61ca2e6c6103605a634fc2dc29ce73a0d18` |

`0000034` has 100% of the traffic and is Healthy. `0000033` is the previous revision and can be brought back. The new revision’s startup log says it is listening.

Checked while signed out, on `0000034`: both hosts `/health` return `ok` with security headers, Register is 404, and `/files` redirects to sign-in. The sign-in page shows McWut, and the title is Sign in - McWut. Sign-in with the production password was not tried.

Rollback, if the new site is wrong and you want the previous one:

```powershell
az containerapp revision activate --name ca-mcwut --resource-group McWutStorage --revision ca-mcwut--0000033
az containerapp ingress traffic set --name ca-mcwut --resource-group McWutStorage --revision-weight ca-mcwut--0000033=100
```

**8 November 2026, 22:53 UTC.** Production was moved on purpose to data-saving category folding and on-demand pagination in My files: each category (Stories, Chats, Photos, Files) is folded by default to prevent eager image preview fetches and bandwidth consumption; unfolding loads items on demand with per-category pagination (default 8 items per page, selectable 4/8/12/24) and loaded byte size indicators; global search automatically unfolds matching categories and resets pagination; deep links into stories and files unfold and jump to target items.

| | Revision | Image |
|---|---|---|
| Previous (rollback) | `ca-mcwut--0000032` | `ghcr.io/mcwut-src/mcwut_webapp:f73803bac6bb6f7e13cb8cd59b7f285098b9e679` |
| Live | `ca-mcwut--0000033` | `ghcr.io/mcwut-src/mcwut_webapp:bf8fb0946b96b917be156a7514328e12a44f814b` |

`0000033` has 100% of the traffic and is Healthy. `0000032` is the previous revision and can be brought back. The new revision’s startup log says it is listening.

Checked while signed out, on `0000033`: both hosts `/health` return `ok` with security headers, Register is 404, and `/files` redirects to sign-in. The sign-in page shows McWut, and the title is Sign in - McWut. Sign-in with the production password was not tried.

Rollback, if the new site is wrong and you want the previous one:

```powershell
az containerapp revision activate --name ca-mcwut --resource-group McWutStorage --revision ca-mcwut--0000032
az containerapp ingress traffic set --name ca-mcwut --resource-group McWutStorage --revision-weight ca-mcwut--0000032=100
```

**26 October 2026, 23:44 UTC.** Production was moved on purpose to compact and minimalist profile controls: pure visual color dots without color name copy, label-free emblem/motif/pattern selector tiles, compact layout without empty label height, and generic dropdown options (`Style 1`..`Style 8`, `Tone 1`..`Tone 5`) with zero predefined intention.

| | Revision | Image |
|---|---|---|
| Previous (rollback) | `ca-mcwut--0000031` | `ghcr.io/mcwut-src/mcwut_webapp:ec97694f0b8d46ca77bb446dcde5190497b48801` |
| Live | `ca-mcwut--0000032` | `ghcr.io/mcwut-src/mcwut_webapp:f73803bac6bb6f7e13cb8cd59b7f285098b9e679` |

`0000032` has 100% of the traffic and is Healthy. `0000031` is the previous revision and can be brought back. The new revision’s startup log says it is listening.

Checked while signed out, on `0000032`: both hosts `/health` return `ok` with security headers, Register is 404, and `/files` redirects to sign-in. The sign-in page shows McWut, and the title is Sign in - McWut. Sign-in with the production password was not tried.

Rollback, if the new site is wrong and you want the previous one:

```powershell
az containerapp revision activate --name ca-mcwut --resource-group McWutStorage --revision ca-mcwut--0000031
az containerapp ingress traffic set --name ca-mcwut --resource-group McWutStorage --revision-weight ca-mcwut--0000031=100
```

**26 October 2026, 21:41 UTC.** Production was moved on purpose to mature, adult, and professional profile styling: executive palette swatches (Executive Navy, Classic Slate, Oxford Blue, Forest Green, Deep Bordeaux, Rich Cognac, Royal Plum, Warm Espresso), professional header emblems (Executive Crest, Compass Star, Quill & Ink, Sovereign Anchor, Royal Coronet, Signet Monogram, Alpine Summit, Diamond Facet), architectural header motifs (Architectural Grid, Serene Waves, Alpine Horizon, Herringbone Weave, Night Constellation), clean background pattern tiles (Fine Linen Texture, Architectural Dot Matrix, Diamond Lattice, Isometric Tessellation, Art Deco Geometry, Botanical Laurel), 5 discrete synthesized notification chimes, title/status personalization, and dedicated adult AI theming while preserving safe-for-teens family guardrails.

| | Revision | Image |
|---|---|---|
| Previous (rollback) | `ca-mcwut--0000030` | `ghcr.io/mcwut-src/mcwut_webapp:707b7e4c41b9312f3a0efd9f649220a9109ba169` |
| Live | `ca-mcwut--0000031` | `ghcr.io/mcwut-src/mcwut_webapp:ec97694f0b8d46ca77bb446dcde5190497b48801` |

`0000031` has 100% of the traffic and is Healthy. `0000030` is the previous revision and can be brought back. The new revision’s startup log says it is listening.

Checked while signed out, on `0000031`: both hosts `/health` return `ok` with security headers, Register is 404, and `/files` redirects to sign-in. The sign-in page shows McWut, and the title is Sign in - McWut. Sign-in with the production password was not tried.

Rollback, if the new site is wrong and you want the previous one:

```powershell
az containerapp revision activate --name ca-mcwut --resource-group McWutStorage --revision ca-mcwut--0000030
az containerapp ingress traffic set --name ca-mcwut --resource-group McWutStorage --revision-weight ca-mcwut--0000030=100
```

**26 October 2026, 21:27 UTC.** Production was moved on purpose to fix AI personalization SVG display and retention: distinct parameterless MIME types (`image/x-mcwut-badge+svg`, `image/x-mcwut-motif+svg`, `image/x-mcwut-tile+svg`) to avoid upload parameter normalization, backwards-compatible retrieval for existing raw SVG emblems/motifs/tiles, and file sweeper protection for all custom personalization items and stickers.

| | Revision | Image |
|---|---|---|
| Previous (rollback) | `ca-mcwut--0000029` | `ghcr.io/mcwut-src/mcwut_webapp:99371b40a9fe560bb184d159ecabfdf9f84660b7` |
| Live | `ca-mcwut--0000030` | `ghcr.io/mcwut-src/mcwut_webapp:707b7e4c41b9312f3a0efd9f649220a9109ba169` |

`0000030` has 100% of the traffic and is Healthy. `0000029` is the previous revision and can be brought back. The new revision’s startup log says it is listening.

Checked while signed out, on `0000030`: both hosts `/health` return `ok` with security headers, Register is 404, and `/files` redirects to sign-in. The sign-in page shows McWut, and the title is Sign in - McWut. Sign-in with the production password was not tried.

Rollback, if the new site is wrong and you want the previous one:

```powershell
az containerapp revision activate --name ca-mcwut --resource-group McWutStorage --revision ca-mcwut--0000029
az containerapp ingress traffic set --name ca-mcwut --resource-group McWutStorage --revision-weight ca-mcwut--0000029=100
```

**26 October 2026, 14:51 UTC.** Production was moved on purpose to technical debt reduction and application hardening: Azure SQL serverless auto-pause optimization (24-hour sweep cadence), 503 self-refreshing SQL wake page for pauses (errors 40613/42119), global security defense-in-depth headers, dedicated `UserPersonalizations` and `SystemSettings` database tables (with backward-compatible fallback), DM query sequence-based paging, unlinked chat upload sweeping, and Identity lockout & IP login rate limiting.

| | Revision | Image |
|---|---|---|
| Previous (rollback) | `ca-mcwut--0000028` | `ghcr.io/mcwut-src/mcwut_webapp:f6c46d9052f77b9331608bb214a5b8a586a49d48` |
| Live | `ca-mcwut--0000029` | `ghcr.io/mcwut-src/mcwut_webapp:99371b40a9fe560bb184d159ecabfdf9f84660b7` |

`0000029` has 100% of the traffic and is Healthy. `0000028` is the previous revision and can be brought back. The new revision’s startup log says it is listening.

Checked while signed out, on `0000029`: both hosts `/health` return `ok` with security headers (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`), Register is 404, and `/files` redirects to sign-in. The sign-in page shows McWut, and the title is Sign in - McWut. Sign-in with the production password was not tried. This build adds migration `AddPersonalizationAndSystemSettings`. That migration runs on the first request that needs the database, and only if `sql-mcwut` already exists.

Rollback, if the new site is wrong and you want the previous one:

```powershell
az containerapp revision activate --name ca-mcwut --resource-group McWutStorage --revision ca-mcwut--0000028
az containerapp ingress traffic set --name ca-mcwut --resource-group McWutStorage --revision-weight ca-mcwut--0000028=100
```

**26 October 2026, 01:21 UTC.** Production was moved on purpose to Site AI in Admin, distinct Admin sidebar icons, and personalizations for everyone/teens (compact 64x64 AI header emblems, 120x56 header motifs, 80x80 repeating background tiles, gamer status tags, teen color swatches, and 5 Web Audio synthesized chime themes).

| | Revision | Image |
|---|---|---|
| Previous (rollback) | `ca-mcwut--0000027` | `ghcr.io/mcwut-src/mcwut_webapp:ddeb9042a2c97ee7c596cfd9b694d8ab69ccd80c` |
| Live | `ca-mcwut--0000028` | `ghcr.io/mcwut-src/mcwut_webapp:f6c46d9052f77b9331608bb214a5b8a586a49d48` |

`0000028` has 100% of the traffic and is Healthy. `0000027` is the previous revision and can be brought back. The new revision’s startup log says it is listening.

Checked while signed out, on `0000028`: both hosts `/health` return `ok`, Register is 404, and `/`, `/Privacy`, `/profile`, `/files`, `/messages`, `/passwords`, and `/ai` redirect to sign-in. The sign-in page shows McWut, and the title is Sign in - McWut. It does not show a privacy link, an invitation sentence, or a toy password. Sign-in with the production password was not tried. This build adds no database migration.

Rollback, if the new site is wrong and you want the previous one:

```powershell
az containerapp revision activate --name ca-mcwut --resource-group McWutStorage --revision ca-mcwut--0000027
az containerapp ingress traffic set --name ca-mcwut --resource-group McWutStorage --revision-weight ca-mcwut--0000027=100
```

**25 October 2026, 15:34 UTC.** Production was moved on purpose to kid accounts in Admin (disabling and hiding all AI features for marked kids while preserving the Messages sticker generator) and custom AI sticker generation.

| | Revision | Image |
|---|---|---|
| Previous (rollback) | `ca-mcwut--0000026` | `ghcr.io/mcwut-src/mcwut_webapp:1f9dbfa1e77b5fa001efabcfec3670b8cd7b39be` |
| Live | `ca-mcwut--0000027` | `ghcr.io/mcwut-src/mcwut_webapp:ddeb9042a2c97ee7c596cfd9b694d8ab69ccd80c` |

`0000027` has 100% of the traffic and is Healthy. `0000026` is the previous revision and can be brought back. The new revision’s startup log says it is listening.

Checked while signed out, on `0000027`: both hosts `/health` return `ok`, Register is 404, and `/`, `/Privacy`, `/profile`, `/files`, `/messages`, `/passwords`, and `/ai` redirect to sign-in. The sign-in page shows McWut, and the title is Sign in - McWut. It does not show a privacy link, an invitation sentence, or a toy password. Sign-in with the production password was not tried.

Rollback, if the new site is wrong and you want the previous one:

```powershell
az containerapp revision activate --name ca-mcwut --resource-group McWutStorage --revision ca-mcwut--0000026
az containerapp ingress traffic set --name ca-mcwut --resource-group McWutStorage --revision-weight ca-mcwut--0000026=100
```

**24 October 2026, 17:43 UTC.** Production was moved on purpose to group messaging, 84 SVG stickers & meme collection, custom reactions, voice memo attachments, and doodle canvas.

| | Revision | Image |
|---|---|---|
| Previous (rollback) | `ca-mcwut--0000025` | `ghcr.io/mcwut-src/mcwut_webapp:c57488b7218611efa85469753704689798efd067` |
| Live | `ca-mcwut--0000026` | `ghcr.io/mcwut-src/mcwut_webapp:1f9dbfa1e77b5fa001efabcfec3670b8cd7b39be` |

`0000026` has 100% of the traffic and is Healthy. `0000025` is the previous revision and can be brought back. The new revision’s startup log says it is listening. It does not say `Database migrate and identity seed finished.`

Checked while signed out, on `0000026`: both hosts `/health` return `ok`, Register is 404, and `/`, `/Privacy`, `/profile`, `/files`, `/messages`, `/passwords`, and `/ai` redirect to sign-in. `/img/stickers/meme-rock-side-eye.svg` returns 200. The sign-in page shows McWut, and the title is Sign in - McWut. It does not show a privacy link, an invitation sentence, or a toy password. Sign-in with the production password was not tried. This build adds the `AddKidsChatEnhancements` migration, which applies on the first database access.

Rollback, if the new site is wrong and you want the previous one:

```powershell
az containerapp revision activate --name ca-mcwut --resource-group McWutStorage --revision ca-mcwut--0000025
az containerapp ingress traffic set --name ca-mcwut --resource-group McWutStorage --revision-weight ca-mcwut--0000025=100
```

**17 October 2026, 18:37 UTC.** Production was moved on purpose to support reading and editing code and configuration files in My files with dedicated code icon and monospace font.

| | Revision | Image |
|---|---|---|
| Previous (rollback) | `ca-mcwut--0000024` | `ghcr.io/mcwut-src/mcwut_webapp:81e006e93793ea90b84173044bdbeef68c00241a` |
| Live | `ca-mcwut--0000025` | `ghcr.io/mcwut-src/mcwut_webapp:c57488b7218611efa85469753704689798efd067` |

`0000025` has 100% of the traffic and is Healthy. `0000024` is the previous revision and can be brought back. The new revision’s startup log says it is listening. It does not say `Database migrate and identity seed finished.`

Checked while signed out, on `0000025`: both hosts `/health` return `ok`, Register is 404, and `/`, `/Privacy`, `/profile`, `/files`, `/messages`, `/passwords`, and `/ai` redirect to sign-in. The sign-in page shows McWut, and the title is Sign in - McWut. It does not show a privacy link, an invitation sentence, or a toy password. Sign-in with the production password was not tried. This build adds no database migration.

Rollback, if the new site is wrong and you want the previous one:

```powershell
az containerapp revision activate --name ca-mcwut --resource-group McWutStorage --revision ca-mcwut--0000024
az containerapp ingress traffic set --name ca-mcwut --resource-group McWutStorage --revision-weight ca-mcwut--0000024=100
```

**17 October 2026, 13:20 UTC.** Production was moved on purpose to password vault read-only member sharing, bare domain support (e.g. `facebook.com`), site favicons with lock fallback, and a standalone password generator card.

| | Revision | Image |
|---|---|---|
| Previous (rollback) | `ca-mcwut--0000023` | `ghcr.io/mcwut-src/mcwut_webapp:808a8b866988196ac17211297f3b53ef2254573b` |
| Live | `ca-mcwut--0000024` | `ghcr.io/mcwut-src/mcwut_webapp:81e006e93793ea90b84173044bdbeef68c00241a` |

`0000024` has 100% of the traffic and is Healthy. `0000023` is the previous revision and can be brought back. The new revision’s startup log says it is listening. It does not say `Database migrate and identity seed finished.`

Checked while signed out, on `0000024`: both hosts `/health` return `ok`, Register is 404, `/manifest.json` returns 200 with name McWut, and `/`, `/Privacy`, `/profile`, `/files`, `/messages`, `/passwords`, and `/ai` redirect to sign-in. The sign-in page shows McWut, and the title is Sign in - McWut. It does not show a privacy link, an invitation sentence, or a toy password. Sign-in with the production password was not tried. This build adds no database migration.

Rollback, if the new site is wrong and you want the previous one:

```powershell
az containerapp revision activate --name ca-mcwut --resource-group McWutStorage --revision ca-mcwut--0000023
az containerapp ingress traffic set --name ca-mcwut --resource-group McWutStorage --revision-weight ca-mcwut--0000023=100
```

**16 October 2026, 19:46 UTC.** Production was moved on purpose to voice memo recording, download limits / burn-after-reading, Ask AI in note/story readers, password health checks & strong generator, message browser notifications, and PWA manifest.

| | Revision | Image |
|---|---|---|
| Previous (rollback) | `ca-mcwut--0000022` | `ghcr.io/mcwut-src/mcwut_webapp:2912aa3ca2baf08a86201465d5f904d9cac24d3e` |
| Live | `ca-mcwut--0000023` | `ghcr.io/mcwut-src/mcwut_webapp:808a8b866988196ac17211297f3b53ef2254573b` |

`0000023` has 100% of the traffic and is Healthy. `0000022` is the previous revision and can be brought back. The new revision’s startup log says it is listening. It does not say `Database migrate and identity seed finished.`

Checked while signed out, on `0000023`: both hosts `/health` return `ok`, Register is 404, `/manifest.json` returns 200 with name McWut, and `/`, `/Privacy`, `/profile`, `/files`, `/messages`, `/passwords`, and `/ai` redirect to sign-in. The sign-in page shows McWut, and the title is Sign in - McWut. It does not show a privacy link, an invitation sentence, or a toy password. Sign-in with the production password was not tried. This build adds no database migration.

Rollback, if the new site is wrong and you want the previous one:

```powershell
az containerapp revision activate --name ca-mcwut --resource-group McWutStorage --revision ca-mcwut--0000022
az containerapp ingress traffic set --name ca-mcwut --resource-group McWutStorage --revision-weight ca-mcwut--0000022=100
```

**16 October 2026, 17:51 UTC.** Production was moved on purpose to password vault import, in-place note/story editing, inline audio/video playback, message search & clickable links, and the AI paid models toggle.

| | Revision | Image |
|---|---|---|
| Previous (rollback) | `ca-mcwut--0000021` | `ghcr.io/mcwut-src/mcwut_webapp:b8093471aea98fc6aed6910afb1a71528cc9fd6b` |
| Live | `ca-mcwut--0000022` | `ghcr.io/mcwut-src/mcwut_webapp:2912aa3ca2baf08a86201465d5f904d9cac24d3e` |

`0000022` has 100% of the traffic and is Healthy. `0000021` is the previous revision and can be brought back. The new revision’s startup log says it is listening. It does not say `Database migrate and identity seed finished.`

Checked while signed out, on `0000022`: both hosts `/health` return `ok`, Register is 404, and `/`, `/Privacy`, `/profile`, `/files`, `/messages`, `/passwords`, and `/ai` redirect to sign-in. The sign-in page shows McWut, and the title is Sign in - McWut. It does not show a privacy link, an invitation sentence, or a toy password. Sign-in with the production password was not tried. This build adds no database migration.

Rollback, if the new site is wrong and you want the previous one:

```powershell
az containerapp revision activate --name ca-mcwut --resource-group McWutStorage --revision ca-mcwut--0000021
az containerapp ingress traffic set --name ca-mcwut --resource-group McWutStorage --revision-weight ca-mcwut--0000021=100
```

**16 October 2026, 16:09 UTC.** Production was moved on purpose to private member-to-member Messages.

| | Revision | Image |
|---|---|---|
| Previous (rollback) | `ca-mcwut--0000020` | `ghcr.io/mcwut-src/mcwut_webapp:5223a861b89ecff785f1e34d4a02520ce73ef788` |
| Live | `ca-mcwut--0000021` | `ghcr.io/mcwut-src/mcwut_webapp:b8093471aea98fc6aed6910afb1a71528cc9fd6b` |

`0000021` has 100% of the traffic and is Healthy. `0000020` is the previous revision and can be brought back. The new revision’s startup log says it is listening. It does not say `Database migrate and identity seed finished.`

Checked while signed out, on `0000021`: both hosts `/health` return `ok`, Register is 404, and `/`, `/Privacy`, `/profile`, `/files`, and `/messages` redirect to sign-in. The sign-in page shows McWut, and the title is Sign in - McWut. It does not show a privacy link, an invitation sentence, or a toy password. Sign-in with the production password was not tried. This build adds the `AddDirectMessages` migration. Startup did not apply it. The first request that needs the database will.

Rollback, if the new site is wrong and you want the previous one:

```powershell
az containerapp revision activate --name ca-mcwut --resource-group McWutStorage --revision ca-mcwut--0000020
az containerapp ingress traffic set --name ca-mcwut --resource-group McWutStorage --revision-weight ca-mcwut--0000020=100
```

**14 October 2026, 02:47 UTC.** Production was moved on purpose to the AI chat. Replies stream, Send can stop them, and Markdown is on unless the person turns it off.

| | Revision | Image |
|---|---|---|
| Previous (rollback) | `ca-mcwut--0000019` | `ghcr.io/mcwut-src/mcwut_webapp:5f3abb564ea61d83921c23ac6812f894bb9f9cff` |
| Live | `ca-mcwut--0000020` | `ghcr.io/mcwut-src/mcwut_webapp:5223a861b89ecff785f1e34d4a02520ce73ef788` |

`0000020` has 100% of the traffic and is Healthy. `0000019` is the previous revision and can be brought back. The new revision’s startup log says it is listening. It does not say `Database migrate and identity seed finished.`

Checked while signed out, on `0000020`: both hosts `/health` return `ok`, Register is 404, and `/`, `/Privacy`, `/profile`, and `/files` redirect to sign-in. The sign-in page shows McWut, and the title is Sign in - McWut. It does not show a privacy link, an invitation sentence, or a toy password. Sign-in with the production password was not tried. This build adds the OpenRouter key table. Startup did not apply it. The first request that needs the database will.

Rollback, if the new site is wrong and you want the previous one:

```powershell
az containerapp revision activate --name ca-mcwut --resource-group McWutStorage --revision ca-mcwut--0000019
az containerapp ingress traffic set --name ca-mcwut --resource-group McWutStorage --revision-weight ca-mcwut--0000019=100
```

**13 October 2026, 22:45 UTC.** Production was moved on purpose so the signed-in bar uses the member’s name and color, and the password vault can download a copy.

| | Revision | Image |
|---|---|---|
| Previous (rollback) | `ca-mcwut--adminpw` | `ghcr.io/mcwut-src/mcwut_webapp:c1323430bef02d089f97fb594424dbb12f852e9a` |
| Live | `ca-mcwut--0000019` | `ghcr.io/mcwut-src/mcwut_webapp:5f3abb564ea61d83921c23ac6812f894bb9f9cff` |

`0000019` has 100% of the traffic and is Healthy. `adminpw` is the previous revision and can be brought back. The new revision’s startup log says it is listening. It does not say `Database migrate and identity seed finished.`

Checked while signed out, on `0000019`: both hosts `/health` return `ok`, Register is 404, and `/`, `/Privacy`, `/profile`, and `/files` redirect to sign-in. The sign-in page shows McWut, and the title is Sign in - McWut. It does not show a privacy link, an invitation sentence, or a toy password. Sign-in with the production password was not tried. This build adds no migration.

Rollback, if the new site is wrong and you want the previous one:

```powershell
az containerapp revision activate --name ca-mcwut --resource-group McWutStorage --revision ca-mcwut--adminpw
az containerapp ingress traffic set --name ca-mcwut --resource-group McWutStorage --revision-weight ca-mcwut--adminpw=100
```

**13 October 2026, 19:20 UTC.** The website admin password was replaced. Deleting `sql-mcwut` had removed the account. `vince@mcwut.com` has a new password, and the Container App secret `website-admin-password` holds that same password. The image did not change. The password is not written here.

| | Revision | Image |
|---|---|---|
| Previous (same image) | `ca-mcwut--0000018` | `ghcr.io/mcwut-src/mcwut_webapp:c1323430bef02d089f97fb594424dbb12f852e9a` |
| Live | `ca-mcwut--adminpw` | `ghcr.io/mcwut-src/mcwut_webapp:c1323430bef02d089f97fb594424dbb12f852e9a` |

`adminpw` has 100% of the traffic and is Healthy. `0000018` is inactive and is the same image. Sign-in for `vince@mcwut.com` with the new password reached the home page. The earlier code rollback is still `0000017`.

**13 October 2026, 19:02 UTC.** Production was moved on purpose to member sharing and stories.

| | Revision | Image |
|---|---|---|
| Previous (rollback) | `ca-mcwut--0000017` | `ghcr.io/mcwut-src/mcwut_webapp:31b6fc8f1d303bcede51f5c6ee5ec5414e0313cb` |
| Live | `ca-mcwut--0000018` | `ghcr.io/mcwut-src/mcwut_webapp:c1323430bef02d089f97fb594424dbb12f852e9a` |

At that time, `0000018` had 100% of the traffic and was Healthy. `0000017` is inactive, stopped, and can be brought back. The new revision’s startup log says it is listening. It does not say `Database migrate and identity seed finished.`

Checked while signed out, on `0000018`: both hosts `/health` return `ok`, Register is 404, and `/`, `/Privacy`, `/profile`, and `/files` redirect to sign-in. The sign-in page shows McWut, email, password, and Remember me. It does not show a privacy link, an invitation sentence, or a toy password. Sign-in with the production password was not tried. This build adds the `AddStory` migration. That migration runs on the first request that needs the database, and only if `sql-mcwut` already exists. These checks did not make that request.

Rollback, if the new site is wrong and you want the previous one:

```powershell
az containerapp revision activate --name ca-mcwut --resource-group McWutStorage --revision ca-mcwut--0000017
az containerapp ingress traffic set --name ca-mcwut --resource-group McWutStorage --revision-weight ca-mcwut--0000017=100
```

**13 October 2026, 13:47 UTC.** Production was moved on purpose so a cold start does not open or create Azure SQL.

| | Revision | Image |
|---|---|---|
| Previous (rollback) | `ca-mcwut--0000016` | `ghcr.io/mcwut-src/mcwut_webapp:97a406eaae8fbaeaec862fe022bf0bf8753112b5` |
| Live | `ca-mcwut--0000017` | `ghcr.io/mcwut-src/mcwut_webapp:31b6fc8f1d303bcede51f5c6ee5ec5414e0313cb` |

At that time, `0000017` had 100% of the traffic and was Healthy. `0000016` is inactive, has no replicas, and can be brought back. The new revision’s startup log says it is listening. It does not say `Database migrate and identity seed finished.`

Checked while signed out, on `0000017`: both hosts `/health` return `ok`, Register is 404, and `/`, `/Privacy`, `/profile`, and `/files` redirect to sign-in. The sign-in page shows McWut, email, password, and Remember me. It does not show a privacy link, an invitation sentence, or a toy password. Sign-in with the production password was not tried.

Vince created `sql-mcwut` again at 13:22 UTC, before this revision, as serverless General Purpose Gen5, minimum 0.5 vCore, auto-pause 20 minutes. This publish did not create it.

Rollback, if the new site is wrong and you want the previous one:

```powershell
az containerapp revision activate --name ca-mcwut --resource-group McWutStorage --revision ca-mcwut--0000016
az containerapp ingress traffic set --name ca-mcwut --resource-group McWutStorage --revision-weight ca-mcwut--0000016=100
```

**9 October 2026, 13:00 UTC.** Production was moved on purpose to the server-rendered Markdown reader and Mermaid diagrams.

| | Revision | Image |
|---|---|---|
| Previous (rollback) | `ca-mcwut--0000015` | `ghcr.io/mcwut-src/mcwut_webapp:849b4934fca968afea4a80e634f226dac9086b6e` |
| Live | `ca-mcwut--0000016` | `ghcr.io/mcwut-src/mcwut_webapp:97a406eaae8fbaeaec862fe022bf0bf8753112b5` |

At that time, `0000016` had 100% of the traffic and was Healthy. `0000015` was the previous build, the signed-in home, Profile, and color picker.

Checked while signed out, on `0000016`: both hosts `/health` return `ok`, Register is 404, and `/`, `/Privacy`, `/profile`, and `/files` redirect to sign-in. The sign-in page shows McWut, email, password, and Remember me. It does not show a privacy link, an invitation sentence, or a toy password. `/favicon.svg` is the house mark. SQL was paused (error 40613) and the app retried. Startup logged `Database migrate and identity seed finished.` at 13:00 UTC. This build adds no migration. Sign in and open a Markdown note to see a Mermaid diagram.

Rollback, if the new site is wrong and you want the previous one:

```powershell
az containerapp ingress traffic set --name ca-mcwut --resource-group McWutStorage --revision-weight ca-mcwut--0000015=100
```

Do not delete the SQL server or the storage account. A later docs-only commit does not change the live image. Azure is pinned to `2912aa3ca2baf08a86201465d5f904d9cac24d3e`.
