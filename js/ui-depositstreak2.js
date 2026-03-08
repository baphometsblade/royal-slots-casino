/* ui-depositstreak2.js — Deposit Streak Rewards (Sprint 41)
 * 7-day streak calendar with milestone bonuses and flame animation.
 * DOM element: #depositStreakPanel (fixed bottom-left card)
 */
(function () {
    'use strict';

    var STORAGE_KEY = 'ms_depositStreak2Data';
    var PANEL_ID = 'depositStreakPanel';
    var SPINS_FOR_DAY = 10;
    var STREAK_REWARDS = { 3: 5, 5: 15, 7: 50 };
    var STREAK_MULTIPLIERS = { 3: 1.5, 5: 2, 7: 3 };
    var DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    var MILESTONE_DAYS = [3, 5, 7];

    // ── QA bypass ────────────────────────────────────────────────────────
    function _isQA() {
        try { return new URLSearchParams(window.location.search).get('noBonus') === '1'; }
        catch (e) { return false; }
    }

    // ── Persistence ──────────────────────────────────────────────────────
    function _load() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            if (raw) return JSON.parse(raw);
        } catch (e) { /* corrupt */ }
        return { streak: 0, lastDate: null, todaySpins: 0, todayDate: null, collectedRewards: {} };
    }

    function _save(d) {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); } catch (e) { /* quota */ }
    }

    // ── Helpers ───────────────────────────────────────────────────────────
    function _todayStr() {
        return new Date().toISOString().slice(0, 10);
    }

    function _yesterdayStr() {
        var d = new Date();
        d.setDate(d.getDate() - 1);
        return d.toISOString().slice(0, 10);
    }

    function _getMultiplier(streak) {
        if (streak >= 7) return { label: '3x', tier: 3 };
        if (streak >= 5) return { label: '2x', tier: 2 };
        if (streak >= 3) return { label: '1.5x', tier: 1 };
        return null;
    }

    function _toast(msg) {
        if (typeof showToast === 'function') { showToast(msg, 'info'); return; }
        if (typeof showWinToast === 'function') { showWinToast(msg, 'epic'); return; }
        var t = document.createElement('div');
        t.textContent = msg;
        t.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#f59e0b;color:#000;padding:10px 20px;border-radius:8px;font-weight:700;z-index:99999;font-size:14px;box-shadow:0 4px 16px rgba(0,0,0,0.4);';
        document.body.appendChild(t);
        setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 3500);
    }

    // ── DOM creation ─────────────────────────────────────────────────────
    function _buildPanel() {
        // Remove any prior version of this panel (e.g. from old ui-depositstreak.js)
        var existing = document.getElementById(PANEL_ID);
        if (existing && existing.parentNode) existing.parentNode.removeChild(existing);

        var panel = document.createElement('div');
        panel.id = PANEL_ID;
        panel.className = 'deposit-streak-panel';
        panel.style.display = 'none';

        // Header
        var header = document.createElement('div');
        header.className = 's41-streak-header';

        var title = document.createElement('span');
        title.className = 's41-streak-title';
        var titleIcon = document.createElement('span');
        titleIcon.className = 's41-streak-title-icon';
        titleIcon.textContent = '\uD83D\uDD25';
        title.appendChild(titleIcon);
        title.appendChild(document.createTextNode(' Daily Streak'));

        var closeBtn = document.createElement('button');
        closeBtn.className = 's41-streak-close';
        closeBtn.textContent = '\u2715';
        closeBtn.onclick = function () { _dismiss(); };

        header.appendChild(title);
        header.appendChild(closeBtn);
        panel.appendChild(header);

        // Body
        var body = document.createElement('div');
        body.className = 's41-streak-body';

        // Multiplier row
        var multRow = document.createElement('div');
        multRow.className = 's41-streak-multiplier-row';
        multRow.id = 'ds2MultRow';

        var multBadge = document.createElement('span');
        multBadge.className = 's41-streak-multiplier-badge';
        multBadge.id = 'ds2MultBadge';
        multBadge.textContent = '--';

        var multLabel = document.createElement('span');
        multLabel.className = 's41-streak-multiplier-label';
        multLabel.id = 'ds2MultLabel';
        multLabel.textContent = 'No multiplier yet';

        multRow.appendChild(multBadge);
        multRow.appendChild(multLabel);
        body.appendChild(multRow);

        // Calendar
        var calendar = document.createElement('div');
        calendar.className = 's41-streak-calendar';
        calendar.id = 'ds2Calendar';

        for (var i = 0; i < 7; i++) {
            // Connector before days 2-7
            if (i > 0) {
                var conn = document.createElement('div');
                conn.className = 's41-streak-connector';
                conn.setAttribute('data-day', String(i));
                calendar.appendChild(conn);
            }

            var dayEl = document.createElement('div');
            dayEl.className = 's41-streak-day';
            dayEl.setAttribute('data-day', String(i));

            // Milestone marker
            if (STREAK_REWARDS[i + 1]) {
                dayEl.classList.add('s41-milestone');
            }

            var circle = document.createElement('div');
            circle.className = 's41-streak-day-circle';
            circle.textContent = String(i + 1);

            var check = document.createElement('span');
            check.className = 's41-streak-day-check';
            check.textContent = '\u2713';
            check.style.display = 'none';

            var label = document.createElement('span');
            label.className = 's41-streak-day-label';
            label.textContent = DAY_LABELS[i];

            dayEl.appendChild(circle);
            dayEl.appendChild(check);
            dayEl.appendChild(label);
            calendar.appendChild(dayEl);
        }
        body.appendChild(calendar);

        // Flame wrap
        var flameWrap = document.createElement('div');
        flameWrap.className = 's41-streak-flame-wrap';
        flameWrap.id = 'ds2FlameWrap';

        var flame = document.createElement('div');
        flame.className = 's41-streak-flame';
        flame.textContent = '\uD83D\uDD25';

        var particles = document.createElement('div');
        particles.className = 's41-streak-flame-particles';
        for (var p = 0; p < 5; p++) {
            var particle = document.createElement('div');
            particle.className = 's41-streak-flame-particle';
            particles.appendChild(particle);
        }

        flameWrap.appendChild(flame);
        flameWrap.appendChild(particles);
        body.appendChild(flameWrap);

        // Milestones row
        var milestonesRow = document.createElement('div');
        milestonesRow.className = 's41-streak-milestones';
        milestonesRow.id = 'ds2Milestones';

        for (var m = 0; m < MILESTONE_DAYS.length; m++) {
            var mDay = MILESTONE_DAYS[m];
            var card = document.createElement('div');
            card.className = 's41-streak-milestone-card';
            card.setAttribute('data-milestone', String(mDay));

            var mDays = document.createElement('div');
            mDays.className = 's41-streak-milestone-days';
            mDays.textContent = mDay + '-Day';

            var mMult = document.createElement('div');
            mMult.className = 's41-streak-milestone-mult';
            mMult.textContent = STREAK_MULTIPLIERS[mDay] + 'x';

            var mReward = document.createElement('div');
            mReward.style.cssText = 'font-size:10px;color:rgba(226,232,240,0.5);margin-top:2px;';
            mReward.textContent = '+$' + STREAK_REWARDS[mDay];

            card.appendChild(mDays);
            card.appendChild(mMult);
            card.appendChild(mReward);
            milestonesRow.appendChild(card);
        }
        body.appendChild(milestonesRow);

        // Footer
        var footer = document.createElement('div');
        footer.className = 's41-streak-footer';
        footer.id = 'ds2Footer';
        footer.textContent = 'Spin ' + SPINS_FOR_DAY + ' times daily to maintain your streak';
        body.appendChild(footer);

        panel.appendChild(body);
        document.body.appendChild(panel);
    }

    // ── Update UI ────────────────────────────────────────────────────────
    function _updateUI() {
        var data = _load();
        var panel = document.getElementById(PANEL_ID);
        if (!panel) return;

        // Multiplier
        var mult = _getMultiplier(data.streak);
        var multBadge = document.getElementById('ds2MultBadge');
        var multLabel = document.getElementById('ds2MultLabel');
        if (multBadge && multLabel) {
            if (mult) {
                multBadge.textContent = mult.label;
                multLabel.textContent = 'Streak Multiplier Active!';
            } else {
                multBadge.textContent = '--';
                multLabel.textContent = 'Reach Day 3 for 1.5x';
            }
        }

        // No-streak class
        if (data.streak === 0) {
            panel.classList.add('s41-no-streak');
        } else {
            panel.classList.remove('s41-no-streak');
        }

        // Calendar days
        var days = panel.querySelectorAll('.s41-streak-day');
        for (var i = 0; i < days.length; i++) {
            var dayEl = days[i];
            var circle = dayEl.querySelector('.s41-streak-day-circle');
            var checkEl = dayEl.querySelector('.s41-streak-day-check');

            dayEl.classList.remove('s41-completed', 's41-current');

            if (i < data.streak) {
                dayEl.classList.add('s41-completed');
                if (circle) circle.textContent = '';
                if (checkEl) checkEl.style.display = '';
            } else if (i === data.streak) {
                dayEl.classList.add('s41-current');
                if (circle) circle.textContent = String(i + 1);
                if (checkEl) checkEl.style.display = 'none';
            } else {
                if (circle) circle.textContent = String(i + 1);
                if (checkEl) checkEl.style.display = 'none';
            }
        }

        // Connectors
        var connectors = panel.querySelectorAll('.s41-streak-connector');
        for (var c = 0; c < connectors.length; c++) {
            var cDay = parseInt(connectors[c].getAttribute('data-day'), 10);
            if (cDay <= data.streak) {
                connectors[c].classList.add('s41-filled');
            } else {
                connectors[c].classList.remove('s41-filled');
            }
        }

        // Milestone cards
        var cards = panel.querySelectorAll('.s41-streak-milestone-card');
        for (var k = 0; k < cards.length; k++) {
            var mDay = parseInt(cards[k].getAttribute('data-milestone'), 10);
            cards[k].classList.remove('s41-active', 's41-achieved');
            if (data.streak >= mDay) {
                cards[k].classList.add('s41-achieved');
            } else if (data.streak === mDay - 1) {
                cards[k].classList.add('s41-active');
            }
        }

        // Footer
        var footer = document.getElementById('ds2Footer');
        if (footer) {
            var todayActive = data.todayDate === _todayStr();
            var todaySpins = todayActive ? data.todaySpins : 0;
            var remaining = Math.max(0, SPINS_FOR_DAY - todaySpins);
            if (todaySpins >= SPINS_FOR_DAY) {
                footer.textContent = '\u2713 Today\'s streak counted! Come back tomorrow.';
            } else {
                footer.textContent = remaining + ' more spin' + (remaining !== 1 ? 's' : '') + ' to count today';
            }
        }
    }

    // ── Streak logic ─────────────────────────────────────────────────────
    function _checkStreakReset(data) {
        if (!data.lastDate) return data;
        var today = _todayStr();
        var yesterday = _yesterdayStr();
        if (data.lastDate !== today && data.lastDate !== yesterday) {
            data.streak = 0;
            data.collectedRewards = {};
            _save(data);
        }
        return data;
    }

    function _awardReward(data) {
        var key = String(data.streak);
        var amount = STREAK_REWARDS[data.streak];
        if (!amount) return;
        if (data.collectedRewards && data.collectedRewards[key]) return;

        if (typeof window.balance === 'number') {
            window.balance += amount;
            if (typeof window.updateBalanceDisplay === 'function') window.updateBalanceDisplay();
        }

        if (!data.collectedRewards) data.collectedRewards = {};
        data.collectedRewards[key] = true;
        _save(data);
        _toast('\uD83D\uDD25 Day ' + data.streak + ' Streak Bonus! +$' + amount);
    }

    // ── Track spin ───────────────────────────────────────────────────────
    function _trackSpin() {
        if (_isQA()) return;
        var data = _load();
        data = _checkStreakReset(data);

        var today = _todayStr();
        var wasCounted = data.todayDate === today && data.todaySpins >= SPINS_FOR_DAY;

        if (data.todayDate !== today) {
            data.todaySpins = 0;
            data.todayDate = today;
        }

        data.todaySpins += 1;

        if (!wasCounted && data.todaySpins >= SPINS_FOR_DAY) {
            if (data.lastDate !== today) {
                data.streak += 1;
                data.lastDate = today;
                _save(data);
                _awardReward(data);
                _show();
            }
        }

        _save(data);
        _updateUI();
    }

    // ── Show / Dismiss ───────────────────────────────────────────────────
    function _show() {
        var p = document.getElementById(PANEL_ID);
        if (p) {
            p.style.display = '';
            p.classList.remove('s41-hiding');
            _updateUI();
        }
    }

    function _dismiss() {
        var p = document.getElementById(PANEL_ID);
        if (!p) return;
        p.classList.add('s41-hiding');
        setTimeout(function () {
            if (p) p.style.display = 'none';
        }, 400);
    }

    // ── Public API ───────────────────────────────────────────────────────
    window._depositStreak2TrackSpin = _trackSpin;
    window.dismissDepositStreak2 = _dismiss;
    // Override old API so spin-engine picks up the styled version
    window._depositStreakTrackSpin = _trackSpin;
    window.dismissDepositStreak = _dismiss;

    // ── Init ─────────────────────────────────────────────────────────────
    function _init() {
        if (_isQA()) return;
        _buildPanel();
        var data = _load();
        data = _checkStreakReset(data);
        _updateUI();

        // Auto-show if returning player with active streak on new day
        if (data.streak > 0 && data.lastDate !== _todayStr()) {
            setTimeout(_show, 1500);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { setTimeout(_init, 900); });
    } else {
        setTimeout(_init, 900);
    }

})();
