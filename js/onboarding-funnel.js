/**
 * NEW PLAYER ONBOARDING FUNNEL
 * Maximizes visitor → registered → first deposit conversion.
 * IIFE module exposing window.OnboardingFunnel
 */
var OnboardingFunnel = (function() {
    'use strict';

    var IDS = {
        OVERLAY: 'onboarding-overlay',
        WELCOME: 'onboarding-welcome',
        TOUR: 'onboarding-tour',
        NUDGE: 'onboarding-nudge',
        MILESTONE: 'onboarding-milestone'
    };

    var KEYS = {
        STEP: 'onboarding_step',
        SESSIONS: 'onboarding_sessions',
        SPINS: 'onboarding_spins',
        DEPOSITED: 'onboarding_deposited',
        DISMISSED: 'onboarding_dismissed_welcome'
    };

    var state = {
        initialized: false,
        step: 'welcome',
        sessions: 0,
        spins: 0,
        deposited: false,
        tourStep: 0,
        milestonesShown: {}
    };

    // ── Helpers ──────────────────────────────────────────────

    function isQA() {
        return !!(window._qaMode || (window.location.search || '').indexOf('noBonus') !== -1);
    }

    function loadState() {
        try {
            state.step = localStorage.getItem(KEYS.STEP) || 'welcome';
            state.sessions = parseInt(localStorage.getItem(KEYS.SESSIONS) || '0', 10);
            state.spins = parseInt(localStorage.getItem(KEYS.SPINS) || '0', 10);
            state.deposited = localStorage.getItem(KEYS.DEPOSITED) === 'true';
        } catch(e) { /* silent */ }
    }

    function saveState() {
        try {
            localStorage.setItem(KEYS.STEP, state.step);
            localStorage.setItem(KEYS.SESSIONS, state.sessions.toString());
            localStorage.setItem(KEYS.SPINS, state.spins.toString());
            localStorage.setItem(KEYS.DEPOSITED, state.deposited ? 'true' : 'false');
        } catch(e) { /* silent */ }
    }

    function isLoggedIn() {
        try {
            var u = localStorage.getItem('casinoUser');
            return !!u && u !== 'null';
        } catch(e) { return false; }
    }

    function removeEl(id) {
        var el = document.getElementById(id);
        if (el && el.parentNode) el.parentNode.removeChild(el);
    }

    function dismissAll() {
        Object.keys(IDS).forEach(function(k) { removeEl(IDS[k]); });
    }

    // ── CSS Injection ────────────────────────────────────────

    function injectStyles() {
        if (document.getElementById('onboarding-styles')) return;
        var style = document.createElement('style');
        style.id = 'onboarding-styles';
        style.textContent = [
            '@keyframes onbPulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.05)} }',
            '@keyframes onbFade { from{opacity:0} to{opacity:1} }',
            '@keyframes onbSlide { from{transform:translateY(40px);opacity:0} to{transform:translateY(0);opacity:1} }',
            '@keyframes onbFloat { 0%{transform:translateY(0) rotate(0)} 100%{transform:translateY(-100vh) rotate(360deg)} }',
            '@keyframes onbConfetti { 0%{transform:translateY(-20px) rotate(0);opacity:1} 100%{transform:translateY(100vh) rotate(720deg);opacity:0} }',
            '#' + IDS.OVERLAY + '{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(5,5,15,0.92);z-index:99990;display:flex;align-items:center;justify-content:center;animation:onbFade .4s ease}',
            '#' + IDS.WELCOME + '{position:relative;background:linear-gradient(145deg,#1a1a2e,#0f0f23);border:1px solid #d4af37;border-radius:16px;padding:48px 40px;max-width:480px;width:90vw;text-align:center;animation:onbSlide .5s ease;box-shadow:0 0 60px rgba(212,175,55,0.15)}',
            '#' + IDS.NUDGE + '{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:linear-gradient(145deg,#1a1a2e,#0f0f23);border:1px solid #d4af37;border-radius:16px;padding:28px 32px;max-width:440px;width:90vw;text-align:center;z-index:99980;animation:onbSlide .5s ease;box-shadow:0 0 40px rgba(212,175,55,0.2)}',
            '#' + IDS.MILESTONE + '{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:linear-gradient(145deg,#1a1a2e,#0f0f23);border:2px solid #d4af37;border-radius:16px;padding:32px;max-width:380px;width:85vw;text-align:center;z-index:99985;animation:onbSlide .4s ease;box-shadow:0 0 50px rgba(212,175,55,0.25)}',
            '.onb-title{color:#d4af37;font-size:28px;font-weight:800;margin:0 0 12px;text-shadow:0 0 20px rgba(212,175,55,0.3)}',
            '.onb-subtitle{color:#e2e8f0;font-size:16px;margin:0 0 24px;line-height:1.5}',
            '.onb-vp{display:flex;align-items:center;gap:12px;text-align:left;color:#cbd5e1;font-size:15px;margin:10px 0;padding:10px 16px;background:rgba(212,175,55,0.06);border-radius:8px;border-left:3px solid #d4af37}',
            '.onb-vp-icon{font-size:24px;flex-shrink:0}',
            '.onb-btn-primary{display:inline-block;background:linear-gradient(135deg,#d4af37,#b8941f);color:#0a0a1a;font-size:18px;font-weight:700;padding:14px 40px;border:none;border-radius:10px;cursor:pointer;animation:onbPulse 2s infinite;text-transform:uppercase;letter-spacing:1px;margin-top:8px}',
            '.onb-btn-primary:hover{background:linear-gradient(135deg,#e5c349,#d4af37);transform:scale(1.02)}',
            '.onb-link{color:#94a3b8;font-size:13px;margin-top:16px;cursor:pointer;text-decoration:underline}',
            '.onb-link:hover{color:#d4af37}',
            '.onb-amounts{display:flex;gap:10px;justify-content:center;margin:16px 0}',
            '.onb-amount-btn{background:rgba(212,175,55,0.1);border:1px solid rgba(212,175,55,0.3);color:#d4af37;padding:10px 16px;border-radius:8px;cursor:pointer;font-size:14px;font-weight:600;text-align:center;flex:1}',
            '.onb-amount-btn:hover{background:rgba(212,175,55,0.2);border-color:#d4af37}',
            '.onb-amount-btn small{display:block;color:#94a3b8;font-size:11px;margin-top:4px;font-weight:400}',
            '.onb-timer{color:#ef4444;font-size:13px;margin:8px 0}',
            '.onb-reward{display:inline-block;background:linear-gradient(135deg,#d4af37,#b8941f);color:#0a0a1a;font-weight:700;padding:4px 12px;border-radius:20px;font-size:14px;margin:8px 0}',
            '.onb-dismiss{color:#64748b;font-size:12px;margin-top:12px;cursor:pointer;background:none;border:none;padding:4px}',
            '.onb-dismiss:hover{color:#94a3b8}',
            '.onb-particle{position:absolute;width:6px;height:6px;background:#d4af37;border-radius:50%;opacity:0.6;animation:onbFloat linear infinite;pointer-events:none}'
        ].join('\n');
        document.head.appendChild(style);
    }

    // ── Welcome Screen ───────────────────────────────────────

    function showWelcome() {
        if (isLoggedIn() || isQA()) return;
        if (localStorage.getItem(KEYS.DISMISSED)) return;

        dismissAll();
        var overlay = document.createElement('div');
        overlay.id = IDS.OVERLAY;

        var card = document.createElement('div');
        card.id = IDS.WELCOME;

        // Particles
        for (var i = 0; i < 12; i++) {
            var p = document.createElement('div');
            p.className = 'onb-particle';
            p.style.left = Math.random() * 100 + '%';
            p.style.animationDuration = (3 + Math.random() * 4) + 's';
            p.style.animationDelay = Math.random() * 3 + 's';
            card.appendChild(p);
        }

        var title = document.createElement('h1');
        title.className = 'onb-title';
        title.textContent = 'Welcome to Matrix Spins';
        card.appendChild(title);

        var sub = document.createElement('p');
        sub.className = 'onb-subtitle';
        sub.textContent = 'The ultimate online casino experience awaits.';
        card.appendChild(sub);

        var props = [
            { icon: '🎰', text: '150+ Premium Slot Games' },
            { icon: '💰', text: '200% First Deposit Bonus — Up to 5,000 Gems' },
            { icon: '🏆', text: 'Daily Tournaments, Jackpots & Rewards' }
        ];
        props.forEach(function(vp) {
            var row = document.createElement('div');
            row.className = 'onb-vp';
            var iconSpan = document.createElement('span');
            iconSpan.className = 'onb-vp-icon';
            iconSpan.textContent = vp.icon;
            row.appendChild(iconSpan);
            var textSpan = document.createElement('span');
            textSpan.textContent = vp.text;
            row.appendChild(textSpan);
            card.appendChild(row);
        });

        var btn = document.createElement('button');
        btn.className = 'onb-btn-primary';
        btn.textContent = 'CREATE ACCOUNT';
        btn.addEventListener('click', function() {
            dismissAll();
            localStorage.setItem(KEYS.DISMISSED, Date.now().toString());
            if (typeof showAuthModal === 'function') showAuthModal();
        });
        card.appendChild(btn);

        var login = document.createElement('div');
        login.className = 'onb-link';
        login.textContent = 'Already have an account? Log in';
        login.addEventListener('click', function() {
            dismissAll();
            localStorage.setItem(KEYS.DISMISSED, Date.now().toString());
            if (typeof showAuthModal === 'function') showAuthModal();
        });
        card.appendChild(login);

        overlay.appendChild(card);
        document.body.appendChild(overlay);
    }

    // ── First Deposit Nudge ──────────────────────────────────

    function showDepositNudge() {
        if (state.deposited || isQA()) return;
        if (document.getElementById(IDS.NUDGE)) return;

        var nudge = document.createElement('div');
        nudge.id = IDS.NUDGE;

        var title = document.createElement('div');
        title.className = 'onb-title';
        title.style.fontSize = '20px';
        title.textContent = "You're playing great! 🎮";
        nudge.appendChild(title);

        var sub = document.createElement('p');
        sub.className = 'onb-subtitle';
        sub.style.fontSize = '14px';
        sub.style.margin = '4px 0 8px';
        sub.textContent = 'Unlock the full experience with your first deposit:';
        nudge.appendChild(sub);

        var timer = document.createElement('div');
        timer.className = 'onb-timer';
        timer.textContent = '⏰ 200% Bonus offer expires in 23:59:59';
        nudge.appendChild(timer);

        // Countdown
        var remaining = 24 * 3600;
        var timerInt = setInterval(function() {
            remaining--;
            if (remaining <= 0) { clearInterval(timerInt); return; }
            var h = Math.floor(remaining / 3600);
            var m = Math.floor((remaining % 3600) / 60);
            var s = remaining % 60;
            timer.textContent = '⏰ 200% Bonus offer expires in ' +
                String(h).padStart(2,'0') + ':' + String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');
        }, 1000);

        var amounts = document.createElement('div');
        amounts.className = 'onb-amounts';
        var amtData = [
            { amt: 10, bonus: 30 },
            { amt: 25, bonus: 75 },
            { amt: 50, bonus: 150 }
        ];
        amtData.forEach(function(d) {
            var btn = document.createElement('button');
            btn.className = 'onb-amount-btn';
            btn.innerHTML = '$' + d.amt + '<small>Get $' + d.bonus + ' total</small>';
            btn.addEventListener('click', function() {
                clearInterval(timerInt);
                removeEl(IDS.NUDGE);
                if (typeof showWalletModal === 'function') showWalletModal();
            });
            amounts.appendChild(btn);
        });
        nudge.appendChild(amounts);

        var mainBtn = document.createElement('button');
        mainBtn.className = 'onb-btn-primary';
        mainBtn.style.fontSize = '15px';
        mainBtn.style.padding = '12px 32px';
        mainBtn.textContent = 'DEPOSIT NOW';
        mainBtn.addEventListener('click', function() {
            clearInterval(timerInt);
            removeEl(IDS.NUDGE);
            if (typeof showWalletModal === 'function') showWalletModal();
        });
        nudge.appendChild(mainBtn);

        var dismiss = document.createElement('button');
        dismiss.className = 'onb-dismiss';
        dismiss.textContent = 'Maybe later';
        dismiss.addEventListener('click', function() {
            clearInterval(timerInt);
            removeEl(IDS.NUDGE);
        });
        nudge.appendChild(dismiss);

        document.body.appendChild(nudge);
    }

    // ── Session Milestones ───────────────────────────────────

    function showMilestone(emoji, title, desc, reward) {
        if (isQA()) return;
        removeEl(IDS.MILESTONE);

        var card = document.createElement('div');
        card.id = IDS.MILESTONE;

        var icon = document.createElement('div');
        icon.style.fontSize = '48px';
        icon.style.marginBottom = '8px';
        icon.textContent = emoji;
        card.appendChild(icon);

        var h = document.createElement('div');
        h.className = 'onb-title';
        h.style.fontSize = '22px';
        h.textContent = title;
        card.appendChild(h);

        var p = document.createElement('p');
        p.className = 'onb-subtitle';
        p.style.fontSize = '14px';
        p.style.margin = '4px 0 12px';
        p.textContent = desc;
        card.appendChild(p);

        if (reward) {
            var badge = document.createElement('div');
            badge.className = 'onb-reward';
            badge.textContent = '+' + reward + ' Gems';
            card.appendChild(badge);
        }

        var dismiss = document.createElement('button');
        dismiss.className = 'onb-dismiss';
        dismiss.textContent = 'Continue Playing';
        dismiss.addEventListener('click', function() {
            removeEl(IDS.MILESTONE);
        });
        card.appendChild(dismiss);

        document.body.appendChild(card);

        // Auto-dismiss after 4 seconds
        setTimeout(function() { removeEl(IDS.MILESTONE); }, 4000);
    }

    // ── Public API ───────────────────────────────────────────

    function init() {
        if (state.initialized) return;
        if (isQA()) return;
        state.initialized = true;

        injectStyles();
        loadState();

        // Increment session count
        state.sessions++;
        state.spins = 0;
        saveState();

        // Show welcome for unregistered visitors
        if (!isLoggedIn() && state.step === 'welcome') {
            setTimeout(function() { showWelcome(); }, 1500);
        }
    }

    function onSpin(result) {
        if (isQA() || state.deposited || state.sessions > 3) return;

        state.spins++;
        saveState();

        // Milestone: 10 spins
        if (state.spins === 10 && !state.milestonesShown['10spins']) {
            state.milestonesShown['10spins'] = true;
            showMilestone('🎉', 'Nice Work!', 'You\'ve completed 10 spins — you\'re a natural!', 25);
        }

        // Milestone: first win
        if (result && result.won && !state.milestonesShown['firstWin']) {
            state.milestonesShown['firstWin'] = true;
            setTimeout(function() {
                showMilestone('🏆', 'WINNER!', 'Congratulations on your first win!', 50);
            }, 1500);
        }

        // After 5 spins: deposit nudge
        if (state.spins === 5 && !state.deposited) {
            setTimeout(function() { showDepositNudge(); }, 2000);
        }

        // After 25 spins: stronger nudge
        if (state.spins === 25 && !state.deposited && !state.milestonesShown['25spins']) {
            state.milestonesShown['25spins'] = true;
            showMilestone('⭐', 'You\'re a Natural!', 'Deposit now to unlock VIP rewards & bigger wins.', null);
            setTimeout(function() { showDepositNudge(); }, 5000);
        }
    }

    function onDeposit() {
        state.deposited = true;
        state.step = 'completed';
        saveState();
        dismissAll();
    }

    function onRegister() {
        state.step = 'registered';
        localStorage.setItem(KEYS.DISMISSED, Date.now().toString());
        saveState();
        dismissAll();
    }

    return {
        init: init,
        onSpin: onSpin,
        onDeposit: onDeposit,
        onRegister: onRegister,
        dismiss: dismissAll
    };
})();
