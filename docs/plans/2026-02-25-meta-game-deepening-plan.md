# Meta-Game Deepening — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enrich the daily engagement loop — 8 diverse daily challenges, 24 achievements (including bonus-type-specific), cross-session Hall of Fame best-wins panel, and a mechanic-type lobby filter.

**Architecture:** All changes are additive. `constants.js` gains one key. `win-logic.js`/`ui-slot.js` expand the `onChallengeEvent` call payload with `winMult`, `bonusTriggered`, and `streak`. `ui-modals.js` gains expanded challenge/achievement arrays plus Hall of Fame logic. `ui-lobby.js` gains a bonus-mechanic filter. `index.html`/`styles.css` add required HTML + CSS last (sequential to avoid contention).

**Tech Stack:** Vanilla JS (global scope, no modules), localStorage, CSS custom properties

---

## Parallel Task Groups

**Group A (parallel — no shared files):**
- Task 1 → `constants.js`
- Task 2 → `js/win-logic.js` + `js/ui-slot.js`
- Task 3 → `js/ui-modals.js`
- Task 4 → `js/ui-lobby.js`

**Group B (sequential after Group A):**
- Task 5 → `index.html` + `styles.css`

**Group C (after all tasks):**
- Task 6 → QA + commit

---

### Task 1: Add Hall of Fame storage key to constants.js

**Files:**
- Modify: `constants.js` (after line containing `STORAGE_KEY_VIP`)

**Step 1: Add constant after existing VIP key**

Find the line:
```js
const STORAGE_KEY_VIP = 'casinoVIP';
```

Add immediately after it:
```js

/** @type {string} localStorage key for cross-session Hall of Fame best wins */
const STORAGE_KEY_HALL_OF_FAME = 'matrixHallOfFame';
```

**Step 2: Verify no syntax errors**

```bash
node -e "require('./constants.js')" 2>/dev/null || node -e "const fs=require('fs');const c=fs.readFileSync('constants.js','utf8');eval(c);console.log('OK',typeof STORAGE_KEY_HALL_OF_FAME)"
```

Expected: `OK string`

---

### Task 2: Expand onChallengeEvent payload (win-logic.js + ui-slot.js)

**Files:**
- Modify: `js/ui-slot.js` line ~1892

**Context:** The current call is:
```js
if (typeof onChallengeEvent === 'function') onChallengeEvent('spin', { bet: currentBet, win: winAmount, gameId: currentGame ? currentGame.id : null });
```

**Step 1: Replace that one line** with an expanded payload that includes winMult, streak, and wager tracking.

Find (exact match):
```js
            if (typeof onChallengeEvent === 'function') onChallengeEvent('spin', { bet: currentBet, win: winAmount, gameId: currentGame ? currentGame.id : null });
```

Replace with:
```js
            if (typeof onChallengeEvent === 'function') {
                const _challengeMult = currentBet > 0 ? winAmount / currentBet : 0;
                onChallengeEvent('spin', {
                    bet: currentBet,
                    win: winAmount,
                    gameId: currentGame ? currentGame.id : null,
                    winMult: _challengeMult,
                    bonusTriggered: false,   // updated to true by bonus engines below when they fire
                    streak: typeof _winStreak === 'number' ? _winStreak : 0
                });
            }
```

**Step 2: Also fire bonusTriggered=true when scatter triggers free spins**

In `js/win-logic.js`, the scatter bonus triggers are dispatched. We need to fire a separate challenge event when a bonus triggers. Find the line in `js/win-logic.js` that contains:
```js
triggerHoldAndWin(game, scatterCells, currentBet);
```

Add immediately after it:
```js
                if (typeof onChallengeEvent === 'function') onChallengeEvent('bonus', { gameId: game ? game.id : null });
```

Similarly, find:
```js
                triggerChamberSpins(game);
```
Add after:
```js
                    if (typeof onChallengeEvent === 'function') onChallengeEvent('bonus', { gameId: game ? game.id : null });
```

Find the generic free spins trigger block — search for:
```js
                playSound('freespin');
```
that appears in a `else if (scatterCount >= scatterThreshold && !freeSpinsActive && game.freeSpinsCount > 0)` context. After the `triggerFreeSpins` call in that block add:
```js
                if (typeof onChallengeEvent === 'function') onChallengeEvent('bonus', { gameId: game ? game.id : null });
```

**Step 3: Handle 'bonus' event type in onChallengeEvent (done in Task 3)**

**Step 4: Verify no syntax errors by searching for balanced braces**

