# Multiplier Wilds + Increasing Multiplier + Buy Feature Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Multiplier Wilds (wilds carry 2x–10x multipliers on paylines), Increasing Multiplier free spins (multiplier rises each spin), a Buy Feature button (100× bet shortcut to trigger free spins), 6 new games, 3 new sound events — then commit to master.

**Architecture:** Same global-scope JS pattern. New engines appended to `js/ui-slot.js` bottom. Scatter dispatch extended in `js/win-logic.js`. Buy Feature UI injected via `_ensureBuyFeatureButton()` called from `openSlot`. Sound cases added to `sound-manager.js`. Games appended to `shared/game-definitions.js`; chrome-style aliases to `shared/chrome-styles.js`.

**Tech Stack:** Vanilla JS, Web Audio API, CSS animations, Playwright QA

---

## Task 1: QA Regression Baseline

```bash
npm run qa:regression
```
Expected: all PASS.

---

## Task 2: Add 3 New Sound Events to `sound-manager.js`

Insert before the closing `}` of the switch (after the `streak_hit` case), around line 450:

```js
                case 'wild_mult':
                    // Multiplier wild activates — quick pop + ascending sine
                    {
                        var osc = audioContext.createOscillator();
                        var gain = audioContext.createGain();
                        osc.type = 'sine';
                        osc.connect(gain);
                        gain.connect(audioContext.destination);
                        osc.frequency.setValueAtTime(440, now);
                        osc.frequency.exponentialRampToValueAtTime(1760, now + 0.10);
                        gain.gain.setValueAtTime(0.20 * soundVolume, now);
                        gain.gain.exponentialRampToValueAtTime(0.001 * soundVolume, now + 0.18);
                        osc.start(now);
                        osc.stop(now + 0.20);
                    }
                    break;

                case 'mult_rise':
                    // Increasing multiplier ticks up — short bright ping
                    {
                        var osc = audioContext.createOscillator();
                        var gain = audioContext.createGain();
                        osc.type = 'triangle';
                        osc.connect(gain);
                        gain.connect(audioContext.destination);
                        osc.frequency.setValueAtTime(660, now);
                        osc.frequency.exponentialRampToValueAtTime(990, now + 0.08);
                        gain.gain.setValueAtTime(0.15 * soundVolume, now);
                        gain.gain.exponentialRampToValueAtTime(0.001 * soundVolume, now + 0.12);
                        osc.start(now);
                        osc.stop(now + 0.13);
                    }
                    break;

                case 'buy_feature':
                    // Buy Feature purchased — cash register chime
                    {
                        [523, 784, 1047, 1568].forEach(function(freq, i) {
                            var osc = audioContext.createOscillator();
                            var gain = audioContext.createGain();
                            osc.type = 'sine';
                            osc.connect(gain);
                            gain.connect(audioContext.destination);
                            osc.frequency.value = freq;
                            gain.gain.setValueAtTime(0.16 * soundVolume, now + i * 0.06);
                            gain.gain.exponentialRampToValueAtTime(0.001 * soundVolume, now + 0.25 + i * 0.06);
                            osc.start(now + i * 0.06);
                            osc.stop(now + 0.26 + i * 0.06);
                        });
                    }
                    break;
```

**Verify:** `node -e "require('./sound-manager.js')" 2>&1 | head -3`

---

## Task 3: Multiplier Wilds Engine in `js/ui-slot.js`

Append to end of file:

