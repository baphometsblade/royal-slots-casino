# Visual Overhaul Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform Matrix Spins from static PNG symbols into a fully immersive casino with animated symbols, animated backgrounds, animated chrome frames, 3D depth effects, dramatic win sequences, canvas particle engine, and per-provider sound design.

**Architecture:** Client-side visual overhaul using animated WebP assets (AI-generated via AnimateDiff/ComfyUI), CSS 3D transforms for depth, a canvas-based particle engine for provider-themed effects, and enhanced Web Audio synthesis for immersive soundscapes. All features gated behind a quality tier system (Ultra/High/Medium/Low/Off).

**Tech Stack:** HTML5 Canvas, CSS perspective/transforms, Web Audio API, animated WebP, Python + ComfyUI (asset generation)

---

## Phase 1: Foundation (Constants, Settings, Quality Tiers)

### Task 1: Add Animation Quality Constants to constants.js

**Files:**
- Modify: `constants.js` (after line ~190)

**Implementation:**
Add after existing animation timing constants:

```javascript
// === Visual Overhaul: Quality Tiers ===
const QUALITY_ULTRA = 'ultra';
const QUALITY_HIGH = 'high';
const QUALITY_MEDIUM = 'medium';
const QUALITY_LOW = 'low';
const QUALITY_OFF = 'off';
const QUALITY_TIERS = [QUALITY_ULTRA, QUALITY_HIGH, QUALITY_MEDIUM, QUALITY_LOW, QUALITY_OFF];

// Particle budgets per quality tier
const PARTICLES_MAX_ULTRA = 300;
const PARTICLES_MAX_HIGH = 100;
const PARTICLES_MAX_MEDIUM = 50;
const PARTICLES_MAX_LOW = 0;

// Ambient particle count (always-on background particles)
const AMBIENT_PARTICLES_ULTRA = 5;
const AMBIENT_PARTICLES_HIGH = 3;
const AMBIENT_PARTICLES_MEDIUM = 0;

// 3D depth effect values
const DEPTH_WIN_FORWARD = 30;    // px translateZ for winning symbols
const DEPTH_LOSE_BACK = -10;     // px translateZ for non-winning symbols
const DEPTH_LANDING_TILT = -3;   // deg rotateX for landing bounce
const DEPTH_PERSPECTIVE = 1000;  // px perspective value

// Screen shake intensities (px)
const SHAKE_EPIC_INTENSITY = 4;
const SHAKE_MEGA_INTENSITY = 8;
const SHAKE_JACKPOT_INTENSITY = 12;
const SHAKE_EPIC_DURATION = 1500;
const SHAKE_MEGA_DURATION = 2000;
const SHAKE_JACKPOT_DURATION = 3000;

// Cinematic win sequence timing (ms)
const CINEMATIC_PAUSE = 500;
const CINEMATIC_VIGNETTE_FADE = 300;
const CINEMATIC_LINE_ILLUMINATE = 400;
const CINEMATIC_SYMBOL_POP = 300;
const CINEMATIC_TEXT_SLAM = 300;
const CINEMATIC_PARTICLE_BURST = 500;
const CINEMATIC_COUNTER_ROLL = 2000;
const CINEMATIC_CONFETTI_DURATION = 3000;
const CINEMATIC_FADE_BACK = 500;

// Sound envelope constants for new provider themes
const SOUND_AMBIENT_VOLUME = 0.08;
const SOUND_SFX_VOLUME = 0.5;
const SOUND_WIN_VOLUME = 0.7;
const SOUND_BIGWIN_VOLUME = 0.9;

// Win tier thresholds for dramatic effects
const WIN_DRAMATIC_THRESHOLD = 10;   // 10x+ = big win effects
const WIN_EPIC_THRESHOLD = 25;       // 25x+ = screen shake
const WIN_MEGA_THRESHOLD = 50;       // 50x+ = cinematic sequence
const WIN_JACKPOT_THRESHOLD = 100;   // 100x+ = full jackpot sequence
```

---

### Task 2: Update Settings Defaults in globals.js

**Files:**
- Modify: `js/globals.js` (lines 92–100, settingsDefaults)

**Implementation:**
Extend `settingsDefaults`:

```javascript
const settingsDefaults = {
    soundEnabled: true,
    volume: 50,
    particles: true,
    animations: true,
    confetti: true,
    turboDefault: false,
    autoSpinSpeed: 1500,
    // Visual overhaul settings
    animationQuality: 'ultra',    // 'ultra'|'high'|'medium'|'low'|'off'
    ambientMusic: true,
    winSounds: true,
    uiSounds: true
};
```

