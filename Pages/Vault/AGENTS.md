# Area: My files (`/files`) — the Vault folder

Load this before touching anything under `Pages/Vault/` (served at `/files`). Shared rules are in `docs/AGENT.md`; member-sharing detail is in `LATER-MEMBER-SHARING.md`.

## What it is
Home dashboard's first card. Six places, in order: **My files** (`/files`), **Vault** (`/passwords`), **URLs** (`/urls`), **Messages** (`/messages`), **AI** (`/ai`), **Profile** (`/profile`). Do not add a Home nav item.

## Save vs Options
- **Save**: stores a private file, kept forever. Does not create a share link.
- **Options**: keep for 1/7/30 days and/or set a password (asked when opening a share link). The owner still opens the file.
- Composer field is **Story**. Words alone stay a text file; with no title they save as `note`; words saved with one or more files become one story. My files lists sections: **Stories**, then **Chats**, then **Photos**, then **Files**. Files in a story are not listed again as loose photos/files.

## Sharing
- A people icon shares a file/story with another signed-in member (see `LATER-MEMBER-SHARING.md`). The other person can open and download only; the owner keeps the file. Their name shows as a pill in their profile color (`AccentColor`, or navy `#0b1f3a`); no name → email-before-`@`.
- When someone shared a file with you, My files shows a **From others** group (only when non-empty). The URLs page lists those member shares with the same pill, no public address, Quick open back to `/files#file={id}`, and Remove share. Permission is always Download.

## Media & reading
- Photos: jpeg/png/gif/webp; thumbnail is the photo scaled with CSS — do not generate thumbnail files. Audio/video (mp4/webm/mov/mp3/m4a/wav/ogg) play inline. SVG/HTML stay downloads.
- Notes/.txt/.csv/.json/.md are readable here and on share pages; the owner can edit a note (`PUT /api/files/{id}/text`) or story (`PUT /api/stories/{id}`) in place, keeping its link. Markdown renders server-side (Markdig); Mermaid draws in-browser. Links/images keep only http/https. Opening a view does not count as a download.

## Do not
- Do not invent folders — a saved chat is a section on My files, not a folder.
