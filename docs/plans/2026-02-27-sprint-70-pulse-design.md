# Sprint 70 — "The Pulse"

**Date:** 2026-02-27
**Status:** Approved (user delegated full autonomy)

## Features

### Feature 1: Time Since Last Win

**Motivation:** Players are curious how long they've been on a dry spell.
A compact "Last win: 2m ago" display provides time-based context.

**UI:** Small element (`#tslWin`) in the slot top bar area. Shows "Last win: Xm ago"
or "Last win: Xs ago". Hidden until first win, then updates every 10 seconds.

**Behavior:** Records timestamp of last win. Interval updates display.
Session-scoped, resets on closeSlot().

### Feature 2: Bonus Trigger Count

**Motivation:** Tracking how many bonuses triggered this session is a fun stat.
Shows "Bonuses: X" count in the slot view.

**UI:** Small element (`#btCount`) in the slot top bar area. Shows "Bonuses: X".
Hidden until first bonus trigger.

**Behavior:** Incremented when free spins or bonus round starts. Session-scoped,
resets on closeSlot().

## Implementation Plan

**Step 1:** Design doc (this file).
**Step 2:** HTML for time since win + bonus count.
**Step 3:** Time since win JS in ui-slot.js + hook in win-logic.js.
**Step 4:** Bonus trigger count JS in ui-slot.js.
**Step 5:** CSS + QA + commit + push.
