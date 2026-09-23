# How to host the family vault online

**App:** McWutWebApp (the site in `C:\vince\McWutWebApp`)  
**Written:** 20 September 2026  
**For:** Vince — print this and follow it at a desk. You do not need the chat console.

Product map: [SCOPE.md](SCOPE.md). What already works: [STATUS.md](STATUS.md).

This is a **how-to**, not extra code. It covers Azure, Docker, Blob storage, and cheaper/simpler alternatives. Read **section 1 and 2 first**. Then pick **one** path in section 4 and ignore the rest until you need them.

**Hosting choice** (see [SCOPE.md](SCOPE.md)): Path D was priced (~C$140/year VPS in Canada) and not taken. **Path A is production.** Azure SQL free tier is already created. Follow [PATH-A.md](PATH-A.md).

---

## 1. What you have today vs what “online” needs

On your PC the app already works:

- Website + login (`vince@mcwut.com` / `vince`)
- Files saved on **disk** (`App_Data` or Docker volume `/app/data`)
- User list and file records in **SQLite** (one `.db` file)
- Docker image that listens on **port 8080** (HTTP)

The internet is different. Three things break if you just “put the container in Azure” with no extra services:

| Piece | On your PC | On Azure if you do nothing extra | What you actually want |
|---|---|---|---|
| Users, logins, file names, share links | SQLite file next to the app | **Lost** when the container restarts or moves | A real database (Azure SQL) |
| The uploaded files (photos, PDFs) | Disk folder | **Lost** the same way, or awkward on a file share | **Azure Blob** (best) or a disk volume (ok for a trial) |
| HTTPS (`https://something.com`) | Optional | Required. Browsers and login cookies expect it | Azure gives you a `*.azurecontainerapps.io` HTTPS name for free. Custom domain later |

**Honest status of Blob in this project:** Azure Blob is **designed** in [AGENT.md](AGENT.md) but **not coded yet**. Today `Files:Provider` is only `Local` (disk). You cannot flip a switch and use Blob until we add the `FamilyVault.Files.Azure` project. The guide still explains Blob so you can choose the right Azure pieces, then we wire the code.

**Do not put this site on the public internet with password `vince`.** Change it before DNS points at the world. Register is currently open to anyone who finds the URL.

---

## 2. Recommendation (read this, then choose)

For a **family** site that you want cheap, mostly asleep when nobody uses it, and using the Docker file you already have:

**Best long-term combo**

1. **Azure Container Apps** (Consumption) — runs your Docker image, HTTPS included, can scale to **zero** so you pay little when idle.  
2. **Azure SQL Database free offer** — users and share links survive restarts.  
3. **Azure Blob Storage** (after we add the code) — photos/PDFs in a private container, not on the web server disk.  
4. Push the image to **Docker Hub or GitHub Container Registry**, not Azure Container Registry, unless you like paying ~$5/month for ACR.

**Best “get it online this weekend” combo (no new Blob code yet)**

Same as above, but files stay on a **Container Apps volume** (Azure Files) for a little while. Fine for testing with family. Not what you want for years of photos. SQLite must **not** live on Azure Files (it corrupts). SQL Server for records, Files/Blob for bytes.

**Skip unless you have a reason**

- **App Service Free** — cannot run **custom Linux containers**. You would publish as code, not Docker.  
- **A big always-on VM** — more to patch, usually costs more than Container Apps at family traffic.  
- **Static Web Apps / Front Door only** — this is a real server app with login and uploads, not a static website.

---

## 3. Pros, cons, and rough prices

Prices are **ballpark USD / month, East US, 2026**, for a **family** site: a handful of people, not a public product. They are for **comparing options**, not an invoice. Azure changes offers; always glance at the Azure pricing calculator before you click Create.

**Assumed family usage**

- Site idle most of the day, bursts when someone opens a link  
- Maybe **20–100 GB** of photos/PDFs over a year  
- A few thousand page views a month, not millions  
- One custom domain you already own (`mcwut.com`)

**What usually costs money (same for A/B/C once you are “real”)**

