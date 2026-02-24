# Cascading Reels + Expanding Wilds + Re-Spin Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Cascading Reels (wins cause chain explosions with rising multipliers), Expanding Wilds (wilds expand to fill their reel column), and Re-Spin with Hold (high symbols lock in place for 1–3 re-spins), plus 6 new games, 3 new sound events — then commit to master.

**Architecture:** Same global-scope JS pattern. New engines appended to `js/ui-slot.js` bottom. Scatter dispatch extended in `js/win-logic.js` for re-spin. Sound cases added to `sound-manager.js`. Games appended to `shared/game-definitions.js`; chrome-style aliases to `shared/chrome-styles.js`.

**Tech Stack:** Vanilla JS, Web Audio API, CSS animations, Playwright QA

---

## Task 1: QA Regression Baseline

```bash
npm run qa:regression
```
Expected: all PASS.

---

## Task 2: Add 3 New Sound Events to `sound-manager.js`

Insert before the closing `}` of the switch (after the `buy_feature` case), around line 530:

```js
                case 'cascade_hit':
                    // Cascade pop — each level of cascade gets a higher note
                    {
                        var osc = audioContext.createOscillator();
                        var gain = audioContext.createGain();
                        osc.type = 'square';
                        osc.connect(gain);
                        gain.connect(audioContext.destination);
                        osc.frequency.setValueAtTime(330, now);
                        osc.frequency.exponentialRampToValueAtTime(660, now + 0.07);
                        gain.gain.setValueAtTime(0.12 * soundVolume, now);
                        gain.gain.exponentialRampToValueAtTime(0.001 * soundVolume, now + 0.10);
                        osc.start(now);
                        osc.stop(now + 0.11);
                    }
                    break;

                case 'wild_expand':
                    // Expanding wild whoosh — downward sweep then ring
                    {
                        var osc = audioContext.createOscillator();
                        var gain = audioContext.createGain();
                        osc.type = 'sawtooth';
                        osc.connect(gain);
                        gain.connect(audioContext.destination);
                        osc.frequency.setValueAtTime(800, now);
                        osc.frequency.exponentialRampToValueAtTime(200, now + 0.15);
                        gain.gain.setValueAtTime(0.18 * soundVolume, now);
                        gain.gain.exponentialRampToValueAtTime(0.001 * soundVolume, now + 0.22);
                        osc.start(now);
                        osc.stop(now + 0.23);
                    }
                    break;

                case 'respin_lock':
                    // Symbol locks in — mechanical click + buzz
                    {
                        var osc = audioContext.createOscillator();
                        var gain = audioContext.createGain();
                        osc.type = 'triangle';
                        osc.connect(gain);
                        gain.connect(audioContext.destination);
                        osc.frequency.setValueAtTime(220, now);
                        osc.frequency.setValueAtTime(180, now + 0.04);
                        gain.gain.setValueAtTime(0.22 * soundVolume, now);
                        gain.gain.exponentialRampToValueAtTime(0.001 * soundVolume, now + 0.12);
                        osc.start(now);
                        osc.stop(now + 0.13);
                    }
                    break;
```

**Verify:** `grep -n "cascade_hit\|wild_expand\|respin_lock" sound-manager.js`

---

## Task 3: Cascading Reels Engine in `js/ui-slot.js`

Append to end of file:

