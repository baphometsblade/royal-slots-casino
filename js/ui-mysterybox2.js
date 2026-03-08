(function() {
    'use strict';

    var STORAGE_KEY = 'ms_mysteryBoxData';
    var OVERLAY_ID = 'mysteryBoxOverlay';
    var DROP_CHANCE = 0.02;
    var COOLDOWN_MS = 30 * 60 * 1000;

    var PRIZE_TIERS = [
        { name: 'Common',    min: 1,   max: 5,   weight: 50, color: '#a0aec0', glow: 'rgba(160,174,192,0.5)' },
        { name: 'Uncommon',  min: 5,   max: 15,  weight: 30, color: '#48bb78', glow: 'rgba(72,187,120,0.5)' },
        { name: 'Rare',      min: 15,  max: 50,  weight: 15, color: '#805ad5', glow: 'rgba(128,90,213,0.5)' },
        { name: 'Legendary', min: 50,  max: 200, weight: 5,  color: '#ecc94b', glow: 'rgba(236,201,75,0.6)' }
    ];

    function _isQA() {
        return new URLSearchParams(window.location.search).get('noBonus') === '1';
    }

    function _loadData() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : {};
        } catch (e) { return {}; }
    }

    function _saveData(data) {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
        catch (e) { /* quota */ }
    }

    function _pickTier() {
        var total = 0;
        for (var i = 0; i < PRIZE_TIERS.length; i++) total += PRIZE_TIERS[i].weight;
        var roll = Math.random() * total;
        var cumulative = 0;
        for (var j = 0; j < PRIZE_TIERS.length; j++) {
            cumulative += PRIZE_TIERS[j].weight;
            if (roll < cumulative) return PRIZE_TIERS[j];
        }
        return PRIZE_TIERS[0];
    }

    function _randomAmount(tier) {
        return Math.floor(Math.random() * (tier.max - tier.min + 1)) + tier.min;
    }

    function _toast(msg) {
        if (typeof showToast === 'function') { showToast(msg, 'success'); return; }
        var t = document.createElement('div');
        t.textContent = msg;
        t.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#7c3aed;color:#fff;padding:10px 20px;border-radius:8px;font-weight:700;z-index:99999;font-size:15px;box-shadow:0 4px 16px rgba(0,0,0,0.4);';
        document.body.appendChild(t);
        setTimeout(function() { if (t.parentNode) t.parentNode.removeChild(t); }, 3000);
    }

    function _createOverlay(tier, amount) {
        var existing = document.getElementById(OVERLAY_ID);
        if (existing) existing.parentNode.removeChild(existing);

        var overlay = document.createElement('div');
        overlay.id = OVERLAY_ID;
        overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;z-index:100000;opacity:0;transition:opacity 0.3s ease;';

        var card = document.createElement('div');
        card.style.cssText = 'background:linear-gradient(135deg,#1a1a2e,#16213e);border:2px solid ' + tier.color + ';border-radius:16px;padding:40px;text-align:center;max-width:360px;width:90%;box-shadow:0 0 40px ' + tier.glow + ';transform:scale(0.5);transition:transform 0.4s cubic-bezier(0.34,1.56,0.64,1);';

        var icon = document.createElement('div');
        icon.textContent = '\uD83C\uDF81';
        icon.style.cssText = 'font-size:64px;margin-bottom:12px;animation:mystBoxShake 0.5s ease 0.3s;';

        var title = document.createElement('div');
        title.textContent = 'Mystery Box!';
        title.style.cssText = 'font-size:24px;font-weight:800;color:#fff;margin-bottom:8px;text-transform:uppercase;letter-spacing:1px;';

        var tierLabel = document.createElement('div');
        tierLabel.textContent = tier.name + ' Prize';
        tierLabel.style.cssText = 'font-size:16px;color:' + tier.color + ';font-weight:700;margin-bottom:16px;';

        var amountEl = document.createElement('div');
        amountEl.textContent = '$' + amount.toFixed(2);
        amountEl.style.cssText = 'font-size:48px;font-weight:900;color:' + tier.color + ';margin-bottom:24px;text-shadow:0 0 20px ' + tier.glow + ';transform:scale(0);transition:transform 0.3s ease 0.6s;';

        var claimBtn = document.createElement('button');
        claimBtn.textContent = 'Claim Reward';
        claimBtn.style.cssText = 'background:linear-gradient(135deg,' + tier.color + ',' + tier.color + 'cc);color:#fff;border:none;padding:14px 32px;border-radius:10px;font-size:18px;font-weight:700;cursor:pointer;transition:transform 0.15s;text-transform:uppercase;';
        claimBtn.addEventListener('mouseenter', function() { claimBtn.style.transform = 'scale(1.05)'; });
        claimBtn.addEventListener('mouseleave', function() { claimBtn.style.transform = 'scale(1)'; });
        claimBtn.addEventListener('click', function() {
            _claimReward(amount);
            _dismissOverlay();
        });

        card.appendChild(icon);
        card.appendChild(title);
        card.appendChild(tierLabel);
        card.appendChild(amountEl);
        card.appendChild(claimBtn);
        overlay.appendChild(card);
        document.body.appendChild(overlay);

        requestAnimationFrame(function() {
            overlay.style.opacity = '1';
            card.style.transform = 'scale(1)';
            setTimeout(function() { amountEl.style.transform = 'scale(1)'; }, 100);
        });
    }

    function _claimReward(amount) {
        if (typeof window.balance === 'number') {
            window.balance += amount;
        }
        if (typeof window.updateBalanceDisplay === 'function') {
            window.updateBalanceDisplay();
        }
        _toast('\uD83C\uDF81 Mystery Box: +$' + amount.toFixed(2) + ' claimed!');
        var data = _loadData();
        data.totalClaimed = (data.totalClaimed || 0) + amount;
        data.boxesOpened = (data.boxesOpened || 0) + 1;
        _saveData(data);
    }

    function _dismissOverlay() {
        var overlay = document.getElementById(OVERLAY_ID);
        if (!overlay) return;
        overlay.style.opacity = '0';
        setTimeout(function() {
            if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        }, 300);
    }

    function _injectStyles() {
        var style = document.createElement('style');
        style.textContent = '@keyframes mystBoxShake{0%,100%{transform:rotate(0)}20%{transform:rotate(-12deg)}40%{transform:rotate(12deg)}60%{transform:rotate(-8deg)}80%{transform:rotate(8deg)}}';
        document.head.appendChild(style);
    }

    function _checkDrop() {
        if (_isQA()) return;
        var data = _loadData();
        var now = Date.now();
        if (data.lastDrop && (now - data.lastDrop) < COOLDOWN_MS) return;
        if (Math.random() > DROP_CHANCE) return;

        var tier = _pickTier();
        var amount = _randomAmount(tier);

        data.lastDrop = now;
        _saveData(data);

        _createOverlay(tier, amount);
    }

    function _init() {
        if (_isQA()) return;
        _injectStyles();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _init);
    } else {
        _init();
    }

    window._mysteryBoxCheckDrop = _checkDrop;
    window.dismissMysteryBox = _dismissOverlay;

})();
