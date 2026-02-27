// ═══════════════════════════════════════════════════════
// UI-MODALS MODULE
// ═══════════════════════════════════════════════════════

        // ── Session tracking (reset on each page load) ──────────────
        const sessionStartTime = Date.now();
        let sessionSpins = 0;
        let sessionWon = 0;
        let sessionStartBalance = null; // set on first spin or modal open

        function _getSessionStartBalance() {
            if (sessionStartBalance === null) {
                sessionStartBalance = typeof balance !== 'undefined' ? balance : 0;
            }
            return sessionStartBalance;
        }

        // ── Daily Challenges ──────────────────────────────────────
        const DAILY_CHALLENGES = [
            { id: 'spins_20',   label: 'Spin It Up',    desc: 'Complete 20 spins today',              target: 20,  xp: 50,  reward: 100, icon: '🎰', type: 'spins'   },
            { id: 'spins_50',   label: 'Spin Machine',  desc: 'Complete 50 spins today',              target: 50,  xp: 100, reward: 150, icon: '⚡', type: 'spins'   },
            { id: 'games_3',    label: 'Game Hopper',   desc: 'Play 3 different games today',         target: 3,   xp: 75,  reward: 100, icon: '🎮', type: 'games'   },
            { id: 'win_once',   label: 'Lucky Break',   desc: 'Win at least once today',              target: 1,   xp: 40,  reward: 75,  icon: '🍀', type: 'wins'    },
            { id: 'big_win_50', label: 'High Roller',   desc: 'Land a win worth 50x your bet',        target: 50,  xp: 150, reward: 500, icon: '💥', type: 'winMult' },
            { id: 'bonus_1',    label: 'Bonus Hunter',  desc: 'Trigger a bonus or free spins round',  target: 1,   xp: 125, reward: 300, icon: '🎁', type: 'bonuses' },
            { id: 'wager_500',  label: 'Whale Watch',   desc: 'Wager $500 total today',               target: 500, xp: 100, reward: 200, icon: '🐋', type: 'wager'   },
            { id: 'streak_3',   label: 'Hot Streak',    desc: 'Win 3 spins in a row',                 target: 3,   xp: 120, reward: 250, icon: '🔥', type: 'streak'  },
        ];
        const CHALLENGE_STORAGE_KEY = 'matrixChallenges';

        // ── Weekly Missions ──────────────────────────────────
        const WEEKLY_MISSIONS = [
            { id: 'weekly_spins_200', label: 'Marathon Spinner', desc: 'Complete 200 spins this week',        target: 200,  xp: 300, icon: '🏃', type: 'spins'   },
            { id: 'weekly_games_10',  label: 'World Tour',       desc: 'Play 10 different games this week',   target: 10,   xp: 250, icon: '🌍', type: 'games'   },
            { id: 'weekly_big_win',   label: 'Century Club',     desc: 'Land a win worth 100× your bet',      target: 1,    xp: 500, icon: '💯', type: 'winMult' },
            { id: 'weekly_wager_2k',  label: 'High Roller Week', desc: 'Wager $2,000 total this week',        target: 2000, xp: 400, icon: '🐳', type: 'wager'   },
        ];
        const WEEKLY_STORAGE_KEY = typeof STORAGE_KEY_WEEKLY_MISSIONS !== 'undefined'
            ? STORAGE_KEY_WEEKLY_MISSIONS : 'matrixWeeklyMissions';

        function _getMondayIso() {
            const d = new Date();
            const day = d.getDay();
            const diff = (day === 0 ? -6 : 1 - day);
            d.setDate(d.getDate() + diff);
            d.setHours(0, 0, 0, 0);
            return d.toISOString().slice(0, 10);
        }

        function _loadWeeklyState() {
            try {
                const raw = localStorage.getItem(WEEKLY_STORAGE_KEY);
                const state = raw ? JSON.parse(raw) : null;
                const monday = _getMondayIso();
                if (!state || state.weekStart !== monday) {
                    return { weekStart: monday, progress: {}, completed: [] };
                }
                return state;
            } catch (e) {
                return { weekStart: _getMondayIso(), progress: {}, completed: [] };
            }
        }

        function _saveWeeklyState(state) {
            try { localStorage.setItem(WEEKLY_STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
        }

        function _renderWeeklyPanel() {
            const container = document.getElementById('weeklyChallengesPanel');
            if (!container) return;
            const state = _loadWeeklyState();
            const monday = _getMondayIso();
            const nextMonday = new Date(monday);
            nextMonday.setDate(nextMonday.getDate() + 7);
            const msLeft = nextMonday - Date.now();
            const dLeft = Math.floor(msLeft / 86400000);
            const hLeft = Math.floor((msLeft % 86400000) / 3600000);
            container.innerHTML = '<div class="challenge-reset-info">Resets in ' + dLeft + 'd ' + hLeft + 'h</div>' +
                WEEKLY_MISSIONS.map(m => {
                    const prog = Math.min(state.progress[m.id] || 0, m.target);
                    const done = state.completed.includes(m.id);
                    const pct  = Math.round((prog / m.target) * 100);
                    return '<div class="challenge-item' + (done ? ' challenge-done' : '') + '">' +
                        '<div class="challenge-icon">' + m.icon + '</div>' +
                        '<div class="challenge-info">' +
                            '<div class="challenge-label">' + m.label + '</div>' +
                            '<div class="challenge-desc">' + m.desc + '</div>' +
                            '<div class="challenge-progress-bar">' +
                                '<div class="challenge-progress-fill" style="width:' + pct + '%"></div>' +
                            '</div>' +
                            '<div class="challenge-progress-text">' + prog + ' / ' + m.target + (done ? ' ✓' : '') + '</div>' +
                        '</div>' +
                        '<div class="challenge-xp">+' + m.xp + ' XP</div>' +
                    '</div>';
                }).join('');
        }

        // Called from the same event pipeline as daily challenges
        window.onWeeklyMissionEvent = function(eventType, payload) {
            const state = _loadWeeklyState();
            let changed = false;

            if (eventType === 'spin') {
                state.progress['weekly_spins_200'] = (state.progress['weekly_spins_200'] || 0) + 1;
                if (payload && payload.gameId) {
                    if (!state._games) state._games = {};
                    state._games[payload.gameId] = true;
                    state.progress['weekly_games_10'] = Object.keys(state._games).length;
                }
                if ((payload && payload.wager || 0) > 0) {
                    state.progress['weekly_wager_2k'] = (state.progress['weekly_wager_2k'] || 0) + (payload.wager || 0);
                }
                if ((payload && payload.winMult || 0) >= 100) {
                    state.progress['weekly_big_win'] = 1;
                }
                changed = true;
            }

            if (changed) {
                WEEKLY_MISSIONS.forEach(m => {
                    const prog = state.progress[m.id] || 0;
                    if (prog >= m.target && !state.completed.includes(m.id)) {
                        state.completed.push(m.id);
                        if (typeof gainXP === 'function') gainXP(m.xp);
                        _showChallengeCompleteToast({ ...m, label: '📋 Weekly: ' + m.label });
                        if (typeof addNotification === 'function') {
                            addNotification('weekly', 'Weekly Mission Complete!', m.label + ' — +' + m.xp + ' XP earned');
                        }
                    }
                });
                _saveWeeklyState(state);
                _renderWeeklyPanel();
            }
        };


        // ── Achievements ──────────────────────────────────────────
        const ACH_STORAGE_KEY = 'matrixAchievements';

        const ACH_DEFS = [
            // Spin milestones
            { id: 'first_spin',    icon: '🎰', name: 'First Spin',       desc: 'Play your first spin',               req: { type: 'spins',   target: 1      } },
            { id: 'spin_10',       icon: '🔄', name: 'Getting Started',  desc: 'Complete 10 spins',                  req: { type: 'spins',   target: 10     } },
            { id: 'spin_100',      icon: '💫', name: 'Spin Master',      desc: 'Complete 100 spins',                 req: { type: 'spins',   target: 100    } },
            { id: 'spin_500',      icon: '⚡', name: 'Centurion',        desc: 'Complete 500 spins',                 req: { type: 'spins',   target: 500    } },
            { id: 'spin_1000',     icon: '🌀', name: 'Reel Veteran',     desc: 'Complete 1,000 spins',               req: { type: 'spins',   target: 1000   } },
            // Win milestones
            { id: 'first_win',     icon: '🏆', name: 'First Win',        desc: 'Win your first spin',                req: { type: 'wins',    target: 1      } },
            { id: 'win_10',        icon: '💰', name: 'On a Roll',        desc: 'Win 10 times',                       req: { type: 'wins',    target: 10     } },
            { id: 'win_50',        icon: '🤑', name: 'Lucky Streak',     desc: 'Win 50 times',                       req: { type: 'wins',    target: 50     } },
            { id: 'win_200',       icon: '🥇', name: 'Win Connoisseur',  desc: 'Win 200 times',                      req: { type: 'wins',    target: 200    } },
            // Big win multipliers
            { id: 'big_win',       icon: '💥', name: 'Big Winner',       desc: 'Win over 100x your bet',             req: { type: 'bigWin',  target: 100    } },
            { id: 'mega_win',      icon: '🌟', name: 'Mega Winner',      desc: 'Win over 500x your bet',             req: { type: 'bigWin',  target: 500    } },
            { id: 'epic_win',      icon: '🔥', name: 'Epic Winner',      desc: 'Win over 1,000x your bet',           req: { type: 'bigWin',  target: 1000   } },
            // Game variety
            { id: 'games_5',       icon: '🎮', name: 'Explorer',         desc: 'Try 5 different games',              req: { type: 'games',   target: 5      } },
            { id: 'games_20',      icon: '🗺️', name: 'Adventurer',      desc: 'Try 20 different games',             req: { type: 'games',   target: 20     } },
            { id: 'games_50',      icon: '🌍', name: 'Globe Trotter',    desc: 'Try 50 different games',             req: { type: 'games',   target: 50     } },
            { id: 'games_all',     icon: '👑', name: 'Master of All',    desc: 'Try all 122 games',                  req: { type: 'games',   target: 122    } },
            // Balance milestones
            { id: 'balance_500',   icon: '💎', name: 'Getting Rich',     desc: 'Reach a balance of $500',            req: { type: 'balance', target: 500    } },
            { id: 'balance_1000',  icon: '💰', name: 'High Balance',     desc: 'Reach a balance of $1,000',          req: { type: 'balance', target: 1000   } },
            { id: 'balance_5000',  icon: '🏦', name: 'Bank Breaker',     desc: 'Reach a balance of $5,000',          req: { type: 'balance', target: 5000   } },
            // Wager milestones
            { id: 'wager_1k',      icon: '📊', name: 'Regular',          desc: 'Wager $1,000 total',                 req: { type: 'wager',   target: 1000   } },
            { id: 'wager_10k',     icon: '📈', name: 'Whale',            desc: 'Wager $10,000 total',                req: { type: 'wager',   target: 10000  } },
            // Bonus triggers
            { id: 'bonus_5',       icon: '🎁', name: 'Bonus Seeker',     desc: 'Trigger 5 bonus rounds',             req: { type: 'bonuses', target: 5      } },
            { id: 'bonus_25',      icon: '🎯', name: 'Bonus Hunter',     desc: 'Trigger 25 bonus rounds',            req: { type: 'bonuses', target: 25     } },
            // Win streak
            { id: 'streak_5',      icon: '🔥', name: 'Hot Hand',         desc: 'Win 5 spins in a row',               req: { type: 'streak',  target: 5      } },
            { id: 'streak_10',     icon: '💠', name: 'Unstoppable',      desc: 'Win 10 spins in a row',              req: { type: 'streak',  target: 10     } },
        ];

        function _loadChallengeState() {
            try {
                const raw = JSON.parse(localStorage.getItem(CHALLENGE_STORAGE_KEY) || '{}');
                const today = new Date().toDateString();
                if (raw.date !== today) {
                    return { date: today, progress: {}, completed: [] };
                }
                return raw;
            } catch(e) {
                return { date: new Date().toDateString(), progress: {}, completed: [] };
            }
        }

        function _saveChallengeState(state) {
            localStorage.setItem(CHALLENGE_STORAGE_KEY, JSON.stringify(state));
        }

        function _loadAchState() {
            try {
                const d = JSON.parse(localStorage.getItem(ACH_STORAGE_KEY) || '{}');
                return {
                    spins: d.spins || 0, wins: d.wins || 0,
                    games: Array.isArray(d.games) ? d.games : [],
                    maxWinMult: d.maxWinMult || 0, maxBalance: d.maxBalance || 0,
                    totalWagered: d.totalWagered || 0,
                    bonusesTriggered: d.bonusesTriggered || 0,
                    maxStreak: d.maxStreak || 0,
                    unlocked: Array.isArray(d.unlocked) ? d.unlocked : [],
                };
            } catch(e) { return { spins:0, wins:0, games:[], maxWinMult:0, maxBalance:0, unlocked:[] }; }
        }
        function _saveAchState(s) {
            try { localStorage.setItem(ACH_STORAGE_KEY, JSON.stringify(s)); } catch(e) {}
        }

        // ── Login Streak ──────────────────────────────────────────
        const LOGIN_STREAK_KEY = 'matrixLoginStreak';

        function _loadStreakState() {
            try {
                const d = JSON.parse(localStorage.getItem(LOGIN_STREAK_KEY) || '{}');
                return {
                    lastDate: d.lastDate || null,
                    streak: d.streak || 0,
                    longestStreak: d.longestStreak || 0,
                    totalLogins: d.totalLogins || 0,
                };
            } catch(e) { return { lastDate: null, streak: 0, longestStreak: 0, totalLogins: 0 }; }
        }

        function _saveStreakState(s) {
            try { localStorage.setItem(LOGIN_STREAK_KEY, JSON.stringify(s)); } catch(e) {}
        }

        function _checkLoginStreak() {
            const s = _loadStreakState();
            const today = new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'
            if (s.lastDate === today) return s; // already checked today

            const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
            const isConsecutive = s.lastDate === yesterday;

            s.streak = isConsecutive ? s.streak + 1 : 1;
            s.longestStreak = Math.max(s.longestStreak, s.streak);
            s.totalLogins++;
            s.lastDate = today;
            _saveStreakState(s);

            // Award XP for streak milestones
            const milestones = [3, 7, 14, 30];
            if (milestones.includes(s.streak) && typeof gainXP === 'function') {
                const xpBonus = s.streak * 10;
                gainXP(xpBonus);
                _showStreakToast(s.streak, xpBonus);
            } else if (s.streak > 1) {
                _showStreakToast(s.streak, 0);
            }
            return s;
        }

        function _showStreakToast(streak, xpBonus) {
            const prev = document.getElementById('streakToast');
            if (prev) prev.remove();
            const t = document.createElement('div');
            t.id = 'streakToast';
            const emoji = streak >= 30 ? '🔥🔥🔥' : streak >= 7 ? '🔥🔥' : '🔥';
            t.style.cssText = 'position:fixed;top:70px;right:16px;transform:translateX(120%);'
                + 'background:linear-gradient(135deg,#1a1a2e,#16213e);border:1px solid #ff6d00;'
                + 'color:#fff;border-radius:12px;padding:10px 16px;font-size:13px;z-index:99999;'
                + 'box-shadow:0 4px 20px rgba(255,109,0,0.3);transition:transform 0.4s ease;'
                + 'max-width:220px;pointer-events:none;';
            t.innerHTML = `<div style="font-weight:700;margin-bottom:2px">${emoji} ${streak}-Day Streak!</div>`
                + (xpBonus > 0 ? `<div style="font-size:11px;color:#ffb74d">+${xpBonus} XP Milestone Bonus</div>` :
                   `<div style="font-size:11px;color:rgba(255,255,255,0.5)">Keep it up!</div>`);
            document.body.appendChild(t);
            requestAnimationFrame(() => requestAnimationFrame(() => {
                t.style.transform = 'translateX(0)';
            }));
            setTimeout(() => {
                t.style.transform = 'translateX(120%)';
                setTimeout(() => t.remove(), 450);
            }, 3500);
        }

        function _nextStreakMilestone(streak) {
            const milestones = [3, 7, 14, 30, 60, 100];
            return milestones.find(m => m > streak) || streak + 10;
        }

        function _renderStreakPanel() {
            const el = document.getElementById('streakPanelContainer');
            if (!el) return;
            const s = _checkLoginStreak(); // will only update once per day
            const flames = Math.min(s.streak, 5);

            el.innerHTML = `
                <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;">
                  <div style="text-align:center;">
                    <div style="font-size:32px;line-height:1">${'🔥'.repeat(flames)}</div>
                    <div style="font-size:28px;font-weight:900;color:#ff6d00;line-height:1.1">${s.streak}</div>
                    <div style="font-size:10px;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:1px">Day Streak</div>
                  </div>
                  <div style="flex:1;min-width:120px;">
                    <div class="streak-stat-row"><span>🏆 Longest Streak</span><strong>${s.longestStreak} days</strong></div>
                    <div class="streak-stat-row"><span>📅 Total Logins</span><strong>${s.totalLogins}</strong></div>
                    <div class="streak-stat-row"><span>📆 Next Milestone</span><strong>${_nextStreakMilestone(s.streak)} days</strong></div>
                  </div>
                </div>`;
        }

        function _ensureStreakPanel() {
            if (document.getElementById('streakPanelContainer')) return;
            const wrap = document.createElement('div');
            wrap.id = 'streakPanelContainer';
            wrap.style.cssText = 'margin-top:14px;padding:12px;background:rgba(255,109,0,0.06);'
                + 'border-radius:10px;border:1px solid rgba(255,109,0,0.2);';
            // Inject before achievements panel or append to statsContent
            const achPanel = document.getElementById('achPanelContainer');
            if (achPanel && achPanel.parentNode) {
                achPanel.parentNode.insertBefore(wrap, achPanel);
            } else {
                const sc = document.getElementById('statsContent') || document.querySelector('[id*="stats"]');
                if (sc) sc.appendChild(wrap);
            }
        }

        // Global hook called by spin/win code in ui-slot.js
        window.onChallengeEvent = function(eventType, payload) {
            const state = _loadChallengeState();
            let changed = false;

            if (eventType === 'spin') {
                // spin counts
                state.progress['spins_20'] = (state.progress['spins_20'] || 0) + 1;
                state.progress['spins_50'] = (state.progress['spins_50'] || 0) + 1;
                // wager
                state.progress['wager_500'] = (state.progress['wager_500'] || 0) + (payload.bet || 0);
                // game variety
                if (payload.gameId) {
                    if (!state.gamesPlayedToday) state.gamesPlayedToday = [];
                    if (!state.gamesPlayedToday.includes(payload.gameId)) {
                        state.gamesPlayedToday.push(payload.gameId);
                    }
                    state.progress['games_3'] = state.gamesPlayedToday.length;
                }
                // win
                if (payload.win && payload.win > 0) {
                    state.progress['win_once'] = Math.max(state.progress['win_once'] || 0, 1);
                }
                // win multiplier
                if ((payload.winMult || 0) >= 50) {
                    state.progress['big_win_50'] = Math.max(state.progress['big_win_50'] || 0, 1);
                }
                // win streak
                if ((payload.streak || 0) >= 3) {
                    state.progress['streak_3'] = Math.max(state.progress['streak_3'] || 0, 1);
                }
                changed = true;
            }

            if (eventType === 'bonus') {
                state.progress['bonus_1'] = Math.max(state.progress['bonus_1'] || 0, 1);
                changed = true;
            }

            if (changed) {
                DAILY_CHALLENGES.forEach(ch => {
                    const prog = state.progress[ch.id] || 0;
                    if (prog >= ch.target && !state.completed.includes(ch.id)) {
                        state.completed.push(ch.id);
                        awardXP(ch.xp);
                        // Cash reward
                        if ((ch.reward || 0) > 0) {
                            balance += ch.reward;
                            if (typeof saveBalance === 'function') saveBalance();
                            if (typeof updateBalance === 'function') updateBalance();
                        }
                        _showChallengeCompleteToast(ch);
                        if (typeof window.refreshLobbyChallengeWidget === 'function') window.refreshLobbyChallengeWidget();
                    }
                });
                _saveChallengeState(state);
                _renderChallengesPanel();
            }
            _checkAchievements(eventType, payload);
        };

        function _formatDuration(ms) {
            const totalSeconds = Math.floor(ms / 1000);
            const minutes = Math.floor(totalSeconds / 60);
            const seconds = totalSeconds % 60;
            if (minutes === 0) return seconds + 's';
            return minutes + 'm ' + seconds + 's';
        }


        function updateStatsSummary() {
            const biggestWinEl = document.getElementById('biggestWin');
            if (biggestWinEl) {
                biggestWinEl.textContent = Math.round(stats.biggestWin).toLocaleString();
            }
            updateStatsModal();
        }


        function updateStatsModal() {
            const totalSpinsEl = document.getElementById('statsTotalSpins');
            if (!totalSpinsEl) return;

            const totalWageredEl = document.getElementById('statsTotalWagered');
            const totalWonEl = document.getElementById('statsTotalWon');
            const biggestWinEl = document.getElementById('statsBiggestWin');
            const netEl = document.getElementById('statsNet');
            const gamesListEl = document.getElementById('statsGamesList');
            const net = stats.totalWon - stats.totalWagered;

            totalSpinsEl.textContent = Math.round(stats.totalSpins).toLocaleString();
            totalWageredEl.textContent = `$${formatMoney(stats.totalWagered)}`;
            totalWonEl.textContent = `$${formatMoney(stats.totalWon)}`;
            biggestWinEl.textContent = `$${formatMoney(stats.biggestWin)}`;
            netEl.textContent = `${net >= 0 ? '+' : '-'}$${formatMoney(Math.abs(net))}`;
            netEl.style.color = net >= 0 ? '#34d399' : '#fca5a5';

            const playedGames = Object.entries(stats.gamesPlayed || {})
                .sort((a, b) => b[1] - a[1])
                .slice(0, 8);

            if (playedGames.length === 0) {
                gamesListEl.innerHTML = '<li class="stats-empty">No games played yet.</li>';
            } else {
                gamesListEl.innerHTML = playedGames
                    .map(([gameId, plays]) => {
                        const game = games.find((item) => item.id === gameId);
                        const gameName = game ? game.name : gameId;
                        return `<li><span>${gameName}</span><strong>${plays} ${plays === 1 ? 'play' : 'plays'}</strong></li>`;
                    })
                    .join('');
            }

            // ── Session info section ──────────────────────────────────
            _renderSessionSection();

            // ── Top games by spins with RTP section ──────────────────
            _renderTopGamesSection();

            // ── Daily Challenges section ──────────────────────────────
            _ensureDailyChallengesPanel();
            _ensureHoFPanel();
            _renderChallengesPanel();
            _initChallengesTabs();

            // Update achievements
            updateAchievements();

            // ── Achievements panel (localStorage-tracked) ─────────────
            _ensureAchievementsPanel();
            _renderAchievementsPanel();

            // ── Login Streak panel ────────────────────────────────────
            _ensureStreakPanel();
            _renderStreakPanel();

            // ── All-Time Leaderboard panel ─────────────────────────────
            _ensureLeaderboardPanel();
        }


        function _ensureLeaderboardPanel() {
            if (document.getElementById('leaderboardPanelContainer')) return;
            var wrap = document.createElement('div');
            wrap.id = 'leaderboardPanelContainer';
            wrap.style.cssText = 'margin-top:14px;';
            wrap.innerHTML = '<div id="leaderboardToggle" role="button" tabindex="0"'
                + ' style="cursor:pointer;display:flex;align-items:center;justify-content:space-between;'
                + 'padding:8px 12px;background:rgba(255,215,0,0.06);border:1px solid rgba(255,215,0,0.2);border-radius:8px;">'
                + '<span style="font-size:13px;font-weight:700;color:#ffd700">\uD83C\uDFC6 All-Time Big Wins</span>'
                + '<span id="leaderboardChevron" style="color:rgba(255,255,255,0.4);font-size:12px">\u25BC</span>'
                + '</div>'
                + '<div id="leaderboardBody" style="border:1px solid rgba(255,215,0,0.12);border-top:none;'
                + 'border-radius:0 0 8px 8px;padding:8px 12px;background:rgba(0,0,0,0.25);display:none">'
                + '<div id="leaderboardList"><div style="color:rgba(255,255,255,0.4);font-size:12px;padding:8px 0">Loading\u2026</div></div>'
                + '</div>';
            var streak = document.getElementById('streakPanelContainer');
            if (streak && streak.parentNode) {
                streak.parentNode.insertBefore(wrap, streak.nextSibling);
            } else {
                var sc = document.querySelector('.stats-panel');
                if (sc) sc.appendChild(wrap);
            }
            document.getElementById('leaderboardToggle').addEventListener('click', function() {
                var body = document.getElementById('leaderboardBody');
                var chev = document.getElementById('leaderboardChevron');
                var isOpen = body.style.display !== 'none';
                body.style.display = isOpen ? 'none' : '';
                chev.textContent = isOpen ? '\u25BC' : '\u25B2';
                if (!isOpen && !body.dataset.loaded) {
                    body.dataset.loaded = '1';
                    _fetchLeaderboard();
                }
            });
        }

        function _fetchLeaderboard() {
            var list = document.getElementById('leaderboardList');
            if (!list) return;
            fetch('/api/leaderboard')
                .then(function(r) { return r.json(); })
                .then(function(data) {
                    var entries = data.leaderboard || [];
                    if (entries.length === 0) {
                        list.innerHTML = '<div style="color:rgba(255,255,255,0.4);font-size:12px;padding:8px 0">No big wins yet \u2014 be the first!</div>';
                        return;
                    }
                    var medals = ['\uD83E\uDD47', '\uD83E\uDD48', '\uD83E\uDD49'];
                    list.innerHTML = entries.map(function(e, i) {
                        var gameName = e.gameId || 'Unknown';
                        if (typeof games !== 'undefined') {
                            var g = games.find(function(x) { return x.id === e.gameId; });
                            if (g) gameName = g.name;
                        }
                        return '<div class="ldb-row">'
                            + '<span class="ldb-rank">' + (medals[i] || (i + 1)) + '</span>'
                            + '<span class="ldb-player">' + e.username + (typeof getVipBadgeHtml === 'function' ? getVipBadgeHtml(e.vip_tier || null) : '') + '</span>'
                            + '<span class="ldb-game">' + gameName + '</span>'
                            + '<span class="ldb-mult">' + e.mult + '\xD7</span>'
                            + '<span class="ldb-amount">$' + Number(e.winAmount).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</span>'
                            + '</div>';
                    }).join('');
                })
                .catch(function() {
                    list.innerHTML = '<div style="color:rgba(255,255,255,0.4);font-size:12px;padding:8px 0">Could not load leaderboard.</div>';
                });
        }


        function _renderSessionSection() {
            const containerId = 'statsSessionSection';
            let container = document.getElementById(containerId);
            if (!container) {
                // Inject after the stats-grid, before "Top Played Games" heading
                const gamesListEl = document.getElementById('statsGamesList');
                if (!gamesListEl) return;
                // Find the h4 heading immediately before the games list
                let insertBefore = gamesListEl.previousElementSibling;
                while (insertBefore && insertBefore.tagName !== 'H4') {
                    insertBefore = insertBefore.previousElementSibling;
                }
                container = document.createElement('div');
                container.id = containerId;
                if (insertBefore) {
                    insertBefore.parentNode.insertBefore(container, insertBefore);
                } else {
                    gamesListEl.parentNode.insertBefore(container, gamesListEl);
                }
            }

            const startBal = _getSessionStartBalance();
            const currentBal = typeof balance !== 'undefined' ? balance : startBal;
            const netSession = currentBal - startBal;
            const durationMs = Date.now() - sessionStartTime;
            const netColor = netSession >= 0 ? '#00ff41' : '#fca5a5';
            const netPrefix = netSession >= 0 ? '+' : '-';

            container.innerHTML = `
                <h4 style="margin-bottom:10px;margin-top:20px;color:#00ff41;font-size:13px;text-transform:uppercase;letter-spacing:1px;">This Session</h4>
                <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-bottom:16px;">
                    <div style="background:rgba(0,255,65,0.06);border:1px solid rgba(0,255,65,0.2);border-radius:8px;padding:10px 12px;">
                        <div style="font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Duration</div>
                        <div style="font-size:16px;font-weight:700;color:#e2e8f0;">${_formatDuration(durationMs)}</div>
                    </div>
                    <div style="background:rgba(0,255,65,0.06);border:1px solid rgba(0,255,65,0.2);border-radius:8px;padding:10px 12px;">
                        <div style="font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Spins</div>
                        <div style="font-size:16px;font-weight:700;color:#e2e8f0;">${sessionSpins.toLocaleString()}</div>
                    </div>
                    <div style="background:rgba(0,255,65,0.06);border:1px solid rgba(0,255,65,0.2);border-radius:8px;padding:10px 12px;">
                        <div style="font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Won This Session</div>
                        <div style="font-size:16px;font-weight:700;color:#e2e8f0;">$${formatMoney(sessionWon)}</div>
                    </div>
                    <div style="background:rgba(0,255,65,0.06);border:1px solid rgba(0,255,65,0.2);border-radius:8px;padding:10px 12px;">
                        <div style="font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Net This Session</div>
                        <div style="font-size:16px;font-weight:700;color:${netColor};">${netPrefix}$${formatMoney(Math.abs(netSession))}</div>
                    </div>
                </div>
            `;
        }


        function _renderTopGamesSection() {
            const containerId = 'statsTopGamesSection';
            let container = document.getElementById(containerId);
            if (!container) {
                const achievementsEl = document.getElementById('achievementsList');
                if (!achievementsEl) return;
                // Find the h4 before achievementsList
                let insertBefore = achievementsEl.previousElementSibling;
                while (insertBefore && insertBefore.tagName !== 'H4') {
                    insertBefore = insertBefore.previousElementSibling;
                }
                container = document.createElement('div');
                container.id = containerId;
                if (insertBefore) {
                    insertBefore.parentNode.insertBefore(container, insertBefore);
                } else {
                    achievementsEl.parentNode.insertBefore(container, achievementsEl);
                }
            }

            const gameStats = stats.gameStats || {};
            const topGames = Object.entries(gameStats)
                .filter(([, gs]) => gs.spins > 0)
                .sort((a, b) => b[1].spins - a[1].spins)
                .slice(0, 3);

            if (topGames.length === 0) {
                container.innerHTML = '';
                return;
            }

            const rows = topGames.map(([gameId, gs]) => {
                const rtp = gs.bet > 0 ? ((gs.won / gs.bet) * 100).toFixed(1) : '—';
                const rtpColor = gs.bet > 0 && gs.won / gs.bet >= 1 ? '#00ff41' : '#fca5a5';
                const name = gs.name || gameId;
                const shortName = name.length > 18 ? name.slice(0, 17) + '…' : name;
                return `
                    <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 10px;background:rgba(0,0,0,0.3);border-radius:6px;margin-bottom:6px;">
                        <span style="font-size:12px;color:#e2e8f0;flex:1;min-width:0;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;" title="${name}">${shortName}</span>
                        <span style="font-size:11px;color:#94a3b8;margin:0 12px;white-space:nowrap;">${gs.spins.toLocaleString()} spins</span>
                        <span style="font-size:12px;font-weight:700;color:${rtpColor};white-space:nowrap;">${rtp === '—' ? '—' : rtp + '% RTP'}</span>
                    </div>
                `;
            }).join('');

            container.innerHTML = `
                <h4 style="margin-bottom:10px;margin-top:20px;color:#00ff41;font-size:13px;text-transform:uppercase;letter-spacing:1px;">Top Games This Account</h4>
                ${rows}
            `;
        }


        function _showChallengeCompleteToast(ch) {
            const el = document.createElement('div');
            el.style.cssText = `
                position:fixed; bottom:100px; left:50%; transform:translateX(-50%) translateY(20px);
                background:linear-gradient(135deg,#065f46,#047857); color:#d1fae5;
                padding:14px 24px; border-radius:12px; z-index:12000; font-weight:800;
                box-shadow:0 8px 24px rgba(0,200,100,0.4); text-align:center;
                animation:challengeToastIn 0.4s ease-out forwards;
                border:1px solid rgba(52,211,153,0.4); min-width:260px;
            `;
            el.innerHTML = `
                <div style="font-size:28px;margin-bottom:4px;">${ch.icon}</div>
                <div style="font-size:13px;letter-spacing:1px;margin-bottom:2px;">✅ CHALLENGE COMPLETE!</div>
                <div style="font-size:15px;">${ch.label}</div>
                <div style="font-size:12px;color:#6ee7b7;margin-top:4px;">+${ch.xp} XP${ch.reward ? ' · +$' + ch.reward : ''} awarded!</div>
            `;
            document.body.appendChild(el);
            setTimeout(() => {
                el.style.animation = 'challengeToastOut 0.4s ease-in forwards';
                setTimeout(() => el.remove(), 400);
            }, 3500);
        }


        function _renderChallengesPanel() {
            const container = document.getElementById('dailyChallengesPanel');
            if (!container) return;
            const state = _loadChallengeState();
            container.innerHTML = DAILY_CHALLENGES.map(ch => {
                const prog = Math.min(state.progress[ch.id] || 0, ch.target);
                const pct = Math.round((prog / ch.target) * 100);
                const done = state.completed.includes(ch.id);
                const barColor = done ? '#34d399' : '#3b82f6';
                return `
                <div style="margin-bottom:14px;">
                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
                        <span style="font-size:20px;">${ch.icon}</span>
                        <div style="flex:1;min-width:0;">
                            <div style="font-size:12px;font-weight:700;color:${done ? '#34d399' : '#e2e8f0'};">${ch.label}${done ? ' ✓' : ''}</div>
                            <div style="font-size:10px;color:#64748b;">${ch.desc}</div>
                        </div>
                        <div style="font-size:11px;font-weight:700;color:#fbbf24;white-space:nowrap;">+${ch.xp} XP</div>
                    </div>
                    <div style="background:rgba(255,255,255,0.07);border-radius:4px;height:6px;overflow:hidden;">
                        <div style="height:100%;width:${pct}%;background:${barColor};border-radius:4px;transition:width 0.4s ease;"></div>
                    </div>
                    <div style="font-size:10px;color:#475569;margin-top:3px;text-align:right;">${prog}/${ch.target}</div>
                </div>`;
            }).join('');
        }


        function _initChallengesTabs() {
            const tabContainer = document.getElementById('challengesTabs');
            if (!tabContainer || tabContainer.dataset.init) return;
            tabContainer.dataset.init = '1';
            tabContainer.addEventListener('click', function(e) {
                const btn = e.target.closest('[data-tab]');
                if (!btn) return;
                tabContainer.querySelectorAll('[data-tab]').forEach(b => b.classList.remove('ch-tab-active'));
                btn.classList.add('ch-tab-active');
                const tab = btn.dataset.tab;
                const daily  = document.getElementById('dailyChallengesPanel');
                const weekly = document.getElementById('weeklyChallengesPanel');
                if (daily)  daily.style.display  = tab === 'daily'  ? '' : 'none';
                if (weekly) weekly.style.display  = tab === 'weekly' ? '' : 'none';
                if (tab === 'weekly') _renderWeeklyPanel();
            });
        }

        function _ensureDailyChallengesPanel() {
            if (document.getElementById('dailyChallengesPanel')) return;
            const achievementsEl = document.getElementById('achievementsList');
            if (!achievementsEl) return;
            let insertBefore = achievementsEl.previousElementSibling;
            while (insertBefore && insertBefore.tagName !== 'H4') {
                insertBefore = insertBefore.previousElementSibling;
            }
            const wrapper = document.createElement('div');
            wrapper.innerHTML = `
                <h4 style="margin-bottom:10px;margin-top:20px;color:#3b82f6;font-size:13px;text-transform:uppercase;letter-spacing:1px;">⚡ Daily Challenges</h4>
                <div id="dailyChallengesPanel"></div>
            `;
            if (insertBefore) {
                insertBefore.parentNode.insertBefore(wrapper, insertBefore);
            } else {
                achievementsEl.parentNode.insertBefore(wrapper, achievementsEl);
            }
        }


        function updateAchievements() {
            const achievementsListEl = document.getElementById('achievementsList');
            if (!achievementsListEl) return;

            if (!stats.achievements) {
                stats.achievements = [];
            }

            const html = ACHIEVEMENTS.map(achievement => {
                const isUnlocked = stats.achievements.includes(achievement.id);
                const canUnlock = !isUnlocked && achievement.requirement(stats);

                if (canUnlock) {
                    stats.achievements.push(achievement.id);
                    saveStats();
                    showAchievementNotification(achievement);
                }

                const unlocked = stats.achievements.includes(achievement.id);

                return `
                    <div style="
                        background: ${unlocked ? 'linear-gradient(135deg, rgba(251,191,36,0.2), rgba(245,158,11,0.2))' : 'rgba(15, 23, 42, 0.8)'};
                        border: 2px solid ${unlocked ? '#fbbf24' : '#475569'};
                        border-radius: 12px;
                        padding: 12px;
                        text-align: center;
                        opacity: ${unlocked ? '1' : '0.5'};
                        transition: all 0.3s;
                    ">
                        <div style="font-size: 32px; margin-bottom: 6px;">${achievement.icon}</div>
                        <div style="font-size: 11px; font-weight: 700; color: ${unlocked ? '#fbbf24' : '#94a3b8'}; margin-bottom: 4px;">${achievement.name}</div>
                        <div style="font-size: 9px; color: #64748b;">${achievement.desc}</div>
                        ${unlocked ? '<div style="font-size: 10px; color: #10b981; margin-top: 4px; font-weight: 700;">\u2705 UNLOCKED</div>' : ''}
                    </div>
                `;
            }).join('');

            achievementsListEl.innerHTML = html;
        }


        function showAchievementNotification(achievement) {
            // Also persist in notification center
            if (typeof addNotification === "function") {
                addNotification("achievement", "🏆" + achievement.name, achievement.desc);
            }
            playSound('bigwin');

            const notification = document.createElement('div');
            notification.style.cssText = `
                position: fixed;
                top: 100px;
                right: 20px;
                background: linear-gradient(135deg, #fbbf24, #f59e0b);
                color: #000;
                padding: 20px;
                border-radius: 16px;
                box-shadow: 0 8px 32px rgba(251,191,36,0.6);
                z-index: 10001;
                font-weight: 900;
                animation: slideInRight 0.5s ease-out;
                max-width: 300px;
            `;
            notification.innerHTML = `
                <div style="font-size: 48px; text-align: center; margin-bottom: 8px;">${achievement.icon}</div>
                <div style="font-size: 14px; margin-bottom: 4px;">\u{1F3C6} ACHIEVEMENT UNLOCKED!</div>
                <div style="font-size: 18px; margin-bottom: 4px;">${achievement.name}</div>
                <div style="font-size: 12px; opacity: 0.8;">${achievement.desc}</div>
            `;

            document.body.appendChild(notification);

            createConfetti();

            setTimeout(() => {
                notification.style.animation = 'slideOutRight 0.5s ease-out';
                setTimeout(() => notification.remove(), 500);
            }, 4000);
        }


        // ── Achievement System (localStorage-tracked) ─────────────────

        function _checkAchievements(eventType, payload) {
            const s = _loadAchState();
            let changed = false;
            if (eventType === 'spin') {
                s.spins++;
                if (payload.win > 0) s.wins++;
                const mult = payload.bet > 0 ? payload.win / payload.bet : 0;
                if (mult > s.maxWinMult) s.maxWinMult = mult;
                if (payload.gameId && !s.games.includes(payload.gameId)) s.games.push(payload.gameId);
                s.totalWagered = (s.totalWagered || 0) + (payload.bet || 0);
                const streak = payload.streak || 0;
                if (streak > (s.maxStreak || 0)) s.maxStreak = streak;
                changed = true;
            }
            if (eventType === 'bonus') {
                s.bonusesTriggered = (s.bonusesTriggered || 0) + 1;
                changed = true;
            }
            // Update max balance on any event
            try {
                if (typeof balance !== 'undefined' && balance > s.maxBalance) {
                    s.maxBalance = balance; changed = true;
                }
            } catch(e) {}

            const newUnlocks = [];
            for (const ach of ACH_DEFS) {
                if (s.unlocked.includes(ach.id)) continue;
                const r = ach.req;
                const unlocked =
                    (r.type === 'spins'   && s.spins >= r.target)                 ||
                    (r.type === 'wins'    && s.wins  >= r.target)                 ||
                    (r.type === 'bigWin'  && s.maxWinMult >= r.target)            ||
                    (r.type === 'games'   && s.games.length >= r.target)          ||
                    (r.type === 'balance' && s.maxBalance >= r.target)            ||
                    (r.type === 'wager'   && (s.totalWagered||0) >= r.target)     ||
                    (r.type === 'bonuses' && (s.bonusesTriggered||0) >= r.target) ||
                    (r.type === 'streak'  && (s.maxStreak||0) >= r.target);
                if (unlocked) { s.unlocked.push(ach.id); newUnlocks.push(ach); changed = true; }
            }
            if (changed) _saveAchState(s);
            newUnlocks.forEach(_showAchUnlockToast);
        }


        function _showAchUnlockToast(ach) {
            const prev = document.getElementById('achUnlockToast');
            if (prev) prev.remove();
            const t = document.createElement('div');
            t.id = 'achUnlockToast';
            t.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%) translateY(20px);opacity:0;'
                + 'background:linear-gradient(135deg,#1a1a2e,#16213e);border:1px solid #7b61ff;color:#fff;'
                + 'border-radius:12px;padding:12px 20px;display:flex;align-items:center;gap:12px;font-size:14px;'
                + 'z-index:99999;box-shadow:0 4px 24px rgba(123,97,255,0.4);transition:all 0.4s ease;'
                + 'pointer-events:none;max-width:320px;';
            t.innerHTML = `<span style="font-size:28px">${ach.icon}</span><div>`
                + `<div style="font-size:10px;color:#7b61ff;font-weight:700;letter-spacing:1px;text-transform:uppercase">Achievement Unlocked!</div>`
                + `<div style="font-weight:700;margin:2px 0">${ach.name}</div>`
                + `<div style="font-size:11px;color:rgba(255,255,255,0.6)">${ach.desc}</div></div>`;
            document.body.appendChild(t);
            requestAnimationFrame(() => requestAnimationFrame(() => {
                t.style.transform = 'translateX(-50%) translateY(0)';
                t.style.opacity = '1';
            }));
            setTimeout(() => {
                t.style.transform = 'translateX(-50%) translateY(20px)';
                t.style.opacity = '0';
                setTimeout(() => t.remove(), 450);
            }, 4000);
        }

        // ── Hall of Fame — cross-session best wins ────────────────
        const HOF_KEY = typeof STORAGE_KEY_HALL_OF_FAME !== 'undefined' ? STORAGE_KEY_HALL_OF_FAME : 'matrixHallOfFame';
        const HOF_MAX = 10;

        function _loadHoF() {
            try { return JSON.parse(localStorage.getItem(HOF_KEY) || '[]'); } catch(e) { return []; }
        }
        function _saveHoF(list) {
            try { localStorage.setItem(HOF_KEY, JSON.stringify(list)); } catch(e) {}
        }

        window.recordHallOfFameWin = function(winAmount, bet, gameName, gameId, bonusType) {
            if (!winAmount || winAmount <= 0) return;
            const mult = bet > 0 ? winAmount / bet : 0;
            if (mult < 5) return;
            const list = _loadHoF();
            list.push({
                amount: winAmount,
                mult: parseFloat(mult.toFixed(1)),
                game: gameName || 'Unknown',
                gameId: gameId || '',
                bonusType: bonusType || '',
                date: new Date().toLocaleDateString('en-AU', { day:'numeric', month:'short', year:'2-digit' })
            });
            list.sort((a, b) => b.mult - a.mult);
            if (list.length > HOF_MAX) list.length = HOF_MAX;
            _saveHoF(list);
        };

        function _renderHoFPanel(container) {
            const list = _loadHoF();
            if (list.length === 0) {
                container.innerHTML = '<div style="color:rgba(255,255,255,0.4);font-size:12px;text-align:center;padding:12px 0">No big wins yet \u2014 spin to make history!</div>';
                return;
            }
            const medals = ['\uD83E\uDD47','\uD83E\uDD48','\uD83E\uDD49'];
            container.innerHTML = list.map((e, i) => `
                <div class="hof-row">
                    <span class="hof-rank">${medals[i] || (i+1)}</span>
                    <span class="hof-game">${e.game}</span>
                    <span class="hof-mult">${e.mult}\xD7</span>
                    <span class="hof-amount">$${Number(e.amount).toLocaleString('en-AU',{minimumFractionDigits:2,maximumFractionDigits:2})}</span>
                    <span class="hof-date">${e.date}</span>
                </div>`).join('');
        }

        function _ensureHoFPanel() {
            if (document.getElementById('hofPanel')) return;
            // Append after the achievements panel, or after dailyChallengesPanel, or after achievementsList
            const parent = (document.getElementById('achPanelContainer') || document.getElementById('dailyChallengesPanel') || document.getElementById('achievementsList') || {}).parentNode;
            if (!parent) return;
            const wrap = document.createElement('div');
            wrap.id = 'hofPanel';
            wrap.style.cssText = 'margin-top:16px';
            wrap.innerHTML = `
                <div class="hof-header" id="hofToggle" role="button" tabindex="0" style="cursor:pointer;display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:rgba(255,215,0,0.08);border:1px solid rgba(255,215,0,0.25);border-radius:8px;margin-bottom:0">
                    <span style="font-size:13px;font-weight:700;color:#ffd700">\uD83C\uDFC6 Hall of Fame</span>
                    <span id="hofChevron" style="color:rgba(255,255,255,0.4);font-size:12px">\u25BC</span>
                </div>
                <div id="hofBody" style="border:1px solid rgba(255,215,0,0.15);border-top:none;border-radius:0 0 8px 8px;padding:8px 12px;background:rgba(0,0,0,0.3)">
                    <div id="hofList"></div>
                </div>`;
            parent.appendChild(wrap);
            _renderHoFPanel(document.getElementById('hofList'));

            let collapsed = false;
            const body = document.getElementById('hofBody');
            const chev = document.getElementById('hofChevron');
            document.getElementById('hofToggle').addEventListener('click', () => {
                collapsed = !collapsed;
                body.style.display = collapsed ? 'none' : '';
                chev.textContent = collapsed ? '\u25B6' : '\u25BC';
            });
        }


        function _renderAchievementsPanel() {
            const container = document.getElementById('achPanelContainer');
            if (!container) return;
            const s = _loadAchState();
            container.innerHTML = `
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
                  <span style="font-weight:700;font-size:13px">🏅 Achievements</span>
                  <span class="ach-count-badge">${s.unlocked.length} / ${ACH_DEFS.length}</span>
                </div>
                <div class="ach-grid">
                  ${ACH_DEFS.map(a => `<div class="ach-card ${s.unlocked.includes(a.id)?'ach-unlocked':'ach-locked'}">
                    <div class="ach-icon">${a.icon}</div>
                    <div class="ach-name">${a.name}</div>
                    <div class="ach-desc">${a.desc}</div>
                  </div>`).join('')}
                </div>`;
        }


        function _ensureAchievementsPanel() {
            if (document.getElementById('achPanelContainer')) return;
            const wrap = document.createElement('div');
            wrap.id = 'achPanelContainer';
            wrap.style.cssText = 'margin-top:14px;padding:12px;background:rgba(255,255,255,0.02);border-radius:10px;border:1px solid rgba(255,255,255,0.06);';
            // Insert after challengesPanelContainer if it exists, else append to statsContent
            const chal = document.getElementById('challengesPanelContainer') || document.getElementById('dailyChallengesPanel');
            if (chal && chal.parentNode) {
                chal.parentNode.insertBefore(wrap, chal.nextSibling);
            } else {
                const sc = document.getElementById('statsContent') || document.querySelector('[id*="stats"]');
                if (sc) sc.appendChild(wrap);
            }
        }


        function openStatsModal() {
            updateStatsModal();
            refreshQaStateDisplay();
            document.getElementById('statsModal').classList.add('active');
        }


        function closeStatsModal() {
            document.getElementById('statsModal').classList.remove('active');
        }


        function loadSettings() {
            const saved = localStorage.getItem(STORAGE_KEY_SETTINGS);
            if (saved) {
                try { return Object.assign({}, settingsDefaults, JSON.parse(saved)); }
                catch (e) { return { ...settingsDefaults }; }
            }
            return { ...settingsDefaults };
        }


        function saveSettings() {
            localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(appSettings));
        }


        function openSettingsModal() {
            // Sync UI with current settings
            const modal = document.getElementById('settingsModal');
            document.getElementById('settingSoundEnabled').checked = typeof SoundManager !== 'undefined' ? SoundManager.soundEnabled : appSettings.soundEnabled;
            document.getElementById('settingVolume').value = typeof SoundManager !== 'undefined' ? Math.round(SoundManager.soundVolume * 100) : appSettings.volume;
            document.getElementById('settingVolumeLabel').textContent = (typeof SoundManager !== 'undefined' ? Math.round(SoundManager.soundVolume * 100) : appSettings.volume) + '%';
            document.getElementById('settingParticles').checked = appSettings.particles;
            document.getElementById('settingAnimations').checked = appSettings.animations;
            document.getElementById('settingConfetti').checked = appSettings.confetti;
            document.getElementById('settingTurbo').checked = appSettings.turboDefault;
            document.getElementById('settingAutoSpeed').value = appSettings.autoSpinSpeed;
            document.getElementById('settingAutoSpeedLabel').textContent = (appSettings.autoSpinSpeed / 1000).toFixed(1) + 's';
            const qualitySelect = document.getElementById('settingAnimationQuality');
            if (qualitySelect) qualitySelect.value = appSettings.animationQuality || 'ultra';
            const ambientCheck = document.getElementById('settingAmbientMusic');
            if (ambientCheck) ambientCheck.checked = appSettings.ambientMusic !== false;
            const winSoundsCheck = document.getElementById('settingWinSounds');
            if (winSoundsCheck) winSoundsCheck.checked = appSettings.winSounds !== false;
            const uiSoundsCheck = document.getElementById('settingUiSounds');
            if (uiSoundsCheck) uiSoundsCheck.checked = appSettings.uiSounds !== false;
            modal.classList.add('active');
            playSound('click');
        }


        function closeSettingsModal() {
            document.getElementById('settingsModal').classList.remove('active');
        }


        function settingsToggleSound(enabled) {
            appSettings.soundEnabled = enabled;
            if (typeof SoundManager !== 'undefined') {
                SoundManager.setSoundEnabled(enabled);
            }
            saveSettings();
        }


        function settingsSetVolume(val) {
            const v = parseInt(val, 10);
            appSettings.volume = v;
            document.getElementById('settingVolumeLabel').textContent = v + '%';
            if (typeof setSoundVolume === 'function') {
                setSoundVolume(v / 100);
            }
            saveSettings();
        }


        function settingsToggleParticles(enabled) {
            appSettings.particles = enabled;
            saveSettings();
        }


        function settingsToggleAnimations(enabled) {
            appSettings.animations = enabled;
            saveSettings();
        }


        function settingsToggleConfetti(enabled) {
            appSettings.confetti = enabled;
            saveSettings();
        }


        function settingsToggleTurbo(enabled) {
            appSettings.turboDefault = enabled;
            saveSettings();
        }


        function settingsSetAutoSpeed(val) {
            const v = parseInt(val, 10);
            appSettings.autoSpinSpeed = v;
            document.getElementById('settingAutoSpeedLabel').textContent = (v / 1000).toFixed(1) + 's';
            saveSettings();
        }


        function settingsResetAll() {
            appSettings = { ...settingsDefaults };
            window.appSettings = appSettings;
            saveSettings();
            if (typeof SoundManager !== 'undefined') {
                SoundManager.setSoundEnabled(true);
                setSoundVolume(0.5);
            }
            // Refresh the panel UI
            openSettingsModal();
            if (typeof showToast === 'function') showToast('Settings reset to defaults', 'info');
        }


        function settingsSetAnimationQuality(val) {
            appSettings.animationQuality = val;
            saveSettings();
        }
        function settingsToggleAmbientMusic(enabled) {
            appSettings.ambientMusic = enabled;
            saveSettings();
        }
        function settingsToggleWinSounds(enabled) {
            appSettings.winSounds = enabled;
            saveSettings();
        }
        function settingsToggleUiSounds(enabled) {
            appSettings.uiSounds = enabled;
            saveSettings();
        }


        function addFunds() {
            if (typeof showWalletModal === 'function' && currentUser) {
                showWalletModal();
            } else {
                // Fallback to old deposit modal if wallet not loaded or not logged in
                const dm = document.getElementById('depositModal');
                if (dm) dm.classList.add('active');
            }
        }


        async function confirmDeposit(amount) {
            balance += amount;
            updateBalance();
            saveBalance();
            closeDepositModal();
            showToast(`$${amount.toLocaleString()} deposited!`, 'success');
            playSound('win');
        }


        function closeDepositModal() {
            document.getElementById('depositModal').classList.remove('active');
        }


        function getXPForLevel(level) {
            return Math.floor(BASE_XP_PER_LEVEL * Math.pow(XP_LEVEL_GROWTH_RATE, level - 1));
        }


        function getTier(level) {
            let tier = XP_TIERS[0];
            for (const t of XP_TIERS) {
                if (level >= t.minLevel) tier = t;
            }
            return tier;
        }


        function loadXP() {
            const saved = localStorage.getItem(XP_STORAGE_KEY);
            if (saved) {
                try {
                    const data = JSON.parse(saved);
                    playerXP = parseStoredNumber(data.xp, 0);
                    playerLevel = parseStoredNumber(data.level, 1);
                    if (playerLevel < 1) playerLevel = 1;
                } catch { playerXP = 0; playerLevel = 1; }
            }
        }


        function saveXP() {
            localStorage.setItem(XP_STORAGE_KEY, JSON.stringify({ xp: playerXP, level: playerLevel }));
        }


        function awardXP(amount) {
            // Check 2x XP Boost
            try {
                var _boost = JSON.parse(localStorage.getItem('matrixXpBoost') || 'null');
                if (_boost && _boost.remaining > 0) {
                    amount = amount * 2;
                    _boost.remaining--;
                    localStorage.setItem('matrixXpBoost', JSON.stringify(_boost));
                    if (_boost.remaining <= 0) localStorage.removeItem('matrixXpBoost');
                }
            } catch(e) {}
            playerXP += amount;
            let levelledUp = false;
            let needed = getXPForLevel(playerLevel);
            while (playerXP >= needed) {
                playerXP -= needed;
                playerLevel++;
                levelledUp = true;
                needed = getXPForLevel(playerLevel);
            }
            saveXP();
            updateXPDisplay();
            // Check milestone BEFORE generic levelledUp toast
            const _MILESTONE_LEVELS = [5, 10, 15, 20, 25, 30, 40, 50, 75, 100];
            const _MILESTONE_PERKS = {
                5: 'Lucky Charm Unlocked', 10: 'High Roller Status',
                15: 'Fortune Seeker', 20: 'Gold Member',
                25: 'Platinum Insider', 30: 'Diamond Hand',
                40: 'Elite Spinner', 50: 'Casino Legend',
                75: 'Master of the Reels', 100: 'Hall of Fame'
            };
            if (levelledUp && _MILESTONE_LEVELS.includes(playerLevel)) {
                try {
                    const _claimed = JSON.parse(localStorage.getItem('matrixLevelMilestones') || '[]');
                    if (!_claimed.includes(playerLevel)) {
                        _claimed.push(playerLevel);
                        localStorage.setItem('matrixLevelMilestones', JSON.stringify(_claimed));
                        const _bonus = playerLevel * 50;
                        balance += _bonus;
                        if (typeof saveBalance === 'function') saveBalance();
                        if (typeof updateBalance === 'function') updateBalance();
                        _openLevelMilestoneModal(playerLevel, _bonus, _MILESTONE_PERKS[playerLevel] || 'New Milestone');
                        levelledUp = false; // suppress generic toast when modal is shown
                    }
                } catch(e) {}
            }
            if (levelledUp) {
                // Award free spins on level up — scales slightly with level
                const freeSpinsCount = 5 + Math.floor((playerLevel - 1) / 5); // 5 base, +1 every 5 levels
                if (currentGame && !freeSpinsActive) {
                    // Slot is open and idle — start free spins immediately
                    triggerFreeSpins(currentGame, freeSpinsCount);
                    showToast(`🎉 Level Up! Level ${playerLevel}! ${freeSpinsCount} FREE SPINS!`, 'levelup');
                } else if (currentGame && freeSpinsActive) {
                    // Already in free spins — top them up
                    freeSpinsRemaining += freeSpinsCount;
                    updateFreeSpinsDisplay();
                    showToast(`🎉 Level Up! Level ${playerLevel}! +${freeSpinsCount} FREE SPINS added!`, 'levelup');
                } else {
                    // Not in a slot — award a small balance bonus instead
                    const bonus = Math.round(playerLevel * 5 * 100) / 100; // $5 × level
                    balance += bonus;
                    saveBalance();
                    updateBalance();
                    showToast(`🎉 Level Up! Level ${playerLevel}! +$${bonus.toFixed(2)} BONUS!`, 'levelup');
                }
            }
        }
        function _openLevelMilestoneModal(level, bonus, perk) {
            const modal = document.getElementById('levelMilestoneModal');
            if (!modal) return;
            const badge = document.getElementById('lmBadge');
            const title = document.getElementById('lmTitle');
            const perkEl = document.getElementById('lmPerk');
            const rewardEl = document.getElementById('lmRewardAmount');
            const btn = document.getElementById('lmClaimBtn');
            if (badge) badge.textContent = level;
            if (title) title.textContent = 'Level ' + level + ' Reached!';
            if (perkEl) perkEl.textContent = perk;
            if (rewardEl) rewardEl.textContent = '$0';
            modal.style.display = 'flex';
            // Animate reward counter
            if (rewardEl) {
                let current = 0;
                const step = Math.ceil(bonus / 40);
                const ticker = setInterval(function() {
                    current = Math.min(current + step, bonus);
                    rewardEl.textContent = '$' + current.toLocaleString();
                    if (current >= bonus) clearInterval(ticker);
                }, 25);
            }
            // Confetti burst
            if (typeof triggerConfetti === 'function') {
                triggerConfetti(80);
            } else if (typeof burstParticles === 'function') {
                burstParticles(80, window.innerWidth / 2, window.innerHeight / 2);
            }
            if (btn) {
                btn.onclick = function() {
                    modal.style.display = 'none';
                    showToast('🏆 Level ' + level + ' Milestone! +$' + bonus.toLocaleString() + ' credited!', 'levelup');
                };
            }
            modal.onclick = function(e) { if (e.target === modal) modal.style.display = 'none'; };
        }



        function updateXPDisplay() {
            const tier = getTier(playerLevel);
            const needed = getXPForLevel(playerLevel);
            const pct = Math.min(100, (playerXP / needed) * 100);

            const badge = document.getElementById('levelBadge');
            const tierLabel = document.getElementById('tierLabel');
            const fill = document.getElementById('xpBarFill');
            const text = document.getElementById('xpBarText');

            if (badge) {
                badge.textContent = playerLevel;
                badge.style.borderColor = tier.color;
            }
            if (tierLabel) {
                tierLabel.textContent = tier.name;
                tierLabel.style.color = tier.color;
            }
            if (fill) fill.style.width = pct + '%';
            if (text) text.textContent = `${playerXP} / ${needed} XP`;
        }


        // ===== Toast System =====
        function showToast(message, type = 'info') {
            const container = document.getElementById('toastContainer');
            if (!container) return;

            const toast = document.createElement('div');
            toast.className = `toast toast-${type}`;
            toast.textContent = message;
            container.appendChild(toast);

            setTimeout(() => {
                toast.classList.add('toast-exit');
                setTimeout(() => toast.remove(), 400);
            }, 3500);
        }


        function loadDailyBonus() {
            const saved = localStorage.getItem(DAILY_BONUS_KEY);
            if (saved) {
                try {
                    dailyBonusState = JSON.parse(saved);
                } catch { dailyBonusState = { streak: 0, lastClaim: null, claimedToday: false }; }
            }
            checkDailyBonusReset();
        }


        function saveDailyBonus() {
            localStorage.setItem(DAILY_BONUS_KEY, JSON.stringify(dailyBonusState));
        }


        function getTodayStr() {
            return new Date().toISOString().slice(0, 10);
        }


        function checkDailyBonusReset() {
            const today = getTodayStr();
            if (dailyBonusState.lastClaim === today) {
                dailyBonusState.claimedToday = true;
                return;
            }

            dailyBonusState.claimedToday = false;

            if (dailyBonusState.lastClaim) {
                const last = new Date(dailyBonusState.lastClaim);
                const now = new Date(today);
                const diffDays = Math.floor((now - last) / (1000 * 60 * 60 * 24));
                if (diffDays > 1) {
                    dailyBonusState.streak = 0;
                }
            }
        }


        function showDailyBonusModal() {
            checkDailyBonusReset();
            renderDailyCalendar();
            document.getElementById('dailyBonusModal').classList.add('active');
        }


        function closeDailyBonusModal() {
            document.getElementById('dailyBonusModal').classList.remove('active');
        }


        function renderDailyCalendar() {
            const cal = document.getElementById('dailyCalendar');
            const streakEl = document.getElementById('streakCount');
            const claimBtn = document.getElementById('dailyClaimBtn');
            if (!cal) return;

            streakEl.textContent = dailyBonusState.streak;
            claimBtn.disabled = dailyBonusState.claimedToday;
            claimBtn.textContent = dailyBonusState.claimedToday ? 'CLAIMED TODAY' : 'CLAIM BONUS';

            let html = '';
            for (let i = 0; i < 7; i++) {
                const reward = DAILY_REWARDS[i];
                const isClaimed = i < dailyBonusState.streak;
                const isToday = i === dailyBonusState.streak && !dailyBonusState.claimedToday;
                const isLocked = i > dailyBonusState.streak;
                const isTodayClaimed = i === dailyBonusState.streak - 1 && dailyBonusState.claimedToday;

                let cls = 'daily-day';
                if (isClaimed || isTodayClaimed) cls += ' day-claimed';
                else if (isToday) cls += ' day-today';
                else if (isLocked) cls += ' day-locked';

                html += `
                    <div class="${cls}">
                        <div class="day-number">DAY ${i + 1}</div>
                        <div class="day-reward">$${reward.amount.toLocaleString()}</div>
                        <div class="day-xp">+${reward.xp} XP</div>
                    </div>
                `;
            }
            cal.innerHTML = html;
        }


        function claimDailyBonus() {
            if (dailyBonusState.claimedToday) return;

            const dayIndex = Math.min(dailyBonusState.streak, DAILY_REWARDS.length - 1);
            const reward = DAILY_REWARDS[dayIndex];

            balance += reward.amount;
            updateBalance();
            awardXP(reward.xp);

            dailyBonusState.streak++;
            if (dailyBonusState.streak > 7) dailyBonusState.streak = 7;
            dailyBonusState.lastClaim = getTodayStr();
            dailyBonusState.claimedToday = true;
            saveDailyBonus();

            playSound('bigwin');
            showToast(`Daily Bonus: +$${reward.amount.toLocaleString()} and +${reward.xp} XP!`, 'win');
            createConfetti();

            renderDailyCalendar();

            setTimeout(() => closeDailyBonusModal(), 2000);
        }


        function loadWheelState() {
            const saved = localStorage.getItem(WHEEL_STORAGE_KEY);
            if (saved) {
                try { wheelState = JSON.parse(saved); } catch { wheelState = { lastSpin: null }; }
            }
        }


        function saveWheelState() {
            localStorage.setItem(WHEEL_STORAGE_KEY, JSON.stringify(wheelState));
        }


        function canSpinWheel() {
            if (!wheelState.lastSpin) return true;
            const last = new Date(wheelState.lastSpin);
            const now = new Date();
            const diffHours = (now - last) / (1000 * 60 * 60);
            return diffHours >= BONUS_WHEEL_COOLDOWN_HOURS;
        }


        function drawWheel(highlightIndex = -1) {
            const canvas = document.getElementById('wheelCanvas');
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            const cx = canvas.width / 2;
            const cy = canvas.height / 2;
            const r = cx - 4;
            const segAngle = (2 * Math.PI) / WHEEL_SEGMENTS.length;

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            WHEEL_SEGMENTS.forEach((seg, i) => {
                const startAngle = wheelAngle + i * segAngle;
                const endAngle = startAngle + segAngle;

                ctx.beginPath();
                ctx.moveTo(cx, cy);
                ctx.arc(cx, cy, r, startAngle, endAngle);
                ctx.closePath();
                ctx.fillStyle = i === highlightIndex ? '#fff' : seg.color;
                ctx.fill();
                ctx.strokeStyle = 'rgba(255,255,255,0.3)';
                ctx.lineWidth = 2;
                ctx.stroke();

                // Label
                ctx.save();
                ctx.translate(cx, cy);
                ctx.rotate(startAngle + segAngle / 2);
                ctx.textAlign = 'right';
                ctx.fillStyle = i === highlightIndex ? '#000' : '#fff';
                ctx.font = 'bold 14px sans-serif';
                ctx.fillText(seg.label, r - 12, 5);
                ctx.restore();
            });

            // Center circle
            ctx.beginPath();
            ctx.arc(cx, cy, 18, 0, 2 * Math.PI);
            ctx.fillStyle = '#1e293b';
            ctx.fill();
            ctx.strokeStyle = '#ffd700';
            ctx.lineWidth = 3;
            ctx.stroke();
        }


        function showBonusWheelModal() {
            loadWheelState();
            const spinBtn = document.getElementById('wheelSpinBtn');
            if (!canSpinWheel()) {
                spinBtn.disabled = true;
                spinBtn.textContent = 'NEXT SPIN IN A FEW HOURS';
            } else {
                spinBtn.disabled = false;
                spinBtn.textContent = 'SPIN THE WHEEL';
            }
            drawWheel();
            document.getElementById('bonusWheelModal').classList.add('active');
        }


        function closeBonusWheelModal() {
            document.getElementById('bonusWheelModal').classList.remove('active');
        }


        function spinBonusWheel() {
            if (wheelSpinning || !canSpinWheel()) return;
            wheelSpinning = true;

            const spinBtn = document.getElementById('wheelSpinBtn');
            spinBtn.disabled = true;
            spinBtn.textContent = 'SPINNING...';

            playSound('spin');

            const winIndex = Math.floor(Math.random() * WHEEL_SEGMENTS.length);
            const segAngle = (2 * Math.PI) / WHEEL_SEGMENTS.length;
            // We want the winning segment at the top (270deg / -PI/2)
            // The pointer is at top, reading from angle -PI/2
            const targetAngle = -(winIndex * segAngle + segAngle / 2) - Math.PI / 2;
            // Normalize to [0, 2π) so the final wheelAngle is exact.
            // Extra rotations MUST be whole integers — a fractional multiplier causes
            // totalRotation % 2π to land off-target, awarding the wrong segment.
            const targetNorm = ((targetAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
            const extraRotations = 5 + Math.floor(Math.random() * 4); // 5–8 whole rotations
            const totalRotation = targetNorm + Math.PI * 2 * extraRotations;

            const startAngle = wheelAngle;
            const duration = 4000;
            const startTime = performance.now();

            function animateWheel(now) {
                const elapsed = now - startTime;
                const t = Math.min(elapsed / duration, 1);
                // Ease out cubic
                const ease = 1 - Math.pow(1 - t, 3);
                wheelAngle = startAngle + (totalRotation - startAngle) * ease;

                drawWheel();

                if (t < 1) {
                    requestAnimationFrame(animateWheel);
                } else {
                    // Landed — use targetNorm directly to avoid float drift from modulo
                    wheelAngle = targetNorm;
                    const seg = WHEEL_SEGMENTS[winIndex];

                    if (seg.type === 'freespins') {
                        // Award free spins
                        const fsCount = seg.value;
                        if (currentGame && !freeSpinsActive) {
                            // Slot is open and idle — start free spins immediately
                            triggerFreeSpins(currentGame, fsCount);
                        } else if (currentGame && freeSpinsActive) {
                            // Already in free spins — top them up
                            freeSpinsRemaining += fsCount;
                            if (typeof updateFreeSpinsDisplay === 'function') updateFreeSpinsDisplay();
                        } else {
                            // Not in a slot — queue free spins; they will activate when the player opens a slot
                            freeSpinsActive = true;
                            freeSpinsRemaining = fsCount;
                            freeSpinsTotalWin = 0;
                            freeSpinsMultiplier = 1;
                        }
                        awardXP(seg.xp);
                        const gameLabel = (currentGame && currentGame.name) ? currentGame.name : 'your next slot';
                        showToast(`\uD83C\uDFB0 ${fsCount} Free Spins awarded on ${gameLabel}!`, 'win');
                    } else {
                        balance += seg.value;
                        updateBalance();
                        awardXP(seg.xp);
                        showToast(`\uD83C\uDF89 Bonus Wheel: +$${seg.value.toLocaleString()} and +${seg.xp} XP!`, 'win');
                    }

                    wheelState.lastSpin = new Date().toISOString();
                    saveWheelState();

                    playSound('bigwin');
                    createConfetti();

                    drawWheel(winIndex);

                    wheelSpinning = false;
                    spinBtn.textContent = 'NEXT SPIN IN A FEW HOURS';

                    setTimeout(() => closeBonusWheelModal(), 3000);
                }
            }

            requestAnimationFrame(animateWheel);
        }



        // ══════════════════════════════════════════════════════════
        // NOTIFICATION CENTER
        // ══════════════════════════════════════════════════════════

        const _NOTIF_KEY = typeof STORAGE_KEY_NOTIFICATIONS !== 'undefined'
            ? STORAGE_KEY_NOTIFICATIONS : 'matrixNotifications';
        const _NOTIF_MAX = 30;
        const _NOTIF_EXPIRE_MS = 7 * 24 * 3600 * 1000;

        function _loadNotifications() {
            try {
                const raw = localStorage.getItem(_NOTIF_KEY);
                if (!raw) return [];
                const all = JSON.parse(raw);
                const cutoff = Date.now() - _NOTIF_EXPIRE_MS;
                return all.filter(n => new Date(n.ts).getTime() > cutoff);
            } catch (e) { return []; }
        }

        function _saveNotifications(list) {
            try { localStorage.setItem(_NOTIF_KEY, JSON.stringify(list.slice(0, _NOTIF_MAX))); } catch (e) {}
        }

        function _updateNotifBadge() {
            const badge = document.getElementById('notifBadge');
            if (!badge) return;
            const unread = _loadNotifications().filter(n => !n.read).length;
            badge.textContent = unread;
            badge.style.display = unread > 0 ? '' : 'none';
        }

        window.addNotification = function(type, title, body) {
            const icons = { achievement: '🏆', tournament: '⚡', weekly: '📋', daily: '🎯', daily_bonus: '🎁', system: '📣' };
            const list = _loadNotifications();
            list.unshift({
                id:    Date.now() + Math.random(),
                type:  type,
                icon:  icons[type] || '📣',
                title: title,
                body:  body || '',
                ts:    new Date().toISOString(),
                read:  false,
            });
            _saveNotifications(list);
            _updateNotifBadge();
        };

        window.openNotificationPanel = function() {
            let panel = document.getElementById('notifPanel');
            if (!panel) {
                panel = document.createElement('div');
                panel.id = 'notifPanel';
                panel.className = 'notif-panel';
                panel.innerHTML = '<div class="notif-panel-header">'
                    + '<span class="notif-panel-title">Notifications</span>'
                    + '<button class="notif-mark-read" onclick="markAllNotificationsRead()">Mark all read</button>'
                    + '<button class="notif-panel-close" onclick="closeNotificationPanel()">✕</button>'
                    + '</div>'
                    + '<div class="notif-panel-list" id="notifPanelList"></div>';
                document.body.appendChild(panel);
            }
            _renderNotifPanel();
            panel.classList.add('active');
            // backdrop
            let bd = document.getElementById('notifBackdrop');
            if (!bd) {
                bd = document.createElement('div');
                bd.id = 'notifBackdrop';
                bd.className = 'notif-backdrop';
                bd.onclick = closeNotificationPanel;
                document.body.appendChild(bd);
            }
            bd.classList.add('active');
        };

        window.closeNotificationPanel = function() {
            const panel = document.getElementById('notifPanel');
            const bd    = document.getElementById('notifBackdrop');
            if (panel) panel.classList.remove('active');
            if (bd)    bd.classList.remove('active');
        };

        window.markAllNotificationsRead = function() {
            const list = _loadNotifications().map(n => ({ ...n, read: true }));
            _saveNotifications(list);
            _updateNotifBadge();
            _renderNotifPanel();
        };

        function _timeAgo(isoStr) {
            const diff = Date.now() - new Date(isoStr).getTime();
            const m = Math.floor(diff / 60000);
            if (m < 1)  return 'just now';
            if (m < 60) return m + 'm ago';
            const h = Math.floor(m / 60);
            if (h < 24) return h + 'h ago';
            return Math.floor(h / 24) + 'd ago';
        }

        function _renderNotifPanel() {
            const list = document.getElementById('notifPanelList');
            if (!list) return;
            const notifs = _loadNotifications();
            if (notifs.length === 0) {
                list.innerHTML = '<div class="notif-empty">No notifications yet</div>';
                return;
            }
            list.innerHTML = notifs.map(n =>
                '<div class="notif-item' + (n.read ? '' : ' notif-unread') + '">' +
                '<div class="notif-item-icon">' + n.icon + '</div>' +
                '<div class="notif-item-body">' +
                '<div class="notif-item-title">' + n.title + '</div>' +
                (n.body ? '<div class="notif-item-text">' + n.body + '</div>' : '') +
                '<div class="notif-item-time">' + _timeAgo(n.ts) + '</div>' +
                '</div>' +
                '</div>'
            ).join('');
        }

        // Patch showAchievementNotification to also persist in notification center
        const _origShowAchNotif = typeof showAchievementNotification === 'function' ? showAchievementNotification : null;
        // Override happens at call site: see below

        // Initialise badge on load
        document.addEventListener('DOMContentLoaded', function() {
            _updateNotifBadge();
        });
        // Also update now in case DOMContentLoaded already fired
        if (document.readyState !== 'loading') {
            setTimeout(_updateNotifBadge, 200);
        }

        // ── Login streak: check once on page load (toast fires even if stats modal is never opened)
        setTimeout(function() { _checkLoginStreak(); }, 800);


        // ═══════════════════════════════════════════════════════════════
        // DAILY SCRATCH CARD
        // ═══════════════════════════════════════════════════════════════

        const SCRATCH_STORAGE_KEY = 'matrix_scratch_card';
        const SCRATCH_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours
        const SCRATCH_PRIZES = [50, 100, 100, 250, 250, 500, 500, 1000, 2500];
        const SCRATCH_SYMBOLS = { 50: '🍋', 100: '🍊', 250: '🍇', 500: '💎', 1000: '⭐', 2500: '7️⃣' };

        function canPlayScratchCard() {
            try {
                var saved = JSON.parse(localStorage.getItem(SCRATCH_STORAGE_KEY) || '{}');
                if (!saved.lastPlay) return true;
                return (Date.now() - saved.lastPlay) >= SCRATCH_COOLDOWN_MS;
            } catch(e) { return true; }
        }

        function openScratchCard() {
            var modal = document.getElementById('scratchCardModal');
            if (!modal) return;

            if (!canPlayScratchCard()) {
                try {
                    var saved = JSON.parse(localStorage.getItem(SCRATCH_STORAGE_KEY) || '{}');
                    var msLeft = SCRATCH_COOLDOWN_MS - (Date.now() - saved.lastPlay);
                    var hoursLeft = Math.ceil(msLeft / 3600000);
                    showToast('Next scratch card in ' + hoursLeft + ' hour' + (hoursLeft !== 1 ? 's' : '') + '!', 'info');
                } catch(e) {}
                return;
            }

            // Shuffle helper
            function _shuffleArr(arr) {
                for (var i = arr.length - 1; i > 0; i--) {
                    var j = Math.floor(Math.random() * (i + 1));
                    var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
                }
                return arr;
            }

            // Generate 9-cell grid
            var cells = [];
            var prizes = SCRATCH_PRIZES.slice();
            _shuffleArr(prizes);

            // ~30% chance of a forced win (3 matching cells)
            var forceWin = Math.random() < 0.30;
            if (forceWin) {
                var winPrize = [100, 250, 250, 500][Math.floor(Math.random() * 4)];
                var positions = _shuffleArr([0, 1, 2, 3, 4, 5, 6, 7, 8]);
                var winPositions = [positions[0], positions[1], positions[2]];
                for (var ci = 0; ci < 9; ci++) {
                    cells[ci] = winPositions.indexOf(ci) >= 0 ? winPrize : prizes[ci % prizes.length];
                }
            } else {
                for (var ni = 0; ni < 9; ni++) { cells[ni] = prizes[ni % prizes.length]; }
                // Ensure no accidental triple
                var counts = {};
                cells.forEach(function(v) { counts[v] = (counts[v] || 0) + 1; });
                Object.keys(counts).forEach(function(v) {
                    if (counts[v] >= 3) {
                        var replacement = SCRATCH_PRIZES.find(function(p) { return p !== Number(v); });
                        for (var ri = 8; ri >= 0; ri--) {
                            if (cells[ri] === Number(v)) { cells[ri] = replacement; break; }
                        }
                    }
                });
            }

            // Build modal content
            var gridHtml = cells.map(function(prize, idx) {
                var sym = SCRATCH_SYMBOLS[prize] || '🎰';
                return '<div class="scratch-cell" data-prize="' + prize + '" data-idx="' + idx + '">'
                     + '<div class="scratch-cover">🎰</div>'
                     + '<div class="scratch-reveal">' + sym + '<br><span class="scratch-amount">$' + prize + '</span></div>'
                     + '</div>';
            }).join('');

            var content = modal.querySelector('.scratch-content');
            if (content) {
                content.innerHTML = '<p class="scratch-instruction">Click to reveal! Match 3 to win!</p>'
                    + '<div class="scratch-grid">' + gridHtml + '</div>'
                    + '<div id="scratchResult" class="scratch-result"></div>';

                var revealed = [];
                content.querySelectorAll('.scratch-cell').forEach(function(cell) {
                    cell.addEventListener('click', function() {
                        if (cell.classList.contains('scratched')) return;
                        cell.classList.add('scratched');
                        revealed.push(parseInt(cell.getAttribute('data-prize')));

                        if (revealed.length === 9) {
                            // All revealed — check for a triple match
                            var counts2 = {};
                            revealed.forEach(function(v) { counts2[v] = (counts2[v] || 0) + 1; });
                            var winValue = null;
                            Object.keys(counts2).forEach(function(v) {
                                if (counts2[v] >= 3) winValue = Number(v);
                            });

                            var prize = winValue || 50; // consolation $50
                            var resultEl = document.getElementById('scratchResult');
                            if (winValue) {
                                if (resultEl) resultEl.innerHTML = '<span class="scratch-win">🎉 You matched 3! Won <strong>$' + winValue + '</strong>!</span>';
                                showToast('🎰 Scratch card: Won $' + winValue + '!', 'success');
                            } else {
                                if (resultEl) resultEl.innerHTML = '<span class="scratch-consolation">No match — consolation prize: <strong>$50</strong></span>';
                                showToast('Scratch card: Consolation $50', 'info');
                            }

                            // Credit prize
                            balance += prize;
                            updateBalance();
                            if (typeof saveBalance === 'function') saveBalance();
                            awardXP(10);

                            // Save cooldown
                            try {
                                localStorage.setItem(SCRATCH_STORAGE_KEY, JSON.stringify({ lastPlay: Date.now(), lastPrize: prize }));
                            } catch(e) {}
                        }
                    });
                });
            }

            modal.classList.add('active');
            modal.onclick = function(e) { if (e.target === modal) modal.classList.remove('active'); };
        }

        // ── XP Shop ──────────────────────────────────────────────
        const XP_SHOP_ITEMS = [
            { id: 'free_spins_5', label: '5 Free Spins', desc: 'Free spins on current game', cost: 100, icon: '🎰', type: 'freespins', value: 5 },
            { id: 'balance_500',  label: '$500 Boost',    desc: 'Instant balance credit',     cost: 250, icon: '💰', type: 'balance',   value: 500 },
            { id: 'xp_boost',     label: '2× XP Boost',   desc: 'Double XP for 50 spins',     cost: 500, icon: '⚡', type: 'xpboost',   value: 50 },
            { id: 'balance_2000', label: '$2,000 Boost',   desc: 'Big balance injection',      cost: 1000,icon: '💎', type: 'balance',   value: 2000 },
        ];

        function openXpShop() {
            var modal = document.getElementById('xpShopModal');
            if (!modal) return;
            _renderXpShopGrid();
            modal.style.display = 'flex';
            modal.onclick = function(e) { if (e.target === modal) modal.style.display = 'none'; };
        }

        function _renderXpShopGrid() {
            var grid = document.getElementById('xpsGrid');
            var xpEl = document.getElementById('xpsCurrentXP');
            var boostEl = document.getElementById('xpsBoostStatus');
            if (!grid) return;
            if (xpEl) xpEl.textContent = playerXP;

            // Show boost status
            try {
                var boost = JSON.parse(localStorage.getItem('matrixXpBoost') || 'null');
                if (boost && boost.remaining > 0 && boostEl) {
                    boostEl.style.display = 'block';
                    boostEl.textContent = '⚡ 2× XP Boost active — ' + boost.remaining + ' spins remaining';
                } else if (boostEl) {
                    boostEl.style.display = 'none';
                }
            } catch(e) {}

            grid.innerHTML = XP_SHOP_ITEMS.map(function(item) {
                var canBuy = playerXP >= item.cost;
                return '<div class="xps-item' + (canBuy ? '' : ' xps-locked') + '">'
                    + '<div class="xps-icon">' + item.icon + '</div>'
                    + '<div class="xps-label">' + item.label + '</div>'
                    + '<div class="xps-desc">' + item.desc + '</div>'
                    + '<button class="xps-buy-btn' + (canBuy ? '' : ' disabled') + '" '
                    + (canBuy ? 'onclick="buyXpShopItem(\'' + item.id + '\')"' : 'disabled')
                    + '>' + item.cost + ' XP</button>'
                    + '</div>';
            }).join('');
        }

        window.buyXpShopItem = function(itemId) {
            var item = XP_SHOP_ITEMS.find(function(i) { return i.id === itemId; });
            if (!item) return;
            if (playerXP < item.cost) {
                showToast('Not enough XP! Need ' + item.cost + ' XP.', 'error');
                return;
            }
            // Deduct XP
            playerXP -= item.cost;
            saveXP();
            updateXPDisplay();

            if (item.type === 'balance') {
                balance += item.value;
                if (typeof saveBalance === 'function') saveBalance();
                if (typeof updateBalance === 'function') updateBalance();
                showToast('💰 +$' + item.value.toLocaleString() + ' credited to your balance!', 'success');
            } else if (item.type === 'freespins') {
                if (typeof currentGame !== 'undefined' && currentGame && typeof triggerFreeSpins === 'function') {
                    triggerFreeSpins(currentGame, item.value);
                    showToast('🎰 ' + item.value + ' Free Spins on ' + (currentGame.name || 'current game') + '!', 'success');
                } else {
                    // Not in a slot — give balance equivalent instead ($50 per spin)
                    var equiv = item.value * 50;
                    balance += equiv;
                    if (typeof saveBalance === 'function') saveBalance();
                    if (typeof updateBalance === 'function') updateBalance();
                    showToast('🎰 No slot open — +$' + equiv + ' credited instead!', 'success');
                }
            } else if (item.type === 'xpboost') {
                try {
                    var existing = JSON.parse(localStorage.getItem('matrixXpBoost') || 'null');
                    var remaining = (existing && existing.remaining > 0) ? existing.remaining + item.value : item.value;
                    localStorage.setItem('matrixXpBoost', JSON.stringify({ remaining: remaining }));
                } catch(e) {}
                showToast('⚡ 2× XP Boost activated for ' + item.value + ' spins!', 'success');
            }

            _renderXpShopGrid();
            if (typeof window.refreshLobbyChallengeWidget === 'function') window.refreshLobbyChallengeWidget();
        };

        window.openXpShop = openXpShop;

        // ── Mystery Box ──────────────────────────────────────────
        const MB_COOLDOWN_MS = 4 * 60 * 60 * 1000; // 4 hours
        const MB_STORAGE_KEY = 'matrixMysteryBox';
        const MB_TIERS = [
            { tier: 'Common',    color: '#6b7280', weight: 60, minPrize: 50,   maxPrize: 100 },
            { tier: 'Uncommon',  color: '#22c55e', weight: 25, minPrize: 150,  maxPrize: 300 },
            { tier: 'Rare',      color: '#a855f7', weight: 10, minPrize: 500,  maxPrize: 1000 },
            { tier: 'Legendary', color: '#f59e0b', weight: 5,  minPrize: 2000, maxPrize: 2000, freeSpins: 10 },
        ];

        function _getMysteryBoxState() {
            try {
                var raw = localStorage.getItem(MB_STORAGE_KEY);
                return raw ? JSON.parse(raw) : { lastOpen: 0 };
            } catch(e) { return { lastOpen: 0 }; }
        }

        function _mysteryBoxReady() {
            var s = _getMysteryBoxState();
            return (Date.now() - s.lastOpen) >= MB_COOLDOWN_MS;
        }

        function _rollMysteryTier() {
            var roll = Math.random() * 100;
            var cumulative = 0;
            for (var i = 0; i < MB_TIERS.length; i++) {
                cumulative += MB_TIERS[i].weight;
                if (roll < cumulative) return MB_TIERS[i];
            }
            return MB_TIERS[0];
        }

        function openMysteryBox() {
            var modal = document.getElementById('mysteryBoxModal');
            if (!modal) return;

            var boxEl = document.getElementById('mbBox');
            var titleEl = document.getElementById('mbTitle');
            var subtitleEl = document.getElementById('mbSubtitle');
            var prizeEl = document.getElementById('mbPrize');
            var openBtn = document.getElementById('mbOpenBtn');
            var closeBtn = document.getElementById('mbCloseBtn');
            var boxWrap = document.getElementById('mbBoxWrap');

            // Check cooldown
            if (!_mysteryBoxReady()) {
                var s = _getMysteryBoxState();
                var msLeft = MB_COOLDOWN_MS - (Date.now() - s.lastOpen);
                var hLeft = Math.floor(msLeft / 3600000);
                var mLeft = Math.floor((msLeft % 3600000) / 60000);
                if (titleEl) titleEl.textContent = 'Mystery Box';
                if (subtitleEl) subtitleEl.textContent = 'Next box in ' + hLeft + 'h ' + mLeft + 'm';
                if (boxEl) { boxEl.textContent = '🔒'; boxEl.className = 'mb-box mb-locked'; }
                if (openBtn) openBtn.style.display = 'none';
                if (closeBtn) { closeBtn.style.display = 'inline-block'; closeBtn.textContent = 'Close'; }
                if (prizeEl) prizeEl.style.display = 'none';
                modal.style.display = 'flex';
                modal.onclick = function(e) { if (e.target === modal) modal.style.display = 'none'; };
                return;
            }

            // Reset UI
            if (boxEl) { boxEl.textContent = '🎁'; boxEl.className = 'mb-box'; }
            if (titleEl) titleEl.textContent = 'Mystery Box';
            if (subtitleEl) subtitleEl.textContent = 'Tap the box to reveal your prize!';
            if (prizeEl) prizeEl.style.display = 'none';
            if (openBtn) openBtn.style.display = 'inline-block';
            if (closeBtn) closeBtn.style.display = 'none';

            modal.style.display = 'flex';
            modal.onclick = function(e) { if (e.target === modal && closeBtn && closeBtn.style.display !== 'none') modal.style.display = 'none'; };

            if (openBtn) {
                openBtn.onclick = function() {
                    openBtn.style.display = 'none';

                    // Animate box
                    if (boxEl) boxEl.classList.add('mb-shaking');

                    setTimeout(function() {
                        if (boxEl) boxEl.classList.remove('mb-shaking');

                        // Roll prize
                        var tier = _rollMysteryTier();
                        var prize = tier.minPrize + Math.floor(Math.random() * (tier.maxPrize - tier.minPrize + 1));
                        var hasFS = tier.freeSpins || 0;

                        // Open animation
                        if (boxEl) {
                            boxEl.textContent = '✨';
                            boxEl.className = 'mb-box mb-opened';
                            boxEl.style.color = tier.color;
                        }
                        if (titleEl) titleEl.textContent = tier.tier + '!';
                        if (titleEl) titleEl.style.color = tier.color;
                        if (subtitleEl) subtitleEl.textContent = '';

                        var prizeText = '$' + prize.toLocaleString();
                        if (hasFS) prizeText += ' + ' + hasFS + ' Free Spins';

                        if (prizeEl) {
                            prizeEl.style.display = 'block';
                            prizeEl.innerHTML = '<div class="mb-prize-amount" style="color:' + tier.color + '">' + prizeText + '</div>';
                        }

                        // Credit rewards
                        balance += prize;
                        if (typeof saveBalance === 'function') saveBalance();
                        if (typeof updateBalance === 'function') updateBalance();

                        if (hasFS && typeof currentGame !== 'undefined' && currentGame && typeof triggerFreeSpins === 'function') {
                            triggerFreeSpins(currentGame, hasFS);
                        } else if (hasFS) {
                            balance += hasFS * 50;
                            if (typeof saveBalance === 'function') saveBalance();
                            if (typeof updateBalance === 'function') updateBalance();
                        }

                        awardXP(25);

                        // Save cooldown
                        localStorage.setItem(MB_STORAGE_KEY, JSON.stringify({ lastOpen: Date.now() }));

                        // Confetti for Rare+
                        if (tier.weight <= 10) {
                            if (typeof triggerConfetti === 'function') triggerConfetti(60);
                            else if (typeof burstParticles === 'function') burstParticles(60, window.innerWidth / 2, window.innerHeight / 2);
                        }

                        showToast('🎁 Mystery Box: ' + tier.tier + ' — ' + prizeText + '!', 'success');

                        if (closeBtn) { closeBtn.style.display = 'inline-block'; closeBtn.textContent = 'Collect & Close'; }
                    }, 1200); // shake duration
                };
            }
        }

        // Update mystery box button cooldown indicator
        function _updateMysteryBoxBtn() {
            var btn = document.getElementById('mysteryBoxBtn');
            if (!btn) return;
            if (_mysteryBoxReady()) {
                btn.classList.add('mb-ready');
                btn.classList.remove('mb-cooldown');
            } else {
                btn.classList.remove('mb-ready');
                btn.classList.add('mb-cooldown');
            }
        }
        setInterval(_updateMysteryBoxBtn, 30000);
        setTimeout(_updateMysteryBoxBtn, 1000);

        window.openMysteryBox = openMysteryBox;
