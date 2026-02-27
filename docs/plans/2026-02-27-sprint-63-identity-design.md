# Sprint 63 — "The Identity"

**Date:** 2026-02-27
**Status:** Approved (user delegated full autonomy)

## Features

### Feature 1: Provider Label in Slot View

**Motivation:** Players want to see which "studio" made the game they're playing.
A small provider name label in the slot top bar area.

**UI:** Small element (`#pvLabel`) in the slot top bar. Shows provider name
from currentGame.provider.

**Behavior:** Set on openSlot(), hidden on closeSlot(). Pure display.

### Feature 2: Grid Size Display

**Motivation:** Players want to know the reel configuration at a glance.
A compact "5x3" or "3x3" display in the slot top bar.

**UI:** Small element (`#gsDisplay`) in the slot top bar. Shows "CxR" format
from currentGame.gridCols x currentGame.gridRows.

**Behavior:** Set on openSlot(), hidden on closeSlot(). Pure display.

## Implementation Plan

**Step 1:** Design doc (this file).
**Step 2:** HTML for provider label + grid size.
**Step 3:** JS in ui-slot.js — set on open, clear on close.
**Step 4:** CSS + QA + commit + push.
