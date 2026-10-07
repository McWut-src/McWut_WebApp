# McWut — current cycle

**Updated:** 7 October 2026  
**Live:** https://mcwut.com · https://www.mcwut.com  
**Handoff:** [HANDOFF.md](HANDOFF.md)  
**Agent guide:** [AGENT.md](AGENT.md)  
**No open Register. No public invite until you send a link.**

Hosting is done ([archive/](archive/)). How you ship: [tutorials/](tutorials/README.md).

---

## Shipped

- Product name **McWut**. **My files** at `/files`. **URLs** at `/urls` shortens a web address and lists every public link you have made (a file share, a whole upload, or a shortened address). You can view, open, or delete each one. Opening a shortened address goes to that address. A file link still shows the file. Older longer links still open. `/Vault` and `/files/shared` redirect to My files.
- Join only with an invite. `/Identity/Account/Register` is **404**.
- Toy logins on Dev/QA: `vince@mcwut.com` / `vince`, `member@mcwut.com` / `member`.
- Paste text on My files (stored as a normal text file).
- Photo previews. Short notes and Markdown files can be read on My files and on the share page.
- Admin **People** (turn an account off / on) and **Status**.
- Admin **Reset password** (`/admin/reset-password`) to set another person's McWut sign-in password.
- Personal **Passwords** vault and header **Password** change.
- Photo gallery thumbnails and large view on My files.
- Privacy page describes what is stored.

**Left on purpose:** `Pages/Vault/` folder name, `FamilyVault.*` project names, `McWutWebApp.csproj` name. The Identity Register files stay in the project so the 404 can keep winning. Member-to-member file grants stay in the code and database, and are hidden from the screens. Notes for a later design: [LATER-MEMBER-SHARING.md](LATER-MEMBER-SHARING.md).

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
