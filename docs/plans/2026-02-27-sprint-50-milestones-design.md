# Sprint 50 — "The Milestone"

**Date:** 2026-02-27
**Status:** Approved (user delegated full autonomy)

## Features

### Feature 1: Total Games Played Counter

**Motivation:** Players want to see their lifetime total of unique games tried.
A small counter in the lobby shows "X/80+ games explored".

**UI:** Small badge in the lobby near the section header or user area showing
"Explored: X / N games". Updates when a new game is opened.

**Behavior:** Tracked in localStorage as a Set of unique game IDs. Renders
on lobby load. Persists across sessions.

### Feature 2: Last Win Replay Preview

**Motivation:** After a good win, players want to quickly see their last
winning combination. A compact display in the slot view shows the previous
spin's result symbols.

**UI:** Small row of 3-5 symbol labels below the reel area showing last
win result. Only visible after a win. Clears on next spin.

**Behavior:** Records the winning symbols from checkWin. Renders as text
labels below reels. Clears when a new spin starts.

## Implementation Plan

**Step 1:** Design doc (this file).
**Step 2:** HTML for games counter + last win preview.
**Step 3:** Games Counter JS in ui-lobby.js.
**Step 4:** Last Win Preview JS in ui-slot.js.
**Step 5:** CSS + QA + commit + push.
