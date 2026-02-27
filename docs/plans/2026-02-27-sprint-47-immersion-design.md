# Sprint 47 — "The Immersion"

**Date:** 2026-02-27
**Status:** Approved (user delegated full autonomy)

## Features

### Feature 1: Ambient Sound Toggle Per Game

**Motivation:** Players want control over ambient game sounds independent of the
main sound toggle. A dedicated ambient toggle in the slot toolbar lets them keep
SFX but silence the background soundscape.

**UI:** Small speaker icon button in the slot top bar (next to existing controls).
Toggles between "ambient on" and "ambient off" states. Saved per session.

**Behavior:** Calls SoundManager.stopAmbient()/startAmbient() directly. Does not
affect spin sounds or win sounds. Session-scoped toggle.

### Feature 2: Quick Stats Tooltip on Hover

**Motivation:** Players want to see key game stats without entering the paytable.
Hovering the "i" (info) area shows a compact stats tooltip.

**UI:** Tooltip appears near the game info area in slot view on hover. Shows:
lines/ways, min/max bet, volatility, bonus type. Auto-hides after 3s.

**Behavior:** Built from currentGame properties. No persistence, purely display.

## Implementation Plan

**Step 1:** Design doc (this file).
**Step 2:** HTML for ambient toggle + stats tooltip.
**Step 3:** Ambient Toggle JS in ui-slot.js.
**Step 4:** Stats Tooltip JS in ui-slot.js.
**Step 5:** CSS + QA + commit + push.
