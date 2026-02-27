# Sprint 52 — "The Rhythm"

**Date:** 2026-02-27
**Status:** Approved (user delegated full autonomy)

## Features

### Feature 1: Volatility Meter

**Motivation:** Players want a persistent visual indicator of game volatility
while playing, not just on hover. A small bar meter in the slot top bar
shows 1-5 filled segments corresponding to volatility level.

**UI:** Small meter element (`#vmMeter`) in the slot top bar with 5 segments.
Filled segments are color-coded: green (1-2), yellow (3), red (4-5).

**Behavior:** Set in openSlot() from `currentGame.volatility`. Pure display.

### Feature 2: Session Timer Display

**Motivation:** Players lose track of time. A small MM:SS timer in the slot
top bar shows how long the current game session has been open.

**UI:** Small clock display (`#stTimer`) in the slot top bar, updates every
second via setInterval. Resets on closeSlot().

**Behavior:** `_stStart` timestamp set in openSlot(). Interval updates
display. Cleared and hidden in closeSlot().

## Implementation Plan

**Step 1:** Design doc (this file).
**Step 2:** HTML for volatility meter + session timer.
**Step 3:** Volatility meter JS in ui-slot.js.
**Step 4:** Session timer JS in ui-slot.js.
**Step 5:** CSS + QA + commit + push.
