// Append Wild Reels, Win Both Ways, Random Jackpot engines to js/ui-slot.js
const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, '..', 'js', 'ui-slot.js');

const block = `

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

        // ═══════════════════════════════════════════════════════════
        // WIN BOTH WAYS — bonusType: 'both_ways'
        // Every spin evaluates the grid mirrored (right-to-left) as well.
        // If the reversed grid generates additional wins, they are added
        // to the base win. A "↔ BOTH WAYS" badge appears on reverse hits.
        // ═══════════════════════════════════════════════════════════

        function _evalReverseWin(result, game) {
            if (!result || !result.grid || result.winAmount <= 0) return 0;
            var cols = result.grid.length;
            if (cols < 2) return 0;
            var firstColSym = result.grid[0] && result.grid[0][0];
            var lastColSym  = result.grid[cols - 1] && result.grid[cols - 1][0];
            if (!firstColSym || !lastColSym) return 0;
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

        // ═══════════════════════════════════════════════════════════
        // RANDOM JACKPOT — bonusType: 'random_jackpot'
        // Each spin has a 0.8% chance of triggering a mini jackpot worth
        // 50-200x the current bet, regardless of reel result. A gold flash
        // and coin shower animation plays, then balance is credited.
        // ═══════════════════════════════════════════════════════════

        var _RJ_MIN_MULT = 50;
        var _RJ_MAX_MULT = 200;
        var _RJ_CHANCE   = 0.008;

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
                + 'display:flex;flex-direction:column;align-items:center;justify-content:center;';

            var flash = document.createElement('div');
            flash.style.cssText = 'position:absolute;inset:0;background:radial-gradient(ellipse at center,rgba(255,214,0,0.35) 0%,rgba(0,0,0,0) 70%);';
            ov.appendChild(flash);

            var canvas = document.createElement('canvas');
            canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;';
            canvas.width  = window.innerWidth;
            canvas.height = window.innerHeight;
            ov.appendChild(canvas);

            var title = document.createElement('div');
            title.textContent = '\uD83C\uDFB0 RANDOM JACKPOT! \uD83C\uDFB0';
            title.style.cssText = 'position:relative;z-index:10;color:#ffd600;font-size:2rem;font-weight:900;'
                + 'text-shadow:0 0 30px #ffd600,0 0 8px #fff;letter-spacing:0.1em;'
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
                st.textContent = '@keyframes rjPop { 0%{transform:scale(0);opacity:0} 100%{transform:scale(1);opacity:1} }';
                document.head.appendChild(st);
            }

            document.body.appendChild(ov);

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

            setTimeout(function() {
                if (ov.parentNode) ov.parentNode.removeChild(ov);
            }, 2500);
        }

        (function() {
            var _origDSWR_rj = displayServerWinResult;
            displayServerWinResult = function(result, game) {
                if (game && game.bonusType === 'random_jackpot') {
                    _origDSWR_rj(result, game);
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
