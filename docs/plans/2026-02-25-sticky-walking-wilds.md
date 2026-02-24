# Sticky Wilds + Walking Wilds + Win Streak Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Sticky Wilds and Walking Wilds free-spin mechanics, a Win Streak tracker, 6 new slot games, and 3 new sound events — then commit to master.

**Architecture:** Same global-scope JS pattern as all previous mechanics. New engines go at the bottom of `js/ui-slot.js` as self-contained sections; each engine patches `displayServerWinResult` via IIFE to intercept results. Dispatch is added to `js/win-logic.js` in the scatter section (same pattern as `chamber_spins`). Sound cases added to `sound-manager.js` switch before closing `}`. New games appended to `shared/game-definitions.js` and their provider mappings to `shared/chrome-styles.js`.

**Tech Stack:** Vanilla JS, Web Audio API (`playSound()`), CSS animations, Playwright QA

---

## Task 1: QA Regression Baseline

**Files:** none — read-only

**Step 1: Start preview server** (if not running)
```bash
npm start
```

**Step 2: Run QA**
```bash
npm run qa:regression
```
Expected: all PASS. If failures appear, fix before continuing.

---

## Task 2: Add 3 Sound Events to `sound-manager.js`

**Files:**
- Modify: `sound-manager.js` — insert 3 new cases before the closing `}` of the `switch` block (after the `wild_meter_tick` case, around line 423)

Find:
```js
                    osc.start(now);
                        osc.stop(now + 0.08);
                    }
                    break;
            }
        } catch (e) {
```

Insert the 3 new cases between `break;` and `}`:

```js
                case 'sticky_lock':
                    // Wild locks sticky during free spins — magnetic snap + sustain
                    {
                        var osc = audioContext.createOscillator();
                        var gain = audioContext.createGain();
                        osc.type = 'sine';
                        osc.connect(gain);
                        gain.connect(audioContext.destination);
                        osc.frequency.setValueAtTime(600, now);
                        osc.frequency.exponentialRampToValueAtTime(1400, now + 0.06);
                        osc.frequency.exponentialRampToValueAtTime(1100, now + 0.20);
                        gain.gain.setValueAtTime(0.16 * soundVolume, now);
                        gain.gain.exponentialRampToValueAtTime(0.001 * soundVolume, now + 0.25);
                        osc.start(now);
                        osc.stop(now + 0.26);
                    }
                    break;

                case 'wild_walk':
                    // Walking wild shifts left — short whoosh
                    {
                        var osc = audioContext.createOscillator();
                        var gain = audioContext.createGain();
                        osc.type = 'sawtooth';
                        osc.connect(gain);
                        gain.connect(audioContext.destination);
                        osc.frequency.setValueAtTime(900, now);
                        osc.frequency.exponentialRampToValueAtTime(300, now + 0.15);
                        gain.gain.setValueAtTime(0.12 * soundVolume, now);
                        gain.gain.exponentialRampToValueAtTime(0.001 * soundVolume, now + 0.18);
                        osc.start(now);
                        osc.stop(now + 0.18);
                    }
                    break;

                case 'streak_hit':
                    // Win streak milestone — bright ascending triple ping
                    {
                        [880, 1108, 1320].forEach(function(freq, i) {
                            var osc = audioContext.createOscillator();
                            var gain = audioContext.createGain();
                            osc.type = 'sine';
                            osc.connect(gain);
                            gain.connect(audioContext.destination);
                            osc.frequency.value = freq;
                            gain.gain.setValueAtTime(0.14 * soundVolume, now + i * 0.07);
                            gain.gain.exponentialRampToValueAtTime(0.001 * soundVolume, now + 0.22 + i * 0.07);
                            osc.start(now + i * 0.07);
                            osc.stop(now + 0.23 + i * 0.07);
                        });
                    }
                    break;
```

**Step: Verify syntax**
```bash
node -e "require('./sound-manager.js')" 2>&1 | head -5
```
Expected: no output (or harmless AudioContext warning).

---

## Task 3: Win Streak Tracker in `js/ui-slot.js`

**Files:**
- Modify: `js/ui-slot.js` — append new section at the very end of the file (after the `openSlot` reset patch at the bottom)

