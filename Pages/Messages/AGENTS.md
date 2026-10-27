# Area: Messages (`/messages`)

Load this before touching anything under `Pages/Messages/`, `Controllers/MessagesController.cs`, or `wwwroot/js/messages.js`. Rules unique to this area; shared rules are in `docs/AGENT.md`.

## What it is
A private note between two members. **New** picks another member; the same pair always opens the same conversation; a person cannot message themselves; only the two of them can read it. An admin does not get a view of other people's messages.

## Behavior rules
- Text stored as written, up to 2000 characters. The page draws it with safe DOM text nodes and turns `http(s)://`, `/s/…`, and `/files#…` into clickable anchors.
- Conversation search filters threads by member or preview. The list shows the other person's name + profile color; a missing name uses the part of their email before `@`; a missing color is navy `#0b1f3a`.
- Unread is a count on that row and on the Messages menu item. Opening the thread marks messages you can see as read. It polls every few seconds while open — not on other pages. The menu count is read when a signed-in page loads (which already uses the DB).

## Endpoints / files
`GET /api/messages` lists conversations; `POST /api/messages` opens one (`userId`); `GET /api/messages/{id}` reads the latest 200 with `?before=`/`?after=`; `POST /api/messages/{id}` sends; `POST /api/messages/{id}/read` marks read through a message id.
- SQLite cannot `ORDER BY` a `DateTimeOffset`; sort the conversation list after load. Message order uses a number, `Sequence`.
- Rules are `DirectMessageRules`; service is `DirectMessageService`, both in `src/FamilyVault.Files`. See `docs/AGENT.md`.
