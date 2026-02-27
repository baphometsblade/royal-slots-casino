# Sprint 69 — "The Insight"

**Date:** 2026-02-27
**Status:** Approved (user delegated full autonomy)

## Features

### Feature 1: Session Win Frequency

**Motivation:** Players want to know what fraction of their spins are winning.
A compact "Hits: 42%" display in the slot view shows real-time hit rate.

**UI:** Small element (`#swFreq`) in the slot top bar area. Shows "Hits: X%".
Hidden until 5+ spins (needs enough data to be meaningful).

**Behavior:** Uses existing spinHistory length for total spins and counts
entries with win > 0. Computed after each spin. Session-scoped, resets on closeSlot().

### Feature 2: Biggest Loss Display

**Motivation:** Awareness of largest single-spin loss helps with bankroll management.
Shows the biggest bet that resulted in a loss this session.

**UI:** Small element (`#blDisplay`) in the slot top bar area. Shows "Max Loss: $X".
Red text. Hidden until first loss.

**Behavior:** Tracks the largest bet amount on a losing spin. Updated on each loss.
Session-scoped, resets on closeSlot().

## Implementation Plan

**Step 1:** Design doc (this file).
**Step 2:** HTML for win frequency + biggest loss.
**Step 3:** Win frequency JS in ui-slot.js + hook in win-logic.js.
**Step 4:** Biggest loss JS in ui-slot.js + hook in win-logic.js.
**Step 5:** CSS + QA + commit + push.
