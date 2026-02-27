# Cinematic Slot UI Redesign

**Date:** 2026-02-27
**Branch:** claude/unruffled-mccarthy
**Status:** Approved for implementation

## Overview

Full cinematic redesign of the slot machine UI — Approach C. Maximise reel presence, replace persistent badge clutter with an elegant toast notification system and an on-demand Stats Report Panel.

## Goals

1. **Expand reel area** — slim the top and bottom bars so the reels fill ~82% of the modal height.
2. **Toast notifications** — post-spin stats surface as brief animated toasts sliding in from the right edge of the reel area; no persistent HUD clutter visible during play.
3. **Stats Report Panel** — a frosted full-overlay panel (📊 button or auto-triggers every 25 spins) that organises all 80+ analytics badges into readable category cards.
4. **Visual polish** — win-cell glow, mega-win shimmer pulse, cleaner bottom-bar proportions.
5. **Asset generation** — generate 42 missing animated WebP slot backgrounds via `generate_animated_backgrounds_pil.py` and run SDXL chrome quality pass.

## Architecture

### Layout changes (CSS overrides, no DOM restructuring)
- `.slot-top-bar` → `min-height: 36px`, hide non-essential controls (budget, goal, ambient, vmMeter, rtpGauge, nav arrows, qvSlider)
- `.slot-reel-area` → `flex: 1 1 0` (fills remaining height)
- `.slot-bottom-bar` → `min-height: 58px`, hide 50+ secondary badges
- All 80+ sprint badges remain in DOM (JS still updates them); CSS hides them so stats panel can read values

### New HTML elements
| ID | Purpose |
|---|---|
| `#statsReportBtn` | 📊 button in top bar right, opens Stats Panel |
| `#toastContainer` | Absolute-positioned toast feed inside reel area |
| `#statsReportPanel` | Full overlay stats panel with frosted background |

### Toast system (`js/ui-slot.js` append)
- `showCinematicToast(text, type, duration)` — creates `.cine-toast.ct-{type}` card, auto-removes after duration with exit animation
- `_dispatchSpinToasts(won, winAmount, betAmount, extras)` — called post-spin, dispatches toasts for big wins, streaks, bonuses, near misses
- Max 4 simultaneous toasts; oldest evicted on overflow

### Stats Report Panel (`js/ui-slot.js` append)
- `openStatsPanel()` / `closeStatsPanel()` — show/hide with slide-up/slide-down animation
- `_populateStatsPanel()` — iterates `_srpConfig` array of {cat, rows[{id, label}]}, reads textContent from existing badge elements, renders into category cards
- `_initCinematicUI()` — called in openSlot, sets interval to auto-open panel every 25 spins

### Categories in Stats Panel
Session | Wins | Balance | Bets | Streaks | Game Stats | History

## Assets
- Run `generate_animated_backgrounds_pil.py` → 42 missing animated WebP backgrounds
- Run `reasset_slot_chrome.py --engine auto --force` → SDXL chrome quality pass

## QA
All changes are CSS additions/overrides + JS appended functions + 2 JS hook patches.
Existing badge IDs remain in DOM — QA regression tests still pass (badge values still update).

## Implementation
Single Node.js script: `cinematic_impl.js`
Phases: HTML patches → CSS append → JS append → JS hook patches → QA → commit
