// Sprint 81: Daily Challenge System
// Daily tasks that award bonus credits on completion.
// Drives daily return visits and longer sessions by giving players
// specific goals to work toward. Resets every 24 hours.
(function() {
    'use strict';

    // ── Config ────────────────────────────────────────────────
    var STORAGE_KEY       = 'dailyChallenges';
    var RESET_HOUR        = 0;  // midnight local time
    var MAX_ACTIVE        = 3;  // 3 challenges per day
    var DISMISS_TIMEOUT   = 25000;
    var _stylesInjected   = false;
    var _challenges       = null;
    var _overlayEl        = null;
    var _panelEl          = null;

    // ── Challenge templates ──────────────────────────────────
    var TEMPLATES = [
        { id: 'spin_count',    desc: 'Complete {n} spins',            icon: '\uD83C\uDFB0', targets: [10, 20, 50],   reward: [0.50, 1.00, 2.50] },
        { id: 'win_count',     desc: 'Win {n} times',                 icon: '\uD83C\uDFC6', targets: [3, 5, 10],     reward: [0.75, 1.50, 3.00] },
        { id: 'big_win',       desc: 'Hit a {n}x+ win',              icon: '\u26A1',        targets: [3, 5, 10],     reward: [1.00, 2.00, 5.00] },
        { id: 'try_games',     desc: 'Play {n} different games',      icon: '\uD83C\uDFAE', targets: [2, 3, 5],      reward: [0.50, 1.00, 2.00] },
        { id: 'total_wagered', desc: 'Wager a total of ${n}',         icon: '\uD83D\uDCB0', targets: [10, 25, 50],   reward: [0.50, 1.25, 2.50] },
        { id: 'streak',        desc: 'Hit a {n}-win streak',          icon: '\uD83D\uDD25', targets: [3, 5, 7],      reward: [1.00, 2.50, 5.00] },
        { id: 'bet_high',      desc: 'Place a bet of ${n}+',         icon: '\uD83D\uDC8E', targets: [1, 5, 10],     reward: [0.25, 0.75, 1.50] },
        { id: 'free_spins',    desc: 'Trigger free spins {n} times',  icon: '\u2B50',        targets: [1, 2, 3],      reward: [1.00, 2.00, 4.00] }
    ];

    // ── Utility ──────────────────────────────────────────────
    function todayKey() {
        var d = new Date();
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }

    function shuffle(arr) {
        for (var i = arr.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
        }
        return arr;
    }

    // ── Persistence ──────────────────────────────────────────
    function loadChallenges() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                var data = JSON.parse(raw);
                if (data && data.day === todayKey()) {
                    _challenges = data;
                    return;
                }
            }
        } catch (e) { /* ignore */ }
        // Generate new challenges for today
        generateChallenges();
    }

    function saveChallenges() {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(_challenges)); } catch (e) { /* ignore */ }
    }

    function generateChallenges() {
        var pool = shuffle(TEMPLATES.slice());
        var picked = pool.slice(0, MAX_ACTIVE);
        var tasks = [];
        for (var i = 0; i < picked.length; i++) {
            var t = picked[i];
            // Pick a random difficulty (0=easy, 1=med, 2=hard)
            var diff = Math.floor(Math.random() * 3);
            var target = t.targets[diff];
            var reward = t.reward[diff];
            tasks.push({
                templateId: t.id,
                desc: t.desc.replace('{n}', String(target)),
                icon: t.icon,
                target: target,
                reward: reward,
                progress: 0,
                claimed: false
            });
        }
        _challenges = {
            day: todayKey(),
            tasks: tasks,
            gamesPlayed: [],
            totalWagered: 0,
            maxStreak: 0,
            spins: 0,
            wins: 0,
            bigWins: 0,
            maxBet: 0,
            freeSpinTriggers: 0
        };
        saveChallenges();
    }

    // ── Progress tracking ────────────────────────────────────
    function updateProgress() {
        if (!_challenges) return;
        var tasks = _challenges.tasks;
        var changed = false;
        for (var i = 0; i < tasks.length; i++) {
            var t = tasks[i];
            if (t.claimed) continue;
            var oldP = t.progress;
            switch (t.templateId) {
                case 'spin_count':    t.progress = Math.min(_challenges.spins, t.target); break;
                case 'win_count':     t.progress = Math.min(_challenges.wins, t.target); break;
                case 'big_win':       t.progress = _challenges.bigWins >= 1 ? t.target : 0; break;
                case 'try_games':     t.progress = Math.min(_challenges.gamesPlayed.length, t.target); break;
                case 'total_wagered': t.progress = Math.min(Math.floor(_challenges.totalWagered), t.target); break;
                case 'streak':        t.progress = Math.min(_challenges.maxStreak, t.target); break;
                case 'bet_high':      t.progress = _challenges.maxBet >= t.target ? t.target : 0; break;
                case 'free_spins':    t.progress = Math.min(_challenges.freeSpinTriggers, t.target); break;
            }
            if (t.progress !== oldP) changed = true;
        }
        if (changed) {
            saveChallenges();
            refreshPanelIfOpen();
        }
    }

    // ── Event hooks ──────────────────────────────────────────
    function onSpin(betAmount, gameId) {
        if (!_challenges) return;
        _challenges.spins++;
        _challenges.totalWagered += betAmount;
        if (betAmount > _challenges.maxBet) _challenges.maxBet = betAmount;
        if (gameId && _challenges.gamesPlayed.indexOf(gameId) === -1) {
            _challenges.gamesPlayed.push(gameId);
        }
        updateProgress();
    }

    function onWin(winAmount, betAmount) {
        if (!_challenges) return;
        _challenges.wins++;
        var mult = betAmount > 0 ? winAmount / betAmount : 0;
        // Check for big win (using target from challenge)
        for (var i = 0; i < _challenges.tasks.length; i++) {
            if (_challenges.tasks[i].templateId === 'big_win' && !_challenges.tasks[i].claimed) {
                if (mult >= _challenges.tasks[i].target) {
                    _challenges.bigWins++;
                }
            }
        }
        // Track streak
        var streak = (typeof window._winStreak !== 'undefined') ? window._winStreak : 0;
        if (streak > _challenges.maxStreak) _challenges.maxStreak = streak;
        updateProgress();
    }

    function onFreeSpinTrigger() {
        if (!_challenges) return;
        _challenges.freeSpinTriggers++;
        updateProgress();
    }

    // ── Styles ───────────────────────────────────────────────
    function injectStyles() {
        if (_stylesInjected) return;
        _stylesInjected = true;
        var s = document.createElement('style');
        s.id = 'dailyChallengeStyles';
        s.textContent = [
            '#dcPanel{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) scale(.85);' +
                'z-index:10400;background:linear-gradient(160deg,#0d1117,#161b22);' +
                'border:2px solid rgba(88,166,255,.4);border-radius:20px;padding:24px 20px;' +
                'max-width:400px;width:92%;max-height:80vh;overflow-y:auto;' +
                'box-shadow:0 0 40px rgba(88,166,255,.2);color:#e6edf3;font-family:inherit;' +
                'opacity:0;transition:opacity .3s ease,transform .3s ease}',
            '#dcPanel.active{opacity:1;transform:translate(-50%,-50%) scale(1)}',
            '#dcOverlay{position:fixed;inset:0;z-index:10400;background:rgba(0,0,0,.75);' +
                'opacity:0;transition:opacity .3s ease}',
            '#dcOverlay.active{opacity:1}',
            '.dc-header{text-align:center;margin-bottom:16px}',
            '.dc-title{font-size:20px;font-weight:900;color:#58a6ff;letter-spacing:1px}',
            '.dc-subtitle{font-size:11px;color:rgba(255,255,255,.4);margin-top:4px}',
            '.dc-task{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);' +
                'border-radius:12px;padding:14px;margin-bottom:10px;position:relative;overflow:hidden}',
            '.dc-task.completed{border-color:rgba(34,197,94,.4);background:rgba(34,197,94,.06)}',
            '.dc-task.claimed{opacity:.5}',
            '.dc-task-top{display:flex;align-items:center;gap:10px;margin-bottom:8px}',
            '.dc-task-icon{font-size:24px}',
            '.dc-task-desc{flex:1;font-size:13px;font-weight:600;color:#e6edf3}',
            '.dc-task-reward{font-size:14px;font-weight:800;color:#fbbf24}',
            '.dc-progress-bar{height:6px;background:rgba(255,255,255,.08);border-radius:3px;overflow:hidden}',
            '.dc-progress-fill{height:100%;background:linear-gradient(90deg,#3b82f6,#8b5cf6);' +
                'border-radius:3px;transition:width .4s ease}',
            '.dc-progress-fill.done{background:linear-gradient(90deg,#22c55e,#16a34a)}',
            '.dc-progress-text{font-size:10px;color:rgba(255,255,255,.4);margin-top:4px;text-align:right}',
            '.dc-claim-btn{display:block;width:100%;margin-top:8px;padding:8px;border:none;' +
                'border-radius:8px;background:linear-gradient(135deg,#22c55e,#16a34a);' +
                'color:#fff;font-size:12px;font-weight:800;cursor:pointer;letter-spacing:.5px;' +
                'transition:opacity .15s}',
            '.dc-claim-btn:hover{opacity:.85}',
            '.dc-close-btn{display:block;margin:12px auto 0;background:none;border:none;' +
                'color:rgba(255,255,255,.3);font-size:12px;cursor:pointer;text-decoration:underline}',
            '#dcFab{position:fixed;bottom:140px;left:16px;z-index:10400;width:48px;height:48px;' +
                'border-radius:50%;background:linear-gradient(135deg,#3b82f6,#8b5cf6);' +
                'border:2px solid rgba(139,92,246,.5);color:#fff;font-size:22px;' +
                'display:flex;align-items:center;justify-content:center;cursor:pointer;' +
                'box-shadow:0 4px 16px rgba(59,130,246,.4);transition:transform .2s}',
            '#dcFab:hover{transform:scale(1.1)}',
            '#dcFab .dc-fab-badge{position:absolute;top:-4px;right:-4px;background:#ef4444;' +
                'color:#fff;font-size:10px;font-weight:800;min-width:18px;height:18px;' +
                'border-radius:9px;display:flex;align-items:center;justify-content:center;' +
                'padding:0 4px}'
        ].join('\n');
        document.head.appendChild(s);
    }

    // ── FAB (Floating Action Button) ─────────────────────────
    function buildFab() {
        injectStyles();
        var fab = document.getElementById('dcFab');
        if (fab) { updateFabBadge(fab); return; }

        fab = document.createElement('div');
        fab.id = 'dcFab';
        fab.title = 'Daily Challenges';

        var icon = document.createTextNode('\uD83C\uDFAF');
        fab.appendChild(icon);

        var badge = document.createElement('span');
        badge.className = 'dc-fab-badge';
        badge.id = 'dcFabBadge';
        fab.appendChild(badge);

        fab.addEventListener('click', function() { togglePanel(); });
        document.body.appendChild(fab);
        updateFabBadge(fab);
    }

    function updateFabBadge() {
        var badge = document.getElementById('dcFabBadge');
        if (!badge || !_challenges) return;
        var ready = 0;
        for (var i = 0; i < _challenges.tasks.length; i++) {
            var t = _challenges.tasks[i];
            if (!t.claimed && t.progress >= t.target) ready++;
        }
        if (ready > 0) {
            badge.textContent = String(ready);
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    }

    // ── Panel UI ─────────────────────────────────────────────
    function togglePanel() {
        if (_panelEl && _panelEl.classList.contains('active')) {
            closePanel();
        } else {
            openPanel();
        }
    }

    function openPanel() {
        injectStyles();
        // Remove old
        var oldOv = document.getElementById('dcOverlay');
        if (oldOv && oldOv.parentNode) oldOv.parentNode.removeChild(oldOv);
        var oldP = document.getElementById('dcPanel');
        if (oldP && oldP.parentNode) oldP.parentNode.removeChild(oldP);

        // Overlay
        _overlayEl = document.createElement('div');
        _overlayEl.id = 'dcOverlay';
        _overlayEl.addEventListener('click', closePanel);
        document.body.appendChild(_overlayEl);

        // Panel
        _panelEl = document.createElement('div');
        _panelEl.id = 'dcPanel';
        renderPanelContent(_panelEl);
        document.body.appendChild(_panelEl);

        requestAnimationFrame(function() {
            requestAnimationFrame(function() {
                if (_overlayEl) _overlayEl.classList.add('active');
                if (_panelEl) _panelEl.classList.add('active');
            });
        });
    }

    function closePanel() {
        if (_overlayEl) _overlayEl.classList.remove('active');
        if (_panelEl) _panelEl.classList.remove('active');
        setTimeout(function() {
            if (_overlayEl && _overlayEl.parentNode) _overlayEl.parentNode.removeChild(_overlayEl);
            if (_panelEl && _panelEl.parentNode) _panelEl.parentNode.removeChild(_panelEl);
            _overlayEl = null;
            _panelEl = null;
        }, 350);
    }

    function renderPanelContent(panel) {
        panel.textContent = '';
        if (!_challenges) return;

        // Header
        var header = document.createElement('div');
        header.className = 'dc-header';
        var title = document.createElement('div');
        title.className = 'dc-title';
        title.textContent = '\uD83C\uDFAF Daily Challenges';
        var subtitle = document.createElement('div');
        subtitle.className = 'dc-subtitle';
        subtitle.textContent = 'Complete tasks to earn bonus credits \u2022 Resets at midnight';
        header.appendChild(title);
        header.appendChild(subtitle);
        panel.appendChild(header);

        // Tasks
        var tasks = _challenges.tasks;
        for (var i = 0; i < tasks.length; i++) {
            var t = tasks[i];
            var taskEl = document.createElement('div');
            taskEl.className = 'dc-task';
            var isComplete = t.progress >= t.target;
            if (isComplete) taskEl.classList.add('completed');
            if (t.claimed) taskEl.classList.add('claimed');

            // Top row
            var top = document.createElement('div');
            top.className = 'dc-task-top';
            var iconEl = document.createElement('span');
            iconEl.className = 'dc-task-icon';
            iconEl.textContent = t.icon;
            var descEl = document.createElement('span');
            descEl.className = 'dc-task-desc';
            descEl.textContent = t.desc;
            var rewardEl = document.createElement('span');
            rewardEl.className = 'dc-task-reward';
            rewardEl.textContent = '+$' + t.reward.toFixed(2);
            top.appendChild(iconEl);
            top.appendChild(descEl);
            top.appendChild(rewardEl);
            taskEl.appendChild(top);

            // Progress bar
            var barWrap = document.createElement('div');
            barWrap.className = 'dc-progress-bar';
            var barFill = document.createElement('div');
            barFill.className = 'dc-progress-fill';
            if (isComplete) barFill.classList.add('done');
            var pct = Math.min(100, Math.round((t.progress / t.target) * 100));
            barFill.style.width = pct + '%';
            barWrap.appendChild(barFill);
            taskEl.appendChild(barWrap);

            // Progress text
            var pText = document.createElement('div');
            pText.className = 'dc-progress-text';
            pText.textContent = t.progress + ' / ' + t.target + (t.claimed ? ' \u2705 Claimed' : '');
            taskEl.appendChild(pText);

            // Claim button (if complete and not claimed)
            if (isComplete && !t.claimed) {
                var claimBtn = document.createElement('button');
                claimBtn.className = 'dc-claim-btn';
                claimBtn.textContent = '\uD83C\uDF1F CLAIM +$' + t.reward.toFixed(2);
                (function(task) {
                    claimBtn.addEventListener('click', function() {
                        claimReward(task);
                    });
                })(t);
                taskEl.appendChild(claimBtn);
            }

            panel.appendChild(taskEl);
        }

        // Close button
        var closeBtn = document.createElement('button');
        closeBtn.className = 'dc-close-btn';
        closeBtn.textContent = 'Close';
        closeBtn.addEventListener('click', closePanel);
        panel.appendChild(closeBtn);
    }

    function refreshPanelIfOpen() {
        if (_panelEl && _panelEl.classList.contains('active')) {
            renderPanelContent(_panelEl);
        }
        updateFabBadge();
    }

    function claimReward(task) {
        if (task.claimed) return;
        task.claimed = true;
        // Credit balance
        if (typeof balance !== 'undefined') balance += task.reward;
        if (typeof updateBalance === 'function') updateBalance();
        if (typeof saveBalance === 'function') saveBalance();
        if (typeof stats !== 'undefined') {
            stats.totalWon = (stats.totalWon || 0) + task.reward;
            if (typeof saveStats === 'function') saveStats();
        }
        saveChallenges();
        refreshPanelIfOpen();
        // Toast
        if (typeof showWinToast === 'function') {
            showWinToast('Challenge Complete! +$' + task.reward.toFixed(2), 'epic');
        }
    }

    // ── Hook into spin/win events ────────────────────────────
    function hookSpinEvents() {
        // Hook displayServerWinResult for win tracking
        var _origDSWR = window.displayServerWinResult;
        if (typeof _origDSWR === 'function') {
            window.displayServerWinResult = function(result, game) {
                _origDSWR.call(this, result, game);
                if (!result) return;
                var bet = (typeof currentBet !== 'undefined') ? currentBet : 1;
                var gameId = (game && game.id) ? game.id : (typeof currentGame !== 'undefined' && currentGame ? currentGame.id : '');
                // Track spin
                onSpin(bet, gameId);
                // Track win
                if (result.winAmount > 0) {
                    onWin(result.winAmount, bet);
                }
            };
        }

        // Hook free spin triggers
        var _origTFS = window.triggerFreeSpins;
        if (typeof _origTFS === 'function') {
            window.triggerFreeSpins = function() {
                onFreeSpinTrigger();
                return _origTFS.apply(this, arguments);
            };
        }
    }

    // ── Init ─────────────────────────────────────────────────
    function init() {
        // QA suppression
        if (window.location.search.indexOf('noBonus=1') !== -1) return;
        if (window.location.search.indexOf('qaTools=1') !== -1) return;

        loadChallenges();
        hookSpinEvents();
        // Build FAB after a short delay
        setTimeout(buildFab, 2000);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        setTimeout(init, 0);
    }

    // ── In-slot Daily Challenge Widget ───────────────────────
    // A compact floating pill that appears inside the slot modal while
    // the player is actively playing. Shows live challenge progress
    // and updates on every spin without opening the full panel.

    var _slotWidgetEl        = null;
    var _slotWidgetExpanded  = false;
    var _slotWidgetDismissed = false;
    var _slotWidgetStyles    = false;
    var _slotObserver        = null;
    var _slotSpinWatcher     = null;
    var _lastSpinState       = false;  // previous value of window.spinning

    // Inject widget-specific styles (does not touch styles.css)
    function _injectWidgetStyles() {
        if (_slotWidgetStyles) return;
        _slotWidgetStyles = true;
        var s = document.createElement('style');
        s.id = 'dcSlotWidgetStyles';
        s.textContent = [
            '#dcSlotWidget{',
            '  position:fixed;bottom:90px;right:16px;z-index:10400;',
            '  max-width:260px;width:max-content;',
            '  background:rgba(13,17,23,.92);',
            '  border:1.5px solid rgba(251,191,36,.55);',
            '  border-radius:20px;',
            '  box-shadow:0 4px 20px rgba(0,0,0,.5),0 0 12px rgba(251,191,36,.15);',
            '  font-family:inherit;font-size:12px;color:#e6edf3;',
            '  cursor:pointer;',
            '  transition:opacity .25s ease,transform .25s ease;',
            '  pointer-events:auto;',
            '  user-select:none;',
            '}',
            '#dcSlotWidget.dc-widget-hidden{opacity:0;pointer-events:none;transform:translateY(8px)}',
            '#dcSlotWidget.dc-widget-visible{opacity:1;transform:translateY(0)}',
            '/* Collapsed pill row */',
            '#dcSlotWidget .dcw-pill{',
            '  display:flex;align-items:center;gap:6px;',
            '  padding:7px 12px;',
            '  white-space:nowrap;',
            '}',
            '#dcSlotWidget .dcw-pill-icon{font-size:14px;flex-shrink:0}',
            '#dcSlotWidget .dcw-pill-text{font-size:11px;font-weight:700;color:#fbbf24;flex:1}',
            '#dcSlotWidget .dcw-pill-chevron{font-size:9px;color:rgba(255,255,255,.45);transition:transform .2s}',
            '#dcSlotWidget.dcw-expanded .dcw-pill-chevron{transform:rotate(180deg)}',
            '#dcSlotWidget .dcw-dismiss{',
            '  font-size:10px;color:rgba(255,255,255,.35);padding:0 6px 0 0;',
            '  background:none;border:none;cursor:pointer;line-height:1;flex-shrink:0;',
            '}',
            '#dcSlotWidget .dcw-dismiss:hover{color:rgba(255,255,255,.7)}',
            '/* Expanded detail area */',
            '#dcSlotWidget .dcw-detail{',
            '  overflow:hidden;max-height:0;transition:max-height .25s ease,padding .25s ease;',
            '  padding:0 12px;',
            '}',
            '#dcSlotWidget.dcw-expanded .dcw-detail{max-height:200px;padding:0 12px 10px}',
            '#dcSlotWidget .dcw-sep{',
            '  height:1px;background:rgba(251,191,36,.2);margin-bottom:8px;',
            '}',
            '#dcSlotWidget .dcw-task-row{display:flex;align-items:center;gap:6px;margin-bottom:7px}',
            '#dcSlotWidget .dcw-task-row:last-child{margin-bottom:0}',
            '#dcSlotWidget .dcw-task-icon{font-size:13px;flex-shrink:0;width:18px;text-align:center}',
            '#dcSlotWidget .dcw-task-info{flex:1;min-width:0}',
            '#dcSlotWidget .dcw-task-desc{',
            '  font-size:10px;color:rgba(230,237,243,.75);',
            '  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;',
            '}',
            '#dcSlotWidget .dcw-task-bar-wrap{',
            '  height:4px;background:rgba(255,255,255,.1);border-radius:2px;overflow:hidden;margin-top:3px;',
            '}',
            '#dcSlotWidget .dcw-task-bar-fill{',
            '  height:100%;border-radius:2px;transition:width .4s ease;',
            '  background:linear-gradient(90deg,#3b82f6,#8b5cf6);',
            '}',
            '#dcSlotWidget .dcw-task-bar-fill.dcw-bar-close{background:linear-gradient(90deg,#f59e0b,#fbbf24)}',
            '#dcSlotWidget .dcw-task-bar-fill.dcw-bar-done{background:linear-gradient(90deg,#22c55e,#16a34a)}',
            '#dcSlotWidget .dcw-task-check{font-size:12px;flex-shrink:0}',
            '#dcSlotWidget .dcw-task-frac{font-size:9px;color:rgba(255,255,255,.4);flex-shrink:0}'
        ].join('\n');
        document.head.appendChild(s);
    }

    // Read challenge data fresh from localStorage (safe — no dependency on private _challenges)
    function _readWidgetData() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return null;
            var data = JSON.parse(raw);
            if (!data || !data.tasks) return null;
            // Only use today's data
            var d = new Date();
            var today = d.getFullYear() + '-' +
                        String(d.getMonth() + 1).padStart(2, '0') + '-' +
                        String(d.getDate()).padStart(2, '0');
            if (data.day !== today) return null;
            return data;
        } catch (e) {
            return null;
        }
    }

    // Build the summary line for the collapsed pill
    function _buildSummaryLine(data) {
        if (!data || !data.tasks) return '🎯 Daily Challenges';
        var tasks = data.tasks;
        var completed = 0;
        var total = tasks.length;
        var pendingReward = 0;
        for (var i = 0; i < tasks.length; i++) {
            var t = tasks[i];
            if (t.claimed) { completed++; continue; }
            if (t.progress >= t.target) {
                completed++;
                pendingReward += t.reward;
            }
        }
        if (pendingReward > 0) {
            return completed + '/' + total + ' done · $' + pendingReward.toFixed(2) + ' to claim!';
        }
        return completed + '/' + total + ' challenges done';
    }

    // Render (or re-render) the widget DOM
    function _buildSlotWidget() {
        _injectWidgetStyles();

        var existing = document.getElementById('dcSlotWidget');
        if (existing) {
            // Already exists — just refresh content
            _refreshWidgetContent();
            return;
        }

        var widget = document.createElement('div');
        widget.id = 'dcSlotWidget';
        widget.className = 'dc-widget-hidden';

        // -- Pill row (always visible) --
        var pill = document.createElement('div');
        pill.className = 'dcw-pill';

        var pillIcon = document.createElement('span');
        pillIcon.className = 'dcw-pill-icon';
        pillIcon.textContent = '\uD83C\uDFAF'; // 🎯

        var pillText = document.createElement('span');
        pillText.className = 'dcw-pill-text';
        pillText.id = 'dcwPillText';
        pillText.textContent = _buildSummaryLine(_readWidgetData());

        var pillChevron = document.createElement('span');
        pillChevron.className = 'dcw-pill-chevron';
        pillChevron.textContent = '\u25BC'; // ▼

        var dismissBtn = document.createElement('button');
        dismissBtn.className = 'dcw-dismiss';
        dismissBtn.title = 'Dismiss';
        dismissBtn.textContent = '\u00D7'; // ×
        dismissBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            _slotWidgetDismissed = true;
            _hideSlotWidget();
        });

        pill.appendChild(pillIcon);
        pill.appendChild(pillText);
        pill.appendChild(pillChevron);
        pill.appendChild(dismissBtn);
        widget.appendChild(pill);

        // -- Expandable detail area --
        var detail = document.createElement('div');
        detail.className = 'dcw-detail';
        detail.id = 'dcwDetail';

        var sep = document.createElement('div');
        sep.className = 'dcw-sep';
        detail.appendChild(sep);

        widget.appendChild(detail);

        // Toggle expand on pill click (not dismiss)
        pill.addEventListener('click', function(e) {
            if (e.target === dismissBtn) return;
            _slotWidgetExpanded = !_slotWidgetExpanded;
            if (_slotWidgetExpanded) {
                widget.classList.add('dcw-expanded');
                _renderWidgetTasks(detail);
            } else {
                widget.classList.remove('dcw-expanded');
            }
        });

        document.body.appendChild(widget);
        _slotWidgetEl = widget;

        // Render task rows initially inside detail
        _renderWidgetTasks(detail);
    }

    // Render challenge task rows into the detail element
    function _renderWidgetTasks(detailEl) {
        if (!detailEl) return;
        // Clear existing task rows (keep the separator)
        var children = detailEl.querySelectorAll('.dcw-task-row');
        for (var i = 0; i < children.length; i++) {
            detailEl.removeChild(children[i]);
        }

        var data = _readWidgetData();
        if (!data || !data.tasks) return;

        for (var j = 0; j < data.tasks.length; j++) {
            var t = data.tasks[j];
            var isComplete = t.progress >= t.target;
            var pct = Math.min(100, t.target > 0 ? Math.round((t.progress / t.target) * 100) : 0);

            var row = document.createElement('div');
            row.className = 'dcw-task-row';

            // Icon
            var icoEl = document.createElement('span');
            icoEl.className = 'dcw-task-icon';
            icoEl.textContent = t.icon;
            row.appendChild(icoEl);

            // Info (desc + bar)
            var info = document.createElement('div');
            info.className = 'dcw-task-info';

            var descEl = document.createElement('div');
            descEl.className = 'dcw-task-desc';
            descEl.textContent = t.desc;
            info.appendChild(descEl);

            var barWrap = document.createElement('div');
            barWrap.className = 'dcw-task-bar-wrap';
            var barFill = document.createElement('div');
            barFill.className = 'dcw-task-bar-fill';
            if (isComplete || t.claimed) {
                barFill.classList.add('dcw-bar-done');
            } else if (pct >= 70) {
                barFill.classList.add('dcw-bar-close');
            }
            barFill.style.width = pct + '%';
            barWrap.appendChild(barFill);
            info.appendChild(barWrap);

            row.appendChild(info);

            // Right side: checkmark or fraction
            if (isComplete || t.claimed) {
                var check = document.createElement('span');
                check.className = 'dcw-task-check';
                check.textContent = t.claimed ? '\u2705' : '\u2714\uFE0F'; // ✅ or ✔️
                row.appendChild(check);
            } else {
                var frac = document.createElement('span');
                frac.className = 'dcw-task-frac';
                frac.textContent = t.progress + '/' + t.target;
                row.appendChild(frac);
            }

            detailEl.appendChild(row);
        }
    }

    // Refresh only the pill text and task bars (no full rebuild)
    function _refreshWidgetContent() {
        var pillText = document.getElementById('dcwPillText');
        if (pillText) {
            pillText.textContent = _buildSummaryLine(_readWidgetData());
        }
        if (_slotWidgetExpanded) {
            var detail = document.getElementById('dcwDetail');
            if (detail) _renderWidgetTasks(detail);
        }
    }

    function _showSlotWidget() {
        if (_slotWidgetDismissed) return;
        if (!_slotWidgetEl) _buildSlotWidget();
        var w = document.getElementById('dcSlotWidget');
        if (!w) return;
        _refreshWidgetContent();
        // Use double-RAF to let CSS transition trigger properly
        requestAnimationFrame(function() {
            requestAnimationFrame(function() {
                w.classList.remove('dc-widget-hidden');
                w.classList.add('dc-widget-visible');
            });
        });
    }

    function _hideSlotWidget() {
        var w = document.getElementById('dcSlotWidget');
        if (!w) return;
        w.classList.remove('dc-widget-visible');
        w.classList.add('dc-widget-hidden');
    }

    // Watch #slotModal for active class changes via MutationObserver
    function _attachSlotObserver() {
        if (_slotObserver) return; // already attached

        var slotModal = document.getElementById('slotModal');
        if (!slotModal) {
            // Modal not in DOM yet — retry once after a short delay
            setTimeout(_attachSlotObserver, 1500);
            return;
        }

        _slotObserver = new MutationObserver(function(mutations) {
            for (var i = 0; i < mutations.length; i++) {
                var m = mutations[i];
                if (m.type === 'attributes' && m.attributeName === 'class') {
                    var isActive = slotModal.classList.contains('active');
                    if (isActive) {
                        // Reset dismiss state each time slot is opened
                        _slotWidgetDismissed = false;
                        _slotWidgetExpanded  = false;
                        if (_slotWidgetEl) {
                            _slotWidgetEl.classList.remove('dcw-expanded');
                        }
                        _buildSlotWidget();
                        _showSlotWidget();
                        _startSpinWatcher();
                    } else {
                        _hideSlotWidget();
                        _stopSpinWatcher();
                    }
                }
            }
        });

        _slotObserver.observe(slotModal, { attributes: true, attributeFilter: ['class'] });

        // Check if slot is already open at attach time
        if (slotModal.classList.contains('active')) {
            _buildSlotWidget();
            _showSlotWidget();
            _startSpinWatcher();
        }
    }

    // Poll the global `spinning` variable to detect spin completion
    // This is lightweight: 200ms interval, only while slot is open.
    function _startSpinWatcher() {
        _stopSpinWatcher(); // Clear any existing watcher first
        _lastSpinState = (typeof window.spinning !== 'undefined') ? window.spinning : false;
        _slotSpinWatcher = setInterval(function() {
            var currentState = (typeof window.spinning !== 'undefined') ? window.spinning : false;
            // Detect falling edge: spinning just became false (spin completed)
            if (_lastSpinState === true && currentState === false) {
                // Give localStorage a brief moment to be written by win-logic/spin-engine
                setTimeout(_refreshWidgetContent, 150);
            }
            _lastSpinState = currentState;
        }, 200);
    }

    function _stopSpinWatcher() {
        if (_slotSpinWatcher) {
            clearInterval(_slotSpinWatcher);
            _slotSpinWatcher = null;
        }
    }

    // Kick off the observer after init — slot modal is built after DOMContentLoaded
    function _initSlotWidget() {
        // Wait for everything else to initialise, then attach
        setTimeout(_attachSlotObserver, 2500);
    }

    // Append _initSlotWidget call to existing init flow
    var _origInit = init;
    // Re-define init to also boot the widget
    // (We shadow the local variable — safe because it has already run or will run via the
    //  DOMContentLoaded / setTimeout path below, and we patch before either fires when loaded
    //  early, or we call it directly when loaded late.)
    // However, since `init` has likely already been scheduled, we just call _initSlotWidget
    // directly as a secondary initialiser on the same timing path.
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _initSlotWidget);
    } else {
        setTimeout(_initSlotWidget, 0);
    }
}());