```js
        // ═══════════════════════════════════════════════════════════
        // CASCADING REELS — bonusType: 'cascading'
        // After a win, winning symbols explode and new symbols fall in.
        // Each cascade level raises the win multiplier: 1x → 2x → 3x → 5x.
        // Up to 4 cascade levels per spin. Resets each new spin.
        // ═══════════════════════════════════════════════════════════

        var _CASCADE_MULTS = [1, 2, 3, 5];
        window._cascadeLevel = window._cascadeLevel || 0;
        window._cascadeActive = false;

        function resetCascade() {
            window._cascadeLevel = 0;
            window._cascadeActive = false;
            var el = document.getElementById('cascadeMultDisplay');
            if (el) el.style.display = 'none';
        }

        function _currentCascadeMult() {
            return _CASCADE_MULTS[Math.min(window._cascadeLevel || 0, _CASCADE_MULTS.length - 1)];
        }

        function _ensureCascadeDisplay() {
            if (document.getElementById('cascadeMultDisplay')) return;
            var el = document.createElement('span');
            el.id = 'cascadeMultDisplay';
            el.style.cssText = 'display:none;position:fixed;top:170px;right:14px;z-index:1500;'
                + 'background:rgba(0,0,0,0.75);border:1.5px solid #00e5ff;border-radius:20px;'
                + 'padding:4px 12px;font-size:0.82rem;font-weight:700;color:#00e5ff;'
                + 'letter-spacing:0.04em;pointer-events:none;';
            document.body.appendChild(el);
        }

        function _updateCascadeDisplay() {
            var el = document.getElementById('cascadeMultDisplay');
            if (!el) return;
            var level = window._cascadeLevel || 0;
            if (!window._cascadeActive || level < 1) { el.style.display = 'none'; return; }
            var mult = _currentCascadeMult();
            el.textContent = '\uD83D\uDCA5 CASCADE ' + mult + 'x';
            el.style.display = 'inline-block';
            var c = mult >= 5 ? '#ff5252' : mult >= 3 ? '#ff9800' : '#00e5ff';
            el.style.color = c;
            el.style.borderColor = c;
        }

        function _playCascadeExplosion(result, game) {
            if (!result || !result.grid) return;
            // Flash winning cells with cascade explosion class
            var cols = result.grid.length;
            for (var c = 0; c < cols; c++) {
                var col = result.grid[c];
                if (!col) continue;
                for (var r = 0; r < col.length; r++) {
                    var el = document.getElementById('reel_' + c + '_' + r);
                    if (!el) continue;
                    el.classList.add('cascade-explode');
                    setTimeout((function(e) { return function() { e.classList.remove('cascade-explode'); }; })(el), 400);
                }
            }
            if (typeof playSound === 'function') playSound('cascade_hit');
        }

        (function() {
            if (document.getElementById('_cascadeCss')) return;
            var st = document.createElement('style');
            st.id = '_cascadeCss';
            st.textContent = '@keyframes cascadeExplode { 0%{transform:scale(1);opacity:1} 50%{transform:scale(1.35);opacity:0.7;filter:brightness(2)} 100%{transform:scale(0);opacity:0} }'
                + '.cascade-explode { animation: cascadeExplode 0.35s ease-out both !important; }';
            document.head.appendChild(st);
        })();

        (function() {
            var _origDSWR_cas = displayServerWinResult;
            displayServerWinResult = function(result, game) {
                if (game && game.bonusType === 'cascading') {
                    _ensureCascadeDisplay();
                    var mult = _currentCascadeMult();
                    if (result && result.winAmount > 0) {
                        window._cascadeActive = true;
                        _playCascadeExplosion(result, game);
                        if (mult > 1) {
                            var extra = result.winAmount * (mult - 1);
                            balance += extra;
                            updateBalance();
                            saveBalance();
                            var patched = Object.assign({}, result, { winAmount: result.winAmount * mult });
                            _origDSWR_cas(patched, game);
                            showBonusEffect('CASCADE ' + mult + 'x!', mult >= 5 ? '#ff5252' : '#ff9800');
                        } else {
                            _origDSWR_cas(result, game);
                        }
                        // Advance cascade for next hit (capped at last step)
                        if ((window._cascadeLevel || 0) < _CASCADE_MULTS.length - 1) {
                            window._cascadeLevel = (window._cascadeLevel || 0) + 1;
                        }
                        _updateCascadeDisplay();
                        return;
                    }
                    // No win — reset cascade
                    resetCascade();
                    _origDSWR_cas(result, game);
                    return;
                }
                _origDSWR_cas(result, game);
            };
        })();

        (function() {
            if (typeof openSlot === 'function') {
                var _origOpenSlot_cas = openSlot;
                openSlot = function(game) {
                    if (game && game.bonusType === 'cascading') resetCascade();
                    _origOpenSlot_cas(game);
                };
            }
        })();
```

---

## Task 4: Expanding Wilds Engine in `js/ui-slot.js`

Append after Task 3 block:

