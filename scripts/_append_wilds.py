import sys

append_block = """

        // \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
        // WIN STREAK TRACKER
        // \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

        window._winStreak = window._winStreak || 0;
        window._winStreakBest = window._winStreakBest || 0;

        var _STREAK_MILESTONES = [
            { at: 3,  label: '3x STREAK',   color: '#cd7f32', cls: 'streak-bronze' },
            { at: 5,  label: '5x STREAK',   color: '#c0c0c0', cls: 'streak-silver' },
            { at: 10, label: '10x STREAK',  color: '#ffd700', cls: 'streak-gold'   },
            { at: 20, label: '20x STREAK',  color: '#e040fb', cls: 'streak-legend' }
        ];

        function resetWinStreak() {
            window._winStreak = 0;
            _updateStreakDisplay();
        }

        function _updateStreakDisplay() {
            var el = document.getElementById('winStreakBadge');
            if (!el) return;
            var streak = window._winStreak || 0;
            if (streak < 2) { el.style.display = 'none'; return; }
            var color = '#ffc107', cls = '';
            for (var i = 0; i < _STREAK_MILESTONES.length; i++) {
                if (streak >= _STREAK_MILESTONES[i].at) { color = _STREAK_MILESTONES[i].color; cls = _STREAK_MILESTONES[i].cls; }
            }
            el.textContent = '\\uD83D\\uDD25 ' + streak + '\\xD7 STREAK';
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

        (function() {
            var _origDSWR_streak = displayServerWinResult;
            displayServerWinResult = function(result, game) {
                _ensureStreakBadge();
                var won = result && result.winAmount > 0;
                if (won) {
                    window._winStreak = (window._winStreak || 0) + 1;
                    if (window._winStreak > (window._winStreakBest || 0)) window._winStreakBest = window._winStreak;
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

        (function() {
            if (typeof openSlot === 'function') {
                var _origOpenSlot_streak = openSlot;
                openSlot = function(game) {
                    resetWinStreak();
                    _origOpenSlot_streak(game);
                };
            }
        })();


        // \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
        // STICKY WILDS \u2014 bonusType: 'sticky_wilds'
        // \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

        window._stickyWildCells = window._stickyWildCells || [];

        function resetStickyWilds() {
            window._stickyWildCells = [];
            document.querySelectorAll('.reel-sticky-wild').forEach(function(el) {
                el.classList.remove('reel-sticky-wild');
            });
        }

        function triggerStickyWildsFreeSpins(game, scatterWin) {
            resetStickyWilds();
            if (typeof playSound === 'function') playSound('freespin');
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
            ].join('\\n');
            document.head.appendChild(st);
        })();

        (function() {
            var _origDSWR_sticky = displayServerWinResult;
            displayServerWinResult = function(result, game) {
                if (game && game.bonusType === 'sticky_wilds' && freeSpinsActive) {
                    var cells = window._stickyWildCells || [];
                    if (cells.length > 0 && result && result.grid) {
                        cells.forEach(function(pos) {
                            if (result.grid[pos.col]) result.grid[pos.col][pos.row] = game.wildSymbol;
                        });
                    }
                    _origDSWR_sticky(result, game);
                    _collectNewStickyWilds(result, game);
                    setTimeout(function() { _applyStickyWildVisuals(game); }, 50);
                    return;
                }
                _origDSWR_sticky(result, game);
            };
        })();

        (function() {
            if (typeof openSlot === 'function') {
                var _origOpenSlot_sticky = openSlot;
                openSlot = function(game) {
                    if (game && game.bonusType === 'sticky_wilds') resetStickyWilds();
                    _origOpenSlot_sticky(game);
                };
            }
        })();


        // \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
        // WALKING WILDS \u2014 bonusType: 'walking_wilds'
        // \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

        window._walkingWildCells = window._walkingWildCells || [];

        function resetWalkingWilds() {
            window._walkingWildCells = [];
            document.querySelectorAll('.reel-walking-wild').forEach(function(el) {
                el.classList.remove('reel-walking-wild');
            });
        }

        function triggerWalkingWildsFreeSpins(game, scatterWin) {
            resetWalkingWilds();
            if (typeof playSound === 'function') playSound('freespin');
            showBonusEffect('WALKING WILDS BONUS!', game.accentColor || '#00bcd4');
            triggerFreeSpins(game, game.freeSpinsCount);
        }

        function _stepWalkingWilds() {
            var next = [];
            var walked = false;
            window._walkingWildCells.forEach(function(pos) {
                if (pos.col > 0) { next.push({ col: pos.col - 1, row: pos.row }); walked = true; }
            });
            window._walkingWildCells = next;
            if (walked && typeof playSound === 'function') playSound('wild_walk');
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
                        if (!already) cells.push({ col: c, row: r });
                    }
                }
            }
        }

        function _applyWalkingWildVisuals(game) {
            document.querySelectorAll('.reel-walking-wild').forEach(function(el) {
                el.classList.remove('reel-walking-wild');
            });
            (window._walkingWildCells || []).forEach(function(pos) {
                var el = document.getElementById('reel_' + pos.col + '_' + pos.row);
                if (el) {
                    el.innerHTML = renderSymbol(game.wildSymbol);
                    el.classList.add('reel-walking-wild', 'reel-wild-glow');
                }
            });
        }

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
            ].join('\\n');
            document.head.appendChild(st);
        })();

        (function() {
            var _origDSWR_walk = displayServerWinResult;
            displayServerWinResult = function(result, game) {
                if (game && game.bonusType === 'walking_wilds' && freeSpinsActive) {
                    _stepWalkingWilds();
                    var cells = window._walkingWildCells;
                    if (cells.length > 0 && result && result.grid) {
                        cells.forEach(function(pos) {
                            if (result.grid[pos.col]) result.grid[pos.col][pos.row] = game.wildSymbol;
                        });
                    }
                    _origDSWR_walk(result, game);
                    _collectNewWalkingWilds(result, game);
                    setTimeout(function() { _applyWalkingWildVisuals(game); }, 50);
                    return;
                }
                _origDSWR_walk(result, game);
            };
        })();

        (function() {
            if (typeof openSlot === 'function') {
                var _origOpenSlot_walk = openSlot;
                openSlot = function(game) {
                    if (game && game.bonusType === 'walking_wilds') resetWalkingWilds();
                    _origOpenSlot_walk(game);
                };
            }
        })();
"""

with open('js/ui-slot.js', 'r', encoding='utf-8') as f:
    src = f.read()

with open('js/ui-slot.js', 'w', encoding='utf-8') as f:
    f.write(src + append_block)

full = src + append_block
d = 0
for c in full:
    if c == '{': d += 1
    elif c == '}': d -= 1
print(f'bracket delta: {d}', 'OK' if d == 0 else 'MISMATCH')
print(f'Total lines: {len(full.splitlines())}')
