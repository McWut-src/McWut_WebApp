# Guidelines for a future agent

**Written:** 9 October 2026  
**Read with:** [HANDOFF.md](HANDOFF.md), [SCOPE.md](SCOPE.md)  
**Repo:** https://github.com/McWut-src/McWut_WebApp (`main`)  
**Folder:** `C:\vince\McWutWebApp`

`docs/archive/AGENT.md` is the old brief from before the site existed. Leave that file alone. The product below is already built.

Vince owns McWut. Signed-out pages, the sign-in form, public `/s/` pages, and `/join/` say **McWut**. Signed-in pages use that person’s name, or the part of the email before `@` when the name is empty or contains `@`. Keep the project names `McWutWebApp` and `FamilyVault.*`.

## What is live

Trust the promotion table in [HANDOFF.md](HANDOFF.md), then confirm with Azure before you change anything. As this note was written:

| | Revision | Image |
|---|---|---|
| Live | `ca-mcwut--0000025` | `ghcr.io/mcwut-src/mcwut_webapp:c57488b7218611efa85469753704689798efd067` |
| Rollback | `ca-mcwut--0000024` | `ghcr.io/mcwut-src/mcwut_webapp:81e006e93793ea90b84173044bdbeef68c00241a` |

`ca-mcwut--0000023` (`808a8b866988196ac17211297f3b53ef2254573b`), `ca-mcwut--0000022` (`2912aa3ca2baf08a86201465d5f904d9cac24d3e`), `ca-mcwut--0000021` (`b8093471aea98fc6aed6910afb1a71528cc9fd6b`), `ca-mcwut--0000020` (`5223a861b89ecff785f1e34d4a02520ce73ef788`), `ca-mcwut--0000019` (`5f3abb564ea61d83921c23ac6812f894bb9f9cff`), and `ca-mcwut--adminpw` (`c1323430bef02d089f97fb594424dbb12f852e9a`) are older rollbacks. `0000018` is that same image, stopped. The password is not in git.

Commit `c57488b` adds support for reading and editing code and configuration files in My files with dedicated code icon and monospace font. Commit `81e006e` adds password vault read-only member sharing, bare domain support (e.g. `facebook.com`), site favicons with lock fallback, and a standalone password generator card. Commit `808a8b8` adds voice memo recording, download limits / burn-after-reading, Ask AI in note/story reader, password health checks & generator, message browser notifications, and PWA manifest. Commit `2912aa3` adds password vault JSON import, in-place note and story editing, inline audio/video playback, message search & clickable links, and the AI paid models toggle. Commit `b809347` adds private member-to-member Messages. Commit `5223a86` adds the AI chat. Commit `5f3abb5` shows the member’s name and color on the signed-in bar, and downloads a vault copy. Commit `c132343` shares a file or a story with a member and lists stories on My files. Commit `31b6fc8` stops a cold start from opening or creating Azure SQL. A docs commit after `c57488b` is not the Azure image.

`git push` of `main` builds `ghcr.io/mcwut-src/mcwut_webapp:<full SHA>` and moves the tag `:qa` to that commit. It does not change https://mcwut.com. Do not point Azure at `:qa` or `:latest`. Pin the full feature SHA.

Promote only when Vince asks to publish or promote. A docs request, including “push when done”, is a git push. After a real promote, record the new revision in the HANDOFF promotion log, commit that note, and push it. Leave Azure on the feature SHA.

Rollback of the image above:

```powershell
az containerapp revision activate --name ca-mcwut --resource-group McWutStorage --revision ca-mcwut--0000024
az containerapp ingress traffic set --name ca-mcwut --resource-group McWutStorage --revision-weight ca-mcwut--0000024=100
```

## How Vince wants changes shipped

1. Change the smallest thing that does the job. Match the surrounding code.
2. `dotnet test tests\FamilyVault.Files.Tests\FamilyVault.Files.Tests.csproj`
3. Click through a web change in a browser before calling it done. There is no browser test project.
4. Commit and push when he asks. Leave `grokSessionExport.md` untracked. It is a chat dump.
5. Promote only when he asks, using the feature commit’s full SHA:

