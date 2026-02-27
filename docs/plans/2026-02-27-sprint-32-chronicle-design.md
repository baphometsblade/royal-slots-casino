# Sprint 32 — "The Chronicle"

**Date:** 2026-02-27
**Status:** Approved (user delegated full autonomy)

## Features

### Feature 1: Spin History Browser

**Motivation:** Players have no way to review past spins. A history log provides transparency
and lets players analyze their play patterns.

**Modal:** `#spinHistoryModal` — accessible via "History" button in lobby nav.

**Storage:** `localStorage('matrixSpinHistory')` = `[{ ts, game, gameId, bet, win, mult }, ...]`
Max 100 entries, FIFO.

**Recording:** Hook into ui-slot.js spin result to push each spin into history.

**UI:** Scrollable list of spin entries showing:
- Game name + provider icon color
- Bet amount + Win amount (green for win, red for loss)
- Multiplier badge (if > 1x)
- Relative timestamp ("2m ago", "1h ago")

**Filters:** All / Wins Only / Losses Only (toggle buttons at top).

### Feature 2: Player Stats Card

**Motivation:** Players want to see a visual summary of their profile — level, biggest win,
total spins, favorite game, VIP tier. A "stats card" serves as a personal trophy.

**Modal:** `#playerCardModal` — accessible via "My Card" button in lobby nav (or from profile).

**Data:** Pulls from existing state: `stats`, `currentUser`, VIP tier, XP level, achievements count.

**UI:** Stylized card (dark gradient, gold accents) showing:
- Username + VIP tier badge
- Level + XP bar
- Total Spins / Total Won / Biggest Win
- Favorite game (most-played from recently played or stats)
- Achievement count badge
- Member since date

No new localStorage — reads from existing data.

## Implementation Plan

**Step 1:** Design doc (this file).
**Step 2:** HTML scaffolding (history button, modal, player card button, modal).
**Step 3:** Spin History JS (recording + display) in ui-modals.js.
**Step 4:** Player Stats Card JS in ui-modals.js.
**Step 5:** CSS + QA + commit + push.
