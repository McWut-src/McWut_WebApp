# Area: Host plumbing & services (`hosting/`)

Load this before touching anything under `hosting/`. Rules unique to this area; shared rules (promote procedure, live revisions) are in `docs/AGENT.md`.

## What it is
The web application host layer: ASP.NET Core middleware, database startup & cold-start gates, identity seeding & security filters, AI streaming clients, personalization services, and data protection encryption.

## Azure SQL & Cold Start (Do Not Break)
- **Zero SQL on cold start:** The app must listen on port 8080 immediately without opening or querying Azure SQL. `/health`, static assets, and anonymous sign-in form do not touch the database.
- **SqlServerDatabaseGate:** Migrate and identity seed run only on the first request that needs the database, and only if `sql-mcwut` already exists.
- **Never auto-create production database:** A plain `CREATE DATABASE` or EF auto-create provisions General Purpose 2 vCores which cannot pause. Azure SQL serverless must remain serverless.
- **Pause resilience:** Azure SQL serverless pauses (errors 40613 and 42119). `SqlServerDatabaseGate` and `SqlServerDatabaseMiddleware` intercept and retry. Do not add `EnableRetryOnFailure` to EF configuration unless Vince asks.
- **Dev vs QA vs Prod:** Dev and Docker QA use SQLite (`DatabaseStartupWorker`). Production uses `SqlServerDatabaseGate`.

## Identity & Seeding
- **Seed accounts:** Dev and Docker QA seed `vince@mcwut.com` (`vince`, Admin) and `member@mcwut.com` (`member`). Production **never** seeds `member@`. Production sign-in for `vince@mcwut.com` uses the Azure secret `website-admin-password`.
- **Lockout & Role Sync (`RejectLockedOutUsersMiddleware`):** A disabled account is signed out immediately on their next click (401 for API, redirect to login for pages). Role changes (e.g. `Kid` status) are synchronized into the active claims identity on the fly.
- **Roster upsert (`UpsertFamilyMemberFilter`):** Must never overwrite an existing chosen display name and never clear `AccentColor`. Blank display names may be filled.

## Secrets & Data Protection
- **Purpose strings:**
  - Password Vault: `McWut.PasswordVault.v1`
  - OpenRouter API key: `McWut.OpenRouter.v1`
- **Memory caching:** `OpenRouterKeyService` caches keys in memory after initial read. Later chat turns reuse the cached key so chat streams do not keep waking paused Azure SQL.
- **No leak:** Never return unprotected keys or passwords in API responses, logs, or exceptions.

## AI & Family Guardrails
- **Kids restriction (`DisallowKidsAttribute`):** Disallows AI chat and AI personalizations for kid accounts, while preserving permitted messaging features and sticker generation.
- **Clients (`OpenRouterClient`, `GoogleGeminiClient`, `StickerGeneratorService`):** AI requests stream responses to keep browser responsive.

## Do Not
- Do not make `/health` or anonymous pages query the database.
- Do not seed `member@mcwut.com` in production.
- Do not let background services or startup routines wake or create Azure SQL.
