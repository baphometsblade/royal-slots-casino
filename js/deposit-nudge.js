(function() {
    var state = {
        lastShowTime: 0,
        dismissCount: 0,
        spinCount: 0,
        lossStreak: 0,
        lastBalance: 5000,
        sessionStartTime: Date.now(),
        bigWinThreshold: 100,
        hasDeposited: false,
        checkDepositPromise: null
    };

    var config = {
        showThrottleMs: 600000,
        minPlayTimeMs: 600000,
        maxDismissals: 3,
        countdownDurationMs: 900000,
        balanceThreshold: 500,
        lossStreakThreshold: 3
    };

    var colors = {
        dark: '#0a0e27',
        gold: '#d4af37',
        darkGlass: 'rgba(10, 14, 39, 0.92)',
        goldBorder: 'rgba(212, 175, 55, 0.6)',
        text: '#f0f0f0',
        gold2: '#ffd700'
    };

    async function checkHasDeposited() {
        if (state.checkDepositPromise) {
            return state.checkDepositPromise;
        }

        state.checkDepositPromise = (async function() {
            try {
                var result = await api('/api/deposits', {});
                if (result && Array.isArray(result) && result.length > 0) {
                    state.hasDeposited = true;
                }
            } catch (err) {
                console.warn('deposit-nudge: could not check deposit status', err);
            }
            return state.hasDeposited;
        })();

        return state.checkDepositPromise;
    }

    function shouldShow() {
        if (state.hasDeposited) {
            return false;
        }

        var now = Date.now();
        if (now - state.lastShowTime < config.showThrottleMs) {
            return false;
        }

        if (state.dismissCount >= config.maxDismissals) {
            return false;
        }

        return true;
    }

    function recordShow() {
        state.lastShowTime = Date.now();
    }

    function recordDismiss() {
        state.dismissCount++;
    }

    function createModal(trigger, data) {
        var modal = document.createElement('div');
        modal.className = 'deposit-nudge-modal';
        modal.setAttribute('data-trigger', trigger);

        var styles = {
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%) scale(0.8)',
            zIndex: '9999',
            width: '90%',
            maxWidth: '480px',
            background: colors.darkGlass,
            border: '2px solid ' + colors.goldBorder,
            borderRadius: '12px',
            padding: '40px 30px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.8), inset 0 1px 0 rgba(212,175,55,0.3)',
            backdropFilter: 'blur(10px)',
            opacity: '0',
            transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
            fontFamily: '"Segoe UI", Tahoma, Geneva, sans-serif',
            color: colors.text,
            textAlign: 'center'
        };

        for (var key in styles) {
            modal.style[key] = styles[key];
        }

        var content = '';

        if (trigger === 'low-balance') {
            content = createLowBalanceContent(data);
        } else if (trigger === 'time-based') {
            content = createTimeBasedContent(data);
        } else if (trigger === 'big-win') {
            content = createBigWinContent(data);
        } else if (trigger === 'loss-streak') {
            content = createLossStreakContent(data);
        }

        modal.innerHTML = content;

        var closeBtn = modal.querySelector('.deposit-nudge-close');
        var dismissLink = modal.querySelector('.deposit-nudge-dismiss');
        var ctaBtn = modal.querySelector('.deposit-nudge-cta');

        if (closeBtn) {
            closeBtn.addEventListener('click', function() {
                closeModal(modal);
                recordDismiss();
            });
        }

        if (dismissLink) {
            dismissLink.addEventListener('click', function(e) {
                e.preventDefault();
                closeModal(modal);
                recordDismiss();
            });
        }

        if (ctaBtn) {
            ctaBtn.addEventListener('click', function() {
                if (typeof window.showDepositModal === 'function') {
                    window.showDepositModal();
                    closeModal(modal);
                } else {
                    var depositSection = document.querySelector('[data-section="deposit"]');
                    if (depositSection) {
                        depositSection.scrollIntoView({ behavior: 'smooth' });
                        closeModal(modal);
                    } else {
                        alert('Please make your first deposit to continue!');
                    }
                }
            });
        }

        document.body.appendChild(modal);

        setTimeout(function() {
            modal.style.opacity = '1';
            modal.style.transform = 'translate(-50%, -50%) scale(1)';
        }, 50);

        return modal;
    }

    function closeModal(modal) {
        modal.style.opacity = '0';
        modal.style.transform = 'translate(-50%, -50%) scale(0.8)';
        setTimeout(function() {
            if (modal.parentNode) {
                modal.parentNode.removeChild(modal);
            }
        }, 400);
    }

    function createCloseButton() {
        return '<button class="deposit-nudge-close" style="' +
            'position: absolute; top: 15px; right: 15px; ' +
            'width: 32px; height: 32px; border: none; ' +
            'background: rgba(212, 175, 55, 0.2); color: ' + colors.gold + '; ' +
            'border-radius: 50%; font-size: 20px; cursor: pointer; ' +
            'display: flex; align-items: center; justify-content: center; ' +
            'transition: all 0.3s ease; ' +
            '">&times;</button>';
    }

    function createCountdownTimer(startMs) {
        var container = document.createElement('div');
        var durationMs = config.countdownDurationMs;
        var endTime = startMs + durationMs;

        function updateTimer() {
            var now = Date.now();
            var remaining = endTime - now;

            if (remaining <= 0) {
                container.innerHTML = '<span style="color: ' + colors.gold2 + '">Offer expired</span>';
                return;
            }

            var secs = Math.floor(remaining / 1000);
            var mins = Math.floor(secs / 60);
            secs = secs % 60;

            container.innerHTML = '<span style="color: ' + colors.gold2 + ';">' +
                mins + ':' + (secs < 10 ? '0' : '') + secs + '</span>';

            setTimeout(updateTimer, 1000);
        }

        updateTimer();
        return container;
    }

    function createLowBalanceContent(data) {
        var timerDiv = document.createElement('div');
        timerDiv.style.marginTop = '15px';
        timerDiv.style.marginBottom = '20px';
        timerDiv.style.fontSize = '18px';
        timerDiv.style.fontWeight = 'bold';
        var timerContent = createCountdownTimer(Date.now());
        timerDiv.appendChild(timerContent);

        var timerHtml = '<div style="margin-top: 15px; margin-bottom: 20px; font-size: 18px; font-weight: bold;">' +
            '<span style="color: ' + colors.gold2 + ';" id="countdown-timer"></span></div>';

        var html = createCloseButton() +
            '<div style="font-size: 32px; margin-bottom: 15px;">💰</div>' +
            '<h2 style="margin: 0 0 15px 0; font-size: 28px; color: ' + colors.gold + ';">Running Low?</h2>' +
            '<p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6;">' +
            'Your balance is getting thin! Deposit now and get <strong>100% MATCHED!</strong>' +
            '</p>' +
            '<div style="margin-bottom: 25px; font-size: 14px; color: ' + colors.gold2 + ';">' +
            'This offer expires in <span id="countdown-timer">15:00</span>' +
            '</div>' +
            '<button class="deposit-nudge-cta" style="' +
            'background: linear-gradient(135deg, ' + colors.gold2 + ', ' + colors.gold + '); ' +
            'color: #000; border: none; padding: 14px 28px; ' +
            'font-size: 16px; font-weight: bold; border-radius: 6px; ' +
            'cursor: pointer; width: 100%; transition: all 0.3s ease; ' +
            'box-shadow: 0 0 20px rgba(212, 175, 55, 0.5); ' +
            'animation: deposit-nudge-pulse 2s infinite;' +
            '">DOUBLE MY MONEY</button>' +
            '<a href="#" class="deposit-nudge-dismiss" style="' +
            'display: block; margin-top: 15px; font-size: 12px; ' +
            'color: rgba(240, 240, 240, 0.6); text-decoration: none; ' +
            'transition: color 0.3s;' +
            '">Maybe Later</a>';

        return html;
    }

    function createTimeBasedContent(data) {
        var playedMins = Math.floor((Date.now() - state.sessionStartTime) / 60000);

        var html = createCloseButton() +
            '<div style="font-size: 32px; margin-bottom: 15px;">🎰</div>' +
            '<h2 style="margin: 0 0 15px 0; font-size: 28px; color: ' + colors.gold + ';">Enjoying the games?</h2>' +
            '<p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6;">' +
            'You\'ve been playing for <strong>' + playedMins + ' minutes!</strong> ' +
            'Make your first deposit and unlock VIP perks.' +
            '</p>' +
            '<div style="margin: 25px 0; text-align: left; display: inline-block; font-size: 14px;">' +
            '<div style="margin-bottom: 10px;">✓ 100% deposit match</div>' +
            '<div style="margin-bottom: 10px;">✓ VIP access</div>' +
            '<div>✓ Exclusive games</div>' +
            '</div>' +
            '<button class="deposit-nudge-cta" style="' +
            'background: linear-gradient(135deg, ' + colors.gold2 + ', ' + colors.gold + '); ' +
            'color: #000; border: none; padding: 14px 28px; ' +
            'font-size: 16px; font-weight: bold; border-radius: 6px; ' +
            'cursor: pointer; width: 100%; transition: all 0.3s ease; ' +
            'box-shadow: 0 0 20px rgba(212, 175, 55, 0.5); ' +
            'animation: deposit-nudge-pulse 2s infinite;' +
            '">CLAIM MY BONUS</button>' +
            '<a href="#" class="deposit-nudge-dismiss" style="' +
            'display: block; margin-top: 15px; font-size: 12px; ' +
            'color: rgba(240, 240, 240, 0.6); text-decoration: none; ' +
            'transition: color 0.3s;' +
            '">Maybe Later</a>';

        return html;
    }

    function createBigWinContent(data) {
        var winAmount = data.amount || 0;

        var html = createCloseButton() +
            '<div style="font-size: 40px; margin-bottom: 15px;">🎉</div>' +
            '<h2 style="margin: 0 0 15px 0; font-size: 28px; color: ' + colors.gold2 + ';">CONGRATULATIONS!</h2>' +
            '<p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6;">' +
            'You just won <strong style="color: ' + colors.gold2 + ';">$' + winAmount.toFixed(2) + '</strong>! ' +
            'Deposit now to unlock withdrawals and keep your winnings safe.' +
            '</p>' +
            '<div style="margin: 25px 0; padding: 15px; background: rgba(212, 175, 55, 0.1); border-radius: 8px; font-size: 14px; line-height: 1.8;">' +
            '<strong style="color: ' + colors.gold + ';">Players who deposit after a big win are 3x more likely to hit the JACKPOT</strong>' +
            '</div>' +
            '<button class="deposit-nudge-cta" style="' +
            'background: linear-gradient(135deg, ' + colors.gold2 + ', ' + colors.gold + '); ' +
            'color: #000; border: none; padding: 14px 28px; ' +
            'font-size: 16px; font-weight: bold; border-radius: 6px; ' +
            'cursor: pointer; width: 100%; transition: all 0.3s ease; ' +
            'box-shadow: 0 0 20px rgba(212, 175, 55, 0.5); ' +
            'animation: deposit-nudge-pulse 2s infinite;' +
            '">SECURE MY WINNINGS</button>' +
            '<a href="#" class="deposit-nudge-dismiss" style="' +
            'display: block; margin-top: 15px; font-size: 12px; ' +
            'color: rgba(240, 240, 240, 0.6); text-decoration: none; ' +
            'transition: color 0.3s;' +
            '">Maybe Later</a>';

        return html;
    }

    function createLossStreakContent(data) {
        var html = createCloseButton() +
            '<div style="font-size: 32px; margin-bottom: 15px;">🍀</div>' +
            '<h2 style="margin: 0 0 15px 0; font-size: 28px; color: ' + colors.gold + ';">Turn Your Luck Around!</h2>' +
            '<p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6;">' +
            'Fresh credits = fresh chances! Get <strong>100% bonus</strong> on your first deposit.' +
            '</p>' +
            '<div style="margin: 25px 0; padding: 15px; background: rgba(212, 175, 55, 0.1); border-radius: 8px; font-size: 14px; line-height: 1.8;">' +
            '<strong style="color: ' + colors.gold + ';">87% of jackpot winners deposited after a loss streak</strong>' +
            '</div>' +
            '<button class="deposit-nudge-cta" style="' +
            'background: linear-gradient(135deg, ' + colors.gold2 + ', ' + colors.gold + '); ' +
            'color: #000; border: none; padding: 14px 28px; ' +
            'font-size: 16px; font-weight: bold; border-radius: 6px; ' +
            'cursor: pointer; width: 100%; transition: all 0.3s ease; ' +
            'box-shadow: 0 0 20px rgba(212, 175, 55, 0.5); ' +
            'animation: deposit-nudge-pulse 2s infinite;' +
            '">GET BONUS CREDITS</button>' +
            '<a href="#" class="deposit-nudge-dismiss" style="' +
            'display: block; margin-top: 15px; font-size: 12px; ' +
            'color: rgba(240, 240, 240, 0.6); text-decoration: none; ' +
            'transition: color 0.3s;' +
            '">Maybe Later</a>';

        return html;
    }

    function injectStyles() {
        if (document.getElementById('deposit-nudge-styles')) {
            return;
        }

        var style = document.createElement('style');
        style.id = 'deposit-nudge-styles';
        style.textContent = '@keyframes deposit-nudge-pulse {' +
            '0% { box-shadow: 0 0 20px rgba(212, 175, 55, 0.5); }' +
            '50% { box-shadow: 0 0 40px rgba(212, 175, 55, 0.8), 0 0 60px rgba(212, 175, 55, 0.4); }' +
            '100% { box-shadow: 0 0 20px rgba(212, 175, 55, 0.5); }' +
            '} ' +
            '.deposit-nudge-cta:hover { ' +
            'transform: scale(1.05); ' +
            'box-shadow: 0 0 40px rgba(212, 175, 55, 0.8) !important; ' +
            '} ' +
            '.deposit-nudge-dismiss:hover { ' +
            'color: ' + colors.gold + ' !important; ' +
            '}';
        document.head.appendChild(style);
    }

    async function checkAndShowPopup(trigger, data) {
        data = data || {};

        var hasDeposited = await checkHasDeposited();
        if (hasDeposited) {
            return;
        }

        if (!shouldShow()) {
            return;
        }

        injectStyles();
        recordShow();
        createModal(trigger, data);
    }

    function handleSpinComplete(event) {
        state.spinCount++;

        var detail = event.detail || {};
        var currentBalance = detail.balance || state.lastBalance;
        var winAmount = detail.winAmount || 0;
        var isWin = winAmount > 0;

        if (isWin) {
            state.lossStreak = 0;
            if (winAmount > state.bigWinThreshold) {
                checkAndShowPopup('big-win', { amount: winAmount });
            }
        } else {
            state.lossStreak++;
            if (state.lossStreak >= config.lossStreakThreshold) {
                checkAndShowPopup('loss-streak', {});
                state.lossStreak = 0;
            }
        }

        if (currentBalance < config.balanceThreshold && currentBalance < state.lastBalance) {
            checkAndShowPopup('low-balance', { balance: currentBalance });
        }

        state.lastBalance = currentBalance;
    }

    function init() {
        injectStyles();

        checkHasDeposited().catch(function(err) {
            console.warn('deposit-nudge: init error checking deposits', err);
        });

        document.addEventListener('spin:complete', handleSpinComplete);

        var timeBasedTimer = setInterval(function() {
            var playedMs = Date.now() - state.sessionStartTime;
            if (playedMs >= config.minPlayTimeMs) {
                checkAndShowPopup('time-based', {});
                clearInterval(timeBasedTimer);
            }
        }, 30000);

        console.warn('deposit-nudge: initialized');
    }

    window.DepositNudge = {
        init: init
    };

})();
