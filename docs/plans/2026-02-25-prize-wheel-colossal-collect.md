# Prize Wheel + Colossal Symbols + Symbol Collection Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Prize Wheel (scatter triggers an overlay spinning wheel), Colossal Symbols (2×2 giant symbol blocks that land randomly), and Symbol Collection (collect symbols during free spins to advance a multiplier track), plus 6 new games, 3 new sound events — then commit to master.

**Architecture:** Same global-scope JS pattern. New engines appended to `js/ui-slot.js` bottom. Scatter dispatch extended in `js/win-logic.js` for prize_wheel. Sound cases added to `sound-manager.js`. Games appended to `shared/game-definitions.js`; chrome-style aliases to `shared/chrome-styles.js`.

**Tech Stack:** Vanilla JS, Web Audio API, CSS animations, Playwright QA

---

## Task 1: QA Regression Baseline

```bash
npm run qa:regression
```
Expected: all PASS.

---

## Task 2: Add 3 New Sound Events to `sound-manager.js`

Insert before the closing `}` of the switch (after the `respin_lock` case):

```js
                case 'wheel_spin':
                    // Prize wheel spins — rapid tick accelerating
                    {
                        var tickCount = 8;
                        for (var i = 0; i < tickCount; i++) {
                            (function(idx) {
                                var osc = audioContext.createOscillator();
                                var gain = audioContext.createGain();
                                osc.type = 'triangle';
                                osc.connect(gain);
                                gain.connect(audioContext.destination);
                                var delay = idx * Math.max(0.02, 0.12 - idx * 0.012);
                                osc.frequency.value = 440 + idx * 30;
                                gain.gain.setValueAtTime(0.10 * soundVolume, now + delay);
                                gain.gain.exponentialRampToValueAtTime(0.001 * soundVolume, now + delay + 0.06);
                                osc.start(now + delay);
                                osc.stop(now + delay + 0.07);
                            })(i);
                        }
                    }
                    break;

                case 'colossal_land':
                    // Giant symbol lands — deep thud + shimmer
                    {
                        var osc = audioContext.createOscillator();
                        var gain = audioContext.createGain();
                        osc.type = 'sine';
                        osc.connect(gain);
                        gain.connect(audioContext.destination);
                        osc.frequency.setValueAtTime(80, now);
                        osc.frequency.exponentialRampToValueAtTime(40, now + 0.18);
                        gain.gain.setValueAtTime(0.35 * soundVolume, now);
                        gain.gain.exponentialRampToValueAtTime(0.001 * soundVolume, now + 0.25);
                        osc.start(now);
                        osc.stop(now + 0.26);
                    }
                    break;

                case 'collect_tick':
                    // Symbol collected — ascending pip
                    {
                        var osc = audioContext.createOscillator();
                        var gain = audioContext.createGain();
                        osc.type = 'sine';
                        osc.connect(gain);
                        gain.connect(audioContext.destination);
                        osc.frequency.setValueAtTime(880, now);
                        osc.frequency.exponentialRampToValueAtTime(1320, now + 0.06);
                        gain.gain.setValueAtTime(0.12 * soundVolume, now);
                        gain.gain.exponentialRampToValueAtTime(0.001 * soundVolume, now + 0.09);
                        osc.start(now);
                        osc.stop(now + 0.10);
                    }
                    break;
```

---

## Task 3: Prize Wheel Engine in `js/ui-slot.js`

Append to end of file:

