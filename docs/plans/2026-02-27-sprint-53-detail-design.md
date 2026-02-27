# Sprint 53 — "The Detail"

**Date:** 2026-02-27
**Status:** Approved (user delegated full autonomy)

## Features

### Feature 1: Hot/Cold Indicator

**Motivation:** Players enjoy seeing momentum feedback. A small indicator
near the spin button shows whether they're on a winning or losing streak
with a flame (hot) or snowflake (cold) icon.

**UI:** Small badge (`#hcBadge`) near the spin area. Shows flame + count
for 2+ consecutive wins, snowflake + count for 3+ consecutive losses.
Hidden when streak is broken.

**Behavior:** Tracks consecutive results. Resets on closeSlot().
Different from win streak badge (Sprint 46) which only counts wins.

### Feature 2: Lucky Symbol Tracker

**Motivation:** Players are curious which symbols have been "luckiest" for them.
Shows the most frequently appearing winning symbol during the current session.

**UI:** Small display (`#lsTracker`) below the reels. Shows "Lucky: [symbol]"
with a count. Hidden until first win.

**Behavior:** Tracks symbol frequency from winning spins. Session-scoped.
Resets on closeSlot().

## Implementation Plan

**Step 1:** Design doc (this file).
**Step 2:** HTML for hot/cold badge + lucky symbol tracker.
**Step 3:** Hot/cold JS in ui-slot.js.
**Step 4:** Lucky symbol JS in ui-slot.js.
**Step 5:** Hook into win-logic.js + closeSlot(). CSS + QA + commit + push.