```js
        // ═══════════════════════════════════════════════════════════
        // MULTIPLIER WILDS — bonusType: 'multiplier_wilds'
        // Each wild on the grid carries a random multiplier (2-10x).
        // When a wild contributes to a payline win, that line's payout
        // is multiplied by the wild's value.
        // ═══════════════════════════════════════════════════════════

        window._multWildValues = window._multWildValues || {};

        function resetMultWilds() {
            window._multWildValues = {};
        }

        var _MULT_WILD_OPTIONS = [2, 2, 2, 3, 3, 5, 5, 8, 10];

        function _assignMultWilds(result, game) {
            window._multWildValues = {};
            if (!result || !result.grid) return;
            var cols = result.grid.length;
            for (var c = 0; c < cols; c++) {
                var col = result.grid[c];
                if (!col) continue;
                for (var r = 0; r < col.length; r++) {
                    if (isWild(col[r], game)) {
                        var key = c + '_' + r;
                        window._multWildValues[key] = _MULT_WILD_OPTIONS[
                            Math.floor(Math.random() * _MULT_WILD_OPTIONS.length)
                        ];
                    }
                }
            }
        }

        function _renderMultWildBadges() {
            Object.keys(window._multWildValues || {}).forEach(function(key) {
                var parts = key.split('_');
                var el = document.getElementById('reel_' + parts[0] + '_' + parts[1]);
                if (!el) return;
                var mult = window._multWildValues[key];
                var badge = el.querySelector('.mw-badge');
                if (!badge) {
                    badge = document.createElement('span');
                    badge.className = 'mw-badge';
                    badge.style.cssText = 'position:absolute;top:2px;right:3px;z-index:10;'
                        + 'background:#ff6d00;color:#fff;font-size:0.65rem;font-weight:900;'
                        + 'border-radius:8px;padding:1px 5px;pointer-events:none;'
                        + 'line-height:1.4;box-shadow:0 0 6px #ff6d00;';
                    el.style.position = 'relative';
                    el.appendChild(badge);
                }
                badge.textContent = mult + 'x';
                if (typeof playSound === 'function') playSound('wild_mult');
            });
        }

        (function() {
            if (document.getElementById('_multWildCss')) return;
            var st = document.createElement('style');
            st.id = '_multWildCss';
            st.textContent = '.mw-badge { animation: mwPop 0.25s cubic-bezier(0.34,1.56,0.64,1) both; }'
                + '@keyframes mwPop { 0%{transform:scale(0);opacity:0} 100%{transform:scale(1);opacity:1} }';
            document.head.appendChild(st);
        })();

        // Patch: assign mult values, then boost win if wilds were on winning lines
        (function() {
            var _origDSWR_mw = displayServerWinResult;
            displayServerWinResult = function(result, game) {
                if (game && game.bonusType === 'multiplier_wilds') {
                    _assignMultWilds(result, game);
                    // Calculate boost: max multiplier of any wild that appeared
                    var vals = Object.values(window._multWildValues || {});
                    var boost = vals.length > 0 ? Math.max.apply(null, vals) : 1;
                    if (boost > 1 && result && result.winAmount > 0) {
                        var extra = result.winAmount * (boost - 1);
                        balance += extra;
                        updateBalance();
                        saveBalance();
                        var patched = Object.assign({}, result, { winAmount: result.winAmount * boost });
                        _origDSWR_mw(patched, game);
                        showBonusEffect(boost + 'x WILD MULTIPLIER!', '#ff6d00');
                    } else {
                        _origDSWR_mw(result, game);
                    }
                    setTimeout(_renderMultWildBadges, 50);
                    return;
                }
                _origDSWR_mw(result, game);
            };
        })();

        (function() {
            if (typeof openSlot === 'function') {
                var _origOpenSlot_mw = openSlot;
                openSlot = function(game) {
                    if (game && game.bonusType === 'multiplier_wilds') resetMultWilds();
                    _origOpenSlot_mw(game);
                };
            }
        })();
```

---

## Task 4: Increasing Multiplier Engine in `js/ui-slot.js`

Append after Task 3 block:

