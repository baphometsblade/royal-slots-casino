/**
 * Sprint 64 — Daily Quest Board
 * Floating action button that opens a quest panel with 3 daily rotating quests.
 */
(function() {
    'use strict';

    var ELEMENT_ID = 'dailyQuestBoard';
    var Z_INDEX = 10400;
    var STORAGE_KEY = 'ms_dailyQuests';
    var FAB_SIZE = 48;

    var QUEST_POOL = [
        { text: 'Spin 50 times', target: 50, reward: 2 },
        { text: 'Win $20+', target: 20, reward: 3 },
        { text: 'Play 3 different games', target: 3, reward: 1 },
        { text: 'Get a 3x multiplier', target: 1, reward: 5 },
        { text: 'Spin 100 times', target: 100, reward: 4 },
        { text: 'Win $50+', target: 50, reward: 5 },
        { text: 'Play 5 different games', target: 5, reward: 3 },
        { text: 'Hit a bonus round', target: 1, reward: 4 }
    ];

    function getDayOfYear() {
        var now = new Date();
        var start = new Date(now.getFullYear(), 0, 0);
        var diff = now - start;
        return Math.floor(diff / (1000 * 60 * 60 * 24));
    }

    function seededRandom(seed) {
        var x = Math.sin(seed) * 10000;
        return x - Math.floor(x);
    }

    function getTodaysQuests() {
        var day = getDayOfYear();
        var indices = [];
        var seed = day * 137;
        while (indices.length < 3) {
            var val = Math.floor(seededRandom(seed + indices.length * 47) * QUEST_POOL.length);
            if (indices.indexOf(val) === -1) {
                indices.push(val);
            } else {
                seed += 13;
            }
        }
        return indices.map(function(idx) {
            return {
                text: QUEST_POOL[idx].text,
                target: QUEST_POOL[idx].target,
                reward: QUEST_POOL[idx].reward,
                progress: 0,
                claimed: false
            };
        });
    }

    function loadQuestState() {
        try {
            var stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
            var today = new Date().toDateString();
            if (stored.date === today && stored.quests && stored.quests.length === 3) {
                return stored;
            }
        } catch (e) { /* ignore */ }
        // Reset for new day
        var state = {
            date: new Date().toDateString(),
            quests: getTodaysQuests()
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        return state;
    }

    function saveQuestState(state) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }

    function createQuestBoard() {
        if (document.getElementById(ELEMENT_ID)) return;

        var state = loadQuestState();
        var isPanelOpen = false;

        // FAB button
        var fab = document.createElement('div');
        fab.id = ELEMENT_ID;
        fab.style.cssText = 'position:fixed;bottom:70px;right:16px;width:' + FAB_SIZE + 'px;'
            + 'height:' + FAB_SIZE + 'px;border-radius:50%;cursor:pointer;z-index:' + Z_INDEX + ';'
            + 'background:linear-gradient(135deg,#ffd700,#daa520);display:flex;align-items:center;'
            + 'justify-content:center;box-shadow:0 4px 16px rgba(255,215,0,0.35),0 2px 8px rgba(0,0,0,0.3);'
            + 'transition:transform 0.2s,box-shadow 0.2s;font-size:22px;user-select:none;'
            + 'font-family:system-ui,-apple-system,sans-serif;';
        fab.textContent = '\uD83D\uDCDC';

        // Notification dot for unclaimed quests
        var notifDot = document.createElement('div');
        notifDot.style.cssText = 'position:absolute;top:-2px;right:-2px;width:14px;height:14px;'
            + 'border-radius:50%;background:#e74c3c;border:2px solid #1a1a2e;display:none;';
        fab.appendChild(notifDot);

        function updateNotifDot() {
            var hasClaimable = state.quests.some(function(q) {
                return q.progress >= q.target && !q.claimed;
            });
            notifDot.style.display = hasClaimable ? 'block' : 'none';
        }

        // Simulate some progress for demo (random partial progress)
        state.quests.forEach(function(q) {
            if (q.progress === 0 && !q.claimed) {
                q.progress = Math.floor(seededRandom(getDayOfYear() * 31 + q.target) * q.target * 0.8);
            }
        });
        saveQuestState(state);
        updateNotifDot();

        // Quest Panel
        var panel = document.createElement('div');
        panel.style.cssText = 'position:fixed;bottom:' + (70 + FAB_SIZE + 12) + 'px;right:16px;'
            + 'width:300px;background:linear-gradient(135deg,#1a1a2e,#16213e);'
            + 'border:1px solid rgba(255,215,0,0.3);border-radius:14px;'
            + 'box-shadow:0 8px 32px rgba(0,0,0,0.6),0 0 20px rgba(255,215,0,0.1);'
            + 'z-index:' + Z_INDEX + ';overflow:hidden;'
            + 'transform:scale(0.8) translateY(20px);opacity:0;pointer-events:none;'
            + 'transition:transform 0.3s cubic-bezier(0.22,1,0.36,1),opacity 0.3s;'
            + 'font-family:system-ui,-apple-system,sans-serif;';

        // Panel header
        var header = document.createElement('div');
        header.style.cssText = 'padding:14px 16px;background:linear-gradient(90deg,rgba(255,215,0,0.15),transparent);'
            + 'border-bottom:1px solid rgba(255,215,0,0.15);display:flex;align-items:center;'
            + 'justify-content:space-between;';

        var headerTitle = document.createElement('div');
        headerTitle.style.cssText = 'font-size:15px;font-weight:700;color:#ffd700;';
        headerTitle.textContent = '\uD83D\uDCDC Daily Quests';

        var headerReset = document.createElement('div');
        headerReset.style.cssText = 'font-size:10px;color:#888;';
        headerReset.textContent = 'Resets daily';

        header.appendChild(headerTitle);
        header.appendChild(headerReset);
        panel.appendChild(header);

        // Quest list
        var questList = document.createElement('div');
        questList.style.cssText = 'padding:8px 0;';

        function renderQuests() {
            while (questList.firstChild) {
                questList.removeChild(questList.firstChild);
            }

            state.quests.forEach(function(quest, idx) {
                var row = document.createElement('div');
                row.style.cssText = 'padding:10px 16px;border-bottom:1px solid rgba(255,255,255,0.05);';

                var questText = document.createElement('div');
                questText.style.cssText = 'font-size:13px;color:#e0e0e0;margin-bottom:6px;'
                    + 'display:flex;justify-content:space-between;align-items:center;';

                var questName = document.createElement('span');
                questName.textContent = quest.text;

                var questReward = document.createElement('span');
                questReward.style.cssText = 'font-size:12px;font-weight:700;color:#ffd700;';
                questReward.textContent = '+$' + quest.reward;

                questText.appendChild(questName);
                questText.appendChild(questReward);

                var progressBar = document.createElement('div');
                progressBar.style.cssText = 'display:flex;align-items:center;gap:8px;';

                var track = document.createElement('div');
                track.style.cssText = 'flex:1;height:6px;background:rgba(255,255,255,0.1);'
                    + 'border-radius:3px;overflow:hidden;';

                var fill = document.createElement('div');
                var pct = Math.min(100, Math.round((quest.progress / quest.target) * 100));
                var fillColor = quest.claimed ? '#888' : (pct >= 100 ? '#2ecc71' : 'linear-gradient(90deg,#ffd700,#daa520)');
                fill.style.cssText = 'height:100%;border-radius:3px;width:' + pct + '%;'
                    + 'background:' + fillColor + ';transition:width 0.5s;';

                track.appendChild(fill);

                var progressLabel = document.createElement('span');
                progressLabel.style.cssText = 'font-size:10px;color:#aaa;min-width:44px;text-align:right;';
                progressLabel.textContent = Math.min(quest.progress, quest.target) + '/' + quest.target;

                progressBar.appendChild(track);
                progressBar.appendChild(progressLabel);

                row.appendChild(questText);
                row.appendChild(progressBar);

                if (quest.progress >= quest.target && !quest.claimed) {
                    var claimBtn = document.createElement('button');
                    claimBtn.style.cssText = 'width:100%;margin-top:8px;padding:6px 0;'
                        + 'background:linear-gradient(135deg,#2ecc71,#27ae60);color:#fff;'
                        + 'border:none;border-radius:6px;font-size:12px;font-weight:700;'
                        + 'cursor:pointer;transition:transform 0.15s;';
                    claimBtn.textContent = 'Claim $' + quest.reward;
                    claimBtn.onmouseenter = function() { claimBtn.style.transform = 'scale(1.03)'; };
                    claimBtn.onmouseleave = function() { claimBtn.style.transform = 'scale(1)'; };
                    claimBtn.onclick = (function(q) {
                        return function() {
                            q.claimed = true;
                            if (typeof balance !== 'undefined') {
                                balance += q.reward;
                            }
                            if (typeof updateBalanceDisplay === 'function') {
                                updateBalanceDisplay();
                            }
                            saveQuestState(state);
                            renderQuests();
                            updateNotifDot();
                        };
                    })(quest);
                    row.appendChild(claimBtn);
                } else if (quest.claimed) {
                    var claimed = document.createElement('div');
                    claimed.style.cssText = 'text-align:center;margin-top:6px;font-size:11px;'
                        + 'color:#2ecc71;font-weight:600;';
                    claimed.textContent = '\u2713 Claimed';
                    row.appendChild(claimed);
                }

                questList.appendChild(row);
            });
        }

        renderQuests();
        panel.appendChild(questList);

        // FAB click handler
        fab.onmouseenter = function() {
            fab.style.transform = 'scale(1.1)';
            fab.style.boxShadow = '0 6px 20px rgba(255,215,0,0.5),0 2px 8px rgba(0,0,0,0.3)';
        };
        fab.onmouseleave = function() {
            if (!isPanelOpen) {
                fab.style.transform = 'scale(1)';
                fab.style.boxShadow = '0 4px 16px rgba(255,215,0,0.35),0 2px 8px rgba(0,0,0,0.3)';
            }
        };

        fab.onclick = function() {
            isPanelOpen = !isPanelOpen;
            if (isPanelOpen) {
                panel.style.transform = 'scale(1) translateY(0)';
                panel.style.opacity = '1';
                panel.style.pointerEvents = 'auto';
            } else {
                panel.style.transform = 'scale(0.8) translateY(20px)';
                panel.style.opacity = '0';
                panel.style.pointerEvents = 'none';
            }
        };

        document.body.appendChild(panel);
        document.body.appendChild(fab);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(createQuestBoard, 7000);
        });
    } else {
        setTimeout(createQuestBoard, 7000);
    }
})();
