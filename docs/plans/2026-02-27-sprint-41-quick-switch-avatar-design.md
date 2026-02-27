# Sprint 41 — "The Navigator"

**Date:** 2026-02-27
**Status:** Approved (user delegated full autonomy)

## Features

### Feature 1: Quick Game Switch Bar

**Motivation:** Returning to the lobby to switch games is friction. A compact bar
of recently played games inside the slot view enables instant game hopping.

**UI:** Horizontal scrollable strip below the slot top bar showing thumbnail pills
of up to 5 recently played games. Current game is highlighted. Click to instantly
switch. Appears only after playing 2+ games in the session.

**Behavior:** Reads from the existing recently-played localStorage list. Clicking
a different game calls closeSlot() then openSlot() seamlessly. No extra persistence
needed — leverages existing recently-played tracking.

### Feature 2: Avatar Picker

**Motivation:** Personalization drives engagement. Let players choose from preset
avatar icons displayed next to their username in the lobby and leaderboard.

**UI:** Grid of ~12 preset emoji/icon avatars in a small modal accessible from
the profile area. Selected avatar shown next to username in lobby header.

**Behavior:** Stored in localStorage (user-scoped). Default avatar if none chosen.
Shown in lobby header, leaderboard entries, and activity feed.

## Implementation Plan

**Step 1:** Design doc (this file).
**Step 2:** HTML for quick switch strip + avatar picker modal.
**Step 3:** Quick switch JS in ui-slot.js.
**Step 4:** Avatar picker JS in ui-modals.js.
**Step 5:** CSS + QA + commit + push.