```powershell
az account set --subscription 28c232c7-c74d-47a1-9fe2-e290de1e6b47
az containerapp update --name ca-mcwut --resource-group McWutStorage --image ghcr.io/mcwut-src/mcwut_webapp:FULL_SHA
```

Leave the secrets `sql-connection`, `storage-connection`, and `website-admin-password` in place. Limit `az` output with `--query`. Do not print connection strings, the prod password, or password hashes.

Wait until the new revision is Healthy and has the traffic. Signed-out checks: both hosts `/health` return `ok`, Register is 404, `/files` redirects to sign-in. A cold start does not open Azure SQL, and it does not create a missing database. Migrate and identity seed run on the first request that needs the database, and only if `sql-mcwut` already exists. That log line is `Database migrate and identity seed finished.` SQL serverless can pause (errors 40613 and 42119). The app retries those errors on that request. Do not add `EnableRetryOnFailure` unless Vince asks.

## Product decisions to keep

- Open Register stays 404. People join from an admin invite at `/join/{token}`.
- Dev and Docker QA: `vince@mcwut.com` / `vince` (admin) and `member@mcwut.com` / `member`. Production does not seed `member@`. Production sign-in for `vince@mcwut.com` is the Azure secret `website-admin-password`.
- Signed-out visitors get the sign-in form. `/` and `/Privacy` require a sign-in. Do not put a privacy link, an invitation sentence, or the dev passwords on that screen. Public `/s/{token}` and `/join/{token}` stay reachable without an account. `/health` stays anonymous.
- Signed-in home (`/`) is a dashboard with six places, in this order: **My files** (`/files`), **Vault** (`/passwords`, page title “Password vault”), **URLs** (`/urls`), **Messages** (`/messages`), **AI** (`/ai`), and **Profile** (`/profile`). Do not add a Home nav item. The brand goes back to the dashboard. Do not add a Shared files nav item or a control labeled Tag a member. `/files/shared` and `/Vault/Shared` redirect to My files. A people icon titled “Share with a member” on a file row, a photo card, a story, and the photo, note, and story readers shares that file or story with another signed-in member. The owner keeps the file. The other person can open and download it only. Their name shows as a pill in their profile color (`AccentColor`, or navy `#0b1f3a`). If they have not chosen a name, the pill and the menu use the part of their email before `@`, not the full address. When someone has shared a file with you, My files shows a **From others** group, and only when that list is not empty. The URLs page lists those member shares with the same color pill, no public address, Quick open, and Remove share. The permission stored for that menu is always Download. Details are in [LATER-MEMBER-SHARING.md](LATER-MEMBER-SHARING.md).
- **Profile** stores a display name (not an email), a color they pick, the person’s own sign-in password change, and their OpenRouter key for AI. Light or dark is `localStorage` key `mcwut-theme` on this browser only. It is not a database column. The color is any `#rrggbb` value. It paints the signed-in bar and menu. A pale color (luminance above 160) uses navy text `#0b1f3a`. A darker color uses white text. The same color marks that person on a member share. It is not shown on a public link or on `/join/`. `/account/password` redirects to Profile. Admin reset password stays at `/admin/reset-password`. `FamilyRoster.UpsertAsync` must not replace a chosen display name, and must not clear `AccentColor`. It may fill a blank name.
- The signed-in brand in the header is that person’s name, and it links back to the dashboard. The desktop menu and the phone menu use the same color. Public `/s/` and `/join/` keep the navy McWut bar even when the visitor is signed in.
- The desktop sidebar collapses to icons. The choice is `localStorage` key `mcwut-nav` (`icons` or `names`) and the class `is-rail` on `<html>`. Scope that CSS to `.sidebar` so the phone menu stays labeled.
- Do not invent folders. A saved chat is a section on My files, not a folder.
- **Save** on My files stores a private file and keeps it forever. It does not create a share link. **Options** can keep the file for 1, 7, or 30 days, and can set a password. That password is asked for when someone opens a share link. The signed-in owner still opens the file. The composer field is **Story**. Words on their own are still a text file, and with no title they are saved as `note`. Words saved with one or more files become one story. My files lists stories in a **Stories** section, then **Chats** when any chat has been saved, then Photos, then Files. The files in a story are not listed again as loose photos or files. Sharing a story uses the same people icon and shares the whole story. The other person can read and download it only. The link icon still creates a public link, and that link still lasts 7 days because the request omits a keep time. A saved chat is one file of type `text/x-mcwut-chat`. It is read as Markdown. Its row has the same link icon, so the public link shows on URLs.
- File share links are public `/s/` plus eight letters or digits. Older longer file links still open. Invite tokens stay long.
- **URLs** is where **Shorten a link** lives, and where the signed-in person sees every public link they have made. That list is shortened web addresses plus share links from My files (a file or a whole upload). Each row can be viewed, opened, or deleted. Deleting a file share link revokes it and leaves the file in My files. The same list includes a file shared with a member: the row has their color pill, no public address, Quick open back to `/files#file={id}`, and Remove share. Removing that share leaves the file in My files. Opening a shortened `/s/` token redirects (302) to the stored address. A file token still shows the file page. The same eight-character space is shared. `ShortTokenAllocator` checks both tables. Short links stay until the owner deletes them. There is no keep-for time and no click count. The share-link list is `GET /api/links` from `ShareLinkService.ListOwnedAsync`. Member shares are `GET /api/member-shares`. Revoked links are omitted. Expired ones stay so they can be deleted. SQLite still cannot `ORDER BY` a `DateTimeOffset`; sort after the load.
- If the pasted address has no scheme, store `https://`. Accept only `http` and `https`. Reject `javascript:`, `data:`, `file:`, userinfo, `localhost`, `*.local`, and private or loopback addresses. Rules live in `ShortLinkRules`.
- Photos are jpeg, png, gif, and webp. The thumbnail is the photo itself, scaled with CSS. Do not generate thumbnail files. Audio and video (mp4, webm, mov, mp3, m4a, wav, ogg) play inline on My files, inside stories, and on the share page. The viewer uses `/api/files/{id}/content?preview=true` (`Accept-Ranges: bytes`) and that open does not count as a download. SVG and HTML stay downloads.
- Notes, `.txt`, `.csv`, `.json`, and `.md` can be read on My files and on the file share page, and the owner can edit a note (`PUT /api/files/{id}/text`) or a story (`PUT /api/stories/{id}`) in place while keeping its share link. Markdown is rendered on the server with Markdig. A Mermaid diagram in the note, including a Gantt chart or a mindmap, is drawn in the browser. Raw HTML in a note stays text. Links and images are kept only for http and https. That open does not count as a download.
- Password vault fields are name, username, password, url, and information. Search is in the browser and skips the password. Values are encrypted at rest with ASP.NET Data Protection, purpose `McWut.PasswordVault.v1`. **Download copy** is `GET /api/passwords/export`. The file name is the shown name plus `.json`. The file is plaintext JSON of that person’s logins and is not stored again. **Import copy** is `POST /api/passwords/import` and skips exact duplicates.
- **Messages** (`/messages`) is a private note between two members. **New** picks another member. The same pair always opens the same conversation. A person cannot message themselves. Only the two of them can read it. An admin does not get a view of other people’s messages. The text is stored as written, up to 2000 characters, and the page draws it with safe DOM text nodes while turning `http(s)://`, `/s/…`, and `/files#…` links into clickable anchors. Conversation search filters threads by member or preview. The list shows the other person’s name and profile color. A missing name uses the part of the email before `@`. A missing color is navy `#0b1f3a`. Unread is a count on that row and on the Messages item in the menu. Opening the thread marks the messages you can see as read. The page asks again every few seconds while it is open. It does not poll on other pages. The menu count is read when a signed-in page loads, which already uses the database. `GET /api/messages` lists conversations. `POST /api/messages` opens one (`userId`). `GET /api/messages/{id}` reads the latest 200, with `?before=` for earlier and `?after=` for newer. `POST /api/messages/{id}` sends. `POST /api/messages/{id}/read` marks read through a message id. SQLite still cannot `ORDER BY` a `DateTimeOffset`; the conversation list is sorted after the load. Message order uses a number, `Sequence`.
- **AI** (`/ai`) is one person’s chat. The OpenRouter key is saved on Profile, not on the chat page. It is encrypted with ASP.NET Data Protection, purpose `McWut.OpenRouter.v1`. The full key is never sent back to the browser. With no key, or when OpenRouter rejects the saved key, `/ai` shows how to create an account at https://openrouter.ai/ and a key at https://openrouter.ai/settings/keys, and the chat box stays off. A working key shows the chat. By default the list is models whose prices are zero, with context length and a short note when OpenRouter sends them; **Paid models** (`localStorage` key `mcwut-ai-paid`, `GET /api/ai/models?paid=true`) includes paid models when checked. A send streams the reply. The page stays usable, a reply bubble says Waiting… until the first words, and Send becomes Stop. **Markdown** is on by default (`localStorage` key `mcwut-ai-md`, value `0` when off). On asks the model for Markdown this page can draw: headings, paragraphs, bold, italic, strikethrough, lists, task lists, pipe tables, fenced code, bare http(s) links, and a mermaid block (flowchart, sequence, gantt, mindmap). That instruction is not stored in the saved chat. A Markdown reply, or any reply that already looks like Markdown, is drawn with the note viewer (`MarkdownHtml`, then Mermaid). Plain text stays plain. Messages stay in the browser until the person chooses **Save**. That writes one file into Chats. **Copy link** uses the same public file link as My files, so it appears on URLs. Opening the page reads the saved key once. Later messages reuse that key in memory until the app stops, so a chat does not keep waking SQL. Saving a chat does. Do not put an OpenRouter key in git, appsettings, or a chat. A key pasted in a chat is already public. Do not store it or call OpenRouter with it.
- UI is Bootstrap 5 plus `wwwroot/css/site.css`. Do not add a UI library. Icons are inline stroke SVGs through `window.mcwutIcon` in `wwwroot/js/icons.js`. Use `title` and `aria-label`. Do not set `textContent` on an icon button. That removes the SVG.
- Signed-out and public pages are a white page and a navy bar (`#0b1f3a`). Signed-in pages use the person’s color on the bar and menu, with ink chosen for contrast. Light or dark is optional and stays in the browser. Small blue accents. The nav label for the password vault is **Vault**.