Append this full block:

```js
        // ═══════════════════════════════════════════════════════════
        // WIN STREAK TRACKER
        // ═══════════════════════════════════════════════════════════

        window._winStreak = window._winStreak || 0;
        window._winStreakBest = window._winStreakBest || 0;

        var _STREAK_MILESTONES = [
            { at: 3,  label: '🔥 3× STREAK',   color: '#cd7f32', cls: 'streak-bronze' },
            { at: 5,  label: '⚡ 5× STREAK',   color: '#c0c0c0', cls: 'streak-silver' },
            { at: 10, label: '🏆 10× STREAK',  color: '#ffd700', cls: 'streak-gold'   },
            { at: 20, label: '🌈 20× STREAK',  color: '#e040fb', cls: 'streak-legend' }
        ];

        function resetWinStreak() {
            window._winStreak = 0;
            _updateStreakDisplay();
        }

        function _updateStreakDisplay() {
            var el = document.getElementById('winStreakBadge');
            if (!el) return;
            var streak = window._winStreak || 0;
            if (streak < 2) {
                el.style.display = 'none';
                return;
            }
            // Pick highest milestone colour <= streak, or base yellow
            var color = '#ffc107', cls = '';
            for (var i = 0; i < _STREAK_MILESTONES.length; i++) {
                if (streak >= _STREAK_MILESTONES[i].at) { color = _STREAK_MILESTONES[i].color; cls = _STREAK_MILESTONES[i].cls; }
            }
            el.textContent = '🔥 ' + streak + '× STREAK';
            el.style.display = 'inline-block';
            el.style.color = color;
            el.style.borderColor = color;
            el.className = 'win-streak-badge' + (cls ? ' ' + cls : '');
        }

        function _ensureStreakBadge() {
            if (document.getElementById('winStreakBadge')) return;
            var badge = document.createElement('span');
            badge.id = 'winStreakBadge';
            badge.className = 'win-streak-badge';
            badge.style.cssText = 'display:none;position:fixed;top:90px;right:14px;z-index:1500;'
                + 'background:rgba(0,0,0,0.75);border:1.5px solid #ffc107;border-radius:20px;'
                + 'padding:4px 12px;font-size:0.82rem;font-weight:700;color:#ffc107;'
                + 'letter-spacing:0.04em;pointer-events:none;';
            document.body.appendChild(badge);
        }

        // Patch displayServerWinResult to track win streak
        (function() {
            var _origDSWR_streak = displayServerWinResult;
            displayServerWinResult = function(result, game) {
                _ensureStreakBadge();
                var won = result && result.winAmount > 0;
                if (won) {
                    window._winStreak = (window._winStreak || 0) + 1;
                    if (window._winStreak > (window._winStreakBest || 0)) window._winStreakBest = window._winStreak;
                    // Check for milestone
                    for (var i = 0; i < _STREAK_MILESTONES.length; i++) {
                        if (window._winStreak === _STREAK_MILESTONES[i].at) {
                            showBonusEffect(_STREAK_MILESTONES[i].label + '!', _STREAK_MILESTONES[i].color);
                            if (typeof playSound === 'function') playSound('streak_hit');
                            break;
                        }
                    }
                } else {
                    window._winStreak = 0;
                }
                _updateStreakDisplay();
                _origDSWR_streak(result, game);
            };
        })();

        // Reset streak on new game open
        (function() {
            if (typeof openSlot === 'function') {
                var _origOpenSlot_streak = openSlot;
                openSlot = function(game) {
                    resetWinStreak();
                    _origOpenSlot_streak(game);
                };
            }
        })();
```

**Step: Bracket check**
```bash
node -e "
const fs = require('fs');
const src = fs.readFileSync('js/ui-slot.js', 'utf8');
let d = 0; for(const c of src) { if(c==='{') d++; else if(c==='}') d--; }
console.log('bracket delta:', d, d===0?'OK':'MISMATCH');
" 2>&1
```
Expected: `bracket delta: 0 OK`

---

## Task 4: Sticky Wilds Engine in `js/ui-slot.js`

**Files:**
- Modify: `js/ui-slot.js` — append after the Win Streak block

Append this full block:

