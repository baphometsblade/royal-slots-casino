// Sprint 101: Lucky Number — daily number pick game
// Once per day, player picks a "lucky number" 1-9. Each spin, if any reel
// position contains a symbol whose index (in the game's symbol array) matches
// the chosen number, player gets a small bonus:
//   1 match = $0.10,  2 matches = $0.50,  3 matches (all reels) = $2.00
// Resets at midnight. Persistent badge at top-right shows chosen number.
//
// Hooks: window.displayServerWinResult (reads grid + game.symbols)
// Depends: globals.js (balance, currentGame, currentBet, formatMoney),
//   ui-lobby.js (updateBalance), app.js (saveBalance), ui-slot.js (showWinToast)
(function() {
    'use strict';

    // ── QA suppression ───────────────────────────────────────────
    var search = window.location.search || '';
    if (search.indexOf('noBonus=1') !== -1 || search.indexOf('qaTools=1') !== -1) return;

    // ── Constants ────────────────────────────────────────────────
    var STORAGE_KEY     = 'luckyNumberState';
    var STYLE_ID        = 'luckyNumberStyles';
    var MATCH_REWARDS   = [0, 0.10, 0.50, 2.00]; // index 0=no match
    var PICK_DELAY_MS   = 2500;
    var BADGE_SIZE      = 38;
    var NEON_COLORS     = [
        '#ff3e6c', '#ff8c42', '#ffd166', '#06d6a0', '#118ab2',
        '#8338ec', '#ff006e', '#3a86ff', '#fb5607'
    ];

    // ── State ────────────────────────────────────────────────────
    var _state        = null;   // { chosenNumber, lastPickDate, todayMatches, todayBonus }
    var _badgeEl      = null;
    var _modalEl      = null;
    var _overlayEl    = null;
    var _stylesReady  = false;
    var _hooked       = false;

    // ── Helpers ──────────────────────────────────────────────────
    function todayStr() {
        var d = new Date();
        return d.getFullYear() + '-' +
            String(d.getMonth() + 1).padStart(2, '0') + '-' +
            String(d.getDate()).padStart(2, '0');
    }

    function loadState() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                var s = JSON.parse(raw);
                if (s && typeof s.chosenNumber === 'number') {
                    _state = s;
                    return;
                }
            }
        } catch (e) { /* corrupted — reset */ }
        _state = { chosenNumber: 0, lastPickDate: '', todayMatches: 0, todayBonus: 0 };
    }

    function saveState() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(_state));
        } catch (e) { /* quota */ }
    }

    function needsPick() {
        return !_state || _state.lastPickDate !== todayStr() || _state.chosenNumber < 1;
    }

    function creditBalance(amount) {
        if (typeof balance !== 'undefined') {
            balance += amount;
            balance = Math.round(balance * 100) / 100;
        }
        if (typeof updateBalance === 'function') updateBalance();
        if (typeof saveBalance === 'function') saveBalance();
    }

    function fmtMoney(v) {
        if (typeof formatMoney === 'function') return formatMoney(v);
        return '$' + v.toFixed(2);
    }

    // ── CSS Injection ────────────────────────────────────────────
    function injectStyles() {
        if (_stylesReady) return;
        _stylesReady = true;

        var s = document.createElement('style');
        s.id = STYLE_ID;
        s.textContent = [
            /* Badge */
            '#lnBadge{position:fixed;top:12px;right:14px;z-index:10400;width:' + BADGE_SIZE + 'px;height:' + BADGE_SIZE + 'px;' +
                'border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;' +
                'font-size:18px;font-weight:900;font-family:inherit;color:#fff;border:2px solid rgba(255,255,255,.25);' +
                'background:radial-gradient(circle at 30% 30%,rgba(255,255,255,.15),transparent 70%),#1a1a2e;' +
                'box-shadow:0 0 12px rgba(138,43,226,.5),0 0 24px rgba(138,43,226,.2);' +
                'transition:transform .25s,box-shadow .25s;user-select:none}',
            '#lnBadge:hover{transform:scale(1.12);box-shadow:0 0 20px rgba(138,43,226,.7),0 0 40px rgba(138,43,226,.3)}',
            '#lnBadge.ln-empty{opacity:.55;font-size:14px}',
            '#lnBadge .ln-num{position:relative;z-index:10400;text-shadow:0 0 8px currentColor}',
            '#lnBadge .ln-glow{position:absolute;inset:0;border-radius:50%;opacity:0;transition:opacity .3s}',

            /* Badge celebration */
            '@keyframes lnCelebrate{0%{transform:scale(1);box-shadow:0 0 12px rgba(138,43,226,.5)}' +
                '25%{transform:scale(1.35);box-shadow:0 0 30px rgba(255,215,0,.8),0 0 60px rgba(255,215,0,.3)}' +
                '50%{transform:scale(1.1);box-shadow:0 0 20px rgba(255,215,0,.5)}' +
                '100%{transform:scale(1);box-shadow:0 0 12px rgba(138,43,226,.5)}}',
            '#lnBadge.ln-match{animation:lnCelebrate .7s ease-out}',

            '@keyframes lnPulseGlow{0%,100%{opacity:0}50%{opacity:.8}}',
            '#lnBadge.ln-active .ln-glow{animation:lnPulseGlow 2.5s ease-in-out infinite;' +
                'background:radial-gradient(circle,rgba(255,215,0,.4),transparent 70%)}',

            /* Overlay */
            '#lnOverlay{position:fixed;inset:0;z-index:10400;background:rgba(0,0,0,.7);' +
                'display:flex;align-items:center;justify-content:center;opacity:0;' +
                'transition:opacity .35s;pointer-events:none}',
            '#lnOverlay.active{opacity:1;pointer-events:auto}',

            /* Modal */
            '#lnModal{background:linear-gradient(145deg,#1a1a2e,#16213e);border-radius:18px;' +
                'padding:28px 24px 24px;max-width:320px;width:90%;text-align:center;color:#fff;' +
                'box-shadow:0 8px 40px rgba(0,0,0,.6),0 0 60px rgba(138,43,226,.15);' +
                'transform:scale(.85);transition:transform .35s cubic-bezier(.34,1.56,.64,1)}',
            '#lnOverlay.active #lnModal{transform:scale(1)}',
            '#lnModal h2{margin:0 0 6px;font-size:22px;letter-spacing:1px;' +
                'background:linear-gradient(90deg,#ffd166,#ff8c42);-webkit-background-clip:text;' +
                '-webkit-text-fill-color:transparent;background-clip:text}',
            '#lnModal .ln-sub{font-size:13px;color:rgba(255,255,255,.55);margin-bottom:18px}',

            /* Number grid */
            '.ln-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:18px}',
            '.ln-cell{width:100%;aspect-ratio:1;border-radius:12px;display:flex;align-items:center;' +
                'justify-content:center;font-size:26px;font-weight:900;cursor:pointer;' +
                'border:2px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);' +
                'transition:transform .2s,border-color .2s,box-shadow .2s,background .2s;' +
                'user-select:none;position:relative;overflow:hidden}',
            '.ln-cell:hover{transform:scale(1.08);border-color:rgba(255,255,255,.3)}',
            '.ln-cell::before{content:"";position:absolute;inset:0;border-radius:10px;opacity:0;transition:opacity .25s}',
            '.ln-cell:hover::before{opacity:.15}',

            /* Today stats */
            '.ln-stats{font-size:12px;color:rgba(255,255,255,.45);margin-top:6px}',
            '.ln-stats span{color:#ffd166;font-weight:700}',

            /* Reward tiers row */
            '.ln-rewards{display:flex;justify-content:center;gap:14px;margin-bottom:14px;font-size:11px;color:rgba(255,255,255,.5)}',
            '.ln-rewards div{text-align:center}',
            '.ln-rewards .ln-rw-val{font-size:14px;font-weight:800;color:#06d6a0}',

            /* Match flash on badge number */
            '@keyframes lnFlashNum{0%{color:#fff}40%{color:#ffd166}100%{color:#fff}}',
            '#lnBadge.ln-match .ln-num{animation:lnFlashNum .7s ease-out}'
        ].join('\n');
        document.head.appendChild(s);
    }

    // ── Badge ────────────────────────────────────────────────────
    function createBadge() {
        if (_badgeEl) return;

        _badgeEl = document.createElement('div');
        _badgeEl.id = 'lnBadge';

        var glow = document.createElement('div');
        glow.className = 'ln-glow';
        _badgeEl.appendChild(glow);

        var num = document.createElement('span');
        num.className = 'ln-num';
        _badgeEl.appendChild(num);

        _badgeEl.addEventListener('click', function() {
            if (needsPick()) {
                openPickModal();
            } else {
                // Show stats tooltip briefly
                flashBadgeInfo();
            }
        });

        document.body.appendChild(_badgeEl);
        refreshBadge();
    }

    function refreshBadge() {
        if (!_badgeEl) return;
        var numEl = _badgeEl.querySelector('.ln-num');

        if (needsPick()) {
            _badgeEl.classList.add('ln-empty');
            _badgeEl.classList.remove('ln-active');
            numEl.textContent = '?';
            _badgeEl.title = 'Pick your Lucky Number!';
        } else {
            _badgeEl.classList.remove('ln-empty');
            _badgeEl.classList.add('ln-active');
            numEl.textContent = String(_state.chosenNumber);
            _badgeEl.style.setProperty('--ln-color', NEON_COLORS[_state.chosenNumber - 1] || '#ffd166');
            numEl.style.color = NEON_COLORS[_state.chosenNumber - 1] || '#ffd166';
            _badgeEl.title = 'Lucky Number: ' + _state.chosenNumber +
                ' | Matches: ' + _state.todayMatches +
                ' | Bonus: ' + fmtMoney(_state.todayBonus);
        }
    }

    function celebrateBadge() {
        if (!_badgeEl) return;
        _badgeEl.classList.remove('ln-match');
        // Force reflow for re-trigger
        void _badgeEl.offsetWidth;
        _badgeEl.classList.add('ln-match');
        setTimeout(function() {
            if (_badgeEl) _badgeEl.classList.remove('ln-match');
        }, 750);
    }

    function flashBadgeInfo() {
        // Brief tooltip-style info — just use title (already set by refreshBadge)
        celebrateBadge();
        if (typeof showWinToast === 'function') {
            showWinToast(
                'Lucky #' + _state.chosenNumber +
                ' | ' + _state.todayMatches + ' match' + (_state.todayMatches !== 1 ? 'es' : '') +
                ' | +' + fmtMoney(_state.todayBonus) + ' today',
                'epic'
            );
        }
    }

    // ── Pick Modal ───────────────────────────────────────────────
    function buildModal() {
        if (_overlayEl) return;

        // Overlay
        _overlayEl = document.createElement('div');
        _overlayEl.id = 'lnOverlay';
        _overlayEl.addEventListener('click', function(e) {
            if (e.target === _overlayEl && !needsPick()) closePickModal();
        });

        // Modal container
        _modalEl = document.createElement('div');
        _modalEl.id = 'lnModal';

        // Title
        var h2 = document.createElement('h2');
        h2.textContent = 'LUCKY NUMBER';
        _modalEl.appendChild(h2);

        // Subtitle
        var sub = document.createElement('div');
        sub.className = 'ln-sub';
        sub.textContent = 'Pick a number 1\u20139. Earn bonus when it appears on the reels!';
        _modalEl.appendChild(sub);

        // Rewards row
        var rwRow = document.createElement('div');
        rwRow.className = 'ln-rewards';
        var rwData = [
            { label: '1 Match', val: '$0.10' },
            { label: '2 Matches', val: '$0.50' },
            { label: '3 Matches', val: '$2.00' }
        ];
        for (var r = 0; r < rwData.length; r++) {
            var rwDiv = document.createElement('div');
            var valSpan = document.createElement('div');
            valSpan.className = 'ln-rw-val';
            valSpan.textContent = rwData[r].val;
            rwDiv.appendChild(valSpan);
            var lblSpan = document.createElement('div');
            lblSpan.textContent = rwData[r].label;
            rwDiv.appendChild(lblSpan);
            rwRow.appendChild(rwDiv);
        }
        _modalEl.appendChild(rwRow);

        // Number grid
        var grid = document.createElement('div');
        grid.className = 'ln-grid';
        for (var i = 1; i <= 9; i++) {
            var cell = document.createElement('div');
            cell.className = 'ln-cell';
            cell.textContent = String(i);
            cell.dataset.num = String(i);
            cell.style.setProperty('--cell-color', NEON_COLORS[i - 1]);
            cell.style.color = NEON_COLORS[i - 1];
            cell.querySelector(':scope') || null; // noop
            // Pseudo-element bg via inline style trick
            cell.style.borderColor = NEON_COLORS[i - 1] + '44';
            cell.addEventListener('click', handlePick);
            grid.appendChild(cell);
        }
        _modalEl.appendChild(grid);

        // Stats line (shown after pick)
        var statsDiv = document.createElement('div');
        statsDiv.className = 'ln-stats';
        statsDiv.id = 'lnStats';
        _modalEl.appendChild(statsDiv);

        _overlayEl.appendChild(_modalEl);
        document.body.appendChild(_overlayEl);
    }

    function openPickModal() {
        buildModal();
        updateModalStats();

        // Highlight current pick if revisiting
        var cells = _modalEl.querySelectorAll('.ln-cell');
        for (var c = 0; c < cells.length; c++) {
            cells[c].style.background = 'rgba(255,255,255,.04)';
            cells[c].style.boxShadow = 'none';
            if (!needsPick() && Number(cells[c].dataset.num) === _state.chosenNumber) {
                var clr = NEON_COLORS[_state.chosenNumber - 1];
                cells[c].style.background = clr + '22';
                cells[c].style.boxShadow = '0 0 16px ' + clr + '55, inset 0 0 12px ' + clr + '22';
                cells[c].style.borderColor = clr;
            }
        }

        // Double-RAF for smooth entry
        requestAnimationFrame(function() {
            requestAnimationFrame(function() {
                if (_overlayEl) _overlayEl.classList.add('active');
            });
        });
    }

    function closePickModal() {
        if (!_overlayEl) return;
        _overlayEl.classList.remove('active');
    }

    function updateModalStats() {
        var el = document.getElementById('lnStats');
        if (!el) return;
        if (_state && _state.chosenNumber > 0 && _state.lastPickDate === todayStr()) {
            el.textContent = '';
            var t1 = document.createTextNode('Today: ');
            el.appendChild(t1);
            var s1 = document.createElement('span');
            s1.textContent = _state.todayMatches + ' match' + (_state.todayMatches !== 1 ? 'es' : '');
            el.appendChild(s1);
            var t2 = document.createTextNode(' \u2022 Bonus: ');
            el.appendChild(t2);
            var s2 = document.createElement('span');
            s2.textContent = fmtMoney(_state.todayBonus);
            el.appendChild(s2);
        } else {
            el.textContent = 'Pick a number to start earning today!';
        }
    }

    function handlePick(e) {
        var num = Number(e.currentTarget.dataset.num);
        if (num < 1 || num > 9) return;

        var today = todayStr();

        // Reset stats if new day
        if (_state.lastPickDate !== today) {
            _state.todayMatches = 0;
            _state.todayBonus = 0;
        }

        _state.chosenNumber = num;
        _state.lastPickDate = today;
        saveState();

        // Visual feedback on cell
        var cells = _modalEl.querySelectorAll('.ln-cell');
        for (var c = 0; c < cells.length; c++) {
            cells[c].style.background = 'rgba(255,255,255,.04)';
            cells[c].style.boxShadow = 'none';
            cells[c].style.borderColor = NEON_COLORS[Number(cells[c].dataset.num) - 1] + '44';
        }
        var clr = NEON_COLORS[num - 1];
        e.currentTarget.style.background = clr + '22';
        e.currentTarget.style.boxShadow = '0 0 16px ' + clr + '55, inset 0 0 12px ' + clr + '22';
        e.currentTarget.style.borderColor = clr;

        refreshBadge();
        updateModalStats();

        if (typeof showWinToast === 'function') {
            showWinToast('Lucky Number set to ' + num + '!', 'epic');
        }

        // Auto-close after brief pause
        setTimeout(function() {
            closePickModal();
        }, 600);
    }

    // ── Spin Hook — match detection ─────────────────────────────
    function hookDisplayServerWinResult() {
        if (_hooked) return;
        _hooked = true;

        var _orig = window.displayServerWinResult;
        if (typeof _orig !== 'function') return;

        window.displayServerWinResult = function(result, game) {
            // Call original first
            _orig.call(this, result, game);

            // Then check for lucky number matches
            checkLuckyNumber(result, game);
        };
    }

    function checkLuckyNumber(result, game) {
        // Bail if no active pick today
        if (!_state || _state.chosenNumber < 1 || _state.lastPickDate !== todayStr()) return;

        // Need grid and game symbols to map
        var grid = result && result.grid;
        if (!grid || !Array.isArray(grid)) return;

        var symbols = null;
        if (game && game.symbols && Array.isArray(game.symbols)) {
            symbols = game.symbols;
        } else if (typeof currentGame !== 'undefined' && currentGame && currentGame.symbols) {
            symbols = currentGame.symbols;
        }
        if (!symbols || symbols.length < 2) return;

        var luckyNum = _state.chosenNumber; // 1-9
        var matchCount = 0;

        // grid is [col][row] — check first row of each column (3 reels = 3 columns)
        // For multi-row grids, check ALL positions for richer gameplay
        for (var col = 0; col < grid.length; col++) {
            var column = grid[col];
            if (!Array.isArray(column)) continue;
            var colHasMatch = false;

            for (var row = 0; row < column.length; row++) {
                var sym = column[row];
                // Symbol index in the game's symbol array (1-based for user display)
                var idx = symbols.indexOf(sym);
                // idx is 0-based; lucky number is 1-9, so match idx+1
                if (idx >= 0 && (idx + 1) === luckyNum) {
                    colHasMatch = true;
                    break; // One match per column is enough
                }
            }
            if (colHasMatch) matchCount++;
        }

        // Cap at 3 (one per reel column)
        if (matchCount > 3) matchCount = 3;
        if (matchCount < 1) return;

        // Award bonus
        var reward = MATCH_REWARDS[matchCount] || 0;
        if (reward <= 0) return;

        _state.todayMatches += matchCount;
        _state.todayBonus = Math.round((_state.todayBonus + reward) * 100) / 100;
        saveState();

        // Credit balance
        creditBalance(reward);

        // Celebrate!
        celebrateBadge();
        refreshBadge();

        // Toast
        var matchWord = matchCount === 1 ? 'match' : 'matches';
        if (typeof showWinToast === 'function') {
            showWinToast(
                'Lucky #' + luckyNum + ': ' + matchCount + ' ' + matchWord + '! +' + fmtMoney(reward),
                'epic'
            );
        }
    }

    // ── Initialization ───────────────────────────────────────────
    function init() {
        loadState();
        injectStyles();
        createBadge();
        hookDisplayServerWinResult();

        // If user hasn't picked today, show modal after delay
        if (needsPick()) {
            setTimeout(function() {
                // Re-check in case something changed
                if (needsPick()) openPickModal();
            }, PICK_DELAY_MS);
        }
    }

    // Boot after DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        // Already loaded — slight delay to let other modules init first
        setTimeout(init, 200);
    }

}());
