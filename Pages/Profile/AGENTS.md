# Area: Profile (`/profile`)

Load this before touching anything under `Pages/Profile/`. Rules unique to this area; shared rules are in `docs/AGENT.md`.

## What it stores
Display name (not an email), a chosen color, the person's own sign-in password change, and their OpenRouter key for AI. Light/dark is `localStorage` key `mcwut-theme` on **this browser only** — not a DB column. The color is any `#rrggbb`; it paints the signed-in bar and menu. A pale color (luminance above 160) uses navy text `#0b1f3a`; a darker color uses white.

## Branding & nav
- The signed-in header shows that person's name, linking back to the dashboard. Desktop and phone menus use the same color. Public `/s/` and `/join/` keep the navy McWut bar even when signed in.
- Sidebar collapses to icons: `localStorage` key `mcwut-nav` (`icons` or `names`) sets class `is-rail` on `<html>`. Scope that CSS to `.sidebar` so the phone menu stays labeled.

## Guardrails
- The same color marks that person on a member share; it is never shown on a public link or `/join/`.
- `FamilyRoster.UpsertAsync` must not replace a chosen display name and must not clear `AccentColor`; it may fill a blank name.
- `/account/password` redirects to Profile; admin reset password stays at `/admin/reset-password`. Keep internal project names `McWutWebApp` and `FamilyVault.*`.