```bash
node -e "const fs=require('fs');const s=fs.readFileSync('js/ui-slot.js','utf8');console.log('Lines:',s.split('\n').length,'OK')"
```

---

### Task 3: Expand challenges, achievements, and add Hall of Fame (ui-modals.js)

**Files:**
- Modify: `js/ui-modals.js`

**Step 1: Replace DAILY_CHALLENGES array**

Find (exact match):
```js
        const DAILY_CHALLENGES = [
            { id: 'spins_20',    label: 'Spin It Up',  desc: 'Complete 20 spins today',      target: 20, xp: 50, icon: '🎰' },
            { id: 'games_3',     label: 'Game Hopper', desc: 'Play 3 different games today', target: 3,  xp: 75, icon: '🎮' },
            { id: 'win_once',    label: 'Lucky Break', desc: 'Win at least once today',      target: 1,  xp: 40, icon: '🍀' },
        ];
```

Replace with:
```js
        const DAILY_CHALLENGES = [
            { id: 'spins_20',   label: 'Spin It Up',    desc: 'Complete 20 spins today',              target: 20,  xp: 50,  icon: '🎰', type: 'spins'   },
            { id: 'spins_50',   label: 'Spin Machine',  desc: 'Complete 50 spins today',              target: 50,  xp: 100, icon: '⚡', type: 'spins'   },
            { id: 'games_3',    label: 'Game Hopper',   desc: 'Play 3 different games today',         target: 3,   xp: 75,  icon: '🎮', type: 'games'   },
            { id: 'win_once',   label: 'Lucky Break',   desc: 'Win at least once today',              target: 1,   xp: 40,  icon: '🍀', type: 'wins'    },
            { id: 'big_win_50', label: 'High Roller',   desc: 'Land a win worth 50× your bet',        target: 50,  xp: 150, icon: '💥', type: 'winMult' },
            { id: 'bonus_1',    label: 'Bonus Hunter',  desc: 'Trigger a bonus or free spins round',  target: 1,   xp: 125, icon: '🎁', type: 'bonuses' },
            { id: 'wager_500',  label: 'Whale Watch',   desc: 'Wager $500 total today',               target: 500, xp: 100, icon: '🐋', type: 'wager'   },
            { id: 'streak_3',   label: 'Hot Streak',    desc: 'Win 3 spins in a row',                 target: 3,   xp: 120, icon: '🔥', type: 'streak'  },
        ];
```

**Step 2: Update _loadChallengeState to track new counters**

The existing `_loadChallengeState` returns `{ date, progress, completed }`. No change needed — `progress` is a free-form map.

**Step 3: Update the `onChallengeEvent` function to handle new types**

Find:
```js
        window.onChallengeEvent = function(eventType, payload) {
            const state = _loadChallengeState();
            let changed = false;

            if (eventType === 'spin') {
                state.progress['spins_20'] = (state.progress['spins_20'] || 0) + 1;
                if (payload.gameId) {
                    if (!state.gamesPlayedToday) state.gamesPlayedToday = [];
                    if (!state.gamesPlayedToday.includes(payload.gameId)) {
                        state.gamesPlayedToday.push(payload.gameId);
                    }
                    state.progress['games_3'] = state.gamesPlayedToday.length;
                }
                if (payload.win && payload.win > 0) {
                    state.progress['win_once'] = Math.max(state.progress['win_once'] || 0, 1);
                }
                changed = true;
            }
```

Replace just the inner `if (eventType === 'spin')` block (keep the boilerplate around it) — replace from `if (eventType === 'spin') {` to the closing `}` of that block (before `if (changed) {`):

```js
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
```

**Step 4: Replace ACH_DEFS array**

