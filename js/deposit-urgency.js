(function() {
    var state = {
        hasDeposited: false,
        checkDepositPromise: null,
        toastQueue: [],
        currentToast: null,
        toastInterval: null,
        depositsCount: Math.floor(Math.random() * 50) + 30,
        countupInterval: null,
        bonusExpiryStartTime: null,
        bonusExpiryInterval: null,
        sessionStartTime: Date.now(),
        lastWinAmount: 0,
        showWinLockout: false
    };

    var config = {
        toastMinDelayMs: 30000,
        toastMaxDelayMs: 60000,
        toastDurationMs: 5000,
        countupIntervalMs: 120000,
        countupIncrementMs: 5000,
        bonusExpiryCheckMs: 1000,
        bonusExpiryDurationMs: 86400000,
        winLockoutThreshold: 10,
        bonusExpiryDismissalMs: 600000
    };

    var colors = {
        dark: '#0a0a1a',
        darkGlass: 'rgba(10, 10, 26, 0.95)',
        gold: '#d4af37',
        goldLight: '#ffd700',
        goldGlow: 'rgba(212, 175, 55, 0.3)',
        text: '#f0f0f0',
        red: '#ff4444',
        purple: '#4a2c8c',
        purpleDark: '#2d1b5e'
    };

    var usernames = ['Alex', 'Jordan', 'Casey', 'Morgan', 'Taylor', 'Riley', 'Blake', 'Drew', 'Quinn', 'Sam', 'Chris', 'Jamie', 'Bailey', 'Dakota', 'Reese', 'Sky', 'Phoenix', 'River', 'Royal', 'King'];
    var lastnames = ['Smith', 'Chen', 'Martinez', 'Johnson', 'Wong', 'Kumar', 'ONeil', 'Garcia', 'Brown', 'Miller', 'Davis', 'Rodriguez', 'Wilson', 'Moore', 'Taylor', 'Anderson', 'Thomas', 'Jackson', 'White', 'Harris'];

    async function checkHasDeposited() {
        if (state.checkDepositPromise) {
            return state.checkDepositPromise;
        }

        state.checkDepositPromise = (async function() {
            try {
                var result = await api('/api/deposits', {});
                if (result && Array.isArray(result) && result.length > 0) {
                    state.hasDeposited = true;
                    return true;
                }
            } catch (err) {
                console.warn('deposit-urgency: could not check deposit status', err);
            }
            return false;
        })();

        return state.checkDepositPromise;
    }

    function generateMaskedUsername() {
        var first = usernames[Math.floor(Math.random() * usernames.length)];
        var last = lastnames[Math.floor(Math.random() * lastnames.length)];
        var firstChar = first.charAt(0);
        var lastChar = last.charAt(last.length - 1);
        return firstChar + '***' + lastChar;
    }

    function generateRealisticAmount(min, max) {
        var amounts = [50, 75, 100, 150, 200, 250, 300, 500, 750, 1000, 1500, 2000, 2500, 3000, 4000, 5000];
        return amounts[Math.floor(Math.random() * amounts.length)];
    }

    function createToastNotification() {
        var toastTypes = [
            {
                icon: '💰',
                gen: function() {
                    var user = generateMaskedUsername();
                    var deposit = generateRealisticAmount(50, 500);
                    var bonus = deposit;
                    return icon + ' Player ' + user + ' just deposited $' + deposit + ' and got $' + bonus + ' FREE!';
                }
            },
            {
                icon: '🎰',
                gen: function() {
                    var user = generateMaskedUsername();
                    var win = generateRealisticAmount(500, 5000);
                    var deposit = generateRealisticAmount(50, 500);
                    return icon + ' ' + user + ' won $' + win + ' after depositing only $' + deposit + '!';
                }
            },
            {
                icon: '🏆',
                gen: function() {
                    var user = generateMaskedUsername();
                    return icon + ' New VIP member! ' + user + ' unlocked Diamond tier!';
                }
            },
            {
                icon: '💎',
                gen: function() {
                    var count = Math.floor(Math.random() * 5) + 1;
                    return icon + ' ' + count + ' players just claimed their deposit bonus!';
                }
            }
        ];

        var toast = toastTypes[Math.floor(Math.random() * toastTypes.length)];
        return toast.gen();
    }

    function showToast(message) {
        if (state.currentToast) {
            state.currentToast.parentNode.removeChild(state.currentToast);
        }

        var toast = document.createElement('div');
        toast.style.cssText = 'position:fixed;bottom:20px;right:20px;padding:16px 20px;background:' + colors.darkGlass + ';border:2px solid ' + colors.gold + ';border-radius:8px;color:' + colors.text + ';font-size:14px;font-family:Inter,sans-serif;z-index:9998;max-width:320px;box-shadow:0 8px 24px rgba(212,175,55,0.15);animation:depositToastSlideIn 0.4s ease-out;';

        var avatarSpan = document.createElement('span');
        avatarSpan.style.cssText = 'display:inline-block;width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,' + ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f39c12', '#9b59b6'][Math.floor(Math.random() * 5)] + ' 0%,' + ['#ffa07a', '#1abc9c', '#3498db', '#e67e22', '#8e44ad'][Math.floor(Math.random() * 5)] + ' 100%);margin-right:12px;vertical-align:middle;';
        toast.appendChild(avatarSpan);

        var msgSpan = document.createElement('span');
        msgSpan.textContent = message;
        msgSpan.style.cssText = 'vertical-align:middle;';
        toast.appendChild(msgSpan);

        document.body.appendChild(toast);
        state.currentToast = toast;

        setTimeout(function() {
            if (toast.parentNode) {
                toast.style.animation = 'depositToastSlideOut 0.4s ease-out forwards';
                setTimeout(function() {
                    if (toast.parentNode) {
                        toast.parentNode.removeChild(toast);
                    }
                    state.currentToast = null;
                    scheduleNextToast();
                }, 400);
            }
        }, config.toastDurationMs);
    }

    function scheduleNextToast() {
        if (state.hasDeposited) return;

        var delay = Math.random() * (config.toastMaxDelayMs - config.toastMinDelayMs) + config.toastMinDelayMs;
        state.toastInterval = setTimeout(function() {
            var msg = createToastNotification();
            showToast(msg);
        }, delay);
    }

    function createFloatingBadge() {
        var badge = document.createElement('div');
        badge.id = 'deposit-urgency-badge';
        badge.style.cssText = 'position:fixed;bottom:30px;left:50%;transform:translateX(-50%);padding:12px 20px;background:' + colors.darkGlass + ';border:2px solid ' + colors.gold + ';border-radius:8px;color:' + colors.text + ';font-size:14px;font-weight:600;font-family:Inter,sans-serif;z-index:9999;cursor:pointer;white-space:nowrap;box-shadow:0 8px 24px rgba(212,175,55,0.2);animation:depositBadgePulse 2s ease-in-out infinite;';

        var content = document.createElement('div');
        content.style.cssText = 'display:flex;align-items:center;gap:8px;';

        var lockIcon = document.createElement('span');
        lockIcon.textContent = '🔒';
        content.appendChild(lockIcon);

        var text = document.createElement('span');
        text.textContent = 'Deposit to unlock withdrawals';
        content.appendChild(text);

        badge.appendChild(content);

        badge.addEventListener('click', function() {
            if (typeof window.showDepositModal === 'function') {
                window.showDepositModal();
            }
        });

        document.body.appendChild(badge);
        return badge;
    }

    function createDepositsCountWidget() {
        var widget = document.createElement('div');
        widget.id = 'deposits-count-widget';
        widget.style.cssText = 'position:fixed;top:100px;right:20px;padding:14px 18px;background:linear-gradient(135deg,' + colors.purple + ' 0%,' + colors.purpleDark + ' 100%);border:1px solid ' + colors.gold + ';border-radius:6px;color:' + colors.text + ';font-size:13px;font-family:Inter,sans-serif;z-index:9998;text-align:center;';

        var countNum = document.createElement('div');
        countNum.className = 'deposits-count-number';
        countNum.textContent = state.depositsCount;
        countNum.style.cssText = 'font-size:20px;font-weight:700;color:' + colors.goldLight + ';margin-bottom:4px;';

        var label = document.createElement('div');
        label.textContent = 'deposits today';
        label.style.cssText = 'font-size:11px;color:rgba(240,240,240,0.7);text-transform:uppercase;letter-spacing:0.5px;';

        widget.appendChild(countNum);
        widget.appendChild(label);

        document.body.appendChild(widget);

        state.countupInterval = setInterval(function() {
            state.depositsCount += Math.floor(Math.random() * 2) + 1;
            if (countNum && countNum.parentNode) {
                countNum.textContent = state.depositsCount;
            }
        }, config.countupIntervalMs);

        return widget;
    }

    function createBonusExpiryBanner() {
        var banner = document.createElement('div');
        banner.id = 'bonus-expiry-banner';
        banner.style.cssText = 'position:fixed;top:0;left:0;right:0;padding:14px 20px;background:linear-gradient(90deg,' + colors.purpleDark + ' 0%,' + colors.purple + ' 100%);border-bottom:2px solid ' + colors.gold + ';color:' + colors.text + ';font-size:14px;font-family:Inter,sans-serif;z-index:9997;display:flex;justify-content:center;align-items:center;gap:12px;';

        var warningIcon = document.createElement('span');
        warningIcon.textContent = '⚠️';
        warningIcon.style.cssText = 'font-size:16px;';
        banner.appendChild(warningIcon);

        var countdownSpan = document.createElement('span');
        countdownSpan.id = 'bonus-expiry-countdown';
        countdownSpan.style.cssText = 'font-weight:700;color:' + colors.goldLight + ';';
        countdownSpan.textContent = '24:00:00';
        banner.appendChild(countdownSpan);

        var messageSpan = document.createElement('span');
        messageSpan.textContent = 'Your 100% Welcome Bonus expires in';
        banner.appendChild(messageSpan);

        var closeBtn = document.createElement('button');
        closeBtn.textContent = '✕';
        closeBtn.style.cssText = 'position:absolute;right:20px;top:50%;transform:translateY(-50%);background:none;border:none;color:' + colors.text + ';font-size:18px;cursor:pointer;padding:0;';
        closeBtn.addEventListener('click', function() {
            if (banner.parentNode) {
                banner.parentNode.removeChild(banner);
                state.bonusExpiryStartTime = null;
                setTimeout(function() {
                    if (!state.hasDeposited && !document.getElementById('bonus-expiry-banner')) {
                        createBonusExpiryBanner();
                    }
                }, config.bonusExpiryDismissalMs);
            }
        });
        banner.appendChild(closeBtn);

        document.body.appendChild(banner);
        return banner;
    }

    function updateBonusCountdown() {
        if (!state.bonusExpiryStartTime) {
            state.bonusExpiryStartTime = Date.now();
        }

        var elapsed = Date.now() - state.bonusExpiryStartTime;
        var remaining = Math.max(0, config.bonusExpiryDurationMs - elapsed);

        var hours = Math.floor(remaining / 3600000);
        var minutes = Math.floor((remaining % 3600000) / 60000);
        var seconds = Math.floor((remaining % 60000) / 1000);

        var countdownStr = (hours < 10 ? '0' : '') + hours + ':' + (minutes < 10 ? '0' : '') + minutes + ':' + (seconds < 10 ? '0' : '') + seconds;

        var countdownEl = document.getElementById('bonus-expiry-countdown');
        if (countdownEl) {
            countdownEl.textContent = countdownStr;

            if (remaining < 3600000) {
                countdownEl.style.color = colors.red;
            }
        }

        if (remaining <= 0) {
            var banner = document.getElementById('bonus-expiry-banner');
            if (banner && banner.parentNode) {
                banner.parentNode.removeChild(banner);
            }
            clearInterval(state.bonusExpiryInterval);
        }
    }

    function initBonusCountdown() {
        if (state.hasDeposited) return;

        var delayMs = 5 * 60 * 1000;
        setTimeout(function() {
            if (!state.hasDeposited && !document.getElementById('bonus-expiry-banner')) {
                createBonusExpiryBanner();
                state.bonusExpiryInterval = setInterval(updateBonusCountdown, config.bonusExpiryCheckMs);
            }
        }, delayMs);
    }

    function createWinLockoutBanner(amount) {
        var banner = document.createElement('div');
        banner.className = 'win-lockout-banner';
        banner.style.cssText = 'position:fixed;top:80px;left:50%;transform:translateX(-50%);padding:16px 20px;background:linear-gradient(135deg,' + colors.gold + ' 0%,rgba(212,175,55,0.8) 100%);border-radius:6px;color:#000;font-size:14px;font-weight:600;font-family:Inter,sans-serif;z-index:9996;max-width:400px;box-shadow:0 8px 24px rgba(212,175,55,0.3);animation:winLockoutSlideDown 0.4s ease-out;';

        var content = document.createElement('div');
        content.style.cssText = 'display:flex;align-items:center;gap:10px;justify-content:center;';

        var lockIcon = document.createElement('span');
        lockIcon.textContent = '🔒';
        lockIcon.style.cssText = 'font-size:18px;';
        content.appendChild(lockIcon);

        var textSpan = document.createElement('span');
        textSpan.textContent = 'You\'ve won $' + Math.floor(amount) + '! Deposit to unlock withdrawals and keep your winnings!';
        content.appendChild(textSpan);

        banner.appendChild(content);

        var closeBtn = document.createElement('button');
        closeBtn.textContent = '✕';
        closeBtn.style.cssText = 'position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;color:#000;font-size:16px;cursor:pointer;padding:0;opacity:0.7;';
        closeBtn.addEventListener('click', function() {
            if (banner.parentNode) {
                banner.style.animation = 'winLockoutSlideUp 0.4s ease-out forwards';
                setTimeout(function() {
                    if (banner.parentNode) {
                        banner.parentNode.removeChild(banner);
                    }
                }, 400);
            }
        });
        banner.appendChild(closeBtn);

        var existingBanner = document.querySelector('.win-lockout-banner');
        if (existingBanner && existingBanner.parentNode) {
            existingBanner.parentNode.removeChild(existingBanner);
        }

        document.body.appendChild(banner);

        setTimeout(function() {
            if (banner.parentNode) {
                banner.style.animation = 'winLockoutSlideUp 0.4s ease-out forwards';
                setTimeout(function() {
                    if (banner.parentNode) {
                        banner.parentNode.removeChild(banner);
                    }
                }, 400);
            }
        }, 8000);
    }

    function onSpinComplete(winAmount) {
        if (state.hasDeposited || !winAmount || winAmount < config.winLockoutThreshold) return;
        createWinLockoutBanner(winAmount);
    }

    function injectStyles() {
        if (document.getElementById('deposit-urgency-styles')) return;

        var style = document.createElement('style');
        style.id = 'deposit-urgency-styles';
        style.textContent = '@keyframes depositBadgePulse{0%,100%{border-color:' + colors.gold + ';box-shadow:0 8px 24px rgba(212,175,55,0.2);}50%{border-color:' + colors.goldLight + ';box-shadow:0 8px 32px rgba(255,215,0,0.4);}}@keyframes depositToastSlideIn{from{transform:translateX(360px);opacity:0;}to{transform:translateX(0);opacity:1;}}@keyframes depositToastSlideOut{from{transform:translateX(0);opacity:1;}to{transform:translateX(360px);opacity:0;}}@keyframes winLockoutSlideDown{from{transform:translateX(-50%) translateY(-20px);opacity:0;}to{transform:translateX(-50%) translateY(0);opacity:1;}}@keyframes winLockoutSlideUp{from{transform:translateX(-50%) translateY(0);opacity:1;}to{transform:translateX(-50%) translateY(-20px);opacity:0;}}';
        document.head.appendChild(style);
    }

    async function init() {
        injectStyles();

        var isDepositor = await checkHasDeposited();
        if (isDepositor) {
            console.warn('deposit-urgency: user is a depositor, not initializing urgency system');
            return;
        }

        createFloatingBadge();
        createDepositsCountWidget();
        initBonusCountdown();
        scheduleNextToast();

        if (typeof window.addEventListener === 'function') {
            window.addEventListener('spin:complete', function(e) {
                onSpinComplete(e.detail && e.detail.winAmount);
            });
        }

        console.warn('deposit-urgency: initialized');
    }

    window.DepositUrgency = {
        init: init,
        onWin: onSpinComplete
    };
})();
