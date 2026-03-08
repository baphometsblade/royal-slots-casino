/* ui-spininsurance.js -- Spin Insurance (Sprint 37)
 * Loss protection: pay 10% premium per spin, get 50% refund on losses.
 * Compact bar below spin button area with toggle switch.
 * Self-contained IIFE, no ES modules, createElement only.
 */
(function () {
    'use strict';

    // ── Config ───────────────────────────────────────────────────
    var STORAGE_KEY = 'ms_spinInsurance';
    var PREMIUM_RATE = 0.10;   // 10% of bet
    var REFUND_RATE = 0.50;    // 50% of bet returned on loss

    // ── State ────────────────────────────────────────────────────
    var _active = false;
    var _barEl = null;
    var _stylesInjected = false;
    var _stats = { timesUsed: 0, totalPremiumPaid: 0, totalRefunded: 0 };

    // ── Persistence ──────────────────────────────────────────────
    function _loadState() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                var data = JSON.parse(raw);
                _active = !!data.active;
                if (data.stats) {
                    _stats.timesUsed = data.stats.timesUsed || 0;
                    _stats.totalPremiumPaid = data.stats.totalPremiumPaid || 0;
                    _stats.totalRefunded = data.stats.totalRefunded || 0;
                }
            }
        } catch (e) { /* ignore */ }
    }

    function _saveState() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                active: _active,
                stats: _stats
            }));
        } catch (e) { /* ignore */ }
    }

    // ── Styles ───────────────────────────────────────────────────
    function _injectStyles() {
        if (_stylesInjected) return;
        _stylesInjected = true;
        var s = document.createElement('style');
        s.id = 'spinInsuranceStyles';
        s.textContent = [
            '#spinInsuranceBar{display:flex;align-items:center;justify-content:center;gap:10px;',
            '  padding:6px 16px;margin:6px auto 0;max-width:420px;border-radius:8px;',
            '  background:rgba(20,20,40,.85);border:1px solid rgba(100,100,140,.3);',
            '  font-family:inherit;font-size:12px;color:#c8c8d8;',
            '  transition:border-color .3s,box-shadow .3s}',
            '#spinInsuranceBar.si-active{border-color:rgba(34,197,94,.5);',
            '  box-shadow:0 0 12px rgba(34,197,94,.2)}',
            '.si-shield{font-size:16px;flex-shrink:0}',
            '.si-label{font-weight:700;letter-spacing:.5px;white-space:nowrap}',
            '.si-cost{font-size:11px;color:#aaa;white-space:nowrap}',
            '.si-toggle{position:relative;width:36px;height:20px;flex-shrink:0}',
            '.si-toggle input{opacity:0;width:0;height:0;position:absolute}',
            '.si-slider{position:absolute;top:0;left:0;right:0;bottom:0;cursor:pointer;',
            '  background:#444;border-radius:10px;transition:background .3s}',
            '.si-slider::before{content:"";position:absolute;width:16px;height:16px;',
            '  left:2px;bottom:2px;background:#fff;border-radius:50%;transition:transform .3s}',
            '.si-toggle input:checked + .si-slider{background:#22c55e}',
            '.si-toggle input:checked + .si-slider::before{transform:translateX(16px)}',
            '.si-stats{font-size:10px;color:#888;margin-left:4px;white-space:nowrap}'
        ].join('\n');
        document.head.appendChild(s);
    }

    // ── Helpers ───────────────────────────────────────────────────
    function _getCurrentBet() {
        // Try to read bet from globals
        if (typeof window.currentBet === 'number' && window.currentBet > 0) return window.currentBet;
        if (typeof currentBet === 'number' && currentBet > 0) return currentBet;
        return 1; // fallback
    }

    function _formatMoney(v) {
        return '$' + (Math.round(v * 100) / 100).toFixed(2);
    }

    // ── DOM creation ─────────────────────────────────────────────
    function _buildBar() {
        if (_barEl) return;
        _injectStyles();

        var bar = document.createElement('div');
        bar.id = 'spinInsuranceBar';

        // Shield icon
        var shield = document.createElement('span');
        shield.className = 'si-shield';
        shield.textContent = '\uD83D\uDEE1\uFE0F';

        // Label
        var label = document.createElement('span');
        label.className = 'si-label';
        label.textContent = 'Spin Insurance';

        // Cost display
        var cost = document.createElement('span');
        cost.className = 'si-cost';
        cost.id = 'siCostDisplay';
        var bet = _getCurrentBet();
        cost.textContent = '(' + _formatMoney(bet * PREMIUM_RATE) + '/spin)';

        // Toggle switch
        var toggle = document.createElement('label');
        toggle.className = 'si-toggle';

        var checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = _active;
        checkbox.addEventListener('change', function () {
            _active = checkbox.checked;
            _updateBarState();
            _saveState();
        });

        var slider = document.createElement('span');
        slider.className = 'si-slider';

        toggle.appendChild(checkbox);
        toggle.appendChild(slider);

        // Stats display
        var statsEl = document.createElement('span');
        statsEl.className = 'si-stats';
        statsEl.id = 'siStatsDisplay';
        statsEl.textContent = _stats.timesUsed > 0
            ? ('Used ' + _stats.timesUsed + '\u00D7')
            : '';

        bar.appendChild(shield);
        bar.appendChild(label);
        bar.appendChild(cost);
        bar.appendChild(toggle);
        bar.appendChild(statsEl);

        // Insert after spin button area or append to slot container
        var spinArea = document.querySelector('.spin-controls') ||
                       document.querySelector('.slot-controls') ||
                       document.querySelector('#slotView');
        if (spinArea) {
            spinArea.parentNode.insertBefore(bar, spinArea.nextSibling);
        } else {
            document.body.appendChild(bar);
        }

        _barEl = bar;
        _updateBarState();
    }

    function _updateBarState() {
        if (!_barEl) return;
        if (_active) {
            _barEl.classList.add('si-active');
        } else {
            _barEl.classList.remove('si-active');
        }
        _updateCostDisplay();
    }

    function _updateCostDisplay() {
        var costEl = document.getElementById('siCostDisplay');
        if (costEl) {
            var bet = _getCurrentBet();
            costEl.textContent = '(' + _formatMoney(bet * PREMIUM_RATE) + '/spin)';
        }
        var statsEl = document.getElementById('siStatsDisplay');
        if (statsEl) {
            statsEl.textContent = _stats.timesUsed > 0
                ? ('Used ' + _stats.timesUsed + '\u00D7')
                : '';
        }
    }

    // ── Public API ───────────────────────────────────────────────
    window._spinInsuranceIsActive = function () {
        return _active;
    };

    window._spinInsuranceDeduct = function (betAmount) {
        if (!_active || !betAmount || betAmount <= 0) return 0;
        var premium = Math.round(betAmount * PREMIUM_RATE * 100) / 100;
        if (typeof balance !== 'undefined') {
            balance = Math.round((balance - premium) * 100) / 100;
            if (typeof updateBalanceDisplay === 'function') updateBalanceDisplay();
        }
        _stats.timesUsed++;
        _stats.totalPremiumPaid = Math.round((_stats.totalPremiumPaid + premium) * 100) / 100;
        _saveState();
        _updateCostDisplay();
        return premium;
    };

    window._spinInsuranceRefund = function (betAmount) {
        if (!_active || !betAmount || betAmount <= 0) return 0;
        var refund = Math.round(betAmount * REFUND_RATE * 100) / 100;
        if (typeof balance !== 'undefined') {
            balance = Math.round((balance + refund) * 100) / 100;
            if (typeof updateBalanceDisplay === 'function') updateBalanceDisplay();
        }
        _stats.totalRefunded = Math.round((_stats.totalRefunded + refund) * 100) / 100;
        _saveState();
        // Visual feedback
        if (_barEl) {
            _barEl.style.boxShadow = '0 0 20px rgba(34,197,94,.6)';
            setTimeout(function () {
                if (_barEl) _barEl.style.boxShadow = '';
                _updateBarState();
            }, 800);
        }
        if (typeof showWinToast === 'function') {
            showWinToast('\uD83D\uDEE1\uFE0F Insurance refund: ' + _formatMoney(refund), 'great');
        }
        return refund;
    };

    // ── Init ─────────────────────────────────────────────────────
    function _init() {
        try {
            if (new URLSearchParams(location.search).get('noBonus') === '1') return;
        } catch (e) { /* ignore */ }

        _loadState();
        _buildBar();

        // Periodically update cost display when bet changes
        setInterval(_updateCostDisplay, 2000);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { setTimeout(_init, 800); });
    } else {
        setTimeout(_init, 800);
    }
})();
