# Sprint 37 — "The Explorer"

**Date:** 2026-02-27
**Status:** Approved (user delegated full autonomy)

## Features

### Feature 1: Game Sort Options

**Motivation:** With 80+ games, players want different ways to browse. Sorting by popularity,
name, RTP, or volatility helps players find games matching their preference.

**UI:** Sort dropdown in the lobby filter area (near the search bar).
Options: Popular (default), A-Z, Z-A, Highest RTP, Most Volatile, Least Volatile.

**Behavior:** Sorts the filtered game list. Selection stored in session (resets on refresh).
Re-sorts on every filter change. Works with search and category filters.

### Feature 2: Slot Demo Mode

**Motivation:** Players hesitate to try unfamiliar games because they risk real balance.
A 3-spin free demo mode lets players preview any game risk-free before committing.

**UI:** "Demo" button on each game card hover overlay.
When in demo mode: banner reads "DEMO MODE — 3 spins remaining" at top of slot view.
Demo uses $10,000 play money balance (not touching real balance).
After 3 spins, show "Demo over — Play for real?" prompt with Play/Close buttons.

**Storage:** No persistence needed — demo state is session-only.

**Behavior:**
- `openSlot(game, { demo: true })` enters demo mode
- Sets temporary demo balance of $10,000
- Counts spins down from 3
- Wins/losses don't affect real balance, stats, or XP
- After 3 spins or manual exit, restores real balance

## Implementation Plan

**Step 1:** Design doc (this file).
**Step 2:** HTML for sort dropdown + demo mode banner/prompt.
**Step 3:** Game sort JS in ui-lobby.js.
**Step 4:** Demo mode JS in ui-slot.js.
**Step 5:** CSS + QA + commit + push.
