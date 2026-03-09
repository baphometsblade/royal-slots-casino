/* ui-multiplayerticker.js — Multiplayer Activity Ticker
 * Sprint 58: Fixed right-side vertical ticker showing simulated recent player wins.
 * Dynamically creates its own DOM elements (no static HTML required).
 */
(function () {
    'use strict';

    var STORAGE_KEY = 'ms_multiplayerTicker';
    var ELEMENT_ID = 'multiplayerTicker';
    var SCROLL_INTERVAL_MS = 4000;
    var APPEAR_DELAY_MS = 8000;
    var MAX_MESSAGES = 5;
    var HIDE_DURATION_MS = 24 * 60 * 60 * 1000;

    var GAME_NAMES = [
        'Diamond Rush', 'Golden Sphinx', 'Neon Wilds',
        'Cash Vortex', 'Lucky 7s', 'Emerald King',
        'Fire Storm', 'Ocean Riches'
    ];

    var _ticker = null;
    var _listEl = null;
    var _scrollInterval = null;

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

    function _isDismissed() {
        var stored = _load();
        if (!stored.dismissedAt) return false;
        return (Date.now() - stored.dismissedAt) < HIDE_DURATION_MS;
    }

    function _randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function _randomPlayerName() {
        return 'Player_' + _randomInt(1000, 9999);
    }

    function _randomGame() {
        return GAME_NAMES[_randomInt(0, GAME_NAMES.length - 1)];
    }

    function _randomWin() {
        return (_randomInt(200, 50000) / 100).toFixed(2);
    }

    function _buildMessage() {
        var name = _randomPlayerName();
        var game = _randomGame();
        var amount = _randomWin();

        var item = document.createElement('div');
        item.style.cssText = [
            'padding:8px 10px',
            'border-bottom:1px solid rgba(26,58,107,0.5)',
            'font-size:11px',
            'color:#c8d8f0',
            'opacity:0',
            'transition:opacity 0.5s ease',
            'line-height:1.5'
        ].join(';');

        var icon = document.createElement('span');
        icon.style.cssText = 'margin-right:4px;';
        icon.textContent = '\uD83C\uDFB0';

        var namePart = document.createElement('span');
        namePart.style.cssText = 'color:#5dade2;font-weight:600;';
        namePart.textContent = name;

        var midPart = document.createElement('span');
        midPart.textContent = ' won ';

        var amtPart = document.createElement('span');
        amtPart.style.cssText = 'color:#2ecc71;font-weight:700;';
        amtPart.textContent = '$' + amount;

        var onPart = document.createElement('span');
        onPart.textContent = ' on ';

        var gamePart = document.createElement('span');
        gamePart.style.cssText = 'color:#f39c12;';
        gamePart.textContent = game;

        item.appendChild(icon);
        item.appendChild(namePart);
        item.appendChild(midPart);
        item.appendChild(amtPart);
        item.appendChild(onPart);
        item.appendChild(gamePart);

        return item;
    }

    function _seedInitialMessages() {
        if (!_listEl) return;
        for (var i = 0; i < MAX_MESSAGES; i++) {
            var msg = _buildMessage();
            _listEl.appendChild(msg);
            (function (el) {
                setTimeout(function () {
                    el.style.opacity = '1';
                }, i * 80 + 50);
            })(msg);
        }
    }

    function _pushMessage() {
        if (!_listEl) return;
        var children = _listEl.children;

        if (children.length >= MAX_MESSAGES) {
            var first = children[0];
            first.style.opacity = '0';
            setTimeout(function () {
                if (first.parentNode === _listEl) {
                    _listEl.removeChild(first);
                }
            }, 500);
        }

        var msg = _buildMessage();
        _listEl.appendChild(msg);
        requestAnimationFrame(function () {
            requestAnimationFrame(function () {
                msg.style.opacity = '1';
            });
        });
    }

    function _build() {
        if (new URLSearchParams(window.location.search).get('noBonus') === '1') return;
        if (_isDismissed()) return;
        if (document.getElementById(ELEMENT_ID)) return;

        var ticker = document.createElement('div');
        ticker.id = ELEMENT_ID;
        ticker.style.cssText = [
            'position:fixed',
            'right:0',
            'top:50%',
            'transform:translateY(-50%)',
            'width:220px',
            'background:rgba(10,15,30,0.88)',
            'border:1px solid #1a3a6b',
            'border-right:none',
            'border-radius:12px 0 0 12px',
            'z-index:8500',
            'font-family:sans-serif',
            'overflow:hidden',
            'box-shadow:-4px 0 24px rgba(0,0,0,0.5)'
        ].join(';');

        var header = document.createElement('div');
        header.style.cssText = [
            'display:flex',
            'align-items:center',
            'justify-content:space-between',
            'padding:8px 10px',
            'background:rgba(26,58,107,0.4)',
            'border-bottom:1px solid #1a3a6b'
        ].join(';');

        var headerText = document.createElement('span');
        headerText.style.cssText = 'font-size:11px;font-weight:700;color:#5dade2;letter-spacing:0.5px;';
        headerText.textContent = '\uD83C\uDF10 Live Wins';

        var closeBtn = document.createElement('button');
        closeBtn.style.cssText = [
            'background:transparent',
            'border:none',
            'color:#666',
            'font-size:14px',
            'cursor:pointer',
            'padding:0 2px',
            'line-height:1'
        ].join(';');
        closeBtn.textContent = '\u00D7';
        closeBtn.title = 'Dismiss';

        closeBtn.addEventListener('click', function () {
            window.dismissMultiplayerTicker();
        });

        header.appendChild(headerText);
        header.appendChild(closeBtn);

        var list = document.createElement('div');
        list.style.cssText = [
            'overflow:hidden',
            'min-height:' + (MAX_MESSAGES * 52) + 'px'
        ].join(';');

        ticker.appendChild(header);
        ticker.appendChild(list);
        document.body.appendChild(ticker);

        _ticker = ticker;
        _listEl = list;

        _seedInitialMessages();

        _scrollInterval = setInterval(_pushMessage, SCROLL_INTERVAL_MS);
    }

    function _init() {
        setTimeout(_build, APPEAR_DELAY_MS);
    }

    window.dismissMultiplayerTicker = function () {
        if (_scrollInterval) {
            clearInterval(_scrollInterval);
            _scrollInterval = null;
        }
        if (_ticker && _ticker.parentNode) {
            _ticker.parentNode.removeChild(_ticker);
        }
        _ticker = null;
        _listEl = null;
        _save({ dismissedAt: Date.now() });
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _init);
    } else {
        _init();
    }

})();
