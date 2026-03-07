// =====================================================================
// ACHIEVEMENT BADGES MODULE — Sprint 100
// =====================================================================
//
// Self-contained IIFE. Unlockable milestones that reward players for
// engagement: spin counts, bet sizes, win streaks, big wins, and
// game exploration. Each achievement awards a one-time balance credit.
//
// Depends on (optional, guarded):
//   globals.js   — balance, currentGame, currentBet, formatMoney
//   ui-slot.js   — displayServerWinResult (hooked for tracking)
//   ui-modals.js — showWinToast (optional notification)
//   app.js       — updateBalance, saveBalance
//
// Storage: localStorage key 'achievementState'
// FAB: bottom-left medal button, z-index 19300
// =====================================================================

(function() {
    'use strict';

    // ── QA Suppression ───────────────────────────────────────────
    var qs = window.location.search || '';
    if (qs.indexOf('noBonus=1') !== -1 || qs.indexOf('qaTools=1') !== -1) return;

    // ── Constants ────────────────────────────────────────────────
    var STORAGE_KEY  = 'achievementState';
    var STYLE_ID     = 'achievementStyles';
    var FAB_ID       = 'achFab';
    var PANEL_ID     = 'achPanel';
    var OVERLAY_ID   = 'achOverlay';
    var POLL_MS      = 1200;
    var TOAST_DELAY  = 600;

    // ── Achievement Definitions ──────────────────────────────────
    var ACHIEVEMENTS = [
        { id: 'first_spin',     name: 'First Spin',      desc: 'Complete 1 spin',               icon: '\uD83C\uDFB0', reward: 0.25,  type: 'spins',     target: 1    },
        { id: 'getting_started', name: 'Getting Started', desc: 'Complete 10 spins',             icon: '\uD83D\uDE80', reward: 0.50,  type: 'spins',     target: 10   },
        { id: 'regular_player', name: 'Regular Player',   desc: 'Complete 50 spins',             icon: '\u2B50',       reward: 1.00,  type: 'spins',     target: 50   },
        { id: 'dedicated',      name: 'Dedicated',        desc: 'Complete 200 spins',            icon: '\uD83D\uDC8E', reward: 2.50,  type: 'spins',     target: 200  },
        { id: 'high_roller',    name: 'High Roller',      desc: 'Place a bet of $10+',           icon: '\uD83D\uDCB5', reward: 1.00,  type: 'max_bet',   target: 10   },
        { id: 'whale',          name: 'Whale',            desc: 'Place a bet of $100+',          icon: '\uD83D\uDC33', reward: 5.00,  type: 'max_bet',   target: 100  },
        { id: 'lucky_streak',   name: 'Lucky Streak',     desc: 'Win 3 in a row',                icon: '\uD83D\uDD25', reward: 2.00,  type: 'streak',    target: 3    },
        { id: 'on_fire',        name: 'On Fire',          desc: 'Win 5 in a row',                icon: '\uD83D\uDCA5', reward: 5.00,  type: 'streak',    target: 5    },
        { id: 'big_winner',     name: 'Big Winner',       desc: 'Win $50+ on a single spin',     icon: '\uD83C\uDFC6', reward: 3.00,  type: 'max_win',   target: 50   },
        { id: 'jackpot_hunter', name: 'Jackpot Hunter',   desc: 'Win $200+ on a single spin',    icon: '\uD83D\uDC51', reward: 10.00, type: 'max_win',   target: 200  },
        { id: 'explorer',       name: 'Explorer',         desc: 'Play 5 different games',        icon: '\uD83D\uDDFA\uFE0F',  reward: 2.00,  type: 'games',     target: 5    },
        { id: 'collector',      name: 'Collector',        desc: 'Play 15 different games',       icon: '\uD83D\uDCDA', reward: 5.00,  type: 'games',     target: 15   }
    ];

    // ── State ────────────────────────────────────────────────────
    var _state      = null;
    var _panelOpen  = false;
    var _pollTimer  = null;
    var _lastGame   = null;

    function defaultState() {
        return {
            spinCount:       0,
            maxBet:          0,
            winStreak:       0,
            currentWinStreak: 0,
            maxWin:          0,
            gamesPlayed:     [],
            unlocked:        []
        };
    }

    function loadState() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                var parsed = JSON.parse(raw);
                var s = defaultState();
                s.spinCount        = parsed.spinCount        || 0;
                s.maxBet           = parsed.maxBet           || 0;
                s.winStreak        = parsed.winStreak        || 0;
                s.currentWinStreak = parsed.currentWinStreak || 0;
                s.maxWin           = parsed.maxWin           || 0;
                s.gamesPlayed      = Array.isArray(parsed.gamesPlayed) ? parsed.gamesPlayed : [];
                s.unlocked         = Array.isArray(parsed.unlocked)    ? parsed.unlocked    : [];
                return s;
            }
        } catch (e) { /* ignore corrupt data */ }
        return defaultState();
    }

    function saveState() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(_state));
        } catch (e) { /* quota exceeded — silently fail */ }
    }

    // ── Progress Helpers ─────────────────────────────────────────
    function getProgress(ach) {
        if (!_state) return 0;
        switch (ach.type) {
            case 'spins':   return Math.min(_state.spinCount, ach.target);
            case 'max_bet': return Math.min(_state.maxBet, ach.target);
            case 'streak':  return Math.min(_state.winStreak, ach.target);
            case 'max_win': return Math.min(_state.maxWin, ach.target);
            case 'games':   return Math.min(_state.gamesPlayed.length, ach.target);
            default:        return 0;
        }
    }

    function isUnlocked(achId) {
        return _state && _state.unlocked.indexOf(achId) !== -1;
    }

    function checkAndUnlock() {
        if (!_state) return;
        var newUnlocks = [];

        for (var i = 0; i < ACHIEVEMENTS.length; i++) {
            var ach = ACHIEVEMENTS[i];
            if (isUnlocked(ach.id)) continue;

            var progress = getProgress(ach);
            if (progress >= ach.target) {
                _state.unlocked.push(ach.id);
                newUnlocks.push(ach);
            }
        }

        if (newUnlocks.length > 0) {
            saveState();
            for (var j = 0; j < newUnlocks.length; j++) {
                creditReward(newUnlocks[j]);
            }
            updateFabBadge();
            if (_panelOpen) renderPanel();

            // After a local unlock, also nudge the server to check and award
            // any server-side achievements that may now be eligible.
            _syncAchievementsFromServer();
        }
    }

    // ── Reward Credit ────────────────────────────────────────────
    function creditReward(ach) {
        var amount = ach.reward;

        if (typeof balance !== 'undefined') {
            balance += amount;
            balance = Math.round(balance * 100) / 100;
            if (typeof updateBalance === 'function') updateBalance();
            if (typeof saveBalance === 'function') saveBalance();
        }

        // Toast notification with short delay so it doesn't collide with win toast
        setTimeout(function() {
            var msg = '\uD83C\uDFC5 ' + ach.name + '! +$' + amount.toFixed(2);
            if (typeof showWinToast === 'function') {
                showWinToast(msg, 'epic');
            }
        }, TOAST_DELAY);
    }

    // ── Tracking Functions ───────────────────────────────────────
    function trackSpin(betAmount, winAmount, gameId) {
        if (!_state) return;

        // Spin count
        _state.spinCount++;

        // Max bet
        if (betAmount > _state.maxBet) {
            _state.maxBet = betAmount;
        }

        // Win streak
        if (winAmount > 0) {
            _state.currentWinStreak++;
            if (_state.currentWinStreak > _state.winStreak) {
                _state.winStreak = _state.currentWinStreak;
            }
        } else {
            _state.currentWinStreak = 0;
        }

        // Max single win
        if (winAmount > _state.maxWin) {
            _state.maxWin = winAmount;
        }

        // Games played (unique set)
        if (gameId && _state.gamesPlayed.indexOf(gameId) === -1) {
            _state.gamesPlayed.push(gameId);
        }

        saveState();
        checkAndUnlock();
    }

    // ── Game Tracking via Polling ────────────────────────────────
    function pollGameChange() {
        var g = (typeof currentGame !== 'undefined' && currentGame) ? currentGame.id : null;
        if (g && g !== _lastGame) {
            _lastGame = g;
            if (_state && _state.gamesPlayed.indexOf(g) === -1) {
                _state.gamesPlayed.push(g);
                saveState();
                checkAndUnlock();
            }
        }
    }

    // ── Styles ───────────────────────────────────────────────────
    function injectStyles() {
        if (document.getElementById(STYLE_ID)) return;
        var s = document.createElement('style');
        s.id = STYLE_ID;
        s.textContent = [
            /* FAB */
            '#' + FAB_ID + '{position:fixed;bottom:140px;left:16px;z-index:19300;width:48px;height:48px;' +
                'border-radius:50%;background:linear-gradient(135deg,#f59e0b,#d97706);' +
                'border:2px solid rgba(217,119,6,.5);color:#fff;font-size:22px;' +
                'display:flex;align-items:center;justify-content:center;cursor:pointer;' +
                'box-shadow:0 4px 16px rgba(245,158,11,.4);transition:transform .2s,box-shadow .2s}',
            '#' + FAB_ID + ':hover{transform:scale(1.1);box-shadow:0 6px 24px rgba(245,158,11,.6)}',
            '#' + FAB_ID + ' .ach-fab-badge{position:absolute;top:-4px;right:-4px;background:#22c55e;' +
                'color:#fff;font-size:10px;font-weight:800;min-width:18px;height:18px;' +
                'border-radius:9px;display:flex;align-items:center;justify-content:center;' +
                'padding:0 4px;box-shadow:0 2px 6px rgba(34,197,94,.5)}',

            /* Overlay */
            '#' + OVERLAY_ID + '{position:fixed;top:0;left:0;right:0;bottom:0;z-index:19400;' +
                'background:rgba(0,0,0,.6);backdrop-filter:blur(4px);opacity:0;' +
                'transition:opacity .25s;pointer-events:none}',
            '#' + OVERLAY_ID + '.ach-visible{opacity:1;pointer-events:auto}',

            /* Panel */
            '#' + PANEL_ID + '{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) scale(.92);' +
                'z-index:19500;width:540px;max-width:94vw;max-height:80vh;overflow-y:auto;' +
                'background:linear-gradient(160deg,#0f0f23 0%,#1a1a3e 100%);' +
                'border:1px solid rgba(245,158,11,.3);border-radius:16px;' +
                'padding:24px 20px 20px;box-shadow:0 8px 48px rgba(0,0,0,.6);' +
                'opacity:0;transition:opacity .25s,transform .25s;pointer-events:none}',
            '#' + PANEL_ID + '.ach-visible{opacity:1;transform:translate(-50%,-50%) scale(1);pointer-events:auto}',

            /* Panel header */
            '.ach-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px}',
            '.ach-title{font-size:20px;font-weight:800;color:#f59e0b;letter-spacing:.5px}',
            '.ach-subtitle{font-size:12px;color:rgba(255,255,255,.45);margin-top:2px}',
            '.ach-close{background:none;border:none;color:rgba(255,255,255,.4);font-size:22px;' +
                'cursor:pointer;padding:4px 8px;transition:color .15s}',
            '.ach-close:hover{color:#fff}',

            /* Progress summary bar */
            '.ach-summary{display:flex;align-items:center;gap:10px;margin-bottom:18px;' +
                'padding:10px 14px;background:rgba(245,158,11,.08);border-radius:10px;' +
                'border:1px solid rgba(245,158,11,.15)}',
            '.ach-summary-text{font-size:13px;color:rgba(255,255,255,.7);font-weight:600}',
            '.ach-summary-text span{color:#f59e0b;font-weight:800}',
            '.ach-summary-bar{flex:1;height:8px;background:rgba(255,255,255,.08);border-radius:4px;overflow:hidden}',
            '.ach-summary-fill{height:100%;background:linear-gradient(90deg,#f59e0b,#fbbf24);' +
                'border-radius:4px;transition:width .4s ease}',

            /* Badge grid */
            '.ach-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px}',

            /* Badge card */
            '.ach-card{position:relative;padding:16px 12px 12px;border-radius:12px;text-align:center;' +
                'border:1px solid rgba(255,255,255,.06);transition:transform .2s,border-color .2s}',
            '.ach-card:hover{transform:translateY(-2px)}',
            '.ach-card.ach-locked{background:rgba(255,255,255,.03);border-color:rgba(255,255,255,.06)}',
            '.ach-card.ach-unlocked{background:linear-gradient(160deg,rgba(245,158,11,.1),rgba(34,197,94,.08));' +
                'border-color:rgba(245,158,11,.25)}',
            '.ach-card.ach-unlocked:hover{border-color:rgba(245,158,11,.5)}',

            /* Icon area */
            '.ach-icon-wrap{position:relative;width:56px;height:56px;margin:0 auto 8px;' +
                'display:flex;align-items:center;justify-content:center;border-radius:50%;font-size:28px}',
            '.ach-locked .ach-icon-wrap{background:rgba(255,255,255,.05);' +
                'filter:grayscale(1) brightness(.5)}',
            '.ach-unlocked .ach-icon-wrap{background:linear-gradient(135deg,rgba(245,158,11,.2),rgba(251,191,36,.15))}',

            /* Lock / check overlay */
            '.ach-status-icon{position:absolute;bottom:-2px;right:-2px;width:20px;height:20px;' +
                'border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;' +
                'font-weight:800;border:2px solid #0f0f23}',
            '.ach-locked .ach-status-icon{background:#4b5563;color:#9ca3af}',
            '.ach-unlocked .ach-status-icon{background:#22c55e;color:#fff}',

            /* Text */
            '.ach-card-name{font-size:12px;font-weight:700;color:#fff;margin-bottom:2px;' +
                'white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
            '.ach-locked .ach-card-name{color:rgba(255,255,255,.35)}',
            '.ach-card-desc{font-size:10px;color:rgba(255,255,255,.35);margin-bottom:6px;line-height:1.3}',
            '.ach-unlocked .ach-card-desc{color:rgba(255,255,255,.5)}',

            /* Reward label */
            '.ach-reward{font-size:10px;font-weight:700;margin-bottom:6px}',
            '.ach-locked .ach-reward{color:rgba(255,255,255,.2)}',
            '.ach-unlocked .ach-reward{color:#22c55e}',

            /* Progress bar */
            '.ach-prog-wrap{height:6px;background:rgba(255,255,255,.06);border-radius:3px;overflow:hidden}',
            '.ach-prog-fill{height:100%;border-radius:3px;transition:width .3s ease}',
            '.ach-locked .ach-prog-fill{background:rgba(255,255,255,.15)}',
            '.ach-unlocked .ach-prog-fill{background:linear-gradient(90deg,#22c55e,#4ade80)}',

            /* Progress text */
            '.ach-prog-text{font-size:9px;color:rgba(255,255,255,.3);margin-top:3px;font-weight:600}',
            '.ach-unlocked .ach-prog-text{color:rgba(34,197,94,.7)}',

            /* Scrollbar */
            '#' + PANEL_ID + '::-webkit-scrollbar{width:6px}',
            '#' + PANEL_ID + '::-webkit-scrollbar-track{background:transparent}',
            '#' + PANEL_ID + '::-webkit-scrollbar-thumb{background:rgba(245,158,11,.3);border-radius:3px}',

            /* Entrance animation for newly unlocked */
            '@keyframes achUnlockPulse{' +
                '0%{box-shadow:0 0 0 0 rgba(245,158,11,.4)}' +
                '70%{box-shadow:0 0 0 10px rgba(245,158,11,0)}' +
                '100%{box-shadow:0 0 0 0 rgba(245,158,11,0)}}',
            '.ach-card.ach-unlocked{animation:achUnlockPulse 1.5s ease 1}',

            /* Responsive */
            '@media(max-width:480px){' +
                '.ach-grid{grid-template-columns:repeat(2,1fr);gap:8px}' +
                '#' + PANEL_ID + '{padding:16px 12px 14px}' +
                '.ach-title{font-size:17px}' +
                '.ach-icon-wrap{width:44px;height:44px;font-size:22px}}'
        ].join('\n');
        document.head.appendChild(s);
    }

    // ── FAB Button ───────────────────────────────────────────────
    function buildFab() {
        if (document.getElementById(FAB_ID)) { updateFabBadge(); return; }

        var fab = document.createElement('div');
        fab.id = FAB_ID;
        fab.title = 'Achievements';

        var icon = document.createTextNode('\uD83C\uDFC5');
        fab.appendChild(icon);

        var badge = document.createElement('span');
        badge.className = 'ach-fab-badge';
        badge.id = 'achFabBadge';
        badge.style.display = 'none';
        fab.appendChild(badge);

        fab.addEventListener('click', function() {
            togglePanel();
        });

        document.body.appendChild(fab);
        updateFabBadge();
    }

    function updateFabBadge() {
        var badge = document.getElementById('achFabBadge');
        if (!badge || !_state) return;

        // Show total unlocked count
        var total = _state.unlocked.length;
        if (total > 0) {
            badge.textContent = String(total);
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    }

    // ── Panel Toggle ─────────────────────────────────────────────
    function togglePanel() {
        if (_panelOpen) {
            closePanel();
        } else {
            openPanel();
        }
    }

    function openPanel() {
        _panelOpen = true;
        ensurePanelDOM();
        renderPanel();

        // Sync server state every time the panel opens so the user always
        // sees server-verified unlocks merged into the local view.
        _syncAchievementsFromServer();

        var overlay = document.getElementById(OVERLAY_ID);
        var panel   = document.getElementById(PANEL_ID);

        // Double-RAF for animation
        requestAnimationFrame(function() {
            requestAnimationFrame(function() {
                if (overlay) overlay.classList.add('ach-visible');
                if (panel)   panel.classList.add('ach-visible');
            });
        });
    }

    function closePanel() {
        _panelOpen = false;
        var overlay = document.getElementById(OVERLAY_ID);
        var panel   = document.getElementById(PANEL_ID);

        if (overlay) overlay.classList.remove('ach-visible');
        if (panel)   panel.classList.remove('ach-visible');
    }

    function ensurePanelDOM() {
        if (document.getElementById(OVERLAY_ID)) return;

        // Overlay
        var overlay = document.createElement('div');
        overlay.id = OVERLAY_ID;
        overlay.addEventListener('click', function() { closePanel(); });
        document.body.appendChild(overlay);

        // Panel
        var panel = document.createElement('div');
        panel.id = PANEL_ID;
        panel.addEventListener('click', function(e) { e.stopPropagation(); });
        document.body.appendChild(panel);
    }

    // ── Panel Rendering ──────────────────────────────────────────
    function renderPanel() {
        var panel = document.getElementById(PANEL_ID);
        if (!panel || !_state) return;

        // Clear existing content
        while (panel.firstChild) panel.removeChild(panel.firstChild);

        // Header
        var header = document.createElement('div');
        header.className = 'ach-header';

        var titleWrap = document.createElement('div');

        var title = document.createElement('div');
        title.className = 'ach-title';
        title.textContent = '\uD83C\uDFC5 Achievements';
        titleWrap.appendChild(title);

        var subtitle = document.createElement('div');
        subtitle.className = 'ach-subtitle';
        subtitle.textContent = _state.unlocked.length + ' of ' + ACHIEVEMENTS.length + ' unlocked';
        titleWrap.appendChild(subtitle);

        var closeBtn = document.createElement('button');
        closeBtn.className = 'ach-close';
        closeBtn.textContent = '\u2715';
        closeBtn.addEventListener('click', function() { closePanel(); });

        header.appendChild(titleWrap);
        header.appendChild(closeBtn);
        panel.appendChild(header);

        // Summary progress bar
        var summary = document.createElement('div');
        summary.className = 'ach-summary';

        var summaryText = document.createElement('div');
        summaryText.className = 'ach-summary-text';

        var pctNum = ACHIEVEMENTS.length > 0
            ? Math.round((_state.unlocked.length / ACHIEVEMENTS.length) * 100) : 0;

        var pctSpan = document.createElement('span');
        pctSpan.textContent = pctNum + '%';
        summaryText.appendChild(pctSpan);

        var restText = document.createTextNode(' complete');
        summaryText.appendChild(restText);

        var summaryBar = document.createElement('div');
        summaryBar.className = 'ach-summary-bar';

        var summaryFill = document.createElement('div');
        summaryFill.className = 'ach-summary-fill';
        summaryFill.style.width = '0%';
        summaryBar.appendChild(summaryFill);

        summary.appendChild(summaryText);
        summary.appendChild(summaryBar);
        panel.appendChild(summary);

        // Animate the summary fill after a frame
        requestAnimationFrame(function() {
            requestAnimationFrame(function() {
                summaryFill.style.width = pctNum + '%';
            });
        });

        // Stats row
        var statsRow = document.createElement('div');
        statsRow.style.cssText = 'display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap';

        var statItems = [
            { label: 'Spins', value: String(_state.spinCount) },
            { label: 'Best Win', value: '$' + _state.maxWin.toFixed(2) },
            { label: 'Win Streak', value: String(_state.winStreak) },
            { label: 'Games', value: String(_state.gamesPlayed.length) }
        ];

        for (var si = 0; si < statItems.length; si++) {
            var statChip = document.createElement('div');
            statChip.style.cssText = 'flex:1;min-width:70px;padding:6px 8px;background:rgba(255,255,255,.04);' +
                'border-radius:8px;text-align:center;border:1px solid rgba(255,255,255,.06)';

            var statVal = document.createElement('div');
            statVal.style.cssText = 'font-size:14px;font-weight:800;color:#f59e0b';
            statVal.textContent = statItems[si].value;

            var statLbl = document.createElement('div');
            statLbl.style.cssText = 'font-size:9px;color:rgba(255,255,255,.35);margin-top:2px;text-transform:uppercase;letter-spacing:.5px';
            statLbl.textContent = statItems[si].label;

            statChip.appendChild(statVal);
            statChip.appendChild(statLbl);
            statsRow.appendChild(statChip);
        }
        panel.appendChild(statsRow);

        // Badge grid
        var grid = document.createElement('div');
        grid.className = 'ach-grid';

        // Show unlocked first, then locked
        var sortedAch = [];
        for (var ui = 0; ui < ACHIEVEMENTS.length; ui++) {
            if (isUnlocked(ACHIEVEMENTS[ui].id)) sortedAch.push(ACHIEVEMENTS[ui]);
        }
        for (var li = 0; li < ACHIEVEMENTS.length; li++) {
            if (!isUnlocked(ACHIEVEMENTS[li].id)) sortedAch.push(ACHIEVEMENTS[li]);
        }

        for (var i = 0; i < sortedAch.length; i++) {
            grid.appendChild(buildCard(sortedAch[i]));
        }

        panel.appendChild(grid);

        // Total rewards footer
        var totalReward = 0;
        for (var ri = 0; ri < ACHIEVEMENTS.length; ri++) {
            if (isUnlocked(ACHIEVEMENTS[ri].id)) {
                totalReward += ACHIEVEMENTS[ri].reward;
            }
        }
        totalReward = Math.round(totalReward * 100) / 100;

        var footer = document.createElement('div');
        footer.style.cssText = 'text-align:center;margin-top:16px;padding-top:12px;' +
            'border-top:1px solid rgba(255,255,255,.06)';

        var footerText = document.createElement('div');
        footerText.style.cssText = 'font-size:11px;color:rgba(255,255,255,.35)';
        footerText.textContent = 'Total earned: $' + totalReward.toFixed(2) + ' of $' +
            calcTotalPossible().toFixed(2);

        footer.appendChild(footerText);
        panel.appendChild(footer);
    }

    function calcTotalPossible() {
        var total = 0;
        for (var i = 0; i < ACHIEVEMENTS.length; i++) {
            total += ACHIEVEMENTS[i].reward;
        }
        return Math.round(total * 100) / 100;
    }

    function buildCard(ach) {
        var unlocked = isUnlocked(ach.id);
        var progress = getProgress(ach);
        var pct      = Math.min(100, Math.round((progress / ach.target) * 100));

        var card = document.createElement('div');
        card.className = 'ach-card ' + (unlocked ? 'ach-unlocked' : 'ach-locked');

        // Icon container
        var iconWrap = document.createElement('div');
        iconWrap.className = 'ach-icon-wrap';

        var iconText = document.createElement('span');
        iconText.textContent = ach.icon;
        iconWrap.appendChild(iconText);

        // Status icon (lock or checkmark)
        var statusIcon = document.createElement('div');
        statusIcon.className = 'ach-status-icon';
        statusIcon.textContent = unlocked ? '\u2713' : '\uD83D\uDD12';
        iconWrap.appendChild(statusIcon);

        card.appendChild(iconWrap);

        // Name
        var nameEl = document.createElement('div');
        nameEl.className = 'ach-card-name';
        nameEl.textContent = ach.name;
        nameEl.title = ach.name;
        card.appendChild(nameEl);

        // Description
        var descEl = document.createElement('div');
        descEl.className = 'ach-card-desc';
        descEl.textContent = ach.desc;
        card.appendChild(descEl);

        // Reward
        var rewardEl = document.createElement('div');
        rewardEl.className = 'ach-reward';
        rewardEl.textContent = unlocked
            ? '\u2713 +$' + ach.reward.toFixed(2) + ' claimed'
            : '+$' + ach.reward.toFixed(2);
        card.appendChild(rewardEl);

        // Progress bar
        var progWrap = document.createElement('div');
        progWrap.className = 'ach-prog-wrap';

        var progFill = document.createElement('div');
        progFill.className = 'ach-prog-fill';
        progFill.style.width = '0%';
        progWrap.appendChild(progFill);
        card.appendChild(progWrap);

        // Progress text
        var progText = document.createElement('div');
        progText.className = 'ach-prog-text';
        progText.textContent = formatProgressLabel(ach, progress);
        card.appendChild(progText);

        // Animate fill after paint
        requestAnimationFrame(function() {
            requestAnimationFrame(function() {
                progFill.style.width = pct + '%';
            });
        });

        return card;
    }

    function formatProgressLabel(ach, progress) {
        if (isUnlocked(ach.id)) return 'Completed!';

        switch (ach.type) {
            case 'spins':
                return progress + ' / ' + ach.target + ' spins';
            case 'max_bet':
                return '$' + progress.toFixed(2) + ' / $' + ach.target.toFixed(2);
            case 'streak':
                return progress + ' / ' + ach.target + ' wins';
            case 'max_win':
                return '$' + progress.toFixed(2) + ' / $' + ach.target.toFixed(2);
            case 'games':
                return progress + ' / ' + ach.target + ' games';
            default:
                return progress + ' / ' + ach.target;
        }
    }

    // ── Server API Sync ──────────────────────────────────────────
    function _syncAchievementsFromServer() {
        // Only sync when a user is logged in — check both the JWT token and the
        // currentUser global so we skip unauthenticated sessions cleanly.
        var token = null;

        // Prefer the named constant if it loaded before this IIFE ran.
        if (typeof STORAGE_KEY_TOKEN !== 'undefined') {
            token = localStorage.getItem(STORAGE_KEY_TOKEN);
        }
        // Fallback: try the well-known legacy key name used by some auth paths.
        if (!token) {
            token = localStorage.getItem('matrix_auth_token');
        }
        // Final fallback: try 'casinoToken' directly.
        if (!token) {
            token = localStorage.getItem('casinoToken');
        }

        // Also require the in-memory currentUser to be populated.
        var userLoggedIn = typeof currentUser !== 'undefined' && !!currentUser;

        if (!token || !userLoggedIn) return;

        var authHeader = { 'Authorization': 'Bearer ' + token };

        // ── 1. GET /api/achievements ──────────────────────────────
        fetch('/api/achievements', {
            method: 'GET',
            headers: authHeader
        })
        .then(function(res) { return res.json(); })
        .then(function(data) {
            if (!data || !Array.isArray(data.achievements)) return;
            if (!_state) return;

            var newlyMerged = [];

            data.achievements.forEach(function(svrAch) {
                if (!svrAch.unlocked) return;
                // Merge: add to local unlocked if not already there.
                if (_state.unlocked.indexOf(svrAch.id) === -1) {
                    _state.unlocked.push(svrAch.id);
                    newlyMerged.push(svrAch);
                }
            });

            if (newlyMerged.length > 0) {
                saveState();
                updateFabBadge();
                if (_panelOpen) renderPanel();

                // Show toast for each newly-discovered server unlock.
                newlyMerged.forEach(function(svrAch, idx) {
                    setTimeout(function() {
                        var reward = typeof svrAch.rewardAmount === 'number' ? svrAch.rewardAmount : 0;
                        var rewardLabel = svrAch.rewardType === 'gems'
                            ? ('+' + reward + ' gems')
                            : ('+$' + reward.toFixed ? '+$' + reward.toFixed(2) : '+' + reward);
                        var msg = '\uD83C\uDFC5 ' + (svrAch.name || svrAch.id) + '! ' + rewardLabel;
                        if (typeof showWinToast === 'function') {
                            showWinToast(msg, 'epic');
                        }
                    }, TOAST_DELAY + idx * 800);
                });
            } else if (_panelOpen) {
                // Still refresh panel so server-sourced data shows correctly.
                renderPanel();
            }
        })
        .catch(function() {
            // Network error — silently ignore; localStorage state remains active.
        });

        // ── 2. POST /api/achievements/check (fire-and-forget) ─────
        // Let the server evaluate conditions against the authoritative DB.
        // No UI dependency on the result — a subsequent openPanel() call will
        // pick up any new unlocks via the GET above.
        fetch('/api/achievements/check', {
            method: 'POST',
            headers: Object.assign({ 'Content-Type': 'application/json' }, authHeader),
            body: JSON.stringify({})
        }).catch(function() { /* fire-and-forget — ignore errors */ });
    }

    // ── Hook: displayServerWinResult ─────────────────────────────
    function hookDisplayServerWinResult() {
        var _orig = window.displayServerWinResult;
        if (typeof _orig !== 'function') return;

        window.displayServerWinResult = function(result, game) {
            // Always call original first
            _orig.call(this, result, game);

            // Extract tracking data
            var betAmt = (typeof currentBet !== 'undefined') ? currentBet : 0;
            var winAmt = (result && typeof result.winAmount === 'number') ? result.winAmount : 0;
            var gameId = '';

            if (game && game.id) {
                gameId = game.id;
            } else if (typeof currentGame !== 'undefined' && currentGame && currentGame.id) {
                gameId = currentGame.id;
            }

            // Also check global bet variable as fallback
            if (betAmt === 0 && typeof bet !== 'undefined' && typeof bet === 'number') {
                betAmt = bet;
            }

            trackSpin(betAmt, winAmt, gameId);
        };
    }

    // ── Polling: game changes + bet tracking ─────────────────────
    function startPolling() {
        if (_pollTimer) return;
        _pollTimer = setInterval(function() {
            pollGameChange();
            pollBetAmount();
        }, POLL_MS);
    }

    function pollBetAmount() {
        if (!_state) return;

        // Check current bet for max bet tracking (catches bets set outside of spins)
        var betVal = 0;
        if (typeof currentBet !== 'undefined' && typeof currentBet === 'number') {
            betVal = currentBet;
        } else if (typeof bet !== 'undefined' && typeof bet === 'number') {
            betVal = bet;
        }

        if (betVal > 0 && betVal > _state.maxBet) {
            _state.maxBet = betVal;
            saveState();
            checkAndUnlock();
        }
    }

    // ── Keyboard: Escape to close ────────────────────────────────
    function handleKeydown(e) {
        if (e.key === 'Escape' && _panelOpen) {
            closePanel();
        }
    }

    // ── Public API ───────────────────────────────────────────────
    window.getAchievementInfo = function() {
        if (!_state) return null;
        return {
            unlocked:     _state.unlocked.slice(),
            total:        ACHIEVEMENTS.length,
            spinCount:    _state.spinCount,
            maxBet:       _state.maxBet,
            winStreak:    _state.winStreak,
            maxWin:       _state.maxWin,
            gamesPlayed:  _state.gamesPlayed.length
        };
    };

    window.resetAchievements = function() {
        _state = defaultState();
        saveState();
        updateFabBadge();
        if (_panelOpen) renderPanel();
    };

    window.openAchievements = function() {
        openPanel();
    };

    // ── Init ─────────────────────────────────────────────────────
    function init() {
        _state = loadState();
        injectStyles();
        buildFab();
        hookDisplayServerWinResult();
        startPolling();
        document.addEventListener('keydown', handleKeydown);

        // Check for any achievements that should already be unlocked
        // (e.g., if state was updated by another module before init)
        checkAndUnlock();
    }

    // Boot after DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(init, 800);
        });
    } else {
        setTimeout(init, 800);
    }

}());
