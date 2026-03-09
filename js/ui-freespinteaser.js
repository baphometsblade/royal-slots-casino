/* ui-freespinteaser.js — Free Spin Teaser
 * Sprint 54: Bottom-center toast after 3+ consecutive losses, promotes deposit for free spins
 * Dynamically creates its own DOM elements (no static HTML required).
 */
(function () {
    'use strict';

    // constants
    var TOAST_ID = 'freeSpinTeaser';
    var COOLDOWN_KEY = 'ms_freeSpinTeaser';
    var LOSS_STREAK_TRIGGER = 3;
    var COOLDOWN_MS = 30 * 60 * 1000; // 30 minutes
    var AUTO_HIDE_MS = 10000;

    var _toast = null;
    var _hideTimer = null;
    var _lossStreak = 0;
    var _dismissed = false;

    // persistence helpers
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
        if (document.getElementById(TOAST_ID)) return;

        var el = document.createElement('div');
        el.id = TOAST_ID;
        el.style.cssText = [
            'position: fixed',
            'bottom: 90px',
            'left: 50%',
            'transform: translateX(-50%) translateY(120px)',
            'background: linear-gradient(90deg, #1a3a1a, #0d5016)',
            'border: 1px solid #00ff88',
            'border-radius: 14px',
            'padding: 16px 20px',
            'z-index:10400',
            'box-shadow: 0 4px 32px rgba(0,255,136,0.2)',
            'font-family: "Segoe UI", Arial, sans-serif',
            'display: flex',
            'align-items: center',
            'gap: 14px',
            'max-width: 480px',
            'width: calc(100vw - 48px)',
            'transition: transform 0.4s cubic-bezier(0.16,1,0.3,1)',
            'pointer-events: auto'
        ].join(';');

        var emoji = document.createElement('span');
        emoji.style.cssText = 'font-size: 28px; flex-shrink: 0;';
        emoji.textContent = '\uD83D\uDE14';

        var textBlock = document.createElement('div');
        textBlock.style.cssText = 'flex: 1; min-width: 0;';

        var mainText = document.createElement('div');
        mainText.style.cssText = 'font-size: 14px; font-weight: 700; color: #b0ffcc; margin-bottom: 4px;';
        mainText.textContent = 'Rough Run? Deposit $10 to get 10 Free Spins!';

        var subText = document.createElement('div');
        subText.style.cssText = 'font-size: 11px; color: #60b880;';
        subText.textContent = 'Credited instantly to your account';

        textBlock.appendChild(mainText);
        textBlock.appendChild(subText);

        var ctaBtn = document.createElement('button');
        ctaBtn.textContent = 'Deposit Now';
        ctaBtn.style.cssText = [
            'padding: 9px 16px',
            'background: linear-gradient(90deg, #00ff88, #00cc66)',
            'border: none',
            'border-radius: 8px',
            'color: #003a1a',
            'font-weight: 800',
            'font-size: 12px',
            'cursor: pointer',
            'white-space: nowrap',
            'flex-shrink: 0'
        ].join(';');
        ctaBtn.addEventListener('click', function () {
            if (typeof window.openWalletModal === 'function') {
                window.openWalletModal();
            }
            _hide();
        });

        var closeBtn = document.createElement('button');
        closeBtn.textContent = '\u00d7';
        closeBtn.style.cssText = [
            'background: none',
            'border: none',
            'color: #40885a',
            'font-size: 18px',
            'cursor: pointer',
            'padding: 0',
            'line-height: 1',
            'flex-shrink: 0'
        ].join(';');
        closeBtn.addEventListener('click', _hide);

        el.appendChild(emoji);
        el.appendChild(textBlock);
        el.appendChild(ctaBtn);
        el.appendChild(closeBtn);

        document.body.appendChild(el);
        _toast = el;
    }

    function _show() {
        if (!_toast || _dismissed) return;
        _toast.style.transform = 'translateX(-50%) translateY(0)';
        _saveCooldown(Date.now());

        if (_hideTimer) clearTimeout(_hideTimer);
        _hideTimer = setTimeout(_hide, AUTO_HIDE_MS);
    }

    function _hide() {
        if (_hideTimer) {
            clearTimeout(_hideTimer);
            _hideTimer = null;
        }
        if (_toast) _toast.style.transform = 'translateX(-50%) translateY(120px)';
    }

    // event listeners
    function _onSpinComplete(e) {
        if (new URLSearchParams(window.location.search).get('noBonus') === '1') return;
        var detail = (e && e.detail) || {};

        if (detail.won === false) {
            _lossStreak += 1;
        } else {
            _lossStreak = 0;
        }

        if (_lossStreak >= LOSS_STREAK_TRIGGER && !_isCooldownActive() && !_dismissed) {
            setTimeout(_show, 600);
        }
    }

    // public API
    window.dismissFreeSpinTeaser = function () {
        _dismissed = true;
        _hide();
    };

    // init
    function _init() {
        if (new URLSearchParams(window.location.search).get('noBonus') === '1') return;
        _build();
        document.addEventListener('spinComplete', _onSpinComplete);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _init);
    } else {
        _init();
    }
})();
