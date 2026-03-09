/* ui-bonuswheelinvite.js — Bonus Wheel Invite
 * Sprint 54: Full-screen overlay once per 24h offering a free bonus wheel spin
 * Dynamically creates its own DOM elements (no static HTML required).
 */
(function () {
    'use strict';

    // constants
    var OVERLAY_ID = 'bonusWheelInvite';
    var STORAGE_KEY = 'ms_bonusWheelInvite';
    var FULL_COOLDOWN_MS = 24 * 60 * 60 * 1000;
    var SHORT_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour for "Later"
    var SHOW_DELAY_MS = 4000;
    var ANIMATION_ID = 'bonusWheelSpinKeyframe';

    var _overlay = null;
    var _dismissed = false;

    // persistence helpers
    function _loadTimestamp() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                var data = JSON.parse(raw);
                return {
                    ts: parseInt(data.ts, 10) || 0,
                    short: data.short === true
                };
            }
        } catch (e) {}
        return { ts: 0, short: false };
    }

    function _saveTimestamp(ts, short) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ ts: ts, short: short === true }));
        } catch (e) {}
    }

    function _shouldShow() {
        var data = _loadTimestamp();
        if (data.ts === 0) return true;
        var cooldown = data.short ? SHORT_COOLDOWN_MS : FULL_COOLDOWN_MS;
        return (Date.now() - data.ts) >= cooldown;
    }

    // inject CSS animation into <head>
    function _injectAnimation() {
        if (document.getElementById(ANIMATION_ID)) return;
        var style = document.createElement('style');
        style.id = ANIMATION_ID;
        style.textContent = [
            '@keyframes bwiWheelSpin {',
            '  from { transform: rotate(0deg); }',
            '  to   { transform: rotate(360deg); }',
            '}',
            '@keyframes bwiPulse {',
            '  0%, 100% { opacity: 1; transform: scale(1); }',
            '  50%       { opacity: 0.8; transform: scale(1.06); }',
            '}'
        ].join('\n');
        document.head.appendChild(style);
    }

    // DOM build
    function _build() {
        if (document.getElementById(OVERLAY_ID)) return;

        _injectAnimation();

        var el = document.createElement('div');
        el.id = OVERLAY_ID;
        el.style.cssText = [
            'position: fixed',
            'inset: 0',
            'background: rgba(5,5,30,0.95)',
            'z-index: 99400',
            'display: none',
            'align-items: center',
            'justify-content: center',
            'font-family: "Segoe UI", Arial, sans-serif'
        ].join(';');

        var card = document.createElement('div');
        card.style.cssText = [
            'background: linear-gradient(145deg, #0a0520, #180830)',
            'border: 2px solid transparent',
            'border-radius: 24px',
            'padding: 44px 52px',
            'max-width: 440px',
            'width: calc(100vw - 48px)',
            'text-align: center',
            'position: relative',
            'box-shadow: 0 0 0 2px #7b2ff7, 0 0 60px rgba(123,47,247,0.4), 0 8px 40px rgba(0,0,0,0.8)'
        ].join(';');

        var wheelEmoji = document.createElement('div');
        wheelEmoji.style.cssText = [
            'font-size: 72px',
            'line-height: 1',
            'margin-bottom: 20px',
            'display: inline-block',
            'animation: bwiWheelSpin 2.5s linear infinite'
        ].join(';');
        wheelEmoji.textContent = '\uD83C\uDFA1';

        var heading = document.createElement('div');
        heading.style.cssText = [
            'font-size: 28px',
            'font-weight: 900',
            'margin-bottom: 10px',
            'letter-spacing: 2px',
            'text-transform: uppercase',
            'background: linear-gradient(135deg, #7b2ff7, #f107a3)',
            '-webkit-background-clip: text',
            '-webkit-text-fill-color: transparent',
            'background-clip: text',
            'animation: bwiPulse 2s ease-in-out infinite'
        ].join(';');
        heading.textContent = 'SPIN THE BONUS WHEEL!';

        var sub1 = document.createElement('div');
        sub1.style.cssText = 'font-size: 18px; color: #d0b0f0; font-weight: 600; margin-bottom: 6px;';
        sub1.textContent = 'You have 1 FREE spin waiting';

        var sub2 = document.createElement('div');
        sub2.style.cssText = 'font-size: 14px; color: #8860b0; margin-bottom: 28px;';
        sub2.textContent = 'Click to claim your prize!';

        var spinBtn = document.createElement('button');
        spinBtn.textContent = 'Spin Now';
        spinBtn.style.cssText = [
            'display: block',
            'width: 100%',
            'padding: 14px 0',
            'background: linear-gradient(135deg, #7b2ff7, #f107a3)',
            'border: none',
            'border-radius: 12px',
            'color: #fff',
            'font-weight: 800',
            'font-size: 18px',
            'cursor: pointer',
            'margin-bottom: 12px',
            'letter-spacing: 1px',
            'box-shadow: 0 4px 20px rgba(123,47,247,0.4)'
        ].join(';');
        spinBtn.addEventListener('click', function () {
            if (typeof window.openBonusWheel === 'function') {
                window.openBonusWheel();
            }
            _dismiss(false);
        });

        var laterBtn = document.createElement('button');
        laterBtn.textContent = 'Later';
        laterBtn.style.cssText = [
            'display: block',
            'width: 100%',
            'padding: 10px 0',
            'background: none',
            'border: 1px solid rgba(123,47,247,0.35)',
            'border-radius: 10px',
            'color: #7b5fa0',
            'font-size: 14px',
            'cursor: pointer'
        ].join(';');
        laterBtn.addEventListener('click', function () {
            _dismiss(true); // short cooldown
        });

        var closeBtn = document.createElement('button');
        closeBtn.textContent = '\u00d7';
        closeBtn.style.cssText = [
            'position: absolute',
            'top: 14px',
            'right: 18px',
            'background: none',
            'border: none',
            'color: #5a4080',
            'font-size: 24px',
            'cursor: pointer',
            'line-height: 1'
        ].join(';');
        closeBtn.addEventListener('click', function () {
            _dismiss(false);
        });

        card.appendChild(closeBtn);
        card.appendChild(wheelEmoji);
        card.appendChild(heading);
        card.appendChild(sub1);
        card.appendChild(sub2);
        card.appendChild(spinBtn);
        card.appendChild(laterBtn);
        el.appendChild(card);

        el.addEventListener('click', function (ev) {
            if (ev.target === el) _dismiss(false);
        });

        document.body.appendChild(el);
        _overlay = el;
    }

    function _show() {
        if (!_overlay || _dismissed) return;
        if (!_shouldShow()) return;
        _overlay.style.display = 'flex';
    }

    function _dismiss(shortCooldown) {
        _dismissed = true;
        _saveTimestamp(Date.now(), shortCooldown === true);
        if (_overlay) _overlay.style.display = 'none';
    }

    // public API
    window.dismissBonusWheelInvite = function () {
        _dismiss(false);
    };

    // init
    function _init() {
        if (new URLSearchParams(window.location.search).get('noBonus') === '1') return;
        if (!_shouldShow()) return;
        _build();
        setTimeout(_show, SHOW_DELAY_MS);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _init);
    } else {
        _init();
    }
})();
