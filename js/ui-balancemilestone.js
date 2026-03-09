// Sprint 78: Balance Milestone Celebrations + Upsell
// When balance crosses key thresholds, show a celebration popup
// with a bonus reward (small credit top-up) to reinforce the positive
// feeling and keep the player engaged at higher balance levels.
(function() {
    'use strict';

    var MILESTONES = [
        { amt: 100,   label: 'CENTURY CLUB',     emoji: '\uD83D\uDCB0', bonus: 2.00,  color: '#22c55e' },
        { amt: 500,   label: 'HIGH ROLLER',      emoji: '\uD83D\uDCB5', bonus: 5.00,  color: '#3b82f6' },
        { amt: 1000,  label: 'GRAND MASTER',      emoji: '\uD83D\uDC8E', bonus: 10.00, color: '#a855f7' },
        { amt: 2500,  label: 'ELITE STATUS',      emoji: '\uD83D\uDC51', bonus: 25.00, color: '#f59e0b' },
        { amt: 5000,  label: 'LEGENDARY PLAYER',  emoji: '\u2B50',       bonus: 50.00, color: '#ef4444' },
        { amt: 10000, label: 'CASINO ROYALE',     emoji: '\uD83C\uDFC6', bonus: 100.00,color: '#ec4899' }
    ];

    var STORAGE_KEY = 'balMilestonesHit';
    var _prevBalance = null;
    var _hit = {};
    var _stylesInjected = false;

    function injectStyles() {
        if (_stylesInjected) return;
        _stylesInjected = true;
        var s = document.createElement('style');
        s.id = 'balMilestoneStyles';
        s.textContent = [
            '#bmOverlay{position:fixed;inset:0;z-index:10400;background:rgba(0,0,0,.85);' +
                'display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;' +
                'opacity:0;transition:opacity .3s ease}',
            '#bmOverlay.active{opacity:1}',
            '#bmModal{background:linear-gradient(160deg,#0d0d1a,#1a0a2e);' +
                'border-radius:20px;padding:32px 28px;max-width:380px;width:100%;text-align:center;' +
                'transform:scale(.8);transition:transform .4s cubic-bezier(.34,1.56,.64,1)}',
            '#bmOverlay.active #bmModal{transform:scale(1)}',
            '.bm-emoji{font-size:3rem;margin-bottom:6px}',
            '.bm-title{font-size:22px;font-weight:900;letter-spacing:1.5px;margin-bottom:6px;text-shadow:0 2px 8px rgba(0,0,0,.5)}',
            '.bm-sub{color:rgba(255,255,255,.55);font-size:13px;margin-bottom:18px}',
            '.bm-bonus-box{background:rgba(255,215,0,.08);border:1px solid rgba(255,215,0,.3);' +
                'border-radius:12px;padding:16px;margin-bottom:20px}',
            '.bm-bonus-label{font-size:11px;color:rgba(255,255,255,.5);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px}',
            '.bm-bonus-amt{color:#ffd700;font-size:28px;font-weight:900;text-shadow:0 0 12px rgba(255,215,0,.3)}',
            '.bm-claim-btn{width:100%;padding:14px;border:none;border-radius:10px;color:#fff;' +
                'font-size:16px;font-weight:900;cursor:pointer;letter-spacing:.5px;margin-bottom:8px;transition:opacity .15s}',
            '.bm-claim-btn:hover{opacity:.88}',
            '.bm-dismiss{background:none;border:none;color:rgba(255,255,255,.3);font-size:12px;cursor:pointer;text-decoration:underline}'
        ].join('\n');
        document.head.appendChild(s);
    }

    function loadHitMilestones() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            if (raw) _hit = JSON.parse(raw);
        } catch (e) { _hit = {}; }
    }

    function saveHitMilestones() {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(_hit)); } catch (e) { /* ignore */ }
    }

    function showCelebration(milestone) {
        injectStyles();
        // Remove old overlay
        var old = document.getElementById('bmOverlay');
        if (old && old.parentNode) old.parentNode.removeChild(old);

        var ov = document.createElement('div');
        ov.id = 'bmOverlay';

        var modal = document.createElement('div');
        modal.id = 'bmModal';
        modal.style.borderColor = milestone.color;
        modal.style.boxShadow = '0 0 50px ' + milestone.color + '40';

        var emoji = document.createElement('div');
        emoji.className = 'bm-emoji';
        emoji.textContent = milestone.emoji;

        var title = document.createElement('div');
        title.className = 'bm-title';
        title.style.color = milestone.color;
        title.textContent = milestone.label + '!';

        var sub = document.createElement('div');
        sub.className = 'bm-sub';
        sub.textContent = 'Your balance crossed $' + milestone.amt.toLocaleString() + '! Here\'s a reward:';

        var bonusBox = document.createElement('div');
        bonusBox.className = 'bm-bonus-box';
        var bLabel = document.createElement('div');
        bLabel.className = 'bm-bonus-label';
        bLabel.textContent = 'Milestone Bonus';
        var bAmt = document.createElement('div');
        bAmt.className = 'bm-bonus-amt';
        bAmt.textContent = '+$' + milestone.bonus.toFixed(2);
        bonusBox.appendChild(bLabel);
        bonusBox.appendChild(bAmt);

        var claimBtn = document.createElement('button');
        claimBtn.className = 'bm-claim-btn';
        claimBtn.style.background = 'linear-gradient(135deg, ' + milestone.color + ', ' + milestone.color + 'cc)';
        claimBtn.textContent = '\uD83C\uDF1F CLAIM BONUS';
        claimBtn.addEventListener('click', function() {
            // Credit the bonus
            if (typeof balance !== 'undefined') balance += milestone.bonus;
            if (typeof updateBalance === 'function') updateBalance();
            if (typeof saveBalance === 'function') saveBalance();
            if (typeof stats !== 'undefined') {
                stats.totalWon = (stats.totalWon || 0) + milestone.bonus;
                if (typeof saveStats === 'function') saveStats();
            }
            closeOverlay(ov);
            // Show toast confirmation
            if (typeof showWinToast === 'function') {
                showWinToast(milestone.label + ' +$' + milestone.bonus.toFixed(2), 'epic');
            }
        });

        var dismiss = document.createElement('button');
        dismiss.className = 'bm-dismiss';
        dismiss.textContent = 'Skip';
        dismiss.addEventListener('click', function() { closeOverlay(ov); });

        modal.appendChild(emoji);
        modal.appendChild(title);
        modal.appendChild(sub);
        modal.appendChild(bonusBox);
        modal.appendChild(claimBtn);
        modal.appendChild(dismiss);
        ov.appendChild(modal);

        ov.addEventListener('click', function(e) { if (e.target === ov) closeOverlay(ov); });
        document.body.appendChild(ov);

        requestAnimationFrame(function() {
            requestAnimationFrame(function() { ov.classList.add('active'); });
        });

        // Auto-dismiss after 30s
        setTimeout(function() { closeOverlay(ov); }, 30000);
    }

    function closeOverlay(ov) {
        if (!ov) return;
        ov.classList.remove('active');
        setTimeout(function() { if (ov.parentNode) ov.parentNode.removeChild(ov); }, 400);
    }

    function checkMilestones(newBal) {
        if (_prevBalance === null) { _prevBalance = newBal; return; }
        // Suppress during QA testing
        if (window.location.search.indexOf('noBonus=1') !== -1) { _prevBalance = newBal; return; }
        if (window.location.search.indexOf('qaTools=1') !== -1) { _prevBalance = newBal; return; }
        // Only check if balance went UP
        if (newBal <= _prevBalance) { _prevBalance = newBal; return; }
        // Skip huge jumps (likely a reset, not a real win)
        if (newBal - _prevBalance > 1000) { _prevBalance = newBal; return; }

        for (var i = 0; i < MILESTONES.length; i++) {
            var m = MILESTONES[i];
            var key = String(m.amt);
            if (_hit[key]) continue; // already hit this milestone
            // Check if we crossed the threshold
            if (_prevBalance < m.amt && newBal >= m.amt) {
                _hit[key] = Date.now();
                saveHitMilestones();
                // Small delay to let win animations finish
                (function(milestone) {
                    setTimeout(function() { showCelebration(milestone); }, 1500);
                })(m);
                break; // only one milestone at a time
            }
        }
        _prevBalance = newBal;
    }

    // ── Hook into balance updates ─────────────────────────────
    function hookBalance() {
        var _orig = window.updateBalance;
        window.updateBalance = function(n) {
            if (_orig) _orig.apply(this, arguments);
            // Check milestone on any balance update
            var bal = (typeof balance !== 'undefined') ? balance : 0;
            if (arguments.length > 0 && typeof arguments[0] === 'number') {
                bal = arguments[0];
            }
            checkMilestones(bal);
        };
    }

    function init() {
        loadHitMilestones();
        // Seed initial balance
        try {
            var key = (typeof STORAGE_KEY_BALANCE !== 'undefined') ? STORAGE_KEY_BALANCE : 'casinoBalance';
            var raw = localStorage.getItem(key);
            if (raw !== null) _prevBalance = parseFloat(raw);
        } catch (e) { /* ignore */ }
        hookBalance();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        setTimeout(init, 0);
    }
}());
