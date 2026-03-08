/* ui-achievementpopup.js — Achievement Milestone Popups
 * Sprint 34: Tracks player milestones and shows reward popups when unlocked.
 * Creates floating popups that stack vertically and auto-dismiss.
 */
(function () {
    'use strict';

    var STORAGE_KEY = 'ms_achievementData';

    var ACHIEVEMENTS = [
        { id: 'first_spin', name: 'First Spin!',       desc: 'Complete your first spin',     check: 'spins>=1',     reward: 1,  icon: '\uD83C\uDFB0' },
        { id: 'spin_50',    name: 'Getting Warmed Up',  desc: 'Complete 50 spins',            check: 'spins>=50',    reward: 5,  icon: '\u2B50' },
        { id: 'spin_100',   name: 'Century Spinner',    desc: 'Complete 100 spins',           check: 'spins>=100',   reward: 10, icon: '\uD83D\uDD25' },
        { id: 'first_win',  name: 'Winner!',            desc: 'Win for the first time',       check: 'wins>=1',      reward: 2,  icon: '\uD83C\uDFC6' },
        { id: 'win_10',     name: 'Lucky Streak',       desc: 'Win 10 times',                 check: 'wins>=10',     reward: 5,  icon: '\u2728' },
        { id: 'big_win',    name: 'Big Winner',         desc: 'Hit a big win (10x+)',         check: 'bigwins>=1',   reward: 10, icon: '\uD83D\uDC8E' },
        { id: 'wager_100',  name: 'High Roller',        desc: 'Wager $100 total',             check: 'wagered>=100', reward: 5,  icon: '\uD83D\uDCB0' },
        { id: 'games_3',    name: 'Explorer',           desc: 'Play 3 different games',       check: 'games>=3',     reward: 3,  icon: '\uD83D\uDDFA\uFE0F' }
    ];

    var _unlocked   = {};
    var _containerEl = null;
    var _popupCount  = 0;

    // ── Persistence ─────────────────────────────────────────────────────────
    function _load() {
        try {
            var data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
            _unlocked = data.unlocked || {};
        } catch (e) { _unlocked = {}; }
    }

    function _save() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ unlocked: _unlocked }));
        } catch (e) {}
    }

    // ── Check condition ─────────────────────────────────────────────────────
    function _evalCheck(checkStr, stats) {
        // Format: "field>=value"
        var m = checkStr.match(/^(\w+)>=(\d+)$/);
        if (!m) return false;
        var field = m[1];
        var threshold = parseInt(m[2], 10);
        var val = stats[field];
        if (typeof val !== 'number') return false;
        return val >= threshold;
    }

    // ── DOM container ───────────────────────────────────────────────────────
    function _ensureContainer() {
        if (_containerEl) return;
        var el = document.createElement('div');
        el.id = 'achievementContainer';
        el.className = 'achievement-container';
        el.style.cssText = 'position:fixed;top:80px;right:20px;z-index:10001;display:flex;flex-direction:column;gap:10px;pointer-events:none;';
        document.body.appendChild(el);
        _containerEl = el;
    }

    // ── Show popup ──────────────────────────────────────────────────────────
    function _showPopup(achievement) {
        _ensureContainer();

        var popup = document.createElement('div');
        popup.className = 'achievement-popup';
        popup.style.cssText = 'pointer-events:auto;opacity:0;transform:translateX(100px);transition:opacity 0.4s,transform 0.4s;';

        var iconEl = document.createElement('div');
        iconEl.className = 'ap-icon';
        iconEl.textContent = achievement.icon;

        var bodyEl = document.createElement('div');
        bodyEl.className = 'ap-body';

        var titleEl = document.createElement('div');
        titleEl.className = 'ap-title';
        titleEl.textContent = achievement.name;

        var descEl = document.createElement('div');
        descEl.className = 'ap-desc';
        descEl.textContent = achievement.desc;

        var rewardEl = document.createElement('div');
        rewardEl.className = 'ap-reward';
        rewardEl.textContent = '+$' + achievement.reward + ' bonus';

        bodyEl.appendChild(titleEl);
        bodyEl.appendChild(descEl);
        bodyEl.appendChild(rewardEl);
        popup.appendChild(iconEl);
        popup.appendChild(bodyEl);
        _containerEl.appendChild(popup);
        _popupCount++;

        // Slide in
        requestAnimationFrame(function () {
            requestAnimationFrame(function () {
                popup.style.opacity = '1';
                popup.style.transform = 'translateX(0)';
            });
        });

        // Auto-dismiss after 5 seconds
        setTimeout(function () {
            popup.style.opacity = '0';
            popup.style.transform = 'translateX(100px)';
            setTimeout(function () {
                if (popup.parentNode) popup.parentNode.removeChild(popup);
                _popupCount--;
            }, 400);
        }, 5000);
    }

    // ── Check achievements ──────────────────────────────────────────────────
    function _checkAchievements(stats) {
        if (!stats || typeof stats !== 'object') return;
        for (var i = 0; i < ACHIEVEMENTS.length; i++) {
            var a = ACHIEVEMENTS[i];
            if (_unlocked[a.id]) continue;
            if (_evalCheck(a.check, stats)) {
                _unlocked[a.id] = Date.now();
                _save();
                // Award balance
                if (typeof balance !== 'undefined') {
                    balance += a.reward;
                    if (typeof updateBalanceDisplay === 'function') updateBalanceDisplay();
                }
                _showPopup(a);
            }
        }
    }

    // ── Public API ──────────────────────────────────────────────────────────
    window._achievementTrackSpin = function (stats) {
        _checkAchievements(stats);
    };

    // ── Init ────────────────────────────────────────────────────────────────
    function _init() {
        try { if (new URLSearchParams(location.search).get('noBonus') === '1') return; } catch (e) {}
        _load();
        _ensureContainer();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { setTimeout(_init, 600); });
    } else {
        setTimeout(_init, 600);
    }

})();
