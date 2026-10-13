# Quiet member sharing

**Written:** 6 October 2026  
**Updated:** 13 October 2026  
**Status:** On My files and URLs. There is still no Shared files page.

A people icon shares one file with one signed-in member. The public link stays the normal way to share with someone who is not on McWut.

## What the screens do

- **My files** keeps **Copy link** and **Download**. Download is still a direct download.
- The people icon is titled “Share with a member”. It sits on the file row, on a photo card, on a story, and in the photo, note, and story readers beside Download. It does not say Tag a member. A story is the words plus the files saved together. Sharing it shares that whole story. The other person can read and download it, and cannot delete it or share it again.
- The menu lists other members by display name, with a round swatch in their profile color. If they have not chosen a name, the tag shows the part of their email before @. The full address is not shown. If nobody else has joined, it says “No one else is on McWut yet.”
- Checking a name shares that file. Unchecking removes the share. The file is not copied. The owner keeps it.
- After a share, the file shows a small pill: the member’s color as the background, their name in white or navy.
- When at least one file has been shared with the signed-in person, a **From others** group appears under their own files. It is hidden when empty. Those rows can be opened and downloaded. There is no delete, no copy link, and no share menu.
- **URLs** lists the member share next to public links. The meta line is the color pill. There is no public address. Quick open returns to the file. Remove share revokes access and leaves the file in My files.
- There is no **Shared files** item. `/files/shared` and `/Vault/Shared` redirect to My files.
- The color is not shown on a public `/s/` link.

## Access

Reuse `FileGrants`. No new table. `POST /api/files/{id}/grants` from this menu stores `Download` only, so the other person can list, preview, and download. They cannot delete, re-share, or make a public link. Only the owner can grant or revoke. A deleted or expired file drops off From others and off the URLs member list. Outgoing rows are `GET /api/member-shares`.

Do not send email. The other person sees the file the next time they open My files. The share lasts as long as the file.

## What not to bring back

The old tag menu sat on every row and **Shared files** looked like a third main product. Leave those out. Do not put a person picker inside Download, and do not label this control Tag a member.
