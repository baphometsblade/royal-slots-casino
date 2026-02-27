# Sprint 73 — "The Recall"

**Date:** 2026-02-27
**Status:** Approved (user delegated full autonomy)

## Features

### Feature 1: Lobby Recent Searches

**Motivation:** Players often search for the same games. Showing recent searches
below the search bar saves time.

**UI:** Small container (`#recentSearches`) below the search input.
Shows up to 3 recent search terms as clickable chips.

**Behavior:** Stored in localStorage. Updated on each search. Clicking a chip
triggers that search. Session-persistent via localStorage.

### Feature 2: Saved Bet Indicator

**Motivation:** When opening a game with a remembered bet, briefly show what
bet was restored so the player is aware.

**UI:** Small overlay (`#savedBetHint`) in the slot view. Shows "Restored: $X".
Fades out after 2 seconds.

**Behavior:** Triggered when lastBet is loaded for a game. Session-scoped display.

## Implementation Plan

**Step 1:** Design doc (this file).
**Step 2:** HTML for recent searches + saved bet hint.
**Step 3:** Recent searches JS in ui-lobby.js.
**Step 4:** Saved bet hint JS in ui-slot.js.
**Step 5:** CSS + QA + commit + push.
