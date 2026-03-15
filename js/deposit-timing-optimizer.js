// ═══════════════════════════════════════════════════════════════════════════
// INTELLIGENT DEPOSIT TIMING OPTIMIZER
// Identifies optimal moments to present deposit offers for maximum conversion
// Tracks 6 behavioral signals and presents contextual offers when score >= 65
// ═══════════════════════════════════════════════════════════════════════════

(function() {
    'use strict';

    var MODAL_ID = 'deposit-timing-modal';
    var OVERLAY_ID = 'deposit-timing-overlay';
    var CONTAINER_ID = 'deposit-timing-container';

    var state = {
        // Signal tracking
        consecutiveWins: 0,
        momentumScore: 0,
        nearMisses: 0,
        nearMissScore: 0,
        sessionPeakBalance: 0,
        currentBalance: 0,
        balanceThresholdBreaches: {},
        balanceAnxietyScore: 0,
        sessionStartTime: 0,
        sessionDepthScore: 0,
        lastSpinTime: 0,
        spinRate: 0,
        engagementPeakScore: 0,
        socialTriggerScore: 0,

        // Composite state
        lastDepositPromptTime: 0,
        promptsShownInSession: 0,
        lastDepositTime: 0,
        dismissedOffersCount: 0,
        previousScores: [],

        // UI state
        isModalShowing: false,
        currentDominantSignal: null
    };

    var MOMENTUM_THRESHOLD = 25;
    var NEAR_MISS_THRESHOLD = 15;
    var BALANCE_ANXIETY_THRESHOLD_50 = 20;
    var BALANCE_ANXIETY_THRESHOLD_25 = 30;
    var BALANCE_ANXIETY_THRESHOLD_10 = 40;
    var SESSION_DEPTH_SCORE_PER_10_MIN = 10;
    var SESSION_DEPTH_SCORE_MAX = 30;
    var ENGAGEMENT_PEAK_THRESHOLD = 20;
    var SOCIAL_TRIGGER_THRESHOLD = 15;

    var PROMPT_COOLDOWN_MS = 300000; // 5 minutes
    var MAX_PROMPTS_PER_SESSION = 3;
    var MIN_DEPOSIT_PROMPT_INTERVAL = 1800000; // 30 minutes
    var OFFER_DISMISSAL_COOLDOWN_MULTIPLIER = 1.5;

    // ────────────────────────────────────────────────────────────────────────
    // STYLES (embedded inline)
    // ────────────────────────────────────────────────────────────────────────

    var style = document.createElement('style');
    style.id = 'deposit-timing-optimizer-styles';
    style.textContent = `
        /* Modal overlay */
        #${OVERLAY_ID} {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.85);
            display: none;
            align-items: center;
            justify-content: flex-end;
            z-index: 9988;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            animation: fadeIn 0.3s ease-in-out;
        }

        #${OVERLAY_ID}.show {
            display: flex;
        }

        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        /* Modal container - slides in from right */
        #${CONTAINER_ID} {
            background: #1a1a2e;
            width: 100%;
            max-width: 420px;
            height: 100vh;
            max-height: 600px;
            border-radius: 24px 0 0 24px;
            padding: 32px 24px;
            position: relative;
            box-shadow: -4px 0 40px rgba(0, 0, 0, 0.8);
            display: flex;
            flex-direction: column;
            animation: slideInRight 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
            overflow-y: auto;
            margin: auto 0;
        }

        @keyframes slideInRight {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }

        .deposit-timing-close {
            position: absolute;
            top: 16px;
            right: 16px;
            background: none;
            border: none;
            color: #999;
            font-size: 28px;
            cursor: pointer;
            width: 44px;
            height: 44px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
            border-radius: 8px;
        }

        .deposit-timing-close:hover {
            background: rgba(255, 255, 255, 0.1);
            color: #fff;
            transform: scale(1.1);
        }

        /* Theme-specific styles */
        .deposit-timing-content {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 24px;
        }

        .deposit-timing-signal-icon {
            font-size: 48px;
            margin-bottom: 12px;
        }

        .deposit-timing-headline {
            color: #fff;
            font-size: 22px;
            font-weight: 700;
            line-height: 1.3;
            margin-bottom: 8px;
        }

        .deposit-timing-subheadline {
            color: #aaa;
            font-size: 14px;
            line-height: 1.5;
            margin-bottom: 16px;
        }

        /* Theme: Momentum (Green) */
        .deposit-timing-modal.momentum {
            border-top: 4px solid #00ff88;
        }

        .deposit-timing-modal.momentum .deposit-timing-headline {
            background: linear-gradient(135deg, #00ff88, #00cc66);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }

        .deposit-timing-modal.momentum .deposit-timing-cta {
            background: linear-gradient(135deg, #00ff88, #00cc66);
            color: #000;
        }

        .deposit-timing-modal.momentum .deposit-timing-cta:hover {
            box-shadow: 0 0 30px rgba(0, 255, 136, 0.5);
        }

        /* Theme: Balance Anxiety (Orange) */
        .deposit-timing-modal.anxiety {
            border-top: 4px solid #ff9500;
        }

        .deposit-timing-modal.anxiety .deposit-timing-headline {
            background: linear-gradient(135deg, #ff9500, #ff6b35);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }

        .deposit-timing-modal.anxiety .deposit-timing-cta {
            background: linear-gradient(135deg, #ff9500, #ff6b35);
            color: #fff;
        }

        .deposit-timing-modal.anxiety .deposit-timing-cta:hover {
            box-shadow: 0 0 30px rgba(255, 149, 0, 0.5);
        }

        .deposit-timing-modal.anxiety .balance-display {
            animation: pulse-orange 1.5s ease-in-out infinite;
        }

        @keyframes pulse-orange {
            0%, 100% { color: #ff9500; }
            50% { color: #fff; }
        }

        /* Theme: Near-Miss (Purple) */
        .deposit-timing-modal.nearmiss {
            border-top: 4px solid #b366ff;
        }

        .deposit-timing-modal.nearmiss .deposit-timing-headline {
            background: linear-gradient(135deg, #b366ff, #9933ff);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }

        .deposit-timing-modal.nearmiss .deposit-timing-cta {
            background: linear-gradient(135deg, #b366ff, #9933ff);
            color: #fff;
        }

        .deposit-timing-modal.nearmiss .deposit-timing-cta:hover {
            box-shadow: 0 0 30px rgba(179, 102, 255, 0.5);
        }

        .spinning-coin {
            display: inline-block;
            animation: spin 2s linear infinite;
        }

        @keyframes spin {
            0% { transform: rotateY(0deg); }
            100% { transform: rotateY(360deg); }
        }

        /* Theme: Session Depth (Blue) */
        .deposit-timing-modal.depth {
            border-top: 4px solid #00d4ff;
        }

        .deposit-timing-modal.depth .deposit-timing-headline {
            background: linear-gradient(135deg, #00d4ff, #0099ff);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }

        .deposit-timing-modal.depth .deposit-timing-cta {
            background: linear-gradient(135deg, #00d4ff, #0099ff);
            color: #000;
        }

        .deposit-timing-modal.depth .deposit-timing-cta:hover {
            box-shadow: 0 0 30px rgba(0, 212, 255, 0.5);
        }

        .deposit-timing-progress-bar {
            width: 100%;
            height: 8px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 4px;
            overflow: hidden;
            margin-top: 12px;
        }

        .deposit-timing-progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #00d4ff, #0099ff);
            width: 0%;
            transition: width 0.3s ease-out;
            border-radius: 4px;
        }

        /* Theme: Engagement Peak (Red) */
        .deposit-timing-modal.engagement {
            border-top: 4px solid #ff3344;
        }

        .deposit-timing-modal.engagement .deposit-timing-headline {
            background: linear-gradient(135deg, #ff3344, #ff1744);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }

        .deposit-timing-modal.engagement .deposit-timing-cta {
            background: linear-gradient(135deg, #ff3344, #ff1744);
            color: #fff;
        }

        .deposit-timing-modal.engagement .deposit-timing-cta:hover {
            box-shadow: 0 0 30px rgba(255, 51, 68, 0.5);
        }

        .lightning-bolt {
            display: inline-block;
            animation: lightning-flash 1.5s ease-in-out infinite;
        }

        @keyframes lightning-flash {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }

        /* CTA Button */
        .deposit-timing-cta {
            width: 100%;
            border: none;
            padding: 16px 20px;
            border-radius: 12px;
            font-weight: 700;
            font-size: 16px;
            cursor: pointer;
            transition: all 0.3s;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            min-height: 44px;
            margin-top: auto;
        }

        .deposit-timing-cta:hover {
            transform: translateY(-2px);
        }

        .deposit-timing-cta:active {
            transform: translateY(0);
        }

        /* Secondary button */
        .deposit-timing-secondary {
            background: rgba(255, 255, 255, 0.1);
            color: #999;
            border: 1px solid rgba(255, 255, 255, 0.2);
            margin-top: 12px;
            width: 100%;
            padding: 12px 20px;
            border-radius: 8px;
            font-weight: 500;
            font-size: 14px;
            cursor: pointer;
            transition: all 0.2s;
            min-height: 44px;
        }

        .deposit-timing-secondary:hover {
            background: rgba(255, 255, 255, 0.15);
            color: #ccc;
        }

        /* Score display (for debugging) */
        .deposit-timing-score-debug {
            display: none;
            background: rgba(0, 255, 136, 0.1);
            border: 1px solid rgba(0, 255, 136, 0.3);
            border-radius: 8px;
            padding: 12px;
            margin-top: 12px;
            font-size: 12px;
            color: #00ff88;
            font-family: monospace;
            line-height: 1.6;
        }

        .deposit-timing-score-debug.show {
            display: block;
        }

        /* Responsive */
        @media (max-width: 600px) {
            #${CONTAINER_ID} {
                max-width: 100%;
                border-radius: 24px 24px 0 0;
                height: auto;
                max-height: 80vh;
            }

            .deposit-timing-headline {
                font-size: 20px;
            }
        }
    `;
    document.head.appendChild(style);

    // ────────────────────────────────────────────────────────────────────────
    // SIGNAL TRACKING
    // ────────────────────────────────────────────────────────────────────────

    function updateMomentumSignal(won, consecutive) {
        if (won) {
            state.consecutiveWins++;
            state.momentumScore = Math.min(state.consecutiveWins * MOMENTUM_THRESHOLD, 100);
        } else {
            state.consecutiveWins = 0;
            state.momentumScore = Math.max(state.momentumScore - 10, 0);
        }
    }

    function updateNearMissSignal(isNearMiss) {
        if (isNearMiss) {
            state.nearMisses++;
            state.nearMissScore = Math.min(state.nearMisses * NEAR_MISS_THRESHOLD, 100);
        } else {
            if (state.nearMisses > 0) {
                state.nearMisses--;
            }
            state.nearMissScore = Math.max(state.nearMissScore - 8, 0);
        }
    }

    function updateBalanceAnxietySignal(balance, peakBalance) {
        state.currentBalance = balance;

        if (peakBalance > 0) {
            var percentOfPeak = balance / peakBalance;
            var anxietyDelta = 0;

            // Check if we've hit new thresholds
            if (percentOfPeak <= 0.1 && !state.balanceThresholdBreaches['10']) {
                state.balanceThresholdBreaches['10'] = true;
                anxietyDelta += BALANCE_ANXIETY_THRESHOLD_10;
            } else if (percentOfPeak > 0.1 && state.balanceThresholdBreaches['10']) {
                state.balanceThresholdBreaches['10'] = false;
            }

            if (percentOfPeak <= 0.25 && !state.balanceThresholdBreaches['25']) {
                state.balanceThresholdBreaches['25'] = true;
                anxietyDelta += BALANCE_ANXIETY_THRESHOLD_25;
            } else if (percentOfPeak > 0.25 && state.balanceThresholdBreaches['25']) {
                state.balanceThresholdBreaches['25'] = false;
            }

            if (percentOfPeak <= 0.5 && !state.balanceThresholdBreaches['50']) {
                state.balanceThresholdBreaches['50'] = true;
                anxietyDelta += BALANCE_ANXIETY_THRESHOLD_50;
            } else if (percentOfPeak > 0.5 && state.balanceThresholdBreaches['50']) {
                state.balanceThresholdBreaches['50'] = false;
            }

            state.balanceAnxietyScore = Math.min(state.balanceAnxietyScore + anxietyDelta, 100);
        }

        // Decay if balance recovers
        if (state.balanceAnxietyScore > 0 && Object.keys(state.balanceThresholdBreaches).filter(function(k) { return state.balanceThresholdBreaches[k]; }).length === 0) {
            state.balanceAnxietyScore = Math.max(state.balanceAnxietyScore - 5, 0);
        }
    }

    function updateSessionDepthSignal() {
        if (state.sessionStartTime === 0) {
            state.sessionStartTime = Date.now();
        }

        var elapsedMinutes = (Date.now() - state.sessionStartTime) / 60000;
        var depthIncrements = Math.floor(elapsedMinutes / 10);
        state.sessionDepthScore = Math.min(depthIncrements * SESSION_DEPTH_SCORE_PER_10_MIN, SESSION_DEPTH_SCORE_MAX);
    }

    function updateEngagementPeakSignal(timeSinceLast) {
        // Fast spin rate: < 3 seconds between spins
        if (timeSinceLast < 3000 && timeSinceLast > 0) {
            state.engagementPeakScore = ENGAGEMENT_PEAK_THRESHOLD;
        } else if (timeSinceLast >= 3000) {
            state.engagementPeakScore = Math.max(state.engagementPeakScore - 8, 0);
        }
    }

    function updateSocialTriggerSignal(triggered) {
        if (triggered) {
            state.socialTriggerScore = SOCIAL_TRIGGER_THRESHOLD;
            // Decay after 2 minutes
            setTimeout(function() {
                state.socialTriggerScore = Math.max(state.socialTriggerScore - 15, 0);
            }, 120000);
        }
    }

    // ────────────────────────────────────────────────────────────────────────
    // COMPOSITE SCORING
    // ────────────────────────────────────────────────────────────────────────

    function calculateCompositeScore() {
        updateSessionDepthSignal();

        var scores = {
            momentum: state.momentumScore,
            nearMiss: state.nearMissScore,
            balanceAnxiety: state.balanceAnxietyScore,
            sessionDepth: state.sessionDepthScore,
            engagementPeak: state.engagementPeakScore,
            socialTrigger: state.socialTriggerScore
        };

        // Weighted average (adjusted for player sensitivity)
        var dismissalPenalty = Math.max(1, 1 + (state.dismissedOffersCount * -0.2));

        var composite = (
            (scores.momentum * 0.20) +
            (scores.nearMiss * 0.18) +
            (scores.balanceAnxiety * 0.25) +
            (scores.sessionDepth * 0.15) +
            (scores.engagementPeak * 0.12) +
            (scores.socialTrigger * 0.10)
        ) * dismissalPenalty;

        state.previousScores.push({
            timestamp: Date.now(),
            composite: Math.round(composite),
            breakdown: scores
        });

        if (state.previousScores.length > 100) {
            state.previousScores.shift();
        }

        return Math.round(Math.min(composite, 100));
    }

    function getDominantSignal() {
        var breakdown = state.previousScores.length > 0
            ? state.previousScores[state.previousScores.length - 1].breakdown
            : {
                momentum: state.momentumScore,
                nearMiss: state.nearMissScore,
                balanceAnxiety: state.balanceAnxietyScore,
                sessionDepth: state.sessionDepthScore,
                engagementPeak: state.engagementPeakScore,
                socialTrigger: state.socialTriggerScore
            };

        var max = Math.max(
            breakdown.momentum,
            breakdown.nearMiss,
            breakdown.balanceAnxiety,
            breakdown.sessionDepth,
            breakdown.engagementPeak,
            breakdown.socialTrigger
        );

        if (max === 0) return 'momentum';
        if (breakdown.momentum === max) return 'momentum';
        if (breakdown.balanceAnxiety === max) return 'anxiety';
        if (breakdown.nearMiss === max) return 'nearmiss';
        if (breakdown.sessionDepth === max) return 'depth';
        if (breakdown.engagementPeak === max) return 'engagement';
        if (breakdown.socialTrigger === max) return 'engagement';

        return 'momentum';
    }

    // ────────────────────────────────────────────────────────────────────────
    // COOLDOWN & RATE LIMITING
    // ────────────────────────────────────────────────────────────────────────

    function canShowPrompt() {
        var now = Date.now();

        // Check prompt cooldown
        if (now - state.lastDepositPromptTime < PROMPT_COOLDOWN_MS) {
            return false;
        }

        // Check max prompts per session
        if (state.promptsShownInSession >= MAX_PROMPTS_PER_SESSION) {
            return false;
        }

        // Check recent deposit
        if (now - state.lastDepositTime < MIN_DEPOSIT_PROMPT_INTERVAL) {
            return false;
        }

        return true;
    }

    // ────────────────────────────────────────────────────────────────────────
    // DOM CREATION & PRESENTATION
    // ────────────────────────────────────────────────────────────────────────

    function createDOM() {
        if (document.getElementById(OVERLAY_ID)) return;

        var overlay = document.createElement('div');
        overlay.id = OVERLAY_ID;

        var container = document.createElement('div');
        container.id = CONTAINER_ID;
        container.className = 'deposit-timing-modal momentum';

        overlay.appendChild(container);
        document.body.appendChild(overlay);
    }

    function getOfferContent(dominantSignal) {
        var content = {
            momentum: {
                icon: '🔥',
                headline: "You're on FIRE!",
                subheadline: 'Double down with a deposit and keep the streak alive!',
                ctaText: 'DEPOSIT NOW',
                class: 'momentum'
            },
            anxiety: {
                icon: '⏱️',
                headline: 'Running low?',
                subheadline: 'Quick top-up to stay in the game!',
                ctaText: 'TOP UP BALANCE',
                class: 'anxiety'
            },
            nearmiss: {
                icon: '🪙',
                headline: "You're SO CLOSE!",
                subheadline: 'A deposit could be your lucky charm!',
                ctaText: 'DEPOSIT & TRY AGAIN',
                class: 'nearmiss'
            },
            depth: {
                icon: '📈',
                headline: 'Level Up Your Game',
                subheadline: 'Unlock the next level with a deposit!',
                ctaText: 'UNLOCK NOW',
                class: 'depth'
            },
            engagement: {
                icon: '⚡',
                headline: 'Power Player Bonus!',
                subheadline: 'Fast players get 175% deposit match!',
                ctaText: 'CLAIM 175% MATCH',
                class: 'engagement'
            }
        };

        return content[dominantSignal] || content.momentum;
    }

    function showDepositOffer(dominantSignal) {
        if (!canShowPrompt()) {
            return;
        }

        createDOM();

        var container = document.getElementById(CONTAINER_ID);
        var modal = container.parentElement;
        var content = getOfferContent(dominantSignal);

        container.className = 'deposit-timing-modal ' + content.class;

        var minutesInSession = Math.floor((Date.now() - state.sessionStartTime) / 60000);

        container.innerHTML = `
            <button class="deposit-timing-close">✕</button>
            <div class="deposit-timing-content">
                <div>
                    <div class="deposit-timing-signal-icon">${content.icon}</div>
                    <div class="deposit-timing-headline">${content.headline}</div>
                    <div class="deposit-timing-subheadline">${content.subheadline}</div>
                </div>

                ${dominantSignal === 'depth' ? `
                    <div style="display: flex; flex-direction: column; gap: 8px;">
                        <div style="color: #ccc; font-size: 13px;">
                            You've been playing for <span style="color: #fff; font-weight: 600;">${minutesInSession} minutes</span>
                        </div>
                        <div class="deposit-timing-progress-bar">
                            <div class="deposit-timing-progress-fill" style="width: ${Math.min(minutesInSession * 5, 100)}%"></div>
                        </div>
                    </div>
                ` : ''}

                ${dominantSignal === 'anxiety' ? `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: rgba(255, 149, 0, 0.1); border-radius: 8px; border: 1px solid rgba(255, 149, 0, 0.2);">
                        <span style="color: #aaa; font-size: 13px;">Current Balance</span>
                        <span class="balance-display" style="font-weight: 700; font-size: 16px;">${state.currentBalance.toLocaleString()}</span>
                    </div>
                ` : ''}

                ${dominantSignal === 'nearmiss' ? `
                    <div style="text-align: center; padding: 16px; background: rgba(179, 102, 255, 0.05); border-radius: 8px;">
                        <div class="spinning-coin">🪙</div>
                    </div>
                ` : ''}

                ${dominantSignal === 'engagement' ? `
                    <div style="display: flex; justify-content: space-around; padding: 12px; background: rgba(255, 51, 68, 0.1); border-radius: 8px;">
                        <span class="lightning-bolt">⚡</span>
                        <span class="lightning-bolt">⚡</span>
                        <span class="lightning-bolt">⚡</span>
                    </div>
                ` : ''}

                <div class="deposit-timing-score-debug" id="deposit-timing-score-debug"></div>
            </div>

            <button class="deposit-timing-cta" id="deposit-timing-cta">${content.ctaText}</button>
            <button class="deposit-timing-secondary" id="deposit-timing-decline">Not now</button>
        `;

        // Show debug info in QA mode
        if (window._qaMode) {
            var scoreDebug = document.getElementById('deposit-timing-score-debug');
            scoreDebug.classList.add('show');
            var breakdown = state.previousScores.length > 0 ? state.previousScores[state.previousScores.length - 1].breakdown : {};
            scoreDebug.textContent = 'Momentum: ' + Math.round(breakdown.momentum) + '\n' +
                'Near-miss: ' + Math.round(breakdown.nearMiss) + '\n' +
                'Balance Anxiety: ' + Math.round(breakdown.balanceAnxiety) + '\n' +
                'Session Depth: ' + Math.round(breakdown.sessionDepth) + '\n' +
                'Engagement Peak: ' + Math.round(breakdown.engagementPeak) + '\n' +
                'Social Trigger: ' + Math.round(breakdown.socialTrigger) + '\n' +
                'Dominant: ' + dominantSignal;
        }

        var ctaBtn = document.getElementById('deposit-timing-cta');
        var declineBtn = document.getElementById('deposit-timing-decline');
        var closeBtn = container.querySelector('.deposit-timing-close');

        function closeModal() {
            state.isModalShowing = false;
            modal.classList.remove('show');
        }

        ctaBtn.addEventListener('click', function() {
            state.lastDepositPromptTime = Date.now();
            state.promptsShownInSession++;
            trackConversion(dominantSignal);
            closeModal();

            // Trigger deposit flow if available
            if (window.DepositBonus && window.DepositBonus.showModal) {
                window.DepositBonus.showModal();
            }
        });

        declineBtn.addEventListener('click', function() {
            state.dismissedOffersCount++;
            closeModal();
            trackDismissal(dominantSignal);
        });

        closeBtn.addEventListener('click', closeModal);

        modal.addEventListener('click', function(e) {
            if (e.target === modal) closeModal();
        });

        state.isModalShowing = true;
        modal.classList.add('show');
    }

    // ────────────────────────────────────────────────────────────────────────
    // TRACKING & ANALYTICS
    // ────────────────────────────────────────────────────────────────────────

    function trackConversion(signal) {
        if (window.ABTesting && window.ABTesting.trackConversion) {
            window.ABTesting.trackConversion('deposit_timing_' + signal);
        }

        if (window.FunnelTracker && window.FunnelTracker.trackEvent) {
            var score = calculateCompositeScore();
            window.FunnelTracker.trackEvent('deposit_prompt_accepted', {
                signal: signal,
                score: score,
                dismissals: state.dismissedOffersCount
            });
        }
    }

    function trackDismissal(signal) {
        if (window.FunnelTracker && window.FunnelTracker.trackEvent) {
            var score = calculateCompositeScore();
            window.FunnelTracker.trackEvent('deposit_prompt_dismissed', {
                signal: signal,
                score: score,
                dismissalCount: state.dismissedOffersCount
            });
        }
    }

    // ────────────────────────────────────────────────────────────────────────
    // PUBLIC API
    // ────────────────────────────────────────────────────────────────────────

    var _initialized = false;

    function init() {
        if (_initialized) return;
        _initialized = true;

        state.sessionStartTime = Date.now();
        state.lastDepositPromptTime = 0;
        state.promptsShownInSession = 0;
        state.dismissedOffersCount = 0;

        console.warn('[DepositTimingOptimizer] Module initialized');
    }

    function onSpinResult(data) {
        // data: { won: bool, amount: num, bet: num, balance: num, isNearMiss: bool }
        if (!_initialized) return;

        var now = Date.now();
        if (state.lastSpinTime > 0) {
            var timeSinceLast = now - state.lastSpinTime;
            updateEngagementPeakSignal(timeSinceLast);
        }
        state.lastSpinTime = now;

        if (data.won) {
            updateMomentumSignal(true, state.consecutiveWins + 1);
            updateNearMissSignal(false);
        } else {
            updateMomentumSignal(false, 0);
            if (data.isNearMiss) {
                updateNearMissSignal(true);
            }
        }

        var peakBalance = state.sessionPeakBalance;
        if (data.balance > peakBalance) {
            peakBalance = data.balance;
            state.sessionPeakBalance = peakBalance;
        }

        updateBalanceAnxietySignal(data.balance, peakBalance);
    }

    function onSocialEvent(type, data) {
        // type: 'big_win', 'jackpot', etc
        if (!_initialized) return;
        if (type === 'big_win' || type === 'jackpot') {
            updateSocialTriggerSignal(true);
        }
    }

    function getDepositScore() {
        if (!_initialized) return 0;
        return calculateCompositeScore();
    }

    function checkAndPresent() {
        if (!_initialized) return;

        var score = getDepositScore();

        if (score >= 65 && !state.isModalShowing) {
            var signal = getDominantSignal();
            state.currentDominantSignal = signal;
            showDepositOffer(signal);

            console.warn('[DepositTimingOptimizer] Presenting offer:', {
                score: score,
                signal: signal
            });
        }
    }

    function recordDepositCompleted() {
        state.lastDepositTime = Date.now();
    }

    window.DepositTimingOptimizer = {
        init: init,
        onSpinResult: onSpinResult,
        onSocialEvent: onSocialEvent,
        getDepositScore: getDepositScore,
        checkAndPresent: checkAndPresent,
        recordDepositCompleted: recordDepositCompleted,
        getState: function() {
            return JSON.parse(JSON.stringify(state));
        },
        getScoreHistory: function() {
            return state.previousScores.slice(-20);
        }
    };

})();
