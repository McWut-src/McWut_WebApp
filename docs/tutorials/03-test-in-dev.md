# 3 — Test in Dev

Still Visual Studio, still **https://localhost:7047**. No Docker, no Azure.

## Checklist (current product)

With the site running (F5):

1. Brand in the header is **McWut** (not McWutWebApp).  
2. After login, nav shows **My files** and **Vault**. There is no Shared files item.  
3. Open: `https://localhost:7047/Identity/Account/Register`  
   You want **404 / not found**, not a form.  
4. **My files:** drop a **non-empty** file, get a link, copy it.  
5. Private window: open that `/s/...` link **without** signing in, download.  
6. `/files/shared` and old `/Vault` redirect to **My files**. There is no Tag a member control.  
7. Signed in as admin: **Invites** in the nav. Create a link, open `/join/...` in a private window (or second browser).  
8. URL **`/files`** is My files.  
9. Paste a sentence on **My files**. Private window: the `/s/...` page shows that sentence.  
10. A jpeg or png shows a small preview in the list and on the share page.  
11. **People** and **Status** open. Status does not show a connection string. `/health` is `ok`.

If something fails, fix it in Visual Studio and repeat this list. Do **not** start Docker until this list is boring.

## Stop Dev

Visual Studio: **Shift+F5** (stop debugging).

## Next

[04-qa-docker.md](04-qa-docker.md) — same checks, but the site runs in Docker so you know the **server image** works, not only F5.