```js
        // ═══════════════════════════════════════════════════════════
        // STICKY WILDS — bonusType: 'sticky_wilds'
        // Wilds landing during free spins lock in place for all
        // remaining free spins.
        // ═══════════════════════════════════════════════════════════

        window._stickyWildCells = window._stickyWildCells || [];

        function resetStickyWilds() {
            window._stickyWildCells = [];
            // Remove visual class from any lingering cells
            document.querySelectorAll('.reel-sticky-wild').forEach(function(el) {
                el.classList.remove('reel-sticky-wild');
            });
        }

        function triggerStickyWildsFreeSpins(game, scatterWin) {
            resetStickyWilds();
            playSound('freespin');
            showBonusEffect('STICKY WILDS BONUS!', game.accentColor || '#9c27b0');
            triggerFreeSpins(game, game.freeSpinsCount);
        }

        function _applyStickyWildVisuals(game) {
            var cells = window._stickyWildCells || [];
            cells.forEach(function(pos) {
                var el = document.getElementById('reel_' + pos.col + '_' + pos.row);
                if (el) {
                    el.innerHTML = renderSymbol(game.wildSymbol);
                    el.classList.add('reel-sticky-wild', 'reel-wild-glow');
                }
            });
        }

        function _collectNewStickyWilds(result, game) {
            var cells = window._stickyWildCells;
            if (!result || !result.grid) return;
            var cols = result.grid.length;
            for (var c = 0; c < cols; c++) {
                var col = result.grid[c];
                if (!col) continue;
                for (var r = 0; r < col.length; r++) {
                    if (isWild(col[r], game)) {
                        var already = cells.some(function(p) { return p.col === c && p.row === r; });
                        if (!already) {
                            cells.push({ col: c, row: r });
                            if (typeof playSound === 'function') playSound('sticky_lock');
                        }
                    }
                }
            }
        }

        // Inject CSS for sticky wild visual (once)
        (function() {
            if (document.getElementById('_stickyWildCss')) return;
            var st = document.createElement('style');
            st.id = '_stickyWildCss';
            st.textContent = [
                '.reel-sticky-wild {',
                '  outline: 2.5px solid #c6ff00 !important;',
                '  outline-offset: -2px;',
                '  animation: stickyWildPulse 1.2s ease-in-out infinite !important;',
                '}',
                '@keyframes stickyWildPulse {',
                '  0%,100% { box-shadow: 0 0 0 0 rgba(198,255,0,0.0); }',
                '  50%     { box-shadow: 0 0 12px 4px rgba(198,255,0,0.55); }',
                '}'
            ].join('\n');
            document.head.appendChild(st);
        })();

        // Patch displayServerWinResult for sticky_wilds
        (function() {
            var _origDSWR_sticky = displayServerWinResult;
            displayServerWinResult = function(result, game) {
                if (game && game.bonusType === 'sticky_wilds' && freeSpinsActive) {
                    // Inject saved sticky wilds into result grid before rendering
                    var cells = window._stickyWildCells || [];
                    if (cells.length > 0 && result && result.grid) {
                        cells.forEach(function(pos) {
                            if (result.grid[pos.col]) result.grid[pos.col][pos.row] = game.wildSymbol;
                        });
                    }
                    // Run original render
                    _origDSWR_sticky(result, game);
                    // Collect any new wilds as sticky
                    _collectNewStickyWilds(result, game);
                    // Apply visual highlights
                    setTimeout(function() { _applyStickyWildVisuals(game); }, 50);
                    return;
                }
                _origDSWR_sticky(result, game);
            };
        })();

        // Reset on game open
        (function() {
            if (typeof openSlot === 'function') {
                var _origOpenSlot_sticky = openSlot;
                openSlot = function(game) {
                    if (game && game.bonusType === 'sticky_wilds') resetStickyWilds();
                    _origOpenSlot_sticky(game);
                };
            }
        })();
```

**Step: Bracket check** (same command as Task 3)

---

## Task 5: Walking Wilds Engine in `js/ui-slot.js`

**Files:**
- Modify: `js/ui-slot.js` — append after Sticky Wilds block

Append this full block:

