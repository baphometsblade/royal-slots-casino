/* ui-tournament2.js — Tournament Entry Bar
 * Sprint 40: Competitive tournament bar with entry fee, countdown, leaderboard.
 * DOM element: #tournamentBar (fixed bottom bar)
 */
(function () {
    'use strict';

    var STORAGE_KEY = 'ms_tournament2Data';
    var BAR_ID = 'tournamentBar';
    var TICK_INTERVAL = 1000;

    var TOURNAMENT_NAMES = [
        'Diamond Showdown', 'Golden Rush Cup', 'Midnight Stakes', 'Royal Rumble',
        'Jackpot Frenzy', 'Platinum Championship', 'Neon Blitz', 'Crown Clash',
        'Fortune Wars', 'High Roller Open', 'Thunder League', 'Crystal Classic'
    ];
    var FAKE_PLAYERS = [
        'AceHighRoller', 'LuckyDragon88', 'SpinQueen', 'VegasViper', 'JackpotJoe',
        'NeonKnight', 'GoldRush99', 'MidnightAce', 'StarSlayer', 'DiamondDan',
        'BetMaster77', 'SlotKing42', 'WildCard_X', 'CasinoQueen', 'FortuneFox'
    ];

    var _tickTimer = null;
    var _barEl = null;

    // ── QA bypass ──────────────────────────────────────────────────────────
    function _isQA() {
        try { return new URLSearchParams(window.location.search).get('noBonus') === '1'; }
        catch (e) { return false; }
    }

    // ── Persistence ────────────────────────────────────────────────────────
    function _loadData() {
        try { return JSON.parse(localStorage.getItem(STORAGE_KEY)); }
        catch (e) { return null; }
    }

    function _saveData(data) {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
        catch (e) { /* quota */ }
    }

    // ── Toast ──────────────────────────────────────────────────────────────
    function _toast(msg) {
        if (typeof showToast === 'function') { showToast(msg, 'info'); return; }
        var t = document.createElement('div');
        t.textContent = msg;
        t.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#2563eb;color:#fff;padding:10px 20px;border-radius:8px;font-weight:700;z-index:99999;font-size:14px;box-shadow:0 4px 16px rgba(0,0,0,0.4);';
        document.body.appendChild(t);
        setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 3000);
    }

    // ── Generate tournament ────────────────────────────────────────────────
    function _generate() {
        var name = TOURNAMENT_NAMES[Math.floor(Math.random() * TOURNAMENT_NAMES.length)];
        var hours = Math.floor(Math.random() * 37) + 12;
        var pool = (Math.floor(Math.random() * 10) + 1) * 500;
        var fee = pool <= 1500 ? 5 : pool <= 3000 ? 15 : 25;
        var board = [];
        var used = {};
        for (var i = 0; i < 5; i++) {
            var idx;
            do { idx = Math.floor(Math.random() * FAKE_PLAYERS.length); } while (used[idx]);
            used[idx] = true;
            board.push({ name: FAKE_PLAYERS[idx], score: Math.floor(Math.random() * 5000) + 1000 });
        }
        board.sort(function (a, b) { return b.score - a.score; });
        return {
            name: name, pool: pool, fee: fee,
            endTime: Date.now() + hours * 3600000,
            entered: false, rank: Math.floor(Math.random() * 50) + 1,
            score: 0, board: board
        };
    }

    // ── Format time ────────────────────────────────────────────────────────
    function _fmtTime(ms) {
        if (ms <= 0) return '00:00:00';
        var s = Math.floor(ms / 1000);
        var h = Math.floor(s / 3600); s %= 3600;
        var m = Math.floor(s / 60); s %= 60;
        return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
    }

    // ── Ensure valid tournament ────────────────────────────────────────────
    function _ensure() {
        var d = _loadData();
        if (!d || Date.now() >= d.endTime) { d = _generate(); _saveData(d); }
        return d;
    }

    // ── Create DOM ─────────────────────────────────────────────────────────
    function _createBar() {
        if (_barEl) { if (_barEl.parentNode) _barEl.parentNode.removeChild(_barEl); }
        var d = _ensure();

        var bar = document.createElement('div');
        bar.id = BAR_ID;
        bar.className = 'tournament-bar';

        var inner = document.createElement('div');
        inner.className = 'tournament-bar-inner';

        // Trophy
        var trophy = document.createElement('span');
        trophy.className = 'tournament-bar-trophy';
        trophy.textContent = '\uD83C\uDFC6';

        // Name
        var nameEl = document.createElement('span');
        nameEl.className = 'tournament-bar-name';
        nameEl.textContent = d.name;

        // Divider 1
        var div1 = document.createElement('span');
        div1.className = 'tournament-bar-divider';

        // Timer
        var timerWrap = document.createElement('span');
        timerWrap.className = 'tournament-bar-timer';
        var timerIcon = document.createElement('span');
        timerIcon.className = 'tournament-bar-timer-icon';
        timerIcon.textContent = '\u23F1';
        var timerVal = document.createElement('span');
        timerVal.className = 'tournament-bar-timer-value';
        timerVal.id = 'tbar2Timer';
        timerVal.textContent = _fmtTime(d.endTime - Date.now());
        timerWrap.appendChild(timerIcon);
        timerWrap.appendChild(timerVal);

        // Divider 2
        var div2 = document.createElement('span');
        div2.className = 'tournament-bar-divider';

        // Rank
        var rankEl = document.createElement('span');
        rankEl.className = 'tournament-bar-rank';
        var rankLbl = document.createElement('span');
        rankLbl.textContent = 'Rank: ';
        var rankVal = document.createElement('span');
        rankVal.className = 'tournament-bar-rank-value';
        rankVal.id = 'tbar2Rank';
        rankVal.textContent = d.entered ? '#' + d.rank : '--';
        rankEl.appendChild(rankLbl);
        rankEl.appendChild(rankVal);

        // Prize
        var prizeEl = document.createElement('span');
        prizeEl.className = 'tournament-bar-prize';
        var prizeLbl = document.createElement('span');
        prizeLbl.textContent = 'Prize: ';
        var prizeVal = document.createElement('span');
        prizeVal.className = 'tournament-bar-prize-value';
        prizeVal.textContent = '$' + d.pool.toLocaleString();
        prizeEl.appendChild(prizeLbl);
        prizeEl.appendChild(prizeVal);

        // Enter button
        var enterBtn = document.createElement('button');
        enterBtn.className = 'tournament-bar-enter-btn';
        enterBtn.id = 'tbar2Enter';
        if (d.entered) {
            enterBtn.textContent = 'Entered \u2713';
            enterBtn.classList.add('entered');
            enterBtn.disabled = true;
        } else {
            enterBtn.textContent = 'Enter ($' + d.fee + ')';
            enterBtn.onclick = function () { _enter(); };
        }

        // Close button
        var closeBtn = document.createElement('button');
        closeBtn.style.cssText = 'background:none;border:none;color:rgba(226,232,240,0.5);font-size:1.2rem;cursor:pointer;padding:4px;margin-left:4px;';
        closeBtn.textContent = '\u2715';
        closeBtn.onclick = function () { window.dismissTournament2(); };

        inner.appendChild(trophy);
        inner.appendChild(nameEl);
        inner.appendChild(div1);
        inner.appendChild(timerWrap);
        inner.appendChild(div2);
        inner.appendChild(rankEl);
        inner.appendChild(prizeEl);
        inner.appendChild(enterBtn);
        inner.appendChild(closeBtn);
        bar.appendChild(inner);

        bar.classList.add('active');
        document.body.appendChild(bar);
        _barEl = bar;
        _startTick();
    }

    // ── Enter tournament ───────────────────────────────────────────────────
    function _enter() {
        var d = _ensure();
        if (d.entered) return;
        var bal = (typeof window.balance === 'number') ? window.balance : 0;
        if (bal < d.fee) { _toast('Not enough balance to enter!'); return; }
        window.balance = bal - d.fee;
        if (typeof window.updateBalanceDisplay === 'function') window.updateBalanceDisplay();
        d.entered = true;
        d.rank = Math.floor(Math.random() * 20) + 1;
        d.score = Math.floor(Math.random() * 1000) + 500;
        _saveData(d);
        _toast('\uD83C\uDFC6 Tournament entered! Good luck!');
        _createBar();
    }

    // ── Countdown tick ─────────────────────────────────────────────────────
    function _startTick() {
        if (_tickTimer) clearInterval(_tickTimer);
        _tickTimer = setInterval(function () {
            var d = _loadData();
            if (!d) return;
            var remaining = d.endTime - Date.now();
            var el = document.getElementById('tbar2Timer');
            if (el) el.textContent = _fmtTime(remaining);
            if (remaining <= 3600000) {
                var wrap = el ? el.parentNode : null;
                if (wrap) wrap.classList.add('urgent');
            }
            if (remaining <= 0) {
                clearInterval(_tickTimer);
                _toast('\uD83C\uDFC6 Tournament ended! New one starting...');
                localStorage.removeItem(STORAGE_KEY);
                setTimeout(_createBar, 2000);
            }
        }, TICK_INTERVAL);
    }

    // ── Track spin ─────────────────────────────────────────────────────────
    function _trackSpin() {
        if (_isQA()) return;
        var d = _loadData();
        if (!d || !d.entered) return;
        d.score += Math.floor(Math.random() * 200) + 50;
        var shift = Math.floor(Math.random() * 5) - 2;
        d.rank = Math.max(1, Math.min(50, d.rank + shift));
        _saveData(d);
        var el = document.getElementById('tbar2Rank');
        if (el) el.textContent = '#' + d.rank;
    }

    // ── Dismiss ────────────────────────────────────────────────────────────
    function _dismiss() {
        if (_barEl && _barEl.parentNode) _barEl.parentNode.removeChild(_barEl);
        if (_tickTimer) { clearInterval(_tickTimer); _tickTimer = null; }
    }

    // ── Public API ─────────────────────────────────────────────────────────
    window._tournament2TrackSpin = _trackSpin;
    window.dismissTournament2 = _dismiss;

    // ── Init ───────────────────────────────────────────────────────────────
    function _init() {
        if (_isQA()) return;
        _createBar();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { setTimeout(_init, 800); });
    } else {
        setTimeout(_init, 800);
    }

})();
