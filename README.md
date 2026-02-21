# Royal Slots Casino

Premium-style slots lobby built with plain HTML, CSS, and JavaScript.

## What this project is

- Single-page casino demo with 17 slot games.
- Deterministic QA tooling for repeatable test scenarios.
- Local persistence for balance and player stats.
- No framework runtime in production app code.

## Current file layout

```text
Casino/
  index.html                  # Markup and UI structure
  styles.css                  # All styling
  app.js                      # All runtime game logic
  scripts/
    qa_regression.js          # Automated Playwright regression runner
  QA.md                       # QA command + URL query guide
  QUICK_START.md              # Fast local usage guide
  progress.md                 # Ongoing work log / handoff notes
```

## Core gameplay

- Start balance: `$5,000`
- Games: `17` unique slot entries
- Bet ranges vary by game (`$5` up to `$10,000` max bet)
- Win rules:
- Triple match: `bet * triple payout`
- Double match: `bet * double payout`
- No match: no payout

## Persistence and state

- Balance and stats persist in localStorage.
- Main storage keys:
- `casinoBalance`
- `casinoStats`
- Runtime state export for automation:
- `window.render_game_to_text()`
- Time-step hook for automation:
- `window.advanceTime(ms)`

## QA tools in app

Open Stats, then expand `QA Tools`:

- Set/clear deterministic seed
- Queue outcome (`triple`, `double`, `loss`)
- Queue exact reels (`symbol,symbol,symbol`)
- Queue + spin shortcuts
- Reset balance/stats
- Optional reset mode: clear deterministic seed on reset

## URL query params for QA

- `qaTools=1`
- `qaResetClearSeed=1`
- `openSlot=<gameId>`
- `spinSeed=<seed>`
- `forceOutcome=triple|double|loss`
- `forceSymbol=<symbol>`
- `forceSpin=symbolA,symbolB,symbolC`
- `autoSpin=1`
- `autoSpinDelay=<ms>`

See `QA.md` for full examples.

## Run

### Manual

- Open `index.html` directly in a browser, or
- Serve the folder with any static server.

### Automated regression

```bash
npm run qa:regression
```

This runs a deterministic Playwright smoke flow and writes artifacts to:

```text
output/web-game/regression/
```

## Keyboard shortcuts

- `F`: toggle fullscreen
- `Esc`: close active modal (stats or slot)

## CI

GitHub Actions workflow:

- `.github/workflows/qa-regression.yml`

It runs on pushes/PRs and executes:

- `npm ci`
- `npx playwright install --with-deps chromium`
- `npm run qa:regression`

Regression artifacts are uploaded from:

- `output/web-game/regression/`

## Notes

- This is a demo application for entertainment/testing purposes.
- No real money or real gambling backend is included.
