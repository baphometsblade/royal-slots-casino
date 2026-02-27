# Sprint 64 — "The Guardian"

**Date:** 2026-02-27
**Status:** Approved (user delegated full autonomy)

## Features

### Feature 1: Session Duration Warning

**Motivation:** Responsible gaming — remind players to take breaks after extended play.
A gentle, dismissible notification appears after 30 minutes of continuous slot play.

**UI:** Small overlay banner (`#sdWarn`) in the slot view. Shows "You've been
playing for 30 min — consider a break!" with a dismiss button.

**Behavior:** Timer starts on openSlot(), fires at 30 min. Dismissed by click.
Session-scoped, clears on closeSlot(). Only triggers once per session.

### Feature 2: Bet-to-Balance Ratio

**Motivation:** Bankroll management awareness — shows what % of balance each bet is.
A tiny display near bet controls showing "X% of bal".

**UI:** Small element (`#bbRatio`) near the bet display. Shows percentage.

**Behavior:** Updated when bet or balance changes. Session-scoped display.

## Implementation Plan

**Step 1:** Design doc (this file).
**Step 2:** HTML for duration warning + bet ratio.
**Step 3:** Duration warning JS in ui-slot.js.
**Step 4:** Bet ratio JS in ui-slot.js.
**Step 5:** CSS + QA + commit + push.