```js
        // ═══════════════════════════════════════════════════════════
        // INCREASING MULTIPLIER — bonusType: 'increasing_mult'
        // During free spins, the global win multiplier increments
        // after each spin: 1x → 2x → 3x → 5x → 8x → 10x (capped).
        // ═══════════════════════════════════════════════════════════

        var _INCR_MULT_STEPS = [1, 2, 3, 5, 8, 10];
        window._incrMultStep = window._incrMultStep || 0;

        function resetIncrMult() {
            window._incrMultStep = 0;
            _updateIncrMultDisplay();
        }

        function _currentIncrMult() {
            var step = Math.min(window._incrMultStep || 0, _INCR_MULT_STEPS.length - 1);
            return _INCR_MULT_STEPS[step];
        }

        function _updateIncrMultDisplay() {
            var el = document.getElementById('incrMultDisplay');
            if (!el) return;
            var mult = _currentIncrMult();
            if (!freeSpinsActive || mult < 2) { el.style.display = 'none'; return; }
            el.textContent = '\u26A1 ' + mult + 'x';
            el.style.display = 'inline-block';
            var c = mult >= 8 ? '#ff5252' : mult >= 5 ? '#ff9800' : '#c6ff00';
            el.style.color = c;
            el.style.borderColor = c;
        }

        function _ensureIncrMultDisplay() {
            if (document.getElementById('incrMultDisplay')) return;
            var el = document.createElement('span');
            el.id = 'incrMultDisplay';
            el.style.cssText = 'display:none;position:fixed;top:130px;right:14px;z-index:1500;'
                + 'background:rgba(0,0,0,0.75);border:1.5px solid #c6ff00;border-radius:20px;'
                + 'padding:4px 12px;font-size:0.82rem;font-weight:700;color:#c6ff00;'
                + 'letter-spacing:0.04em;pointer-events:none;';
            document.body.appendChild(el);
        }

        (function() {
            var _origDSWR_im = displayServerWinResult;
            displayServerWinResult = function(result, game) {
                if (game && game.bonusType === 'increasing_mult' && freeSpinsActive) {
                    _ensureIncrMultDisplay();
                    var mult = _currentIncrMult();
                    if (mult > 1 && result && result.winAmount > 0) {
                        var extra = result.winAmount * (mult - 1);
                        balance += extra;
                        updateBalance();
                        saveBalance();
                        var patched = Object.assign({}, result, { winAmount: result.winAmount * mult });
                        _origDSWR_im(patched, game);
                        showBonusEffect(mult + 'x MULTIPLIER!', mult >= 8 ? '#ff5252' : '#ff9800');
                    } else {
                        _origDSWR_im(result, game);
                    }
                    // Advance multiplier for next spin
                    if ((window._incrMultStep || 0) < _INCR_MULT_STEPS.length - 1) {
                        window._incrMultStep = (window._incrMultStep || 0) + 1;
                        if (typeof playSound === 'function') playSound('mult_rise');
                    }
                    _updateIncrMultDisplay();
                    return;
                }
                _origDSWR_im(result, game);
            };
        })();

        (function() {
            if (typeof openSlot === 'function') {
                var _origOpenSlot_im = openSlot;
                openSlot = function(game) {
                    if (game && game.bonusType === 'increasing_mult') resetIncrMult();
                    _origOpenSlot_im(game);
                };
            }
        })();
```

---

## Task 5: Buy Feature Button in `js/ui-slot.js`

Append after Task 4 block:

