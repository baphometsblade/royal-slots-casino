# Sprint 51 — "The Awareness"

**Date:** 2026-02-27
**Status:** Approved (user delegated full autonomy)

## Features

### Feature 1: Bet Size Indicator

**Motivation:** Players want a quick visual reference for where their bet sits
relative to the game's range. A textual label ("Min"/"Low"/"Med"/"High"/"Max")
next to the bet display communicates this at a glance.

**UI:** Small pill label (`.bi-label`) next to the bet amount in the slot top bar.
Updates on every bet change. Color-coded: green for min/low, yellow for med,
orange/red for high/max.

**Behavior:** Computed from `currentBet` vs `currentGame.minBet`/`maxBet`.
Pure display, no persistence.

### Feature 2: Game Popularity Badge

**Motivation:** Players want to see which games they play most. A badge on
lobby game cards shows play frequency from the recently-played list.

**UI:** Small badge on game cards — "Hot" (3+ plays, orange) or "Fav" (5+ plays,
pink heart). Computed from localStorage recently-played data.

**Behavior:** Counts occurrences in recently-played list. Pure display, re-renders
with lobby.

## Implementation Plan

**Step 1:** Design doc (this file).
**Step 2:** HTML for bet indicator + popularity badge markup hook.
**Step 3:** Bet Indicator JS in ui-slot.js.
**Step 4:** Popularity Badge JS in ui-lobby.js.
**Step 5:** CSS + QA + commit + push.
