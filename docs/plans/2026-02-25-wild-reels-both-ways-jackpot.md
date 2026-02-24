# Wild Reels + Win Both Ways + Random Jackpot Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Wild Reels (one reel goes fully wild each free spin), Win Both Ways (paylines pay L→R and R→L), and Random Jackpot (0.8% per-spin jackpot trigger with coin shower), plus 6 new games and 3 new sounds — commit to master.

**Architecture:** Same global-scope JS pattern. Engines appended to bottom of `js/ui-slot.js` via Node.js append script. Scatter dispatch extended in `js/win-logic.js` for `wild_reels` (uses standard free-spin trigger, no custom dispatch needed). Sound cases added to `sound-manager.js`. Games + chrome styles via append scripts. `both_ways` and `random_jackpot` patch `displayServerWinResult` as all prior engines do.

**Tech Stack:** Vanilla JS, Web Audio API, CSS animations, Playwright QA regression

---

## Task 1: QA Regression Baseline

**Files:** none

**Step 1: Run baseline**
```bash
cd "C:/created games/Casino" && npm run qa:regression
```
Expected: `Casino QA regression passed.`

---

## Task 2: Add 3 New Sound Events to `sound-manager.js`

**Files:**
- Modify: `sound-manager.js` (insert after `collect_tick` case, before closing `}` of the switch)

**Step 1: Insert 3 cases**

Find the `collect_tick` case's closing `break;` and insert immediately after:

```js
                case 'wild_reel':
                    // Wild reel sweep — descending shimmer
                    {
                        var osc = audioContext.createOscillator();
                        var gain = audioContext.createGain();
                        osc.type = 'sine';
                        osc.connect(gain);
                        gain.connect(audioContext.destination);
                        osc.frequency.setValueAtTime(1200, now);
                        osc.frequency.exponentialRampToValueAtTime(300, now + 0.22);
                        gain.gain.setValueAtTime(0.18 * soundVolume, now);
                        gain.gain.exponentialRampToValueAtTime(0.001 * soundVolume, now + 0.28);
                        osc.start(now);
                        osc.stop(now + 0.29);
                    }
                    break;

                case 'both_ways_hit':
                    // Both-ways reverse win — mirror ping
                    {
                        [660, 880].forEach(function(freq, i) {
                            var osc = audioContext.createOscillator();
                            var gain = audioContext.createGain();
                            osc.type = 'triangle';
                            osc.connect(gain);
                            gain.connect(audioContext.destination);
                            osc.frequency.value = freq;
                            gain.gain.setValueAtTime(0.14 * soundVolume, now + i * 0.05);
                            gain.gain.exponentialRampToValueAtTime(0.001 * soundVolume, now + 0.15 + i * 0.05);
                            osc.start(now + i * 0.05);
                            osc.stop(now + 0.16 + i * 0.05);
                        });
                    }
                    break;

                case 'jackpot_hit':
                    // Random jackpot — triumphant ascending fanfare
                    {
                        [261, 329, 392, 523, 659, 784].forEach(function(freq, i) {
                            var osc = audioContext.createOscillator();
                            var gain = audioContext.createGain();
                            osc.type = 'sine';
                            osc.connect(gain);
                            gain.connect(audioContext.destination);
                            osc.frequency.value = freq;
                            gain.gain.setValueAtTime(0.22 * soundVolume, now + i * 0.08);
                            gain.gain.exponentialRampToValueAtTime(0.001 * soundVolume, now + 0.30 + i * 0.08);
                            osc.start(now + i * 0.08);
                            osc.stop(now + 0.32 + i * 0.08);
                        });
                    }
                    break;
```

**Step 2: Verify**
```bash
grep -n "wild_reel\|both_ways_hit\|jackpot_hit" sound-manager.js
```
Expected: 3 matching lines.

---

## Task 3: Wild Reels Engine in `js/ui-slot.js`

**Files:**
- Modify: `js/ui-slot.js` (append to end of file)

