/* ui-happyhourbanner.js — Happy Hour Banner (v2)
 * Sprint 60: Fixed top banner announcing happy hour periods (minutes 0-10 of each hour).
 * Dynamically creates its own DOM elements (no static HTML required).
 */
(function () {
    'use strict';

    var ELEMENT_ID = 'happyHourBannerV2';
    var Z_INDEX = 9650;
    var HAPPY_MINUTES_START = 0;
    var HAPPY_MINUTES_END = 10;
    var MULTIPLIER = 1.5;
    var UPDATE_INTERVAL_MS = 1000;

    var _banner = null;
    var _textEl = null;
    var _intervalId = null;
    var _dismissed = false;
    var _isActive = false;

    function _build() {
        _banner = document.createElement('div');
        _banner.id = ELEMENT_ID;
        _banner.style.cssText = [
            'position:fixed;top:0;left:0;width:100%;height:46px;z-index:' + Z_INDEX + ';',
            'background:linear-gradient(90deg,#b8860b,#daa520,#b8860b);',
            'color:#fff;display:flex;align-items:center;justify-content:center;',
            'font-family:inherit;font-size:15px;font-weight:bold;',
            'text-shadow:0 1px 3px rgba(0,0,0,0.4);',
            'transform:translateY(-100%);transition:transform 0.5s ease;',
            'box-shadow:0 2px 12px rgba(0,0,0,0.3);'
        ].join('');

        _textEl = document.createElement('span');
        _textEl.style.cssText = 'letter-spacing:0.5px;';
        _textEl.textContent = '';

        _banner.appendChild(_textEl);
        document.body.appendChild(_banner);
    }

    function _formatTime(totalSeconds) {
        var m = Math.floor(totalSeconds / 60);
        var s = totalSeconds % 60;
        return m + ':' + (s < 10 ? '0' : '') + s;
    }

    function _checkHappyHour() {
        if (_dismissed) return;

        var now = new Date();
        var minutes = now.getMinutes();
        var seconds = now.getSeconds();

        var inHappyHour = (minutes >= HAPPY_MINUTES_START && minutes < HAPPY_MINUTES_END);

        if (inHappyHour && !_isActive) {
            _isActive = true;
            window._happyHourMultiplier = MULTIPLIER;
            _banner.style.transform = 'translateY(0)';
        } else if (!inHappyHour && _isActive) {
            _isActive = false;
            window._happyHourMultiplier = 1.0;
            _banner.style.transform = 'translateY(-100%)';
        }

        if (inHappyHour) {
            var remainingSeconds = (HAPPY_MINUTES_END - minutes - 1) * 60 + (60 - seconds);
            _textEl.textContent = '\uD83C\uDF89 HAPPY HOUR! All wins boosted 1.5\u00D7 for ' + _formatTime(remainingSeconds) + ' remaining!';
        }
    }

    function _init() {
        if (new URLSearchParams(window.location.search).get('noBonus') === '1') return;

        // Initialize multiplier
        if (typeof window._happyHourMultiplier === 'undefined') {
            window._happyHourMultiplier = 1.0;
        }

        _build();
        _checkHappyHour();
        _intervalId = setInterval(_checkHappyHour, UPDATE_INTERVAL_MS);
    }

    window.dismissHappyHourBannerV2 = function () {
        _dismissed = true;
        if (_intervalId) {
            clearInterval(_intervalId);
            _intervalId = null;
        }
        _isActive = false;
        window._happyHourMultiplier = 1.0;
        if (_banner) {
            _banner.style.transform = 'translateY(-100%)';
            setTimeout(function () {
                if (_banner) _banner.style.display = 'none';
            }, 500);
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _init);
    } else {
        _init();
    }
})();