```js
        // ═══════════════════════════════════════════════════════════
        // PRIZE WHEEL — bonusType: 'prize_wheel'
        // Scatter triggers a full-screen overlay wheel with 8 segments.
        // Prizes: 5–50× bet, 5–15 free spins, or jackpot 200× bet.
        // Wheel animates via CSS transform rotation, stops on a random segment.
        // ═══════════════════════════════════════════════════════════

        var _WHEEL_SEGMENTS = [
            { label: '5×', type: 'cash', value: 5 },
            { label: '8 SPINS', type: 'spins', value: 8 },
            { label: '10×', type: 'cash', value: 10 },
            { label: '5 SPINS', type: 'spins', value: 5 },
            { label: '25×', type: 'cash', value: 25 },
            { label: '10 SPINS', type: 'spins', value: 10 },
            { label: '50×', type: 'cash', value: 50 },
            { label: '200× 🎰', type: 'jackpot', value: 200 }
        ];
        var _WHEEL_COLORS = ['#ff6d00','#1565c0','#2e7d32','#6a1b9a','#c62828','#00695c','#f9a825','#37474f'];

        function _buildWheelOverlay(game, onDone) {
            var overlay = document.createElement('div');
            overlay.id = 'prizeWheelOverlay';
            overlay.style.cssText = 'position:fixed;inset:0;z-index:9000;background:rgba(0,0,0,0.88);'
                + 'display:flex;flex-direction:column;align-items:center;justify-content:center;';

            var title = document.createElement('div');
            title.textContent = '🎡 PRIZE WHEEL!';
            title.style.cssText = 'color:#ffd600;font-size:1.6rem;font-weight:900;letter-spacing:0.08em;margin-bottom:18px;text-shadow:0 0 20px #ffd600;';
            overlay.appendChild(title);

            var wheelWrap = document.createElement('div');
            wheelWrap.style.cssText = 'position:relative;width:280px;height:280px;';

            var canvas = document.createElement('canvas');
            canvas.width = 280; canvas.height = 280;
            var ctx = canvas.getContext('2d');
            var segCount = _WHEEL_SEGMENTS.length;
            var segAngle = (Math.PI * 2) / segCount;
            var cx = 140, cy = 140, radius = 130;
            for (var i = 0; i < segCount; i++) {
                ctx.beginPath();
                ctx.moveTo(cx, cy);
                ctx.arc(cx, cy, radius, i * segAngle - Math.PI / 2, (i + 1) * segAngle - Math.PI / 2);
                ctx.closePath();
                ctx.fillStyle = _WHEEL_COLORS[i];
                ctx.fill();
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.stroke();
                ctx.save();
                ctx.translate(cx, cy);
                ctx.rotate(i * segAngle - Math.PI / 2 + segAngle / 2);
                ctx.textAlign = 'right';
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 13px Arial';
                ctx.fillText(_WHEEL_SEGMENTS[i].label, radius - 8, 5);
                ctx.restore();
            }
            // Center hub
            ctx.beginPath();
            ctx.arc(cx, cy, 18, 0, Math.PI * 2);
            ctx.fillStyle = '#ffd600';
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();

            wheelWrap.appendChild(canvas);

            // Pointer
            var ptr = document.createElement('div');
            ptr.style.cssText = 'position:absolute;top:-8px;left:50%;transform:translateX(-50%);'
                + 'width:0;height:0;border-left:10px solid transparent;border-right:10px solid transparent;'
                + 'border-top:24px solid #ffd600;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.5));';
            wheelWrap.appendChild(ptr);
            overlay.appendChild(wheelWrap);

            var spinBtn = document.createElement('button');
            spinBtn.textContent = 'SPIN THE WHEEL!';
            spinBtn.style.cssText = 'margin-top:22px;background:linear-gradient(135deg,#ffd600,#ff6d00);color:#000;'
                + 'border:none;border-radius:24px;padding:10px 28px;font-size:1rem;font-weight:900;'
                + 'cursor:pointer;letter-spacing:0.06em;box-shadow:0 0 16px rgba(255,214,0,0.6);';

            spinBtn.onclick = function() {
                spinBtn.disabled = true;
                spinBtn.style.opacity = '0.5';
                if (typeof playSound === 'function') playSound('wheel_spin');
                var winIdx = Math.floor(Math.random() * segCount);
                var fullSpins = 5 + Math.floor(Math.random() * 3);
                var targetDeg = fullSpins * 360 + (360 - (winIdx * (360 / segCount))) - (360 / segCount / 2);
                canvas.style.transition = 'transform 3s cubic-bezier(0.17,0.67,0.12,1)';
                canvas.style.transform = 'rotate(' + targetDeg + 'deg)';
                setTimeout(function() {
                    var seg = _WHEEL_SEGMENTS[winIdx];
                    var prize;
                    if (seg.type === 'cash' || seg.type === 'jackpot') {
                        prize = seg.value * currentBet;
                        balance += prize;
                        updateBalance();
                        saveBalance();
                    }
                    var resultEl = document.createElement('div');
                    resultEl.textContent = seg.type === 'spins'
                        ? '\uD83C\uDF89 ' + seg.value + ' FREE SPINS!'
                        : '\uD83C\uDF89 ' + seg.label + ' WIN! +$' + (prize || 0).toLocaleString();
                    resultEl.style.cssText = 'color:#ffd600;font-size:1.3rem;font-weight:900;margin-top:16px;'
                        + 'text-shadow:0 0 14px #ffd600;animation:wheelPrizeIn 0.4s cubic-bezier(0.34,1.56,0.64,1) both;';
                    overlay.appendChild(resultEl);

                    var closeBtn = document.createElement('button');
                    closeBtn.textContent = 'COLLECT';
                    closeBtn.style.cssText = 'margin-top:14px;background:#ffd600;color:#000;border:none;'
                        + 'border-radius:20px;padding:8px 24px;font-size:0.9rem;font-weight:900;cursor:pointer;';
                    closeBtn.onclick = function() {
                        var ov = document.getElementById('prizeWheelOverlay');
                        if (ov) ov.parentNode.removeChild(ov);
                        if (seg.type === 'spins' && typeof triggerFreeSpins === 'function') {
                            triggerFreeSpins(game, seg.value);
                        }
                        if (typeof onDone === 'function') onDone(seg);
                    };
                    overlay.appendChild(closeBtn);
                }, 3200);
            };
            overlay.appendChild(spinBtn);

            // CSS for prize pop
            if (!document.getElementById('_wheelCss')) {
                var st = document.createElement('style');
                st.id = '_wheelCss';
                st.textContent = '@keyframes wheelPrizeIn { 0%{transform:scale(0);opacity:0} 100%{transform:scale(1);opacity:1} }';
                document.head.appendChild(st);
            }

            document.body.appendChild(overlay);
        }

        function triggerPrizeWheel(game) {
            if (document.getElementById('prizeWheelOverlay')) return;
            _buildWheelOverlay(game, null);
        }

        // Patch: prize_wheel games show wheel overlay when scatter dispatch fires
        // (dispatch in win-logic.js calls triggerPrizeWheel directly)
        (function() {
            if (typeof openSlot === 'function') {
                var _origOpenSlot_pw = openSlot;
                openSlot = function(game) {
                    // Clean up any stale wheel overlay
                    var ov = document.getElementById('prizeWheelOverlay');
                    if (ov) ov.parentNode.removeChild(ov);
                    _origOpenSlot_pw(game);
                };
            }
        })();
```