## Where new work goes

| Change | Place |
|---|---|
| Home dashboard | `Pages/Index.cshtml` at `/` |
| My files screen | `Pages/Vault/` served at `/files` |
| Markdown reader | `src/FamilyVault.Files/Security/MarkdownHtml.cs`, `wwwroot/js/reader.js`, Mermaid at `wwwroot/lib/mermaid/12.1.0/mermaid.min.js`. My files asks `GET /api/files/{id}/html`. |
| Profile | `Pages/Profile/` at `/profile`. Name, color, light or dark, own sign-in password, OpenRouter key. |
| URLs screen | `Pages/Urls/` served at `/urls`, `wwwroot/js/urls.js` |
| Shorten form and public-link list | `Pages/Urls/Index.cshtml`, `wwwroot/js/urls.js`, `wwwroot/css/site.css` |
| Public `/s/{token}` | `Pages/Share/Index.cshtml.cs`. Resolve a short link before the file link. `Redirect` the stored address. |
| Short-link API | `Controllers/ShortLinksController.cs` at `/api/short-links`. File and drop share list is `GET /api/links`. Revoke stays `DELETE /api/links/{token}`. |
| Rules and table | `src/FamilyVault.Files` |
| Password vault UI | `Pages/Passwords/`, `wwwroot/js/passwords.js` |
| Messages | `Pages/Messages/` at `/messages`, `wwwroot/js/messages.js`, `Controllers/MessagesController.cs`. Rules are `DirectMessageRules`. The service is `DirectMessageService`. |
| AI | `Pages/Ai/` at `/ai`, `wwwroot/js/ai.js`. The key form is `wwwroot/js/ai-key.js` on Profile. `Controllers/AiController.cs`. Key rules are `OpenRouterRules` in `src/FamilyVault.Files`. |
| Admin | `Pages/Admin/` |

