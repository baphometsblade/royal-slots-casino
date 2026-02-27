# Sprint 55 — "The Flow"

**Date:** 2026-02-27
**Status:** Approved (user delegated full autonomy)

## Features

### Feature 1: Sound Volume Quick-Slider

**Motivation:** Players want to adjust volume quickly without opening settings.
A small range slider in the slot top bar gives instant control.

**UI:** Compact range input (`#qvSlider`) in the slot top bar, 0-100.
Updates SoundManager volume in real-time.

**Behavior:** Reads/writes `appSettings.soundVolume`. Session-scoped display
but saves to settings for persistence.

### Feature 2: Bet History Mini-Chart

**Motivation:** Players want to see their betting pattern at a glance.
A tiny SVG sparkline showing last 10 bet sizes, updating after each spin.

**UI:** Small SVG element (`#bhChart`) near the bet controls. Shows a
line chart of recent bet values.

**Behavior:** Tracks bet sizes per spin. Session-scoped, resets on closeSlot().

## Implementation Plan

**Step 1:** Design doc (this file).
**Step 2:** HTML for volume slider + bet chart.
**Step 3:** Volume slider JS in ui-slot.js.
**Step 4:** Bet history chart JS in ui-slot.js.
**Step 5:** CSS + QA + commit + push.
