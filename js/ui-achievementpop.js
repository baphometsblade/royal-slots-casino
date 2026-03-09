/* ui-achievementpop.js — Achievement Pop Notification
 * Sprint 56: Bottom-right slide-in for unlocked achievements tracked via spinComplete.
 * Dynamically creates its own DOM elements (no static HTML required).
 */
(function () {
    'use strict';

    var STORAGE_KEY = 'ms_achievements';
    var AUTO_HIDE_MS = 6000;
    var COOLDOWN_MS = 60000;
    var Z_INDEX = 9100;

    var ACHIEVEMENTS = [
        { id: 'first_win',      badge: '\ud83c\udfc6', name: 'First Win',      desc: 'Score your very first win!' },
        { id: 'hot_streak',     badge: '\ud83d\udd25', name: 'Hot Streak',     desc: '3 wins in a row!' },
        { id: 'big_spender',    badge: '\ud83d\udcb0', name: 'Big Spender',    desc: 'Placed a bet of $10 or more!' },
        { id: 'century_club',   badge: '\ud83c\udfaf', name: 'Century Club',   desc: '100 spins this session!' },
        { id: 'lucky_charm',    badge: '\ud83c\udf40', name: 'Lucky Charm',    desc: 'Won over 10\u00d7 your bet amount!' },
    ];

    var _el = null;
    var _hideTimer = null;
    var _lastPopTs = 0;
    var _sessionSpins = 0;
    var _sessionConsecWins = 0;
    var _queue = [];
    var _showing = false;

    function _loadUnlocked() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            return [];
        }
    }

    function _saveUnlocked(arr) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
        } catch (e) {}
    }

    function _isUnlocked(id) {
        return _loadUnlocked().indexOf(id) !== -1;
    }

    function _unlock(id) {
        var arr = _loadUnlocked();
        if (arr.indexOf(id) === -1) {
            arr.push(id);
            _saveUnlocked(arr);
        }
    }

    function _build() {
        var el = document.createElement('div');
        el.id = 'achievementPop';
        el.style.cssText = [
            'position:fixed',
            'bottom:24px',
            'right:24px',
            'width:280px',
            'background:linear-gradient(135deg,#1a0a2e,#2d1654)',
            'border:1px solid #9b59b6',
            'border-radius:12px',
            'padding:16px 18px',
            'z-index:' + Z_INDEX,
            'box-shadow:0 8px 32px rgba(155,89,182,0.35)',
            'transform:translateX(320px)',
            'transition:transform 0.4s cubic-bezier(0.34,1.56,0.64,1)',
            'font-family:inherit',
        ].join(';');

        var header = document.createElement('div');
        header.style.cssText = 'color:rgba(255,255,255,0.5);font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;';
        header.textContent = 'Achievement Unlocked! \ud83c\udf89';

        var body = document.createElement('div');
        body.style.cssText = 'display:flex;align-items:center;gap:12px;';

        var badge = document.createElement('span');
        badge.id = 'achievementPop_badge';
        badge.style.cssText = 'font-size:36px;line-height:1;flex-shrink:0;';

        var info = document.createElement('div');

        var achName = document.createElement('div');
        achName.id = 'achievementPop_name';
        achName.style.cssText = 'color:#e0b8ff;font-size:15px;font-weight:700;margin-bottom:2px;';

        var achDesc = document.createElement('div');
        achDesc.id = 'achievementPop_desc';
        achDesc.style.cssText = 'color:rgba(255,255,255,0.55);font-size:12px;line-height:1.3;';

        info.appendChild(achName);
        info.appendChild(achDesc);
        body.appendChild(badge);
        body.appendChild(info);
        el.appendChild(header);
        el.appendChild(body);

        document.body.appendChild(el);
        _el = el;
    }

    function _showNext() {
        if (_queue.length === 0) { _showing = false; return; }
        var now = Date.now();
        if (now - _lastPopTs < COOLDOWN_MS) {
            _showing = false;
            return;
        }
        _showing = true;
        _lastPopTs = now;
        var ach = _queue.shift();

        if (!_el) _build();

        var badgeEl = document.getElementById('achievementPop_badge');
        var nameEl  = document.getElementById('achievementPop_name');
        var descEl  = document.getElementById('achievementPop_desc');

        if (badgeEl) badgeEl.textContent = ach.badge;
        if (nameEl)  nameEl.textContent  = ach.name;
        if (descEl)  descEl.textContent  = ach.desc;

        requestAnimationFrame(function () {
            _el.style.transform = 'translateX(0)';
        });

        if (_hideTimer) clearTimeout(_hideTimer);
        _hideTimer = setTimeout(function () {
            _hide(true);
        }, AUTO_HIDE_MS);
    }

    function _enqueue(ach) {
        _queue.push(ach);
        if (!_showing) _showNext();
    }

    function _hide(next) {
        if (_el) {
            _el.style.transform = 'translateX(320px)';
        }
        if (_hideTimer) { clearTimeout(_hideTimer); _hideTimer = null; }
        if (next) {
            setTimeout(function () {
                _showNext();
            }, 500);
        } else {
            _showing = false;
        }
    }

    function _tryUnlock(id) {
        if (_isUnlocked(id)) return;
        _unlock(id);
        var ach = null;
        for (var i = 0; i < ACHIEVEMENTS.length; i++) {
            if (ACHIEVEMENTS[i].id === id) { ach = ACHIEVEMENTS[i]; break; }
        }
        if (ach) _enqueue(ach);
    }

    function _onSpinComplete(e) {
        if (new URLSearchParams(window.location.search).get('noBonus') === '1') return;
        var detail = (e && e.detail) ? e.detail : {};
        var winAmount = detail.winAmount || 0;
        var betAmount = detail.betAmount || 0;

        _sessionSpins++;

        if (winAmount > 0) {
            _sessionConsecWins++;
            _tryUnlock('first_win');
            if (_sessionConsecWins >= 3) _tryUnlock('hot_streak');
            if (betAmount > 0 && winAmount > betAmount * 10) _tryUnlock('lucky_charm');
        } else {
            _sessionConsecWins = 0;
        }

        if (betAmount >= 10) _tryUnlock('big_spender');
        if (_sessionSpins >= 100) _tryUnlock('century_club');
    }

    function _init() {
        if (new URLSearchParams(window.location.search).get('noBonus') === '1') return;
        _build();
        document.addEventListener('spinComplete', _onSpinComplete);
    }

    window.dismissAchievementPop = function () {
        _hide(false);
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _init);
    } else {
        _init();
    }
})();
