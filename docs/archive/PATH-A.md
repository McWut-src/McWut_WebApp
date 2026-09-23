# Path A — from this PC to production on Azure

**Site:** McWut  
**Domain you own:** mcwut.com  
**Path:** Azure Container Apps + Azure SQL + Blob (the “professional” option in [DEPLOY.md](DEPLOY.md))  
**Updated:** 21 September 2026  

Print this page. Tick boxes as we go.

**Resume here:** Production is live on **https://mcwut.com** and **https://www.mcwut.com**. Invite family when you are ready. Dev/QA/prod rules: [SCOPE.md](SCOPE.md) §3.1.

**Legend:** **You** = portal / DNS / secrets. **Me** = code. **Together** = click through the live site.

Related: [DEPLOY.md](DEPLOY.md) · [SCOPE.md](SCOPE.md) · [STATUS.md](STATUS.md)

---

## Tracker (tick these)

### Done

- [x] Chose Path A (not the ~C$140/year Canada VPS)
- [x] First git commit on `main`
- [x] App runs locally (SQLite + disk, login, drop, share link)
- [x] Azure SQL **server** + **database** on **free tier**
  - Host: `mcwut.database.windows.net`
  - Database: `sql-mcwut`
  - SQL admin name: `mcwut-admin` (password in your manager, not git)
  - **Location: Canada East**
  - Resource group: **`McWut_dbResourceGroup`** (group itself is Canada Central)
  - Laptop CS uses **Active Directory Default** — fine on your PC, **not** for Container Apps
- [x] Storage account **`mcwutstorage`** created (account key in your manager, not git)
  - Resource group: **`McWutStorage`**
  - **Location: Canada Central**

### You — still open (can do before Phase 2)

- [x] Regions written down (SQL = Canada East, storage = Canada Central). Both are still in Canada.
- [x] Resource groups written down (`McWut_dbResourceGroup`, `McWutStorage`)
- [x] Budget alert **C$20 / month**
- [x] SQL firewall: **your home public IP** is allowed
- [x] SQL firewall: **Allow Azure services and resources to access this server**
- [x] Blob containers **`vault`** and **`key`** (singular) created private. App env `Files__Azure__KeysContainer=key` to match.
- [x] Storage account key **rotated**; new value only in your password manager (not git)
- [x] Public URL: **`https://mcwut.com`** (www can redirect later)
- [x] Docker image hosting: **GitHub Container Registry (GHCR)** — git is `McWut-src/McWut_WebApp`. Image will be `ghcr.io/mcwut-src/mcwut_webapp:latest`. Copilot subscription is unrelated; GHCR is free for this.
- [x] Production **website** admin password stored in your personal vault (not `vince`, not git)

### Me — Phase 2 (code)

- [x] Phase 2.1 — SQL Server provider, keep SQLite for the PC (`Database:Provider`)
- [x] Phase 2.2 — `FamilyVault.Files.Azure` (Blob); `Files:Provider = Local | Azure`
- [x] Phase 2.3 — Production: no toy users, Register off, keys in Blob container `keys`, Secure cookies
- [x] Tests green (27). Local default remains SQLite + disk

### After Phase 2

- [x] GHCR image published by GitHub Actions. **Push to `main` tags `:qa` only — not prod.** Prod = manual workflow or git tag `v*`, then `az containerapp update` to that SHA. See [SCOPE.md](SCOPE.md) §3.1.
- [x] Container Apps environment **`cae-mcwut`** in `McWutStorage` / Canada Central
- [x] GHCR package **public** (anonymous pull works)
- [x] Container App **`ca-mcwut`** running — https://ca-mcwut.greencoast-e1f4e3b8.canadacentral.azurecontainerapps.io/
- [x] Secrets on the Container App (SQL, storage, website admin password)
- [x] Smoke: health, login, **upload an image worked**, public share link
- [x] DNS + HTTPS for **https://www.mcwut.com**
- [x] DNS + HTTPS for apex **https://mcwut.com**
- [ ] You: invite family

