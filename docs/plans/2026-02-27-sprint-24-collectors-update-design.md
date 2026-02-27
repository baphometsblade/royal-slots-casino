# Sprint 24 — "The Collector's Update"

**Date:** 2026-02-27
**Status:** Approved (user delegated full autonomy)

## Summary

Four cohesive features centered on recognition and replayability:

1. **Slot of the Day** — daily spotlight game with +50% XP bonus and lobby star badge
2. **Achievement Badge Gallery** — visual badge grid in profile modal (earned vs locked)
3. **VIP Inline Rank Badges** — tier pill on all leaderboard and activity feed entries
4. **Enhanced Bonus Wheel** — add 5 FS and 10 FS free-spin prizes to wheel

---

## Feature 1: Slot of the Day

**Motivation:** 100 games in lobby — players need a daily reason to explore a specific game.

**Server:** `GET /api/game-of-day`
- Deterministic: `dayIndex = floor(Date.now() / 86400000)`, sorted game IDs array, `dayIndex % length`
- Returns: `{ gameId, gameName, secondsUntilNext }`
- No DB required — pure computation

**Client (ui-lobby.js):**
- Fetch on lobby init; fallback to date-based client-side calculation if server unreachable
- Store as `window.gameOfDayId`
- In lobby render: inject `.game-of-day-badge` overlay on matching game card
- In spin-engine / win-logic: award `XP * GAME_OF_DAY_XP_BONUS` when spinning game of day
- Show countdown timer in lobby banner

**Constants:** `GAME_OF_DAY_XP_BONUS = 1.5` (50% bonus)

**CSS:** Gold star badge, shimmer animation on the card border

---

## Feature 2: Achievement Badge Gallery

**Motivation:** 24 achievements defined in `ACH_DEFS` but no visual showcase in profile.

**Profile modal additions:**
- New "Badges" tab alongside existing stats tabs
- 5-column grid of badge tiles
- Earned: full color with icon/emoji + achievement name
- Locked: grayscale silhouette, name hidden or shown as "???"
- Tooltip on hover: name + description + unlock criteria
- Group header rows: Lucky / Explorer / High Roller / VIP / Milestone

**HTML:** Add tab button + content container inside profile modal
**JS (ui-modals.js):** `renderBadgeGallery()` called when Badges tab activates
**CSS:** Badge grid, earned/locked states, hover glow

---

## Feature 3: VIP Inline Rank Badges

**Motivation:** VIP tier exists but is invisible outside the VIP modal. Makes the leaderboard and activity feed feel social and competitive.

**Implementation:**
- `getVipBadgeHtml(tierName)` in `ui-vip.js` → `<span class="vip-badge vip-{tier}">TIER</span>`
- Inject into: leaderboard rows (Hall of Fame modal), activity feed entries (win ticker)
- CSS: colored pill badges per tier (Bronze=copper, Silver=silver, Gold=gold, Platinum=teal, Diamond=cyan, Elite=purple)

**Note:** VIP tier is localStorage; badge reflects local player's tier for their own rows. For other players' rows (leaderboard), tier data comes from server leaderboard response — need to include `vip_tier` in the all-time leaderboard API response.

---

## Feature 4: Enhanced Bonus Wheel

**Motivation:** Wheel currently awards only coins ($100–$5000). Free spins are an established reward type in the game — adding them to the wheel creates excitement.

**Changes to WHEEL_SEGMENTS (constants.js):**
- Replace two `$100` segments with `5 FS` and `10 FS`
- New segment schema: `{ label, value, color, xp, type? }` where `type: 'freespins'`

**Wheel spin handler (ui-modals.js):**
- If `seg.type === 'freespins'`: award free spins on current game (or a random game if not in slot)
- Use existing `freeSpinState` mechanism
- Toast: "🎰 10 Free Spins awarded on [game]!"

**CSS:** Free-spin segments get star pattern background, special color

---

## Implementation Plan

**Pass 1 (parallel agents):**
- Agent A: Slot of the Day (server route + ui-lobby.js + constants.js + CSS)
- Agent B: Achievement Badge Gallery (ui-modals.js + index.html + CSS)

**Pass 2 (parallel agents, after Pass 1):**
- Agent C: VIP Inline Badges (ui-vip.js + leaderboard query update + CSS)
- Agent D: Enhanced Bonus Wheel (constants.js + ui-modals.js wheel handler)

**Final:** QA regression + commit

---

## Success Criteria

- Lobby shows exactly one game with gold star badge each day, different game next day
- Profile modal has Badges tab; earned achievements show in color, unearned are greyed
- Leaderboard and activity feed rows include VIP tier pills
- Bonus wheel can land on free spin segments; free spins are correctly awarded
- All existing QA regression tests pass
