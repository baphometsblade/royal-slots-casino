# Sprint 43 — "The Smart Lobby"

**Date:** 2026-02-27
**Status:** Approved (user delegated full autonomy)

## Features

### Feature 1: Game Recommendations

**Motivation:** With 80+ games, discovery is hard. A "Recommended for You" section
uses the player's history to suggest similar games they haven't tried yet.

**UI:** "Recommended" section in the lobby, above or near the All Slots grid.
Shows 4-6 game cards with a brief reason ("Same provider", "Similar mechanics").
Collapsible. Only shown when player has played 3+ games.

**Behavior:** Algorithm: find providers and mechanics from recently played games,
then suggest un-played games matching those traits. Weighted by frequency.
Pure client-side — reads from recently-played and GAMES array.

### Feature 2: Keyboard Shortcuts Overlay

**Motivation:** Power users want fast navigation. A shortcuts help modal shows
all available keyboard shortcuts in a clean overlay.

**UI:** Triggered by pressing "?" or clicking a small "?" icon in the lobby header.
Modal with a grid of shortcut key + description pairs.

**Behavior:** Reads shortcuts from app.js keyboard handler. Static content — no
persistence needed.

## Implementation Plan

**Step 1:** Design doc (this file).
**Step 2:** HTML for recommendations section + shortcuts modal.
**Step 3:** Recommendations JS in ui-lobby.js.
**Step 4:** Shortcuts modal JS in ui-modals.js + "?" key binding.
**Step 5:** CSS + QA + commit + push.
