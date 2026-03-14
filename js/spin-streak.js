(function() {
    'use strict';

    var STREAK_TIERS = [
        { spins: 10, multiplier: 1.1, tierName: 'Bronze Streak', color: '#cd7f32' },
        { spins: 25, multiplier: 1.25, tierName: 'Silver Streak', color: '#c0c0c0' },
        { spins: 50, multiplier: 1.5, tierName: 'Gold Streak', color: '#ffd700' },
        { spins: 100, multiplier: 2.0, tierName: 'FIRE STREAK!', color: '#ff4500' },
        { spins: 200, multiplier: 3.0, tierName: 'LEGENDARY STREAK!', color: '#9c27b0' }
    ];

    var API_ENDPOINT = '/api/spinstreak';
    var SYNC_INTERVAL_MS = 30000; // Sync with server every 30s
    var LEADERBOARD_UPDATE_MS = 60000; // Update leaderboard every 60s

    var state = {
        currentStreak: 0,
        currentMultiplier: 1.0,
        tierName: 'No Streak',
        nextTier: null,
        spinsToNext: 10,
        isLoaded: false
    };

    var domElements = {
        badge: null,
        progressBar: null,
        countText: null,
        multiplierBadge: null,
        tierText: null,
        leaderboard: null,
        leaderboardPanel: null
    };

    var timers = {
        sync: null,
        leaderboard: null
    };

    /**
     * API helper
     */
    async function api(path, opts) {
        opts = opts || {};
        if (typeof apiRequest === 'function') {
            return apiRequest(path, opts);
        }
        var tokenKey = typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken';
        var token = localStorage.getItem(tokenKey);
        if (!token) return null;

        var res = await fetch(path, Object.assign({}, opts, {
            headers: Object.assign(
                { 'Content-Type': 'application/json' },
                token ? { Authorization: 'Bearer ' + token } : {},
                opts.headers || {}
            )
        }));
        return res.json();
    }

    /**
     * Get color for current tier
     */
    function getTierColor() {
        if (state.currentStreak < 10) return '#ffffff';
        for (var i = STREAK_TIERS.length - 1; i >= 0; i--) {
            if (state.currentStreak >= STREAK_TIERS[i].spins) {
                return STREAK_TIERS[i].color;
            }
        }
        return '#ffffff';
    }

    /**
     * Create or update streak badge
     */
    function createOrUpdateBadge() {
        if (!domElements.badge) {
            var badge = document.createElement('div');
            badge.id = 'spin-streak-badge';
            badge.style.cssText = 'position:fixed;top:70px;left:16px;background:rgba(20,10,40,0.95);border:2px solid #ffd700;border-radius:12px;padding:12px 16px;width:140px;display:flex;flex-direction:column;gap:8px;align-items:center;z-index:9998;font-family:Arial,sans-serif;box-shadow:0 0 20px rgba(255,215,0,0.6);animation:spinStreakPulse 1.5s ease-in-out infinite;';

            var countDiv = document.createElement('div');
            countDiv.style.cssText = 'font-size:24px;font-weight:bold;color:#ffd700;';
            countDiv.textContent = '🔥 ' + state.currentStreak;
            domElements.countText = countDiv;
            badge.appendChild(countDiv);

            var multiplierDiv = document.createElement('div');
            multiplierDiv.style.cssText = 'font-size:16px;font-weight:bold;color:#ffd700;background:rgba(255,215,0,0.2);padding:4px 8px;border-radius:4px;min-width:50px;text-align:center;';
            multiplierDiv.textContent = state.currentMultiplier.toFixed(2) + 'x';
            domElements.multiplierBadge = multiplierDiv;
            badge.appendChild(multiplierDiv);

            var tierDiv = document.createElement('div');
            tierDiv.style.cssText = 'font-size:11px;color:#fff;text-align:center;height:20px;line-height:1.2;';
            tierDiv.textContent = state.tierName;
            domElements.tierText = tierDiv;
            badge.appendChild(tierDiv);

            var progressDiv = document.createElement('div');
            progressDiv.style.cssText = 'width:100%;height:4px;background:rgba(255,255,255,0.2);border-radius:2px;overflow:hidden;';
            var progressBar = document.createElement('div');
            progressBar.style.cssText = 'height:100%;background:linear-gradient(90deg,#ffd700,#ff4500);width:0%;transition:width 0.3s ease;';
            domElements.progressBar = progressBar;
            progressDiv.appendChild(progressBar);
            badge.appendChild(progressDiv);

            document.body.appendChild(badge);
            domElements.badge = badge;

            // Add style for pulse animation
            if (!document.getElementById('spin-streak-styles')) {
                var style = document.createElement('style');
                style.id = 'spin-streak-styles';
                style.textContent = '@keyframes spinStreakPulse { 0%, 100% { box-shadow: 0 0 20px rgba(255,215,0,0.6), inset 0 0 10px rgba(255,215,0,0.2); } 50% { box-shadow: 0 0 30px rgba(255,215,0,0.8), inset 0 0 15px rgba(255,215,0,0.3); } } @keyframes tierUpFlash { 0% { opacity: 0; } 50% { opacity: 1; } 100% { opacity: 0; } }';
                document.head.appendChild(style);
            }
        } else {
            // Update existing badge
            if (domElements.countText) {
                domElements.countText.textContent = '🔥 ' + state.currentStreak;
            }
            if (domElements.multiplierBadge) {
                domElements.multiplierBadge.textContent = state.currentMultiplier.toFixed(2) + 'x';
            }
            if (domElements.tierText) {
                domElements.tierText.textContent = state.tierName;
            }
        }

        // Update progress bar
        if (domElements.progressBar && state.spinsToNext > 0 && state.nextTier) {
            var spinsFromPrevTier = state.currentStreak - (state.nextTier.spins - state.spinsToNext);
            var spinsToPrevTier = state.nextTier.spins - (state.nextTier.spins - state.spinsToNext);
            var progress = Math.max(0, Math.min(100, (spinsFromPrevTier / spinsToPrevTier) * 100));
            domElements.progressBar.style.width = progress + '%';
        }

        // Update badge color based on tier
        if (domElements.badge) {
            var tierColor = getTierColor();
            domElements.badge.style.borderColor = tierColor;
            if (domElements.countText) {
                domElements.countText.style.color = tierColor;
            }
            if (domElements.multiplierBadge) {
                domElements.multiplierBadge.style.color = tierColor;
                domElements.multiplierBadge.style.background = 'rgba(' + hexToRgb(tierColor).join(',') + ',0.2)';
            }
        }
    }

    /**
     * Convert hex to RGB
     */
    function hexToRgb(hex) {
        var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? [
            parseInt(result[1], 16),
            parseInt(result[2], 16),
            parseInt(result[3], 16)
        ] : [255, 215, 0];
    }

    /**
     * Show tier unlock celebration
     */
    function showTierUpCelebration() {
        // Flash effect
        var flash = document.createElement('div');
        flash.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(255,215,0,0.5);z-index:99999;animation:tierUpFlash 0.5s ease-out;pointer-events:none;';
        document.body.appendChild(flash);
        setTimeout(function() { flash.remove(); }, 500);

        // Banner
        var banner = document.createElement('div');
        banner.style.cssText = 'position:fixed;top:20%;left:50%;transform:translate(-50%,-50%);background:rgba(20,10,40,0.98);border:3px solid #ff4500;border-radius:16px;padding:24px 40px;z-index:99998;font-family:Arial,sans-serif;text-align:center;box-shadow:0 0 40px rgba(255,69,0,0.8);animation:tierUpFlash 0.5s ease-out;';
        banner.innerHTML = '<div style="font-size:32px;font-weight:bold;color:#ff4500;margin-bottom:8px;">🔥 ' + state.tierName + '! 🔥</div><div style="font-size:18px;color:#ffd700;">' + state.currentMultiplier.toFixed(2) + 'x BONUS ACTIVATED!</div>';
        document.body.appendChild(banner);

        // Dispatch event for sound
        try {
            window.dispatchEvent(new CustomEvent('streak:tierup', { detail: { tierName: state.tierName, multiplier: state.currentMultiplier } }));
        } catch (e) {
            console.warn('[SpinStreak] Could not dispatch tierup event:', e.message);
        }

        setTimeout(function() { banner.remove(); }, 2000);
    }

    /**
     * Create leaderboard panel
     */
    function createLeaderboardPanel() {
        if (domElements.leaderboardPanel) return;

        var panel = document.createElement('div');
        panel.id = 'spin-streak-leaderboard-panel';
        panel.style.cssText = 'position:fixed;bottom:20px;right:20px;background:rgba(20,10,40,0.95);border:2px solid #ffd700;border-radius:12px;padding:16px;width:240px;max-height:320px;overflow-y:auto;z-index:9997;font-family:Arial,sans-serif;color:#fff;box-shadow:0 0 20px rgba(255,215,0,0.6);';

        var header = document.createElement('div');
        header.style.cssText = 'font-size:14px;font-weight:bold;color:#ffd700;margin-bottom:12px;border-bottom:1px solid #ffd700;padding-bottom:8px;text-align:center;cursor:pointer;';
        header.textContent = '⭐ Top Streakers Today';
        header.addEventListener('click', function() {
            panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
        });
        panel.appendChild(header);

        var list = document.createElement('div');
        list.id = 'spin-streak-leaderboard-list';
        domElements.leaderboard = list;
        panel.appendChild(list);

        document.body.appendChild(panel);
        domElements.leaderboardPanel = panel;
    }

    /**
     * Update leaderboard display
     */
    async function updateLeaderboard() {
        try {
            var data = await api(API_ENDPOINT + '/leaderboard');
            if (!data || !data.leaderboard) return;

            var list = domElements.leaderboard;
            if (!list) return;

            list.innerHTML = '';

            (data.leaderboard || []).slice(0, 5).forEach(function(entry, idx) {
                var row = document.createElement('div');
                row.style.cssText = 'padding:8px;border-bottom:1px solid rgba(255,215,0,0.2);font-size:12px;display:flex;justify-content:space-between;align-items:center;';

                var rank = document.createElement('span');
                rank.style.cssText = 'color:#ffd700;font-weight:bold;';
                rank.textContent = (idx + 1) + '.';

                var name = document.createElement('span');
                name.style.cssText = 'flex:1;margin-left:8px;color:#fff;overflow:hidden;text-overflow:ellipsis;';
                name.textContent = entry.username;

                var mult = document.createElement('span');
                mult.style.cssText = 'color:#ff4500;font-weight:bold;margin-left:8px;';
                mult.textContent = entry.multiplier.toFixed(2) + 'x';

                row.appendChild(rank);
                row.appendChild(name);
                row.appendChild(mult);
                list.appendChild(row);
            });
        } catch (err) {
            console.warn('[SpinStreak] Leaderboard update failed:', err.message);
        }
    }

    /**
     * Fetch streak status from server
     */
    async function syncWithServer() {
        try {
            var data = await api(API_ENDPOINT);
            if (!data) return;

            var prevMultiplier = state.currentMultiplier;
            state.currentStreak = data.currentStreak || 0;
            state.currentMultiplier = data.currentMultiplier || 1.0;
            state.tierName = data.tierName || 'No Streak';
            state.nextTier = data.nextTier;
            state.spinsToNext = data.spinsToNext || 0;
            state.isLoaded = true;

            createOrUpdateBadge();

            // Check if tier up
            if (prevMultiplier !== state.currentMultiplier && state.currentMultiplier > 1.0 && prevMultiplier > 0) {
                showTierUpCelebration();
            }
        } catch (err) {
            console.warn('[SpinStreak] Server sync failed:', err.message);
        }
    }

    /**
     * Listen for spin:complete events and increment local counter
     */
    function initSpinListener() {
        window.addEventListener('spin:complete', function(evt) {
            state.currentStreak++;
            createOrUpdateBadge();

            // Sync with server immediately on spin
            syncWithServer();
        });
    }

    /**
     * Initialize timers
     */
    function startTimers() {
        if (timers.sync) clearInterval(timers.sync);
        timers.sync = setInterval(syncWithServer, SYNC_INTERVAL_MS);

        if (timers.leaderboard) clearInterval(timers.leaderboard);
        timers.leaderboard = setInterval(updateLeaderboard, LEADERBOARD_UPDATE_MS);
    }

    /**
     * Main init
     */
    function init() {
        try {
            createOrUpdateBadge();
            createLeaderboardPanel();
            initSpinListener();
            startTimers();

            // Initial sync
            syncWithServer();
            updateLeaderboard();

            console.log('[SpinStreak] Widget initialized');
        } catch (err) {
            console.warn('[SpinStreak] Init error:', err.message);
        }
    }

    // Expose to window
    window.SpinStreak = {
        init: init,
        getState: function() { return state; },
        syncNow: syncWithServer,
        updateLeaderboardNow: updateLeaderboard
    };

    // Auto-init if DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
