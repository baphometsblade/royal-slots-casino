// Sprint 70: Promo Code Entry — floating PROMO button with slide-down input panel
// Small pill button that expands to a code input. Hardcoded valid codes with one-time use.
(function() {
    'use strict';

    var ELEMENT_ID = 'promoCodeInput';
    var Z_INDEX = 10400;
    var STORAGE_KEY = 'ms_usedPromoCodes';

    var VALID_CODES = {
        'WELCOME50': { amount: 50, label: '$50 Welcome Bonus!' },
        'SPIN100':   { amount: 10, label: '$10 Spin Bonus!' },
        'VIP2026':   { amount: 25, label: '$25 VIP Bonus!' },
        'LUCKY7':    { amount: 7,  label: '$7 Lucky Bonus!' },
        'MATRIX':    { amount: 15, label: '$15 Matrix Bonus!' }
    };

    var _btn = null;
    var _panel = null;
    var _input = null;
    var _resultEl = null;
    var _isOpen = false;
    var _usedCodes = {};

    function _loadUsedCodes() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            if (raw) _usedCodes = JSON.parse(raw);
        } catch (e) { _usedCodes = {}; }
    }

    function _saveUsedCodes() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(_usedCodes));
        } catch (e) { /* ignore */ }
    }

    function _buildUI() {
        if (_btn) return;

        // Main pill button
        _btn = document.createElement('div');
        _btn.id = ELEMENT_ID;
        _btn.style.cssText = 'position:fixed;top:80px;right:14px;width:60px;height:28px;' +
            'background:linear-gradient(135deg,#1a1a2e,#16213e);border:1px solid rgba(255,215,0,0.3);' +
            'border-radius:14px;display:flex;align-items:center;justify-content:center;' +
            'cursor:pointer;z-index:' + Z_INDEX + ';transition:all 0.3s ease;' +
            'box-shadow:0 2px 8px rgba(0,0,0,0.4);user-select:none;';

        var btnText = document.createElement('span');
        btnText.style.cssText = 'font-size:10px;font-weight:800;color:#ffd700;letter-spacing:0.5px;' +
            'white-space:nowrap;';
        btnText.textContent = '\uD83C\uDF81 PROMO';
        _btn.appendChild(btnText);

        _btn.addEventListener('click', function(e) {
            e.stopPropagation();
            _togglePanel();
        });

        // Slide-down panel
        _panel = document.createElement('div');
        _panel.style.cssText = 'position:fixed;top:112px;right:14px;width:240px;' +
            'background:linear-gradient(160deg,#1a1a2e,#16213e);border:1px solid rgba(255,215,0,0.2);' +
            'border-radius:12px;padding:16px;z-index:' + Z_INDEX + ';' +
            'box-shadow:0 8px 24px rgba(0,0,0,0.5);transform:translateY(-10px);opacity:0;' +
            'pointer-events:none;transition:all 0.3s ease;';

        var title = document.createElement('div');
        title.style.cssText = 'font-size:13px;font-weight:900;color:#ffd700;margin-bottom:10px;' +
            'text-align:center;letter-spacing:0.5px;';
        title.textContent = '\uD83C\uDF9F\uFE0F Enter Promo Code';
        _panel.appendChild(title);

        var inputRow = document.createElement('div');
        inputRow.style.cssText = 'display:flex;gap:6px;margin-bottom:8px;';

        _input = document.createElement('input');
        _input.type = 'text';
        _input.placeholder = 'CODE';
        _input.maxLength = 20;
        _input.style.cssText = 'flex:1;padding:8px 10px;background:#0d0d1a;border:1px solid rgba(255,255,255,0.15);' +
            'border-radius:6px;color:#fff;font-size:13px;text-transform:uppercase;letter-spacing:1px;' +
            'outline:none;box-sizing:border-box;';
        _input.addEventListener('focus', function() {
            _input.style.borderColor = 'rgba(255,215,0,0.5)';
        });
        _input.addEventListener('blur', function() {
            _input.style.borderColor = 'rgba(255,255,255,0.15)';
        });
        _input.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') _applyCode();
        });
        inputRow.appendChild(_input);

        var applyBtn = document.createElement('button');
        applyBtn.style.cssText = 'padding:8px 12px;background:linear-gradient(135deg,#ffd700,#daa520);' +
            'color:#1a1a2e;border:none;border-radius:6px;font-size:12px;font-weight:900;' +
            'cursor:pointer;transition:opacity 0.15s;white-space:nowrap;';
        applyBtn.textContent = 'Apply';
        applyBtn.addEventListener('click', _applyCode);
        inputRow.appendChild(applyBtn);

        _panel.appendChild(inputRow);

        _resultEl = document.createElement('div');
        _resultEl.style.cssText = 'font-size:11px;text-align:center;padding:6px 8px;' +
            'border-radius:6px;display:none;transition:opacity 0.3s;';
        _panel.appendChild(_resultEl);

        document.body.appendChild(_btn);
        document.body.appendChild(_panel);

        // Close panel when clicking outside
        document.addEventListener('click', function(e) {
            if (_isOpen && _panel && _btn) {
                if (!_panel.contains(e.target) && !_btn.contains(e.target)) {
                    _closePanel();
                }
            }
        });
    }

    function _togglePanel() {
        if (_isOpen) {
            _closePanel();
        } else {
            _openPanel();
        }
    }

    function _openPanel() {
        if (!_panel) return;
        _isOpen = true;
        _panel.style.transform = 'translateY(0)';
        _panel.style.opacity = '1';
        _panel.style.pointerEvents = 'auto';
        _btn.style.borderColor = '#ffd700';
        _btn.style.boxShadow = '0 0 10px rgba(255,215,0,0.3),0 2px 8px rgba(0,0,0,0.4)';
        _resultEl.style.display = 'none';
        if (_input) {
            setTimeout(function() { _input.focus(); }, 100);
        }
    }

    function _closePanel() {
        if (!_panel) return;
        _isOpen = false;
        _panel.style.transform = 'translateY(-10px)';
        _panel.style.opacity = '0';
        _panel.style.pointerEvents = 'none';
        _btn.style.borderColor = 'rgba(255,215,0,0.3)';
        _btn.style.boxShadow = '0 2px 8px rgba(0,0,0,0.4)';
    }

    function _applyCode() {
        if (!_input) return;
        var code = _input.value.trim().toUpperCase();
        _input.value = '';

        if (!code) {
            _showResult('Please enter a code.', false);
            return;
        }

        // Check if code is valid
        if (!VALID_CODES[code]) {
            _showResult('Invalid promo code.', false);
            _flashPanel(false);
            return;
        }

        // Check if already used
        if (_usedCodes[code]) {
            _showResult('Code already redeemed!', false);
            _flashPanel(false);
            return;
        }

        // Redeem the code
        var promo = VALID_CODES[code];
        _usedCodes[code] = Date.now();
        _saveUsedCodes();

        // Credit balance
        if (typeof balance !== 'undefined') {
            balance += promo.amount;
            if (typeof updateBalanceDisplay === 'function') {
                updateBalanceDisplay();
            }
        }

        _showResult('\u2705 ' + promo.label, true);
        _flashPanel(true);

        // Close panel after success
        setTimeout(function() { _closePanel(); }, 2500);
    }

    function _showResult(msg, success) {
        if (!_resultEl) return;
        _resultEl.textContent = msg;
        _resultEl.style.display = 'block';
        _resultEl.style.color = success ? '#2ecc71' : '#ef4444';
        _resultEl.style.background = success
            ? 'rgba(46,204,113,0.1)'
            : 'rgba(239,68,68,0.1)';
        _resultEl.style.border = '1px solid ' + (success
            ? 'rgba(46,204,113,0.3)'
            : 'rgba(239,68,68,0.3)');
    }

    function _flashPanel(success) {
        if (!_panel) return;
        var color = success ? 'rgba(46,204,113,0.3)' : 'rgba(239,68,68,0.3)';
        _panel.style.borderColor = color;
        setTimeout(function() {
            if (_panel) _panel.style.borderColor = 'rgba(255,215,0,0.2)';
        }, 1500);
    }

    function _init() {
        if (document.getElementById(ELEMENT_ID)) return;
        _loadUsedCodes();
        _buildUI();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(_init, 3500);
        });
    } else {
        setTimeout(_init, 3500);
    }
})();
