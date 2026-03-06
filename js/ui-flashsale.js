// Sprint 79: Flash Sale / Limited-Time Bonus Offers
// Random time-limited bonus windows (Double XP, Cashback, Bonus Credits, Mega Multiplier)
// appear every 15-30 min, last 2-5 min, with countdown timers to create urgency.
// Drives higher wagering during limited windows and boosts engagement metrics.
(function() {
    'use strict';

    // ── Config ────────────────────────────────────────────────
    var MIN_DELAY_MS    = 900000;   // 15 min before next sale
    var MAX_DELAY_MS    = 1800000;  // 30 min max wait
    var MIN_DURATION    = 120;      // 2 min minimum sale duration (seconds)
    var MAX_DURATION    = 300;      // 5 min maximum sale duration (seconds)
    var COOLDOWN_MS     = 900000;   // 15 min cooldown between sales
    var URGENCY_SECS    = 30;       // Timer turns red in last 30 seconds
    var STORAGE_KEY     = 'flashSaleLastOffer';

    var SALE_TYPES = [
        {
            type: 'double_xp',
            label: 'DOUBLE XP',
            desc: '2\u00D7 XP on every spin!',
            emoji: '\u2B50',
            color: '#8b5cf6',
            gradient: 'linear-gradient(135deg, #7c3aed, #a855f7)',
            glow: 'rgba(139,92,246,0.5)'
        },
        {
            type: 'cashback',
            label: 'CASHBACK',
            desc: '10% of losses returned!',
            emoji: '\uD83D\uDCB0',
            color: '#22c55e',
            gradient: 'linear-gradient(135deg, #16a34a, #22c55e)',
            glow: 'rgba(34,197,94,0.5)'
        },
        {
            type: 'bonus_credits',
            label: 'BONUS CREDITS',
            desc: 'Free credits added!',
            emoji: '\uD83C\uDF81',
            color: '#f59e0b',
            gradient: 'linear-gradient(135deg, #d97706, #f59e0b)',
            glow: 'rgba(245,158,11,0.5)'
        },
        {
            type: 'mega_multiplier',
            label: 'MEGA MULTIPLIER',
            desc: '+50% bonus on next win!',
            emoji: '\uD83D\uDE80',
            color: '#ef4444',
            gradient: 'linear-gradient(135deg, #dc2626, #ef4444)',
            glow: 'rgba(239,68,68,0.5)'
        }
    ];

    // ── State ─────────────────────────────────────────────────
    var _active         = false;
    var _currentSale    = null;      // active SALE_TYPES entry
    var _timer          = null;      // schedule timeout
    var _countdown      = 0;
    var _tickInterval   = null;
    var _stylesInjected = false;
    var _bannerEl       = null;
    var _lastSaleEnd    = 0;

    // Cashback tracking
    var _cashbackLosses = 0;
    var _origDSWR       = null;      // original displayServerWinResult

    // ── Styles ────────────────────────────────────────────────
    function injectStyles() {
        if (_stylesInjected) return;
        _stylesInjected = true;
        var s = document.createElement('style');
        s.id = 'flashSaleStyles';
        s.textContent = [
            '#fsBanner{position:fixed;bottom:80px;left:16px;z-index:25000;' +
                'border-radius:14px;padding:14px 18px;max-width:320px;width:auto;' +
                'font-family:inherit;color:#fff;' +
                'box-shadow:0 4px 30px rgba(0,0,0,.5);' +
                'transform:translateX(-120%);transition:transform .4s cubic-bezier(.34,1.56,.64,1)}',
            '#fsBanner.active{transform:translateX(0)}',
            '.fs-row{display:flex;align-items:center;gap:10px}',
            '.fs-icon{font-size:28px;flex-shrink:0}',
            '.fs-info{flex:1;min-width:0}',
            '.fs-title{font-size:14px;font-weight:900;letter-spacing:1px;text-transform:uppercase;' +
                'text-shadow:0 1px 4px rgba(0,0,0,.5);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
            '.fs-desc{font-size:11px;color:rgba(255,255,255,.75);margin-top:2px}',
            '.fs-timer-row{display:flex;align-items:center;gap:8px;margin-top:8px}',
            '.fs-timer{font-size:16px;font-weight:800;background:rgba(0,0,0,.4);' +
                'padding:3px 12px;border-radius:8px;min-width:56px;text-align:center;' +
                'letter-spacing:1px;transition:color .3s,background .3s}',
            '.fs-timer.urgent{color:#fef2f2;background:rgba(239,68,68,.6);animation:fs-urgentPulse .6s ease-in-out infinite}',
            '@keyframes fs-urgentPulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.8;transform:scale(1.05)}}',
            '.fs-hurry{font-size:11px;font-weight:800;color:#fef08a;letter-spacing:1px;' +
                'animation:fs-hurryBlink .5s ease-in-out infinite;display:none}',
            '.fs-hurry.show{display:inline}',
            '@keyframes fs-hurryBlink{0%,100%{opacity:1}50%{opacity:.4}}',
            '.fs-close{position:absolute;top:6px;right:8px;background:none;border:none;' +
                'color:rgba(255,255,255,.4);font-size:14px;cursor:pointer;padding:2px 6px;line-height:1}',
            '.fs-close:hover{color:rgba(255,255,255,.7)}',
            '.fs-bar{height:3px;border-radius:2px;background:rgba(255,255,255,.15);margin-top:8px;overflow:hidden}',
            '.fs-bar-fill{height:100%;background:rgba(255,255,255,.5);border-radius:2px;transition:width 1s linear}'
        ].join('\n');
        document.head.appendChild(s);
    }

    // ── QA suppression ────────────────────────────────────────
    function isSuppressed() {
        var search = window.location.search || '';
        return search.indexOf('noBonus=1') !== -1 || search.indexOf('qaTools=1') !== -1;
    }

    // ── Bonus credit amount (scaled to current bet tier) ─────
    function calcBonusCredits() {
        var bet = (typeof currentBet !== 'undefined') ? currentBet : 1;
        // Scale: $0.50 base + 10% of current bet, capped at $2.00
        var amt = 0.50 + (bet * 0.10);
        amt = Math.round(amt * 100) / 100;
        if (amt < 0.50) amt = 0.50;
        if (amt > 2.00) amt = 2.00;
        return amt;
    }

    // ── Banner UI ─────────────────────────────────────────────
    function buildBanner(sale) {
        injectStyles();
        // Remove old banner
        var old = document.getElementById('fsBanner');
        if (old && old.parentNode) old.parentNode.removeChild(old);

        _bannerEl = document.createElement('div');
        _bannerEl.id = 'fsBanner';
        _bannerEl.style.background = sale.gradient;
        _bannerEl.style.borderLeft = '4px solid ' + sale.color;
        _bannerEl.style.boxShadow = '0 4px 30px ' + sale.glow;
        _bannerEl.style.position = 'fixed';

        // Close button
        var closeBtn = document.createElement('button');
        closeBtn.className = 'fs-close';
        closeBtn.textContent = '\u2715';
        closeBtn.setAttribute('aria-label', 'Dismiss sale');
        closeBtn.addEventListener('click', function() {
            dismiss();
        });

        // Row: icon + info
        var row = document.createElement('div');
        row.className = 'fs-row';

        var icon = document.createElement('span');
        icon.className = 'fs-icon';
        icon.textContent = sale.emoji;

        var info = document.createElement('div');
        info.className = 'fs-info';

        var title = document.createElement('div');
        title.className = 'fs-title';
        title.textContent = '\u26A1 ' + sale.label;

        var desc = document.createElement('div');
        desc.className = 'fs-desc';
        desc.textContent = sale.desc;

        info.appendChild(title);
        info.appendChild(desc);
        row.appendChild(icon);
        row.appendChild(info);

        // Timer row
        var timerRow = document.createElement('div');
        timerRow.className = 'fs-timer-row';

        var timerEl = document.createElement('span');
        timerEl.className = 'fs-timer';
        timerEl.id = 'fsTimer';

        var hurry = document.createElement('span');
        hurry.className = 'fs-hurry';
        hurry.id = 'fsHurry';
        hurry.textContent = 'HURRY!';

        timerRow.appendChild(timerEl);
        timerRow.appendChild(hurry);

        // Progress bar
        var bar = document.createElement('div');
        bar.className = 'fs-bar';
        var barFill = document.createElement('div');
        barFill.className = 'fs-bar-fill';
        barFill.id = 'fsBarFill';
        barFill.style.width = '100%';
        bar.appendChild(barFill);

        _bannerEl.appendChild(closeBtn);
        _bannerEl.appendChild(row);
        _bannerEl.appendChild(timerRow);
        _bannerEl.appendChild(bar);
        document.body.appendChild(_bannerEl);

        requestAnimationFrame(function() {
            requestAnimationFrame(function() { _bannerEl.classList.add('active'); });
        });
    }

    function updateTimer(seconds, totalDuration) {
        var el = document.getElementById('fsTimer');
        var hurry = document.getElementById('fsHurry');
        var barFill = document.getElementById('fsBarFill');
        if (!el) return;

        var m = Math.floor(seconds / 60);
        var s = seconds % 60;
        el.textContent = (m > 0 ? m + ':' : '') + (s < 10 ? '0' : '') + s;

        // Urgency styling in last 30 seconds
        if (seconds <= URGENCY_SECS) {
            el.classList.add('urgent');
            if (hurry) hurry.classList.add('show');
        } else {
            el.classList.remove('urgent');
            if (hurry) hurry.classList.remove('show');
        }

        // Progress bar
        if (barFill && totalDuration > 0) {
            var pct = Math.max(0, (seconds / totalDuration) * 100);
            barFill.style.width = pct + '%';
        }
    }

    function hideBanner() {
        if (_bannerEl) {
            _bannerEl.classList.remove('active');
            var el = _bannerEl;
            setTimeout(function() { if (el.parentNode) el.parentNode.removeChild(el); }, 500);
            _bannerEl = null;
        }
    }

    function dismiss() {
        endSale();
    }

    // ── Sale lifecycle ────────────────────────────────────────
    var _totalDuration = 0;

    function startSale() {
        if (_active) return;
        if (isSuppressed()) { scheduleNext(); return; }

        // Don't run if not on a slot page
        if (typeof currentGame === 'undefined' || !currentGame) {
            scheduleNext();
            return;
        }

        _active = true;

        // Pick a random sale type
        var idx = Math.floor(Math.random() * SALE_TYPES.length);
        _currentSale = SALE_TYPES[idx];

        // Duration: random between MIN and MAX
        _totalDuration = MIN_DURATION + Math.floor(Math.random() * (MAX_DURATION - MIN_DURATION + 1));
        _countdown = _totalDuration;

        // Type-specific setup
        if (_currentSale.type === 'bonus_credits') {
            // Immediately credit bonus
            var bonusAmt = calcBonusCredits();
            if (typeof balance !== 'undefined') balance += bonusAmt;
            if (typeof updateBalance === 'function') updateBalance();
            if (typeof saveBalance === 'function') saveBalance();
            // Update desc to show actual amount
            _currentSale = copyWithDesc(_currentSale, '+$' + bonusAmt.toFixed(2) + ' added to balance!');
        }

        if (_currentSale.type === 'cashback') {
            _cashbackLosses = 0;
        }

        buildBanner(_currentSale);
        updateTimer(_countdown, _totalDuration);

        // Tick every second
        _tickInterval = setInterval(function() {
            _countdown--;
            updateTimer(_countdown, _totalDuration);
            if (_countdown <= 0) {
                endSale();
            }
        }, 1000);

        // Notification toast
        if (typeof showWinToast === 'function') {
            showWinToast('\u26A1 Flash Sale: ' + _currentSale.label + '!', 'epic');
        }

        // Persist cooldown timestamp
        try { localStorage.setItem(STORAGE_KEY, String(Date.now())); } catch (e) { /* ignore */ }
    }

    function endSale() {
        if (!_active) return;

        var endingSale = _currentSale;
        _active = false;

        if (_tickInterval) { clearInterval(_tickInterval); _tickInterval = null; }
        hideBanner();

        // Cashback payout
        if (endingSale && endingSale.type === 'cashback' && _cashbackLosses > 0) {
            var cashback = Math.round(_cashbackLosses * 0.10 * 100) / 100;
            if (cashback > 0) {
                if (typeof balance !== 'undefined') balance += cashback;
                if (typeof updateBalance === 'function') updateBalance();
                if (typeof saveBalance === 'function') saveBalance();
                if (typeof showWinToast === 'function') {
                    showWinToast('\uD83D\uDCB0 Cashback: +$' + cashback.toFixed(2), 'epic');
                }
            }
            _cashbackLosses = 0;
        }

        _currentSale = null;
        _lastSaleEnd = Date.now();
        scheduleNext();
    }

    function scheduleNext() {
        if (_timer) clearTimeout(_timer);
        if (isSuppressed()) return;

        var delay = MIN_DELAY_MS + Math.floor(Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS));
        // Respect cooldown
        var sinceLast = Date.now() - _lastSaleEnd;
        if (sinceLast < COOLDOWN_MS) {
            delay = Math.max(delay, COOLDOWN_MS - sinceLast);
        }
        _timer = setTimeout(startSale, delay);
    }

    // ── Helper: copy sale config with updated desc ────────────
    function copyWithDesc(sale, newDesc) {
        return {
            type: sale.type,
            label: sale.label,
            desc: newDesc,
            emoji: sale.emoji,
            color: sale.color,
            gradient: sale.gradient,
            glow: sale.glow
        };
    }

    // ── Hook into displayServerWinResult for cashback tracking ─
    function hookWinResult() {
        _origDSWR = window.displayServerWinResult;
        if (typeof _origDSWR !== 'function') return;

        window.displayServerWinResult = function(result, game) {
            // Track losses for cashback during active cashback sale
            if (_active && _currentSale && _currentSale.type === 'cashback') {
                if (result && result.winAmount !== undefined) {
                    var bet = (typeof currentBet !== 'undefined') ? currentBet : 0;
                    var net = result.winAmount - bet;
                    if (net < 0) {
                        _cashbackLosses += Math.abs(net);
                    }
                }
            }

            // Apply mega multiplier bonus
            if (_active && _currentSale && _currentSale.type === 'mega_multiplier') {
                if (result && result.winAmount > 0) {
                    var bonus = result.winAmount * 0.50;
                    bonus = Math.round(bonus * 100) / 100;
                    result.winAmount = Math.round((result.winAmount + bonus) * 100) / 100;
                    // Adjust balance in result
                    if (typeof result.balance === 'number' || typeof result.balance === 'string') {
                        var bal = Number(result.balance);
                        if (Number.isFinite(bal)) {
                            result.balance = bal + bonus;
                        }
                    }
                }
            }

            _origDSWR.call(this, result, game);
        };
    }

    // ── Public API ────────────────────────────────────────────
    // For win-logic / XP integration
    window.getFlashSaleMultiplier = function() {
        if (_active && _currentSale && _currentSale.type === 'mega_multiplier') {
            return 1.5;
        }
        return 1;
    };

    window.getFlashSaleXPMultiplier = function() {
        if (_active && _currentSale && _currentSale.type === 'double_xp') {
            return 2;
        }
        return 1;
    };

    window.isFlashSaleActive = function() {
        return _active;
    };

    window.getFlashSaleType = function() {
        return (_active && _currentSale) ? _currentSale.type : null;
    };

    // ── Init ──────────────────────────────────────────────────
    function init() {
        if (isSuppressed()) return;

        // Restore cooldown from storage
        try {
            var last = parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10);
            if (last > 0) _lastSaleEnd = last;
        } catch (e) { /* ignore */ }

        hookWinResult();
        scheduleNext();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        setTimeout(init, 0);
    }
}());
