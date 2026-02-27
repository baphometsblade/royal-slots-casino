# Sprint 58 — "The Comfort"

**Date:** 2026-02-27
**Status:** Approved (user delegated full autonomy)

## Features

### Feature 1: Keyboard Shortcut Hints

**Motivation:** New players don't know keyboard shortcuts. A small hint
overlay appears when a slot opens, showing Space=Spin, Esc=Close.
Fades out after 5 seconds or first interaction.

**UI:** Small overlay (`#kbHints`) in the slot view. Shows shortcut keys.
Auto-hides after 5s.

**Behavior:** Created in openSlot(). Removed on first keypress or timeout.

### Feature 2: Balance Milestone Celebration

**Motivation:** Players enjoy recognition when they hit balance milestones.
When balance crosses $1K, $5K, $10K, $25K, $50K, show a brief flash.

**UI:** Brief text pulse on the balance display area.

**Behavior:** Tracked via `_lastMilestone`. Checks after each spin.
Session-scoped.

## Implementation Plan

**Step 1:** Design doc (this file).
**Step 2:** HTML for keyboard hints.
**Step 3:** Keyboard hints JS in ui-slot.js.
**Step 4:** Balance milestone JS in ui-slot.js.
**Step 5:** CSS + QA + commit + push.
