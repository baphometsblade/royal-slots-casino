// Sprint 90: Happy Hour Events — Time-of-Day Win Multipliers
// Creates natural play schedules with "appointment TV" effect.
// Lunch Rush, After Work, Night Owl windows plus Weekend Specials.
// Wraps displayServerWinResult to boost wins during active windows.
(function() {
    'use strict';

    // ── QA Suppression ───────────────────────────────────────────
    function isQaSuppressed() {
        var qs = window.location.search || '';
        return qs.indexOf('noBonus=1') !== -1 || qs.indexOf('qaTools=1') !== -1;
    }

    // ── Happy Hour Windows ───────────────────────────────────────
    // Each window: { id, name, startHour, endHour, mult, emoji }
    // Hours are 0-23 in local time. Weekend bonus is separate.
    var TIME_WINDOWS = [
        { id: 'lunch',     name: 'Lunch Rush',  startHour: 12, endHour: 13, mult: 1.5, emoji: '\uD83C\uDF54' },
        { id: 'afterwork', name: 'After Work',  startHour: 17, endHour: 18, mult: 1.5, emoji: '\uD83C\uDF78' },
        { id: 'nightowl',  name: 'Night Owl',   startHour: 22, endHour: 23, mult: 2.0, emoji: '\uD83E\uDD89' }
    ];

    var WEEKEND_BONUS = {
        id: 'weekend',
        name: 'Weekend Special',
        mult: 1.25,
        emoji: '\uD83C\uDF89'
    };

    var CHECK_INTERVAL_MS = 30000; // Check every 30 seconds

    // ── State ────────────────────────────────────────────────────
    var _activeWindow    = null;   // current time window (or null)
    var _isWeekend       = false;
    var _effectiveMult   = 1;
    var _countdown       = 0;     // seconds until window ends
    var _tickInterval    = null;
    var _checkInterval   = null;
    var _stylesInjected  = false;
    var _bannerEl        = null;
    var _lastWindowId    = null;  // to detect transitions

    // ── Time helpers ─────────────────────────────────────────────
    function getNow() {
        return new Date();
    }

    function isWeekendDay(date) {
        var day = date.getDay();
        return day === 0 || day === 6; // Sunday=0, Saturday=6
    }

    function getActiveTimeWindow(date) {
        var hour = date.getHours();
        for (var i = 0; i < TIME_WINDOWS.length; i++) {
            var w = TIME_WINDOWS[i];
            if (hour >= w.startHour && hour < w.endHour) {
                return w;
            }
        }
        return null;
    }

    function getSecondsUntilEnd(date, endHour) {
        var endDate = new Date(date);
        endDate.setHours(endHour, 0, 0, 0);
        var diff = Math.floor((endDate.getTime() - date.getTime()) / 1000);
        return Math.max(0, diff);
    }

    function computeMultiplier(timeWindow, weekend) {
        var m = 1;
        if (timeWindow) m = timeWindow.mult;
        if (weekend) m = m * WEEKEND_BONUS.mult;
        // Round to 2 decimals
        return Math.round(m * 100) / 100;
    }

    function formatCountdown(seconds) {
        var m = Math.floor(seconds / 60);
        var s = seconds % 60;
        return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
    }

    function fmtMult(m) {
        return m + '\u00D7';
    }

    // ── Styles ───────────────────────────────────────────────────
    function injectStyles() {
        if (_stylesInjected) return;
        _stylesInjected = true;
        var s = document.createElement('style');
        s.id = 'happyHourStyles';
        s.textContent = [
            '#hhBanner{position:fixed;top:0;left:0;right:0;z-index:19500;' +
                'height:42px;display:flex;align-items:center;justify-content:center;gap:10px;' +
                'font-family:inherit;transform:translateY(-100%);' +
                'transition:transform .4s cubic-bezier(.34,1.56,.64,1);' +
                'background:linear-gradient(135deg,#f59e0b,#d97706);' +
                'box-shadow:0 4px 16px rgba(245,158,11,.35)}',
            '#hhBanner.active{transform:translateY(0)}',
            '#hhBanner .hh-close{position:absolute;right:10px;top:50%;transform:translateY(-50%);' +
                'background:rgba(0,0,0,.25);border:none;color:#fff;font-size:16px;' +
                'line-height:1;width:24px;height:24px;border-radius:50%;cursor:pointer;' +
                'display:flex;align-items:center;justify-content:center;padding:0;' +
                'transition:background .2s}',
            '#hhBanner .hh-close:hover{background:rgba(0,0,0,.45)}',
            '.hh-emoji{font-size:20px}',
            '.hh-label{font-size:14px;font-weight:900;color:#fff;letter-spacing:1.2px;' +
                'text-shadow:0 1px 3px rgba(0,0,0,.4);text-transform:uppercase}',
            '.hh-mult{font-size:15px;font-weight:900;color:#fef3c7;' +
                'background:rgba(0,0,0,.25);padding:2px 8px;border-radius:5px}',
            '.hh-timer{font-size:13px;font-weight:700;color:#fff;' +
                'background:rgba(0,0,0,.3);padding:2px 10px;border-radius:6px;' +
                'min-width:58px;text-align:center;letter-spacing:1px}',
            '.hh-timer.urgent{color:#fca5a5;background:rgba(239,68,68,.3)}',
            '.hh-weekend{font-size:11px;font-weight:700;color:#fef9c3;' +
                'background:rgba(255,255,255,.15);padding:2px 8px;border-radius:4px}',
            '@keyframes hh-shimmer{0%{background-position:200% center}100%{background-position:-200% center}}',
            '#hhBanner.night{background:linear-gradient(135deg,#312e81,#4338ca);' +
                'box-shadow:0 4px 16px rgba(67,56,202,.35)}',
            '#hhBanner.lunch{background:linear-gradient(135deg,#ea580c,#f97316);' +
                'box-shadow:0 4px 16px rgba(249,115,22,.35)}'
        ].join('\n');
        document.head.appendChild(s);
    }

    // ── Banner UI ────────────────────────────────────────────────
    function buildBanner() {
        if (_bannerEl) return;
        injectStyles();

        _bannerEl = document.createElement('div');
        _bannerEl.id = 'hhBanner';

        var emoji = document.createElement('span');
        emoji.className = 'hh-emoji';
        emoji.id = 'hhEmoji';

        var label = document.createElement('span');
        label.className = 'hh-label';
        label.id = 'hhLabel';

        var mult = document.createElement('span');
        mult.className = 'hh-mult';
        mult.id = 'hhMult';

        var timer = document.createElement('span');
        timer.className = 'hh-timer';
        timer.id = 'hhTimer';

        var weekend = document.createElement('span');
        weekend.className = 'hh-weekend';
        weekend.id = 'hhWeekend';

        var closeBtn = document.createElement('button');
        closeBtn.className = 'hh-close';
        closeBtn.id = 'hhClose';
        closeBtn.title = 'Dismiss';
        closeBtn.textContent = '\u00D7';
        closeBtn.addEventListener('click', function() {
            hideBanner();
            // Suppress for remainder of this browser session
            try { sessionStorage.setItem('hhBannerDismissed', '1'); } catch(e) {}
        });

        _bannerEl.appendChild(emoji);
        _bannerEl.appendChild(label);
        _bannerEl.appendChild(mult);
        _bannerEl.appendChild(timer);
        _bannerEl.appendChild(weekend);
        _bannerEl.appendChild(closeBtn);
        document.body.appendChild(_bannerEl);
    }

    function showBanner() {
        buildBanner();
        if (!_activeWindow && !_isWeekend) {
            hideBanner();
            return;
        }
        // If user dismissed the banner this session, don't re-show
        try {
            if (sessionStorage.getItem('hhBannerDismissed') === '1') return;
        } catch(e) {}

        var emojiEl   = document.getElementById('hhEmoji');
        var labelEl   = document.getElementById('hhLabel');
        var multEl    = document.getElementById('hhMult');
        var timerEl   = document.getElementById('hhTimer');
        var weekendEl = document.getElementById('hhWeekend');

        // Theme by window type
        _bannerEl.className = '';  // reset
        if (_activeWindow) {
            if (emojiEl) emojiEl.textContent = _activeWindow.emoji;
            if (labelEl) labelEl.textContent = '\uD83C\uDF89 HAPPY HOUR: ' + _activeWindow.name;
            if (multEl)  multEl.textContent = fmtMult(_effectiveMult) + ' Wins';
            if (timerEl) {
                timerEl.style.display = '';
                timerEl.textContent = 'Ends in ' + formatCountdown(_countdown);
            }

            // CSS class for color theme
            if (_activeWindow.id === 'nightowl') {
                _bannerEl.classList.add('night');
            } else if (_activeWindow.id === 'lunch') {
                _bannerEl.classList.add('lunch');
            }
        } else {
            // Weekend only (no time window)
            if (emojiEl) emojiEl.textContent = WEEKEND_BONUS.emoji;
            if (labelEl) labelEl.textContent = '\uD83C\uDF89 WEEKEND SPECIAL';
            if (multEl)  multEl.textContent = fmtMult(WEEKEND_BONUS.mult) + ' Wins';
            if (timerEl) timerEl.style.display = 'none';
        }

        // Weekend stacking indicator
        if (weekendEl) {
            if (_isWeekend && _activeWindow) {
                weekendEl.style.display = '';
                weekendEl.textContent = '+ Weekend ' + fmtMult(WEEKEND_BONUS.mult);
            } else {
                weekendEl.style.display = 'none';
            }
        }

        requestAnimationFrame(function() {
            requestAnimationFrame(function() {
                if (_bannerEl) _bannerEl.classList.add('active');
            });
        });
    }

    function hideBanner() {
        if (_bannerEl) _bannerEl.classList.remove('active');
    }

    function updateTimerDisplay() {
        var timerEl = document.getElementById('hhTimer');
        if (!timerEl || !_activeWindow) return;
        timerEl.textContent = 'Ends in ' + formatCountdown(_countdown);
        // Urgency in last 2 minutes
        if (_countdown <= 120) {
            timerEl.classList.add('urgent');
        } else {
            timerEl.classList.remove('urgent');
        }
    }

    // ── State check (runs every 30s + on init) ──────────────────
    function checkTimeState() {
        var now = getNow();
        _isWeekend = isWeekendDay(now);
        var win = getActiveTimeWindow(now);

        var prevWindowId = _lastWindowId;
        _activeWindow = win;
        _lastWindowId = win ? win.id : null;

        _effectiveMult = computeMultiplier(_activeWindow, _isWeekend);

        if (_activeWindow) {
            _countdown = getSecondsUntilEnd(now, _activeWindow.endHour);

            // Start tick if transitioning into a new window
            if (prevWindowId !== _lastWindowId) {
                startTick();
                showBanner();
                // Toast on window start
                if (typeof showWinToast === 'function') {
                    showWinToast(_activeWindow.emoji + ' Happy Hour: ' + fmtMult(_effectiveMult) + ' Wins!', 'epic');
                }
            }
        } else {
            stopTick();
            if (_isWeekend) {
                showBanner();
            } else {
                hideBanner();
            }
        }
    }

    function startTick() {
        stopTick();
        _tickInterval = setInterval(function() {
            _countdown--;
            if (_countdown <= 0) {
                // Window ended
                stopTick();
                checkTimeState();
                return;
            }
            updateTimerDisplay();
        }, 1000);
    }

    function stopTick() {
        if (_tickInterval) {
            clearInterval(_tickInterval);
            _tickInterval = null;
        }
    }

    // ── Hook into displayServerWinResult ─────────────────────────
    function hookWinResult() {
        var _orig = window.displayServerWinResult;
        if (typeof _orig !== 'function') return;

        window.displayServerWinResult = function(result, game) {
            // Apply happy hour multiplier to win amount
            if (_effectiveMult > 1 && result && result.winAmount > 0) {
                var bonus = result.winAmount * (_effectiveMult - 1);
                bonus = Math.round(bonus * 100) / 100;
                result.winAmount = Math.round((result.winAmount + bonus) * 100) / 100;

                // Adjust balance to include bonus
                if (typeof result.balance === 'number' || typeof result.balance === 'string') {
                    var bal = Number(result.balance);
                    if (Number.isFinite(bal)) {
                        result.balance = bal + bonus;
                    }
                }
            }

            _orig.call(this, result, game);
        };
    }

    // ── Public API ───────────────────────────────────────────────
    window.getHappyHourMultiplier = function() {
        return _effectiveMult;
    };

    window.isHappyHourActive = function() {
        return _effectiveMult > 1;
    };

    window.getHappyHourInfo = function() {
        return {
            active: _effectiveMult > 1,
            multiplier: _effectiveMult,
            window: _activeWindow ? _activeWindow.name : null,
            isWeekend: _isWeekend,
            countdown: _countdown
        };
    };

    // ── Init ─────────────────────────────────────────────────────
    function init() {
        if (isQaSuppressed()) return;

        // Initial state check
        checkTimeState();

        // Periodic check every 30s
        _checkInterval = setInterval(checkTimeState, CHECK_INTERVAL_MS);

        // Hook wins
        hookWinResult();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        setTimeout(init, 0);
    }
}());
