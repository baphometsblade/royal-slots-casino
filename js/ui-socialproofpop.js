/* ui-socialproofpop.js — Social Proof Pop
 * Sprint 61: Bottom-left toast showing fake social proof events on a timer.
 * Dynamically creates its own DOM elements (no static HTML required).
 */
(function () {
    'use strict';

    var ELEMENT_ID = 'socialProofPop';
    var STORAGE_KEY = 'ms_socialProofPop';
    var Z_INDEX = 8850;
    var SHOW_DURATION = 4000;
    var MIN_INTERVAL = 20000;
    var MAX_INTERVAL = 40000;
    var COOLDOWN_MS = 24 * 60 * 60 * 1000;

    var GAME_NAMES = ['Diamond Rush', 'Golden Sphinx', 'Neon Wilds', 'Cash Vortex', 'Lucky 7s'];

    var _intervalId = null;
    var _toastEl = null;
    var _styleEl = null;

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
        } catch (e) { /* storage full */ }
    }

    function _isHidden() {
        var data = _load();
        if (!data || !data.hiddenAt) return false;
        return (Date.now() - data.hiddenAt) < COOLDOWN_MS;
    }

    function _randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function _randomPlayer() {
        return 'Player_' + String(_randomInt(1000, 9999));
    }

    function _randomGame() {
        return GAME_NAMES[_randomInt(0, GAME_NAMES.length - 1)];
    }

    function _generateEvent() {
        var type = _randomInt(0, 3);
        switch (type) {
            case 0:
                return {
                    icon: '\uD83C\uDFC6',
                    text: _randomPlayer() + ' just won $' + _randomInt(5, 200) + ' on ' + _randomGame() + '!'
                };
            case 1:
                return {
                    icon: '\uD83D\uDC65',
                    text: _randomInt(150, 500) + ' players online right now'
                };
            case 2:
                return {
                    icon: '\uD83D\uDCB0',
                    text: _randomPlayer() + ' just deposited $' + _randomInt(20, 100)
                };
            case 3:
                return {
                    icon: '\uD83C\uDF1F',
                    text: _randomPlayer() + ' hit the JACKPOT! $' + _randomInt(500, 2000)
                };
            default:
                return {
                    icon: '\uD83C\uDFC6',
                    text: _randomPlayer() + ' just won $' + _randomInt(5, 200) + '!'
                };
        }
    }

    function _ensureToast() {
        if (_toastEl && document.getElementById(ELEMENT_ID)) return _toastEl;

        // Add animation keyframes
        if (!_styleEl) {
            _styleEl = document.createElement('style');
            _styleEl.textContent = '@keyframes socialProofSlideIn{0%{transform:translateX(-110%);opacity:0}100%{transform:translateX(0);opacity:1}}' +
                '@keyframes socialProofSlideOut{0%{transform:translateX(0);opacity:1}100%{transform:translateX(-110%);opacity:0}}';
            document.head.appendChild(_styleEl);
        }

        var toast = document.createElement('div');
        toast.id = ELEMENT_ID;
        toast.style.cssText = 'position:fixed;bottom:60px;left:16px;width:250px;' +
            'background:rgba(10,15,30,0.92);border-left:3px solid #4ecdc4;' +
            'border-radius:8px;padding:12px 14px;z-index:' + Z_INDEX + ';' +
            'font-family:Arial,sans-serif;box-shadow:0 4px 20px rgba(0,0,0,0.4);' +
            'transform:translateX(-110%);opacity:0;pointer-events:auto;';

        var topRow = document.createElement('div');
        topRow.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;';

        var badge = document.createElement('span');
        badge.style.cssText = 'font-size:9px;color:#4ecdc4;text-transform:uppercase;letter-spacing:1px;font-weight:bold;';
        badge.textContent = 'LIVE';
        topRow.appendChild(badge);

        var closeBtn = document.createElement('span');
        closeBtn.style.cssText = 'color:#64748b;font-size:14px;cursor:pointer;line-height:1;';
        closeBtn.textContent = '\u2715';
        closeBtn.addEventListener('click', function () {
            window.dismissSocialProofPop();
        });
        topRow.appendChild(closeBtn);
        toast.appendChild(topRow);

        var contentRow = document.createElement('div');
        contentRow.style.cssText = 'display:flex;align-items:center;gap:8px;';

        var iconEl = document.createElement('span');
        iconEl.id = ELEMENT_ID + '_icon';
        iconEl.style.cssText = 'font-size:20px;flex-shrink:0;';
        contentRow.appendChild(iconEl);

        var textEl = document.createElement('span');
        textEl.id = ELEMENT_ID + '_text';
        textEl.style.cssText = 'font-size:12px;color:#cbd5e1;line-height:1.4;';
        contentRow.appendChild(textEl);

        toast.appendChild(contentRow);
        document.body.appendChild(toast);
        _toastEl = toast;
        return toast;
    }

    function _showToast() {
        var toast = _ensureToast();
        var evt = _generateEvent();

        var iconEl = document.getElementById(ELEMENT_ID + '_icon');
        var textEl = document.getElementById(ELEMENT_ID + '_text');
        if (iconEl) iconEl.textContent = evt.icon;
        if (textEl) textEl.textContent = evt.text;

        toast.style.animation = 'none';
        // Force reflow
        void toast.offsetWidth;
        toast.style.animation = 'socialProofSlideIn 0.4s ease-out forwards';

        setTimeout(function () {
            if (toast && toast.parentNode) {
                toast.style.animation = 'socialProofSlideOut 0.4s ease-in forwards';
            }
        }, SHOW_DURATION);
    }

    function _scheduleNext() {
        var delay = _randomInt(MIN_INTERVAL, MAX_INTERVAL);
        _intervalId = setTimeout(function () {
            _showToast();
            _scheduleNext();
        }, delay);
    }

    function _init() {
        if (new URLSearchParams(window.location.search).get('noBonus') === '1') return;
        if (_isHidden()) return;

        // First toast after a short delay
        setTimeout(function () {
            _showToast();
            _scheduleNext();
        }, 8000);
    }

    window.dismissSocialProofPop = function () {
        _save({ hiddenAt: Date.now() });
        if (_intervalId) {
            clearTimeout(_intervalId);
            _intervalId = null;
        }
        var el = document.getElementById(ELEMENT_ID);
        if (el) {
            el.style.animation = 'socialProofSlideOut 0.3s ease-in forwards';
            setTimeout(function () {
                if (el.parentNode) el.parentNode.removeChild(el);
            }, 300);
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _init);
    } else {
        _init();
    }
})();