```js
        // ═══════════════════════════════════════════════════════════
        // WALKING WILDS — bonusType: 'walking_wilds'
        // Wilds shift one column left each free spin.
        // Wilds at col 0 disappear on the next spin.
        // New wilds that land during free spins also become walkers.
        // ═══════════════════════════════════════════════════════════

        window._walkingWildCells = window._walkingWildCells || [];

        function resetWalkingWilds() {
            window._walkingWildCells = [];
            document.querySelectorAll('.reel-walking-wild').forEach(function(el) {
                el.classList.remove('reel-walking-wild');
            });
        }

        function triggerWalkingWildsFreeSpins(game, scatterWin) {
            resetWalkingWilds();
            playSound('freespin');
            showBonusEffect('WALKING WILDS BONUS!', game.accentColor || '#00bcd4');
            triggerFreeSpins(game, game.freeSpinsCount);
        }

        function _stepWalkingWilds() {
            // Shift each walker left by 1; remove those that were at col 0
            var next = [];
            window._walkingWildCells.forEach(function(pos) {
                if (pos.col > 0) {
                    next.push({ col: pos.col - 1, row: pos.row });
                    if (typeof playSound === 'function') playSound('wild_walk');
                }
                // col 0 walkers are gone — they walked off the edge
            });
            window._walkingWildCells = next;
        }

        function _collectNewWalkingWilds(result, game) {
            var cells = window._walkingWildCells;
            if (!result || !result.grid) return;
            var cols = result.grid.length;
            for (var c = 0; c < cols; c++) {
                var col = result.grid[c];
                if (!col) continue;
                for (var r = 0; r < col.length; r++) {
                    if (isWild(col[r], game)) {
                        var already = cells.some(function(p) { return p.col === c && p.row === r; });
                        if (!already) {
                            cells.push({ col: c, row: r });
                        }
                    }
                }
            }
        }

        function _applyWalkingWildVisuals(game) {
            document.querySelectorAll('.reel-walking-wild').forEach(function(el) {
                el.classList.remove('reel-walking-wild');
            });
            var cells = window._walkingWildCells || [];
            cells.forEach(function(pos) {
                var el = document.getElementById('reel_' + pos.col + '_' + pos.row);
                if (el) {
                    el.innerHTML = renderSymbol(game.wildSymbol);
                    el.classList.add('reel-walking-wild', 'reel-wild-glow');
                }
            });
        }

        // Inject CSS for walking wild visual (once)
        (function() {
            if (document.getElementById('_walkingWildCss')) return;
            var st = document.createElement('style');
            st.id = '_walkingWildCss';
            st.textContent = [
                '.reel-walking-wild {',
                '  outline: 2.5px solid #00e5ff !important;',
                '  outline-offset: -2px;',
                '  animation: walkingWildSlide 0.5s ease-out !important;',
                '}',
                '@keyframes walkingWildSlide {',
                '  0%   { transform: translateX(30px); opacity:0.4; }',
                '  60%  { transform: translateX(-4px); opacity:1; }',
                '  100% { transform: translateX(0);    opacity:1; }',
                '}'
            ].join('\n');
            document.head.appendChild(st);
        })();

        // Patch displayServerWinResult for walking_wilds
        (function() {
            var _origDSWR_walk = displayServerWinResult;
            displayServerWinResult = function(result, game) {
                if (game && game.bonusType === 'walking_wilds' && freeSpinsActive) {
                    // Step walkers left BEFORE this spin renders
                    _stepWalkingWilds();
                    // Inject walker positions into result grid
                    var cells = window._walkingWildCells;
                    if (cells.length > 0 && result && result.grid) {
                        cells.forEach(function(pos) {
                            if (result.grid[pos.col]) result.grid[pos.col][pos.row] = game.wildSymbol;
                        });
                    }
                    // Render
                    _origDSWR_walk(result, game);
                    // Collect any new wilds as walkers
                    _collectNewWalkingWilds(result, game);
                    // Apply walk visuals
                    setTimeout(function() { _applyWalkingWildVisuals(game); }, 50);
                    return;
                }
                _origDSWR_walk(result, game);
            };
        })();

        // Reset on game open
        (function() {
            if (typeof openSlot === 'function') {
                var _origOpenSlot_walk = openSlot;
                openSlot = function(game) {
                    if (game && game.bonusType === 'walking_wilds') resetWalkingWilds();
                    _origOpenSlot_walk(game);
                };
            }
        })();
```