Also add to `REEL_CELL_ANIMATION_CLASSES` array (line 63):
```javascript
'reel-3d-pop', 'reel-3d-recede'
```

---

### Task 3: Update Settings Modal UI in ui-modals.js

**Files:**
- Modify: `js/ui-modals.js` (lines 159–240)
- Modify: `index.html` (settings modal HTML)

**Implementation:**
Add new settings controls in the settings modal HTML and corresponding JS handlers:

- Quality tier dropdown: `#settingAnimationQuality` (select)
- Ambient music toggle: `#settingAmbientMusic` (checkbox)
- Win sounds toggle: `#settingWinSounds` (checkbox)
- UI sounds toggle: `#settingUiSounds` (checkbox)

Handler functions in ui-modals.js:
```javascript
function settingsSetAnimationQuality(val) {
    appSettings.animationQuality = val;
    saveSettings();
}
function settingsToggleAmbientMusic(enabled) {
    appSettings.ambientMusic = enabled;
    saveSettings();
}
function settingsToggleWinSounds(enabled) {
    appSettings.winSounds = enabled;
    saveSettings();
}
function settingsToggleUiSounds(enabled) {
    appSettings.uiSounds = enabled;
    saveSettings();
}
```

Update `openSettingsModal()` to sync new controls.

---

## Phase 2: CSS Foundation (3D, Chrome Animations, Screen Shake)

### Task 4: Add 3D Perspective and Depth CSS to styles.css

**Files:**
- Modify: `styles.css` (after reel animation section ~line 2862)

**Implementation:**
```css
/* === 3D Depth Effects === */
.reel-container-3d {
    perspective: 1000px;
    transform-style: preserve-3d;
}

.reel-3d-pop {
    transform: translateZ(30px) scale(1.05);
    filter: brightness(1.2) drop-shadow(0 0 20px rgba(255, 215, 0, 0.6));
    transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), filter 0.3s ease;
    z-index: 10;
}

.reel-3d-recede {
    transform: translateZ(-10px) scale(0.95);
    filter: blur(1px) saturate(0.4) brightness(0.6);
    transition: transform 0.5s ease-in, filter 0.5s ease-in;
}

.reel-landing-tilt {
    animation: reelLandingTilt 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes reelLandingTilt {
    0% { transform: rotateX(-3deg) translateY(-5px); }
    50% { transform: rotateX(1deg) translateY(2px); }
    100% { transform: rotateX(0deg) translateY(0); }
}

/* === Screen Shake === */
.screen-shake-epic {
    animation: screenShakeEpic 1.5s ease-out;
}
.screen-shake-mega {
    animation: screenShakeMega 2s ease-out;
}
.screen-shake-jackpot {
    animation: screenShakeJackpot 3s ease-out;
}

@keyframes screenShakeEpic {
    0%, 100% { transform: translate(0); }
    10% { transform: translate(-4px, 2px); }
    20% { transform: translate(3px, -3px); }
    30% { transform: translate(-2px, 4px); }
    40% { transform: translate(4px, -1px); }
    50% { transform: translate(-3px, 2px); }
    60% { transform: translate(2px, -3px); }
    70% { transform: translate(-1px, 1px); }
    80% { transform: translate(1px, -1px); }
}

@keyframes screenShakeMega {
    0%, 100% { transform: translate(0); }
    5% { transform: translate(-8px, 4px); }
    10% { transform: translate(6px, -7px); }
    15% { transform: translate(-5px, 8px); }
    20% { transform: translate(8px, -3px); }
    25% { transform: translate(-7px, 5px); }
    30% { transform: translate(4px, -6px); }
    40% { transform: translate(-3px, 3px); }
    50% { transform: translate(2px, -2px); }
    60% { transform: translate(-1px, 1px); }
}

@keyframes screenShakeJackpot {
    0%, 100% { transform: translate(0) scale(1); }
    3% { transform: translate(-12px, 6px) scale(1.02); }
    6% { transform: translate(10px, -10px) scale(0.98); }
    9% { transform: translate(-8px, 12px) scale(1.01); }
    12% { transform: translate(12px, -4px) scale(0.99); }
    15% { transform: translate(-10px, 8px) scale(1.01); }
    20% { transform: translate(6px, -8px); }
    25% { transform: translate(-5px, 5px); }
    30% { transform: translate(4px, -4px); }
    40% { transform: translate(-2px, 2px); }
    50% { transform: translate(1px, -1px); }
}

/* === Vignette Overlay === */
.cinematic-vignette {
    position: fixed;
    inset: 0;
    background: radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.8) 100%);
    opacity: 0;
    transition: opacity 0.3s ease;
    pointer-events: none;
    z-index: 9998;
}
.cinematic-vignette.active {
    opacity: 1;
}

/* === Win Text Slam === */
.win-text-slam {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) scale(3);
    font-size: 4rem;
    font-weight: 900;
    text-transform: uppercase;
    color: #ffd700;
    text-shadow: 0 0 30px rgba(255,215,0,0.8), 0 4px 8px rgba(0,0,0,0.5);
    opacity: 0;
    z-index: 9999;
    animation: winTextSlam 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
    pointer-events: none;
}

@keyframes winTextSlam {
    0% { transform: translate(-50%, -50%) scale(3); opacity: 0; }
    60% { transform: translate(-50%, -50%) scale(0.9); opacity: 1; }
    100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
}
```

