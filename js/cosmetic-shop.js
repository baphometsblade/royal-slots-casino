(function() {
    var RARITY_COLORS = {
        common: '#808080',
        uncommon: '#22c55e',
        rare: '#3b82f6',
        epic: '#a855f7',
        legendary: '#d4af37'
    };

    var RARITY_BORDERS = {
        common: '2px solid #808080',
        uncommon: '2px solid #22c55e',
        rare: '2px solid #3b82f6',
        epic: '2px solid #a855f7',
        legendary: '2px solid #d4af37'
    };

    var state = {
        shopData: null,
        inventory: [],
        equipped: [],
        gemBalance: 0,
        csrfToken: null,
        currentTab: 'avatar',
        isLoading: false
    };

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

    function formatGems(amount) {
        return amount.toLocaleString();
    }

    function getRarityColor(rarity) {
        return RARITY_COLORS[rarity] || RARITY_COLORS.common;
    }

    function getRarityBorder(rarity) {
        return RARITY_BORDERS[rarity] || RARITY_BORDERS.common;
    }

    function isOwned(itemId) {
        return state.inventory.some(function(item) { return item.id === itemId; });
    }

    function isEquipped(itemId) {
        return state.equipped.some(function(item) { return item.id === itemId; });
    }

    function createButton(text, onClick, classes) {
        var btn = document.createElement('button');
        btn.textContent = text;
        btn.onclick = onClick;
        btn.className = 'cosmetic-btn ' + (classes || '');
        return btn;
    }

    function createItemCard(item) {
        var card = document.createElement('div');
        card.className = 'cosmetic-item-card';
        card.style.borderColor = getRarityColor(item.rarity);

        var imageContainer = document.createElement('div');
        imageContainer.className = 'cosmetic-item-image';
        imageContainer.style.backgroundImage = 'url(' + (item.image_key || '') + ')';

        var badgesContainer = document.createElement('div');
        badgesContainer.className = 'cosmetic-item-badges';

        if (item.is_limited) {
            var limitedBadge = document.createElement('div');
            limitedBadge.className = 'cosmetic-badge-limited';
            limitedBadge.textContent = 'LIMITED';
            if (item.limited_label) {
                limitedBadge.title = item.limited_label;
            }
            badgesContainer.appendChild(limitedBadge);
        }

        if (isOwned(item.id)) {
            var ownedBadge = document.createElement('div');
            ownedBadge.className = 'cosmetic-badge-owned';
            ownedBadge.textContent = 'OWNED';
            badgesContainer.appendChild(ownedBadge);
        }

        imageContainer.appendChild(badgesContainer);
        card.appendChild(imageContainer);

        var contentDiv = document.createElement('div');
        contentDiv.className = 'cosmetic-item-content';

        var nameDiv = document.createElement('div');
        nameDiv.className = 'cosmetic-item-name';
        nameDiv.textContent = item.name;
        contentDiv.appendChild(nameDiv);

        var descDiv = document.createElement('div');
        descDiv.className = 'cosmetic-item-description';
        descDiv.textContent = item.description;
        contentDiv.appendChild(descDiv);

        var priceDiv = document.createElement('div');
        priceDiv.className = 'cosmetic-item-price';
        priceDiv.innerHTML = '<span class="cosmetic-gem-icon">💎</span> ' + formatGems(item.gem_price);
        contentDiv.appendChild(priceDiv);

        var actionDiv = document.createElement('div');
        actionDiv.className = 'cosmetic-item-actions';

        if (!isOwned(item.id)) {
            var buyBtn = createButton('Buy - ' + formatGems(item.gem_price), function() {
                showPurchaseConfirmation(item);
            }, 'cosmetic-btn-primary');
            actionDiv.appendChild(buyBtn);
        } else {
            if (isEquipped(item.id)) {
                var unequipBtn = createButton('Unequip', function() {
                    unequipItem(item.id);
                }, 'cosmetic-btn-secondary');
                actionDiv.appendChild(unequipBtn);
                var equippedLabel = document.createElement('div');
                equippedLabel.className = 'cosmetic-equipped-label';
                equippedLabel.textContent = '✓ Equipped';
                actionDiv.appendChild(equippedLabel);
            } else {
                var equipBtn = createButton('Equip', function() {
                    equipItem(item.id);
                }, 'cosmetic-btn-secondary');
                actionDiv.appendChild(equipBtn);
            }
        }

        contentDiv.appendChild(actionDiv);
        card.appendChild(contentDiv);

        return card;
    }

    function createTabButton(label, tabId, isActive) {
        var btn = document.createElement('button');
        btn.className = 'cosmetic-tab-btn' + (isActive ? ' active' : '');
        btn.textContent = label;
        btn.onclick = function() {
            switchTab(tabId);
        };
        return btn;
    }

    function switchTab(tabId) {
        state.currentTab = tabId;
        var tabs = document.querySelectorAll('.cosmetic-tab-btn');
        tabs.forEach(function(tab) {
            tab.classList.remove('active');
        });
        event.target.classList.add('active');

        var containers = document.querySelectorAll('.cosmetic-items-container');
        containers.forEach(function(container) {
            container.style.display = 'none';
        });

        var activeContainer = document.getElementById('cosmetic-items-' + tabId);
        if (activeContainer) {
            activeContainer.style.display = 'grid';
        }
    }

    function showPurchaseConfirmation(item) {
        var overlay = document.createElement('div');
        overlay.className = 'cosmetic-confirm-overlay';
        overlay.onclick = function(e) {
            if (e.target === overlay) {
                overlay.remove();
            }
        };

        var dialog = document.createElement('div');
        dialog.className = 'cosmetic-confirm-dialog';

        var title = document.createElement('h3');
        title.textContent = 'Confirm Purchase';
        dialog.appendChild(title);

        var message = document.createElement('p');
        message.textContent = 'Purchase "' + item.name + '" for ' + formatGems(item.gem_price) + ' gems?';
        dialog.appendChild(message);

        var buttonsDiv = document.createElement('div');
        buttonsDiv.className = 'cosmetic-confirm-buttons';

        var confirmBtn = createButton('Confirm', function() {
            purchaseItem(item.id);
            overlay.remove();
        }, 'cosmetic-btn-primary');
        buttonsDiv.appendChild(confirmBtn);

        var cancelBtn = createButton('Cancel', function() {
            overlay.remove();
        }, 'cosmetic-btn-secondary');
        buttonsDiv.appendChild(cancelBtn);

        dialog.appendChild(buttonsDiv);
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
    }

    async function purchaseItem(itemId) {
        if (state.isLoading) return;
        state.isLoading = true;

        try {
            var token = state.csrfToken || (await getCSRFToken());
            if (!token) {
                console.warn('CSRF token not available for purchase');
                state.isLoading = false;
                return;
            }

            var result = await api('/api/cosmetics/purchase', {
                method: 'POST',
                body: JSON.stringify({ itemId: itemId }),
                headers: { 'x-csrf-token': token }
            });

            if (result && !result.error) {
                await loadShopData();
                showNotification('Item purchased successfully!', 'success');
            } else {
                showNotification(result && result.error ? result.error : 'Purchase failed', 'error');
                console.warn('Purchase failed:', result);
            }
        } catch (err) {
            console.warn('Purchase error:', err);
            showNotification('Purchase failed', 'error');
        }

        state.isLoading = false;
    }

    async function equipItem(itemId) {
        if (state.isLoading) return;
        state.isLoading = true;

        try {
            var token = state.csrfToken || (await getCSRFToken());
            if (!token) {
                console.warn('CSRF token not available for equip');
                state.isLoading = false;
                return;
            }

            var result = await api('/api/cosmetics/equip', {
                method: 'POST',
                body: JSON.stringify({ itemId: itemId }),
                headers: { 'x-csrf-token': token }
            });

            if (result && !result.error) {
                await loadShopData();
                showNotification('Item equipped successfully!', 'success');
            } else {
                showNotification(result && result.error ? result.error : 'Equip failed', 'error');
                console.warn('Equip failed:', result);
            }
        } catch (err) {
            console.warn('Equip error:', err);
            showNotification('Equip failed', 'error');
        }

        state.isLoading = false;
    }

    async function unequipItem(itemId) {
        if (state.isLoading) return;
        state.isLoading = true;

        try {
            var token = state.csrfToken || (await getCSRFToken());
            if (!token) {
                console.warn('CSRF token not available for unequip');
                state.isLoading = false;
                return;
            }

            var result = await api('/api/cosmetics/equip', {
                method: 'POST',
                body: JSON.stringify({ itemId: null }),
                headers: { 'x-csrf-token': token }
            });

            if (result && !result.error) {
                await loadShopData();
                showNotification('Item unequipped', 'success');
            } else {
                showNotification(result && result.error ? result.error : 'Unequip failed', 'error');
                console.warn('Unequip failed:', result);
            }
        } catch (err) {
            console.warn('Unequip error:', err);
            showNotification('Unequip failed', 'error');
        }

        state.isLoading = false;
    }

    function showNotification(message, type) {
        var notif = document.createElement('div');
        notif.className = 'cosmetic-notification cosmetic-notification-' + type;
        notif.textContent = message;
        document.body.appendChild(notif);

        setTimeout(function() {
            notif.classList.add('cosmetic-notification-show');
        }, 10);

        setTimeout(function() {
            notif.classList.remove('cosmetic-notification-show');
            setTimeout(function() {
                notif.remove();
            }, 300);
        }, 3000);
    }

    async function loadShopData() {
        try {
            var shopResult = await api('/api/cosmetics/shop');
            if (shopResult && shopResult.shop) {
                state.shopData = shopResult.shop;
            }

            var inventoryResult = await api('/api/cosmetics/inventory');
            if (inventoryResult && inventoryResult.inventory) {
                state.inventory = inventoryResult.inventory;
            }

            var equippedResult = await api('/api/cosmetics/equipped');
            if (equippedResult && equippedResult.equipped) {
                state.equipped = equippedResult.equipped;
            }

            renderShopModal();
        } catch (err) {
            console.warn('Error loading shop data:', err);
        }
    }

    function renderShopModal() {
        var existing = document.getElementById('cosmetic-shop-modal');
        if (existing) {
            existing.remove();
        }

        var modal = document.createElement('div');
        modal.id = 'cosmetic-shop-modal';
        modal.className = 'cosmetic-shop-modal';
        modal.onclick = function(e) {
            if (e.target === modal) {
                closeShop();
            }
        };

        var content = document.createElement('div');
        content.className = 'cosmetic-shop-content';

        var header = document.createElement('div');
        header.className = 'cosmetic-shop-header';

        var title = document.createElement('h2');
        title.textContent = 'Cosmetic Shop';
        header.appendChild(title);

        var gemDisplay = document.createElement('div');
        gemDisplay.className = 'cosmetic-gem-display';
        gemDisplay.innerHTML = '<span class="cosmetic-gem-icon">💎</span> ' + formatGems(state.gemBalance);
        header.appendChild(gemDisplay);

        var closeBtn = document.createElement('button');
        closeBtn.className = 'cosmetic-close-btn';
        closeBtn.innerHTML = '&times;';
        closeBtn.onclick = closeShop;
        header.appendChild(closeBtn);

        content.appendChild(header);

        var tabs = document.createElement('div');
        tabs.className = 'cosmetic-tabs';
        tabs.appendChild(createTabButton('Avatars', 'avatar', true));
        tabs.appendChild(createTabButton('Slot Frames', 'cardback', false));
        tabs.appendChild(createTabButton('Win Effects', 'wineffect', false));
        tabs.appendChild(createTabButton('Themes', 'theme', false));
        content.appendChild(tabs);

        var itemsWrapper = document.createElement('div');
        itemsWrapper.className = 'cosmetic-items-wrapper';

        var categories = ['avatar', 'cardback', 'wineffect', 'theme'];
        var categoryNames = {
            avatar: 'avatar',
            cardback: 'cardback',
            wineffect: 'wineffect',
            theme: 'theme'
        };

        categories.forEach(function(category) {
            var container = document.createElement('div');
            container.id = 'cosmetic-items-' + category;
            container.className = 'cosmetic-items-container';
            if (category !== 'avatar') {
                container.style.display = 'none';
            }

            if (state.shopData && state.shopData[category]) {
                state.shopData[category].forEach(function(item) {
                    container.appendChild(createItemCard(item));
                });
            }

            itemsWrapper.appendChild(container);
        });

        content.appendChild(itemsWrapper);
        modal.appendChild(content);
        document.body.appendChild(modal);

        setTimeout(function() {
            modal.classList.add('cosmetic-shop-open');
        }, 10);
    }

    function createFloatingButton() {
        var btn = document.createElement('button');
        btn.id = 'cosmetic-shop-fab';
        btn.className = 'cosmetic-fab';
        btn.title = 'Open Cosmetic Shop';
        btn.innerHTML = '🎨';
        btn.onclick = openShop;
        document.body.appendChild(btn);
    }

    function openShop() {
        loadShopData();
    }

    function closeShop() {
        var modal = document.getElementById('cosmetic-shop-modal');
        if (modal) {
            modal.classList.remove('cosmetic-shop-open');
            setTimeout(function() {
                modal.remove();
            }, 300);
        }
    }

    function injectStyles() {
        var styleId = 'cosmetic-shop-styles';
        if (document.getElementById(styleId)) return;

        var style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            .cosmetic-fab {
                position: fixed;
                bottom: 20px;
                left: 20px;
                width: 60px;
                height: 60px;
                border-radius: 50%;
                background: linear-gradient(135deg, #d4af37 0%, #b8860b 100%);
                border: none;
                font-size: 32px;
                cursor: pointer;
                box-shadow: 0 4px 15px rgba(0,0,0,0.3);
                z-index: 999;
                transition: all 0.3s ease;
            }

            .cosmetic-fab:hover {
                transform: scale(1.1);
                box-shadow: 0 6px 20px rgba(212,175,55,0.4);
            }

            .cosmetic-fab:active {
                transform: scale(0.95);
            }

            .cosmetic-shop-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.7);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 1000;
                opacity: 0;
                transition: opacity 0.3s ease;
            }

            .cosmetic-shop-modal.cosmetic-shop-open {
                opacity: 1;
            }

            .cosmetic-shop-content {
                background: #0a0a1a;
                border: 2px solid #d4af37;
                border-radius: 10px;
                max-width: 900px;
                width: 90%;
                max-height: 90vh;
                display: flex;
                flex-direction: column;
                box-shadow: 0 0 40px rgba(212,175,55,0.3);
            }

            .cosmetic-shop-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 20px;
                border-bottom: 1px solid #d4af37;
                background: linear-gradient(135deg, rgba(212,175,55,0.1) 0%, rgba(212,175,55,0.05) 100%);
            }

            .cosmetic-shop-header h2 {
                margin: 0;
                color: #d4af37;
                font-size: 24px;
            }

            .cosmetic-gem-display {
                display: flex;
                align-items: center;
                gap: 8px;
                color: #d4af37;
                font-weight: bold;
                font-size: 16px;
            }

            .cosmetic-gem-icon {
                font-size: 20px;
            }

            .cosmetic-close-btn {
                background: none;
                border: none;
                color: #d4af37;
                font-size: 32px;
                cursor: pointer;
                padding: 0;
                width: 40px;
                height: 40px;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: color 0.2s ease;
            }

            .cosmetic-close-btn:hover {
                color: #fff;
            }

            .cosmetic-tabs {
                display: flex;
                gap: 10px;
                padding: 15px 20px;
                border-bottom: 1px solid #333;
                background: rgba(0,0,0,0.3);
            }

            .cosmetic-tab-btn {
                background: transparent;
                border: 2px solid #555;
                color: #aaa;
                padding: 8px 16px;
                border-radius: 5px;
                cursor: pointer;
                transition: all 0.3s ease;
                font-weight: 500;
            }

            .cosmetic-tab-btn:hover {
                border-color: #d4af37;
                color: #d4af37;
            }

            .cosmetic-tab-btn.active {
                border-color: #d4af37;
                background: rgba(212,175,55,0.2);
                color: #d4af37;
            }

            .cosmetic-items-wrapper {
                flex: 1;
                overflow-y: auto;
                padding: 20px;
            }

            .cosmetic-items-container {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
                gap: 15px;
            }

            .cosmetic-item-card {
                background: rgba(20,20,40,0.8);
                border-radius: 8px;
                overflow: hidden;
                transition: all 0.3s ease;
                display: flex;
                flex-direction: column;
            }

            .cosmetic-item-card:hover {
                transform: translateY(-5px);
                box-shadow: 0 8px 25px rgba(212,175,55,0.2);
            }

            .cosmetic-item-image {
                width: 100%;
                height: 150px;
                background: linear-gradient(135deg, #1a1a2e 0%, #0a0a1a 100%);
                background-size: cover;
                background-position: center;
                position: relative;
                border-bottom: 2px solid;
            }

            .cosmetic-item-badges {
                position: absolute;
                top: 5px;
                right: 5px;
                display: flex;
                flex-direction: column;
                gap: 5px;
            }

            .cosmetic-badge-limited,
            .cosmetic-badge-owned {
                background: rgba(0,0,0,0.8);
                color: #d4af37;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 11px;
                font-weight: bold;
                border: 1px solid #d4af37;
            }

            .cosmetic-badge-owned {
                background: rgba(34,197,94,0.3);
                color: #22c55e;
                border-color: #22c55e;
            }

            .cosmetic-item-content {
                padding: 12px;
                display: flex;
                flex-direction: column;
                flex: 1;
            }

            .cosmetic-item-name {
                color: #fff;
                font-weight: bold;
                font-size: 14px;
                margin-bottom: 6px;
            }

            .cosmetic-item-description {
                color: #aaa;
                font-size: 12px;
                margin-bottom: 8px;
                flex: 1;
            }

            .cosmetic-item-price {
                color: #d4af37;
                font-weight: bold;
                font-size: 13px;
                margin-bottom: 10px;
            }

            .cosmetic-item-actions {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }

            .cosmetic-btn {
                padding: 8px 12px;
                border: none;
                border-radius: 5px;
                cursor: pointer;
                font-weight: 500;
                font-size: 12px;
                transition: all 0.2s ease;
            }

            .cosmetic-btn-primary {
                background: linear-gradient(135deg, #d4af37 0%, #b8860b 100%);
                color: #000;
            }

            .cosmetic-btn-primary:hover {
                transform: scale(1.05);
                box-shadow: 0 4px 12px rgba(212,175,55,0.3);
            }

            .cosmetic-btn-secondary {
                background: rgba(212,175,55,0.2);
                color: #d4af37;
                border: 1px solid #d4af37;
            }

            .cosmetic-btn-secondary:hover {
                background: rgba(212,175,55,0.3);
            }

            .cosmetic-equipped-label {
                color: #22c55e;
                font-size: 11px;
                font-weight: bold;
                text-align: center;
            }

            .cosmetic-confirm-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.8);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 1001;
            }

            .cosmetic-confirm-dialog {
                background: #0a0a1a;
                border: 2px solid #d4af37;
                border-radius: 10px;
                padding: 30px;
                max-width: 400px;
                box-shadow: 0 0 40px rgba(212,175,55,0.3);
            }

            .cosmetic-confirm-dialog h3 {
                color: #d4af37;
                margin-top: 0;
                font-size: 20px;
            }

            .cosmetic-confirm-dialog p {
                color: #ccc;
                margin: 15px 0;
            }

            .cosmetic-confirm-buttons {
                display: flex;
                gap: 10px;
                justify-content: flex-end;
            }

            .cosmetic-notification {
                position: fixed;
                bottom: 90px;
                left: 20px;
                background: #0a0a1a;
                border: 2px solid #d4af37;
                color: #d4af37;
                padding: 15px 20px;
                border-radius: 5px;
                z-index: 1002;
                opacity: 0;
                transform: translateX(-400px);
                transition: all 0.3s ease;
                font-weight: 500;
            }

            .cosmetic-notification-show {
                opacity: 1;
                transform: translateX(0);
            }

            .cosmetic-notification-error {
                border-color: #ef4444;
                color: #ef4444;
            }

            .cosmetic-notification-success {
                border-color: #22c55e;
                color: #22c55e;
            }

            @media (max-width: 600px) {
                .cosmetic-shop-content {
                    width: 98%;
                    max-height: 95vh;
                }

                .cosmetic-items-container {
                    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
                }

                .cosmetic-tabs {
                    flex-wrap: wrap;
                }
            }
        `;

        document.head.appendChild(style);
    }

    function init() {
        injectStyles();
        createFloatingButton();
        getCSRFToken();
    }

    window.CosmeticShop = {
        init: init,
        open: openShop,
        close: closeShop
    };
})();