---

## Task 4: Colossal Symbols Engine in `js/ui-slot.js`

Append after Task 3 block:

```js
        // ═══════════════════════════════════════════════════════════
        // COLOSSAL SYMBOLS — bonusType: 'colossal'
        // Before each spin, there is a 25% chance a 2×2 colossal block
        // of one symbol appears at a random valid grid position.
        // The block overrides those 4 cells visually with a large tile.
        // ═══════════════════════════════════════════════════════════

        window._colossalActive = null; // { col, row, sym }

        function resetColossal() {
            window._colossalActive = null;
            _clearColossalVisual();
        }

        function _clearColossalVisual() {
            var el = document.getElementById('colossalBlock');
            if (el) el.parentNode && el.parentNode.removeChild(el);
        }

        function _trySpawnColossal(game) {
            window._colossalActive = null;
            if (Math.random() > 0.25) return; // 25% chance
            var cols = (game && game.gridCols) || 5;
            var rows = (game && game.gridRows) || 3;
            if (cols < 2 || rows < 2) return;
            var col = Math.floor(Math.random() * (cols - 1));
            var row = Math.floor(Math.random() * (rows - 1));
            // Pick a non-scatter, non-wild symbol
            var candidates = (game.symbols || []).filter(function(s) {
                return s !== game.scatterSymbol && !isWild(s, game);
            });
            if (candidates.length === 0) return;
            var sym = candidates[Math.floor(Math.random() * candidates.length)];
            window._colossalActive = { col: col, row: row, sym: sym };
        }

        function _applyColossalToGrid(result, game) {
            if (!window._colossalActive || !result || !result.grid) return result;
            var pos = window._colossalActive;
            result = Object.assign({}, result);
            result.grid = result.grid.slice();
            for (var dc = 0; dc < 2; dc++) {
                for (var dr = 0; dr < 2; dr++) {
                    var c = pos.col + dc, r = pos.row + dr;
                    if (result.grid[c]) {
                        result.grid[c] = result.grid[c].slice();
                        result.grid[c][r] = pos.sym;
                    }
                }
            }
            return result;
        }

        function _renderColossalBlock(game) {
            _clearColossalVisual();
            if (!window._colossalActive) return;
            var pos = window._colossalActive;
            var anchor = document.getElementById('reel_' + pos.col + '_' + pos.row);
            if (!anchor) return;
            var rect = anchor.getBoundingClientRect();
            var cellH = rect.height, cellW = rect.width;
            var block = document.createElement('div');
            block.id = 'colossalBlock';
            block.style.cssText = 'position:fixed;left:' + rect.left + 'px;top:' + rect.top + 'px;'
                + 'width:' + (cellW * 2) + 'px;height:' + (cellH * 2) + 'px;'
                + 'z-index:200;display:flex;align-items:center;justify-content:center;'
                + 'border:3px solid #ffd600;border-radius:8px;background:rgba(0,0,0,0.15);'
                + 'box-shadow:0 0 20px rgba(255,214,0,0.5);font-size:3.5rem;'
                + 'animation:colossalIn 0.3s cubic-bezier(0.34,1.56,0.64,1) both;pointer-events:none;';
            // sym is internal game config — safe to render // nosec
            block.innerHTML = renderSymbol(pos.sym);
            document.body.appendChild(block);
            if (typeof playSound === 'function') playSound('colossal_land');
        }

        (function() {
            if (document.getElementById('_colossalCss')) return;
            var st = document.createElement('style');
            st.id = '_colossalCss';
            st.textContent = '@keyframes colossalIn { 0%{transform:scale(0.5);opacity:0} 100%{transform:scale(1);opacity:1} }';
            document.head.appendChild(st);
        })();

        (function() {
            var _origDSWR_col = displayServerWinResult;
            displayServerWinResult = function(result, game) {
                if (game && game.bonusType === 'colossal') {
                    _trySpawnColossal(game);
                    var applied = _applyColossalToGrid(result, game);
                    _origDSWR_col(applied, game);
                    setTimeout(function() { _renderColossalBlock(game); }, 40);
                    return;
                }
                _origDSWR_col(result, game);
            };
        })();

        (function() {
            if (typeof openSlot === 'function') {
                var _origOpenSlot_col = openSlot;
                openSlot = function(game) {
                    if (game && game.bonusType === 'colossal') resetColossal();
                    _origOpenSlot_col(game);
                };
            }
        })();
```