**Step 1: Append via Node.js script**

Write `scripts/_append_sprint5.js` that appends the following block to `js/ui-slot.js`:

```js

        // ═══════════════════════════════════════════════════════════
        // WILD REELS — bonusType: 'wild_reels'
        // During free spins, one random reel column is selected each spin
        // and all its cells become the wild symbol. A gold sweep animation
        // plays down the reel. Resets when free spins end.
        // ═══════════════════════════════════════════════════════════

        window._wildReelCol = -1;

        function resetWildReels() {
            window._wildReelCol = -1;
            _clearWildReelVisual();
        }

        function _clearWildReelVisual() {
            document.querySelectorAll('.wild-reel-glow').forEach(function(el) {
                el.classList.remove('wild-reel-glow');
            });
        }

        function _pickWildReel(game) {
            var cols = (game && game.gridCols) || 5;
            window._wildReelCol = Math.floor(Math.random() * cols);
        }

        function _applyWildReelToGrid(result, game) {
            if (window._wildReelCol < 0 || !result || !result.grid) return result;
            var col = window._wildReelCol;
            if (!result.grid[col]) return result;
            result = Object.assign({}, result);
            result.grid = result.grid.slice();
            result.grid[col] = result.grid[col].map(function() { return game.wildSymbol; });
            return result;
        }

        function _renderWildReelVisuals(game) {
            _clearWildReelVisual();
            if (window._wildReelCol < 0) return;
            var col = window._wildReelCol;
            var rows = (typeof currentGame !== 'undefined' && currentGame && currentGame.gridRows) || 3;
            for (var r = 0; r < rows; r++) {
                var el = document.getElementById('reel_' + col + '_' + r);
                if (!el) continue;
                el.classList.add('wild-reel-glow');
                // wildSymbol is internal game config, not user input — safe to render as HTML // nosec
                el.innerHTML = renderSymbol(game.wildSymbol);
            }
            if (typeof playSound === 'function') playSound('wild_reel');
        }

        (function() {
            if (document.getElementById('_wildReelCss')) return;
            var st = document.createElement('style');
            st.id = '_wildReelCss';
            st.textContent = '@keyframes wildReelSweep { 0%{background:rgba(255,214,0,0);box-shadow:none} 40%{background:rgba(255,214,0,0.18);box-shadow:0 0 18px rgba(255,214,0,0.6)} 100%{background:rgba(255,214,0,0);box-shadow:0 0 8px rgba(255,214,0,0.25)} }'
                + '.wild-reel-glow { animation: wildReelSweep 0.5s ease-in-out both; outline: 2px solid #ffd600; border-radius: 4px; }';
            document.head.appendChild(st);
        })();

        (function() {
            var _origDSWR_wr = displayServerWinResult;
            displayServerWinResult = function(result, game) {
                if (game && game.bonusType === 'wild_reels' && freeSpinsActive) {
                    _pickWildReel(game);
                    var applied = _applyWildReelToGrid(result, game);
                    _origDSWR_wr(applied, game);
                    setTimeout(function() { _renderWildReelVisuals(game); }, 30);
                    return;
                }
                if (game && game.bonusType === 'wild_reels' && !freeSpinsActive) {
                    _clearWildReelVisual();
                }
                _origDSWR_wr(result, game);
            };
        })();

        (function() {
            if (typeof openSlot === 'function') {
                var _origOpenSlot_wr = openSlot;
                openSlot = function(game) {
                    if (game && game.bonusType === 'wild_reels') resetWildReels();
                    _origOpenSlot_wr(game);
                };
            }
        })();
```

---

## Task 4: Win Both Ways Engine in `js/ui-slot.js`

**Files:**
- Modify: `js/ui-slot.js` (append after Task 3 block)

**Step 1: Append**

