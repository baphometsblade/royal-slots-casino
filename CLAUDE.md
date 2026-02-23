# Casino — CLAUDE.md

## Project Overview

**Matrix Spins** — a browser-based slot machine casino.
Single-page app (`index.html`) served by an Express/Node server on port 3000.
80+ slot games, JWT + localStorage auth, server-side RNG verification, house-edge enforcement.

## Running the Project

```bash
npm start          # production server (port 3000)
npm run dev        # same — node server/index.js
npm run qa:regression  # Playwright smoke suite (must pass before committing)
```

Dev server is configured in `.claude/launch.json` — use `preview_start("Casino Server")`.

## Architecture

### Client-side (`index.html` + `js/`)

Script load order matters — dependencies flow top to bottom:

```
constants.js              ← all named constants, no dependencies
shared/game-definitions.js ← 80+ game configs (GAMES array)
shared/chrome-styles.js   ← per-game CSS theme data
house-edge-client.js      ← client RNG helper
sound-manager.js          ← Web Audio synth
animations.js             ← particle/confetti helpers
js/globals.js             ← shared mutable state + utility functions
js/auth.js                ← login/register/session
js/spin-engine.js         ← grid generation, symbol helpers, RNG queue
js/win-logic.js           ← win evaluation, scatter/bonus dispatch
js/ui-lobby.js            ← lobby render, game filters, win ticker
js/ui-slot.js             ← reel UI, spin animation, slot lifecycle (~2200 lines)
js/ui-modals.js           ← settings, stats, XP, daily bonus, bonus wheel
js/qa-tools.js            ← QA panel, deterministic seed, forced outcomes
js/app.js                 ← bootstrap (initAllSystems via DOMContentLoaded), keyboard shortcuts
```

All scripts run in the **global scope** (no ES modules). Functions defined in one file are
available to all files loaded after it. `constants.js` must always be first.

### Server-side (`server/`)

Express app — JWT auth, SQLite via sql.js, house-edge enforcement, rate limiting.

```
server/index.js       ← entry point, middleware, route wiring
server/config.js      ← env config
server/database.js    ← sql.js init + schema
server/routes/        ← auth, spin, user routes
server/services/      ← business logic
server/middleware/    ← JWT verify, rate limit helpers
```

## Key Conventions

### Constants
All magic numbers live in `constants.js`. **Never** hardcode:
- localStorage key strings → use `STORAGE_KEY_*`
- Win tier thresholds → use `WIN_TIER_EPIC/MEGA/BIG/GREAT_THRESHOLD`
- XP awards → use `XP_AWARD_PER_SPIN / XP_AWARD_BIG_WIN / XP_AWARD_REGULAR_WIN`
- Timing values → use the named timing constants
- RNG algorithm constants → `FNV_OFFSET_BASIS`, `FNV_PRIME`, `DEFAULT_SEED_STATE`, etc.

### State
All shared mutable state lives in `js/globals.js`:
`balance`, `currentGame`, `spinning`, `stats`, `deterministicSeed`, free-spin state, etc.

`appSettings` is initialised by calling `loadSettings()` in `initBase()` — it is **not**
lazy; it must be populated before any modal opens.

### Storage Key Aliases
Some modules use short aliases for convenience — these are defined in `globals.js` and
always point to the canonical `STORAGE_KEY_*` constant:
```js
const RECENTLY_PLAYED_KEY = STORAGE_KEY_RECENTLY_PLAYED;
const XP_STORAGE_KEY      = STORAGE_KEY_XP;
const DAILY_BONUS_KEY     = STORAGE_KEY_DAILY_BONUS;
const WHEEL_STORAGE_KEY   = STORAGE_KEY_BONUS_WHEEL;
```

## QA / Testing

```bash
npm run qa:regression   # full deterministic smoke test (Playwright headless)
```

Regression verifies:
- Lobby loads + `window.render_game_to_text` is available
- Stats modal opens
- QA tools can apply a deterministic seed and force a triple outcome
- Forced spin resolves to `seven,seven,seven` with a win
- Reset with "clear deterministic seed" restores default state
- No new `console.error` / `pageerror` output

**QA must pass before every commit.**

Artifacts written to `output/web-game/regression/`.
On failure: `errors.json` + `failure-shot.png` appear there.

### QA URL Parameters (manual testing)
| Param | Effect |
|---|---|
| `qaTools=1` | Auto-open QA panel |
| `openSlot=<gameId>` | Open a specific slot on load |
| `spinSeed=<seed>` | Enable seeded RNG |
| `forceOutcome=triple\|double\|loss` | Force next spin outcome |
| `forceSymbol=<symbol>` | Guide forced outcome symbol |
| `forceSpin=a,b,c` | Exact next reel symbols |
| `autoSpin=1` | Trigger one automatic spin |
| `noBonus=1` | Suppress daily bonus modal |

## Environment Setup

Create `.env` in the project root (optional — defaults work for local dev):

```bash
PORT=3000
JWT_SECRET=dev-secret-change-in-production
ADMIN_PASSWORD=admin123changeme
NODE_ENV=development
DB_PATH=./casino.db
```

- `casino.db` is **auto-created** on first `npm start` if it doesn't exist (sql.js in-process SQLite).
- `casino.db` is gitignored — never commit it.
- No `.env` file is required for local dev; all values have safe defaults.

## Admin Panel

Static HTML panel at `admin/index.html` — open via browser after starting the server.
Calls `GET /api/admin/stats` (requires admin JWT). Admin password set via `ADMIN_PASSWORD` env var.

## Gotchas

- **Dual auth (silent fallback):** The app prefers server JWT auth but silently falls back to localStorage-only mode when the server is unreachable. Both modes are transparent to the user.
- **Port confusion:** `QUICK_START.md` references port 4173 (old static-file workflow). The real app runs on port 3000 via `npm start`. Always use `http://localhost:3000`.
- **House edge is server-enforced:** 88% RTP, $50k session win cap, 500x max win multiplier — all in `server/config.js`. Client-side win calculations are for display only; server has final say.
- **QA regression uses its own base URL:** The Playwright suite hits `http://localhost:3000` via the preview server — always run `npm start` (or `preview_start`) before `npm run qa:regression`.
- **`appSettings` is not lazy:** It must be populated before any modal opens. `loadSettings()` is called as the first line of `initBase()`. Do not call modal-open functions before `initBase()` runs.

## Asset Generation

AI-generated game assets via Python scripts in `scripts/`:
```bash
npm run reasset:slot-chrome          # SDXL, high contrast
npm run reasset:slot-chrome:auto     # auto engine
npm run reasset:slot-chrome:balanced # balanced style
```

Requires Python 3.10 + configured AI image backend.

## Commit Style

Conventional commits with Co-Author trailer:
```
<type>: <short description>

<body>

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

Types used: `feat`, `fix`, `refactor`, `chore`, `docs`.
