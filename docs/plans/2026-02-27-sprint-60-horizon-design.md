# Sprint 60 — "The Horizon"

**Date:** 2026-02-27
**Status:** Approved (user delegated full autonomy)

## Features

### Feature 1: Session Best Win

**Motivation:** Players want to see their biggest single win for the current session.
A small display in the slot top bar provides motivation and bragging context.

**UI:** Small element (`#sbWin`) in the slot top bar. Shows "Best: $X" when a win
has occurred. Hidden until first win.

**Behavior:** Tracks max single win amount per session. Session-scoped, resets on
closeSlot(). Updated after each winning spin.

### Feature 2: Spin Pace Display

**Motivation:** Players may want awareness of their spin rate.
A small SPM (spins per minute) display shows real-time pace.

**UI:** Small element (`#spPace`) in the slot top bar. Shows "X spm".

**Behavior:** Computed from spin count and session elapsed time. Updated after
each spin. Session-scoped, resets on closeSlot().

## Implementation Plan

**Step 1:** Design doc (this file).
**Step 2:** HTML for session best win + spin pace.
**Step 3:** Session best win JS in ui-slot.js + hook in win-logic.js.
**Step 4:** Spin pace JS in ui-slot.js.
**Step 5:** CSS + QA + commit + push.
