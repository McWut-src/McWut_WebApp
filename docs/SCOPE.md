# McWut — current cycle

**Updated:** 26 October 2026  
**Live:** https://mcwut.com · https://www.mcwut.com  
**Handoff:** [HANDOFF.md](HANDOFF.md)  
**Agent guide:** [AGENT.md](AGENT.md)  
**Future ideas:** [IDEAS.md](IDEAS.md)  
**No open Register. No public invite until you send a link.**

Hosting is done ([archive/](archive/)). How you ship: [tutorials/](tutorials/README.md).

---

## Shipped

- Product name **McWut** (with PWA `/manifest.json` for Add-to-Home-Screen). Signed-in home is a dashboard: **My files**, **Vault**, **URLs**, **Messages**, **AI**, **Profile**. Signed-out visitors see the sign-in form. **My files** at `/files`. **Save** stores a private file and keeps it forever, or you can **Record voice** directly from the browser. Keep, download limit (`1` burn-after-reading, `5`, `10`, or unlimited), a password, and a note name are under **Options**. The link icon on a file makes the public `/s/` link. **URLs** at `/urls` shortens a web address and lists every public link you have made (a file share, a whole upload, or a shortened address). You can view, open, or delete each one. Opening a shortened address goes to that address. A file link still shows the file. Older longer links still open. `/Vault` and `/files/shared` redirect to My files. Public `/s/` and `/join` stay open without an account.
- Join only with an invite. `/Identity/Account/Register` is **404**.
- Toy logins on Dev/QA: `vince@mcwut.com` / `vince`, `member@mcwut.com` / `member`.
- **Story** on My files. Words alone are still a text file. Words saved with files become one story in a Stories section, shared as a whole, read only for others. The owner can edit a note or a story in place while keeping its share links, or click **Ask AI** in the Note or Story reader to send its text as context to `/ai`.
- Photo previews, plus inline audio and video playback on My files and on the share page. Short notes and Markdown files can be read on My files and on the share page. Markdown is rendered on the server. Mermaid diagrams in a note, including Gantt charts and mindmaps, are drawn in the browser.
- Admin **People** (turn an account off / on) and **Status**.
- Admin **Reset password** (`/admin/reset-password`) to set another person's McWut sign-in password.
- Personal **Passwords** vault with read-only member sharing (members view and copy only), bare domain support (`facebook.com`), site favicons with lock fallback, an independent **Generate password** box, and JSON export/import (**Download copy** / **Import copy**). **Profile** (`/profile`) sets your name, a color, your own sign-in password, an optional gamer tag, teen color swatches, 64x64 AI header emblems, 120x56 header bar motifs, 80x80 repeating vector background tiles, 5 synthesized Web Audio chime themes, and a Personal AI key (for non-kid accounts). Shared creative tools (stickers, header emblems, motifs, background tiles) use **Site AI** managed in Admin.
- **Messages** (`/messages`). Private 1:1 and custom multi-member group chats (only invited participants in a chat can read it). Supports inline photos, attaching saved items from My files, a 2-layer touch Doodle & Photo Drawing pad, 16 kid-friendly SVG stickers, jumbo emojis, 7-day auto-deleting walkie-talkie voice notes, emoji reactions, tap-to-quote replies, live read receipts (`✓✓ Read`), zero-SQL in-memory typing indicators, Web Audio chimes, and optional browser notifications. The menu shows an unread count.
- **AI** (`/ai`). With no working key, the page explains how to make one and the chat stays off. The key is saved on Profile. Free models are listed by default, with an optional **Paid models** toggle. A reply streams in, and Send can stop it. Markdown is on by default, and a Markdown reply is drawn like a note. A chat can be saved into **Chats** on My files, and can get a public link like any other file.
- Photo gallery thumbnails and large view on My files.
- Privacy page describes what is stored. It is only there once you are signed in.

**Left on purpose:** `Pages/Vault/` folder name, `FamilyVault.*` project names, `McWutWebApp.csproj` name. The Identity Register files stay in the project so the 404 can keep winning. A people icon on My files shares a file with another member. The owner keeps it. The other person can open and download it. There is no Shared files page and no Tag a member label. See [LATER-MEMBER-SHARING.md](LATER-MEMBER-SHARING.md).

**Not built:** generated thumbnail files, email, richer audit UI.

---

## Environments (do not mix)

| | Dev | QA | Prod |
|---|---|---|---|
| | Visual Studio | Docker http://localhost:8080 | Azure |
| Data | Local SQLite | Other SQLite volume | Azure SQL + Blob |
| Register | Off | Off | Off |
| Invite | You test `/join/...` locally | Same | Real people, when you choose |

`git push` ≠ prod. You promote after QA ([tutorials/05-promote-prod.md](tutorials/05-promote-prod.md)).
