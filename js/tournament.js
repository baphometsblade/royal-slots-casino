(function() {
    'use strict';

    var API_BASE = '/api/tournament';
    var MODAL_ID = 'tournament-modal';
    var TROPHY_FAB_ID = 'tournament-fab-button';

    var state = {
        activeTournaments: [],
        myTournaments: [],
        history: [],
        currentTab: 'active',
        enteredTournaments: new Set()
    };

    var style = document.createElement('style');
    style.id = 'tournament-styles';
    style.textContent = `
        #${TROPHY_FAB_ID} {
            position: fixed;
            bottom: 80px;
            right: 20px;
            width: 60px;
            height: 60px;
            border-radius: 50%;
            background: linear-gradient(135deg, #ffd700, #ff8c00);
            border: 3px solid #fff;
            color: #000;
            font-size: 28px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 0 20px rgba(255, 215, 0, 0.6), inset -2px -2px 5px rgba(0, 0, 0, 0.3);
            z-index: 1000;
            transition: transform 0.2s, box-shadow 0.2s;
            font-weight: bold;
        }

        #${TROPHY_FAB_ID}:hover {
            transform: scale(1.1);
            box-shadow: 0 0 30px rgba(255, 215, 0, 0.8), inset -2px -2px 5px rgba(0, 0, 0, 0.3);
        }

        #${TROPHY_FAB_ID}:active {
            transform: scale(0.95);
        }

        #${MODAL_ID} {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.95);
            display: none;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            font-family: Arial, sans-serif;
        }

        #${MODAL_ID}.show {
            display: flex;
        }

        .tournament-modal-container {
            background: rgba(20, 10, 40, 0.95);
            border: 3px solid #ffd700;
            border-radius: 20px;
            max-width: 900px;
            width: 90%;
            max-height: 85vh;
            overflow-y: auto;
            position: relative;
            box-shadow: 0 0 50px rgba(255, 215, 0, 0.3);
            padding: 30px;
        }

        .tournament-modal-close {
            position: absolute;
            top: 10px;
            right: 15px;
            background: none;
            border: none;
            color: #ffd700;
            font-size: 32px;
            cursor: pointer;
            padding: 0;
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .tournament-modal-title {
            color: #ffd700;
            text-align: center;
            margin: 0 0 20px 0;
            font-size: 28px;
            text-shadow: 0 0 10px rgba(255, 215, 0, 0.5);
        }

        .tournament-tabs {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
            border-bottom: 2px solid #ffd700;
        }

        .tournament-tab {
            padding: 12px 20px;
            background: rgba(255, 215, 0, 0.1);
            border: none;
            color: #ffd700;
            font-size: 14px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.2s;
        }

        .tournament-tab.active {
            background: #ffd700;
            color: #000;
        }

        .tournament-tab:hover {
            background: rgba(255, 215, 0, 0.3);
        }

        .tournament-tab-content {
            display: none;
        }

        .tournament-tab-content.active {
            display: block;
        }

        .tournament-cards {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: 20px;
        }

        .tournament-card {
            background: rgba(0, 0, 0, 0.5);
            border: 2px solid #ffd700;
            border-radius: 15px;
            padding: 20px;
            cursor: pointer;
            transition: all 0.2s;
        }

        .tournament-card:hover {
            background: rgba(255, 215, 0, 0.1);
            transform: translateY(-5px);
            box-shadow: 0 10px 30px rgba(255, 215, 0, 0.2);
        }

        .tournament-card-title {
            color: #ffd700;
            font-size: 18px;
            font-weight: bold;
            margin: 0 0 10px 0;
        }

        .tournament-card-badge {
            display: inline-block;
            background: #ffd700;
            color: #000;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: bold;
            margin-bottom: 10px;
        }

        .tournament-card-info {
            color: #ccc;
            font-size: 13px;
            line-height: 1.6;
            margin: 10px 0;
        }

        .tournament-card-info strong {
            color: #ffd700;
        }

        .tournament-card-entry {
            background: rgba(255, 215, 0, 0.2);
            padding: 10px;
            border-radius: 8px;
            margin-top: 15px;
            text-align: center;
        }

        .tournament-detail {
            background: rgba(0, 0, 0, 0.5);
            border: 2px solid #ffd700;
            border-radius: 15px;
            padding: 20px;
            margin-bottom: 20px;
        }

        .tournament-detail-header {
            color: #ffd700;
            font-size: 22px;
            font-weight: bold;
            margin-bottom: 15px;
        }

        .tournament-detail-info {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            margin-bottom: 20px;
            color: #ccc;
            font-size: 13px;
        }

        .tournament-leaderboard {
            margin-top: 20px;
        }

        .tournament-leaderboard-title {
            color: #ffd700;
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 10px;
        }

        .tournament-leaderboard-table {
            width: 100%;
            border-collapse: collapse;
            color: #ccc;
            font-size: 13px;
        }

        .tournament-leaderboard-table th {
            background: rgba(255, 215, 0, 0.2);
            color: #ffd700;
            padding: 10px;
            text-align: left;
            border-bottom: 2px solid #ffd700;
        }

        .tournament-leaderboard-table td {
            padding: 10px;
            border-bottom: 1px solid rgba(255, 215, 0, 0.1);
        }

        .tournament-leaderboard-table tr.my-rank {
            background: rgba(255, 215, 0, 0.1);
        }

        .tournament-button {
            background: linear-gradient(135deg, #ffd700, #ff8c00);
            border: none;
            color: #000;
            padding: 12px 20px;
            border-radius: 8px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.2s;
            width: 100%;
            margin-top: 10px;
        }

        .tournament-button:hover {
            transform: scale(1.02);
            box-shadow: 0 0 20px rgba(255, 215, 0, 0.4);
        }

        .tournament-button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        .tournament-modal-back {
            color: #ffd700;
            background: none;
            border: none;
            cursor: pointer;
            font-size: 14px;
            margin-bottom: 20px;
            text-decoration: underline;
        }

        .tournament-empty {
            text-align: center;
            color: #ffd700;
            padding: 40px 20px;
            font-size: 16px;
        }

        .tournament-entry-modal {
            background: rgba(20, 10, 40, 0.95);
            border: 2px solid #ffd700;
            border-radius: 15px;
            padding: 30px;
            text-align: center;
            color: #ccc;
        }

        .tournament-entry-modal-title {
            color: #ffd700;
            font-size: 20px;
            font-weight: bold;
            margin-bottom: 20px;
        }

        .tournament-entry-modal-content {
            margin: 20px 0;
            line-height: 1.8;
        }

        .tournament-entry-modal-buttons {
            display: flex;
            gap: 10px;
            margin-top: 20px;
            justify-content: center;
        }

        .tournament-entry-modal-buttons button {
            flex: 1;
            padding: 12px;
            border: none;
            border-radius: 8px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.2s;
        }

        .tournament-entry-modal-confirm {
            background: linear-gradient(135deg, #ffd700, #ff8c00);
            color: #000;
        }

        .tournament-entry-modal-confirm:hover {
            transform: scale(1.05);
        }

        .tournament-entry-modal-cancel {
            background: rgba(255, 215, 0, 0.2);
            color: #ffd700;
        }

        .tournament-entry-modal-cancel:hover {
            background: rgba(255, 215, 0, 0.3);
        }

        .tournament-countdown {
            color: #ff8c00;
            font-size: 12px;
            font-weight: bold;
        }
    `;

    if (document.head) {
        document.head.appendChild(style);
    }

    // ─────────────────────────────────────────────────────────────────────
    // API Helper
    // ─────────────────────────────────────────────────────────────────────

    async function api(path, opts) {
        opts = opts || {};
        var tokenKey = typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken';
        var token = localStorage.getItem(tokenKey);

        var headers = Object.assign(
            { 'Content-Type': 'application/json' },
            opts.headers || {}
        );

        if (token) {
            headers['Authorization'] = 'Bearer ' + token;
        }

        try {
            var res = await fetch(path, Object.assign({}, opts, { headers: headers }));
            if (!res.ok) {
                throw new Error('HTTP ' + res.status);
            }
            return res.json();
        } catch (err) {
            console.warn('[Tournament] API error:', err.message);
            throw err;
        }
    }

    // ─────────────────────────────────────────────────────────────────────
    // UI Creation
    // ─────────────────────────────────────────────────────────────────────

    function createFAB() {
        var fab = document.createElement('button');
        fab.id = TROPHY_FAB_ID;
        fab.textContent = '🏆';
        fab.title = 'Tournaments';
        fab.addEventListener('click', function() {
            if (window.Tournament && window.Tournament.showModal) {
                window.Tournament.showModal();
            }
        });
        document.body.appendChild(fab);
        return fab;
    }

    function createModal() {
        var modal = document.createElement('div');
        modal.id = MODAL_ID;

        var container = document.createElement('div');
        container.className = 'tournament-modal-container';

        var closeBtn = document.createElement('button');
        closeBtn.className = 'tournament-modal-close';
        closeBtn.textContent = '×';
        closeBtn.addEventListener('click', closeModal);
        container.appendChild(closeBtn);

        var title = document.createElement('h2');
        title.className = 'tournament-modal-title';
        title.textContent = '⚔️ TOURNAMENTS';
        container.appendChild(title);

        // Tab navigation
        var tabsDiv = document.createElement('div');
        tabsDiv.className = 'tournament-tabs';

        var tabs = ['active', 'my', 'history'];
        var tabLabels = { active: 'Active', my: 'My Tournaments', history: 'History' };

        tabs.forEach(function(tab) {
            var btn = document.createElement('button');
            btn.className = 'tournament-tab' + (tab === 'active' ? ' active' : '');
            btn.textContent = tabLabels[tab];
            btn.addEventListener('click', function() {
                switchTab(tab);
            });
            tabsDiv.appendChild(btn);
        });

        container.appendChild(tabsDiv);

        // Tab contents
        tabs.forEach(function(tab) {
            var content = document.createElement('div');
            content.className = 'tournament-tab-content' + (tab === 'active' ? ' active' : '');
            content.id = 'tournament-tab-' + tab;
            content.style.minHeight = '300px';
            container.appendChild(content);
        });

        modal.appendChild(container);
        document.body.appendChild(modal);
        return modal;
    }

    function switchTab(tab) {
        state.currentTab = tab;

        // Update button state
        document.querySelectorAll('.tournament-tab').forEach(function(btn) {
            btn.classList.remove('active');
        });
        event.target.classList.add('active');

        // Update content visibility
        document.querySelectorAll('.tournament-tab-content').forEach(function(content) {
            content.classList.remove('active');
        });
        var activeContent = document.getElementById('tournament-tab-' + tab);
        if (activeContent) {
            activeContent.classList.add('active');
        }

        // Load content
        if (tab === 'active') {
            renderActiveTournaments();
        } else if (tab === 'my') {
            renderMyTournaments();
        } else if (tab === 'history') {
            renderHistory();
        }
    }

    // ─────────────────────────────────────────────────────────────────────
    // Data Loading
    // ─────────────────────────────────────────────────────────────────────

    async function loadActiveTournaments() {
        try {
            var data = await api(API_BASE + '/active');
            state.activeTournaments = data.tournaments || [];
        } catch (err) {
            console.warn('[Tournament] Failed to load active tournaments:', err);
            state.activeTournaments = [];
        }
    }

    async function loadMyTournaments() {
        var tokenKey = typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken';
        var token = localStorage.getItem(tokenKey);
        if (!token) return;

        try {
            var data = await api(API_BASE + '/active');
            state.myTournaments = data.tournaments || [];
        } catch (err) {
            console.warn('[Tournament] Failed to load my tournaments:', err);
            state.myTournaments = [];
        }
    }

    async function loadHistory() {
        try {
            var data = await api(API_BASE + '/history');
            state.history = data.history || [];
        } catch (err) {
            console.warn('[Tournament] Failed to load history:', err);
            state.history = [];
        }
    }

    // ─────────────────────────────────────────────────────────────────────
    // Rendering
    // ─────────────────────────────────────────────────────────────────────

    function renderActiveTournaments() {
        var content = document.getElementById('tournament-tab-active');
        if (!content) return;

        if (state.activeTournaments.length === 0) {
            content.innerHTML = '<div class="tournament-empty">No active tournaments. Check back soon!</div>';
            return;
        }

        var html = '<div class="tournament-cards">';

        state.activeTournaments.forEach(function(t) {
            var entryFee = t.entry_fee > 0
                ? '💎 ' + Math.round(t.entry_fee) + ' gems'
                : 'FREE';

            html += '<div class="tournament-card" data-tournament-id="' + t.id + '">' +
                '<div class="tournament-card-title">' + escapeHtml(t.name) + '</div>' +
                '<div class="tournament-card-badge">' + t.type.toUpperCase() + '</div>' +
                '<div class="tournament-card-info">' +
                '<strong>Entry:</strong> ' + entryFee + '<br>' +
                '<strong>Prize Pool:</strong> ' + Math.round(t.prize_pool) + ' gems<br>' +
                '<strong>Participants:</strong> ' + (t.participant_count || 0) + '<br>' +
                '<div class="tournament-countdown"><strong>Time Left:</strong> ' + (t.time_remaining || '?') + '</div>' +
                '</div>' +
                '<button class="tournament-button" onclick="Tournament.showDetails(' + t.id + ')">View Details</button>' +
                '</div>';
        });

        html += '</div>';
        content.innerHTML = html;
    }

    function renderMyTournaments() {
        var content = document.getElementById('tournament-tab-my');
        if (!content) return;

        if (state.myTournaments.length === 0) {
            content.innerHTML = '<div class="tournament-empty">No tournaments entered yet. Join one to start competing!</div>';
            return;
        }

        var html = '<div class="tournament-cards">';

        state.myTournaments.forEach(function(t) {
            html += '<div class="tournament-card">' +
                '<div class="tournament-card-title">' + escapeHtml(t.name) + '</div>' +
                '<div class="tournament-card-badge">' + t.type.toUpperCase() + '</div>' +
                '<div class="tournament-card-info">' +
                '<strong>Your Rank:</strong> Loading...<br>' +
                '<strong>Prize Pool:</strong> ' + Math.round(t.prize_pool) + ' gems<br>' +
                '</div>' +
                '<button class="tournament-button" onclick="Tournament.showDetails(' + t.id + ')">View Leaderboard</button>' +
                '</div>';
        });

        html += '</div>';
        content.innerHTML = html;
    }

    function renderHistory() {
        var content = document.getElementById('tournament-tab-history');
        if (!content) return;

        if (state.history.length === 0) {
            content.innerHTML = '<div class="tournament-empty">No tournament history yet.</div>';
            return;
        }

        var html = '<div class="tournament-cards">';

        state.history.forEach(function(t) {
            html += '<div class="tournament-card">' +
                '<div class="tournament-card-title">' + escapeHtml(t.name) + '</div>' +
                '<div class="tournament-card-badge">' + t.type.toUpperCase() + '</div>' +
                '<div class="tournament-card-info">' +
                '<strong>Prize Pool:</strong> ' + Math.round(t.prize_pool) + ' gems<br>' +
                '<strong>Participants:</strong> ' + (t.participants || 0) + '<br>' +
                '<strong>Ended:</strong> ' + (t.end_date || '?') +
                '</div>' +
                '</div>';
        });

        html += '</div>';
        content.innerHTML = html;
    }

    function escapeHtml(str) {
        var div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    async function showTournamentDetails(id) {
        try {
            var data = await api(API_BASE + '/' + id);
            var t = data.tournament;
            var leaderboard = data.leaderboard || [];
            var prizes = data.prizes || [];

            var content = document.getElementById('tournament-tab-active');
            if (!content) return;

            var html = '<button class="tournament-modal-back" onclick="Tournament.closeDetails()">← Back</button>';

            html += '<div class="tournament-detail">' +
                '<div class="tournament-detail-header">' + escapeHtml(t.name) + '</div>' +
                '<div class="tournament-detail-info">' +
                '<div><strong>Type:</strong> ' + (t.type || '?').toUpperCase() + '</div>' +
                '<div><strong>Entry Fee:</strong> ' + (t.entry_fee > 0 ? '💎 ' + Math.round(t.entry_fee) : 'FREE') + '</div>' +
                '<div><strong>Prize Pool:</strong> ' + Math.round(t.prize_pool) + ' gems</div>' +
                '<div><strong>Time Remaining:</strong> ' + (t.time_remaining || '?') + '</div>' +
                '</div>' +
                '<p style="color: #ccc; font-size: 13px; margin: 10px 0;">' + escapeHtml(t.description || '') + '</p>' +
                '<button class="tournament-button" onclick="Tournament.enterTournament(' + id + ')">Enter Tournament</button>' +
                '</div>';

            if (leaderboard.length > 0) {
                html += '<div class="tournament-leaderboard">' +
                    '<div class="tournament-leaderboard-title">Leaderboard (Top 20)</div>' +
                    '<table class="tournament-leaderboard-table">' +
                    '<thead><tr>' +
                    '<th>Rank</th>' +
                    '<th>Player</th>' +
                    '<th>Score</th>' +
                    '</tr></thead>' +
                    '<tbody>';

                leaderboard.forEach(function(entry) {
                    html += '<tr>' +
                        '<td>#' + entry.rank + '</td>' +
                        '<td>' + escapeHtml(entry.username) + '</td>' +
                        '<td>' + Math.round(entry.score) + '</td>' +
                        '</tr>';
                });

                html += '</tbody></table></div>';
            }

            if (prizes.length > 0) {
                html += '<div style="margin-top: 20px;">' +
                    '<div style="color: #ffd700; font-size: 14px; font-weight: bold; margin-bottom: 10px;">Prizes</div>' +
                    '<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px;">';

                prizes.slice(0, 10).forEach(function(p) {
                    html += '<div style="background: rgba(255, 215, 0, 0.1); padding: 10px; border-radius: 8px; text-align: center; color: #ccc; font-size: 12px;">' +
                        '<div style="color: #ffd700; font-weight: bold;">🥇 #' + p.rank + '</div>' +
                        '<div style="margin-top: 5px;">💎 ' + p.prize_gems + ' gems</div>' +
                        '</div>';
                });

                html += '</div></div>';
            }

            content.innerHTML = html;
        } catch (err) {
            console.warn('[Tournament] Failed to show details:', err);
        }
    }

    async function enterTournament(id) {
        try {
            var data = await api(API_BASE + '/' + id, {
                method: 'POST'
            });

            if (data.success || data.entry_id) {
                showToast('✅ Entered tournament! Start spinning to climb the leaderboard.', 'success', 4000);
                state.enteredTournaments.add(id);
                switchTab('my');
            } else {
                showToast('⚠️ ' + (data.error || 'Failed to enter tournament'), 'warning', 4000);
            }
        } catch (err) {
            showToast('⚠️ ' + (err.message || 'Failed to enter tournament'), 'warning', 4000);
            console.warn('[Tournament] Entry failed:', err);
        }
    }

    function showToast(msg, type, duration) {
        // Use global showToast if available
        if (typeof window.showToast === 'function') {
            window.showToast(msg, type, duration);
        } else {
            alert(msg);
        }
    }

    // ─────────────────────────────────────────────────────────────────────
    // Public API
    // ─────────────────────────────────────────────────────────────────────

    var publicAPI = {
        init: function() {
            createFAB();
            createModal();
        },

        showModal: function() {
            var modal = document.getElementById(MODAL_ID);
            if (modal) {
                modal.classList.add('show');
            }
            loadActiveTournaments().then(renderActiveTournaments);
        },

        closeModal: function() {
            var modal = document.getElementById(MODAL_ID);
            if (modal) {
                modal.classList.remove('show');
            }
        },

        showDetails: function(id) {
            showTournamentDetails(id);
        },

        closeDetails: function() {
            renderActiveTournaments();
        },

        enterTournament: function(id) {
            enterTournament(id);
        },

        recordSpin: function(result) {
            // Called from spin hook to record tournament spin
            if (!state.enteredTournaments || state.enteredTournaments.size === 0) return;

            var tokenKey = typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken';
            var token = localStorage.getItem(tokenKey);
            if (!token) return;

            state.enteredTournaments.forEach(function(id) {
                api(API_BASE + '/' + id + '/record-spin', {
                    method: 'POST',
                    body: JSON.stringify({
                        winAmount: result.winAmount || 0,
                        spins: 1,
                        betAmount: result.betAmount || 0
                    })
                }).catch(function(err) {
                    console.warn('[Tournament] Record spin failed:', err);
                });
            });
        }
    };

    window.Tournament = publicAPI;

})();
