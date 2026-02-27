# Sprint 38 — "The Trophy Room"

**Date:** 2026-02-27
**Status:** Approved (user delegated full autonomy)

## Features

### Feature 1: Win Replay Gallery

**Motivation:** Players want to relive their biggest wins. A gallery of saved wins
with replay animations provides lasting satisfaction and social proof.

**UI:** "Replays" nav button in lobby. `#winReplayModal` shows saved win entries.
Each entry: game name, win amount, multiplier, symbols, timestamp.
Click a replay to see a simplified animation of the win.
Max 20 saved replays (FIFO when full).

**Auto-save criteria:** Wins >= 10x bet are auto-saved.
Players can also manually save any win via a "Save" button on the win display.

**Storage:** `localStorage('matrixWinReplays')` = array of replay objects.

### Feature 2: Session Time Tracker

**Motivation:** Responsible gambling feature. Shows players how long they've been
playing in the current session and optionally reminds them to take breaks.

**UI:** Compact timer in slot top bar showing "Session: 12m" format.
After 30 minutes, timer turns yellow. After 60 minutes, turns red with a gentle
"Consider taking a break" tooltip.

**Behavior:** Timer starts when a slot opens, pauses when returning to lobby.
No persistent storage needed — session-only.

## Implementation Plan

**Step 1:** Design doc (this file).
**Step 2:** HTML for win replay modal + session timer.
**Step 3:** Win replay JS in ui-modals.js.
**Step 4:** Session timer JS in ui-slot.js.
**Step 5:** CSS + QA + commit + push.
