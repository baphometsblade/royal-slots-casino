# Quick Start

## 1) Open the app

From `C:\created games\Casino`:

- Open `index.html` directly, or
- Run a static server (recommended for QA URLs).

Example static server:

```bash
python -m http.server 4173
```

Then open:

```text
http://127.0.0.1:4173/index.html
```

## 2) Play

- Click a game card.
- Set your bet (slider or MIN/MID/MAX).
- Click `SPIN NOW!`.
- Triple match pays triple multiplier, double match pays double multiplier.

## 3) View stats

- Click `STATS` in the header.
- Stats are persisted in localStorage and restored on reload.

## 4) Use QA tools (optional)

Inside Stats modal, expand `QA Tools`:

- Apply seed for deterministic RNG
- Queue forced outcomes or exact reels
- Queue + spin actions
- Reset balance/stats (optionally clear seed)

Useful QA URL examples:

```text
http://127.0.0.1:4173/index.html?qaTools=1
http://127.0.0.1:4173/index.html?qaTools=1&qaResetClearSeed=1
http://127.0.0.1:4173/index.html?openSlot=lucky_777&spinSeed=demo&forceOutcome=triple&forceSymbol=seven&autoSpin=1
```

## 5) Run automated regression

```bash
npm run qa:regression
```

Artifacts are written to:

```text
output/web-game/regression/
```

## Shortcuts

- `F`: fullscreen toggle
- `Esc`: close active modal
