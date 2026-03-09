/**
 * Sprint 63 — Comeback Cashback Panel
 * Detects 24h+ absence and offers cashback on return.
 */
(function() {
    'use strict';

    var ELEMENT_ID = 'comebackCashback';
    var Z_INDEX = 10400;
    var STORAGE_KEY = 'ms_lastVisitTime';
    var ABSENCE_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours
    var AUTO_DISMISS_MS = 30000;
    var CASHBACK_MIN_PCT = 5;
    var CASHBACK_MAX_PCT = 15;
    var LOSS_MIN = 5;
    var LOSS_MAX = 50;

    function createPanel() {
        if (document.getElementById(ELEMENT_ID)) return;

        var now = Date.now();
        var lastVisit = parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10);
        var absentMs = lastVisit > 0 ? (now - lastVisit) : 0;

        // Always update last visit time
        localStorage.setItem(STORAGE_KEY, String(now));

        // Only show panel if absent > 24 hours
        if (lastVisit === 0 || absentMs < ABSENCE_THRESHOLD_MS) return;

        var pct = CASHBACK_MIN_PCT + Math.floor(Math.random() * (CASHBACK_MAX_PCT - CASHBACK_MIN_PCT + 1));
        var simulatedLoss = LOSS_MIN + Math.random() * (LOSS_MAX - LOSS_MIN);
        var cashbackAmount = parseFloat((simulatedLoss * pct / 100).toFixed(2));

        var absentHours = Math.floor(absentMs / (60 * 60 * 1000));

        var panel = document.createElement('div');
        panel.id = ELEMENT_ID;
        panel.style.cssText = 'position:fixed;top:50%;right:-340px;transform:translateY(-50%);width:310px;'
            + 'background:linear-gradient(135deg,#1a1a2e 0%,#16213e 60%,#0f3460 100%);'
            + 'border:2px solid #ffd700;border-right:none;border-radius:16px 0 0 16px;'
            + 'padding:28px 24px;z-index:' + Z_INDEX + ';'
            + 'box-shadow:-4px 0 24px rgba(255,215,0,0.25),0 0 40px rgba(0,0,0,0.6);'
            + 'transition:right 0.6s cubic-bezier(0.22,1,0.36,1);font-family:system-ui,-apple-system,sans-serif;'
            + 'color:#e0e0e0;';

        var closeBtn = document.createElement('div');
        closeBtn.style.cssText = 'position:absolute;top:8px;right:12px;cursor:pointer;font-size:18px;'
            + 'color:#888;width:24px;height:24px;display:flex;align-items:center;justify-content:center;'
            + 'border-radius:50%;transition:color 0.2s;';
        closeBtn.textContent = '\u2715';
        closeBtn.onmouseenter = function() { closeBtn.style.color = '#ffd700'; };
        closeBtn.onmouseleave = function() { closeBtn.style.color = '#888'; };
        closeBtn.onclick = function() { dismissPanel(); };

        var title = document.createElement('div');
        title.style.cssText = 'font-size:22px;font-weight:800;color:#ffd700;margin-bottom:8px;'
            + 'text-shadow:0 0 12px rgba(255,215,0,0.4);text-align:center;';
        title.textContent = 'Welcome Back!';

        var subtitle = document.createElement('div');
        subtitle.style.cssText = 'font-size:13px;color:#aaa;text-align:center;margin-bottom:16px;';
        subtitle.textContent = 'You were away for ' + absentHours + 'h — we missed you!';

        var amountBox = document.createElement('div');
        amountBox.style.cssText = 'background:linear-gradient(135deg,rgba(255,215,0,0.15),rgba(218,165,32,0.1));'
            + 'border:1px solid rgba(255,215,0,0.3);border-radius:12px;padding:16px;text-align:center;'
            + 'margin-bottom:16px;';

        var label = document.createElement('div');
        label.style.cssText = 'font-size:12px;color:#aaa;margin-bottom:6px;text-transform:uppercase;letter-spacing:1px;';
        label.textContent = 'Your Cashback Reward';

        var amount = document.createElement('div');
        amount.style.cssText = 'font-size:32px;font-weight:800;color:#ffd700;'
            + 'text-shadow:0 0 16px rgba(255,215,0,0.5);';
        amount.textContent = '$' + cashbackAmount.toFixed(2);

        var pctLabel = document.createElement('div');
        pctLabel.style.cssText = 'font-size:11px;color:#2ecc71;margin-top:4px;';
        pctLabel.textContent = pct + '% cashback on your last session';

        amountBox.appendChild(label);
        amountBox.appendChild(amount);
        amountBox.appendChild(pctLabel);

        var claimBtn = document.createElement('button');
        claimBtn.style.cssText = 'width:100%;padding:12px 0;background:linear-gradient(135deg,#ffd700,#daa520);'
            + 'color:#1a1a2e;border:none;border-radius:10px;font-size:16px;font-weight:700;cursor:pointer;'
            + 'transition:transform 0.15s,box-shadow 0.15s;box-shadow:0 4px 16px rgba(255,215,0,0.3);'
            + 'text-transform:uppercase;letter-spacing:1px;';
        claimBtn.textContent = 'Claim Cashback';
        claimBtn.onmouseenter = function() {
            claimBtn.style.transform = 'scale(1.03)';
            claimBtn.style.boxShadow = '0 6px 20px rgba(255,215,0,0.5)';
        };
        claimBtn.onmouseleave = function() {
            claimBtn.style.transform = 'scale(1)';
            claimBtn.style.boxShadow = '0 4px 16px rgba(255,215,0,0.3)';
        };
        claimBtn.onclick = function() {
            if (typeof balance !== 'undefined') {
                balance += cashbackAmount;
            }
            if (typeof updateBalanceDisplay === 'function') {
                updateBalanceDisplay();
            }
            claimBtn.textContent = 'Claimed!';
            claimBtn.style.background = 'linear-gradient(135deg,#2ecc71,#27ae60)';
            claimBtn.style.color = '#fff';
            claimBtn.disabled = true;
            setTimeout(function() { dismissPanel(); }, 800);
        };

        panel.appendChild(closeBtn);
        panel.appendChild(title);
        panel.appendChild(subtitle);
        panel.appendChild(amountBox);
        panel.appendChild(claimBtn);

        document.body.appendChild(panel);

        // Slide in
        requestAnimationFrame(function() {
            requestAnimationFrame(function() {
                panel.style.right = '0px';
            });
        });

        // Auto-dismiss
        var dismissTimer = setTimeout(function() { dismissPanel(); }, AUTO_DISMISS_MS);

        function dismissPanel() {
            clearTimeout(dismissTimer);
            panel.style.right = '-340px';
            setTimeout(function() {
                if (panel.parentNode) panel.parentNode.removeChild(panel);
            }, 700);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(createPanel, 5000);
        });
    } else {
        setTimeout(createPanel, 5000);
    }
})();
