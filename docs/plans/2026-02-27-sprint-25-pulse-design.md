# Sprint 25 — "The Pulse"

**Date:** 2026-02-27
**Status:** Approved (user delegated full autonomy)

## Fixes from Sprint 24

1. **Slot of the Day XP not applied** — `ui-slot.js` has 6 `awardXP` calls, none multiply by `GAME_OF_DAY_XP_BONUS`. Fix: wrap each with `* (gameOfDayId && currentGame?.id === gameOfDayId ? GAME_OF_DAY_XP_BONUS : 1)`.
2. **Leaderboard VIP badges empty** — server leaderboard response lacks `vip_tier`. Fix: join `users` table, compute tier from `total_wagered` column (cumulative wagers visible via `SUM(spins.bet_amount)`), add to response.

## New Features

### Feature 1: Hot/Cold Game Indicator

**Motivation:** 100 games in lobby — players want to know which are paying out well.

**Server:** New `GET /api/game-stats/public` endpoint (no auth) returning `[{ gameId, actualRtp, totalSpins }]`. Filters out games with < 10 spins (not enough data).

**Client (ui-lobby.js):** On lobby load, fetch stats. For each game card:
- RTP > 92%: add `.game-hot` class → 🔥 flame badge
- RTP < 84%: add `.game-cold` class → ❄️ ice badge
- Otherwise: no badge (neutral)

**CSS:** Small emoji badge, top-left corner of game card.

### Feature 2: Daily Scratch Card

**Motivation:** Breaks up the slot-only gameplay loop with a tactile mini-game.

**Implementation:** Client-side only (localStorage for daily state).

**Format:** 3×3 grid, 9 cells, each hides a prize. Reveal by clicking. If 3+ cells match → win that prize. Otherwise: consolation $50.

**Prizes:** `[50, 100, 250, 500, 1000, 2500]` — same as small wheel amounts.

**Cooldown:** 24 hours. Accessible from lobby nav or bonus wheel button area.

**UI:** Modal with canvas scratch effect (or simple CSS reveal). Winner toast + balance credit.

## Implementation Plan

**Step 1 (me):** Fix Slot of the Day XP in `ui-slot.js` (6 call sites).

**Step 2 (me):** Add leaderboard vip_tier to server response + add public game-stats endpoint.

**Step 3 (parallel agents):**
- Agent A: Hot/Cold game indicator (lobby + CSS)
- Agent B: Daily Scratch Card (modal + CSS + localStorage)

**Final:** QA + commit + push.

## Success Criteria

- Spinning the Game of the Day awards 1.5× XP (verified in console)
- Leaderboard rows show VIP badge for users with significant wager history
- Hot/cold badges visible on game cards with enough spin history
- Scratch card accessible daily, awards prizes, respects 24h cooldown
- All QA regression tests pass