**Step: Bracket check** (same command as Task 3)

---

## Task 6: Wire Scatter Dispatch in `js/win-logic.js`

**Files:**
- Modify: `js/win-logic.js` — extend the scatter bonus dispatch block (around line 568)

Find this block:
```js
            // ── chamber_spins hook — Eternal Romance ──
                if (game.bonusType === 'chamber_spins') {
                    if (typeof triggerChamberSpins === 'function') {
                        playSound('freespin');
                        message = `CHAMBER BONUS! +$${scatterWin.toLocaleString()} scatter pay!`;
                        triggerChamberSpins(game);
                    }
                } else if (scatterCount >= fullScatterThreshold) {
```

Replace with:
```js
            // ── chamber_spins hook — Eternal Romance ──
                if (game.bonusType === 'chamber_spins') {
                    if (typeof triggerChamberSpins === 'function') {
                        playSound('freespin');
                        message = `CHAMBER BONUS! +$${scatterWin.toLocaleString()} scatter pay!`;
                        triggerChamberSpins(game);
                    }
                } else if (game.bonusType === 'sticky_wilds') {
                    if (typeof triggerStickyWildsFreeSpins === 'function') {
                        message = `STICKY WILDS! ${game.freeSpinsCount} FREE SPINS! +$${scatterWin.toLocaleString()}!`;
                        triggerStickyWildsFreeSpins(game, scatterWin);
                    } else {
                        playSound('freespin');
                        triggerFreeSpins(game, game.freeSpinsCount);
                        message = `STICKY WILDS! ${game.freeSpinsCount} FREE SPINS! +$${scatterWin.toLocaleString()}!`;
                    }
                } else if (game.bonusType === 'walking_wilds') {
                    if (typeof triggerWalkingWildsFreeSpins === 'function') {
                        message = `WALKING WILDS! ${game.freeSpinsCount} FREE SPINS! +$${scatterWin.toLocaleString()}!`;
                        triggerWalkingWildsFreeSpins(game, scatterWin);
                    } else {
                        playSound('freespin');
                        triggerFreeSpins(game, game.freeSpinsCount);
                        message = `WALKING WILDS! ${game.freeSpinsCount} FREE SPINS! +$${scatterWin.toLocaleString()}!`;
                    }
                } else if (scatterCount >= fullScatterThreshold) {
```

---

## Task 7: Add 6 New Games

### 7a — `shared/game-definitions.js`

**Files:**
- Modify: `shared/game-definitions.js` — replace the comment + closing `];` at the end:

Find (last 2 lines before the module.exports):
```js
    // ═90. game block placeholder
];
```

