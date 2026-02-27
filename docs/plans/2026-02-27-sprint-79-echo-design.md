# Sprint 79 — "The Echo"

**Date:** 2026-02-27
**Status:** Approved (user delegated full autonomy)

## Features

### Feature 1: Session Scatter Count

**Motivation:** Scatters are exciting — tracking how many appeared adds a fun stat.

**UI:** Small element (`#sscCount`) in the slot view HUD. Shows "Scatters: 3".

**Behavior:** Scans the grid for scatter symbols after each spin.
Session-scoped, reset on closeSlot.

### Feature 2: Best Win Streak (Session)

**Motivation:** Players enjoy seeing their best consecutive win streak during a session.

**UI:** Small element (`#bwStreak`) in the slot view HUD. Shows "Best Streak: 5".
Only appears after at least 2 consecutive wins.

**Behavior:** Tracks current and best consecutive win count.
Session-scoped, reset on closeSlot.

## Implementation Plan

**Step 1:** Design doc (this file).
**Step 2:** HTML for scatter count + best streak.
**Step 3:** Scatter count JS in ui-slot.js + hook in win-logic.js.
**Step 4:** Best streak JS in ui-slot.js + hook in win-logic.js.
**Step 5:** CSS + QA + commit + push.