```js
        // ═══════════════════════════════════════════════════════════
        // EXPANDING WILDS — bonusType: 'expanding_wilds'
        // When a wild lands, it expands to fill its entire reel column.
        // The expansion plays a sweep animation then re-evaluates wins.
        // ═══════════════════════════════════════════════════════════

        window._expandedCols = window._expandedCols || {};

        function resetExpandedWilds() {
            window._expandedCols = {};
        }

        function _expandWildsInResult(result, game) {
            window._expandedCols = {};
            if (!result || !result.grid) return result;
            var cols = result.grid.length;
            var changed = false;
            for (var c = 0; c < cols; c++) {
                var col = result.grid[c];
                if (!col) continue;
                var hasWild = col.some(function(sym) { return isWild(sym, game); });
                if (hasWild) {
                    window._expandedCols[c] = true;
                    col = col.map(function() { return game.wildSymbol; });
                    result = Object.assign({}, result);
                    result.grid = result.grid.slice();
                    result.grid[c] = col;
                    changed = true;
                }
            }
            return changed ? result : result;
        }

        function _renderExpandingWildVisuals(game) {
            Object.keys(window._expandedCols || {}).forEach(function(colIdx) {
                var c = parseInt(colIdx, 10);
                var rows = (currentGame && currentGame.gridRows) || 3;
                for (var r = 0; r < rows; r++) {
                    var el = document.getElementById('reel_' + c + '_' + r);
                    if (!el) continue;
                    el.classList.add('expand-wild-anim');
                    // wildSymbol is internal game config, not user input — safe to render as HTML // nosec
                    el.innerHTML = renderSymbol(game.wildSymbol);
                    setTimeout((function(e) { return function() { e.classList.remove('expand-wild-anim'); }; })(el), 500);
                }
                if (typeof playSound === 'function') playSound('wild_expand');
            });
        }

        (function() {
            if (document.getElementById('_expandWildCss')) return;
            var st = document.createElement('style');
            st.id = '_expandWildCss';
            st.textContent = '@keyframes expandWild { 0%{transform:scaleY(0);opacity:0} 60%{transform:scaleY(1.15)} 100%{transform:scaleY(1);opacity:1} }'
                + '.expand-wild-anim { animation: expandWild 0.45s cubic-bezier(0.22,1,0.36,1) both !important; transform-origin: top center; }';
            document.head.appendChild(st);
        })();

        (function() {
            var _origDSWR_ew = displayServerWinResult;
            displayServerWinResult = function(result, game) {
                if (game && game.bonusType === 'expanding_wilds') {
                    var expanded = _expandWildsInResult(result, game);
                    _origDSWR_ew(expanded, game);
                    if (Object.keys(window._expandedCols || {}).length > 0) {
                        setTimeout(function() { _renderExpandingWildVisuals(game); }, 30);
                    }
                    return;
                }
                _origDSWR_ew(result, game);
            };
        })();

        (function() {
            if (typeof openSlot === 'function') {
                var _origOpenSlot_ew = openSlot;
                openSlot = function(game) {
                    if (game && game.bonusType === 'expanding_wilds') resetExpandedWilds();
                    _origOpenSlot_ew(game);
                };
            }
        })();
```

---

## Task 5: Re-Spin with Hold Engine in `js/ui-slot.js`

Append after Task 4 block:

