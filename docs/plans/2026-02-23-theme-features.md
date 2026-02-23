# Theme Features Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Matrix rain background, per-provider SFX themes, per-provider win animations, and a live jackpot banner inside jackpot slot games.

**Architecture:** Four independent front-end additions — zero server changes. Matrix rain is a `<canvas>` overlay. Theme audio/animations extend existing `playSound()` and `triggerWinCascade()` with an optional `game` parameter. Jackpot banner is injected into the slot modal top-bar and syncs with the existing `jackpotValue` global.

**Tech Stack:** Vanilla JS (global scope, no modules), Web Audio API oscillators, CSS keyframes, HTML5 Canvas.

---

### Task 1: Matrix Rain Background Canvas

**Files:**
- Create: `matrix-rain.js` (project root, alongside `animations.js`)
- Modify: `index.html` — add `<canvas>` element and `<script>` tag
- Modify: `styles.css` — canvas positioning + body background

**Step 1: Create `matrix-rain.js`**

```js
// matrix-rain.js — Matrix-style falling character rain on the site background.
// Loaded after constants.js; relies on nothing else.
(function () {
    'use strict';

    // Character pool: digits + katakana fragments
    var CHARS = '01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン';
    var FONT_SIZE = 14;
    var OPACITY   = 0.32;   // overall canvas opacity (CSS)
    var INTERVAL  = 55;     // ms per frame

    function init() {
        var canvas = document.createElement('canvas');
        canvas.id = 'matrixRainCanvas';
        document.body.insertBefore(canvas, document.body.firstChild);

        var ctx = canvas.getContext('2d');
        var drops = [];

        function resize() {
            canvas.width  = window.innerWidth;
            canvas.height = window.innerHeight;
            var cols = Math.floor(canvas.width / FONT_SIZE);
            // Preserve existing drop positions; add new cols; trim excess
            while (drops.length < cols) drops.push(Math.random() * -50 | 0);
            drops.length = cols;
        }

        function draw() {
            // Semi-transparent black fade creates the trail effect
            ctx.fillStyle = 'rgba(0,0,0,0.045)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.font = FONT_SIZE + 'px monospace';

            for (var i = 0; i < drops.length; i++) {
                var char = CHARS[Math.floor(Math.random() * CHARS.length)];
                var y    = drops[i] * FONT_SIZE;

                // Bright head, dimmer tail handled by fade above
                ctx.fillStyle = drops[i] > 5 ? '#00ff41' : '#afffbc';
                ctx.fillText(char, i * FONT_SIZE, y);

                // Randomly reset column to top after it passes the bottom
                if (y > canvas.height && Math.random() > 0.975) {
                    drops[i] = 0;
                }
                drops[i]++;
            }
        }

        resize();
        window.addEventListener('resize', resize);

        // Respect prefers-reduced-motion
        if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            // Draw once (static snapshot) and stop
            draw();
            return;
        }

        setInterval(draw, INTERVAL);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
```

**Step 2: Add canvas CSS to `styles.css`**

Append to the end of `styles.css`:

```css
/* ═══════════════════════════════════════════════
   MATRIX RAIN CANVAS
   ═══════════════════════════════════════════════ */
#matrixRainCanvas {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    z-index: -1;
    opacity: 0.32;
    pointer-events: none;
    display: block;
}
```

**Step 3: Add `<script>` tag in `index.html`**

After the `<script src="animations.js"></script>` line (line 902), add:
```html
    <script src="matrix-rain.js"></script>
```

**Step 4: Make site background transparent so canvas shows through**

In `styles.css`, find the existing `body` rule and ensure `background` is dark (not opaque white/grey). The app already uses dark backgrounds — just verify the canvas z-index puts it behind everything.

**Step 5: Run QA**
```bash
npm run qa:regression
```
Expected: `Casino QA regression passed.`

**Step 6: Commit**
```bash
git add matrix-rain.js styles.css index.html
git commit -m "feat: add Matrix rain background canvas"
```

---

### Task 2: Per-Provider Win Animation Themes

**Files:**
- Modify: `animations.js` — add provider theme map + update `triggerWinCascade` and `createParticles`

**Step 1: Add provider theme map at top of `animations.js` (after `_animSettingEnabled`)**

