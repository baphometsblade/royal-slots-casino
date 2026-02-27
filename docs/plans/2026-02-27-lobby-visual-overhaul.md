# Lobby Visual Overhaul
**Date:** 2026-02-27
**Status:** Approved for implementation

## Goals
1. **Game card richness** — stronger hover with tag-colour glow ring, shimmer sweep, prominent PLAY button
2. **Filter tab counts** — inject live game-count badges (e.g. "🔥 Hot · 23") into each filter tab
3. **Provider chip counts** — small badge on each provider chip showing game count
4. **Section title accents** — coloured left-border bar + gradient text for each `section-title`
5. **Featured Spotlight row** — a horizontal hero scroller (6 curated games in larger 200px cards) injected above Top Picks

## Architecture

### CSS additions (append to styles.css)
- `.game-card` hover: `translateY(-8px) scale(1.03)` + coloured `box-shadow` ring (green default, red for HOT, gold for JACKPOT)
- `.game-card-hot:hover` → red glow; `.game-card-jackpot:hover` → gold glow
- `.game-thumbnail::after` shimmer sweep keyframe on hover
- `.game-hover-overlay` play button: larger circle (56px), white fill, subtle scale pulse
- `.section-title::before` → 3px coloured left border; `.section-title` gradient text
- `.filter-tab .tab-count` — small pill badge injected via JS
- `.provider-chip .chip-count` — tiny count badge
- `#featuredSpotlight` — horizontal scroll container, 200px card height, snap-scroll
- `.featured-card` — larger card with gradient overlay + game name at bottom

### JS additions (append to js/ui-lobby.js)
- `_injectFilterCounts()` — reads GAMES array, counts games per filter/provider, updates DOM badges
- `_renderFeaturedSpotlight()` — picks top 6 games (1 JACKPOT, 2 HOT, 1 NEW, 2 POPULAR), renders horizontal strip, inserts before `#hotGames` section header
- Both called from `initLobby()` hook

### HTML patch (index.html)
- Insert `<div id="featuredSpotlight" class="featured-spotlight"></div>` before `.section-header` for Top Picks

## QA
CSS-only additions + appended JS functions. No existing IDs or functions modified.
Regression tests still pass (badge IDs untouched, game card onclick intact).
