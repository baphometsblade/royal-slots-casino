/* ui-highrollerbadge.js — High Roller Badge
 * Sprint 59: Compact floating badge appears when player bets >= $5, cosmetic encouragement.
 * Dynamically creates its own DOM elements (no static HTML required).
 */
(function () {
    'use strict';

    var ELEMENT_ID = 'highRollerBadge';
    var HIGH_ROLLER_THRESHOLD = 5;
    var Z_INDEX = 9150;

    var _badge = null;
    var _styleTag = null;
    var _dismissed = false;
    var _visible = false;

    function _injectStyles() {
        _styleTag = document.createElement('style');
        _styleTag.textContent = [
            '@keyframes highRollerSlideIn {',
            '  0% { transform: translateX(-100%) scale(0.7); opacity: 0; }',
            '  60% { transform: translateX(5%) scale(1.05); opacity: 1; }',
            '  100% { transform: translateX(0) scale(1); opacity: 1; }',
            '}',
            '@keyframes highRollerSlideOut {',
            '  0% { transform: translateX(0) scale(1); opacity: 1; }',
            '  100% { transform: translateX(-100%) scale(0.7); opacity: 0; }',
            '}',
            '@keyframes highRollerGlow {',
            '  0%, 100% { box-shadow: 0 2px 12px rgba(255,215,0,0.3); }',
            '  50% { box-shadow: 0 2px 24px rgba(255,215,0,0.6); }',
            '}'
        ].join('\n');
        document.head.appendChild(_styleTag);
    }

    function _build() {
        _badge = document.createElement('div');
        _badge.id = ELEMENT_ID;
        _badge.style.cssText = [
            'position:fixed;top:80px;left:16px;z-index:' + Z_INDEX + ';',
            'width:180px;padding:10px 16px;',
            'background:linear-gradient(135deg,#b8860b,#ffd700,#daa520);',
            'border-radius:12px;color:#1a1a2e;',
            'font-weight:bold;font-size:15px;font-family:inherit;',
            'text-align:center;pointer-events:none;',
            'display:none;',
            'animation:highRollerGlow 2s ease-in-out infinite;'
        ].join('');

        var crown = document.createElement('span');
        crown.style.cssText = 'font-size:20px;margin-right:6px;vertical-align:middle;';
        crown.textContent = '\uD83D\uDC51';

        var text = document.createElement('span');
        text.style.cssText = 'vertical-align:middle;letter-spacing:1px;';
        text.textContent = 'HIGH ROLLER';

        _badge.appendChild(crown);
        _badge.appendChild(text);
        document.body.appendChild(_badge);
    }

    function _show() {
        if (_dismissed || _visible || !_badge) return;
        _visible = true;
        _badge.style.display = 'block';
        _badge.style.animation = 'highRollerSlideIn 0.5s ease-out forwards, highRollerGlow 2s ease-in-out infinite 0.5s';
    }

    function _hide() {
        if (!_visible || !_badge) return;
        _badge.style.animation = 'highRollerSlideOut 0.3s ease-in forwards';
        setTimeout(function () {
            if (_badge) {
                _badge.style.display = 'none';
                _badge.style.animation = '';
            }
            _visible = false;
        }, 300);
    }

    function _onSpinComplete(e) {
        if (_dismissed) return;

        var betAmount = 0;
        if (e && e.detail && typeof e.detail.betAmount === 'number') {
            betAmount = e.detail.betAmount;
        } else if (typeof window.currentBet === 'number') {
            betAmount = window.currentBet;
        }

        if (betAmount >= HIGH_ROLLER_THRESHOLD) {
            _show();
        } else {
            _hide();
        }
    }

    function _init() {
        if (new URLSearchParams(window.location.search).get('noBonus') === '1') return;
        _injectStyles();
        _build();
        document.addEventListener('spinComplete', _onSpinComplete);
    }

    window.dismissHighRollerBadge = function () {
        _dismissed = true;
        _hide();
        if (_badge) {
            _badge.style.display = 'none';
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _init);
    } else {
        _init();
    }
})();
