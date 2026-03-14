(function() {
    'use strict';

    var SeasonalEvent = {
        config: {
            bannerHeight: 120,
            counterSize: 60,
            counterBottom: 240,
            animationDuration: 500,
            refreshInterval: 5000
        },
        state: {
            eventData: null,
            progressData: null,
            prizes: null,
            leaderboard: null,
            currentTab: 'challenges',
            isModalOpen: false,
            shamrockCount: 0,
            timeRemaining: 0
        },
        elements: {
            banner: null,
            modal: null,
            counter: null,
            container: null
        },

        async api(path, opts) {
            opts = opts || {};
            if (typeof apiRequest === 'function') {
                return apiRequest(path, opts);
            }
            var tokenKey = typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken';
            var token = localStorage.getItem(tokenKey);
            if (!token) return null;
            var headers = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = 'Bearer ' + token;
            if (opts.headers) Object.assign(headers, opts.headers);
            var res = await fetch(path, Object.assign({}, opts, { headers: headers }));
            return res.json();
        },

        async init() {
            try {
                console.warn('[SeasonalEvent] Initializing seasonal event widget');

                await this.loadEventData();
                await this.loadProgress();
                await this.loadPrizes();
                await this.loadLeaderboard();

                this.createStyles();
                this.createBanner();
                this.createModal();
                this.createCounter();
                this.createParticleOverlay();

                this.startCountdownTimer();
                this.startRefreshInterval();

                console.warn('[SeasonalEvent] Widget initialized successfully');
            } catch (error) {
                console.warn('[SeasonalEvent] Initialization error:', error);
            }
        },

        async loadEventData() {
            try {
                var data = await this.api('/api/seasonal-event/');
                if (data && data.event) {
                    this.state.eventData = data.event;
                    this.state.timeRemaining = data.timeRemaining || 0;
                }
            } catch (error) {
                console.warn('[SeasonalEvent] Error loading event data:', error);
            }
        },

        async loadProgress() {
            try {
                var data = await this.api('/api/seasonal-event/progress');
                if (data) {
                    this.state.progressData = data.challenges || [];
                    this.state.shamrockCount = data.shamrocks || 0;
                }
            } catch (error) {
                console.warn('[SeasonalEvent] Error loading progress:', error);
            }
        },

        async loadPrizes() {
            try {
                var data = await this.api('/api/seasonal-event/prizes');
                if (data && data.prizes) {
                    this.state.prizes = data.prizes;
                }
            } catch (error) {
                console.warn('[SeasonalEvent] Error loading prizes:', error);
            }
        },

        async loadLeaderboard() {
            try {
                var data = await this.api('/api/seasonal-event/leaderboard');
                if (data && data.leaderboard) {
                    this.state.leaderboard = data.leaderboard.slice(0, 10);
                }
            } catch (error) {
                console.warn('[SeasonalEvent] Error loading leaderboard:', error);
            }
        },

        createStyles() {
            var style = document.createElement('style');
            style.textContent = `
                @keyframes shamrockFloat {
                    0% {
                        bottom: -40px;
                        opacity: 0;
                        transform: translateX(0) rotate(0deg);
                    }
                    10% {
                        opacity: 1;
                    }
                    90% {
                        opacity: 1;
                    }
                    100% {
                        bottom: 100vh;
                        opacity: 0;
                        transform: translateX(30px) rotate(360deg);
                    }
                }

                @keyframes pulseBadge {
                    0%, 100% {
                        transform: scale(1);
                        box-shadow: 0 0 10px rgba(212, 175, 55, 0.5);
                    }
                    50% {
                        transform: scale(1.1);
                        box-shadow: 0 0 20px rgba(212, 175, 55, 0.8);
                    }
                }

                @keyframes confetti {
                    0% {
                        transform: translate(0, 0) rotate(0deg);
                        opacity: 1;
                    }
                    100% {
                        transform: translate(var(--tx), var(--ty)) rotate(720deg);
                        opacity: 0;
                    }
                }

                @keyframes shamrockRain {
                    0% {
                        transform: translateY(-100vh) rotate(0deg);
                        opacity: 0;
                    }
                    10% {
                        opacity: 1;
                    }
                    90% {
                        opacity: 1;
                    }
                    100% {
                        transform: translateY(0) rotate(360deg);
                        opacity: 0;
                    }
                }

                @keyframes particleFloat {
                    0% {
                        transform: translateY(0) translateX(0) scale(1);
                        opacity: 0.3;
                    }
                    100% {
                        transform: translateY(-20px) translateX(10px) scale(0);
                        opacity: 0;
                    }
                }

                .seasonal-event-banner {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 120px;
                    background: linear-gradient(135deg, #0d5c2f 0%, #1a8c4e 50%, #0d5c2f 100%);
                    border-bottom: 3px solid #d4af37;
                    z-index: 9999;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    overflow: hidden;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
                }

                .seasonal-event-banner::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: linear-gradient(90deg,
                        transparent,
                        rgba(212, 175, 55, 0.1) 25%,
                        transparent 50%,
                        rgba(212, 175, 55, 0.1) 75%,
                        transparent);
                    animation: shimmer 3s infinite;
                }

                @keyframes shimmer {
                    0%, 100% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }

                .seasonal-event-banner-content {
                    display: flex;
                    align-items: center;
                    gap: 30px;
                    position: relative;
                    z-index: 2;
                }

                .banner-title {
                    font-size: 28px;
                    font-weight: bold;
                    color: #d4af37;
                    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.7);
                    white-space: nowrap;
                }

                .banner-countdown {
                    background: rgba(0, 0, 0, 0.3);
                    padding: 8px 16px;
                    border-radius: 8px;
                    color: #d4af37;
                    font-family: 'Courier New', monospace;
                    font-size: 14px;
                    font-weight: bold;
                    text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.7);
                }

                .banner-badge {
                    background: #d4af37;
                    color: #0d5c2f;
                    padding: 10px 20px;
                    border-radius: 25px;
                    font-weight: bold;
                    font-size: 14px;
                    animation: pulseBadge 2s infinite;
                }

                .banner-shamrock {
                    position: absolute;
                    font-size: 30px;
                    opacity: 0.6;
                }

                .seasonal-event-counter {
                    position: fixed;
                    bottom: 240px;
                    right: 20px;
                    width: 60px;
                    height: 60px;
                    background: linear-gradient(135deg, #0d5c2f 0%, #1a8c4e 100%);
                    border: 3px solid #d4af37;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 9990;
                    cursor: pointer;
                    font-size: 24px;
                    color: #d4af37;
                    font-weight: bold;
                    box-shadow: 0 4px 15px rgba(212, 175, 55, 0.3);
                    transition: all 0.3s ease;
                }

                .seasonal-event-counter:hover {
                    transform: scale(1.1);
                    box-shadow: 0 6px 20px rgba(212, 175, 55, 0.5);
                }

                .counter-text {
                    font-size: 12px;
                    position: absolute;
                    bottom: -25px;
                    white-space: nowrap;
                    color: #d4af37;
                    font-weight: bold;
                }

                .seasonal-event-modal {
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    width: 90%;
                    max-width: 900px;
                    max-height: 80vh;
                    background: #0a0a1a;
                    border: 2px solid #d4af37;
                    border-radius: 10px;
                    z-index: 10000;
                    display: none;
                    flex-direction: column;
                    box-shadow: 0 10px 50px rgba(0, 0, 0, 0.8);
                }

                .seasonal-event-modal.open {
                    display: flex;
                }

                .modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.7);
                    z-index: 9998;
                    display: none;
                }

                .modal-overlay.active {
                    display: block;
                }

                .modal-header {
                    padding: 20px;
                    border-bottom: 2px solid #d4af37;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .modal-title {
                    font-size: 24px;
                    font-weight: bold;
                    color: #d4af37;
                }

                .modal-close {
                    background: none;
                    border: none;
                    color: #d4af37;
                    font-size: 24px;
                    cursor: pointer;
                    padding: 0;
                    width: 40px;
                    height: 40px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .modal-close:hover {
                    background: rgba(212, 175, 55, 0.1);
                    border-radius: 50%;
                }

                .modal-tabs {
                    display: flex;
                    border-bottom: 2px solid #1a8c4e;
                    background: rgba(212, 175, 55, 0.05);
                }

                .modal-tab {
                    flex: 1;
                    padding: 15px 20px;
                    background: none;
                    border: none;
                    color: #888;
                    font-size: 14px;
                    font-weight: bold;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    text-transform: uppercase;
                    border-bottom: 3px solid transparent;
                }

                .modal-tab.active {
                    color: #d4af37;
                    border-bottom-color: #d4af37;
                    background: rgba(212, 175, 55, 0.1);
                }

                .modal-tab:hover {
                    background: rgba(212, 175, 55, 0.15);
                }

                .modal-content {
                    flex: 1;
                    overflow-y: auto;
                    padding: 30px;
                    color: #fff;
                }

                .modal-section {
                    display: none;
                }

                .modal-section.active {
                    display: block;
                }

                .challenge-card {
                    background: linear-gradient(135deg, rgba(13, 92, 47, 0.3) 0%, rgba(26, 140, 78, 0.3) 100%);
                    border: 1px solid #1a8c4e;
                    border-radius: 8px;
                    padding: 20px;
                    margin-bottom: 20px;
                }

                .challenge-title {
                    font-size: 16px;
                    font-weight: bold;
                    color: #d4af37;
                    margin-bottom: 10px;
                }

                .challenge-progress {
                    display: flex;
                    gap: 10px;
                    align-items: center;
                    margin-bottom: 15px;
                }

                .progress-bar {
                    flex: 1;
                    height: 8px;
                    background: rgba(0, 0, 0, 0.5);
                    border-radius: 4px;
                    overflow: hidden;
                    border: 1px solid #1a8c4e;
                }

                .progress-fill {
                    height: 100%;
                    background: linear-gradient(90deg, #0d5c2f 0%, #1a8c4e 100%);
                    border-radius: 4px;
                    width: 0%;
                    transition: width 0.5s ease;
                }

                .progress-text {
                    font-size: 12px;
                    color: #888;
                    white-space: nowrap;
                }

                .challenge-button {
                    background: linear-gradient(135deg, #0d5c2f 0%, #1a8c4e 100%);
                    border: 1px solid #d4af37;
                    color: #d4af37;
                    padding: 10px 20px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-weight: bold;
                    font-size: 12px;
                    transition: all 0.3s ease;
                    text-transform: uppercase;
                }

                .challenge-button:hover:not(:disabled) {
                    background: linear-gradient(135deg, #1a8c4e 0%, #2ba858 100%);
                    box-shadow: 0 4px 15px rgba(212, 175, 55, 0.3);
                }

                .challenge-button:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                .prize-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                    gap: 20px;
                }

                .prize-card {
                    background: linear-gradient(135deg, rgba(13, 92, 47, 0.3) 0%, rgba(26, 140, 78, 0.3) 100%);
                    border: 1px solid #1a8c4e;
                    border-radius: 8px;
                    padding: 20px;
                    text-align: center;
                    transition: all 0.3s ease;
                }

                .prize-card:hover {
                    border-color: #d4af37;
                    box-shadow: 0 4px 15px rgba(212, 175, 55, 0.2);
                    transform: translateY(-5px);
                }

                .prize-name {
                    font-size: 14px;
                    font-weight: bold;
                    color: #d4af37;
                    margin-bottom: 10px;
                }

                .prize-type {
                    font-size: 12px;
                    color: #888;
                    margin-bottom: 10px;
                }

                .prize-cost {
                    font-size: 16px;
                    font-weight: bold;
                    color: #0d8c4e;
                    margin-bottom: 15px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 5px;
                }

                .prize-button {
                    background: linear-gradient(135deg, #0d5c2f 0%, #1a8c4e 100%);
                    border: 1px solid #d4af37;
                    color: #d4af37;
                    padding: 8px 16px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-weight: bold;
                    font-size: 12px;
                    transition: all 0.3s ease;
                    width: 100%;
                    text-transform: uppercase;
                }

                .prize-button:hover:not(:disabled) {
                    background: linear-gradient(135deg, #1a8c4e 0%, #2ba858 100%);
                    box-shadow: 0 4px 15px rgba(212, 175, 55, 0.3);
                }

                .prize-button:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                .leaderboard-table {
                    width: 100%;
                    border-collapse: collapse;
                }

                .leaderboard-table th {
                    background: rgba(212, 175, 55, 0.1);
                    color: #d4af37;
                    padding: 12px;
                    text-align: left;
                    font-weight: bold;
                    border-bottom: 2px solid #1a8c4e;
                }

                .leaderboard-table td {
                    padding: 12px;
                    border-bottom: 1px solid rgba(26, 140, 78, 0.3);
                    color: #ccc;
                }

                .leaderboard-rank {
                    color: #d4af37;
                    font-weight: bold;
                }

                .leaderboard-rank.gold {
                    color: #ffd700;
                }

                .leaderboard-rank.silver {
                    color: #c0c0c0;
                }

                .leaderboard-rank.bronze {
                    color: #cd7f32;
                }

                .particle-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    pointer-events: none;
                    z-index: 1;
                }

                .particle {
                    position: absolute;
                    font-size: 20px;
                    opacity: 0.1;
                }

                .confetti-piece {
                    position: fixed;
                    pointer-events: none;
                    z-index: 10001;
                }

                .shamrock-rain {
                    position: fixed;
                    font-size: 40px;
                    opacity: 0.8;
                    pointer-events: none;
                    z-index: 10001;
                }

                body.seasonal-event-active {
                    padding-top: 120px;
                }

                @media (max-width: 768px) {
                    .seasonal-event-banner {
                        height: 80px;
                    }

                    .seasonal-event-banner-content {
                        gap: 15px;
                        flex-direction: column;
                    }

                    .banner-title {
                        font-size: 18px;
                    }

                    .prize-grid {
                        grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
                    }

                    .seasonal-event-modal {
                        width: 95%;
                        max-height: 90vh;
                    }
                }
            `;
            document.head.appendChild(style);
        },

        createBanner() {
            var banner = document.createElement('div');
            banner.className = 'seasonal-event-banner';

            var content = document.createElement('div');
            content.className = 'seasonal-event-banner-content';

            var title = document.createElement('div');
            title.className = 'banner-title';
            title.textContent = 'Lucky Leprechaun Festival';

            var countdown = document.createElement('div');
            countdown.className = 'banner-countdown';
            countdown.textContent = '00:00:00:00';
            countdown.id = 'seasonal-countdown';

            var badge = document.createElement('div');
            badge.className = 'banner-badge';
            badge.textContent = '1.5x BONUS';

            content.appendChild(title);
            content.appendChild(countdown);
            content.appendChild(badge);

            banner.appendChild(content);

            banner.addEventListener('click', this.openModal.bind(this));

            document.body.insertBefore(banner, document.body.firstChild);
            document.body.classList.add('seasonal-event-active');

            this.elements.banner = banner;
            this.createFloatingShamrocks(banner);
        },

        createFloatingShamrocks(banner) {
            var shamrockEmojis = ['☘️', '🍀'];
            var count = 8;

            for (var i = 0; i < count; i++) {
                (function(index) {
                    setTimeout(function() {
                        var shamrock = document.createElement('div');
                        shamrock.className = 'banner-shamrock';
                        shamrock.textContent = shamrockEmojis[index % shamrockEmojis.length];

                        var startX = Math.random() * 100;
                        shamrock.style.left = startX + '%';
                        shamrock.style.bottom = '-40px';
                        shamrock.style.animation = 'shamrockFloat ' + (4 + Math.random() * 2) + 's linear infinite';
                        shamrock.style.animationDelay = (i * 0.5) + 's';

                        banner.appendChild(shamrock);
                    }, i * 500);
                })(i);
            }
        },

        createModal() {
            var overlay = document.createElement('div');
            overlay.className = 'modal-overlay';
            overlay.id = 'seasonal-modal-overlay';
            overlay.addEventListener('click', this.closeModal.bind(this));
            document.body.appendChild(overlay);

            var modal = document.createElement('div');
            modal.className = 'seasonal-event-modal';
            modal.id = 'seasonal-event-modal';

            var header = document.createElement('div');
            header.className = 'modal-header';

            var title = document.createElement('div');
            title.className = 'modal-title';
            title.textContent = 'Lucky Leprechaun Festival';

            var closeBtn = document.createElement('button');
            closeBtn.className = 'modal-close';
            closeBtn.textContent = '✕';
            closeBtn.addEventListener('click', this.closeModal.bind(this));

            header.appendChild(title);
            header.appendChild(closeBtn);

            var tabs = document.createElement('div');
            tabs.className = 'modal-tabs';

            var tabNames = ['challenges', 'prizes', 'leaderboard'];
            var tabLabels = ['Challenges', 'Prize Shop', 'Leaderboard'];

            for (var i = 0; i < tabNames.length; i++) {
                (function(tabName, tabLabel) {
                    var tab = document.createElement('button');
                    tab.className = 'modal-tab' + (tabName === 'challenges' ? ' active' : '');
                    tab.textContent = tabLabel;
                    tab.dataset.tab = tabName;
                    tab.addEventListener('click', function() {
                        SeasonalEvent.switchTab(tabName);
                    });
                    tabs.appendChild(tab);
                })(tabNames[i], tabLabels[i]);
            }

            var content = document.createElement('div');
            content.className = 'modal-content';

            var challengesSection = document.createElement('div');
            challengesSection.className = 'modal-section active';
            challengesSection.id = 'seasonal-challenges';
            this.renderChallenges(challengesSection);

            var prizesSection = document.createElement('div');
            prizesSection.className = 'modal-section';
            prizesSection.id = 'seasonal-prizes';
            this.renderPrizes(prizesSection);

            var leaderboardSection = document.createElement('div');
            leaderboardSection.className = 'modal-section';
            leaderboardSection.id = 'seasonal-leaderboard';
            this.renderLeaderboard(leaderboardSection);

            content.appendChild(challengesSection);
            content.appendChild(prizesSection);
            content.appendChild(leaderboardSection);

            modal.appendChild(header);
            modal.appendChild(tabs);
            modal.appendChild(content);
            document.body.appendChild(modal);

            this.elements.modal = modal;
            this.elements.overlay = overlay;
        },

        renderChallenges(container) {
            container.innerHTML = '';
            if (!this.state.progressData || this.state.progressData.length === 0) {
                container.textContent = 'Loading challenges...';
                return;
            }

            for (var i = 0; i < this.state.progressData.length; i++) {
                var challenge = this.state.progressData[i];
                var card = document.createElement('div');
                card.className = 'challenge-card';

                var title = document.createElement('div');
                title.className = 'challenge-title';
                title.textContent = challenge.title || ('Challenge ' + (i + 1));

                var progressDiv = document.createElement('div');
                progressDiv.className = 'challenge-progress';

                var progressBar = document.createElement('div');
                progressBar.className = 'progress-bar';

                var fill = document.createElement('div');
                fill.className = 'progress-fill';
                var percentage = Math.min(100, (challenge.current / challenge.target) * 100);
                fill.style.width = percentage + '%';

                progressBar.appendChild(fill);

                var progressText = document.createElement('div');
                progressText.className = 'progress-text';
                progressText.textContent = challenge.current + '/' + challenge.target;

                progressDiv.appendChild(progressBar);
                progressDiv.appendChild(progressText);

                var button = document.createElement('button');
                button.className = 'challenge-button';
                button.dataset.challengeId = challenge.id;
                button.disabled = !challenge.completed || challenge.collected;

                if (challenge.collected) {
                    button.textContent = '✓ COLLECTED';
                } else if (challenge.completed) {
                    button.textContent = 'COLLECT REWARD';
                } else {
                    button.textContent = 'IN PROGRESS';
                }

                button.addEventListener('click', this.collectChallenge.bind(this));

                card.appendChild(title);
                card.appendChild(progressDiv);
                card.appendChild(button);
                container.appendChild(card);
            }
        },

        renderPrizes(container) {
            container.innerHTML = '';
            if (!this.state.prizes || this.state.prizes.length === 0) {
                container.textContent = 'Loading prizes...';
                return;
            }

            var grid = document.createElement('div');
            grid.className = 'prize-grid';

            for (var i = 0; i < this.state.prizes.length; i++) {
                var prize = this.state.prizes[i];
                var card = document.createElement('div');
                card.className = 'prize-card';

                var name = document.createElement('div');
                name.className = 'prize-name';
                name.textContent = prize.name || ('Prize ' + (i + 1));

                var type = document.createElement('div');
                type.className = 'prize-type';
                type.textContent = prize.type || 'reward';

                var cost = document.createElement('div');
                cost.className = 'prize-cost';
                cost.innerHTML = '☘️ ' + prize.cost;

                var button = document.createElement('button');
                button.className = 'prize-button';
                button.dataset.prizeId = prize.id;
                button.textContent = 'REDEEM';
                button.disabled = this.state.shamrockCount < prize.cost;
                button.addEventListener('click', this.redeemPrize.bind(this));

                card.appendChild(name);
                card.appendChild(type);
                card.appendChild(cost);
                card.appendChild(button);
                grid.appendChild(card);
            }

            container.appendChild(grid);
        },

        renderLeaderboard(container) {
            container.innerHTML = '';
            if (!this.state.leaderboard || this.state.leaderboard.length === 0) {
                container.textContent = 'Loading leaderboard...';
                return;
            }

            var table = document.createElement('table');
            table.className = 'leaderboard-table';

            var thead = document.createElement('thead');
            var headerRow = document.createElement('tr');

            var rankHeader = document.createElement('th');
            rankHeader.textContent = 'Rank';
            var playerHeader = document.createElement('th');
            playerHeader.textContent = 'Player';
            var pointsHeader = document.createElement('th');
            pointsHeader.textContent = 'Shamrocks';

            headerRow.appendChild(rankHeader);
            headerRow.appendChild(playerHeader);
            headerRow.appendChild(pointsHeader);
            thead.appendChild(headerRow);

            var tbody = document.createElement('tbody');

            for (var i = 0; i < this.state.leaderboard.length; i++) {
                var entry = this.state.leaderboard[i];
                var row = document.createElement('tr');

                var rankCell = document.createElement('td');
                rankCell.className = 'leaderboard-rank';
                if (i === 0) rankCell.classList.add('gold');
                else if (i === 1) rankCell.classList.add('silver');
                else if (i === 2) rankCell.classList.add('bronze');
                rankCell.textContent = (i + 1) + (i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '');

                var playerCell = document.createElement('td');
                playerCell.textContent = entry.username;

                var pointsCell = document.createElement('td');
                pointsCell.textContent = entry.shamrocks + ' ☘️';

                row.appendChild(rankCell);
                row.appendChild(playerCell);
                row.appendChild(pointsCell);
                tbody.appendChild(row);
            }

            table.appendChild(thead);
            table.appendChild(tbody);
            container.appendChild(table);
        },

        createCounter() {
            var counter = document.createElement('div');
            counter.className = 'seasonal-event-counter';
            counter.id = 'seasonal-event-counter';
            counter.innerHTML = '☘️ <span id="shamrock-count">0</span>';

            var text = document.createElement('div');
            text.className = 'counter-text';
            text.textContent = 'Shamrocks';
            counter.appendChild(text);

            counter.addEventListener('click', this.openModal.bind(this));
            document.body.appendChild(counter);

            this.elements.counter = counter;
            this.updateCounterDisplay();
        },

        createParticleOverlay() {
            var overlay = document.createElement('div');
            overlay.className = 'particle-overlay';
            overlay.id = 'seasonal-particle-overlay';
            document.body.appendChild(overlay);

            var shamrocks = ['☘️', '🍀'];
            var particleCount = 30;

            for (var i = 0; i < particleCount; i++) {
                (function(index) {
                    var particle = document.createElement('div');
                    particle.className = 'particle';
                    particle.textContent = shamrocks[index % shamrocks.length];
                    particle.style.left = Math.random() * 100 + '%';
                    particle.style.top = Math.random() * 100 + '%';
                    particle.style.opacity = (Math.random() * 0.1 + 0.05);
                    overlay.appendChild(particle);
                })(i);
            }
        },

        startCountdownTimer() {
            this.updateCountdown();
            this.countdownInterval = setInterval(this.updateCountdown.bind(this), 1000);
        },

        updateCountdown() {
            this.state.timeRemaining -= 1000;
            if (this.state.timeRemaining <= 0) {
                clearInterval(this.countdownInterval);
                this.state.timeRemaining = 0;
            }

            var ms = this.state.timeRemaining;
            var days = Math.floor(ms / (1000 * 60 * 60 * 24));
            var hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            var minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
            var seconds = Math.floor((ms % (1000 * 60)) / 1000);

            var countdownEl = document.getElementById('seasonal-countdown');
            if (countdownEl) {
                countdownEl.textContent =
                    String(days).padStart(2, '0') + ':' +
                    String(hours).padStart(2, '0') + ':' +
                    String(minutes).padStart(2, '0') + ':' +
                    String(seconds).padStart(2, '0');
            }
        },

        startRefreshInterval() {
            this.refreshInterval = setInterval(function() {
                SeasonalEvent.loadProgress();
                SeasonalEvent.loadLeaderboard();
                SeasonalEvent.updateCounterDisplay();
                SeasonalEvent.refreshModalContent();
            }, this.config.refreshInterval);
        },

        updateCounterDisplay() {
            var countEl = document.getElementById('shamrock-count');
            if (countEl) {
                countEl.textContent = this.state.shamrockCount;
            }
        },

        refreshModalContent() {
            if (this.state.isModalOpen) {
                this.renderChallenges(document.getElementById('seasonal-challenges'));
                this.renderPrizes(document.getElementById('seasonal-prizes'));
                this.renderLeaderboard(document.getElementById('seasonal-leaderboard'));
            }
        },

        openModal() {
            this.state.isModalOpen = true;
            this.elements.modal.classList.add('open');
            this.elements.overlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        },

        closeModal() {
            this.state.isModalOpen = false;
            this.elements.modal.classList.remove('open');
            this.elements.overlay.classList.remove('active');
            document.body.style.overflow = '';
        },

        switchTab(tabName) {
            this.state.currentTab = tabName;

            var tabs = document.querySelectorAll('.modal-tab');
            var sections = document.querySelectorAll('.modal-section');

            for (var i = 0; i < tabs.length; i++) {
                tabs[i].classList.remove('active');
                sections[i].classList.remove('active');
            }

            var activeTab = document.querySelector('[data-tab="' + tabName + '"]');
            if (activeTab) activeTab.classList.add('active');

            var activeSection = document.getElementById('seasonal-' + tabName);
            if (activeSection) activeSection.classList.add('active');
        },

        async collectChallenge(event) {
            var button = event.target;
            var challengeId = button.dataset.challengeId;

            if (!challengeId || button.disabled) return;

            try {
                button.disabled = true;
                var result = await this.api('/api/seasonal-event/collect', {
                    method: 'POST',
                    body: JSON.stringify({ challengeId: challengeId })
                });

                if (result) {
                    this.triggerConfetti();
                    await this.loadProgress();
                    this.updateCounterDisplay();
                    this.refreshModalContent();
                }
            } catch (error) {
                console.warn('[SeasonalEvent] Error collecting challenge:', error);
                button.disabled = false;
            }
        },

        async redeemPrize(event) {
            var button = event.target;
            var prizeId = button.dataset.prizeId;

            if (!prizeId || button.disabled) return;

            try {
                button.disabled = true;
                var result = await this.api('/api/seasonal-event/redeem', {
                    method: 'POST',
                    body: JSON.stringify({ prizeId: prizeId })
                });

                if (result) {
                    this.triggerShamrockRain();
                    await this.loadProgress();
                    await this.loadPrizes();
                    this.updateCounterDisplay();
                    this.refreshModalContent();
                }
            } catch (error) {
                console.warn('[SeasonalEvent] Error redeeming prize:', error);
                button.disabled = false;
            }
        },

        triggerConfetti() {
            var confettiCount = 30;
            var emojis = ['☘️', '🍀', '💰', '🎉'];

            for (var i = 0; i < confettiCount; i++) {
                (function(index) {
                    setTimeout(function() {
                        var confetti = document.createElement('div');
                        confetti.className = 'confetti-piece';
                        confetti.textContent = emojis[index % emojis.length];

                        var startX = Math.random() * window.innerWidth;
                        var startY = window.innerHeight / 2;

                        confetti.style.left = startX + 'px';
                        confetti.style.top = startY + 'px';
                        confetti.style.fontSize = (20 + Math.random() * 20) + 'px';

                        var tx = (Math.random() - 0.5) * 300;
                        var ty = -300 - Math.random() * 300;

                        confetti.style.setProperty('--tx', tx + 'px');
                        confetti.style.setProperty('--ty', ty + 'px');
                        confetti.style.animation = 'confetti ' + (0.8 + Math.random() * 0.4) + 's ease-out forwards';

                        document.body.appendChild(confetti);

                        setTimeout(function() {
                            confetti.remove();
                        }, 1200);
                    }, i * 20);
                })(i);
            }
        },

        triggerShamrockRain() {
            var rainCount = 20;

            for (var i = 0; i < rainCount; i++) {
                (function(index) {
                    setTimeout(function() {
                        var shamrock = document.createElement('div');
                        shamrock.className = 'shamrock-rain';
                        shamrock.textContent = '☘️';

                        var startX = Math.random() * window.innerWidth;
                        shamrock.style.left = startX + 'px';
                        shamrock.style.top = '-40px';
                        shamrock.style.animation = 'shamrockRain ' + (2 + Math.random() * 1) + 's linear forwards';

                        document.body.appendChild(shamrock);

                        setTimeout(function() {
                            shamrock.remove();
                        }, 3000);
                    }, i * 30);
                })(i);
            }
        },

        destroy() {
            if (this.countdownInterval) clearInterval(this.countdownInterval);
            if (this.refreshInterval) clearInterval(this.refreshInterval);
            if (this.elements.banner) this.elements.banner.remove();
            if (this.elements.modal) this.elements.modal.remove();
            if (this.elements.overlay) this.elements.overlay.remove();
            if (this.elements.counter) this.elements.counter.remove();
            document.body.classList.remove('seasonal-event-active');
        }
    };

    window.SeasonalEvent = SeasonalEvent;
})();
