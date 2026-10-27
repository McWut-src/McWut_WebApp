# Area: URLs (`/urls`)

Load this before touching anything under `Pages/Urls/`, `wwwroot/js/urls.js`, or `Controllers/ShortLinksController.cs`. Rules unique to this area; shared rules are in `docs/AGENT.md`.

## What it is
Holds **Shorten a link** and the list of public links. A pasted address (including one starting with `www`) becomes an `/s/` link; opening it redirects (302) to the stored address; it stays until deleted. File/upload share links appear on the same list. Short links stay until the owner deletes them — no keep-for time, no click count. Older longer `/s/...` links still open.

## Rules
- Accept only `http` and `https`. If the pasted address has no scheme, store `https://`. Reject `javascript:`, `data:`, `file:`, userinfo, `localhost`, `*.local`, and private/loopback addresses. Rules live in `ShortLinkRules` (`src/FamilyVault.Files`).
- SQLite cannot `ORDER BY` a `DateTimeOffset`; sort after load.

## Endpoints / files
File + drop share list is `GET /api/links` from `ShareLinkService.ListOwnedAsync`; member shares are `GET /api/member-shares`. Revoked links are omitted; expired ones stay so they can be deleted. Revoke is `DELETE /api/links/{token}`. Controller at `/api/short-links`.

## Media (shared with My files)
Photos: jpeg/png/gif/webp, CSS-scaled thumbnails, no generated thumbnail files. Audio/video play inline. SVG/HTML stay downloads.