Find (from `const ACH_DEFS = [` to the closing `];`):
```js
        const ACH_DEFS = [
            { id: 'first_spin',   icon: '🎰', name: 'First Spin',      desc: 'Play your first spin',            req: { type: 'spins',   target: 1    } },
            { id: 'spin_10',      icon: '🔄', name: 'Getting Started', desc: 'Complete 10 spins',                req: { type: 'spins',   target: 10   } },
            { id: 'spin_100',     icon: '💫', name: 'Spin Master',     desc: 'Complete 100 spins',               req: { type: 'spins',   target: 100  } },
            { id: 'spin_500',     icon: '⚡', name: 'High Roller',     desc: 'Complete 500 spins',               req: { type: 'spins',   target: 500  } },
            { id: 'first_win',    icon: '🏆', name: 'First Win',       desc: 'Win your first spin',              req: { type: 'wins',    target: 1    } },
            { id: 'win_10',       icon: '💰', name: 'On a Roll',       desc: 'Win 10 times',                     req: { type: 'wins',    target: 10   } },
            { id: 'win_50',       icon: '🤑', name: 'Lucky Streak',    desc: 'Win 50 times',                     req: { type: 'wins',    target: 50   } },
            { id: 'big_win',      icon: '💥', name: 'Big Winner',      desc: 'Win over 100× your bet',           req: { type: 'bigWin',  target: 100  } },
            { id: 'mega_win',     icon: '🌟', name: 'Mega Winner',     desc: 'Win over 500× your bet',           req: { type: 'bigWin',  target: 500  } },
            { id: 'games_5',      icon: '🎮', name: 'Explorer',        desc: 'Try 5 different games',            req: { type: 'games',   target: 5    } },
            { id: 'games_20',     icon: '🗺️', name: 'Adventurer',     desc: 'Try 20 different games',           req: { type: 'games',   target: 20   } },
            { id: 'balance_500',  icon: '💎', name: 'High Balance',    desc: 'Reach a balance of $500',          req: { type: 'balance', target: 500  } },
        ];
```

Replace with:
```js
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
            { id: 'big_win',       icon: '💥', name: 'Big Winner',       desc: 'Win over 100× your bet',             req: { type: 'bigWin',  target: 100    } },
            { id: 'mega_win',      icon: '🌟', name: 'Mega Winner',      desc: 'Win over 500× your bet',             req: { type: 'bigWin',  target: 500    } },
            { id: 'epic_win',      icon: '🔥', name: 'Epic Winner',      desc: 'Win over 1,000× your bet',           req: { type: 'bigWin',  target: 1000   } },
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
```

**Step 5: Update `_loadAchState` to track new fields**

Find:
```js
            return {
                spins: d.spins || 0, wins: d.wins || 0,
                games: Array.isArray(d.games) ? d.games : [],
                maxWinMult: d.maxWinMult || 0, maxBalance: d.maxBalance || 0,
                unlocked: Array.isArray(d.unlocked) ? d.unlocked : [],
            };
```

Replace with:
```js
            return {
                spins: d.spins || 0, wins: d.wins || 0,
                games: Array.isArray(d.games) ? d.games : [],
                maxWinMult: d.maxWinMult || 0, maxBalance: d.maxBalance || 0,
                totalWagered: d.totalWagered || 0,
                bonusesTriggered: d.bonusesTriggered || 0,
                maxStreak: d.maxStreak || 0,
                unlocked: Array.isArray(d.unlocked) ? d.unlocked : [],
            };
```

**Step 6: Update `_checkAchievements` to handle new achievement types**

Find the entire `function _checkAchievements(eventType, payload) {` function body and replace it:

```js
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
                    (r.type === 'spins'   && s.spins >= r.target)                      ||
                    (r.type === 'wins'    && s.wins  >= r.target)                      ||
                    (r.type === 'bigWin'  && s.maxWinMult >= r.target)                 ||
                    (r.type === 'games'   && s.games.length >= r.target)               ||
                    (r.type === 'balance' && s.maxBalance >= r.target)                 ||
                    (r.type === 'wager'   && (s.totalWagered||0) >= r.target)          ||
                    (r.type === 'bonuses' && (s.bonusesTriggered||0) >= r.target)      ||
                    (r.type === 'streak'  && (s.maxStreak||0) >= r.target);
                if (unlocked) { s.unlocked.push(ach.id); newUnlocks.push(ach); changed = true; }
            }
            if (changed) _saveAchState(s);
            newUnlocks.forEach(_showAchUnlockToast);
        }
```

**Step 7: Add Hall of Fame functions**

After the `_showAchUnlockToast` function (after its closing `}`), add:

