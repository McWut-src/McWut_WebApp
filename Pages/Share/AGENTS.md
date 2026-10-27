# Area: Public share (`/s/{token}`)

Load this before touching anything under `Pages/Share/Index.cshtml.cs`. Rules unique to this area; shared rules are in `docs/AGENT.md`; member-sharing detail is in `LATER-MEMBER-SHARING.md`.

## What it does
Resolves a short link **before** the file link, then redirects (302) to the stored address. File share links are `/s/` plus eight letters or digits; older longer links still open. Invite tokens stay long.

## Links vs files
- The same eight-character space is shared with short-link tokens (`ShortTokenAllocator` checks both tables). A file token shows the file page; a link token redirects away.
- A saved chat copies the same public file link, so it appears on URLs.

## Member shares (people icon)
A people icon on a file row/photo/story/photo card shares that item with another signed-in member — see `LATER-MEMBER-SHARING.md` for full detail. The other person can open and download only; the owner keeps the file. Their name shows as a pill in their profile color (`AccentColor`, or navy `#0b1f3a`).