---

### Task 5: Add Provider Chrome Frame Animations to styles.css

**Files:**
- Modify: `styles.css` (after existing provider chrome keyframes ~line 2396)

**Implementation:**
8 new keyframe sets for animated reel borders:

```css
/* === Provider Reel Frame Animations === */

/* NovaSpin: Electric pulse border */
.slot-chrome-novaspin .reel-container {
    border-image: linear-gradient(var(--nova-angle, 0deg), #00e5ff, transparent, #00e5ff) 1;
    animation: novaFramePulse 3s linear infinite;
}
@keyframes novaFramePulse {
    0% { --nova-angle: 0deg; filter: drop-shadow(0 0 4px #00e5ff44); }
    50% { filter: drop-shadow(0 0 12px #00e5ff88); }
    100% { --nova-angle: 360deg; filter: drop-shadow(0 0 4px #00e5ff44); }
}

/* Celestial: Golden shimmer cascade */
.slot-chrome-celestial .reel-container {
    animation: celestialFrameShimmer 4s ease-in-out infinite;
}
@keyframes celestialFrameShimmer {
    0%, 100% { box-shadow: inset 0 0 20px rgba(255,215,0,0.1); }
    50% { box-shadow: inset 0 0 40px rgba(255,215,0,0.3), 0 0 15px rgba(255,215,0,0.2); }
}

/* IronReel: Metallic grain shift */
.slot-chrome-ironreel .reel-container {
    animation: ironFrameGrain 2s steps(4) infinite;
}
@keyframes ironFrameGrain {
    0% { filter: contrast(1) brightness(1); }
    25% { filter: contrast(1.02) brightness(1.01); }
    50% { filter: contrast(0.98) brightness(0.99); }
    75% { filter: contrast(1.01) brightness(1.02); }
}

/* GoldenEdge: Liquid gold flow */
.slot-chrome-goldenedge .reel-container {
    animation: goldenFrameFlow 5s ease-in-out infinite;
}
@keyframes goldenFrameFlow {
    0%, 100% { box-shadow: 0 0 10px rgba(255,183,77,0.2), inset 0 -2px 8px rgba(255,183,77,0.1); }
    50% { box-shadow: 0 0 25px rgba(255,183,77,0.4), inset 0 2px 15px rgba(255,183,77,0.2); }
}

/* VaultX: Laser scan sweep */
.slot-chrome-vaultx .reel-container {
    position: relative;
    overflow: hidden;
}
.slot-chrome-vaultx .reel-container::after {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 50%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(0,255,65,0.05), transparent);
    animation: vaultFrameScan 6s linear infinite;
    pointer-events: none;
}
@keyframes vaultFrameScan {
    0% { left: -50%; }
    100% { left: 150%; }
}

/* SolsticeFX: Aurora gradient shift */
.slot-chrome-solstice .reel-container {
    animation: solsticeFrameAurora 8s ease-in-out infinite;
}
@keyframes solsticeFrameAurora {
    0%, 100% { box-shadow: 0 0 15px rgba(220,38,38,0.15); }
    33% { box-shadow: 0 0 20px rgba(255,215,0,0.2); }
    66% { box-shadow: 0 0 15px rgba(220,38,38,0.2), 0 0 30px rgba(255,215,0,0.1); }
}

/* PhantomWorks: Dark mist tendrils */
.slot-chrome-phantomworks .reel-container {
    animation: phantomFrameMist 5s ease-in-out infinite;
}
@keyframes phantomFrameMist {
    0%, 100% { box-shadow: inset 0 0 30px rgba(128,0,255,0.1), 0 0 10px rgba(128,0,255,0.05); }
    50% { box-shadow: inset 0 0 50px rgba(128,0,255,0.2), 0 0 20px rgba(128,0,255,0.1); }
}

/* ArcadeForge: Neon flicker */
.slot-chrome-arcadeforge .reel-container {
    animation: arcadeFrameFlicker 4s steps(1) infinite;
}
@keyframes arcadeFrameFlicker {
    0%, 19%, 21%, 39%, 41%, 100% { box-shadow: 0 0 8px rgba(0,255,255,0.2); }
    20%, 40% { box-shadow: 0 0 2px rgba(0,255,255,0.05); }
}
```

