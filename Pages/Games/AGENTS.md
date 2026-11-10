# Area: Games (`/games`)

Load this before touching anything under `Pages/Games/`, `Controllers/GamesController.cs`, `wwwroot/js/games.js`, or `GameScoreService.cs`. Rules unique to this area; shared rules are in `docs/AGENT.md`.

## What it is
A single-player browser arcade hub where signed-in members play standalone JS games (starting with **Stack 3D** built with Three.js) and compete on a global high-score leaderboard.

## Behavior rules
- Each member has one leaderboard record per `GameKey` (`GameScores` table, unique index on `(GameKey, UserId)`), tracking `BestScore`, `BestCombo`, `GamesPlayed`, `AchievedAt`, and `LastPlayedAt`.
- Submitting a score increments `GamesPlayed`, updates `BestCombo` if higher, and replaces `BestScore` + `AchievedAt` only when the new score beats the player's previous record.
- Leaderboard rows sort in memory (`BestScore` descending, then `BestCombo` descending, then earlier `AchievedAt` ascending) because SQLite cannot `ORDER BY` a `DateTimeOffset`.
- Player rows render the member's `DisplayName` (resolved via `MemberLabel.Shown`), profile `AccentColor` pill (`#0b1f3a` fallback), optional `HeaderBadge` emblem, and `StatusTag`.
- Three.js is vendored locally at `wwwroot/lib/three/three.min.js`. `wwwroot/js/games.js` uses `THREE.WebGLRenderer` with an automatic 2D isometric canvas projection fallback if WebGL context creation is unavailable on a headless or restricted device.

## Endpoints / files
- `GET /api/games` returns the game catalog (`GameScoreRules.Catalog`).
- `GET /api/games/{gameKey}/leaderboard` returns `GameLeaderboardView` (top players + signed-in player's record and rank).
- `POST /api/games/{gameKey}/scores` submits `{ score, maxCombo }` and returns `GameScoreSubmissionView`.
- Rules live in `GameScoreRules` (`src/FamilyVault.Files/Security/GameScoreRules.cs`); service is `GameScoreService` (`src/FamilyVault.Files/Services/GameScoreService.cs`).
