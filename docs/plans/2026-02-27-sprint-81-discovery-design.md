# Sprint 81 — "The Discovery"

**Date:** 2026-02-27
**Status:** Approved (user delegated full autonomy)

## Features

### Feature 1: Try Something New

**Motivation:** Suggest a game the player hasn't played yet to encourage exploration.

**UI:** Small element (`#trySomething`) in the lobby, below the quick stats.
Shows "Try: [Game Name]" as a clickable link. Refreshes on lobby load.

**Behavior:** Cross-references GAMES with recently played list.
Picks a random unplayed game. Clicking opens that slot.

### Feature 2: Worst Loss Streak

**Motivation:** Complement to "best win streak" — shows the longest run of
consecutive losses in the session.

**UI:** Small element (`#wlStreak`) in the slot view HUD. Shows "Loss Streak: 5".
Only appears after 3+ consecutive losses.

**Behavior:** Tracks current and worst consecutive loss count.
Session-scoped, reset on closeSlot.

## Implementation Plan

**Step 1:** Design doc (this file).
**Step 2:** HTML for try-something + worst loss streak.
**Step 3:** Try-something JS in ui-lobby.js.
**Step 4:** Worst loss streak JS in ui-slot.js + hook in win-logic.js.
**Step 5:** CSS + QA + commit + push.