---

## Phase 3: Canvas Particle Engine

### Task 6: Create particle-engine.js

**Files:**
- Create: `js/particle-engine.js`
- Modify: `index.html` (add script tag after `animations.js`, line 1009)

**Implementation:**
Full canvas particle system with:
- `ParticleEngine` class managing a `<canvas>` overlay
- Particle types: point, trail, sprite, text
- Physics: gravity, drag, turbulence
- Provider-themed particle configs (8 themes)
- Additive blending for glow
- Object pooling (no GC pressure)
- Auto-pause when no active particles
- Settings-aware (respects animationQuality)
- Ambient mode (subtle always-on particles)

Script tag in index.html after animations.js:
```html
<script src="js/particle-engine.js"></script>           <!-- Line 1010: Canvas particle engine -->
```
(All subsequent script line numbers shift +1)

---

## Phase 4: Enhanced Sound System

### Task 7: Enhance sound-manager.js with Provider Soundscapes

**Files:**
- Modify: `sound-manager.js` (full rewrite of PROVIDER_SFX_THEMES, add ambient/dynamic layers)

**Implementation:**
- 8 provider ambient drones (sustained oscillator + filter)
- 8 provider spin SFX profiles
- 8 provider win chime profiles
- 8 provider big win fanfares
- Dynamic music layering system (ambient → rhythmic → excitement → bonus)
- Crossfade between layers
- New functions: `startAmbient(providerKey)`, `stopAmbient()`, `playDynamicLayer(layerIndex)`
- Near-miss tension sound
- Balance counter tick SFX
- Button hover micro-SFX
- All gated behind `appSettings.ambientMusic`, `appSettings.winSounds`, `appSettings.uiSounds`

---

## Phase 5: Animated Symbol Rendering

### Task 8: Update Symbol Rendering in ui-slot.js

**Files:**
- Modify: `js/ui-slot.js` (lines 7–15, getSymbolHtml; lines 1251–1258, renderSymbol)

**Implementation:**

Update `getSymbolHtml()`:
```javascript
function getSymbolHtml(symbolName, gameId) {
    const useAnimated = window.appSettings &&
        window.appSettings.animationQuality !== QUALITY_LOW &&
        window.appSettings.animationQuality !== QUALITY_OFF;

    if (useAnimated) {
        return `<img class="reel-symbol-img reel-symbol-animated"
            src="assets/game_symbols/${gameId}/${symbolName}.webp"
            alt="${symbolName}" draggable="false"
            onerror="this.src='assets/game_symbols/${gameId}/${symbolName}.png'; this.classList.remove('reel-symbol-animated'); this.onerror=null;">`;
    }
    return `<img class="reel-symbol-img" src="assets/game_symbols/${gameId}/${symbolName}.png" alt="${symbolName}" draggable="false" onerror="this.style.display='none'">`;
}
```

Add WebP preloading in `openSlot()`:
```javascript
function preloadAnimatedSymbols(game) {
    if (!game || !game.symbols) return;
    game.symbols.forEach(sym => {
        const img = new Image();
        img.src = `assets/game_symbols/${game.id}/${sym}.webp`;
    });
    // Also preload animated background
    const bgImg = new Image();
    bgImg.src = `assets/backgrounds/slots/${game.id}_bg.webp`;
}
```

---

### Task 9: Add Animated Background Loading in ui-slot.js

**Files:**
- Modify: `js/ui-slot.js` (lines 905–923, background setup in openSlot)

