# 4 — QA in Docker (this PC)

Prove the app as a **Linux server** on your machine. This is **not** mcwut.com.

If you are new to Docker, read the tables, then do the numbered steps. Do not skip “Docker Desktop is running.”

## Words

| Word | Meaning here |
|---|---|
| **Docker Desktop** | The app with the whale icon. It must be running. |
| **Image** | Packaged site (like an installer). |
| **Container** | That package actually running. |
| **Compose** | File `docker-compose.yml`: build this, port 8080. |
| **Terminal / CLI** | **Windows PowerShell** (or Windows Terminal) — a text window. Not Visual Studio’s Error List, not Azure Cloud Shell. |

## 1. Start Docker Desktop

1. Start menu → **Docker Desktop**.  
2. Wait until it says **Engine running**.  
3. Leave the whale in the tray.

## 2. Open PowerShell in the project folder

1. Start menu → **Windows PowerShell** (or **Terminal**).  
2. Paste and Enter:

```powershell
cd C:\vince\McWutWebApp
```

3. Check:

```powershell
dir docker-compose.yml
```

You must see that file. If not, `cd` is wrong.

Stop Visual Studio debugging first if F5 is still using ports (usually 7047, not 8080 — but stop it anyway so you are not confused which site you are looking at).

## 3. Build and start

```powershell
docker compose up --build
```

- First time / after code changes: several minutes.  
- Leave this window **open**. Logs scrolling is normal.  
- `--build` = rebuild from current files, don’t reuse a stale image.

**Port 8080 already in use:** another container is running. Open a **second** PowerShell:

```powershell
cd C:\vince\McWutWebApp
docker compose down
```

Then run `docker compose up --build` again.

**Docker daemon not running:** step 1.

## 4. Browser checks

Open **http://localhost:8080**  
(plain **http**, not https, not mcwut.com)

| Check | Want |
|---|---|
| Header | **McWut** |
| After `vince@mcwut.com` / `vince` | **My files**, **Shared files** |
| http://localhost:8080/Identity/Account/Register | **404** |
| Drop a real (non-empty) file | Link works in a private window |

QA login is the **toy** `vince@mcwut.com` / `vince` (second toy: `member@mcwut.com` / `member`). Prod password is different.

## 5. Stop

In the log window: **Ctrl+C**.

Fully stop:

```powershell
cd C:\vince\McWutWebApp
docker compose down
```

QA files live in a Docker volume on this PC only. They do **not** change Azure.

## 6. Git (if you have not pushed this slice)

If Dev + QA are good and you still have uncommitted work: commit and **push `main`**. That builds GitHub image **`:qa`**. It still does **not** change mcwut.com.

## Next

Only if this list passed: [05-promote-prod.md](05-promote-prod.md). You do that step. If you are tired, **stop here**.