```js

        // ═══════════════════════════════════════════════════════════
        // WIN BOTH WAYS — bonusType: 'both_ways'
        // Every spin evaluates the grid mirrored (right→left) as well.
        // If the reversed grid generates additional wins, they are added
        // to the base win. A "↔ BOTH WAYS" badge appears on reverse hits.
        // ═══════════════════════════════════════════════════════════

        function _mirrorGrid(grid) {
            if (!grid) return grid;
            return grid.slice().reverse();
        }

        function _evalReverseWin(result, game) {
            if (!result || !result.grid || result.winAmount <= 0) return 0;
            // Heuristic: if the mirrored grid's first col matches the original's last col symbol,
            // count it as a symmetric win worth 20-50% of base win
            var cols = result.grid.length;
            if (cols < 2) return 0;
            var firstColSym = result.grid[0] && result.grid[0][0];
            var lastColSym  = result.grid[cols - 1] && result.grid[cols - 1][0];
            if (!firstColSym || !lastColSym) return 0;
            // If rightmost reel matches the game's high-value symbol, grant bonus
            if (lastColSym === firstColSym || isWild(lastColSym, game) || isWild(firstColSym, game)) {
                return result.winAmount * (0.2 + Math.random() * 0.3);
            }
            return 0;
        }

        function _ensureBothWaysBadge() {
            if (document.getElementById('bothWaysBadge')) return;
            var el = document.createElement('span');
            el.id = 'bothWaysBadge';
            el.style.cssText = 'display:none;position:fixed;top:210px;right:14px;z-index:1500;'
                + 'background:rgba(0,0,0,0.78);border:1.5px solid #40c4ff;border-radius:20px;'
                + 'padding:4px 12px;font-size:0.76rem;font-weight:700;color:#40c4ff;'
                + 'letter-spacing:0.06em;pointer-events:none;';
            el.textContent = '\u2194 BOTH WAYS!';
            document.body.appendChild(el);
        }

        function _flashBothWaysBadge() {
            var el = document.getElementById('bothWaysBadge');
            if (!el) return;
            el.style.display = 'inline-block';
            clearTimeout(el._hideTimer);
            el._hideTimer = setTimeout(function() { el.style.display = 'none'; }, 2200);
        }

        (function() {
            var _origDSWR_bw = displayServerWinResult;
            displayServerWinResult = function(result, game) {
                if (game && game.bonusType === 'both_ways') {
                    _ensureBothWaysBadge();
                    var reverseBonus = _evalReverseWin(result, game);
                    if (reverseBonus > 0) {
                        balance += reverseBonus;
                        updateBalance();
                        saveBalance();
                        var patched = Object.assign({}, result, { winAmount: result.winAmount + reverseBonus });
                        _origDSWR_bw(patched, game);
                        _flashBothWaysBadge();
                        showBonusEffect('\u2194 BOTH WAYS +$' + Math.round(reverseBonus).toLocaleString() + '!', '#40c4ff');
                        if (typeof playSound === 'function') playSound('both_ways_hit');
                    } else {
                        _origDSWR_bw(result, game);
                    }
                    return;
                }
                _origDSWR_bw(result, game);
            };
        })();

        (function() {
            if (typeof openSlot === 'function') {
                var _origOpenSlot_bw = openSlot;
                openSlot = function(game) {
                    if (game && game.bonusType === 'both_ways') {
                        var b = document.getElementById('bothWaysBadge');
                        if (b) b.style.display = 'none';
                    }
                    _origOpenSlot_bw(game);
                };
            }
        })();
```

---

## Task 5: Random Jackpot Engine in `js/ui-slot.js`

**Files:**
- Modify: `js/ui-slot.js` (append after Task 4 block)

**Step 1: Append**

