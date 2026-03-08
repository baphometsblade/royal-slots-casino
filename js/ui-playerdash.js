(function() {
    'use strict';

    var STORAGE_KEY = 'ms_playerDash';
    var MAX_HISTORY = 10;

    var widgetEl = null;
    var isExpanded = true;
    var sessionStart = Date.now();
    var sessionSpins = 0;
    var sessionWagered = 0;
    var sessionWon = 0;
    var spinHistory = [];

    function loadState() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            if (raw) return JSON.parse(raw);
        } catch (e) { /* ignore */ }
        return { collapsed: false };
    }

    function saveState(state) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } catch (e) { /* ignore */ }
    }

    function formatTime(ms) {
        var totalSec = Math.floor(ms / 1000);
        var h = Math.floor(totalSec / 3600);
        var m = Math.floor((totalSec % 3600) / 60);
        var s = totalSec % 60;
        if (h > 0) return h + 'h ' + m + 'm';
        if (m > 0) return m + 'm ' + s + 's';
        return s + 's';
    }

    function formatMoney(val) {
        var sign = val < 0 ? '-' : (val > 0 ? '+' : '');
        return sign + '$' + Math.abs(val).toFixed(2);
    }

    function showToast(msg) {
        var toast = document.createElement('div');
        toast.style.cssText = 'position:fixed;bottom:80px;right:20px;background:#333;color:#fff;padding:10px 20px;border-radius:8px;font-size:13px;z-index:100010;opacity:0;transition:opacity 0.3s;';
        toast.textContent = msg;
        document.body.appendChild(toast);
        requestAnimationFrame(function() { toast.style.opacity = '1'; });
        setTimeout(function() {
            toast.style.opacity = '0';
            setTimeout(function() { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 300);
        }, 2000);
    }

    function createWidget() {
        var state = loadState();
        isExpanded = !state.collapsed;

        widgetEl = document.createElement('div');
        widgetEl.id = 'playerDashWidget';
        widgetEl.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:99980;font-family:inherit;transition:all 0.3s ease;';

        var container = document.createElement('div');
        container.style.cssText = 'background:linear-gradient(145deg,#1a1a2e,#16213e);border:1px solid #ffffff15;border-radius:12px;box-shadow:0 4px 24px rgba(0,0,0,0.5);overflow:hidden;width:280px;';

        var header = document.createElement('div');
        header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:#ffffff08;cursor:pointer;user-select:none;';

        var headerLabel = document.createElement('span');
        headerLabel.style.cssText = 'color:#fff;font-size:13px;font-weight:bold;';
        headerLabel.textContent = '\uD83D\uDCCA Session Dashboard';

        var toggleArrow = document.createElement('span');
        toggleArrow.style.cssText = 'color:#888;font-size:12px;transition:transform 0.3s;';
        toggleArrow.textContent = '\u25BC';

        header.appendChild(headerLabel);
        header.appendChild(toggleArrow);

        var body = document.createElement('div');
        body.style.cssText = 'padding:12px 14px;transition:max-height 0.3s ease,opacity 0.3s ease;overflow:hidden;';

        var statsGrid = document.createElement('div');
        statsGrid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px;';

        var statItems = [
            { id: 'time', label: 'Time', value: '0s', color: '#60a5fa' },
            { id: 'spins', label: 'Spins', value: '0', color: '#a78bfa' },
            { id: 'wagered', label: 'Wagered', value: '$0.00', color: '#f59e0b' },
            { id: 'won', label: 'Won', value: '$0.00', color: '#34d399' }
        ];

        var statEls = {};
        for (var i = 0; i < statItems.length; i++) {
            var item = statItems[i];
            var box = document.createElement('div');
            box.style.cssText = 'background:#ffffff06;border-radius:6px;padding:6px 8px;';

            var valEl = document.createElement('div');
            valEl.style.cssText = 'color:' + item.color + ';font-size:14px;font-weight:bold;font-variant-numeric:tabular-nums;';
            valEl.textContent = item.value;

            var labelEl = document.createElement('div');
            labelEl.style.cssText = 'color:#888;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;';
            labelEl.textContent = item.label;

            box.appendChild(valEl);
            box.appendChild(labelEl);
            statsGrid.appendChild(box);
            statEls[item.id] = valEl;
        }

        var pnlRow = document.createElement('div');
        pnlRow.style.cssText = 'display:flex;align-items:center;justify-content:space-between;background:#ffffff06;border-radius:6px;padding:8px 10px;margin-bottom:12px;';

        var pnlLabel = document.createElement('span');
        pnlLabel.style.cssText = 'color:#888;font-size:11px;font-weight:bold;text-transform:uppercase;';
        pnlLabel.textContent = 'Net P&L';

        var pnlValue = document.createElement('span');
        pnlValue.style.cssText = 'font-size:16px;font-weight:bold;font-variant-numeric:tabular-nums;';
        pnlValue.textContent = '$0.00';
        statEls.pnl = pnlValue;

        pnlRow.appendChild(pnlLabel);
        pnlRow.appendChild(pnlValue);

        var chartLabel = document.createElement('div');
        chartLabel.style.cssText = 'color:#888;font-size:10px;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.5px;';
        chartLabel.textContent = 'Last 10 Spins';

        var chartContainer = document.createElement('div');
        chartContainer.style.cssText = 'display:flex;align-items:flex-end;gap:2px;height:40px;margin-bottom:12px;background:#ffffff04;border-radius:4px;padding:4px;';
        statEls.chart = chartContainer;

        for (var c = 0; c < MAX_HISTORY; c++) {
            var bar = document.createElement('div');
            bar.style.cssText = 'flex:1;background:#333;border-radius:2px 2px 0 0;min-height:2px;height:2px;transition:height 0.3s,background 0.3s;';
            chartContainer.appendChild(bar);
        }

        var actionsRow = document.createElement('div');
        actionsRow.style.cssText = 'display:flex;gap:6px;';

        var actionLabels = ['\uD83C\uDFAF Goals', '\uD83D\uDCC8 Stats', '\u2699\uFE0F Settings'];
        for (var a = 0; a < actionLabels.length; a++) {
            var actionBtn = document.createElement('button');
            actionBtn.style.cssText = 'flex:1;background:#ffffff0a;border:1px solid #ffffff15;border-radius:6px;color:#aaa;font-size:11px;padding:6px 4px;cursor:pointer;transition:background 0.2s;';
            actionBtn.textContent = actionLabels[a];
            actionBtn.addEventListener('mouseenter', function() { this.style.background = '#ffffff15'; });
            actionBtn.addEventListener('mouseleave', function() { this.style.background = '#ffffff0a'; });
            actionBtn.addEventListener('click', function() { showToast('Coming soon'); });
            actionsRow.appendChild(actionBtn);
        }

        body.appendChild(statsGrid);
        body.appendChild(pnlRow);
        body.appendChild(chartLabel);
        body.appendChild(chartContainer);
        body.appendChild(actionsRow);

        container.appendChild(header);
        container.appendChild(body);
        widgetEl.appendChild(container);
        document.body.appendChild(widgetEl);

        header.addEventListener('click', function() {
            isExpanded = !isExpanded;
            if (isExpanded) {
                body.style.maxHeight = '400px';
                body.style.opacity = '1';
                body.style.padding = '12px 14px';
                toggleArrow.style.transform = 'rotate(0deg)';
            } else {
                body.style.maxHeight = '0';
                body.style.opacity = '0';
                body.style.padding = '0 14px';
                toggleArrow.style.transform = 'rotate(-90deg)';
            }
            var st = loadState();
            st.collapsed = !isExpanded;
            saveState(st);
        });

        if (!isExpanded) {
            body.style.maxHeight = '0';
            body.style.opacity = '0';
            body.style.padding = '0 14px';
            toggleArrow.style.transform = 'rotate(-90deg)';
        } else {
            body.style.maxHeight = '400px';
        }

        setInterval(function() {
            updateDisplay(statEls);
        }, 1000);

        return statEls;
    }

    function updateDisplay(statEls) {
        if (!statEls) return;

        var elapsed = Date.now() - sessionStart;
        statEls.time.textContent = formatTime(elapsed);
        statEls.spins.textContent = sessionSpins.toString();
        statEls.wagered.textContent = '$' + sessionWagered.toFixed(2);
        statEls.won.textContent = '$' + sessionWon.toFixed(2);

        var pnl = sessionWon - sessionWagered;
        statEls.pnl.textContent = formatMoney(pnl);
        if (pnl > 0) {
            statEls.pnl.style.color = '#4ade80';
        } else if (pnl < 0) {
            statEls.pnl.style.color = '#f87171';
        } else {
            statEls.pnl.style.color = '#888';
        }

        updateChart(statEls.chart);
    }

    function updateChart(chartContainer) {
        if (!chartContainer) return;
        var bars = chartContainer.children;
        var maxVal = 1;
        for (var i = 0; i < spinHistory.length; i++) {
            if (Math.abs(spinHistory[i]) > maxVal) maxVal = Math.abs(spinHistory[i]);
        }

        for (var j = 0; j < MAX_HISTORY; j++) {
            if (!bars[j]) continue;
            if (j < spinHistory.length) {
                var val = spinHistory[j];
                var pct = Math.max(10, Math.abs(val) / maxVal * 100);
                bars[j].style.height = pct + '%';
                if (val > 0) {
                    bars[j].style.background = 'linear-gradient(180deg,#4ade80,#22c55e)';
                } else if (val < 0) {
                    bars[j].style.background = 'linear-gradient(180deg,#f87171,#ef4444)';
                } else {
                    bars[j].style.background = '#555';
                    bars[j].style.height = '10%';
                }
            } else {
                bars[j].style.height = '2px';
                bars[j].style.background = '#333';
            }
        }
    }

    window.dismissPlayerDash = function() {
        var el = document.getElementById('playerDashWidget');
        if (el && el.parentNode) el.parentNode.removeChild(el);
    };

    function init() {
        if (new URLSearchParams(window.location.search).get('noBonus') === '1') return;

        var statEls = createWidget();

        document.addEventListener('spinComplete', function(e) {
            sessionSpins++;
            var bet = 0;
            var winAmount = 0;
            if (e && e.detail) {
                if (typeof e.detail.bet === 'number') bet = e.detail.bet;
                if (typeof e.detail.win === 'number') winAmount = e.detail.win;
            }
            if (bet === 0 && typeof window.currentBet === 'number') {
                bet = window.currentBet;
            }
            sessionWagered += bet;
            sessionWon += winAmount;

            var netResult = winAmount - bet;
            spinHistory.push(netResult);
            if (spinHistory.length > MAX_HISTORY) {
                spinHistory.shift();
            }

            updateDisplay(statEls);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
