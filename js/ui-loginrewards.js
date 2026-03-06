// Sprint 85: Time-Based Login Rewards
// Escalating daily login bonuses that increase with consecutive days.
// Day 1: $0.50, Day 2: $1.00, Day 3: $2.00, Day 4: $3.00, Day 5: $5.00,
// Day 6: $7.50, Day 7: $15.00 (weekly jackpot). Resets after a missed day.
// Creates habitual daily return visits and a "don't break the streak" mentality.
(function() {
    'use strict';

    // ── Config ────────────────────────────────────────────────
    var STORAGE_KEY = 'loginRewardState';
    var _stylesInjected = false;

    var REWARDS = [
        { day: 1, amt: 0.50, label: 'Day 1',   emoji: '\uD83C\uDF1F', color: '#22c55e' },
        { day: 2, amt: 1.00, label: 'Day 2',   emoji: '\uD83D\uDCB0', color: '#22c55e' },
        { day: 3, amt: 2.00, label: 'Day 3',   emoji: '\uD83D\uDD25', color: '#3b82f6' },
        { day: 4, amt: 3.00, label: 'Day 4',   emoji: '\u26A1',        color: '#3b82f6' },
        { day: 5, amt: 5.00, label: 'Day 5',   emoji: '\uD83D\uDC8E', color: '#a855f7' },
        { day: 6, amt: 7.50, label: 'Day 6',   emoji: '\uD83C\uDFC6', color: '#a855f7' },
        { day: 7, amt: 15.00,label: 'Day 7 \uD83C\uDF89', emoji: '\uD83D\uDC51', color: '#f59e0b' }
    ];

    // ── Utility ──────────────────────────────────────────────
    function todayStr() {
        var d = new Date();
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }

    function yesterdayStr() {
        var d = new Date();
        d.setDate(d.getDate() - 1);
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }

    // ── State ────────────────────────────────────────────────
    function loadState() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            if (raw) return JSON.parse(raw);
        } catch (e) { /* ignore */ }
        return { lastClaim: null, streak: 0 };
    }

    function saveState(state) {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
    }

    // ── Styles ───────────────────────────────────────────────
    function injectStyles() {
        if (_stylesInjected) return;
        _stylesInjected = true;
        var s = document.createElement('style');
        s.id = 'loginRewardStyles';
        s.textContent = [
            '#lrOverlay{position:fixed;inset:0;z-index:29000;background:rgba(0,0,0,.88);' +
                'display:flex;align-items:center;justify-content:center;padding:16px;' +
                'box-sizing:border-box;opacity:0;transition:opacity .3s ease}',
            '#lrOverlay.active{opacity:1}',
            '#lrPanel{background:linear-gradient(160deg,#0d0d1a,#1a0a2e);' +
                'border-radius:20px;padding:28px 20px;max-width:420px;width:100%;' +
                'text-align:center;transform:scale(.85);transition:transform .4s cubic-bezier(.34,1.56,.64,1)}',
            '#lrOverlay.active #lrPanel{transform:scale(1)}',
            '.lr-title{font-size:22px;font-weight:900;color:#fbbf24;letter-spacing:1px;margin-bottom:4px}',
            '.lr-sub{color:rgba(255,255,255,.45);font-size:12px;margin-bottom:16px}',
            '.lr-days{display:flex;gap:6px;justify-content:center;flex-wrap:wrap;margin-bottom:20px}',
            '.lr-day{width:48px;text-align:center;padding:8px 4px;border-radius:10px;' +
                'background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08)}',
            '.lr-day.past{opacity:.4}',
            '.lr-day.current{border-color:rgba(251,191,36,.6);background:rgba(251,191,36,.08);' +
                'box-shadow:0 0 12px rgba(251,191,36,.2)}',
            '.lr-day.future{opacity:.35}',
            '.lr-day-num{font-size:10px;color:rgba(255,255,255,.5);margin-bottom:2px}',
            '.lr-day-emoji{font-size:20px;margin-bottom:2px}',
            '.lr-day-amt{font-size:11px;font-weight:800;color:#fbbf24}',
            '.lr-day.past .lr-day-amt{color:#22c55e}',
            '.lr-today-box{background:rgba(251,191,36,.08);border:1px solid rgba(251,191,36,.3);' +
                'border-radius:12px;padding:14px;margin-bottom:16px}',
            '.lr-today-label{font-size:11px;color:rgba(255,255,255,.5);text-transform:uppercase;' +
                'letter-spacing:1px;margin-bottom:4px}',
            '.lr-today-amt{color:#fbbf24;font-size:32px;font-weight:900;text-shadow:0 0 12px rgba(251,191,36,.3)}',
            '.lr-streak-text{font-size:11px;color:rgba(255,255,255,.4);margin-bottom:16px}',
            '.lr-claim-btn{width:100%;padding:14px;border:none;border-radius:10px;' +
                'background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;' +
                'font-size:16px;font-weight:900;cursor:pointer;letter-spacing:.5px;' +
                'margin-bottom:8px;transition:opacity .15s}',
            '.lr-claim-btn:hover{opacity:.88}',
            '.lr-skip{background:none;border:none;color:rgba(255,255,255,.25);' +
                'font-size:11px;cursor:pointer;text-decoration:underline}'
        ].join('\n');
        document.head.appendChild(s);
    }

    // ── Show reward modal ────────────────────────────────────
    function showRewardModal(state) {
        injectStyles();

        // Remove old overlay
        var old = document.getElementById('lrOverlay');
        if (old && old.parentNode) old.parentNode.removeChild(old);

        var streak = state.streak; // already updated
        var rewardIdx = Math.min(streak - 1, REWARDS.length - 1);
        var reward = REWARDS[rewardIdx];

        var ov = document.createElement('div');
        ov.id = 'lrOverlay';

        var panel = document.createElement('div');
        panel.id = 'lrPanel';

        // Title
        var title = document.createElement('div');
        title.className = 'lr-title';
        title.textContent = '\uD83C\uDF81 Daily Login Reward!';

        var sub = document.createElement('div');
        sub.className = 'lr-sub';
        sub.textContent = 'Come back every day for bigger rewards!';

        // Day indicators
        var days = document.createElement('div');
        days.className = 'lr-days';
        for (var i = 0; i < REWARDS.length; i++) {
            var r = REWARDS[i];
            var dayEl = document.createElement('div');
            dayEl.className = 'lr-day';
            if (i < streak - 1) dayEl.classList.add('past');
            else if (i === streak - 1) dayEl.classList.add('current');
            else dayEl.classList.add('future');

            var num = document.createElement('div');
            num.className = 'lr-day-num';
            num.textContent = 'D' + (i + 1);
            var em = document.createElement('div');
            em.className = 'lr-day-emoji';
            em.textContent = r.emoji;
            var amt = document.createElement('div');
            amt.className = 'lr-day-amt';
            amt.textContent = '$' + r.amt.toFixed(2);

            dayEl.appendChild(num);
            dayEl.appendChild(em);
            dayEl.appendChild(amt);
            days.appendChild(dayEl);
        }

        // Today's reward box
        var todayBox = document.createElement('div');
        todayBox.className = 'lr-today-box';
        var todayLabel = document.createElement('div');
        todayLabel.className = 'lr-today-label';
        todayLabel.textContent = reward.label + ' Reward';
        var todayAmt = document.createElement('div');
        todayAmt.className = 'lr-today-amt';
        todayAmt.textContent = '+$' + reward.amt.toFixed(2);
        todayBox.appendChild(todayLabel);
        todayBox.appendChild(todayAmt);

        // Streak text
        var streakText = document.createElement('div');
        streakText.className = 'lr-streak-text';
        if (streak >= 7) {
            streakText.textContent = '\uD83C\uDF89 7-day streak complete! Amazing commitment!';
        } else {
            streakText.textContent = '\uD83D\uDD25 ' + streak + '-day login streak! ' +
                (streak < 7 ? 'Come back tomorrow for $' + REWARDS[Math.min(streak, REWARDS.length - 1)].amt.toFixed(2) + '!' : '');
        }

        // Claim button
        var claimBtn = document.createElement('button');
        claimBtn.className = 'lr-claim-btn';
        claimBtn.textContent = '\uD83C\uDF81 CLAIM $' + reward.amt.toFixed(2);
        claimBtn.addEventListener('click', function() {
            // Credit balance
            if (typeof balance !== 'undefined') balance += reward.amt;
            if (typeof updateBalance === 'function') updateBalance();
            if (typeof saveBalance === 'function') saveBalance();
            if (typeof stats !== 'undefined') {
                stats.totalWon = (stats.totalWon || 0) + reward.amt;
                if (typeof saveStats === 'function') saveStats();
            }
            // Mark claimed
            state.lastClaim = todayStr();
            saveState(state);
            closeOverlay(ov);
            // Toast
            if (typeof showWinToast === 'function') {
                showWinToast(reward.label + ' +$' + reward.amt.toFixed(2), 'epic');
            }
        });

        // Skip
        var skip = document.createElement('button');
        skip.className = 'lr-skip';
        skip.textContent = 'Claim later';
        skip.addEventListener('click', function() { closeOverlay(ov); });

        panel.appendChild(title);
        panel.appendChild(sub);
        panel.appendChild(days);
        panel.appendChild(todayBox);
        panel.appendChild(streakText);
        panel.appendChild(claimBtn);
        panel.appendChild(skip);
        ov.appendChild(panel);

        ov.addEventListener('click', function(e) { if (e.target === ov) closeOverlay(ov); });
        document.body.appendChild(ov);

        requestAnimationFrame(function() {
            requestAnimationFrame(function() { ov.classList.add('active'); });
        });
    }

    function closeOverlay(ov) {
        if (!ov) return;
        ov.classList.remove('active');
        setTimeout(function() { if (ov.parentNode) ov.parentNode.removeChild(ov); }, 400);
    }

    // ── Init ─────────────────────────────────────────────────
    function init() {
        // QA suppression
        if (window.location.search.indexOf('noBonus=1') !== -1) return;
        if (window.location.search.indexOf('qaTools=1') !== -1) return;

        var state = loadState();
        var today = todayStr();
        var yesterday = yesterdayStr();

        // Already claimed today
        if (state.lastClaim === today) return;

        // Calculate streak
        if (state.lastClaim === yesterday) {
            // Consecutive day
            state.streak = Math.min((state.streak || 0) + 1, 7);
        } else {
            // Streak broken or first visit
            state.streak = 1;
        }

        // Show reward after a short delay (let other modals settle)
        setTimeout(function() {
            showRewardModal(state);
        }, 3000);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        setTimeout(init, 0);
    }
}());