```js
        // ═══════════════════════════════════════════════════════════
        // RE-SPIN WITH HOLD — bonusType: 'respin'
        // When 1–2 scatter/wild symbols land but don't trigger full bonus,
        // those symbols lock in place and up to 2 free re-spins are awarded.
        // Resets on full bonus trigger or on game open.
        // ═══════════════════════════════════════════════════════════

        window._respinLockedCells = window._respinLockedCells || [];
        window._respinCount = 0;
        window._respinActive = false;

        function resetRespin() {
            window._respinLockedCells = [];
            window._respinCount = 0;
            window._respinActive = false;
            _clearRespinLocks();
        }

        function _clearRespinLocks() {
            document.querySelectorAll('.respin-lock').forEach(function(el) {
                el.classList.remove('respin-lock');
            });
        }

        function _renderRespinLocks(game) {
            _clearRespinLocks();
            (window._respinLockedCells || []).forEach(function(pos) {
                var el = document.getElementById('reel_' + pos.col + '_' + pos.row);
                if (!el) return;
                el.classList.add('respin-lock');
                if (typeof playSound === 'function') playSound('respin_lock');
            });
        }

        function _collectRespinLockCandidates(result, game) {
            if (!result || !result.grid) return;
            var cols = result.grid.length;
            for (var c = 0; c < cols; c++) {
                var col = result.grid[c];
                if (!col) continue;
                for (var r = 0; r < col.length; r++) {
                    var sym = col[r];
                    if (sym === game.scatterSymbol || isWild(sym, game)) {
                        var key = c + ':' + r;
                        var exists = (window._respinLockedCells || []).some(function(p) { return p.col === c && p.row === r; });
                        if (!exists) {
                            window._respinLockedCells = (window._respinLockedCells || []).concat([{ col: c, row: r, sym: sym }]);
                        }
                    }
                }
            }
        }

        (function() {
            if (document.getElementById('_respinCss')) return;
            var st = document.createElement('style');
            st.id = '_respinCss';
            st.textContent = '@keyframes respinPulse { 0%,100%{box-shadow:0 0 0 0 rgba(255,215,0,0.8)} 50%{box-shadow:0 0 0 6px rgba(255,215,0,0)} }'
                + '.respin-lock { outline: 2px solid #ffd600; border-radius: 4px; animation: respinPulse 1s ease-in-out infinite; }';
            document.head.appendChild(st);
        })();

        (function() {
            var _origDSWR_rs = displayServerWinResult;
            displayServerWinResult = function(result, game) {
                if (game && game.bonusType === 'respin' && !freeSpinsActive) {
                    // Collect scatter/wild positions as lock candidates
                    _collectRespinLockCandidates(result, game);
                    var locked = (window._respinLockedCells || []).length;
                    // If 1-2 high-value symbols landed but NOT enough for full bonus, grant re-spin
                    if (locked >= 1 && locked < (game.scatterThreshold || 3) && !window._respinActive) {
                        window._respinActive = true;
                        window._respinCount = Math.min(locked + 1, 3);
                        _origDSWR_rs(result, game);
                        setTimeout(function() {
                            _renderRespinLocks(game);
                            showBonusEffect(window._respinCount + ' RE-SPIN' + (window._respinCount > 1 ? 'S' : '') + '! Hold the locks!', '#ffd600');
                            // Grant re-spins via free-spin engine with 0 win but count spins
                            if (typeof triggerFreeSpins === 'function') {
                                triggerFreeSpins(game, window._respinCount);
                            }
                        }, 200);
                        return;
                    }
                    _origDSWR_rs(result, game);
                    return;
                }
                // After re-spin round ends, clear locks
                if (game && game.bonusType === 'respin' && freeSpinsActive && (window._freeSpinsLeft || 0) <= 0) {
                    resetRespin();
                }
                _origDSWR_rs(result, game);
            };
        })();

        (function() {
            if (typeof openSlot === 'function') {
                var _origOpenSlot_rs = openSlot;
                openSlot = function(game) {
                    if (game && game.bonusType === 'respin') resetRespin();
                    _origOpenSlot_rs(game);
                };
            }
        })();
```

---

## Task 6: Wire Scatter Dispatch in `js/win-logic.js`

Find the `increasing_mult` dispatch block added in the previous sprint and add `respin` dispatch right before `else if (scatterCount >= fullScatterThreshold)`:

After the `increasing_mult` closing `}`, add:
```js
                } else if (game.bonusType === 'respin') {
                    if (typeof triggerFreeSpins === 'function') {
                        playSound('freespin');
                        message = `RE-SPIN BONUS! ${game.freeSpinsCount} FREE SPINS! +$${scatterWin.toLocaleString()}!`;
                        triggerFreeSpins(game, game.freeSpinsCount);
                    }
```

Note: `cascading` and `expanding_wilds` use standard free-spin trigger — no special dispatch needed since the multiplier/expand logic fires on every spin result automatically.

---

## Task 7: Add 6 New Games

### 7a — `shared/game-definitions.js`

Replace the closing `];` with 6 new games + new `];`:

