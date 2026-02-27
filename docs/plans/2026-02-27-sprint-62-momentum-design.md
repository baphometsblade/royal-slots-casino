# Sprint 62 — "The Momentum"

**Date:** 2026-02-27
**Status:** Approved (user delegated full autonomy)

## Features

### Feature 1: Balance Change Indicator

**Motivation:** Players want instant visual feedback on each spin's financial impact.
An animated delta display (+$X / -$X) near the balance briefly after each spin.

**UI:** Small overlay element (`#bcDelta`) near the balance display.
Green for wins, red for losses. Fades out after 1.5 seconds.

**Behavior:** Computed from win amount and bet. Shows "+$winAmount" on win,
"-$currentBet" on loss. Session-scoped animation, no state to reset.

### Feature 2: Unplayed Game Badge

**Motivation:** With 80+ games, players may overlook games they haven't tried.
A "Try!" badge on unplayed game cards encourages exploration.

**UI:** Small badge (`up-badge` class) on game cards the user has never played.
Based on _popCounts having zero plays for the game.

**Behavior:** Computed at render time from recently-played data. Pure display.

## Implementation Plan

**Step 1:** Design doc (this file).
**Step 2:** HTML for balance change indicator.
**Step 3:** Balance change JS in ui-slot.js + hook in win-logic.js.
**Step 4:** Unplayed badge in ui-lobby.js card template.
**Step 5:** CSS + QA + commit + push.