### Later (not production blockers) — [SCOPE.md](SCOPE.md)

- [ ] Rename UI to McWut / My files / Shared files
- [ ] Pastes
- [ ] Admin panel (users, health)
- [ ] Thumbnails

---

## Current progress (snapshot)

| Piece | Status |
|---|---|
| Product on this PC | **Works** — SQLite + disk. Docker `http://localhost:8080` |
| Git | First commit on `main` |
| Azure SQL | **Exists**, free tier, **Canada East**, RG `McWut_dbResourceGroup` |
| Storage | **Account exists** (`mcwutstorage`), **Canada Central**, RG `McWutStorage`. Containers `vault` + `keys`. Key rotated. |
| Blob / SQL **in the app** | **Coded.** Local default: SQLite + disk. Production: `Database__Provider=SqlServer` + `Files__Provider=Azure` |
| Container App | **Exists** — https://ca-mcwut.greencoast-e1f4e3b8.canadacentral.azurecontainerapps.io/ |
| Secrets | Set. Login + image upload worked |
| Custom domain | **https://mcwut.com** and **https://www.mcwut.com** (HTTPS) |
| Family live | Ready to invite when you want |

Path A idea: website **sleeps** when idle; users in SQL; files in Blob. Ballpark **C$0–10 / month** if SQL stays free and the app sleeps; **C$20–35 / month** if SQL is paid and a replica stays on.

---

## How to add secrets (You — portal, ~10 minutes)

