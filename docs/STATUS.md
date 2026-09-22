# Family vault — detailed status

**For:** Vince  
**Project:** McWutWebApp  
**Folder:** `C:\vince\McWutWebApp`  
**Written:** 21 September 2026  
**Purpose:** Print this and read it offline.

---

## 1. The short version

The family vault is **built and working on your PC** with a **simple email + password** login. Microsoft Entra (the cloud “work account” login) is gone. You asked for basic users, not ultra-secure, because this is a dev project.

**Sign in with:**

- Email: **vince@mcwut.com**
- Password: **vince**
- Role: Admin

A second person is already created so you can try tagging:

- Email: **family@mcwut.com**
- Password: **family**

Anyone can also **Register** a new account. Passwords can be as simple as one character. No email confirmation. No lockout.

I signed in as Vince, uploaded `hello.txt`, copied a share link, and downloaded it **without** being logged in. The downloaded text was `hello from vince`.

**Docker (this PC):** use **http://localhost:8080** (plain HTTP, not https). Sign-in is the same Vince account.

**Host on the internet:** Path **A** (Azure Container Apps + SQL + Blob). SQL server/db **already exist** on the free tier. Runbook: [PATH-A.md](PATH-A.md). Product map: [SCOPE.md](SCOPE.md). Options/prices: [DEPLOY.md](DEPLOY.md).

**First commit:** keep `App_Data/`, `bin/`, `obj/`, `*.user`, and `*.zip` out of git (see `.gitignore`). Local test still uses SQLite. Do not put SQL passwords in the repo.

---

## 2. What “Entra” was (you can skip this)

Microsoft Entra ID is the same thing people used to call Azure AD: “sign in with your Microsoft work/school account.” The Visual Studio template had that wired in, with fake tenant numbers, so Sign in exploded.

You do not need any of that. The site now has its own user list in the same SQLite database, like a normal website.

---

## 3. What the app is for

A private family file drop, not Google Drive.

When you are signed in you can:

1. Drag files onto the site.
2. Get a link that expires in **7 days** by default (or 1 day, 30 days, or forever).
3. Optionally set a password on that drop.
4. Open the link on another machine **without signing in** and download.
5. Tag another family user so they see the file under **Shared with me** when they log in, without the link.
6. Expired files disappear from the list and from disk after a background cleaner runs.

Azure Blob storage is **not** started yet. Files live on disk: `App_Data\vault`. Records live in `App_Data\mcwut.db`.

---

## 4. How to try it (print this by the keyboard)

1. Open `McWutWebApp.slnx` in Visual Studio.
2. Run with the **https** profile.
3. Browser: `https://localhost:7047`
4. The home page shows the two accounts. Click **Sign in**.

If you run **Docker** instead of the https profile:

- Address: **http://localhost:8080** (not https, not a random 32xxx port)
- Visual Studio: stop the old container, pick **Container (Dockerfile)**, F5 again so it rebuilds
- Or from the project folder: `docker compose up --build`
5. Use **vince@mcwut.com** / **vince**.
6. You should land on **Family vault**.
7. Drag a photo or PDF (or any allowed type). Optional title and password. Click **Upload and get link**. Copy the link.
8. Open a private / InPrivate window. Paste the link. Download. You should not need to sign in.
9. Sign out. Sign in as **family@mcwut.com** / **family**.
10. On Vince’s vault, tag `family@mcwut.com` on a file. As family, open **Shared with me**.

Register is open if you want a third person.

---

## 5. Accounts (dev, on purpose)

| Email | Password | Notes |
|---|---|---|
| vince@mcwut.com | vince | Admin, created automatically on startup |
| family@mcwut.com | family | Second user, so tagging works without extra setup |

Rules that are **off**:

- No capital letter / digit / symbol required
- No email confirmation
- No account lockout
- Register is public (anyone who can reach the site)

Do not use these passwords on a public internet site. Fine for local dev.

If the database is wiped, the same two users are created again the next time the app starts (same emails/passwords). Existing users are not overwritten.

---

## 6. Website pages

