/* ui-happyhour.js — Happy Hour Banner
 * Sprint 29: Shows a promotional banner during happy hour windows.
 * Happy hours: Weekdays 18:00-22:00 and Weekends 12:00-22:00 (local time).
 * Dynamically creates its own DOM element.
 */
(function () {
    'use strict';

    var HH_KEY      = 'ms_happyHourDismissed';
    var _bannerEl   = null;
    var _tickInterval = null;

    // ── Happy hour schedule ───────────────────────────────────────────────────
    function _isHappyHour() {
        var now  = new Date();
        var day  = now.getDay();   // 0=Sun, 6=Sat
        var hour = now.getHours();
        var isWeekend = (day === 0 || day === 6);
        if (isWeekend) return hour >= 12 && hour < 22;
        return hour >= 18 && hour < 22;
    }

    function _nextHappyHourMs() {
        var now  = new Date();
        var day  = now.getDay();
        var hour = now.getHours();
        var min  = now.getMinutes();
        var sec  = now.getSeconds();

        // Try to find the next happy hour start
        var isWeekend = (day === 0 || day === 6);
        var startHour = isWeekend ? 12 : 18;
        var endHour   = 22;

        if (hour < startHour) {
            // Later today
            return ((startHour - hour - 1) * 3600 + (60 - min - 1) * 60 + (60 - sec)) * 1000;
        } else if (hour >= endHour) {
            // Tomorrow (or later). Find next day's start.
            var nextDay = new Date(now);
            nextDay.setDate(nextDay.getDate() + 1);
            nextDay.setHours(0, 0, 0, 0);
            var nextDayOfWeek = nextDay.getDay();
            var nextStart = (nextDayOfWeek === 0 || nextDayOfWeek === 6) ? 12 : 18;
            nextDay.setHours(nextStart, 0, 0, 0);
            return nextDay.getTime() - now.getTime();
        }
        return 0;
    }

    function _happyHourEndsMs() {
        var now  = new Date();
        var endTime = new Date(now);
        endTime.setHours(22, 0, 0, 0);
        return Math.max(0, endTime.getTime() - now.getTime());
    }

    // ── Formatting ────────────────────────────────────────────────────────────
    function _fmtMs(ms) {
        if (ms <= 0) return '00:00:00';
        var secs = Math.floor(ms / 1000);
        var h = Math.floor(secs / 3600);
        var m = Math.floor((secs % 3600) / 60);
        var s = secs % 60;
        return [h, m, s].map(function (v) { return String(v).padStart(2, '0'); }).join(':');
    }

    // ── DOM creation ─────────────────────────────────────────────────────────
    function _createBanner() {
        if (_bannerEl) return;
        var el = document.createElement('div');
        el.id = 'happyHourBanner';
        el.className = 'happy-hour-banner';
        el.style.display = 'none';
        el.innerHTML =
            '<span class="hh-icon">🔥</span>' +
            '<span class="hh-text" id="hhText"><b>HAPPY HOUR</b> — 3× XP on every spin!</span>' +
            '<span class="hh-timer" id="hhTimer"></span>' +
            '<button class="hh-cta" onclick="if(typeof openSlotLobby===\'function\')openSlotLobby();else document.getElementById(\'slotsSection\')&&document.getElementById(\'slotsSection\').scrollIntoView()">Play Now</button>' +
            '<button class="hh-close" onclick="if(typeof dismissHappyHour===\'function\')dismissHappyHour()">✕</button>';

        // Insert at top of main content area, below header
        var header = document.querySelector('.site-header') || document.querySelector('header');
        if (header && header.parentNode) {
            header.parentNode.insertBefore(el, header.nextSibling);
        } else {
            document.body.insertBefore(el, document.body.firstChild);
        }
        _bannerEl = el;
    }

    // ── Tick function ─────────────────────────────────────────────────────────
    function _tick() {
        if (!_bannerEl) return;
        var timerEl = document.getElementById('hhTimer');
        var textEl  = document.getElementById('hhText');

        if (_isHappyHour()) {
            _bannerEl.style.display = 'flex';
            var remaining = _happyHourEndsMs();
            if (timerEl) timerEl.textContent = 'Ends in ' + _fmtMs(remaining);
            if (textEl)  textEl.innerHTML    = '<b>🔥 HAPPY HOUR!</b> 3× XP on every spin';
            if (remaining <= 0) {
                _bannerEl.style.display = 'none';
                if (_tickInterval) { clearInterval(_tickInterval); _tickInterval = null; }
                setTimeout(_init, 60000); // re-check in 1 minute
            }
        } else {
            _bannerEl.style.display = 'none';
            var nextMs = _nextHappyHourMs();
            if (nextMs > 0 && nextMs < 3600000) {
                // Show "coming soon" strip if within 1h
                _bannerEl.style.display = 'flex';
                if (timerEl) timerEl.textContent = 'Starts in ' + _fmtMs(nextMs);
                if (textEl)  textEl.innerHTML    = '<b>Happy Hour</b> coming up — 3× XP on every spin!';
            }
        }
    }

    // ── Public API ────────────────────────────────────────────────────────────
    window.dismissHappyHour = function () {
        if (_bannerEl) _bannerEl.style.display = 'none';
        try { sessionStorage.setItem(HH_KEY, String(Date.now())); } catch (e) {}
        if (_tickInterval) { clearInterval(_tickInterval); _tickInterval = null; }
    };

    // ── Init ──────────────────────────────────────────────────────────────────
    function _init() {
        // Skip during QA runs (noBonus=1 suppresses all bonus popups)
        try { if (new URLSearchParams(location.search).get('noBonus') === '1') return; } catch (e) {}
        // Don't re-show if dismissed in last 10 min
        try {
            var dismissed = parseInt(sessionStorage.getItem(HH_KEY) || '0', 10);
            if (dismissed && Date.now() - dismissed < 600000) return;
        } catch (e) {}

        _createBanner();
        _tick();
        if (_tickInterval) clearInterval(_tickInterval);
        _tickInterval = setInterval(_tick, 1000);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { setTimeout(_init, 1500); });
    } else {
        setTimeout(_init, 1500);
    }

})();
