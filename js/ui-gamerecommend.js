/* ui-gamerecommend.js — Game Recommendation Card
 * Sprint 52: Slide-in card suggesting the most-played game after 60 spins,
 * with a 30-minute cooldown between shows.
 * Dynamically creates its own DOM elements (no static HTML required).
 */
(function () {
    'use strict';

    var STORAGE_KEY    = 'ms_gameRecommend';
    var RECENT_KEY     = 'casinoRecentlyPlayed';
    var CARD_ID        = 'gameRecommendCard';
    var SPIN_THRESHOLD = 60;
    var COOLDOWN_MS    = 30 * 60 * 1000; // 30 minutes
    var POPULAR_IDS    = ['fire_joker', 'starburst', 'book_of_dead', 'sweet_bonanza', 'gates_of_olympus'];

    var _cardEl    = null;
    var _spinsSeen = 0;

    // ── Persistence helpers ──────────────────────────────────────────────────
    function _load() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : {};
        } catch (e) { return {}; }
    }

    function _save(data) {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (e) {}
    }

    // ── Pick a game to recommend ─────────────────────────────────────────────
    function _pickGame() {
        var currentId = (window.currentGame && window.currentGame.id) ? window.currentGame.id : null;

        // Read recently played
        var recent = [];
        try {
            var raw = localStorage.getItem(RECENT_KEY);
            if (raw) recent = JSON.parse(raw);
            if (!Array.isArray(recent)) recent = [];
        } catch (e) { recent = []; }

        // Count plays per game id
        var counts = {};
        for (var i = 0; i < recent.length; i++) {
            var id = (typeof recent[i] === 'string') ? recent[i] : recent[i].id;
            if (!id) continue;
            counts[id] = (counts[id] || 0) + 1;
        }

        // Sort by play count descending, exclude current game
        var sorted = Object.keys(counts).sort(function (a, b) {
            return counts[b] - counts[a];
        }).filter(function (id) { return id !== currentId; });

        if (sorted.length > 0) return sorted[0];

        // Fallback to popular list
        for (var j = 0; j < POPULAR_IDS.length; j++) {
            if (POPULAR_IDS[j] !== currentId) return POPULAR_IDS[j];
        }
        return null;
    }

    // ── Find game definition ─────────────────────────────────────────────────
    function _findGame(gameId) {
        if (typeof GAMES !== 'undefined' && Array.isArray(GAMES)) {
            for (var i = 0; i < GAMES.length; i++) {
                if (GAMES[i].id === gameId) return GAMES[i];
            }
        }
        return { id: gameId, name: gameId.replace(/_/g, ' ') };
    }

    // ── DOM build ────────────────────────────────────────────────────────────
    function _build(game) {
        if (!document.getElementById('grKeyframes')) {
            var style = document.createElement('style');
            style.id = 'grKeyframes';
            style.textContent = [
                '@keyframes grSlideIn{from{transform:translateX(120%);opacity:0}',
                'to{transform:translateX(0);opacity:1}}',
                '@keyframes grSlideOut{from{transform:translateX(0);opacity:1}',
                'to{transform:translateX(120%);opacity:0}}'
            ].join('');
            document.head.appendChild(style);
        }

        var card = document.createElement('div');
        card.id = CARD_ID;
        card.style.cssText = [
            'position:fixed', 'bottom:60px', 'right:16px',
            'z-index:10400',
            'width:260px',
            'background:linear-gradient(145deg,#1a1040,#2d1b69)',
            'border:1px solid rgba(123,47,247,0.45)',
            'border-radius:16px', 'padding:16px',
            'box-shadow:0 8px 32px rgba(0,0,0,0.5)',
            'animation:grSlideIn 0.5s cubic-bezier(0.34,1.56,0.64,1) both'
        ].join(';');

        // Header row
        var header = document.createElement('div');
        header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;';

        var headerLabel = document.createElement('div');
        headerLabel.style.cssText = 'display:flex;align-items:center;gap:6px;';

        var icon = document.createElement('span');
        icon.textContent = '\uD83C\uDFB2'; // 🎲
        icon.style.fontSize = '16px';

        var labelText = document.createElement('span');
        labelText.textContent = 'Play Again';
        labelText.style.cssText = 'font-size:12px;font-weight:600;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:0.8px;';

        headerLabel.appendChild(icon);
        headerLabel.appendChild(labelText);

        var closeBtn = document.createElement('button');
        closeBtn.textContent = '\u00D7';
        closeBtn.setAttribute('aria-label', 'Dismiss recommendation');
        closeBtn.style.cssText = [
            'background:transparent', 'border:none',
            'color:rgba(255,255,255,0.4)', 'font-size:18px',
            'cursor:pointer', 'padding:0', 'line-height:1'
        ].join(';');
        closeBtn.addEventListener('click', function () {
            window.dismissGameRecommend();
        });

        header.appendChild(headerLabel);
        header.appendChild(closeBtn);

        // Game name
        var gameName = document.createElement('div');
        gameName.textContent = game.name || game.id;
        gameName.style.cssText = [
            'font-size:18px', 'font-weight:700', 'color:#fff',
            'margin-bottom:6px',
            'text-overflow:ellipsis', 'overflow:hidden', 'white-space:nowrap'
        ].join(';');

        // Sub text
        var sub = document.createElement('div');
        sub.textContent = 'Your most-played slot is ready!';
        sub.style.cssText = 'font-size:13px;color:rgba(255,255,255,0.55);margin-bottom:14px;line-height:1.4;';

        // CTA button
        var ctaBtn = document.createElement('button');
        ctaBtn.textContent = 'Play Now \u25B6';
        ctaBtn.style.cssText = [
            'width:100%', 'padding:10px',
            'background:linear-gradient(90deg,#7b2ff7,#f107a3)',
            'color:#fff', 'border:none', 'border-radius:10px',
            'font-size:14px', 'font-weight:700',
            'cursor:pointer',
            'transition:transform 0.15s, box-shadow 0.15s',
            'box-shadow:0 3px 14px rgba(123,47,247,0.5)'
        ].join(';');
        ctaBtn.addEventListener('mouseover', function () { ctaBtn.style.transform = 'scale(1.04)'; });
        ctaBtn.addEventListener('mouseout',  function () { ctaBtn.style.transform = 'scale(1)'; });
        ctaBtn.addEventListener('click', function () {
            if (typeof openSlot === 'function') {
                openSlot(game.id);
            }
            window.dismissGameRecommend();
        });

        card.appendChild(header);
        card.appendChild(gameName);
        card.appendChild(sub);
        card.appendChild(ctaBtn);

        return card;
    }

    // ── Show / dismiss ───────────────────────────────────────────────────────
    function _show() {
        if (_cardEl) return;

        var data = _load();
        var now  = Date.now();
        if (data.lastShown && now - data.lastShown < COOLDOWN_MS) return;

        var gameId = _pickGame();
        if (!gameId) return;

        var game = _findGame(gameId);

        data.lastShown = now;
        _save(data);

        _cardEl = _build(game);
        document.body.appendChild(_cardEl);
    }

    window.dismissGameRecommend = function () {
        if (!_cardEl) return;
        _cardEl.style.animation = 'grSlideOut 0.35s ease forwards';
        var el = _cardEl;
        setTimeout(function () {
            if (el.parentNode) el.parentNode.removeChild(el);
        }, 380);
        _cardEl = null;
    };

    // ── Spin tracking ────────────────────────────────────────────────────────
    document.addEventListener('spinComplete', function () {
        if (new URLSearchParams(window.location.search).get('noBonus') === '1') return;
        _spinsSeen += 1;
        if (_spinsSeen >= SPIN_THRESHOLD) {
            _spinsSeen = 0;
            _show();
        }
    });

    // ── Init ─────────────────────────────────────────────────────────────────
    function _init() {
        if (new URLSearchParams(window.location.search).get('noBonus') === '1') return;
        // Nothing to do on load — card shows after 60 spins
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _init);
    } else {
        _init();
    }

})();
