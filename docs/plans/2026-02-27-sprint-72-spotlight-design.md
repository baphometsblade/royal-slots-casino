# Sprint 72 — "The Spotlight"

**Date:** 2026-02-27
**Status:** Approved (user delegated full autonomy)

## Features

### Feature 1: Game of the Day

**Motivation:** A daily featured game encourages players to try different slots.
Deterministic selection using day-of-year ensures consistency across sessions.

**UI:** Small badge ("GOTD") on one game card in the lobby. Gold accent.
Changes daily based on date-seeded selection from GAMES array.

**Behavior:** Uses `new Date().toDateString()` hash to pick a deterministic game
each day. Rendered in the card template. Pure display, no state to persist.

### Feature 2: Lobby Time Greeting

**Motivation:** A friendly, time-aware greeting in the lobby adds personality.
"Good morning!", "Good afternoon!", "Good evening!" based on local time.

**UI:** Small text element (`#lobbyGreet`) near the lobby header. Subtle, muted.

**Behavior:** Computed from current hour at render time. Pure display.

## Implementation Plan

**Step 1:** Design doc (this file).
**Step 2:** HTML for lobby greeting.
**Step 3:** Game of the Day badge in ui-lobby.js card template.
**Step 4:** Greeting JS in ui-lobby.js.
**Step 5:** CSS + QA + commit + push.
