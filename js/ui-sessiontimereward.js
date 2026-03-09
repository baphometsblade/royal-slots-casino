(function() {
    'use strict';

    var ELEMENT_ID = 'sessionTimeReward';
    var Z_INDEX = 10400;
    var sessionStartTime = Date.now();
    var rewardsClaimed = {};
    var overlayEl = null;
    var checkTimer = null;

    var REWARDS = [
        { minutes: 5,  amount: 0.50, label: '5 min bonus',        size: 'small',   emoji: '\u2B50' },
        { minutes: 15, amount: 2.00, label: '15 min loyalty',     size: 'medium',  emoji: '\uD83C\uDF1F' },
        { minutes: 30, amount: 5.00, label: '30 min VIP bonus',   size: 'big',     emoji: '\uD83C\uDF89' },
        { minutes: 60, amount: 10.00, label: '1 hour champion',   size: 'premium', emoji: '\uD83C\uDFC6' }
    ];

    var AUTO_DISMISS_MS = 15000;

    function formatCurrency(val) {
        return '$' + val.toFixed(2);
    }

    function creditBalance(amount) {
        if (typeof balance !== 'undefined') {
            balance += amount;
            if (typeof updateBalanceDisplay === 'function') {
                updateBalanceDisplay();
            }
        }
    }

    function createConfettiPieces(container, count) {
        var colors = ['#ffd700', '#ff6b6b', '#2ecc71', '#3498db', '#e74c3c', '#9b59b6', '#f39c12'];
        for (var i = 0; i < count; i++) {
            var piece = document.createElement('div');
            var color = colors[Math.floor(Math.random() * colors.length)];
            var left = Math.random() * 100;
            var delay = Math.random() * 2;
            var duration = 2 + Math.random() * 2;
            var size = 4 + Math.random() * 6;
            piece.style.cssText = 'position:absolute;top:-10px;left:' + left + '%;width:' + size + 'px;height:' + size + 'px;' +
                'background:' + color + ';border-radius:' + (Math.random() > 0.5 ? '50%' : '1px') + ';' +
                'animation:sessionConfettiFall ' + duration + 's ' + delay + 's linear forwards;opacity:0.9;';
            container.appendChild(piece);
        }
    }

    function showReward(reward) {
        if (overlayEl && overlayEl.parentNode) {
            overlayEl.parentNode.removeChild(overlayEl);
        }

        var isSmall = reward.size === 'small';
        var isBigOrPremium = reward.size === 'big' || reward.size === 'premium';
        var isPremium = reward.size === 'premium';

        overlayEl = document.createElement('div');
        overlayEl.id = ELEMENT_ID;

        if (isSmall) {
            overlayEl.style.cssText = 'position:fixed;bottom:80px;right:20px;width:280px;padding:16px;' +
                'background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);border:1px solid #daa520;' +
                'border-radius:12px;z-index:' + Z_INDEX + ';font-family:Arial,sans-serif;color:#fff;' +
                'box-shadow:0 4px 20px rgba(0,0,0,0.5);transform:translateX(120%);' +
                'transition:transform 0.5s cubic-bezier(0.34,1.56,0.64,1);';
        } else {
            overlayEl.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;' +
                'background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;' +
                'z-index:' + Z_INDEX + ';font-family:Arial,sans-serif;opacity:0;' +
                'transition:opacity 0.4s ease;';
        }

        var style = document.createElement('style');
        style.textContent = '@keyframes sessionConfettiFall{0%{transform:translateY(0) rotate(0deg);opacity:1}' +
            '100%{transform:translateY(100vh) rotate(720deg);opacity:0}}' +
            '@keyframes sessionPulse{0%{text-shadow:0 0 8px rgba(255,215,0,0.5)}' +
            '100%{text-shadow:0 0 24px rgba(255,215,0,1)}}' +
            '@keyframes sessionBounce{0%{transform:scale(0.3);opacity:0}' +
            '50%{transform:scale(1.1)}100%{transform:scale(1);opacity:1}}';
        overlayEl.appendChild(style);

        var card;
        if (isSmall) {
            card = overlayEl;
        } else {
            card = document.createElement('div');
            var cardBg = isPremium
                ? 'linear-gradient(135deg,#1a1a2e 0%,#2d1b4e 50%,#16213e 100%)'
                : 'linear-gradient(135deg,#1a1a2e 0%,#16213e 100%)';
            var cardBorder = isPremium ? '#ffd700' : '#daa520';
            card.style.cssText = 'background:' + cardBg + ';border:2px solid ' + cardBorder + ';' +
                'border-radius:16px;padding:32px;text-align:center;color:#fff;max-width:360px;width:90%;' +
                'box-shadow:0 8px 40px rgba(0,0,0,0.6);animation:sessionBounce 0.6s ease forwards;' +
                'position:relative;overflow:hidden;';
            overlayEl.appendChild(card);
        }

        if (isBigOrPremium) {
            createConfettiPieces(card, isPremium ? 40 : 20);
        }

        var emoji = document.createElement('div');
        emoji.style.cssText = 'font-size:' + (isSmall ? '28px' : '48px') + ';margin-bottom:8px;' +
            (isPremium ? 'animation:sessionPulse 1s ease-in-out infinite alternate;' : '');
        emoji.textContent = reward.emoji;
        card.appendChild(emoji);

        var title = document.createElement('div');
        title.style.cssText = 'font-size:' + (isSmall ? '14px' : '20px') + ';font-weight:bold;' +
            'color:#ffd700;margin-bottom:8px;';
        title.textContent = reward.label + '!';
        card.appendChild(title);

        var amountEl = document.createElement('div');
        amountEl.style.cssText = 'font-size:' + (isSmall ? '20px' : '36px') + ';font-weight:bold;' +
            'color:#2ecc71;margin-bottom:16px;' +
            (isBigOrPremium ? 'animation:sessionPulse 1.5s ease-in-out infinite alternate;' : '');
        amountEl.textContent = '+' + formatCurrency(reward.amount);
        card.appendChild(amountEl);

        var claimBtn = document.createElement('button');
        claimBtn.style.cssText = 'background:linear-gradient(135deg,#daa520 0%,#ffd700 100%);color:#1a1a2e;' +
            'border:none;border-radius:8px;padding:' + (isSmall ? '8px 20px' : '12px 32px') + ';' +
            'font-size:' + (isSmall ? '13px' : '16px') + ';font-weight:bold;cursor:pointer;' +
            'transition:transform 0.2s,box-shadow 0.2s;';
        claimBtn.textContent = 'Claim ' + formatCurrency(reward.amount);
        claimBtn.addEventListener('mouseenter', function() {
            claimBtn.style.transform = 'scale(1.05)';
            claimBtn.style.boxShadow = '0 4px 16px rgba(255,215,0,0.5)';
        });
        claimBtn.addEventListener('mouseleave', function() {
            claimBtn.style.transform = 'scale(1)';
            claimBtn.style.boxShadow = 'none';
        });
        claimBtn.addEventListener('click', function() {
            creditBalance(reward.amount);
            dismissOverlay();
        });
        card.appendChild(claimBtn);

        document.body.appendChild(overlayEl);

        requestAnimationFrame(function() {
            requestAnimationFrame(function() {
                if (isSmall) {
                    overlayEl.style.transform = 'translateX(0)';
                } else {
                    overlayEl.style.opacity = '1';
                }
            });
        });

        var autoDismissId = setTimeout(function() {
            creditBalance(reward.amount);
            dismissOverlay();
        }, AUTO_DISMISS_MS);

        overlayEl._autoDismissId = autoDismissId;
    }

    function dismissOverlay() {
        if (!overlayEl) return;
        if (overlayEl._autoDismissId) clearTimeout(overlayEl._autoDismissId);
        var el = overlayEl;
        if (el.style.transform !== undefined && el.style.transform.indexOf('translateX') !== -1) {
            el.style.transform = 'translateX(120%)';
        } else {
            el.style.opacity = '0';
        }
        setTimeout(function() {
            if (el && el.parentNode) el.parentNode.removeChild(el);
        }, 500);
        overlayEl = null;
    }

    function checkRewards() {
        var elapsed = (Date.now() - sessionStartTime) / 60000;
        for (var i = 0; i < REWARDS.length; i++) {
            var r = REWARDS[i];
            if (elapsed >= r.minutes && !rewardsClaimed[r.minutes]) {
                rewardsClaimed[r.minutes] = true;
                showReward(r);
                break;
            }
        }
    }

    function init() {
        sessionStartTime = Date.now();
        rewardsClaimed = {};
        checkTimer = setInterval(checkRewards, 10000);
    }

    function cleanup() {
        if (checkTimer) {
            clearInterval(checkTimer);
            checkTimer = null;
        }
        dismissOverlay();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(init, 5000);
        });
    } else {
        setTimeout(init, 5000);
    }

    window._sessionTimeReward = { cleanup: cleanup };
})();
