(function(){
    'use strict';

    var ELEMENT_ID = 'hotColdIndicator';
    var Z_INDEX = 10400;
    var POLL_INTERVAL = 3000;
    var HISTORY_SIZE = 10;

    var recentResults = [];
    var lastBalance = null;
    var currentState = 'warm';

    var STATES = {
        hot:  { label: '\uD83D\uDD25 HOT',  bg: 'rgba(231,76,60,0.85)',  border: '#e74c3c' },
        warm: { label: '\uD83D\uDE10 WARM', bg: 'rgba(241,196,15,0.85)', border: '#f1c40f' },
        cold: { label: '\u2744\uFE0F COLD', bg: 'rgba(52,152,219,0.85)', border: '#3498db' }
    };

    function calculateState() {
        if (recentResults.length === 0) return 'warm';
        var positiveCount = 0;
        for (var i = 0; i < recentResults.length; i++) {
            if (recentResults[i] > 0) positiveCount++;
        }
        var ratio = positiveCount / recentResults.length;
        if (ratio >= 0.6) return 'hot';
        if (ratio <= 0.3) return 'cold';
        return 'warm';
    }

    function init() {
        if (document.getElementById(ELEMENT_ID)) return;

        var indicator = document.createElement('div');
        indicator.id = ELEMENT_ID;
        indicator.style.cssText = 'position:fixed;top:42px;left:8px;width:60px;height:24px;' +
            'border-radius:12px;z-index:' + Z_INDEX + ';display:flex;align-items:center;' +
            'justify-content:center;font-family:inherit;font-size:10px;font-weight:700;' +
            'cursor:pointer;user-select:none;transition:background 0.6s ease,border-color 0.6s ease;' +
            'box-shadow:0 2px 6px rgba(0,0,0,0.3);';

        var tooltip = document.createElement('div');
        tooltip.style.cssText = 'position:fixed;top:70px;left:8px;padding:6px 10px;' +
            'background:rgba(22,33,62,0.95);border:1px solid rgba(255,215,0,0.2);border-radius:6px;' +
            'font-size:10px;color:#aab;z-index:' + (Z_INDEX + 1) + ';display:none;font-family:inherit;' +
            'white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.4);';
        tooltip.textContent = 'Based on your last 10 results';

        var tooltipVisible = false;

        indicator.addEventListener('click', function(e) {
            e.stopPropagation();
            tooltipVisible = !tooltipVisible;
            tooltip.style.display = tooltipVisible ? 'block' : 'none';
        });

        document.addEventListener('click', function() {
            if (tooltipVisible) {
                tooltipVisible = false;
                tooltip.style.display = 'none';
            }
        });

        document.body.appendChild(indicator);
        document.body.appendChild(tooltip);

        function applyState(state) {
            var cfg = STATES[state];
            indicator.style.background = cfg.bg;
            indicator.style.border = '1px solid ' + cfg.border;
            indicator.style.color = '#fff';
            indicator.textContent = cfg.label;
        }

        applyState(currentState);

        setInterval(function() {
            var currentBalance = typeof balance !== 'undefined' ? balance : null;
            if (currentBalance === null) return;

            if (lastBalance !== null && currentBalance !== lastBalance) {
                var diff = currentBalance - lastBalance;
                recentResults.push(diff);
                if (recentResults.length > HISTORY_SIZE) {
                    recentResults.shift();
                }

                var newState = calculateState();
                if (newState !== currentState) {
                    currentState = newState;
                    applyState(currentState);
                }
            }
            lastBalance = currentBalance;
        }, POLL_INTERVAL);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(init, 4500);
        });
    } else {
        setTimeout(init, 4500);
    }
})();
