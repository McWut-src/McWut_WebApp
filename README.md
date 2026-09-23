# McWut

Site for **https://mcwut.com**: sign in, keep your files, share a link, see what others tagged you.

Local login (Dev only): `vince@mcwut.com` / `vince`. Register is **off** until you add people yourself.

## Run

Visual Studio: `McWutWebApp.slnx`, profile **https**.

```
dotnet run --launch-profile https --project McWutWebApp.csproj
```

QA Docker: `http://localhost:8080`

```
docker compose up --build
```

## Docs

- [docs/SCOPE.md](docs/SCOPE.md) — what’s next  
- [docs/archive/](docs/archive/) — finished hosting notes (Path A, deploy options)

**Prod** is not updated by pushing `main`. See SCOPE § environments.

## Layout

- `McWutWebApp.csproj` — website  
- `src/FamilyVault.Files*` — file storage (internal name)  
- `tests/FamilyVault.Files.Tests`  
