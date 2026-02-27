# Sprint 75 — "The Horizon"

**Date:** 2026-02-27
**Status:** Approved (user delegated full autonomy)

## Features

### Feature 1: Balance Runway

**Motivation:** Players benefit from knowing how many more spins they can afford
at their current bet. A simple "Runway: ~42 spins" helps with budgeting.

**UI:** Small element (`#balRunway`) in the slot view HUD. Shows "Runway: ~N spins".
Hidden when no spins have occurred.

**Behavior:** Calculated as `floor(balance / currentBet)`. Updated after each spin.
Session-scoped, reset on closeSlot.

### Feature 2: Lobby Back-to-Top Button

**Motivation:** With 80+ games, the lobby scrolls long. A floating "back to top"
button improves navigation.

**UI:** Fixed button (`#lobbyBtt`) at bottom-right corner. Only visible when
scrolled down more than 400px. Smooth-scrolls to top on click.

**Behavior:** Listens to lobby container scroll. Pure UI, no state.

## Implementation Plan

**Step 1:** Design doc (this file).
**Step 2:** HTML for balance runway + back-to-top button.
**Step 3:** Balance runway JS in ui-slot.js.
**Step 4:** Back-to-top JS in ui-lobby.js.
**Step 5:** CSS + QA + commit + push.