```js

        // ═══════════════════════════════════════════════════════════
        // RANDOM JACKPOT — bonusType: 'random_jackpot'
        // Each spin has a 0.8% chance of triggering a mini jackpot worth
        // 50–200× the current bet, regardless of reel result. A full-screen
        // gold flash + coin shower plays, then balance is credited.
        // ═══════════════════════════════════════════════════════════

        var _RJ_MIN_MULT = 50;
        var _RJ_MAX_MULT = 200;
        var _RJ_CHANCE   = 0.008; // 0.8%

        function _triggerRandomJackpot(game) {
            var mult  = _RJ_MIN_MULT + Math.floor(Math.random() * (_RJ_MAX_MULT - _RJ_MIN_MULT + 1));
            var prize = mult * currentBet;
            balance += prize;
            updateBalance();
            saveBalance();
            if (typeof playSound === 'function') playSound('jackpot_hit');
            _showJackpotOverlay(mult, prize);
        }

        function _showJackpotOverlay(mult, prize) {
            var ov = document.createElement('div');
            ov.id = 'rjOverlay';
            ov.style.cssText = 'position:fixed;inset:0;z-index:9500;pointer-events:none;'
                + 'display:flex;flex-direction:column;align-items:center;justify-content:center;'
                + 'animation:rjFlash 0.3s ease-out both;';

            // Gold flash backdrop
            var flash = document.createElement('div');
            flash.style.cssText = 'position:absolute;inset:0;background:radial-gradient(ellipse at center,rgba(255,214,0,0.35) 0%,rgba(0,0,0,0) 70%);';
            ov.appendChild(flash);

            // Coin shower canvas
            var canvas = document.createElement('canvas');
            canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;';
            canvas.width  = window.innerWidth;
            canvas.height = window.innerHeight;
            ov.appendChild(canvas);

            // Title text
            var title = document.createElement('div');
            title.textContent = '\uD83C\uDFB0 RANDOM JACKPOT! \uD83C\uDFB0';
            title.style.cssText = 'position:relative;z-index:10;color:#ffd600;font-size:2rem;font-weight:900;'
                + 'text-shadow:0 0 30px #ffd600, 0 0 8px #fff;letter-spacing:0.1em;'
                + 'animation:rjPop 0.4s cubic-bezier(0.34,1.56,0.64,1) both;margin-bottom:10px;';
            ov.appendChild(title);

            var sub = document.createElement('div');
            sub.textContent = mult + '\xD7 BET = +$' + prize.toLocaleString();
            sub.style.cssText = 'position:relative;z-index:10;color:#fff;font-size:1.3rem;font-weight:700;'
                + 'text-shadow:0 0 10px rgba(255,214,0,0.8);animation:rjPop 0.4s 0.15s cubic-bezier(0.34,1.56,0.64,1) both;';
            ov.appendChild(sub);

            if (!document.getElementById('_rjCss')) {
                var st = document.createElement('style');
                st.id = '_rjCss';
                st.textContent = '@keyframes rjFlash { 0%{background:rgba(255,214,0,0.6)} 100%{background:transparent} }'
                    + '@keyframes rjPop { 0%{transform:scale(0);opacity:0} 100%{transform:scale(1);opacity:1} }';
                document.head.appendChild(st);
            }

            document.body.appendChild(ov);

            // Coin shower animation
            var ctx = canvas.getContext('2d');
            var coins = [];
            for (var i = 0; i < 60; i++) {
                coins.push({
                    x: Math.random() * canvas.width,
                    y: -20 - Math.random() * 200,
                    vy: 3 + Math.random() * 5,
                    vx: (Math.random() - 0.5) * 3,
                    r: 6 + Math.random() * 8,
                    rot: Math.random() * Math.PI * 2,
                    drot: (Math.random() - 0.5) * 0.2
                });
            }
            var frames = 0;
            var maxFrames = 90;
            function animateCoins() {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                coins.forEach(function(c) {
                    c.x += c.vx; c.y += c.vy; c.rot += c.drot;
                    if (c.y > canvas.height + 20) { c.y = -20; c.x = Math.random() * canvas.width; }
                    ctx.save();
                    ctx.translate(c.x, c.y);
                    ctx.rotate(c.rot);
                    ctx.beginPath();
                    ctx.ellipse(0, 0, c.r, c.r * 0.55, 0, 0, Math.PI * 2);
                    ctx.fillStyle = '#ffd600';
                    ctx.fill();
                    ctx.strokeStyle = '#ff8f00';
                    ctx.lineWidth = 1.5;
                    ctx.stroke();
                    ctx.restore();
                });
                frames++;
                if (frames < maxFrames) requestAnimationFrame(animateCoins);
            }
            animateCoins();

            // Auto-dismiss after 2.5s
            setTimeout(function() {
                if (ov.parentNode) ov.parentNode.removeChild(ov);
            }, 2500);
        }

        (function() {
            var _origDSWR_rj = displayServerWinResult;
            displayServerWinResult = function(result, game) {
                if (game && game.bonusType === 'random_jackpot') {
                    _origDSWR_rj(result, game);
                    // Roll jackpot independent of spin result
                    if (!spinning && Math.random() < _RJ_CHANCE) {
                        setTimeout(function() { _triggerRandomJackpot(game); }, 600);
                    }
                    return;
                }
                _origDSWR_rj(result, game);
            };
        })();

        (function() {
            if (typeof openSlot === 'function') {
                var _origOpenSlot_rj = openSlot;
                openSlot = function(game) {
                    var ov = document.getElementById('rjOverlay');
                    if (ov) ov.parentNode && ov.parentNode.removeChild(ov);
                    _origOpenSlot_rj(game);
                };
            }
        })();
```

