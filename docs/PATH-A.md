# Path A — from this PC to production on Azure

**Site:** McWut  
**Domain you own:** mcwut.com  
**Path:** Azure Container Apps + Azure SQL + Blob (the “professional” option in [DEPLOY.md](DEPLOY.md))  
**Written:** 21 September 2026  

You priced Path D (Linux VPS, data in Canada) at about **C$140 / year** and **chose Path A** instead.

**Already done (You):** Azure SQL **server** and **database** on the **free tier**. Admin login name: `mcwut-admin` (password only in your password manager — not in this repo).

Path A is: the **website can sleep** when nobody visits; **users live in SQL**; **files live in Blob**. Typical family bill is **about C$0–10 / month** if the free SQL offer holds, or **about C$20–35 / month** if SQL is paid and you leave a replica running. These are ballparks, not a quote.

This file is the **runbook**: who does what, in order, until `https://mcwut.com` (or a subdomain) is live.

**Legend**

- **You** — Azure portal, DNS, passwords, Docker Hub, budget  
- **Me** — code in this repo, Docker image shape, settings names  
- **Together** — first login on the real URL, then we fix whatever broke  

Do the phases **in order**. Do not create the Container App until Phase 2 code is in the image.

Related: [DEPLOY.md](DEPLOY.md) (all options), [SCOPE.md](SCOPE.md) (product), [STATUS.md](STATUS.md) (what already works locally).

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

1. **Azure region:** use **Canada Central** (Toronto) so data stays in Canada, same idea as the VPS you priced.  
2. **Public URL (pick one):**  
   - `https://mcwut.com` + `https://www.mcwut.com`, or  
   - `https://www.mcwut.com` only, or  
   - `https://app.mcwut.com` if you want the root for a brochure later.  
3. **Where the Docker image lives:** **Docker Hub** or **GitHub Container Registry**. Not Azure Container Registry (~C$7 / month extra).  
4. **Budget alarm:** in Azure, set an alert at e.g. **C$20 / month** so a mis-click cannot surprise you.  
5. **Admin password** for production (not `vince`). Store it offline.

You do not need to buy anything in this phase except an Azure account if you do not have one.

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

Use the **Azure Portal** (clicky) or Azure Cloud Shell. Same subscription for all. **Region: Canada Central.**

### 3.1 Account and safety

1. Sign in at [https://portal.azure.com](https://portal.azure.com) (create a free account if needed).  
2. Create a **resource group**: `rg-mcwut`.  
3. **Cost Management** → budget **C$20/month**, email you.

### 3.2 Azure SQL Database — **done**

Server + database exist on the **free tier**. SQL admin user name: `mcwut-admin`.

Still do:

1. Confirm the server is **Canada Central** (or the Canada region you picked).  
2. Networking: allow **Azure services**; add your home IP if you want to peek from SSMS.  
3. Copy the **ADO.NET connection string** into a password manager (not git). You will paste it into Container App secrets in Phase 4.

### 3.3 Storage account (Blob)

1. Create **Storage account**, StorageV2, Canada Central, cheapest redundancy (**LRS** is enough for family).  
2. **Containers** → create two **private** containers:  
   - `vault` — family files  
   - `keys` — Data Protection keys (login cookies)  
3. **Access keys** → copy **connection string**. Password manager.

### 3.4 Place to put the Docker image (You)

1. Create a Docker Hub user (or use GitHub).  
2. Repo name e.g. `YOURNAME/mcwut`.  
3. You will `docker login` later; no Azure Container Registry.

### 3.5 Do **not** create yet

- Container App (wait for Phase 4 so we deploy the **new** image)  
- Azure Container Registry  
- Application Insights / Log Analytics unless you want them (they can add cost)

When 3.1–3.4 exist, tell me: **“Azure SQL + storage are ready.”** You can paste **resource names only** (not secrets) e.g. `sql-mcwut`, storage account `stmcwut`.

---

## 4. Build the image and the Container App (You + Me)

### 4.1 Me

- Confirm Dockerfile, port **8080**, env var names (section 8).  
- Optional: a tiny `azure-containerapp.env.example` listing every setting with blanks.

### 4.2 You — build and push

On your PC, in `C:\vince\McWutWebApp` (after Phase 2 is in the tree):

```
docker build -t YOURNAME/mcwut:latest .
docker login
docker push YOURNAME/mcwut:latest
```

### 4.3 You — Container App

Portal → **Container Apps** → Create:

| Field | Value |
|---|---|
| Resource group | `rg-mcwut` |
| Region | Canada Central |
| Environment | new, **Consumption** |
| Image | `YOURNAME/mcwut:latest` (Docker Hub) |
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

## 5. Custom domain (You)

Only after Phase 4 smoke is green.

1. Container App → **Custom domains** → add `mcwut.com` and/or `www.mcwut.com` (whatever you picked in Phase 1).  
2. Azure shows **DNS records** (usually CNAME + TXT for the certificate).  
3. At your **domain registrar** (where you bought mcwut.com), add those records.  
4. Wait until Azure shows the certificate as bound (can be minutes to a few hours).  
5. Open `https://mcwut.com` (or www). Login, upload, share link on a phone again.

Optional: redirect apex ↔ www so there is only one canonical host (Azure or registrar).

---

## 6. Go-live gate (Together)

Treat production as live only when **all** of these are true:

- [ ] Phase 2 code is what the Container App is running (not the old SQLite-only image)  
- [ ] SQL is Canada Central; storage is Canada Central  
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
| `ConnectionStrings__DefaultConnection` | Azure SQL ADO.NET string |
| `Files__Provider` | `Azure` |
| `Files__Azure__ConnectionString` | Storage account connection string |
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

**Next message if you want me to begin the code:**

> Do Phase 2 — SQL + Blob in the code.

**Meanwhile you can do Phase 1 + 3.1–3.4** (account, resource group, SQL, storage, Docker Hub) with no code wait.

If you would rather I wait until SQL and storage exist, say so and start with the portal instead.
