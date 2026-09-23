# McWut — current cycle

**Updated:** 23 September 2026  
**Live:** https://mcwut.com · https://www.mcwut.com (previous release until **you** promote)  
**No open Register. No public invite until you send a link.**

Hosting is done ([archive/](archive/)). How you ship: [tutorials/](tutorials/README.md).

---

## This cycle (in order)

### 1. Leftover / archive
- Hosting write-ups already in `docs/archive/`.
- Still messy in the **app**: `/Vault` URLs, `FamilyController` name, toy user `family@`, empty Privacy page, Identity **Register** page still in the UI library (must stay 404).
- **Not this cycle:** renaming `McWutWebApp.csproj` or `FamilyVault.*` namespaces (breaks Docker/Azure/git for no user benefit).

### 2. Renaming (what people see)
- Product name **McWut**.
- **My files** / **Shared files**.
- URLs `/files` and `/files/shared` (old `/Vault` redirects).
- No “Family” in the UI. Second toy login becomes `member@mcwut.com` / `member` (Dev/QA only).

### 3. Join **only with an invitation**
- `/Identity/Account/Register` stays **404**.
- You (Admin) create an invite → copy a link like `https://mcwut.com/join/{token}`.
- They set email + password. Token is one-use and expires (default 7 days).
- Optional: lock the invite to one email.

**You added / we agree later:** pastes, thumbnails, richer admin (disable users, health). Not this cycle.

---

## Environments (do not mix)

| | Dev | QA | Prod |
|---|---|---|---|
| | Visual Studio | Docker http://localhost:8080 | Azure |
| Data | Local SQLite | Other SQLite volume | Azure SQL + Blob |
| Register | Off | Off | Off |
| Invite | You test `/join/...` locally | Same | Real people, when you choose |

`git push` ≠ prod. You promote after QA ([tutorials/05-promote-prod.md](tutorials/05-promote-prod.md)).
