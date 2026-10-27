# Agent

Read [docs/AGENT.md](docs/AGENT.md) before changing this repo. The live site and the promote rule are there.

Operating notes for Vince are in [docs/HANDOFF.md](docs/HANDOFF.md). What is shipped is in [docs/SCOPE.md](docs/SCOPE.md). Future ideas are in [docs/IDEAS.md](docs/IDEAS.md).

`docs/archive/AGENT.md` is an old brief. Do not follow it.

## How context flows here (50k cap)

- **Always load first:** this file + `docs/AGENT.md`. That pair is the constitution — live site state and the promote rule.
- **Before editing anything in a folder, check for a nested AGENTS.md along that path** (e.g. `Pages/Ai/AGENTS.md`). It holds only rules unique to that area; it defers to `docs/AGENT.md` for shared rules. Load it before work there.
- **Reference-only (read on demand, never every turn):** `docs/HANDOFF.md` (deploy/run notes), `docs/SCOPE.md` (living product list), `docs/IDEAS.md` (future ideas). They are large — loading all of them each call wastes budget and dilutes focus.
- Shared rules live in `docs/AGENT.md`, not duplicated here. If an area file looks like it is repeating the promote rule or naming conventions, move it up instead.
