(function(){
    'use strict';

    var ELEMENT_ID = 'spinCounterBadge';
    var Z_INDEX = 10400;
    var STORAGE_KEY = 'ms_lifetimeSpins';
    var POLL_INTERVAL = 3000;

    var TIERS = [
        { min: 0,     icon: '\uD83E\uDD49', name: 'Bronze',  color: '#cd7f32' },
        { min: 100,   icon: '\uD83E\uDD48', name: 'Silver',  color: '#c0c0c0' },
        { min: 500,   icon: '\uD83E\uDD47', name: 'Gold',    color: '#ffd700' },
        { min: 2000,  icon: '\uD83D\uDC8E', name: 'Diamond', color: '#b9f2ff' },
        { min: 10000, icon: '\uD83D\uDC51', name: 'Legend',  color: '#ff6b6b' }
    ];

    var lastBalance = null;
    var tooltipVisible = false;

    function getSpins() {
        try {
            var val = parseInt(localStorage.getItem(STORAGE_KEY), 10);
            return isNaN(val) ? 0 : val;
        } catch(e) { return 0; }
    }

    function setSpins(n) {
        try { localStorage.setItem(STORAGE_KEY, String(n)); } catch(e) {}
    }

    function getTier(spins) {
        var tier = TIERS[0];
        for (var i = 0; i < TIERS.length; i++) {
            if (spins >= TIERS[i].min) tier = TIERS[i];
        }
        return tier;
    }

    function getNextTier(spins) {
        for (var i = 0; i < TIERS.length; i++) {
            if (spins < TIERS[i].min) return TIERS[i];
        }
        return null;
    }

    function formatSpins(n) {
        if (n >= 10000) return (n / 1000).toFixed(1) + 'k';
        if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
        return String(n);
    }

    function flashCelebration(badge) {
        badge.style.boxShadow = '0 0 20px 8px rgba(255,215,0,0.8)';
        badge.style.transform = 'scale(1.3)';
        setTimeout(function() {
            badge.style.boxShadow = '0 2px 8px rgba(0,0,0,0.4)';
            badge.style.transform = 'scale(1)';
        }, 800);
    }

    function init() {
        if (document.getElementById(ELEMENT_ID)) return;

        var badge = document.createElement('div');
        badge.id = ELEMENT_ID;
        badge.style.cssText = 'position:fixed;top:60px;right:8px;width:50px;height:50px;' +
            'background:rgba(26,26,46,0.92);border:2px solid rgba(255,215,0,0.3);border-radius:50%;' +
            'z-index:' + Z_INDEX + ';display:flex;flex-direction:column;align-items:center;' +
            'justify-content:center;cursor:pointer;font-family:inherit;' +
            'box-shadow:0 2px 8px rgba(0,0,0,0.4);transition:transform 0.3s ease,box-shadow 0.3s ease;' +
            'user-select:none;';

        var iconEl = document.createElement('div');
        iconEl.style.cssText = 'font-size:16px;line-height:1;';

        var countEl = document.createElement('div');
        countEl.style.cssText = 'font-size:9px;font-weight:700;color:#ffd700;line-height:1;margin-top:1px;';

        badge.appendChild(iconEl);
        badge.appendChild(countEl);

        var tooltip = document.createElement('div');
        tooltip.style.cssText = 'position:fixed;top:115px;right:8px;width:170px;' +
            'background:rgba(22,33,62,0.96);border:1px solid rgba(255,215,0,0.25);border-radius:8px;' +
            'padding:10px;z-index:' + (Z_INDEX + 1) + ';display:none;font-family:inherit;' +
            'box-shadow:0 4px 16px rgba(0,0,0,0.5);';

        var tooltipTitle = document.createElement('div');
        tooltipTitle.style.cssText = 'font-size:11px;font-weight:700;color:#ffd700;margin-bottom:8px;' +
            'text-align:center;';
        tooltipTitle.textContent = 'Spin Tiers';
        tooltip.appendChild(tooltipTitle);

        for (var i = 0; i < TIERS.length; i++) {
            var row = document.createElement('div');
            row.style.cssText = 'font-size:10px;color:#aab;padding:2px 0;display:flex;' +
                'justify-content:space-between;align-items:center;';
            row.setAttribute('data-tier-index', String(i));

            var left = document.createElement('span');
            left.textContent = TIERS[i].icon + ' ' + TIERS[i].name;

            var right = document.createElement('span');
            right.style.cssText = 'color:#889;font-size:9px;';
            right.textContent = TIERS[i].min + '+ spins';

            row.appendChild(left);
            row.appendChild(right);
            tooltip.appendChild(row);
        }

        badge.addEventListener('click', function(e) {
            e.stopPropagation();
            tooltipVisible = !tooltipVisible;
            tooltip.style.display = tooltipVisible ? 'block' : 'none';

            if (tooltipVisible) {
                var currentSpins = getSpins();
                var currentTier = getTier(currentSpins);
                var rows = tooltip.querySelectorAll('[data-tier-index]');
                for (var j = 0; j < rows.length; j++) {
                    var tierIdx = parseInt(rows[j].getAttribute('data-tier-index'), 10);
                    if (TIERS[tierIdx].min <= currentSpins) {
                        rows[j].style.color = TIERS[tierIdx].color;
                        rows[j].style.fontWeight = (TIERS[tierIdx].name === currentTier.name) ? '700' : '400';
                    } else {
                        rows[j].style.color = '#556';
                        rows[j].style.fontWeight = '400';
                    }
                }
            }
        });

        document.addEventListener('click', function() {
            if (tooltipVisible) {
                tooltipVisible = false;
                tooltip.style.display = 'none';
            }
        });

        document.body.appendChild(badge);
        document.body.appendChild(tooltip);

        function updateDisplay() {
            var spins = getSpins();
            var tier = getTier(spins);
            iconEl.textContent = tier.icon;
            countEl.textContent = formatSpins(spins);
            badge.style.borderColor = tier.color;
        }

        updateDisplay();

        setInterval(function() {
            var currentBalance = typeof balance !== 'undefined' ? balance : null;
            if (currentBalance === null) return;

            if (lastBalance !== null && currentBalance !== lastBalance) {
                var spins = getSpins();
                var oldTier = getTier(spins);
                spins++;
                setSpins(spins);
                var newTier = getTier(spins);

                if (newTier.name !== oldTier.name) {
                    flashCelebration(badge);
                }

                updateDisplay();
            }
            lastBalance = currentBalance;
        }, POLL_INTERVAL);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(init, 4000);
        });
    } else {
        setTimeout(init, 4000);
    }
})();
