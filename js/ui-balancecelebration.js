// Sprint 69: Balance Celebration — popup when balance crosses milestones
// Monitors balance every 15s, celebrates milestones with gold burst + small bonus.
(function() {
    'use strict';

    var ELEMENT_ID = 'balanceMilestonePopup';
    var Z_INDEX = 10400;
    var STORAGE_KEY = 'ms_balanceMilestones';
    var POLL_INTERVAL = 15000;

    var MILESTONES = [
        { amount: 100,   label: '$100',    bonus: 1 },
        { amount: 250,   label: '$250',    bonus: 2.50 },
        { amount: 500,   label: '$500',    bonus: 5 },
        { amount: 1000,  label: '$1,000',  bonus: 10 },
        { amount: 2500,  label: '$2,500',  bonus: 25 },
        { amount: 5000,  label: '$5,000',  bonus: 50 },
        { amount: 10000, label: '$10,000', bonus: 100 }
    ];

    var _popup = null;
    var _prevBalance = null;
    var _celebrated = {};
    var _pollTimer = null;
    var _autoDismissTimer = null;

    function _loadCelebrated() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                _celebrated = JSON.parse(raw);
            }
        } catch (e) { _celebrated = {}; }
    }

    function _saveCelebrated() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(_celebrated));
        } catch (e) { /* ignore */ }
    }

    function _formatMoney(val) {
        if (typeof formatMoney === 'function') return formatMoney(val);
        return '$' + val.toFixed(2);
    }

    function _showCelebration(milestone) {
        if (_popup && _popup.parentNode) {
            _popup.parentNode.removeChild(_popup);
        }
        if (_autoDismissTimer) clearTimeout(_autoDismissTimer);

        _popup = document.createElement('div');
        _popup.id = ELEMENT_ID;
        _popup.style.cssText = 'position:fixed;inset:0;display:flex;align-items:center;' +
            'justify-content:center;z-index:' + Z_INDEX + ';background:rgba(0,0,0,0.7);' +
            'opacity:0;transition:opacity 0.4s ease;';

        var card = document.createElement('div');
        card.style.cssText = 'background:linear-gradient(160deg,#1a1a2e,#16213e);' +
            'border:2px solid #ffd700;border-radius:16px;padding:28px 24px;max-width:320px;' +
            'width:90%;text-align:center;transform:scale(0.7);transition:transform 0.4s cubic-bezier(0.34,1.56,0.64,1);' +
            'box-shadow:0 0 40px rgba(255,215,0,0.3),0 8px 32px rgba(0,0,0,0.6);position:relative;overflow:hidden;';

        // Gold burst background
        var burst = document.createElement('div');
        burst.style.cssText = 'position:absolute;inset:-50%;width:200%;height:200%;' +
            'background:radial-gradient(circle,rgba(255,215,0,0.15) 0%,transparent 60%);' +
            'animation:burstPulse 2s ease-in-out infinite;pointer-events:none;';
        card.appendChild(burst);

        // Add keyframes for burst animation
        var styleEl = document.getElementById('balCelebStyles');
        if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = 'balCelebStyles';
            styleEl.textContent = '@keyframes burstPulse{0%,100%{opacity:0.5;transform:scale(0.8)}50%{opacity:1;transform:scale(1.1)}}' +
                '@keyframes countUp{0%{transform:scale(0.5);opacity:0}50%{transform:scale(1.2)}100%{transform:scale(1);opacity:1}}';
            document.head.appendChild(styleEl);
        }

        var emoji = document.createElement('div');
        emoji.style.cssText = 'font-size:48px;margin-bottom:8px;position:relative;';
        emoji.textContent = '\uD83D\uDCB0';
        card.appendChild(emoji);

        var title = document.createElement('div');
        title.style.cssText = 'font-size:20px;font-weight:900;color:#ffd700;margin-bottom:6px;' +
            'text-transform:uppercase;letter-spacing:1.5px;text-shadow:0 2px 8px rgba(255,215,0,0.4);position:relative;';
        title.textContent = 'MILESTONE REACHED!';
        card.appendChild(title);

        var balText = document.createElement('div');
        balText.style.cssText = 'font-size:32px;font-weight:900;color:#fff;margin-bottom:16px;' +
            'animation:countUp 0.6s ease-out;position:relative;';
        balText.textContent = milestone.label + ' Balance!';
        card.appendChild(balText);

        var bonusBox = document.createElement('div');
        bonusBox.style.cssText = 'background:rgba(46,204,113,0.12);border:1px solid rgba(46,204,113,0.3);' +
            'border-radius:10px;padding:12px;margin-bottom:18px;position:relative;';

        var bonusLabel = document.createElement('div');
        bonusLabel.style.cssText = 'font-size:11px;color:rgba(255,255,255,0.5);text-transform:uppercase;' +
            'letter-spacing:1px;margin-bottom:4px;';
        bonusLabel.textContent = 'MILESTONE BONUS';
        bonusBox.appendChild(bonusLabel);

        var bonusAmt = document.createElement('div');
        bonusAmt.style.cssText = 'font-size:24px;font-weight:900;color:#2ecc71;' +
            'text-shadow:0 0 10px rgba(46,204,113,0.4);';
        bonusAmt.textContent = '+' + _formatMoney(milestone.bonus);
        bonusBox.appendChild(bonusAmt);

        card.appendChild(bonusBox);

        var btn = document.createElement('button');
        btn.style.cssText = 'width:100%;padding:14px;border:none;border-radius:10px;' +
            'background:linear-gradient(135deg,#ffd700,#daa520);color:#1a1a2e;font-size:16px;' +
            'font-weight:900;cursor:pointer;letter-spacing:0.5px;transition:opacity 0.15s;position:relative;';
        btn.textContent = 'Awesome!';
        btn.addEventListener('click', function() { _dismiss(milestone.bonus); });
        card.appendChild(btn);

        _popup.appendChild(card);
        document.body.appendChild(_popup);

        requestAnimationFrame(function() {
            _popup.style.opacity = '1';
            card.style.transform = 'scale(1)';
        });

        _autoDismissTimer = setTimeout(function() {
            _dismiss(milestone.bonus);
        }, 8000);
    }

    function _dismiss(bonusAmount) {
        if (_autoDismissTimer) {
            clearTimeout(_autoDismissTimer);
            _autoDismissTimer = null;
        }

        // Credit the bonus
        if (bonusAmount > 0) {
            if (typeof balance !== 'undefined') {
                balance += bonusAmount;
                if (typeof updateBalanceDisplay === 'function') {
                    updateBalanceDisplay();
                }
            }
        }

        if (_popup) {
            _popup.style.opacity = '0';
            var ref = _popup;
            setTimeout(function() {
                if (ref.parentNode) ref.parentNode.removeChild(ref);
            }, 400);
            _popup = null;
        }
    }

    function _checkMilestones() {
        var currentBalance = typeof balance !== 'undefined' ? balance : null;
        if (currentBalance === null) return;

        if (_prevBalance === null) {
            _prevBalance = currentBalance;
            return;
        }

        for (var i = 0; i < MILESTONES.length; i++) {
            var m = MILESTONES[i];
            var key = String(m.amount);

            // Crossed upward
            if (_prevBalance < m.amount && currentBalance >= m.amount && !_celebrated[key]) {
                _celebrated[key] = true;
                _saveCelebrated();
                _showCelebration(m);
                break; // Only show one at a time
            }
        }

        _prevBalance = currentBalance;
    }

    function _init() {
        _loadCelebrated();
        _prevBalance = typeof balance !== 'undefined' ? balance : null;
        _pollTimer = setInterval(_checkMilestones, POLL_INTERVAL);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(_init, 5000);
        });
    } else {
        setTimeout(_init, 5000);
    }
})();
