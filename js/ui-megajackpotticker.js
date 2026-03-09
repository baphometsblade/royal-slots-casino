(function() {
    'use strict';

    var STORAGE_KEY = 'ms_megaJackpot';
    var CONTRIB_RATE = 0.005;

    var JACKPOT_TIERS = [
        { name: 'Grand', startValue: 2500, hitChance: 0.00005, color: '#FFD700', icon: '\uD83C\uDFC6' },
        { name: 'Major', startValue: 500, hitChance: 0.0005, color: '#C0C0C0', icon: '\uD83D\uDCAE' },
        { name: 'Mini', startValue: 100, hitChance: 0.005, color: '#CD7F32', icon: '\u2B50' }
    ];

    var tickerEl = null;
    var tierEls = [];
    var animIntervals = [];
    var displayValues = [];
    var isExpanded = true;

    function loadState() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                var parsed = JSON.parse(raw);
                if (parsed && parsed.values && parsed.values.length === JACKPOT_TIERS.length) {
                    return parsed;
                }
            }
        } catch (e) { /* ignore */ }
        var values = [];
        for (var i = 0; i < JACKPOT_TIERS.length; i++) {
            values.push(JACKPOT_TIERS[i].startValue);
        }
        return { values: values };
    }

    function saveState(state) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } catch (e) { /* ignore */ }
    }

    function formatMoney(val) {
        return '$' + val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function createTicker() {
        tickerEl = document.createElement('div');
        tickerEl.id = 'megaJackpotTicker';
        tickerEl.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:10400;background:linear-gradient(180deg,#0d0d1a,#1a1a2e);border-bottom:2px solid #FFD70044;padding:0;font-family:inherit;transition:max-height 0.3s ease,padding 0.3s ease;overflow:hidden;';

        var inner = document.createElement('div');
        inner.style.cssText = 'display:flex;align-items:center;justify-content:center;gap:24px;padding:8px 16px;flex-wrap:wrap;';

        var label = document.createElement('div');
        label.style.cssText = 'color:#FFD700;font-size:12px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;white-space:nowrap;';
        label.textContent = '\uD83C\uDFB0 MEGA JACKPOT';
        inner.appendChild(label);

        var state = loadState();
        tierEls = [];
        displayValues = [];

        for (var i = 0; i < JACKPOT_TIERS.length; i++) {
            var tier = JACKPOT_TIERS[i];
            var tierBox = document.createElement('div');
            tierBox.style.cssText = 'display:flex;align-items:center;gap:6px;background:#ffffff08;border:1px solid ' + tier.color + '33;border-radius:8px;padding:4px 12px;';

            var tierIcon = document.createElement('span');
            tierIcon.textContent = tier.icon;
            tierIcon.style.cssText = 'font-size:14px;';

            var tierLabel = document.createElement('span');
            tierLabel.style.cssText = 'color:' + tier.color + ';font-size:11px;font-weight:bold;';
            tierLabel.textContent = tier.name;

            var tierValue = document.createElement('span');
            tierValue.style.cssText = 'color:#fff;font-size:14px;font-weight:bold;font-variant-numeric:tabular-nums;min-width:80px;text-align:right;';
            tierValue.textContent = formatMoney(state.values[i]);

            displayValues.push(state.values[i]);

            tierBox.appendChild(tierIcon);
            tierBox.appendChild(tierLabel);
            tierBox.appendChild(tierValue);
            inner.appendChild(tierBox);
            tierEls.push(tierValue);
        }

        var toggleBtn = document.createElement('button');
        toggleBtn.style.cssText = 'background:none;border:1px solid #ffffff22;border-radius:4px;color:#888;font-size:11px;cursor:pointer;padding:2px 8px;white-space:nowrap;';
        toggleBtn.textContent = '\u25B2 Hide';
        toggleBtn.addEventListener('click', function() {
            isExpanded = !isExpanded;
            if (isExpanded) {
                inner.style.display = 'flex';
                toggleBtn.textContent = '\u25B2 Hide';
                tickerEl.style.borderBottom = '2px solid #FFD70044';
            } else {
                inner.style.display = 'none';
                toggleBtn.textContent = '\u25BC Jackpots';
                tickerEl.style.borderBottom = '1px solid #FFD70022';
            }
        });

        var toggleRow = document.createElement('div');
        toggleRow.style.cssText = 'display:flex;justify-content:center;padding:2px;';
        toggleRow.appendChild(toggleBtn);

        tickerEl.appendChild(inner);
        tickerEl.appendChild(toggleRow);
        document.body.appendChild(tickerEl);

        startAnimations(state);
    }

    function startAnimations(state) {
        for (var i = 0; i < animIntervals.length; i++) {
            clearInterval(animIntervals[i]);
        }
        animIntervals = [];

        for (var j = 0; j < JACKPOT_TIERS.length; j++) {
            (function(idx) {
                var interval = setInterval(function() {
                    var st = loadState();
                    var target = st.values[idx];
                    var diff = target - displayValues[idx];
                    if (Math.abs(diff) < 0.01) {
                        displayValues[idx] = target;
                    } else {
                        displayValues[idx] += diff * 0.1;
                    }
                    if (tierEls[idx]) {
                        tierEls[idx].textContent = formatMoney(displayValues[idx]);
                    }
                }, 50);
                animIntervals.push(interval);
            })(j);
        }
    }

    function showWinAlert(tierName, amount, color) {
        var alert = document.createElement('div');
        alert.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) scale(0);z-index:10400;background:linear-gradient(145deg,#1a1a2e,#0d0d1a);border:3px solid ' + color + ';border-radius:20px;padding:40px;text-align:center;box-shadow:0 0 60px ' + color + '66;transition:transform 0.5s cubic-bezier(0.175,0.885,0.32,1.275);';

        var icon = document.createElement('div');
        icon.textContent = '\uD83C\uDFC6';
        icon.style.cssText = 'font-size:64px;margin-bottom:16px;';

        var title = document.createElement('h2');
        title.style.cssText = 'color:' + color + ';margin:0 0 8px 0;font-size:28px;';
        title.textContent = tierName + ' JACKPOT!';

        var amountEl = document.createElement('div');
        amountEl.style.cssText = 'color:#fff;font-size:36px;font-weight:bold;margin-bottom:16px;';
        amountEl.textContent = formatMoney(amount);

        var congrats = document.createElement('p');
        congrats.style.cssText = 'color:#aaa;font-size:14px;margin:0;';
        congrats.textContent = 'Congratulations! You hit the jackpot!';

        alert.appendChild(icon);
        alert.appendChild(title);
        alert.appendChild(amountEl);
        alert.appendChild(congrats);
        document.body.appendChild(alert);

        requestAnimationFrame(function() {
            alert.style.transform = 'translate(-50%,-50%) scale(1)';
        });

        setTimeout(function() {
            alert.style.transform = 'translate(-50%,-50%) scale(0)';
            setTimeout(function() {
                if (alert.parentNode) alert.parentNode.removeChild(alert);
            }, 500);
        }, 4000);
    }

    window.dismissMegaJackpotTicker = function() {
        for (var i = 0; i < animIntervals.length; i++) {
            clearInterval(animIntervals[i]);
        }
        animIntervals = [];
        var el = document.getElementById('megaJackpotTicker');
        if (el && el.parentNode) el.parentNode.removeChild(el);
    };

    function init() {
        if (new URLSearchParams(window.location.search).get('noBonus') === '1') return;

        createTicker();

        document.addEventListener('spinComplete', function(e) {
            var state = loadState();
            var bet = 0;
            if (e && e.detail && typeof e.detail.bet === 'number') {
                bet = e.detail.bet;
            } else if (typeof window.currentBet === 'number') {
                bet = window.currentBet;
            }

            var contribution = bet * CONTRIB_RATE;
            for (var i = 0; i < state.values.length; i++) {
                state.values[i] += contribution;
            }

            for (var j = 0; j < JACKPOT_TIERS.length; j++) {
                var roll = Math.random();
                if (roll < JACKPOT_TIERS[j].hitChance) {
                    var wonAmount = state.values[j];
                    if (typeof window.balance === 'number') {
                        window.balance += wonAmount;
                        if (typeof window.updateBalanceDisplay === 'function') {
                            window.updateBalanceDisplay();
                        }
                    }
                    showWinAlert(JACKPOT_TIERS[j].name, wonAmount, JACKPOT_TIERS[j].color);
                    state.values[j] = JACKPOT_TIERS[j].startValue;
                    break;
                }
            }

            saveState(state);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