| Address | Who | What |
|---|---|---|
| `/` | Anyone | Welcome + the two passwords |
| `/Identity/Account/Login` | Anyone | Sign in |
| `/Identity/Account/Register` | Anyone | Create another user |
| `/Vault` | Signed in | Drop zone, my files, copy link, tag, delete |
| `/Vault/Shared` | Signed in | Files tagged to you |
| `/s/{token}` | Anyone with the link | Password prompt if you set one, then download / download-all |

---

## 7. Limits (easy to change)

In `appsettings.json` under `Files`:

- Default keep: **7 days**
- Max one file: **100 MB**
- Quota per user: **1 GB**
- Cleaner: every **15 minutes**
- Abandoned unfinished uploads: **24 hours**
- Soft-deleted files removed from disk after **7 more days**

Allowed types: PDF, zip, Word, Excel, JPEG, PNG, GIF, WebP, plain text, MP4, MP3, plus a generic fallback so the browser can send unknown types.

Say if you want bigger video or HEIC photos from iPhones.

---

## 8. How sharing works (plain language)

Two places:

- **Database:** name, owner, expiry, password hash, who is tagged, the share token. Not the file bytes.
- **Disk:** the bytes, under a random key, not under “vacation.pdf”.

A **drop** is a bundle of files with one link. A **share link** is a long random token in `/s/…`. Revoking a link does not delete the file or family tags.

A **password** is a door code. It is hashed. It does **not** encrypt the file on disk. Good enough for this dev project.

A **tag** is “this other signed-up user may download this when they log in.”

Who may see a file:

1. The owner — everything.
2. Someone tagged, with enough permission (view / download / manage).
3. Someone with a valid, unrevoked, unexpired link (and the password if you set one).

Anyone else gets **not found**, not “you are forbidden,” so people cannot poke around for other files.

---

## 9. What is done vs not done

**Done**

- Email/password login (no Microsoft)
- Admin Vince + second user Family, auto-created
- Open Register
- Database, disk storage, upload, share links, passwords, tagging
- Public download page
- Background cleaner
- Vault UI, Shared with me
- 27 automated tests, still passing
- Live check: login as Vince → upload → public link → anonymous download of the real bytes

**Not done (on purpose)**

- Azure Blob (wait until you have used the local path)
- Folder tree
- Virus scan (scanner always says OK)
- Email “you were tagged”
- End-to-end encryption
- Fancy password rules

**UI still a bit rough**

- “Link” on a file copies a **new** link; there is no Revoke button on the row yet (the API can revoke)
- Changing keep-for / password on an already-uploaded file is API-only for now
- First version of the drop zone, not a polished product

---

## 10. What I verified today (20 September 2026)

- Site builds, 0 warnings
- 27 tests pass
- Home page 200, shows the two accounts
- Login page 200
- Signed in as vince@mcwut.com, Vault says “Hello vince@mcwut.com!”
- Created a drop, uploaded `hello.txt`, completed the upload
- Created a share URL
- Opened `/s/{token}` without a login cookie → 200
- Downloaded via the token without a login cookie → body was `hello from vince`

I did **not** click through the drag-and-drop box in a real browser window (no GUI browser in this session). The APIs the page uses were exercised. Please do one drag in Visual Studio so you see it with your eyes.

---

## 11. Next steps (after you try it)

1. **You:** F5, sign in as Vince, drop a real file, open the link in a private window. Then sign in as Family and try tagging.
2. **You tell me** what felt wrong (wording, missing revoke, file types, size).
3. **Polish the Vault page** from that list.
4. **Only then Azure Blob**, if you want files in the cloud instead of `App_Data\vault`.
5. Later, only if you ask: SQL Server for Azure hosting, virus scan, resumable upload, notifications.

---

## 12. If something looks broken

- **Wrong email/password:** use exactly `vince@mcwut.com` / `vince` (all lowercase).
- **Tag list empty except family:** Register another person, or use the seeded Family account. People appear after they exist as users.
- **File type rejected:** we can add the type. HEIC is not in the list yet.
- **Docker:** not trialled with this login. Visual Studio **https** profile is the path I used.
- **Database:** if you delete `App_Data\mcwut.db`, the two users come back on next start; old files in that db are gone.

---

## 13. Bottom line

You wanted a normal login. You have it.

**vince@mcwut.com** / **vince**

Open the solution, press F5, sign in, drop a file. That is the whole next step.
