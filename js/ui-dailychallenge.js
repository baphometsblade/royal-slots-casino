/* ui-dailychallenge.js \u2014 Daily Challenge System
 * Sprint 32: 3 randomized daily tasks with progress tracking and rewards.
 * Self-contained IIFE; exposes tracking hooks for spin/win events.
 */
(function () {
    'use strict';

    var STORAGE_KEY = 'ms_dailyChallengeData';
    var COMPLETION_BONUS = 10;
    var GOLD = '#fbbf24';

    var CHALLENGE_POOL = [
        { id: 'spin10',       desc: 'Spin 10 times',             icon: '\uD83C\uDFB0', target: 10,  rewardAmt: 3  },
        { id: 'win5',         desc: 'Win 5 times',               icon: '\u2B50',       target: 5,   rewardAmt: 5  },
        { id: 'wager50',      desc: 'Wager $50 total',           icon: '\uD83D\uDCB0', target: 50,  rewardAmt: 4  },
        { id: 'bigwin3',      desc: 'Hit 3 big wins',            icon: '\uD83D\uDD25', target: 3,   rewardAmt: 8  },
        { id: 'play3games',   desc: 'Play 3 different games',    icon: '\uD83C\uDFAE', target: 3,   rewardAmt: 4  },
        { id: 'play2prov',    desc: 'Spin on 2 providers',       icon: '\uD83C\uDFAF', target: 2,   rewardAmt: 3  },
        { id: 'streak3',      desc: 'Achieve a 3-win streak',    icon: '\uD83D\uDD25', target: 1,   rewardAmt: 6  },
        { id: 'betmax',       desc: 'Bet max on any game',       icon: '\uD83D\uDE80', target: 1,   rewardAmt: 5  },
        { id: 'wintotal100',  desc: 'Win $100 total',            icon: '\uD83D\uDCB5', target: 100, rewardAmt: 10 },
        { id: 'play15min',    desc: 'Play for 15 minutes',       icon: '\u23F0',       target: 15,  rewardAmt: 3  }
    ];

    var _state = null;   // { date, challenges, allComplete }
    var _panelOpen = false;
    var _refreshInterval = null;
    var _playTimeStart = null;
    var _gamesPlayed = {};    // tracks unique game IDs this session
    var _providersPlayed = {};

    // \u2500\u2500 Toast helper \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
    function _toast(msg, color) {
        var bg = color || ('linear-gradient(135deg,' + GOLD + ',#f59e0b)');
        var t = document.createElement('div');
        t.style.cssText = [
            'position:fixed', 'bottom:80px', 'left:50%', 'transform:translateX(-50%)',
            'background:' + bg, 'color:#000',
            'padding:12px 22px', 'border-radius:10px', 'font-weight:800',
            'font-size:14px', 'z-index:10400', 'box-shadow:0 4px 20px rgba(0,0,0,.5)',
            'pointer-events:none', 'text-align:center', 'max-width:320px'
        ].join(';');
        t.textContent = msg;
        document.body.appendChild(t);
        setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 4000);
    }

    // \u2500\u2500 Date key \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
    function _todayKey() {
        var d = new Date();
        return d.getFullYear() + '-' +
            String(d.getMonth() + 1).padStart(2, '0') + '-' +
            String(d.getDate()).padStart(2, '0');
    }

    // \u2500\u2500 Time until midnight \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
    function _msUntilMidnight() {
        var now = new Date();
        var midnight = new Date(now);
        midnight.setHours(24, 0, 0, 0);
        return midnight.getTime() - now.getTime();
    }

    function _fmtMs(ms) {
        if (ms <= 0) return '00:00:00';
        var totalSec = Math.floor(ms / 1000);
        var h = Math.floor(totalSec / 3600);
        var m = Math.floor((totalSec % 3600) / 60);
        var s = totalSec % 60;
        return String(h).padStart(2, '0') + ':' +
            String(m).padStart(2, '0') + ':' +
            String(s).padStart(2, '0');
    }

    // \u2500\u2500 Seeded shuffle (deterministic per day) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
    function _seededRandom(seed) {
        var s = seed % 2147483647;
        if (s <= 0) s += 2147483646;
        return function () {
            s = s * 16807 % 2147483647;
            return (s - 1) / 2147483646;
        };
    }

    function _generateChallenges() {
        var d = new Date();
        var seed = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
        var rng = _seededRandom(seed);

        // Fisher-Yates shuffle a copy
        var pool = CHALLENGE_POOL.slice();
        for (var i = pool.length - 1; i > 0; i--) {
            var j = Math.floor(rng() * (i + 1));
            var tmp = pool[i];
            pool[i] = pool[j];
            pool[j] = tmp;
        }

        var challenges = [];
        for (var k = 0; k < 3; k++) {
            var tpl = pool[k];
            challenges.push({
                id: tpl.id,
                desc: tpl.desc,
                icon: tpl.icon,
                target: tpl.target,
                rewardAmt: tpl.rewardAmt,
                progress: 0,
                completed: false,
                rewardClaimed: false
            });
        }
        return challenges;
    }

    // \u2500\u2500 Save / Load \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
    function _save() {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(_state)); } catch (e) {}
    }

    function _load() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                var parsed = JSON.parse(raw);
                if (parsed && parsed.date === _todayKey()) {
                    _state = parsed;
                    return;
                }
            }
        } catch (e) {}

        // Generate fresh challenges for today
        _state = {
            date: _todayKey(),
            challenges: _generateChallenges(),
            allComplete: false
        };
        _save();
    }

    // \u2500\u2500 Credit reward \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
    function _creditReward(amount, label) {
        if (typeof balance !== 'undefined') balance += amount;
        if (typeof updateBalance === 'function') updateBalance();
        if (typeof saveBalance === 'function') saveBalance();
        _toast('\uD83C\uDFAF ' + label + ' +$' + amount.toFixed(2));
    }

    // \u2500\u2500 Check completions \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
    function _checkCompletions() {
        if (!_state) return;
        var changed = false;

        for (var i = 0; i < _state.challenges.length; i++) {
            var ch = _state.challenges[i];
            if (!ch.completed && ch.progress >= ch.target) {
                ch.completed = true;
                changed = true;
                if (!ch.rewardClaimed) {
                    ch.rewardClaimed = true;
                    _creditReward(ch.rewardAmt, 'Challenge complete: ' + ch.desc);
                }
            }
        }

        // Check if all 3 done
        if (!_state.allComplete) {
            var allDone = _state.challenges.every(function (c) { return c.completed; });
            if (allDone) {
                _state.allComplete = true;
                changed = true;
                _creditReward(COMPLETION_BONUS, 'All daily challenges complete!');
            }
        }

        if (changed) {
            _save();
            _renderCards();
        }
    }

    // \u2500\u2500 Render cards \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
    function _renderCards() {
        var container = document.getElementById('dcCards');
        if (!container || !_state) return;
        while (container.firstChild) container.removeChild(container.firstChild);

        for (var i = 0; i < _state.challenges.length; i++) {
            var ch = _state.challenges[i];
            var pct = Math.min(100, Math.floor((ch.progress / ch.target) * 100));

            var card = document.createElement('div');
            card.className = 'dc-card';
            card.style.cssText = 'background:rgba(255,255,255,.04);border:1px solid ' +
                (ch.completed ? GOLD : 'rgba(255,255,255,.08)') +
                ';border-radius:10px;padding:12px;margin-bottom:8px;';

            // Header row: icon + desc + reward
            var header = document.createElement('div');
            header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;';

            var left = document.createElement('div');
            left.style.cssText = 'display:flex;align-items:center;gap:8px;';
            var iconSpan = document.createElement('span');
            iconSpan.style.fontSize = '20px';
            iconSpan.textContent = ch.icon;
            var descSpan = document.createElement('span');
            descSpan.style.cssText = 'font-size:13px;color:' + (ch.completed ? GOLD : '#fff') + ';font-weight:600;';
            descSpan.textContent = ch.desc;
            left.appendChild(iconSpan);
            left.appendChild(descSpan);

            var reward = document.createElement('span');
            reward.style.cssText = 'font-size:12px;color:' + GOLD + ';font-weight:800;';
            reward.textContent = ch.completed ? '\u2713 Done' : '+$' + ch.rewardAmt;

            header.appendChild(left);
            header.appendChild(reward);
            card.appendChild(header);

            // Progress bar
            var barWrap = document.createElement('div');
            barWrap.style.cssText = 'background:rgba(255,255,255,.08);border-radius:6px;height:6px;overflow:hidden;';
            var barFill = document.createElement('div');
            barFill.style.cssText = 'height:6px;border-radius:6px;transition:width .4s;' +
                'background:linear-gradient(90deg,' + GOLD + ',#f59e0b);width:' + pct + '%;';
            barWrap.appendChild(barFill);
            card.appendChild(barWrap);

            // Progress text
            var progText = document.createElement('div');
            progText.style.cssText = 'font-size:11px;color:rgba(255,255,255,.4);margin-top:4px;text-align:right;';
            progText.textContent = Math.min(ch.progress, ch.target) + ' / ' + ch.target;
            card.appendChild(progText);

            container.appendChild(card);
        }
    }

    // \u2500\u2500 Refresh timer tick \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
    function _tickRefresh() {
        var el = document.getElementById('dcRefreshTimer');
        if (el) el.textContent = 'Resets in ' + _fmtMs(_msUntilMidnight());

        // Also update play-time challenge if active
        if (_playTimeStart && _state) {
            var minutesPlayed = (Date.now() - _playTimeStart) / 60000;
            for (var i = 0; i < _state.challenges.length; i++) {
                if (_state.challenges[i].id === 'play15min' && !_state.challenges[i].completed) {
                    _state.challenges[i].progress = Math.floor(minutesPlayed);
                }
            }
            _checkCompletions();
        }
    }

    // \u2500\u2500 Toggle panel \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
    window.toggleDailyChallenge = function () {
        var panel = document.getElementById('dailyChallengePanel');
        if (!panel) return;
        _panelOpen = !_panelOpen;
        panel.style.display = _panelOpen ? 'block' : 'none';
        if (_panelOpen) _renderCards();
    };

    // \u2500\u2500 Tracking hooks \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
    window._dailyChallengeTrackSpin = function (betAmt, winAmt, gameId) {
        if (!_state || _state.allComplete) return;

        for (var i = 0; i < _state.challenges.length; i++) {
            var ch = _state.challenges[i];
            if (ch.completed) continue;

            switch (ch.id) {
                case 'spin10':
                    ch.progress++;
                    break;
                case 'wager50':
                    ch.progress += (betAmt || 0);
                    break;
                case 'play3games':
                    if (gameId) _gamesPlayed[gameId] = true;
                    ch.progress = Object.keys(_gamesPlayed).length;
                    break;
                case 'play2prov':
                    if (gameId && typeof currentGame !== 'undefined' && currentGame && currentGame.provider) {
                        _providersPlayed[currentGame.provider] = true;
                    }
                    ch.progress = Object.keys(_providersPlayed).length;
                    break;
                case 'betmax':
                    if (typeof BET_STEPS !== 'undefined' && betAmt >= BET_STEPS[BET_STEPS.length - 1]) {
                        ch.progress = 1;
                    }
                    break;
                default:
                    break;
            }
        }

        _checkCompletions();
        _save();
    };

    window._dailyChallengeTrackWin = function (isWin, winAmt) {
        if (!_state || _state.allComplete) return;

        for (var i = 0; i < _state.challenges.length; i++) {
            var ch = _state.challenges[i];
            if (ch.completed) continue;

            switch (ch.id) {
                case 'win5':
                    if (isWin) ch.progress++;
                    break;
                case 'wintotal100':
                    if (isWin && winAmt) ch.progress += winAmt;
                    break;
                case 'bigwin3':
                    if (isWin && winAmt && typeof WIN_TIER_BIG_THRESHOLD !== 'undefined' &&
                        winAmt >= WIN_TIER_BIG_THRESHOLD) {
                        ch.progress++;
                    }
                    break;
                case 'streak3':
                    if (typeof window._winStreak !== 'undefined' && window._winStreak >= 3) {
                        ch.progress = 1;
                    }
                    break;
                default:
                    break;
            }
        }

        _checkCompletions();
        _save();
    };

    // \u2500\u2500 Init \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
    function _init() {
        if (window.location.search.indexOf('noBonus=1') !== -1) return;

        _load();
        _playTimeStart = Date.now();
        _renderCards();

        // Refresh timer every second
        _refreshInterval = setInterval(_tickRefresh, 1000);
        _tickRefresh();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _init);
    } else {
        _init();
    }
})();
