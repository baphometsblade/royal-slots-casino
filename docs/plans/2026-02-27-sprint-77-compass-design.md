# Sprint 77 — "The Compass"

**Date:** 2026-02-27
**Status:** Approved (user delegated full autonomy)

## Features

### Feature 1: Lobby Sort Toggle

**Motivation:** With 80+ games, players may want alphabetical or popularity sorting
instead of the default order.

**UI:** Small toggle button (`#lobbySort`) near the search bar. Cycles through
"Default", "A-Z", "Popular" on click. Shows current sort label.

**Behavior:** Sorts the visible game cards. "Popular" uses play count from
localStorage recently-played data. Pure UI sort, no persistence.

### Feature 2: Session Net Position

**Motivation:** Quick glance at absolute dollar profit/loss for current game session.
Complements ROI% with a concrete dollar figure.

**UI:** Small element (`#sessNet`) in the slot view HUD. Shows "+$150" (green) or
"-$30" (red). Hidden until first spin.

**Behavior:** Calculated as `balance - startingBalance`. Updated after each spin.
Session-scoped, reset on closeSlot.

## Implementation Plan

**Step 1:** Design doc (this file).
**Step 2:** HTML for sort toggle + session net.
**Step 3:** Lobby sort JS in ui-lobby.js.
**Step 4:** Session net JS in ui-slot.js + hook in win-logic.js.
**Step 5:** CSS + QA + commit + push.
