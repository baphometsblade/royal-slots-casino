// ═══════════════════════════════════════════════════════════════
// DAILY LOGIN CALENDAR MODULE
// 7-day reward cycle with streak bonuses and auto-popup
// ═══════════════════════════════════════════════════════════════

(function() {
    'use strict';

    var API_BASE = '/api/daily-login';
    var MODAL_ID = 'daily-login-modal';
    var OVERLAY_ID = 'daily-login-overlay';
    var CONFETTI_ID = 'daily-login-confetti';

    var state = {
        status: null,
        isShowing: false,
        hasClaimedToday: false
    };

    // ────────────────────────────────────────────────────────────
    // STYLES (embedded inline)
    // ────────────────────────────────────────────────────────────

    var style = document.createElement('style');
    style.id = 'daily-login-styles';
    style.textContent = `
        #${OVERLAY_ID} {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.85);
            display: none;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            font-family: 'Inter', sans-serif;
            animation: fadeIn 0.3s ease-in-out;
        }

        #${OVERLAY_ID}.show {
            display: flex;
        }

        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        #${MODAL_ID} {
            background: linear-gradient(135deg, rgba(30, 15, 60, 0.98), rgba(50, 20, 80, 0.98));
            border: 3px solid #ffd700;
            border-radius: 25px;
            max-width: 500px;
            width: 95%;
            padding: 40px 30px;
            position: relative;
            box-shadow:
                0 0 60px rgba(255, 215, 0, 0.4),
                inset 0 0 30px rgba(255, 215, 0, 0.1);
            animation: slideUp 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        @keyframes slideUp {
            from {
                transform: translateY(40px);
                opacity: 0;
            }
            to {
                transform: translateY(0);
                opacity: 1;
            }
        }

        .daily-login-close {
            position: absolute;
            top: 15px;
            right: 20px;
            background: none;
            border: none;
            color: #ffd700;
            font-size: 32px;
            cursor: pointer;
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: transform 0.2s;
        }

        .daily-login-close:hover {
            transform: scale(1.15);
        }

        .daily-login-title {
            text-align: center;
            color: #ffd700;
            font-size: 28px;
            font-weight: 800;
            margin: 0 0 10px 0;
            text-shadow: 0 0 15px rgba(255, 215, 0, 0.6);
            letter-spacing: 1px;
        }

        .daily-login-subtitle {
            text-align: center;
            color: #fff;
            font-size: 14px;
            margin: 0 0 25px 0;
            opacity: 0.9;
        }

        .daily-login-streak {
            background: rgba(255, 215, 0, 0.15);
            border: 2px solid #ffd700;
            border-radius: 12px;
            padding: 12px 15px;
            margin-bottom: 25px;
            text-align: center;
            color: #ffd700;
            font-size: 16px;
            font-weight: 700;
        }

        .daily-login-streak-number {
            font-size: 24px;
            display: block;
            margin: 5px 0 0 0;
        }

        .daily-login-calendar {
            display: grid;
            grid-template-columns: repeat(7, 1fr);
            gap: 8px;
            margin-bottom: 25px;
        }

        .daily-login-day {
            aspect-ratio: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            border-radius: 10px;
            font-size: 11px;
            font-weight: 600;
            cursor: default;
            transition: all 0.2s;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.2);
            color: #ccc;
            padding: 4px;
            text-align: center;
        }

        .daily-login-day.future {
            opacity: 0.4;
        }

        .daily-login-day.claimed {
            background: rgba(76, 175, 80, 0.3);
            border-color: #4caf50;
            color: #4caf50;
        }

        .daily-login-day.claimed::before {
            content: '✓';
            font-size: 18px;
            display: block;
            margin-bottom: 2px;
        }

        .daily-login-day.today {
            background: linear-gradient(135deg, rgba(255, 215, 0, 0.4), rgba(255, 215, 0, 0.2));
            border: 2px solid #ffd700;
            color: #ffd700;
            box-shadow: 0 0 15px rgba(255, 215, 0, 0.4);
            transform: scale(1.05);
        }

        .daily-login-day-label {
            font-size: 9px;
            opacity: 0.7;
            margin-top: 2px;
        }

        .daily-login-reward-display {
            background: rgba(255, 215, 0, 0.1);
            border: 2px solid #ffd700;
            border-radius: 15px;
            padding: 20px;
            margin-bottom: 20px;
            text-align: center;
        }

        .daily-login-reward-day {
            color: #ffd700;
            font-size: 12px;
            margin-bottom: 8px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        .daily-login-reward-amount {
            color: #ffd700;
            font-size: 32px;
            font-weight: 800;
            margin: 8px 0;
            text-shadow: 0 0 10px rgba(255, 215, 0, 0.5);
        }

        .daily-login-reward-bonus {
            color: #ff6b9d;
            font-size: 14px;
            margin-top: 8px;
        }

        .daily-login-reward-tokens {
            color: #4caf50;
            font-size: 13px;
            margin-top: 5px;
        }

        .daily-login-milestone {
            background: rgba(76, 175, 80, 0.1);
            border: 1px solid #4caf50;
            border-radius: 8px;
            padding: 10px;
            margin-bottom: 20px;
            font-size: 12px;
            color: #4caf50;
            text-align: center;
        }

        .daily-login-claim-btn {
            width: 100%;
            padding: 16px;
            background: linear-gradient(135deg, #ffd700, #ffed4e);
            border: none;
            border-radius: 12px;
            color: #000;
            font-size: 16px;
            font-weight: 800;
            cursor: pointer;
            transition: all 0.3s;
            letter-spacing: 1px;
            text-transform: uppercase;
            box-shadow: 0 5px 20px rgba(255, 215, 0, 0.4);
        }

        .daily-login-claim-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 30px rgba(255, 215, 0, 0.6);
        }

        .daily-login-claim-btn:active {
            transform: translateY(0);
        }

        .daily-login-claim-btn.pulse {
            animation: pulse 1.5s infinite;
        }

        @keyframes pulse {
            0%, 100% {
                box-shadow: 0 5px 20px rgba(255, 215, 0, 0.4);
            }
            50% {
                box-shadow: 0 5px 40px rgba(255, 215, 0, 0.8);
            }
        }

        .daily-login-claim-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        .daily-login-claim-btn.claimed {
            background: rgba(76, 175, 80, 0.8);
            cursor: default;
        }

        .daily-login-claim-btn.claimed:hover {
            transform: none;
            box-shadow: 0 5px 20px rgba(76, 175, 80, 0.4);
        }

        #${CONFETTI_ID} {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 10001;
        }

        .confetti-piece {
            position: absolute;
            pointer-events: none;
        }
    `;
    document.head.appendChild(style);

    // ────────────────────────────────────────────────────────────
    // UTILITY FUNCTIONS
    // ────────────────────────────────────────────────────────────

    async function api(path, opts) {
        opts = opts || {};
        var token = localStorage.getItem('casinoToken');
        if (!token && opts.requireAuth !== false) {
            throw new Error('Not authenticated');
        }

        var csrfToken = localStorage.getItem('csrfToken') || '';

        var fetchOpts = {
            method: opts.method || 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': csrfToken
            }
        };

        if (token) {
            fetchOpts.headers['Authorization'] = 'Bearer ' + token;
        }

        if (opts.body) {
            fetchOpts.body = JSON.stringify(opts.body);
        }

        var response = await fetch(path, fetchOpts);
        var data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'API error');
        }

        return data;
    }

    function formatRewardType(type) {
        if (type === 'gems') return '💎 Gems';
        return type;
    }

    // ────────────────────────────────────────────────────────────
    // CONFETTI ANIMATION
    // ────────────────────────────────────────────────────────────

    function playConfetti() {
        var container = document.getElementById(CONFETTI_ID);
        if (!container) return;

        var pieceCount = 50;
        for (var i = 0; i < pieceCount; i++) {
            var piece = document.createElement('div');
            piece.className = 'confetti-piece';
            piece.textContent = Math.random() > 0.5 ? '✨' : '🎉';
            piece.style.left = Math.random() * 100 + '%';
            piece.style.top = '-10px';
            piece.style.fontSize = (Math.random() * 20 + 15) + 'px';
            piece.style.opacity = '1';
            piece.style.transition = 'all 2s ease-in';

            container.appendChild(piece);

            setTimeout(function(p) {
                p.style.top = window.innerHeight + 'px';
                p.style.opacity = '0';
                p.style.transform = 'rotate(' + (Math.random() * 720 - 360) + 'deg)';
            }, 10, piece);

            setTimeout(function(p) {
                p.remove();
            }, 2100, piece);
        }
    }

    // ────────────────────────────────────────────────────────────
    // RENDER FUNCTIONS
    // ────────────────────────────────────────────────────────────

    function renderCalendar(status) {
        var grid = document.querySelector('.daily-login-calendar');
        if (!grid) return;

        grid.innerHTML = '';

        (status.calendar || []).forEach(function(day) {
            var dayEl = document.createElement('div');
            dayEl.className = 'daily-login-day';

            if (day.claimed) {
                dayEl.classList.add('claimed');
            } else {
                dayEl.classList.add('future');
            }

            var today = new Date().toISOString().substring(0, 10);
            if (day.date === today) {
                dayEl.classList.remove('future');
                dayEl.classList.add('today');
            }

            var dayNum = parseInt(day.date.substring(8, 10), 10);
            dayEl.innerHTML = '<div>' + dayNum + '</div>';

            if (day.claimed && day.rewardAmount) {
                dayEl.innerHTML += '<div class="daily-login-day-label">' + day.rewardAmount + '</div>';
            }

            grid.appendChild(dayEl);
        });
    }

    function renderRewardDisplay(status) {
        var container = document.querySelector('.daily-login-reward-display');
        if (!container) return;

        var reward = status.todayReward;
        var dayLabel = 'Day ' + status.todayInCycle + ' of 7';

        var html = '<div class="daily-login-reward-day">' + dayLabel + '</div>';
        html += '<div class="daily-login-reward-amount">' + reward.bonusAmount + '</div>';
        html += '<div style="color: #ccc; font-size: 12px;">💎 Gems</div>';

        if (reward.freeSpinTokens > 0) {
            html += '<div class="daily-login-reward-tokens">🎟️ + ' + reward.freeSpinTokens + ' Free Spin Token' + (reward.freeSpinTokens > 1 ? 's' : '') + '</div>';
        }

        if (reward.bonusAmount > reward.baseAmount) {
            var bonus = reward.bonusAmount - reward.baseAmount;
            html += '<div class="daily-login-reward-bonus">🔥 Streak Bonus: +' + bonus + ' gems!</div>';
        }

        container.innerHTML = html;
    }

    function renderMilestone(status) {
        var container = document.querySelector('.daily-login-milestone');
        if (!container) return;

        var milestone = status.nextMilestone;
        var html = '';

        if (milestone.achieved) {
            html = '🏆 Day ' + milestone.days + ' Milestone Achieved!';
        } else {
            var remaining = milestone.days - milestone.progress;
            html = '🎯 ' + remaining + ' more days to unlock Day ' + milestone.days + ' reward!';
        }

        container.innerHTML = html;
    }

    function updateClaimButton(status) {
        var btn = document.querySelector('.daily-login-claim-btn');
        if (!btn) return;

        if (state.hasClaimedToday || !status.canClaimToday) {
            btn.textContent = '✓ Claimed Today';
            btn.classList.add('claimed');
            btn.disabled = true;
            btn.classList.remove('pulse');
        } else {
            btn.textContent = '🎁 Claim Reward';
            btn.classList.remove('claimed');
            btn.disabled = false;
            btn.classList.add('pulse');
        }
    }

    // ────────────────────────────────────────────────────────────
    // MODAL OPERATIONS
    // ────────────────────────────────────────────────────────────

    function createModal() {
        if (document.getElementById(MODAL_ID)) {
            return document.getElementById(MODAL_ID);
        }

        var overlay = document.createElement('div');
        overlay.id = OVERLAY_ID;

        var modal = document.createElement('div');
        modal.id = MODAL_ID;

        var closeBtn = document.createElement('button');
        closeBtn.className = 'daily-login-close';
        closeBtn.innerHTML = '✕';
        closeBtn.onclick = function() {
            closeCalendar();
        };

        var title = document.createElement('h2');
        title.className = 'daily-login-title';
        title.textContent = '📅 Daily Rewards';

        var subtitle = document.createElement('p');
        subtitle.className = 'daily-login-subtitle';
        subtitle.textContent = 'Log in daily to build your streak!';

        var streak = document.createElement('div');
        streak.className = 'daily-login-streak';
        streak.innerHTML = '🔥 Current Streak<span class="daily-login-streak-number">0</span>';

        var rewardDisplay = document.createElement('div');
        rewardDisplay.className = 'daily-login-reward-display';
        rewardDisplay.innerHTML = '<div>Loading...</div>';

        var milestone = document.createElement('div');
        milestone.className = 'daily-login-milestone';
        milestone.innerHTML = 'Loading...';

        var calendar = document.createElement('div');
        calendar.className = 'daily-login-calendar';

        var claimBtn = document.createElement('button');
        claimBtn.className = 'daily-login-claim-btn';
        claimBtn.textContent = '🎁 Claim Reward';
        claimBtn.onclick = function() {
            claimReward();
        };

        modal.appendChild(closeBtn);
        modal.appendChild(title);
        modal.appendChild(subtitle);
        modal.appendChild(streak);
        modal.appendChild(rewardDisplay);
        modal.appendChild(milestone);
        modal.appendChild(calendar);
        modal.appendChild(claimBtn);

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        // Create confetti container
        var confetti = document.createElement('div');
        confetti.id = CONFETTI_ID;
        document.body.appendChild(confetti);

        return modal;
    }

    async function loadStatus() {
        try {
            var data = await api(API_BASE + '/status');
            state.status = data;

            var modal = document.getElementById(MODAL_ID);
            if (!modal) {
                createModal();
                modal = document.getElementById(MODAL_ID);
            }

            // Update streak
            var streakEl = modal.querySelector('.daily-login-streak');
            streakEl.innerHTML = '🔥 Current Streak<span class="daily-login-streak-number">' + data.currentStreak + '</span>';

            renderRewardDisplay(data);
            renderMilestone(data);
            renderCalendar(data);
            updateClaimButton(data);

            state.hasClaimedToday = !data.canClaimToday;
        } catch (err) {
            console.warn('[DailyLoginCalendar] Load status error:', err);
        }
    }

    async function claimReward() {
        if (state.hasClaimedToday || !state.status || !state.status.canClaimToday) {
            return;
        }

        var btn = document.querySelector('.daily-login-claim-btn');
        btn.disabled = true;

        try {
            var result = await api(API_BASE + '/claim', {
                method: 'POST'
            });

            state.hasClaimedToday = true;

            // Update UI
            var modal = document.getElementById(MODAL_ID);
            var streakEl = modal.querySelector('.daily-login-streak');
            streakEl.innerHTML = '🔥 Current Streak<span class="daily-login-streak-number">' + result.newStreak + '</span>';

            updateClaimButton({ canClaimToday: false });

            // Celebration animation
            playConfetti();

            // Reload status after a short delay to refresh calendar
            setTimeout(function() {
                loadStatus();
            }, 1000);
        } catch (err) {
            console.warn('[DailyLoginCalendar] Claim error:', err);
            btn.disabled = false;
        }
    }

    // ────────────────────────────────────────────────────────────
    // PUBLIC API
    // ────────────────────────────────────────────────────────────

    function init() {
        if (!state.status) {
            loadStatus().catch(function(err) {
                console.warn('[DailyLoginCalendar] Init error:', err);
            });
        }
    }

    function showCalendar() {
        var overlay = document.getElementById(OVERLAY_ID);
        if (!overlay) {
            createModal();
        }
        overlay = document.getElementById(OVERLAY_ID);
        overlay.classList.add('show');
        state.isShowing = true;

        if (!state.status) {
            loadStatus();
        }
    }

    function closeCalendar() {
        var overlay = document.getElementById(OVERLAY_ID);
        if (overlay) {
            overlay.classList.remove('show');
        }
        state.isShowing = false;
    }

    // Expose public API
    window.DailyLoginCalendar = {
        init: init,
        showCalendar: showCalendar,
        closeCalendar: closeCalendar
    };

})();
