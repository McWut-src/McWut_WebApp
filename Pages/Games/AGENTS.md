# Area: Games (`/games`)

Load this before touching anything under `Pages/Games/`, `Controllers/GamesController.cs`, `wwwroot/js/games.js`, or `GameScoreService.cs`. Rules unique to this area; shared rules are in `docs/AGENT.md`.

## What it is
A single-player browser arcade hub where signed-in members play standalone JS games (starting with **Stack 3D** built with Three.js) and compete on a global high-score leaderboard.

## Golden Rules for All Games
1. **HTML / JS Standalone:** Pure single-player client-side execution. Zero server-side game simulation; the browser runs the complete game loop locally.
2. **Global Leaderboard Required:** Every game must integrate with the shared leaderboard (`GET /api/games/{key}/leaderboard` and `POST /api/games/{key}/scores`), tracking personal best scores, combo streaks, and total games played, while displaying member profile flair (display name, accent color pill, emblem badge, and status tag).
3. **Lightweight JS Engines & Vendors:** Games can use Three.js (`wwwroot/lib/three/three.min.js`), Alpine.js, HTML5 2D Canvas, or other lightweight JS vendors. All libraries must be vendored locally in `wwwroot/lib/` (no runtime external CDN calls). 3D/WebGL games must provide an automatic fallback (e.g., 2D isometric projection) for headless/restricted browsers.
4. **Mobile & Tablet Playable:** Every game must be responsive and fully playable via touch on phones and tablets (tap, swipe, touch-drag) as well as keyboard/mouse (Spacebar, Arrows, Click) on desktop. Viewports must resize dynamically across breakpoints (e.g., 390×844 to 1280×900).

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
