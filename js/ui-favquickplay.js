/* ==========================================================
   ui-favquickplay.js — Slot Favorites Quick-Play Bar
   Sprint 46 — Horizontal bar showing favorited games for quick access
   ========================================================== */
(function () {
    'use strict';

    var STORAGE_KEY = 'ms_favQuickPlay';
    var BAR_ID = 'favQuickPlayBar';
    var FAV_SOURCE_KEY = 'casinoFavorites';

    /* ---- Helpers ---- */

    function _isQA() {
        try {
            return new URLSearchParams(window.location.search).get('noBonus') === '1';
        } catch (e) {
            return false;
        }
    }

    function _loadState() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                var parsed = JSON.parse(raw);
                return {
                    visible: typeof parsed.visible === 'boolean' ? parsed.visible : true,
                    lastShown: typeof parsed.lastShown === 'number' ? parsed.lastShown : 0
                };
            }
        } catch (e) { /* ignore */ }
        return { visible: true, lastShown: 0 };
    }

    function _saveState(state) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } catch (e) { /* ignore */ }
    }

    function _getFavorites() {
        try {
            var raw = localStorage.getItem(FAV_SOURCE_KEY);
            if (raw) {
                var parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) return parsed;
            }
        } catch (e) { /* ignore */ }
        return [];
    }

    function _findGame(gameId) {
        if (typeof GAMES === 'undefined' || !Array.isArray(GAMES)) return null;
        for (var i = 0; i < GAMES.length; i++) {
            if (GAMES[i].id === gameId) return GAMES[i];
        }
        return null;
    }

    function _el(tag, className, textContent) {
        var el = document.createElement(tag);
        if (className) el.className = className;
        if (textContent !== undefined) el.textContent = textContent;
        return el;
    }

    /* ---- Build Bar ---- */

    function _buildBar() {
        var existing = document.getElementById(BAR_ID);
        if (existing) existing.remove();

        var favorites = _getFavorites();
        var state = _loadState();

        var bar = _el('div', 'fav-quickplay-bar');
        bar.id = BAR_ID;

        if (!state.visible) {
            bar.style.display = 'none';
        }

        /* Header */
        var header = _el('div', 's46-fqp-header');

        var title = _el('span', 's46-fqp-title');
        /* star emoji \u2B50 */
        title.textContent = '\u2B50 Quick Play';
        header.appendChild(title);

        var closeBtn = _el('button', 's46-fqp-close', '\u2715');
        closeBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            _dismiss();
        });
        header.appendChild(closeBtn);

        bar.appendChild(header);

        /* Scroll container */
        var scroll = _el('div', 's46-fqp-scroll');

        if (favorites.length === 0) {
            var empty = _el('div', 's46-fqp-empty');
            /* heart emoji \u2764 */
            empty.textContent = 'No favorites yet \u2014 tap \u2764 on any game to add it here!';
            scroll.appendChild(empty);
        } else {
            for (var i = 0; i < favorites.length; i++) {
                var gameId = favorites[i];
                var game = _findGame(gameId);
                if (!game) continue;

                var item = _el('div', 's46-fqp-item');
                item.setAttribute('data-game-id', game.id);

                /* Thumbnail */
                var thumb = document.createElement('img');
                thumb.className = 's46-fqp-thumb';
                thumb.alt = game.name || game.id;
                thumb.loading = 'lazy';
                if (game.thumbnail) {
                    thumb.src = game.thumbnail;
                } else {
                    thumb.src = 'assets/games/' + game.id + '/thumbnail.png';
                }
                thumb.onerror = function () {
                    this.style.display = 'none';
                };
                item.appendChild(thumb);

                /* Game name */
                var name = _el('span', 's46-fqp-name', game.name || game.id);
                item.appendChild(name);

                /* Click handler */
                (function (gId) {
                    item.addEventListener('click', function () {
                        if (typeof openSlot === 'function') {
                            openSlot(gId);
                        }
                    });
                })(game.id);

                scroll.appendChild(item);
            }
        }

        bar.appendChild(scroll);

        document.body.appendChild(bar);

        state.lastShown = Date.now();
        _saveState(state);

        return bar;
    }

    /* ---- Refresh ---- */

    function _refresh() {
        var existing = document.getElementById(BAR_ID);
        var wasVisible = existing && existing.style.display !== 'none';
        _buildBar();
        if (!wasVisible) {
            var bar = document.getElementById(BAR_ID);
            if (bar) bar.style.display = 'none';
        }
    }

    /* ---- Toggle ---- */

    function _toggle() {
        var bar = document.getElementById(BAR_ID);
        if (!bar) {
            _buildBar();
            bar = document.getElementById(BAR_ID);
        }
        if (!bar) return;

        var state = _loadState();
        if (bar.style.display === 'none') {
            bar.style.display = '';
            state.visible = true;
            _refresh();
        } else {
            bar.style.display = 'none';
            state.visible = false;
        }
        _saveState(state);
    }

    /* ---- Dismiss ---- */

    function _dismiss() {
        var bar = document.getElementById(BAR_ID);
        if (!bar) return;

        bar.classList.add('s46-fqp-hiding');
        var state = _loadState();
        state.visible = false;
        _saveState(state);

        setTimeout(function () {
            if (bar.parentNode) bar.remove();
        }, 300);
    }

    /* ---- Public API ---- */

    window.toggleFavQuickPlay = _toggle;
    window.dismissFavQuickPlay = _dismiss;

    /* ---- Init ---- */

    function _init() {
        if (_isQA()) return;

        var favorites = _getFavorites();
        if (favorites.length > 0) {
            _buildBar();
        }

        /* Listen for favorites changes */
        window.addEventListener('storage', function (e) {
            if (e.key === FAV_SOURCE_KEY) {
                var bar = document.getElementById(BAR_ID);
                if (bar && bar.style.display !== 'none') {
                    _refresh();
                }
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _init);
    } else {
        _init();
    }

})();
