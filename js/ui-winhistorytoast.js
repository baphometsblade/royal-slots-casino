/* ui-winhistorytoast.js — Win History Toast
 * Sprint 55: Slide-in bottom-left toast after wins >= $5, tracks last 5 wins.
 * Dynamically creates its own DOM elements (no static HTML required).
 */
(function () {
    'use strict';

    var STORAGE_KEY = 'ms_winHistory';
    var MIN_WIN = 5;
    var MAX_HISTORY = 5;
    var AUTO_DISMISS_MS = 5000;
    var Z_INDEX = 8900;
    var _dismissTimer = null;
    var _el = null;

    function _load() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            return [];
        }
    }

    function _save(data) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (e) {}
    }

    function _bestToday(history) {
        var todayStr = new Date().toDateString();
        var best = 0;
        for (var i = 0; i < history.length; i++) {
            var entry = history[i];
            if (new Date(entry.ts).toDateString() === todayStr && entry.amount > best) {
                best = entry.amount;
            }
        }
        return best;
    }

    function _build() {
        var el = document.createElement('div');
        el.id = 'winHistoryToast';
        el.style.cssText = [
            'position:fixed',
            'bottom:24px',
            'left:24px',
            'width:300px',
            'background:linear-gradient(135deg,#1a2e00,#2d5000)',
            'border:1px solid #00ff88',
            'border-radius:12px',
            'padding:16px 18px',
            'z-index:' + Z_INDEX,
            'box-shadow:0 8px 32px rgba(0,255,136,0.25)',
            'transform:translateX(-340px)',
            'transition:transform 0.4s cubic-bezier(0.34,1.56,0.64,1)',
            'cursor:pointer',
            'user-select:none',
            'font-family:inherit',
        ].join(';');

        var header = document.createElement('div');
        header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;';

        var title = document.createElement('span');
        title.id = 'winHistoryToast_title';
        title.style.cssText = 'color:#00ff88;font-size:15px;font-weight:700;';

        var closeBtn = document.createElement('button');
        closeBtn.textContent = '\u00d7';
        closeBtn.style.cssText = [
            'background:none',
            'border:none',
            'color:#00ff88',
            'font-size:20px',
            'cursor:pointer',
            'line-height:1',
            'padding:0 2px',
            'opacity:0.7',
        ].join(';');
        closeBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            window.dismissWinHistoryToast();
        });

        header.appendChild(title);
        header.appendChild(closeBtn);

        var gameLine = document.createElement('div');
        gameLine.id = 'winHistoryToast_game';
        gameLine.style.cssText = 'color:#a8d8a8;font-size:12px;margin-bottom:8px;';

        var bestLine = document.createElement('div');
        bestLine.id = 'winHistoryToast_best';
        bestLine.style.cssText = 'color:#ccffcc;font-size:12px;border-top:1px solid rgba(0,255,136,0.2);padding-top:8px;';

        el.appendChild(header);
        el.appendChild(gameLine);
        el.appendChild(bestLine);

        el.addEventListener('click', function () {
            window.dismissWinHistoryToast();
        });

        document.body.appendChild(el);
        _el = el;
    }

    function _show(amount, gameName) {
        if (!_el) _build();

        var history = _load();
        history.unshift({ amount: amount, game: gameName || 'Unknown', ts: Date.now() });
        if (history.length > MAX_HISTORY) history = history.slice(0, MAX_HISTORY);
        _save(history);

        var best = _bestToday(history);

        var titleEl = document.getElementById('winHistoryToast_title');
        var gameEl = document.getElementById('winHistoryToast_game');
        var bestEl = document.getElementById('winHistoryToast_best');

        if (titleEl) titleEl.textContent = '\ud83c\udfc6 Recent Win! +$' + amount.toFixed(2);
        if (gameEl) gameEl.textContent = gameName ? gameName : '';
        if (bestEl) bestEl.textContent = 'Your best today: $' + best.toFixed(2);

        requestAnimationFrame(function () {
            _el.style.transform = 'translateX(0)';
        });

        if (_dismissTimer) clearTimeout(_dismissTimer);
        _dismissTimer = setTimeout(function () {
            window.dismissWinHistoryToast();
        }, AUTO_DISMISS_MS);
    }

    function _hide() {
        if (_el) {
            _el.style.transform = 'translateX(-340px)';
        }
        if (_dismissTimer) {
            clearTimeout(_dismissTimer);
            _dismissTimer = null;
        }
    }

    function _onSpinComplete(e) {
        if (new URLSearchParams(window.location.search).get('noBonus') === '1') return;
        var detail = (e && e.detail) ? e.detail : {};
        var winAmount = detail.winAmount || 0;
        var gameName = detail.gameName || (window.currentGame && window.currentGame.name) || '';
        if (winAmount >= MIN_WIN) {
            _show(winAmount, gameName);
        }
    }

    function _init() {
        if (new URLSearchParams(window.location.search).get('noBonus') === '1') return;
        _build();
        document.addEventListener('spinComplete', _onSpinComplete);
    }

    window.dismissWinHistoryToast = function () {
        _hide();
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _init);
    } else {
        _init();
    }
})();
