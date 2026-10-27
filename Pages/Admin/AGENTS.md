# Area: Admin (`/admin`)

Load this before touching anything under `Pages/Admin/`. Rules unique to this area; shared rules are in `docs/AGENT.md`.

## People (`/admin/people`)
Turn an account off or back on. Files stay. You cannot turn yourself off, and the last admin must stay on. A turned-off person is signed out on their next click.

## Reset password (`/admin/reset-password`)
Admin sets a new McWut sign-in password for any account — separate from the personal Passwords vault.

## Status (`/admin/status`)
Shows database reachable, storage kind, and counts. No passwords on this page.

## Health
`/health` returns `ok`. Leave it alone — Azure uses it. It does not query Azure SQL.