```js
        // ═══════════════════════════════════════════════════════════
        // BUY FEATURE — available on any game with freeSpinsCount > 0
        // and game.buyFeature !== false. Costs game.buyMultiplier × bet
        // (default 100×). Instantly triggers free spins.
        // ═══════════════════════════════════════════════════════════

        function _ensureBuyFeatureButton(game) {
            var existing = document.getElementById('buyFeatureBtn');
            if (existing) { existing.parentNode && existing.parentNode.removeChild(existing); }
            if (!game || !game.freeSpinsCount || game.buyFeature === false) return;
            var costMult = game.buyMultiplier || 100;
            var btn = document.createElement('button');
            btn.id = 'buyFeatureBtn';
            btn.textContent = '\uD83D\uDCB0 BUY BONUS ' + costMult + '\xD7';
            btn.title = 'Buy Feature: costs ' + costMult + '\xD7 current bet to trigger free spins instantly';
            btn.style.cssText = 'position:fixed;bottom:110px;right:14px;z-index:1500;'
                + 'background:linear-gradient(135deg,#ff6d00,#ff8f00);color:#fff;'
                + 'border:none;border-radius:20px;padding:6px 14px;font-size:0.78rem;'
                + 'font-weight:800;letter-spacing:0.05em;cursor:pointer;'
                + 'box-shadow:0 0 12px rgba(255,109,0,0.55);transition:transform 0.1s;';
            btn.onmouseover = function() { btn.style.transform = 'scale(1.06)'; };
            btn.onmouseout  = function() { btn.style.transform = 'scale(1)'; };
            btn.onclick = function() {
                if (spinning || freeSpinsActive) return;
                var cost = currentBet * costMult;
                if (balance < cost) {
                    showMessage('Insufficient balance for Buy Feature (' + costMult + '\xD7 bet = $' + cost.toLocaleString() + ')', 'lose');
                    return;
                }
                balance -= cost;
                updateBalance();
                saveBalance();
                if (typeof playSound === 'function') playSound('buy_feature');
                showBonusEffect('BONUS FEATURE PURCHASED!', '#ff6d00');
                setTimeout(function() {
                    if (game.bonusType === 'chamber_spins' && typeof triggerChamberSpins === 'function') {
                        triggerChamberSpins(game);
                    } else if (game.bonusType === 'sticky_wilds' && typeof triggerStickyWildsFreeSpins === 'function') {
                        triggerStickyWildsFreeSpins(game, 0);
                    } else if (game.bonusType === 'walking_wilds' && typeof triggerWalkingWildsFreeSpins === 'function') {
                        triggerWalkingWildsFreeSpins(game, 0);
                    } else {
                        triggerFreeSpins(game, game.freeSpinsCount);
                    }
                }, 600);
            };
            document.body.appendChild(btn);
        }

        // Hook into openSlot to add/remove button
        (function() {
            if (typeof openSlot === 'function') {
                var _origOpenSlot_bf = openSlot;
                openSlot = function(game) {
                    _origOpenSlot_bf(game);
                    setTimeout(function() { _ensureBuyFeatureButton(game); }, 300);
                };
            }
        })();

        // Remove button when slot closes
        (function() {
            var _origCloseSl = typeof closeSlot === 'function' ? closeSlot : null;
            if (_origCloseSl) {
                closeSlot = function() {
                    var b = document.getElementById('buyFeatureBtn');
                    if (b) b.parentNode && b.parentNode.removeChild(b);
                    _origCloseSl.apply(this, arguments);
                };
            }
        })();
```

---

## Task 6: Wire Scatter Dispatch in `js/win-logic.js`

Find the `walking_wilds` dispatch block (added in previous sprint) and add `increasing_mult` dispatch right before `else if (scatterCount >= fullScatterThreshold)`:

Find:
```js
                } else if (game.bonusType === 'walking_wilds') {
                    ...
                } else if (scatterCount >= fullScatterThreshold) {
```

After the walking_wilds closing `}`, add:
```js
                } else if (game.bonusType === 'increasing_mult') {
                    if (typeof triggerFreeSpins === 'function') {
                        playSound('freespin');
                        message = `INCREASING MULTIPLIER! ${game.freeSpinsCount} FREE SPINS! +$${scatterWin.toLocaleString()}!`;
                        if (typeof resetIncrMult === 'function') resetIncrMult();
                        triggerFreeSpins(game, game.freeSpinsCount);
                    }
```

Note: `multiplier_wilds` uses standard free-spin trigger (no special dispatch needed — the multiplier logic fires on every spin result automatically).

---

## Task 7: Add 6 New Games

### 7a — `shared/game-definitions.js`

Replace the closing `];` with 6 new games + new `];`:

