(function(){
    'use strict';

    var ELEMENT_ID = 'seasonPassWidget';
    var Z_INDEX = 10400;
    var STORAGE_KEY = 'ms_seasonPass';
    var POLL_INTERVAL = 3000;

    var TIERS = [
        { xp: 10,  reward: 0.50, label: 'Tier 1'  },
        { xp: 30,  reward: 1.00, label: 'Tier 2'  },
        { xp: 60,  reward: 2.00, label: 'Tier 3'  },
        { xp: 100, reward: 3.00, label: 'Tier 4'  },
        { xp: 150, reward: 5.00, label: 'Tier 5'  },
        { xp: 220, reward: 8.00, label: 'Tier 6'  },
        { xp: 300, reward: 12.00, label: 'Tier 7' },
        { xp: 400, reward: 18.00, label: 'Tier 8' },
        { xp: 520, reward: 25.00, label: 'Tier 9' },
        { xp: 650, reward: 50.00, label: 'Tier 10 JACKPOT' }
    ];

    var lastBalance = null;
    var expanded = false;

    function getSeasonKey() {
        var d = new Date();
        return d.getFullYear() + '-' + (d.getMonth() + 1);
    }

    function loadData() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return { season: getSeasonKey(), xp: 0, claimed: [] };
            var data = JSON.parse(raw);
            if (data.season !== getSeasonKey()) {
                return { season: getSeasonKey(), xp: 0, claimed: [] };
            }
            return data;
        } catch(e) {
            return { season: getSeasonKey(), xp: 0, claimed: [] };
        }
    }

    function saveData(data) {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch(e) {}
    }

    function getCurrentTierIndex(xp) {
        for (var i = TIERS.length - 1; i >= 0; i--) {
            if (xp >= TIERS[i].xp) return i;
        }
        return -1;
    }

    function getNextTierIndex(xp) {
        for (var i = 0; i < TIERS.length; i++) {
            if (xp < TIERS[i].xp) return i;
        }
        return -1;
    }

    function getProgress(xp) {
        var nextIdx = getNextTierIndex(xp);
        if (nextIdx === -1) return 100;
        var prevXp = nextIdx > 0 ? TIERS[nextIdx - 1].xp : 0;
        var nextXp = TIERS[nextIdx].xp;
        return Math.min(100, Math.round(((xp - prevXp) / (nextXp - prevXp)) * 100));
    }

    function clearChildren(el) {
        while (el.firstChild) {
            el.removeChild(el.firstChild);
        }
    }

    function init() {
        if (document.getElementById(ELEMENT_ID)) return;

        var widget = document.createElement('div');
        widget.id = ELEMENT_ID;
        widget.style.cssText = 'position:fixed;bottom:50px;right:8px;z-index:' + Z_INDEX + ';' +
            'font-family:inherit;user-select:none;';

        var badge = document.createElement('div');
        badge.style.cssText = 'width:44px;height:44px;border-radius:50%;' +
            'background:rgba(26,26,46,0.92);border:2px solid rgba(255,215,0,0.3);' +
            'display:flex;align-items:center;justify-content:center;cursor:pointer;' +
            'box-shadow:0 2px 10px rgba(0,0,0,0.4);transition:transform 0.2s ease;' +
            'font-size:14px;font-weight:700;color:#ffd700;';

        var panel = document.createElement('div');
        panel.style.cssText = 'position:absolute;bottom:50px;right:0;width:200px;' +
            'background:rgba(22,33,62,0.96);border:1px solid rgba(255,215,0,0.2);' +
            'border-radius:10px;padding:12px;display:none;' +
            'box-shadow:0 4px 20px rgba(0,0,0,0.6);max-height:360px;overflow-y:auto;';

        var panelTitle = document.createElement('div');
        panelTitle.style.cssText = 'font-size:12px;font-weight:700;color:#ffd700;text-align:center;' +
            'margin-bottom:8px;letter-spacing:0.5px;';
        panelTitle.textContent = '\uD83C\uDFC6 Season Pass';

        var progressBar = document.createElement('div');
        progressBar.style.cssText = 'width:100%;height:6px;background:rgba(255,255,255,0.08);' +
            'border-radius:3px;margin-bottom:10px;overflow:hidden;';

        var progressFill = document.createElement('div');
        progressFill.style.cssText = 'height:100%;background:linear-gradient(90deg,#daa520,#ffd700);' +
            'border-radius:3px;transition:width 0.5s ease;width:0%;';
        progressBar.appendChild(progressFill);

        var xpLabel = document.createElement('div');
        xpLabel.style.cssText = 'font-size:10px;color:#889;text-align:center;margin-bottom:8px;';

        var tierList = document.createElement('div');
        tierList.style.cssText = 'display:flex;flex-direction:column;gap:4px;';

        panel.appendChild(panelTitle);
        panel.appendChild(progressBar);
        panel.appendChild(xpLabel);
        panel.appendChild(tierList);

        badge.addEventListener('click', function(e) {
            e.stopPropagation();
            expanded = !expanded;
            panel.style.display = expanded ? 'block' : 'none';
            if (expanded) renderPanel();
        });

        document.addEventListener('click', function() {
            if (expanded) {
                expanded = false;
                panel.style.display = 'none';
            }
        });

        panel.addEventListener('click', function(e) {
            e.stopPropagation();
        });

        widget.appendChild(panel);
        widget.appendChild(badge);
        document.body.appendChild(widget);

        function updateBadge() {
            var data = loadData();
            var tierIdx = getCurrentTierIndex(data.xp);
            var tierNum = tierIdx + 2;
            if (tierIdx === -1) tierNum = 1;
            if (tierIdx === TIERS.length - 1) tierNum = 10;
            else if (tierIdx >= 0) tierNum = tierIdx + 2;
            badge.textContent = tierNum > 10 ? '\u2B50' : String(Math.min(tierNum, 10));
            badge.title = 'Season Pass - ' + data.xp + ' XP';
        }

        function renderPanel() {
            var data = loadData();
            var progress = getProgress(data.xp);
            progressFill.style.width = progress + '%';

            var nextIdx = getNextTierIndex(data.xp);
            if (nextIdx === -1) {
                xpLabel.textContent = data.xp + ' XP \u2014 All tiers complete!';
            } else {
                xpLabel.textContent = data.xp + ' / ' + TIERS[nextIdx].xp + ' XP';
            }

            clearChildren(tierList);
            for (var i = 0; i < TIERS.length; i++) {
                var tier = TIERS[i];
                var isClaimed = data.claimed.indexOf(i) !== -1;
                var isReached = data.xp >= tier.xp;
                var isCurrent = (getCurrentTierIndex(data.xp) === i);

                var row = document.createElement('div');
                row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;' +
                    'padding:4px 6px;border-radius:6px;font-size:10px;' +
                    'background:' + (isCurrent ? 'rgba(255,215,0,0.1)' : 'transparent') + ';' +
                    'border:1px solid ' + (isCurrent ? 'rgba(255,215,0,0.25)' : 'transparent') + ';';

                var leftPart = document.createElement('span');
                leftPart.style.cssText = 'color:' + (isReached ? '#ffd700' : '#556') + ';font-weight:' +
                    (isCurrent ? '700' : '400') + ';';
                leftPart.textContent = (isClaimed ? '\u2705 ' : (isReached ? '\u2B50 ' : '\u26AA ')) +
                    tier.label;

                var rightPart = document.createElement('span');
                rightPart.style.cssText = 'color:' + (isReached ? '#2ecc71' : '#556') + ';font-size:9px;';
                rightPart.textContent = '$' + tier.reward.toFixed(2) +
                    (isClaimed ? '' : (isReached ? ' \u2714' : ''));

                row.appendChild(leftPart);
                row.appendChild(rightPart);
                tierList.appendChild(row);
            }
        }

        function checkAndClaimRewards() {
            var data = loadData();
            var changed = false;
            for (var i = 0; i < TIERS.length; i++) {
                if (data.xp >= TIERS[i].xp && data.claimed.indexOf(i) === -1) {
                    data.claimed.push(i);
                    changed = true;

                    if (typeof balance !== 'undefined') {
                        balance += TIERS[i].reward;
                        if (typeof updateBalanceDisplay === 'function') {
                            updateBalanceDisplay();
                        }
                    }
                }
            }
            if (changed) {
                saveData(data);
                if (expanded) renderPanel();
            }
        }

        updateBadge();

        setInterval(function() {
            var currentBalance = typeof balance !== 'undefined' ? balance : null;
            if (currentBalance === null) return;

            if (lastBalance !== null && currentBalance !== lastBalance) {
                var data = loadData();
                data.xp += 1;
                saveData(data);
                updateBadge();
                checkAndClaimRewards();
                if (expanded) renderPanel();
            }
            lastBalance = currentBalance;
        }, POLL_INTERVAL);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(init, 7000);
        });
    } else {
        setTimeout(init, 7000);
    }
})();