| Piece | Rough price | Notes |
|---|---|---|
| Website compute | $0–15 | The big fork: sleep when idle (A) vs always-on box (C/D) |
| Database (users, links) | **$0** on Azure SQL **free offer** (one DB per subscription, ~32 GB). If you miss the offer: **~$5–15** for a tiny paid SQL | Required on Azure. Do not use SQLite there |
| File storage (Blob) | **~$0.02 per GB** stored. 50 GB ≈ **$1**. 200 GB ≈ **$4** | Plus tiny request fees. Cheapest durable place for photos |
| File share (Azure Files, Path B) | **~$0.06 per GB**. 50 GB ≈ **$3** | More than Blob. Fine as a bridge |
| Image registry | **$0** Docker Hub / GitHub. **~$5** Azure Container Registry Basic | Skip ACR if you want the bill near zero |
| HTTPS certificate | **$0** on Container Apps / App Service / Let’s Encrypt | Do not buy a cert unless you want to |
| Outbound bandwidth | First ~**100 GB**/month often free on Azure; after that ~**$0.08–0.09 / GB** | Family downloads rarely matter unless you share huge video |

**Side-by-side**

| | **A. Container Apps + SQL + Blob** | **B. Container Apps + SQL + Azure Files** | **C. App Service Linux** | **D. One Linux VM + Docker** | **E. Home PC + port forward** |
|---|---|---|---|---|---|
| **Fit** | Best long-term Azure | Temporary online trial | Fine if you hate Docker | Best “URL this weekend” with **today’s** code | Experiment only |
| **Typical bill** | **$0–5 / month** if SQL is free and the app sleeps. **$8–20** if SQL is paid and the app stays warm | **$3–10 / month** extra vs A for the file share | **$0** on Free F1 (too weak). **~$13–20** on B1 + SQL if not free | **$5–15 / month** always, even at 3 a.m. | **$0** (+ your electricity) |
| **Year-one guess** | **$0–60** (free SQL + tiny Blob) or **$100–200** if everything is paid | **$50–120** | **$160–250** on B1 | **$60–180** | **$0** until something breaks |
| **You pay when idle?** | Almost **no** (min replicas = 0) | Almost no for compute; Files still bills stored GB | **Yes** (B1 runs 24/7) | **Yes** (VM runs 24/7) | Yes, your PC must stay on |
| **Code we still need** | SQL provider + Blob project | SQL provider only | SQL provider + Blob | None for a crude launch (SQLite on the VM disk) | None |
| **Effort** | Medium | Medium | Medium (VS Publish is easy) | Low if you like Linux | Looks easy, then DNS/HTTPS/CGNAT |

**How to read the money:** if the family site is used a few evenings a week, **A** is usually the cheapest Azure shape. **D** is the cheapest *honest* launch **before** we add SQL/Blob, because a $6 VPS with a real disk will not eat your database on recycle. **C** is the “I click Publish in Visual Studio” tax: you pay for a small VM-like plan whether anyone visits. **E** is free and fragile.

---

### Path A — Container Apps + SQL + Blob

**Rough price**

- Compute: **$0** most months if it scales to zero and stays under the free grant (180k vCPU-seconds, 360k GiB-seconds, 2 million requests). A **warm** 0.25 CPU / 0.5 GB replica 24/7 is more like **$10–15**. For family, set **min replicas = 0**.  
- SQL: **$0** on the free offer, or **~$5–15** paid tiny DB.  
- Blob: **~$1–4** for tens to low hundreds of GB.  
- **Family total: about $0–5/month** in the happy case, **~$15–25** if SQL is paid and you keep a replica always on.  
- Trap: Visual Studio Publish that creates **Azure Container Registry** adds **~$5/month** for no good reason. Use Docker Hub.

**Pros**

- Uses the Dockerfile you already have.  
- HTTPS URL included (`*.azurecontainerapps.io`).  
- Sleeps when nobody visits — closest to “pay for use.”  
- Blob is the right home for years of family files (backups, no lock issues).  
- Easy to add `vault.mcwut.com` later.  
- Azure patches the host OS.

**Cons**

- **Cannot go live correctly until we add SQL + Blob in code.**  
- First click after idle can feel slow (cold start, a few seconds).  
- More Azure moving parts (resource group, SQL, storage, app).  
- Azure portal is noisy; easy to create extra paid resources by accident.  
- Free SQL offer is **one database per subscription** and has a monthly cap.

**Choose A if:** you want Azure, low idle cost, and can wait for two code slices.

---

### Path B — Container Apps + SQL + Azure Files (no Blob code yet)

**Rough price**