Migrations: generate them. Do not hand-edit a Designer or a snapshot. The startup project must be the Files project. SQLite and SQL Server each have a folder.

```powershell
dotnet ef migrations add Name --context SqliteApplicationDbContext --output-dir Data/Migrations --project src\FamilyVault.Files\FamilyVault.Files.csproj --startup-project src\FamilyVault.Files\FamilyVault.Files.csproj
dotnet ef migrations add Name --context SqlServerApplicationDbContext --output-dir Data/Migrations/SqlServer --project src\FamilyVault.Files\FamilyVault.Files.csproj --startup-project src\FamilyVault.Files\FamilyVault.Files.csproj
```

SQLite cannot `ORDER BY` a `DateTimeOffset`. Load the rows, then sort in memory. `FileLibrary`, `ShortLinkService`, and `ShareLinkService.ListOwnedAsync` already do this.

The app listens on port 8080 without opening Azure SQL. `/health` and the sign-in form do not query it. `DatabaseStartupWorker` migrates SQLite for Dev and Docker. Production uses `SqlServerDatabaseGate`.

## This PC

Dev: `dotnet run --launch-profile https --project McWutWebApp.csproj` → https://localhost:7047. Data is `App_Data\mcwut.db` and `App_Data\vault`.

A headless check can use `ASPNETCORE_ENVIRONMENT=Development` and `ASPNETCORE_URLS=http://127.0.0.1:5151`. HTTP on that URL skips the HTTPS redirect. Stop that process before another one uses the port. SQLite is locked while the app is running.

