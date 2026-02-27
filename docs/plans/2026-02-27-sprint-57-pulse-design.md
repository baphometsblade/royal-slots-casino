# Sprint 57 — "The Pulse"

**Date:** 2026-02-27
**Status:** Approved (user delegated full autonomy)

## Features

### Feature 1: Average Bet Display

**Motivation:** Players want to understand their average bet size during a
session. Shows "Avg: $X" computed from bet history.

**UI:** Small text (`#abDisplay`) near the bet area. Updates after each spin.

**Behavior:** Computed from _bhData (bet history). Session-scoped.

### Feature 2: Next/Prev Game Navigation

**Motivation:** Players want to quickly browse through games without returning
to the lobby. Small arrow buttons in the slot top bar cycle through available
games.

**UI:** Two small arrow buttons (`#gsNavPrev`, `#gsNavNext`) in the slot
top bar. Navigate to adjacent games in the filtered game list.

**Behavior:** Uses GAMES array order. Closes current slot and opens next/prev.

## Implementation Plan

**Step 1:** Design doc (this file).
**Step 2:** HTML for avg bet + nav buttons.
**Step 3:** Average bet JS in ui-slot.js.
**Step 4:** Game nav JS in ui-slot.js.
**Step 5:** CSS + QA + commit + push.
