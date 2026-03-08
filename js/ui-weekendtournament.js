/* ui-weekendtournament.js — Weekend Tournament with Leaderboard
 * Sprint 33: Saturday/Sunday tournament with fake leaderboard and score tracking.
 * Dynamically creates its own DOM elements (no static HTML required).
 */
(function () {
    'use strict';

    // ── Constants ────────────────────────────────────────────────────────────
    var STORAGE_KEY = 'ms_weekendTournamentData';
    var FAKE_PLAYERS = [
        'CryptoKing', 'LuckyAce', 'NightOwl', 'DiamondHands', 'SpinMaster',
        'GoldRush', 'StarPlayer', 'WildCard', 'JackpotJane', 'BigSpender'
    ];
    var PRIZE_TIERS = ['$200', '$100', '$50', '$25', '$15', '$10', '$10', '$5', '$5', '$5'];

    var _barEl       = null;
    var _leaderEl    = null;
    var _expanded    = false;
    var _tickInterval = null;

    // ── Helpers ──────────────────────────────────────────────────────────────
    function _isWeekend() {
        var day = new Date().getDay();
        return day === 0 || day === 6; // Sunday or Saturday
    }

    function _weekNumber() {
        // ISO week number (approximate: sufficient for seeding)
        var d = new Date();
        var start = new Date(d.getFullYear(), 0, 1);
        var diff = d.getTime() - start.getTime();
        return Math.floor(diff / (7 * 24 * 3600 * 1000));
    }

    function _seeded(seed) {
        var s = seed % 2147483647;
        if (s <= 0) s += 2147483646;
        return function () {
            s = s * 16807 % 2147483647;
            return (s - 1) / 2147483646;
        };
    }

    function _endOfSunday() {
        var now = new Date();
        var day = now.getDay();
        // Days until end of Sunday
        var daysToSunday = (day === 0) ? 0 : (7 - day);
        var endSun = new Date(now);
        endSun.setDate(endSun.getDate() + daysToSunday);
        endSun.setHours(23, 59, 59, 999);
        return endSun;
    }

    function _fmtCountdown(ms) {
        if (ms <= 0) return '00:00:00';
        var secs = Math.floor(ms / 1000);
        var h = Math.floor(secs / 3600);
        var m = Math.floor((secs % 3600) / 60);
        var s = secs % 60;
        return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
    }

    // ── Persistence ─────────────────────────────────────────────────────────
    function _load() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : {};
        } catch (e) { return {}; }
    }

    function _save(data) {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (e) {}
    }

    function _getUserScore() {
        var data = _load();
        var wk = _weekNumber();
        if (data.week !== wk) {
            // Reset for new week
            data.week = wk;
            data.score = 0;
            _save(data);
        }
        return data.score || 0;
    }

    function _addScore(points) {
        var data = _load();
        var wk = _weekNumber();
        if (data.week !== wk) {
            data.week = wk;
            data.score = 0;
        }
        data.score = (data.score || 0) + points;
        _save(data);
        return data.score;
    }

    // ── Generate fake leaderboard ───────────────────────────────────────────
    function _generateLeaderboard(userScore) {
        var rng = _seeded(_weekNumber() * 9973 + 42);
        var entries = [];
        for (var i = 0; i < FAKE_PLAYERS.length; i++) {
            entries.push({
                name: FAKE_PLAYERS[i],
                score: Math.floor(rng() * 4000 + 500),
                isUser: false
            });
        }
        // Sort descending
        entries.sort(function (a, b) { return b.score - a.score; });

        // Insert user
        var userName = (typeof currentUser !== 'undefined' && currentUser)
            ? (currentUser.username || 'You') : 'You';
        var userEntry = { name: userName, score: userScore, isUser: true };

        // Find insertion point
        var inserted = false;
        for (var j = 0; j < entries.length; j++) {
            if (userScore >= entries[j].score) {
                entries.splice(j, 0, userEntry);
                inserted = true;
                break;
            }
        }
        if (!inserted) entries.push(userEntry);

        // Cap to top 10
        return entries.slice(0, 10);
    }

    // ── DOM creation ────────────────────────────────────────────────────────
    function _createBar() {
        if (_barEl) return;

        var bar = document.createElement('div');
        bar.id = 'weekendTournamentBar';
        bar.style.cssText = 'position:fixed;bottom:0;left:0;right:0;z-index:10100;' +
            'background:linear-gradient(90deg,#1a1a2e,#16213e);border-top:2px solid #fbbf24;' +
            'padding:10px 20px;display:flex;align-items:center;justify-content:space-between;' +
            'font-size:14px;color:#e0e0e0;cursor:pointer;transition:transform 0.3s;';
        bar.addEventListener('click', function () {
            if (typeof window.toggleWeekendLeaderboard === 'function') window.toggleWeekendLeaderboard();
        });

        // Left: trophy + title
        var leftPart = document.createElement('div');
        leftPart.style.cssText = 'display:flex;align-items:center;gap:10px;';

        var trophy = document.createElement('span');
        trophy.style.fontSize = '20px';
        trophy.textContent = '\uD83C\uDFC6';
        leftPart.appendChild(trophy);

        var titleSpan = document.createElement('span');
        titleSpan.style.cssText = 'font-weight:800;color:#fbbf24;';
        titleSpan.textContent = 'WEEKEND TOURNAMENT';
        leftPart.appendChild(titleSpan);

        var rankSpan = document.createElement('span');
        rankSpan.id = 'wtRank';
        rankSpan.style.cssText = 'color:#ccc;font-size:13px;';
        rankSpan.textContent = '';
        leftPart.appendChild(rankSpan);

        bar.appendChild(leftPart);

        // Right: countdown
        var rightPart = document.createElement('div');
        rightPart.style.cssText = 'display:flex;align-items:center;gap:10px;';

        var timerLabel = document.createElement('span');
        timerLabel.style.cssText = 'color:#888;font-size:12px;';
        timerLabel.textContent = 'Ends in:';
        rightPart.appendChild(timerLabel);

        var timerVal = document.createElement('span');
        timerVal.id = 'wtTimer';
        timerVal.style.cssText = 'font-weight:700;color:#fbbf24;font-variant-numeric:tabular-nums;';
        timerVal.textContent = '--:--:--';
        rightPart.appendChild(timerVal);

        var expandIcon = document.createElement('span');
        expandIcon.id = 'wtExpandIcon';
        expandIcon.style.cssText = 'font-size:16px;transition:transform 0.2s;';
        expandIcon.textContent = '\u25B2';
        rightPart.appendChild(expandIcon);

        bar.appendChild(rightPart);
        document.body.appendChild(bar);
        _barEl = bar;
    }

    function _createLeaderboard() {
        if (_leaderEl) return;

        var panel = document.createElement('div');
        panel.id = 'weekendLeaderboard';
        panel.style.cssText = 'position:fixed;bottom:46px;left:50%;transform:translateX(-50%) scaleY(0);' +
            'z-index:10099;background:linear-gradient(180deg,#0f1629,#1a1a2e);border:2px solid #fbbf24;' +
            'border-radius:16px 16px 0 0;width:380px;max-width:95vw;max-height:420px;overflow-y:auto;' +
            'padding:16px 0;transform-origin:bottom center;transition:transform 0.25s ease;';

        // Header
        var header = document.createElement('div');
        header.style.cssText = 'text-align:center;font-size:18px;font-weight:900;color:#fbbf24;' +
            'padding:0 16px 12px;border-bottom:1px solid rgba(251,191,36,0.2);margin-bottom:8px;';
        header.textContent = '\uD83C\uDFC6 Leaderboard \u2014 Top 10';
        panel.appendChild(header);

        // Table container
        var tableContainer = document.createElement('div');
        tableContainer.id = 'wtLeaderRows';
        tableContainer.style.cssText = 'padding:0 12px;';
        panel.appendChild(tableContainer);

        // Prize info
        var prizeInfo = document.createElement('div');
        prizeInfo.style.cssText = 'text-align:center;font-size:11px;color:#888;padding:10px 16px 0;' +
            'border-top:1px solid rgba(251,191,36,0.15);margin-top:8px;';
        prizeInfo.textContent = 'Prizes: ' + PRIZE_TIERS.join(' / ');
        panel.appendChild(prizeInfo);

        document.body.appendChild(panel);
        _leaderEl = panel;
    }

    function _renderLeaderboard() {
        var container = document.getElementById('wtLeaderRows');
        if (!container) return;

        // Clear existing
        while (container.firstChild) container.removeChild(container.firstChild);

        var userScore = _getUserScore();
        var board = _generateLeaderboard(userScore);

        // Update rank in bar
        var userRank = -1;
        for (var i = 0; i < board.length; i++) {
            if (board[i].isUser) { userRank = i + 1; break; }
        }
        var rankEl = document.getElementById('wtRank');
        if (rankEl && userRank > 0) {
            rankEl.textContent = '| Rank #' + userRank + ' \u2022 ' + userScore.toLocaleString() + ' pts';
        }

        // Build rows
        for (var j = 0; j < board.length; j++) {
            var row = document.createElement('div');
            row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;' +
                'padding:8px 10px;border-radius:8px;margin-bottom:4px;' +
                (board[j].isUser
                    ? 'background:rgba(251,191,36,0.12);border:1px solid rgba(251,191,36,0.3);'
                    : 'background:rgba(255,255,255,0.03);');

            var leftSide = document.createElement('div');
            leftSide.style.cssText = 'display:flex;align-items:center;gap:10px;';

            var rankBadge = document.createElement('span');
            rankBadge.style.cssText = 'width:28px;height:28px;border-radius:50%;display:flex;' +
                'align-items:center;justify-content:center;font-size:13px;font-weight:800;' +
                'background:' + (j < 3 ? '#fbbf24' : '#333') + ';color:' + (j < 3 ? '#000' : '#ccc') + ';';
            rankBadge.textContent = String(j + 1);
            leftSide.appendChild(rankBadge);

            var nameSpan = document.createElement('span');
            nameSpan.style.cssText = 'font-weight:' + (board[j].isUser ? '800' : '500') + ';' +
                'color:' + (board[j].isUser ? '#fbbf24' : '#e0e0e0') + ';font-size:14px;';
            nameSpan.textContent = board[j].name + (board[j].isUser ? ' (You)' : '');
            leftSide.appendChild(nameSpan);
            row.appendChild(leftSide);

            var rightSide = document.createElement('div');
            rightSide.style.cssText = 'display:flex;align-items:center;gap:10px;';

            var scoreSpan = document.createElement('span');
            scoreSpan.style.cssText = 'font-weight:700;color:#ccc;font-size:13px;font-variant-numeric:tabular-nums;';
            scoreSpan.textContent = board[j].score.toLocaleString() + ' pts';
            rightSide.appendChild(scoreSpan);

            var prizeSpan = document.createElement('span');
            prizeSpan.style.cssText = 'font-size:12px;color:' + (j < 3 ? '#fbbf24' : '#666') + ';font-weight:700;';
            prizeSpan.textContent = j < PRIZE_TIERS.length ? PRIZE_TIERS[j] : '';
            rightSide.appendChild(prizeSpan);

            row.appendChild(rightSide);
            container.appendChild(row);
        }
    }

    // ── Countdown timer ─────────────────────────────────────────────────────
    function _startTimer() {
        if (_tickInterval) clearInterval(_tickInterval);
        _tickInterval = setInterval(function () {
            var timerEl = document.getElementById('wtTimer');
            if (!timerEl) return;
            var remaining = _endOfSunday().getTime() - Date.now();
            timerEl.textContent = _fmtCountdown(remaining);
            if (remaining <= 0) {
                clearInterval(_tickInterval);
                // Hide bar when tournament ends
                if (_barEl) _barEl.style.transform = 'translateY(100%)';
                if (_leaderEl) _leaderEl.style.transform = 'translateX(-50%) scaleY(0)';
            }
        }, 1000);
    }

    // ── Public API ──────────────────────────────────────────────────────────
    window.toggleWeekendLeaderboard = function () {
        _createLeaderboard();
        _expanded = !_expanded;
        if (_expanded) {
            _renderLeaderboard();
            _leaderEl.style.transform = 'translateX(-50%) scaleY(1)';
        } else {
            _leaderEl.style.transform = 'translateX(-50%) scaleY(0)';
        }
        var icon = document.getElementById('wtExpandIcon');
        if (icon) icon.style.transform = _expanded ? 'rotate(180deg)' : '';
    };

    window._weekendTournamentTrackSpin = function (betAmt) {
        if (!_isWeekend()) return;
        var points = Math.round((betAmt || 0) * 10);
        if (points <= 0) return;
        var newScore = _addScore(points);
        // Update rank display live
        var rankEl = document.getElementById('wtRank');
        if (rankEl) {
            var board = _generateLeaderboard(newScore);
            var rank = -1;
            for (var i = 0; i < board.length; i++) {
                if (board[i].isUser) { rank = i + 1; break; }
            }
            if (rank > 0) {
                rankEl.textContent = '| Rank #' + rank + ' \u2022 ' + newScore.toLocaleString() + ' pts';
            }
        }
        // If leaderboard is expanded, re-render
        if (_expanded) _renderLeaderboard();
    };

    // ── Init ────────────────────────────────────────────────────────────────
    function _init() {
        // QA suppression
        try { if (new URLSearchParams(location.search).get('noBonus') === '1') return; } catch (e) {}

        if (!_isWeekend()) return;

        _createBar();
        _startTimer();

        // Initial rank display
        var score = _getUserScore();
        var rankEl = document.getElementById('wtRank');
        if (rankEl && score > 0) {
            var board = _generateLeaderboard(score);
            var rank = -1;
            for (var i = 0; i < board.length; i++) {
                if (board[i].isUser) { rank = i + 1; break; }
            }
            if (rank > 0) {
                rankEl.textContent = '| Rank #' + rank + ' \u2022 ' + score.toLocaleString() + ' pts';
            }
        }
    }

    // ── Bootstrap ───────────────────────────────────────────────────────────
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _init);
    } else {
        _init();
    }
})();
