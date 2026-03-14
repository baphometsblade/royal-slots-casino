(function() {
    var achievementState = {
        unlockedIds: {},
        spinCount: 0,
        winStreak: 0,
        lastWinTime: 0,
        isFirstSpin: true,
        highRollerTriggered: false,
        nightOwlTriggered: false,
        localAchievements: {}
    };

    var queuedAchievements = [];
    var isShowingPopup = false;
    var pollInterval = null;
    var spinCheckInterval = 0;
    var containerEl = null;
    var overlayEl = null;

    var emojiMap = {
        'first_spin': '🎰',
        'ten_spin_club': '🔟',
        'lucky_streak': '🍀',
        'high_roller': '💎',
        'night_owl': '🌙',
        'dedicated_player': '⭐',
        'hot_streak': '🔥',
        'default': '🏆'
    };

    function createStyleSheet() {
        var style = document.createElement('style');
        style.textContent = `
            @keyframes slideDown {
                from {
                    transform: translateY(-100%);
                    opacity: 0;
                }
                to {
                    transform: translateY(0);
                    opacity: 1;
                }
            }

            @keyframes slideUp {
                from {
                    transform: translateY(0);
                    opacity: 1;
                }
                to {
                    transform: translateY(-100%);
                    opacity: 0;
                }
            }

            @keyframes pulse {
                0%, 100% {
                    opacity: 0.3;
                }
                50% {
                    opacity: 1;
                }
            }

            @keyframes sparkle {
                0% {
                    opacity: 1;
                    transform: scale(1);
                }
                100% {
                    opacity: 0;
                    transform: scale(0);
                }
            }

            @keyframes progressFill {
                from {
                    width: 100%;
                }
                to {
                    width: 0%;
                }
            }

            .achievement-popup-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.2);
                z-index: 9998;
                cursor: pointer;
            }

            .achievement-popup-container {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                z-index: 9999;
                display: flex;
                justify-content: center;
                pointer-events: none;
            }

            .achievement-popup {
                position: relative;
                margin-top: 20px;
                width: 90%;
                max-width: 600px;
                background: linear-gradient(135deg, #ffd700 0%, #ff8c00 100%);
                border-radius: 12px;
                padding: 24px;
                box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.3);
                animation: slideDown 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
                pointer-events: auto;
                overflow: hidden;
            }

            .achievement-popup.exit {
                animation: slideUp 0.5s ease-in;
            }

            .achievement-popup-content {
                display: flex;
                align-items: center;
                gap: 20px;
                position: relative;
                z-index: 1;
            }

            .achievement-icon {
                font-size: 64px;
                flex-shrink: 0;
                filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
            }

            .achievement-text {
                flex: 1;
            }

            .achievement-header {
                font-size: 12px;
                font-weight: bold;
                color: rgba(255, 255, 255, 0.9);
                text-transform: uppercase;
                letter-spacing: 2px;
                margin: 0;
                margin-bottom: 4px;
            }

            .achievement-title {
                font-size: 24px;
                font-weight: bold;
                color: #ffffff;
                margin: 0;
                text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
            }

            .achievement-description {
                font-size: 14px;
                color: rgba(255, 255, 255, 0.85);
                margin: 8px 0 0 0;
            }

            .achievement-reward {
                font-size: 16px;
                font-weight: bold;
                color: #2ecc71;
                margin-top: 8px;
                text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
            }

            .achievement-progress-bar {
                position: absolute;
                bottom: 0;
                left: 0;
                height: 4px;
                background: rgba(255, 255, 255, 0.3);
                width: 100%;
            }

            .achievement-progress-fill {
                height: 100%;
                background: rgba(255, 255, 255, 0.8);
                animation: progressFill 5s linear forwards;
            }

            .achievement-sparkle {
                position: absolute;
                pointer-events: none;
            }

            .sparkle {
                display: inline-block;
                width: 8px;
                height: 8px;
                background: rgba(255, 255, 255, 0.8);
                border-radius: 50%;
                animation: sparkle 1s ease-out forwards;
            }

            .progress-toast {
                position: fixed;
                bottom: 20px;
                right: 20px;
                background: rgba(20, 20, 40, 0.95);
                border: 2px solid #ffd700;
                border-radius: 8px;
                padding: 16px 20px;
                color: #ffd700;
                font-size: 14px;
                font-weight: bold;
                z-index: 9997;
                max-width: 280px;
                box-shadow: 0 4px 15px rgba(0, 0, 0, 0.5);
                animation: slideDown 0.4s ease-out;
            }

            .progress-toast.exit {
                animation: slideUp 0.4s ease-in;
            }

            @media (max-width: 600px) {
                .achievement-popup {
                    width: 95%;
                    margin-top: 10px;
                    padding: 16px;
                }

                .achievement-content {
                    gap: 12px;
                }

                .achievement-icon {
                    font-size: 48px;
                }

                .achievement-title {
                    font-size: 20px;
                }

                .progress-toast {
                    bottom: 10px;
                    right: 10px;
                    max-width: calc(100% - 20px);
                }
            }
        `;
        document.head.appendChild(style);
    }

    function initContainer() {
        if (!containerEl) {
            containerEl = document.createElement('div');
            containerEl.className = 'achievement-popup-container';
            document.body.appendChild(containerEl);
        }
    }

    function createSparkles(popupEl) {
        var rect = popupEl.getBoundingClientRect();
        var count = 12;
        var i = 0;
        while (i < count) {
            var sparkleDiv = document.createElement('div');
            sparkleDiv.className = 'achievement-sparkle';
            var x = Math.random() * rect.width;
            var y = Math.random() * rect.height;
            sparkleDiv.style.left = x + 'px';
            sparkleDiv.style.top = y + 'px';

            var spark = document.createElement('div');
            spark.className = 'sparkle';
            sparkleDiv.appendChild(spark);
            popupEl.appendChild(sparkleDiv);

            i++;
        }
    }

    function showPopup(icon, title, description, reward) {
        initContainer();

        var popupEl = document.createElement('div');
        popupEl.className = 'achievement-popup';
        popupEl.style.display = 'flex';
        popupEl.style.flexDirection = 'column';

        var contentEl = document.createElement('div');
        contentEl.className = 'achievement-popup-content';

        var iconEl = document.createElement('div');
        iconEl.className = 'achievement-icon';
        iconEl.textContent = icon;
        contentEl.appendChild(iconEl);

        var textEl = document.createElement('div');
        textEl.className = 'achievement-text';

        var headerEl = document.createElement('h4');
        headerEl.className = 'achievement-header';
        headerEl.textContent = '🏆 ACHIEVEMENT UNLOCKED!';
        textEl.appendChild(headerEl);

        var titleEl = document.createElement('h2');
        titleEl.className = 'achievement-title';
        titleEl.textContent = title;
        textEl.appendChild(titleEl);

        var descEl = document.createElement('p');
        descEl.className = 'achievement-description';
        descEl.textContent = description;
        textEl.appendChild(descEl);

        if (reward) {
            var rewardEl = document.createElement('p');
            rewardEl.className = 'achievement-reward';
            rewardEl.textContent = reward;
            textEl.appendChild(rewardEl);
        }

        contentEl.appendChild(textEl);
        popupEl.appendChild(contentEl);

        var progressBarEl = document.createElement('div');
        progressBarEl.className = 'achievement-progress-bar';
        var progressFillEl = document.createElement('div');
        progressFillEl.className = 'achievement-progress-fill';
        progressBarEl.appendChild(progressFillEl);
        popupEl.appendChild(progressBarEl);

        containerEl.appendChild(popupEl);
        createSparkles(popupEl);

        document.dispatchEvent(new CustomEvent('achievement:unlocked', {
            detail: { title: title, icon: icon, reward: reward }
        }));

        setTimeout(function() {
            popupEl.classList.add('exit');
            setTimeout(function() {
                popupEl.remove();
                isShowingPopup = false;
                processQueue();
            }, 500);
        }, 5000);
    }

    function showProgressToast(message) {
        var toastEl = document.createElement('div');
        toastEl.className = 'progress-toast';
        toastEl.textContent = message;
        document.body.appendChild(toastEl);

        setTimeout(function() {
            toastEl.classList.add('exit');
            setTimeout(function() {
                toastEl.remove();
            }, 400);
        }, 4000);
    }

    function checkNewAchievements() {
        api('/api/achievements', {})
            .then(function(data) {
                if (!data || !data.achievements) {
                    return;
                }

                var achievements = data.achievements;
                var j = 0;
                while (j < achievements.length) {
                    var achievement = achievements[j];
                    if (!achievementState.unlockedIds[achievement.id]) {
                        achievementState.unlockedIds[achievement.id] = true;
                        var icon = emojiMap[achievement.type] || emojiMap.default;
                        var reward = achievement.reward ? '+$' + achievement.reward + ' Bonus!' : '';
                        queuedAchievements.push({
                            icon: icon,
                            title: achievement.name,
                            description: achievement.description,
                            reward: reward
                        });
                    }
                    j++;
                }

                processQueue();
            })
            .catch(function(err) {
                console.warn('Achievement sync failed:', err);
            });
    }

    function processQueue() {
        if (queuedAchievements.length > 0 && !isShowingPopup) {
            isShowingPopup = true;
            var achievement = queuedAchievements.shift();
            showPopup(achievement.icon, achievement.title, achievement.description, achievement.reward);
        }
    }

    function triggerLocalAchievement(key, title, description) {
        if (!achievementState.localAchievements[key]) {
            achievementState.localAchievements[key] = true;
            var icon = emojiMap[key] || emojiMap.default;
            queuedAchievements.push({
                icon: icon,
                title: title,
                description: description,
                reward: ''
            });
            processQueue();
        }
    }

    function checkFirstSpin() {
        if (achievementState.isFirstSpin) {
            achievementState.isFirstSpin = false;
            triggerLocalAchievement(
                'first_spin',
                'First Spin',
                'You\'ve taken your first spin on the Royal Slots!'
            );
        }
    }

    function checkTenSpinClub() {
        if (achievementState.spinCount === 10) {
            triggerLocalAchievement(
                'ten_spin_club',
                '10 Spin Club',
                'You\'ve spun 10 times in this session!'
            );
        }
    }

    function checkLuckyStreak(isWin) {
        if (isWin) {
            achievementState.winStreak++;
            if (achievementState.winStreak === 3) {
                triggerLocalAchievement(
                    'lucky_streak',
                    'Lucky Streak',
                    'You\'ve won 3 times in a row!'
                );
            }
        } else {
            achievementState.winStreak = 0;
        }
    }

    function checkHighRoller(betAmount) {
        if (betAmount > 100 && !achievementState.highRollerTriggered) {
            achievementState.highRollerTriggered = true;
            triggerLocalAchievement(
                'high_roller',
                'High Roller',
                'You placed a bet over $100!'
            );
        }
    }

    function checkNightOwl() {
        var now = new Date();
        var hour = now.getHours();
        if ((hour >= 0 && hour < 4) && !achievementState.nightOwlTriggered) {
            achievementState.nightOwlTriggered = true;
            triggerLocalAchievement(
                'night_owl',
                'Night Owl',
                'You\'re spinning at 3 AM. The grind never stops!'
            );
        }
    }

    function handleSpinComplete(event) {
        achievementState.spinCount++;
        spinCheckInterval++;

        checkFirstSpin();
        checkTenSpinClub();

        var betAmount = event.detail && event.detail.bet ? event.detail.bet : 0;
        var isWin = event.detail && event.detail.win ? true : false;

        checkLuckyStreak(isWin);
        checkHighRoller(betAmount);
        checkNightOwl();

        if (spinCheckInterval >= 10) {
            spinCheckInterval = 0;
            checkNewAchievements();
        }

        if (achievementState.spinCount % 20 === 0) {
            var spinsLeft = Math.max(0, 10 - (achievementState.spinCount % 10));
            if (spinsLeft > 0) {
                showProgressToast('🎯 ' + spinsLeft + ' more spins to unlock "Dedicated Player"!');
            }

            var winsNeeded = Math.max(0, 3 - achievementState.winStreak);
            if (winsNeeded > 0 && winsNeeded < 3) {
                showProgressToast('🔥 Almost there! ' + winsNeeded + ' more wins to unlock "Hot Streak"!');
            }
        }
    }

    function init() {
        createStyleSheet();
        initContainer();

        if (overlayEl) {
            overlayEl.remove();
        }
        overlayEl = document.createElement('div');
        overlayEl.className = 'achievement-popup-overlay';
        overlayEl.style.display = 'none';
        overlayEl.addEventListener('click', function() {
            overlayEl.style.display = 'none';
        });
        document.body.appendChild(overlayEl);

        document.addEventListener('spin:complete', handleSpinComplete);

        checkNewAchievements();

        if (pollInterval) {
            clearInterval(pollInterval);
        }
        pollInterval = setInterval(checkNewAchievements, 60000);

        console.warn('Achievement popup system initialized');
    }

    function showAchievementManual(name, description, reward) {
        var icon = emojiMap.default;
        queuedAchievements.push({
            icon: icon,
            title: name,
            description: description,
            reward: reward || ''
        });
        processQueue();
    }

    window.AchievementPopup = {
        init: init,
        showAchievement: showAchievementManual,
        trigger: triggerLocalAchievement,
        getState: function() {
            return achievementState;
        }
    };
})();
