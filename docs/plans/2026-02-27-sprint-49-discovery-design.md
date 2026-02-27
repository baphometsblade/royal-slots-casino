# Sprint 49 — "The Discovery"

**Date:** 2026-02-27
**Status:** Approved (user delegated full autonomy)

## Features

### Feature 1: Random Game Picker

**Motivation:** With 80+ games, choice paralysis is real. A "Feeling Lucky"
button picks a random game and opens it directly.

**UI:** A dice button in the lobby header or near the search bar. Click
launches a random game with a brief shuffle animation.

**Behavior:** Picks from all games (or filtered games if a filter is active).
Random selection via Math.random(). Opens the chosen game with openSlot().

### Feature 2: Session Profit/Loss Summary Bar

**Motivation:** Players want to see their overall session P&L at a glance
in the lobby. A compact bar at the top of the lobby shows net profit/loss
since the page was loaded.

**UI:** Thin bar at the top of the lobby content area showing "Session: +$XX.XX"
or "Session: -$XX.XX" with green/red coloring.

**Behavior:** Tracks opening balance on page load. Updates whenever the lobby
is shown (after returning from a slot). Pure display, no persistence.

## Implementation Plan

**Step 1:** Design doc (this file).
**Step 2:** HTML for random picker button + session bar.
**Step 3:** Random Picker JS in ui-lobby.js.
**Step 4:** Session Bar JS in ui-lobby.js.
**Step 5:** CSS + QA + commit + push.
