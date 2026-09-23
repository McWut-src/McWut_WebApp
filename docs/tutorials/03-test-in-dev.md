# 3 — Test in Dev

Still Visual Studio, still **https://localhost:7047**. No Docker, no Azure.

## Checklist (current product)

With the site running (F5):

1. Brand in the header is **McWut** (not McWutWebApp).  
2. After login, nav shows **My files** and **Shared files** (not Vault / Family vault).  
3. Open: `https://localhost:7047/Identity/Account/Register`  
   You want **404 / not found**, not a form.  
4. **My files:** drop a **non-empty** file, get a link, copy it.  
5. Private window: open that `/s/...` link **without** signing in, download.  
6. Optional: **Shared files** page loads (may be empty).

If something fails, fix it in Visual Studio and repeat this list. Do **not** start Docker until this list is boring.

## Stop Dev

Visual Studio: **Shift+F5** (stop debugging).

## Next

[04-qa-docker.md](04-qa-docker.md) — same checks, but the site runs in Docker so you know the **server image** works, not only F5.
