(function() {
    var MODAL_ID = 'loyalty-store-modal';
    var OVERLAY_ID = 'loyalty-store-overlay';
    var BADGE_ID = 'loyalty-badge';
    var API_BASE = '/api/loyalty';

    var state = {
        currentBalance: 0,
        totalEarned: 0,
        lifetimeRedeemed: 0,
        rewards: [],
        transactions: [],
        isLoading: false
    };

    // API helper
    async function api(path, opts) {
        opts = opts || {};
        if (typeof apiRequest === 'function') return apiRequest(path, opts);
        var tokenKey = typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken';
        var token = localStorage.getItem(tokenKey);
        if (!token) return null;
        var res = await fetch(path, Object.assign({}, opts, {
            headers: Object.assign({ 'Content-Type': 'application/json' },
                token ? { Authorization: 'Bearer ' + token } : {},
                opts.headers || {})
        }));
        return res.json();
    }

    // Utility: DOM
    function $(selector) {
        return document.querySelector(selector);
    }

    function $$(selector) {
        return document.querySelectorAll(selector);
    }

    function createElement(tag, attrs, html) {
        var el = document.createElement(tag);
        if (attrs) {
            Object.keys(attrs).forEach(function(key) {
                if (key === 'class') {
                    el.className = attrs[key];
                } else if (key === 'style') {
                    Object.assign(el.style, attrs[key]);
                } else {
                    el.setAttribute(key, attrs[key]);
                }
            });
        }
        if (html) el.innerHTML = html;
        return el;
    }

    function formatNumber(num) {
        return String(num).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }

    // Create modal HTML structure
    function createModal() {
        var overlay = createElement('div', {
            id: OVERLAY_ID,
            class: 'loyalty-overlay',
            style: {
                position: 'fixed', top: '0', left: '0', right: '0', bottom: '0',
                backgroundColor: 'rgba(0,0,0,0.7)', zIndex: '9998',
                display: 'none'
            }
        });

        var modal = createElement('div', {
            id: MODAL_ID,
            class: 'loyalty-modal',
            style: {
                position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                backgroundColor: '#1a0f2e', color: '#fff', borderRadius: '12px',
                border: '2px solid #d4af37', maxHeight: '80vh', overflowY: 'auto',
                maxWidth: '900px', width: '95%', zIndex: '9999', display: 'none',
                boxShadow: '0 8px 32px rgba(212, 175, 55, 0.3)'
            }
        });

        modal.innerHTML = `
            <div style="padding: 20px; border-bottom: 1px solid #d4af37;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <h2 style="margin: 0; font-size: 1.8em;">⭐ LOYALTY REWARDS</h2>
                    <button id="loyalty-close-btn" style="background: none; border: none; color: #d4af37; font-size: 1.5em; cursor: pointer;">×</button>
                </div>
                <div style="font-size: 1.2em; color: #d4af37;">Balance: <span id="loyalty-balance">0</span> points</div>
            </div>

            <div style="padding: 20px;">
                <div style="margin-bottom: 30px;">
                    <h3 style="margin-top: 0; color: #d4af37;">Available Rewards</h3>
                    <div id="loyalty-rewards-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 15px;">
                        <!-- Rewards will be populated here -->
                    </div>
                </div>

                <div style="margin-bottom: 20px; padding: 15px; background: rgba(212, 175, 55, 0.1); border-radius: 8px; border-left: 4px solid #d4af37;">
                    <h4 style="margin: 0 0 8px 0; color: #d4af37;">How to Earn Points</h4>
                    <p style="margin: 0; color: #ccc;">Earn 1 point per 10 gems wagered on slots.</p>
                </div>

                <div>
                    <h3 style="margin-top: 0; color: #d4af37;">Recent Transactions</h3>
                    <div id="loyalty-history" style="max-height: 300px; overflow-y: auto; background: rgba(0,0,0,0.3); border-radius: 8px; padding: 10px;">
                        <!-- History will be populated here -->
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        document.body.appendChild(modal);

        $(('#' + 'loyalty-close-btn')).addEventListener('click', function() { closeStore(); });
        $(('#' + OVERLAY_ID)).addEventListener('click', function() { closeStore(); });
    }

    // Create badge HTML
    function createBadge() {
        var badge = createElement('div', {
            id: BADGE_ID,
            class: 'loyalty-badge',
            style: {
                position: 'fixed', top: '20px', right: '20px', zIndex: '9997',
                backgroundColor: '#d4af37', color: '#000', padding: '10px 15px',
                borderRadius: '20px', fontWeight: 'bold', cursor: 'pointer',
                fontSize: '1em', boxShadow: '0 4px 12px rgba(212, 175, 55, 0.4)',
                transition: 'all 0.3s ease', userSelect: 'none'
            }
        }, '⭐ 0');

        badge.addEventListener('click', function() { showStore(); });
        document.body.appendChild(badge);
    }

    // Update badge display
    function updateBadge() {
        var badge = $(('#' + BADGE_ID));
        if (badge) {
            badge.textContent = '⭐ ' + formatNumber(state.currentBalance);
            if (state.currentBalance > 0) {
                badge.style.animation = 'pulse 2s infinite';
            }
        }
    }

    // Load balance from API
    async function loadBalance() {
        try {
            var data = await api(API_BASE + '/balance', { method: 'GET' });
            if (data && !data.error) {
                state.currentBalance = data.currentBalance || 0;
                state.totalEarned = data.totalEarned || 0;
                state.lifetimeRedeemed = data.lifetimeRedeemed || 0;
                updateBadge();
            }
        } catch(e) {
            console.warn('[LoyaltyStore] loadBalance error:', e);
        }
    }

    // Load store catalog
    async function loadStore() {
        try {
            var data = await api(API_BASE + '/store', { method: 'GET' });
            if (data && data.rewards) {
                state.rewards = data.rewards;
                renderRewards();
            }
        } catch(e) {
            console.warn('[LoyaltyStore] loadStore error:', e);
        }
    }

    // Load history
    async function loadHistory() {
        try {
            var data = await api(API_BASE + '/history', { method: 'GET' });
            if (data && data.transactions) {
                state.transactions = data.transactions;
                renderHistory();
            }
        } catch(e) {
            console.warn('[LoyaltyStore] loadHistory error:', e);
        }
    }

    // Render reward cards
    function renderRewards() {
        var grid = $(('#' + 'loyalty-rewards-grid'));
        if (!grid) return;
        grid.innerHTML = '';

        state.rewards.forEach(function(reward) {
            var isAffordable = reward.isAffordable;
            var card = createElement('div', {
                class: 'loyalty-reward-card',
                style: {
                    padding: '15px', border: '1px solid #d4af37', borderRadius: '8px',
                    backgroundColor: isAffordable ? 'rgba(212, 175, 55, 0.1)' : 'rgba(100, 100, 100, 0.2)',
                    opacity: isAffordable ? '1' : '0.6', cursor: isAffordable ? 'pointer' : 'not-allowed',
                    transition: 'all 0.2s ease'
                }
            });

            card.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px;">
                    <div>
                        <h4 style="margin: 0 0 4px 0; color: #d4af37; font-size: 1.1em;">${reward.name}</h4>
                        <p style="margin: 0; color: #ccc; font-size: 0.9em;">${reward.description}</p>
                    </div>
                    ${reward.rewardType === 'mystery' ? '<div style="font-size: 2em; animation: spin 2s infinite;">✨</div>' : ''}
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(212, 175, 55, 0.3); padding-top: 10px; margin-top: 10px;">
                    <span style="color: #d4af37; font-weight: bold;">${formatNumber(reward.pointsCost)} pts</span>
                    <button class="loyalty-redeem-btn" data-reward-id="${reward.id}" style="padding: 8px 12px; background: ${isAffordable ? '#d4af37' : '#666'}; color: ${isAffordable ? '#000' : '#999'}; border: none; border-radius: 4px; cursor: ${isAffordable ? 'pointer' : 'not-allowed'}; font-weight: bold; transition: all 0.2s ease;">
                        ${isAffordable ? 'REDEEM' : 'UNAVAILABLE'}
                    </button>
                </div>
            `;

            if (isAffordable) {
                var btn = card.querySelector('.loyalty-redeem-btn');
                btn.addEventListener('click', function() { redeemReward(reward.id); });
                card.addEventListener('mouseenter', function() {
                    card.style.borderColor = '#fff';
                    card.style.backgroundColor = 'rgba(212, 175, 55, 0.2)';
                });
                card.addEventListener('mouseleave', function() {
                    card.style.borderColor = '#d4af37';
                    card.style.backgroundColor = 'rgba(212, 175, 55, 0.1)';
                });
            }

            grid.appendChild(card);
        });
    }

    // Render transaction history
    function renderHistory() {
        var historyDiv = $(('#' + 'loyalty-history'));
        if (!historyDiv) return;

        if (!state.transactions || state.transactions.length === 0) {
            historyDiv.innerHTML = '<p style="text-align: center; color: #999; margin: 0;">No transactions yet</p>';
            return;
        }

        var html = '';
        state.transactions.slice(0, 10).forEach(function(txn) {
            var symbol = txn.type === 'earn' ? '+' : '';
            var color = txn.type === 'earn' ? '#4ade80' : '#ff6b6b';
            var dateObj = new Date(txn.created_at);
            var timeStr = dateObj.toLocaleString();

            html += `
                <div style="padding: 8px; border-bottom: 1px solid rgba(212, 175, 55, 0.1); display: flex; justify-content: space-between;">
                    <div style="flex: 1;">
                        <div style="color: #d4af37; font-size: 0.9em;">${txn.description || 'Transaction'}</div>
                        <div style="color: #999; font-size: 0.8em;">${timeStr}</div>
                    </div>
                    <div style="color: ${color}; font-weight: bold; white-space: nowrap; margin-left: 10px;">${symbol}${formatNumber(txn.amount)}</div>
                </div>
            `;
        });

        historyDiv.innerHTML = html;
    }

    // Redeem a reward
    async function redeemReward(rewardId) {
        if (state.isLoading) return;
        state.isLoading = true;

        try {
            var data = await api(API_BASE + '/redeem', {
                method: 'POST',
                body: JSON.stringify({ rewardId: rewardId })
            });

            if (data && data.success) {
                state.currentBalance = data.newBalance;
                updateBadge();
                showNotification('Reward redeemed! Check your inbox.', 'success');
                setTimeout(function() { loadStore(); loadHistory(); }, 500);
            } else {
                showNotification(data.error || 'Failed to redeem reward', 'error');
            }
        } catch(e) {
            console.warn('[LoyaltyStore] redeemReward error:', e);
            showNotification('Error redeeming reward', 'error');
        }

        state.isLoading = false;
    }

    // Notification toast
    function showNotification(message, type) {
        type = type || 'success';
        var toast = createElement('div', {
            style: {
                position: 'fixed', bottom: '20px', right: '20px',
                backgroundColor: type === 'success' ? '#4ade80' : '#ff6b6b',
                color: '#fff', padding: '12px 20px', borderRadius: '6px',
                fontWeight: 'bold', zIndex: '10001', animation: 'slideIn 0.3s ease-out',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
            }
        }, message);

        document.body.appendChild(toast);
        setTimeout(function() { toast.remove(); }, 3000);
    }

    // Public API
    var PublicAPI = {
        init: function() {
            if ($(('#' + MODAL_ID))) return;
            createBadge();
            createModal();
            loadBalance();
            setInterval(function() { loadBalance(); }, 30000);
        },

        showStore: function() {
            showStore();
        },

        closeStore: function() {
            closeStore();
        },

        earnPoints: function(betAmount) {
            if (betAmount <= 0) return;
            api(API_BASE + '/earn', {
                method: 'POST',
                body: JSON.stringify({ betAmount: betAmount })
            }).catch(function(e) {
                console.warn('[LoyaltyStore] earnPoints error:', e);
            });
        }
    };

    function showStore() {
        var modal = $(('#' + MODAL_ID));
        var overlay = $(('#' + OVERLAY_ID));
        if (!modal) return;

        loadBalance();
        loadStore();
        loadHistory();

        modal.style.display = 'block';
        overlay.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }

    function closeStore() {
        var modal = $(('#' + MODAL_ID));
        var overlay = $(('#' + OVERLAY_ID));
        if (!modal) return;

        modal.style.display = 'none';
        overlay.style.display = 'none';
        document.body.style.overflow = '';
    }

    // CSS animations
    var style = document.createElement('style');
    style.textContent = `
        @keyframes pulse {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.05); opacity: 0.8; }
        }
        @keyframes slideIn {
            from { transform: translateX(400px); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        .loyalty-badge:hover {
            background-color: #ffd700;
            transform: scale(1.1);
        }
    `;
    document.head.appendChild(style);

    window.LoyaltyStore = PublicAPI;
})();
