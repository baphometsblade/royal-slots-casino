/* ui-luckyspinnotice.js — Lucky Spin Notice
 * Sprint 55: Top-center banner every 30 spins with 1.25x multiplier for next spin.
 * Dynamically creates its own DOM elements (no static HTML required).
 */
(function () {
    'use strict';

    var SESSION_KEY = 'ms_luckySpinCount';
    var LUCKY_INTERVAL = 30;
    var MULTIPLIER = 1.25;
    var AUTO_HIDE_MS = 8000;
    var Z_INDEX = 9600;
    var _el = null;
    var _hideTimer = null;

    function _getCount() {
        try {
            var raw = sessionStorage.getItem(SESSION_KEY);
            return raw ? parseInt(raw, 10) : 0;
        } catch (e) {
            return 0;
        }
    }

    function _setCount(n) {
        try {
            sessionStorage.setItem(SESSION_KEY, String(n));
        } catch (e) {}
    }

    function _build() {
        var el = document.createElement('div');
        el.id = 'luckySpinNotice';
        el.style.cssText = [
            'position:fixed',
            'top:0',
            'left:50%',
            'transform:translateX(-50%) translateY(-100%)',
            'background:linear-gradient(90deg,#0d5016,#1a8a2d)',
            'border:1px solid #00ff88',
            'border-top:none',
            'border-radius:0 0 12px 12px',
            'padding:12px 28px',
            'z-index:' + Z_INDEX,
            'box-shadow:0 8px 24px rgba(0,255,136,0.3)',
            'transition:transform 0.4s cubic-bezier(0.34,1.56,0.64,1)',
            'display:flex',
            'align-items:center',
            'gap:14px',
            'font-family:inherit',
            'min-width:320px',
            'max-width:520px',
            'white-space:nowrap',
        ].join(';');

        var text = document.createElement('span');
        text.id = 'luckySpinNotice_text';
        text.style.cssText = 'color:#00ff88;font-size:15px;font-weight:700;flex:1;text-align:center;';

        var closeBtn = document.createElement('button');
        closeBtn.textContent = '\u00d7';
        closeBtn.style.cssText = [
            'background:none',
            'border:none',
            'color:#00ff88',
            'font-size:20px',
            'cursor:pointer',
            'line-height:1',
            'padding:0',
            'opacity:0.7',
            'flex-shrink:0',
        ].join(';');
        closeBtn.addEventListener('click', function () {
            window.dismissLuckySpinNotice();
        });

        el.appendChild(text);
        el.appendChild(closeBtn);
        document.body.appendChild(el);
        _el = el;
    }

    function _show(spinNumber) {
        if (!_el) _build();

        var textEl = document.getElementById('luckySpinNotice_text');
        if (textEl) {
            textEl.textContent = '\ud83c\udf40 Lucky Spin #' + spinNumber + '! Extra 1.25\u00d7 multiplier!';
        }

        window._luckySpinMultiplier = MULTIPLIER;

        requestAnimationFrame(function () {
            _el.style.transform = 'translateX(-50%) translateY(0)';
        });

        if (_hideTimer) clearTimeout(_hideTimer);
        _hideTimer = setTimeout(function () {
            window.dismissLuckySpinNotice();
        }, AUTO_HIDE_MS);
    }

    function _onSpinComplete() {
        if (new URLSearchParams(window.location.search).get('noBonus') === '1') return;

        // Reset multiplier after it has been consumed
        if (typeof window._luckySpinMultiplier === 'number' && window._luckySpinMultiplier !== 1.0) {
            window._luckySpinMultiplier = 1.0;
        }

        var count = _getCount() + 1;
        _setCount(count);

        if (count % LUCKY_INTERVAL === 0) {
            _show(count);
        }
    }

    function _init() {
        if (new URLSearchParams(window.location.search).get('noBonus') === '1') return;
        window._luckySpinMultiplier = 1.0;
        _build();
        document.addEventListener('spinComplete', _onSpinComplete);
    }

    window.dismissLuckySpinNotice = function () {
        if (_el) {
            _el.style.transform = 'translateX(-50%) translateY(-100%)';
        }
        if (_hideTimer) {
            clearTimeout(_hideTimer);
            _hideTimer = null;
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _init);
    } else {
        _init();
    }
})();
