# Sprint 54 — "The Compass"

**Date:** 2026-02-27
**Status:** Approved (user delegated full autonomy)

## Features

### Feature 1: Autoplay Progress Ring

**Motivation:** During autoplay, players want to see how many spins are left.
A small progress text overlay on the spin button shows "X/N" during autoplay.

**UI:** Overlay element (`#apProgress`) on the spin button area. Shows
"3/10" style text. Hidden when autoplay is not active.

**Behavior:** Updated after each autoplay spin. Reads from autoplay state
variables. Cleared when autoplay stops.

### Feature 2: Game Difficulty Rating

**Motivation:** New players want guidance on which games are simpler.
A 1-3 star difficulty rating on each game card, computed from volatility
and grid size.

**UI:** Small star display on game cards. 1 star = easy (3×3 low vol),
2 stars = medium, 3 stars = complex (5+ reels or high vol).

**Behavior:** Computed at render time from game config. Pure display.

## Implementation Plan

**Step 1:** Design doc (this file).
**Step 2:** HTML for autoplay progress overlay.
**Step 3:** Autoplay progress JS in ui-slot.js.
**Step 4:** Difficulty rating JS in ui-lobby.js card template.
**Step 5:** CSS + QA + commit + push.
