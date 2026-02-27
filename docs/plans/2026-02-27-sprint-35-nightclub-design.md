# Sprint 35 — "The Nightclub"

**Date:** 2026-02-27
**Status:** Approved (user delegated full autonomy)

## Features

### Feature 1: Game Favorites Quick Bar

**Motivation:** Players have favorites but navigating back to them in an 80+ game lobby
is slow. A quick-access bar of favorited games at the top of the lobby speeds up access.

**UI:** Horizontal scrollable bar below the hero section showing favorite game tiles.
Each tile: game thumbnail/icon, name, and "play" click action.
Shows "Add favorites from game cards below" if empty.

**Data:** Uses existing `casinoFavorites` localStorage (already implemented).

**Behavior:** Renders on lobby load. Click → opens game directly. Max 8 visible, scroll for more.

### Feature 2: Sound Theme Selector

**Motivation:** Players may prefer different ambient soundscapes. Currently the ambient sound
is tied to provider themes. A lobby-level sound theme selector lets players pick their mood.

**UI:** In settings modal, new "Sound Theme" dropdown: Classic Casino, Tropical, Cyberpunk, Zen, Off.

**Behavior:** Overrides the ambient provider soundscape with selected theme.
Stored in `appSettings.soundTheme`.

**Implementation:**
- Add `soundTheme` to `settingsDefaults` in globals.js
- Add dropdown to settings modal HTML + handler in openSettingsModal
- SoundManager.startAmbient() checks appSettings.soundTheme override

## Implementation Plan

**Step 1:** Design doc (this file).
**Step 2:** HTML for favorites quick bar + sound theme dropdown.
**Step 3:** Favorites quick bar JS in ui-lobby.js.
**Step 4:** Sound theme selector JS in settings + SoundManager patch.
**Step 5:** CSS + QA + commit + push.
