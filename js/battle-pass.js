(function() {
    'use strict';

    var THEME = {
        darkBg: '#0a0a1a',
        goldAccent: '#d4af37',
        darkOverlay: 'rgba(0, 0, 0, 0.95)',
        cardBg: 'rgba(20, 15, 40, 0.9)',
        borderColor: '#d4af37',
        textColor: '#ffffff',
        mutedText: '#b0b0b0',
        successGreen: '#22c55e',
        lockedGrey: '#4a4a4a'
    };

    var MAX_LEVELS = 30;
    var SEASON_NAME = 'SEASON 1: MATRIX RISING';
    var SEASON_DAYS = 60;

    var state = {
        passData: null,
        userLevel: 1,
        userXP: 0,
        userTier: 'FREE',
        csrfToken: null,
        passExists: false,
        isLoading: false,
        selectedNode: null,
        xpData: []
    };

    // ─────────────────────────────────────────────────────
    // API HELPER
    // ─────────────────────────────────────────────────────
    async function api(path, opts) {
        opts = opts || {};
        if (typeof apiRequest === 'function') return apiRequest(path, opts);
        var tokenKey = typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken';
        var token = localStorage.getItem(tokenKey);
        if (!token) return null;
        var headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = 'Bearer ' + token;
        if (opts.headers) Object.assign(headers, opts.headers);
        var res = await fetch(path, Object.assign({}, opts, { headers: headers }));
        return res.json();
    }

    function getCSRFToken() {
        return api('/api/csrf-token').then(function(data) {
            if (data && data.token) {
                state.csrfToken = data.token;
                return data.token;
            }
            return null;
        });
    }

    // ─────────────────────────────────────────────────────
    // INJECT STYLES
    // ─────────────────────────────────────────────────────
    function injectStyles() {
        if (document.getElementById('battle-pass-styles')) return;

        var style = document.createElement('style');
        style.id = 'battle-pass-styles';
        style.textContent = `
            @keyframes bpFabPulse {
                0% { box-shadow: 0 0 15px rgba(212, 175, 55, 0.4), inset 0 0 10px rgba(212, 175, 55, 0.1); }
                50% { box-shadow: 0 0 30px rgba(212, 175, 55, 0.8), inset 0 0 15px rgba(212, 175, 55, 0.2); }
                100% { box-shadow: 0 0 15px rgba(212, 175, 55, 0.4), inset 0 0 10px rgba(212, 175, 55, 0.1); }
            }

            @keyframes bpSlideIn {
                0% { opacity: 0; transform: scale(0.95) translateY(20px); }
                100% { opacity: 1; transform: scale(1) translateY(0); }
            }

            @keyframes bpGlow {
                0%, 100% { text-shadow: 0 0 10px rgba(212, 175, 55, 0.5); }
                50% { text-shadow: 0 0 20px rgba(212, 175, 55, 1); }
            }

            @keyframes bpNodePulse {
                0%, 100% { box-shadow: 0 0 10px rgba(212, 175, 55, 0.3); }
                50% { box-shadow: 0 0 20px rgba(212, 175, 55, 0.7); }
            }

            @keyframes bpShimmer {
                0% { background-position: -1000px 0; }
                100% { background-position: 1000px 0; }
            }

            #battle-pass-fab {
                position: fixed;
                bottom: 160px;
                right: 20px;
                width: 64px;
                height: 64px;
                border-radius: 50%;
                background: linear-gradient(135deg, rgba(212, 175, 55, 0.2), rgba(212, 175, 55, 0.05));
                border: 2px solid #d4af37;
                color: #d4af37;
                font-size: 32px;
                cursor: pointer;
                display: none;
                align-items: center;
                justify-content: center;
                z-index: 9998;
                animation: bpFabPulse 2s ease-in-out infinite;
                box-shadow: 0 0 15px rgba(212, 175, 55, 0.4), inset 0 0 10px rgba(212, 175, 55, 0.1);
                transition: all 0.3s ease;
            }

            #battle-pass-fab:hover {
                transform: scale(1.1);
                box-shadow: 0 0 40px rgba(212, 175, 55, 0.8), inset 0 0 15px rgba(212, 175, 55, 0.2);
            }

            #battle-pass-fab .level-badge {
                position: absolute;
                top: -8px;
                right: -8px;
                background: #d4af37;
                color: #0a0a1a;
                border-radius: 50%;
                width: 28px;
                height: 28px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 12px;
                font-weight: bold;
                border: 2px solid #0a0a1a;
            }

            #battle-pass-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.8);
                display: none;
                z-index: 9999;
                animation: fadeIn 0.3s ease;
            }

            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }

            #battle-pass-modal {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 90%;
                max-width: 1200px;
                max-height: 90vh;
                background: #0a0a1a;
                border: 2px solid #d4af37;
                border-radius: 12px;
                display: none;
                flex-direction: column;
                z-index: 10000;
                box-shadow: 0 0 80px rgba(212, 175, 55, 0.3);
                animation: bpSlideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
                overflow: hidden;
            }

            #battle-pass-modal.show {
                display: flex;
            }

            .bp-header {
                background: linear-gradient(135deg, rgba(212, 175, 55, 0.15), rgba(212, 175, 55, 0.05));
                border-bottom: 2px solid #d4af37;
                padding: 24px;
                color: #d4af37;
                font-size: 28px;
                font-weight: bold;
                text-transform: uppercase;
                letter-spacing: 3px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                animation: bpGlow 2s ease-in-out infinite;
            }

            .bp-countdown {
                font-size: 14px;
                color: #b0b0b0;
                letter-spacing: 1px;
                font-weight: normal;
                text-transform: none;
            }

            .bp-content {
                display: flex;
                flex: 1;
                overflow: hidden;
                gap: 20px;
                padding: 20px;
            }

            .bp-main {
                flex: 1;
                display: flex;
                flex-direction: column;
                gap: 20px;
                overflow-y: auto;
            }

            .bp-sidebar {
                width: 240px;
                background: rgba(212, 175, 55, 0.05);
                border: 1px solid #d4af37;
                border-radius: 8px;
                padding: 16px;
                color: #b0b0b0;
                font-size: 13px;
            }

            .bp-tier-badge {
                background: linear-gradient(135deg, #d4af37, #b8860b);
                border-radius: 8px;
                padding: 16px;
                text-align: center;
                margin-bottom: 16px;
                color: #0a0a1a;
                font-weight: bold;
                font-size: 16px;
                text-transform: uppercase;
                letter-spacing: 2px;
            }

            .bp-tier-free {
                background: linear-gradient(135deg, rgba(150, 150, 150, 0.3), rgba(100, 100, 100, 0.2));
                border: 1px solid #808080;
                color: #b0b0b0;
            }

            .bp-tier-premium {
                background: linear-gradient(135deg, rgba(212, 175, 55, 0.3), rgba(180, 140, 10, 0.2));
                border: 1px solid #d4af37;
                color: #d4af37;
            }

            .bp-tier-elite {
                background: linear-gradient(135deg, rgba(147, 112, 219, 0.3), rgba(75, 0, 130, 0.2));
                border: 1px solid #9370db;
                color: #9370db;
            }

            .bp-stat-item {
                padding: 12px 0;
                border-bottom: 1px solid rgba(212, 175, 55, 0.2);
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .bp-stat-label {
                color: #b0b0b0;
                font-size: 12px;
            }

            .bp-stat-value {
                color: #d4af37;
                font-weight: bold;
                font-size: 14px;
            }

            .bp-xp-section {
                background: rgba(212, 175, 55, 0.05);
                border: 1px solid #d4af37;
                border-radius: 8px;
                padding: 16px;
            }

            .bp-xp-label {
                color: #b0b0b0;
                font-size: 12px;
                margin-bottom: 8px;
                text-transform: uppercase;
                letter-spacing: 1px;
            }

            .bp-xp-bar {
                width: 100%;
                height: 16px;
                background: rgba(0, 0, 0, 0.4);
                border: 1px solid #d4af37;
                border-radius: 8px;
                overflow: hidden;
                margin-bottom: 8px;
            }

            .bp-xp-fill {
                height: 100%;
                background: linear-gradient(90deg, #22c55e, #16a34a);
                border-right: 2px solid #22c55e;
                transition: width 0.6s ease;
            }

            .bp-xp-text {
                color: #b0b0b0;
                font-size: 12px;
                text-align: center;
            }

            .bp-track-container {
                background: rgba(0, 0, 0, 0.3);
                border: 1px solid #d4af37;
                border-radius: 8px;
                padding: 20px;
                overflow-x: auto;
                overflow-y: hidden;
            }

            .bp-track {
                display: flex;
                gap: 12px;
                min-width: max-content;
                padding: 10px 0;
            }

            .bp-node {
                flex-shrink: 0;
                width: 80px;
                height: 120px;
                background: rgba(212, 175, 55, 0.08);
                border: 2px solid #4a4a4a;
                border-radius: 8px;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                position: relative;
                transition: all 0.3s ease;
                color: #4a4a4a;
            }

            .bp-node:hover {
                transform: translateY(-5px);
                border-color: #6a6a6a;
            }

            .bp-node.locked {
                border-color: #4a4a4a;
                color: #4a4a4a;
            }

            .bp-node.unlocked {
                border-color: #d4af37;
                background: rgba(212, 175, 55, 0.15);
                color: #d4af37;
            }

            .bp-node.claimed {
                border-color: #22c55e;
                background: rgba(34, 197, 94, 0.15);
                color: #22c55e;
            }

            .bp-node.current {
                border-color: #d4af37;
                background: rgba(212, 175, 55, 0.3);
                animation: bpNodePulse 1.5s ease-in-out infinite;
                box-shadow: 0 0 20px rgba(212, 175, 55, 0.5);
            }

            .bp-node-level {
                font-size: 14px;
                font-weight: bold;
                margin-bottom: 4px;
            }

            .bp-node-icon {
                font-size: 24px;
                margin-bottom: 4px;
            }

            .bp-node-label {
                font-size: 10px;
                text-align: center;
                line-height: 1.2;
            }

            .bp-node.premium .bp-node-icon::after {
                content: ' ⭐';
                font-size: 12px;
            }

            .bp-node.elite .bp-node-icon::after {
                content: ' 💎';
                font-size: 12px;
            }

            .bp-purchase-section {
                background: linear-gradient(135deg, rgba(212, 175, 55, 0.1), rgba(212, 175, 55, 0.05));
                border: 2px solid #d4af37;
                border-radius: 8px;
                padding: 20px;
                margin-top: 20px;
            }

            .bp-purchase-title {
                color: #d4af37;
                font-size: 18px;
                font-weight: bold;
                margin-bottom: 16px;
                text-transform: uppercase;
                letter-spacing: 2px;
            }

            .bp-purchase-cards {
                display: flex;
                gap: 16px;
                justify-content: space-around;
            }

            .bp-card {
                background: rgba(20, 15, 40, 0.8);
                border: 2px solid #d4af37;
                border-radius: 8px;
                padding: 16px;
                flex: 1;
                max-width: 250px;
                text-align: center;
                position: relative;
            }

            .bp-card.elite {
                border-color: #9370db;
                background: rgba(147, 112, 219, 0.1);
            }

            .bp-best-value {
                position: absolute;
                top: -12px;
                left: 50%;
                transform: translateX(-50%);
                background: #d4af37;
                color: #0a0a1a;
                padding: 4px 12px;
                border-radius: 12px;
                font-size: 12px;
                font-weight: bold;
                letter-spacing: 1px;
            }

            .bp-card-title {
                color: #d4af37;
                font-size: 16px;
                font-weight: bold;
                margin-bottom: 8px;
                text-transform: uppercase;
            }

            .bp-card.elite .bp-card-title {
                color: #9370db;
            }

            .bp-card-price {
                font-size: 24px;
                font-weight: bold;
                color: #22c55e;
                margin-bottom: 12px;
            }

            .bp-card-rewards {
                text-align: left;
                margin-bottom: 12px;
                color: #b0b0b0;
                font-size: 12px;
            }

            .bp-card-rewards li {
                margin: 4px 0;
                list-style: none;
                padding-left: 16px;
            }

            .bp-card-rewards li::before {
                content: '✓ ';
                color: #22c55e;
                font-weight: bold;
                margin-left: -12px;
            }

            .bp-btn {
                background: linear-gradient(135deg, #d4af37, #b8860b);
                border: none;
                color: #0a0a1a;
                padding: 12px 24px;
                border-radius: 6px;
                font-weight: bold;
                font-size: 14px;
                cursor: pointer;
                text-transform: uppercase;
                letter-spacing: 1px;
                transition: all 0.3s ease;
            }

            .bp-btn:hover {
                transform: scale(1.05);
                box-shadow: 0 0 20px rgba(212, 175, 55, 0.6);
            }

            .bp-btn-small {
                padding: 8px 16px;
                font-size: 12px;
            }

            .bp-close-btn {
                position: absolute;
                top: 20px;
                right: 20px;
                background: transparent;
                border: 2px solid #d4af37;
                color: #d4af37;
                width: 40px;
                height: 40px;
                border-radius: 50%;
                font-size: 20px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.3s ease;
            }

            .bp-close-btn:hover {
                background: #d4af37;
                color: #0a0a1a;
            }

            .bp-reward-detail {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: #0a0a1a;
                border: 2px solid #d4af37;
                border-radius: 12px;
                padding: 24px;
                max-width: 400px;
                width: 90%;
                z-index: 10001;
                display: none;
                flex-direction: column;
                gap: 16px;
                animation: bpSlideIn 0.4s ease;
            }

            .bp-reward-detail.show {
                display: flex;
            }

            .bp-reward-icon {
                font-size: 48px;
                text-align: center;
            }

            .bp-reward-name {
                color: #d4af37;
                font-size: 18px;
                font-weight: bold;
                text-align: center;
            }

            .bp-reward-description {
                color: #b0b0b0;
                font-size: 14px;
                text-align: center;
            }

            .bp-modal-footer {
                display: flex;
                gap: 12px;
                justify-content: center;
            }

            .bp-loading {
                color: #d4af37;
                text-align: center;
                padding: 40px;
                font-size: 16px;
            }

            /* Scrollbar styling */
            .bp-main::-webkit-scrollbar,
            .bp-track-container::-webkit-scrollbar {
                width: 8px;
                height: 8px;
            }

            .bp-main::-webkit-scrollbar-track,
            .bp-track-container::-webkit-scrollbar-track {
                background: rgba(212, 175, 55, 0.05);
            }

            .bp-main::-webkit-scrollbar-thumb,
            .bp-track-container::-webkit-scrollbar-thumb {
                background: #d4af37;
                border-radius: 4px;
            }

            .bp-main::-webkit-scrollbar-thumb:hover,
            .bp-track-container::-webkit-scrollbar-thumb:hover {
                background: #b8860b;
            }
        `;
        document.head.appendChild(style);
    }

    // ─────────────────────────────────────────────────────
    // CREATE DOM ELEMENTS
    // ─────────────────────────────────────────────────────
    function createFAB() {
        var fab = document.createElement('div');
        fab.id = 'battle-pass-fab';
        fab.title = 'Battle Pass';

        var icon = document.createElement('div');
        icon.style.cssText = 'display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;';
        icon.textContent = '⚔️';

        fab.appendChild(icon);

        var badge = document.createElement('div');
        badge.className = 'level-badge';
        badge.textContent = state.userLevel;
        fab.appendChild(badge);

        fab.onclick = function(e) {
            e.stopPropagation();
            showModal();
        };

        document.body.appendChild(fab);
        return fab;
    }

    function createOverlay() {
        var overlay = document.createElement('div');
        overlay.id = 'battle-pass-overlay';
        overlay.onclick = function() {
            closeModal();
        };
        document.body.appendChild(overlay);
        return overlay;
    }

    function createModal() {
        var modal = document.createElement('div');
        modal.id = 'battle-pass-modal';

        // Close button
        var closeBtn = document.createElement('button');
        closeBtn.className = 'bp-close-btn';
        closeBtn.textContent = '✕';
        closeBtn.onclick = closeModal;
        modal.appendChild(closeBtn);

        // Header
        var header = document.createElement('div');
        header.className = 'bp-header';
        var titleSpan = document.createElement('span');
        titleSpan.textContent = SEASON_NAME;
        header.appendChild(titleSpan);
        var countdown = document.createElement('div');
        countdown.className = 'bp-countdown';
        countdown.id = 'bp-countdown';
        countdown.textContent = 'Days remaining: 60';
        header.appendChild(countdown);
        modal.appendChild(header);

        // Content wrapper
        var content = document.createElement('div');
        content.className = 'bp-content';

        // Main section
        var main = document.createElement('div');
        main.className = 'bp-main';

        // XP progress
        var xpSection = document.createElement('div');
        xpSection.className = 'bp-xp-section';

        var xpLabel = document.createElement('div');
        xpLabel.className = 'bp-xp-label';
        xpLabel.textContent = 'Current Level Progress';
        xpSection.appendChild(xpLabel);

        var xpBar = document.createElement('div');
        xpBar.className = 'bp-xp-bar';
        var xpFill = document.createElement('div');
        xpFill.className = 'bp-xp-fill';
        xpFill.id = 'bp-xp-fill';
        xpFill.style.width = '45%';
        xpBar.appendChild(xpFill);
        xpSection.appendChild(xpBar);

        var xpText = document.createElement('div');
        xpText.className = 'bp-xp-text';
        xpText.id = 'bp-xp-text';
        xpText.textContent = '2500 / 5000 XP';
        xpSection.appendChild(xpText);

        main.appendChild(xpSection);

        // Reward track
        var trackContainer = document.createElement('div');
        trackContainer.className = 'bp-track-container';
        var track = document.createElement('div');
        track.className = 'bp-track';
        track.id = 'bp-track';

        // Create 30 level nodes
        for (var i = 1; i <= MAX_LEVELS; i++) {
            var node = createNode(i);
            track.appendChild(node);
        }

        trackContainer.appendChild(track);
        main.appendChild(trackContainer);

        // Purchase section (hidden by default, shown if free tier)
        var purchaseSection = document.createElement('div');
        purchaseSection.className = 'bp-purchase-section';
        purchaseSection.id = 'bp-purchase-section';
        purchaseSection.style.display = 'none';

        var purchaseTitle = document.createElement('div');
        purchaseTitle.className = 'bp-purchase-title';
        purchaseTitle.textContent = '⬆️ Upgrade Your Pass';
        purchaseSection.appendChild(purchaseTitle);

        var cardsContainer = document.createElement('div');
        cardsContainer.className = 'bp-purchase-cards';

        // Premium card
        var premiumCard = document.createElement('div');
        premiumCard.className = 'bp-card';
        premiumCard.innerHTML = `
            <div class="bp-card-title">Premium</div>
            <div class="bp-card-price">999 💎</div>
            <ul class="bp-card-rewards">
                <li>All free rewards</li>
                <li>Exclusive cosmetics</li>
                <li>+50% XP bonus</li>
                <li>Premium emotes</li>
            </ul>
            <button class="bp-btn bp-btn-small" onclick="window.BattlePass.purchasePass('premium')">Upgrade</button>
        `;
        cardsContainer.appendChild(premiumCard);

        // Elite card
        var eliteCard = document.createElement('div');
        eliteCard.className = 'bp-card elite';
        var bestValue = document.createElement('div');
        bestValue.className = 'bp-best-value';
        bestValue.textContent = 'BEST VALUE';
        eliteCard.appendChild(bestValue);
        eliteCard.innerHTML += `
            <div class="bp-card-title">Elite</div>
            <div class="bp-card-price">2499 💎</div>
            <ul class="bp-card-rewards">
                <li>All premium rewards</li>
                <li>Legendary cosmetics</li>
                <li>+100% XP bonus</li>
                <li>VIP chat badge</li>
                <li>Custom avatar frame</li>
            </ul>
            <button class="bp-btn bp-btn-small" onclick="window.BattlePass.purchasePass('elite')">Upgrade</button>
        `;
        cardsContainer.appendChild(eliteCard);

        purchaseSection.appendChild(cardsContainer);
        main.appendChild(purchaseSection);

        content.appendChild(main);

        // Sidebar
        var sidebar = document.createElement('div');
        sidebar.className = 'bp-sidebar';

        // Tier badge
        var tierBadge = document.createElement('div');
        tierBadge.className = 'bp-tier-badge bp-tier-free';
        tierBadge.id = 'bp-tier-badge';
        tierBadge.textContent = 'FREE';
        sidebar.appendChild(tierBadge);

        // Stats
        var stats = [
            { label: 'Current Level', value: 'bp-stat-level', text: '1' },
            { label: 'Total XP', value: 'bp-stat-total-xp', text: '2500' },
            { label: 'Rewards Claimed', value: 'bp-stat-rewards', text: '1' },
            { label: 'Days Remaining', value: 'bp-stat-days', text: '60' },
            { label: 'XP to Next Level', value: 'bp-stat-next-xp', text: '2500' }
        ];

        stats.forEach(function(stat) {
            var item = document.createElement('div');
            item.className = 'bp-stat-item';
            var label = document.createElement('div');
            label.className = 'bp-stat-label';
            label.textContent = stat.label;
            var value = document.createElement('div');
            value.className = 'bp-stat-value';
            value.id = stat.value;
            value.textContent = stat.text;
            item.appendChild(label);
            item.appendChild(value);
            sidebar.appendChild(item);
        });

        content.appendChild(sidebar);
        modal.appendChild(content);

        document.body.appendChild(modal);
        return modal;
    }

    function createNode(level) {
        var node = document.createElement('div');
        node.className = 'bp-node locked';
        node.id = 'bp-node-' + level;

        var icon = document.createElement('div');
        icon.className = 'bp-node-icon';
        var icons = ['💰', '🎁', '⭐', '🔮', '🎲', '👑', '🏆', '💎', '🌟', '🎊'];
        icon.textContent = icons[(level - 1) % icons.length];
        node.appendChild(icon);

        var levelText = document.createElement('div');
        levelText.className = 'bp-node-level';
        levelText.textContent = 'Lvl ' + level;
        node.appendChild(levelText);

        var label = document.createElement('div');
        label.className = 'bp-node-label';
        label.textContent = level % 3 === 0 ? 'Elite' : (level % 2 === 0 ? 'Premium' : 'Free');
        node.appendChild(label);

        node.onclick = function(e) {
            e.stopPropagation();
            showRewardDetail(level);
        };

        return node;
    }

    // ─────────────────────────────────────────────────────
    // MODAL CONTROLS
    // ─────────────────────────────────────────────────────
    function showModal() {
        var modal = document.getElementById('battle-pass-modal');
        var overlay = document.getElementById('battle-pass-overlay');
        if (modal) modal.classList.add('show');
        if (overlay) overlay.style.display = 'block';
        updateModalData();
    }

    function closeModal() {
        var modal = document.getElementById('battle-pass-modal');
        var overlay = document.getElementById('battle-pass-overlay');
        if (modal) modal.classList.remove('show');
        if (overlay) overlay.style.display = 'none';
        closeRewardDetail();
    }

    function showRewardDetail(level) {
        var detail = document.getElementById('bp-reward-detail');
        if (!detail) {
            detail = document.createElement('div');
            detail.id = 'bp-reward-detail';
            detail.className = 'bp-reward-detail';
            document.body.appendChild(detail);
        }

        var icons = ['💰', '🎁', '⭐', '🔮', '🎲', '👑', '🏆', '💎', '🌟', '🎊'];
        var icon = icons[(level - 1) % icons.length];

        detail.innerHTML = `
            <button class="bp-close-btn" onclick="window.BattlePass.closeRewardDetail()">✕</button>
            <div class="bp-reward-icon">${icon}</div>
            <div class="bp-reward-name">Level ${level} Reward</div>
            <div class="bp-reward-description">
                ${level % 3 === 0 ? '⭐ Elite exclusive item: Premium cosmetic reward' : (level % 2 === 0 ? '💎 Premium item: Unlock with pass upgrade' : '✨ Free reward: Available to all pass holders')}
            </div>
            <div class="bp-modal-footer">
                ${level <= state.userLevel ? '<button class="bp-btn">Claim Reward</button>' : '<button class="bp-btn" disabled>Locked</button>'}
            </div>
        `;

        detail.classList.add('show');
    }

    function closeRewardDetail() {
        var detail = document.getElementById('bp-reward-detail');
        if (detail) detail.classList.remove('show');
    }

    // ─────────────────────────────────────────────────────
    // UPDATE UI DATA
    // ─────────────────────────────────────────────────────
    function updateModalData() {
        // Update countdown
        var countdownEl = document.getElementById('bp-countdown');
        if (countdownEl) {
            countdownEl.textContent = 'Days remaining: ' + SEASON_DAYS;
        }

        // Update tier badge
        var tierBadge = document.getElementById('bp-tier-badge');
        if (tierBadge) {
            tierBadge.className = 'bp-tier-badge bp-tier-' + state.userTier.toLowerCase();
            tierBadge.textContent = state.userTier;
            if (state.userTier === 'ELITE') tierBadge.textContent += ' 💎';
            else if (state.userTier === 'PREMIUM') tierBadge.textContent += ' ⭐';
        }

        // Update stats
        document.getElementById('bp-stat-level').textContent = state.userLevel;
        document.getElementById('bp-stat-total-xp').textContent = state.userXP.toLocaleString();
        document.getElementById('bp-stat-rewards').textContent = Math.floor(state.userLevel / 2);
        document.getElementById('bp-stat-days').textContent = SEASON_DAYS;
        var xpToNext = (5000 * state.userLevel) - state.userXP;
        document.getElementById('bp-stat-next-xp').textContent = Math.max(0, xpToNext);

        // Update XP bar
        var xpPercent = (state.userXP % 5000) / 5000 * 100;
        var xpFill = document.getElementById('bp-xp-fill');
        if (xpFill) xpFill.style.width = xpPercent + '%';

        var xpText = document.getElementById('bp-xp-text');
        if (xpText) {
            var levelXP = state.userXP % 5000;
            xpText.textContent = levelXP.toLocaleString() + ' / 5000 XP';
        }

        // Update nodes
        updateNodeStates();

        // Show/hide purchase section
        var purchaseSection = document.getElementById('bp-purchase-section');
        if (purchaseSection) {
            purchaseSection.style.display = state.userTier === 'FREE' ? 'block' : 'none';
        }
    }

    function updateNodeStates() {
        for (var i = 1; i <= MAX_LEVELS; i++) {
            var node = document.getElementById('bp-node-' + i);
            if (!node) continue;

            node.className = 'bp-node';

            // Determine tier type
            if (i % 3 === 0) {
                node.classList.add('elite');
            } else if (i % 2 === 0) {
                node.classList.add('premium');
            }

            // Determine state
            if (i < state.userLevel) {
                node.classList.add('claimed');
            } else if (i === state.userLevel) {
                node.classList.add('current');
            } else {
                node.classList.add('locked');
            }

            // Lock premium/elite nodes if user doesn't have pass
            if (state.userTier === 'FREE') {
                if (i % 2 === 0 || i % 3 === 0) {
                    node.classList.add('locked');
                }
            }
            if (state.userTier === 'PREMIUM') {
                if (i % 3 === 0) {
                    node.classList.add('locked');
                }
            }
        }
    }

    function updateFAB() {
        var fab = document.getElementById('battle-pass-fab');
        if (!fab) return;

        var badge = fab.querySelector('.level-badge');
        if (badge) badge.textContent = state.userLevel;

        fab.style.display = state.passExists ? 'flex' : 'none';
    }

    // ─────────────────────────────────────────────────────
    // FETCH PASS DATA
    // ─────────────────────────────────────────────────────
    async function fetchPassData() {
        try {
            state.isLoading = true;
            var data = await api('/api/battle-pass/');

            if (!data || !data.id) {
                state.passExists = false;
                return;
            }

            state.passExists = true;
            state.passData = data;
            state.userLevel = data.current_level || 1;
            state.userXP = data.current_xp || 0;
            state.userTier = (data.tier || 'FREE').toUpperCase();

            updateFAB();
            if (document.getElementById('battle-pass-modal')) {
                updateModalData();
            }
        } catch (err) {
            console.warn('BattlePass: Failed to fetch pass data', err);
            state.passExists = false;
        } finally {
            state.isLoading = false;
        }
    }

    // ─────────────────────────────────────────────────────
    // PUBLIC API
    // ─────────────────────────────────────────────────────
    var BattlePass = {
        init: function() {
            injectStyles();
            createOverlay();
            createModal();
            createFAB();
            fetchPassData();

            // Refresh data periodically
            setInterval(function() {
                fetchPassData();
            }, 30000);
        },

        showModal: function() {
            showModal();
        },

        closeModal: function() {
            closeModal();
        },

        showRewardDetail: function(level) {
            showRewardDetail(level);
        },

        closeRewardDetail: function() {
            closeRewardDetail();
        },

        purchasePass: function(tier) {
            if (!state.csrfToken) {
                getCSRFToken().then(function() {
                    performPurchase(tier);
                });
            } else {
                performPurchase(tier);
            }
        },

        refreshData: function() {
            fetchPassData();
        },

        addXp: function(xp, source) {
            // Fire-and-forget XP addition
            try {
                var tokenKey = typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken';
                var token = localStorage.getItem(tokenKey);
                if (!token || !state.passData) return;
                fetch('/api/battle-pass/add-xp', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + token,
                        'X-CSRF-Token': state.csrfToken || ''
                    },
                    body: JSON.stringify({ xp: xp, source: source || 'spin' })
                }).then(function(res) { return res.json(); }).then(function(data) {
                    if (data && data.new_level !== undefined) {
                        state.currentLevel = data.new_level;
                        state.currentXp = data.new_xp;
                        updateFAB();
                    }
                }).catch(function() {});
            } catch(e) { /* silent */ }
        }
    };

    async function performPurchase(tier) {
        try {
            var token = state.csrfToken || await getCSRFToken();
            var price = tier === 'premium' ? 999 : 2499;

            var result = await api('/api/battle-pass/purchase', {
                method: 'POST',
                body: JSON.stringify({ tier: tier }),
                headers: { 'X-CSRF-Token': token }
            });

            if (result && result.success) {
                state.userTier = tier.toUpperCase();
                updateModalData();
                updateFAB();
                alert('Pass upgraded to ' + tier.toUpperCase() + '!');
            } else {
                console.warn('BattlePass: Purchase failed', result);
                alert('Purchase failed. Please try again.');
            }
        } catch (err) {
            console.warn('BattlePass: Purchase error', err);
            alert('Error purchasing pass: ' + err.message);
        }
    }

    window.BattlePass = BattlePass;
})();
