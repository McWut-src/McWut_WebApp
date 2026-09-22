# McWut

Family site for **mcwut.com**: sign in, keep your files, share a link, see what family tagged you.

This repo is the ASP.NET Core 10 app (`McWutWebApp`). Local login (dev):

- `vince@mcwut.com` / `vince` (admin)
- `family@mcwut.com` / `family`

Change those before the site is on the internet.

## Run locally

Visual Studio: open `McWutWebApp.slnx`, profile **https** (`https://localhost:7047`).

Or:

```
dotnet run --launch-profile https --project McWutWebApp.csproj
```

Docker on this PC: `http://localhost:8080`

```
docker compose up --build
```

## Docs

All write-ups live in [`docs/`](docs/).

| File | What it is |
|---|---|
| [docs/SCOPE.md](docs/SCOPE.md) | Product map (dashboard, admin, pastes, hosting choice) |
| [docs/STATUS.md](docs/STATUS.md) | What already works |
| [docs/PATH-A.md](docs/PATH-A.md) | Azure production runbook (You vs Me) |
| [docs/DEPLOY.md](docs/DEPLOY.md) | All hosting options and rough prices |
| [docs/AGENT.md](docs/AGENT.md) | File-vault engineering brief |

## Hosting

**Path A:** Azure Container Apps + Azure SQL (free tier, already created) + Blob. Follow [docs/PATH-A.md](docs/PATH-A.md). Local stays SQLite + disk until that code lands.

## Layout

- `McWutWebApp.csproj` — website (Razor Pages + API)
- `src/FamilyVault.Files.Contracts` — vault contracts
- `src/FamilyVault.Files` — EF, local disk store, domain services
- `tests/FamilyVault.Files.Tests` — unit tests