Replace with:
```js
    // ═93. sticky_wilds games
    { id: 'jade_temple', name: 'Jade Temple', provider: 'Orient Reels', tag: 'NEW', tagClass: 'tag-new', thumbnail: 'assets/thumbnails/jade_temple.png', bgGradient: 'linear-gradient(135deg, #004d40 0%, #1b5e20 100%)',
      symbols: ['s1_bamboo','s2_lotus','s3_dragon_carp','s4_jade_mask','s5_temple_deity','wild_jade'],
      reelBg: 'linear-gradient(180deg, #011a15 0%, #020e08 100%)', accentColor: '#00e676',
      gridCols: 5, gridRows: 3, template: 'standard', winType: 'payline',
      wildSymbol: 'wild_jade', scatterSymbol: 's5_temple_deity',
      bonusType: 'sticky_wilds', freeSpinsCount: 10, freeSpinsRetrigger: true,
      bonusDesc: 'Jade Temple: 5×3 — Wilds stick for the duration! Each new wild grows the grid coverage!',
      payouts: { triple: 80, double: 8, wildTriple: 120, scatterPay: 3 }, minBet: 0.20, maxBet: 2500, hot: true, jackpot: 0 },

    { id: 'arctic_foxes', name: 'Arctic Foxes', provider: 'FrostByte Gaming', tag: 'NEW', tagClass: 'tag-new', thumbnail: 'assets/thumbnails/arctic_foxes.png', bgGradient: 'linear-gradient(135deg, #0d47a1 0%, #b0bec5 100%)',
      symbols: ['s1_snowflake','s2_ice_shard','s3_aurora','s4_fox_cub','s5_spirit_fox','wild_icebloom'],
      reelBg: 'linear-gradient(180deg, #030d1a 0%, #020810 100%)', accentColor: '#80d8ff',
      gridCols: 5, gridRows: 3, template: 'standard', winType: 'payline',
      wildSymbol: 'wild_icebloom', scatterSymbol: 's5_spirit_fox',
      bonusType: 'sticky_wilds', freeSpinsCount: 12, freeSpinsRetrigger: true,
      bonusDesc: 'Arctic Foxes: 5×3 — Icy wilds freeze in place! Each spin adds more frozen wilds!',
      payouts: { triple: 85, double: 9, wildTriple: 125, scatterPay: 3 }, minBet: 0.20, maxBet: 3000, hot: false, jackpot: 0 },

    { id: 'neon_viper', name: 'Neon Viper', provider: 'NeonCore Labs', tag: 'HOT', tagClass: 'tag-hot', thumbnail: 'assets/thumbnails/neon_viper.png', bgGradient: 'linear-gradient(135deg, #1a0033 0%, #00e5ff 100%)',
      symbols: ['s1_pixel_byte','s2_circuit','s3_laser_eye','s4_cyber_fang','s5_viper_boss','wild_neon'],
      reelBg: 'linear-gradient(180deg, #0a0015 0%, #05000d 100%)', accentColor: '#e040fb',
      gridCols: 5, gridRows: 3, template: 'standard', winType: 'payline',
      wildSymbol: 'wild_neon', scatterSymbol: 's5_viper_boss',
      bonusType: 'sticky_wilds', freeSpinsCount: 8, freeSpinsRetrigger: true,
      bonusDesc: 'Neon Viper: 5×3 — Cyber wilds lock on the grid! Collect 10 to activate Blackout Mode!',
      payouts: { triple: 90, double: 9, wildTriple: 135, scatterPay: 3 }, minBet: 0.20, maxBet: 4000, hot: true, jackpot: 0 },

    // ═96. walking_wilds games
    { id: 'midnight_drifter', name: 'Midnight Drifter', provider: 'NeonCore Labs', tag: 'NEW', tagClass: 'tag-new', thumbnail: 'assets/thumbnails/midnight_drifter.png', bgGradient: 'linear-gradient(135deg, #0a0a0a 0%, #1a237e 100%)',
      symbols: ['s1_streetlight','s2_graffiti','s3_drift_car','s4_chrome_wheel','s5_night_king','wild_drift'],
      reelBg: 'linear-gradient(180deg, #050510 0%, #020206 100%)', accentColor: '#aeea00',
      gridCols: 5, gridRows: 3, template: 'standard', winType: 'payline',
      wildSymbol: 'wild_drift', scatterSymbol: 's5_night_king',
      bonusType: 'walking_wilds', freeSpinsCount: 10, freeSpinsRetrigger: true,
      bonusDesc: 'Midnight Drifter: 5×3 — Wilds walk left each spin! Stack multiple walkers for massive wins!',
      payouts: { triple: 80, double: 8, wildTriple: 120, scatterPay: 3 }, minBet: 0.20, maxBet: 2500, hot: false, jackpot: 0 },

    { id: 'pharaoh_march', name: 'Pharaoh\'s March', provider: 'Desert Gold Studios', tag: 'POPULAR', tagClass: 'tag-popular', thumbnail: 'assets/thumbnails/pharaoh_march.png', bgGradient: 'linear-gradient(135deg, #f57f17 0%, #4e342e 100%)',
      symbols: ['s1_hieroglyph','s2_canopic_jar','s3_scarab','s4_eye_of_ra','s5_pharaoh','wild_ankh'],
      reelBg: 'linear-gradient(180deg, #120800 0%, #0a0500 100%)', accentColor: '#ffab00',
      gridCols: 5, gridRows: 3, template: 'standard', winType: 'payline',
      wildSymbol: 'wild_ankh', scatterSymbol: 's5_pharaoh',
      bonusType: 'walking_wilds', freeSpinsCount: 12, freeSpinsRetrigger: true,
      bonusDesc: "Pharaoh's March: 5×3 — Ankh wilds march across the reels! Retrigger for extra marchers!",
      payouts: { triple: 85, double: 9, wildTriple: 130, scatterPay: 3 }, minBet: 0.20, maxBet: 3000, hot: true, jackpot: 0 },

    { id: 'iron_stampede', name: 'Iron Stampede', provider: 'IronReel Entertainment', tag: 'NEW', tagClass: 'tag-new', thumbnail: 'assets/thumbnails/iron_stampede.png', bgGradient: 'linear-gradient(135deg, #212121 0%, #bf360c 100%)',
      symbols: ['s1_horseshoe','s2_lasso','s3_bull_horn','s4_iron_brand','s5_stampede_chief','wild_ironbull'],
      reelBg: 'linear-gradient(180deg, #0d0503 0%, #060200 100%)', accentColor: '#ff7043',
      gridCols: 5, gridRows: 3, template: 'standard', winType: 'payline',
      wildSymbol: 'wild_ironbull', scatterSymbol: 's5_stampede_chief',
      bonusType: 'walking_wilds', freeSpinsCount: 10, freeSpinsRetrigger: true,
      bonusDesc: 'Iron Stampede: 5×3 — Bull wilds charge left! Each new scatter during free spins adds another bull!',
      payouts: { triple: 90, double: 9, wildTriple: 135, scatterPay: 3 }, minBet: 0.20, maxBet: 4000, hot: false, jackpot: 0 }
];
```