---

## Task 5: Symbol Collection Engine in `js/ui-slot.js`

Append after Task 4 block:

```js
        // ═══════════════════════════════════════════════════════════
        // SYMBOL COLLECTION — bonusType: 'symbol_collect'
        // During free spins, collect the game's scatterSymbol to advance
        // a 5-step multiplier track: 1× → 2× → 3× → 5× → 10×.
        // Progress bar shows collection count toward next tier.
        // ═══════════════════════════════════════════════════════════

        var _COLLECT_THRESHOLDS = [0, 3, 6, 10, 15]; // items needed per tier
        var _COLLECT_MULTS       = [1, 2, 3,  5, 10];
        window._collectCount = window._collectCount || 0;
        window._collectTier  = window._collectTier  || 0;

        function resetCollect() {
            window._collectCount = 0;
            window._collectTier  = 0;
            _updateCollectDisplay();
        }

        function _currentCollectMult() {
            return _COLLECT_MULTS[Math.min(window._collectTier || 0, _COLLECT_MULTS.length - 1)];
        }

        function _ensureCollectDisplay() {
            if (document.getElementById('collectDisplay')) return;
            var wrap = document.createElement('div');
            wrap.id = 'collectDisplay';
            wrap.style.cssText = 'display:none;position:fixed;top:90px;left:14px;z-index:1500;'
                + 'background:rgba(0,0,0,0.78);border:1.5px solid #69f0ae;border-radius:12px;'
                + 'padding:6px 12px;min-width:120px;pointer-events:none;';
            wrap.innerHTML = '<div id="collectLabel" style="font-size:0.72rem;color:#69f0ae;font-weight:700;letter-spacing:0.04em;margin-bottom:3px;"></div>'
                + '<div id="collectBar" style="height:5px;background:rgba(255,255,255,0.15);border-radius:3px;overflow:hidden;">'
                + '<div id="collectBarFill" style="height:100%;background:#69f0ae;border-radius:3px;transition:width 0.3s;width:0%;"></div></div>';
            document.body.appendChild(wrap);
        }

        function _updateCollectDisplay() {
            _ensureCollectDisplay();
            var wrap = document.getElementById('collectDisplay');
            if (!wrap) return;
            if (!freeSpinsActive) { wrap.style.display = 'none'; return; }
            wrap.style.display = 'block';
            var tier = Math.min(window._collectTier || 0, _COLLECT_MULTS.length - 1);
            var mult = _COLLECT_MULTS[tier];
            var label = document.getElementById('collectLabel');
            if (label) label.textContent = '\u2605 COLLECT ' + mult + 'x — ' + (window._collectCount || 0) + ' pts';
            var nextThresh = tier < _COLLECT_THRESHOLDS.length - 1 ? _COLLECT_THRESHOLDS[tier + 1] : _COLLECT_THRESHOLDS[_COLLECT_THRESHOLDS.length - 1];
            var prev = _COLLECT_THRESHOLDS[tier] || 0;
            var pct = nextThresh > prev ? Math.min(100, ((window._collectCount - prev) / (nextThresh - prev)) * 100) : 100;
            var fill = document.getElementById('collectBarFill');
            if (fill) fill.style.width = pct + '%';
        }

        function _countCollectSymbols(result, game) {
            if (!result || !result.grid) return 0;
            var count = 0;
            result.grid.forEach(function(col) {
                if (!col) return;
                col.forEach(function(sym) {
                    if (sym === game.scatterSymbol || isWild(sym, game)) count++;
                });
            });
            return count;
        }

        (function() {
            var _origDSWR_sc = displayServerWinResult;
            displayServerWinResult = function(result, game) {
                if (game && game.bonusType === 'symbol_collect' && freeSpinsActive) {
                    _ensureCollectDisplay();
                    var collected = _countCollectSymbols(result, game);
                    if (collected > 0) {
                        window._collectCount = (window._collectCount || 0) + collected;
                        if (typeof playSound === 'function') playSound('collect_tick');
                        // Check tier advance
                        var tier = window._collectTier || 0;
                        while (tier < _COLLECT_THRESHOLDS.length - 1
                               && window._collectCount >= _COLLECT_THRESHOLDS[tier + 1]) {
                            tier++;
                            showBonusEffect(_COLLECT_MULTS[tier] + 'x COLLECT BONUS!', '#69f0ae');
                        }
                        window._collectTier = tier;
                    }
                    var mult = _currentCollectMult();
                    if (mult > 1 && result && result.winAmount > 0) {
                        var extra = result.winAmount * (mult - 1);
                        balance += extra;
                        updateBalance();
                        saveBalance();
                        var patched = Object.assign({}, result, { winAmount: result.winAmount * mult });
                        _origDSWR_sc(patched, game);
                    } else {
                        _origDSWR_sc(result, game);
                    }
                    _updateCollectDisplay();
                    return;
                }
                if (game && game.bonusType === 'symbol_collect' && !freeSpinsActive) {
                    var el = document.getElementById('collectDisplay');
                    if (el) el.style.display = 'none';
                }
                _origDSWR_sc(result, game);
            };
        })();

        (function() {
            if (typeof openSlot === 'function') {
                var _origOpenSlot_sc = openSlot;
                openSlot = function(game) {
                    if (game && game.bonusType === 'symbol_collect') resetCollect();
                    _origOpenSlot_sc(game);
                };
            }
        })();
```

