/* ui-wingoaltracker.js — Win Goal Tracker
 * Sprint 61: Fixed bottom bar letting users set and track a session win goal.
 * Dynamically creates its own DOM elements (no static HTML required).
 */
(function () {
    'use strict';

    var ELEMENT_ID = 'winGoalTracker';
    var STORAGE_KEY = 'ms_winGoalTracker';
    var Z_INDEX = 8650;
    var DEFAULT_GOAL = 50;
    var GOAL_MIN = 10;
    var GOAL_MAX = 500;
    var GOAL_STEP = 10;

    var _state = {
        goal: DEFAULT_GOAL,
        startBalance: null,
        dismissed: false,
        goalReached: false
    };

    function _loadSession() {
        try {
            var raw = sessionStorage.getItem(STORAGE_KEY);
            if (raw) {
                var parsed = JSON.parse(raw);
                if (parsed.goal) _state.goal = parsed.goal;
                if (typeof parsed.startBalance === 'number') _state.startBalance = parsed.startBalance;
                if (parsed.dismissed) _state.dismissed = parsed.dismissed;
                if (parsed.goalReached) _state.goalReached = parsed.goalReached;
            }
        } catch (e) { /* ignore */ }
    }

    function _saveSession() {
        try {
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify(_state));
        } catch (e) { /* storage full */ }
    }

    function _getProfit() {
        if (_state.startBalance === null || typeof window.balance !== 'number') return 0;
        return Math.max(0, window.balance - _state.startBalance);
    }

    function _getProgress() {
        var profit = _getProfit();
        return Math.min(100, (profit / _state.goal) * 100);
    }

    function _showGoalReached(el) {
        el.style.background = 'linear-gradient(90deg, #0a2818, #163828)';
        el.style.borderTop = '2px solid #2ecc71';

        var celebration = document.getElementById(ELEMENT_ID + '_celebration');
        if (celebration) {
            celebration.style.display = 'inline';
        }

        setTimeout(function () {
            el.style.background = 'linear-gradient(90deg, #0a1628, #162840)';
            el.style.borderTop = '1px solid rgba(52,152,219,0.3)';
        }, 5000);
    }

    function _update() {
        var el = document.getElementById(ELEMENT_ID);
        if (!el) return;

        if (_state.startBalance === null && typeof window.balance === 'number') {
            _state.startBalance = window.balance;
            _saveSession();
        }

        var goalLabel = document.getElementById(ELEMENT_ID + '_goal');
        var currentLabel = document.getElementById(ELEMENT_ID + '_current');
        var pctLabel = document.getElementById(ELEMENT_ID + '_pct');
        var fill = document.getElementById(ELEMENT_ID + '_fill');

        var profit = _getProfit();
        var pct = _getProgress();

        if (goalLabel) goalLabel.textContent = '$' + _state.goal;
        if (currentLabel) currentLabel.textContent = '$' + profit.toFixed(2);
        if (pctLabel) pctLabel.textContent = Math.floor(pct) + '%';
        if (fill) fill.style.width = pct + '%';

        // Goal reached celebration
        if (pct >= 100 && !_state.goalReached) {
            _state.goalReached = true;
            _saveSession();
            _showGoalReached(el);
        }
    }

    function _build() {
        if (document.getElementById(ELEMENT_ID)) return;

        var bar = document.createElement('div');
        bar.id = ELEMENT_ID;
        bar.style.cssText = 'position:fixed;bottom:0;left:0;width:100%;height:40px;' +
            'background:linear-gradient(90deg,#0a1628,#162840);z-index:' + Z_INDEX + ';' +
            'display:flex;align-items:center;padding:0 12px;box-sizing:border-box;' +
            'font-family:Arial,sans-serif;font-size:13px;color:#e2e8f0;' +
            'border-top:1px solid rgba(52,152,219,0.3);';

        // Target icon
        var icon = document.createElement('span');
        icon.style.cssText = 'font-size:16px;margin-right:6px;';
        icon.textContent = '\uD83C\uDFAF';
        bar.appendChild(icon);

        // Goal label
        var goalText = document.createElement('span');
        goalText.style.cssText = 'color:#94a3b8;margin-right:4px;';
        goalText.textContent = 'Goal:';
        bar.appendChild(goalText);

        var goalVal = document.createElement('span');
        goalVal.id = ELEMENT_ID + '_goal';
        goalVal.style.cssText = 'color:#3498db;font-weight:bold;margin-right:6px;';
        goalVal.textContent = '$' + _state.goal;
        bar.appendChild(goalVal);

        // Minus button
        var minusBtn = document.createElement('button');
        minusBtn.style.cssText = 'background:#1e3a5f;color:#fff;border:1px solid #2c5282;' +
            'border-radius:4px;width:22px;height:22px;cursor:pointer;font-size:14px;' +
            'display:flex;align-items:center;justify-content:center;margin-right:2px;padding:0;line-height:1;';
        minusBtn.textContent = '\u2212';
        minusBtn.addEventListener('click', function () {
            _state.goal = Math.max(GOAL_MIN, _state.goal - GOAL_STEP);
            _state.goalReached = false;
            _saveSession();
            _update();
        });
        bar.appendChild(minusBtn);

        // Plus button
        var plusBtn = document.createElement('button');
        plusBtn.style.cssText = 'background:#1e3a5f;color:#fff;border:1px solid #2c5282;' +
            'border-radius:4px;width:22px;height:22px;cursor:pointer;font-size:14px;' +
            'display:flex;align-items:center;justify-content:center;margin-right:10px;padding:0;line-height:1;';
        plusBtn.textContent = '+';
        plusBtn.addEventListener('click', function () {
            _state.goal = Math.min(GOAL_MAX, _state.goal + GOAL_STEP);
            _state.goalReached = false;
            _saveSession();
            _update();
        });
        bar.appendChild(plusBtn);

        // Divider
        var div1 = document.createElement('span');
        div1.style.cssText = 'color:#475569;margin-right:10px;';
        div1.textContent = '|';
        bar.appendChild(div1);

        // Current profit
        var curText = document.createElement('span');
        curText.style.cssText = 'color:#94a3b8;margin-right:4px;';
        curText.textContent = 'Current:';
        bar.appendChild(curText);

        var curVal = document.createElement('span');
        curVal.id = ELEMENT_ID + '_current';
        curVal.style.cssText = 'color:#2ecc71;font-weight:bold;margin-right:10px;';
        curVal.textContent = '$0.00';
        bar.appendChild(curVal);

        // Divider
        var div2 = document.createElement('span');
        div2.style.cssText = 'color:#475569;margin-right:10px;';
        div2.textContent = '|';
        bar.appendChild(div2);

        // Progress bar
        var barBg = document.createElement('div');
        barBg.style.cssText = 'flex:1;height:14px;background:#1a2742;border-radius:7px;overflow:hidden;margin:0 10px;min-width:80px;';

        var barFill = document.createElement('div');
        barFill.id = ELEMENT_ID + '_fill';
        var pct = _getProgress();
        barFill.style.cssText = 'height:100%;border-radius:7px;transition:width 0.5s ease;width:' + pct + '%;' +
            'background:linear-gradient(90deg,#3498db,#2ecc71);';
        barBg.appendChild(barFill);
        bar.appendChild(barBg);

        // Percentage
        var pctLabel = document.createElement('span');
        pctLabel.id = ELEMENT_ID + '_pct';
        pctLabel.style.cssText = 'color:#3498db;font-weight:bold;min-width:36px;text-align:right;margin-right:8px;';
        pctLabel.textContent = '0%';
        bar.appendChild(pctLabel);

        // Celebration text (hidden)
        var celebration = document.createElement('span');
        celebration.id = ELEMENT_ID + '_celebration';
        celebration.style.cssText = 'display:none;color:#fbbf24;font-weight:bold;font-size:12px;margin-right:8px;';
        celebration.textContent = 'Goal Reached! \uD83C\uDF89 Cash out now?';
        bar.appendChild(celebration);

        // Close button
        var closeBtn = document.createElement('button');
        closeBtn.style.cssText = 'background:none;border:none;color:#64748b;font-size:16px;' +
            'cursor:pointer;padding:0 4px;line-height:1;';
        closeBtn.textContent = '\u2715';
        closeBtn.addEventListener('click', function () {
            window.dismissWinGoalTracker();
        });
        bar.appendChild(closeBtn);

        document.body.appendChild(bar);
    }

    function _init() {
        if (new URLSearchParams(window.location.search).get('noBonus') === '1') return;
        _loadSession();
        if (_state.dismissed) return;

        if (_state.startBalance === null && typeof window.balance === 'number') {
            _state.startBalance = window.balance;
            _saveSession();
        }

        _build();
        _update();

        // Listen for spin completions
        document.addEventListener('spinComplete', function () {
            _update();
        });

        // Periodic update for balance changes
        setInterval(function () {
            _update();
        }, 2000);
    }

    window.dismissWinGoalTracker = function () {
        _state.dismissed = true;
        _saveSession();
        var el = document.getElementById(ELEMENT_ID);
        if (el) {
            el.style.transition = 'transform 0.3s, opacity 0.3s';
            el.style.transform = 'translateY(100%)';
            el.style.opacity = '0';
            setTimeout(function () {
                if (el.parentNode) el.parentNode.removeChild(el);
            }, 300);
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _init);
    } else {
        _init();
    }
})();
