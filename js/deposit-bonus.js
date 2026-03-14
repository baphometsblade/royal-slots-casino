// ═══════════════════════════════════════════════════════════════════════════
// DEPOSIT BONUS MATCHER MODULE
// Primary driver of actual deposits with match bonuses and first-deposit rewards
// ═══════════════════════════════════════════════════════════════════════════

(function() {
    'use strict';

    var API_BASE = '/api/deposit-bonus';
    var BANNER_ID = 'deposit-bonus-banner';
    var MODAL_ID = 'deposit-bonus-modal';
    var OVERLAY_ID = 'deposit-bonus-overlay';
    var TRACKER_ID = 'deposit-bonus-tracker';

    var state = {
        availableBonuses: [],
        activeBonuses: [],
        isShowing: false,
        selectedBonus: null,
        depositAmount: 0
    };

    // ────────────────────────────────────────────────────────────────────────
    // STYLES (embedded inline)
    // ────────────────────────────────────────────────────────────────────────

    var style = document.createElement('style');
    style.id = 'deposit-bonus-styles';
    style.textContent = `
        /* Floating deposit banner */
        #${BANNER_ID} {
            position: fixed;
            top: 70px;
            left: 0;
            right: 0;
            height: 60px;
            background: linear-gradient(90deg, #ffd700, #ffed4e, #ffd700);
            background-size: 200% 100%;
            animation: gradientShift 4s ease-in-out infinite;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 20px;
            z-index: 1000;
            box-shadow: 0 4px 15px rgba(255, 215, 0, 0.4);
            font-family: 'Inter', sans-serif;
        }

        @keyframes gradientShift {
            0%, 100% { background-position: 0% center; }
            50% { background-position: 100% center; }
        }

        .deposit-bonus-banner-content {
            display: flex;
            align-items: center;
            gap: 15px;
            flex: 1;
        }

        .deposit-bonus-banner-text {
            color: #000;
            font-weight: 700;
            font-size: 14px;
            letter-spacing: 0.5px;
        }

        .deposit-bonus-banner-emoji {
            font-size: 20px;
            display: inline-block;
        }

        .deposit-bonus-banner-btn {
            background: #1a1a2e;
            color: #ffd700;
            border: 2px solid #ffd700;
            padding: 8px 16px;
            border-radius: 6px;
            font-weight: 600;
            font-size: 12px;
            cursor: pointer;
            transition: all 0.2s;
        }

        .deposit-bonus-banner-btn:hover {
            background: #ffd700;
            color: #1a1a2e;
            transform: scale(1.05);
        }

        .deposit-bonus-banner-close {
            background: none;
            border: none;
            color: #1a1a2e;
            font-size: 24px;
            cursor: pointer;
            width: 30px;
            height: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: transform 0.2s;
        }

        .deposit-bonus-banner-close:hover {
            transform: scale(1.2);
        }

        /* Modal overlay */
        #${OVERLAY_ID} {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.85);
            display: none;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            font-family: 'Inter', sans-serif;
            animation: fadeIn 0.3s ease-in-out;
        }

        #${OVERLAY_ID}.show {
            display: flex;
        }

        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        /* Modal container */
        #${MODAL_ID} {
            background: linear-gradient(135deg, rgba(30, 15, 60, 0.98), rgba(50, 20, 80, 0.98));
            border: 3px solid #ffd700;
            border-radius: 25px;
            max-width: 700px;
            width: 95%;
            max-height: 90vh;
            padding: 40px 30px;
            position: relative;
            box-shadow:
                0 0 60px rgba(255, 215, 0, 0.4),
                inset 0 0 30px rgba(255, 215, 0, 0.1);
            animation: slideUp 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
            overflow-y: auto;
        }

        @keyframes slideUp {
            from {
                transform: translateY(40px);
                opacity: 0;
            }
            to {
                transform: translateY(0);
                opacity: 1;
            }
        }

        .deposit-bonus-close {
            position: absolute;
            top: 15px;
            right: 20px;
            background: none;
            border: none;
            color: #ffd700;
            font-size: 32px;
            cursor: pointer;
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: transform 0.2s;
        }

        .deposit-bonus-close:hover {
            transform: scale(1.15);
        }

        .deposit-bonus-title {
            text-align: center;
            color: #ffd700;
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 30px;
            letter-spacing: 1px;
        }

        .deposit-bonus-cards {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }

        .deposit-bonus-card {
            background: linear-gradient(135deg, rgba(60, 30, 90, 0.8), rgba(50, 20, 70, 0.8));
            border: 2px solid rgba(255, 215, 0, 0.3);
            border-radius: 15px;
            padding: 20px;
            cursor: pointer;
            transition: all 0.3s;
            position: relative;
        }

        .deposit-bonus-card:hover {
            border-color: #ffd700;
            box-shadow: 0 0 30px rgba(255, 215, 0, 0.3);
            transform: translateY(-5px);
        }

        .deposit-bonus-card.selected {
            border-color: #ffd700;
            background: linear-gradient(135deg, rgba(80, 40, 110, 0.9), rgba(70, 30, 90, 0.9));
            box-shadow: 0 0 40px rgba(255, 215, 0, 0.5), inset 0 0 20px rgba(255, 215, 0, 0.1);
        }

        .deposit-bonus-badge {
            position: absolute;
            top: -12px;
            right: 10px;
            background: linear-gradient(135deg, #00ff00, #00cc00);
            color: #000;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
        }

        .deposit-bonus-card-name {
            color: #ffd700;
            font-weight: 700;
            font-size: 16px;
            margin-bottom: 12px;
        }

        .deposit-bonus-card-info {
            color: #ccc;
            font-size: 13px;
            line-height: 1.6;
            margin-bottom: 12px;
        }

        .deposit-bonus-card-info-line {
            display: flex;
            justify-content: space-between;
            margin-bottom: 6px;
        }

        .deposit-bonus-card-info-label {
            color: #aaa;
        }

        .deposit-bonus-card-info-value {
            color: #ffd700;
            font-weight: 600;
        }

        .deposit-bonus-input-section {
            background: rgba(0, 0, 0, 0.4);
            border: 2px solid rgba(255, 215, 0, 0.2);
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 20px;
        }

        .deposit-bonus-input-label {
            color: #aaa;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 8px;
            display: block;
        }

        .deposit-bonus-input-row {
            display: flex;
            gap: 10px;
            margin-bottom: 15px;
        }

        .deposit-bonus-input-group {
            flex: 1;
        }

        .deposit-bonus-input {
            width: 100%;
            background: rgba(0, 0, 0, 0.6);
            border: 2px solid rgba(255, 215, 0, 0.2);
            color: #ffd700;
            padding: 12px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            transition: border-color 0.2s;
        }

        .deposit-bonus-input:focus {
            outline: none;
            border-color: #ffd700;
            box-shadow: 0 0 15px rgba(255, 215, 0, 0.2);
        }

        .deposit-bonus-calculation {
            display: grid;
            grid-template-columns: 1fr auto 1fr;
            gap: 15px;
            align-items: center;
            padding: 15px;
            background: rgba(255, 215, 0, 0.05);
            border-radius: 8px;
            border: 1px solid rgba(255, 215, 0, 0.1);
        }

        .deposit-bonus-calc-item {
            text-align: center;
        }

        .deposit-bonus-calc-label {
            color: #aaa;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 4px;
        }

        .deposit-bonus-calc-value {
            color: #ffd700;
            font-size: 18px;
            font-weight: 700;
        }

        .deposit-bonus-calc-arrow {
            color: #ffd700;
            font-size: 20px;
        }

        .deposit-bonus-claim-btn {
            width: 100%;
            background: linear-gradient(135deg, #ffd700, #ffed4e);
            color: #1a1a2e;
            border: none;
            padding: 14px 20px;
            border-radius: 8px;
            font-weight: 700;
            font-size: 14px;
            cursor: pointer;
            transition: all 0.3s;
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        .deposit-bonus-claim-btn:hover {
            transform: scale(1.05);
            box-shadow: 0 0 30px rgba(255, 215, 0, 0.5);
        }

        .deposit-bonus-claim-btn:active {
            transform: scale(0.98);
        }

        .deposit-bonus-claim-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            transform: none;
        }

        /* Active bonus tracker widget */
        #${TRACKER_ID} {
            position: fixed;
            bottom: 20px;
            left: 20px;
            background: linear-gradient(135deg, rgba(30, 15, 60, 0.95), rgba(50, 20, 80, 0.95));
            border: 2px solid rgba(255, 215, 0, 0.3);
            border-radius: 12px;
            padding: 15px;
            width: 280px;
            z-index: 999;
            font-family: 'Inter', sans-serif;
            display: none;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.6);
        }

        #${TRACKER_ID}.show {
            display: block;
        }

        #${TRACKER_ID}.pulse {
            animation: trackerPulse 1s ease-in-out infinite;
        }

        @keyframes trackerPulse {
            0%, 100% { box-shadow: 0 4px 20px rgba(0, 0, 0, 0.6); }
            50% { box-shadow: 0 4px 40px rgba(255, 215, 0, 0.4); }
        }

        .deposit-bonus-tracker-title {
            color: #ffd700;
            font-weight: 700;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 10px;
        }

        .deposit-bonus-tracker-progress-bar {
            width: 100%;
            height: 8px;
            background: rgba(0, 0, 0, 0.6);
            border-radius: 4px;
            overflow: hidden;
            border: 1px solid rgba(255, 215, 0, 0.2);
            margin-bottom: 8px;
        }

        .deposit-bonus-tracker-progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #00ff00, #ffd700);
            transition: width 0.3s ease-out;
        }

        .deposit-bonus-tracker-text {
            color: #ccc;
            font-size: 12px;
            line-height: 1.4;
        }

        .deposit-bonus-tracker-amount {
            color: #ffd700;
            font-weight: 600;
        }

        @media (max-width: 768px) {
            #${MODAL_ID} {
                max-width: 95%;
                padding: 30px 20px;
            }

            .deposit-bonus-cards {
                grid-template-columns: 1fr;
            }

            #${TRACKER_ID} {
                width: 260px;
                bottom: 15px;
                left: 15px;
            }
        }
    `;
    document.head.appendChild(style);

    // ────────────────────────────────────────────────────────────────────────
    // API Helper
    // ────────────────────────────────────────────────────────────────────────

    async function api(path, opts) {
        opts = opts || {};
        var method = opts.method || 'GET';
        var headers = {
            'Content-Type': 'application/json',
            'x-csrf-token': window.CSRFToken || ''
        };
        if (opts.headers) Object.assign(headers, opts.headers);

        var config = {
            method: method,
            headers: headers
        };
        if (opts.body) config.body = JSON.stringify(opts.body);

        try {
            var res = await fetch(path, config);
            if (!res.ok) {
                var errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || 'API error: ' + res.status);
            }
            return res.json();
        } catch (err) {
            console.warn('[DepositBonus] API error:', err.message);
            throw err;
        }
    }

    // ────────────────────────────────────────────────────────────────────────
    // Create DOM elements
    // ────────────────────────────────────────────────────────────────────────

    function createBanner() {
        var existing = document.getElementById(BANNER_ID);
        if (existing) return;

        var banner = document.createElement('div');
        banner.id = BANNER_ID;
        banner.innerHTML = `
            <div class="deposit-bonus-banner-content">
                <span class="deposit-bonus-banner-emoji">🎁</span>
                <span class="deposit-bonus-banner-text" id="deposit-bonus-banner-text">
                    200% FIRST DEPOSIT BONUS — Up to 5,000 gems!
                </span>
            </div>
            <button class="deposit-bonus-banner-btn" id="deposit-bonus-banner-claim">
                CLAIM NOW
            </button>
            <button class="deposit-bonus-banner-close" id="deposit-bonus-banner-close">
                ✕
            </button>
        `;
        document.body.appendChild(banner);

        document.getElementById('deposit-bonus-banner-claim').addEventListener('click', function() {
            showModal();
        });

        document.getElementById('deposit-bonus-banner-close').addEventListener('click', function() {
            hideBanner();
        });
    }

    function createModal() {
        var existing = document.getElementById(MODAL_ID);
        if (existing) return;

        var overlay = document.createElement('div');
        overlay.id = OVERLAY_ID;

        var modal = document.createElement('div');
        modal.id = MODAL_ID;
        modal.innerHTML = `
            <button class="deposit-bonus-close">✕</button>
            <div class="deposit-bonus-title">Claim Your Bonus</div>
            <div class="deposit-bonus-cards" id="deposit-bonus-cards-list"></div>
            <div class="deposit-bonus-input-section">
                <label class="deposit-bonus-input-label">Deposit Amount</label>
                <div class="deposit-bonus-input-row">
                    <div class="deposit-bonus-input-group">
                        <input type="number" class="deposit-bonus-input" id="deposit-bonus-amount" placeholder="0" min="10" step="1">
                    </div>
                </div>
                <div class="deposit-bonus-calculation" id="deposit-bonus-calculation">
                    <div class="deposit-bonus-calc-item">
                        <div class="deposit-bonus-calc-label">You Deposit</div>
                        <div class="deposit-bonus-calc-value" id="deposit-calc-deposit">0</div>
                    </div>
                    <div class="deposit-bonus-calc-arrow">→</div>
                    <div class="deposit-bonus-calc-item">
                        <div class="deposit-bonus-calc-label">You Receive</div>
                        <div class="deposit-bonus-calc-value" id="deposit-calc-bonus">0</div>
                    </div>
                </div>
            </div>
            <button class="deposit-bonus-claim-btn" id="deposit-bonus-claim-btn">
                CLAIM BONUS
            </button>
        `;

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        modal.querySelector('.deposit-bonus-close').addEventListener('click', function() {
            hideModal();
        });

        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) hideModal();
        });

        document.getElementById('deposit-bonus-amount').addEventListener('input', function() {
            updateCalculation();
        });

        document.getElementById('deposit-bonus-claim-btn').addEventListener('click', function() {
            claimBonus();
        });
    }

    function createTracker() {
        var existing = document.getElementById(TRACKER_ID);
        if (existing) return;

        var tracker = document.createElement('div');
        tracker.id = TRACKER_ID;
        tracker.innerHTML = `
            <div class="deposit-bonus-tracker-title">Active Bonus</div>
            <div class="deposit-bonus-tracker-progress-bar">
                <div class="deposit-bonus-tracker-progress-fill" id="deposit-bonus-tracker-fill" style="width: 0%"></div>
            </div>
            <div class="deposit-bonus-tracker-text">
                Wager <span class="deposit-bonus-tracker-amount" id="deposit-bonus-tracker-amount">0</span> more to unlock
            </div>
        `;
        document.body.appendChild(tracker);
    }

    // ────────────────────────────────────────────────────────────────────────
    // Banner management
    // ────────────────────────────────────────────────────────────────────────

    function showBanner() {
        var banner = document.getElementById(BANNER_ID);
        if (banner) banner.style.display = 'flex';
    }

    function hideBanner() {
        var banner = document.getElementById(BANNER_ID);
        if (banner) banner.style.display = 'none';
        sessionStorage.setItem('deposit-bonus-banner-dismissed', 'true');
    }

    // ────────────────────────────────────────────────────────────────────────
    // Modal management
    // ────────────────────────────────────────────────────────────────────────

    function showModal() {
        state.isShowing = true;
        var overlay = document.getElementById(OVERLAY_ID);
        if (overlay) overlay.classList.add('show');
        renderBonusCards();
    }

    function hideModal() {
        state.isShowing = false;
        var overlay = document.getElementById(OVERLAY_ID);
        if (overlay) overlay.classList.remove('show');
    }

    function renderBonusCards() {
        var container = document.getElementById('deposit-bonus-cards-list');
        if (!container) return;

        container.innerHTML = '';

        state.availableBonuses.forEach(function(bonus) {
            var card = document.createElement('div');
            card.className = 'deposit-bonus-card';
            if (state.selectedBonus && state.selectedBonus.type === bonus.type) {
                card.classList.add('selected');
            }

            var badge = bonus.badge ? '<div class="deposit-bonus-badge">' + bonus.badge + '</div>' : '';

            card.innerHTML = `
                ${badge}
                <div class="deposit-bonus-card-name">${bonus.name}</div>
                <div class="deposit-bonus-card-info">
                    <div class="deposit-bonus-card-info-line">
                        <span class="deposit-bonus-card-info-label">Match:</span>
                        <span class="deposit-bonus-card-info-value">${bonus.multiplier}%</span>
                    </div>
                    <div class="deposit-bonus-card-info-line">
                        <span class="deposit-bonus-card-info-label">Max Bonus:</span>
                        <span class="deposit-bonus-card-info-value">${bonus.maxBonus.toLocaleString()} gems</span>
                    </div>
                    <div class="deposit-bonus-card-info-line">
                        <span class="deposit-bonus-card-info-label">Wager Req:</span>
                        <span class="deposit-bonus-card-info-value">${bonus.wageringRequirement}x</span>
                    </div>
                </div>
            `;

            card.addEventListener('click', function() {
                state.selectedBonus = bonus;
                renderBonusCards();
                updateCalculation();
            });

            container.appendChild(card);
        });
    }

    function updateCalculation() {
        var amountInput = document.getElementById('deposit-bonus-amount');
        var depositAmount = Math.floor(amountInput.value) || 0;
        state.depositAmount = depositAmount;

        var bonusAmount = 0;
        if (state.selectedBonus && depositAmount >= state.selectedBonus.minDeposit) {
            bonusAmount = Math.floor(depositAmount * (state.selectedBonus.multiplier / 100));
            bonusAmount = Math.min(bonusAmount, state.selectedBonus.maxBonus);
        }

        document.getElementById('deposit-calc-deposit').textContent = depositAmount.toLocaleString();
        document.getElementById('deposit-calc-bonus').textContent = bonusAmount.toLocaleString();

        var claimBtn = document.getElementById('deposit-bonus-claim-btn');
        if (state.selectedBonus && depositAmount >= state.selectedBonus.minDeposit && bonusAmount > 0) {
            claimBtn.disabled = false;
        } else {
            claimBtn.disabled = true;
        }
    }

    async function claimBonus() {
        if (!state.selectedBonus || state.depositAmount <= 0) return;

        var claimBtn = document.getElementById('deposit-bonus-claim-btn');
        claimBtn.disabled = true;
        var originalText = claimBtn.textContent;
        claimBtn.textContent = 'Processing...';

        try {
            var result = await api(API_BASE + '/claim', {
                method: 'POST',
                body: {
                    bonusType: state.selectedBonus.type,
                    depositAmount: state.depositAmount
                }
            });

            claimBtn.textContent = 'Bonus Claimed! ✓';
            setTimeout(function() {
                hideModal();
                hideBanner();
                refreshTracker();
                claimBtn.textContent = originalText;
                claimBtn.disabled = false;
            }, 1500);
        } catch (err) {
            console.warn('[DepositBonus] Claim error:', err.message);
            claimBtn.textContent = 'Error - Try Again';
            setTimeout(function() {
                claimBtn.textContent = originalText;
                claimBtn.disabled = false;
            }, 2000);
        }
    }

    // ────────────────────────────────────────────────────────────────────────
    // Tracker management
    // ────────────────────────────────────────────────────────────────────────

    async function refreshTracker() {
        try {
            var data = await api(API_BASE + '/active');
            state.activeBonuses = data.bonuses || [];
            updateTracker();
        } catch (err) {
            console.warn('[DepositBonus] Refresh tracker error:', err.message);
        }
    }

    function updateTracker() {
        var tracker = document.getElementById(TRACKER_ID);
        if (!tracker) return;

        if (state.activeBonuses.length === 0) {
            tracker.classList.remove('show');
            return;
        }

        tracker.classList.add('show');

        // Get primary bonus (usually first)
        var bonus = state.activeBonuses[0];
        var progressPercent = bonus.progressPercent || 0;
        var wagerRemaining = bonus.wagerRemaining || 0;

        var fillBar = document.getElementById('deposit-bonus-tracker-fill');
        if (fillBar) fillBar.style.width = Math.min(progressPercent, 100) + '%';

        var amountText = document.getElementById('deposit-bonus-tracker-amount');
        if (amountText) amountText.textContent = wagerRemaining.toLocaleString();

        // Pulse if close to completion (>80%)
        if (progressPercent >= 80) {
            tracker.classList.add('pulse');
        } else {
            tracker.classList.remove('pulse');
        }
    }

    // ────────────────────────────────────────────────────────────────────────
    // Initialization
    // ────────────────────────────────────────────────────────────────────────

    var _initialized = false;

    async function init() {
        if (_initialized) return;
        _initialized = true;

        // Create DOM elements
        createBanner();
        createModal();
        createTracker();

        // Load available bonuses
        try {
            var data = await api(API_BASE + '/available');
            state.availableBonuses = data.bonuses || [];

            // Show banner if there are available bonuses and not dismissed
            if (state.availableBonuses.length > 0 && !sessionStorage.getItem('deposit-bonus-banner-dismissed')) {
                showBanner();
            }
        } catch (err) {
            console.warn('[DepositBonus] Init error:', err.message);
        }

        // Load active bonuses for tracker
        await refreshTracker();

        // Periodically refresh tracker (every 10 seconds)
        setInterval(function() {
            refreshTracker();
        }, 10000);
    }

    // ────────────────────────────────────────────────────────────────────────
    // Public API
    // ────────────────────────────────────────────────────────────────────────

    window.DepositBonus = {
        init: init,
        recordWager: function(wagerAmount) {
            if (state.activeBonuses.length === 0) return;

            api(API_BASE + '/wager', {
                method: 'POST',
                body: { wagerAmount: wagerAmount }
            }).catch(function(err) {
                console.warn('[DepositBonus] Wager record error:', err.message);
            });

            // Update tracker after a short delay
            setTimeout(function() {
                refreshTracker();
            }, 500);
        },
        showBanner: showBanner,
        hideBanner: hideBanner,
        showModal: showModal,
        hideModal: hideModal,
        refreshTracker: refreshTracker
    };

})();
