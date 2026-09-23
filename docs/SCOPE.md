# McWut — what’s next

**Updated:** 22 September 2026  
**Live:** https://mcwut.com and https://www.mcwut.com  
**No public invite** until you say so.

Hosting Path A is **done**. Old runbooks live in [`archive/`](archive/).

---

## Now (this slice)

1. **No self-serve Register.** `/Identity/Account/Register` must 404 unless `Identity:AllowRegistration` is on. People join only when you add them (admin later).  
2. **Names:** nav and pages say **My files** and **Shared files**, not Vault / Family vault.  
3. **Drop the word “Family”** in the UI and public copy. The product is **McWut**. (Code namespaces `FamilyVault.*` stay for now.)

---

## Next (after this ships)

Keep the Dev → **QA Docker** → **manual prod** rule ([§ environments](#environments-dev--qa--prod)). Do not auto-push Azure.

Then, in order:

1. **You** follow [tutorials/](tutorials/README.md): plan → Dev → test in Dev → QA Docker → **you** promote prod.  
2. **Admin** (you only): create/disable users so you never need open Register.  
3. **Pastes** (private or shared with members).  
4. Thumbnails, revoke-link buttons, etc.

---

## Environments (Dev / QA / Prod)

| | **Dev** | **QA** | **Prod** |
|---|---|---|---|
| | Visual Studio | Local Docker `http://localhost:8080` | Azure + GitHub |
| Data | SQLite `App_Data/` | Other SQLite volume | Azure SQL + Blob |
| Users | Toys `vince` / `vince` | Throwaway | Real accounts only |
| Register | Off | Off | Off |

Push to `main` builds GHCR **`:qa`** only. Prod image = manual workflow or git tag `v*`, then `az containerapp update` to that SHA. Never point Dev/QA at prod SQL or Blob.

---

## Product (still true)

- **My files** — your library + drop a file, get a link.  
- **Shared files** — read-only, tagged to you.  
- Public `/s/{token}` — optional password.  
- Pastes, admin, thumbnails — later.  
- No Drive folder tree.

Max ~30 people, no rush to invite.

---

## Archive

| File | Why it’s archived |
|---|---|
| [archive/PATH-A.md](archive/PATH-A.md) | Azure go-live checklist (complete) |
| [archive/DEPLOY.md](archive/DEPLOY.md) | Hosting options A–E |
| [archive/STATUS.md](archive/STATUS.md) | Early implementation status |
| [archive/AGENT.md](archive/AGENT.md) | Original vault contracts brief |
