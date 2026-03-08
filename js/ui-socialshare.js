(function() {
    'use strict';

    var STORAGE_KEY = 'ms_socialShare';
    var BIG_WIN_MULTIPLIER = 10;
    var COOLDOWN_MS = 3600000;
    var MAX_HISTORY = 5;
    var BONUS_TIER_1 = 3;
    var BONUS_TIER_2 = 5;
    var BONUS_TIER_3 = 10;

    var shareHistory = [];
    var shareStreak = 0;
    var lastShareDay = '';
    var lastBonusTime = 0;
    var containerEl = null;
    var panelVisible = false;
    var pendingWinAmount = 0;
    var pendingGameName = '';

    function loadState() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                var s = JSON.parse(raw);
                shareHistory = Array.isArray(s.shareHistory) ? s.shareHistory : [];
                shareStreak = typeof s.shareStreak === 'number' ? s.shareStreak : 0;
                lastShareDay = typeof s.lastShareDay === 'string' ? s.lastShareDay : '';
                lastBonusTime = typeof s.lastBonusTime === 'number' ? s.lastBonusTime : 0;
            }
        } catch (e) { /* ignore */ }
    }

    function saveState() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                shareHistory: shareHistory,
                shareStreak: shareStreak,
                lastShareDay: lastShareDay,
                lastBonusTime: lastBonusTime
            }));
        } catch (e) { /* ignore */ }
    }

    function getTodayStr() {
        var d = new Date();
        return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
    }

    function getYesterdayStr() {
        var d = new Date();
        d.setDate(d.getDate() - 1);
        return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
    }

    function getShareBonus() {
        if (shareStreak >= 7) return BONUS_TIER_3;
        if (shareStreak >= 4) return BONUS_TIER_2;
        return BONUS_TIER_1;
    }

    function canClaimBonus() {
        return (Date.now() - lastBonusTime) >= COOLDOWN_MS;
    }

    function cooldownRemaining() {
        var rem = COOLDOWN_MS - (Date.now() - lastBonusTime);
        if (rem <= 0) return '';
        var mins = Math.ceil(rem / 60000);
        return mins + 'min cooldown';
    }

    function buildContainer() {
        if (containerEl) return;

        containerEl = document.createElement('div');
        containerEl.id = 'socialSharePanel';
        containerEl.style.cssText = 'position:fixed;bottom:0;left:50%;transform:translateX(-50%) translateY(100%);' +
            'z-index:9991;background:linear-gradient(135deg,#1a1a2e,#16213e);' +
            'border:2px solid #3b82f6;border-bottom:none;border-radius:16px 16px 0 0;' +
            'padding:16px 20px 12px;color:#fff;font-family:inherit;' +
            'box-shadow:0 -4px 24px rgba(59,130,246,0.3);width:320px;max-width:90vw;' +
            'transition:transform 0.4s ease;';

        document.body.appendChild(containerEl);
    }

    function renderPanel() {
        if (!containerEl) return;
        while (containerEl.firstChild) containerEl.removeChild(containerEl.firstChild);

        // Header row
        var header = document.createElement('div');
        header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;';

        var titleEl = document.createElement('span');
        titleEl.style.cssText = 'font-weight:700;font-size:14px;color:#3b82f6;';
        titleEl.textContent = '\uD83D\uDCE2 Share Your Win!';
        header.appendChild(titleEl);

        var closeBtn = document.createElement('button');
        closeBtn.style.cssText = 'background:none;border:none;color:#888;cursor:pointer;font-size:18px;padding:0 4px;';
        closeBtn.textContent = '\u00D7';
        closeBtn.addEventListener('click', function() { dismiss(); });
        header.appendChild(closeBtn);

        containerEl.appendChild(header);

        // Win info
        var winInfo = document.createElement('div');
        winInfo.style.cssText = 'text-align:center;margin-bottom:12px;';

        var winAmt = document.createElement('div');
        winAmt.style.cssText = 'font-size:22px;font-weight:700;color:#4ade80;';
        winAmt.textContent = '+$' + pendingWinAmount.toFixed(2);
        winInfo.appendChild(winAmt);

        if (pendingGameName) {
            var gameLbl = document.createElement('div');
            gameLbl.style.cssText = 'font-size:11px;color:#aaa;margin-top:2px;';
            gameLbl.textContent = 'on ' + pendingGameName;
            winInfo.appendChild(gameLbl);
        }

        containerEl.appendChild(winInfo);

        // Share buttons
        var btnRow = document.createElement('div');
        btnRow.style.cssText = 'display:flex;gap:8px;justify-content:center;margin-bottom:10px;';

        var platforms = [
            { name: 'Twitter', color: '#1da1f2', icon: '\uD835\uDD4F' },
            { name: 'Facebook', color: '#4267b2', icon: 'f' },
            { name: 'WhatsApp', color: '#25d366', icon: '\uD83D\uDCAC' },
            { name: 'Copy', color: '#6b7280', icon: '\uD83D\uDD17' }
        ];

        var bonus = getShareBonus();
        var canClaim = canClaimBonus();

        platforms.forEach(function(p) {
            var btn = document.createElement('button');
            btn.style.cssText = 'background:' + p.color + ';color:#fff;border:none;border-radius:10px;' +
                'padding:8px 12px;cursor:pointer;font-size:12px;font-weight:600;flex:1;' +
                'display:flex;flex-direction:column;align-items:center;gap:2px;' +
                'opacity:' + (canClaim ? '1' : '0.5') + ';transition:transform 0.15s;';

            var iconEl = document.createElement('span');
            iconEl.style.fontSize = '16px';
            iconEl.textContent = p.icon;
            btn.appendChild(iconEl);

            var nameEl = document.createElement('span');
            nameEl.style.fontSize = '10px';
            nameEl.textContent = p.name;
            btn.appendChild(nameEl);

            btn.addEventListener('click', function() {
                onShare(p.name);
            });
            btn.addEventListener('mouseenter', function() {
                btn.style.transform = 'scale(1.05)';
            });
            btn.addEventListener('mouseleave', function() {
                btn.style.transform = 'scale(1)';
            });
            btnRow.appendChild(btn);
        });

        containerEl.appendChild(btnRow);

        // Bonus info
        var bonusRow = document.createElement('div');
        bonusRow.style.cssText = 'text-align:center;margin-bottom:8px;';

        if (canClaim) {
            var bonusTxt = document.createElement('span');
            bonusTxt.style.cssText = 'font-size:11px;color:#4ade80;';
            bonusTxt.textContent = 'Share to earn $' + bonus.toFixed(2) + ' bonus!';
            bonusRow.appendChild(bonusTxt);
        } else {
            var coolTxt = document.createElement('span');
            coolTxt.style.cssText = 'font-size:11px;color:#f59e0b;';
            coolTxt.textContent = cooldownRemaining();
            bonusRow.appendChild(coolTxt);
        }

        containerEl.appendChild(bonusRow);

        // Streak info
        var streakRow = document.createElement('div');
        streakRow.style.cssText = 'text-align:center;margin-bottom:8px;';
        var streakTxt = document.createElement('span');
        streakTxt.style.cssText = 'font-size:11px;color:#f59e0b;';
        streakTxt.textContent = '\uD83D\uDD25 Share streak: ' + shareStreak + ' day' + (shareStreak !== 1 ? 's' : '');
        streakRow.appendChild(streakTxt);
        containerEl.appendChild(streakRow);

        // Recent history
        if (shareHistory.length > 0) {
            var histTitle = document.createElement('div');
            histTitle.style.cssText = 'font-size:10px;color:#888;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.5px;';
            histTitle.textContent = 'Recent Shares';
            containerEl.appendChild(histTitle);

            var histList = document.createElement('div');
            histList.style.cssText = 'max-height:60px;overflow-y:auto;';

            shareHistory.slice(0, MAX_HISTORY).forEach(function(entry) {
                var row = document.createElement('div');
                row.style.cssText = 'display:flex;justify-content:space-between;font-size:10px;color:#aaa;padding:1px 0;';

                var platSpan = document.createElement('span');
                platSpan.textContent = entry.platform + ' \u2022 $' + (entry.bonus || 0).toFixed(2);
                row.appendChild(platSpan);

                var timeSpan = document.createElement('span');
                timeSpan.textContent = entry.time || '';
                row.appendChild(timeSpan);

                histList.appendChild(row);
            });

            containerEl.appendChild(histList);
        }
    }

    function onShare(platform) {
        if (!canClaimBonus()) return;

        var bonus = getShareBonus();
        var today = getTodayStr();

        // Update streak
        if (lastShareDay === getYesterdayStr()) {
            shareStreak++;
        } else if (lastShareDay !== today) {
            shareStreak = 1;
        }
        lastShareDay = today;
        lastBonusTime = Date.now();

        // Record history
        var now = new Date();
        var timeStr = now.getHours() + ':' + (now.getMinutes() < 10 ? '0' : '') + now.getMinutes();
        shareHistory.unshift({
            platform: platform,
            bonus: bonus,
            time: timeStr,
            amount: pendingWinAmount
        });
        if (shareHistory.length > MAX_HISTORY) {
            shareHistory = shareHistory.slice(0, MAX_HISTORY);
        }

        // Award bonus
        if (typeof window.balance === 'number') {
            window.balance += bonus;
            if (typeof window.updateBalanceDisplay === 'function') {
                window.updateBalanceDisplay();
            }
        }

        saveState();

        // Show confirmation flash
        showConfirmation(platform, bonus);
    }

    function showConfirmation(platform, bonus) {
        if (!containerEl) return;
        while (containerEl.firstChild) containerEl.removeChild(containerEl.firstChild);

        var wrap = document.createElement('div');
        wrap.style.cssText = 'text-align:center;padding:12px 0;';

        var checkMark = document.createElement('div');
        checkMark.style.cssText = 'font-size:32px;margin-bottom:6px;';
        checkMark.textContent = '\u2705';
        wrap.appendChild(checkMark);

        var msg = document.createElement('div');
        msg.style.cssText = 'font-size:14px;color:#4ade80;font-weight:700;margin-bottom:4px;';
        msg.textContent = 'Shared on ' + platform + '!';
        wrap.appendChild(msg);

        var bonusMsg = document.createElement('div');
        bonusMsg.style.cssText = 'font-size:13px;color:#ffd700;';
        bonusMsg.textContent = '+$' + bonus.toFixed(2) + ' bonus earned';
        wrap.appendChild(bonusMsg);

        containerEl.appendChild(wrap);

        setTimeout(function() {
            dismiss();
        }, 2000);
    }

    function showPanel(winAmount, gameName) {
        if (!containerEl) return;
        pendingWinAmount = winAmount;
        pendingGameName = gameName || '';
        panelVisible = true;
        renderPanel();
        containerEl.style.transform = 'translateX(-50%) translateY(0)';
    }

    function dismiss() {
        if (containerEl) {
            containerEl.style.transform = 'translateX(-50%) translateY(100%)';
        }
        panelVisible = false;
    }

    function onSpin(e) {
        if (panelVisible) return;

        var bet = 1;
        var winAmount = 0;
        var gameName = '';

        if (e && e.detail) {
            if (typeof e.detail.bet === 'number') bet = e.detail.bet;
            if (typeof e.detail.win === 'number') winAmount = e.detail.win;
            if (typeof e.detail.gameName === 'string') gameName = e.detail.gameName;
        }

        if (typeof window.currentBet === 'number' && bet === 1) {
            bet = window.currentBet;
        }

        if (winAmount > 0 && bet > 0 && (winAmount / bet) >= BIG_WIN_MULTIPLIER) {
            setTimeout(function() {
                showPanel(winAmount, gameName);
            }, 1500);
        }
    }

    function init() {
        if (new URLSearchParams(window.location.search).get('noBonus') === '1') return;

        loadState();
        buildContainer();

        document.addEventListener('spinComplete', onSpin);
    }

    window.dismissSocialShare = dismiss;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