Do this in [Azure Portal](https://portal.azure.com). **Do not** paste the real values into chat, git, or a screenshot.

You already have the three values in your password manager:

1. Azure SQL password for `mcwut-admin`  
2. Storage **rotated** account key for `mcwutstorage`  
3. Production **website** admin password  

### A. Create the three secrets

1. Portal → resource group **`McWutStorage`** → Container App **`ca-mcwut`**.  
2. Left menu: **Secrets** (under *Settings*).  
3. **Add** three times:

| Secret name (this exact spelling) | What you paste |
|---|---|
| `sql-connection` | SQL connection string (see formula below) |
| `storage-connection` | Storage connection string (see formula below) |
| `website-admin-password` | The website password from your personal vault |

4. Save.

**SQL string** (use SQL user + password, **not** `Active Directory Default`):

```
Server=tcp:mcwut.database.windows.net,1433;Initial Catalog=sql-mcwut;User ID=mcwut-admin;Password=PASTE_SQL_PASSWORD;Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;
```

**Storage string:**

```
DefaultEndpointsProtocol=https;AccountName=mcwutstorage;AccountKey=PASTE_ROTATED_KEY;EndpointSuffix=core.windows.net
```

If the portal already shows a “connection string” copy button on the storage account, use that **after** the key rotation.

### B. Point the app at those secrets

Secrets sitting in the list do nothing until environment variables **reference** them.

1. Same Container App → **Containers** (or *Application* → *Containers*).  
2. Edit the container `ca-mcwut`.  
3. **Environment variables** → **Add**. For each row, choose **Reference a secret** (not “plain text”):

| Environment variable name (exact) | Secret to reference |
|---|---|
| `ConnectionStrings__DefaultConnection` | `sql-connection` |
| `Files__Azure__ConnectionString` | `storage-connection` |
| `Identity__ProductionAdminPassword` | `website-admin-password` |

Those names use **two underscores** (`__`). That is required.

4. You should already have non-secret settings such as `Database__Provider=SqlServer`, `Files__Provider=Azure`, `Identity__ProductionAdminEmail=vince@mcwut.com`. Leave those as they are.  
5. Save. Azure will roll out a **new revision**. Wait until it shows **Running**.

### C. Check

Open: https://ca-mcwut.greencoast-e1f4e3b8.canadacentral.azurecontainerapps.io/health  

You want the word **`ok`**. Then try Sign in as `vince@mcwut.com` with the **website** password (not `vince`, not the SQL password).

If `/health` fails, wait one minute (cold start) and retry. If it still fails, Container App → **Log stream** (no secrets in what you copy) and we look together.

---

## 0. Where we are today (honest)

Works on your PC / local Docker (`http://localhost:8080`):

- Login, My files drop, share links, Shared with me  
- SQLite file + disk folder  
- HTTP on port **8080**

**Not in the code yet — Path A will fail without these:**

1. **SQL Server** as a database (today: SQLite only). Azure will recycle the container and wipe SQLite.  
2. **Azure Blob** project (today: disk only). Same recycle problem for photos.  
3. **Production hardening:** no `vince`/`vince` on the public internet; Register not wide open; login cookies and Data Protection keys that survive a new replica; migrations against SQL Server.

Until (1) and (2) ship, **do not** point mcwut.com at an empty Container App and expect files to last.

---

## 1. Decisions (You — 15 minutes)

Write the answers down (password manager). We need them in later steps.

1. **Azure region:** data stays in Canada. **SQL = Canada East.** **Storage = Canada Central.** Put the future Container App in **Canada Central** (next to files). Fine for a family site.  
2. **Public URL:** **`https://mcwut.com`**. Optional later: redirect `www.mcwut.com` to the same site.  
3. **Where the Docker image lives:** **GitHub Container Registry** — `ghcr.io/mcwut-src/mcwut_webapp`. Not Azure Container Registry.  
4. **Budget alarm:** in Azure, set an alert at e.g. **C$20 / month** so a mis-click cannot surprise you.  
5. **Admin password** for production (not `vince`). Store it offline. See below.

You do not need to buy anything in this phase except an Azure account if you do not have one.

#### Production site admin password (plain language)

This is **not** the Azure SQL password (`mcwut-admin`). It is the password you will type on **https://mcwut.com** → Sign in, as Vince, once the site is live.

Today, on your PC only, the app creates:

- `vince@mcwut.com` / `vince`
- `family@mcwut.com` / `family`

Those are fine for **localhost**. They must **not** be the live site.

**Do this now (5 minutes):**

1. Open your password manager (Bitwarden, 1Password, browser manager, a paper in a drawer — whatever you already use).  
2. Create an entry named **McWut website (production)**.  
3. Username: `vince@mcwut.com` (or another email you actually read).  
4. Password: something **long and unique**, not `vince`, not the SQL password, not reused from another site. Let the manager generate it if it can.  
5. Tick the PATH-A box. You are done for now.

**Do not** try to set this password in Azure SQL, storage, or the portal. There is no McWut user list in the cloud yet.

**When the site first goes live (Phase 4),** we will either:

- stop auto-creating `vince`/`vince` in Production, and you **Register** once (if we leave Register on for that first hour), or  
- you tell me the email and I wire a **one-time** production seed that uses a password you put only in a Container App **secret** (never in git).

Until then, keep using `vince` / `vince` on your PC. Two different worlds: local toy login vs live login you already wrote down.

---

## 2. Code so Azure can keep data (Me)

I change the repo. You only review / run locally if you want.

### 2.1 SQL Server

- Add SQL Server EF provider.  
- Keep **SQLite for your PC**.  
- Switch with config, e.g. `Database:Provider = Sqlite | SqlServer` and `ConnectionStrings:DefaultConnection`.  
- **SQL Server migrations** (second folder or a documented generate step). Startup still runs `Migrate()`.  
- Seed **does not** create `vince`/`family` with toy passwords when `ASPNETCORE_ENVIRONMENT=Production`.

### 2.2 Azure Blob

- New project `FamilyVault.Files.Azure`.  
- `Files:Provider = Local | Azure`.  
- Private container; blob name = storage key, not `vacation.pdf`.  
- Local Docker stays on disk.

### 2.3 Production behaviour

- Data Protection keys in **Blob** (or a keys container), not the container disk.  
- Cookies: `Secure` when the site is HTTPS (Azure’s front door).  
- Config flag **`Identity:AllowRegistration`** (default on in Development, **off** in Production until you say otherwise).  
- Health endpoint stays anonymous (`/health`).  
- Dockerfile stays **HTTP 8080** (Azure adds HTTPS in front).

### 2.4 Done when

- `dotnet test` still green.  
- Local Docker still works with SQLite.  
- You can set fake Azure settings in user-secrets and the app **starts** (Blob/SQL tests can wait for real resources in Phase 4).  

**Stop here until this phase is merged.** Creating Azure resources first is fine (Phase 3) but do not deploy the **current** image as “production.”

Tell me: **“Do Phase 2 — SQL + Blob in the code.”**

---

## 3. Azure account and four resources (You)

Use the **Azure Portal** (clicky) or Azure Cloud Shell.

You already have **two** resource groups (not one `rg-mcwut`):

| Resource group | Group location | What is in it |
|---|---|---|
| `McWut_dbResourceGroup` | Canada Central | SQL (the **server** is **Canada East**) |
| `McWutStorage` | Canada Central | Storage account `mcwutstorage` (**Canada Central**) |

That split is OK. Put the **Container App** later in `McWutStorage` or a third group in **Canada Central**.

### 3.1 Account and safety

1. Sign in at [https://portal.azure.com](https://portal.azure.com).  
2. Resource groups already exist (table above).  
3. **Cost Management** → budget **C$20/month** — **done**.

### 3.2 Azure SQL Database — **done**

| | |
|---|---|
| Host | `mcwut.database.windows.net` (port 1433) |
| Database | `sql-mcwut` |
| SQL admin | `mcwut-admin` |
| Free tier | Yes |
| Server location | **Canada East** |
| Resource group | `McWut_dbResourceGroup` |

The string Azure gave you with `Authentication="Active Directory Default"` is for **your laptop** after `az login` or Visual Studio. Keep it in a password manager, **not git**.

For **Container Apps** we will not paste that AD Default string. Use one of:

- **SQL login:** `User ID=mcwut-admin;Password=…;Encrypt=True;TrustServerCertificate=False;` (secret in the Container App), or  
- **Managed identity** (cleaner, Phase 4): app identity granted access on the SQL server.

Still do: SQL **firewall** (next heading). Location is already **Canada East**.

#### What is the SQL firewall? (plain language)

Azure SQL is a locked door. By default **nobody** can talk to it — not your PC, not the future website.

You open the door for two kinds of visitor:

1. **Your home** — so you (and later I, from your PC) can check the database.  
2. **Azure itself** — so the Container App (when it exists) can use the database without you typing your home IP for a Microsoft datacenter.

**Clicks (portal):**

1. [portal.azure.com](https://portal.azure.com) → search **`mcwut`** (the SQL **server**, not only the database).  
2. Left menu: **Networking** (sometimes **Security** → **Networking**).  
3. Turn **ON**: **Allow Azure services and resources to access this server**. Save.  
4. **Add your client IPv4 address** (the portal often shows a button that fills your current IP). Save.

If you use a phone hotspot or a different wifi later, your IP changes and you add that IP too, or you connect with **Azure AD** from Visual Studio instead.

You are **not** opening the database to the whole internet. You are allowing Azure + your house.

### 3.3 Storage account (Blob) — **account exists**

| | |
|---|---|
| Account | `mcwutstorage` |
| Resource group | `McWutStorage` |
| Location | **Canada Central** |

Connection string / account key stay in your password manager — **not git, not this file**.

Still do: two **containers** + rotate the key (next heading).

#### What are Blob containers? (plain language)

The **storage account** is a locked warehouse (`mcwutstorage`).

A **container** is a **named room** inside it. The website will put objects in those rooms. They are not Windows folders on your PC; they only exist in Azure.

We want **two rooms**, both **Private** (no anonymous download if someone guesses a URL):

| Container name | What we will put there |
|---|---|
| `vault` | Family files (photos, PDFs) |
| `key` (this account uses singular `key`, not `keys`) | Login-cookie signing keys so a new container replica still trusts your session |

**Clicks (portal):**

1. Portal → resource group **`McWutStorage`** → storage account **`mcwutstorage`**.  
2. Left menu: **Containers** (under **Data storage**).  
3. **+ Container**. Name: `vault`. Public access level: **Private (no anonymous access)**. Create.  
4. **+ Container**. Name: `keys`. Same: **Private**. Create.

If `vault` and `keys` already appear in the list, you are done.

Then: **Security + networking** → **Access keys** → **Rotate key** (because the old key was pasted in chat). Save the **new** connection string only in your password manager.

### 3.4 Place to put the Docker image (You)

The website will run as a **Docker image** (a packed copy of the app). Azure Container Apps **pulls** that image from a **registry** (a shelf of images).

**Do not** create **Azure Container Registry** — it is about **C$7 / month** extra.

Pick **one** free shelf:

| | **Docker Hub** | **GitHub Container Registry (GHCR)** |
|---|---|---|
| Site | [hub.docker.com](https://hub.docker.com) | Same GitHub account as your git repo |
| Cost | Free for public images; private has a small free limit | Free private images on GitHub |
| Fit | Simplest if you are new to this | Nicest if the code is already on GitHub |
| You will type later | `docker login` then `docker push YOURNAME/mcwut:latest` | `docker login ghcr.io` then `docker push ghcr.io/YOURNAME/mcwut:latest` |

**Chosen: GitHub Container Registry.** GitHub org/repo: `McWut-src/McWut_WebApp`. Copilot is a separate product; GHCR is included with the GitHub account.

Image name we will use later:

`ghcr.io/mcwut-src/mcwut_webapp:latest`

The package may need to be **public**, or the Container App needs a GitHub PAT to pull a **private** package. We will decide that in Phase 4 (public is simpler for a family site if the image has no secrets, which it must not).

You do **not** push an image until Phase 4 (after the SQL/Blob code exists). No extra GitHub signup.

### 3.5 Do **not** create yet

- Container App (wait for Phase 4 so we deploy the **new** image)  
- Azure Container Registry  
- Application Insights / Log Analytics unless you want them (they can add cost)

SQL + storage + firewall + containers + key rotate + GHCR choice are ready. Next: **Phase 2 — SQL + Blob in the code.**

---

## 4. Build the image and the Container App (You + Me)

### 4.1 Me

- Confirm Dockerfile, port **8080**, env var names (section 8).  
- Optional: a tiny `azure-containerapp.env.example` listing every setting with blanks.

### 4.2 You — build and push

On your PC, in `C:\vince\McWutWebApp` (after Phase 2 is in the tree):

```
docker build -t ghcr.io/mcwut-src/mcwut_webapp:latest .
docker login ghcr.io
docker push ghcr.io/mcwut-src/mcwut_webapp:latest
```

(`docker login ghcr.io` uses a GitHub personal access token with `write:packages`, not your Copilot password.)

### 4.3 You — Container App

Portal → **Container Apps** → Create:

| Field | Value |
|---|---|
| Resource group | `McWutStorage` (Canada Central, next to files) |
| Region | **Canada Central** |
| Environment | new, **Consumption** |
| Image | `ghcr.io/mcwut-src/mcwut_webapp:latest` |
| CPU / memory | **0.25** / **0.5 Gi** |
| Min replicas | **0** |
| Max replicas | **1** |
| Ingress | External, target port **8080**, HTTP |

**Application settings** (use **secret** references for connection strings):

```
ASPNETCORE_URLS=http://+:8080
ASPNETCORE_ENVIRONMENT=Production
ASPNETCORE_FORWARDEDHEADERS_ENABLED=true
Database__Provider=SqlServer
ConnectionStrings__DefaultConnection=<SQL string>
Files__Provider=Azure
Files__Azure__ConnectionString=<storage string>
Files__Azure__Container=vault
Files__Azure__KeysContainer=keys
Identity__AllowRegistration=false
```

Do **not** set `ASPNETCORE_HTTPS_PORTS`. Azure terminates HTTPS; the container stays HTTP.

Create. Wait for a URL like:

`https://ca-mcwut.somelabel.canadacentral.azurecontainerapps.io`

### 4.4 Together — first smoke (before DNS)

1. Open that `azurecontainerapps.io` URL.  
2. `/health` should say `ok`.  
3. Home / login should load over **https**.  
4. Create **your** admin user (seeded toy users should be gone in Production) **or** sign in with the production admin we agreed.  
5. Upload one small file, copy the share link, open it in a private window (phone on cellular if you can).  
6. Restart / scale the app to 0 then 1 in the portal; sign in again — cookie and file must still be there (that proves SQL + Blob + keys).

If this fails, **stop**. Do not touch DNS yet. Send me the error page or log snippet (no connection strings).

---

## 5. Custom domain — Namecheap (You)

Registrar: [namecheap.com](https://www.namecheap.com/) → Domain List → **mcwut.com** → **Advanced DNS**.

Azure app FQDN: `ca-mcwut.greencoast-e1f4e3b8.canadacentral.azurecontainerapps.io`  
Environment IP (for the root domain): **`4.172.131.145`**

Do **Azure first** so you can copy the **asuid** TXT value. Do not invent that code.

### Azure

1. Portal → **McWutStorage** → **ca-mcwut** → **Custom domains**.  
2. **Add custom domain**.  
3. TLS/SSL: **Managed certificate**.  
4. Domain: `www.mcwut.com`. Hostname record type: **CNAME**.  
5. Azure shows two DNS lines. Copy them. Leave this blade open.  
6. Repeat later for apex `mcwut.com` with type **A record**.

### Namecheap (www — easiest)

On Advanced DNS, **Add new record**. Namecheap already appends `.mcwut.com` — host is only `www` or `asuid.www`, not the full name.

| Type | Host | Value | TTL |
|---|---|---|---|
| **CNAME Record** | `www` | `ca-mcwut.greencoast-e1f4e3b8.canadacentral.azurecontainerapps.io.` | Automatic |
| **TXT Record** | `asuid.www` | *(paste Azure’s domain verification code)* | Automatic |

Save. Wait 5–30 minutes. Back in Azure → **Validate** → **Add**. Certificate can take several more minutes until status is **Secured**.

### Namecheap (root mcwut.com, no www)

| Type | Host | Value | TTL |
|---|---|---|---|
| **A Record** | `@` | `4.172.131.145` | Automatic |
| **TXT Record** | `asuid` | *(Azure verification code for the apex domain)* | Automatic |

Then Azure → Add custom domain `mcwut.com` → **A record** → Validate → Add → managed certificate.

If **www** already works and you only want one URL: Namecheap **URL Redirect Record**, Host `@`, Destination `https://www.mcwut.com`, Unmasked. Then you can skip the apex A record.

### After it is Secured

Open `https://www.mcwut.com` (and `https://mcwut.com` if you added the A record). Sign in, upload, share link.

If Validate fails: you typed `asuid.www.mcwut.com` as the Host (double domain). Host must be exactly `asuid.www`.

---

## 6. Go-live gate (Together)

Treat production as live only when **all** of these are true:

- [ ] Phase 2 code is what the Container App is running (not the old SQLite-only image)  
- [ ] SQL is Canada East; storage + Container App are Canada Central  
- [ ] `/health` is 200 on the custom domain  
- [ ] You can sign in; toy passwords are gone  
- [ ] Register is off (or invite-only, if we built that)  
- [ ] Upload → public link → download works logged out  
- [ ] After the app scaled to zero, login and the file still work  
- [ ] Budget alert is on  
- [ ] You changed the SQL admin and site admin passwords from anything in git / [STATUS.md](STATUS.md)  

Then you can send the URL to family.

---

## 7. What you do vs what I do (one page)

| # | Step | You | Me |
|---|---|---|---|
| 1 | Region, URL, Docker Hub, budget, admin password | Decide | — |
| 2 | SQL + Blob + production flags in the repo | Review / run local Docker | **Implement** |
| 3 | Resource group, SQL, storage, Docker Hub | **Create**, keep secrets | — |
| 4 | Image + Container App + first HTTPS URL | Build, push, click Create, paste settings | Env names, Dockerfile, debug failures |
| 5 | Smoke without DNS | Click through | Fix bugs |
| 6 | mcwut.com DNS + certificate | Registrar + Azure custom domain | — |
| 7 | Smoke on the real domain | Click through on PC + phone | Fix bugs |
| 8 | Family invited | You send the link | Support |

---

## 8. Settings names (so we do not invent new ones later)

| Setting | Production value |
|---|---|
| `ASPNETCORE_URLS` | `http://+:8080` |
| `ASPNETCORE_ENVIRONMENT` | `Production` |
| `ASPNETCORE_FORWARDEDHEADERS_ENABLED` | `true` |
| `Database__Provider` | `SqlServer` |
| `ConnectionStrings__DefaultConnection` | `Server=tcp:mcwut.database.windows.net,1433;Initial Catalog=sql-mcwut;Encrypt=True;…` plus SQL password **or** managed identity — never AD Default in the container |
| `Files__Provider` | `Azure` |
| `Files__Azure__ConnectionString` | Storage connection for account **`mcwutstorage`** (secret, not in git) |
| `Files__Azure__Container` | `vault` |
| `Files__Azure__KeysContainer` | `keys` |
| `Identity__AllowRegistration` | `false` |

Local PC keeps `Database__Provider=Sqlite` and `Files__Provider=Local`. Never commit production strings.

---

## 9. After it is in production (later, not blockers)

- Admin panel, dashboard names, pastes, thumbnails — [SCOPE.md](SCOPE.md) Phases 1 and 4. Can ship on Azure the same way: I code, you `docker build && docker push`, Azure pulls the new tag (or you restart the revision).  
- Backups: Azure SQL has them; turn on **Blob soft delete** (a few extra cents, saves “oops”).  
- New deploy: I change code → you push `:latest` (or `:v2`) → Container App new revision.  
- If the bill spikes: min replicas must stay **0**; kill ACR/Insights if they appeared; check SQL is still on the free offer.

---

## 10. How this compares to the C$140 VPS

| | Path D (VPS you priced) | Path A (this document) |
|---|---|---|
| Ballpark | **~C$140 / year**, always on | **~C$0–120 / year** if SQL is free and the app sleeps; **more** if SQL is paid 24/7 |
| Data in Canada | Yes (the CA cloud you picked) | Yes if everything is **Canada Central** |
| You patch Linux | Yes | Azure patches the host |
| Files/DB survive reboot | Yes (disk) | Yes **only after** Phase 2 (SQL + Blob) |
| HTTPS | You + Caddy | Azure certificate |
| First production Docker | You on the VM | You push an image; Azure runs it |

A is not automatically cheaper than C$140. It **can** be cheaper if the site is idle and SQL is free. It **is** more “hands off” for OS patches and more standard if you add features later.

---

## 11. Start here

Use the **Tracker** at the top of this file as the scoreboard.

**You (now):** commit this Phase 2 code. Optional: run locally (`vince` / `vince`) to confirm SQLite still works.

**Next:** Phase 4 — `docker build` / `docker push` to GHCR, then Container App. Set `Identity__ProductionAdminEmail` and `Identity__ProductionAdminPassword` (from your personal vault) so you can sign in; Production does **not** create `vince`/`vince`.

See `docs/azure-containerapp.env.example` for setting names.
