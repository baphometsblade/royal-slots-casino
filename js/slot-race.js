/**
 * SLOT RACE MODULE
 * Time-limited competitive speed challenges.
 * Players race to spin the most and earn prizes.
 *
 * Public API: init(), recordSpin(result), dismiss()
 */

(function(window) {
    'use strict';

    var SlotRace = {};
    var _raceData = null;
    var _userEntry = null;
    var _timerInterval = null;
    var _refreshInterval = null;
    var _isJoined = false;
    var _joinInProgress = false;

    // ─────────────────────────────────────────────────────────────────────────────
    // HELPER: API calls with CSRF
    // ─────────────────────────────────────────────────────────────────────────────

    async function api(path, opts) {
        const defaultOpts = {
            method: 'GET',
            headers: {}
        };

        const finalOpts = Object.assign({}, defaultOpts, opts);

        // Add CSRF token to mutation requests
        if (finalOpts.method && /^(POST|PUT|DELETE)$/.test(finalOpts.method)) {
            finalOpts.headers['x-csrf-token'] = _getCsrfToken();
        }

        if (finalOpts.body && typeof finalOpts.body === 'object') {
            finalOpts.body = JSON.stringify(finalOpts.body);
            finalOpts.headers['content-type'] = 'application/json';
        }

        try {
            const resp = await fetch(path, finalOpts);
            if (!resp.ok) {
                const err = await resp.json().catch(() => ({ error: 'Request failed' }));
                throw new Error(err.error || 'HTTP ' + resp.status);
            }
            return await resp.json();
        } catch (e) {
            console.warn('[SlotRace] API error:', e.message);
            throw e;
        }
    }

    function _getCsrfToken() {
        const tok = document.querySelector('meta[name="csrf-token"]');
        return tok ? tok.getAttribute('content') : '';
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // UI: Race Banner (top-of-screen)
    // ─────────────────────────────────────────────────────────────────────────────

    function _renderRaceBanner() {
        let banner = document.getElementById('slot-race-banner');
        if (!banner) {
            banner = document.createElement('div');
            banner.id = 'slot-race-banner';
            document.body.insertBefore(banner, document.body.firstChild);
        }

        if (!_raceData) {
            banner.style.display = 'none';
            return;
        }

        const race = _raceData.race;
        const leaderboard = _raceData.leaderboard || [];
        const config = _raceData.config || {};
        const user = _userEntry || {};

        const endsAt = new Date(race.ends_at);
        const now = new Date();
        const remainMs = Math.max(0, endsAt.getTime() - now.getTime());

        const mins = Math.floor(remainMs / 60000);
        const secs = Math.floor((remainMs % 60000) / 1000);
        const timeStr = String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0');

        const userRank = leaderboard.findIndex(e => e.user_id === window.currentUser?.id);
        const userPos = userRank >= 0 ? userRank + 1 : '—';
        const userSpins = user.spins_count || 0;

        var joinBtnHtml = '';
        if (window.currentUser && !_isJoined) {
            joinBtnHtml = `<button id="slot-race-join-btn" class="sr-join-btn">JOIN RACE</button>`;
        }

        banner.innerHTML = `
<div class="slot-race-banner-inner">
    <div class="sr-header">
        <div class="sr-title">
            <span class="sr-type">${race.name}</span>
            <span class="sr-timer">${timeStr}</span>
        </div>
        <div class="sr-user-stats">
            <span class="sr-stat">Position: <strong>#${userPos}</strong></span>
            <span class="sr-stat">Spins: <strong>${userSpins}</strong></span>
            ${joinBtnHtml}
        </div>
    </div>
    <div class="sr-mini-leaderboard">
        <h4>Top Racers</h4>
        <div class="sr-leaderboard-list">
            ${leaderboard.slice(0, 3).map((entry, i) => `
                <div class="sr-lb-entry">
                    <span class="sr-rank">#${i + 1}</span>
                    <span class="sr-name">${entry.display_name}</span>
                    <span class="sr-score">${entry.score}</span>
                </div>
            `).join('')}
        </div>
    </div>
</div>
        `;

        banner.style.display = 'block';

        // Attach join handler
        var joinBtnEl = document.getElementById('slot-race-join-btn');
        if (joinBtnEl) {
            joinBtnEl.addEventListener('click', function() { _joinRace(); });
        }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // UI: Race Results Popup
    // ─────────────────────────────────────────────────────────────────────────────

    function _showResultsPopup(nextRaceIn) {
        let resultsEl = document.getElementById('slot-race-results');
        if (!resultsEl) {
            resultsEl = document.createElement('div');
            resultsEl.id = 'slot-race-results';
            document.body.appendChild(resultsEl);
        }

        const leaderboard = _raceData.leaderboard || [];
        const race = _raceData.race || {};
        const user = _userEntry || {};
        const userRank = leaderboard.findIndex(e => e.user_id === window.currentUser?.id);
        const userPlacement = userRank >= 0 ? userRank + 1 : '—';

        const nms = Math.floor(nextRaceIn / 60000);
        const nss = Math.floor((nextRaceIn % 60000) / 1000);
        const nextStr = String(nms).padStart(2, '0') + ':' + String(nss).padStart(2, '0');

        resultsEl.innerHTML = `
<div class="slot-race-results-overlay">
    <div class="slot-race-results-modal">
        <button class="sr-close-btn" onclick="document.getElementById('slot-race-results').style.display='none';">✕</button>
        <h2>Race Complete!</h2>
        <div class="sr-results-content">
            <div class="sr-final-leaderboard">
                <h3>Final Standings</h3>
                ${leaderboard.slice(0, 5).map((entry, i) => `
                    <div class="sr-result-entry${window.currentUser?.id === entry.user_id ? ' sr-user-result' : ''}">
                        <span class="sr-result-rank">Place ${i + 1}</span>
                        <span class="sr-result-name">${entry.display_name}</span>
                        <span class="sr-result-score">${entry.score} pts</span>
                    </div>
                `).join('')}
            </div>
            <div class="sr-user-result-summary">
                <h3>Your Result</h3>
                <p>You placed <strong>#${userPlacement}</strong></p>
                <p>Score: <strong>${user.score || 0}</strong></p>
            </div>
            <div class="sr-next-race">
                <p>Next race in: <span class="sr-next-countdown">${nextStr}</span></p>
            </div>
        </div>
    </div>
</div>
        `;

        resultsEl.style.display = 'block';

        // Update next race countdown
        if (_timerInterval) clearInterval(_timerInterval);
        _timerInterval = setInterval(function() {
            _updateCountdown('.sr-next-countdown', nextRaceIn);
            nextRaceIn -= 1000;
            if (nextRaceIn <= 0) {
                if (_timerInterval) clearInterval(_timerInterval);
                _loadRace();
            }
        }, 1000);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // STATE: Load race data
    // ─────────────────────────────────────────────────────────────────────────────

    async function _loadRace() {
        try {
            const data = await api('/api/slot-race/current');
            _raceData = data;
            _userEntry = data.userEntry || {};
            _isJoined = !!data.userEntry;

            _renderRaceBanner();
            _startTimers();
        } catch (e) {
            console.warn('[SlotRace] _loadRace failed:', e.message);
            setTimeout(_loadRace, 5000);
        }
    }

    async function _joinRace() {
        if (_joinInProgress || _isJoined) return;
        _joinInProgress = true;

        try {
            const data = await api('/api/slot-race/join', { method: 'POST', body: {} });
            _isJoined = true;
            _joinInProgress = false;
            _loadRace();
        } catch (e) {
            console.warn('[SlotRace] Join failed:', e.message);
            _joinInProgress = false;
            // Show error toast
            _showToast(e.message || 'Failed to join race', 'error');
        }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // TIMERS: Update UI countdown
    // ─────────────────────────────────────────────────────────────────────────────

    function _updateCountdown(selector, remainMs) {
        const el = document.querySelector(selector);
        if (!el) return;

        const mins = Math.floor(remainMs / 60000);
        const secs = Math.floor((remainMs % 60000) / 1000);
        el.textContent = String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0');
    }

    function _startTimers() {
        if (!_raceData || !_raceData.race) return;

        if (_timerInterval) clearInterval(_timerInterval);

        _timerInterval = setInterval(function() {
            if (!_raceData || !_raceData.race) return;

            const endsAt = new Date(_raceData.race.ends_at);
            const now = new Date();
            const remainMs = Math.max(0, endsAt.getTime() - now.getTime());

            _updateCountdown('.sr-timer', remainMs);

            // Race over?
            if (remainMs <= 0) {
                clearInterval(_timerInterval);
                // Show results and reload
                const nextRaceIn = 15 * 60 * 1000; // 15 min until next race
                _showResultsPopup(nextRaceIn);
            }
        }, 1000);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // PUBLIC API
    // ─────────────────────────────────────────────────────────────────────────────

    SlotRace.init = function() {
        _loadRace();
        // Refresh race data every 30 seconds
        if (_refreshInterval) clearInterval(_refreshInterval);
        _refreshInterval = setInterval(_loadRace, 30000);
    };

    SlotRace.recordSpin = function(spinData) {
        if (!_isJoined || !_raceData) return;

        const betAmount = spinData.betAmount || 0;
        const winAmount = spinData.winAmount || 0;

        try {
            api('/api/slot-race/record-spin', {
                method: 'POST',
                body: { betAmount, winAmount }
            }).catch(function(e) {
                // Silent fail — races are optional
            });
        } catch (e) {
            // Silent
        }
    };

    SlotRace.dismiss = function() {
        const banner = document.getElementById('slot-race-banner');
        if (banner) banner.style.display = 'none';
        const results = document.getElementById('slot-race-results');
        if (results) results.style.display = 'none';
    };

    // ─────────────────────────────────────────────────────────────────────────────
    // UI HELPERS
    // ─────────────────────────────────────────────────────────────────────────────

    function _showToast(msg, type) {
        var toast = document.createElement('div');
        toast.className = 'slot-race-toast ' + type;
        toast.textContent = msg;
        document.body.appendChild(toast);
        setTimeout(function() { toast.remove(); }, 4000);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // STYLES (injected once)
    // ─────────────────────────────────────────────────────────────────────────────

    function _injectStyles() {
        if (document.getElementById('slot-race-styles')) return;

        var style = document.createElement('style');
        style.id = 'slot-race-styles';
        style.textContent = `
/* Slot Race Banner */
#slot-race-banner {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 9900;
    background: linear-gradient(90deg, rgba(13,13,26,.95) 0%, rgba(26,13,46,.95) 50%, rgba(13,26,26,.95) 100%);
    border-bottom: 2px solid #00ff88;
    box-shadow: 0 4px 30px rgba(0,255,136,.2);
    padding: 12px 16px;
    font-family: 'Arial', sans-serif;
}

.slot-race-banner-inner {
    max-width: 1400px;
    margin: 0 auto;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 20px;
    flex-wrap: wrap;
}

.sr-header {
    flex: 1;
    min-width: 250px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 20px;
}

.sr-title {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.sr-type {
    color: #fbbf24;
    font-size: 16px;
    font-weight: 900;
    letter-spacing: 0.5px;
    text-shadow: 0 0 10px rgba(251,191,36,.5);
}

.sr-timer {
    color: #00ff88;
    font-size: 18px;
    font-weight: 900;
    font-family: 'Courier New', monospace;
    animation: sr-pulse 1s infinite;
}

@keyframes sr-pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
}

.sr-user-stats {
    display: flex;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
}

.sr-stat {
    color: #fff;
    font-size: 13px;
    white-space: nowrap;
}

.sr-stat strong {
    color: #00ff88;
    font-weight: 900;
}

.sr-join-btn {
    background: linear-gradient(135deg, #00ff88, #00cc6a);
    border: none;
    color: #000;
    font-weight: 900;
    padding: 8px 16px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 12px;
    letter-spacing: 0.5px;
    transition: all 0.2s;
    animation: sr-pulse-btn 1s infinite;
    box-shadow: 0 0 15px rgba(0,255,136,.4);
}

@keyframes sr-pulse-btn {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.05); }
}

.sr-join-btn:hover {
    box-shadow: 0 0 25px rgba(0,255,136,.6);
}

.sr-mini-leaderboard {
    flex: 0 0 auto;
    min-width: 180px;
    background: rgba(0,0,0,.3);
    border: 1px solid rgba(0,255,136,.2);
    border-radius: 8px;
    padding: 10px;
}

.sr-mini-leaderboard h4 {
    color: #00ff88;
    font-size: 11px;
    margin: 0 0 8px 0;
    text-transform: uppercase;
    letter-spacing: 1px;
}

.sr-leaderboard-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.sr-lb-entry {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 12px;
    color: #fff;
    padding: 4px 0;
    border-bottom: 1px solid rgba(0,255,136,.1);
}

.sr-lb-entry:last-child {
    border-bottom: none;
}

.sr-rank {
    color: #fbbf24;
    font-weight: 900;
    min-width: 30px;
}

.sr-name {
    color: #fff;
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.sr-score {
    color: #00ff88;
    font-weight: 900;
    text-align: right;
}

/* Results Popup */
#slot-race-results {
    display: none;
    position: fixed;
    inset: 0;
    z-index: 10500;
}

.slot-race-results-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,.85);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
}

.slot-race-results-modal {
    background: linear-gradient(160deg, #0d0d1a 0%, #1a0d2e 50%, #0d1a1a 100%);
    border: 2px solid rgba(0,255,136,.3);
    border-radius: 16px;
    padding: 32px;
    max-width: 500px;
    width: 100%;
    box-shadow: 0 0 60px rgba(0,255,136,.2), 0 20px 60px rgba(0,0,0,.8);
    position: relative;
}

.sr-close-btn {
    position: absolute;
    top: 16px;
    right: 16px;
    background: none;
    border: none;
    color: rgba(255,255,255,.3);
    font-size: 20px;
    cursor: pointer;
    transition: color 0.2s;
}

.sr-close-btn:hover {
    color: rgba(255,255,255,.7);
}

.slot-race-results-modal h2 {
    color: #00ff88;
    font-size: 24px;
    margin: 0 0 20px 0;
    text-align: center;
    letter-spacing: 1px;
}

.sr-results-content {
    display: flex;
    flex-direction: column;
    gap: 20px;
}

.sr-final-leaderboard {
    background: rgba(0,255,136,.05);
    border: 1px solid rgba(0,255,136,.1);
    border-radius: 8px;
    padding: 12px;
}

.sr-final-leaderboard h3 {
    color: #00ff88;
    font-size: 12px;
    text-transform: uppercase;
    margin: 0 0 10px 0;
    letter-spacing: 1px;
}

.sr-result-entry {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 0;
    border-bottom: 1px solid rgba(0,255,136,.1);
    font-size: 13px;
    color: #fff;
}

.sr-result-entry:last-child {
    border-bottom: none;
}

.sr-result-entry.sr-user-result {
    background: rgba(0,255,136,.1);
    padding: 8px;
    border-radius: 4px;
    border: none;
}

.sr-result-rank {
    color: #fbbf24;
    font-weight: 900;
    min-width: 60px;
}

.sr-result-name {
    color: #fff;
    flex: 1;
}

.sr-result-score {
    color: #00ff88;
    font-weight: 900;
    text-align: right;
}

.sr-user-result-summary {
    background: rgba(251,191,36,.05);
    border: 1px solid rgba(251,191,36,.1);
    border-radius: 8px;
    padding: 12px;
    text-align: center;
}

.sr-user-result-summary h3 {
    color: #fbbf24;
    font-size: 12px;
    text-transform: uppercase;
    margin: 0 0 8px 0;
    letter-spacing: 1px;
}

.sr-user-result-summary p {
    color: #fff;
    margin: 4px 0;
    font-size: 14px;
}

.sr-user-result-summary strong {
    color: #00ff88;
    font-weight: 900;
}

.sr-next-race {
    background: rgba(0,0,0,.3);
    border: 1px solid rgba(251,191,36,.2);
    border-radius: 8px;
    padding: 12px;
    text-align: center;
}

.sr-next-race p {
    color: #fff;
    margin: 0;
    font-size: 13px;
}

.sr-next-countdown {
    color: #fbbf24;
    font-weight: 900;
    font-family: 'Courier New', monospace;
    font-size: 16px;
}

/* Toast Messages */
.slot-race-toast {
    position: fixed;
    bottom: 20px;
    right: 20px;
    padding: 12px 16px;
    background: rgba(0,0,0,.9);
    color: #fff;
    border-radius: 4px;
    font-size: 13px;
    border-left: 3px solid #00ff88;
    animation: sr-toast-slide 0.3s ease;
}

.slot-race-toast.error {
    border-left-color: #ff4444;
}

@keyframes sr-toast-slide {
    from { transform: translateX(400px); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
}

/* Mobile responsive */
@media (max-width: 768px) {
    .slot-race-banner-inner {
        flex-direction: column;
    }
    .sr-header {
        flex-direction: column;
        width: 100%;
    }
    .sr-user-stats {
        width: 100%;
        justify-content: space-around;
    }
    .sr-mini-leaderboard {
        width: 100%;
    }
}
        `;
        document.head.appendChild(style);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // INITIALIZATION
    // ─────────────────────────────────────────────────────────────────────────────

    _injectStyles();

    // Export to window
    window.SlotRace = SlotRace;

})(window);
