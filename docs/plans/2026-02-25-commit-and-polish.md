# Commit & Polish: New Mechanics Sprint Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Verify QA passes on the current working tree (Hold & Win, Chamber Spins, Wild Meter, Mystery Stacks, Payline Flash, Login Streak, Promo Enhancements, Lobby Search), add sound events and visual polish for each new mechanic, fix mobile layout, then commit everything cleanly.

**Architecture:** All 5 modified JS files are plain global-scope scripts. Sound is added to `playSound()` in `sound-manager.js` via new `case` blocks; then call sites are added in `js/ui-slot.js` at the exact mechanic hook points. Mobile CSS goes directly in the existing id-guarded `<style>` injection blocks already in each file.

**Tech Stack:** Vanilla JS, Web Audio API (`playSound` / `SoundManager.playSoundEvent`), CSS animations, Playwright (QA regression)

---

## Task 1: Run QA Regression Baseline

**Files:** none — read-only verification

**Step 1: Start the preview server**

```bash
# In terminal (keep running for all tasks)
npm start
```

**Step 2: Run QA regression**

```bash
npm run qa:regression
```

Expected: all checks PASS. If failures appear, note each failing assertion and move to Task 1b. If all PASS, skip to Task 2.

---

## Task 1b: Fix Any QA Failures (skip if Task 1 passed)

**Files:**
- Modify: whichever file the failure points to

**Step 1: Read `output/web-game/regression/errors.json`** for the failure description.

**Step 2: Read the relevant source file** at the line indicated, identify the bug.

**Step 3: Apply the minimal fix.**

**Step 4: Re-run `npm run qa:regression`** — must PASS before continuing.

---

## Task 2: Add 4 New Sound Events to `playSound()`

**Files:**
- Modify: `sound-manager.js` — add 4 `case` blocks inside the `switch(type)` in `playSound()` (line ~187–345)

The `playSound` switch ends with `case 'lose': ... break; }`. Insert the 4 new cases **before** the closing `}` of the switch, after the `lose` case.

**Step 1: Open `sound-manager.js`, find the end of the `lose` case (around line 342)**

Look for:
```js
                case 'lose':
                    ...
                    break;
            }  // ← end of switch
```

**Step 2: Insert 4 new cases immediately before the closing `}` of the switch**

```js
                case 'coin_land':
                    // Coin locks in Hold & Win — bright metallic clink
                    {
                        var osc = audioContext.createOscillator();
                        var gain = audioContext.createGain();
                        osc.type = 'sine';
                        osc.connect(gain);
                        gain.connect(audioContext.destination);
                        osc.frequency.setValueAtTime(1200, now);
                        osc.frequency.exponentialRampToValueAtTime(900, now + 0.12);
                        gain.gain.setValueAtTime(0.18 * soundVolume, now);
                        gain.gain.exponentialRampToValueAtTime(0.001 * soundVolume, now + 0.18);
                        osc.start(now);
                        osc.stop(now + 0.2);
                    }
                    break;

                case 'level_up':
                    // Chamber Spins level advance — ascending 4-note fanfare
                    {
                        [523, 659, 784, 1047].forEach(function(freq, i) {
                            var osc = audioContext.createOscillator();
                            var gain = audioContext.createGain();
                            osc.type = 'square';
                            osc.connect(gain);
                            gain.connect(audioContext.destination);
                            osc.frequency.value = freq;
                            gain.gain.setValueAtTime(0.12 * soundVolume, now + i * 0.09);
                            gain.gain.exponentialRampToValueAtTime(0.001 * soundVolume, now + 0.28 + i * 0.09);
                            osc.start(now + i * 0.09);
                            osc.stop(now + 0.30 + i * 0.09);
                        });
                    }
                    break;

                case 'mystery_reveal':
                    // Mystery Stacks reveal — swoosh (noise-like) followed by bright pop
                    {
                        // Swoosh: descending sawtooth sweep
                        var oscS = audioContext.createOscillator();
                        var gainS = audioContext.createGain();
                        oscS.type = 'sawtooth';
                        oscS.connect(gainS);
                        gainS.connect(audioContext.destination);
                        oscS.frequency.setValueAtTime(1800, now);
                        oscS.frequency.exponentialRampToValueAtTime(400, now + 0.25);
                        gainS.gain.setValueAtTime(0.08 * soundVolume, now);
                        gainS.gain.exponentialRampToValueAtTime(0.001 * soundVolume, now + 0.25);
                        oscS.start(now);
                        oscS.stop(now + 0.26);
                        // Pop: bright sine ping
                        var oscP = audioContext.createOscillator();
                        var gainP = audioContext.createGain();
                        oscP.type = 'sine';
                        oscP.connect(gainP);
                        gainP.connect(audioContext.destination);
                        oscP.frequency.value = 1400;
                        gainP.gain.setValueAtTime(0.20 * soundVolume, now + 0.22);
                        gainP.gain.exponentialRampToValueAtTime(0.001 * soundVolume, now + 0.45);
                        oscP.start(now + 0.22);
                        oscP.stop(now + 0.46);
                    }
                    break;

                case 'wild_meter_tick':
                    // Wild Meter accumulation — short electric click
                    {
                        var osc = audioContext.createOscillator();
                        var gain = audioContext.createGain();
                        osc.type = 'square';
                        osc.connect(gain);
                        gain.connect(audioContext.destination);
                        osc.frequency.value = 800 + Math.random() * 200;
                        gain.gain.setValueAtTime(0.10 * soundVolume, now);
                        gain.gain.exponentialRampToValueAtTime(0.001 * soundVolume, now + 0.07);
                        osc.start(now);
                        osc.stop(now + 0.08);
                    }
                    break;
```