```js
    // ═99. multiplier_wilds games
    { id: 'golden_jaguar', name: 'Golden Jaguar', provider: 'GoldenEdge Gaming', tag: 'HOT', tagClass: 'tag-hot', thumbnail: 'assets/thumbnails/golden_jaguar.png', bgGradient: 'linear-gradient(135deg, #4e342e 0%, #f57f17 100%)',
      symbols: ['s1_jungle_leaf','s2_tribal_mask','s3_snake_idol','s4_jaguar_paw','s5_golden_idol','wild_jaguar'],
      reelBg: 'linear-gradient(180deg, #120800 0%, #0a0400 100%)', accentColor: '#ff6d00',
      gridCols: 5, gridRows: 3, template: 'standard', winType: 'payline',
      wildSymbol: 'wild_jaguar', scatterSymbol: 's5_golden_idol',
      bonusType: 'multiplier_wilds', freeSpinsCount: 10, freeSpinsRetrigger: true,
      bonusDesc: 'Golden Jaguar: 5×3 — Wild Jaguars carry 2–10× multipliers! Stack multiplier wilds for epic wins!',
      payouts: { triple: 85, double: 9, wildTriple: 130, scatterPay: 3 }, minBet: 0.20, maxBet: 3000, hot: true, jackpot: 0 },

    { id: 'lightning_pearl', name: 'Lightning Pearl', provider: 'NovaSpin Studios', tag: 'NEW', tagClass: 'tag-new', thumbnail: 'assets/thumbnails/lightning_pearl.png', bgGradient: 'linear-gradient(135deg, #0a0a2a 0%, #00bcd4 100%)',
      symbols: ['s1_coral','s2_sea_horse','s3_manta_ray','s4_trident','s5_pearl_kraken','wild_lightning'],
      reelBg: 'linear-gradient(180deg, #030312 0%, #010109 100%)', accentColor: '#00e5ff',
      gridCols: 5, gridRows: 3, template: 'standard', winType: 'payline',
      wildSymbol: 'wild_lightning', scatterSymbol: 's5_pearl_kraken',
      bonusType: 'multiplier_wilds', freeSpinsCount: 12, freeSpinsRetrigger: true,
      bonusDesc: 'Lightning Pearl: 5×3 — Electric wilds multiply wins 2–10×! Ocean-deep bonus rounds!',
      payouts: { triple: 80, double: 8, wildTriple: 120, scatterPay: 3 }, minBet: 0.20, maxBet: 2500, hot: false, jackpot: 0 },

    { id: 'samurai_blade', name: 'Samurai Blade', provider: 'Orient Reels', tag: 'POPULAR', tagClass: 'tag-popular', thumbnail: 'assets/thumbnails/samurai_blade.png', bgGradient: 'linear-gradient(135deg, #1a0a0a 0%, #b71c1c 100%)',
      symbols: ['s1_cherry_blossom','s2_katana','s3_shuriken','s4_oni_mask','s5_shogun','wild_blade'],
      reelBg: 'linear-gradient(180deg, #120002 0%, #080001 100%)', accentColor: '#ff1744',
      gridCols: 5, gridRows: 3, template: 'standard', winType: 'payline',
      wildSymbol: 'wild_blade', scatterSymbol: 's5_shogun',
      bonusType: 'multiplier_wilds', freeSpinsCount: 10, freeSpinsRetrigger: true,
      bonusDesc: 'Samurai Blade: 5×3 — Blade wilds slash wins with multipliers! Shogun bonus unlocks max 10×!',
      payouts: { triple: 90, double: 9, wildTriple: 135, scatterPay: 3 }, minBet: 0.20, maxBet: 4000, hot: false, jackpot: 0 },

    // ═102. increasing_mult games
    { id: 'comet_rush', name: 'Comet Rush', provider: 'NovaSpin Studios', tag: 'NEW', tagClass: 'tag-new', thumbnail: 'assets/thumbnails/comet_rush.png', bgGradient: 'linear-gradient(135deg, #0a0015 0%, #7c4dff 100%)',
      symbols: ['s1_asteroid','s2_plasma_ring','s3_nebula','s4_comet_tail','s5_supernova','wild_comet'],
      reelBg: 'linear-gradient(180deg, #04000f 0%, #020008 100%)', accentColor: '#7c4dff',
      gridCols: 5, gridRows: 3, template: 'standard', winType: 'payline',
      wildSymbol: 'wild_comet', scatterSymbol: 's5_supernova',
      bonusType: 'increasing_mult', freeSpinsCount: 10, freeSpinsRetrigger: true,
      bonusDesc: 'Comet Rush: 5×3 — Multiplier rockets from 1× to 10× across free spins! Retrigger resets the climb!',
      payouts: { triple: 85, double: 9, wildTriple: 125, scatterPay: 3 }, minBet: 0.20, maxBet: 3000, hot: true, jackpot: 0 },

    { id: 'wolf_rise', name: 'Wolf Rise', provider: 'SolsticeFX', tag: 'HOT', tagClass: 'tag-hot', thumbnail: 'assets/thumbnails/wolf_rise.png', bgGradient: 'linear-gradient(135deg, #1a1a2e 0%, #546e7a 100%)',
      symbols: ['s1_paw_print','s2_moon_shard','s3_howling_wolf','s4_pack_alpha','s5_spirit_wolf','wild_moonbeam'],
      reelBg: 'linear-gradient(180deg, #08080f 0%, #040408 100%)', accentColor: '#90caf9',
      gridCols: 5, gridRows: 3, template: 'standard', winType: 'payline',
      wildSymbol: 'wild_moonbeam', scatterSymbol: 's5_spirit_wolf',
      bonusType: 'increasing_mult', freeSpinsCount: 12, freeSpinsRetrigger: true,
      bonusDesc: 'Wolf Rise: 5×3 — Multiplier grows with the pack! 10× max on the final free spins!',
      payouts: { triple: 80, double: 8, wildTriple: 120, scatterPay: 3 }, minBet: 0.20, maxBet: 2500, hot: true, jackpot: 0 },

    { id: 'aztec_ascent', name: 'Aztec Ascent', provider: 'GoldenEdge Gaming', tag: 'NEW', tagClass: 'tag-new', thumbnail: 'assets/thumbnails/aztec_ascent.png', bgGradient: 'linear-gradient(135deg, #1b5e20 0%, #f57f17 100%)',
      symbols: ['s1_cacao_bean','s2_serpent_stone','s3_sun_disc','s4_feathered_crown','s5_quetzal','wild_sunstone'],
      reelBg: 'linear-gradient(180deg, #060f02 0%, #030700 100%)', accentColor: '#ffd600',
      gridCols: 5, gridRows: 3, template: 'standard', winType: 'payline',
      wildSymbol: 'wild_sunstone', scatterSymbol: 's5_quetzal',
      bonusType: 'increasing_mult', freeSpinsCount: 10, freeSpinsRetrigger: true,
      bonusDesc: 'Aztec Ascent: 5×3 — Climb the temple! Each free spin ascends the multiplier toward 10×!',
      payouts: { triple: 85, double: 9, wildTriple: 128, scatterPay: 3 }, minBet: 0.20, maxBet: 3000, hot: false, jackpot: 0 }
];
```

