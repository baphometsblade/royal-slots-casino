// ═══════════════════════════════════════════════════════════════════════════
// CASHBACK WIDGET MODULE
// Automatic daily cashback on net losses to keep players from churning
// ═══════════════════════════════════════════════════════════════════════════

(function() {
    'use strict';

    var API_BASE = '/api/cashback';
    var WIDGET_ID = 'cashback-widget';
    var PANEL_ID = 'cashback-panel';

    var state = {
        todayStats: null,
        currentTier: null,
        nextTier: null,
        pendingCashback: null,
        isExpanded: false,
        lastSync: 0
    };

    // ────────────────────────────────────────────────────────────────────────
    // STYLES (embedded inline)
    // ────────────────────────────────────────────────────────────────────────

    var style = document.createElement('style');
    style.id = 'cashback-widget-styles';
    style.textContent = `
        /* Floating cashback widget pill (bottom-right) */
        #${WIDGET_ID} {
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: linear-gradient(135deg, #00a86b, #00c77d);
            color: #fff;
            padding: 12px 18px;
            border-radius: 50px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            z-index: 900;
            box-shadow: 0 4px 20px rgba(0, 168, 107, 0.4);
            display: flex;
            align-items: center;
            gap: 8px;
            user-select: none;
            transition: all 0.3s ease;
            font-family: 'Inter', sans-serif;
        }

        #${WIDGET_ID}:hover {
            box-shadow: 0 6px 30px rgba(0, 168, 107, 0.6);
            transform: translateY(-3px);
        }

        #${WIDGET_ID}.pulse {
            animation: cashbackPulse 1.5s ease-in-out infinite;
        }

        @keyframes cashbackPulse {
            0%, 100% {
                box-shadow: 0 4px 20px rgba(0, 168, 107, 0.4);
            }
            50% {
                box-shadow: 0 4px 40px rgba(0, 168, 107, 0.8);
            }
        }

        .cashback-widget-emoji {
            font-size: 18px;
            display: inline-block;
        }

        .cashback-widget-text {
            white-space: nowrap;
        }

        /* Cashback detail panel */
        #${PANEL_ID} {
            position: fixed;
            bottom: 100px;
            right: 20px;
            width: 380px;
            background: linear-gradient(135deg, #1a1a2e, #16213e);
            border: 2px solid rgba(0, 200, 125, 0.3);
            border-radius: 20px;
            padding: 24px;
            z-index: 901;
            box-shadow: 0 8px 40px rgba(0, 0, 0, 0.6);
            display: none;
            font-family: 'Inter', sans-serif;
            color: #e0e0e0;
            max-height: 90vh;
            overflow-y: auto;
        }

        #${PANEL_ID}.visible {
            display: block;
            animation: slideUp 0.3s ease-out;
        }

        @keyframes slideUp {
            from {
                opacity: 0;
                transform: translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .cashback-panel-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            border-bottom: 2px solid rgba(0, 200, 125, 0.2);
            padding-bottom: 12px;
        }

        .cashback-panel-title {
            font-size: 20px;
            font-weight: 700;
            color: #00c77d;
        }

        .cashback-panel-close {
            background: none;
            border: none;
            color: #aaa;
            font-size: 24px;
            cursor: pointer;
            padding: 0;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: color 0.2s;
        }

        .cashback-panel-close:hover {
            color: #fff;
        }

        .cashback-stats-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            margin-bottom: 20px;
        }

        .cashback-stat-box {
            background: rgba(0, 200, 125, 0.1);
            border: 1px solid rgba(0, 200, 125, 0.2);
            border-radius: 12px;
            padding: 16px;
            text-align: center;
        }

        .cashback-stat-label {
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #aaa;
            margin-bottom: 8px;
        }

        .cashback-stat-value {
            font-size: 20px;
            font-weight: 700;
            color: #00c77d;
        }

        .cashback-tier-section {
            background: linear-gradient(135deg, rgba(0, 200, 125, 0.1), rgba(0, 168, 107, 0.05));
            border: 1px solid rgba(0, 200, 125, 0.2);
            border-radius: 14px;
            padding: 18px;
            margin-bottom: 20px;
        }

        .cashback-tier-label {
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #aaa;
            margin-bottom: 10px;
        }

        .cashback-tier-info {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
        }

        .cashback-tier-current {
            font-size: 18px;
            font-weight: 700;
            color: #00c77d;
        }

        .cashback-tier-rate {
            background: rgba(0, 200, 125, 0.2);
            color: #00c77d;
            padding: 4px 10px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
        }

        .cashback-progress-bar {
            background: rgba(0, 0, 0, 0.4);
            border: 1px solid rgba(0, 200, 125, 0.2);
            border-radius: 10px;
            height: 8px;
            overflow: hidden;
            margin-bottom: 8px;
        }

        .cashback-progress-fill {
            background: linear-gradient(90deg, #00c77d, #00ff88);
            height: 100%;
            border-radius: 10px;
            transition: width 0.3s ease;
        }

        .cashback-progress-text {
            font-size: 11px;
            color: #aaa;
            text-align: right;
        }

        .cashback-next-tier {
            font-size: 12px;
            color: #ccc;
            margin-top: 8px;
            padding: 8px 0;
            border-top: 1px solid rgba(0, 200, 125, 0.1);
        }

        .cashback-claim-section {
            margin-bottom: 20px;
        }

        .cashback-claim-label {
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #aaa;
            margin-bottom: 10px;
        }

        .cashback-claim-box {
            background: rgba(255, 215, 0, 0.1);
            border: 2px solid rgba(255, 215, 0, 0.3);
            border-radius: 12px;
            padding: 16px;
            text-align: center;
            margin-bottom: 12px;
        }

        .cashback-claim-amount {
            font-size: 32px;
            font-weight: 700;
            color: #ffd700;
            margin-bottom: 6px;
        }

        .cashback-claim-desc {
            font-size: 12px;
            color: #ccc;
        }

        .cashback-claim-btn {
            width: 100%;
            background: linear-gradient(135deg, #ffd700, #ffed4e);
            color: #000;
            border: none;
            padding: 14px;
            border-radius: 10px;
            font-size: 14px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.3s;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .cashback-claim-btn:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(255, 215, 0, 0.4);
        }

        .cashback-claim-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        .cashback-history-section {
            border-top: 1px solid rgba(0, 200, 125, 0.2);
            padding-top: 16px;
        }

        .cashback-history-label {
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #aaa;
            margin-bottom: 12px;
        }

        .cashback-history-item {
            background: rgba(0, 0, 0, 0.3);
            border-left: 3px solid rgba(0, 200, 125, 0.3);
            padding: 10px 12px;
            margin-bottom: 8px;
            border-radius: 6px;
            font-size: 12px;
        }

        .cashback-history-date {
            color: #aaa;
            margin-bottom: 4px;
        }

        .cashback-history-amount {
            color: #00c77d;
            font-weight: 600;
        }

        .cashback-history-status {
            font-size: 10px;
            color: #888;
            margin-top: 3px;
            text-transform: uppercase;
        }

        .cashback-empty {
            text-align: center;
            color: #aaa;
            font-size: 13px;
            padding: 20px;
        }

        @media (max-width: 480px) {
            #${WIDGET_ID} {
                bottom: 15px;
                right: 15px;
                padding: 10px 14px;
                font-size: 12px;
            }

            #${PANEL_ID} {
                width: calc(100vw - 30px);
                bottom: 70px;
                right: 15px;
                left: 15px;
                max-height: 70vh;
            }
        }
    `;

    // ────────────────────────────────────────────────────────────────────────
    // API HELPER
    // ────────────────────────────────────────────────────────────────────────

    var api = (function() {
        async function call(path, opts) {
            opts = opts || {};
            var reqInit = {
                method: opts.method || 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            };

            // Add Authorization header if user is logged in
            if (window.currentUser && window.currentUser.token) {
                reqInit.headers['Authorization'] = 'Bearer ' + window.currentUser.token;
            }

            // Add CSRF token for mutations
            if (opts.method && opts.method !== 'GET') {
                var csrfToken = document.querySelector('meta[name="csrf-token"]');
                if (csrfToken) {
                    reqInit.headers['X-CSRF-Token'] = csrfToken.getAttribute('content');
                }
            }

            if (opts.body) {
                reqInit.body = JSON.stringify(opts.body);
            }

            var resp = await fetch(path, reqInit);
            if (!resp.ok) {
                var errData = {};
                try { errData = await resp.json(); } catch (e) { /* silent */ }
                throw new Error(errData.error || 'Request failed: ' + resp.statusText);
            }
            return await resp.json();
        }

        return { call: call };
    })();

    // ────────────────────────────────────────────────────────────────────────
    // CORE FUNCTIONS
    // ────────────────────────────────────────────────────────────────────────

    async function _fetchStatus() {
        try {
            var data = await api.call(API_BASE + '/status');
            state.todayStats = data.todayStats;
            state.currentTier = data.currentTier;
            state.nextTier = data.nextTier;
            state.pendingCashback = data.pendingCashback;
            state.lastSync = Date.now();
            _updateWidget();
            _updatePanel();
        } catch (err) {
            console.warn('[Cashback] Fetch status error:', err.message);
        }
    }

    async function _fetchHistory() {
        try {
            var data = await api.call(API_BASE + '/history');
            return data.rewards || [];
        } catch (err) {
            console.warn('[Cashback] Fetch history error:', err.message);
            return [];
        }
    }

    async function _claimCashback(rewardId) {
        try {
            var data = await api.call(API_BASE + '/claim', {
                method: 'POST',
                body: { rewardId: rewardId }
            });
            _fetchStatus(); // Refresh status
            return data;
        } catch (err) {
            console.warn('[Cashback] Claim error:', err.message);
            throw err;
        }
    }

    async function recordSpin(bet, win) {
        try {
            await api.call(API_BASE + '/record', {
                method: 'POST',
                body: {
                    wagerAmount: Math.floor(bet * 100),
                    winAmount: Math.floor(win * 100)
                }
            });
            // Sync status if > 10 seconds since last sync
            if (Date.now() - state.lastSync > 10000) {
                _fetchStatus();
            }
        } catch (err) {
            /* silently ignore recording errors */
        }
    }

    // ────────────────────────────────────────────────────────────────────────
    // UI RENDERING
    // ────────────────────────────────────────────────────────────────────────

    function _updateWidget() {
        var widget = document.getElementById(WIDGET_ID);
        if (!widget) return;

        // Determine display text
        var text = '';
        var shouldPulse = false;

        if (state.pendingCashback && state.pendingCashback.amount > 0) {
            text = '💰 Cashback: ' + state.pendingCashback.amount + ' available';
            shouldPulse = true;
        } else if (state.todayStats) {
            var rate = state.currentTier ? Math.round(state.currentTier.rate * 100) : 5;
            text = '💰 Today\'s cashback: ' + rate + '%';
        } else {
            text = '💰 Cashback available';
        }

        widget.innerHTML = '<span class="cashback-widget-emoji">💰</span>' +
            '<span class="cashback-widget-text">' + text + '</span>';

        if (shouldPulse && !widget.classList.contains('pulse')) {
            widget.classList.add('pulse');
        } else if (!shouldPulse && widget.classList.contains('pulse')) {
            widget.classList.remove('pulse');
        }
    }

    function _updatePanel() {
        var panel = document.getElementById(PANEL_ID);
        if (!panel) return;

        var html = '';

        // Header
        html += '<div class="cashback-panel-header">' +
            '<div class="cashback-panel-title">Daily Cashback</div>' +
            '<button class="cashback-panel-close" onclick="if(typeof CashbackWidget!==\'undefined\'){CashbackWidget._closePanel();}">✕</button>' +
            '</div>';

        // Today's stats
        if (state.todayStats) {
            html += '<div class="cashback-stats-grid">' +
                '<div class="cashback-stat-box">' +
                '<div class="cashback-stat-label">Wagered</div>' +
                '<div class="cashback-stat-value">$' + (state.todayStats.totalWagered / 100).toFixed(2) + '</div>' +
                '</div>' +
                '<div class="cashback-stat-box">' +
                '<div class="cashback-stat-label">Net Loss</div>' +
                '<div class="cashback-stat-value">$' + (state.todayStats.netLoss / 100).toFixed(2) + '</div>' +
                '</div>' +
                '</div>';
        }

        // Tier section
        if (state.currentTier) {
            var progressPercent = 0;
            var nextThreshold = 1000;
            if (state.nextTier) {
                nextThreshold = state.nextTier.wagerThreshold;
            } else {
                nextThreshold = 20000; // If at max tier
            }
            progressPercent = Math.min(100, Math.round((state.todayStats.totalWagered / nextThreshold) * 100));

            html += '<div class="cashback-tier-section">' +
                '<div class="cashback-tier-label">Current Tier</div>' +
                '<div class="cashback-tier-info">' +
                '<div class="cashback-tier-current">' + state.currentTier.label + ' Tier</div>' +
                '<div class="cashback-tier-rate">' + Math.round(state.currentTier.rate * 100) + '%</div>' +
                '</div>';

            if (state.nextTier) {
                html += '<div class="cashback-progress-bar">' +
                    '<div class="cashback-progress-fill" style="width:' + progressPercent + '%"></div>' +
                    '</div>' +
                    '<div class="cashback-progress-text">' + progressPercent + '% to ' + state.nextTier.label + '</div>' +
                    '<div class="cashback-next-tier">' +
                    'Wager $' + (state.nextTier.wagerThreshold / 100).toFixed(2) + ' to unlock ' +
                    state.nextTier.label + ' tier (' + Math.round(state.nextTier.rate * 100) + '% cashback)' +
                    '</div>';
            } else {
                html += '<div class="cashback-next-tier">You\'ve reached the maximum VIP tier! 👑</div>';
            }

            html += '</div>';
        }

        // Claim section (if pending cashback)
        if (state.pendingCashback && state.pendingCashback.amount > 0) {
            html += '<div class="cashback-claim-section">' +
                '<div class="cashback-claim-label">Available Cashback</div>' +
                '<div class="cashback-claim-box">' +
                '<div class="cashback-claim-amount">$' + (state.pendingCashback.amount / 100).toFixed(2) + '</div>' +
                '<div class="cashback-claim-desc">From yesterday\'s play</div>' +
                '</div>' +
                '<button class="cashback-claim-btn" onclick="if(typeof CashbackWidget!==\'undefined\'){CashbackWidget._claimButtonClick();}">CLAIM CASHBACK</button>' +
                '</div>';
        }

        // History section
        html += '<div class="cashback-history-section">' +
            '<div class="cashback-history-label">History</div>' +
            '<div id="cashback-history-list"></div>' +
            '</div>';

        panel.innerHTML = html;

        // Load history async
        _loadHistory();
    }

    async function _loadHistory() {
        var listEl = document.getElementById('cashback-history-list');
        if (!listEl) return;

        try {
            var rewards = await _fetchHistory();
            if (!rewards || rewards.length === 0) {
                listEl.innerHTML = '<div class="cashback-empty">No cashback history yet</div>';
                return;
            }

            // Show last 7 items
            var html = '';
            for (var i = 0; i < Math.min(7, rewards.length); i++) {
                var r = rewards[i];
                html += '<div class="cashback-history-item">' +
                    '<div class="cashback-history-date">' + (new Date(r.periodDate)).toLocaleDateString() + '</div>' +
                    '<div class="cashback-history-amount">$' + (r.cashbackAmount / 100).toFixed(2) + '</div>' +
                    '<div class="cashback-history-status">' + r.status + '</div>' +
                    '</div>';
            }
            listEl.innerHTML = html;
        } catch (err) {
            listEl.innerHTML = '<div class="cashback-empty">Failed to load history</div>';
        }
    }

    // ────────────────────────────────────────────────────────────────────────
    // PUBLIC API
    // ────────────────────────────────────────────────────────────────────────

    function init() {
        if (!window.currentUser) return; // Only init for logged-in users

        // Inject styles
        if (!document.getElementById(style.id)) {
            document.head.appendChild(style);
        }

        // Create widget
        if (!document.getElementById(WIDGET_ID)) {
            var widget = document.createElement('div');
            widget.id = WIDGET_ID;
            widget.onclick = function() {
                var panel = document.getElementById(PANEL_ID);
                if (panel && panel.classList.contains('visible')) {
                    _closePanel();
                } else {
                    _openPanel();
                }
            };
            document.body.appendChild(widget);
        }

        // Create panel
        if (!document.getElementById(PANEL_ID)) {
            var panel = document.createElement('div');
            panel.id = PANEL_ID;
            document.body.appendChild(panel);
        }

        // Initial fetch
        _fetchStatus();

        // Auto-sync every 60 seconds
        setInterval(function() {
            _fetchStatus();
        }, 60000);
    }

    function _openPanel() {
        var panel = document.getElementById(PANEL_ID);
        if (panel) {
            panel.classList.add('visible');
            state.isExpanded = true;
        }
    }

    function _closePanel() {
        var panel = document.getElementById(PANEL_ID);
        if (panel) {
            panel.classList.remove('visible');
            state.isExpanded = false;
        }
    }

    function _claimButtonClick() {
        if (!state.pendingCashback || !state.pendingCashback.id) {
            console.warn('[Cashback] No pending cashback to claim');
            return;
        }

        var btn = document.querySelector('.cashback-claim-btn');
        if (btn) btn.disabled = true;

        _claimCashback(state.pendingCashback.id).then(function(result) {
            alert('✅ Claimed $' + (result.cashbackAmount / 100).toFixed(2) + ' cashback!');
            _closePanel();
            _fetchStatus();
        }).catch(function(err) {
            alert('❌ ' + err.message);
        }).finally(function() {
            if (btn) btn.disabled = false;
        });
    }

    // ────────────────────────────────────────────────────────────────────────
    // EXPORT PUBLIC API
    // ────────────────────────────────────────────────────────────────────────

    window.CashbackWidget = {
        init: init,
        recordSpin: recordSpin,
        claimCashback: function(rewardId) { return _claimCashback(rewardId); },
        _closePanel: _closePanel,
        _claimButtonClick: _claimButtonClick
    };

    console.warn('[Cashback] Widget module loaded');
})();