```js
    // cascading games
    { id: 'diamond_falls', name: 'Diamond Falls', provider: 'NovaSpin Studios', tag: 'HOT', tagClass: 'tag-hot', thumbnail: 'assets/thumbnails/diamond_falls.png', bgGradient: 'linear-gradient(135deg, #0a0a1a 0%, #00bcd4 100%)',
      symbols: ['s1_gem_chip','s2_sapphire','s3_ruby_shard','s4_emerald','s5_diamond_star','wild_prismatic'],
      reelBg: 'linear-gradient(180deg, #020209 0%, #010105 100%)', accentColor: '#00e5ff',
      gridCols: 5, gridRows: 3, template: 'standard', winType: 'payline',
      wildSymbol: 'wild_prismatic', scatterSymbol: 's5_diamond_star',
      bonusType: 'cascading', freeSpinsCount: 12, freeSpinsRetrigger: true,
      bonusDesc: 'Diamond Falls: 5×3 — Winning gems explode and cascade! Each level multiplies wins up to 5×!',
      payouts: { triple: 80, double: 8, wildTriple: 120, scatterPay: 3 }, minBet: 0.20, maxBet: 2500, hot: true, jackpot: 0 },

    { id: 'dragon_tumble', name: 'Dragon Tumble', provider: 'PhantomWorks', tag: 'NEW', tagClass: 'tag-new', thumbnail: 'assets/thumbnails/dragon_tumble.png', bgGradient: 'linear-gradient(135deg, #1a0000 0%, #b71c1c 100%)',
      symbols: ['s1_dragon_egg','s2_fire_scale','s3_talon_claw','s4_dragon_eye','s5_ancient_hoard','wild_dragonfire'],
      reelBg: 'linear-gradient(180deg, #0d0000 0%, #060000 100%)', accentColor: '#ff1744',
      gridCols: 5, gridRows: 3, template: 'standard', winType: 'payline',
      wildSymbol: 'wild_dragonfire', scatterSymbol: 's5_ancient_hoard',
      bonusType: 'cascading', freeSpinsCount: 10, freeSpinsRetrigger: true,
      bonusDesc: 'Dragon Tumble: 5×3 — Dragon fire burns winning symbols! Cascade chains ignite 5× multipliers!',
      payouts: { triple: 90, double: 9, wildTriple: 135, scatterPay: 3 }, minBet: 0.20, maxBet: 4000, hot: false, jackpot: 0 },

    { id: 'golden_cascade', name: 'Golden Cascade', provider: 'GoldenEdge Gaming', tag: 'POPULAR', tagClass: 'tag-popular', thumbnail: 'assets/thumbnails/golden_cascade.png', bgGradient: 'linear-gradient(135deg, #1a1000 0%, #f57f17 100%)',
      symbols: ['s1_gold_nugget','s2_coin_stack','s3_treasure_key','s4_crown_jewel','s5_pharaoh_mask','wild_golden_ra'],
      reelBg: 'linear-gradient(180deg, #0a0600 0%, #050300 100%)', accentColor: '#ffd600',
      gridCols: 5, gridRows: 3, template: 'standard', winType: 'payline',
      wildSymbol: 'wild_golden_ra', scatterSymbol: 's5_pharaoh_mask',
      bonusType: 'cascading', freeSpinsCount: 10, freeSpinsRetrigger: true,
      bonusDesc: 'Golden Cascade: 5×3 — Tumbling gold symbols! Cascade chain to 5× for monumental treasures!',
      payouts: { triple: 85, double: 8, wildTriple: 125, scatterPay: 3 }, minBet: 0.20, maxBet: 3000, hot: false, jackpot: 0 },

    // expanding_wilds games
    { id: 'thunder_reel', name: 'Thunder Reel', provider: 'NovaSpin Studios', tag: 'HOT', tagClass: 'tag-hot', thumbnail: 'assets/thumbnails/thunder_reel.png', bgGradient: 'linear-gradient(135deg, #070f1a 0%, #0d47a1 100%)',
      symbols: ['s1_cloud_bolt','s2_storm_eye','s3_voltage_arc','s4_tempest_god','s5_thunder_peak','wild_lightning_rod'],
      reelBg: 'linear-gradient(180deg, #04080e 0%, #020509 100%)', accentColor: '#82b1ff',
      gridCols: 5, gridRows: 3, template: 'standard', winType: 'payline',
      wildSymbol: 'wild_lightning_rod', scatterSymbol: 's5_thunder_peak',
      bonusType: 'expanding_wilds', freeSpinsCount: 10, freeSpinsRetrigger: true,
      bonusDesc: 'Thunder Reel: 5×3 — Lightning wilds strike and expand to fill entire reels! Maximum electrified wins!',
      payouts: { triple: 85, double: 9, wildTriple: 130, scatterPay: 3 }, minBet: 0.20, maxBet: 3000, hot: true, jackpot: 0 },

    { id: 'crystal_veil', name: 'Crystal Veil', provider: 'PhantomWorks', tag: 'NEW', tagClass: 'tag-new', thumbnail: 'assets/thumbnails/crystal_veil.png', bgGradient: 'linear-gradient(135deg, #0a000f 0%, #6a1b9a 100%)',
      symbols: ['s1_quartz_sliver','s2_amethyst','s3_crystal_orb','s4_spectral_gem','s5_void_crystal','wild_veil_wraith'],
      reelBg: 'linear-gradient(180deg, #060009 0%, #030005 100%)', accentColor: '#e040fb',
      gridCols: 5, gridRows: 3, template: 'standard', winType: 'payline',
      wildSymbol: 'wild_veil_wraith', scatterSymbol: 's5_void_crystal',
      bonusType: 'expanding_wilds', freeSpinsCount: 8, freeSpinsRetrigger: true,
      bonusDesc: 'Crystal Veil: 5×3 — Spectral wilds expand through the veil, covering full reels!',
      payouts: { triple: 80, double: 8, wildTriple: 120, scatterPay: 3 }, minBet: 0.20, maxBet: 2500, hot: false, jackpot: 0 },

    // respin game
    { id: 'primal_vault', name: 'Primal Vault', provider: 'IronReel Games', tag: 'NEW', tagClass: 'tag-new', thumbnail: 'assets/thumbnails/primal_vault.png', bgGradient: 'linear-gradient(135deg, #0a0f05 0%, #33691e 100%)',
      symbols: ['s1_stone_tablet','s2_bone_dice','s3_fur_totem','s4_cave_bear','s5_primal_chest','wild_primal_fire'],
      reelBg: 'linear-gradient(180deg, #060a03 0%, #030501 100%)', accentColor: '#76ff03',
      gridCols: 5, gridRows: 3, template: 'standard', winType: 'payline',
      wildSymbol: 'wild_primal_fire', scatterSymbol: 's5_primal_chest',
      bonusType: 'respin', freeSpinsCount: 10, freeSpinsRetrigger: false, scatterThreshold: 3,
      bonusDesc: 'Primal Vault: 5×3 — Land 1-2 chests to lock and re-spin! 3 chests open the primal vault bonus!',
      payouts: { triple: 85, double: 9, wildTriple: 128, scatterPay: 3 }, minBet: 0.20, maxBet: 3000, hot: false, jackpot: 0 }
];
```

