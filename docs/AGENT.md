# Guidelines for a future agent

**Written:** 7 October 2026  
**Read with:** [HANDOFF.md](HANDOFF.md), [SCOPE.md](SCOPE.md)  
**Repo:** https://github.com/McWut-src/McWut_WebApp (`main`)  
**Folder:** `C:\vince\McWutWebApp`

`docs/archive/AGENT.md` is the old brief from before the site existed. Leave that file alone. The product below is already built.

Vince owns McWut. The product name on screen is **McWut**. Keep the project names `McWutWebApp` and `FamilyVault.*`.

## What is live

Trust the promotion table in [HANDOFF.md](HANDOFF.md), then confirm with Azure before you change anything. As this note was written:

| | Revision | Image |
|---|---|---|
| Live | `ca-mcwut--0000012` | `ghcr.io/mcwut-src/mcwut_webapp:602fe0ea49b4c290bb711dec97a4afb4826608da` |
| Rollback | `ca-mcwut--0000011` | `ghcr.io/mcwut-src/mcwut_webapp:5d9b9d0783f272e28101127fe089745444c7a2fb` |

Commit `602fe0e` is the shortener (“Add a short link for any web address.”). Commits after that SHA, including handoff notes, are documentation. They are not the Azure image.

`git push` of `main` builds `ghcr.io/mcwut-src/mcwut_webapp:<full SHA>` and moves the tag `:qa` to that commit. It does not change https://mcwut.com. Do not point Azure at `:qa` or `:latest`. Pin the full feature SHA.

Promote only when Vince asks to publish or promote. A docs request, including “push when done”, is a git push. After a real promote, record the new revision in the HANDOFF promotion log, commit that note, and push it. Leave Azure on the feature SHA.

Rollback of the image above:

```powershell
az containerapp ingress traffic set --name ca-mcwut --resource-group McWutStorage --revision-weight ca-mcwut--0000011=100
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

Wait until the new revision is Healthy and has the traffic. Signed-out checks: both hosts `/health` return `ok`, Register is 404, `/files` redirects to sign-in. Read the startup log for `Database migrate and identity seed finished.` SQL serverless can pause (errors 40613 and 42119). The app already retries. Do not add `EnableRetryOnFailure` unless Vince asks.

## Product decisions to keep

- Open Register stays 404. People join from an admin invite at `/join/{token}`.
- Dev and Docker QA: `vince@mcwut.com` / `vince` (admin) and `member@mcwut.com` / `member`. Production does not seed `member@`. Production sign-in for `vince@mcwut.com` is the Azure secret `website-admin-password`.
- Two primary places: **My files** (`/files`) and **Vault** (`/passwords`, page title “Password vault”). Do not add a Shared files nav item or a Tag a member control. `/files/shared` and `/Vault/Shared` redirect to My files. Grant APIs and tables stay unused. A later design is in [LATER-MEMBER-SHARING.md](LATER-MEMBER-SHARING.md).
- Do not invent folders or vault categories.
- File share links are public `/s/` plus eight letters or digits. Older longer file links still open. Invite tokens stay long.
- **Shorten a link** on My files stores a public web address. Opening that `/s/` token redirects (302) to the address. A file token still shows the file page. The same eight-character space is shared. `ShortTokenAllocator` checks both tables. Short links stay until the owner deletes them. There is no keep-for time and no click count.
- If the pasted address has no scheme, store `https://`. Accept only `http` and `https`. Reject `javascript:`, `data:`, `file:`, userinfo, `localhost`, `*.local`, and private or loopback addresses. Rules live in `ShortLinkRules`.
- Photos are jpeg, png, gif, and webp. The thumbnail is the photo itself, scaled with CSS. Do not generate thumbnail files. The viewer uses `/api/files/{id}/content?preview=true` and that open does not count as a download. SVG and HTML stay downloads.
- Notes, `.txt`, `.csv`, `.json`, and `.md` can be read on My files and on the file share page. Markdown is rendered in the page. That open does not count as a download.
- Password vault fields are name, username, password, url, and information. Search is in the browser and skips the password. Values are encrypted at rest with ASP.NET Data Protection, purpose `McWut.PasswordVault.v1`.
- UI is Bootstrap 5 plus `wwwroot/css/site.css`. Do not add a UI library. Icons are inline stroke SVGs through `window.mcwutIcon` in `wwwroot/js/icons.js`. Use `title` and `aria-label`. Do not set `textContent` on an icon button. That removes the SVG.
- White page, navy bar (`#0b1f3a`), small blue accents. The nav label for the password vault is **Vault**.

