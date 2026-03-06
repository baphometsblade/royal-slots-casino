// Sprint 76: Lucky Time — Dynamic Multiplier Events
// Random 2x/3x win multiplier windows with countdown timers.
// Creates urgency: "bet NOW while the multiplier is active!"
// Activates after 3-8 min of gameplay, lasts 60-180s, then 10-20min cooldown.
(function() {
    'use strict';

    // ── Config ────────────────────────────────────────────────
    var MIN_DELAY_MS   = 180000;   // 3 min before first event
    var MAX_DELAY_MS   = 480000;   // 8 min max wait
    var MIN_DURATION   = 60;       // 60s minimum event duration
    var MAX_DURATION   = 180;      // 180s maximum event duration
    var COOLDOWN_MS    = 600000;   // 10 min cooldown between events
    var MULTIPLIERS    = [
        { mult: 2, label: '2\u00D7 WINS', color: '#22c55e', glow: 'rgba(34,197,94,0.4)' },
        { mult: 3, label: '3\u00D7 WINS', color: '#f59e0b', glow: 'rgba(245,158,11,0.5)' }
    ];
    var WEIGHT_2X = 0.75; // 75% chance of 2x, 25% chance of 3x

    // ── State ─────────────────────────────────────────────────
    var _active       = false;
    var _currentMult  = 1;
    var _timer        = null;
    var _countdown    = 0;
    var _tickInterval = null;
    var _stylesInjected = false;
    var _bannerEl     = null;
    var _lastEventEnd = 0;

    // ── Styles ────────────────────────────────────────────────
    function injectStyles() {
        if (_stylesInjected) return;
        _stylesInjected = true;
        var s = document.createElement('style');
        s.id = 'luckyTimeStyles';
        s.textContent = [
            '#ltBanner{position:fixed;top:0;left:0;right:0;z-index:20000;' +
                'height:44px;display:flex;align-items:center;justify-content:center;gap:12px;' +
                'font-family:inherit;transform:translateY(-100%);transition:transform .4s cubic-bezier(.34,1.56,.64,1)}',
            '#ltBanner.active{transform:translateY(0)}',
            '.lt-icon{font-size:22px;animation:lt-spin 2s linear infinite}',
            '@keyframes lt-spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}',
            '.lt-label{font-size:15px;font-weight:900;letter-spacing:1.5px;text-transform:uppercase;text-shadow:0 1px 4px rgba(0,0,0,.5)}',
            '.lt-timer{font-size:14px;font-weight:700;background:rgba(0,0,0,.4);padding:2px 10px;border-radius:6px;min-width:50px;text-align:center;letter-spacing:1px}',
            '.lt-pulse{animation:lt-pulse-anim 1.2s ease-in-out infinite}',
            '@keyframes lt-pulse-anim{0%,100%{opacity:1}50%{opacity:.7}}',
            '#ltBanner .lt-cta{font-size:11px;font-weight:700;background:rgba(255,255,255,.2);' +
                'padding:3px 10px;border-radius:5px;color:#fff;cursor:default;letter-spacing:.5px}'
        ].join('\n');
        document.head.appendChild(s);
    }

    // ── Banner ────────────────────────────────────────────────
    function buildBanner() {
        if (_bannerEl) return;
        injectStyles();
        _bannerEl = document.createElement('div');
        _bannerEl.id = 'ltBanner';

        var icon = document.createElement('span');
        icon.className = 'lt-icon';
        icon.textContent = '\u2728';

        var label = document.createElement('span');
        label.className = 'lt-label';
        label.id = 'ltLabel';

        var timer = document.createElement('span');
        timer.className = 'lt-timer lt-pulse';
        timer.id = 'ltTimer';

        var cta = document.createElement('span');
        cta.className = 'lt-cta';
        cta.textContent = 'BET NOW!';

        _bannerEl.appendChild(icon);
        _bannerEl.appendChild(label);
        _bannerEl.appendChild(timer);
        _bannerEl.appendChild(cta);
        document.body.appendChild(_bannerEl);
    }

    function showBanner(config) {
        buildBanner();
        _bannerEl.style.background = 'linear-gradient(135deg, ' + config.color + ', ' + config.color + 'cc)';
        _bannerEl.style.boxShadow = '0 4px 20px ' + config.glow;
        var label = document.getElementById('ltLabel');
        if (label) {
            label.textContent = '\u26A1 LUCKY TIME: ' + config.label + ' \u26A1';
            label.style.color = '#fff';
        }
        requestAnimationFrame(function() {
            requestAnimationFrame(function() { _bannerEl.classList.add('active'); });
        });
    }

    function hideBanner() {
        if (_bannerEl) _bannerEl.classList.remove('active');
    }

    function updateTimer(seconds) {
        var el = document.getElementById('ltTimer');
        if (!el) return;
        var m = Math.floor(seconds / 60);
        var s = seconds % 60;
        el.textContent = (m > 0 ? m + ':' : '') + (s < 10 ? '0' : '') + s;
        // Urgency: flash red in last 15 seconds
        if (seconds <= 15) {
            el.style.color = '#ef4444';
            el.style.background = 'rgba(239,68,68,.25)';
        } else {
            el.style.color = '';
            el.style.background = '';
        }
    }

    // ── Event lifecycle ───────────────────────────────────────
    function startEvent() {
        if (_active) return;
        // Don't run if not on a slot page
        if (typeof currentGame === 'undefined' || !currentGame) {
            scheduleNext();
            return;
        }

        _active = true;
        var roll = Math.random();
        var config = roll < WEIGHT_2X ? MULTIPLIERS[0] : MULTIPLIERS[1];
        _currentMult = config.mult;

        // Duration: random between MIN and MAX
        _countdown = MIN_DURATION + Math.floor(Math.random() * (MAX_DURATION - MIN_DURATION + 1));

        showBanner(config);
        updateTimer(_countdown);

        // Tick every second
        _tickInterval = setInterval(function() {
            _countdown--;
            updateTimer(_countdown);
            if (_countdown <= 0) {
                endEvent();
            }
        }, 1000);

        // Show a notification toast
        if (typeof showWinToast === 'function') {
            showWinToast('\u26A1 Lucky Time: ' + config.label + '!', 'epic');
        }
    }

    function endEvent() {
        _active = false;
        _currentMult = 1;
        if (_tickInterval) { clearInterval(_tickInterval); _tickInterval = null; }
        hideBanner();
        _lastEventEnd = Date.now();
        scheduleNext();
    }

    function scheduleNext() {
        if (_timer) clearTimeout(_timer);
        var delay = MIN_DELAY_MS + Math.floor(Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS));
        // Respect cooldown
        var sinceLast = Date.now() - _lastEventEnd;
        if (sinceLast < COOLDOWN_MS) {
            delay = Math.max(delay, COOLDOWN_MS - sinceLast);
        }
        _timer = setTimeout(startEvent, delay);
    }

    // ── Public API (for win-logic integration) ────────────────
    window.getLuckyTimeMultiplier = function() {
        return _active ? _currentMult : 1;
    };

    window.isLuckyTimeActive = function() {
        return _active;
    };

    // ── Hook into win processing ──────────────────────────────
    // Wrap displayServerWinResult to multiply winAmount during Lucky Time
    function hookWinResult() {
        var _origDSWR = window.displayServerWinResult;
        if (typeof _origDSWR !== 'function') return;

        window.displayServerWinResult = function(result, game) {
            // Apply Lucky Time multiplier to win amount
            if (_active && _currentMult > 1 && result && result.winAmount > 0) {
                var bonus = result.winAmount * (_currentMult - 1);
                bonus = Math.round(bonus * 100) / 100;
                result.winAmount = Math.round((result.winAmount + bonus) * 100) / 100;
                // Adjust server balance to include bonus (client-side credit)
                if (typeof result.balance === 'number' || typeof result.balance === 'string') {
                    var bal = Number(result.balance);
                    if (Number.isFinite(bal)) {
                        result.balance = bal + bonus;
                    }
                }
            }
            _origDSWR.call(this, result, game);
        };
    }

    // ── Init ──────────────────────────────────────────────────
    function init() {
        hookWinResult();
        // Start scheduling after initial delay
        scheduleNext();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        setTimeout(init, 0);
    }
}());
