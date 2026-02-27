# Sprint 45 — "The Polish"

**Date:** 2026-02-27
**Status:** Approved (user delegated full autonomy)

## Features

### Feature 1: Recent Wins Feed

**Motivation:** Players want to see their recent big wins across all games in the lobby.
A compact "My Wins" section shows the last 5 significant wins.

**UI:** Small horizontal scrollable strip below the hot games section showing recent
wins as cards. Each card: game name, win amount, relative time (e.g. "2m ago").

**Behavior:** Wins tracked in sessionStorage. A win is recorded when winAmount >= 2x bet.
Array capped at 10 entries. Renders on lobby load. Clears on page refresh (session-scoped).

### Feature 2: Lobby Layout Toggle

**Motivation:** Some players prefer a compact list view over the grid. A toggle lets
them switch between grid and list layout for the main "All Games" section.

**UI:** Two small buttons (grid icon, list icon) next to the "All Slots" title.
List view shows game name, provider, RTP, and a "Play" button per row.

**Behavior:** Toggle state saved in localStorage. Default is grid. Only affects
the "All Games" section, not hot games.

## Implementation Plan

**Step 1:** Design doc (this file).
**Step 2:** HTML for wins feed container + layout toggle buttons.
**Step 3:** Recent Wins JS in win-logic.js + ui-lobby.js.
**Step 4:** Layout Toggle JS in ui-lobby.js.
**Step 5:** CSS + QA + commit + push.