```js

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
            if (mult < 5) return; // only record meaningful wins (≥5× bet)
            const list = _loadHoF();
            list.push({
                amount: winAmount,
                mult: parseFloat(mult.toFixed(1)),
                game: gameName || 'Unknown',
                gameId: gameId || '',
                bonusType: bonusType || '',
                date: new Date().toLocaleDateString('en-AU', { day:'numeric', month:'short', year:'2-digit' })
            });
            // Keep top HOF_MAX entries by multiplier
            list.sort((a, b) => b.mult - a.mult);
            if (list.length > HOF_MAX) list.length = HOF_MAX;
            _saveHoF(list);
        };

        function _renderHoFPanel(container) {
            const list = _loadHoF();
            if (list.length === 0) {
                container.innerHTML = '<div style="color:rgba(255,255,255,0.4);font-size:12px;text-align:center;padding:12px 0">No big wins yet — spin to make history!</div>';
                return;
            }
            const medals = ['🥇','🥈','🥉'];
            container.innerHTML = list.map((e, i) => `
                <div class="hof-row">
                    <span class="hof-rank">${medals[i] || (i+1)}</span>
                    <span class="hof-game">${e.game}</span>
                    <span class="hof-mult">${e.mult}×</span>
                    <span class="hof-amount">$${Number(e.amount).toLocaleString('en-AU',{minimumFractionDigits:2,maximumFractionDigits:2})}</span>
                    <span class="hof-date">${e.date}</span>
                </div>`).join('');
        }

        function _ensureHoFPanel() {
            if (document.getElementById('hofPanel')) return;
            const statsContent = document.getElementById('statsContent');
            if (!statsContent) return;
            const wrap = document.createElement('div');
            wrap.id = 'hofPanel';
            wrap.style.cssText = 'margin-top:16px';
            wrap.innerHTML = `
                <div class="hof-header" id="hofToggle" role="button" tabindex="0" style="cursor:pointer;display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:rgba(255,215,0,0.08);border:1px solid rgba(255,215,0,0.25);border-radius:8px;margin-bottom:0">
                    <span style="font-size:13px;font-weight:700;color:#ffd700">🏆 Hall of Fame</span>
                    <span id="hofChevron" style="color:rgba(255,255,255,0.4);font-size:12px">▼</span>
                </div>
                <div id="hofBody" style="border:1px solid rgba(255,215,0,0.15);border-top:none;border-radius:0 0 8px 8px;padding:8px 12px;background:rgba(0,0,0,0.3)">
                    <div id="hofList"></div>
                </div>`;
            statsContent.appendChild(wrap);
            _renderHoFPanel(document.getElementById('hofList'));

            let collapsed = false;
            const body = document.getElementById('hofBody');
            const chev = document.getElementById('hofChevron');
            document.getElementById('hofToggle').addEventListener('click', () => {
                collapsed = !collapsed;
                body.style.display = collapsed ? 'none' : '';
                chev.textContent = collapsed ? '▶' : '▼';
            });
        }
```

**Step 8: Inject `_ensureHoFPanel()` call inside `openStatsModal`**

Find where `_ensureDailyChallengesPanel()` is called (around line 640) and add `_ensureHoFPanel();` immediately after it:

```js
            _ensureHoFPanel();
```

**Step 9: Verify line count (sanity check)**

```bash
node -e "const fs=require('fs');const s=fs.readFileSync('js/ui-modals.js','utf8');console.log('Lines:',s.split('\n').length)"
```

---

### Task 4: Add mechanics filter + volatility sort to lobby (ui-lobby.js)

**Files:**
- Modify: `js/ui-lobby.js`

**Step 1: Add a `currentMechanicFilter` state variable**

At the top of `ui-lobby.js`, after the existing `let lobbySearchQuery = '';` line, add:

```js
        let currentMechanicFilter = 'all'; // 'all' | 'tumble' | 'hold_win' | 'free_spins' | 'wilds' | 'jackpot'
        let currentSortMode = 'default';    // 'default' | 'vol_asc' | 'vol_desc'
```

**Step 2: Add mechanic category mapping helper**

After the `createSkeletonCards` function, add:

```js
        function _getMechanicCategory(game) {
            const bt = game.bonusType || '';
            if (bt === 'tumble' || bt === 'avalanche' || bt === 'cascading') return 'tumble';
            if (bt === 'hold_and_win' || bt === 'coin_respin') return 'hold_win';
            if (bt === 'random_jackpot' || game.tag === 'JACKPOT' || game.tag === 'MEGA') return 'jackpot';
            if (bt.includes('wild')) return 'wilds';
            if (game.freeSpinsCount > 0 || bt.includes('free') || bt.includes('spin') || bt.includes('chamber') || bt.includes('sticky') || bt.includes('walking')) return 'free_spins';
            return 'other';
        }

        function _getVolatility(game) {
            const maxMult = game.payouts && game.minBet > 0
                ? Math.max(...Object.values(game.payouts).filter(v => typeof v === 'number')) / game.minBet
                : 0;
            if (maxMult >= 300) return 3;
            if (maxMult >= 100) return 2;
            return 1;
        }
```

**Step 3: Update `getFilteredGames` to apply mechanic filter and sort**

