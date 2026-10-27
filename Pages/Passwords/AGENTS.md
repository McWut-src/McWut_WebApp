# Area: Passwords vault (`/passwords`)

Load this before touching anything under `Pages/Passwords/` and `wwwroot/js/passwords.js`. Rules unique to this area; shared rules are in `docs/AGENT.md`.

## What it is
The signed-in person's own saved logins. Search on top, list on the left, details on the right. Another member cannot open your list. Separate from admin reset-password and from My files.

## Storage & export
- Fields: name, username, password, url, information. Encrypted at rest with ASP.NET Data Protection, purpose `McWut.PasswordVault.v1`.
- **Download copy**: `GET /api/passwords/export` → plaintext JSON named `<shown name>.json`, not stored again.
- **Import copy**: `POST /api/passwords/import` skips exact duplicates.

## Behavior
Search runs in the browser and skips the password field. Values are encrypted at rest; never expose them.
