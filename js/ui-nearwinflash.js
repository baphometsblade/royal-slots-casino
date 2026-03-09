/* ui-nearwinflash.js — Near Win Flash
 * Sprint 60: Brief dramatic flash overlay when player gets 2 of 3 matching symbols.
 * Dynamically creates its own DOM elements (no static HTML required).
 */
(function () {
    'use strict';

    var ELEMENT_ID = 'nearWinFlash';
    var Z_INDEX = 99250;
    var FLASH_DURATION = 1500;
    var COOLDOWN_SPINS = 3;

    var _overlay = null;
    var _titleEl = null;
    var _subtitleEl = null;
    var _styleTag = null;
    var _dismissed = false;
    var _spinsSinceLastFlash = 99; // start high so first near-win triggers
    var _animating = false;

    function _injectStyles() {
        _styleTag = document.createElement('style');
        _styleTag.textContent = [
            '@keyframes nearWinSlamIn {',
            '  0% { transform: scale(3) rotate(-5deg); opacity: 0; }',
            '  40% { transform: scale(0.9) rotate(1deg); opacity: 1; }',
            '  60% { transform: scale(1.05) rotate(0deg); opacity: 1; }',
            '  100% { transform: scale(1) rotate(0deg); opacity: 1; }',
            '}',
            '@keyframes nearWinFadeOut {',
            '  0% { opacity: 1; }',
            '  100% { opacity: 0; }',
            '}'
        ].join('\n');
        document.head.appendChild(_styleTag);
    }

    function _build() {
        _overlay = document.createElement('div');
        _overlay.id = ELEMENT_ID;
        _overlay.style.cssText = [
            'position:fixed;top:0;left:0;width:100%;height:100%;',
            'z-index:' + Z_INDEX + ';display:none;',
            'align-items:center;justify-content:center;flex-direction:column;',
            'background:rgba(0,0,0,0.75);',
            'font-family:inherit;pointer-events:none;'
        ].join('');

        _titleEl = document.createElement('div');
        _titleEl.style.cssText = [
            'font-size:48px;font-weight:bold;color:#ff4444;',
            'text-shadow:0 0 20px rgba(255,68,68,0.6),0 4px 8px rgba(0,0,0,0.5);',
            'margin-bottom:12px;'
        ].join('');

        _subtitleEl = document.createElement('div');
        _subtitleEl.style.cssText = [
            'font-size:20px;color:#ffcc00;',
            'text-shadow:0 2px 6px rgba(0,0,0,0.5);'
        ].join('');

        _overlay.appendChild(_titleEl);
        _overlay.appendChild(_subtitleEl);
        document.body.appendChild(_overlay);
    }

    function _detectNearWin(reels) {
        if (!reels || !Array.isArray(reels) || reels.length < 3) return null;

        // Check if exactly 2 of 3 match
        var s0 = reels[0], s1 = reels[1], s2 = reels[2];

        if (s0 === s1 && s1 !== s2) return s0;
        if (s0 === s2 && s0 !== s1) return s0;
        if (s1 === s2 && s0 !== s1) return s1;

        return null;
    }

    function _showFlash(symbol) {
        if (_dismissed || _animating) return;
        _animating = true;

        var displaySymbol = symbol || '?';
        _titleEl.textContent = 'SO CLOSE! \uD83D\uDE31';
        _subtitleEl.textContent = 'Two ' + displaySymbol + ' symbols \u2014 one more for the jackpot!';

        _overlay.style.display = 'flex';
        _overlay.style.opacity = '1';
        _titleEl.style.animation = 'nearWinSlamIn 0.4s ease-out forwards';

        setTimeout(function () {
            _overlay.style.animation = 'nearWinFadeOut 0.5s ease-in forwards';
            setTimeout(function () {
                if (_overlay) {
                    _overlay.style.display = 'none';
                    _overlay.style.animation = '';
                    _overlay.style.opacity = '1';
                    _titleEl.style.animation = '';
                }
                _animating = false;
            }, 500);
        }, FLASH_DURATION - 500);
    }

    function _onSpinComplete(e) {
        if (_dismissed) return;
        _spinsSinceLastFlash++;

        if (_spinsSinceLastFlash < COOLDOWN_SPINS) return;

        var reels = null;
        if (e && e.detail) {
            reels = e.detail.reels || e.detail.symbols || null;
        }

        var nearWinSymbol = _detectNearWin(reels);
        if (nearWinSymbol) {
            _spinsSinceLastFlash = 0;
            _showFlash(nearWinSymbol);
        }
    }

    function _init() {
        if (new URLSearchParams(window.location.search).get('noBonus') === '1') return;
        _injectStyles();
        _build();
        document.addEventListener('spinComplete', _onSpinComplete);
    }

    window.dismissNearWinFlash = function () {
        _dismissed = true;
        if (_overlay) {
            _overlay.style.display = 'none';
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _init);
    } else {
        _init();
    }
})();