## Where new work goes

| Change | Place |
|---|---|
| My files screen | `Pages/Vault/` served at `/files` |
| Shorten form and list | `Pages/Vault/Index.cshtml`, `wwwroot/js/vault.js`, `wwwroot/css/site.css` |
| Public `/s/{token}` | `Pages/Share/Index.cshtml.cs`. Resolve a short link before the file link. `Redirect` the stored address. |
| Short-link API | `Controllers/ShortLinksController.cs` at `/api/short-links`. File-link revoke stays `DELETE /api/links/{token}`. |
| Rules and table | `src/FamilyVault.Files` |
| Password vault UI | `Pages/Passwords/`, `wwwroot/js/passwords.js` |
| Admin | `Pages/Admin/` |

Migrations: generate them. Do not hand-edit a Designer or a snapshot. The startup project must be the Files project. SQLite and SQL Server each have a folder.

```powershell
dotnet ef migrations add Name --context SqliteApplicationDbContext --output-dir Data/Migrations --project src\FamilyVault.Files\FamilyVault.Files.csproj --startup-project src\FamilyVault.Files\FamilyVault.Files.csproj
dotnet ef migrations add Name --context SqlServerApplicationDbContext --output-dir Data/Migrations/SqlServer --project src\FamilyVault.Files\FamilyVault.Files.csproj --startup-project src\FamilyVault.Files\FamilyVault.Files.csproj
```

SQLite cannot `ORDER BY` a `DateTimeOffset`. Load the rows, then sort in memory. `FileLibrary` and `ShortLinkService` already do this.

The app listens on port 8080 before it migrates, in `Hosting/DatabaseStartupWorker.cs`, so `/health` can be Healthy while SQL is still waking.

## This PC

Dev: `dotnet run --launch-profile https --project McWutWebApp.csproj` → https://localhost:7047. Data is `App_Data\mcwut.db` and `App_Data\vault`.

A headless check can use `ASPNETCORE_ENVIRONMENT=Development` and `ASPNETCORE_URLS=http://127.0.0.1:5151`. HTTP on that URL skips the HTTPS redirect. Stop that process before another one uses the port. SQLite is locked while the app is running.

QA: `docker compose up --build` → http://localhost:8080. That volume is not `App_Data` and not Azure.

PowerShell 5.1: chain commands with `;`. `curl` is an alias of `Invoke-WebRequest`, so call `curl.exe`. Quote the `-w` format. `Invoke-WebRequest` throws on 302 and 404. `curl.exe -L` after a login POST sends the POST again. Do not assign `$PID` or `$HOME`.

There are no browser tools in the agent session. For a UI change, drive Edge headless with a fresh user-data directory and the DevTools websocket. Sign in with `fetch` to `/Identity/Account/Login`. Set the viewport to 1280×900 and again to 390×844. Wrap `Runtime.evaluate` in a function. Delete temp scripts that contain the toy password.

## Azure, leave it standing

- Subscription **McWut** `28c232c7-c74d-47a1-9fe2-e290de1e6b47`, user `vincelp@hotmail.com`.
- Group **McWutStorage** (Canada Central): Container App `ca-mcwut`, environment `cae-mcwut`, storage account `mcwutstorage`. Scale min 0, max 1, target port 8080.
- Group **McWut_dbResourceGroup**: SQL server `mcwut`, database `sql-mcwut`. Serverless. It may pause.
- DNS is at Namecheap. `www` is a CNAME to the container name. The apex A record is `4.172.131.145`. Do not edit DNS unless Vince asks.
- Do not delete or recreate Azure SQL or the storage account.

## Do not

- Put a production connection string in `appsettings.json`, `docker-compose.yml`, or git.
- Turn on `Identity:AllowRegistration`.
- Bring back Tag a member or a Shared files destination.
- Treat the latest commit on `main` as the live image.
- Commit `grokSessionExport.md`.
- Rewrite `docs/archive/`.