Find the end of `getFilteredGames`, just before `return list;`:

```js
            return list;
        }
```

Replace with:
```js
            // Apply mechanic filter
            if (currentMechanicFilter !== 'all') {
                list = list.filter(g => _getMechanicCategory(g) === currentMechanicFilter);
            }
            // Apply sort
            if (currentSortMode === 'vol_asc') {
                list = [...list].sort((a, b) => _getVolatility(a) - _getVolatility(b));
            } else if (currentSortMode === 'vol_desc') {
                list = [...list].sort((a, b) => _getVolatility(b) - _getVolatility(a));
            }
            return list;
        }
```

**Step 4: Export mechanic filter and sort setter functions**

After the `setProviderFilter` function, add:

```js
        function setMechanicFilter(mech) {
            currentMechanicFilter = mech;
            document.querySelectorAll('.mechanic-chip').forEach(c => {
                c.classList.toggle('mechanic-chip-active', c.dataset.mech === mech);
            });
            renderFilteredGames();
        }

        function setSortMode(mode) {
            currentSortMode = mode;
            document.querySelectorAll('.sort-btn').forEach(b => {
                b.classList.toggle('sort-btn-active', b.dataset.sort === mode);
            });
            renderFilteredGames();
        }
```

**Step 5: Inject the mechanic filter bar into the DOM**

In `renderGames`, there's a block that inserts the `leaderboard-section` and other panels. Find the line:

```js
            const filterTabs = document.getElementById('filterTabs');
```

(the FIRST occurrence — around line 92). Before that `if (filterTabs)` block, add code to inject the mechanic filter bar. Find an appropriate injection site — the `renderGames` function body. After the leaderboard init block (look for the comment about leaderboard), add:

```js
                // ── Mechanic filter bar ──
                if (!document.getElementById('mechanicFilterBar')) {
                    const bar = document.createElement('div');
                    bar.id = 'mechanicFilterBar';
                    bar.className = 'mechanic-filter-bar';
                    const mechs = [
                        { id: 'all',        label: 'All Mechanics' },
                        { id: 'tumble',     label: '🌊 Tumble' },
                        { id: 'hold_win',   label: '🎯 Hold & Win' },
                        { id: 'free_spins', label: '🎁 Free Spins' },
                        { id: 'wilds',      label: '🌟 Wilds' },
                        { id: 'jackpot',    label: '🏆 Jackpot' },
                    ];
                    bar.innerHTML = `
                        <div class="mechanic-chips">
                            ${mechs.map(m => `<button class="mechanic-chip${m.id==='all'?' mechanic-chip-active':''}" data-mech="${m.id}" onclick="setMechanicFilter('${m.id}')">${m.label}</button>`).join('')}
                        </div>
                        <div class="sort-controls">
                            <span style="font-size:11px;color:rgba(255,255,255,0.4)">Sort:</span>
                            <button class="sort-btn sort-btn-active" data-sort="default" onclick="setSortMode('default')">Default</button>
                            <button class="sort-btn" data-sort="vol_asc" onclick="setSortMode('vol_asc')">Vol ↑</button>
                            <button class="sort-btn" data-sort="vol_desc" onclick="setSortMode('vol_desc')">Vol ↓</button>
                        </div>`;
                    const allGames = document.getElementById('allGames');
                    if (allGames) allGames.parentNode.insertBefore(bar, allGames);
                }
```

**Step 6: Verify**

```bash
node -e "const fs=require('fs');const s=fs.readFileSync('js/ui-lobby.js','utf8');console.log('Lines:',s.split('\n').length,'OK')"
```

---

### Task 5: HTML structure + CSS (index.html + styles.css)

**⚠️ Must run after Tasks 1–4 complete. Do not run in parallel with any other agent.**

**Files:**
- Modify: `styles.css`
- Modify: `index.html`

#### 5a: CSS additions to styles.css

Append at the end of `styles.css`:

