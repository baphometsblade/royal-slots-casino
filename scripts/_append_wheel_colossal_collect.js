// Append Prize Wheel, Colossal Symbols, Symbol Collection engines to ui-slot.js
const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, '..', 'js', 'ui-slot.js');

const block = `

        // ═══════════════════════════════════════════════════════════
        // PRIZE WHEEL — bonusType: 'prize_wheel'
        // Scatter triggers a full-screen overlay wheel with 8 segments.
        // Prizes: 5–50× bet, 5–15 free spins, or jackpot 200× bet.
        // ═══════════════════════════════════════════════════════════

        var _WHEEL_SEGMENTS = [
            { label: '5x', type: 'cash', value: 5 },
            { label: '8 SPINS', type: 'spins', value: 8 },
            { label: '10x', type: 'cash', value: 10 },
            { label: '5 SPINS', type: 'spins', value: 5 },
            { label: '25x', type: 'cash', value: 25 },
            { label: '10 SPINS', type: 'spins', value: 10 },
            { label: '50x', type: 'cash', value: 50 },
            { label: '200x \uD83C\uDFB0', type: 'jackpot', value: 200 }
        ];
        var _WHEEL_COLORS = ['#ff6d00','#1565c0','#2e7d32','#6a1b9a','#c62828','#00695c','#f9a825','#37474f'];

        function _buildWheelOverlay(game, onDone) {
            var overlay = document.createElement('div');
            overlay.id = 'prizeWheelOverlay';
            overlay.style.cssText = 'position:fixed;inset:0;z-index:9000;background:rgba(0,0,0,0.88);'
                + 'display:flex;flex-direction:column;align-items:center;justify-content:center;';

            var title = document.createElement('div');
            title.textContent = '\uD83C\uDF61 PRIZE WHEEL!';
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
            ctx.beginPath();
            ctx.arc(cx, cy, 18, 0, Math.PI * 2);
            ctx.fillStyle = '#ffd600';
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();

            wheelWrap.appendChild(canvas);

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

        (function() {
            if (typeof openSlot === 'function') {
                var _origOpenSlot_pw = openSlot;
                openSlot = function(game) {
                    var ov = document.getElementById('prizeWheelOverlay');
                    if (ov) ov.parentNode.removeChild(ov);
                    _origOpenSlot_pw(game);
                };
            }
        })();

        // ═══════════════════════════════════════════════════════════
        // COLOSSAL SYMBOLS — bonusType: 'colossal'
        // 25% chance per spin: a 2×2 colossal block lands at a random
        // valid grid position. Overrides those 4 cells visually.
        // ═══════════════════════════════════════════════════════════

        window._colossalActive = null;

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
            if (Math.random() > 0.25) return;
            var cols = (game && game.gridCols) || 5;
            var rows = (game && game.gridRows) || 3;
            if (cols < 2 || rows < 2) return;
            var col = Math.floor(Math.random() * (cols - 1));
            var row = Math.floor(Math.random() * (rows - 1));
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

        // ═══════════════════════════════════════════════════════════
        // SYMBOL COLLECTION — bonusType: 'symbol_collect'
        // During free spins, collect the game's scatterSymbol/wilds to
        // advance a 5-step multiplier track: 1× → 2× → 3× → 5× → 10×.
        // ═══════════════════════════════════════════════════════════

        var _COLLECT_THRESHOLDS = [0, 3, 6, 10, 15];
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
            if (label) label.textContent = '\u2605 COLLECT ' + mult + 'x \u2014 ' + (window._collectCount || 0) + ' pts';
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
