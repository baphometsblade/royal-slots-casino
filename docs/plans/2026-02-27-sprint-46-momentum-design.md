# Sprint 46 — "The Momentum"

**Date:** 2026-02-27
**Status:** Approved (user delegated full autonomy)

## Features

### Feature 1: Win Multiplier Streak Display

**Motivation:** Players enjoy seeing momentum build. A visual streak counter
in the slot view shows consecutive winning spins and a multiplier badge.

**UI:** Small badge next to the spin button showing "🔥 3 streak" style counter.
Pulses on increment, fades on loss. Green tint on win, resets to hidden on loss.

**Behavior:** Increments on any win, resets on loss. Session-scoped (in-memory).
Pure visual — no actual multiplier applied to payouts.

### Feature 2: Game Tags Filter

**Motivation:** Players want to quickly filter by tag (HOT, NEW, JACKPOT, POPULAR)
without using the main filter tabs. Compact tag pills inline with the game grid.

**UI:** Small colored tag pills below the collection tabs. Click to toggle filter.
Multiple tags can be active simultaneously. Active tags have a filled style.

**Behavior:** Filters compound with existing mechanic/collection/provider filters.
Integrated into getFilteredGames().

## Implementation Plan

**Step 1:** Design doc (this file).
**Step 2:** HTML for streak display + tag filter pills.
**Step 3:** Streak JS in ui-slot.js.
**Step 4:** Tag filter JS in ui-lobby.js.
**Step 5:** CSS + QA + commit + push.