### 7b — `shared/chrome-styles.js`

Add after the `iron_stampede` entry in `GAME_CHROME_STYLES`:
```js
    golden_jaguar:     'ironreel',    // GoldenEdge Gaming — jungle gold/wildlife
    lightning_pearl:   'novaspin',    // NovaSpin Studios — electric ocean
    samurai_blade:     'celestial',   // Orient Reels — eastern mythic
    comet_rush:        'novaspin',    // NovaSpin Studios — space sci-fi
    wolf_rise:         'novaspin',    // SolsticeFX — dark nature electric
    aztec_ascent:      'ironreel',    // GoldenEdge Gaming — jungle ancient gold
```

---

## Task 8: Final QA + Commit + Push to master

```bash
npm run qa:regression
```
Expected: all PASS.

```bash
git add js/ui-slot.js js/win-logic.js sound-manager.js shared/game-definitions.js shared/chrome-styles.js docs/plans/2026-02-25-multiplier-wilds-buy-feature.md
git commit -m "feat: multiplier wilds, increasing mult free spins, buy feature, 6 new games

New mechanics:
- Multiplier Wilds (bonusType: 'multiplier_wilds'): each wild carries a random
  2–10× multiplier badge; when wilds contribute to a win the highest multiplier
  is applied to the payout
- Increasing Multiplier (bonusType: 'increasing_mult'): free-spin multiplier
  climbs from 1× → 2× → 3× → 5× → 8× → 10× each spin, with display badge
- Buy Feature button: fixed UI button on any game with freeSpinsCount > 0,
  costs 100× bet (configurable via buyMultiplier) to instantly trigger bonus

Sound events:
- wild_mult (ascending pop when mult wild activates)
- mult_rise (bright ping as multiplier increments)
- buy_feature (4-note cash-register chime on purchase)

6 new games (104 total):
- multiplier_wilds: golden_jaguar, lightning_pearl, samurai_blade
- increasing_mult: comet_rush, wolf_rise, aztec_ascent

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
git push origin master
```

---

## Execution Notes

- Tasks 2 (`sound-manager.js`), 6 (`win-logic.js`), 7 (`game-definitions.js` + `chrome-styles.js`) are independent of each other and of Tasks 3/4/5 — run as parallel agents.
- Tasks 3, 4, 5 all append to `js/ui-slot.js` — **serialize** them in order.
- Task 8 (QA + commit) must run last.
