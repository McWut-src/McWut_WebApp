# 2 — Develop (Visual Studio)

Work only on **this PC**. You are not touching Azure.

## Open the project

1. Open **Visual Studio**.  
2. **File → Open → Project/Solution**.  
3. Open `C:\vince\McWutWebApp\McWutWebApp.slnx`.  
4. At the top, the run profile should be **https** (green play), **not** “Container (Dockerfile)” and **not** Azure.

## Run

1. Press **F5** (or the green play).  
2. Browser should open **https://localhost:7047**. Accept the dev certificate if Windows asks.  
3. Sign in: **`vince@mcwut.com`** / **`vince`**.  
   This is the **toy** password. Prod on mcwut.com uses the password in your personal vault.

If the browser opens `http://localhost:8080` or `mcwut.com`, you picked the wrong profile. Stop (Shift+F5) and choose **https**.

## Where to change things

| Kind of change | Typical place |
|---|---|
| Nav, titles, pages | `Pages\` (Razor) |
| Drop zone behaviour | `wwwroot\js\vault.js` |
| Login / Register rules | `Program.cs`, `appsettings.json` |
| Upload / share rules | `src\FamilyVault.Files\` |

You do not need the Azure portal for this step.

## Save and (later) git

Save files in Visual Studio. When a slice works in Dev **and** QA, you commit and **push to GitHub**. Pushing to `main` is **not** production. It only builds a **QA image** (`:qa`).

Next: [03-test-in-dev.md](03-test-in-dev.md) **before** Docker.
