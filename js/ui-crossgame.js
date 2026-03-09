// Sprint 77: Cross-Game Bonus Unlock System
// When player hits a big win (5x+ multiplier), they get a bonus offer
// to try a different game with bonus credits. Drives game variety +
// longer sessions + exposure to more game types (increased stickiness).
(function() {
    'use strict';

    // ── Config ────────────────────────────────────────────────
    var WIN_MULT_THRESHOLD = 5;     // Win must be >= 5x bet to trigger
    var BONUS_CREDIT_MULT  = 0.5;   // Bonus = 50% of current bet for the new game
    var SHOW_DELAY_MS      = 3000;  // 3s after win to show offer (let celebration finish)
    var OFFER_COOLDOWN_MS  = 300000; // 5 min between offers
    var DISMISS_TIMEOUT_MS = 20000;  // Auto-dismiss after 20s
    var STORAGE_KEY        = 'crossGameLastOffer';

    // ── State ─────────────────────────────────────────────────
    var _lastOfferMs  = 0;
    var _stylesInjected = false;
    var _toastEl      = null;

    // ── Styles ────────────────────────────────────────────────
    function injectStyles() {
        if (_stylesInjected) return;
        _stylesInjected = true;
        var s = document.createElement('style');
        s.id = 'crossGameStyles';
        s.textContent = [
            '#cgToast{position:fixed;bottom:90px;right:16px;z-index:10400;' +
                'background:linear-gradient(160deg,#0f172a,#1e1b4b);' +
                'border:2px solid rgba(139,92,246,.6);border-radius:16px;' +
                'padding:16px 20px;max-width:300px;' +
                'box-shadow:0 0 30px rgba(139,92,246,.3);' +
                'color:#e0e7ff;font-family:inherit;' +
                'transform:translateX(120%);transition:transform .4s cubic-bezier(.34,1.56,.64,1)}',
            '#cgToast.active{transform:translateX(0)}',
            '.cg-header{display:flex;align-items:center;gap:8px;margin-bottom:8px}',
            '.cg-icon{font-size:24px}',
            '.cg-title{font-size:13px;font-weight:800;color:#a78bfa;letter-spacing:.5px;text-transform:uppercase}',
            '.cg-body{font-size:12px;color:rgba(255,255,255,.65);line-height:1.5;margin-bottom:12px}',
            '.cg-game-name{color:#c4b5fd;font-weight:700}',
            '.cg-bonus-amt{color:#fbbf24;font-weight:800;font-size:14px}',
            '.cg-btns{display:flex;gap:8px}',
            '.cg-btn{padding:7px 16px;border-radius:8px;font-size:12px;font-weight:700;' +
                'cursor:pointer;border:none;transition:opacity .15s}',
            '.cg-btn:hover{opacity:.85}',
            '.cg-play{background:linear-gradient(135deg,#8b5cf6,#6d28d9);color:#fff}',
            '.cg-skip{background:rgba(255,255,255,.12);color:rgba(255,255,255,.6)}'
        ].join('\n');
        document.head.appendChild(s);
    }

    // ── Pick a recommended game ───────────────────────────────
    function pickRecommendedGame(currentGameId) {
        if (typeof GAMES === 'undefined' || !GAMES || !GAMES.length) return null;
        // Filter out current game and pick a random one
        var candidates = GAMES.filter(function(g) {
            return g.id !== currentGameId;
        });
        if (!candidates.length) return null;
        // Prefer games the player hasn't played recently
        var recentKey = (typeof STORAGE_KEY_RECENTLY_PLAYED !== 'undefined')
            ? STORAGE_KEY_RECENTLY_PLAYED : 'recentlyPlayed';
        var recent = [];
        try {
            var raw = localStorage.getItem(recentKey);
            if (raw) recent = JSON.parse(raw);
        } catch (e) { /* ignore */ }
        var recentIds = {};
        recent.forEach(function(id) { recentIds[id] = true; });
        // Prioritize games NOT in recent list
        var unplayed = candidates.filter(function(g) { return !recentIds[g.id]; });
        var pool = unplayed.length >= 3 ? unplayed : candidates;
        return pool[Math.floor(Math.random() * pool.length)];
    }

    // ── Toast UI ──────────────────────────────────────────────
    function showOffer(gameName, gameId, bonusAmt) {
        injectStyles();
        // Remove old toast
        var old = document.getElementById('cgToast');
        if (old && old.parentNode) old.parentNode.removeChild(old);

        _toastEl = document.createElement('div');
        _toastEl.id = 'cgToast';

        // Header
        var header = document.createElement('div');
        header.className = 'cg-header';
        var icon = document.createElement('span');
        icon.className = 'cg-icon';
        icon.textContent = '\uD83C\uDFB0';
        var title = document.createElement('span');
        title.className = 'cg-title';
        title.textContent = 'Bonus Unlock!';
        header.appendChild(icon);
        header.appendChild(title);

        // Body
        var body = document.createElement('div');
        body.className = 'cg-body';
        var nameSpan = document.createElement('span');
        nameSpan.className = 'cg-game-name';
        nameSpan.textContent = gameName;
        var amtSpan = document.createElement('span');
        amtSpan.className = 'cg-bonus-amt';
        amtSpan.textContent = '$' + bonusAmt.toFixed(2);
        body.appendChild(document.createTextNode('Try '));
        body.appendChild(nameSpan);
        body.appendChild(document.createTextNode(' with a '));
        body.appendChild(amtSpan);
        body.appendChild(document.createTextNode(' bonus credit!'));

        // Buttons
        var btns = document.createElement('div');
        btns.className = 'cg-btns';

        var playBtn = document.createElement('button');
        playBtn.className = 'cg-btn cg-play';
        playBtn.textContent = '\uD83C\uDFAE Play Now';
        playBtn.addEventListener('click', function() {
            dismiss();
            // Credit the bonus
            if (typeof balance !== 'undefined') balance += bonusAmt;
            if (typeof updateBalance === 'function') updateBalance();
            if (typeof saveBalance === 'function') saveBalance();
            // Navigate to the recommended game
            var game = null;
            if (typeof GAMES !== 'undefined') {
                for (var i = 0; i < GAMES.length; i++) {
                    if (GAMES[i].id === gameId) { game = GAMES[i]; break; }
                }
            }
            if (game && typeof openSlot === 'function') {
                setTimeout(function() { openSlot(game); }, 200);
            }
        });

        var skipBtn = document.createElement('button');
        skipBtn.className = 'cg-btn cg-skip';
        skipBtn.textContent = 'Not now';
        skipBtn.addEventListener('click', dismiss);

        btns.appendChild(playBtn);
        btns.appendChild(skipBtn);

        _toastEl.appendChild(header);
        _toastEl.appendChild(body);
        _toastEl.appendChild(btns);
        document.body.appendChild(_toastEl);

        requestAnimationFrame(function() {
            requestAnimationFrame(function() { _toastEl.classList.add('active'); });
        });

        // Auto-dismiss
        setTimeout(dismiss, DISMISS_TIMEOUT_MS);
    }

    function dismiss() {
        if (_toastEl) {
            _toastEl.classList.remove('active');
            var el = _toastEl;
            setTimeout(function() { if (el.parentNode) el.parentNode.removeChild(el); }, 500);
            _toastEl = null;
        }
    }

    // ── Hook into win results ─────────────────────────────────
    function hookWinResult() {
        var _orig = window.displayServerWinResult;
        if (typeof _orig !== 'function') return;

        window.displayServerWinResult = function(result, game) {
            _orig.call(this, result, game);

            // Check if this is a big enough win
            if (!result || result.winAmount <= 0) return;
            var bet = (typeof currentBet !== 'undefined') ? currentBet : 1;
            var mult = result.winAmount / bet;
            if (mult < WIN_MULT_THRESHOLD) return;

            // Cooldown check
            if (Date.now() - _lastOfferMs < OFFER_COOLDOWN_MS) return;
            _lastOfferMs = Date.now();

            // Pick a game to recommend
            var currentId = (game && game.id) ? game.id : '';
            var rec = pickRecommendedGame(currentId);
            if (!rec) return;

            var bonusAmt = Math.round(bet * BONUS_CREDIT_MULT * 100) / 100;
            if (bonusAmt < 0.10) bonusAmt = 0.10; // minimum $0.10

            // Delay to let celebration finish
            setTimeout(function() {
                showOffer(rec.name, rec.id, bonusAmt);
            }, SHOW_DELAY_MS);
        };
    }

    // ── Init ──────────────────────────────────────────────────
    function init() {
        // Restore cooldown from storage
        try {
            var last = parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10);
            if (last > 0) _lastOfferMs = last;
        } catch (e) { /* ignore */ }
        hookWinResult();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        setTimeout(init, 0);
    }
}());
