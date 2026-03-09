/* ui-betboostreward.js — Bet Boost Reward
 * Sprint 53: Full-screen overlay when player doubles their bet, grants 2x multiplier for one spin
 * Dynamically creates its own DOM elements (no static HTML required).
 */
(function () {
    'use strict';

    // constants
    var OVERLAY_ID = 'betBoostReward';
    var AUTO_DISMISS_MS = 6000;
    var BOOST_MULTIPLIER = 2.0;

    var _overlay = null;
    var _dismissTimer = null;
    var _lastBet = null;

    // DOM build
    function _build() {
        if (document.getElementById(OVERLAY_ID)) return;

        var el = document.createElement('div');
        el.id = OVERLAY_ID;
        el.style.cssText = [
            'position: fixed',
            'inset: 0',
            'background: rgba(8,20,40,0.9)',
            'z-index:10400',
            'display: none',
            'align-items: center',
            'justify-content: center',
            'flex-direction: column',
            'font-family: "Segoe UI", Arial, sans-serif',
            'text-align: center',
            'padding: 32px'
        ].join(';');

        var card = document.createElement('div');
        card.style.cssText = [
            'background: linear-gradient(135deg, #061428, #0d2040)',
            'border: 2px solid #00d4ff',
            'border-radius: 20px',
            'padding: 40px 48px',
            'max-width: 480px',
            'width: 100%',
            'box-shadow: 0 0 60px rgba(0,212,255,0.3), 0 8px 40px rgba(0,0,0,0.8)',
            'position: relative'
        ].join(';');

        var rocket = document.createElement('div');
        rocket.style.cssText = 'font-size: 56px; margin-bottom: 16px; line-height: 1;';
        rocket.textContent = '\uD83D\uDE80';

        var heading = document.createElement('div');
        heading.style.cssText = [
            'font-size: 32px',
            'font-weight: 900',
            'color: #00d4ff',
            'letter-spacing: 3px',
            'text-transform: uppercase',
            'margin-bottom: 14px',
            'text-shadow: 0 0 20px rgba(0,212,255,0.8)'
        ].join(';');
        heading.textContent = 'BET BOOST!';

        var sub = document.createElement('div');
        sub.style.cssText = 'font-size: 17px; color: #b0e8ff; line-height: 1.6; margin-bottom: 24px;';
        sub.textContent = 'Bold move! Your bet just doubled \u2014 Spin for 2\u00d7 potential!';

        var badge = document.createElement('div');
        badge.style.cssText = [
            'display: inline-block',
            'background: linear-gradient(90deg, #00d4ff, #0088cc)',
            'color: #001a2e',
            'font-size: 20px',
            'font-weight: 800',
            'border-radius: 50px',
            'padding: 10px 32px',
            'margin-bottom: 24px',
            'letter-spacing: 1px'
        ].join(';');
        badge.textContent = '2\u00d7 MULTIPLIER ACTIVE';

        var note = document.createElement('div');
        note.style.cssText = 'font-size: 12px; color: #5a9ab5; margin-top: 4px;';
        note.textContent = 'Auto-dismissing in 6 seconds\u2026';

        var closeBtn = document.createElement('button');
        closeBtn.textContent = '\u00d7';
        closeBtn.style.cssText = [
            'position: absolute',
            'top: 14px',
            'right: 18px',
            'background: none',
            'border: none',
            'color: #5a9ab5',
            'font-size: 24px',
            'cursor: pointer',
            'line-height: 1'
        ].join(';');
        closeBtn.addEventListener('click', _dismiss);

        card.appendChild(closeBtn);
        card.appendChild(rocket);
        card.appendChild(heading);
        card.appendChild(sub);
        card.appendChild(badge);
        card.appendChild(note);
        el.appendChild(card);

        el.addEventListener('click', function (ev) {
            if (ev.target === el) _dismiss();
        });

        document.body.appendChild(el);
        _overlay = el;
    }

    function _show() {
        if (!_overlay) return;
        _overlay.style.display = 'flex';
        window._betBoostMultiplier = BOOST_MULTIPLIER;

        if (_dismissTimer) clearTimeout(_dismissTimer);
        _dismissTimer = setTimeout(_dismiss, AUTO_DISMISS_MS);
    }

    function _dismiss() {
        if (_dismissTimer) {
            clearTimeout(_dismissTimer);
            _dismissTimer = null;
        }
        if (_overlay) _overlay.style.display = 'none';
        window._betBoostMultiplier = 1.0;
    }

    // event listeners
    function _onSpinComplete(e) {
        if (new URLSearchParams(window.location.search).get('noBonus') === '1') return;
        var detail = (e && e.detail) || {};
        var bet = parseFloat(detail.betAmount) || (typeof window.currentBet !== 'undefined' ? parseFloat(window.currentBet) : 0);

        if (_lastBet !== null && bet > 0 && _lastBet > 0) {
            if (bet >= _lastBet * 2) {
                _show();
            }
        }
        if (bet > 0) {
            _lastBet = bet;
        }

        // reset multiplier after use (one-spin effect)
        window._betBoostMultiplier = 1.0;
    }

    // public API
    window.dismissBetBoostReward = function () {
        _dismiss();
    };

    // init
    function _init() {
        if (new URLSearchParams(window.location.search).get('noBonus') === '1') return;
        window._betBoostMultiplier = 1.0;
        _build();
        document.addEventListener('spinComplete', _onSpinComplete);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _init);
    } else {
        _init();
    }
})();
