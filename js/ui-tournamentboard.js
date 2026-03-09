/* ui-tournamentboard.js -- Tournament Leaderboard
 * Sprint 48: Fixed bottom collapsible leaderboard with simulated tournament.
 * 10 players, hourly resets, top 3 get medal styling, auto-updates on spin.
 */
(function () {
    'use strict';

    var STORAGE_KEY = 'ms_tournamentBoard';
    var TOURNAMENT_DURATION_MS = 3600000; // 1 hour
    var NUM_PLAYERS = 10;
    var PRIZES = [100, 50, 25];
    var MEDAL_COLORS = ['#ffd700', '#c0c0c0', '#cd7f32'];
    var MEDAL_LABELS = ['1st', '2nd', '3rd'];

    var GENERATED_NAMES = [
        'LuckyAce', 'NeonSpin', 'VegasKing', 'SlotQueen',
        'JackpotJoe', 'MysticBet', 'ReelRider', 'ChipMaster',
        'GoldenHand', 'StarRoller'
    ];

    var _boardEl = null;
    var _collapsed = false;
    var _players = [];
    var _tournamentStart = 0;
    var _playerIndex = -1;

    // ── Persistence ────────────────────────────────────────────────────────
    function _load() {
        try {
            var data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
            _collapsed = data.collapsed === true;
            _tournamentStart = typeof data.tournamentStart === 'number' ? data.tournamentStart : 0;
            _players = Array.isArray(data.players) ? data.players : [];
            _playerIndex = typeof data.playerIndex === 'number' ? data.playerIndex : -1;
        } catch (e) {
            _collapsed = false;
            _tournamentStart = 0;
            _players = [];
            _playerIndex = -1;
        }
    }

    function _save() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                collapsed: _collapsed,
                tournamentStart: _tournamentStart,
                players: _players,
                playerIndex: _playerIndex
            }));
        } catch (e) { /* silent */ }
    }

    // ── Tournament logic ───────────────────────────────────────────────────
    function _shouldReset() {
        return !_tournamentStart || (Date.now() - _tournamentStart >= TOURNAMENT_DURATION_MS);
    }

    function _initTournament() {
        _tournamentStart = Date.now();
        _players = [];
        _playerIndex = Math.floor(Math.random() * NUM_PLAYERS);

        for (var i = 0; i < NUM_PLAYERS; i++) {
            _players.push({
                name: GENERATED_NAMES[i],
                score: Math.floor(Math.random() * 200),
                isPlayer: i === _playerIndex
            });
        }
        _players[_playerIndex].name = 'You';
        _players[_playerIndex].score = 0;
        _sortPlayers();
        _save();
    }

    function _sortPlayers() {
        _players.sort(function (a, b) { return b.score - a.score; });
    }

    function _getTimeRemaining() {
        var elapsed = Date.now() - _tournamentStart;
        var remaining = Math.max(0, TOURNAMENT_DURATION_MS - elapsed);
        var mins = Math.floor(remaining / 60000);
        var secs = Math.floor((remaining % 60000) / 1000);
        return (mins < 10 ? '0' : '') + mins + ':' + (secs < 10 ? '0' : '') + secs;
    }

    // ── DOM Creation ───────────────────────────────────────────────────────
    function _createBoard() {
        if (_boardEl) return;

        var board = document.createElement('div');
        board.id = 'tournamentLeaderboard';
        board.style.cssText = 'position:fixed;bottom:0;left:50%;transform:translateX(-50%);' +
            'z-index:10400;width:420px;max-width:95vw;font-family:inherit;' +
            'transition:transform 0.3s ease;';

        // Toggle bar
        var toggleBar = document.createElement('div');
        toggleBar.id = 'tournamentToggle';
        toggleBar.style.cssText = 'background:linear-gradient(135deg,#1a1a2e,#16213e);' +
            'color:#e2e8f0;padding:6px 16px;display:flex;justify-content:space-between;' +
            'align-items:center;cursor:pointer;border-radius:8px 8px 0 0;' +
            'border:1px solid rgba(255,215,0,0.3);border-bottom:none;font-size:12px;' +
            'user-select:none;';

        var titleSpan = document.createElement('span');
        titleSpan.style.cssText = 'font-weight:700;letter-spacing:1px;text-transform:uppercase;';
        titleSpan.textContent = '\uD83C\uDFC6 Tournament';

        var timerSpan = document.createElement('span');
        timerSpan.id = 'tournamentTimer';
        timerSpan.style.cssText = 'font-size:11px;color:#ffd700;font-weight:600;';
        timerSpan.textContent = _getTimeRemaining();

        var arrowSpan = document.createElement('span');
        arrowSpan.id = 'tournamentArrow';
        arrowSpan.style.cssText = 'font-size:14px;transition:transform 0.3s;';
        arrowSpan.textContent = '\u25B2';

        toggleBar.appendChild(titleSpan);
        toggleBar.appendChild(timerSpan);
        toggleBar.appendChild(arrowSpan);
        toggleBar.addEventListener('click', function () {
            _collapsed = !_collapsed;
            _save();
            _applyCollapse();
        });

        // Content area
        var content = document.createElement('div');
        content.id = 'tournamentContent';
        content.style.cssText = 'background:linear-gradient(180deg,#0f0f23,#1a1a2e);' +
            'border:1px solid rgba(255,215,0,0.2);border-top:none;border-radius:0;' +
            'max-height:260px;overflow-y:auto;transition:max-height 0.3s ease,opacity 0.3s;';

        // Prize pool header
        var prizeHeader = document.createElement('div');
        prizeHeader.style.cssText = 'display:flex;justify-content:center;gap:16px;' +
            'padding:8px 12px;border-bottom:1px solid rgba(255,255,255,0.08);';
        for (var p = 0; p < PRIZES.length; p++) {
            var prizeItem = document.createElement('span');
            prizeItem.style.cssText = 'font-size:10px;color:' + MEDAL_COLORS[p] + ';font-weight:600;';
            prizeItem.textContent = MEDAL_LABELS[p] + ': $' + PRIZES[p];
            prizeHeader.appendChild(prizeItem);
        }
        content.appendChild(prizeHeader);

        // Player rows container
        var rowsContainer = document.createElement('div');
        rowsContainer.id = 'tournamentRows';
        content.appendChild(rowsContainer);

        board.appendChild(toggleBar);
        board.appendChild(content);
        document.body.appendChild(board);
        _boardEl = board;

        _applyCollapse();
        _renderRows();
    }

    function _applyCollapse() {
        var content = document.getElementById('tournamentContent');
        var arrow = document.getElementById('tournamentArrow');
        if (!content || !arrow) return;

        if (_collapsed) {
            content.style.maxHeight = '0';
            content.style.opacity = '0';
            content.style.overflow = 'hidden';
            arrow.style.transform = 'rotate(180deg)';
        } else {
            content.style.maxHeight = '260px';
            content.style.opacity = '1';
            content.style.overflow = 'auto';
            arrow.style.transform = 'rotate(0deg)';
        }
    }

    // ── Render rows ────────────────────────────────────────────────────────
    function _renderRows() {
        var container = document.getElementById('tournamentRows');
        if (!container) return;

        while (container.firstChild) {
            container.removeChild(container.firstChild);
        }

        for (var i = 0; i < _players.length; i++) {
            var player = _players[i];
            var row = document.createElement('div');
            row.style.cssText = 'display:flex;align-items:center;padding:5px 12px;' +
                'border-bottom:1px solid rgba(255,255,255,0.05);font-size:12px;' +
                'transition:background 0.2s;';

            if (player.isPlayer) {
                row.style.background = 'rgba(255,215,0,0.08)';
            }

            // Rank
            var rankEl = document.createElement('div');
            rankEl.style.cssText = 'width:28px;font-weight:700;text-align:center;';
            if (i < 3) {
                rankEl.style.color = MEDAL_COLORS[i];
                rankEl.style.fontSize = '14px';
                var medals = ['\uD83E\uDD47', '\uD83E\uDD48', '\uD83E\uDD49'];
                rankEl.textContent = medals[i];
            } else {
                rankEl.style.color = '#94a3b8';
                rankEl.textContent = '#' + (i + 1);
            }

            // Name
            var nameEl = document.createElement('div');
            nameEl.style.cssText = 'flex:1;color:' + (player.isPlayer ? '#ffd700' : '#e2e8f0') + ';' +
                'font-weight:' + (player.isPlayer ? '700' : '400') + ';padding-left:8px;';
            nameEl.textContent = player.name;

            // Score
            var scoreEl = document.createElement('div');
            scoreEl.style.cssText = 'width:70px;text-align:right;color:#4ade80;font-weight:600;';
            scoreEl.textContent = '$' + player.score.toLocaleString();

            row.appendChild(rankEl);
            row.appendChild(nameEl);
            row.appendChild(scoreEl);
            container.appendChild(row);
        }
    }

    // ── Timer update ───────────────────────────────────────────────────────
    function _updateTimer() {
        if (_shouldReset()) {
            _initTournament();
            _renderRows();
        }
        var timerEl = document.getElementById('tournamentTimer');
        if (timerEl) {
            timerEl.textContent = _getTimeRemaining();
        }
    }

    // ── Spin handler ───────────────────────────────────────────────────────
    function _onSpinComplete(e) {
        if (_shouldReset()) {
            _initTournament();
        }

        var detail = e && e.detail ? e.detail : {};
        var winAmount = typeof detail.winAmount === 'number' ? detail.winAmount : 0;

        // Update player score
        for (var i = 0; i < _players.length; i++) {
            if (_players[i].isPlayer) {
                _players[i].score += Math.round(winAmount);
                break;
            }
        }

        // Simulate other players getting random scores
        for (var j = 0; j < _players.length; j++) {
            if (!_players[j].isPlayer && Math.random() < 0.3) {
                _players[j].score += Math.floor(Math.random() * 15);
            }
        }

        _sortPlayers();
        _save();
        _renderRows();
    }

    // ── Public API ─────────────────────────────────────────────────────────
    window.dismissTournamentBoard = function () {
        if (_boardEl) {
            _boardEl.style.opacity = '0';
            _boardEl.style.transition = 'opacity 0.3s';
            setTimeout(function () {
                if (_boardEl) {
                    _boardEl.style.display = 'none';
                    _boardEl.style.opacity = '';
                    _boardEl.style.transition = '';
                }
            }, 300);
        }
    };

    // ── Init ───────────────────────────────────────────────────────────────
    function _init() {
        try {
            if (new URLSearchParams(window.location.search).get('noBonus') === '1') return;
        } catch (e) { /* old browser */ }

        _load();
        if (_shouldReset()) {
            _initTournament();
        }
        _createBoard();
        document.addEventListener('spinComplete', _onSpinComplete);
        setInterval(_updateTimer, 1000);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { setTimeout(_init, 700); });
    } else {
        setTimeout(_init, 700);
    }

})();