---

## Task 6: Wire Scatter Dispatch in `js/win-logic.js`

Find the `respin` dispatch block and add `prize_wheel` dispatch AFTER it, BEFORE `else if (scatterCount >= fullScatterThreshold)`:

```js
                } else if (game.bonusType === 'prize_wheel') {
                    if (typeof triggerPrizeWheel === 'function') {
                        playSound('freespin');
                        message = `PRIZE WHEEL! +$${scatterWin.toLocaleString()}!`;
                        triggerPrizeWheel(game);
                    }
```

Note: `colossal` and `symbol_collect` use standard free-spin trigger — no special dispatch.

---

## Task 7: Add 6 New Games

### 7a — `shared/game-definitions.js`

Replace the closing `];` with 6 new games + new `];`:

```js
    // prize_wheel games
    { id: 'fortune_bazaar', name: 'Fortune Bazaar', provider: 'ArcadeForge', tag: 'HOT', tagClass: 'tag-hot', thumbnail: 'assets/thumbnails/fortune_bazaar.png', bgGradient: 'linear-gradient(135deg, #1a0a00 0%, #e65100 100%)',
      symbols: ['s1_market_lamp','s2_spice_jar','s3_silk_bolt','s4_golden_urn','s5_fortune_wheel','wild_genie'],
      reelBg: 'linear-gradient(180deg, #0d0500 0%, #060200 100%)', accentColor: '#ff6d00',
      gridCols: 5, gridRows: 3, template: 'standard', winType: 'payline',
      wildSymbol: 'wild_genie', scatterSymbol: 's5_fortune_wheel',
      bonusType: 'prize_wheel', freeSpinsCount: 10, freeSpinsRetrigger: false,
      bonusDesc: 'Fortune Bazaar: 5×3 — Scatter the fortune wheel to spin for cash multipliers or free spin prizes!',
      payouts: { triple: 80, double: 8, wildTriple: 120, scatterPay: 3 }, minBet: 0.20, maxBet: 2500, hot: true, jackpot: 0 },

    { id: 'celestial_bazaar', name: 'Celestial Bazaar', provider: 'VaultX', tag: 'NEW', tagClass: 'tag-new', thumbnail: 'assets/thumbnails/celestial_bazaar.png', bgGradient: 'linear-gradient(135deg, #0a000f 0%, #4a148c 100%)',
      symbols: ['s1_moon_pearl','s2_star_vial','s3_cosmic_gem','s4_eclipse_coin','s5_astral_wheel','wild_constellation'],
      reelBg: 'linear-gradient(180deg, #060009 0%, #030005 100%)', accentColor: '#ce93d8',
      gridCols: 5, gridRows: 3, template: 'standard', winType: 'payline',
      wildSymbol: 'wild_constellation', scatterSymbol: 's5_astral_wheel',
      bonusType: 'prize_wheel', freeSpinsCount: 8, freeSpinsRetrigger: false,
      bonusDesc: 'Celestial Bazaar: 5×3 — Astral scatter spins the celestial prize wheel! Cash, spins or jackpot await!',
      payouts: { triple: 85, double: 9, wildTriple: 128, scatterPay: 3 }, minBet: 0.20, maxBet: 3000, hot: false, jackpot: 0 },

    // colossal games
    { id: 'titan_forge', name: 'Titan Forge', provider: 'IronReel Games', tag: 'POPULAR', tagClass: 'tag-popular', thumbnail: 'assets/thumbnails/titan_forge.png', bgGradient: 'linear-gradient(135deg, #0f0f0f 0%, #37474f 100%)',
      symbols: ['s1_iron_ingot','s2_forge_hammer','s3_lava_crystal','s4_titan_helm','s5_colossal_anvil','wild_molten'],
      reelBg: 'linear-gradient(180deg, #090909 0%, #040404 100%)', accentColor: '#ff8f00',
      gridCols: 5, gridRows: 3, template: 'standard', winType: 'payline',
      wildSymbol: 'wild_molten', scatterSymbol: 's5_colossal_anvil',
      bonusType: 'colossal', freeSpinsCount: 10, freeSpinsRetrigger: true,
      bonusDesc: 'Titan Forge: 5×3 — Giant 2×2 colossal symbols crash onto the reels for massive forge wins!',
      payouts: { triple: 90, double: 9, wildTriple: 135, scatterPay: 3 }, minBet: 0.20, maxBet: 4000, hot: false, jackpot: 0 },

    { id: 'mammoth_riches', name: 'Mammoth Riches', provider: 'GoldenEdge Gaming', tag: 'NEW', tagClass: 'tag-new', thumbnail: 'assets/thumbnails/mammoth_riches.png', bgGradient: 'linear-gradient(135deg, #0d0700 0%, #5d4037 100%)',
      symbols: ['s1_ice_flint','s2_cave_paint','s3_tusk_shard','s4_woolly_hide','s5_mammoth_boss','wild_ice_age'],
      reelBg: 'linear-gradient(180deg, #080400 0%, #040200 100%)', accentColor: '#bcaaa4',
      gridCols: 5, gridRows: 3, template: 'standard', winType: 'payline',
      wildSymbol: 'wild_ice_age', scatterSymbol: 's5_mammoth_boss',
      bonusType: 'colossal', freeSpinsCount: 10, freeSpinsRetrigger: true,
      bonusDesc: 'Mammoth Riches: 5×3 — Massive 2×2 mammoth symbols stomp across the reels for prehistoric wins!',
      payouts: { triple: 85, double: 8, wildTriple: 125, scatterPay: 3 }, minBet: 0.20, maxBet: 3000, hot: false, jackpot: 0 },

    // symbol_collect games
    { id: 'koi_ascension', name: 'Koi Ascension', provider: 'Orient Reels', tag: 'HOT', tagClass: 'tag-hot', thumbnail: 'assets/thumbnails/koi_ascension.png', bgGradient: 'linear-gradient(135deg, #001a0a 0%, #00897b 100%)',
      symbols: ['s1_lotus_petal','s2_water_lily','s3_jade_koi','s4_golden_koi','s5_dragon_koi','wild_ascendant'],
      reelBg: 'linear-gradient(180deg, #000d05 0%, #000602 100%)', accentColor: '#69f0ae',
      gridCols: 5, gridRows: 3, template: 'standard', winType: 'payline',
      wildSymbol: 'wild_ascendant', scatterSymbol: 's5_dragon_koi',
      bonusType: 'symbol_collect', freeSpinsCount: 15, freeSpinsRetrigger: true,
      bonusDesc: 'Koi Ascension: 5×3 — Collect dragon koi during free spins to ascend the 10× multiplier track!',
      payouts: { triple: 80, double: 8, wildTriple: 120, scatterPay: 3 }, minBet: 0.20, maxBet: 2500, hot: true, jackpot: 0 },

    { id: 'pharaoh_collect', name: 'Pharaoh Collect', provider: 'VaultX', tag: 'NEW', tagClass: 'tag-new', thumbnail: 'assets/thumbnails/pharaoh_collect.png', bgGradient: 'linear-gradient(135deg, #0d0800 0%, #827717 100%)',
      symbols: ['s1_papyrus','s2_canopic_jar','s3_eye_of_ra','s4_golden_sphinx','s5_pharaoh_sceptre','wild_anubis'],
      reelBg: 'linear-gradient(180deg, #080500 0%, #040200 100%)', accentColor: '#ffd600',
      gridCols: 5, gridRows: 3, template: 'standard', winType: 'payline',
      wildSymbol: 'wild_anubis', scatterSymbol: 's5_pharaoh_sceptre',
      bonusType: 'symbol_collect', freeSpinsCount: 12, freeSpinsRetrigger: true,
      bonusDesc: 'Pharaoh Collect: 5×3 — Gather sceptres during free spins to unlock the pharaoh 10× multiplier!',
      payouts: { triple: 85, double: 9, wildTriple: 128, scatterPay: 3 }, minBet: 0.20, maxBet: 3000, hot: false, jackpot: 0 }
];
```

