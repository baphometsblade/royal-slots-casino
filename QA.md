# Casino QA Guide

## Automated Regression

Run the full deterministic smoke flow:

```bash
npm run qa:regression
```

What it verifies:
- Lobby loads and exposes `render_game_to_text`.
- Stats modal opens.
- QA tools can apply a deterministic seed and queue a forced triple outcome.
- Forced spin resolves to `seven,seven,seven` with a win.
- Reset with "clear deterministic seed" enabled restores default balance/stats and disables deterministic mode.
- Browser runtime sanity: fails on new `console.error`/`pageerror` output.

Artifacts are written to:

```text
output/web-game/regression/
```

On regression failure, additional artifacts may be present:

```text
output/web-game/regression/errors.json
output/web-game/regression/failure-shot.png
```

## CI workflow

GitHub Actions executes the same regression command in:

```text
.github/workflows/qa-regression.yml
```

CI uploads:

```text
output/web-game/regression/
```

## Manual QA URLs

Use query params on `index.html`:

- `qaTools=1` to auto-open QA tools.
- `qaResetClearSeed=1` to pre-check "Clear deterministic seed on reset".
- `openSlot=<gameId>` to open a slot directly.
- `spinSeed=<seed>` to enable seeded RNG.
- `forceOutcome=triple|double|loss` for next spin.
- `forceSymbol=<symbol>` to guide `forceOutcome`.
- `forceSpin=symbolA,symbolB,symbolC` for exact next reels.
- `autoSpin=1` to trigger one automatic spin.
- `autoSpinDelay=<ms>` to delay automatic spin.

Example:

```text
http://127.0.0.1:4173/index.html?qaTools=1&qaResetClearSeed=1&openSlot=lucky_777&spinSeed=demo-seed&forceOutcome=triple&forceSymbol=seven&autoSpin=1
```