**Implementation:**
Update background loading to prefer animated WebP:
```javascript
const bgAnimPath = `assets/backgrounds/slots/${currentGame.id}_bg.webp`;
const bgStaticPath = `assets/backgrounds/slots/${currentGame.id}_bg.png`;
const useAnimBg = appSettings.animationQuality === QUALITY_ULTRA ||
                  appSettings.animationQuality === QUALITY_HIGH ||
                  appSettings.animationQuality === QUALITY_MEDIUM;

const bgPath = useAnimBg ? bgAnimPath : bgStaticPath;
// Load with fallback chain: animated WebP → static PNG → CSS gradient
```

---

## Phase 6: Dramatic Win Sequences

### Task 10: Add Cinematic Win System to animations.js

**Files:**
- Modify: `animations.js` (add new exported functions)

**Implementation:**

New functions:
```javascript
function triggerScreenShake(intensity) { ... }
function showCinematicVignette() { ... }
function hideCinematicVignette() { ... }
function showWinTextSlam(text, color) { ... }
function triggerCinematicWinSequence(winMultiplier, game) { ... }
function apply3DWinDepth(winningCells, allCells) { ... }
function remove3DWinDepth(allCells) { ... }
```

`triggerCinematicWinSequence()` orchestrates the full timeline:
- Pause → vignette → illuminate → 3D pop → text slam → particles → counter roll → confetti → fade

---

### Task 11: Integrate Win Sequences into win-logic.js

**Files:**
- Modify: `js/win-logic.js` (where wins are evaluated and displayed)

**Implementation:**
After win evaluation, check multiplier against thresholds and dispatch appropriate effects:
- < 10x: standard win glow + particles
- 10x+: big win effects + enhanced particles
- 25x+: epic effects + screen shake
- 50x+: cinematic sequence
- 100x+: full jackpot sequence

---

## Phase 7: Provider Theme Extensions

### Task 12: Extend chrome-styles.js with Sound & Particle Configs

**Files:**
- Modify: `shared/chrome-styles.js`

**Implementation:**
Add `PROVIDER_FULL_THEMES` with complete visual + audio + particle config per provider.

---

## Phase 8: AI Asset Generation Pipeline

### Task 13: Create Animated Symbol Generator Script

**Files:**
- Create: `scripts/generate_animated_symbols.py`

**Implementation:**
Python script that:
1. Scans `assets/game_symbols/` for all game folders
2. For each PNG symbol, determines category from filename
3. Builds AnimateDiff prompt based on category
4. Sends to local ComfyUI API
5. Post-processes: trim to seamless loop, encode to animated WebP
6. Saves alongside existing PNGs

### Task 14: Create Animated Background Generator Script

**Files:**
- Create: `scripts/generate_animated_backgrounds.py`

**Implementation:**
Python script similar to symbols but for backgrounds:
1. Scans `assets/backgrounds/slots/`
2. Determines theme from game definition
3. Generates ambient animation via AnimateDiff
4. Encodes to animated WebP (3s loop, 10fps)

---

## Phase 9: Integration & QA

### Task 15: Update index.html Script Order

**Files:**
- Modify: `index.html` (script tags, line 1004+)

**Implementation:**
Insert `particle-engine.js` after `animations.js`:
```html
<script src="animations.js"></script>
<script src="js/particle-engine.js"></script>
```

### Task 16: Verify Auth System

**Files:**
- Test: `js/auth.js`, `server/routes/auth.js`

**Implementation:**
Ensure username/password registration and login work correctly through the full flow.

### Task 17: Run QA Regression

**Run:** `npm run qa:regression`
**Expected:** All existing tests pass with new code integrated.

---

## Implementation Order Summary

| Phase | Tasks | Can Parallelize? |
|-------|-------|-------------------|
| 1. Foundation | Tasks 1-3 | Yes (all independent) |
| 2. CSS Foundation | Tasks 4-5 | Yes (independent CSS sections) |
| 3. Particle Engine | Task 6 | Yes (new file, no deps) |
| 4. Sound System | Task 7 | Yes (independent module) |
| 5. Symbol Rendering | Tasks 8-9 | After Phase 1 |
| 6. Dramatic Wins | Tasks 10-11 | After Phases 2-3 |
| 7. Provider Themes | Task 12 | After Phase 4 |
| 8. Asset Pipeline | Tasks 13-14 | Yes (Python, independent) |
| 9. Integration & QA | Tasks 15-17 | Sequential |
