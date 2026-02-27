# Sprint 59 — "The Focus"

**Date:** 2026-02-27
**Status:** Approved (user delegated full autonomy)

## Features

### Feature 1: Profit Target

**Motivation:** Players want to set a net profit goal. When their session
profit (current balance minus opening balance) reaches the target, a
congratulatory message appears.

**UI:** Small input/display (`#ptTarget`) in slot view. Player taps to set
target. Shows progress toward target.

**Behavior:** Compares (balance - openingBalance) against target after each
spin. Session-scoped.

### Feature 2: Lobby Search Highlight

**Motivation:** When searching for games, matching text should be highlighted
in game names for easier scanning.

**UI:** Matching text wrapped in `<mark>` tags within game name.

**Behavior:** Applied during renderFilteredGames() when search query is active.
Pure display.

## Implementation Plan

**Step 1:** Design doc (this file).
**Step 2:** HTML for profit target.
**Step 3:** Profit target JS in ui-slot.js.
**Step 4:** Search highlight JS in ui-lobby.js.
**Step 5:** CSS + QA + commit + push.
