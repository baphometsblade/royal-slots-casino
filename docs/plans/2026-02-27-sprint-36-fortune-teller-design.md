# Sprint 36 — "The Fortune Teller"

**Date:** 2026-02-27
**Status:** Approved (user delegated full autonomy)

## Features

### Feature 1: Lucky Spin Mini-Game

**Motivation:** A simple daily mini-game separate from slot machines. A fortune wheel
with varied prize tiers adds excitement and gives players another reason to visit.

**Modal:** `#luckySpinModal` — accessible via "Lucky Spin" button in lobby nav.
One free spin per day, additional spins cost $50 each.

**Wheel segments (8):**
- $50 (x2 segments)
- $100 (x2 segments)
- $250 (x1)
- $500 (x1)
- 50 XP (x1)
- 100 XP (x1)

**Storage:** `localStorage('matrixLuckySpin')` = `{ lastFree: timestamp, totalSpins: N }`

**Animation:** CSS rotation animation on the wheel, landing on random segment.

### Feature 2: Game Rating System

**Motivation:** Players can rate games, helping others discover quality games.
Ratings visible on game cards in the lobby.

**UI:** After closing a slot game, show a quick 1-5 star rating prompt (dismissable).
Average rating displayed on game cards.

**Storage:** `localStorage('matrixGameRatings')` = `{ gameId: { rating: N, count: N }, ... }`
Player's own ratings: `localStorage('matrixMyRatings')` = `{ gameId: N, ... }`

## Implementation Plan

**Step 1:** Design doc (this file).
**Step 2:** HTML for lucky spin modal + rating prompt.
**Step 3:** Lucky spin JS in ui-modals.js.
**Step 4:** Game rating JS in ui-lobby.js + ui-slot.js.
**Step 5:** CSS + QA + commit + push.
