# Visual Overhaul Design — Matrix Spins

**Date:** 2026-02-24
**Status:** Approved
**Scope:** Animated symbols, animated backgrounds, animated chrome, 3D depth effects, dramatic win sequences, canvas particle engine, immersive sound design

---

## 1. Animated Symbols

### Generation Pipeline

**Script:** `scripts/generate_animated_symbols.py`
**Model:** AnimateDiff via local ComfyUI (NVIDIA GPU)
**Input:** Static PNGs from `assets/game_symbols/{gameId}/`
**Output:** Animated WebP to `assets/game_symbols/{gameId}/{symbol}.webp` (alongside existing PNGs)

**Per-symbol-category animation prompts:**

| Category | Motion Style | Example Symbols |
|---|---|---|
| Candy/food | Gentle wobble, sparkle shimmer | lollipop, cupcake, cherry |
| Mythical creatures | Breathing motion, aura flicker | dragon, phoenix, wolf |
| Gems/jewels | Slow rotation, prismatic refraction | diamond, ruby, emerald |
| Wild symbols | Pulsing glow, energy aura (dramatic) | wild_*, bonus_wild |
| Scatter/bonus | Floating, radiating energy (most dramatic) | scatter_*, bonus_* |
| Egyptian/ancient | Hovering glow, sand particles | ankh, pharaoh, scarab |
| Nature | Swaying, drifting, light rays | leaf, flower, tree |
| Tech/space | Holographic flicker, data pulse | circuit, planet, rocket |

**Specs:**
- Duration: 1.5s seamless loop
- Frame rate: 15fps
- Format: Animated WebP with alpha transparency
- Target size: 80–150KB per symbol
- Total: ~400+ symbols across 81 games

### Client Integration

**Modified function:** `getSymbolHtml()` in `js/ui-slot.js`

```
Flow:
  1. appSettings.animationQuality >= 'medium'
     → load {gameId}/{symbol}.webp (animated)
  2. Fallback → {gameId}/{symbol}.png (static)
  3. Fallback → legacy text rendering
```