- Same compute + SQL as A.  
- Azure Files: **~$0.06/GB-month** → 50 GB ≈ **$3**, 200 GB ≈ **$12**, plus transaction chatter.  
- **Family total: about $3–15/month**, a bit more than A for the same photos.

**Pros**

- Public HTTPS URL **before** we write Blob.  
- Files survive container recycle (unlike the container’s own disk).  
- Same Docker image as local, `Files__Provider=Local`.

**Cons**

- **Still need SQL in the app** (do not put SQLite on Azure Files — it corrupts).  
- Files is **slower and pricier** than Blob for lots of photos.  
- You will migrate to Blob later anyway.  
- Mounting storage on Container Apps is extra portal clicking.

**Choose B if:** you want an Azure URL soon and accept a temporary file share.

---

### Path C — Azure App Service (no Docker)

**Rough price**

- **F1 Free:** **$0**, 60 CPU minutes/day, 1 GB disk, no custom container, sleeps, no real SLA. Uploads will feel awful.  
- **B1 Linux:** about **$13/month**, always on, 1 core / 1.75 GB. This is the realistic floor for a vault.  
- SQL + Blob on top: **+$0–15**.  
- **Family total: ~$13–30/month** once it is usable. Year-one **~$160–350**.

**Pros**

- Visual Studio **Publish** is the most click-next path.  
- HTTPS and custom domain are well documented.  
- No Docker Hub, no Dockerfile in production.  
- You already know “it’s a website on Azure.”

**Cons**

- **You pay even at 3 a.m.** (B1 does not scale to zero).  
- Free tier is a toy for this app.  
- Custom Linux **containers are not allowed on Free**.  
- Still need SQL + Blob in code for durable data.  
- Usually **more expensive than Container Apps** for a sleepy family site.

**Choose C if:** you want Publish from Visual Studio and will pay ~$15/month for simplicity.

---

### Path D — One Linux VM + Docker

**Rough price**

- **Hetzner / DigitalOcean / similar:** **$4–6/month** for 1 CPU / 1–2 GB RAM + 20–40 GB disk.  
- **Azure VM B1s:** about **$8–12/month** pay-as-you-go, less with a reservation.  
- Disk: included until you grow; extra managed disk **~$3–8**.  
- **Family total: ~$5–15/month**, **every** month, idle or not.  
- Bonus: **today’s code works** (SQLite + files on the VM disk) if you back up the folder.

**Pros**

- Simplest picture: one box, `docker compose up`.  
- Can go live **this weekend** without SQL/Blob code.  
- Predictable bill.  
- Full control (Caddy for HTTPS is free).  
- Good enough for a handful of relatives if you back up.

**Cons**

- **You** patch Ubuntu, watch disk, restore backups.  
- Always-on: you pay while everyone sleeps.  
- One machine = one failure domain (disk dies, vault dies, unless you copy it off).  
- Azure Blob still nicer long-term for photo libraries.  
- Easy to forget HTTPS and expose port 8080 by mistake.

**Choose D if:** you want a URL now, like Linux, and do not want to wait on Azure SQL/Blob work.

---

### Path E — Home PC and router

**Rough price:** **$0** service fees. You still pay electricity and your time.

**Pros**

- No cloud bill.  
- Data stays in the house.  
- Fine for *you* testing from a phone on cellular.

**Cons**

- PC must stay on; home IP changes; many ISPs use CGNAT (port forward **does not work**).  
- HTTPS is annoying (Let’s Encrypt + dynamic DNS).  
- If the URL leaks, the internet can hit your login (currently open Register, password `vince`).  
- Not a family vault; it is a hobby tunnel.

**Choose E only** as a personal experiment.

---

### Extra costs people forget (all paid clouds)

- **Azure Container Registry:** ~**$5/month**. Skip it.  
- **Bandwidth after the free chunk:** a 2 GB video shared with 20 people is ~40 GB out — still often inside Azure’s ~100 GB free. A viral link is how this gets expensive, not Aunt Marie’s birthday album.  
- **Log Analytics / Application Insights** if the portal “helps” you tick them: can be **$0** or **$10+**. Turn off if you do not need them.  
- **Domain:** you already have one; renewal is whatever you pay the registrar (often **$10–15/year**), not Azure.

---

## 4. Path A — Azure Container Apps (the Azure + Docker path)

