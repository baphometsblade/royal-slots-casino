# Sprint 29 — "The Showcase"

**Date:** 2026-02-27
**Status:** Approved (user delegated full autonomy)

## Context

The lobby shows games but lacks personalization. Players have play history data
(recently played, favorites, stats) that can drive smarter recommendations.
A balance sparkline adds a visual engagement hook.

## Features

### Feature 1: Balance History Sparkline

**Motivation:** Visual feedback on balance trajectory keeps players engaged.

**Storage:** `localStorage('matrixBalanceHistory')` = `[{ t: timestamp, v: balance }, ...]`
Max 100 data points. Record after each spin result.

**UI:** Compact sparkline (SVG polyline) in the lobby hero stats area,
next to "BIGGEST WIN TODAY". Shows last 50 balance changes with green (up) / red (down) trend.
Tooltip on hover shows current balance.

**Implementation:**
- `recordBalancePoint(balance)` — push to history array, cap at 100
- `renderBalanceSparkline()` — SVG polyline in `#balanceSparkline` container
- Call `recordBalancePoint` after each spin resolves (in win-logic or ui-slot)
- Call `renderBalanceSparkline` on lobby load

### Feature 2: Game Recommendations

**Motivation:** With 80+ games, surfacing personalized suggestions improves discovery.

**Algorithm:** Based on recently played games:
1. Get last 10 played game IDs from recently played list
2. Extract providers played most
3. Find games by those providers NOT in recently played
4. Shuffle and pick top 6
5. If not enough, fill with random hot games

**UI:** "Recommended For You" section below hot games, above main grid.
Horizontal scroll row of 6 game cards. Only shows if user has play history.

**Implementation:**
- `getRecommendedGames()` in ui-lobby.js
- Render in `renderGames()` after hot games section
- Same game card format as existing cards

## Implementation Plan

**Step 1:** Design doc (this file).
**Step 2:** Balance sparkline — JS in ui-lobby.js + HTML container + CSS.
**Step 3:** Game recommendations — JS in ui-lobby.js + HTML container.
**Step 4:** Hook balance recording into spin flow.
**Step 5:** CSS + QA + commit + push.

## Success Criteria

- Sparkline renders in lobby hero stats area
- Balance points recorded after each spin
- "Recommended For You" shows 6 games based on play history
- Both features degrade gracefully (empty history = hidden)
- QA regression passes
