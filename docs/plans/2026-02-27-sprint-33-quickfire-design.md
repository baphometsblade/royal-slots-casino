# Sprint 33 — "The Quickfire"

**Date:** 2026-02-27
**Status:** Approved (user delegated full autonomy)

## Features

### Feature 1: Bet Presets

**Motivation:** Players often switch between favorite bet amounts. Quick-access bet presets
save time and improve the spin loop flow.

**UI:** Row of 4 preset buttons below the bet controls in the slot view.
Presets: $1, $5, $25, $100 (or game max if lower).

**Behavior:** Clicking a preset sets `currentBet` to that value immediately.
Buttons highlight which preset matches current bet. Respects game min/max bet limits.

**Storage:** None needed — presets are fixed and derived from game config.

### Feature 2: Hot/Cold Streak Indicator

**Motivation:** Players love knowing when they're on a streak. A visual indicator
showing recent win/loss pattern adds excitement.

**UI:** Small bar of 10 dots below the reel grid, each representing the last 10 spins.
Green dot = win, red dot = loss. Current spin pulses. Shows streak count label
("🔥 3 Win Streak" or "❄️ 4 Cold Streak").

**Data:** Uses existing in-memory `spinHistory` array (session-scoped, already tracked in ui-slot.js).

**Behavior:** Updates after each spin. Streak resets on game change. No localStorage needed.

## Implementation Plan

**Step 1:** Design doc (this file).
**Step 2:** HTML for bet presets bar + streak indicator in slot view.
**Step 3:** Bet preset JS in ui-slot.js.
**Step 4:** Streak indicator JS in ui-slot.js.
**Step 5:** CSS + QA + commit + push.
