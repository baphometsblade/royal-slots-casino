// Append Multiplier Wilds, Increasing Mult, and Buy Feature engines to ui-slot.js
const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, '..', 'js', 'ui-slot.js');
const current = fs.readFileSync(target, 'utf8');

const block = `

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
`;

fs.appendFileSync(target, block, 'utf8');

// Bracket balance check
const updated = fs.readFileSync(target, 'utf8');
let opens = 0, closes = 0;
for (const ch of updated) {
    if (ch === '{') opens++;
    else if (ch === '}') closes++;
}
const delta = opens - closes;
const lines = updated.split('\n').length;
console.log(`Lines: ${lines}, { opens: ${opens}, } closes: ${closes}, delta: ${delta}`);
if (delta !== 0) { console.error('BRACKET MISMATCH — check the appended block'); process.exit(1); }
console.log('OK — bracket balance zero');
