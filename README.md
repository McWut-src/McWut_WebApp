# McWut

Site for **https://mcwut.com**: sign in, keep your files, share a link, see what others tagged you.

Local login (Dev only): `vince@mcwut.com` / `vince`. Register is **off** until you add people yourself.

## Run

Visual Studio: `McWutWebApp.slnx`, profile **https**.

```
dotnet run --launch-profile https --project McWutWebApp.csproj
```

How to work, from planning to **you** promoting prod: [docs/tutorials/README.md](docs/tutorials/README.md).

If you are picking this up alone: [docs/HANDOFF.md](docs/HANDOFF.md).

## Docs

- [docs/HANDOFF.md](docs/HANDOFF.md) — how to run, test, and promote  
- [docs/SCOPE.md](docs/SCOPE.md) — what’s done and what is left  
- [docs/archive/](docs/archive/) — finished hosting notes (Path A, deploy options)

**Prod** is not updated by pushing `main`. See SCOPE § environments.

## Layout

- `McWutWebApp.csproj` — website  
- `src/FamilyVault.Files*` — file storage (internal name)  
- `tests/FamilyVault.Files.Tests`  
