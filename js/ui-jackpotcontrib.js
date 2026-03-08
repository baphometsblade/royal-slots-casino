(function() {
    'use strict';

    var STORAGE_KEY = 'ms_jackpotContrib';
    var STARTING_POOL = 500;
    var POOL_CAP = 2000;
    var RESET_POOL = 250;
    var CONTRIB_RATE = 0.01;
    var TRIGGER_CHANCE = 0.001;
    var TRIGGER_MIN_POOL = 1000;
    var WINNER_SHARE = 0.5;

    var pool = STARTING_POOL;
    var personalContrib = 0;
    var containerEl = null;
    var meterFillEl = null;
    var poolLabelEl = null;
    var contribLabelEl = null;
    var visible = false;

    function loadState() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                var s = JSON.parse(raw);
                pool = typeof s.pool === 'number' ? s.pool : STARTING_POOL;
                personalContrib = typeof s.personalContrib === 'number' ? s.personalContrib : 0;
            }
        } catch (e) { /* ignore */ }
    }

    function saveState() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                pool: pool,
                personalContrib: personalContrib
            }));
        } catch (e) { /* ignore */ }
    }

    function buildContainer() {
        if (containerEl) return;

        containerEl = document.createElement('div');
        containerEl.id = 'jackpotContribMeter';
        containerEl.style.cssText = 'position:fixed;left:12px;top:50%;transform:translateY(-50%);' +
            'z-index:9989;background:linear-gradient(180deg,#1a1a2e,#0f0f23);' +
            'border:2px solid #ffd700;border-radius:14px;padding:12px 10px;color:#fff;' +
            'font-family:inherit;box-shadow:0 4px 20px rgba(255,215,0,0.25);width:56px;' +
            'display:none;transition:opacity 0.4s;';

        // Title
        var titleEl = document.createElement('div');
        titleEl.style.cssText = 'font-size:9px;font-weight:700;color:#ffd700;text-align:center;' +
            'margin-bottom:6px;letter-spacing:0.5px;text-transform:uppercase;';
        titleEl.textContent = 'JACKPOT';
        containerEl.appendChild(titleEl);

        // Close button
        var closeBtn = document.createElement('button');
        closeBtn.style.cssText = 'position:absolute;top:2px;right:4px;background:none;border:none;' +
            'color:#666;cursor:pointer;font-size:12px;padding:0;line-height:1;';
        closeBtn.textContent = '\u00D7';
        closeBtn.addEventListener('click', function() { dismiss(); });
        containerEl.appendChild(closeBtn);

        // Meter track
        var meterTrack = document.createElement('div');
        meterTrack.style.cssText = 'width:20px;height:120px;background:#222;border-radius:10px;' +
            'margin:0 auto 6px;position:relative;overflow:hidden;border:1px solid #444;';

        meterFillEl = document.createElement('div');
        meterFillEl.style.cssText = 'position:absolute;bottom:0;left:0;right:0;' +
            'background:linear-gradient(0deg,#ffd700,#ff6b35);border-radius:0 0 9px 9px;' +
            'transition:height 0.6s ease;';
        meterFillEl.style.height = '0%';
        meterTrack.appendChild(meterFillEl);

        containerEl.appendChild(meterTrack);

        // Pool amount
        poolLabelEl = document.createElement('div');
        poolLabelEl.style.cssText = 'font-size:11px;font-weight:700;color:#ffd700;text-align:center;margin-bottom:2px;';
        poolLabelEl.textContent = '$' + pool.toFixed(0);
        containerEl.appendChild(poolLabelEl);

        // Personal contribution
        contribLabelEl = document.createElement('div');
        contribLabelEl.style.cssText = 'font-size:8px;color:#aaa;text-align:center;';
        contribLabelEl.textContent = 'You: $' + personalContrib.toFixed(2);
        containerEl.appendChild(contribLabelEl);

        document.body.appendChild(containerEl);
    }

    function updateMeter() {
        if (!meterFillEl || !poolLabelEl || !contribLabelEl) return;
        var pct = Math.min(100, (pool / POOL_CAP) * 100);
        meterFillEl.style.height = pct + '%';

        if (pct > 80) {
            meterFillEl.style.background = 'linear-gradient(0deg,#ff0040,#ffd700)';
        } else if (pct > 50) {
            meterFillEl.style.background = 'linear-gradient(0deg,#ffd700,#ff6b35)';
        } else {
            meterFillEl.style.background = 'linear-gradient(0deg,#4ade80,#ffd700)';
        }

        poolLabelEl.textContent = '$' + pool.toFixed(0);
        contribLabelEl.textContent = 'You: $' + personalContrib.toFixed(2);
    }

    function showJackpotWin(amount) {
        if (!containerEl) return;

        var overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.8);' +
            'display:flex;align-items:center;justify-content:center;';

        var card = document.createElement('div');
        card.style.cssText = 'background:linear-gradient(135deg,#1a1a2e,#16213e);' +
            'border:3px solid #ffd700;border-radius:20px;padding:30px 40px;text-align:center;' +
            'box-shadow:0 0 60px rgba(255,215,0,0.5);';

        var emoji = document.createElement('div');
        emoji.style.cssText = 'font-size:48px;margin-bottom:10px;';
        emoji.textContent = '\uD83C\uDFC6';
        card.appendChild(emoji);

        var title = document.createElement('div');
        title.style.cssText = 'font-size:24px;font-weight:700;color:#ffd700;margin-bottom:6px;';
        title.textContent = 'JACKPOT!';
        card.appendChild(title);

        var amountEl = document.createElement('div');
        amountEl.style.cssText = 'font-size:32px;font-weight:700;color:#4ade80;margin-bottom:12px;';
        amountEl.textContent = '+$' + amount.toFixed(2);
        card.appendChild(amountEl);

        var desc = document.createElement('div');
        desc.style.cssText = 'font-size:13px;color:#aaa;margin-bottom:16px;';
        desc.textContent = 'Your contribution: $' + personalContrib.toFixed(2);
        card.appendChild(desc);

        var btn = document.createElement('button');
        btn.style.cssText = 'background:#ffd700;color:#000;border:none;border-radius:10px;' +
            'padding:10px 30px;font-size:14px;font-weight:700;cursor:pointer;';
        btn.textContent = 'Collect!';
        btn.addEventListener('click', function() {
            if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        });
        card.appendChild(btn);

        overlay.appendChild(card);
        overlay.addEventListener('click', function(e) {
            if (e.target === overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
        });
        document.body.appendChild(overlay);
    }

    function onSpin(e) {
        var bet = 1;
        if (e && e.detail && typeof e.detail.bet === 'number') {
            bet = e.detail.bet;
        } else if (typeof window.currentBet === 'number') {
            bet = window.currentBet;
        }

        var contribution = bet * CONTRIB_RATE;
        pool = Math.min(POOL_CAP, pool + contribution);
        personalContrib += contribution;

        // Show meter if hidden
        if (!visible && containerEl) {
            containerEl.style.display = 'block';
            visible = true;
        }

        updateMeter();

        // Check jackpot trigger
        if (pool >= TRIGGER_MIN_POOL && Math.random() < TRIGGER_CHANCE) {
            var winAmount = pool * WINNER_SHARE;
            pool = RESET_POOL;
            personalContrib = 0;

            if (typeof window.balance === 'number') {
                window.balance += winAmount;
                if (typeof window.updateBalanceDisplay === 'function') {
                    window.updateBalanceDisplay();
                }
            }

            updateMeter();
            showJackpotWin(winAmount);
        }

        saveState();
    }

    function dismiss() {
        if (containerEl) {
            containerEl.style.display = 'none';
            visible = false;
        }
    }

    function init() {
        if (new URLSearchParams(window.location.search).get('noBonus') === '1') return;

        loadState();
        buildContainer();
        updateMeter();

        if (pool > STARTING_POOL) {
            containerEl.style.display = 'block';
            visible = true;
        }

        document.addEventListener('spinComplete', onSpin);
    }

    window.dismissJackpotContrib = dismiss;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
