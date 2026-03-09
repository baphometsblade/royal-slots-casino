/* ui-progressivejackpot.js — Progressive Jackpot Meter
 * Sprint 53: Fixed top-right display; grows with each bet, hits every ~500 spins
 * Dynamically creates its own DOM elements (no static HTML required).
 */
(function () {
    'use strict';

    // constants
    var STORAGE_KEY = 'ms_progJackpot';
    var SPINS_KEY = 'ms_progJackpot_spins';
    var WIDGET_ID = 'progressiveJackpotMeter';
    var GROW_RATE = 0.001; // 0.1% of bet
    var PULSE_THRESHOLD = 20000;
    var HIT_SPINS_MIN = 400;
    var HIT_SPINS_MAX = 600;
    var RESET_MIN = 5000;
    var RESET_MAX = 8000;
    var START_MIN = 5000;
    var START_MAX = 15000;

    var _widget = null;
    var _amountEl = null;
    var _dismissed = false;
    var _pulseInterval = null;

    // persistence helpers
    function _loadJackpot() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                var val = parseFloat(raw);
                if (!isNaN(val) && val > 0) return val;
            }
        } catch (e) {}
        return _randomBetween(START_MIN, START_MAX);
    }

    function _saveJackpot(val) {
        try {
            localStorage.setItem(STORAGE_KEY, String(Math.round(val * 100) / 100));
        } catch (e) {}
    }

    function _loadSpins() {
        try {
            var raw = localStorage.getItem(SPINS_KEY);
            if (raw) {
                var data = JSON.parse(raw);
                return {
                    count: parseInt(data.count, 10) || 0,
                    target: parseInt(data.target, 10) || _randomTarget()
                };
            }
        } catch (e) {}
        return { count: 0, target: _randomTarget() };
    }

    function _saveSpins(data) {
        try {
            localStorage.setItem(SPINS_KEY, JSON.stringify(data));
        } catch (e) {}
    }

    function _randomBetween(min, max) {
        return min + Math.random() * (max - min);
    }

    function _randomTarget() {
        return Math.floor(_randomBetween(HIT_SPINS_MIN, HIT_SPINS_MAX));
    }

    // DOM build
    function _build() {
        if (document.getElementById(WIDGET_ID)) return;

        var el = document.createElement('div');
        el.id = WIDGET_ID;
        el.style.cssText = [
            'position: fixed',
            'top: 20px',
            'right: 20px',
            'background: linear-gradient(135deg, #1a1200, #3d2b00)',
            'border: 2px solid #ffd700',
            'border-radius: 10px',
            'padding: 10px 16px',
            'z-index: 9700',
            'box-shadow: 0 4px 20px rgba(255,215,0,0.25)',
            'font-family: "Segoe UI", Arial, sans-serif',
            'cursor: pointer',
            'user-select: none'
        ].join(';');

        var row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:center;gap:8px;';

        var label = document.createElement('span');
        label.style.cssText = 'font-size:11px;font-weight:700;color:#ffd700;letter-spacing:1px;white-space:nowrap;';
        label.textContent = '\uD83C\uDFB0 JACKPOT';

        _amountEl = document.createElement('span');
        _amountEl.style.cssText = 'font-size:15px;font-weight:800;color:#fff9e6;white-space:nowrap;';

        var closeBtn = document.createElement('button');
        closeBtn.textContent = '\u00d7';
        closeBtn.style.cssText = [
            'background: none',
            'border: none',
            'color: #a08050',
            'font-size: 14px',
            'cursor: pointer',
            'padding: 0',
            'margin-left: 4px',
            'line-height: 1'
        ].join(';');
        closeBtn.addEventListener('click', function (ev) {
            ev.stopPropagation();
            window.dismissProgressiveJackpot();
        });

        row.appendChild(label);
        row.appendChild(_amountEl);
        row.appendChild(closeBtn);
        el.appendChild(row);

        document.body.appendChild(el);
        _widget = el;
    }

    function _formatAmount(val) {
        return '$' + val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function _updateDisplay(val) {
        if (!_amountEl) return;
        _amountEl.textContent = _formatAmount(val);

        if (_widget) {
            if (val >= PULSE_THRESHOLD) {
                _widget.style.borderColor = '#ffec40';
                _widget.style.boxShadow = '0 0 24px rgba(255,215,0,0.6), 0 4px 20px rgba(255,215,0,0.4)';
            } else {
                _widget.style.borderColor = '#ffd700';
                _widget.style.boxShadow = '0 4px 20px rgba(255,215,0,0.25)';
            }
        }
    }

    function _triggerHit() {
        var current = _loadJackpot();
        // brief celebration flash
        if (_widget) {
            _widget.style.background = 'linear-gradient(135deg, #5a3a00, #ffd700)';
            _widget.style.transform = 'scale(1.12)';
            _widget.style.transition = 'all 0.3s ease';

            setTimeout(function () {
                if (_widget) {
                    _widget.style.background = 'linear-gradient(135deg, #1a1200, #3d2b00)';
                    _widget.style.transform = 'scale(1)';
                }
            }, 1200);
        }

        var resetVal = Math.round(_randomBetween(RESET_MIN, RESET_MAX) * 100) / 100;
        _saveJackpot(resetVal);
        _updateDisplay(resetVal);
    }

    // event listeners
    function _onSpinComplete(e) {
        if (new URLSearchParams(window.location.search).get('noBonus') === '1') return;
        var detail = (e && e.detail) || {};
        var bet = parseFloat(detail.betAmount) || 0;

        var jackpot = _loadJackpot();
        var spins = _loadSpins();

        if (bet > 0) {
            jackpot = Math.round((jackpot + bet * GROW_RATE) * 100) / 100;
            _saveJackpot(jackpot);
        }

        spins.count += 1;
        _updateDisplay(jackpot);

        if (spins.count >= spins.target) {
            _triggerHit();
            spins.count = 0;
            spins.target = _randomTarget();
        }

        _saveSpins(spins);
    }

    // public API
    window.dismissProgressiveJackpot = function () {
        _dismissed = true;
        if (_widget) _widget.style.display = 'none';
        if (_pulseInterval) {
            clearInterval(_pulseInterval);
            _pulseInterval = null;
        }
    };

    // init
    function _init() {
        if (new URLSearchParams(window.location.search).get('noBonus') === '1') return;
        _build();

        var initial = _loadJackpot();
        _saveJackpot(initial);
        _updateDisplay(initial);

        document.addEventListener('spinComplete', _onSpinComplete);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _init);
    } else {
        _init();
    }
})();