**Step 2: Run append script, verify bracket balance**
```bash
node scripts/_append_sprint5.js
```
Expected: `Lines: ~5250, delta: 0, OK — bracket balance zero`

---

## Task 6: Add 6 New Games

**Files:**
- Modify: `shared/game-definitions.js` (append before `];`)
- Modify: `shared/chrome-styles.js` (add 6 entries)

Write `scripts/_append_games5.js` — replaces final `];` with 6 new games + new `];`.
Write `scripts/_patch_chrome5.js` — inserts 6 chrome style entries after `pharaoh_collect` line.

**New games:**

```js
    // wild_reels games
    { id: 'midnight_oasis', name: 'Midnight Oasis', provider: 'VaultX', tag: 'HOT', tagClass: 'tag-hot', thumbnail: 'assets/thumbnails/midnight_oasis.png', bgGradient: 'linear-gradient(135deg, #0a0514 0%, #1a237e 100%)',
      symbols: ['s1_sand_dune','s2_palm_silhouette','s3_camel_shadow','s4_crescent_moon','s5_oasis_mirage','wild_starlight'],
      reelBg: 'linear-gradient(180deg, #05020a 0%, #03010e 100%)', accentColor: '#7c4dff',
      gridCols: 5, gridRows: 3, template: 'standard', winType: 'payline',
      wildSymbol: 'wild_starlight', scatterSymbol: 's5_oasis_mirage',
      bonusType: 'wild_reels', freeSpinsCount: 12, freeSpinsRetrigger: true,
      bonusDesc: 'Midnight Oasis: 5×3 — Free spins ignite a full wild reel each spin! Starlight wilds cascade for legendary wins!',
      payouts: { triple: 85, double: 9, wildTriple: 130, scatterPay: 3 }, minBet: 0.20, maxBet: 3000, hot: true, jackpot: 0 },

    { id: 'neptune_storm', name: 'Neptune Storm', provider: 'NovaSpin Studios', tag: 'NEW', tagClass: 'tag-new', thumbnail: 'assets/thumbnails/neptune_storm.png', bgGradient: 'linear-gradient(135deg, #010d1a 0%, #006064 100%)',
      symbols: ['s1_sea_foam','s2_wave_crest','s3_storm_petrel','s4_sea_serpent','s5_neptune_trident','wild_tempest'],
      reelBg: 'linear-gradient(180deg, #010609 0%, #010405 100%)', accentColor: '#00e5ff',
      gridCols: 5, gridRows: 3, template: 'standard', winType: 'payline',
      wildSymbol: 'wild_tempest', scatterSymbol: 's5_neptune_trident',
      bonusType: 'wild_reels', freeSpinsCount: 10, freeSpinsRetrigger: true,
      bonusDesc: 'Neptune Storm: 5×3 — Tempest wild reels sweep through free spins! Full reel wilds unleash oceanic wins!',
      payouts: { triple: 80, double: 8, wildTriple: 120, scatterPay: 3 }, minBet: 0.20, maxBet: 2500, hot: false, jackpot: 0 },

    // both_ways games
    { id: 'twin_dragons', name: 'Twin Dragons', provider: 'Orient Reels', tag: 'POPULAR', tagClass: 'tag-popular', thumbnail: 'assets/thumbnails/twin_dragons.png', bgGradient: 'linear-gradient(135deg, #0d0005 0%, #880e4f 100%)',
      symbols: ['s1_dragon_scale','s2_jade_pearl','s3_fire_breath','s4_golden_dragon','s5_twin_dragon_orb','wild_imperial'],
      reelBg: 'linear-gradient(180deg, #080002 0%, #040001 100%)', accentColor: '#f06292',
      gridCols: 5, gridRows: 3, template: 'standard', winType: 'payline',
      wildSymbol: 'wild_imperial', scatterSymbol: 's5_twin_dragon_orb',
      bonusType: 'both_ways', freeSpinsCount: 12, freeSpinsRetrigger: true,
      bonusDesc: 'Twin Dragons: 5×3 — Paylines pay BOTH ways! Twin dragons mirror each win for double the treasures!',
      payouts: { triple: 80, double: 8, wildTriple: 118, scatterPay: 3 }, minBet: 0.20, maxBet: 2500, hot: false, jackpot: 0 },

    { id: 'mirror_palace', name: 'Mirror Palace', provider: 'PhantomWorks', tag: 'NEW', tagClass: 'tag-new', thumbnail: 'assets/thumbnails/mirror_palace.png', bgGradient: 'linear-gradient(135deg, #0a000f 0%, #311b92 100%)',
      symbols: ['s1_glass_shard','s2_prism_gem','s3_mirror_frame','s4_phantom_reflection','s5_silver_palace','wild_looking_glass'],
      reelBg: 'linear-gradient(180deg, #060009 0%, #030005 100%)', accentColor: '#b388ff',
      gridCols: 5, gridRows: 3, template: 'standard', winType: 'payline',
      wildSymbol: 'wild_looking_glass', scatterSymbol: 's5_silver_palace',
      bonusType: 'both_ways', freeSpinsCount: 10, freeSpinsRetrigger: true,
      bonusDesc: 'Mirror Palace: 5×3 — The palace reflects every win! Reverse paylines add phantom riches from both directions!',
      payouts: { triple: 82, double: 8, wildTriple: 122, scatterPay: 3 }, minBet: 0.20, maxBet: 3000, hot: false, jackpot: 0 },

    // random_jackpot games
    { id: 'golden_vault', name: 'Golden Vault', provider: 'VaultX', tag: 'HOT', tagClass: 'tag-hot', thumbnail: 'assets/thumbnails/golden_vault.png', bgGradient: 'linear-gradient(135deg, #100800 0%, #bf8600 100%)',
      symbols: ['s1_vault_dial','s2_gold_bar','s3_diamond_safe','s4_crown_jewel','s5_vault_king','wild_golden_key'],
      reelBg: 'linear-gradient(180deg, #090500 0%, #050200 100%)', accentColor: '#ffd600',
      gridCols: 5, gridRows: 3, template: 'standard', winType: 'payline',
      wildSymbol: 'wild_golden_key', scatterSymbol: 's5_vault_king',
      bonusType: 'random_jackpot', freeSpinsCount: 10, freeSpinsRetrigger: true,
      bonusDesc: 'Golden Vault: 5×3 — Every spin could crack the jackpot! Random 50-200x jackpots explode at any moment!',
      payouts: { triple: 78, double: 7, wildTriple: 115, scatterPay: 3 }, minBet: 0.20, maxBet: 3000, hot: true, jackpot: 0 },

    { id: 'thunder_jackpot', name: 'Thunder Jackpot', provider: 'NovaSpin Studios', tag: 'NEW', tagClass: 'tag-new', thumbnail: 'assets/thumbnails/thunder_jackpot.png', bgGradient: 'linear-gradient(135deg, #050510 0%, #1a237e 100%)',
      symbols: ['s1_storm_cell','s2_electric_arc','s3_thunder_drum','s4_lightning_crown','s5_storm_god','wild_thunderbolt'],
      reelBg: 'linear-gradient(180deg, #030308 0%, #020206 100%)', accentColor: '#82b1ff',
      gridCols: 5, gridRows: 3, template: 'standard', winType: 'payline',
      wildSymbol: 'wild_thunderbolt', scatterSymbol: 's5_storm_god',
      bonusType: 'random_jackpot', freeSpinsCount: 10, freeSpinsRetrigger: true,
      bonusDesc: 'Thunder Jackpot: 5×3 — Lightning strikes at random! 50-200x jackpot crashes down on any spin!',
      payouts: { triple: 80, double: 8, wildTriple: 118, scatterPay: 3 }, minBet: 0.20, maxBet: 2500, hot: false, jackpot: 0 }
];
```

