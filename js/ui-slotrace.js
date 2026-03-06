// =====================================================================
// SLOT RACE MODULE — Sprint 99: 30-Minute Competitive Spin Races
// =====================================================================
//
// Self-contained IIFE. Every 30 minutes a new race starts automatically.
// Players accumulate race points per spin (1 base + bonus from wins).
// Leaderboard shows top 5 with fake competitors. Prizes auto-credit
// when a race ends: 1st $10, 2nd $5, 3rd $2.
//
// Depends on: globals.js (balance, currentBet, formatMoney),
//   ui-slot.js (displayServerWinResult), ui-modals.js (showWinToast)
//
// Public API (window):
//   getSlotRaceInfo()   — { position, points, timeLeft, racers }
//   resetSlotRace()     — force-reset (for QA)
// =====================================================================

(function() {
    'use strict';

    // ── QA Suppression ───────────────────────────────────────────
    function isQaSuppressed() {
        var qs = window.location.search || '';
        return qs.indexOf('noBonus=1') !== -1 || qs.indexOf('qaTools=1') !== -1;
    }

    // ── Constants ────────────────────────────────────────────────
    var STORAGE_KEY      = 'slotRaceState';
    var RACE_DURATION_MS = 30 * 60 * 1000;
    var TICK_INTERVAL_MS = 1000;
    var FAKE_RACER_MIN   = 8;
    var FAKE_RACER_MAX   = 12;
    var BONUS_CAP        = 10;
    var PRIZES           = [10.00, 5.00, 2.00];
    var STYLE_ID         = 'slotRaceStyles';

    var FAKE_NAMES = [
        'LuckyAce77', 'SpinQueen', 'ReelMaster', 'JackpotJoe',
        'NeonSlots', 'MidnightRoller', 'StarSpinner', 'CryptoKing99',
        'GoldRush_X', 'VelvetDice', 'PhantomSpin', 'TurboReels',
        'DiamondDash', 'CosmicBet', 'SilverStorm', 'RoyalFlush22',
        'WildCard_K', 'BlazeRunner', 'ThunderSpin', 'NovaBets'
    ];

    // ── State ────────────────────────────────────────────────────
    var _state = null, _tickTimer = null;
    var _fabEl = null, _panelEl = null, _panelOpen = false, _stylesInjected = false;

    // ── Utility ──────────────────────────────────────────────────
    function getRaceEpoch() {
        var now = Date.now();
        return now - (now % RACE_DURATION_MS);
    }
    function timeLeftMs() {
        return (getRaceEpoch() + RACE_DURATION_MS) - Date.now();
    }
    function formatTime(ms) {
        if (ms <= 0) return '00:00';
        var sec = Math.floor(ms / 1000);
        return String(Math.floor(sec / 60)).padStart(2, '0') + ':' +
               String(sec % 60).padStart(2, '0');
    }
    function shuffleArray(arr) {
        for (var i = arr.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
        }
        return arr;
    }
    function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
    function el(tag, cls, text) {
        var e = document.createElement(tag);
        if (cls) e.className = cls;
        if (text) e.textContent = text;
        return e;
    }

    // ── Fake Racer Generation ────────────────────────────────────
    function generateFakeRacers() {
        var count = FAKE_RACER_MIN + Math.floor(Math.random() * (FAKE_RACER_MAX - FAKE_RACER_MIN + 1));
        var names = shuffleArray(FAKE_NAMES.slice()).slice(0, count);
        var racers = [];
        for (var i = 0; i < names.length; i++) {
            racers.push({ name: names[i], points: 0, rate: 0.3 + Math.random() * 1.2, isFake: true });
        }
        return racers;
    }

    function advanceFakeRacers() {
        if (!_state || !_state.racers) return;
        var elapsed = Date.now() - _state.raceEpoch;
        var progress = clamp(elapsed / RACE_DURATION_MS, 0, 1);
        for (var i = 0; i < _state.racers.length; i++) {
            var r = _state.racers[i];
            if (!r.isFake) continue;
            var target = r.rate * (elapsed / 1000) * 0.15;
            if (progress > 0.83) target *= 1.0 + (progress - 0.83) * 5;
            var jitter = 0.9 + Math.random() * 0.2;
            r.points = Math.max(r.points, Math.floor(target * jitter));
        }
    }

    // ── Persistence ──────────────────────────────────────────────
    function loadState() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                var data = JSON.parse(raw);
                if (data && data.raceEpoch === getRaceEpoch()) { _state = data; return; }
            }
        } catch (e) { /* ignore corrupt data */ }
        initNewRace();
    }
    function saveState() {
        if (!_state) return;
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(_state)); }
        catch (e) { /* quota exceeded */ }
    }
    function initNewRace() {
        var prev = _state;
        _state = {
            raceEpoch: getRaceEpoch(),
            playerPoints: 0,
            playerName: 'You',
            racers: generateFakeRacers(),
            prizeAwarded: false
        };
        saveState();
        if (prev && !prev.prizeAwarded && prev.playerPoints > 0) awardPrize(prev);
    }

    // ── Leaderboard & Prizes ─────────────────────────────────────
    function getLeaderboard(state) {
        if (!state) return [];
        var all = [{ name: state.playerName, points: state.playerPoints, isPlayer: true }];
        for (var i = 0; i < state.racers.length; i++) {
            all.push({ name: state.racers[i].name, points: state.racers[i].points, isPlayer: false });
        }
        all.sort(function(a, b) {
            if (b.points !== a.points) return b.points - a.points;
            return a.isPlayer ? -1 : 1;
        });
        return all;
    }
    function getPlayerPosition(state) {
        var lb = getLeaderboard(state);
        for (var i = 0; i < lb.length; i++) {
            if (lb[i].isPlayer) return i + 1;
        }
        return lb.length;
    }
    function awardPrize(prevState) {
        var pos = getPlayerPosition(prevState);
        if (pos > PRIZES.length) return;
        var amount = PRIZES[pos - 1];
        prevState.prizeAwarded = true;
        // Credit balance
        if (typeof balance !== 'undefined') {
            balance += amount;
            balance = Math.round(balance * 100) / 100;
            if (typeof updateBalance === 'function') updateBalance();
            if (typeof saveBalance === 'function') saveBalance();
        }
        var ordinal = pos === 1 ? '1st' : pos === 2 ? '2nd' : '3rd';
        if (typeof showWinToast === 'function') {
            showWinToast('Slot Race ' + ordinal + ' Place! +$' + amount.toFixed(2), 'epic');
        }
    }

    // ── Point Tracking ───────────────────────────────────────────
    function addSpinPoint() {
        if (!_state) return;
        if (_state.raceEpoch !== getRaceEpoch()) {
            var prev = _state;
            initNewRace();
            if (prev && !prev.prizeAwarded && prev.playerPoints > 0) awardPrize(prev);
        }
        _state.playerPoints += 1;
        saveState();
        updatePanel();
        updateFabBadge();
    }
    function addWinPoints(winAmount, betAmount) {
        if (!_state || !betAmount || betAmount <= 0) return;
        var bonus = clamp(Math.floor(winAmount / betAmount), 0, BONUS_CAP);
        if (bonus > 0) {
            _state.playerPoints += bonus;
            saveState();
            updatePanel();
            updateFabBadge();
        }
    }

    // ── CSS Injection ────────────────────────────────────────────
    function injectStyles() {
        if (_stylesInjected) return;
        _stylesInjected = true;
        var s = document.createElement('style');
        s.id = STYLE_ID;
        s.textContent =
            '#srFab{position:fixed;bottom:200px;left:16px;z-index:19200;' +
            'width:48px;height:48px;border-radius:50%;' +
            'background:linear-gradient(135deg,#7c3aed,#2563eb);' +
            'color:#fff;font-size:22px;display:flex;align-items:center;justify-content:center;' +
            'cursor:pointer;box-shadow:0 4px 16px rgba(124,58,237,.5);' +
            'border:2px solid rgba(255,255,255,.15);transition:transform .2s,box-shadow .2s}' +
            '#srFab:hover{transform:scale(1.12);box-shadow:0 6px 24px rgba(124,58,237,.7)}' +
            '#srFab .sr-badge{position:absolute;top:-4px;right:-4px;' +
            'background:#ef4444;color:#fff;font-size:10px;font-weight:800;' +
            'min-width:18px;height:18px;border-radius:9px;display:flex;' +
            'align-items:center;justify-content:center;padding:0 4px;' +
            'box-shadow:0 2px 6px rgba(0,0,0,.4)}' +
            '#srPanel{position:fixed;bottom:256px;left:16px;z-index:19201;' +
            'width:300px;max-width:90vw;' +
            'background:linear-gradient(160deg,#0d0d1a 0%,#1a0a2e 100%);' +
            'border:1px solid rgba(124,58,237,.4);border-radius:16px;' +
            'padding:0;box-shadow:0 8px 32px rgba(0,0,0,.6);' +
            'transform:translateY(12px);opacity:0;pointer-events:none;' +
            'transition:transform .25s ease,opacity .25s ease;overflow:hidden}' +
            '#srPanel.sr-open{transform:translateY(0);opacity:1;pointer-events:auto}' +
            '.sr-header{padding:14px 16px 10px;display:flex;align-items:center;' +
            'justify-content:space-between;border-bottom:1px solid rgba(124,58,237,.2)}' +
            '.sr-title{font-size:15px;font-weight:800;color:#e2e8f0;letter-spacing:.3px}' +
            '.sr-timer{font-size:22px;font-weight:900;color:#a78bfa;' +
            'font-variant-numeric:tabular-nums;font-family:monospace}' +
            '.sr-body{padding:12px 16px 14px}' +
            '.sr-position{display:flex;align-items:center;gap:10px;margin-bottom:12px}' +
            '.sr-pos-num{font-size:28px;font-weight:900;' +
            'background:linear-gradient(135deg,#fbbf24,#f59e0b);' +
            '-webkit-background-clip:text;-webkit-text-fill-color:transparent;' +
            'background-clip:text;min-width:36px;text-align:center}' +
            '.sr-pos-label{font-size:12px;color:#94a3b8;font-weight:600}' +
            '.sr-pos-pts{font-size:18px;font-weight:800;color:#e2e8f0}' +
            '.sr-lb{list-style:none;margin:0;padding:0}' +
            '.sr-lb li{display:flex;align-items:center;padding:6px 0;' +
            'border-bottom:1px solid rgba(255,255,255,.05);font-size:13px;color:#cbd5e1}' +
            '.sr-lb li:last-child{border-bottom:none}' +
            '.sr-lb .sr-rank{width:24px;font-weight:800;color:#a78bfa;flex-shrink:0}' +
            '.sr-lb .sr-name{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
            '.sr-lb .sr-pts{font-weight:700;color:#fbbf24;min-width:40px;text-align:right}' +
            '.sr-lb .sr-you{color:#7c3aed;font-weight:800}' +
            '.sr-lb .sr-you .sr-name{color:#a78bfa}' +
            '.sr-prizes{margin-top:10px;padding-top:8px;border-top:1px solid rgba(124,58,237,.2)}' +
            '.sr-prizes-title{font-size:11px;color:#64748b;font-weight:700;' +
            'text-transform:uppercase;letter-spacing:.8px;margin-bottom:6px}' +
            '.sr-prize-row{display:flex;justify-content:space-between;font-size:12px;color:#94a3b8;padding:2px 0}' +
            '.sr-prize-row .sr-prize-amt{color:#22c55e;font-weight:700}' +
            '@keyframes srPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.08)}}' +
            '.sr-pulse{animation:srPulse .6s ease}';
        document.head.appendChild(s);
    }

    // ── DOM Creation ─────────────────────────────────────────────
    function createFab() {
        if (_fabEl) return;
        var fab = el('div'); fab.id = 'srFab';
        fab.setAttribute('title', 'Slot Race');
        fab.setAttribute('role', 'button');
        fab.setAttribute('aria-label', 'Open Slot Race panel');
        var icon = el('span', null, '\uD83C\uDFC1');
        icon.style.cssText = 'pointer-events:none;line-height:1';
        fab.appendChild(icon);
        var badge = el('span', 'sr-badge');
        badge.style.display = 'none';
        fab.appendChild(badge);
        fab.addEventListener('click', function(e) { e.stopPropagation(); togglePanel(); });
        document.body.appendChild(fab);
        _fabEl = fab;
    }

    function createPanel() {
        if (_panelEl) return;
        var panel = el('div'); panel.id = 'srPanel';

        // Header
        var header = el('div', 'sr-header');
        header.appendChild(el('span', 'sr-title', 'Slot Race'));
        var timer = el('span', 'sr-timer', '30:00');
        header.appendChild(timer);
        panel.appendChild(header);

        // Body
        var body = el('div', 'sr-body');

        // Position display
        var posWrap = el('div', 'sr-position');
        posWrap.appendChild(el('div', 'sr-pos-num', '-'));
        var posInfo = el('div');
        posInfo.appendChild(el('div', 'sr-pos-label', 'YOUR POSITION'));
        posInfo.appendChild(el('div', 'sr-pos-pts', '0 pts'));
        posWrap.appendChild(posInfo);
        body.appendChild(posWrap);

        // Leaderboard list
        body.appendChild(el('ol', 'sr-lb'));

        // Prizes section
        var prizes = el('div', 'sr-prizes');
        prizes.appendChild(el('div', 'sr-prizes-title', 'Prizes'));
        var labels = ['1st', '2nd', '3rd'];
        for (var i = 0; i < PRIZES.length; i++) {
            var row = el('div', 'sr-prize-row');
            row.appendChild(el('span', null, labels[i] + ' Place'));
            row.appendChild(el('span', 'sr-prize-amt', '$' + PRIZES[i].toFixed(2)));
            prizes.appendChild(row);
        }
        body.appendChild(prizes);
        panel.appendChild(body);

        document.body.appendChild(panel);
        _panelEl = panel;
    }

    // ── Panel Updates ────────────────────────────────────────────
    function updatePanel() {
        if (!_panelEl || !_state) return;
        var timerEl = _panelEl.querySelector('.sr-timer');
        if (timerEl) timerEl.textContent = formatTime(timeLeftMs());

        var pos = getPlayerPosition(_state);
        var posNumEl = _panelEl.querySelector('.sr-pos-num');
        if (posNumEl) {
            var newPos = pos <= 99 ? String(pos) : '99+';
            if (posNumEl.textContent !== newPos) {
                posNumEl.textContent = newPos;
                posNumEl.classList.remove('sr-pulse');
                requestAnimationFrame(function() {
                    requestAnimationFrame(function() { posNumEl.classList.add('sr-pulse'); });
                });
            }
        }
        var ptsEl = _panelEl.querySelector('.sr-pos-pts');
        if (ptsEl) ptsEl.textContent = _state.playerPoints + ' pts';

        // Leaderboard — top 5
        var lb = getLeaderboard(_state), top5 = lb.slice(0, 5);
        var lbEl = _panelEl.querySelector('.sr-lb');
        if (!lbEl) return;
        while (lbEl.firstChild) lbEl.removeChild(lbEl.firstChild);

        var medals = ['\uD83E\uDD47', '\uD83E\uDD48', '\uD83E\uDD49'];
        for (var i = 0; i < top5.length; i++) {
            var entry = top5[i];
            var li = el('li', entry.isPlayer ? 'sr-you' : null);
            li.appendChild(el('span', 'sr-rank', i < 3 ? medals[i] : String(i + 1)));
            li.appendChild(el('span', 'sr-name', entry.isPlayer ? 'You' : entry.name));
            li.appendChild(el('span', 'sr-pts', entry.points + ' pts'));
            lbEl.appendChild(li);
        }

        // If player not in top 5, append separator + their row
        if (pos > 5) {
            var sep = el('li');
            sep.style.cssText = 'justify-content:center;color:#475569;font-size:11px;padding:4px 0';
            sep.textContent = '\u00B7\u00B7\u00B7';
            lbEl.appendChild(sep);
            var pLi = el('li', 'sr-you');
            pLi.appendChild(el('span', 'sr-rank', String(pos)));
            pLi.appendChild(el('span', 'sr-name', 'You'));
            pLi.appendChild(el('span', 'sr-pts', _state.playerPoints + ' pts'));
            lbEl.appendChild(pLi);
        }
    }

    function updateFabBadge() {
        if (!_fabEl || !_state) return;
        var badge = _fabEl.querySelector('.sr-badge');
        if (!badge) return;
        var pos = getPlayerPosition(_state);
        if (_state.playerPoints > 0 && pos <= 3) {
            badge.textContent = '#' + pos;
            badge.style.display = 'flex';
        } else if (_state.playerPoints > 0) {
            badge.textContent = _state.playerPoints;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    }

    // ── Panel Toggle ─────────────────────────────────────────────
    function togglePanel() {
        _panelOpen = !_panelOpen;
        if (_panelEl) {
            if (_panelOpen) { _panelEl.classList.add('sr-open'); updatePanel(); }
            else { _panelEl.classList.remove('sr-open'); }
        }
    }
    function closePanel() {
        if (_panelOpen) { _panelOpen = false; if (_panelEl) _panelEl.classList.remove('sr-open'); }
    }

    // ── Tick Loop ────────────────────────────────────────────────
    function tick() {
        if (!_state) return;
        var currentEpoch = getRaceEpoch();
        if (_state.raceEpoch !== currentEpoch) {
            var prev = _state;
            initNewRace();
            if (prev && !prev.prizeAwarded && prev.playerPoints > 0) awardPrize(prev);
        }
        advanceFakeRacers();
        updatePanel();
        updateFabBadge();
    }

    // ── Hook: displayServerWinResult ─────────────────────────────
    function hookDisplayServerWinResult() {
        var _orig = window.displayServerWinResult;
        if (typeof _orig !== 'function') return;
        window.displayServerWinResult = function(result, game) {
            _orig.apply(this, arguments);
            addSpinPoint();
            if (result && result.winAmount && result.winAmount > 0) {
                var bet = (typeof currentBet !== 'undefined') ? currentBet : (result.bet || 0);
                if (bet > 0) addWinPoints(result.winAmount, bet);
            }
        };
    }

    // ── Click-outside dismiss ────────────────────────────────────
    function onDocClick(e) {
        if (!_panelOpen) return;
        if (_panelEl && _panelEl.contains(e.target)) return;
        if (_fabEl && _fabEl.contains(e.target)) return;
        closePanel();
    }

    // ── Public API ───────────────────────────────────────────────
    window.getSlotRaceInfo = function() {
        if (!_state) return null;
        return {
            position: getPlayerPosition(_state),
            points: _state.playerPoints,
            timeLeft: timeLeftMs(),
            racers: getLeaderboard(_state)
        };
    };
    window.resetSlotRace = function() {
        try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* */ }
        _state = null;
        initNewRace();
        updatePanel();
        updateFabBadge();
    };

    // ── Init ─────────────────────────────────────────────────────
    function init() {
        if (isQaSuppressed()) return;
        injectStyles();
        loadState();
        createFab();
        createPanel();
        hookDisplayServerWinResult();
        updatePanel();
        updateFabBadge();
        _tickTimer = setInterval(tick, TICK_INTERVAL_MS);
        document.addEventListener('click', onDocClick, true);
    }

    // Boot after DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        requestAnimationFrame(function() { requestAnimationFrame(init); });
    }

}());
