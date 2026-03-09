/* ui-depositcountdown.js — Deposit Countdown Offer
 * Sprint 58: Full-screen overlay with a live 10-minute countdown for a 200% deposit bonus.
 * Dynamically creates its own DOM elements (no static HTML required).
 */
(function () {
    'use strict';

    var STORAGE_KEY = 'ms_depositCountdown';
    var ELEMENT_ID = 'depositCountdownOffer';
    var COOLDOWN_MS = 6 * 60 * 60 * 1000;
    var COUNTDOWN_SEC = 600;
    var TICK_MS = 1000;
    var SHOW_DELAY_MS = 3000;

    var _overlay = null;
    var _tickInterval = null;
    var _remaining = COUNTDOWN_SEC;

    function _load() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : {};
        } catch (e) {
            return {};
        }
    }

    function _save(data) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (e) {}
    }

    function _isOnCooldown() {
        var stored = _load();
        if (!stored.lastShown) return false;
        return (Date.now() - stored.lastShown) < COOLDOWN_MS;
    }

    function _formatMmSs(sec) {
        var s = Math.max(0, Math.floor(sec));
        var m = Math.floor(s / 60);
        var r = s % 60;
        return (m < 10 ? '0' : '') + m + ':' + (r < 10 ? '0' : '') + r;
    }

    function _stopTick() {
        if (_tickInterval) {
            clearInterval(_tickInterval);
            _tickInterval = null;
        }
    }

    function _removeOverlay() {
        _stopTick();
        if (_overlay && _overlay.parentNode) {
            _overlay.parentNode.removeChild(_overlay);
        }
        _overlay = null;
    }

    function _build() {
        if (new URLSearchParams(window.location.search).get('noBonus') === '1') return;
        if (_isOnCooldown()) return;
        if (document.getElementById(ELEMENT_ID)) return;

        _save({ lastShown: Date.now() });
        _remaining = COUNTDOWN_SEC;

        var overlay = document.createElement('div');
        overlay.id = ELEMENT_ID;
        overlay.style.cssText = [
            'position:fixed',
            'top:0',
            'left:0',
            'width:100%',
            'height:100%',
            'background:rgba(5,10,25,0.95)',
            'display:flex',
            'align-items:center',
            'justify-content:center',
            'z-index:10400',
            'font-family:sans-serif',
            'animation:depositCdFadeIn 0.4s ease'
        ].join(';');

        var style = document.createElement('style');
        style.textContent = [
            '@keyframes depositCdFadeIn{from{opacity:0}to{opacity:1}}',
            '@keyframes depositCdPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.03)}}'
        ].join('');
        document.head.appendChild(style);

        var card = document.createElement('div');
        card.style.cssText = [
            'background:linear-gradient(180deg,#0f1a00 0%,#081000 100%)',
            'border:2px solid transparent',
            'border-image:linear-gradient(135deg,#f39c12,#27ae60) 1',
            'border-radius:20px',
            'padding:44px 40px',
            'max-width:420px',
            'width:92%',
            'text-align:center',
            'box-shadow:0 8px 60px rgba(243,156,18,0.3)',
            'animation:depositCdPulse 2.4s ease-in-out infinite'
        ].join(';');

        var clock = document.createElement('div');
        clock.style.cssText = 'font-size:40px;margin-bottom:8px;';
        clock.textContent = '\u23F0';

        var badge = document.createElement('div');
        badge.style.cssText = [
            'display:inline-block',
            'background:linear-gradient(135deg,#f39c12,#27ae60)',
            'border-radius:6px',
            'padding:4px 14px',
            'font-size:12px',
            'font-weight:800',
            'color:#000',
            'letter-spacing:1px',
            'margin-bottom:14px'
        ].join(';');
        badge.textContent = 'LIMITED TIME OFFER';

        var heading = document.createElement('div');
        heading.style.cssText = 'font-size:26px;font-weight:800;color:#fff;margin-bottom:8px;';
        heading.textContent = '200% Deposit Bonus!';

        var subtext = document.createElement('div');
        subtext.style.cssText = 'font-size:13px;color:#aaa;margin-bottom:20px;';
        subtext.textContent = 'Minimum deposit: $10 \u2014 Offer expires in:';

        var timerDisplay = document.createElement('div');
        timerDisplay.id = ELEMENT_ID + '_timer';
        timerDisplay.style.cssText = [
            'font-size:44px',
            'font-weight:800',
            'letter-spacing:4px',
            'color:#f39c12',
            'margin-bottom:28px',
            'font-variant-numeric:tabular-nums'
        ].join(';');
        timerDisplay.textContent = _formatMmSs(_remaining);

        var btnClaim = document.createElement('button');
        btnClaim.style.cssText = [
            'width:100%',
            'padding:16px',
            'background:linear-gradient(135deg,#f39c12,#27ae60)',
            'border:none',
            'border-radius:12px',
            'color:#000',
            'font-size:16px',
            'font-weight:800',
            'cursor:pointer',
            'margin-bottom:14px',
            'letter-spacing:0.5px'
        ].join(';');
        btnClaim.textContent = 'Claim Now';

        var btnDismiss = document.createElement('button');
        btnDismiss.style.cssText = [
            'width:100%',
            'padding:10px',
            'background:transparent',
            'border:1px solid rgba(255,255,255,0.15)',
            'border-radius:10px',
            'color:#777',
            'font-size:12px',
            'cursor:pointer'
        ].join(';');
        btnDismiss.textContent = 'No thanks';

        btnClaim.addEventListener('click', function () {
            if (typeof window.openWalletModal === 'function') {
                window.openWalletModal();
            }
            window.dismissDepositCountdownOffer();
        });

        btnDismiss.addEventListener('click', function () {
            window.dismissDepositCountdownOffer();
        });

        card.appendChild(clock);
        card.appendChild(badge);
        card.appendChild(heading);
        card.appendChild(subtext);
        card.appendChild(timerDisplay);
        card.appendChild(btnClaim);
        card.appendChild(btnDismiss);
        overlay.appendChild(card);
        document.body.appendChild(overlay);
        _overlay = overlay;

        _tickInterval = setInterval(function () {
            _remaining -= 1;
            var display = document.getElementById(ELEMENT_ID + '_timer');
            if (display) {
                if (_remaining <= 0) {
                    display.textContent = 'OFFER EXPIRED';
                    display.style.fontSize = '22px';
                    display.style.color = '#e74c3c';
                    _stopTick();
                    setTimeout(function () {
                        window.dismissDepositCountdownOffer();
                    }, 3000);
                } else {
                    display.textContent = _formatMmSs(_remaining);
                }
            }
        }, TICK_MS);
    }

    function _init() {
        if (_isOnCooldown()) return;
        setTimeout(_build, SHOW_DELAY_MS);
    }

    window.dismissDepositCountdownOffer = function () {
        _removeOverlay();
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _init);
    } else {
        _init();
    }

})();
