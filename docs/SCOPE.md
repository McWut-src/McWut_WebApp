# McWut — current cycle

**Updated:** 7 October 2026  
**Live:** https://mcwut.com · https://www.mcwut.com  
**Handoff:** [HANDOFF.md](HANDOFF.md)  
**Agent guide:** [AGENT.md](AGENT.md)  
**No open Register. No public invite until you send a link.**

Hosting is done ([archive/](archive/)). How you ship: [tutorials/](tutorials/README.md).

---

## Shipped

- Product name **McWut**. Signed-in home is a dashboard: **My files**, **Vault**, **URLs**, **Profile**. Signed-out visitors see the sign-in form. **My files** at `/files`. **Save** stores a private file and keeps it forever. Keep, a password, and a note name are under **Options**. The link icon on a file makes the public `/s/` link. **URLs** at `/urls` shortens a web address and lists every public link you have made (a file share, a whole upload, or a shortened address). You can view, open, or delete each one. Opening a shortened address goes to that address. A file link still shows the file. Older longer links still open. `/Vault` and `/files/shared` redirect to My files. Public `/s/` and `/join` stay open without an account.
- Join only with an invite. `/Identity/Account/Register` is **404**.
- Toy logins on Dev/QA: `vince@mcwut.com` / `vince`, `member@mcwut.com` / `member`.
- **Story** on My files. Words alone are still a text file. Words saved with files become one story in a Stories section, shared as a whole, read only.
- Photo previews. Short notes and Markdown files can be read on My files and on the share page. Markdown is rendered on the server. Mermaid diagrams in a note, including Gantt charts and mindmaps, are drawn in the browser.
- Admin **People** (turn an account off / on) and **Status**.
- Admin **Reset password** (`/admin/reset-password`) to set another person's McWut sign-in password.
- Personal **Passwords** vault. **Profile** (`/profile`) sets your name, a color for later, and your own sign-in password.
- Photo gallery thumbnails and large view on My files.
- Privacy page describes what is stored. It is only there once you are signed in.

**Left on purpose:** `Pages/Vault/` folder name, `FamilyVault.*` project names, `McWutWebApp.csproj` name. The Identity Register files stay in the project so the 404 can keep winning. A people icon on My files shares a file with another member. The owner keeps it. The other person can open and download it. There is no Shared files page and no Tag a member label. See [LATER-MEMBER-SHARING.md](LATER-MEMBER-SHARING.md).

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
