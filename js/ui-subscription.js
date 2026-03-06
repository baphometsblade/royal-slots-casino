(function () {
    'use strict';

    var _statusCache = null;

    function _getToken() {
        var key = typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken';
        return localStorage.getItem(key);
    }

    function _injectStyles() {
        if (document.getElementById('subscriptionStyles')) return;
        var s = document.createElement('style');
        s.id = 'subscriptionStyles';
        s.textContent = [
            '#subOverlay{display:none;position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.75);backdrop-filter:blur(4px);align-items:center;justify-content:center}',
            '#subOverlay.active{display:flex}',
            '#subModal{width:90%;max-width:540px;max-height:88vh;overflow-y:auto;background:#0d0d1a;border-radius:16px;border:1px solid rgba(255,215,0,.2);box-shadow:0 20px 60px rgba(0,0,0,.8);padding:0}',
            '.sub-header{padding:24px 24px 16px;background:linear-gradient(135deg,rgba(255,215,0,.08),transparent);border-bottom:1px solid rgba(255,255,255,.06)}',
            '.sub-title{font-size:22px;font-weight:900;color:#ffd700}',
            '.sub-sub{font-size:12px;color:rgba(255,255,255,.45);margin-top:4px}',
            '.sub-close{float:right;background:none;border:1px solid rgba(255,255,255,.2);color:#fff;border-radius:6px;width:28px;height:28px;cursor:pointer;font-size:16px;margin-top:-2px}',
            '.sub-status-bar{padding:12px 24px;font-size:13px;color:rgba(255,255,255,.6);border-bottom:1px solid rgba(255,255,255,.05)}',
            '.sub-active-badge{background:rgba(34,197,94,.2);color:#4ade80;border:1px solid rgba(34,197,94,.4);border-radius:6px;padding:2px 8px;font-size:12px;font-weight:700;margin-left:8px}',
            '.sub-cards{display:grid;grid-template-columns:1fr 1fr;gap:14px;padding:20px 24px 24px}',
            '.sub-card{background:linear-gradient(135deg,#1a1a2e,#16213e);border:1px solid rgba(255,255,255,.1);border-radius:14px;padding:20px 16px;position:relative;overflow:hidden}',
            '.sub-card.featured{border-color:#ffd700;box-shadow:0 0 24px rgba(255,215,0,.15)}',
            '.sub-best-value{position:absolute;top:14px;left:-22px;background:linear-gradient(90deg,#ff6b00,#ffd700);color:#000;font-size:8px;font-weight:900;padding:3px 28px;transform:rotate(-45deg);letter-spacing:1px}',
            '.sub-card-name{font-size:13px;font-weight:700;color:rgba(255,255,255,.7);margin-bottom:8px}',
            '.sub-price{font-size:28px;font-weight:900;color:#ffd700}',
            '.sub-price-period{font-size:12px;color:rgba(255,255,255,.4)}',
            '.sub-features{margin:12px 0;padding:0;list-style:none}',
            '.sub-features li{font-size:12px;color:rgba(255,255,255,.6);padding:4px 0;border-bottom:1px solid rgba(255,255,255,.04)}',
            '.sub-features li:before{content:"✓ ";color:#4ade80;font-weight:700}',
            '.sub-buy-btn{background:linear-gradient(135deg,#f59e0b,#d97706);color:#000;border:none;padding:10px;border-radius:8px;font-size:14px;font-weight:800;cursor:pointer;width:100%;margin-top:8px}',
            '.sub-buy-btn:disabled{opacity:.4;cursor:not-allowed}',
            '.sub-claim-btn{background:linear-gradient(135deg,#22c55e,#16a34a);color:#fff;border:none;padding:10px;border-radius:8px;font-size:14px;font-weight:800;cursor:pointer;width:100%;margin-top:8px}',
            '.sub-claimed-badge{background:rgba(34,197,94,.15);color:#4ade80;border:1px solid rgba(34,197,94,.3);border-radius:6px;padding:8px;font-size:13px;font-weight:700;text-align:center;margin-top:8px}',
            '@media(max-width:480px){.sub-cards{grid-template-columns:1fr}}'
        ].join('\n');
        document.head.appendChild(s);
    }

    function _showToast(msg) {
        if (typeof showToast === 'function') { showToast(msg); return; }
        var t = document.createElement('div');
        t.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#1a1a2e;border:1px solid rgba(255,215,0,.3);color:#fff;padding:12px 20px;border-radius:10px;font-size:14px;z-index:99999;pointer-events:none;transition:opacity .4s';
        t.textContent = msg;
        document.body.appendChild(t);
        setTimeout(function() { t.style.opacity = '0'; }, 3500);
        setTimeout(function() { if (t.parentNode) t.parentNode.removeChild(t); }, 4000);
    }

    function _buildModal() {
        if (document.getElementById('subOverlay')) return;
        _injectStyles();
        var overlay = document.createElement('div');
        overlay.id = 'subOverlay';
        var modal = document.createElement('div');
        modal.id = 'subModal';
        var header = document.createElement('div');
        header.className = 'sub-header';
        var closeBtn = document.createElement('button');
        closeBtn.className = 'sub-close';
        closeBtn.textContent = '×';
        closeBtn.setAttribute('aria-label', 'Close');
        closeBtn.addEventListener('click', closeSubscriptionModal);
        var title = document.createElement('div');
        title.className = 'sub-title';
        title.textContent = '💳 CASINO PASS';
        var sub = document.createElement('div');
        sub.className = 'sub-sub';
        sub.textContent = 'Guaranteed daily gems + deposit bonuses — every month';
        header.appendChild(closeBtn);
        header.appendChild(title);
        header.appendChild(sub);
        var statusBar = document.createElement('div');
        statusBar.className = 'sub-status-bar';
        statusBar.id = 'subStatusBar';
        statusBar.textContent = 'Loading...';
        var cards = document.createElement('div');
        cards.className = 'sub-cards';
        cards.id = 'subCards';
        modal.appendChild(header);
        modal.appendChild(statusBar);
        modal.appendChild(cards);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) closeSubscriptionModal();
        });
        document.addEventListener('keydown', _onEsc);
    }
    function _onEsc(e) {
        if (e.key === 'Escape') {
            var overlay = document.getElementById('subOverlay');
            if (overlay && overlay.classList.contains('active')) closeSubscriptionModal();
        }
    }

    function _formatExpiry(dateStr) {
        if (!dateStr) return '';
        try {
            var d = new Date(dateStr);
            return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
        } catch (e) { return dateStr; }
    }

    var _PASS_CONF = {
        basic:   { name: 'Casino Pass Basic',   price: 9.99,  gemsPerDay: 100, depositBonus: 0.05 },
        premium: { name: 'Casino Pass Premium',  price: 24.99, gemsPerDay: 300, depositBonus: 0.10 }
    };

    function _buildTierCard(tierKey, tierConf, status) {
        var isPremium = tierKey === 'premium';
        var isActive = status.active && status.tier === tierKey;
        var isOtherActive = status.active && status.tier !== tierKey;
        var card = document.createElement('div');
        card.className = 'sub-card' + (isPremium ? ' featured' : '');
        if (isPremium) {
            var ribbon = document.createElement('div');
            ribbon.className = 'sub-best-value';
            ribbon.textContent = 'BEST VALUE';
            card.appendChild(ribbon);
        }
        var name = document.createElement('div');
        name.className = 'sub-card-name';
        name.textContent = tierConf.name;
        card.appendChild(name);
        var priceRow = document.createElement('div');
        var priceEl = document.createElement('span');
        priceEl.className = 'sub-price';
        priceEl.textContent = '$' + tierConf.price.toFixed(2);
        var periodEl = document.createElement('span');
        periodEl.className = 'sub-price-period';
        periodEl.textContent = ' /month';
        priceRow.appendChild(priceEl);
        priceRow.appendChild(periodEl);
        card.appendChild(priceRow);
        var features = document.createElement('ul');
        features.className = 'sub-features';
        var featureItems = [
            tierConf.gemsPerDay + ' gems every day',
            (tierConf.depositBonus * 100).toFixed(0) + '% deposit bonus'
        ];
        if (isPremium) featureItems.push('Silver VIP fast-track');
        featureItems.forEach(function(text) {
            var li = document.createElement('li');
            li.textContent = text;
            features.appendChild(li);
        });
        card.appendChild(features);
        if (isActive) {
            var activeBadge = document.createElement('div');
            activeBadge.style.cssText = 'margin-top:8px;';
            var badgeSpan = document.createElement('span');
            badgeSpan.className = 'sub-active-badge';
            badgeSpan.textContent = '✓ ACTIVE — expires ' + _formatExpiry(status.expiresAt);
            activeBadge.appendChild(badgeSpan);
            card.appendChild(activeBadge);
            if (!status.dailyClaimedToday) {
                var claimBtn = document.createElement('button');
                claimBtn.className = 'sub-claim-btn';
                claimBtn.textContent = '💎 Claim Today’s Gems';
                claimBtn.addEventListener('click', function() { _claimDaily(claimBtn, tierConf.gemsPerDay); });
                card.appendChild(claimBtn);
            } else {
                var claimedBadge = document.createElement('div');
                claimedBadge.className = 'sub-claimed-badge';
                claimedBadge.textContent = '✓ Claimed today — come back tomorrow!';
                card.appendChild(claimedBadge);
            }
        } else {
            var buyBtn = document.createElement('button');
            buyBtn.className = 'sub-buy-btn';
            buyBtn.textContent = 'Subscribe $' + tierConf.price.toFixed(2);
            if (isOtherActive) { buyBtn.disabled = true; buyBtn.title = 'You already have an active pass'; }
            buyBtn.addEventListener('click', function() { if (!buyBtn.disabled) _activateTier(tierKey, tierConf, buyBtn); });
            card.appendChild(buyBtn);
        }
        return card;
    }
    function _renderStatus(status) {
        var statusBar = document.getElementById('subStatusBar');
        var cards = document.getElementById('subCards');
        if (!statusBar || !cards) return;
        if (status.active && status.tier) {
            statusBar.innerHTML = 'Your pass: <span class="sub-active-badge">✓ ' +
                (_PASS_CONF[status.tier] ? _PASS_CONF[status.tier].name : status.tier) +
                ' — expires ' + _formatExpiry(status.expiresAt) + '</span>';
        } else {
            statusBar.textContent = 'No active pass. Subscribe below to unlock daily gems and deposit bonuses.';
        }
        while (cards.firstChild) cards.removeChild(cards.firstChild);
        ['basic', 'premium'].forEach(function(tierKey) {
            cards.appendChild(_buildTierCard(tierKey, _PASS_CONF[tierKey], status));
        });
    }

    function _fetchStatus() {
        var token = _getToken();
        if (!token) return Promise.resolve(null);
        return fetch('/api/subscription/status', { headers: { 'Authorization': 'Bearer ' + token } })
            .then(function(r) { return r.json(); })
            .catch(function() { return null; });
    }

    function _activateTier(tierKey, tierConf, buyBtn) {
        var token = _getToken();
        if (!token) return;
        buyBtn.disabled = true;
        buyBtn.textContent = 'Processing...';
        fetch('/api/subscription/activate', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
            body: JSON.stringify({ tier: tierKey })
        })
        .then(function(r) { return r.json(); })
        .then(function(data) {
            if (data.success) {
                if (typeof updateBalance === 'function') updateBalance(data.newBalance);
                _showToast('💳 Casino Pass activated!');
                _fetchStatus().then(function(status) {
                    if (status) { _statusCache = status; _renderStatus(status); }
                });
            } else {
                buyBtn.textContent = data.error || 'Error';
                buyBtn.disabled = false;
                setTimeout(function() { buyBtn.textContent = 'Subscribe $' + tierConf.price.toFixed(2); }, 3000);
            }
        })
        .catch(function() {
            buyBtn.textContent = 'Error — try again';
            buyBtn.disabled = false;
            setTimeout(function() { buyBtn.textContent = 'Subscribe $' + tierConf.price.toFixed(2); }, 3000);
        });
    }

    function _claimDaily(claimBtn, gemsPerDay) {
        var token = _getToken();
        if (!token) return;
        claimBtn.disabled = true;
        claimBtn.textContent = 'Claiming...';
        fetch('/api/subscription/claim-daily', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }
        })
        .then(function(r) { return r.json(); })
        .then(function(data) {
            if (data.success) {
                _showToast('💎 +' + data.gemsAwarded + ' gems claimed!');
                _removeNavBadge();
                var claimedBadge = document.createElement('div');
                claimedBadge.className = 'sub-claimed-badge';
                claimedBadge.textContent = '✓ Claimed today — come back tomorrow!';
                if (claimBtn.parentNode) claimBtn.parentNode.replaceChild(claimedBadge, claimBtn);
                if (_statusCache) _statusCache.dailyClaimedToday = true;
            } else {
                claimBtn.disabled = false;
                claimBtn.textContent = data.error || 'Error';
                setTimeout(function() { claimBtn.textContent = '💎 Claim Today’s Gems'; }, 3000);
            }
        })
        .catch(function() {
            claimBtn.disabled = false;
            claimBtn.textContent = '💎 Claim Today’s Gems';
        });
    }
    function _removeNavBadge() {
        var badges = document.querySelectorAll('.sub-nav-badge');
        badges.forEach(function(b) { if (b.parentNode) b.parentNode.removeChild(b); });
    }

    function checkSubscriptionBadge() {
        var token = _getToken();
        if (!token) return;
        _fetchStatus().then(function(status) {
            if (!status) return;
            _statusCache = status;
            if (status.active && !status.dailyClaimedToday) {
                var navBtns = document.querySelectorAll('[data-modal="subscription"], .nav-pass-btn, #navPassBtn');
                if (!navBtns.length) {
                    var allBtns = document.querySelectorAll('button, a');
                    for (var i = 0; i < allBtns.length; i++) {
                        var btn = allBtns[i];
                        if (btn.textContent && btn.textContent.indexOf('Pass') !== -1 && btn.textContent.indexOf('Casino') !== -1) {
                            navBtns = [btn];
                            break;
                        }
                    }
                }
                if (navBtns.length) {
                    var target = navBtns[0];
                    if (!target.querySelector('.sub-nav-badge')) {
                        var badge = document.createElement('span');
                        badge.className = 'sub-nav-badge';
                        badge.textContent = 'NEW';
                        badge.style.cssText = 'background:#ef4444;color:#fff;border-radius:10px;font-size:10px;padding:1px 5px;margin-left:4px;font-weight:700';
                        target.appendChild(badge);
                    }
                }
                _showToast('💎 Your daily Casino Pass gems are ready!');
            }
        });
    }

    function openSubscriptionModal() {
        _buildModal();
        var overlay = document.getElementById('subOverlay');
        if (!overlay) return;
        overlay.classList.add('active');
        var statusBar = document.getElementById('subStatusBar');
        if (statusBar) statusBar.textContent = 'Loading...';
        _fetchStatus().then(function(status) {
            if (!status) {
                if (statusBar) statusBar.textContent = 'Unable to load subscription data. Please try again.';
                return;
            }
            _statusCache = status;
            _renderStatus(status);
        });
    }

    function closeSubscriptionModal() {
        var overlay = document.getElementById('subOverlay');
        if (overlay) overlay.classList.remove('active');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() { setTimeout(checkSubscriptionBadge, 3000); });
    } else {
        setTimeout(checkSubscriptionBadge, 3000);
    }

    window.openSubscriptionModal = openSubscriptionModal;
    window.closeSubscriptionModal = closeSubscriptionModal;
    window.checkSubscriptionBadge = checkSubscriptionBadge;

}());