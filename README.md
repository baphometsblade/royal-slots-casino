# Matrix Spins

Premium slots lobby — 80 games, plain HTML/CSS/JS, no framework.

## What this project is

- Single-page casino with 80 slot games across 8 providers.
- Deterministic QA tooling for repeatable test scenarios.
- Local persistence for balance, stats, and player progression.
- No framework runtime — vanilla JS split across focused modules.

## Project layout

```text
Casino/
  index.html                  # Markup and UI shell
  styles.css                  # All styling
  constants.js                # All magic numbers, storage keys, timing values
  house-edge-client.js        # Profit protection / RTP enforcement
  sound-manager.js            # Web Audio API sound engine
  animations.js               # Particle / confetti effects
  js/                         # Runtime modules (loaded in order)
    globals.js                #   Global state, utility functions
    auth.js                   #   Local auth (localStorage-based)
    spin-engine.js            #   RNG, grid generation, forced outcomes
    win-logic.js              #   Payline / cluster win detection, payout calc
    ui-lobby.js               #   Game cards, filters, jackpot & win tickers
    ui-slot.js                #   Slot modal, reels, free spins, auto-spin, gamble
    ui-modals.js              #   Stats, settings, deposit, daily bonus, bonus wheel
    qa-tools.js               #   Debug panel, casinoDebug API, URL param handlers
    app.js                    #   Entry point: init, event wiring, state load/save
  shared/
    game-definitions.js       # 80 game definitions (shared with server)
    chrome-styles.js          # Chrome archetype CSS injection
  server/
    index.js                  # Node.js static file server (port 3000)
  assets/
    thumbnails/               # Game card images
    ui/                       # Symbol PNGs, UI icons
  admin/                      # Admin panel
  scripts/
    qa_regression.js          # Playwright regression runner
    *.py                      # Game/asset generator scripts
  screenshots/                # Test/debug screenshot artifacts
  docs/                       # Documentation and enhancement notes
  QUICK_START.md              # Fast local usage guide
  QA.md                       # QA command + URL query guide
```

## Core gameplay

- Start balance: `$5,000`
- Games: `80` unique slots across 8 providers
- Bet ranges vary by game (`$5` up to `$5,000` max bet)
- Win types: payline (3×3, 5×3), cluster pays (6×5, 7×7)
- Features: free spins, tumbling reels, expanding wilds, hold & win, gamble, and more

## Player progression

- XP earned on every spin → levels (Bronze → Silver → Gold → Platinum → Diamond)
- Daily bonus streak with escalating rewards
- Bonus wheel spins for extra credits
- Achievement system tracking milestones

## QA tools

Open Stats panel → expand `QA Tools`, or use URL params:

| Param | Effect |
|-------|--------|
| `qaTools=1` | Auto-open QA panel |
| `openSlot=<gameId>` | Open specific slot on load |
| `spinSeed=<seed>` | Set deterministic RNG seed |
| `forceOutcome=triple\|double\|loss` | Force next spin result |
| `forceSymbol=<symbol>` | Symbol to use with forceOutcome |
| `forceSpin=s1,s2,s3` | Force exact 3-reel outcome |
| `autoSpin=1` | Start auto-spin on load |
| `autoSpinDelay=<ms>` | Auto-spin interval |

See `QA.md` for full examples.

## Run

```bash
# Install dependencies (Playwright for QA)
npm install

# Start dev server on http://localhost:3000
node server/index.js

# Run deterministic regression suite
npm run qa:regression
```

Or just open `index.html` directly in a browser (no server needed for basic use).

## Keyboard shortcuts

| Key | Action |
|-----|--------|
| `Space` | Spin (when slot is open) |
| `F` | Toggle fullscreen |
| `Esc` | Close active modal |

## CI

GitHub Actions (`.github/workflows/qa-regression.yml`) runs on push/PR:

1. `npm ci`
2. `npx playwright install --with-deps chromium`
3. `npm run qa:regression`

Regression artifacts upload from `output/web-game/regression/`.
