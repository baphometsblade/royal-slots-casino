// =====================================================================
// PIGGY BANK SAVINGS MODULE — Automatic Loss-Recovery Micro-Savings
// =====================================================================
//
// Self-contained IIFE. After every losing spin, 2-5% of the bet is
// deposited into a virtual piggy bank. When the bank reaches its $25
// capacity the player can "smash" it to reclaim the full amount.
//
// Depends on globals: balance, currentBet, currentGame, spinning,
//   formatMoney(), updateBalance(), saveBalance(), showToast()
//
// Public API (attached to window):
//   initPiggyBank()                — bootstrap (call from app.js)
//   piggyBankOnSpinResult(result)  — hook called after each spin
// =====================================================================

(function () {
    'use strict';

    // ── QA suppression ──────────────────────────────────────────
    function _isQA() {
        var qs = window.location.search;
        return qs.indexOf('noBonus=1') !== -1 || qs.indexOf('qaTools=1') !== -1;
    }

    // ── Config ──────────────────────────────────────────────────
    var PIGGY_CAPACITY      = 25.00;
    var DEPOSIT_MIN_PCT     = 0.02;   // 2%
    var DEPOSIT_MAX_PCT     = 0.05;   // 5%
    var STORAGE_KEY         = 'piggyBankState';
    var MAX_HISTORY         = 5;
    var FAB_Z               = 18700;

    // ── State ───────────────────────────────────────────────────
    var _state = {
        amount: 0,
        history: []   // [{ date, bet, deposit, gameId }]
    };
    var _fabEl       = null;
    var _overlayEl   = null;
    var _stylesAdded = false;
    var _initialised = false;

    // ── Persistence ─────────────────────────────────────────────
    function _load() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                var parsed = JSON.parse(raw);
                _state.amount  = typeof parsed.amount === 'number' ? parsed.amount : 0;
                _state.history = Array.isArray(parsed.history) ? parsed.history.slice(0, MAX_HISTORY) : [];
            }
        } catch (e) { /* keep defaults */ }
    }

    function _save() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                amount:  Math.round(_state.amount * 100) / 100,
                history: _state.history.slice(0, MAX_HISTORY)
            }));
        } catch (e) { /* storage full — silently ignore */ }
    }

    // ── Styles ──────────────────────────────────────────────────
    function _injectStyles() {
        if (_stylesAdded) return;
        _stylesAdded = true;
        var s = document.createElement('style');
        s.id = 'piggyBankStyles';
        s.textContent =
            /* FAB button */
            '.piggy-fab{' +
                'position:fixed;bottom:200px;right:16px;z-index:' + FAB_Z + ';' +
                'width:56px;height:56px;border-radius:50%;' +
                'background:linear-gradient(135deg,#f472b6,#be185d);' +
                'border:2px solid rgba(255,255,255,.25);' +
                'box-shadow:0 4px 16px rgba(190,24,93,.45);' +
                'cursor:pointer;display:flex;align-items:center;justify-content:center;' +
                'font-size:28px;transition:transform .2s,box-shadow .2s;' +
                'user-select:none;-webkit-tap-highlight-color:transparent;' +
            '}' +
            '.piggy-fab:hover{transform:scale(1.1);box-shadow:0 6px 24px rgba(190,24,93,.6);}' +
            '.piggy-fab:active{transform:scale(0.95);}' +

            /* Badge */
            '.piggy-badge{' +
                'position:absolute;top:-4px;right:-4px;' +
                'background:#fbbf24;color:#1e1b4b;' +
                'font-size:10px;font-weight:700;line-height:1;' +
                'padding:2px 5px;border-radius:10px;' +
                'min-width:18px;text-align:center;' +
                'box-shadow:0 2px 6px rgba(0,0,0,.3);' +
                'pointer-events:none;' +
            '}' +

            /* Notification dot */
            '.piggy-dot{' +
                'position:absolute;top:0;right:0;width:12px;height:12px;' +
                'background:#ef4444;border-radius:50%;' +
                'box-shadow:0 0 6px rgba(239,68,68,.8);' +
                'animation:piggy-dot-pulse 1s ease-in-out infinite;' +
                'pointer-events:none;display:none;' +
            '}' +
            '@keyframes piggy-dot-pulse{0%,100%{transform:scale(1);}50%{transform:scale(1.4);}}' +

            /* Full label */
            '.piggy-full-label{' +
                'position:absolute;bottom:-6px;left:50%;transform:translateX(-50%);' +
                'background:#ef4444;color:#fff;font-size:9px;font-weight:800;' +
                'padding:1px 6px;border-radius:6px;white-space:nowrap;' +
                'letter-spacing:.5px;pointer-events:none;display:none;' +
            '}' +

            /* Shake animation for full state */
            '.piggy-fab.piggy-full{animation:piggy-shake .5s ease-in-out infinite;}' +
            '@keyframes piggy-shake{' +
                '0%,100%{transform:rotate(0deg);}' +
                '15%{transform:rotate(-8deg) scale(1.05);}' +
                '30%{transform:rotate(8deg) scale(1.05);}' +
                '45%{transform:rotate(-5deg);}' +
                '60%{transform:rotate(5deg);}' +
                '75%{transform:rotate(-2deg);}' +
            '}' +

            /* Overlay / Modal */
            '.piggy-overlay{' +
                'position:fixed;top:0;left:0;right:0;bottom:0;' +
                'z-index:' + (FAB_Z + 100) + ';' +
                'background:rgba(0,0,0,.6);backdrop-filter:blur(4px);' +
                'display:none;align-items:center;justify-content:center;' +
                'padding:20px;' +
            '}' +
            '.piggy-overlay.active{display:flex;}' +

            '.piggy-panel{' +
                'background:linear-gradient(160deg,#1e1b4b,#0f172a);' +
                'border:2px solid rgba(244,114,182,.5);' +
                'border-radius:20px;padding:28px 24px;' +
                'max-width:360px;width:100%;color:#e2e8f0;' +
                'text-align:center;position:relative;' +
                'animation:piggy-panel-in .3s ease-out;' +
            '}' +
            '@keyframes piggy-panel-in{from{opacity:0;transform:scale(.9) translateY(20px);}to{opacity:1;transform:none;}}' +

            '.piggy-panel-title{' +
                'font-size:22px;font-weight:700;margin-bottom:6px;' +
                'background:linear-gradient(90deg,#f472b6,#fbbf24);' +
                '-webkit-background-clip:text;-webkit-text-fill-color:transparent;' +
                'background-clip:text;' +
            '}' +

            '.piggy-panel-icon{font-size:56px;margin:10px 0;}' +

            '.piggy-panel-amount{' +
                'font-size:28px;font-weight:800;color:#fbbf24;margin:8px 0;' +
            '}' +

            '.piggy-progress-track{' +
                'width:100%;height:14px;border-radius:7px;' +
                'background:rgba(255,255,255,.1);margin:12px 0;overflow:hidden;' +
            '}' +
            '.piggy-progress-fill{' +
                'height:100%;border-radius:7px;' +
                'background:linear-gradient(90deg,#f472b6,#fbbf24);' +
                'transition:width .5s ease;' +
            '}' +

            '.piggy-capacity-text{' +
                'font-size:13px;color:#94a3b8;margin-bottom:10px;' +
            '}' +

            /* Smash button */
            '.piggy-smash-btn{' +
                'display:inline-block;margin-top:14px;padding:14px 36px;' +
                'background:linear-gradient(135deg,#f472b6,#dc2626);' +
                'color:#fff;font-size:18px;font-weight:800;border:none;' +
                'border-radius:14px;cursor:pointer;letter-spacing:.5px;' +
                'box-shadow:0 4px 20px rgba(220,38,38,.5);' +
                'transition:transform .15s,box-shadow .15s;' +
            '}' +
            '.piggy-smash-btn:hover{transform:scale(1.06);box-shadow:0 6px 28px rgba(220,38,38,.7);}' +
            '.piggy-smash-btn:active{transform:scale(0.96);}' +

            /* History list */
            '.piggy-history{' +
                'margin-top:14px;text-align:left;max-height:120px;overflow-y:auto;' +
            '}' +
            '.piggy-history-item{' +
                'display:flex;justify-content:space-between;align-items:center;' +
                'padding:4px 0;border-bottom:1px solid rgba(255,255,255,.06);' +
                'font-size:12px;color:#94a3b8;' +
            '}' +
            '.piggy-history-item:last-child{border-bottom:none;}' +
            '.piggy-history-amount{color:#f472b6;font-weight:600;}' +

            /* Close button */
            '.piggy-close{' +
                'position:absolute;top:10px;right:14px;' +
                'background:none;border:none;color:#64748b;' +
                'font-size:22px;cursor:pointer;line-height:1;' +
            '}' +
            '.piggy-close:hover{color:#e2e8f0;}' +

            /* Coin scatter animation */
            '.piggy-coin{' +
                'position:fixed;font-size:24px;z-index:' + (FAB_Z + 200) + ';' +
                'pointer-events:none;animation:piggy-coin-fly 1s ease-out forwards;' +
            '}' +
            '@keyframes piggy-coin-fly{' +
                '0%{opacity:1;transform:translate(0,0) scale(1);}' +
                '60%{opacity:1;}' +
                '100%{opacity:0;transform:translate(var(--cx),var(--cy)) scale(.3);}' +
            '}' +

            /* Crack overlay for smash */
            '.piggy-crack{' +
                'display:inline-block;position:relative;' +
            '}' +
            '.piggy-crack::after{' +
                'content:"";position:absolute;top:0;left:0;right:0;bottom:0;' +
                'background:radial-gradient(circle,rgba(239,68,68,.4) 0%,transparent 70%);' +
                'animation:piggy-crack-pulse .4s ease-in-out 3;' +
            '}' +
            '@keyframes piggy-crack-pulse{0%,100%{opacity:0;}50%{opacity:1;}}' +

            /* Motivational text */
            '.piggy-motivate{' +
                'font-size:13px;color:#94a3b8;margin-top:8px;font-style:italic;' +
            '}';

        document.head.appendChild(s);
    }

    // ── FAB (Floating Action Button) ────────────────────────────
    function _createFab() {
        if (_fabEl) return;
        _fabEl = document.createElement('div');
        _fabEl.className = 'piggy-fab';
        _fabEl.setAttribute('aria-label', 'Piggy Bank');
        _fabEl.setAttribute('role', 'button');
        _fabEl.setAttribute('tabindex', '0');

        // Piggy emoji
        var icon = document.createElement('span');
        icon.textContent = '\uD83D\uDC37'; // pig face
        icon.style.lineHeight = '1';
        _fabEl.appendChild(icon);

        // Badge (current amount)
        var badge = document.createElement('span');
        badge.className = 'piggy-badge';
        badge.textContent = '$0';
        _fabEl.appendChild(badge);

        // Notification dot (hidden until full)
        var dot = document.createElement('span');
        dot.className = 'piggy-dot';
        _fabEl.appendChild(dot);

        // "FULL!" label (hidden until full)
        var fullLabel = document.createElement('span');
        fullLabel.className = 'piggy-full-label';
        fullLabel.textContent = 'FULL!';
        _fabEl.appendChild(fullLabel);

        _fabEl.addEventListener('click', function () {
            _openPanel();
        });
        _fabEl.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); _openPanel(); }
        });

        document.body.appendChild(_fabEl);
        _updateFab();
    }

    function _updateFab() {
        if (!_fabEl) return;
        var badge = _fabEl.querySelector('.piggy-badge');
        var dot   = _fabEl.querySelector('.piggy-dot');
        var label = _fabEl.querySelector('.piggy-full-label');
        var isFull = _state.amount >= PIGGY_CAPACITY;

        badge.textContent = _fmtShort(_state.amount);

        if (isFull) {
            _fabEl.classList.add('piggy-full');
            dot.style.display = 'block';
            label.style.display = 'block';
        } else {
            _fabEl.classList.remove('piggy-full');
            dot.style.display = 'none';
            label.style.display = 'none';
        }
    }

    // ── Overlay / Panel ─────────────────────────────────────────
    function _ensureOverlay() {
        if (_overlayEl) return;
        _overlayEl = document.createElement('div');
        _overlayEl.className = 'piggy-overlay';
        _overlayEl.addEventListener('click', function (e) {
            if (e.target === _overlayEl) _closePanel();
        });
        document.body.appendChild(_overlayEl);
    }

    function _openPanel() {
        _ensureOverlay();
        // Clear previous content
        while (_overlayEl.firstChild) _overlayEl.removeChild(_overlayEl.firstChild);

        var isFull = _state.amount >= PIGGY_CAPACITY;

        var panel = document.createElement('div');
        panel.className = 'piggy-panel';

        // Close button
        var closeBtn = document.createElement('button');
        closeBtn.className = 'piggy-close';
        closeBtn.textContent = '\u2715';
        closeBtn.addEventListener('click', _closePanel);
        panel.appendChild(closeBtn);

        // Title
        var title = document.createElement('div');
        title.className = 'piggy-panel-title';
        title.textContent = isFull ? 'Break the Bank!' : 'Piggy Bank';
        panel.appendChild(title);

        // Piggy icon
        var iconWrap = document.createElement('div');
        iconWrap.className = 'piggy-panel-icon';
        if (isFull) iconWrap.classList.add('piggy-crack');
        iconWrap.textContent = '\uD83D\uDC37';
        panel.appendChild(iconWrap);

        // Amount
        var amountDiv = document.createElement('div');
        amountDiv.className = 'piggy-panel-amount';
        amountDiv.textContent = _fmtMoney(_state.amount);
        panel.appendChild(amountDiv);

        // Progress
        var capText = document.createElement('div');
        capText.className = 'piggy-capacity-text';
        capText.textContent = _fmtMoney(_state.amount) + ' / ' + _fmtMoney(PIGGY_CAPACITY);
        panel.appendChild(capText);

        var track = document.createElement('div');
        track.className = 'piggy-progress-track';
        var fill = document.createElement('div');
        fill.className = 'piggy-progress-fill';
        var pct = Math.min((_state.amount / PIGGY_CAPACITY) * 100, 100);
        fill.style.width = pct + '%';
        track.appendChild(fill);
        panel.appendChild(track);

        if (isFull) {
            // Smash button
            var smashBtn = document.createElement('button');
            smashBtn.className = 'piggy-smash-btn';
            smashBtn.textContent = 'SMASH IT! \uD83D\uDD28';
            smashBtn.addEventListener('click', function () {
                _smashPiggy(panel, amountDiv);
            });
            panel.appendChild(smashBtn);
        } else {
            // Motivational text
            var motivate = document.createElement('div');
            motivate.className = 'piggy-motivate';
            motivate.textContent = 'Keep playing to fill your piggy bank!';
            panel.appendChild(motivate);
        }

        // History
        if (_state.history.length > 0) {
            var histTitle = document.createElement('div');
            histTitle.style.cssText = 'font-size:13px;color:#64748b;margin-top:16px;margin-bottom:4px;text-align:left;font-weight:600;';
            histTitle.textContent = 'Recent deposits';
            panel.appendChild(histTitle);

            var histList = document.createElement('div');
            histList.className = 'piggy-history';
            for (var i = 0; i < _state.history.length; i++) {
                var h = _state.history[i];
                var row = document.createElement('div');
                row.className = 'piggy-history-item';

                var left = document.createElement('span');
                left.textContent = _shortDate(h.date) + (h.gameId ? ' \u2022 ' + h.gameId : '');
                row.appendChild(left);

                var right = document.createElement('span');
                right.className = 'piggy-history-amount';
                right.textContent = '+' + _fmtMoney(h.deposit);
                row.appendChild(right);

                histList.appendChild(row);
            }
            panel.appendChild(histList);
        }

        _overlayEl.appendChild(panel);
        _overlayEl.classList.add('active');
    }

    function _closePanel() {
        if (_overlayEl) _overlayEl.classList.remove('active');
    }

    // ── Smash Logic ─────────────────────────────────────────────
    function _smashPiggy(panel, amountDiv) {
        var payout = Math.round(_state.amount * 100) / 100;
        if (payout <= 0) return;

        // Disable further clicks
        var btn = panel.querySelector('.piggy-smash-btn');
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'SMASHING...';
        }

        // Crack animation on icon
        var iconEl = panel.querySelector('.piggy-panel-icon');
        if (iconEl) iconEl.classList.add('piggy-crack');

        // Scatter coins
        _scatterCoins(12);

        // After a brief animation delay, credit balance
        setTimeout(function () {
            // Credit to balance
            if (typeof balance !== 'undefined') {
                balance += payout;
                if (typeof updateBalance === 'function') updateBalance();
                if (typeof saveBalance === 'function') saveBalance();
            }

            // Reset state
            _state.amount = 0;
            _state.history = [];
            _save();
            _updateFab();

            // Update the panel display
            if (amountDiv) amountDiv.textContent = _fmtMoney(0);

            // Show toast
            if (typeof showToast === 'function') {
                showToast('Piggy bank smashed! +' + _fmtMoney(payout), 'success', 4000);
            }

            // Play sound
            if (typeof SoundManager !== 'undefined' && typeof SoundManager.playSoundEvent === 'function') {
                SoundManager.playSoundEvent('bigWin');
            }

            // Close panel after brief pause
            setTimeout(function () {
                _closePanel();
            }, 800);
        }, 700);
    }

    // ── Coin Scatter Effect ─────────────────────────────────────
    function _scatterCoins(count) {
        var coins = ['\uD83E\uDE99', '\uD83D\uDCB0', '\u2728', '\uD83D\uDCB5']; // coin, money bag, sparkle, bill
        for (var i = 0; i < count; i++) {
            (function (idx) {
                var el = document.createElement('span');
                el.className = 'piggy-coin';
                el.textContent = coins[idx % coins.length];

                // Start from center-ish
                var startX = window.innerWidth / 2 - 12;
                var startY = window.innerHeight / 2 - 12;
                el.style.left = startX + 'px';
                el.style.top  = startY + 'px';

                // Random scatter direction
                var angle = (Math.PI * 2 / count) * idx + (Math.random() * 0.5 - 0.25);
                var dist  = 120 + Math.random() * 160;
                el.style.setProperty('--cx', Math.cos(angle) * dist + 'px');
                el.style.setProperty('--cy', Math.sin(angle) * dist + 'px');
                el.style.animationDelay = (idx * 40) + 'ms';

                document.body.appendChild(el);
                setTimeout(function () {
                    if (el.parentNode) el.parentNode.removeChild(el);
                }, 1200);
            })(i);
        }
    }

    // ── Deposit Logic (called on loss) ──────────────────────────
    function _depositOnLoss(bet, gameId) {
        if (_state.amount >= PIGGY_CAPACITY) return; // already full

        var pct = DEPOSIT_MIN_PCT + Math.random() * (DEPOSIT_MAX_PCT - DEPOSIT_MIN_PCT);
        var deposit = Math.round(bet * pct * 100) / 100;
        if (deposit < 0.01) deposit = 0.01;

        // Don't exceed capacity
        var room = Math.round((PIGGY_CAPACITY - _state.amount) * 100) / 100;
        if (deposit > room) deposit = room;

        _state.amount = Math.round((_state.amount + deposit) * 100) / 100;
        _state.history.unshift({
            date:    Date.now(),
            bet:     bet,
            deposit: deposit,
            gameId:  gameId || null
        });
        if (_state.history.length > MAX_HISTORY) _state.history = _state.history.slice(0, MAX_HISTORY);

        _save();
        _updateFab();

        // If just became full, show a subtle toast
        if (_state.amount >= PIGGY_CAPACITY) {
            if (typeof showToast === 'function') {
                showToast('Your piggy bank is FULL! Tap the pig to smash it!', 'success', 5000);
            }
        }
    }

    // ── Hook into displayServerWinResult ────────────────────────
    function _hookSpinResult() {
        var _origFn = window.displayServerWinResult;
        if (typeof _origFn !== 'function') return;

        window.displayServerWinResult = function (result, game) {
            // Call original first
            _origFn.call(this, result, game);

            // Check if it was a loss (winAmount === 0 or not present)
            var winAmt = (result && typeof result.winAmount === 'number') ? result.winAmount : 0;
            if (winAmt <= 0) {
                var bet = (typeof currentBet === 'number' && currentBet > 0) ? currentBet : 0;
                var gId = (typeof currentGame !== 'undefined' && currentGame && currentGame.id) ? currentGame.id : null;
                if (bet > 0) {
                    _depositOnLoss(bet, gId);
                }
            }
        };
    }

    // ── Utility ─────────────────────────────────────────────────
    function _fmtMoney(val) {
        if (typeof formatMoney === 'function') return formatMoney(val);
        return '$' + (val || 0).toFixed(2);
    }

    function _fmtShort(val) {
        if (val >= 10) return '$' + Math.floor(val);
        if (val >= 1)  return '$' + val.toFixed(1);
        if (val > 0)   return '$' + val.toFixed(2);
        return '$0';
    }

    function _shortDate(ts) {
        if (!ts) return '';
        var d = new Date(ts);
        var h = d.getHours();
        var m = d.getMinutes();
        return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
    }

    // ── Init ────────────────────────────────────────────────────
    function initPiggyBank() {
        if (_initialised) return;
        if (_isQA()) return;
        _initialised = true;

        _injectStyles();
        _load();
        _createFab();
        _hookSpinResult();
    }

    // ── Expose ──────────────────────────────────────────────────
    window.initPiggyBank          = initPiggyBank;
    window.piggyBankOnSpinResult  = function (result) {
        if (_isQA()) return;
        var winAmt = (result && typeof result.winAmount === 'number') ? result.winAmount : 0;
        if (winAmt <= 0) {
            var bet = (typeof currentBet === 'number' && currentBet > 0) ? currentBet : 0;
            var gId = (typeof currentGame !== 'undefined' && currentGame && currentGame.id) ? currentGame.id : null;
            if (bet > 0) _depositOnLoss(bet, gId);
        }
    };

}());
