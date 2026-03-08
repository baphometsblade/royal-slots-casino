/* ui-winmultiplier.js \u2014 Periodic Win Multiplier Events
 * Sprint 32: Random 2x/3x multiplier events that create urgency.
 * Self-contained IIFE; exposes globals for other code to check.
 */
(function () {
    'use strict';

    var STORAGE_KEY = 'ms_winMultData';
    var EVENT_DURATION = 300;              // 5 minutes in seconds
    var MULTIPLIERS = [2, 2, 2, 3];       // 75% chance 2x, 25% chance 3x
    var CHECK_INTERVAL = 300000;           // check every 5 min
    var MIN_GAP_MS = 1800000;              // min 30 min between events
    var GOLD = '#fbbf24';

    var _active = false;
    var _multiplier = 1;
    var _endTime = 0;
    var _tickInterval = null;
    var _checkInterval = null;

    // \u2500\u2500 Toast helper \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
    function _toast(msg) {
        var t = document.createElement('div');
        t.style.cssText = [
            'position:fixed', 'bottom:80px', 'left:50%', 'transform:translateX(-50%)',
            'background:linear-gradient(135deg,' + GOLD + ',#f59e0b)', 'color:#000',
            'padding:12px 22px', 'border-radius:10px', 'font-weight:800',
            'font-size:14px', 'z-index:99999', 'box-shadow:0 4px 20px rgba(0,0,0,.5)',
            'pointer-events:none', 'text-align:center', 'max-width:320px'
        ].join(';');
        t.textContent = msg;
        document.body.appendChild(t);
        setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 4000);
    }

    // \u2500\u2500 Format mm:ss \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
    function _fmtSecs(secs) {
        if (secs <= 0) return '00:00';
        var m = Math.floor(secs / 60);
        var s = secs % 60;
        return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
    }

    // \u2500\u2500 Pick a random multiplier \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
    function _pickMultiplier() {
        var idx = Math.floor(Math.random() * MULTIPLIERS.length);
        return MULTIPLIERS[idx];
    }

    // \u2500\u2500 Show / hide banner \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
    function _showBanner() {
        var banner = document.getElementById('winMultiplierBanner');
        if (!banner) return;
        var label = banner.querySelector('.wme-label');
        var timer = document.getElementById('wmeTimer');
        if (label) label.textContent = '\uD83D\uDD25 ' + _multiplier + 'x WIN MULTIPLIER ACTIVE';
        if (timer) timer.textContent = _fmtSecs(EVENT_DURATION);
        banner.style.display = 'flex';
        banner.style.transform = 'translateY(-100%)';
        banner.style.transition = 'transform 0.4s ease';
        // Force reflow then animate in
        void banner.offsetHeight;
        banner.style.transform = 'translateY(0)';
    }

    function _hideBanner() {
        var banner = document.getElementById('winMultiplierBanner');
        if (!banner) return;
        banner.style.transform = 'translateY(-100%)';
        setTimeout(function () { banner.style.display = 'none'; }, 400);
    }

    // \u2500\u2500 Countdown tick \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
    function _tick() {
        var remaining = Math.max(0, Math.floor((_endTime - Date.now()) / 1000));
        var timer = document.getElementById('wmeTimer');
        if (timer) timer.textContent = _fmtSecs(remaining);

        if (remaining <= 0) {
            _deactivate();
        }
    }

    // \u2500\u2500 Activate / deactivate event \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
    function _activate() {
        _multiplier = _pickMultiplier();
        _active = true;
        _endTime = Date.now() + EVENT_DURATION * 1000;

        window._winMultiplierActive = true;
        window._winMultiplierValue = _multiplier;

        _showBanner();
        _toast('\uD83D\uDD25 ' + _multiplier + 'x Win Multiplier activated for 5 minutes!');
        _tickInterval = setInterval(_tick, 1000);

        // Record last event time
        try { localStorage.setItem(STORAGE_KEY, String(Date.now())); } catch (e) {}
    }

    function _deactivate() {
        _active = false;
        _multiplier = 1;
        window._winMultiplierActive = false;
        window._winMultiplierValue = 1;

        if (_tickInterval) { clearInterval(_tickInterval); _tickInterval = null; }
        _hideBanner();
    }

    // \u2500\u2500 Periodic check \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
    function _check() {
        if (_active) return;

        // Enforce minimum gap between events
        try {
            var last = parseInt(localStorage.getItem(STORAGE_KEY), 10);
            if (last && (Date.now() - last) < MIN_GAP_MS) return;
        } catch (e) {}

        // 20% chance to trigger
        if (Math.random() > 0.2) return;

        _activate();
    }

    // \u2500\u2500 Public API \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
    window.dismissWinMultiplier = function () {
        _hideBanner();
        // Multiplier stays active even when banner is dismissed
    };

    window._isWinMultiplierActive = function () {
        return { active: _active, multiplier: _active ? _multiplier : 1 };
    };

    // \u2500\u2500 Init \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
    function _init() {
        if (window.location.search.indexOf('noBonus=1') !== -1) return;

        // Initialize globals
        window._winMultiplierActive = false;
        window._winMultiplierValue = 1;

        // Start periodic check
        _checkInterval = setInterval(_check, CHECK_INTERVAL);

        // First check after a short delay (30s)
        setTimeout(_check, 30000);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _init);
    } else {
        _init();
    }
})();