**Step 3: Verify no syntax errors**

```bash
node -e "require('./sound-manager.js')" 2>&1 | head -5
```

Expected: no output (or a harmless browser-API warning about AudioContext).

---

## Task 3: Wire Sounds Into the Four New Mechanics

**Files:**
- Modify: `js/ui-slot.js`

Four specific call-site additions, each a one-liner.

### 3a — `coin_land` in `triggerHoldAndWin` respin loop

Find the line in `triggerHoldAndWin` that reads:
```js
                    if (typeof playSound === 'function') playSound('win');
```
Replace it with:
```js
                    if (typeof playSound === 'function') playSound('coin_land');
```

### 3b — `mystery_reveal` in `applyMysteryStacks` reveal setTimeout

Inside `applyMysteryStacks`, find the `setTimeout(function() {` callback that reveals the mystery column. The callback starts with `var revealSymbol = ...`. Add one line **at the top of that callback**:

```js
                    if (typeof playSound === 'function') playSound('mystery_reveal');
```

So it reads:
```js
            setTimeout(function() {
                if (typeof playSound === 'function') playSound('mystery_reveal');
                var revealSymbol = ...
```

### 3c — `wild_meter_tick` in `applyWildCollect`

Find this block in `applyWildCollect`:
```js
            if (wildCount > 0 && !freeSpinsActive) {
                var picks = game.wildCollectMultiplier || [2, 3, 5, 10];
                for (var i = 0; i < wildCount; i++) {
                    window._wildMeterValue += picks[Math.floor(Math.random() * picks.length)];
                }
```
Add after the inner loop closes `}`:
```js
                if (typeof playSound === 'function') playSound('wild_meter_tick');
```

### 3d — `level_up` in `advanceChamberLevel`

Find `function advanceChamberLevel(game)`. It has a `showBonusEffect` call near the end. Add **immediately before** the `showBonusEffect` call:
```js
            if (typeof playSound === 'function') playSound('level_up');
```

**Step: Verify no syntax errors**
```bash
node -e "
const fs = require('fs');
const src = fs.readFileSync('js/ui-slot.js', 'utf8');
// Simple bracket-balance check
let d = 0; for(const c of src) { if(c==='{') d++; else if(c==='}') d--; }
console.log('bracket delta:', d, d===0?'OK':'MISMATCH');
" 2>&1
```
Expected: `bracket delta: 0 OK`

---

## Task 4: Visual Polish — Hold & Win Coin Shower + Wild Meter Color Gradient

**Files:**
- Modify: `js/ui-slot.js`

### 4a — Coin shower on `onHoldWinComplete`

`onHoldWinComplete` already calls `showWinAnimation`. Add a particle burst right after that call:

Find in `window.onHoldWinComplete`:
```js
                if (typeof showWinAnimation === 'function') showWinAnimation(winAmount);
```
Add the line immediately after:
```js
                if (typeof triggerWinParticles === 'function') triggerWinParticles(winAmount);
```

