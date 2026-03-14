(function() {
    'use strict';

    var SmartDepositNudge = {};

    // ===== STATE TRACKING =====
    var state = {
        sessionSpinCount: 0,
        consecutiveLosses: 0,
        consecutiveWins: 0,
        lastNudgeTime: 0,
        lastOverlayTime: 0,
        nearWinDetected: false,
        depositsThisSession: 0,
        lastBalance: null,
        startingBalance: null,
        sessionStartTime: Date.now(),
        hasDeposited: false,
        checkDepositPromise: null,
        isMonitoring: false,
        monitoringInterval: null,
        currentlyShowingOverlay: false,
        disabledTriggers: []
    };

    // ===== CONFIGURATION =====
    var config = {
        monitoringIntervalMs: 5000,
        toastCooldownMs: 180000, // 3 minutes
        overlayCooldownMs: 600000, // 10 minutes
        lowBalanceThresholdPercent: 0.20,
        lowBalanceThresholdMin: 5,
        lossStreakThreshold: 5,
        winStreakThreshold: 3,
        sessionSpinThreshold: 50,
        autoUrgencyTimeoutMs: 300000, // 5 minutes for overlay countdown
        overlayDisplayDurationMs: 10000 // 10 seconds before auto-closing
    };

    // ===== COLORS & STYLING =====
    var colors = {
        dark: '#0a0a1a',
        darkGlass: 'rgba(10, 10, 26, 0.95)',
        gold: '#d4af37',
        goldLight: '#ffd700',
        goldGlow: 'rgba(212, 175, 55, 0.3)',
        text: '#f0f0f0',
        accent: '#ff6b6b'
    };

    // ===== HELPER: CHECK DEPOSIT STATUS =====
    async function checkHasDeposited() {
        if (state.checkDepositPromise) {
            return state.checkDepositPromise;
        }

        state.checkDepositPromise = (async function() {
            try {
                if (typeof window.api !== 'undefined') {
                    var result = await window.api('/api/deposits', {});
                    if (result && Array.isArray(result) && result.length > 0) {
                        state.hasDeposited = true;
                        return true;
                    }
                }
            } catch (err) {
                console.warn('smart-deposit-nudge: could not check deposit status', err);
            }
            return false;
        })();

        return state.checkDepositPromise;
    }

    // ===== HELPER: GET CURRENT BALANCE =====
    function getCurrentBalance() {
        if (typeof window.balance !== 'undefined') {
            return window.balance;
        }
        return null;
    }

    // ===== HELPER: INITIALIZE SESSION STATE =====
    function initializeSession() {
        var currentBalance = getCurrentBalance();
        if (currentBalance !== null && state.lastBalance === null) {
            state.lastBalance = currentBalance;
            state.startingBalance = currentBalance;
        }
    }

    // ===== TRIGGER: LOW BALANCE ALERT =====
    function checkLowBalance() {
        var currentBalance = getCurrentBalance();
        if (currentBalance === null) return false;

        var threshold = Math.max(
            state.startingBalance * config.lowBalanceThresholdPercent,
            config.lowBalanceThresholdMin
        );

        return currentBalance < threshold && currentBalance > 0;
    }

    // ===== TRIGGER: LOSS STREAK COMFORT =====
    function checkLossStreak() {
        return state.consecutiveLosses >= config.lossStreakThreshold &&
            state.consecutiveLosses > 0;
    }

    // ===== TRIGGER: NEAR-WIN EXCITEMENT =====
    function checkNearWin() {
        return state.nearWinDetected;
    }

    // ===== TRIGGER: SESSION MILESTONE =====
    function checkSessionMilestone() {
        return state.sessionSpinCount >= config.sessionSpinThreshold &&
            state.sessionSpinCount % config.sessionSpinThreshold === 0;
    }

    // ===== TRIGGER: WIN STREAK COOLDOWN =====
    function checkWinStreakEnded() {
        return state.consecutiveWins >= config.winStreakThreshold &&
            state.consecutiveLosses === 1;
    }

    // ===== SHOULD SHOW TOAST =====
    function shouldShowToast() {
        if (state.hasDeposited) return false;
        if (state.disabledTriggers.includes('toast')) return false;

        var now = Date.now();
        return (now - state.lastNudgeTime) >= config.toastCooldownMs;
    }

    // ===== SHOULD SHOW OVERLAY =====
    function shouldShowOverlay() {
        if (state.hasDeposited) return false;
        if (state.currentlyShowingOverlay) return false;
        if (state.disabledTriggers.includes('overlay')) return false;

        var now = Date.now();
        return (now - state.lastOverlayTime) >= config.overlayCooldownMs;
    }

    // ===== DETERMINE WHICH TRIGGER FIRED =====
    function getActiveTrigger() {
        // Priority order: high-impact triggers first
        if (checkLossStreak() && shouldShowOverlay()) {
            return { type: 'loss-streak', message: 'Tough streak! Deposit now for a 150% COMEBACK BONUS — limited time!' };
        }
        if (checkWinStreakEnded() && shouldShowOverlay()) {
            return { type: 'win-streak-ended', message: 'Great run! Deposit now to keep the momentum going! 🔥' };
        }
        if (checkSessionMilestone() && shouldShowToast()) {
            return { type: 'session-milestone', message: 'You\'ve been playing for a while! Unlock a deposit bonus before it expires.' };
        }
        if (checkLowBalance() && shouldShowToast()) {
            return { type: 'low-balance', message: 'Running low? Top up now and get back in the game! 🎰' };
        }
        if (checkNearWin() && shouldShowToast()) {
            return { type: 'near-win', message: 'SO CLOSE! Your luck is turning — deposit to keep spinning! 💫' };
        }
        return null;
    }

    // ===== UI: SLIDE-UP TOAST =====
    function showToastNudge(message) {
        if (!shouldShowToast()) return;

        var toast = document.createElement('div');
        toast.id = 'deposit-nudge-toast';
        toast.style.cssText = [
            'position: fixed;',
            'bottom: -200px;',
            'left: 50%;',
            'transform: translateX(-50%);',
            'width: 90%;',
            'max-width: 400px;',
            'background: ' + colors.darkGlass + ';',
            'border: 2px solid ' + colors.gold + ';',
            'border-radius: 12px;',
            'padding: 16px 20px;',
            'z-index: 9998;',
            'box-shadow: 0 10px 40px rgba(0,0,0,0.8);',
            'font-family: "Segoe UI", Tahoma, Geneva, sans-serif;',
            'color: ' + colors.text + ';',
            'font-size: 14px;',
            'line-height: 1.4;',
            'transition: bottom 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);',
            'display: flex;',
            'align-items: center;',
            'justify-content: space-between;',
            'gap: 12px;'
        ].join('');

        var content = document.createElement('div');
        content.style.flex = '1';
        content.textContent = message;

        var btn = document.createElement('button');
        btn.textContent = 'Quick Deposit';
        btn.style.cssText = [
            'background: ' + colors.gold + ';',
            'color: #000;',
            'border: none;',
            'border-radius: 6px;',
            'padding: 8px 16px;',
            'font-weight: bold;',
            'cursor: pointer;',
            'font-size: 13px;',
            'white-space: nowrap;',
            'transition: all 0.3s ease;'
        ].join('');

        btn.addEventListener('mouseover', function() {
            btn.style.background = colors.goldLight;
            btn.style.transform = 'scale(1.05)';
        });

        btn.addEventListener('mouseout', function() {
            btn.style.background = colors.gold;
            btn.style.transform = 'scale(1)';
        });

        btn.addEventListener('click', function() {
            if (typeof window.openWalletModal === 'function') {
                window.openWalletModal();
            } else if (typeof window.showDepositModal === 'function') {
                window.showDepositModal();
            }
            removeToast(toast);
        });

        var closeBtn = document.createElement('button');
        closeBtn.textContent = '×';
        closeBtn.style.cssText = [
            'background: none;',
            'border: none;',
            'color: ' + colors.gold + ';',
            'font-size: 24px;',
            'cursor: pointer;',
            'padding: 0;',
            'width: 28px;',
            'height: 28px;',
            'display: flex;',
            'align-items: center;',
            'justify-content: center;'
        ].join('');

        closeBtn.addEventListener('click', function() {
            removeToast(toast);
        });

        toast.appendChild(content);
        toast.appendChild(btn);
        toast.appendChild(closeBtn);
        document.body.appendChild(toast);

        // Slide up animation
        setTimeout(function() {
            toast.style.bottom = '20px';
        }, 50);

        state.lastNudgeTime = Date.now();

        // Auto-dismiss after 8 seconds
        setTimeout(function() {
            if (document.body.contains(toast)) {
                removeToast(toast);
            }
        }, 8000);
    }

    function removeToast(toast) {
        toast.style.bottom = '-200px';
        setTimeout(function() {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 400);
    }

    // ===== UI: DEPOSIT BOOST OVERLAY =====
    function showDepositBoostOverlay(message) {
        if (!shouldShowOverlay()) return;

        state.currentlyShowingOverlay = true;

        // Backdrop
        var backdrop = document.createElement('div');
        backdrop.id = 'deposit-nudge-overlay-backdrop';
        backdrop.style.cssText = [
            'position: fixed;',
            'top: 0;',
            'left: 0;',
            'width: 100%;',
            'height: 100%;',
            'background: rgba(0, 0, 0, 0.7);',
            'z-index: 9999;',
            'animation: fadeIn 0.3s ease;'
        ].join('');

        // Overlay container
        var overlay = document.createElement('div');
        overlay.id = 'deposit-nudge-overlay';
        overlay.style.cssText = [
            'position: fixed;',
            'top: 50%;',
            'left: 50%;',
            'transform: translate(-50%, -50%) scale(0.9);',
            'width: 90%;',
            'max-width: 500px;',
            'background: ' + colors.darkGlass + ';',
            'border: 3px solid ' + colors.gold + ';',
            'border-radius: 16px;',
            'padding: 40px 30px;',
            'z-index: 10000;',
            'box-shadow: 0 20px 80px rgba(212, 175, 55, 0.2), 0 0 40px ' + colors.goldGlow + ';',
            'font-family: "Segoe UI", Tahoma, Geneva, sans-serif;',
            'text-align: center;',
            'color: ' + colors.text + ';',
            'animation: slideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);'
        ].join('');

        // Header
        var header = document.createElement('div');
        header.style.cssText = 'font-size: 24px; font-weight: bold; margin-bottom: 16px; color: ' + colors.goldLight + ';';
        header.textContent = '🎁 Limited Time Bonus!';

        // Message
        var msgEl = document.createElement('div');
        msgEl.style.cssText = 'font-size: 16px; margin-bottom: 20px; line-height: 1.5;';
        msgEl.textContent = message;

        // Bonus offer
        var bonusBox = document.createElement('div');
        bonusBox.style.cssText = [
            'background: rgba(212, 175, 55, 0.1);',
            'border: 2px solid ' + colors.gold + ';',
            'border-radius: 10px;',
            'padding: 20px;',
            'margin: 20px 0;',
            'font-size: 18px;',
            'font-weight: bold;',
            'color: ' + colors.goldLight + ';'
        ].join('');
        bonusBox.textContent = '150% Match Bonus on your next deposit!';

        // Countdown timer
        var timerEl = document.createElement('div');
        timerEl.id = 'deposit-nudge-countdown';
        timerEl.style.cssText = [
            'font-size: 14px;',
            'color: ' + colors.accent + ';',
            'margin: 16px 0;',
            'font-weight: bold;'
        ].join('');

        var countdownStartTime = Date.now();
        var countdownDuration = config.autoUrgencyTimeoutMs;

        function updateCountdown() {
            var elapsed = Date.now() - countdownStartTime;
            var remaining = Math.max(0, countdownDuration - elapsed);
            var seconds = Math.ceil(remaining / 1000);

            if (seconds > 0) {
                timerEl.textContent = 'Claim in ' + seconds + ' seconds...';
            } else {
                timerEl.textContent = 'Offer has expired';
                claimBtn.disabled = true;
                claimBtn.style.opacity = '0.5';
                claimBtn.style.cursor = 'not-allowed';
            }
        }

        updateCountdown();
        var countdownInterval = setInterval(updateCountdown, 1000);

        // Buttons container
        var btnContainer = document.createElement('div');
        btnContainer.style.cssText = [
            'display: flex;',
            'gap: 12px;',
            'margin-top: 24px;',
            'flex-direction: column;'
        ].join('');

        // Claim button
        var claimBtn = document.createElement('button');
        claimBtn.id = 'deposit-nudge-claim-btn';
        claimBtn.textContent = 'CLAIM BONUS';
        claimBtn.style.cssText = [
            'background: linear-gradient(135deg, ' + colors.gold + ', ' + colors.goldLight + ');',
            'color: #000;',
            'border: none;',
            'border-radius: 8px;',
            'padding: 14px 24px;',
            'font-size: 16px;',
            'font-weight: bold;',
            'cursor: pointer;',
            'transition: all 0.3s ease;',
            'box-shadow: 0 4px 15px rgba(212, 175, 55, 0.3);'
        ].join('');

        claimBtn.addEventListener('mouseover', function() {
            claimBtn.style.transform = 'scale(1.05)';
            claimBtn.style.boxShadow = '0 6px 25px rgba(212, 175, 55, 0.5)';
        });

        claimBtn.addEventListener('mouseout', function() {
            claimBtn.style.transform = 'scale(1)';
            claimBtn.style.boxShadow = '0 4px 15px rgba(212, 175, 55, 0.3)';
        });

        claimBtn.addEventListener('click', function() {
            clearInterval(countdownInterval);
            if (typeof window.openWalletModal === 'function') {
                window.openWalletModal();
            } else if (typeof window.showDepositModal === 'function') {
                window.showDepositModal();
            }
            removeOverlay(overlay, backdrop);
        });

        // Maybe later button
        var laterBtn = document.createElement('button');
        laterBtn.textContent = 'Maybe Later';
        laterBtn.style.cssText = [
            'background: transparent;',
            'color: ' + colors.text + ';',
            'border: 2px solid ' + colors.gold + ';',
            'border-radius: 8px;',
            'padding: 12px 24px;',
            'font-size: 14px;',
            'cursor: pointer;',
            'transition: all 0.3s ease;'
        ].join('');

        laterBtn.addEventListener('mouseover', function() {
            laterBtn.style.background = 'rgba(212, 175, 55, 0.1)';
        });

        laterBtn.addEventListener('mouseout', function() {
            laterBtn.style.background = 'transparent';
        });

        laterBtn.addEventListener('click', function() {
            clearInterval(countdownInterval);
            removeOverlay(overlay, backdrop);
        });

        btnContainer.appendChild(claimBtn);
        btnContainer.appendChild(laterBtn);

        // Assemble overlay
        overlay.appendChild(header);
        overlay.appendChild(msgEl);
        overlay.appendChild(bonusBox);
        overlay.appendChild(timerEl);
        overlay.appendChild(btnContainer);

        document.body.appendChild(backdrop);
        document.body.appendChild(overlay);

        state.lastOverlayTime = Date.now();

        // Add CSS animations if not already added
        if (!document.querySelector('style[data-smart-nudge-animations]')) {
            var style = document.createElement('style');
            style.setAttribute('data-smart-nudge-animations', 'true');
            style.textContent = [
                '@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }',
                '@keyframes slideIn { from { transform: translate(-50%, -50%) scale(0.9); } to { transform: translate(-50%, -50%) scale(1); } }',
                '.deposit-nudge-pulse { animation: pulse 1.5s ease-in-out infinite; }',
                '@keyframes pulse { 0%, 100% { text-shadow: 0 0 0 0 ' + colors.gold + '; } 50% { text-shadow: 0 0 20px 10px rgba(212, 175, 55, 0.5); } }'
            ].join(' ');
            document.head.appendChild(style);
        }
    }

    function removeOverlay(overlay, backdrop) {
        state.currentlyShowingOverlay = false;
        overlay.style.opacity = '0';
        backdrop.style.opacity = '0';
        setTimeout(function() {
            if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
            if (backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
        }, 300);
    }

    // ===== UI: BALANCE PULSE WIDGET =====
    function updateBalancePulseWidget() {
        var currentBalance = getCurrentBalance();
        if (currentBalance === null) return;

        var threshold = Math.max(
            state.startingBalance * config.lowBalanceThresholdPercent,
            config.lowBalanceThresholdMin
        );

        var balanceDisplay = document.querySelector('[data-balance]') ||
                            document.querySelector('.balance-display') ||
                            document.getElementById('player-balance');

        if (balanceDisplay && currentBalance < threshold && currentBalance > 0) {
            if (!balanceDisplay.id) {
                balanceDisplay.id = 'deposit-nudge-pulse';
            }
            balanceDisplay.classList.add('deposit-nudge-pulse');

            // Add deposit badge if not present
            if (!document.querySelector('#deposit-nudge-badge')) {
                var badge = document.createElement('span');
                badge.id = 'deposit-nudge-badge';
                badge.textContent = '+$';
                badge.style.cssText = [
                    'margin-left: 8px;',
                    'color: ' + colors.gold + ';',
                    'cursor: pointer;',
                    'font-weight: bold;',
                    'transition: all 0.3s ease;'
                ].join('');

                badge.addEventListener('click', function() {
                    if (typeof window.openWalletModal === 'function') {
                        window.openWalletModal();
                    } else if (typeof window.showDepositModal === 'function') {
                        window.showDepositModal();
                    }
                });

                balanceDisplay.appendChild(badge);
            }
        } else if (balanceDisplay) {
            balanceDisplay.classList.remove('deposit-nudge-pulse');
            var badge = document.querySelector('#deposit-nudge-badge');
            if (badge && badge.parentNode) {
                badge.parentNode.removeChild(badge);
            }
        }
    }

    // ===== PUBLIC API =====

    SmartDepositNudge.onSpin = function(result) {
        if (!state.isMonitoring) return;

        state.sessionSpinCount++;
        state.nearWinDetected = false;

        // Update balance tracking
        var currentBalance = getCurrentBalance();
        if (currentBalance !== null && state.lastBalance !== null) {
            state.lastBalance = currentBalance;
        }

        // Detect near-wins (2/3 matching symbols)
        if (result && result.reels && Array.isArray(result.reels)) {
            var reelMatch = result.reels.filter(function(reel) {
                return reel && reel.symbol;
            }).reduce(function(acc, reel) {
                var sym = reel.symbol;
                if (acc.hasOwnProperty(sym)) {
                    acc[sym]++;
                } else {
                    acc[sym] = 1;
                }
                return acc;
            }, {});

            for (var sym in reelMatch) {
                if (reelMatch[sym] === 2) {
                    state.nearWinDetected = true;
                    break;
                }
            }
        }

        // Track win/loss streaks
        if (result && result.won) {
            state.consecutiveLosses = 0;
            state.consecutiveWins++;
        } else {
            state.consecutiveWins = 0;
            state.consecutiveLosses++;
        }
    };

    SmartDepositNudge.onBalanceChange = function(newBalance) {
        if (state.lastBalance === null) {
            state.lastBalance = newBalance;
            if (state.startingBalance === null) {
                state.startingBalance = newBalance;
            }
        }
        state.lastBalance = newBalance;
        updateBalancePulseWidget();
    };

    SmartDepositNudge.init = function() {
        checkHasDeposited().then(function() {
            initializeSession();
            state.isMonitoring = true;

            // Periodic check for trigger conditions
            if (!state.monitoringInterval) {
                state.monitoringInterval = setInterval(function() {
                    if (!state.isMonitoring) return;

                    var trigger = getActiveTrigger();
                    if (trigger) {
                        if (trigger.type === 'loss-streak' || trigger.type === 'win-streak-ended') {
                            showDepositBoostOverlay(trigger.message);
                        } else {
                            showToastNudge(trigger.message);
                        }
                    }

                    updateBalancePulseWidget();
                }, config.monitoringIntervalMs);
            }

            console.warn('smart-deposit-nudge: initialized successfully');
        });
    };

    SmartDepositNudge.disable = function() {
        state.isMonitoring = false;
        if (state.monitoringInterval) {
            clearInterval(state.monitoringInterval);
            state.monitoringInterval = null;
        }
        console.warn('smart-deposit-nudge: disabled');
    };

    SmartDepositNudge.disableTrigger = function(triggerType) {
        if (!state.disabledTriggers.includes(triggerType)) {
            state.disabledTriggers.push(triggerType);
        }
    };

    SmartDepositNudge.enableTrigger = function(triggerType) {
        var idx = state.disabledTriggers.indexOf(triggerType);
        if (idx >= 0) {
            state.disabledTriggers.splice(idx, 1);
        }
    };

    SmartDepositNudge.getState = function() {
        return {
            isMonitoring: state.isMonitoring,
            sessionSpinCount: state.sessionSpinCount,
            consecutiveLosses: state.consecutiveLosses,
            consecutiveWins: state.consecutiveWins,
            currentBalance: getCurrentBalance(),
            startingBalance: state.startingBalance
        };
    };

    // ===== INITIALIZATION =====
    window.SmartDepositNudge = SmartDepositNudge;

})();
