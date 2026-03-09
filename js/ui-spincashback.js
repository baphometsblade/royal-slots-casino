/* ui-spincashback.js — Spin Cashback Widget
 * Sprint 53: Tracks 1% cashback on losing spins, allows claiming when >= $1.00
 * Dynamically creates its own DOM elements (no static HTML required).
 */
(function () {
    'use strict';

    // constants
    var STORAGE_KEY = 'ms_spinCashback';
    var COOLDOWN_KEY = 'ms_spinCashback_cooldown';
    var CASHBACK_RATE = 0.01;
    var MIN_CLAIM = 1.00;
    var COOLDOWN_MS = 24 * 60 * 60 * 1000;
    var SHOW_DELAY_MS = 3000;
    var WIDGET_ID = 'spinCashbackWidget';

    var _widget = null;
    var _amountEl = null;
    var _claimBtn = null;
    var _dismissed = false;
    var _sessionShown = false;

    // persistence helpers
    function _load() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            return raw ? parseFloat(raw) : 0;
        } catch (e) {
            return 0;
        }
    }

    function _save(val) {
        try {
            localStorage.setItem(STORAGE_KEY, String(val));
        } catch (e) {}
    }

    function _loadCooldown() {
        try {
            var raw = localStorage.getItem(COOLDOWN_KEY);
            return raw ? parseInt(raw, 10) : 0;
        } catch (e) {
            return 0;
        }
    }

    function _saveCooldown(ts) {
        try {
            localStorage.setItem(COOLDOWN_KEY, String(ts));
        } catch (e) {}
    }

    function _isCooldownActive() {
        var last = _loadCooldown();
        return last > 0 && (Date.now() - last) < COOLDOWN_MS;
    }

    // DOM build
    function _build() {
        if (document.getElementById(WIDGET_ID)) return;

        var el = document.createElement('div');
        el.id = WIDGET_ID;
        el.style.cssText = [
            'position: fixed',
            'bottom: 24px',
            'right: 24px',
            'width: 220px',
            'background: linear-gradient(135deg, #0f3460, #16213e)',
            'border: 1px solid #00d4ff',
            'border-radius: 12px',
            'padding: 14px 16px',
            'z-index: 8800',
            'box-shadow: 0 4px 24px rgba(0,212,255,0.18)',
            'font-family: "Segoe UI", Arial, sans-serif',
            'color: #e0f7ff',
            'display: none'
        ].join(';');

        var header = document.createElement('div');
        header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;';

        var title = document.createElement('span');
        title.style.cssText = 'font-size:12px;font-weight:700;color:#00d4ff;letter-spacing:1px;text-transform:uppercase;';
        title.textContent = 'Spin Cashback';

        var closeBtn = document.createElement('button');
        closeBtn.textContent = '\u00d7';
        closeBtn.style.cssText = [
            'background: none',
            'border: none',
            'color: #7fb3c8',
            'font-size: 18px',
            'cursor: pointer',
            'line-height: 1',
            'padding: 0',
            'margin-left: 8px'
        ].join(';');
        closeBtn.addEventListener('click', function () {
            _dismissed = true;
            el.style.display = 'none';
        });

        header.appendChild(title);
        header.appendChild(closeBtn);

        var amountRow = document.createElement('div');
        amountRow.style.cssText = 'font-size:15px;font-weight:600;margin-bottom:10px;color:#ffffff;';

        _amountEl = document.createElement('span');
        _amountEl.textContent = 'Cashback Earned: $0.00';
        amountRow.appendChild(_amountEl);

        _claimBtn = document.createElement('button');
        _claimBtn.textContent = 'Claim';
        _claimBtn.style.cssText = [
            'display: none',
            'width: 100%',
            'padding: 8px 0',
            'background: linear-gradient(90deg, #00d4ff, #0077cc)',
            'border: none',
            'border-radius: 8px',
            'color: #001a2e',
            'font-weight: 700',
            'font-size: 13px',
            'cursor: pointer',
            'margin-top: 4px',
            'letter-spacing: 0.5px'
        ].join(';');
        _claimBtn.addEventListener('click', _claim);

        el.appendChild(header);
        el.appendChild(amountRow);
        el.appendChild(_claimBtn);

        document.body.appendChild(el);
        _widget = el;
    }

    function _updateDisplay() {
        if (!_amountEl) return;
        var val = _load();
        _amountEl.textContent = 'Cashback Earned: $' + val.toFixed(2);
        if (_claimBtn) {
            var canClaim = val >= MIN_CLAIM && !_isCooldownActive();
            _claimBtn.style.display = canClaim ? 'block' : 'none';
        }
    }

    function _claim() {
        if (_isCooldownActive()) return;
        var val = _load();
        if (val < MIN_CLAIM) return;

        if (typeof window.balance !== 'undefined') {
            window.balance = (window.balance || 0) + val;
        }
        if (typeof window.updateBalanceDisplay === 'function') {
            window.updateBalanceDisplay();
        }

        _save(0);
        _saveCooldown(Date.now());
        _updateDisplay();

        if (_claimBtn) {
            _claimBtn.textContent = 'Claimed! \u2714';
            _claimBtn.style.background = 'linear-gradient(90deg, #00ff88, #00aa55)';
            setTimeout(function () {
                if (_claimBtn) {
                    _claimBtn.textContent = 'Claim';
                    _claimBtn.style.background = 'linear-gradient(90deg, #00d4ff, #0077cc)';
                }
            }, 2000);
        }
    }

    function _show() {
        if (_dismissed || !_widget) return;
        var val = _load();
        if (val <= 0) return;
        _updateDisplay();
        _widget.style.display = 'block';
        _sessionShown = true;
    }

    function _hide() {
        if (_widget) _widget.style.display = 'none';
    }

    // event listeners
    function _onSpinComplete(e) {
        if (new URLSearchParams(window.location.search).get('noBonus') === '1') return;
        var detail = (e && e.detail) || {};
        if (detail.won === false) {
            var bet = parseFloat(detail.betAmount) || 0;
            if (bet > 0) {
                var current = _load();
                _save(Math.round((current + bet * CASHBACK_RATE) * 100) / 100);
                _updateDisplay();
                if (!_sessionShown && !_dismissed && _widget) {
                    _show();
                }
            }
        }
    }

    // public API
    window.dismissSpinCashback = function () {
        _dismissed = true;
        _hide();
    };

    // init
    function _init() {
        if (new URLSearchParams(window.location.search).get('noBonus') === '1') return;
        _build();
        _updateDisplay();

        var val = _load();
        if (val > 0) {
            setTimeout(_show, SHOW_DELAY_MS);
        }

        document.addEventListener('spinComplete', _onSpinComplete);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _init);
    } else {
        _init();
    }
})();
