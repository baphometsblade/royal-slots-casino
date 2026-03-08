/* ui-daily-missions.js — Daily Missions + VIP Nudge System
 * Drives retention by giving players 3 daily goals.
 * Missions reset at midnight; completion awards XP + bonus coins.
 * Also shows a VIP tier upgrade nudge when player is close to next tier.
 */
(function () {
    'use strict';

    var MISSIONS_KEY = 'matrixSpins_dailyMissions_v2';
    var LAST_RESET_KEY = 'matrixSpins_missionsReset_v2';

    // ─── Mission definitions ──────────────────────────────────────────────────
    var MISSION_POOL = [
        { id: 'spin10',    icon: '🎰', name: 'Spin 10 Times',      desc: 'Place 10 spins today',            target: 10,  xpReward: 50,  coinReward: 25  },
        { id: 'spin25',    icon: '🎰', name: 'Spin 25 Times',      desc: 'Place 25 spins today',            target: 25,  xpReward: 100, coinReward: 60  },
        { id: 'bigwin',    icon: '💥', name: 'Land a Big Win',     desc: 'Win 10× your bet or more',        target: 1,   xpReward: 75,  coinReward: 50  },
        { id: 'win5',      icon: '🏆', name: 'Win 5 Rounds',       desc: 'Win 5 individual spins',          target: 5,   xpReward: 40,  coinReward: 20  },
        { id: 'games3',    icon: '🎮', name: 'Try 3 Games',        desc: 'Play 3 different slot games',     target: 3,   xpReward: 60,  coinReward: 35  },
        { id: 'deposit',   icon: '💰', name: 'Make a Deposit',     desc: 'Add funds to your account',       target: 1,   xpReward: 150, coinReward: 100 },
        { id: 'freespin',  icon: '✨', name: 'Trigger Free Spins', desc: 'Land a free spins bonus round',   target: 1,   xpReward: 80,  coinReward: 60  },
        { id: 'bet5',      icon: '📈', name: 'Bet $5 in One Spin', desc: 'Place a single spin at $5+',      target: 1,   xpReward: 55,  coinReward: 30  },
    ];

    // ─── VIP tier thresholds (mirror constants.js, safe fallback) ────────────
    var VIP_TIERS = [
        { name: 'Bronze',   xp: 0      },
        { name: 'Silver',   xp: 500    },
        { name: 'Gold',     xp: 2000   },
        { name: 'Platinum', xp: 7500   },
        { name: 'Diamond',  xp: 20000  },
        { name: 'Elite',    xp: 50000  },
    ];

    // ─── State ────────────────────────────────────────────────────────────────
    var _missions = [];      // active today's 3 missions
    var _progress = {};      // { missionId: currentCount }
    var _claimed  = {};      // { missionId: true }
    var _allClaimed = false;

    // ─── Seeded daily mission selection (same 3 missions per UTC day) ─────────
    function _todaysSeed() {
        var d = new Date();
        return d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate();
    }

    function _seededRand(seed) {
        var s = seed;
        return function () {
            s = (s * 9301 + 49297) % 233280;
            return s / 233280;
        };
    }

    function _pickDailyMissions() {
        var rng = _seededRand(_todaysSeed());
        var pool = MISSION_POOL.slice();
        var chosen = [];
        while (chosen.length < 3 && pool.length > 0) {
            var idx = Math.floor(rng() * pool.length);
            chosen.push(pool.splice(idx, 1)[0]);
        }
        return chosen;
    }

    // ─── Persistence ─────────────────────────────────────────────────────────
    function _todayStr() {
        var d = new Date();
        return d.getUTCFullYear() + '-' + (d.getUTCMonth() + 1) + '-' + d.getUTCDate();
    }

    function _loadState() {
        try {
            var lastReset = localStorage.getItem(LAST_RESET_KEY);
            var today = _todayStr();
            if (lastReset !== today) {
                // New day — reset progress
                _progress = {};
                _claimed  = {};
                _allClaimed = false;
                localStorage.setItem(LAST_RESET_KEY, today);
                localStorage.removeItem(MISSIONS_KEY);
                return;
            }
            var raw = localStorage.getItem(MISSIONS_KEY);
            if (raw) {
                var data = JSON.parse(raw);
                _progress   = data.progress   || {};
                _claimed    = data.claimed     || {};
                _allClaimed = data.allClaimed  || false;
            }
        } catch (e) {
            _progress = {}; _claimed = {}; _allClaimed = false;
        }
    }

    function _saveState() {
        try {
            localStorage.setItem(MISSIONS_KEY, JSON.stringify({
                progress: _progress, claimed: _claimed, allClaimed: _allClaimed
            }));
        } catch (e) { /* quota */ }
    }

    // ─── UI rendering ─────────────────────────────────────────────────────────
    function _render() {
        var bar = document.getElementById('dailyMissionsBar');
        var container = document.getElementById('dmbMissions');
        var rewardBtn  = document.getElementById('dmbRewardBtn');
        if (!bar || !container) return;

        bar.style.display = 'flex';
        container.innerHTML = '';

        var allDone = true;
        var allClaimed = true;

        _missions.forEach(function (m) {
            var progress = _progress[m.id] || 0;
            var done     = progress >= m.target;
            var claimed  = !!_claimed[m.id];

            if (!done) allDone = false;
            if (!claimed) allClaimed = false;

            var el = document.createElement('div');
            el.className = 'dmb-mission' + (claimed ? ' complete' : (done ? ' claimable' : ''));

            var icon = document.createElement('span');
            icon.className = 'dmb-mission-icon';
            icon.textContent = m.icon;

            var text = document.createElement('div');
            text.className = 'dmb-mission-text';

            var name = document.createElement('div');
            name.className = 'dmb-mission-name';
            name.textContent = m.name;

            var prog = document.createElement('div');
            prog.className = 'dmb-mission-progress';
            prog.textContent = claimed
                ? 'Claimed! +' + m.xpReward + ' XP'
                : Math.min(progress, m.target) + ' / ' + m.target;

            text.appendChild(name);
            text.appendChild(prog);

            var check = document.createElement('span');
            check.className = 'dmb-mission-check';
            check.textContent = claimed ? '✅' : (done ? '🎁' : '');

            el.appendChild(icon);
            el.appendChild(text);
            el.appendChild(check);

            // Claim individual mission on click
            if (done && !claimed) {
                el.addEventListener('click', function () { _claimMission(m); });
            }

            container.appendChild(el);
        });

        // Reward button state
        if (rewardBtn) {
            if (_allClaimed) {
                rewardBtn.textContent = '✅ Done!';
                rewardBtn.className = 'dmb-reward all-done';
            } else if (allDone) {
                rewardBtn.textContent = '🎁 Claim All!';
                rewardBtn.className = 'dmb-reward all-done';
            } else {
                var completed = _missions.filter(function (m) { return (_progress[m.id] || 0) >= m.target; }).length;
                rewardBtn.textContent = completed + '/3 Complete';
                rewardBtn.className = 'dmb-reward';
            }
        }
    }

    function _claimMission(m) {
        if (_claimed[m.id]) return;
        _claimed[m.id] = true;
        _saveState();
        _render();
        // Award XP if the global function exists
        if (typeof awardXP === 'function') {
            try { awardXP(m.xpReward, m.name + ' mission'); } catch (e) {}
        }
        // Show toast
        _showMissionToast(m);
    }

    function _showMissionToast(m) {
        var toast = document.createElement('div');
        toast.style.cssText = [
            'position:fixed', 'bottom:80px', 'left:50%', 'transform:translateX(-50%) translateY(20px)',
            'background:linear-gradient(135deg,#1a0a2e,#0d0d1a)',
            'border:1px solid rgba(251,191,36,0.5)',
            'border-radius:12px', 'padding:14px 22px',
            'color:#fff', 'font-size:13px', 'font-weight:600',
            'z-index:99999', 'opacity:0',
            'transition:all 0.3s ease',
            'text-align:center', 'box-shadow:0 8px 32px rgba(0,0,0,0.6)',
            'pointer-events:none'
        ].join(';');
        toast.textContent = m.icon + ' Mission Complete: ' + m.name + ' (+' + m.xpReward + ' XP)';
        document.body.appendChild(toast);
        requestAnimationFrame(function () {
            toast.style.opacity = '1';
            toast.style.transform = 'translateX(-50%) translateY(0)';
        });
        setTimeout(function () {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(-50%) translateY(-20px)';
            setTimeout(function () { toast.parentNode && toast.parentNode.removeChild(toast); }, 400);
        }, 3500);
    }

    // ─── Public: claim all at once ────────────────────────────────────────────
    window.claimDailyMissions = function () {
        if (_allClaimed) return;
        var claimed = false;
        _missions.forEach(function (m) {
            var done = (_progress[m.id] || 0) >= m.target;
            if (done && !_claimed[m.id]) {
                _claimed[m.id] = true;
                claimed = true;
                if (typeof awardXP === 'function') {
                    try { awardXP(m.xpReward, m.name + ' mission'); } catch (e) {}
                }
            }
        });
        var allClaimed = _missions.every(function (m) { return !!_claimed[m.id]; });
        if (allClaimed) { _allClaimed = true; }
        _saveState();
        _render();
        if (claimed) {
            var totalXP = _missions.reduce(function (s, m) { return s + (_claimed[m.id] ? m.xpReward : 0); }, 0);
            _showMissionToast({ icon: '🎯', name: 'All Missions Claimed', xpReward: totalXP });
        }
    };

    // ─── Track spin events ────────────────────────────────────────────────────
    window._dmTrackSpin = function (opts) {
        opts = opts || {};
        var changed = false;

        // spin10 / spin25
        ['spin10', 'spin25'].forEach(function (id) {
            var m = _missions.find(function (x) { return x.id === id; });
            if (m && (_progress[id] || 0) < m.target) {
                _progress[id] = (_progress[id] || 0) + 1;
                changed = true;
            }
        });

        // bigwin
        if (opts.multiplier >= 10) {
            var m = _missions.find(function (x) { return x.id === 'bigwin'; });
            if (m && (_progress['bigwin'] || 0) < m.target) {
                _progress['bigwin'] = 1; changed = true;
            }
        }

        // win5
        if (opts.win) {
            var m = _missions.find(function (x) { return x.id === 'win5'; });
            if (m && (_progress['win5'] || 0) < m.target) {
                _progress['win5'] = (_progress['win5'] || 0) + 1; changed = true;
            }
        }

        // games3
        if (opts.gameId) {
            var played = _progress['_gamesPlayed'] = _progress['_gamesPlayed'] || {};
            if (!played[opts.gameId]) {
                played[opts.gameId] = true;
                var count = Object.keys(played).length;
                var m = _missions.find(function (x) { return x.id === 'games3'; });
                if (m) { _progress['games3'] = count; changed = true; }
            }
        }

        // bet5
        if (opts.bet >= 5) {
            var m = _missions.find(function (x) { return x.id === 'bet5'; });
            if (m && (_progress['bet5'] || 0) < m.target) {
                _progress['bet5'] = 1; changed = true;
            }
        }

        // freespin
        if (opts.freeSpin) {
            var m = _missions.find(function (x) { return x.id === 'freespin'; });
            if (m && (_progress['freespin'] || 0) < m.target) {
                _progress['freespin'] = 1; changed = true;
            }
        }

        // deposit
        if (opts.deposit) {
            var m = _missions.find(function (x) { return x.id === 'deposit'; });
            if (m && (_progress['deposit'] || 0) < m.target) {
                _progress['deposit'] = 1; changed = true;
            }
        }

        if (changed) { _saveState(); _render(); }
    };

    // ─── VIP nudge banner ─────────────────────────────────────────────────────
    function _updateVipNudge() {
        var banner = document.getElementById('vipNudgeBanner');
        if (!banner) return;

        var xp = 0;
        try {
            var stored = localStorage.getItem(typeof XP_STORAGE_KEY !== 'undefined' ? XP_STORAGE_KEY : 'matrixSpins_xp');
            if (stored) { var d = JSON.parse(stored); xp = d.totalXP || 0; }
        } catch (e) {}

        // Find next tier
        var currentTierIdx = 0;
        for (var i = VIP_TIERS.length - 1; i >= 0; i--) {
            if (xp >= VIP_TIERS[i].xp) { currentTierIdx = i; break; }
        }
        var nextTierIdx = currentTierIdx + 1;
        if (nextTierIdx >= VIP_TIERS.length) { banner.style.display = 'none'; return; }

        var nextTier = VIP_TIERS[nextTierIdx];
        var xpNeeded = nextTier.xp - xp;

        // Only show nudge if within 300 XP of next tier
        if (xpNeeded > 300) { banner.style.display = 'none'; return; }

        banner.style.display = 'flex';
        var xpEl = document.getElementById('vipNudgeXp');
        var tierEl = document.getElementById('vipNudgeTier');
        if (xpEl) xpEl.textContent = xpNeeded;
        if (tierEl) tierEl.textContent = nextTier.name;
    }

    // ─── Pulse deposit button when balance < 100 ─────────────────────────────
    function _checkDepositPulse() {
        var depBtn = document.querySelector('.btn-deposit');
        if (!depBtn) return;
        var bal = parseFloat((document.getElementById('balance') || {}).textContent || '9999');
        if (bal < 100) {
            depBtn.classList.add('pulse-cta');
        } else {
            depBtn.classList.remove('pulse-cta');
        }
    }

    // ─── Init ─────────────────────────────────────────────────────────────────
    function _init() {
        _loadState();
        _missions = _pickDailyMissions();
        _render();
        _updateVipNudge();
        _checkDepositPulse();

        // Refresh nudge + pulse every 60s
        setInterval(function () {
            _updateVipNudge();
            _checkDepositPulse();
        }, 60000);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _init);
    } else {
        // Delay slightly so lobby DOM is rendered
        setTimeout(_init, 800);
    }

})();