```js
// ───────────────────────────────────────────────────────
// Provider Animation Themes
// ───────────────────────────────────────────────────────
var PROVIDER_ANIM_THEMES = {
    novaspin:     { particles: ['⚡','🌌','💫','🔬','🚀'], color: '#00e5ff', glow: '#00e5ff44' },
    celestial:    { particles: ['🏛️','⚡','👑','🌟','💎'], color: '#ffd700', glow: '#ffd70044' },
    ironreel:     { particles: ['🌿','🍀','🌲','🍃','🌱'], color: '#22c55e', glow: '#22c55e44' },
    goldenedge:   { particles: ['🍭','💎','🌸','🍬','✨'], color: '#f472b6', glow: '#f472b644' },
    vaultx:       { particles: ['💰','🔑','💣','🤠','⚙️'], color: '#d97706', glow: '#d9770644' },
    solstice:     { particles: ['🏮','🎋','🔱','🌸','🐉'], color: '#ef4444', glow: '#ef444444' },
    phantomworks: { particles: ['💀','🕷️','🌑','🦇','💜'], color: '#a855f7', glow: '#a855f744' },
    arcadeforge:  { particles: ['👾','🕹️','⭐','🎮','🔴'], color: '#06b6d4', glow: '#06b6d444' },
};

function getProviderAnimTheme(game) {
    var key = (typeof getGameChromeStyle === 'function') ? getGameChromeStyle(game) : '';
    return PROVIDER_ANIM_THEMES[key] || { particles: ['✨','⭐','💫','✦','💰'], color: '#fbbf24', glow: '#fbbf2444' };
}
```

**Step 2: Update `createParticles` to accept a `symbols` array override**

Change signature from `createParticles(x, y, count = 8, type = 'gold')` to also accept a `symbols` override:

```js
function createParticles(x, y, count, type, symbolOverride) {
    count = count || 8;
    type  = type  || 'gold';
    if (!_animSettingEnabled('particles')) return;
    var defaultSymbols = ['✨', '⭐', '💫', '✦', '💰'];
    var pool = symbolOverride || defaultSymbols;
    for (var i = 0; i < count; i++) {
        var particle = document.createElement('div');
        particle.className = 'particle ' + type;
        particle.textContent = pool[Math.floor(Math.random() * pool.length)];
        particle.style.left  = x + 'px';
        particle.style.top   = y + 'px';
        particle.style.setProperty('--tx', (Math.random() - 0.5) * 100 + 'px');
        particle.style.color = type === 'gold' ? '#fbbf24'
                             : type === 'green' ? '#10b981'
                             : type === 'purple' ? '#a855f7'
                             : '#fbbf24';
        document.body.appendChild(particle);
        setTimeout(function(p){ p.remove(); }, 1500, particle);
    }
}
```

**Step 3: Update `triggerWinCascade` to use provider theme**

```js
function triggerWinCascade(game) {
    if (!_animSettingEnabled('animations')) return;

    var winCells = document.querySelectorAll('.reel-win-glow');
    var cells    = Array.from(winCells);
    var theme    = getProviderAnimTheme(game);

    // Apply themed glow colour to winning cells
    cells.forEach(function(cell) {
        cell.style.boxShadow = '0 0 18px 4px ' + theme.glow + ', 0 0 6px 2px ' + theme.color + '88';
        cell.style.borderColor = theme.color;
    });

    applySymbolCascade(cells, 'gold');

    // Theme particles burst from screen centre
    var centerX = window.innerWidth  / 2;
    var centerY = window.innerHeight / 2;
    createParticles(centerX, centerY, 15, 'sparkle', theme.particles);
}
```

**Step 4: Run QA**
```bash
npm run qa:regression
```

**Step 5: Commit**
```bash
git add animations.js
git commit -m "feat: per-provider win animation themes"
```

---

### Task 3: Per-Provider SFX Themes

**Files:**
- Modify: `sound-manager.js` — add provider SFX profiles, update `playSound` signature

**Step 1: Add provider SFX theme map inside the IIFE (just before `function playSound`)**

Each profile has `spin`, `win`, `bigwin` with `{ waveType, freqs, dur, spacing }`:

```js
// ── Provider SFX Themes ──────────────────────────────────────────────────
var PROVIDER_SFX_THEMES = {
    novaspin: {
        spin:   { waveType: 'sine',     freqs: [800, 1200, 1600], dur: 0.10, spacing: 0.035 },
        win:    { waveType: 'sine',     freqs: [880, 1108, 1318], dur: 0.18, spacing: 0.06  },
        bigwin: { waveType: 'sine',     freqs: [880, 1108, 1318, 1760], dur: 0.35, spacing: 0.055 },
    },
    celestial: {
        spin:   { waveType: 'sine',     freqs: [523, 659, 784],        dur: 0.18, spacing: 0.07  },
        win:    { waveType: 'sine',     freqs: [523, 659, 784, 1047],  dur: 0.38, spacing: 0.09  },
        bigwin: { waveType: 'sine',     freqs: [523, 659, 784, 988, 1047], dur: 0.55, spacing: 0.09 },
    },
    ironreel: {
        spin:   { waveType: 'triangle', freqs: [220, 277, 330],        dur: 0.18, spacing: 0.06  },
        win:    { waveType: 'triangle', freqs: [220, 330, 440],        dur: 0.35, spacing: 0.09  },
        bigwin: { waveType: 'triangle', freqs: [110, 165, 220, 330],   dur: 0.55, spacing: 0.09  },
    },
    goldenedge: {
        spin:   { waveType: 'sine',     freqs: [1046, 1318, 1568],     dur: 0.08, spacing: 0.04  },
        win:    { waveType: 'sine',     freqs: [1047, 1319, 1568, 2093], dur: 0.22, spacing: 0.06 },
        bigwin: { waveType: 'sine',     freqs: [1047, 1319, 1568, 2093, 2637], dur: 0.40, spacing: 0.055 },
    },
    vaultx: {
        spin:   { waveType: 'sawtooth', freqs: [110, 165],             dur: 0.14, spacing: 0.07  },
        win:    { waveType: 'sawtooth', freqs: [165, 220, 277],        dur: 0.28, spacing: 0.07  },
        bigwin: { waveType: 'sawtooth', freqs: [110, 165, 220, 277],   dur: 0.45, spacing: 0.07  },
    },
    solstice: {
        spin:   { waveType: 'sine',     freqs: [293, 329, 392],        dur: 0.22, spacing: 0.09  },
        win:    { waveType: 'sine',     freqs: [293, 349, 440, 587],   dur: 0.45, spacing: 0.11  },
        bigwin: { waveType: 'sine',     freqs: [220, 293, 349, 440, 587], dur: 0.65, spacing: 0.11 },
    },
    phantomworks: {
        spin:   { waveType: 'square',   freqs: [233, 277],             dur: 0.16, spacing: 0.08  },
        win:    { waveType: 'square',   freqs: [233, 277, 311],        dur: 0.32, spacing: 0.08  },
        bigwin: { waveType: 'square',   freqs: [185, 233, 277, 311],   dur: 0.50, spacing: 0.08  },
    },
    arcadeforge: {
        spin:   { waveType: 'square',   freqs: [440, 660],             dur: 0.07, spacing: 0.04  },
        win:    { waveType: 'square',   freqs: [440, 554, 660, 880],   dur: 0.16, spacing: 0.045 },
        bigwin: { waveType: 'square',   freqs: [440, 554, 660, 880, 1108], dur: 0.28, spacing: 0.045 },
    },
};

function playProviderSound(soundType, game) {
    // Falls back to generic playSound if no theme or audio context unavailable
    var key = (typeof getGameChromeStyle === 'function') ? getGameChromeStyle(game) : '';
    var theme = PROVIDER_SFX_THEMES[key];
    if (!theme || !theme[soundType]) {
        playSound(soundType);
        return;
    }
    if (!soundEnabled) return;
    try {
        var audioContext = getAudioContext();
        var profile = theme[soundType];
        var now = audioContext.currentTime;
        profile.freqs.forEach(function(freq, i) {
            var osc  = audioContext.createOscillator();
            var gain = audioContext.createGain();
            osc.type = profile.waveType;
            osc.connect(gain);
            gain.connect(audioContext.destination);
            osc.frequency.value = freq;
            var t = now + i * profile.spacing;
            gain.gain.setValueAtTime(0.18 * soundVolume, t);
            gain.gain.exponentialRampToValueAtTime(0.001 * soundVolume, t + profile.dur);
            osc.start(t);
            osc.stop(t + profile.dur + 0.01);
        });
    } catch(e) { /* ignore audio errors */ }
}
```

**Step 2: Expose `playProviderSound` as a global**

In the globals exposure block at bottom of sound-manager.js IIFE, add:
```js
window.playProviderSound = playProviderSound;
window.SoundManager.playProviderSound = playProviderSound;
```

**Step 3: Update win/bigwin call sites in `js/ui-slot.js`**

Replace the `playSound('win')` / `playSound('bigwin')` calls that occur after spin resolution (lines ~433, 1255, 1257, 1800, 2124) with `playProviderSound` calls that pass `currentGame`. Use regex-safe replacements:
- `playSound('bigwin')` → `playProviderSound('bigwin', currentGame)`
- `playSound('win')` that follow win checks → `playProviderSound('win', currentGame)`
- `playSound('spin')` → `playProviderSound('spin', currentGame)` (lines 1124, 1465)

Keep `playSound('click')`, `playSound('lose')`, `playSound('freespin')`, `playSound('scatter')`, `playSound('bonus')` as-is (no provider theme for UI events).

**Step 4: Run QA**
```bash
npm run qa:regression
```

**Step 5: Commit**
```bash
git add sound-manager.js js/ui-slot.js
git commit -m "feat: per-provider SFX themes for spin/win/bigwin"
```

---

### Task 4: Live Jackpot Banner in Slot Header