### 7b — `shared/chrome-styles.js`

**Files:**
- Modify: `shared/chrome-styles.js` — find `GAME_CHROME_STYLES` object and add 6 entries

Find the last entry block (search for `crystal_chambers`):
```js
    crystal_chambers: { ... }
```

After that closing `}`, before the outer `}` of the object, add:
```js
    jade_temple:       { provider: 'Orient Reels' },
    arctic_foxes:      { provider: 'FrostByte Gaming' },
    neon_viper:        { provider: 'NeonCore Labs' },
    midnight_drifter:  { provider: 'NeonCore Labs' },
    pharaoh_march:     { provider: 'Desert Gold Studios' },
    iron_stampede:     { provider: 'IronReel Entertainment' },
```

---

## Task 8: Final QA + Commit

**Step 1: Run QA**
```bash
npm run qa:regression
```
Expected: all PASS. If failures appear, fix before proceeding.

**Step 2: Stage modified files**
```bash
git add js/ui-slot.js js/win-logic.js sound-manager.js shared/game-definitions.js shared/chrome-styles.js docs/plans/2026-02-25-sticky-walking-wilds.md
```

**Step 3: Commit**
```bash
git commit -m "$(cat <<'EOF'
feat: sticky wilds, walking wilds, win streak tracker, 6 new games

New mechanics:
- Sticky Wilds engine (bonusType: 'sticky_wilds'): wilds lock in place for
  the duration of free spins; each new wild also becomes sticky
- Walking Wilds engine (bonusType: 'walking_wilds'): wilds shift one reel
  left each free spin; walkers reaching col 0 vanish
- Win Streak tracker: consecutive-win counter with badge at 3/5/10/20×

Sound events:
- sticky_lock (magnetic snap when a wild goes sticky)
- wild_walk (whoosh as a wild steps left)
- streak_hit (ascending triple ping at streak milestones)

6 new games (98 total):
- sticky_wilds: jade_temple, arctic_foxes, neon_viper
- walking_wilds: midnight_drifter, pharaoh_march, iron_stampede

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

**Step 4: Push to master**
```bash
git push origin master
```

**Step 5: Verify**
```bash
git log --oneline -3
```

---

## Execution Notes

- Tasks 2, 6, 7 are **independent** of each other and of tasks 3/4/5 — run parallel agents.
- Tasks 3, 4, 5 all touch `js/ui-slot.js` — serialize those three **in order** (Streak → Sticky → Walking).
- Task 8 (QA + commit) must run last.
- Never assign two parallel agents to the same file.
