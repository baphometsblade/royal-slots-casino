# Sprint 40 — "The Strategist"

**Date:** 2026-02-27
**Status:** Approved (user delegated full autonomy)

## Features

### Feature 1: Bankroll Manager

**Motivation:** Responsible gambling feature. Players can set a session budget and
see a progress bar showing how much they've spent. Warnings at 75% and 90% thresholds.

**UI:** Small "Set Budget" button in slot top bar. When active, a slim progress bar
appears under the bet area showing budget used vs. remaining. Color-coded:
green (<50%), yellow (50-75%), orange (75-90%), red (>90%).

**Behavior:** Session-scoped (resets on slot close). Tracks total wagered vs. budget.
Optional — player can dismiss or ignore. No hard stop, just visual feedback.

### Feature 2: Game Comparison Tool

**Motivation:** With 80+ games, players want to compare stats before choosing.
A side-by-side comparison of 2-3 games helps informed decisions.

**UI:** "Compare" checkbox toggle in lobby. When active, clicking a game card adds
it to comparison (max 3). A comparison bar appears at bottom showing selected games.
"Compare Now" button opens a modal with side-by-side stats.

**Behavior:** Compares: name, provider, RTP, volatility, grid size, mechanics, paylines.
Highlights the "best" value in each row (highest RTP, etc.). Purely client-side.

## Implementation Plan

**Step 1:** Design doc (this file).
**Step 2:** HTML for bankroll manager + comparison modal.
**Step 3:** Bankroll manager JS in ui-slot.js.
**Step 4:** Game comparison JS in ui-lobby.js + ui-modals.js.
**Step 5:** CSS + QA + commit + push.