**Files:**
- Modify: `index.html` — add banner `<div>` inside slot modal
- Modify: `styles.css` — banner styles
- Modify: `js/ui-slot.js` — show/hide + sync ticker in `openSlot` / `closeSlot`

**Step 1: Add banner HTML to `index.html`**

After the `<!-- Bonus Info Banner -->` comment / `slotBonusInfo` div (around line 400), add:

```html
            <!-- Live Jackpot Banner (jackpot games only) -->
            <div id="slotJackpotBanner" class="slot-jackpot-banner" style="display:none;" aria-live="polite">
                <span class="slot-jackpot-star">★</span>
                <span class="slot-jackpot-label">JACKPOT</span>
                <span class="slot-jackpot-amount" id="slotJackpotAmount">$0</span>
                <span class="slot-jackpot-star">★</span>
            </div>
```

**Step 2: Add CSS to `styles.css`**

```css
/* ═══════════════════════════════════════════════
   SLOT JACKPOT BANNER
   ═══════════════════════════════════════════════ */
.slot-jackpot-banner {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 5px 16px;
    background: linear-gradient(90deg, transparent 0%, rgba(var(--jackpot-rgb,251,191,36),0.18) 30%, rgba(var(--jackpot-rgb,251,191,36),0.18) 70%, transparent 100%);
    border-top: 1px solid rgba(var(--jackpot-rgb,251,191,36),0.35);
    border-bottom: 1px solid rgba(var(--jackpot-rgb,251,191,36),0.35);
    font-family: var(--slot-ui-font, 'Trebuchet MS', sans-serif);
    text-align: center;
}
.slot-jackpot-label {
    font-size: 0.7rem;
    letter-spacing: 0.2em;
    font-weight: 700;
    color: rgba(var(--jackpot-rgb,251,191,36),0.9);
    text-transform: uppercase;
}
.slot-jackpot-amount {
    font-size: 1.1rem;
    font-weight: 800;
    color: rgb(var(--jackpot-rgb,251,191,36));
    text-shadow: 0 0 12px rgba(var(--jackpot-rgb,251,191,36),0.7);
    min-width: 7ch;
    text-align: center;
    animation: jackpotPulse 2s ease-in-out infinite;
}
.slot-jackpot-star {
    color: rgb(var(--jackpot-rgb,251,191,36));
    font-size: 0.9rem;
    animation: jackpotPulse 2s ease-in-out infinite;
}
@keyframes jackpotPulse {
    0%, 100% { opacity: 1;   transform: scale(1);    }
    50%       { opacity: 0.7; transform: scale(1.05); }
}
```

**Step 3: Wire jackpot banner in `js/ui-slot.js` `openSlot` function**

After the `buildReelGrid(currentGame)` call (around line 795), add:

```js
// ── Jackpot banner ──
(function() {
    var banner  = document.getElementById('slotJackpotBanner');
    var amountEl = document.getElementById('slotJackpotAmount');
    if (!banner) return;
    if (currentGame.jackpot > 0) {
        // Parse accent colour to RGB triplet for CSS variable
        var hex = (currentGame.accentColor || '#fbbf24').replace('#','');
        var r = parseInt(hex.slice(0,2),16), g = parseInt(hex.slice(2,4),16), b = parseInt(hex.slice(4,6),16);
        banner.style.setProperty('--jackpot-rgb', r + ',' + g + ',' + b);
        banner.style.display = 'flex';
        if (amountEl) amountEl.textContent = '$' + jackpotValue.toLocaleString();
        // Sync every second with the lobby jackpotValue
        clearInterval(window._slotJackpotTick);
        window._slotJackpotTick = setInterval(function() {
            if (amountEl) amountEl.textContent = '$' + jackpotValue.toLocaleString();
        }, 1000);
    } else {
        banner.style.display = 'none';
        clearInterval(window._slotJackpotTick);
    }
})();
```

**Step 4: Clear ticker in `closeSlot`**

At the start of `closeSlot()` add:
```js
clearInterval(window._slotJackpotTick);
```

**Step 5: Run QA**
```bash
npm run qa:regression
```

**Step 6: Commit**
```bash
git add index.html styles.css js/ui-slot.js
git commit -m "feat: live jackpot banner in slot header for jackpot games"
```

---

### Task 5: Final Integration Check

**Step 1:** Run full QA
```bash
npm run qa:regression
```
Expected: `Casino QA regression passed.`

**Step 2:** Verify in browser that:
- Matrix rain is visible behind the lobby
- Opening a JACKPOT-tagged game shows the live jackpot banner
- Opening a non-jackpot game hides the banner
- Win animations use provider-coloured particles (open any game, force a win with QA tools)
- Spin sound character changes between e.g. ArcadeForge (8-bit) and Celestial (harp)

**Step 3:** Final commit (if any fixups needed)
```bash
git add -A
git commit -m "fix: theme features integration fixups"
```