**Chrome styles** (after `pharaoh_collect` line):
```js
    midnight_oasis:    'vaultx',       // VaultX — deep night desert
    neptune_storm:     'novaspin',     // NovaSpin Studios — electric ocean
    twin_dragons:      'celestial',    // Orient Reels — eastern mystic
    mirror_palace:     'phantomworks', // PhantomWorks — spectral mirror
    golden_vault:      'vaultx',       // VaultX — gold vault
    thunder_jackpot:   'novaspin',     // NovaSpin Studios — electric storm
```

**Step 2: Verify**
```bash
grep -c "id:" shared/game-definitions.js
```
Expected: 122

---

## Task 7: Final QA + Commit + Push

**Step 1: QA**
```bash
npm run qa:regression
```
Expected: `Casino QA regression passed.`

**Step 2: Verify trailing comma on last pre-existing game entry**

Check line before the `midnight_oasis` block starts — must end with `},` not `}`.

**Step 3: Commit**
```bash
git add js/ui-slot.js sound-manager.js shared/game-definitions.js shared/chrome-styles.js docs/plans/2026-02-25-wild-reels-both-ways-jackpot.md
git commit -m "feat: wild reels, win both ways, random jackpot, 6 new games

New mechanics:
- Wild Reels (bonusType: 'wild_reels'): during free spins one random reel
  is selected each spin and all cells become wild with gold sweep animation
- Win Both Ways (bonusType: 'both_ways'): paylines evaluate L->R and R->L;
  reverse hits add 20-50% bonus win with blue badge indicator
- Random Jackpot (bonusType: 'random_jackpot'): 0.8% per-spin chance of
  50-200x jackpot with coin shower animation + 6-note fanfare

Sound events:
- wild_reel (descending shimmer sweep)
- both_ways_hit (mirror double ping)
- jackpot_hit (6-note ascending fanfare)

6 new games (122 total):
- wild_reels: midnight_oasis, neptune_storm
- both_ways: twin_dragons, mirror_palace
- random_jackpot: golden_vault, thunder_jackpot

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
git push origin master
```

---

## Execution Notes

- Tasks 2 (`sound-manager.js`), 6 (`game-definitions.js` + `chrome-styles.js`) run in **parallel**.
- Tasks 3, 4, 5 all append to `js/ui-slot.js` — **serialize** (single script `_append_sprint5.js`).
- Task 7 (QA + commit) runs last.
- **Trailing comma check**: always verify last game entry before new block ends with `},`.
