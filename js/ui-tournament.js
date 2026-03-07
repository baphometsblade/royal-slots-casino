// Sprint 91: Slot Tournament Leaderboard System
// 4-hour recurring tournaments with simulated leaderboard + player score tracking.
// Hooks displayServerWinResult to accumulate wins as tournament points.
// Top 3 players earn prizes ($50/$25/$10) when cycle resets.
// FAB button (🏆) with floating panel showing leaderboard, countdown, prizes.
(function () {
    'use strict';

    // ── QA suppression ─────────────────────────────────────────
    var qs = window.location.search || '';
    if (qs.indexOf('noBonus=1') !== -1 || qs.indexOf('qaTools=1') !== -1) return;

    // ── Constants ──────────────────────────────────────────────
    var CYCLE_MS           = 4 * 60 * 60 * 1000;  // 4 hours (kept for fake LB cycle)
    var LEADERBOARD_SIZE   = 20;
    var PRIZE_POOL         = [50, 25, 10];         // 1st, 2nd, 3rd
    var STORAGE_KEY        = 'tournamentState';
    var STYLE_ID           = 'tournamentStyles';
    var FAB_Z              = 18800;
    var PANEL_Z            = 18900;
    var TICK_INTERVAL_MS   = 1000;
    var REFRESH_INTERVAL_MS = 30 * 1000;           // 30s real-data refresh

    var TOURNAMENT_NAMES = [
        'High Roller Showdown', 'Spin Masters Cup', 'Jackpot Championship',
        'Diamond League', 'Neon Nights Clash', 'Golden Reels Open',
        'Fortune Seekers Duel', 'Matrix Mayhem', 'Lightning Rounds',
        'Midnight Madness', 'Royal Rumble Spins', 'Cosmic Cash Battle',
        'Thunder Reels Challenge', 'Lucky Dragon Open'
    ];

    var FAKE_NAMES = [
        'AceHigh42', 'LuckyLion', 'SlotKing99', 'NeonQueen',
        'JackpotJoe', 'SpinMaster_X', 'GoldenEagle', 'DiamondDave',
        'CherryBomb77', 'WildCard_K', 'MegaWin_Pro', 'ReelDeal88',
        'RoyalFlush_S', 'StarChaser', 'BonusHunter', 'FortuneFox',
        'SilverStrike', 'ThunderSpin', 'VelvetAce', 'MysticRoller',
        'CasinoPhantom', 'BlazingStar', 'CosmicBet', 'ShadowJack'
    ];

    // ── State ──────────────────────────────────────────────────
    var _state            = null;
    var _fabEl            = null;
    var _panelEl          = null;
    var _tickTimer        = null;
    var _panelOpen        = false;
    var _realLeaderboard  = null;   // cached real API leaderboard rows
    var _realMyStats      = null;   // cached real API myStats

    // ── CSS Injection ──────────────────────────────────────────
    function injectStyles() {
        if (document.getElementById(STYLE_ID)) return;
        var style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = [
            '.tourn-fab{position:fixed;bottom:140px;left:16px;z-index:' + FAB_Z + ';width:48px;height:48px;border-radius:50%;' +
                'background:linear-gradient(135deg,#1a0a2e,#2d1650);border:2px solid rgba(245,158,11,.5);' +
                'color:#f5a623;font-size:22px;display:flex;align-items:center;justify-content:center;' +
                'cursor:pointer;box-shadow:0 4px 16px rgba(0,0,0,.45);transition:transform .2s ease}',
            '.tourn-fab:hover{transform:scale(1.12)}',
            '.tourn-fab-dot{position:absolute;top:2px;right:2px;width:10px;height:10px;border-radius:50%;' +
                'background:#22c55e;border:2px solid #1a0a2e;display:none}',
            '.tourn-fab-dot.tourn-visible{display:block}',
            '.tourn-panel{position:fixed;bottom:200px;left:16px;z-index:' + PANEL_Z + ';width:340px;max-width:calc(100vw - 32px);' +
                'max-height:calc(100vh - 240px);overflow-y:auto;background:linear-gradient(160deg,#0d0d1a,#1a0a2e);' +
                'border:2px solid rgba(245,158,11,.4);border-radius:14px;box-shadow:0 12px 48px rgba(0,0,0,.6);' +
                'padding:20px 18px 16px;opacity:0;transform:translateY(16px) scale(.95);pointer-events:none;' +
                'transition:opacity .25s ease,transform .25s ease}',
            '.tourn-panel.tourn-open{opacity:1;transform:translateY(0) scale(1);pointer-events:auto}',
            '.tourn-header{text-align:center;margin-bottom:14px}',
            '.tourn-title{font-size:16px;font-weight:700;color:#f5c542;letter-spacing:.5px;margin:0 0 4px}',
            '.tourn-timer{font-size:13px;color:#a0a0c0;font-variant-numeric:tabular-nums}',
            '.tourn-prizes{display:flex;justify-content:center;gap:12px;margin-bottom:14px}',
            '.tourn-prize-badge{text-align:center;padding:6px 10px;border-radius:8px;background:rgba(245,158,11,.08);' +
                'border:1px solid rgba(245,158,11,.18)}',
            '.tourn-prize-rank{font-size:11px;color:#a0a0c0;display:block}',
            '.tourn-prize-amount{font-size:15px;font-weight:700;color:#f5c542}',
            '.tourn-your-stats{display:flex;justify-content:space-between;align-items:center;padding:8px 12px;' +
                'border-radius:8px;margin-bottom:12px;background:rgba(34,197,94,.1);border:1px solid rgba(34,197,94,.25)}',
            '.tourn-your-label{font-size:12px;color:#a0a0c0}',
            '.tourn-your-value{font-size:15px;font-weight:700;color:#22c55e}',
            '.tourn-lb{width:100%;border-collapse:collapse;margin-bottom:14px}',
            '.tourn-lb th{font-size:10px;text-transform:uppercase;color:#777;padding:4px 6px;text-align:left;' +
                'border-bottom:1px solid rgba(255,255,255,.06)}',
            '.tourn-lb th:last-child{text-align:right}',
            '.tourn-lb td{font-size:13px;color:#d0d0e0;padding:5px 6px;border-bottom:1px solid rgba(255,255,255,.04)}',
            '.tourn-lb td:first-child{width:28px;text-align:center;color:#888}',
            '.tourn-lb td:last-child{text-align:right;font-variant-numeric:tabular-nums}',
            '.tourn-lb-row-you td{color:#22c55e;font-weight:700;background:rgba(34,197,94,.08)}',
            '.tourn-lb-gold td:first-child{color:#f5c542}',
            '.tourn-lb-silver td:first-child{color:#c0c0d0}',
            '.tourn-lb-bronze td:first-child{color:#cd7f32}',
            '.tourn-close-btn{display:block;width:100%;padding:8px 0;border:1px solid rgba(255,255,255,.12);' +
                'border-radius:8px;background:rgba(255,255,255,.04);color:#a0a0c0;font-size:13px;cursor:pointer;' +
                'transition:background .2s ease,color .2s ease}',
            '.tourn-close-btn:hover{background:rgba(255,255,255,.08);color:#f0f0f0}',
            '@media(max-width:480px){.tourn-panel{width:calc(100vw - 32px);left:16px;bottom:200px}' +
                '.tourn-fab{bottom:130px;left:10px;width:42px;height:42px;font-size:19px}}'
        ].join('\n');
        document.head.appendChild(style);
    }

    // ── Helpers ─────────────────────────────────────────────────
    function getCycleStart(ts) {
        return Math.floor(ts / CYCLE_MS) * CYCLE_MS;
    }

    function seededRandom(seed) {
        var s = seed | 0;
        return function () {
            s = (s + 0x6D2B79F5) | 0;
            var t = Math.imul(s ^ (s >>> 15), 1 | s);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    function fmtDuration(ms) {
        if (ms <= 0) return '0:00:00';
        var totalSec = Math.floor(ms / 1000);
        var h = Math.floor(totalSec / 3600);
        var m = Math.floor((totalSec % 3600) / 60);
        var s = totalSec % 60;
        return h + ':' + (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
    }

    function fmtMoney(v) {
        if (typeof formatMoney === 'function') return formatMoney(v);
        return '$' + (v || 0).toFixed(2);
    }

    function pickTournamentName(cycleSeed) {
        var rng = seededRandom(cycleSeed);
        return TOURNAMENT_NAMES[Math.floor(rng() * TOURNAMENT_NAMES.length)];
    }

    // ── Weekly reset countdown ─────────────────────────────────
    function getMsToNextMonday() {
        var now = new Date();
        var dayOfWeek = now.getUTCDay(); // 0=Sun, 1=Mon, ...
        var daysUntilMonday = dayOfWeek === 1 ? 7 : (8 - dayOfWeek) % 7 || 7;
        var nextMonday = new Date(now);
        nextMonday.setUTCDate(now.getUTCDate() + daysUntilMonday);
        nextMonday.setUTCHours(0, 0, 0, 0);
        return nextMonday - now;
    }

    // ── Real API fetch ─────────────────────────────────────────
    function fetchRealTournamentData() {
        var token = null;
        try {
            var rawToken = localStorage.getItem(
                typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'authToken'
            );
            // Only use token if it is a real server token (not a local prefix token)
            if (rawToken && typeof LOCAL_TOKEN_PREFIX !== 'undefined') {
                if (!rawToken.startsWith(LOCAL_TOKEN_PREFIX)) token = rawToken;
            } else if (rawToken) {
                token = rawToken;
            }
        } catch (e) { /* silent */ }

        var leaderboardPromise = fetch('/api/tournament/leaderboard')
            .then(function (r) { return r.ok ? r.json() : null; })
            .catch(function () { return null; });

        var myStatsPromise;
        if (token) {
            myStatsPromise = fetch('/api/tournament/mystats', {
                headers: { 'Authorization': 'Bearer ' + token }
            })
            .then(function (r) { return r.ok ? r.json() : null; })
            .catch(function () { return null; });
        } else {
            myStatsPromise = Promise.resolve(null);
        }

        return Promise.all([leaderboardPromise, myStatsPromise])
            .then(function (results) {
                var lb = results[0];
                var ms = results[1];
                // Validate leaderboard is a non-empty array
                if (!Array.isArray(lb) || lb.length === 0) lb = null;
                return { leaderboard: lb, myStats: ms || null };
            })
            .catch(function () {
                return { leaderboard: null, myStats: null };
            });
    }

    function generateFakeLeaderboard(cycleSeed) {
        var rng = seededRandom(cycleSeed + 7919);
        var entries = [];
        var pool = FAKE_NAMES.slice();
        for (var i = pool.length - 1; i > 0; i--) {
            var j = Math.floor(rng() * (i + 1));
            var tmp = pool[i]; pool[i] = pool[j]; pool[j] = tmp;
        }
        var topScore = 300 + Math.floor(rng() * 500);
        for (var k = 0; k < LEADERBOARD_SIZE + 5; k++) {
            var decay = Math.pow(0.78, k);
            var noise = 0.7 + rng() * 0.6;
            var score = Math.round(topScore * decay * noise * 100) / 100;
            if (score < 5) score = 5 + Math.round(rng() * 30 * 100) / 100;
            entries.push({ name: pool[k % pool.length], score: score, isPlayer: false });
        }
        entries.sort(function (a, b) { return b.score - a.score; });
        return entries;
    }

    // ── State persistence ──────────────────────────────────────
    function loadState() {
        var raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            try { _state = JSON.parse(raw); } catch (e) { _state = null; }
        }
        var now = Date.now();
        var cycleStart = getCycleStart(now);
        if (!_state || _state.cycleStart !== cycleStart) {
            handleCycleReset(cycleStart, now);
        }
    }

    function saveState() {
        if (_state) localStorage.setItem(STORAGE_KEY, JSON.stringify(_state));
    }

    function handleCycleReset(newCycleStart, now) {
        var previousState = _state;
        if (previousState && previousState.playerScore > 0) {
            var prevLb = generateFakeLeaderboard(previousState.cycleSeed);
            var prevRank = computePlayerRank(prevLb, previousState.playerScore);
            if (prevRank >= 1 && prevRank <= 3) {
                creditPrize(PRIZE_POOL[prevRank - 1], prevRank);
            }
        }
        var cycleSeed = Math.floor(newCycleStart / 1000);
        _state = {
            cycleStart: newCycleStart,
            cycleSeed: cycleSeed,
            playerScore: 0,
            tournamentName: pickTournamentName(cycleSeed)
        };
        saveState();
    }

    function creditPrize(amount, rank) {
        if (typeof balance !== 'undefined') {
            balance += amount;
            balance = Math.round(balance * 100) / 100;
            if (typeof updateBalance === 'function') updateBalance();
            if (typeof saveBalance === 'function') saveBalance();
        }
        var ordinal = rank === 1 ? '1st' : rank === 2 ? '2nd' : '3rd';
        if (typeof showWinToast === 'function') {
            showWinToast('Tournament ' + ordinal + ' Place! +' + fmtMoney(amount), 'epic');
        }
    }

    function buildFullLeaderboard() {
        var lb = generateFakeLeaderboard(_state.cycleSeed);
        var playerName = 'You';
        if (typeof currentUser !== 'undefined' && currentUser && currentUser.username) {
            playerName = currentUser.username;
        }
        lb.push({ name: playerName, score: _state.playerScore, isPlayer: true });
        lb.sort(function (a, b) { return b.score - a.score; });
        return lb;
    }

    function computePlayerRank(fakeLb, playerScore) {
        var rank = 1;
        for (var i = 0; i < fakeLb.length; i++) {
            if (fakeLb[i].score > playerScore) rank++;
            else break;
        }
        return rank;
    }

    // ── DOM Construction ───────────────────────────────────────
    function createFAB() {
        _fabEl = document.createElement('div');
        _fabEl.className = 'tourn-fab';
        _fabEl.title = 'Tournament Leaderboard';
        _fabEl.appendChild(document.createTextNode('\uD83C\uDFC6'));

        var dot = document.createElement('span');
        dot.className = 'tourn-fab-dot';
        _fabEl.appendChild(dot);

        _fabEl.addEventListener('click', function () {
            if (_panelOpen) closeTournamentPanel();
            else openTournamentPanel();
        });
        document.body.appendChild(_fabEl);
    }

    function createPanel() {
        _panelEl = document.createElement('div');
        _panelEl.className = 'tourn-panel';
        document.body.appendChild(_panelEl);
    }

    function renderPanel() {
        if (!_panelEl || !_state) return;
        while (_panelEl.firstChild) _panelEl.removeChild(_panelEl.firstChild);

        var now = Date.now();
        var currentCycleStart = getCycleStart(now);
        if (_state.cycleStart !== currentCycleStart) {
            handleCycleReset(currentCycleStart, now);
        }

        // ── Determine data source: real API or fake fallback ───
        var usingRealData = _realLeaderboard && _realLeaderboard.length > 0;
        var remaining = usingRealData ? getMsToNextMonday() : (_state.cycleStart + CYCLE_MS) - now;

        // Build display leaderboard
        var medals = ['\uD83E\uDD47', '\uD83E\uDD48', '\uD83E\uDD49'];
        var displayLb;   // array of { rank, name, score, isPlayer }
        var playerRank = 0;
        var playerScore = 0;

        if (usingRealData) {
            // Map API rows to display shape
            displayLb = _realLeaderboard.map(function (row) {
                return {
                    rank: row.rank,
                    name: row.username || '?',
                    score: Math.round(row.score || 0),
                    isPlayer: false
                };
            });
            if (_realMyStats) {
                playerRank  = _realMyStats.rank  || 0;
                playerScore = Math.round(_realMyStats.score || 0);
                // Mark the player's row in the leaderboard if it's in top-N
                for (var ri = 0; ri < displayLb.length; ri++) {
                    if (displayLb[ri].rank === playerRank) {
                        displayLb[ri].isPlayer = true;
                        break;
                    }
                }
            }
        } else {
            // Fake leaderboard fallback — inject player entry and find rank
            var fullLb = buildFullLeaderboard();
            displayLb = [];
            for (var fi = 0; fi < fullLb.length; fi++) {
                displayLb.push({ rank: fi + 1, name: fullLb[fi].name, score: fullLb[fi].score, isPlayer: fullLb[fi].isPlayer });
                if (fullLb[fi].isPlayer) { playerRank = fi + 1; playerScore = fullLb[fi].score; }
            }
        }

        // Header
        var header = document.createElement('div');
        header.className = 'tourn-header';
        var title = document.createElement('div');
        title.className = 'tourn-title';
        title.textContent = _state.tournamentName;
        header.appendChild(title);
        var timer = document.createElement('div');
        timer.className = 'tourn-timer';
        timer.id = 'tournTimer';
        timer.textContent = 'Resets in ' + fmtDuration(remaining);
        header.appendChild(timer);
        _panelEl.appendChild(header);

        // Prize pool
        var prizes = document.createElement('div');
        prizes.className = 'tourn-prizes';
        for (var p = 0; p < PRIZE_POOL.length; p++) {
            var badge = document.createElement('div');
            badge.className = 'tourn-prize-badge';
            var rl = document.createElement('span');
            rl.className = 'tourn-prize-rank';
            rl.textContent = medals[p] + ' ' + (p === 0 ? '1st' : p === 1 ? '2nd' : '3rd');
            badge.appendChild(rl);
            var al = document.createElement('span');
            al.className = 'tourn-prize-amount';
            al.textContent = fmtMoney(PRIZE_POOL[p]);
            badge.appendChild(al);
            prizes.appendChild(badge);
        }
        _panelEl.appendChild(prizes);

        // Player stats row
        var statsRow = document.createElement('div');
        statsRow.className = 'tourn-your-stats';
        var rankInfo = document.createElement('div');
        var rlb = document.createElement('div');
        rlb.className = 'tourn-your-label';
        rlb.textContent = 'Your Rank';
        rankInfo.appendChild(rlb);
        var rv = document.createElement('div');
        rv.className = 'tourn-your-value';
        rv.textContent = playerRank > 0 ? '#' + playerRank : '--';
        rankInfo.appendChild(rv);
        statsRow.appendChild(rankInfo);
        var scoreInfo = document.createElement('div');
        scoreInfo.style.textAlign = 'right';
        var sl = document.createElement('div');
        sl.className = 'tourn-your-label';
        sl.textContent = 'Your Score';
        scoreInfo.appendChild(sl);
        var sv = document.createElement('div');
        sv.className = 'tourn-your-value';
        // Display real score as integer; fake score formatted as money
        sv.textContent = usingRealData ? String(playerScore) : fmtMoney(playerScore);
        scoreInfo.appendChild(sv);
        statsRow.appendChild(scoreInfo);
        _panelEl.appendChild(statsRow);

        // Leaderboard table
        var table = document.createElement('table');
        table.className = 'tourn-lb';
        var thead = document.createElement('thead');
        var headRow = document.createElement('tr');
        var headers = ['#', 'Player', 'Score'];
        for (var h = 0; h < headers.length; h++) {
            var th = document.createElement('th');
            th.textContent = headers[h];
            headRow.appendChild(th);
        }
        thead.appendChild(headRow);
        table.appendChild(thead);

        var tbody = document.createElement('tbody');
        var displayCount = Math.min(displayLb.length, LEADERBOARD_SIZE);
        var playerInTop = false;
        for (var di = 0; di < displayCount; di++) {
            if (displayLb[di].isPlayer) { playerInTop = true; break; }
        }

        for (var i = 0; i < displayCount; i++) {
            var entry = displayLb[i];
            var displayRank = usingRealData ? entry.rank : (i + 1);
            var tr = document.createElement('tr');
            if (entry.isPlayer) tr.className = 'tourn-lb-row-you';
            if (i === 0) tr.classList.add('tourn-lb-gold');
            else if (i === 1) tr.classList.add('tourn-lb-silver');
            else if (i === 2) tr.classList.add('tourn-lb-bronze');

            var tdRank = document.createElement('td');
            // Top 3 get medal emoji, rest get number
            tdRank.textContent = i === 0 ? medals[0] : i === 1 ? medals[1] : i === 2 ? medals[2] : String(displayRank);
            tr.appendChild(tdRank);
            var tdName = document.createElement('td');
            tdName.textContent = entry.isPlayer ? (entry.name + ' (You)') : entry.name;
            tr.appendChild(tdName);
            var tdScore = document.createElement('td');
            // Real data: integer; fake data: money format
            tdScore.textContent = usingRealData ? String(entry.score) : fmtMoney(entry.score);
            tr.appendChild(tdScore);
            tbody.appendChild(tr);
        }

        // If player is not in top N, append separator + player row
        if (!playerInTop && playerRank > 0 && playerRank > displayCount) {
            var sepTr = document.createElement('tr');
            var sepTd = document.createElement('td');
            sepTd.colSpan = 3;
            sepTd.style.cssText = 'text-align:center;color:#555;font-size:11px;padding:4px';
            sepTd.textContent = '\u00B7\u00B7\u00B7';
            sepTr.appendChild(sepTd);
            tbody.appendChild(sepTr);

            var pTr = document.createElement('tr');
            pTr.className = 'tourn-lb-row-you';
            var pTdR = document.createElement('td');
            pTdR.textContent = String(playerRank);
            pTr.appendChild(pTdR);
            var pTdN = document.createElement('td');
            pTdN.textContent = 'You';
            pTr.appendChild(pTdN);
            var pTdS = document.createElement('td');
            pTdS.textContent = usingRealData ? String(playerScore) : fmtMoney(playerScore);
            pTr.appendChild(pTdS);
            tbody.appendChild(pTr);
        }
        table.appendChild(tbody);
        _panelEl.appendChild(table);

        // Close button
        var closeBtn = document.createElement('button');
        closeBtn.className = 'tourn-close-btn';
        closeBtn.textContent = 'Close';
        closeBtn.addEventListener('click', closeTournamentPanel);
        _panelEl.appendChild(closeBtn);

        updateFABDot(playerRank);
    }

    // ── Panel open/close ───────────────────────────────────────
    function openTournamentPanel() {
        if (!_panelEl) createPanel();
        // Render immediately with whatever cached data we have (may be null → fake fallback)
        renderPanel();
        requestAnimationFrame(function() {
            requestAnimationFrame(function() { _panelEl.classList.add('tourn-open'); });
        });
        _panelOpen = true;
        startTick();

        // Fetch real data then re-render with it; start 30s auto-refresh
        fetchRealTournamentData().then(function (data) {
            if (data && data.leaderboard) {
                _realLeaderboard = data.leaderboard;
                _realMyStats     = data.myStats;
                if (_panelOpen) renderPanel();
            }
        }).catch(function () { /* silent */ });

        if (window._tournRefreshInterval) clearInterval(window._tournRefreshInterval);
        window._tournRefreshInterval = setInterval(function () {
            if (!_panelOpen) return;
            fetchRealTournamentData().then(function (data) {
                if (data && data.leaderboard) {
                    _realLeaderboard = data.leaderboard;
                    _realMyStats     = data.myStats;
                    if (_panelOpen) renderPanel();
                }
            }).catch(function () { /* silent */ });
        }, REFRESH_INTERVAL_MS);
    }

    function closeTournamentPanel() {
        if (_panelEl) _panelEl.classList.remove('tourn-open');
        _panelOpen = false;
        stopTick();
        if (window._tournRefreshInterval) {
            clearInterval(window._tournRefreshInterval);
            window._tournRefreshInterval = null;
        }
    }

    // ── Countdown tick ─────────────────────────────────────────
    function startTick() {
        stopTick();
        _tickTimer = setInterval(function () {
            if (!_panelOpen || !_state) return;
            var timerEl = document.getElementById('tournTimer');
            if (!timerEl) return;

            var usingRealData = _realLeaderboard && _realLeaderboard.length > 0;
            if (usingRealData) {
                // Count down to next Monday 00:00 UTC (weekly reset)
                timerEl.textContent = 'Resets in ' + fmtDuration(getMsToNextMonday());
            } else {
                // Fake 4-hour cycle countdown
                var now = Date.now();
                var currentCycleStart = getCycleStart(now);
                if (_state.cycleStart !== currentCycleStart) {
                    handleCycleReset(currentCycleStart, now);
                    renderPanel();
                    return;
                }
                var remaining = (_state.cycleStart + CYCLE_MS) - now;
                timerEl.textContent = 'Resets in ' + fmtDuration(remaining);
            }
        }, TICK_INTERVAL_MS);
    }

    function stopTick() {
        if (_tickTimer) { clearInterval(_tickTimer); _tickTimer = null; }
    }

    // ── FAB notification dot ───────────────────────────────────
    function updateFABDot(rank) {
        if (!_fabEl) return;
        var dot = _fabEl.querySelector('.tourn-fab-dot');
        if (!dot) return;
        if (rank >= 1 && rank <= 3) dot.classList.add('tourn-visible');
        else dot.classList.remove('tourn-visible');
    }

    function refreshFABDot() {
        if (!_state) return;
        var lb = generateFakeLeaderboard(_state.cycleSeed);
        var rank = computePlayerRank(lb, _state.playerScore);
        updateFABDot(rank);
    }

    // ── Hook into displayServerWinResult ───────────────────────
    function hookWinResult() {
        var _orig = window.displayServerWinResult;
        if (typeof _orig !== 'function') return;
        window.displayServerWinResult = function (result, game) {
            _orig.call(this, result, game);
            if (result && result.winAmount > 0 && _state) {
                _state.playerScore = Math.round((_state.playerScore + result.winAmount) * 100) / 100;
                saveState();
                refreshFABDot();
                if (_panelOpen) renderPanel();
            }
        };
    }

    // ── Initialization ─────────────────────────────────────────
    function init() {
        injectStyles();
        loadState();
        setTimeout(function() {
            createFAB();
            hookWinResult();
            refreshFABDot();
        }, 2500);

        setInterval(function () {
            var now = Date.now();
            var currentCycleStart = getCycleStart(now);
            if (_state && _state.cycleStart !== currentCycleStart) {
                handleCycleReset(currentCycleStart, now);
                refreshFABDot();
            }
        }, 60000);
    }

    window.getTournamentState = function () { return _state; };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        setTimeout(init, 0);
    }
}());
