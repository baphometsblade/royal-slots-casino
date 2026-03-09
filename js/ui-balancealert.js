/* ui-balancealert.js — Balance Alert System
 * Sprint 60: Compact bottom notification at key balance thresholds (double, round number, 50% drop).
 * Dynamically creates its own DOM elements (no static HTML required).
 */
(function () {
    'use strict';

    var ELEMENT_ID = 'balanceAlertWidget';
    var START_KEY = 'ms_balanceAlertStart';
    var HIGH_KEY = 'ms_balanceAlertHigh';
    var Z_INDEX = 8950;
    var AUTO_DISMISS_MS = 8000;
    var COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes per alert type
    var ROUND_NUMBERS = [100, 500, 1000, 5000, 10000];

    var _widget = null;
    var _messageEl = null;
    var _ctaBtn = null;
    var _closeBtn = null;
    var _styleTag = null;
    var _dismissed = false;
    var _showTimer = null;
    var _lastAlertTimes = {}; // { alertType: timestamp }

    function _getStartBalance() {
        try {
            var val = sessionStorage.getItem(START_KEY);
            return val ? parseFloat(val) : null;
        } catch (e) {
            return null;
        }
    }

    function _setStartBalance(n) {
        try {
            sessionStorage.setItem(START_KEY, String(n));
        } catch (e) { /* ignore */ }
    }

    function _getHighBalance() {
        try {
            var val = sessionStorage.getItem(HIGH_KEY);
            return val ? parseFloat(val) : null;
        } catch (e) {
            return null;
        }
    }

    function _setHighBalance(n) {
        try {
            sessionStorage.setItem(HIGH_KEY, String(n));
        } catch (e) { /* ignore */ }
    }

    function _canAlert(type) {
        var now = Date.now();
        if (_lastAlertTimes[type] && (now - _lastAlertTimes[type]) < COOLDOWN_MS) {
            return false;
        }
        return true;
    }

    function _markAlerted(type) {
        _lastAlertTimes[type] = Date.now();
    }

    function _injectStyles() {
        _styleTag = document.createElement('style');
        _styleTag.textContent = [
            '@keyframes balanceAlertSlideUp {',
            '  0% { transform: translateY(100%); opacity: 0; }',
            '  100% { transform: translateY(0); opacity: 1; }',
            '}',
            '@keyframes balanceAlertSlideDown {',
            '  0% { transform: translateY(0); opacity: 1; }',
            '  100% { transform: translateY(100%); opacity: 0; }',
            '}'
        ].join('\n');
        document.head.appendChild(_styleTag);
    }

    function _build() {
        _widget = document.createElement('div');
        _widget.id = ELEMENT_ID;
        _widget.style.cssText = [
            'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);',
            'z-index:' + Z_INDEX + ';display:none;',
            'min-width:320px;max-width:480px;padding:14px 20px;',
            'border-radius:14px;font-family:inherit;',
            'box-shadow:0 6px 24px rgba(0,0,0,0.5);',
            'transition:opacity 0.3s ease;'
        ].join('');

        var row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:12px;';

        _messageEl = document.createElement('div');
        _messageEl.style.cssText = 'flex:1;font-size:14px;line-height:1.4;';

        _ctaBtn = document.createElement('button');
        _ctaBtn.style.cssText = [
            'padding:8px 18px;font-size:13px;font-weight:bold;',
            'border:none;border-radius:20px;cursor:pointer;',
            'white-space:nowrap;flex-shrink:0;',
            'transition:transform 0.2s;'
        ].join('');
        _ctaBtn.style.display = 'none';

        _closeBtn = document.createElement('button');
        _closeBtn.style.cssText = [
            'background:none;border:none;color:inherit;cursor:pointer;',
            'font-size:18px;padding:0 0 0 8px;opacity:0.7;flex-shrink:0;'
        ].join('');
        _closeBtn.textContent = '\u2715';
        _closeBtn.addEventListener('click', function () {
            _hideAlert();
        });

        row.appendChild(_messageEl);
        row.appendChild(_ctaBtn);
        row.appendChild(_closeBtn);
        _widget.appendChild(row);
        document.body.appendChild(_widget);
    }

    function _showAlert(message, type, showDeposit) {
        if (_dismissed || !_widget) return;

        // Clear any pending timer
        if (_showTimer) {
            clearTimeout(_showTimer);
            _showTimer = null;
        }

        _messageEl.textContent = message;

        // Style based on type
        var bg, border, textColor, ctaBg, ctaColor;
        if (type === 'growth') {
            bg = 'linear-gradient(135deg,#0d3320,#1a4a30)';
            border = '2px solid #2ecc71';
            textColor = '#c0ffd0';
            ctaBg = '#2ecc71';
            ctaColor = '#0d3320';
        } else if (type === 'milestone') {
            bg = 'linear-gradient(135deg,#3a2d10,#4a3a15)';
            border = '2px solid #ffd700';
            textColor = '#fff3c0';
            ctaBg = '#ffd700';
            ctaColor = '#3a2d10';
        } else {
            // warning
            bg = 'linear-gradient(135deg,#3a2010,#4a2a15)';
            border = '2px solid #e67e22';
            textColor = '#ffe0c0';
            ctaBg = '#e67e22';
            ctaColor = '#3a2010';
        }

        _widget.style.background = bg;
        _widget.style.border = border;
        _messageEl.style.color = textColor;

        if (showDeposit) {
            _ctaBtn.textContent = 'Deposit';
            _ctaBtn.style.display = 'inline-block';
            _ctaBtn.style.background = ctaBg;
            _ctaBtn.style.color = ctaColor;
            _ctaBtn.onclick = function () {
                _hideAlert();
                if (typeof window.openWalletModal === 'function') {
                    window.openWalletModal();
                }
            };
        } else {
            _ctaBtn.style.display = 'none';
        }

        _widget.style.display = 'block';
        _widget.style.animation = 'balanceAlertSlideUp 0.4s ease-out forwards';

        _showTimer = setTimeout(function () {
            _hideAlert();
        }, AUTO_DISMISS_MS);
    }

    function _hideAlert() {
        if (!_widget) return;
        if (_showTimer) {
            clearTimeout(_showTimer);
            _showTimer = null;
        }
        _widget.style.animation = 'balanceAlertSlideDown 0.3s ease-in forwards';
        setTimeout(function () {
            if (_widget) {
                _widget.style.display = 'none';
                _widget.style.animation = '';
            }
        }, 300);
    }

    function _onSpinComplete() {
        if (_dismissed) return;

        var currentBalance = typeof window.balance === 'number' ? window.balance : 0;

        // Initialize start balance on first spin
        var startBal = _getStartBalance();
        if (startBal === null) {
            _setStartBalance(currentBalance);
            _setHighBalance(currentBalance);
            return;
        }

        // Update session high
        var highBal = _getHighBalance() || startBal;
        if (currentBalance > highBal) {
            highBal = currentBalance;
            _setHighBalance(highBal);
        }

        // Check: balance doubled
        if (currentBalance >= startBal * 2 && startBal > 0 && _canAlert('doubled')) {
            _markAlerted('doubled');
            _showAlert(
                '\uD83D\uDCC8 Balance Doubled! You started with $' + startBal.toFixed(2) + ', now at $' + currentBalance.toFixed(2) + '!',
                'growth',
                false
            );
            return;
        }

        // Check: round number milestones
        for (var i = ROUND_NUMBERS.length - 1; i >= 0; i--) {
            var rn = ROUND_NUMBERS[i];
            if (currentBalance >= rn && _canAlert('round_' + rn)) {
                // Only trigger if they just crossed this threshold
                var prevBalance = currentBalance; // approximate
                _markAlerted('round_' + rn);
                _showAlert(
                    '\uD83C\uDFAF You\'ve hit $' + rn.toLocaleString() + '! Lock in your profits?',
                    'milestone',
                    false
                );
                return;
            }
        }

        // Check: balance dropped 50% from session high
        if (highBal > 0 && currentBalance <= highBal * 0.5 && currentBalance < startBal && _canAlert('drop50')) {
            _markAlerted('drop50');
            _showAlert(
                '\u26A0\uFE0F Balance Alert \u2014 Down 50% from your high of $' + highBal.toFixed(2),
                'warning',
                true
            );
            return;
        }
    }

    function _init() {
        if (new URLSearchParams(window.location.search).get('noBonus') === '1') return;
        _injectStyles();
        _build();
        document.addEventListener('spinComplete', _onSpinComplete);
    }

    window.dismissBalanceAlert = function () {
        _dismissed = true;
        _hideAlert();
        if (_widget) {
            _widget.style.display = 'none';
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _init);
    } else {
        _init();
    }
})();
