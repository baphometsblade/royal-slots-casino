# Win Juice & Game Feel — Design Doc

**Date:** 2026-02-25
**Status:** Approved (user-delegated)

## Goal

Make every spin feel more tactile and satisfying without touching game logic or payout math.
All changes are purely CSS animations + tiny JS hooks. QA regression must still pass.

## Five Improvements

### 1. Staggered Winning Cell Glow Cascade
Winning cells currently all highlight simultaneously. Instead, apply a pulse that cascades
left-to-right with an 80ms offset per column — the same way a real slot machine "counts"
across its payline. Two CSS classes: `.sym-win-glow` (base) applied staggered via JS.

### 2. Reel Stop Bounce
Each column currently snaps to final position. Add a spring overshoot: the strip scrolls
2-4px past the target, then bounces back in 180ms. CSS `@keyframes reelBounce` applied to
the strip element on stop. Magnitude scales with: small win = subtle, big win = snappier.

### 3. Near-Miss Heartbeat
When exactly 2 matching high-value symbols land on payline row and the 3rd column misses,
apply a 1-pulse heartbeat (`scale 1 → 1.06 → 1`) to the matching cells. Creates "so close!"
tension. Detected in `checkAnticipation` path after the last reel stops.

### 4. Loss Droop
On a complete loss (no wins at all), all reel cells briefly dim (`opacity 0.85`, slight
`saturate(0.5)` filter) for 280ms then recover. Subtle "deflate" feel. Applied from the
existing loss path in `ui-slot.js`.

### 5. Win Counter Ease-In
The balance counter roll currently runs at a linear tick rate. Change to ease-in-out cubic:
fast at start, slows near the final value. Uses a cubic easing function on the step size
within `playCounterTick` / the counter roll loop.

## Architecture

- All CSS goes at the bottom of `styles.css` in a clearly labelled block
- JS hooks in `js/ui-slot.js` at the existing win/loss resolution points
- No changes to `index.html`, `constants.js`, `win-logic.js`, or server code
- Single file parallelism: `styles.css` agent and `js/ui-slot.js` agent run in parallel

## Risk

Low. All changes are additive class-adds + CSS keyframes. Existing behavior unchanged if
CSS doesn't load or browser doesn't support the keyframe. QA regression tests logic, not
animations — all assertions remain valid.
