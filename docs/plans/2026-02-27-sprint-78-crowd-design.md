# Sprint 78 — "The Crowd"

**Date:** 2026-02-27
**Status:** Approved (user delegated full autonomy)

## Features

### Feature 1: Simulated Online Players

**Motivation:** Social proof — showing a player count makes the casino feel alive.
Deterministic simulation based on time of day (no server needed).

**UI:** Appended to lobby footer (`renderLobbyFooter`): "~1,234 online".

**Behavior:** Base count varies by hour (peak at evening, low at night).
Small random-ish variation using minute hash. Updated with footer (60s).

### Feature 2: Session Wild Count

**Motivation:** Tracking how many wild symbols appeared adds a fun stat.

**UI:** Small element (`#swcCount`) in the slot view HUD. Shows "Wilds: 5".

**Behavior:** Incremented by scanning the final grid for wild symbols after each spin.
Session-scoped, reset on closeSlot.

## Implementation Plan

**Step 1:** Design doc (this file).
**Step 2:** HTML for wild count.
**Step 3:** Online players JS in ui-lobby.js (inside renderLobbyFooter).
**Step 4:** Wild count JS in ui-slot.js + hook in win-logic.js.
**Step 5:** CSS + QA + commit + push.
