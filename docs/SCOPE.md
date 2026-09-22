# McWut — global project scope

**Site name:** McWut  
**Public domain:** [mcwut.com](https://mcwut.com) (you already own it)  
**Code folder:** `C:\vince\McWutWebApp`  
**Owner / only admin:** Vince (`vince@mcwut.com`)  
**Updated:** 21 September 2026  

This file is the **product and hosting map**. It is allowed to mix “now”, “next”, and “later”. It is not a sprint list.

Related docs (this folder):

- [STATUS.md](STATUS.md) — what already works on the PC / Docker  
- [DEPLOY.md](DEPLOY.md) — how to host (options A–E, prices, how-to)  
- [PATH-A.md](PATH-A.md) — You vs Me checklist to put McWut on Azure (SQL free tier already created)  
- [AGENT.md](AGENT.md) — original file-vault engineering brief  
- [../README.md](../README.md) — how to run the app  

---

## 1. What McWut is

A **small family website** for people you invite, not the public internet.

Members can:

- Keep **their own files** (Google Drive–style library + WeTransfer-style “drop a file, get a link”)
- See **files others shared with them** (read-only)
- Keep **text snippets** (a pastebin: private or shared with family)
- Open a **time-limited link** on another machine without logging in (optional password)

Vince can **administer users** and glance at **health** of the box. Nobody else needs that screen.

**Not a goal:** Google Drive clone with folders, a company intranet, or a product for thousands of customers.

---

## 2. Scale and honesty about use

| Assumption | Decision it drives |
|---|---|
| **At most ~30 users over years** | No Kubernetes, no multi-region, no fancy CDN unless photos get huge |
| **Not sure everyone will use it** | Stay cheap. Prefer a sleeping or a $5–15 box over always-on expensive Azure |
| **Family, not enterprise customers** | Simple login is fine. Tighten Register before the domain is public |
| **You are willing to sysadmin Linux** | Path **D** (one VM + Docker) is a valid first production |
| **You want it to look professional later** | Path **A** (Azure Container Apps + SQL + Blob) is the long-term shape |

Do not over-build for 30 people who might not show up. Do leave a door open to Path A so we are not trapped on one VM forever.

---

## 3. Hosting strategy

**Chosen production path: A** (Azure Container Apps + Azure SQL + Blob).  
Path D (Linux VPS in Canada, ~C$140/year) was priced and dropped.

| Piece | Status |
|---|---|
| Azure SQL server + database | **Created** (free tier) |
| Blob storage, Container App, DNS | Not yet — [PATH-A.md](PATH-A.md) |
| Code: SQL provider + Blob project | Not yet — still SQLite + disk locally |

Keep local/dev on SQLite + disk. Production settings via environment variables so Path A is config, not a rewrite.

**Code still required before A is real**

1. SQL Server EF provider (SQLite stays for the PC)  
2. `FamilyVault.Files.Azure` (Blob)  
3. Migration strategy for SQL Server — see section 7  

**Docker:** you have little production Docker experience. Path A still uses Docker (build + push an image). Keep it to **one web image**, HTTP 8080, Azure in front for HTTPS. No Swarm, no Kubernetes.

Public URL: **`https://mcwut.com`**. SQL is **Canada East**; storage is **Canada Central**. Details: [PATH-A.md](PATH-A.md).

---

## 4. Signed-in home (dashboard)

After login, the **main menu** should feel like McWut, not “Vault vs Privacy”.

### 4.1 My files

**Working title:** My files  
(Alternatives if we rename later: *My drive*, *My drops*, *Library*.)

This is **your** stuff, mix of:

- Google Drive–like: list of files you own, expiry, download counts, delete, tag a family member  
- WeTransfer-like: drag-and-drop, get a link, optional password, optional TTL (7 days default, or forever)

**Today:** this is mostly `/Vault` already. Scope is to **rename, layout, and make it the home dashboard**, not invent a second product.

Owner can still create share links. Tagging a member puts a **read-only** copy on their Shared files.

### 4.2 Shared files

**Working title:** Shared with me  
(Alternatives: *Shared files*, *From family*.)

- Documents **other members** shared with you from **their** My files  
- **Read-only** for v1: preview / download, no delete of the original, no new links unless we say otherwise later  
- No “edit their file”

**Today:** `/Vault/Shared` exists. Scope is to make it a first-class dashboard section with clearer naming.

### 4.3 Pastes (pastebin)

**New.** Not built yet.

A place to **paste text** (notes, addresses, a recipe, a one-time code):

- **Private** — only you  
- **Shared with members** — other signed-in family can read (same idea as file grants)  
- Optional **link** with TTL/password, same spirit as file drops (later if it stays small)

v1 can be tiny: title, body, visibility = me | family, created date. No need for syntax highlighting or 10 MB pastes on day one. Cap size (e.g. 64–256 KB).

---

## 5. Admin (Vince only)

**New** as a real panel. Only your account (Admin role). Family members never see it.

Wanted:

- **Users:** list, create, disable, reset password, maybe invite later  
- **Health:** is the site up, disk/volume free space, last error, “can I write a file?”, database reachable  
- **Whatever else is useful for one operator** (counts of files, expired waiting on sweeper, version of the running image)

Keep it boring. One `/Admin` area, not a second product.

**Today:** users are seeded (`vince`, `family`) and Register is open. There is no admin UI. `/health` returns `ok` on the running Docker.

---

## 6. Files product extras

| Item | Status | Notes |
|---|---|---|
| Drop zone + 7-day link + password | **Done** (local) | Polish naming/layout to match dashboard |
| Tag family member | **Done** | Feeds Shared files |
| Public `/s/{token}` | **Done** | Keep |
| Thumbnails | **Later** | Images (and maybe PDF first page). Generate on upload, store next to the file or in Blob. List views show a small preview instead of a generic icon |
| Folder tree | **Out** unless you change your mind | Brief said no Drive folders in v1 |
| Virus scan, E2E encryption | **Out** for now | Dev/family |

Thumbnails are a **later** slice. Do not block Path D or the dashboard rename on them.

---

## 7. Data and SQL migrations (needed on both D and A)

You asked for a **strategy**. This is the intended one; we implement it when we touch the database for real.

**Principles**

1. **EF Core migrations are the source of truth.** No hand-edited production SQL as the normal path.  
2. **The app applies migrations on startup** (already does `Database.Migrate()`). A new container/version migrates itself.  
3. **Never destructive by surprise.** Prefer add-column / new table. Avoid drop-column until you are sure.  
4. **One migration history table** per database.  
5. **Back up before deploy** on Path D (`sqlite3 .backup` or copy the volume). On Path A, Azure SQL has automated backups.

**Path D (now): SQLite**

- File on a **Docker volume**, not in the image  
- Migrations live in the code (`Data/Migrations`)  
- Deploy = new image + same volume → startup migrates  
- Backup = copy volume or the `.db` file off the VM (cron or you, weekly is enough for 30 users)

**Path A (later): Azure SQL**

- Same entities, **second provider** (SQL Server) like the other McWut app, **or** we standardize on SQL Server even on the VM (Postgres/SQL in compose). To be decided when we leave SQLite.  
- If two providers: **two migration folders**, add both when the model changes (annoying but proven).  
- Connection string only in environment/secrets  

**Rule of thumb:** as long as we are on one SQLite file on D, keep one provider. When we commit to A, add SQL Server and practice migrate on a copy of prod data **once** before cutting DNS.

---

## 8. Identity and admin-only

- Email + password (done). Not Microsoft Entra.  
- Vince = **Admin**.  
- Register: OK on the LAN; **lock or invite-only before mcwut.com is public**.  
- Change default passwords before the internet can see the login form.  
- ~30 users: User Manager in Admin is enough; no SSO required.

---

## 9. Phased scope (so later does not block now)

### Phase 0 — local (mostly done)

Docker on the PC, login, My files drop + link, Shared with me, public token page.

### Phase 1 — make it feel like McWut

- Rename site/nav to **McWut** (drop “McWutWebApp” in the UI)  
- Dashboard: **My files** | **Shared files** | **Pastes**  
- Pastes v1 (private / family)  
- Admin: users + health  
- Point copy and menus at `mcwut.com` when you are ready  

### Phase 2 — first production (Path D)

- One Linux VM, Docker Compose, Caddy/HTTPS, volume + backups  
- You learn Docker here  
- Still SQLite unless we already added SQL  

### Phase 3 — professional hosting (Path A)

- SQL provider + migration dry-run  
- Azure Blob project  
- Container Apps, SQL, Blob, `mcwut.com`  
- Thumbnails fit naturally once Blob/disk layout is stable  

### Phase 4 — nice-to-have

- Thumbnails in lists  
- Invite-only instead of open Register  
- Revoke-link and edit-TTL buttons on every file row  
- Notifications (“you were tagged”) — only if people actually use it  

---

## 10. Out of scope unless you reopen it

- Folder hierarchy / full Drive  
- Microsoft Entra / work-account login  
- End-to-end encryption of file bytes  
- Virus scanning product  
- Mobile native apps  
- More than one admin role model  
- Paying customers, metering, ads  

---

## 11. Decisions log (from your notes, 20 September 2026)

- Site is **McWut**; domain **mcwut.com**.  
- Explore **hosting D** first; **A is the long-term professional target**.  
- You will **sysadmin Linux**; Docker production is a learning goal, keep it simple.  
- **Admin panel** for you only: users, healthchecks, operator bits.  
- Need a **SQL migration strategy** (section 7).  
- **Max ~30 users** over years; **adoption uncertain** → stay cheap.  
- Dashboard: **My files** (Drive + WeTransfer) and **Shared files** (read-only from others).  
- **Pastebin** on the dashboard: private or shareable with members.  
- **Thumbnails** wanted, not the first production blocker.  

When a decision changes, add a line here with the date rather than rewriting history silently.
