# Sprint 61 — "The Clarity"

**Date:** 2026-02-27
**Status:** Approved (user delegated full autonomy)

## Features

### Feature 1: Session ROI Meter

**Motivation:** Players want to know their return on investment for this session.
A percentage display (totalWon / totalBet * 100%) gives instant efficiency feedback.

**UI:** Small element (`#roiMeter`) in the slot top bar. Shows "ROI: XX%".
Green when >= 100%, red when < 100%.

**Behavior:** Uses existing _sessTotalBet and _sessTotalWon from spin history state.
Updated after each spin. Session-scoped, resets on closeSlot().

### Feature 2: Game Play Count on Cards

**Motivation:** Players want to see exactly how many times they've played each game.
A small numeric count on lobby game cards shows the play count.

**UI:** Small badge (`pc-count` class) on game cards showing "Xp" (e.g., "5p").
Only shown when count >= 1.

**Behavior:** Computed at render time from recently-played data. Pure display.

## Implementation Plan

**Step 1:** Design doc (this file).
**Step 2:** HTML for ROI meter.
**Step 3:** ROI meter JS in ui-slot.js + hook in win-logic.js.
**Step 4:** Play count in ui-lobby.js card template.
**Step 5:** CSS + QA + commit + push.
