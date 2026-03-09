(function() {
    'use strict';

    var ELEMENT_ID = 'achievementToast2';
    var Z_INDEX = 10400;
    var STORAGE_KEY = 'ms_achievements2';
    var POLL_INTERVAL = 10000;
    var TOAST_DURATION = 5000;
    var TOAST_GAP = 2000;

    var MILESTONES = {
        firstWin: {
            icon: '\uD83C\uDFC6',
            title: 'First Victory!',
            description: 'Won your very first spin',
            xp: 50,
            check: function() {
                return typeof window._winStreak !== 'undefined' && window._winStreak > 0;
            }
        },
        bigWin: {
            icon: '\uD83D\uDCB0',
            title: 'Big Winner!',
            description: 'Won over $50 in a single spin',
            xp: 200,
            check: function() {
                return typeof window._lastWinAmount !== 'undefined' && window._lastWinAmount > 50;
            }
        },
        marathon: {
            icon: '\uD83C\uDFC3',
            title: 'Marathon Spinner!',
            description: 'Completed 100 spins in one session',
            xp: 150,
            check: function(data) {
                return data.sessionSpins >= 100;
            }
        },
        highRoller: {
            icon: '\uD83C\uDFB0',
            title: 'High Roller!',
            description: 'Placed a bet over $10',
            xp: 100,
            check: function() {
                return typeof window._lastBetAmount !== 'undefined' && window._lastBetAmount > 10;
            }
        },
        luckyStreak: {
            icon: '\uD83D\uDD25',
            title: 'Lucky Streak!',
            description: '3 wins in a row',
            xp: 120,
            check: function() {
                return typeof window._winStreak !== 'undefined' && window._winStreak >= 3;
            }
        },
        explorer: {
            icon: '\uD83D\uDDFA\uFE0F',
            title: 'Explorer!',
            description: 'Played 5 different games',
            xp: 100,
            check: function(data) {
                return data.gamesPlayed.length >= 5;
            }
        }
    };

    var toastContainer = null;
    var toastQueue = [];
    var isShowingToast = false;
    var sessionSpins = 0;
    var gamesPlayed = [];
    var achievedSet = {};
    var pollTimer = null;

    function loadAchievements() {
        try {
            var saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                var data = JSON.parse(saved);
                achievedSet = data.achieved || {};
                gamesPlayed = data.gamesPlayed || [];
            }
        } catch (e) { /* ignore */ }
    }

    function saveAchievements() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                achieved: achievedSet,
                gamesPlayed: gamesPlayed
            }));
        } catch (e) { /* ignore */ }
    }

    function createContainer() {
        if (document.getElementById(ELEMENT_ID)) return;

        toastContainer = document.createElement('div');
        toastContainer.id = ELEMENT_ID;
        toastContainer.style.cssText = 'position:fixed;top:80px;right:-350px;width:320px;z-index:' + Z_INDEX + ';font-family:Arial,Helvetica,sans-serif;transition:right 0.5s ease;pointer-events:auto;';
        document.body.appendChild(toastContainer);

        var styleId = ELEMENT_ID + '_style';
        if (!document.getElementById(styleId)) {
            var style = document.createElement('style');
            style.id = styleId;
            style.textContent = '@keyframes achStarBurst{0%{transform:scale(0) rotate(0deg);opacity:1}50%{transform:scale(1.5) rotate(180deg);opacity:0.7}100%{transform:scale(0) rotate(360deg);opacity:0}}';
            document.head.appendChild(style);
        }
    }

    function clearContainer() {
        if (!toastContainer) return;
        while (toastContainer.firstChild) {
            toastContainer.removeChild(toastContainer.firstChild);
        }
    }

    function showToast(milestone) {
        createContainer();
        isShowingToast = true;

        clearContainer();

        var toast = document.createElement('div');
        toast.style.cssText = 'background:linear-gradient(135deg,#1a1a2e,#2d1b69);border:2px solid #ffd700;border-radius:12px;padding:16px;box-shadow:0 0 25px rgba(255,215,0,0.4),0 4px 15px rgba(0,0,0,0.5);position:relative;overflow:hidden;';

        var iconRow = document.createElement('div');
        iconRow.style.cssText = 'display:flex;align-items:center;gap:12px;margin-bottom:8px;';

        var iconEl = document.createElement('span');
        iconEl.style.cssText = 'font-size:36px;filter:drop-shadow(0 0 8px rgba(255,215,0,0.6));';
        iconEl.textContent = milestone.icon;

        var headerDiv = document.createElement('div');

        var titleEl = document.createElement('div');
        titleEl.style.cssText = 'color:#ffd700;font-size:16px;font-weight:bold;text-shadow:0 0 6px rgba(255,215,0,0.4);';
        titleEl.textContent = 'ACHIEVEMENT UNLOCKED';

        var nameEl = document.createElement('div');
        nameEl.style.cssText = 'color:#fff;font-size:14px;margin-top:2px;';
        nameEl.textContent = milestone.title;

        headerDiv.appendChild(titleEl);
        headerDiv.appendChild(nameEl);
        iconRow.appendChild(iconEl);
        iconRow.appendChild(headerDiv);

        var descEl = document.createElement('div');
        descEl.style.cssText = 'color:#aaa;font-size:12px;margin-bottom:8px;';
        descEl.textContent = milestone.description;

        var xpEl = document.createElement('div');
        xpEl.style.cssText = 'color:#2ecc71;font-size:13px;font-weight:bold;text-shadow:0 0 4px rgba(46,204,113,0.4);';
        xpEl.textContent = '+' + milestone.xp + ' XP';

        toast.appendChild(iconRow);
        toast.appendChild(descEl);
        toast.appendChild(xpEl);

        spawnStars(toast);

        toastContainer.appendChild(toast);
        toastContainer.style.right = '20px';

        setTimeout(function() {
            toastContainer.style.right = '-350px';
            setTimeout(function() {
                isShowingToast = false;
                processQueue();
            }, 600);
        }, TOAST_DURATION);
    }

    function spawnStars(parent) {
        for (var i = 0; i < 6; i++) {
            var star = document.createElement('div');
            var x = Math.random() * 100;
            var y = Math.random() * 100;
            star.style.cssText = 'position:absolute;left:' + x + '%;top:' + y + '%;width:8px;height:8px;background:#ffd700;border-radius:50%;animation:achStarBurst 1s ease-out ' + (i * 0.15) + 's forwards;pointer-events:none;';
            parent.appendChild(star);
        }
    }

    function queueToast(milestone) {
        toastQueue.push(milestone);
        if (!isShowingToast) processQueue();
    }

    function processQueue() {
        if (toastQueue.length === 0) return;
        var next = toastQueue.shift();
        setTimeout(function() {
            showToast(next);
        }, TOAST_GAP);
    }

    function trackGamePlayed() {
        if (typeof currentGame !== 'undefined' && currentGame && currentGame.id) {
            if (gamesPlayed.indexOf(currentGame.id) === -1) {
                gamesPlayed.push(currentGame.id);
                saveAchievements();
            }
        }
    }

    function checkMilestones() {
        trackGamePlayed();

        if (typeof spinning !== 'undefined' && !spinning) {
            sessionSpins++;
        }

        var data = {
            sessionSpins: sessionSpins,
            gamesPlayed: gamesPlayed
        };

        var keys = Object.keys(MILESTONES);
        for (var i = 0; i < keys.length; i++) {
            var key = keys[i];
            if (achievedSet[key]) continue;
            if (MILESTONES[key].check(data)) {
                achievedSet[key] = true;
                saveAchievements();
                queueToast(MILESTONES[key]);
            }
        }
    }

    function init() {
        loadAchievements();
        createContainer();
        pollTimer = setInterval(checkMilestones, POLL_INTERVAL);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(init, 5000);
        });
    } else {
        setTimeout(init, 5000);
    }
})();
