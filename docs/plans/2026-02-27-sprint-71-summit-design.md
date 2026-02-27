# Sprint 71 — "The Summit"

**Date:** 2026-02-27
**Status:** Approved (user delegated full autonomy)

## Features

### Feature 1: Session Peak Balance

**Motivation:** Players want to know how high their balance climbed during the
current game session. Shows "Peak: $X" — the high watermark.

**UI:** Small element (`#spkBal`) in the slot top bar area. Shows "Peak: $X".
Green text. Hidden until balance changes from starting value.

**Behavior:** Records starting balance on openSlot. Tracks max(balance) after
each spin. Only shows if peak > starting balance. Session-scoped, resets on closeSlot().

### Feature 2: Lobby Provider Count

**Motivation:** Players are curious how many game studios are represented.
A small addition to the lobby quick stats bar showing provider count.

**UI:** Extra span in `#lqStats` bar showing "Studios: X".

**Behavior:** Counted from unique providers in GAMES array. Computed at render time.

## Implementation Plan

**Step 1:** Design doc (this file).
**Step 2:** HTML for peak balance element.
**Step 3:** Peak balance JS in ui-slot.js + hook in win-logic.js.
**Step 4:** Provider count in renderLobbyQuickStats() in ui-lobby.js.
**Step 5:** CSS + QA + commit + push.
