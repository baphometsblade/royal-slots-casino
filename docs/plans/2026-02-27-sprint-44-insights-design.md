# Sprint 44 — "The Insight"

**Date:** 2026-02-27
**Status:** Approved (user delegated full autonomy)

## Features

### Feature 1: Session P&L Sparkline

**Motivation:** Players want a visual sense of their session trajectory. A compact
SVG sparkline chart in the slot view shows balance over time.

**UI:** Small sparkline chart (120x30px) next to the balance display in slot view.
Green when up, red when down. Updates after each spin. Shows last 20 data points.

**Behavior:** Tracks balance at each spin completion. Pure SVG polyline drawn from
an in-memory array. Resets on slot close. No persistence.

### Feature 2: Game Collections

**Motivation:** Curated game groupings help players discover games by theme rather
than just mechanics or providers. E.g., "High Rollers", "Quick Games", "Jackpot Hunters".

**UI:** Horizontal scrollable collection tabs above the main game grid. Each
collection shows a themed subset of games. Default tab is "All Games".

**Behavior:** Collections defined as static arrays matching game properties. Rendered
from GAMES data. Filter applied like existing mechanic/provider filters.

## Implementation Plan

**Step 1:** Design doc (this file).
**Step 2:** HTML for sparkline container + collection tabs.
**Step 3:** Sparkline JS in ui-slot.js.
**Step 4:** Collections JS in ui-lobby.js.
**Step 5:** CSS + QA + commit + push.
