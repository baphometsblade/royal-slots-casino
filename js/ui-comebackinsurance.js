// =====================================================================
// UI-COMEBACKINSURANCE MODULE — Comeback Insurance System
// =====================================================================
//
// Loaded via <script> in global scope after ui-lobby.js.
// Depends on globals: balance, updateBalance(), saveBalance(),
//   formatMoney(), showWinToast() (optional)
//
// Monitors session balance and offers tiered "insurance" credits when
// the player's balance drops to certain percentages of the session high.
// Each tier fires once per session (memory-only, resets on reload).
//
// Public API:
//   initComebackInsurance() — bootstrap interval monitor (call from app.js)
// =====================================================================

(function() {
    'use strict';

    // ── QA suppression ──────────────────────────────────────
    function isSuppressed() {
        var search = window.location.search || '';
        return search.indexOf('noBonus=1') !== -1 || search.indexOf('qaTools=1') !== -1;
    }

    // ── Configuration ───────────────────────────────────────
    var CHECK_INTERVAL_MS   = 30000;   // Check balance every 30 seconds
    var AUTO_DISMISS_MS     = 5000;    // Banner auto-dismisses after 5s
    var MIN_SESSION_HIGH    = 10;      // Session high must be >= $10 to activate
    var MIN_CREDIT          = 0.25;    // Floor credit amount
    var MAX_CREDIT_PER_TIER = 25;      // Cap per tier

    var TIERS = [
        {
            id: 'safety_net',
            threshold: 0.50,   // Drop to 50% of session high
            pct: 0.05,         // Credit 5% of lost amount
            label: 'SAFETY NET',
            title: 'Safety Net Activated!',
            msg: "We've got your back!",
            color: '#f59e0b',
            darkColor: '#92400e'
        },
        {
            id: 'recovery_boost',
            threshold: 0.25,   // Drop to 25% of session high
            pct: 0.10,         // Credit 10% of lost amount
            label: 'RECOVERY BOOST',
            title: 'Recovery Boost Engaged!',
            msg: 'Stay in the game!',
            color: '#ef4444',
            darkColor: '#7f1d1d'
        },
        {
            id: 'last_chance',
            threshold: 0.10,   // Drop to 10% of session high
            pct: 0.15,         // Credit 15% of lost amount
            label: 'LAST CHANCE LIFELINE',
            title: 'Lifeline Deployed!',
            msg: "Don't give up now!",
            color: '#dc2626',
            darkColor: '#450a0a'
        }
    ];

    // ── State (session-only, resets on reload) ──────────────
    var _sessionHigh     = 0;
    var _tiersUsed       = {};   // { safety_net: true, ... }
    var _intervalId      = null;
    var _stylesInjected  = false;
    var _bannerEl        = null;
    var _dismissTimer    = null;
    var _initialized     = false;

    // ── Style injection ─────────────────────────────────────
    function injectStyles() {
        if (_stylesInjected) return;
        _stylesInjected = true;

        var style = document.createElement('style');
        style.id = 'comebackStyles';
        style.textContent = [
            '/* ── Comeback Insurance Banner ─────────────────── */',
            '#cbk-banner {',
            '    position: fixed;',
            '    top: 0;',
            '    left: 0;',
            '    right: 0;',
            '    z-index:10400;',
            '    transform: translateY(-100%);',
            '    transition: transform 0.45s cubic-bezier(0.22, 1, 0.36, 1);',
            '    pointer-events: none;',
            '}',
            '#cbk-banner.cbk-visible {',
            '    transform: translateY(0);',
            '    pointer-events: auto;',
            '}',
            '',
            '.cbk-inner {',
            '    position: relative;',
            '    overflow: hidden;',
            '    padding: 16px 24px;',
            '    display: flex;',
            '    flex-direction: column;',
            '    align-items: center;',
            '    gap: 6px;',
            '    text-align: center;',
            '    font-family: inherit;',
            '    box-shadow: 0 4px 24px rgba(0,0,0,0.5), 0 0 60px rgba(239,68,68,0.2);',
            '}',
            '',
            '.cbk-shield {',
            '    font-size: 32px;',
            '    line-height: 1;',
            '    filter: drop-shadow(0 0 8px rgba(255,255,255,0.4));',
            '    animation: cbk-pulse 1.2s ease-in-out infinite;',
            '}',
            '',
            '.cbk-headline {',
            '    font-size: 15px;',
            '    font-weight: 800;',
            '    letter-spacing: 1.5px;',
            '    text-transform: uppercase;',
            '    color: #fff;',
            '    text-shadow: 0 0 12px rgba(255,255,255,0.3);',
            '}',
            '',
            '.cbk-title {',
            '    font-size: 20px;',
            '    font-weight: 700;',
            '    color: #fef3c7;',
            '    margin: 2px 0;',
            '}',
            '',
            '.cbk-amount {',
            '    font-size: 28px;',
            '    font-weight: 900;',
            '    color: #fde68a;',
            '    text-shadow: 0 0 20px rgba(253,230,138,0.6), 0 2px 4px rgba(0,0,0,0.4);',
            '    letter-spacing: 1px;',
            '}',
            '',
            '.cbk-msg {',
            '    font-size: 13px;',
            '    color: rgba(255,255,255,0.8);',
            '    font-style: italic;',
            '}',
            '',
            '/* ── Progress bar ─────────────────────────────── */',
            '.cbk-progress-wrap {',
            '    width: 100%;',
            '    max-width: 320px;',
            '    height: 6px;',
            '    background: rgba(0,0,0,0.3);',
            '    border-radius: 3px;',
            '    overflow: hidden;',
            '    margin-top: 6px;',
            '}',
            '',
            '.cbk-progress-bar {',
            '    height: 100%;',
            '    width: 0%;',
            '    border-radius: 3px;',
            '    transition: width 0.8s cubic-bezier(0.22, 1, 0.36, 1);',
            '}',
            '',
            '/* ── Dismiss button ──────────────────────────── */',
            '.cbk-dismiss {',
            '    position: absolute;',
            '    top: 8px;',
            '    right: 12px;',
            '    background: rgba(255,255,255,0.15);',
            '    border: 1px solid rgba(255,255,255,0.2);',
            '    color: #fff;',
            '    font-size: 16px;',
            '    width: 28px;',
            '    height: 28px;',
            '    border-radius: 50%;',
            '    cursor: pointer;',
            '    display: flex;',
            '    align-items: center;',
            '    justify-content: center;',
            '    transition: background 0.2s;',
            '    line-height: 1;',
            '    padding: 0;',
            '}',
            '.cbk-dismiss:hover {',
            '    background: rgba(255,255,255,0.3);',
            '}',
            '',
            '/* ── Shimmer overlay ────────────────────────── */',
            '.cbk-shimmer {',
            '    position: absolute;',
            '    top: 0; left: -100%; right: 0; bottom: 0;',
            '    width: 200%;',
            '    background: linear-gradient(',
            '        90deg,',
            '        transparent 0%,',
            '        rgba(255,255,255,0.06) 40%,',
            '        rgba(255,255,255,0.12) 50%,',
            '        rgba(255,255,255,0.06) 60%,',
            '        transparent 100%',
            '    );',
            '    animation: cbk-shimmer 2.5s linear infinite;',
            '    pointer-events: none;',
            '}',
            '',
            '/* ── Keyframes ───────────────────────────────── */',
            '@keyframes cbk-pulse {',
            '    0%, 100% { transform: scale(1); }',
            '    50% { transform: scale(1.15); }',
            '}',
            '',
            '@keyframes cbk-shimmer {',
            '    0%   { transform: translateX(-50%); }',
            '    100% { transform: translateX(50%); }',
            '}',
            '',
            '/* ── Mobile adjustments ─────────────────────── */',
            '@media (max-width: 600px) {',
            '    .cbk-inner { padding: 12px 16px; }',
            '    .cbk-shield { font-size: 26px; }',
            '    .cbk-headline { font-size: 12px; letter-spacing: 1px; }',
            '    .cbk-title { font-size: 16px; }',
            '    .cbk-amount { font-size: 22px; }',
            '    .cbk-msg { font-size: 11px; }',
            '}'
        ].join('\n');

        document.head.appendChild(style);
    }

    // ── DOM creation ────────────────────────────────────────
    function ensureBannerEl() {
        if (_bannerEl) return _bannerEl;

        _bannerEl = document.createElement('div');
        _bannerEl.id = 'cbk-banner';
        _bannerEl.setAttribute('role', 'alert');
        _bannerEl.setAttribute('aria-live', 'polite');

        // Inner container (background set dynamically per tier)
        var inner = document.createElement('div');
        inner.className = 'cbk-inner';

        // Shimmer overlay
        var shimmer = document.createElement('div');
        shimmer.className = 'cbk-shimmer';
        inner.appendChild(shimmer);

        // Shield emoji
        var shield = document.createElement('div');
        shield.className = 'cbk-shield';
        shield.textContent = '\uD83D\uDEE1\uFE0F';  // shield emoji
        inner.appendChild(shield);

        // Headline
        var headline = document.createElement('div');
        headline.className = 'cbk-headline';
        headline.setAttribute('data-cbk', 'headline');
        headline.textContent = 'COMEBACK INSURANCE ACTIVATED';
        inner.appendChild(headline);

        // Title
        var title = document.createElement('div');
        title.className = 'cbk-title';
        title.setAttribute('data-cbk', 'title');
        inner.appendChild(title);

        // Amount
        var amount = document.createElement('div');
        amount.className = 'cbk-amount';
        amount.setAttribute('data-cbk', 'amount');
        inner.appendChild(amount);

        // Motivational message
        var msg = document.createElement('div');
        msg.className = 'cbk-msg';
        msg.setAttribute('data-cbk', 'msg');
        inner.appendChild(msg);

        // Progress bar
        var progressWrap = document.createElement('div');
        progressWrap.className = 'cbk-progress-wrap';
        var progressBar = document.createElement('div');
        progressBar.className = 'cbk-progress-bar';
        progressBar.setAttribute('data-cbk', 'progress');
        progressWrap.appendChild(progressBar);
        inner.appendChild(progressWrap);

        // Dismiss button
        var dismiss = document.createElement('button');
        dismiss.className = 'cbk-dismiss';
        dismiss.setAttribute('aria-label', 'Dismiss');
        dismiss.textContent = '\u2715';  // X mark
        dismiss.addEventListener('click', function() {
            hideBanner();
        });
        inner.appendChild(dismiss);

        _bannerEl.appendChild(inner);
        document.body.appendChild(_bannerEl);

        return _bannerEl;
    }

    // ── Banner show / hide ──────────────────────────────────
    function showBanner(tier, creditAmount) {
        injectStyles();
        var banner = ensureBannerEl();
        var inner = banner.querySelector('.cbk-inner');

        // Set gradient background per tier
        inner.style.background = 'linear-gradient(135deg, ' + tier.color + ' 0%, ' + tier.darkColor + ' 100%)';

        // Populate content
        var titleEl = banner.querySelector('[data-cbk="title"]');
        var amountEl = banner.querySelector('[data-cbk="amount"]');
        var msgEl = banner.querySelector('[data-cbk="msg"]');
        var progressEl = banner.querySelector('[data-cbk="progress"]');

        if (titleEl) titleEl.textContent = tier.title;
        if (amountEl) amountEl.textContent = '+' + fmtMoney(creditAmount);
        if (msgEl) msgEl.textContent = tier.msg;

        // Progress bar: color matches tier
        if (progressEl) {
            progressEl.style.background = tier.color;
            progressEl.style.width = '0%';
        }

        // Remove previous visible state, force reflow, then show
        banner.classList.remove('cbk-visible');
        void banner.offsetHeight; // force reflow
        banner.classList.add('cbk-visible');

        // Animate progress bar to 100% after a brief delay
        if (progressEl) {
            requestAnimationFrame(function() {
                requestAnimationFrame(function() {
                    progressEl.style.width = '100%';
                });
            });
        }

        // Auto-dismiss timer
        clearDismissTimer();
        _dismissTimer = setTimeout(function() {
            hideBanner();
        }, AUTO_DISMISS_MS);
    }

    function hideBanner() {
        clearDismissTimer();
        if (_bannerEl) {
            _bannerEl.classList.remove('cbk-visible');
        }
    }

    function clearDismissTimer() {
        if (_dismissTimer) {
            clearTimeout(_dismissTimer);
            _dismissTimer = null;
        }
    }

    // ── Money formatting (local fallback) ───────────────────
    function fmtMoney(amount) {
        if (typeof formatMoney === 'function') {
            return formatMoney(amount);
        }
        return '$' + amount.toFixed(2);
    }

    // ── Core logic: check balance against session high ──────
    function checkInsurance() {
        if (isSuppressed()) return;

        // Read current balance from global
        var currentBalance = typeof balance === 'number' ? balance : 0;
        if (!isFinite(currentBalance) || currentBalance < 0) return;

        // Update session high
        if (currentBalance > _sessionHigh) {
            _sessionHigh = currentBalance;
        }

        // Guard: session high must meet minimum
        if (_sessionHigh < MIN_SESSION_HIGH) return;

        // Check each tier (highest threshold first so multiple don't stack)
        for (var i = 0; i < TIERS.length; i++) {
            var tier = TIERS[i];

            // Skip if already used this session
            if (_tiersUsed[tier.id]) continue;

            // Check if balance has dropped to or below the tier threshold
            var thresholdBalance = _sessionHigh * tier.threshold;
            if (currentBalance <= thresholdBalance) {
                // Calculate the lost amount (from session high to current)
                var lostAmount = _sessionHigh - currentBalance;

                // Credit = percentage of lost amount, clamped
                var creditAmount = lostAmount * tier.pct;
                creditAmount = Math.max(MIN_CREDIT, creditAmount);
                creditAmount = Math.min(MAX_CREDIT_PER_TIER, creditAmount);
                creditAmount = Math.round(creditAmount * 100) / 100; // Round to cents

                // Mark tier as used
                _tiersUsed[tier.id] = true;

                // Apply credit to balance
                applyCredit(creditAmount, tier);

                // Only trigger one tier per check cycle
                break;
            }
        }
    }

    // ── Apply credit to player balance ──────────────────────
    function applyCredit(amount, tier) {
        if (typeof balance !== 'number') return;

        balance += amount;

        // Update UI
        if (typeof updateBalance === 'function') {
            updateBalance();
        }

        // Persist balance
        if (typeof saveBalance === 'function') {
            saveBalance();
        }

        // Show banner
        showBanner(tier, amount);

        // Optional toast notification
        if (typeof showWinToast === 'function') {
            try {
                showWinToast(
                    tier.label + ': +' + fmtMoney(amount),
                    'great',
                    'Comeback Insurance'
                );
            } catch (e) { /* ignore */ }
        }

        // Play sound if available
        if (typeof SoundManager !== 'undefined' && SoundManager && typeof SoundManager.playSoundEvent === 'function') {
            try {
                SoundManager.playSoundEvent('bonus');
            } catch (e) { /* ignore */ }
        }

        // Update session high to include the credit (prevents re-triggers)
        if (balance > _sessionHigh) {
            _sessionHigh = balance;
        }
    }

    // ── Initialization ──────────────────────────────────────
    function initComebackInsurance() {
        if (_initialized) return;
        if (isSuppressed()) return;
        _initialized = true;

        // Set initial session high from current balance
        var currentBalance = typeof balance === 'number' ? balance : 0;
        _sessionHigh = currentBalance;
        _tiersUsed = {};

        // Start periodic check
        _intervalId = setInterval(checkInsurance, CHECK_INTERVAL_MS);

        // Also check immediately on visibility change (tab comes back)
        document.addEventListener('visibilitychange', function() {
            if (!document.hidden) {
                // Small delay so balance has time to update
                setTimeout(checkInsurance, 1000);
            }
        });
    }

    // ── Expose public API ───────────────────────────────────
    window.initComebackInsurance = initComebackInsurance;

}());
