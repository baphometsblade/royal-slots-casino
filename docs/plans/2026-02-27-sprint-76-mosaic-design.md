# Sprint 76 — "The Mosaic"

**Date:** 2026-02-27
**Status:** Approved (user delegated full autonomy)

## Features

### Feature 1: Games Played Today

**Motivation:** Players like to know how many games they've tried in a session day.
A small lobby stat shows unique games opened today.

**UI:** Appended to lobby quick stats bar (`renderLobbyQuickStats`): "Today: 3 games".

**Behavior:** Stored in localStorage with date key. Incremented in openSlot().
Resets daily via date check.

### Feature 2: Spin Outcome Dots

**Motivation:** A quick visual glance at recent spin outcomes (win/loss pattern)
as colored dots in the slot HUD.

**UI:** Small element (`#outcDots`) in the slot view. Shows up to 5 dots
(green for win, red for loss). Newest on right.

**Behavior:** Pushed after each spin. Session-scoped, reset on closeSlot.

## Implementation Plan

**Step 1:** Design doc (this file).
**Step 2:** HTML for outcome dots.
**Step 3:** Games played today JS in ui-lobby.js + hook in openSlot.
**Step 4:** Outcome dots JS in ui-slot.js + hook in win-logic.js.
**Step 5:** CSS + QA + commit + push.
