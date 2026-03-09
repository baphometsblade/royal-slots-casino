// Sprint 69: Speed Boost Token — floating badge showing available speed boosts
// Players earn 1 token per 20 spins (max 5). Activating burns 1 token for 5 fast spins.
(function() {
    'use strict';

    var ELEMENT_ID = 'speedBoostToken';
    var Z_INDEX = 10400;
    var STORAGE_KEY = 'ms_speedBoost';
    var SPINS_PER_TOKEN = 20;
    var MAX_TOKENS = 5;
    var FAST_SPINS_PER_USE = 5;

    var _badge = null;
    var _countEl = null;
    var _statusEl = null;
    var _tokens = 0;
    var _spinCount = 0;
    var _fastSpinsLeft = 0;
    var _prevBalance = null;
    var _pollTimer = null;

    function _loadState() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                var data = JSON.parse(raw);
                _tokens = Math.min(data.tokens || 0, MAX_TOKENS);
                _spinCount = data.spinCount || 0;
                _fastSpinsLeft = data.fastSpinsLeft || 0;
            }
        } catch (e) { /* ignore */ }
    }

    function _saveState() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                tokens: _tokens,
                spinCount: _spinCount,
                fastSpinsLeft: _fastSpinsLeft
            }));
        } catch (e) { /* ignore */ }
    }

    function _buildBadge() {
        if (_badge) return;

        _badge = document.createElement('div');
        _badge.id = ELEMENT_ID;
        _badge.style.cssText = 'position:fixed;bottom:80px;left:14px;width:36px;height:36px;' +
            'border-radius:50%;background:linear-gradient(135deg,#1a1a2e,#16213e);' +
            'border:2px solid #555;display:flex;flex-direction:column;align-items:center;' +
            'justify-content:center;cursor:pointer;z-index:' + Z_INDEX + ';' +
            'box-shadow:0 2px 8px rgba(0,0,0,0.5);transition:all 0.3s ease;' +
            'font-size:14px;line-height:1;user-select:none;';

        var lightning = document.createElement('span');
        lightning.textContent = '\u26A1';
        lightning.style.cssText = 'font-size:14px;line-height:1;';
        _badge.appendChild(lightning);

        _countEl = document.createElement('span');
        _countEl.style.cssText = 'font-size:9px;color:#ffd700;font-weight:700;line-height:1;margin-top:-1px;';
        _countEl.textContent = '0';
        _badge.appendChild(_countEl);

        _statusEl = document.createElement('div');
        _statusEl.style.cssText = 'position:absolute;top:-8px;right:-12px;background:#2563eb;' +
            'color:#fff;font-size:8px;font-weight:900;padding:1px 4px;border-radius:4px;' +
            'white-space:nowrap;display:none;letter-spacing:0.5px;';
        _statusEl.textContent = 'FAST x5';
        _badge.appendChild(_statusEl);

        _badge.addEventListener('click', _activate);

        document.body.appendChild(_badge);
        _updateDisplay();
    }

    function _updateDisplay() {
        if (!_badge) return;

        _countEl.textContent = String(_tokens);

        if (_fastSpinsLeft > 0) {
            _badge.style.borderColor = '#3b82f6';
            _badge.style.boxShadow = '0 0 12px rgba(59,130,246,0.6),0 2px 8px rgba(0,0,0,0.5)';
            _statusEl.textContent = 'FAST x' + _fastSpinsLeft;
            _statusEl.style.display = 'block';
        } else {
            _badge.style.borderColor = _tokens > 0 ? '#ffd700' : '#555';
            _badge.style.boxShadow = _tokens > 0
                ? '0 0 8px rgba(255,215,0,0.3),0 2px 8px rgba(0,0,0,0.5)'
                : '0 2px 8px rgba(0,0,0,0.5)';
            _statusEl.style.display = 'none';
        }
    }

    function _activate() {
        if (_fastSpinsLeft > 0) {
            _showToast('Speed boost already active! ' + _fastSpinsLeft + ' fast spins left.');
            return;
        }
        if (_tokens <= 0) {
            _showToast('No speed tokens! Earn 1 every ' + SPINS_PER_TOKEN + ' spins.');
            return;
        }

        _tokens--;
        _fastSpinsLeft = FAST_SPINS_PER_USE;
        _saveState();
        _updateDisplay();
        _showToast('\u26A1 Speed Boost activated! Next ' + FAST_SPINS_PER_USE + ' spins are 2x faster!');

        // Pulse animation
        _badge.style.transform = 'scale(1.3)';
        setTimeout(function() {
            if (_badge) _badge.style.transform = 'scale(1)';
        }, 300);
    }

    function _showToast(msg) {
        if (typeof showToast === 'function') {
            showToast(msg, 'info', 3000);
            return;
        }
        var toast = document.createElement('div');
        toast.style.cssText = 'position:fixed;bottom:130px;left:14px;background:#1a1a2e;' +
            'color:#fff;padding:8px 14px;border-radius:8px;font-size:12px;z-index:' + (Z_INDEX + 10) + ';' +
            'border:1px solid rgba(59,130,246,0.4);max-width:220px;opacity:0;transition:opacity 0.3s;';
        toast.textContent = msg;
        document.body.appendChild(toast);
        requestAnimationFrame(function() { toast.style.opacity = '1'; });
        setTimeout(function() {
            toast.style.opacity = '0';
            setTimeout(function() { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 300);
        }, 3000);
    }

    function _detectSpin() {
        var currentBalance = typeof balance !== 'undefined' ? balance : null;
        if (currentBalance === null || _prevBalance === null) {
            _prevBalance = currentBalance;
            return;
        }

        if (currentBalance !== _prevBalance) {
            // Balance changed — likely a spin occurred
            if (_prevBalance > currentBalance || currentBalance > _prevBalance) {
                _spinCount++;

                // Consume a fast spin if active
                if (_fastSpinsLeft > 0) {
                    _fastSpinsLeft--;
                    _updateDisplay();
                }

                // Award token every N spins
                if (_spinCount >= SPINS_PER_TOKEN) {
                    _spinCount = 0;
                    if (_tokens < MAX_TOKENS) {
                        _tokens++;
                        _updateDisplay();
                        _showToast('\u26A1 Speed token earned! (' + _tokens + '/' + MAX_TOKENS + ')');
                    }
                }

                _saveState();
            }
            _prevBalance = currentBalance;
        }
    }

    function _init() {
        if (document.getElementById(ELEMENT_ID)) return;

        _loadState();
        _prevBalance = typeof balance !== 'undefined' ? balance : null;
        _buildBadge();

        _pollTimer = setInterval(_detectSpin, 2000);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(_init, 4500);
        });
    } else {
        setTimeout(_init, 4500);
    }
})();