**Performance:**
- Preload animated WebPs on `openSlot()` (only current game's 4–6 symbols)
- During fast reel scroll: display static PNG (swap back on land)
- `IntersectionObserver` pauses off-screen animated WebPs
- Setting: part of Animation Quality slider

---

## 2. Animated Backgrounds

### Generation Pipeline

**Script:** `scripts/generate_animated_backgrounds.py`
**Model:** AnimateDiff via local ComfyUI
**Input:** Static PNGs from `assets/backgrounds/slots/{gameId}_bg.png`
**Output:** `assets/backgrounds/slots/{gameId}_bg.webp`

**Theme-aware ambient animation:**

| Theme | Ambient Motion |
|---|---|
| Underwater | Gentle caustic light waves |
| Space | Slow-drifting stars, nebula shift |
| Ancient/temple | Floating dust motes, torch flicker |
| Nature | Swaying leaves, light rays |
| Dark/gothic | Drifting fog, candlelight flicker |
| Luxury/gold | Soft bokeh shimmer, light sweep |
| Winter/ice | Falling snow particles, frost shimmer |
| Fire/volcano | Heat haze, ember drift |

**Specs:**
- Duration: 3s seamless loop
- Frame rate: 10fps
- Resolution: 1280×720
- Format: Animated WebP
- Target size: 200–400KB per background
- Total: 81 backgrounds

### Client Integration

- Slot modal background: prefer `.webp` → fallback `.png`
- CSS: `background-size: cover; will-change: contents;` for GPU compositing
- Setting: part of Animation Quality slider (medium+)

---

## 3. Animated Chrome/Frames

**No AI generation needed — pure CSS keyframes.**

### Per-Provider Reel Frame Animations

| Provider | Frame Animation | CSS Keyframe |
|---|---|---|
| NovaSpin | Electric pulse along border, cyan energy trail | `novaFramePulse` |
| Celestial | Golden shimmer cascade, divine glow | `celestialFrameShimmer` |
| IronReel | Metallic grain texture shift, rivet pulse | `ironFrameGrain` |
| GoldenEdge | Liquid gold flow along edges | `goldenFrameFlow` |
| VaultX | Security laser scan sweep | `vaultFrameScan` |
| SolsticeFX | Aurora borealis gradient shift | `solsticeFrameAurora` |
| PhantomWorks | Dark mist tendrils creeping at edges | `phantomFrameMist` |
| ArcadeForge | Neon flicker, retro scanline sweep | `arcadeFrameFlicker` |

### Implementation

- New CSS `@keyframes` per provider in `styles.css`
- Applied to `.reel-container` and `.slot-chrome-cell` via provider class
- Reel separator lines: subtle glow animation
- Spin button: provider-themed idle pulse
- Setting: part of Animation Quality slider (high+)

---

## 4. 3D Depth Effects

**Pure CSS — no WebGL/Three.js required.**

### Reel Container

```css
.reel-container {
    perspective: 1000px;
    transform-style: preserve-3d;
}
```

### Win State Transforms

| State | Effect |
|---|---|
| Winning symbols | `translateZ(30px)` + enhanced shadow |
| Non-winning symbols | `translateZ(-10px)` + blur + desaturate |
| Reel landing | `rotateX(-3deg)` → settle to 0 (bounce) |
| Spin button click | `translateZ(-5px)` push effect |

### Transitions

- Win pop-forward: 0.3s cubic-bezier ease-out
- Non-win recession: 0.5s ease-in
- Landing tilt: 0.4s spring dynamics
- Setting: Animation Quality 'high' or 'ultra'

---

## 5. Dramatic Win Sequences

### Screen Shake

| Win Tier | Shake Intensity | Duration |
|---|---|---|
| Epic (25x+) | ±4px translate | 1.5s |
| Mega (50x+) | ±8px + screen flash | 2s |
| Jackpot (100x+) | ±12px + zoom + explosion | 3s |

### Cinematic Win Sequence (Mega+)

```
Timeline:
  0.0s  Reels land → pause (anticipation)
  0.5s  Screen darkens (vignette overlay, opacity 0→0.6)
  0.8s  Winning line illuminates (golden light trail)
  1.2s  Symbols pop to 3D foreground (translateZ)
  1.5s  "MEGA WIN" text slams in with screen shake
  2.0s  Particle explosion (provider-themed, 200+ particles)
  2.5s  Win amount rolls up with counting SFX
  4.5s  Confetti rain (3 seconds)
  7.5s  Fade back to normal state
```

### Symbol-Specific Win Animations

| Symbol Type | Win Animation |
|---|---|
| Wild | Energy explosion outward from center |
| Scatter | Portal vortex pull effect |
| High-value | Golden aura burst with light rays |
| Low-value | Quick sparkle (less dramatic) |

### Setting: Animation Quality 'ultra' only for full sequence; 'high' gets simplified version

---

## 6. Canvas Particle Engine

### New file: `js/particle-engine.js`

**Replaces emoji-based particle system with canvas-rendered particles.**

### Per-Provider Particle Themes

| Provider | Particle Type | Visual |
|---|---|---|
| NovaSpin | Electric sparks, blue lightning arcs | Branching electric blue lines |
| Celestial | Golden falling feathers, divine rays | Soft gold trails with glow |
| IronReel | Metal sparks, grinding embers | Orange hot sparks, scatter pattern |
| GoldenEdge | Liquid gold droplets, coin shower | Metallic gold splatter |
| VaultX | Green matrix data rain | Character streams (matrix-style) |
| SolsticeFX | Aurora wisps, crystalline shards | Iridescent gradient wisps |
| PhantomWorks | Purple mist, ghostly tendrils | Semi-transparent purple smoke |
| ArcadeForge | Pixel explosions, retro confetti | Blocky pixel particles |

### Engine Design

```
ParticleEngine class:
  - Manages a single <canvas> overlay on top of reel area
  - Supports particle types: point, trail, sprite, text
  - Physics: gravity, drag, turbulence, attraction
  - Rendering: additive blending for glow effects
  - Pool: pre-allocated particle objects (no GC pressure)
  - Auto-pause when no active particles
  - 60fps via requestAnimationFrame
```

### Particle Count Scaling

| Win Size | Particle Count | Duration |
|---|---|---|
| Small win (2–5x) | 20 | 1s |
| Big win (10x+) | 50 | 2s |
| Epic win (25x+) | 100 | 3s |
| Mega win (50x+) | 200 | 4s |
| Jackpot (100x+) | 300+ | 5s |

### Ambient Particles

- Always active at very low density (3–5 particles)
- Provider-themed (subtle background motion)
- Setting: Animation Quality 'high' or 'ultra'

---

## 7. Immersive Sound Design

### Enhanced `sound-manager.js`

**All sounds generated via Web Audio API synthesis — zero audio file downloads.**

### Per-Provider Soundscapes

| Provider | Ambient Drone | Spin SFX | Win Chime | Big Win Fanfare |
|---|---|---|---|---|
| NovaSpin | Sci-fi hum, synth pad | Electronic whoosh | Digital chime cascade | Synth fanfare, laser zaps |
| Celestial | Heavenly choir pad | Ethereal swoosh | Harp glissando | Orchestral brass hit |
| IronReel | Industrial low drone | Metal clank roll | Anvil strike, coin drop | Power hammer sequence |
| GoldenEdge | Luxe lounge pad | Velvet reel whir | Crystal ting, cash register | Gold coin avalanche |
| VaultX | Vault echo, tension | Safe tumbler clicks | Lock mechanism + alarm | Vault door blast |
| SolsticeFX | Nature wind chimes | Crystal resonance | Ice shatter sparkle | Aurora crescendo |
| PhantomWorks | Eerie whispers | Ghost whoosh | Spectral chime | Thunder + organ |
| ArcadeForge | 8-bit chiptune loop | Retro reel beeps | Classic slot jingle | 8-bit victory fanfare |

### Sound Events

| Event | Sound | Duration |
|---|---|---|
| Reel spin start | Provider whoosh (rising pitch) | 0.5s |
| Each reel stops | Thud + click (staggered) | 0.2s |
| Small win | 3-note ascending chime | 0.8s |
| Big win (10x+) | Dramatic build + payoff | 2s |
| Epic win (25x+) | Full fanfare with bass drop | 3s |
| Mega win (50x+) | Cinematic orchestral hit + celebration | 5s |
| Jackpot (100x+) | Extended victory theme (layered) | 8s |
| Scatter land | Distinctive "ding!" (anticipation) | 0.3s |
| Free spins trigger | Transition swoosh + stinger | 1.5s |
| Bonus wheel tick | Tick acceleration/deceleration | variable |
| Near miss (2/3) | Subtle tension note | 0.5s |
| Button hover | Soft tactile click | 0.05s |
| Balance update | Coin counting tick | variable |

### Dynamic Music Layering

```
Layers (crossfade between states):
  Layer 0: Ambient drone (always, very low volume)
  Layer 1: Rhythmic pulse (added during spins)
  Layer 2: Excitement riff (added during win streaks, 3+ consecutive)
  Layer 3: Bonus theme (replaces all during free spins)
  Layer 4: Big win fanfare (full orchestral hit, replaces all)
```

### Web Audio Synthesis Techniques

- Oscillators: sine, triangle, sawtooth, square
- Filters: low-pass (warmth), high-pass (sparkle), band-pass (telephone)
- Reverb: convolution reverb for spatial depth
- Delay: rhythmic echoes for electronic themes
- Distortion: waveshaper for grit (IronReel/PhantomWorks)
- FM synthesis: complex timbres for melodic elements
- Noise generator: white/pink noise for whoosh/wind/static
- ADSR envelopes: shape every sound's attack/sustain/release

---

## 8. Settings & Quality System

### Replace Individual Toggles with Quality Slider

```
Animation Quality:  [Ultra] / High / Medium / Low / Off

Ultra:   All effects, max particles, 3D depth, screen shake, cinematic wins
High:    All animated assets, reduced particles, simplified win sequences
Medium:  Animated symbols + backgrounds, basic win glow, no 3D/shake
Low:     Static symbols, basic CSS win highlight only
Off:     Zero animations (accessibility mode)
```

### Sound Settings

```
Master Volume:    [████████░░] 80%
Ambient Music:    [ON] / OFF
Win Sounds:       [ON] / OFF
UI Sounds:        [ON] / OFF
```

### Storage

- `appSettings.animationQuality`: 'ultra' | 'high' | 'medium' | 'low' | 'off'
- `appSettings.masterVolume`: 0–100
- `appSettings.ambientMusic`: boolean
- `appSettings.winSounds`: boolean
- `appSettings.uiSounds`: boolean
- All persisted via existing `STORAGE_KEY_SETTINGS` in localStorage

### Performance Budget

| Quality | Assets Loaded | Particles | 3D | Shake | Sound |
|---|---|---|---|---|---|
| Ultra | WebP symbols + bg | 300 max | Yes | Yes | Full |
| High | WebP symbols + bg | 100 max | Yes | No | Full |
| Medium | WebP symbols + bg | 50 max | No | No | Full |
| Low | Static PNG only | 0 | No | No | SFX only |
| Off | Static PNG only | 0 | No | No | Optional |

### Mobile Auto-Detection

- Detect via `navigator.hardwareConcurrency` and `navigator.deviceMemory`
- Low-end mobile: auto-set to 'medium'
- High-end mobile: auto-set to 'high'
- Desktop: default 'ultra'
- User can always override

---

## 9. File Changes Summary

### New Files

| File | Purpose |
|---|---|
| `js/particle-engine.js` | Canvas-based particle rendering engine |
| `scripts/generate_animated_symbols.py` | AI pipeline: PNG → animated WebP symbols |
| `scripts/generate_animated_backgrounds.py` | AI pipeline: PNG → animated WebP backgrounds |

### Modified Files

| File | Changes |
|---|---|
| `js/ui-slot.js` | Animated WebP loading, 3D depth effects, cinematic win sequences |
| `sound-manager.js` | Per-provider soundscapes, dynamic music layering, all new SFX |
| `animations.js` | Screen shake, vignette overlay, enhanced win cascades |
| `styles.css` | Provider chrome animations, 3D transforms, screen shake keyframes |
| `js/ui-modals.js` | New quality slider + sound settings UI |
| `js/globals.js` | New appSettings fields |
| `constants.js` | New animation/sound timing constants, quality tier definitions |
| `index.html` | Add `particle-engine.js` script tag (after `animations.js`) |
| `shared/chrome-styles.js` | Extend provider themes with sound + particle config |

### New Asset Directories

```
assets/game_symbols/{gameId}/*.webp    (animated symbols, alongside existing PNGs)
assets/backgrounds/slots/*_bg.webp     (animated backgrounds, alongside existing PNGs)
```

---

## 10. Implementation Order

1. **Constants & settings** — new quality tiers, timing constants, settings fields
2. **CSS foundation** — 3D perspective, provider chrome animations, screen shake keyframes
3. **Particle engine** — new `particle-engine.js` with provider themes
4. **Sound system** — enhanced `sound-manager.js` with all provider soundscapes
5. **Dramatic win sequences** — cinematic win timeline, vignette, shake integration
6. **Symbol rendering** — animated WebP loading with fallback chain
7. **Settings UI** — quality slider + sound controls
8. **AI asset pipeline** — Python scripts for animated symbols + backgrounds
9. **Generate assets** — run pipeline across all 81 games
10. **QA regression** — ensure all existing tests still pass