This is the path that matches your Dockerfile.

**Money snapshot:** about **$0–5/month** for a sleepy family site on the SQL free offer; about **$15–25/month** if SQL is paid and you leave a replica running. Details in **section 3**.

### 4.1 Azure account and tools

1. Create a free Azure account if you do not have one: [https://azure.microsoft.com/free](https://azure.microsoft.com/free)  
2. Install **Azure CLI** on your PC, or use **Azure Cloud Shell** in the browser.  
3. Install **Docker Desktop** (you already have this).  
4. Optional: a **Docker Hub** or **GitHub** account to store the image for free.

Sign in:

```
az login
az account show
```

Create one resource group so everything for this family site lives together (change the region if you prefer closer to home):

```
az group create --name rg-mcwut --location eastus
```

### 4.2 Build and publish the Docker image

From `C:\vince\McWutWebApp`:

```
docker build -t YOURNAME/mcwutwebapp:latest .
docker login
docker push YOURNAME/mcwutwebapp:latest
```

Replace `YOURNAME` with your Docker Hub user. GitHub is similar (`ghcr.io/YOURNAME/mcwutwebapp:latest`) after `docker login ghcr.io`.

**Avoid Azure Container Registry** unless you want a private Azure-hosted registry (~$5/month for Basic). Family site: Docker Hub is enough.

Visual Studio **Publish → Azure Container Apps** will often create ACR for you. That is convenient and not free. Prefer the CLI + Docker Hub if you care about the bill.

### 4.3 Database (do this before the container)

SQLite inside the container **will vanish** when Azure replaces the replica. Do not use it online.

Create **Azure SQL Database** on the **free offer** if you still have it on the subscription:

- Portal: create **SQL Database**  
- Compute: look for **free** / **serverless** / **free offer** (wording changes; you want the offer that is $0 until you exceed the monthly free cap)  
- Network: enable **“Allow Azure services”** and add your home IP if you want to connect from Visual Studio  
- Copy the **ADO.NET connection string**. Replace `{your_password}` with a real SQL admin password (not `vince`)

You will later set:

```
ConnectionStrings__DefaultConnection = Server=tcp:....database.windows.net,1433;...
```

**Code gap:** today the app only has SQLite. Before this path works end-to-end we must add SQL Server as a provider (same pattern as the other McWut app). Until that exists, Path B/D can still go live with SQLite **only** if the database file is on a **Linux disk**, not Azure Files. Container Apps’ built-in ephemeral disk is **not** that. So: treat SQL as required for Azure.

### 4.4 Blob storage (for the actual files)

1. Portal → **Storage account** (StorageV2, cheapest tier, same region as the app).  
2. **Containers** → create `vault` (or `family-vault`).  
3. Access level: **Private**. Nobody should download by guessing a URL. The app will make short-lived links later (SAS).  
4. Copy the storage **connection string** from Access keys (or use a managed identity later).

You will later set:

```
Files__Provider = Azure
Files__Azure__ConnectionString = DefaultEndpointsProtocol=https;...
Files__Azure__Container = vault
```

**Code gap:** `FamilyVault.Files.Azure` is not in the solution yet. Until we add it, the app ignores `Files__Provider=Azure` and still writes disk. Build Blob **before** you invite the whole family to dump years of photos.

### 4.5 Create the Container App

Portal path (clicky):

1. **Create a resource** → **Container Apps**  
2. Subscription + resource group `rg-mcwut`  
3. Name: `ca-mcwut` (example)  
4. Region: same as SQL and storage  
5. **Container Apps Environment**: create new, Consumption  
6. Image: `YOURNAME/mcwutwebapp:latest` (Docker Hub)  
7. CPU **0.25**, memory **0.5 Gi**  
8. Min replicas **0**, max **1** (family site; sleeps when idle)  
9. Ingress: **Enabled**, **external**, target port **8080**, transport **HTTP**  
10. Environment variables (Application settings):

```
ASPNETCORE_URLS = http://+:8080
ASPNETCORE_FORWARDEDHEADERS_ENABLED = true
ASPNETCORE_ENVIRONMENT = Production
ConnectionStrings__DefaultConnection = (Azure SQL string)
Files__Provider = Azure
Files__Azure__ConnectionString = (storage string)
Files__Azure__Container = vault
```

Azure terminates HTTPS in front of you. The container stays HTTP on 8080. That is correct. Do **not** set `ASPNETCORE_HTTPS_PORTS` here (that was what broke local Docker).

11. Create. Wait until the app URL looks like:

`https://ca-mcwut.something.azurecontainerapps.io`

Open that in a browser. You should see the family vault home page (after SQL + Identity tables exist).

### 4.6 First login online

After SQL is wired and the app has run once (it migrates and seeds):

- Change the seeded password **immediately**, or create your real account and delete the demo users.  
- Turn **Register** off or put the site behind a family-only password / invite when you care. Right now anyone with the URL can register.

### 4.7 Custom domain (mcwut.com or a subdomain)

1. In the Container App → **Custom domains** → add `vault.mcwut.com` (example).  
2. Azure shows a DNS record to add (CNAME or TXT).  
3. In your domain registrar, create that record.  
4. Wait for HTTPS certificate (Azure manages it on Container Apps).  
5. Only then tell family the nice name.

Do not set a cookie domain until the site is really served on that host.

---

## 5. Path B — Same Azure, files on a volume (trial while Blob is unbuilt)

Use this if you want a public HTTPS URL **before** we write Blob code.

**Money snapshot:** Path A compute + SQL, plus **about $3 per 50 GB** on Azure Files (more than Blob). Details in **section 3**.

- Do Path A for Container Apps + **Azure SQL**.  
- Add an **Azure Files** share.  
- Mount it in Container Apps at `/app/data/vault` only (the **files**, not the database).  
- Keep `Files__Provider = Local` and `Files__Local__RootPath = /app/data/vault`.

**Never** put `mcwut.db` on Azure Files. SQLite needs Unix file locks; Azure Files does not do that well. The database stays on Azure SQL.

This is a **bridge**. When Blob code ships, turn `Files__Provider` to `Azure` and stop the file share.

---

## 6. Path C — Azure App Service without Docker

Use this if you dislike containers.

**Money snapshot:** Free F1 is **$0** and too weak. Usable vault ≈ **App Service B1 ~$13/month** + SQL/Blob. Details in **section 3**.

1. Portal → **App Service** → Linux, **.NET 10**.  
2. **Publish** from Visual Studio: right-click the web project → Publish → Azure App Service.  
3. Still add **Azure SQL** and later **Blob**.  
4. Configuration → connection strings and `Files__*` settings, same names as Path A.  
5. Custom domain + free App Service managed certificate.

**Limits:** Free F1 is a shared sandbox (no custom container, sleeps, weak). For a vault with uploads, **B1** is the realistic floor. That is usually **more expensive** than Container Apps Consumption at family traffic.

---

## 7. Path D — One Linux box + Docker (simplest mental model)

If Azure feels like too many moving parts, rent **one** small Ubuntu VM (Azure B1s, or Hetzner/DigitalOcean ~$5).

**Money snapshot:** **~$5–15/month**, 24/7, even when nobody visits. Cheapest *honest* launch with **current** SQLite+disk code. Details in **section 3**.

On the VM:

```
sudo apt update
# install Docker using Docker’s official Ubuntu instructions
git clone <your repo>   # or copy the project
cd McWutWebApp
```

Use compose, but **bind a disk folder** and put a reverse proxy in front for HTTPS.

Sketch:

- **Caddy** or **nginx** on 443 with Let’s Encrypt  
- Proxy to `http://127.0.0.1:8080`  
- Docker volume or `/var/lib/mcwut` for data  
- For a serious family vault on a VM, still use **Postgres or SQL Server** in a second container, not SQLite, and still use object storage if you can

You are the patcher: `apt upgrade`, disk full, backups. Fine if you like that. Painful at 2 a.m. if you do not.

**HTTPS:** never expose 8080 raw on the internet. Always 443 with a certificate.

---

## 8. Path E — Home PC / router (not recommended)

You *can* port-forward 8080 and use a dynamic DNS name.

**Money snapshot:** **$0** cloud bill. The cost is reliability and security, not dollars. Details in **section 3**.

Problems: ISP, CGNAT, the PC sleeping, HTTPS certificates, and anyone on the internet hitting a login form with `vince`/`vince`. Use this only as a personal experiment, not as “the family vault.”

---

## 9. What Blob actually does (when we add it)

Think of three layers:

1. **Browser** talks to **your website** (login, lists, passwords, who is allowed).  
2. **Website** talks to **SQL** (names, expiry, hashed passwords, share tokens).  
3. **Website** (or a short-lived SAS URL) talks to **Blob** (the bytes). The blob name is a random key, not `vacation.pdf`. The container is **private**.

People never get a permanent public blob URL. A share link is still `/s/randomtoken` on **your** site. That is the point of the vault.

Until the Azure project exists, step 3 is “write a file under `/app/data/vault`.”

---

## 10. Settings cheat sheet (environment variables)

Azure and Docker use **double underscore** for nesting.

| Setting | Local Docker (now) | Online (target) |
|---|---|---|
| `ASPNETCORE_URLS` | `http://+:8080` | `http://+:8080` (Azure handles https) |
| `ASPNETCORE_ENVIRONMENT` | `Development` | `Production` |
| `ASPNETCORE_FORWARDEDHEADERS_ENABLED` | optional | `true` |
| `ConnectionStrings__DefaultConnection` | `Data Source=/app/data/mcwut.db;Cache=Shared` | Azure SQL connection string |
| `Files__Provider` | `Local` | `Azure` (after code exists) |
| `Files__Local__RootPath` | `/app/data/vault` | unused if Provider is Azure |
| `Files__Azure__ConnectionString` | — | storage account connection string |
| `Files__Azure__Container` | — | `vault` |
| `Files__MaxFileSizeBytes` | 100 MB | raise if you want family video |
| `Files__QuotaBytesPerUser` | 1 GB | raise for real photos |

Never commit real connection strings. Use Container App **secrets**, App Service **configuration**, or `dotnet user-secrets` on your PC.

---

## 11. Before the URL is public — a short safety list

The app is a **dev** family project. Online is a different sport.

- [ ] Change `vince` / `family` passwords (or disable those users)  
- [ ] Decide whether **Register** stays open  
- [ ] `ASPNETCORE_ENVIRONMENT=Production`  
- [ ] SQL and storage keys only in Azure settings, not in git  
- [ ] HTTPS on the public URL (Container Apps / App Service do this)  
- [ ] Blob container private (when Blob exists)  
- [ ] Backups: Azure SQL automated backup; Blob soft delete / versioning if you want “oops” recovery  
- [ ] Quota and max file size you are happy to pay for  

---

## 12. Suggested order of work (so you are not stuck)

Do **not** start all Azure pieces on day one if the code is not ready.

1. **Keep using Docker locally** (`http://localhost:8080`) until drop / link / tag feels right.  
2. **Ask me to add SQL Server support** (same database as Identity + vault tables). Without this, Azure will keep eating your users.  
3. **Ask me to add `FamilyVault.Files.Azure`** (Blob). Without this, photos live on a fragile disk.  
4. Create Azure resource group + SQL + storage account (empty, ready).  
5. Push the image, create Container App, set the settings in section 10.  
6. Open the `*.azurecontainerapps.io` URL, sign in, upload one file, open the share link on your phone on cellular (not wifi). If that works, you are hosted.  
7. Add `vault.mcwut.com` when you like the URL.

If you want a URL **this week** with current code only: Path D (a small VM) is the least lying option, because SQLite + a real Linux disk on one box actually survives reboot. Azure Container Apps + current SQLite-only code will disappoint you the first time the replica recycles.

---

## 13. Quick “which button do I press?” 

**I want cheapest Azure and I can wait for two code slices (SQL + Blob)**  
→ Path A. Tell me to implement SQL provider and Azure Blob next.

**I want a link for family this weekend and I will accept a VM**  
→ Path D. One Ubuntu box, Docker, Caddy, backups of `/var/lib/mcwut`.

**I want Visual Studio “Publish” and I will pay a bit more**  
→ Path C App Service, still need SQL + Blob in code.

**I thought I could only upload the Dockerfile to Azure and be done**  
→ That runs the **website**, not durable **data**. Always add SQL (and Blob) or a real disk.

---

## 14. What to tell me when you pick a path

Reply with one line, for example:

- “Do Path A — start with SQL + Blob in the code.”  
- “Do Path D — I’ll rent a VM, help me with compose and Caddy.”  
- “Just write the Blob project, I’ll click Azure myself.”

Then we implement the missing pieces for **that** path instead of boiling the ocean.