### 4b — Wild Meter color gradient as multiplier grows

In `updateWildMeterDisplay()`, replace:
```js
            el.textContent = '\u26A1 WILD METER: ' + window._wildMeterValue + 'x';
            el.style.display = (window._wildMeterValue > 1) ? 'inline-block' : 'none';
```
With:
```js
            var mv = window._wildMeterValue || 1;
            el.textContent = '\u26A1 WILD METER: ' + mv + 'x';
            el.style.display = (mv > 1) ? 'inline-block' : 'none';
            // Color: yellow (1-5x) → orange (6-15x) → red (16x+)
            var meterColor = mv >= 16 ? '#ff5252' : mv >= 6 ? '#ff9800' : '#c6ff00';
            el.style.borderColor = meterColor;
            el.style.color = meterColor;
```

---

## Task 5: Mobile CSS Fixes

**Files:**
- Modify: `js/ui-slot.js` — session stats bar responsive wrap
- Modify: `js/ui-lobby.js` — lobby search sticky on mobile

### 5a — Session stats bar wraps to 2×2 on narrow screens

In `_ensureSlotSessionStats()`, find the `st.textContent` array and append two new CSS rules:

After `.slot-session-stats { ... }` add:
```css
@media (max-width: 480px) {
    .slot-session-stats { flex-wrap: wrap; gap: 6px; }
    .sss-item { flex: 1 1 42%; }
    .sss-divider { display: none; }
}
```

The existing `st.textContent` is built as an array joined with `'\n'`. Append these rules as an additional string in the array.

### 5b — Lobby search bar: cap padding on mobile

In `ui-lobby.js`, find the `lsc.textContent` block that defines `#lobbySearchBar`. Add inside it:
```css
@media (max-width: 480px) {
    #lobbySearchBar { padding: 6px 0 2px; }
    #lobbyProviderStrip { padding: 2px 0 6px; }
}
```

---

## Task 6: Final QA Gate + Commit

**Step 1: Run QA regression one final time**
```bash
npm run qa:regression
```
Expected: all PASS. If any failures, fix before proceeding.

**Step 2: Stage all modified files**
```bash
git add js/ui-lobby.js js/ui-modals.js js/ui-promos.js js/ui-slot.js js/win-logic.js sound-manager.js
```

**Step 3: Commit**
```bash
git commit -m "$(cat <<'EOF'
feat: hold & win engine, chamber spins, wild meter, mystery stacks, payline flash, login streak, promo polish, lobby search

New mechanics:
- Hold & Win / Coin Respin bonus engine with animated grid overlay and respin counter
- Chamber Spins level-based free spin escalation (Eternal Romance)
- Wild Meter multiplier accumulation with color-gradient display (wild_collect games)
- Mystery Stacks column reveal with rare multiplier (mystery_stacks games)
- Payline flash staggered animation on win

Sound events:
- coin_land (metallic clink when coin locks in Hold & Win)
- level_up (ascending fanfare for Chamber Spins advance)
- mystery_reveal (swoosh + ping on Mystery Stacks reveal)
- wild_meter_tick (electric click on Wild Meter accumulation)

UX / lobby:
- Full-text search bar + provider quick-link pill strip in lobby
- Login streak tracker with XP milestone rewards (3/7/14/30 day)
- Promo popup enhancements: type badge, expiry countdown, wagering progress bar, CLAIM/ACTIVE status badge
- Session stats mini-bar per slot game (spins, win rate, net P&L, best win)
- Reel cell margin stability fix (eliminates strip-height drift)
- Mobile: session stats wrap to 2×2 grid below 480px

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

**Step 4: Verify commit**
```bash
git log --oneline -3
```
Expected: new commit at the top with the message above.

---

## Execution Notes

- **Never edit `index.html` and `js/ui-slot.js` in the same parallel agent** — the QA hook gates on both.
- Tasks 2, 3, 4, 5 are **independent** and can run in parallel (different files: Task 2 is `sound-manager.js`, Tasks 3/4/5 are `js/ui-slot.js` + `js/ui-lobby.js`). However Tasks 3, 4, 5a all touch `js/ui-slot.js` — serialize those three.
- Task 6 (commit) must run last, after all others pass.