### 7b — `shared/chrome-styles.js`

Add after the `primal_vault` entry in `GAME_CHROME_STYLES`:
```js
    fortune_bazaar:    'arcadeforge',  // ArcadeForge — bazaar warm
    celestial_bazaar:  'vaultx',       // VaultX — cosmic purple
    titan_forge:       'ironreel',     // IronReel Games — dark metal
    mammoth_riches:    'ironreel',     // GoldenEdge Gaming — primal earth
    koi_ascension:     'celestial',    // Orient Reels — jade water
    pharaoh_collect:   'vaultx',       // VaultX — gold ancient
```

---

## Task 8: Final QA + Commit + Push to master

```bash
npm run qa:regression
```
Expected: all PASS.

```bash
git add js/ui-slot.js js/win-logic.js sound-manager.js shared/game-definitions.js shared/chrome-styles.js docs/plans/2026-02-25-prize-wheel-colossal-collect.md
git commit -m "feat: prize wheel, colossal symbols, symbol collection, 6 new games

New mechanics:
- Prize Wheel (bonusType: 'prize_wheel'): scatter triggers full-screen overlay
  wheel with 8 prize segments (cash 5-200x bet or free spins 5-15)
- Colossal Symbols (bonusType: 'colossal'): 25% chance per spin for a 2x2
  giant symbol block to land with deep thud animation
- Symbol Collection (bonusType: 'symbol_collect'): collect scatter/wilds
  during free spins to climb a 1x->2x->3x->5x->10x multiplier track

Sound events:
- wheel_spin (8-tick accelerating rattle)
- colossal_land (deep bass thud)
- collect_tick (ascending pip on collection)

6 new games (116 total):
- prize_wheel: fortune_bazaar, celestial_bazaar
- colossal: titan_forge, mammoth_riches
- symbol_collect: koi_ascension, pharaoh_collect

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
git push origin master
```

---

## Execution Notes

- Tasks 2 (`sound-manager.js`), 6 (`win-logic.js`), 7 (`game-definitions.js` + `chrome-styles.js`) are independent — run as parallel agents.
- Tasks 3, 4, 5 all append to `js/ui-slot.js` — **serialize** them in order.
- Task 8 (QA + commit) must run last.
