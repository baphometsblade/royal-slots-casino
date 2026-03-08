/* ui-achievementbadge.js — Achievement Badges trophy collection panel (Sprint 44) */
(function () {
    'use strict';

    var STORAGE_KEY = 'ms_achievementBadges';
    var PANEL_ID = 'achievementBadgePanel';

    var BADGES = [
        { id: 'first_spin', icon: '\uD83C\uDFB0', label: 'First Spin', desc: 'Complete your first spin', check: function (s) { return s.totalSpins >= 1; } },
        { id: 'spin_100', icon: '\uD83D\uDD25', label: 'Century', desc: 'Complete 100 spins', check: function (s) { return s.totalSpins >= 100; } },
        { id: 'spin_500', icon: '\u26A1', label: 'Lightning', desc: 'Complete 500 spins', check: function (s) { return s.totalSpins >= 500; } },
        { id: 'spin_1000', icon: '\uD83C\uDFC6', label: 'Champion', desc: 'Complete 1000 spins', check: function (s) { return s.totalSpins >= 1000; } },
        { id: 'win_first', icon: '\u2B50', label: 'Winner', desc: 'Win your first bet', check: function (s) { return s.totalWon > 0; } },
        { id: 'win_100', icon: '\uD83D\uDCB0', label: 'Earner', desc: 'Win $100 total', check: function (s) { return s.totalWon >= 100; } },
        { id: 'win_1000', icon: '\uD83D\uDC8E', label: 'Diamond', desc: 'Win $1000 total', check: function (s) { return s.totalWon >= 1000; } },
        { id: 'big_win', icon: '\uD83C\uDF89', label: 'Big Winner', desc: 'Win 10x your bet', check: function (s) { return s.biggestMultiplier >= 10; } },
        { id: 'streak_5', icon: '\uD83D\uDD25', label: 'Hot Streak', desc: 'Win 5 spins in a row', check: function (s) { return s.bestStreak >= 5; } }
    ];

    var _panelVisible = false;

    // ── QA bypass ──
    function _isQA() {
        try {
            return new URLSearchParams(window.location.search).get('noBonus') === '1';
        } catch (e) {
            return false;
        }
    }

    // ── localStorage helpers ──
    function _loadEarned() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            if (raw) return JSON.parse(raw);
        } catch (e) { /* ignore */ }
        return { earned: {}, toastShown: {} };
    }

    function _saveEarned(data) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (e) { /* ignore */ }
    }

    // ── Gather stats from global state ──
    function _gatherStats() {
        var s = {
            totalSpins: 0,
            totalWon: 0,
            totalWagered: 0,
            biggestMultiplier: 0,
            bestStreak: 0
        };

        if (typeof window.stats === 'object' && window.stats) {
            s.totalSpins = window.stats.totalSpins || 0;
            s.totalWon = window.stats.totalWon || 0;
            s.totalWagered = window.stats.totalWagered || 0;
        }

        // biggest multiplier from stats
        if (typeof window.stats === 'object' && window.stats) {
            if (window.stats.biggestMultiplier) {
                s.biggestMultiplier = window.stats.biggestMultiplier;
            } else if (window.stats.biggestWin && window.stats.totalSpins > 0) {
                // Estimate multiplier from biggest win
                var avgBet = s.totalWagered / Math.max(s.totalSpins, 1);
                if (avgBet > 0) {
                    s.biggestMultiplier = window.stats.biggestWin / avgBet;
                }
            }
        }

        // Win streak
        if (typeof window._winStreak === 'number') {
            s.bestStreak = window._winStreak;
        }

        // Check stored best streak
        var data = _loadEarned();
        if (data.bestStreak && data.bestStreak > s.bestStreak) {
            s.bestStreak = data.bestStreak;
        }

        return s;
    }

    // ── Check badges and return earned list ──
    function _checkBadges() {
        var stats = _gatherStats();
        var data = _loadEarned();
        var newlyEarned = [];

        for (var i = 0; i < BADGES.length; i++) {
            var badge = BADGES[i];
            if (badge.check(stats)) {
                if (!data.earned[badge.id]) {
                    data.earned[badge.id] = Date.now();
                    newlyEarned.push(badge);
                }
            }
        }

        // Track best streak
        if (stats.bestStreak > (data.bestStreak || 0)) {
            data.bestStreak = stats.bestStreak;
        }

        _saveEarned(data);
        return { earned: data.earned, newlyEarned: newlyEarned };
    }

    // ── Show toast for newly earned badge ──
    function _showBadgeToast(badge) {
        var data = _loadEarned();
        if (data.toastShown && data.toastShown[badge.id]) return;

        var toast = document.createElement('div');
        toast.className = 's44-badge-toast';

        var iconSpan = document.createElement('span');
        iconSpan.className = 's44-badge-toast-icon';
        iconSpan.textContent = badge.icon;
        toast.appendChild(iconSpan);

        var textDiv = document.createElement('div');
        textDiv.className = 's44-badge-toast-text';

        var titleEl = document.createElement('div');
        titleEl.className = 's44-badge-toast-title';
        titleEl.textContent = 'Badge Unlocked!';
        textDiv.appendChild(titleEl);

        var nameEl = document.createElement('div');
        nameEl.className = 's44-badge-toast-name';
        nameEl.textContent = badge.label + ' \u2014 ' + badge.desc;
        textDiv.appendChild(nameEl);

        toast.appendChild(textDiv);
        document.body.appendChild(toast);

        requestAnimationFrame(function () {
            toast.classList.add('s44-badge-toast-show');
        });

        // Mark toast as shown
        data.toastShown = data.toastShown || {};
        data.toastShown[badge.id] = true;
        _saveEarned(data);

        setTimeout(function () {
            toast.classList.remove('s44-badge-toast-show');
            setTimeout(function () {
                if (toast.parentNode) toast.parentNode.removeChild(toast);
            }, 400);
        }, 4000);
    }

    // ── Build badge panel ──
    function _buildPanel() {
        var existing = document.getElementById(PANEL_ID);
        if (existing && existing.parentNode) {
            existing.parentNode.removeChild(existing);
        }

        var result = _checkBadges();
        var earned = result.earned;

        var panel = document.createElement('div');
        panel.id = PANEL_ID;
        panel.className = 'achievement-badge-panel';

        // Header
        var header = document.createElement('div');
        header.className = 's44-badge-header';

        var title = document.createElement('div');
        title.className = 's44-badge-title';
        title.textContent = '\uD83C\uDFC6 Achievement Badges';
        header.appendChild(title);

        // Earned count
        var earnedCount = 0;
        for (var k in earned) {
            if (earned.hasOwnProperty(k)) earnedCount++;
        }
        var countEl = document.createElement('div');
        countEl.className = 's44-badge-count';
        countEl.textContent = earnedCount + '/' + BADGES.length + ' earned';
        header.appendChild(countEl);

        var closeBtn = document.createElement('button');
        closeBtn.className = 's44-badge-close';
        closeBtn.textContent = '\u2715';
        closeBtn.addEventListener('click', function () {
            _dismiss();
        });
        header.appendChild(closeBtn);

        panel.appendChild(header);

        // Badge grid
        var grid = document.createElement('div');
        grid.className = 's44-badge-grid';

        for (var i = 0; i < BADGES.length; i++) {
            var badge = BADGES[i];
            var isEarned = !!earned[badge.id];

            var item = document.createElement('div');
            item.className = 's44-badge-item ' + (isEarned ? 's44-earned' : 's44-locked');

            var icon = document.createElement('div');
            icon.className = 's44-badge-icon';
            icon.textContent = isEarned ? badge.icon : '\uD83D\uDD12';
            item.appendChild(icon);

            var label = document.createElement('div');
            label.className = 's44-badge-label';
            label.textContent = badge.label;
            item.appendChild(label);

            var desc = document.createElement('div');
            desc.className = 's44-badge-desc';
            desc.textContent = badge.desc;
            item.appendChild(desc);

            if (isEarned) {
                var dateEl = document.createElement('div');
                dateEl.className = 's44-badge-date';
                var d = new Date(earned[badge.id]);
                dateEl.textContent = 'Earned ' + (d.getMonth() + 1) + '/' + d.getDate();
                item.appendChild(dateEl);
            }

            grid.appendChild(item);
        }

        panel.appendChild(grid);

        return panel;
    }

    // ── Show/hide panel ──
    function _showPanel() {
        if (_isQA()) return;

        var panel = _buildPanel();
        document.body.appendChild(panel);
        _panelVisible = true;

        requestAnimationFrame(function () {
            panel.classList.add('s44-active');
        });
    }

    function _dismiss() {
        var panel = document.getElementById(PANEL_ID);
        if (!panel) return;
        _panelVisible = false;

        panel.classList.remove('s44-active');
        setTimeout(function () {
            if (panel.parentNode) panel.parentNode.removeChild(panel);
        }, 300);
    }

    // ── Called after each spin to check for new badges ──
    function _checkSpin() {
        if (_isQA()) return;

        var result = _checkBadges();
        if (result.newlyEarned.length > 0) {
            for (var i = 0; i < result.newlyEarned.length; i++) {
                (function (badge) {
                    setTimeout(function () {
                        _showBadgeToast(badge);
                    }, 1500 + i * 1200);
                })(result.newlyEarned[i]);
            }
        }
    }

    // ── Toggle panel visibility ──
    function _togglePanel() {
        if (_panelVisible) {
            _dismiss();
        } else {
            _showPanel();
        }
    }

    // ── Public API ──
    window._achievementCheckSpin = _checkSpin;
    window._achievementToggle = _togglePanel;
    window.dismissAchievementBadges = _dismiss;

    // ── Init ──
    function _init() {
        if (_isQA()) return;
        // Initial badge check (silent, no toasts on page load)
        _checkBadges();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            setTimeout(_init, 1000);
        });
    } else {
        setTimeout(_init, 1000);
    }
})();
