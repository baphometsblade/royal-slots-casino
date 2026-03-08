/* ui-retention.js — Exit-Intent · Game of the Day · Reload Bonus · Milestones
 * Sprint 28 — Revenue & Retention Engine
 * All features are non-blocking and degrade gracefully.
 */
(function () {
    'use strict';

    // ── Storage keys ──────────────────────────────────────────────────────────
    var EXIT_KEY     = 'ms_exitIntentShown';
    var RELOAD_KEY   = 'ms_reloadBonusData';
    var MILESTONE_KEY = 'ms_sprintMilestones';

    // ── Seeded PRNG (consistent per seed, no Math.random) ────────────────────
    function _seeded(seed) {
        var s = seed % 2147483647;
        if (s <= 0) s += 2147483646;
        return function () {
            s = s * 16807 % 2147483647;
            return (s - 1) / 2147483646;
        };
    }
    function _dateSeed() {
        var d = new Date();
        return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 1. EXIT-INTENT POPUP
    // ═══════════════════════════════════════════════════════════════════════════
    var _exitShown = false;
    var _exitTimer = null;

    function _onMouseOut(e) {
        if (_exitShown) return;
        // Trigger when cursor leaves through the top edge
        if (e.clientY > 5) return;
        if (e.relatedTarget || e.toElement) return;
        // Don't show to already-logged-in users who have deposited
        try {
            if (sessionStorage.getItem(EXIT_KEY)) return;
            if (localStorage.getItem(EXIT_KEY + '_perm')) return;
        } catch (err) {}
        _exitShown = true;
        _showExitIntent();
    }

    function _showExitIntent() {
        var el = document.getElementById('exitIntentOverlay');
        if (!el) return;
        el.style.display = 'flex';
        // Auto-dismiss after 45s
        _exitTimer = setTimeout(dismissExitIntent, 45000);
        try { sessionStorage.setItem(EXIT_KEY, '1'); } catch (err) {}
    }

    window.dismissExitIntent = function () {
        var el = document.getElementById('exitIntentOverlay');
        if (el) {
            el.style.opacity = '0';
            el.style.transition = 'opacity 0.3s';
            setTimeout(function () { el.style.display = 'none'; el.style.opacity = ''; el.style.transition = ''; }, 300);
        }
        if (_exitTimer) { clearTimeout(_exitTimer); _exitTimer = null; }
    };

    window.claimExitBonus = function () {
        // Persist so user isn't shown again this session + for 24h
        try {
            sessionStorage.setItem(EXIT_KEY, '1');
            localStorage.setItem(EXIT_KEY + '_perm', String(Date.now()));
        } catch (err) {}
        dismissExitIntent();
        // Open wallet/deposit flow
        setTimeout(function () {
            if (typeof openWalletModal === 'function') openWalletModal();
            else if (typeof openDepositModal === 'function') openDepositModal();
        }, 350);
    };

    function _initExitIntent() {
        // Skip during QA runs (noBonus=1 suppresses all bonus popups)
        try { if (new URLSearchParams(location.search).get('noBonus') === '1') return; } catch (e) {}
        // Don't activate for already-dismissed users
        try {
            if (localStorage.getItem(EXIT_KEY + '_perm')) {
                var ts = parseInt(localStorage.getItem(EXIT_KEY + '_perm'), 10);
                if (!isNaN(ts) && Date.now() - ts < 86400000) return; // 24h cooldown
                localStorage.removeItem(EXIT_KEY + '_perm');
            }
        } catch (err) {}
        document.documentElement.addEventListener('mouseleave', _onMouseOut);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 2. GAME OF THE DAY
    // ═══════════════════════════════════════════════════════════════════════════
    function _initGameOfTheDay() {
        var section = document.getElementById('gotdSection');
        if (!section) return;

        // GAMES array is defined globally in shared/game-definitions.js
        if (typeof GAMES === 'undefined' || !Array.isArray(GAMES) || GAMES.length === 0) return;

        // Pick a game seeded by today's date (consistent for all users on same day)
        var rng = _seeded(_dateSeed() + 42);
        var idx = Math.floor(rng() * GAMES.length);
        var game = GAMES[idx];
        if (!game) return;

        // Populate card elements
        var thumb = document.getElementById('gotdThumb');
        var name  = document.getElementById('gotdName');
        var rtp   = document.getElementById('gotdRtp');
        var prov  = document.getElementById('gotdProvider');
        var btn   = document.getElementById('gotdPlayBtn');
        var card  = document.getElementById('gotdCard');

        if (thumb) {
            var src = 'assets/slots/' + game.id + '.png';
            thumb.src = src;
            thumb.alt = game.name;
        }
        if (name) name.textContent = game.name || 'Mystery Slot';
        if (rtp) {
            // Show a slightly boosted RTP for today (display only, house edge unchanged server-side)
            var baseRtp = game.rtp || 96;
            rtp.textContent = 'RTP: ' + baseRtp + '%';
        }
        if (prov) prov.textContent = game.provider || '';
        if (btn && card) {
            btn.onclick = function () {
                if (typeof openSlot === 'function') openSlot(game);
            };
            card.onclick = function (e) {
                if (!e.target || !e.target.closest || e.target.closest('.gotd-play-btn')) return;
                if (typeof openSlot === 'function') openSlot(game);
            };
        }

        section.style.display = 'block';
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 3. RELOAD BONUS COUNTDOWN STRIP
    // ═══════════════════════════════════════════════════════════════════════════
    var _reloadInterval = null;

    function _getReloadExpiry() {
        // Reload bonus window: resets at midnight UTC each day
        // Show strip with countdown for the remaining time in the day
        var now = new Date();
        var midnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
        return midnight.getTime();
    }

    function _fmtDuration(ms) {
        if (ms <= 0) return '00:00:00';
        var secs  = Math.floor(ms / 1000);
        var h = Math.floor(secs / 3600);
        var m = Math.floor((secs % 3600) / 60);
        var s = secs % 60;
        return [h, m, s].map(function (v) { return String(v).padStart(2, '0'); }).join(':');
    }

    function _initReloadBonus() {
        var strip = document.getElementById('reloadBonusStrip');
        var timerEl = document.getElementById('reloadBonusTimer');
        if (!strip) return;

        // Only show if user has no deposit today (we approximate with localStorage)
        try {
            var rd = JSON.parse(localStorage.getItem(RELOAD_KEY) || '{}');
            var today = new Date().toISOString().slice(0, 10);
            if (rd.claimedDate === today) return; // already deposited today
        } catch (err) {}

        var expiry = _getReloadExpiry();

        function _tick() {
            var remaining = expiry - Date.now();
            if (remaining <= 0) {
                if (_reloadInterval) { clearInterval(_reloadInterval); _reloadInterval = null; }
                if (strip) strip.style.display = 'none';
                return;
            }
            if (timerEl) timerEl.textContent = 'Resets in ' + _fmtDuration(remaining);
        }

        _tick();
        strip.style.display = 'flex';
        _reloadInterval = setInterval(_tick, 1000);
    }

    // Called externally when user makes a deposit (suppress strip for rest of day)
    window._retentionMarkDeposit = function () {
        try {
            var today = new Date().toISOString().slice(0, 10);
            localStorage.setItem(RELOAD_KEY, JSON.stringify({ claimedDate: today }));
        } catch (err) {}
        var strip = document.getElementById('reloadBonusStrip');
        if (strip) strip.style.display = 'none';
        if (_reloadInterval) { clearInterval(_reloadInterval); _reloadInterval = null; }
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // 4. SPIN MILESTONE TOASTS
    // ═══════════════════════════════════════════════════════════════════════════
    var MILESTONES = [
        { count: 50,   emoji: '🎯', title: '50 Spins!',    sub: 'You\'re warming up — big wins incoming!' },
        { count: 100,  emoji: '💫', title: '100 Spins!',   sub: 'Century spin! Keep the reels rolling.' },
        { count: 250,  emoji: '🔥', title: '250 Spins!',   sub: 'On fire! You\'ve hit 250 spins today.' },
        { count: 500,  emoji: '⚡', title: '500 Spins!',   sub: 'Lightning round! Half-thousand spins.' },
        { count: 1000, emoji: '👑', title: '1,000 Spins!', sub: 'Legendary spinner — you\'re in elite company!' },
        { count: 2500, emoji: '💎', title: '2,500 Spins!', sub: 'Diamond level spinning — respect!' },
        { count: 5000, emoji: '🏆', title: '5,000 Spins!', sub: 'Hall of Fame spinner. Absolute legend.' }
    ];

    var _sessionSpins = 0;
    var _shownMilestones = {};
    var _toastQueue = [];
    var _toastActive = false;

    function _loadMilestones() {
        try {
            var today = new Date().toISOString().slice(0, 10);
            var data = JSON.parse(sessionStorage.getItem(MILESTONE_KEY) || '{}');
            if (data.date === today) {
                _sessionSpins = data.spins || 0;
                _shownMilestones = data.shown || {};
            }
        } catch (err) {}
    }

    function _saveMilestones() {
        try {
            var today = new Date().toISOString().slice(0, 10);
            sessionStorage.setItem(MILESTONE_KEY, JSON.stringify({
                date: today,
                spins: _sessionSpins,
                shown: _shownMilestones
            }));
        } catch (err) {}
    }

    function _showMilestoneToast(m) {
        var existing = document.querySelector('.milestone-toast');
        if (existing) existing.remove();

        var toast = document.createElement('div');
        toast.className = 'milestone-toast';
        toast.innerHTML = '<span class="mt-emoji">' + m.emoji + '</span>' +
            '<div class="mt-title">' + m.title + '</div>' +
            '<div class="mt-sub">' + m.sub + '</div>';
        document.body.appendChild(toast);

        setTimeout(function () {
            toast.style.transition = 'opacity 0.5s';
            toast.style.opacity = '0';
            setTimeout(function () { if (toast.parentNode) toast.remove(); _dequeueToast(); }, 500);
        }, 3500);
    }

    function _dequeueToast() {
        _toastActive = false;
        if (_toastQueue.length > 0) {
            var next = _toastQueue.shift();
            _toastActive = true;
            _showMilestoneToast(next);
        }
    }

    function _enqueueToast(m) {
        if (_toastActive) {
            _toastQueue.push(m);
        } else {
            _toastActive = true;
            _showMilestoneToast(m);
        }
    }

    // Public: called by spin-engine or ui-slot when a spin completes
    window._retentionTrackSpin = function () {
        _sessionSpins++;
        _saveMilestones();

        MILESTONES.forEach(function (m) {
            if (_sessionSpins === m.count && !_shownMilestones[m.count]) {
                _shownMilestones[m.count] = true;
                _saveMilestones();
                _enqueueToast(m);
            }
        });
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // INIT
    // ═══════════════════════════════════════════════════════════════════════════
    function _init() {
        _loadMilestones();
        _initExitIntent();
        _initGameOfTheDay();
        _initReloadBonus();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { setTimeout(_init, 900); });
    } else {
        setTimeout(_init, 900);
    }

})();
