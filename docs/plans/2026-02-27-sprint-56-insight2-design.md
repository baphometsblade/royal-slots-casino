# Sprint 56 — "The Insight II"

**Date:** 2026-02-27
**Status:** Approved (user delegated full autonomy)

## Features

### Feature 1: Win Rate Display

**Motivation:** Players want to track their hit rate during a session.
A small percentage display shows wins/total as a percentage.

**UI:** Small element (`#wrDisplay`) near the balance area. Shows "Hit: XX%".
Updates after each spin.

**Behavior:** Tracks session wins and total spins. Session-scoped, resets
on closeSlot().

### Feature 2: Category Badge on Game Cards

**Motivation:** Players want to quickly identify game mechanics.
Small badge on game cards showing the bonus/mechanic type.

**UI:** Badge on each game card (`cb-badge`) showing "Classic", "Cascade",
"H&W", etc. based on bonusType and gridType.

**Behavior:** Computed from game config at render time.

## Implementation Plan

**Step 1:** Design doc (this file).
**Step 2:** HTML for win rate display.
**Step 3:** Win rate JS in ui-slot.js.
**Step 4:** Category badge JS in ui-lobby.js card template.
**Step 5:** CSS + QA + commit + push.
