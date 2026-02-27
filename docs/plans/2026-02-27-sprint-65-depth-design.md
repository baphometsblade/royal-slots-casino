# Sprint 65 — "The Depth"

**Date:** 2026-02-27
**Status:** Approved (user delegated full autonomy)

## Features

### Feature 1: Total Wagered Display

**Motivation:** Players want to see their cumulative betting action this session.
"Wagered: $X" in the slot top bar provides total-action awareness.

**UI:** Small element (`#twDisplay`) in the slot top bar. Shows "Wagered: $X".

**Behavior:** Uses existing _sessTotalBet. Updated after each spin.
Session-scoped, resets on closeSlot().

### Feature 2: Active Filter Label

**Motivation:** When players filter or search in the lobby, it's not always clear
what filter is active. A small label near the game grid shows the current filter.

**UI:** Small element (`#afLabel`) near the all-games header. Shows "Showing: X"
where X is the active filter or search term.

**Behavior:** Updated when filter changes. Shows "All Games", provider name,
category name, or search query. Pure display.

## Implementation Plan

**Step 1:** Design doc (this file).
**Step 2:** HTML for total wagered + active filter label.
**Step 3:** Total wagered JS in ui-slot.js + hook.
**Step 4:** Active filter label JS in ui-lobby.js.
**Step 5:** CSS + QA + commit + push.