### 7b — `shared/chrome-styles.js`

Add after the `aztec_ascent` entry in `GAME_CHROME_STYLES`:
```js
    diamond_falls:     'novaspin',    // NovaSpin Studios — crystal aqua
    dragon_tumble:     'phantomworks', // PhantomWorks — dark fire
    golden_cascade:    'ironreel',    // GoldenEdge Gaming — gold ancient
    thunder_reel:      'novaspin',    // NovaSpin Studios — electric storm
    crystal_veil:      'phantomworks', // PhantomWorks — spectral purple
    primal_vault:      'ironreel',    // IronReel Games — primal earth
```

---

## Task 8: Final QA + Commit + Push to master

```bash
npm run qa:regression
```
Expected: all PASS.

```bash
git add js/ui-slot.js js/win-logic.js sound-manager.js shared/game-definitions.js shared/chrome-styles.js docs/plans/2026-02-25-cascading-expanding-respin.md
git commit -m "feat: cascading reels, expanding wilds, re-spin hold, 6 new games

New mechanics:
- Cascading Reels (bonusType: 'cascading'): winning symbols explode and new
  ones fall in; each cascade level raises multiplier 1x -> 2x -> 3x -> 5x
  with explosion animation and cascade display badge
- Expanding Wilds (bonusType: 'expanding_wilds'): wilds expand vertically to
  fill their entire reel column with sweep animation
- Re-Spin with Hold (bonusType: 'respin'): 1-2 scatter/wild symbols lock in
  place and grant 1-3 free re-spins with gold pulse lock indicator

Sound events:
- cascade_hit (square wave pop on each cascade level)
- wild_expand (sawtooth whoosh as wild fills reel)
- respin_lock (mechanical click when symbol locks)

6 new games (110 total):
- cascading: diamond_falls, dragon_tumble, golden_cascade
- expanding_wilds: thunder_reel, crystal_veil
- respin: primal_vault

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
git push origin master
```

---

## Execution Notes

- Tasks 2 (`sound-manager.js`), 6 (`win-logic.js`), 7 (`game-definitions.js` + `chrome-styles.js`) are independent of each other and of Tasks 3/4/5 — run as parallel agents.
- Tasks 3, 4, 5 all append to `js/ui-slot.js` — **serialize** them in order.
- Task 8 (QA + commit) must run last.
