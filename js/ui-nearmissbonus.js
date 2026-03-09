// Sprint 88: Near-Miss Consolation Bonus
// After "almost winning" (2 of 3 matching symbols), offer a small consolation
// credit to soften near-miss frustration and keep players spinning.
// Amount: 5-10% of current bet (min $0.05), max 1 per 5 minutes.
(function() {
    'use strict';

    // ── Config ────────────────────────────────────────────────
    var COOLDOWN_MS       = 300000;  // 5 minutes between near-miss bonuses
    var SHOW_DELAY_MS     = 1500;    // 1.5s after loss before showing
    var DISMISS_AFTER_MS  = 6000;    // Auto-dismiss toast after 6s
    var RANDOM_CHANCE     = 0.03;    // 3% fallback chance on any loss
    var BONUS_MIN_PCT     = 0.05;    // 5% of bet minimum
    var BONUS_MAX_PCT     = 0.10;    // 10% of bet maximum
    var BONUS_FLOOR       = 0.05;    // Minimum $0.05 bonus

    // ── State ─────────────────────────────────────────────────
    var _lastBonusTime   = 0;
    var _stylesInjected  = false;
    var _toastEl         = null;
    var _dismissTimer    = null;

    // ── QA suppression ───────────────────────────────────────
    function isSuppressed() {
        var search = window.location.search || '';
        return search.indexOf('noBonus=1') !== -1 || search.indexOf('qaTools=1') !== -1;
    }

    // ── Near-miss detection ──────────────────────────────────
    function detectNearMiss(result) {
        // Method 1: Server explicitly flagged it
        if (result && result.nearMiss) return true;

        // Method 2: Check grid for 2-of-3 pattern in any row
        if (result && result.grid && Array.isArray(result.grid)) {
            var grid = result.grid;
            // grid can be [[row0], [row1], ...] or flat — handle rows
            var rows = [];
            if (Array.isArray(grid[0])) {
                rows = grid;
            } else if (grid.length >= 3) {
                // Flat array: treat as columns, check row-by-row
                // Typical 3-reel slot: grid = [col0sym, col1sym, col2sym]
                // or 5-reel: grid = [c0, c1, c2, c3, c4]
                // For 3+ symbols, check if any consecutive 3 have 2 matching
                for (var k = 0; k <= grid.length - 3; k++) {
                    rows.push([grid[k], grid[k + 1], grid[k + 2]]);
                }
            }

            for (var i = 0; i < rows.length; i++) {
                var row = rows[i];
                if (!Array.isArray(row) || row.length < 3) continue;
                // Check for exactly 2 of 3 matching in any triple
                for (var j = 0; j <= row.length - 3; j++) {
                    var a = row[j], b = row[j + 1], c = row[j + 2];
                    // Normalise: extract symbol name if object
                    if (a && typeof a === 'object') a = a.symbol || a.name || a.id || '';
                    if (b && typeof b === 'object') b = b.symbol || b.name || b.id || '';
                    if (c && typeof c === 'object') c = c.symbol || c.name || c.id || '';
                    var matches = (a === b ? 1 : 0) + (b === c ? 1 : 0) + (a === c ? 1 : 0);
                    if (matches === 1) return true; // Exactly 2 of 3 match
                }
            }
        }

        // Method 3: Random fallback — 15% chance on any loss
        return Math.random() < RANDOM_CHANCE;
    }

    // ── Styles ────────────────────────────────────────────────
    function injectStyles() {
        if (_stylesInjected) return;
        _stylesInjected = true;
        var s = document.createElement('style');
        s.id = 'nearMissBonusStyles';
        s.textContent = [
            '#nmToast{position:fixed;bottom:90px;right:16px;z-index:10400;' +
                'background:linear-gradient(160deg,#451a03,#78350f,#92400e);' +
                'border:2px solid rgba(251,191,36,.5);border-radius:16px;' +
                'padding:14px 18px;max-width:280px;' +
                'box-shadow:0 0 25px rgba(245,158,11,.3);' +
                'color:#fef3c7;font-family:inherit;' +
                'transform:translateX(120%);transition:transform .4s cubic-bezier(.34,1.56,.64,1);' +
                'pointer-events:auto}',
            '#nmToast.active{transform:translateX(0)}',
            '.nm-header{display:flex;align-items:center;gap:8px;margin-bottom:6px}',
            '.nm-icon{font-size:22px}',
            '.nm-title{font-size:13px;font-weight:800;color:#fbbf24;letter-spacing:.5px;text-transform:uppercase}',
            '.nm-body{font-size:12px;color:rgba(255,255,255,.7);line-height:1.5;margin-bottom:8px}',
            '.nm-amount{color:#34d399;font-weight:800;font-size:15px}',
            '.nm-dismiss{padding:5px 14px;border-radius:8px;font-size:11px;font-weight:700;' +
                'cursor:pointer;border:none;background:rgba(255,255,255,.15);color:rgba(255,255,255,.7);' +
                'transition:opacity .15s}',
            '.nm-dismiss:hover{opacity:.8}',
            '.nm-shimmer{position:relative;overflow:hidden}',
            ".nm-shimmer::after{content:'';position:absolute;top:0;left:-100%;width:50%;height:100%;" +
                'background:linear-gradient(90deg,transparent,rgba(251,191,36,.15),transparent);' +
                'animation:nm-shimmer 2s ease-in-out infinite}',
            '@keyframes nm-shimmer{0%{left:-100%}100%{left:200%}}'
        ].join('\n');
        document.head.appendChild(s);
    }

    // ── Toast UI ──────────────────────────────────────────────
    function showConsolationToast(bonusAmt) {
        injectStyles();

        // Remove existing toast if any
        dismissToast();

        _toastEl = document.createElement('div');
        _toastEl.id = 'nmToast';
        _toastEl.className = 'nm-shimmer';

        // Header
        var header = document.createElement('div');
        header.className = 'nm-header';
        var icon = document.createElement('span');
        icon.className = 'nm-icon';
        icon.textContent = '\uD83C\uDF40'; // four-leaf clover
        var title = document.createElement('span');
        title.className = 'nm-title';
        title.textContent = 'So Close!';
        header.appendChild(icon);
        header.appendChild(title);

        // Body
        var body = document.createElement('div');
        body.className = 'nm-body';
        body.appendChild(document.createTextNode('Almost had it! Here\u2019s a consolation bonus: '));
        var amtSpan = document.createElement('span');
        amtSpan.className = 'nm-amount';
        amtSpan.textContent = '+$' + bonusAmt.toFixed(2);
        body.appendChild(amtSpan);

        // Dismiss button
        var btn = document.createElement('button');
        btn.className = 'nm-dismiss';
        btn.textContent = 'Thanks!';
        btn.addEventListener('click', dismissToast);

        _toastEl.appendChild(header);
        _toastEl.appendChild(body);
        _toastEl.appendChild(btn);
        document.body.appendChild(_toastEl);

        requestAnimationFrame(function() {
            requestAnimationFrame(function() {
                if (_toastEl) _toastEl.classList.add('active');
            });
        });

        // Auto-dismiss
        _dismissTimer = setTimeout(dismissToast, DISMISS_AFTER_MS);
    }

    function dismissToast() {
        if (_dismissTimer) { clearTimeout(_dismissTimer); _dismissTimer = null; }
        if (_toastEl) {
            _toastEl.classList.remove('active');
            var el = _toastEl;
            _toastEl = null;
            setTimeout(function() { if (el.parentNode) el.parentNode.removeChild(el); }, 500);
        }
    }

    // ── Credit bonus ─────────────────────────────────────────
    function creditBonus(amount) {
        if (typeof balance !== 'undefined') {
            balance += amount;
            balance = Math.round(balance * 100) / 100;
        }
        if (typeof updateBalance === 'function') updateBalance();
        if (typeof saveBalance === 'function') saveBalance();
    }

    // ── Calculate bonus amount ───────────────────────────────
    function calcBonusAmount(bet) {
        var pct = BONUS_MIN_PCT + Math.random() * (BONUS_MAX_PCT - BONUS_MIN_PCT);
        var amount = bet * pct;
        amount = Math.round(amount * 100) / 100;
        if (amount < BONUS_FLOOR) amount = BONUS_FLOOR;
        return amount;
    }

    // ── Hook into win results ────────────────────────────────
    function hookWinResult() {
        var _orig = window.displayServerWinResult;
        if (typeof _orig !== 'function') return;

        window.displayServerWinResult = function(result, game) {
            // Call original first
            _orig.call(this, result, game);

            // Only trigger on losses
            if (!result || result.winAmount > 0) return;
            if (isSuppressed()) return;

            // Cooldown check
            if (Date.now() - _lastBonusTime < COOLDOWN_MS) return;

            // Near-miss detection
            if (!detectNearMiss(result)) return;

            // Calculate bonus based on current bet
            var bet = (typeof currentBet !== 'undefined') ? currentBet : 1;
            var bonusAmt = calcBonusAmount(bet);

            _lastBonusTime = Date.now();

            // Delay before showing (let the loss settle)
            setTimeout(function() {
                creditBonus(bonusAmt);
                showConsolationToast(bonusAmt);

                // Also fire showWinToast if available
                if (typeof showWinToast === 'function') {
                    showWinToast(
                        '\uD83C\uDF40 Consolation: +$' + bonusAmt.toFixed(2),
                        'great'
                    );
                }
            }, SHOW_DELAY_MS);
        };
    }

    // ── Init ──────────────────────────────────────────────────
    function init() {
        if (isSuppressed()) return;
        hookWinResult();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        setTimeout(init, 0);
    }
}());
