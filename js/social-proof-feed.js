(function() {
    'use strict';

    var state = {
        initialized: false,
        tickerContainer: null,
        toastContainer: null,
        bigwinContainer: null,
        currentToasts: [],
        winHistory: [],
        toastInterval: null,
        bigwinInterval: null,
        marqueeInterval: null,
        isPageVisible: true,
        isDismissed: false
    };

    var config = {
        toastDisplayDuration: 4000,
        toastMinInterval: 15000,
        toastMaxInterval: 45000,
        bigwinMinInterval: 120000,
        bigwinMaxInterval: 300000,
        maxVisibleToasts: 3,
        tickerHeight: 36,
        toastStackGap: 10,
        pageLoadDelay: 10000
    };

    var colors = {
        dark: '#0a0a1a',
        darkGlass: 'rgba(10, 10, 26, 0.95)',
        gold: '#d4af37',
        goldLight: '#ffd700',
        goldGlow: 'rgba(212, 175, 55, 0.3)',
        text: '#f0f0f0',
        green: '#4caf50',
        greenGlow: 'rgba(76, 175, 80, 0.3)',
        lightGreen: '#81c784'
    };

    var gameNames = [
        'Lucky Dragon', 'Golden Jackpot', 'Diamond Quest', 'Fruit Frenzy',
        'Silver Bullets', 'Wild West', 'Mystic Moon', 'Ocean Treasure',
        'Rainbow Riches', 'Fire Dragon', 'Lucky 7s', 'Paradise Slots',
        'Cherry Blast', 'Cosmic Spin', 'Thunder Storm', 'Royal Flush',
        'Magic Mirror', 'Aztec Gold', 'Egyptian Quest', 'Book of Ra',
        'Ancient Rome', 'Pirate Gold', 'Mermaid Treasure', 'Sunset Beach'
    ];

    var firstNames = [
        'Alex', 'Jordan', 'Casey', 'Morgan', 'Taylor', 'Riley', 'Blake',
        'Drew', 'Quinn', 'Sam', 'Chris', 'Jamie', 'Bailey', 'Dakota',
        'Reese', 'Sky', 'Phoenix', 'River', 'Royal', 'King', 'James',
        'David', 'Sarah', 'Emma', 'Michael', 'Jessica', 'Daniel', 'Ashley'
    ];

    var lastNames = [
        'Smith', 'Chen', 'Martinez', 'Johnson', 'Wong', 'Kumar', 'O\'Neil',
        'Garcia', 'Brown', 'Miller', 'Davis', 'Rodriguez', 'Wilson', 'Moore',
        'Taylor', 'Anderson', 'Thomas', 'Jackson', 'White', 'Harris', 'Martin',
        'Lee', 'Perez', 'Roberts', 'Turner', 'Phillips', 'Campbell'
    ];

    function getRandomElement(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }

    function generatePlayerName() {
        var patterns = ['name', 'player', 'lucky', 'spin'];
        var pattern = getRandomElement(patterns);

        switch (pattern) {
            case 'name':
                return getRandomElement(firstNames) + ' ' + getRandomElement(lastNames).charAt(0) + '.';
            case 'player':
                return 'Player' + Math.floor(Math.random() * 9000 + 1000);
            case 'lucky':
                return 'Lucky' + getRandomElement(firstNames);
            case 'spin':
                return 'Spin' + getRandomElement(['Master', 'King', 'Star', 'Lord', 'Rush']);
            default:
                return 'Player' + Math.floor(Math.random() * 9000 + 1000);
        }
    }

    function generateWinAmount() {
        var rand = Math.random();
        if (rand < 0.7) {
            return Math.floor(Math.random() * 190 + 10);
        } else if (rand < 0.95) {
            return Math.floor(Math.random() * 1500 + 500);
        } else {
            return Math.floor(Math.random() * 20000 + 5000);
        }
    }

    function getRandomGameName() {
        return getRandomElement(gameNames);
    }

    function generateWinEvent() {
        var playerName = generatePlayerName();
        var winAmount = generateWinAmount();
        var gameName = getRandomGameName();

        return {
            playerName: playerName,
            winAmount: winAmount,
            gameName: gameName,
            timestamp: Date.now(),
            isBigWin: winAmount > 500
        };
    }

    function getPlayerAvatarColor() {
        var colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'];
        return getRandomElement(colors);
    }

    function injectStyles() {
        var styleId = 'social-proof-styles';
        if (document.getElementById(styleId)) return;

        var style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            @keyframes socialProofMarquee {
                0% { transform: translateX(100%); }
                100% { transform: translateX(-100%); }
            }

            @keyframes socialProofSlideIn {
                0% {
                    opacity: 0;
                    transform: translateX(400px);
                }
                100% {
                    opacity: 1;
                    transform: translateX(0);
                }
            }

            @keyframes socialProofSlideOut {
                0% {
                    opacity: 1;
                    transform: translateX(0);
                }
                100% {
                    opacity: 0;
                    transform: translateX(400px);
                }
            }

            @keyframes socialProofDropIn {
                0% {
                    opacity: 0;
                    transform: translateY(-100px);
                }
                100% {
                    opacity: 1;
                    transform: translateY(0);
                }
            }

            @keyframes socialProofGlow {
                0%, 100% { box-shadow: 0 0 20px rgba(255, 215, 0, 0.3), inset 0 0 20px rgba(255, 215, 0, 0.1); }
                50% { box-shadow: 0 0 40px rgba(255, 215, 0, 0.6), inset 0 0 30px rgba(255, 215, 0, 0.2); }
            }

            #social-proof-ticker {
                position: fixed;
                bottom: 60px;
                left: 0;
                right: 0;
                height: ${config.tickerHeight}px;
                background: ${colors.darkGlass};
                border-top: 1px solid ${colors.gold};
                border-bottom: 1px solid ${colors.gold};
                z-index: 1000;
                display: flex;
                align-items: center;
                overflow: hidden;
                font-family: 'Arial', sans-serif;
                backdrop-filter: blur(10px);
            }

            #social-proof-ticker.hidden {
                display: none !important;
            }

            .social-proof-ticker-content {
                display: flex;
                white-space: nowrap;
                animation: socialProofMarquee 30s linear infinite;
            }

            .social-proof-ticker-item {
                padding: 0 40px;
                font-size: 14px;
                color: ${colors.text};
                display: inline-block;
                flex-shrink: 0;
            }

            .social-proof-ticker-item .player-name {
                color: ${colors.gold};
                font-weight: bold;
            }

            .social-proof-ticker-item .win-amount {
                color: ${colors.goldLight};
                font-weight: bold;
            }

            .social-proof-ticker-item .game-name {
                color: ${colors.text};
                font-style: italic;
            }

            #social-proof-toast-container {
                position: fixed;
                bottom: 70px;
                right: 20px;
                z-index: 1001;
                display: flex;
                flex-direction: column;
                gap: ${config.toastStackGap}px;
                pointer-events: none;
            }

            .social-proof-toast {
                display: flex;
                align-items: center;
                gap: 12px;
                background: ${colors.darkGlass};
                border: 2px solid ${colors.gold};
                border-radius: 8px;
                padding: 12px 16px;
                min-width: 280px;
                animation: socialProofSlideIn 0.4s ease-out;
                backdrop-filter: blur(10px);
                pointer-events: auto;
                box-shadow: 0 4px 15px rgba(0, 0, 0, 0.5);
            }

            .social-proof-toast.green-border {
                border-color: ${colors.green};
            }

            .social-proof-toast.gold-glow {
                animation: socialProofSlideIn 0.4s ease-out, socialProofGlow 2s ease-in-out infinite;
            }

            .social-proof-toast.slide-out {
                animation: socialProofSlideOut 0.4s ease-in;
            }

            .social-proof-avatar {
                width: 40px;
                height: 40px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: bold;
                color: white;
                font-size: 18px;
                flex-shrink: 0;
            }

            .social-proof-toast-content {
                flex: 1;
                min-width: 0;
            }

            .social-proof-toast-player {
                font-size: 13px;
                font-weight: bold;
                color: ${colors.gold};
                margin-bottom: 4px;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }

            .social-proof-toast-details {
                font-size: 12px;
                color: ${colors.text};
                display: flex;
                gap: 8px;
                align-items: center;
            }

            .social-proof-toast-amount {
                color: ${colors.goldLight};
                font-weight: bold;
            }

            .social-proof-toast-game {
                color: ${colors.text};
                font-size: 11px;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                max-width: 120px;
            }

            #social-proof-bigwin {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                z-index: 2000;
                background: linear-gradient(90deg, rgba(212, 175, 55, 0.1), rgba(255, 215, 0, 0.15), rgba(212, 175, 55, 0.1));
                border-bottom: 3px solid ${colors.gold};
                padding: 20px;
                text-align: center;
                animation: socialProofDropIn 0.5s ease-out;
                backdrop-filter: blur(10px);
                box-shadow: 0 4px 20px rgba(255, 215, 0, 0.3), inset 0 0 30px rgba(255, 215, 0, 0.1);
            }

            #social-proof-bigwin.hidden {
                display: none !important;
            }

            .social-proof-bigwin-content {
                font-size: 24px;
                font-weight: bold;
                color: ${colors.goldLight};
                text-shadow: 0 0 20px rgba(255, 215, 0, 0.5), 0 0 40px rgba(212, 175, 55, 0.3);
                animation: socialProofGlow 1.5s ease-in-out infinite;
                font-family: 'Arial', sans-serif;
                letter-spacing: 1px;
            }

            .social-proof-ticker-close {
                position: absolute;
                right: 10px;
                top: 50%;
                transform: translateY(-50%);
                background: transparent;
                border: none;
                color: ${colors.gold};
                cursor: pointer;
                font-size: 20px;
                padding: 4px 8px;
                z-index: 1010;
                font-weight: bold;
            }

            .social-proof-ticker-close:hover {
                color: ${colors.goldLight};
            }
        `;

        document.head.appendChild(style);
    }

    function createTickerContainer() {
        var container = document.getElementById('social-proof-ticker');
        if (container) return container;

        container = document.createElement('div');
        container.id = 'social-proof-ticker';
        document.body.appendChild(container);

        var content = document.createElement('div');
        content.className = 'social-proof-ticker-content';
        container.appendChild(content);

        var closeBtn = document.createElement('button');
        closeBtn.className = 'social-proof-ticker-close';
        closeBtn.textContent = '×';
        closeBtn.addEventListener('click', function() {
            dismissTicker();
        });
        container.appendChild(closeBtn);

        return container;
    }

    function createToastContainer() {
        var container = document.getElementById('social-proof-toast-container');
        if (container) return container;

        container = document.createElement('div');
        container.id = 'social-proof-toast-container';
        document.body.appendChild(container);

        return container;
    }

    function createBigwinContainer() {
        var container = document.getElementById('social-proof-bigwin');
        if (container) return container;

        container = document.createElement('div');
        container.id = 'social-proof-bigwin';
        container.className = 'hidden';
        document.body.appendChild(container);

        return container;
    }

    function dismissTicker() {
        state.isDismissed = true;
        sessionStorage.setItem('socialProofTicerDismissed', 'true');
        var ticker = document.getElementById('social-proof-ticker');
        if (ticker) {
            ticker.classList.add('hidden');
        }
    }

    function updateTicker() {
        if (state.isDismissed) return;

        var container = document.getElementById('social-proof-ticker');
        if (!container) return;

        var content = container.querySelector('.social-proof-ticker-content');
        if (!content) return;

        content.innerHTML = '';

        for (var i = 0; i < 2; i++) {
            for (var j = 0; j < state.winHistory.length; j++) {
                var win = state.winHistory[j];
                var item = document.createElement('div');
                item.className = 'social-proof-ticker-item';
                item.innerHTML = '🎰 <span class="player-name">' + win.playerName + '</span> just won <span class="win-amount">$' + win.winAmount.toLocaleString() + '</span> on <span class="game-name">' + win.gameName + '</span>!';
                content.appendChild(item);
            }
        }
    }

    function createToastNotification(win) {
        var toast = document.createElement('div');
        toast.className = 'social-proof-toast';

        if (win.winAmount > 500) {
            toast.classList.add('gold-glow');
        } else {
            toast.classList.add('green-border');
        }

        var avatar = document.createElement('div');
        avatar.className = 'social-proof-avatar';
        avatar.style.backgroundColor = getPlayerAvatarColor();
        avatar.textContent = win.playerName.charAt(0);
        toast.appendChild(avatar);

        var content = document.createElement('div');
        content.className = 'social-proof-toast-content';

        var playerName = document.createElement('div');
        playerName.className = 'social-proof-toast-player';
        playerName.textContent = win.playerName;
        content.appendChild(playerName);

        var details = document.createElement('div');
        details.className = 'social-proof-toast-details';

        var amount = document.createElement('span');
        amount.className = 'social-proof-toast-amount';
        amount.textContent = '$' + win.winAmount.toLocaleString();
        details.appendChild(amount);

        var game = document.createElement('span');
        game.className = 'social-proof-toast-game';
        game.textContent = 'on ' + win.gameName;
        details.appendChild(game);

        content.appendChild(details);
        toast.appendChild(content);

        return toast;
    }

    function showToastNotification(win) {
        if (!state.isPageVisible) return;

        var container = document.getElementById('social-proof-toast-container');
        if (!container) return;

        if (state.currentToasts.length >= config.maxVisibleToasts) {
            var oldestToast = state.currentToasts.shift();
            if (oldestToast && oldestToast.parentNode) {
                oldestToast.classList.add('slide-out');
                setTimeout(function() {
                    if (oldestToast.parentNode) {
                        oldestToast.parentNode.removeChild(oldestToast);
                    }
                }, 400);
            }
        }

        var toast = createToastNotification(win);
        container.appendChild(toast);
        state.currentToasts.push(toast);

        setTimeout(function() {
            if (toast && toast.parentNode) {
                toast.classList.add('slide-out');
                setTimeout(function() {
                    if (toast.parentNode) {
                        toast.parentNode.removeChild(toast);
                    }
                    state.currentToasts = state.currentToasts.filter(function(t) { return t !== toast; });
                }, 400);
            }
        }, config.toastDisplayDuration);
    }

    function showBigwinNotification(win) {
        if (!state.isPageVisible) return;

        var container = document.getElementById('social-proof-bigwin');
        if (!container) return;

        container.classList.remove('hidden');
        var contentDiv = document.createElement('div');
        contentDiv.className = 'social-proof-bigwin-content';
        contentDiv.innerHTML = '🏆 MASSIVE WIN! ' + win.playerName + ' hit <strong style="color: ' + colors.goldLight + ';">$' + win.winAmount.toLocaleString() + '</strong> on ' + win.gameName + '! 🏆';

        container.innerHTML = '';
        container.appendChild(contentDiv);

        setTimeout(function() {
            container.classList.add('hidden');
        }, 5000);
    }

    function scheduleNextToast() {
        if (!state.isPageVisible) {
            state.toastInterval = setTimeout(function() { scheduleNextToast(); }, 1000);
            return;
        }

        var delay = Math.floor(Math.random() * (config.toastMaxInterval - config.toastMinInterval + 1) + config.toastMinInterval);
        state.toastInterval = setTimeout(function() {
            var win = generateWinEvent();
            state.winHistory.unshift(win);
            if (state.winHistory.length > 8) {
                state.winHistory.pop();
            }
            updateTicker();
            showToastNotification(win);
            scheduleNextToast();
        }, delay);
    }

    function scheduleNextBigwin() {
        if (!state.isPageVisible) {
            state.bigwinInterval = setTimeout(function() { scheduleNextBigwin(); }, 2000);
            return;
        }

        var delay = Math.floor(Math.random() * (config.bigwinMaxInterval - config.bigwinMinInterval + 1) + config.bigwinMinInterval);
        state.bigwinInterval = setTimeout(function() {
            var minBigWinAmount = 5000;
            var win = generateWinEvent();
            while (win.winAmount < minBigWinAmount) {
                win = generateWinEvent();
            }
            showBigwinNotification(win);
            scheduleNextBigwin();
        }, delay);
    }

    function setupVisibilityTracking() {
        document.addEventListener('visibilitychange', function() {
            state.isPageVisible = !document.hidden;
            if (state.isPageVisible) {
                if (!state.toastInterval) {
                    scheduleNextToast();
                }
                if (!state.bigwinInterval) {
                    scheduleNextBigwin();
                }
            }
        });
    }

    function init() {
        if (state.initialized) {
            console.warn('social-proof-feed: already initialized');
            return;
        }

        injectStyles();
        createTickerContainer();
        createToastContainer();
        createBigwinContainer();

        var isDismissed = sessionStorage.getItem('socialProofTicerDismissed') === 'true';
        if (isDismissed) {
            state.isDismissed = true;
            var ticker = document.getElementById('social-proof-ticker');
            if (ticker) {
                ticker.classList.add('hidden');
            }
        }

        for (var i = 0; i < 5; i++) {
            var initialWin = generateWinEvent();
            state.winHistory.push(initialWin);
        }
        updateTicker();

        setupVisibilityTracking();
        scheduleNextToast();
        scheduleNextBigwin();

        state.initialized = true;
        console.warn('social-proof-feed: initialized');
    }

    window.SocialProofFeed = {
        init: init
    };
})();
