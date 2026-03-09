/* ui-bonusdroptimer.js — Bonus Drop Timer
 * Sprint 57: Persistent bottom-center countdown bar that awards $2.50 on expiry.
 * Dynamically creates its own DOM elements (no static HTML required).
 */
(function () {
    'use strict';

    var STORAGE_KEY = 'ms_bonusDropTimer';
    var ELEMENT_ID = 'bonusDropTimer';
    var BONUS_AMOUNT = 2.50;
    var TICK_MS = 1000;

    var _bar = null;
    var _label = null;
    var _tickInterval = null;

    function _randomDurationMs() {
        var minMs = 5 * 60 * 1000;
        var maxMs = 20 * 60 * 1000;
        return Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
    }

    function _load() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            return null;
        }
    }

    function _save(data) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (e) {}
    }

    function _getOrCreateTimer() {
        var stored = _load();
        var now = Date.now();
        if (stored && stored.expiresAt && stored.expiresAt > now) {
            return stored;
        }
        var fresh = { expiresAt: now + _randomDurationMs() };
        _save(fresh);
        return fresh;
    }

    function _formatMmSs(ms) {
        var totalSec = Math.max(0, Math.floor(ms / 1000));
        var m = Math.floor(totalSec / 60);
        var s = totalSec % 60;
        return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
    }

    function _showBonusFlash() {
        if (!_label) return;
        var old = _label.textContent;
        _label.style.color = '#ffd700';
        _label.textContent = '\uD83C\uDF81 BONUS DROP! +$2.50 added!';

        if (typeof window.balance === 'number') {
            window.balance = parseFloat((window.balance + BONUS_AMOUNT).toFixed(2));
        }
        if (typeof window.updateBalanceDisplay === 'function') {
            window.updateBalanceDisplay();
        }

        setTimeout(function () {
            if (_label) {
                _label.style.color = '#ffd700';
                _label.textContent = old;
            }
        }, 3500);
    }

    function _tick() {
        if (!_bar || !_label) return;
        var stored = _load();
        var now = Date.now();
        if (!stored || !stored.expiresAt) {
            stored = _getOrCreateTimer();
        }
        var remaining = stored.expiresAt - now;
        if (remaining <= 0) {
            _showBonusFlash();
            var fresh = { expiresAt: Date.now() + _randomDurationMs() };
            _save(fresh);
            return;
        }
        _label.textContent = '\uD83C\uDF81 Next Bonus Drop: ' + _formatMmSs(remaining);
    }

    function _build() {
        if (document.getElementById(ELEMENT_ID)) return;

        var bar = document.createElement('div');
        bar.id = ELEMENT_ID;
        bar.style.cssText = [
            'position:fixed',
            'bottom:0',
            'left:50%',
            'transform:translateX(-50%)',
            'background:linear-gradient(90deg,#1a1200,#2d2100)',
            'border-top:1px solid #ffd700',
            'border-left:1px solid rgba(255,215,0,0.3)',
            'border-right:1px solid rgba(255,215,0,0.3)',
            'border-radius:8px 8px 0 0',
            'padding:6px 18px',
            'z-index:8600',
            'font-family:sans-serif',
            'display:flex',
            'align-items:center',
            'gap:8px',
            'min-width:240px',
            'justify-content:center'
        ].join(';');

        var label = document.createElement('span');
        label.style.cssText = 'font-size:13px;font-weight:600;color:#ffd700;white-space:nowrap;';
        label.textContent = '\uD83C\uDF81 Next Bonus Drop: --:--';

        bar.appendChild(label);
        document.body.appendChild(bar);

        _bar = bar;
        _label = label;
    }

    function _startTicking() {
        _getOrCreateTimer();
        _tick();
        if (_tickInterval) clearInterval(_tickInterval);
        _tickInterval = setInterval(_tick, TICK_MS);
    }

    function _init() {
        _build();
        _startTicking();
    }

    window.dismissBonusDropTimer = function () {
        if (_tickInterval) {
            clearInterval(_tickInterval);
            _tickInterval = null;
        }
        if (_bar && _bar.parentNode) {
            _bar.parentNode.removeChild(_bar);
        }
        _bar = null;
        _label = null;
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _init);
    } else {
        _init();
    }

})();
