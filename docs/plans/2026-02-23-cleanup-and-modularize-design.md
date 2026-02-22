# Cleanup & Modularize Design

**Date:** 2026-02-23
**Status:** Approved

## Goal

Clean up the root directory and split the 5,095-line `app.js` monolith into focused modules to improve maintainability and reduce cascading bugs.

## Phase 1: Root Cleanup

### File moves
- Root screenshots (`*.png`, `*.jpeg`) that are test/debug artifacts -> `screenshots/`
- Python generator scripts in root -> `scripts/`
- Documentation (`ENHANCEMENTS.md`, `PHASES_*.md`, `PHASES_SUMMARY.txt`, `progress.md`) -> `docs/`

### Deletions
- `nul` (Windows null device artifact, empty)

### Stays in root
- `index.html`, `app.js`, `styles.css`, `constants.js`, `animations.js`, `sound-manager.js`, `house-edge-client.js`
- `package.json`, `package-lock.json`, `.gitignore`
- `README.md`, `QUICK_START.md`, `QA.md`
- `assets/`, `shared/`, `server/`, `scripts/`, `admin/`

## Phase 2: app.js Modularization

### Module structure

| File | Lines (est.) | Responsibility |
|------|-------------|----------------|
| `app.js` | ~300 | Entry point, init, event wiring, globals |
| `state.js` | ~400 | Balance, stats, achievements, XP, localStorage |
| `spin-engine.js` | ~500 | RNG, grid generation, deterministic mode, forced outcomes |
| `win-logic.js` | ~600 | Classic/payline/cluster win detection, payout calc |
| `ui-lobby.js` | ~800 | Game cards, search, filters, recently played, jackpot ticker, win ticker |
| `ui-slot.js` | ~1200 | Slot modal, reels, animations, free spins, auto-spin, gamble |
| `ui-modals.js` | ~600 | Stats, deposit, auth, daily bonus, bonus wheel modals |
| `qa-tools.js` | ~300 | Debug panel, casinoDebug API, URL param handlers |

### Integration approach
- Plain `<script>` tags in dependency order (no bundler)
- Shared state via `window.casino` namespace object
- Each module attaches its public functions to the namespace
- `app.js` loads last, calls `initAllSystems()`

### Migration strategy
- Extract one module at a time, verify with `npm run qa:regression` after each
- Start with lowest-coupling modules first: `state.js`, `qa-tools.js`
- End with highest-coupling: `ui-slot.js`, `app.js` (orchestrator)
