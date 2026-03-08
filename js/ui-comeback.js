(function() {
    'use strict';

    var STORAGE_KEY = 'ms_comebackData';
    var SHOW_DELAY = 2000;
    var MS_PER_HOUR = 3600000;
    var COOLDOWN_DAYS = 7;

    var BONUS_TIERS = [
        { minHours: 72, amount: 20, label: '\uD83C\uDF81 $20 Comeback Bonus!' },
        { minHours: 48, amount: 10, label: '\uD83C\uDF81 $10 Comeback Bonus!' },
        { minHours: 24, amount: 5,  label: '\uD83C\uDF81 $5 Comeback Bonus!' }
    ];

    function _isQA() {
        return window.location.search.indexOf('noBonus=1') !== -1;
    }

    function _loadData() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : {};
        } catch (e) {
            return {};
        }
    }

    function _saveData(data) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (e) { /* quota */ }
    }

    function _getBonusTier(hoursSinceVisit) {
        for (var i = 0; i < BONUS_TIERS.length; i++) {
            if (hoursSinceVisit >= BONUS_TIERS[i].minHours) return BONUS_TIERS[i];
        }
        return null;
    }

    function _createOverlay(tier) {
        var overlay = document.createElement('div');
        overlay.id = 'comebackOverlay';
        overlay.className = 'comeback-overlay';

        var backdrop = document.createElement('div');
        backdrop.className = 'comeback-backdrop';
        backdrop.addEventListener('click', function() {
            window.dismissComebackBonus();
        });
        overlay.appendChild(backdrop);

        var card = document.createElement('div');
        card.className = 'comeback-card';

        var emoji = document.createElement('div');
        emoji.className = 'comeback-emoji';
        emoji.textContent = '\uD83C\uDF89';
        card.appendChild(emoji);

        var title = document.createElement('h2');
        title.className = 'comeback-title';
        title.textContent = 'Welcome Back!';
        card.appendChild(title);

        var subtitle = document.createElement('p');
        subtitle.className = 'comeback-subtitle';
        subtitle.textContent = 'We missed you! Here\'s a bonus for coming back:';
        card.appendChild(subtitle);

        var bonusLabel = document.createElement('div');
        bonusLabel.className = 'comeback-bonus-label';
        bonusLabel.textContent = tier.label;
        card.appendChild(bonusLabel);

        var amountDisplay = document.createElement('div');
        amountDisplay.className = 'comeback-amount';
        amountDisplay.textContent = '$' + tier.amount;
        card.appendChild(amountDisplay);

        var claimBtn = document.createElement('button');
        claimBtn.id = 'cbClaimBtn';
        claimBtn.className = 'comeback-claim-btn';
        claimBtn.textContent = 'Claim Bonus';
        claimBtn.addEventListener('click', function() {
            window.claimComebackBonus(tier.amount);
        });
        card.appendChild(claimBtn);

        var dismissBtn = document.createElement('button');
        dismissBtn.className = 'comeback-dismiss-btn';
        dismissBtn.textContent = 'No Thanks';
        dismissBtn.addEventListener('click', function() {
            window.dismissComebackBonus();
        });
        card.appendChild(dismissBtn);

        overlay.appendChild(card);
        return overlay;
    }

    function _hideOverlay() {
        var overlay = document.getElementById('comebackOverlay');
        if (!overlay) return;
        overlay.classList.add('comeback-fade-out');
        setTimeout(function() {
            if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        }, 400);
    }

    window.claimComebackBonus = function(amount) {
        if (!amount || amount <= 0) return;

        if (typeof balance === 'number') {
            balance += amount;
        }
        if (typeof window.updateBalanceDisplay === 'function') {
            window.updateBalanceDisplay();
        }

        var data = _loadData();
        data.lastClaimTime = Date.now();
        _saveData(data);

        _hideOverlay();

        if (typeof window.showToast === 'function') {
            window.showToast('\uD83C\uDF81 Comeback bonus of $' + amount + ' claimed!', 'success');
        }
    };

    window.dismissComebackBonus = function() {
        _hideOverlay();
    };

    function _init() {
        if (_isQA()) return;

        var now = Date.now();
        var data = _loadData();
        var lastVisit = data.lastVisitTime || 0;
        var lastClaim = data.lastClaimTime || 0;

        data.lastVisitTime = now;
        _saveData(data);

        if (lastVisit === 0) return;

        var hoursSinceVisit = (now - lastVisit) / MS_PER_HOUR;
        var daysSinceClaim = (now - lastClaim) / (MS_PER_HOUR * 24);

        if (hoursSinceVisit < 24) return;
        if (lastClaim > 0 && daysSinceClaim < COOLDOWN_DAYS) return;

        var tier = _getBonusTier(hoursSinceVisit);
        if (!tier) return;

        setTimeout(function() {
            var overlay = _createOverlay(tier);
            document.body.appendChild(overlay);

            void overlay.offsetWidth;
            overlay.classList.add('comeback-active');
        }, SHOW_DELAY);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _init);
    } else {
        _init();
    }
})();
