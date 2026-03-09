/* ui-happyhour.js -- Happy Hour Events (Sprint 37)
 * Scheduled engagement boost: lunch [12-13] and evening [18-20] happy hours.
 * 2x Win Multiplier during active windows, countdown timer, teaser between.
 * Self-contained IIFE, no ES modules, createElement only.
 */
(function () {
    'use strict';

    // ── Config ───────────────────────────────────────────────────
    var STORAGE_KEY = 'ms_happyHour';
    var TEASER_DISMISS_DURATION = 60 * 60 * 1000;  // 1 hour
    var CHECK_INTERVAL = 5 * 60 * 1000;             // 5 min check when not active
    var HAPPY_HOURS = [[12, 13], [18, 19, 20]];      // lunch + evening windows
    var MULTIPLIER = 2;

    // ── State ────────────────────────────────────────────────────
    var _bannerEl = null;
    var _tickInterval = null;
    var _checkInterval = null;
    var _stylesInjected = false;

    // ── Styles ───────────────────────────────────────────────────
    function _injectStyles() {
        if (_stylesInjected) return;
        _stylesInjected = true;
        var s = document.createElement('style');
        s.id = 'happyHourStyles37';
        s.textContent = [
            '#happyHourBar{position:fixed;top:0;left:0;right:0;z-index:10400;',
            '  height:46px;display:flex;align-items:center;justify-content:center;gap:12px;',
            '  font-family:inherit;transform:translateY(-100%);transition:transform .5s cubic-bezier(.34,1.56,.64,1);',
            '  background:linear-gradient(135deg,#ffd700,#9333ea);',
            '  box-shadow:0 4px 24px rgba(147,51,234,.4);color:#fff}',
            '#happyHourBar.hh-visible{transform:translateY(0)}',
            '#happyHourBar.hh-teaser{background:linear-gradient(135deg,#1a1a2e,#2d1b69);',
            '  box-shadow:0 4px 16px rgba(0,0,0,.4);height:36px}',
            '.hh-clock{font-size:20px;flex-shrink:0}',
            '.hh-text{font-size:14px;font-weight:800;letter-spacing:1px;text-transform:uppercase;',
            '  text-shadow:0 1px 4px rgba(0,0,0,.4)}',
            '.hh-teaser .hh-text{font-size:12px;font-weight:600;color:#c8b8e8;letter-spacing:.5px}',
            '.hh-mult{font-size:13px;font-weight:900;background:rgba(0,0,0,.3);padding:3px 10px;',
            '  border-radius:6px;animation:hh-pulse37 1.5s ease-in-out infinite}',
            '@keyframes hh-pulse37{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.08);opacity:.85}}',
            '.hh-timer{font-size:13px;font-weight:700;background:rgba(0,0,0,.3);padding:3px 10px;',
            '  border-radius:6px;min-width:65px;text-align:center;letter-spacing:1px}',
            '.hh-dismiss{background:none;border:none;color:rgba(255,255,255,.6);font-size:16px;',
            '  cursor:pointer;padding:2px 8px;margin-left:4px;flex-shrink:0}',
            '.hh-dismiss:hover{color:#fff}'
        ].join('\n');
        document.head.appendChild(s);
    }

    // ── Time helpers ─────────────────────────────────────────────
    function _isHappyHourActive() {
        var hour = new Date().getHours();
        for (var i = 0; i < HAPPY_HOURS.length; i++) {
            for (var j = 0; j < HAPPY_HOURS[i].length; j++) {
                if (hour === HAPPY_HOURS[i][j]) return true;
            }
        }
        return false;
    }

    function _getActiveEndTime() {
        var now = new Date();
        var hour = now.getHours();
        // Find the end of current happy hour window
        for (var i = 0; i < HAPPY_HOURS.length; i++) {
            var window_ = HAPPY_HOURS[i];
            var idx = window_.indexOf(hour);
            if (idx !== -1) {
                var lastHour = window_[window_.length - 1];
                var end = new Date(now);
                end.setHours(lastHour + 1, 0, 0, 0);
                return end;
            }
        }
        return null;
    }

    function _getNextHappyHourStart() {
        var now = new Date();
        var hour = now.getHours();
        // Collect all start hours
        var startHours = [];
        for (var i = 0; i < HAPPY_HOURS.length; i++) {
            startHours.push(HAPPY_HOURS[i][0]);
        }
        startHours.sort(function (a, b) { return a - b; });

        // Find next start after current hour
        for (var k = 0; k < startHours.length; k++) {
            if (startHours[k] > hour) {
                var next = new Date(now);
                next.setHours(startHours[k], 0, 0, 0);
                return next;
            }
        }
        // Next day first window
        var tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(startHours[0], 0, 0, 0);
        return tomorrow;
    }

    function _fmtCountdown(ms) {
        if (ms <= 0) return '0:00';
        var totalSec = Math.floor(ms / 1000);
        var h = Math.floor(totalSec / 3600);
        var m = Math.floor((totalSec % 3600) / 60);
        var sec = totalSec % 60;
        if (h > 0) {
            return h + ':' + (m < 10 ? '0' : '') + m + ':' + (sec < 10 ? '0' : '') + sec;
        }
        return m + ':' + (sec < 10 ? '0' : '') + sec;
    }

    // ── Dismiss persistence ──────────────────────────────────────
    function _isTeaserDismissed() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return false;
            var data = JSON.parse(raw);
            if (data.teaserDismissedAt && Date.now() - data.teaserDismissedAt < TEASER_DISMISS_DURATION) return true;
        } catch (e) { /* ignore */ }
        return false;
    }

    function _saveTeaserDismissed() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ teaserDismissedAt: Date.now() }));
        } catch (e) { /* ignore */ }
    }

    // ── DOM creation ─────────────────────────────────────────────
    function _buildBanner() {
        if (_bannerEl) return;
        _injectStyles();

        var bar = document.createElement('div');
        bar.id = 'happyHourBar';

        // Clock icon
        var clock = document.createElement('span');
        clock.className = 'hh-clock';
        clock.textContent = '\u23F0';

        // Text
        var text = document.createElement('span');
        text.className = 'hh-text';
        text.id = 'hhText37';
        text.textContent = 'HAPPY HOUR';

        // Multiplier badge
        var mult = document.createElement('span');
        mult.className = 'hh-mult';
        mult.id = 'hhMult37';
        mult.textContent = MULTIPLIER + '\u00D7 Win Multiplier';

        // Timer
        var timer = document.createElement('span');
        timer.className = 'hh-timer';
        timer.id = 'hhTimer37';
        timer.textContent = '';

        // Dismiss button
        var dismiss = document.createElement('button');
        dismiss.className = 'hh-dismiss';
        dismiss.textContent = '\u2715';
        dismiss.addEventListener('click', function () {
            _dismissTeaser();
        });

        bar.appendChild(clock);
        bar.appendChild(text);
        bar.appendChild(mult);
        bar.appendChild(timer);
        bar.appendChild(dismiss);

        document.body.appendChild(bar);
        _bannerEl = bar;
    }

    // ── Display states ───────────────────────────────────────────
    function _showActive() {
        _buildBanner();
        _bannerEl.classList.remove('hh-teaser');
        _bannerEl.classList.add('hh-visible');

        var textEl = document.getElementById('hhText37');
        var multEl = document.getElementById('hhMult37');
        if (textEl) textEl.textContent = 'HAPPY HOUR!';
        if (multEl) {
            multEl.textContent = MULTIPLIER + '\u00D7 Win Multiplier Active';
            multEl.style.display = '';
        }
    }

    function _showTeaser() {
        if (_isTeaserDismissed()) {
            _hideBanner();
            return;
        }
        _buildBanner();
        _bannerEl.classList.add('hh-teaser');
        _bannerEl.classList.add('hh-visible');

        var textEl = document.getElementById('hhText37');
        var multEl = document.getElementById('hhMult37');
        if (textEl) textEl.textContent = 'Next Happy Hour in';
        if (multEl) multEl.style.display = 'none';
    }

    function _hideBanner() {
        if (_bannerEl) _bannerEl.classList.remove('hh-visible');
    }

    function _dismissTeaser() {
        _hideBanner();
        _saveTeaserDismissed();
        if (_tickInterval) { clearInterval(_tickInterval); _tickInterval = null; }
        // Re-check periodically in case happy hour starts
        if (!_checkInterval) {
            _checkInterval = setInterval(_periodicCheck, CHECK_INTERVAL);
        }
    }

    // ── Tick ──────────────────────────────────────────────────────
    function _tick() {
        if (_isHappyHourActive()) {
            _showActive();
            var end = _getActiveEndTime();
            var timerEl = document.getElementById('hhTimer37');
            if (end && timerEl) {
                var remaining = end.getTime() - Date.now();
                timerEl.textContent = 'Ends in ' + _fmtCountdown(remaining);
                if (remaining <= 0) {
                    _hideBanner();
                    _stopTick();
                    // Switch to teaser mode after cooldown
                    setTimeout(_periodicCheck, 60000);
                }
            }
        } else {
            // Show teaser with countdown to next happy hour
            var next = _getNextHappyHourStart();
            var msUntil = next.getTime() - Date.now();
            if (msUntil <= 0) {
                // Should be active now, re-check
                _periodicCheck();
                return;
            }
            _showTeaser();
            var timerEl2 = document.getElementById('hhTimer37');
            if (timerEl2) {
                timerEl2.textContent = _fmtCountdown(msUntil);
            }
        }
    }

    function _startTick() {
        if (_tickInterval) clearInterval(_tickInterval);
        _tick();
        _tickInterval = setInterval(_tick, 1000);
    }

    function _stopTick() {
        if (_tickInterval) { clearInterval(_tickInterval); _tickInterval = null; }
    }

    // ── Periodic check (when not ticking) ────────────────────────
    function _periodicCheck() {
        if (_isHappyHourActive()) {
            // Start ticking for active happy hour
            if (_checkInterval) { clearInterval(_checkInterval); _checkInterval = null; }
            _startTick();
        } else if (!_isTeaserDismissed()) {
            // Show teaser
            if (_checkInterval) { clearInterval(_checkInterval); _checkInterval = null; }
            _startTick();
        }
    }

    // ── Public API ───────────────────────────────────────────────
    window._isHappyHourActive = function () {
        return _isHappyHourActive();
    };

    window._getHappyHourMultiplier = function () {
        return _isHappyHourActive() ? MULTIPLIER : 1;
    };

    // ── Init ─────────────────────────────────────────────────────
    function _init() {
        try {
            if (new URLSearchParams(location.search).get('noBonus') === '1') return;
        } catch (e) { /* ignore */ }

        if (_isHappyHourActive()) {
            // Immediately show active banner
            _startTick();
        } else {
            // Start periodic checks
            _checkInterval = setInterval(_periodicCheck, CHECK_INTERVAL);
            // Also check once on init for teaser
            _periodicCheck();
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { setTimeout(_init, 1500); });
    } else {
        setTimeout(_init, 1500);
    }
})();