QA: `docker compose up --build` → http://localhost:8080. That volume is not `App_Data` and not Azure.

PowerShell 5.1: chain commands with `;`. `curl` is an alias of `Invoke-WebRequest`, so call `curl.exe`. Quote the `-w` format. `Invoke-WebRequest` throws on 302 and 404. `curl.exe -L` after a login POST sends the POST again. Do not assign `$PID` or `$HOME`.

There are no browser tools in the agent session. For a UI change, drive Edge headless with a fresh user-data directory and the DevTools websocket. Sign in with `fetch` to `/Identity/Account/Login`. Set the viewport to 1280×900 and again to 390×844. Wrap `Runtime.evaluate` in a function. Delete temp scripts that contain the toy password.

## Azure, leave it standing

- Subscription **McWut** `28c232c7-c74d-47a1-9fe2-e290de1e6b47`, user `vincelp@hotmail.com`.
- Group **McWutStorage** (Canada Central): Container App `ca-mcwut`, environment `cae-mcwut`, storage account `mcwutstorage`. Scale min 0, max 1, target port 8080.
- Group **McWut_dbResourceGroup**: SQL server `mcwut`, database `sql-mcwut`. Serverless. It may pause. Do not create it with a plain `CREATE DATABASE`. That becomes provisioned General Purpose, 2 vCores, and it cannot pause.
- DNS is at Namecheap. `www` is a CNAME to the container name. The apex A record is `4.172.131.145`. Do not edit DNS unless Vince asks.
- Do not delete or recreate Azure SQL or the storage account.

## Do not

- Put a production connection string in `appsettings.json`, `docker-compose.yml`, or git.
- Turn on `Identity:AllowRegistration`.
- Bring back a Shared files destination or a control labeled Tag a member. The people icon on My files is the member share. Leave it.
- Treat the latest commit on `main` as the live image.
- Commit `grokSessionExport.md`.
- Rewrite `docs/archive/`.
