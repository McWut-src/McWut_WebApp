# McWut — current cycle

**Updated:** 6 October 2026  
**Live:** https://mcwut.com · https://www.mcwut.com  
**Handoff:** [HANDOFF.md](HANDOFF.md)  
**No open Register. No public invite until you send a link.**

Hosting is done ([archive/](archive/)). How you ship: [tutorials/](tutorials/README.md).

---

## Shipped

- Product name **McWut**. **My files** / **Shared files**. URLs `/files` and `/files/shared` (`/Vault` redirects).
- Join only with an invite. `/Identity/Account/Register` is **404**.
- Toy logins on Dev/QA: `vince@mcwut.com` / `vince`, `member@mcwut.com` / `member`.
- Paste text on My files (stored as a normal text file).
- Photo previews, and the text of a short note on the share page.
- Admin **People** (turn an account off / on) and **Status**.
- Admin **Reset password** (`/admin/reset-password`) to set another person's McWut sign-in password.
- Personal **Passwords** vault and header **Password** change.
- Photo gallery thumbnails and large view on My files and Shared files.
- Privacy page describes what is stored.

**Left on purpose:** `Pages/Vault/` folder name, `FamilyVault.*` project names, `McWutWebApp.csproj` name. The Identity Register files stay in the project so the 404 can keep winning.

**Not built:** generated thumbnail files, video previews, email, richer audit UI.

---

## Environments (do not mix)

| | Dev | QA | Prod |
|---|---|---|---|
| | Visual Studio | Docker http://localhost:8080 | Azure |
| Data | Local SQLite | Other SQLite volume | Azure SQL + Blob |
| Register | Off | Off | Off |
| Invite | You test `/join/...` locally | Same | Real people, when you choose |

`git push` ≠ prod. You promote after QA ([tutorials/05-promote-prod.md](tutorials/05-promote-prod.md)).
