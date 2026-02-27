# Sprint 67 — "The Resilience"

**Date:** 2026-02-27
**Status:** Approved (user delegated full autonomy)

## Features

### Feature 1: Dry Spell Encouragement

**Motivation:** After several consecutive losses, a small encouraging message
keeps the experience positive. Fun gamification touch with no game logic impact.

**UI:** Small overlay (`#dsMsg`) in the slot view. Shows encouraging messages
like "Luck's brewing!" or "Stay patient!" after 5+ consecutive losses.
Fades out after 3 seconds.

**Behavior:** Tracks consecutive loss count. Triggers at 5+. Resets on any win.
Session-scoped, resets on closeSlot().

### Feature 2: Lobby Quick Stats Bar

**Motivation:** Players want to see their lifetime stats at a glance in the lobby.
A compact bar showing total spins, biggest win, and win rate.

**UI:** Small bar (`#lqStats`) at the top of the lobby, above game filters.
Shows "Spins: X | Best: $X | Win Rate: X%".

**Behavior:** Rendered from global `stats` object. Updated on lobby render.

## Implementation Plan

**Step 1:** Design doc (this file).
**Step 2:** HTML for encouragement + lobby stats.
**Step 3:** Dry spell JS in ui-slot.js + hook in win-logic.js.
**Step 4:** Lobby stats JS in ui-lobby.js.
**Step 5:** CSS + QA + commit + push.
