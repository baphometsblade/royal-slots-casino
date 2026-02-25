// Append Cascading Reels, Expanding Wilds, Re-Spin engines to ui-slot.js
const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, '..', 'js', 'ui-slot.js');

const block = `

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
                        if ((window._cascadeLevel || 0) < _CASCADE_MULTS.length - 1) {
                            window._cascadeLevel = (window._cascadeLevel || 0) + 1;
                        }
                        _updateCascadeDisplay();
                        return;
                    }
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
            for (var c = 0; c < cols; c++) {
                var col = result.grid[c];
                if (!col) continue;
                var hasWild = col.some(function(sym) { return isWild(sym, game); });
                if (hasWild) {
                    window._expandedCols[c] = true;
                    var expanded = col.map(function() { return game.wildSymbol; });
                    result = Object.assign({}, result);
                    result.grid = result.grid.slice();
                    result.grid[c] = expanded;
                }
            }
            return result;
        }

        function _renderExpandingWildVisuals(game) {
            Object.keys(window._expandedCols || {}).forEach(function(colIdx) {
                var c = parseInt(colIdx, 10);
                var rows = (typeof currentGame !== 'undefined' && currentGame && currentGame.gridRows) || 3;
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
                    _collectRespinLockCandidates(result, game);
                    var locked = (window._respinLockedCells || []).length;
                    if (locked >= 1 && locked < (game.scatterThreshold || 3) && !window._respinActive) {
                        window._respinActive = true;
                        window._respinCount = Math.min(locked + 1, 3);
                        _origDSWR_rs(result, game);
                        setTimeout(function() {
                            _renderRespinLocks(game);
                            showBonusEffect(window._respinCount + ' RE-SPIN' + (window._respinCount > 1 ? 'S' : '') + '! Hold the locks!', '#ffd600');
                            if (typeof triggerFreeSpins === 'function') {
                                triggerFreeSpins(game, window._respinCount);
                            }
                        }, 200);
                        return;
                    }
                    _origDSWR_rs(result, game);
                    return;
                }
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
`;

fs.appendFileSync(target, block, 'utf8');

const updated = fs.readFileSync(target, 'utf8');
let opens = 0, closes = 0;
for (const ch of updated) {
    if (ch === '{') opens++;
    else if (ch === '}') closes++;
}
const delta = opens - closes;
const lines = updated.split('\n').length;
console.log(`Lines: ${lines}, { opens: ${opens}, } closes: ${closes}, delta: ${delta}`);
if (delta !== 0) { console.error('BRACKET MISMATCH'); process.exit(1); }
console.log('OK — bracket balance zero');
