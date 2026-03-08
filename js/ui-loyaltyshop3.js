/* ==========================================================
   ui-loyaltyshop3.js — Loyalty Points Shop v3
   Sprint 45 — Spend accumulated loyalty points on rewards
   ========================================================== */
(function () {
    'use strict';

    var STORAGE_KEY = 'ms_loyaltyShop3';
    var OVERLAY_ID = 'loyaltyPointsShop';

    var POINTS_PER_SPIN = 1;
    var POINTS_PER_WIN = 5;

    var SHOP_ITEMS = [
        { id: 'bonus_5', name: 'Bonus $5', icon: '\uD83D\uDCB5', cost: 50, reward: 5 },
        { id: 'bonus_25', name: 'Bonus $25', icon: '\uD83D\uDCB0', cost: 200, reward: 25 },
        { id: 'bonus_100', name: 'Bonus $100', icon: '\uD83D\uDC8E', cost: 750, reward: 100 },
        { id: 'free_spins_5', name: '5 Free Spins', icon: '\uD83C\uDFB0', cost: 100, reward: 0, type: 'freespins', count: 5 },
        { id: 'multiplier_2x', name: '2x Next Win', icon: '\u26A1', cost: 150, reward: 0, type: 'multiplier', mult: 2 },
        { id: 'insurance_3', name: '3 Insured Spins', icon: '\uD83D\uDEE1\uFE0F', cost: 75, reward: 0, type: 'insurance', count: 3 }
    ];

    /* ---- Helpers ---- */

    function _isQA() {
        try {
            return new URLSearchParams(window.location.search).get('noBonus') === '1';
        } catch (e) {
            return false;
        }
    }

    function _loadState() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                var parsed = JSON.parse(raw);
                return {
                    points: typeof parsed.points === 'number' ? parsed.points : 0,
                    history: Array.isArray(parsed.history) ? parsed.history : [],
                    totalEarned: typeof parsed.totalEarned === 'number' ? parsed.totalEarned : 0,
                    totalSpent: typeof parsed.totalSpent === 'number' ? parsed.totalSpent : 0
                };
            }
        } catch (e) { /* ignore */ }
        return { points: 0, history: [], totalEarned: 0, totalSpent: 0 };
    }

    function _saveState(state) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } catch (e) { /* ignore */ }
    }

    function _el(tag, className, textContent) {
        var el = document.createElement(tag);
        if (className) el.className = className;
        if (textContent !== undefined) el.textContent = textContent;
        return el;
    }

    /* ---- Build Overlay ---- */

    function _buildOverlay() {
        var existing = document.getElementById(OVERLAY_ID);
        if (existing) existing.remove();

        var state = _loadState();

        var overlay = _el('div', 'loyalty-points-shop');
        overlay.id = OVERLAY_ID;

        var backdrop = _el('div', 's45-shop-backdrop');
        backdrop.addEventListener('click', _dismiss);
        overlay.appendChild(backdrop);

        var card = _el('div', 's45-shop-card');

        /* Header */
        var header = _el('div', 's45-shop-header');
        var title = _el('h2', 's45-shop-title', 'Loyalty Points Shop');
        header.appendChild(title);

        var pointsDisplay = _el('div', 's45-shop-points');
        pointsDisplay.id = 'ls3PointsDisplay';
        pointsDisplay.textContent = '\u2B50 ' + state.points.toLocaleString() + ' Points';
        header.appendChild(pointsDisplay);

        var closeBtn = _el('button', 's45-shop-close', '\u2715');
        closeBtn.addEventListener('click', _dismiss);
        header.appendChild(closeBtn);

        card.appendChild(header);

        /* Grid */
        var grid = _el('div', 's45-shop-grid');

        SHOP_ITEMS.forEach(function (item) {
            var itemEl = _el('div', 's45-shop-item');
            if (state.points >= item.cost) {
                itemEl.classList.add('s45-affordable');
            } else {
                itemEl.classList.add('s45-too-expensive');
            }

            var iconEl = _el('div', 's45-shop-item-icon', item.icon);
            itemEl.appendChild(iconEl);

            var nameEl = _el('div', 's45-shop-item-name', item.name);
            itemEl.appendChild(nameEl);

            var costEl = _el('div', 's45-shop-item-cost', '\u2B50 ' + item.cost);
            itemEl.appendChild(costEl);

            var buyBtn = _el('button', 's45-shop-buy-btn', 'Redeem');
            buyBtn.disabled = state.points < item.cost;
            buyBtn.addEventListener('click', function () {
                _purchaseItem(item);
            });
            itemEl.appendChild(buyBtn);

            grid.appendChild(itemEl);
        });

        card.appendChild(grid);

        /* Footer */
        var footer = _el('div', 's45-shop-footer');
        footer.textContent = 'Earn points: ' + POINTS_PER_SPIN + ' per spin, ' + POINTS_PER_WIN + ' per win';
        card.appendChild(footer);

        overlay.appendChild(card);
        document.body.appendChild(overlay);

        return overlay;
    }

    /* ---- Purchase Logic ---- */

    function _purchaseItem(item) {
        var state = _loadState();
        if (state.points < item.cost) return;

        state.points -= item.cost;
        state.totalSpent += item.cost;

        var entry = {
            itemId: item.id,
            itemName: item.name,
            cost: item.cost,
            timestamp: Date.now()
        };
        state.history.unshift(entry);
        if (state.history.length > 50) {
            state.history = state.history.slice(0, 50);
        }

        _saveState(state);

        /* Apply reward */
        if (item.reward > 0) {
            if (typeof balance !== 'undefined') {
                balance += item.reward;
            }
            if (typeof updateBalanceDisplay === 'function') {
                updateBalanceDisplay();
            }
        }

        if (item.type === 'freespins' && item.count) {
            if (typeof freeSpinsLeft !== 'undefined') {
                freeSpinsLeft = (freeSpinsLeft || 0) + item.count;
            }
        }

        if (item.type === 'multiplier' && item.mult) {
            try {
                var multKey = 'ms_nextWinMultiplier';
                var currentMult = parseFloat(localStorage.getItem(multKey)) || 1;
                localStorage.setItem(multKey, String(Math.max(currentMult, item.mult)));
            } catch (e) { /* ignore */ }
        }

        if (item.type === 'insurance' && item.count) {
            try {
                var insKey = 'ms_insuredSpins';
                var current = parseInt(localStorage.getItem(insKey), 10) || 0;
                localStorage.setItem(insKey, String(current + item.count));
            } catch (e) { /* ignore */ }
        }

        /* Refresh overlay */
        _buildOverlay();
        var overlay = document.getElementById(OVERLAY_ID);
        if (overlay) {
            overlay.classList.add('active');
        }
    }

    /* ---- Show / Dismiss ---- */

    function _show() {
        if (_isQA()) return;
        var overlay = _buildOverlay();
        requestAnimationFrame(function () {
            overlay.classList.add('active');
        });
    }

    function _dismiss() {
        var overlay = document.getElementById(OVERLAY_ID);
        if (!overlay) return;
        overlay.classList.remove('active');
        setTimeout(function () {
            if (overlay.parentNode) overlay.remove();
        }, 350);
    }

    /* ---- Point Tracking ---- */

    function _trackSpin(won) {
        if (_isQA()) return;
        var state = _loadState();
        state.points += POINTS_PER_SPIN;
        state.totalEarned += POINTS_PER_SPIN;
        if (won) {
            state.points += POINTS_PER_WIN;
            state.totalEarned += POINTS_PER_WIN;
        }
        _saveState(state);

        /* Update points display if overlay is visible */
        var display = document.getElementById('ls3PointsDisplay');
        if (display) {
            display.textContent = '\u2B50 ' + state.points.toLocaleString() + ' Points';
        }
    }

    /* ---- Get current points (utility) ---- */

    function _getPoints() {
        var state = _loadState();
        return state.points;
    }

    /* ---- Public API ---- */

    window._loyaltyShop3TrackSpin = function (won) {
        _trackSpin(won);
    };

    window._loyaltyShop3Open = _show;
    window.dismissLoyaltyShop3 = _dismiss;
    window._loyaltyShop3GetPoints = _getPoints;

    /* ---- Init ---- */

    function _init() {
        if (_isQA()) return;
        /* Preload state to ensure storage key exists */
        var state = _loadState();
        _saveState(state);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _init);
    } else {
        _init();
    }

})();
