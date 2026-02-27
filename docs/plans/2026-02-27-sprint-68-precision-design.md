# Sprint 68 — "The Precision"

**Date:** 2026-02-27
**Status:** Approved (user delegated full autonomy)

## Features

### Feature 1: Last Win Multiplier Display

**Motivation:** Players want to see their last win's payout multiplier at a glance.
A compact "Last: 5.2x" display helps gauge game generosity without checking history.

**UI:** Small element (`#lwMult`) in the slot top bar area. Shows "Last: Xx" where X
is the win/bet ratio. Hidden until first win. Green text.

**Behavior:** Computed as winAmount / currentBet on each win. Updated in win branch
of win-logic.js via hook. Session-scoped, resets on closeSlot().

### Feature 2: Average Win Display

**Motivation:** Knowing average win size helps players understand game payout patterns.
Shows average win amount across all wins this session.

**UI:** Small element (`#awDisplay`) in the slot top bar area. Shows "Avg Win: $X".
Hidden until 3+ wins (needs enough data to be meaningful).

**Behavior:** Tracks cumulative win total and win count. Computed as totalWon / winCount.
Updated on each win. Session-scoped, resets on closeSlot().

## Implementation Plan

**Step 1:** Design doc (this file).
**Step 2:** HTML for multiplier + average win elements.
**Step 3:** Last win multiplier JS in ui-slot.js + hook in win-logic.js.
**Step 4:** Average win JS in ui-slot.js + hook in win-logic.js.
**Step 5:** CSS + QA + commit + push.
