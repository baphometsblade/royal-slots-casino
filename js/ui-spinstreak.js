/**
 * ui-spinstreak.js -- Daily Spin Streak Rewards (Sprint 31)
 *
 * Tracks consecutive daily logins/spins across a 7-day cycle.
 * Each day awards escalating rewards (credits or free spins).
 * Resets if user misses a day; loops after day 7.
 * localStorage key: ms_spinStreakData
 */
(function () {
    'use strict';

    // -- Constants ----------------------------------------------------------
    var STORAGE_KEY = 'ms_spinStreakData';
    var GOLD = '#fbbf24';
    var TOTAL_DAYS = 7;

    var STREAK_REWARDS = [
        { day: 1, icon: '\uD83C\uDFB0', label: '$1',    type: 'credits',   value: 1 },
        { day: 2, icon: '\u2B50',         label: '$2',    type: 'credits',   value: 2 },
        { day: 3, icon: '\uD83C\uDF81', label: '$5',    type: 'credits',   value: 5 },
        { day: 4, icon: '\uD83D\uDCB0', label: '$10',   type: 'credits',   value: 10 },
        { day: 5, icon: '\uD83D\uDD25', label: '5 FS',  type: 'freespins', value: 5 },
        { day: 6, icon: '\uD83D\uDC8E', label: '$25',   type: 'credits',   value: 25 },
        { day: 7, icon: '\uD83D\uDC51', label: '$50',   type: 'credits',   value: 50 }
    ];

    // -- Helpers ------------------------------------------------------------
    function _isQASuppressed() {
        try {
            var qs = window.location.search || '';
            return qs.indexOf('noBonus=1') !== -1;
        } catch (e) { return false; }
    }

    function _todayStr() {
        var d = new Date();
        var y = d.getFullYear();
        var m = ('0' + (d.getMonth() + 1)).slice(-2);
        var dd = ('0' + d.getDate()).slice(-2);
        return y + '-' + m + '-' + dd;
    }

    function _dateDiffDays(dateStrA, dateStrB) {
        // Returns how many calendar days B is after A
        if (!dateStrA || !dateStrB) return 999;
        try {
            var a = new Date(dateStrA + 'T00:00:00');
            var b = new Date(dateStrB + 'T00:00:00');
            return Math.round((b - a) / (24 * 60 * 60 * 1000));
        } catch (e) { return 999; }
    }

    function _loadData() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                var d = JSON.parse(raw);
                d.currentStreak = parseInt(d.currentStreak, 10) || 0;
                d.lastClaimDate = d.lastClaimDate || '';
                if (!Array.isArray(d.claimedDays) || d.claimedDays.length !== TOTAL_DAYS) {
                    d.claimedDays = _emptyClaimedDays();
                }
                return d;
            }
        } catch (e) { /* corrupted -- reset */ }
        return { currentStreak: 0, lastClaimDate: '', claimedDays: _emptyClaimedDays() };
    }

    function _saveData(data) {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (e) {}
    }

    function _emptyClaimedDays() {
        var arr = [];
        for (var i = 0; i < TOTAL_DAYS; i++) arr.push(false);
        return arr;
    }

    // -- Reward Claim -------------------------------------------------------
    function _claimReward(dayIndex) {
        var reward = STREAK_REWARDS[dayIndex];
        if (!reward) return;

        if (reward.type === 'credits') {
            if (typeof balance !== 'undefined') {
                balance = (parseFloat(balance) || 0) + reward.value;
                if (typeof updateBalance === 'function') updateBalance();
            }
        } else if (reward.type === 'freespins') {
            // Store free spins for the next game session
            if (typeof window._freeSpinsRemaining !== 'undefined') {
                window._freeSpinsRemaining = (parseInt(window._freeSpinsRemaining, 10) || 0) + reward.value;
            }
        }
    }

    // -- UI Rendering -------------------------------------------------------
    function _renderDays(data) {
        var container = document.getElementById('ssbDays');
        if (!container) return;

        container.innerHTML = '';

        for (var i = 0; i < TOTAL_DAYS; i++) {
            var reward = STREAK_REWARDS[i];
            var dayEl = document.createElement('div');
            dayEl.className = 'ssb-day';

            // Determine day state
            var dayIndex = i; // 0-based
            var streakDayIndex = (data.currentStreak - 1); // current streak 0-based index

            if (data.claimedDays[i]) {
                dayEl.classList.add('ssb-claimed');
            }

            if (dayIndex === streakDayIndex && data.lastClaimDate === _todayStr()) {
                dayEl.classList.add('ssb-today');
            } else if (dayIndex === streakDayIndex + 1 && data.lastClaimDate !== _todayStr() && data.currentStreak > 0) {
                // Next claimable day (tomorrow position, but today not yet claimed)
                dayEl.classList.add('ssb-today');
            } else if (data.currentStreak === 0 && dayIndex === 0) {
                dayEl.classList.add('ssb-today');
            }

            // Day number
            var numEl = document.createElement('div');
            numEl.className = 'ssb-day-num';
            numEl.textContent = 'Day ' + (i + 1);

            // Reward icon
            var iconEl = document.createElement('div');
            iconEl.className = 'ssb-day-reward';
            iconEl.textContent = reward.icon;

            // Reward label
            var labelEl = document.createElement('div');
            labelEl.className = 'ssb-day-label';
            labelEl.textContent = reward.label;

            dayEl.appendChild(numEl);
            dayEl.appendChild(iconEl);
            dayEl.appendChild(labelEl);
            container.appendChild(dayEl);
        }
    }

    function _updateStreakCount(data) {
        var el = document.getElementById('ssbStreakCount');
        if (el) {
            var streak = data.currentStreak || 0;
            el.textContent = 'Day ' + (streak > 0 ? streak : 1) + ' \uD83D\uDD25';
        }
    }

    function _showBar() {
        var bar = document.getElementById('spinStreakBar');
        if (bar) bar.classList.add('ssb-visible');
    }

    function _animateClaimedDay(dayIndex) {
        var container = document.getElementById('ssbDays');
        if (!container) return;
        var dayEls = container.querySelectorAll('.ssb-day');
        if (dayEls[dayIndex]) {
            dayEls[dayIndex].classList.add('ssb-claim-anim');
            setTimeout(function () {
                dayEls[dayIndex].classList.remove('ssb-claim-anim');
            }, 1200);
        }
    }

    // -- Public API ---------------------------------------------------------

    /**
     * Track a spin -- if today has not been claimed yet, claim today's reward.
     * Called externally after each spin resolves.
     */
    window._spinStreakTrackSpin = function () {
        var data = _loadData();
        var today = _todayStr();

        // Already claimed today
        if (data.lastClaimDate === today) return;

        var diff = _dateDiffDays(data.lastClaimDate, today);

        if (diff === 1 && data.currentStreak > 0) {
            // Consecutive day -- advance streak
            if (data.currentStreak >= TOTAL_DAYS) {
                // Reset cycle after day 7
                data.currentStreak = 1;
                data.claimedDays = _emptyClaimedDays();
            } else {
                data.currentStreak += 1;
            }
        } else if (data.currentStreak === 0 || diff > 1) {
            // First ever or gap -- start at day 1
            data.currentStreak = 1;
            data.claimedDays = _emptyClaimedDays();
        }

        // Claim current day
        var dayIdx = data.currentStreak - 1;
        data.claimedDays[dayIdx] = true;
        data.lastClaimDate = today;
        _saveData(data);

        _claimReward(dayIdx);
        _renderDays(data);
        _updateStreakCount(data);
        _animateClaimedDay(dayIdx);
    };

    // -- Init ---------------------------------------------------------------
    function _init() {
        if (_isQASuppressed()) return;

        var data = _loadData();
        var today = _todayStr();

        if (data.lastClaimDate === today) {
            // Already claimed today -- just render current state
            _renderDays(data);
            _updateStreakCount(data);
            _showBar();
            return;
        }

        var diff = _dateDiffDays(data.lastClaimDate, today);

        if (diff === 1 && data.currentStreak > 0) {
            // Consecutive day -- advance and auto-claim
            if (data.currentStreak >= TOTAL_DAYS) {
                data.currentStreak = 1;
                data.claimedDays = _emptyClaimedDays();
            } else {
                data.currentStreak += 1;
            }

            var dayIdx = data.currentStreak - 1;
            data.claimedDays[dayIdx] = true;
            data.lastClaimDate = today;
            _saveData(data);

            _claimReward(dayIdx);
            _renderDays(data);
            _updateStreakCount(data);
            _showBar();

            // Animate the newly claimed day after a short delay for visual effect
            setTimeout(function () { _animateClaimedDay(dayIdx); }, 300);
        } else if (diff > 1 || data.currentStreak === 0) {
            // Gap > 1 day or first time -- reset to day 1
            data.currentStreak = 1;
            data.claimedDays = _emptyClaimedDays();
            data.claimedDays[0] = true;
            data.lastClaimDate = today;
            _saveData(data);

            _claimReward(0);
            _renderDays(data);
            _updateStreakCount(data);
            _showBar();

            setTimeout(function () { _animateClaimedDay(0); }, 300);
        } else {
            // Same day but somehow not caught above -- render as-is
            _renderDays(data);
            _updateStreakCount(data);
            _showBar();
        }
    }

    // -- Bootstrap ----------------------------------------------------------
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            setTimeout(_init, 1400);
        });
    } else {
        setTimeout(_init, 1400);
    }

    // -- Expose gold accent for inline style consumers ----------------------
    window._SPIN_STREAK_GOLD = GOLD;

})();