```css
/* ═══════════════════════════════════════════════════════════
   HALL OF FAME
   ═══════════════════════════════════════════════════════════ */
.hof-row {
    display: grid;
    grid-template-columns: 28px 1fr 50px 90px 52px;
    align-items: center;
    gap: 4px;
    padding: 5px 0;
    border-bottom: 1px solid rgba(255,215,0,0.08);
    font-size: 12px;
}
.hof-row:last-child { border-bottom: none; }
.hof-rank { text-align: center; font-size: 14px; }
.hof-game { color: rgba(255,255,255,0.85); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.hof-mult { color: #ffd700; font-weight: 700; text-align: right; }
.hof-amount { color: #4caf50; font-weight: 700; text-align: right; }
.hof-date { color: rgba(255,255,255,0.35); text-align: right; font-size: 10px; }

/* ═══════════════════════════════════════════════════════════
   MECHANIC FILTER BAR
   ═══════════════════════════════════════════════════════════ */
.mechanic-filter-bar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 0 4px;
    flex-wrap: wrap;
}
.mechanic-chips {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    flex: 1;
}
.mechanic-chip {
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.12);
    color: rgba(255,255,255,0.65);
    border-radius: 20px;
    padding: 4px 10px;
    font-size: 11px;
    cursor: pointer;
    transition: background 0.15s, color 0.15s, border-color 0.15s;
    white-space: nowrap;
}
.mechanic-chip:hover { background: rgba(255,255,255,0.1); color: #fff; }
.mechanic-chip-active {
    background: rgba(123,97,255,0.2);
    border-color: #7b61ff;
    color: #c4b5fd;
    font-weight: 600;
}
.sort-controls {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
}
.sort-btn {
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.1);
    color: rgba(255,255,255,0.5);
    border-radius: 6px;
    padding: 3px 8px;
    font-size: 10px;
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
}
.sort-btn:hover { background: rgba(255,255,255,0.1); color: #fff; }
.sort-btn-active { background: rgba(123,97,255,0.2); border-color: #7b61ff; color: #c4b5fd; }

/* Challenges: updated badge count */
#challengesCount { font-size: 10px; }
```

#### 5b: Wire recordHallOfFameWin into ui-slot.js spin result

After Task 5a, open `js/ui-slot.js` and find the `onChallengeEvent` call block (from Task 2). After the closing `}` of that `if (typeof onChallengeEvent...)` block, add:

```js
            if (typeof recordHallOfFameWin === 'function' && winAmount > 0 && currentGame) {
                recordHallOfFameWin(winAmount, currentBet, currentGame.name, currentGame.id, currentGame.bonusType);
            }
```

#### 5c: No index.html changes needed

The Hall of Fame panel is injected dynamically by `_ensureHoFPanel()` into the existing `#statsContent` div. The mechanic filter bar is injected by `renderGames()`. No static HTML changes required.

---

### Task 6: QA regression + commit

**Step 1: Start the server**

```bash
npm start &
sleep 3
```

**Step 2: Run QA regression**

```bash
npm run qa:regression
```

Expected: All tests pass (0 errors).

**Step 3: If pass, commit**

```bash
git add constants.js js/ui-modals.js js/ui-lobby.js js/ui-slot.js js/win-logic.js styles.css
git commit -m "feat: expand daily challenges (8), achievements (24), hall of fame, mechanics filter

- Daily challenges: 3 → 8 (spin counts, wager total, big win mult, bonus trigger, win streak)
- Achievements: 12 → 24 (wager milestones, bonus rounds, streak records, epic win 1000×)
- Hall of Fame: cross-session top-10 best wins panel in stats modal
- Lobby: mechanic-type filter chips (Tumble/Hold&Win/Free Spins/Wilds/Jackpot)
- Lobby: volatility sort (Default / Vol ↑ / Vol ↓)
- onChallengeEvent payload expanded with winMult, bonusTriggered, streak

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

**Step 4: Push**

```bash
git push origin master
```

---

## Implementation Notes

### Payload expansion safety
The expanded `onChallengeEvent` payload is backwards-compatible — `ui-modals.js` already ignores unknown fields. The new fields (`winMult`, `bonusTriggered`, `streak`) are used only by new challenge/achievement code.

### Hall of Fame storage
`matrixHallOfFame` is a JSON array of ≤10 entries, sorted by multiplier descending. Written on every spin with win ≥5× bet. Panel is lazily created inside `openStatsModal` so there's no lobby load cost.

### Mechanic filter DOM injection
`setMechanicFilter` and `setSortMode` are global functions (no `window.` prefix needed since all code is global-scoped). The mechanic filter bar is injected into the DOM by `renderGames()` so it appears after the game grid section header.

### Free spins bonus trigger detection
The `bonus` challenge event fires via `win-logic.js` when scatters trigger hold/win or free spins. Sprint-engine bonus types (sticky_wilds, walking_wilds, etc.) also call `triggerXxxFreeSpins` — those trigger sites in `win-logic.js` lines ~575-640 should also get the `onChallengeEvent('bonus', ...)` call for completeness.
