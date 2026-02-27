# Sprint 80 — "The Rhythm"

**Date:** 2026-02-27
**Status:** Approved (user delegated full autonomy)

## Features

### Feature 1: Lobby Day Theme

**Motivation:** A fun daily-themed message adds personality to the lobby.
"Wild Wednesday", "Throwback Thursday", etc.

**UI:** Small element (`#dayTheme`) below the daily tip. Muted, stylized text.

**Behavior:** Pure display based on `new Date().getDay()`. No state.

### Feature 2: Near Miss Counter

**Motivation:** Tracking near misses (2-of-3 on center row) adds excitement.

**UI:** Small element (`#nmCount`) in the slot view HUD. Shows "Near Misses: 4".

**Behavior:** After each spin, checks if exactly 2 of 3 reels show the same
symbol on the center row. Session-scoped, reset on closeSlot.

## Implementation Plan

**Step 1:** Design doc (this file).
**Step 2:** HTML for day theme + near miss counter.
**Step 3:** Day theme JS in ui-lobby.js.
**Step 4:** Near miss JS in ui-slot.js + hook in win-logic.js.
**Step 5:** CSS + QA + commit + push.
