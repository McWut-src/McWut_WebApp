# Member sharing — later

**Written:** 6 October 2026  
**Status:** Hidden from the screens. Public share links stay.

Vince asked to take member-to-member sharing off the product for now. A link is enough. This note is here so the idea can come back without putting a control on every file again.

## What the screens do now

- **My files** uploads a file or a note and gives a link. Optional link password. Optional keep time.
- Anyone with that link can open it until it expires or the file is deleted.
- **Vault** is still personal. Other members cannot open it.
- There is no **Shared files** item and no **Tag a member** control.
- `/files/shared` and `/Vault/Shared` redirect to My files.

## What was left in the code

The grant tables, `POST /api/files/{id}/grants`, and `GET /api/files/shared-with-me` are still in the project. Old grant rows in the database stay. Nothing on the screens calls them. Do not delete that code until a later design replaces it. Do not build a new member-share screen on top of the old row dropdown.

## Why the old screen felt wrong

The tag menu sat on every photo and every file. **Shared files** sat next to **My files** and **Vault**, so it looked like a third main product. Most of the time there was nothing there. The link already did the sharing.

## If this comes back

Keep the link as the normal way to share. Member delivery should be easy to miss until someone wants it.

1. Leave **Copy link** as the action on the file. Do not put a person picker back on the row.
2. If a file should also appear for a signed-in member, put that choice inside the share step, after the link exists. One small optional line is enough: “Also show this to someone on McWut.”
3. Do that once for the drop, not once per photo and once per file.
4. Do not add a top-level nav item for an empty list. If a member has files from someone else, show a short **From others** group on My files, and only when that list is not empty.
5. Do not print other people’s email addresses on the file row. A name inside the share step is enough.
6. Do not send email until someone asks for it. The member sees the file the next time they open My files.
7. Use the same keep time and the same link password as the file. A member grant should not outlive the file.
8. Viewing stays view and download. No editing someone else’s file.

That keeps two primary places, **My files** and **Vault**, and makes member sharing a quiet extra on the link.
