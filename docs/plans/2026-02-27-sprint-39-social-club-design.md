# Sprint 39 — "The Social Club"

**Date:** 2026-02-27
**Status:** Approved (user delegated full autonomy)

## Features

### Feature 1: Game Provider Stats Summary

**Motivation:** Players often have preferred providers. A compact provider breakdown
in the lobby shows how many games each provider has and quick filters.

**UI:** Collapsible "Provider Stats" panel below the provider strip.
Shows each provider with game count and average RTP. Click to filter.

**Behavior:** Rendered from GAMES array data. No persistence needed.

### Feature 2: Quick Bet Doubler

**Motivation:** During hot streaks, players want to quickly double their bet without
fiddling with sliders. A "2x" button next to the bet display makes this instant.

**UI:** Small "2x" button next to the current bet display in the slot view.
Also a "½" button to halve the bet for conservative play.
Both respect min/max bet limits for the current game.

**Behavior:** Multiplies/divides current bet, clamped to game's bet range.
Updates bet display and highlights the matching preset if applicable.

## Implementation Plan

**Step 1:** Design doc (this file).
**Step 2:** HTML for provider stats + bet doubler buttons.
**Step 3:** Provider stats JS in ui-lobby.js.
**Step 4:** Bet doubler JS in ui-slot.js.
**Step 5:** CSS + QA + commit + push.
