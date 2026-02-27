# Sprint 66 — "The Awareness II"

**Date:** 2026-02-27
**Status:** Approved (user delegated full autonomy)

## Features

### Feature 1: Wall Clock Display

**Motivation:** Players lose track of real time during play sessions.
A small clock showing the current time (HH:MM) in the slot top bar.

**UI:** Small element (`#wcClock`) in the slot top bar. Shows "HH:MM" format,
updated every minute.

**Behavior:** Interval timer starts on openSlot(), stops on closeSlot().
Pure display — no game logic impact.

### Feature 2: Game Mechanic Help

**Motivation:** New players don't always know what "tumble", "hold & win", etc. mean.
A small "?" icon that reveals a tooltip explaining the game's special mechanic.

**UI:** Small clickable element (`#gmHelp`) in the slot top bar. Shows a "?" icon.
On click, toggles a tooltip with mechanic description.

**Behavior:** Set on openSlot() from game config. Dismissed on click or closeSlot().

## Implementation Plan

**Step 1:** Design doc (this file).
**Step 2:** HTML for clock + mechanic help.
**Step 3:** Clock JS in ui-slot.js.
**Step 4:** Mechanic help JS in ui-slot.js.
**Step 5:** CSS + QA + commit + push.
