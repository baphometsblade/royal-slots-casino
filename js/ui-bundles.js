(function () {
    'use strict';

    var _stylesInjected = false;
    var _bundles = [];

    function _getToken() {
        var key = typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken';
        return localStorage.getItem(key);
    }

    function _authHeaders() {
        var t = _getToken();
        var h = { 'Content-Type': 'application/json' };
        if (t) h['Authorization'] = 'Bearer ' + t;
        return h;
    }

    function _currentBalance() {
        if (typeof balance !== 'undefined') return balance;
        return null;
    }

    function _fmt(n) {
        return parseFloat(n).toFixed(2);
    }

    function injectStyles() {
        if (_stylesInjected) return;
        _stylesInjected = true;
        var s = document.createElement('style');
        s.id = 'bundleStyles';
        s.textContent = [
            '.bundle-modal{max-width:700px;max-height:88vh;overflow-y:auto;background:#0d0d1a;border-radius:16px;padding:0 0 24px}',
            '.bundle-modal-header{padding:24px 24px 16px;border-bottom:1px solid rgba(255,255,255,.08)}',
            '.bundle-modal-title{font-size:22px;font-weight:800;color:#ffd700;margin:0 0 4px}',
            '.bundle-modal-sub{font-size:13px;color:rgba(255,255,255,.5);margin:0}',
            '.bundle-balance{padding:12px 24px;font-size:14px;color:rgba(255,255,255,.6);border-bottom:1px solid rgba(255,255,255,.05)}',
            '.bundle-balance strong{color:#4ade80;font-size:17px}',
            '.bundle-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:14px;padding:20px 24px}',
            '.bundle-card{background:linear-gradient(135deg,#1a1a2e,#16213e);border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:20px 16px 16px;display:flex;flex-direction:column;gap:7px;position:relative;overflow:hidden;transition:transform .15s,box-shadow .15s}',
            '.bundle-card:hover{transform:translateY(-3px);box-shadow:0 8px 28px rgba(0,0,0,.5)}',
            '.bundle-card.featured{border-color:#ffd700;box-shadow:0 0 22px rgba(255,215,0,.18);background:linear-gradient(135deg,#1a1600,#2a2000)}',
            '.bundle-best-value{position:absolute;top:16px;left:-24px;background:linear-gradient(90deg,#ff6b00,#ffd700);color:#000;font-size:9px;font-weight:900;padding:4px 32px;transform:rotate(-45deg);letter-spacing:1.5px;text-transform:uppercase;box-shadow:0 2px 6px rgba(0,0,0,.5)}',
            '.bundle-badge{position:absolute;top:8px;right:10px;font-size:1.5rem}',
            '.bundle-name{font-size:14px;font-weight:700;color:#e2e2e2;margin-top:4px}',
            '.bundle-credits{font-size:24px;font-weight:800;color:#fff}',
            '.bundle-bonus-line{font-size:13px;color:#4ade80;font-weight:600}',
            '.bundle-total{font-size:18px;font-weight:800;color:#ffd700}',
            '.bundle-spins{font-size:12px;color:#fbbf24}',
            '.bundle-vpd{font-size:11px;color:rgba(255,255,255,.35);margin-top:auto;padding-top:4px}',
            '.bundle-buy-btn{background:linear-gradient(135deg,#f59e0b,#d97706);color:#000;border:none;padding:11px;border-radius:8px;font-size:15px;font-weight:800;cursor:pointer;width:100%;margin-top:6px;transition:opacity .15s,transform .1s}',
            '.bundle-buy-btn:hover{opacity:.88;transform:scale(1.02)}',
            '.bundle-buy-btn:disabled{opacity:.45;cursor:not-allowed;transform:none}',
            '.bundle-success{position:absolute;inset:0;background:rgba(0,20,0,.88);display:flex;flex-direction:column;align-items:center;justify-content:center;border-radius:12px;gap:8px;animation:bdlFadeOut 2.2s forwards}',
            '.bundle-success-icon{font-size:2.4rem}',
            '.bundle-success-text{font-size:13px;font-weight:700;color:#4ade80;text-align:center;padding:0 12px}',
            '@keyframes bdlFadeOut{0%{opacity:0}15%{opacity:1}75%{opacity:1}100%{opacity:0}}'
        ].join('\n');
        document.head.appendChild(s);
    }

    function buildCard(b) {
        var card = document.createElement('div');
        card.className = 'bundle-card' + (b.id === 'gold' ? ' featured' : '');

        if (b.id === 'gold') {
            var ribbon = document.createElement('div');
            ribbon.className = 'bundle-best-value';
            ribbon.textContent = 'BEST VALUE';
            card.appendChild(ribbon);
        }

        if (b.badge) {
            var badge = document.createElement('span');
            badge.className = 'bundle-badge';
            badge.textContent = b.badge;
            card.appendChild(badge);
        }

        var name = document.createElement('div');
        name.className = 'bundle-name';
        name.textContent = b.name;

        var creds = document.createElement('div');
        creds.className = 'bundle-credits';
        creds.textContent = b.credits + ' credits';

        card.appendChild(name);
        card.appendChild(creds);

        if (b.bonusCredits > 0) {
            var bonus = document.createElement('div');
            bonus.className = 'bundle-bonus-line';
            bonus.textContent = '+ ' + b.bonusCredits + ' bonus credits';
            card.appendChild(bonus);

            var total = document.createElement('div');
            total.className = 'bundle-total';
            total.textContent = '= ' + b.totalCredits + ' total';
            card.appendChild(total);
        }

        if (b.bonusWheelSpins > 0) {
            var spins = document.createElement('div');
            spins.className = 'bundle-spins';
            spins.textContent = '🎡 +' + b.bonusWheelSpins + ' Bonus Wheel Spin' + (b.bonusWheelSpins > 1 ? 's' : '');
            card.appendChild(spins);
        }

        var vpd = document.createElement('div');
        vpd.className = 'bundle-vpd';
        vpd.textContent = b.valuePerDollar + ' credits / $1';
        card.appendChild(vpd);

        var btn = document.createElement('button');
        btn.className = 'bundle-buy-btn';
        btn.textContent = 'BUY $' + _fmt(b.price);
        btn.addEventListener('click', function () { _purchase(b, card, btn); });
        card.appendChild(btn);

        return card;
    }

    function _purchase(b, card, btn) {
        var token = _getToken();
        if (!token) { btn.textContent = 'Please log in'; setTimeout(function () { btn.textContent = 'BUY $' + _fmt(b.price); }, 3000); return; }
        btn.disabled = true;
        btn.textContent = 'Processing…';
        fetch('/api/bundles/purchase', {
            method: 'POST',
            headers: _authHeaders(),
            body: JSON.stringify({ bundleId: b.id })
        })
            .then(function (r) { return r.json(); })
            .then(function (data) {
                if (data.error) {
                    btn.disabled = false;
                    btn.style.background = 'linear-gradient(135deg,#ef4444,#b91c1c)';
                    btn.style.color = '#fff';
                    btn.textContent = data.error;
                    setTimeout(function () {
                        btn.style.background = '';
                        btn.style.color = '';
                        btn.textContent = 'BUY $' + _fmt(b.price);
                        btn.disabled = false;
                    }, 3000);
                    return;
                }
                // Success overlay
                var overlay = document.createElement('div');
                overlay.className = 'bundle-success';
                var ico = document.createElement('div');
                ico.className = 'bundle-success-icon';
                ico.textContent = '✅';
                var txt = document.createElement('div');
                txt.className = 'bundle-success-text';
                txt.textContent = '+' + b.totalCredits + ' credits added!';
                overlay.appendChild(ico);
                overlay.appendChild(txt);
                card.appendChild(overlay);
                setTimeout(function () {
                    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
                    btn.disabled = false;
                    btn.textContent = 'BUY $' + _fmt(b.price);
                }, 2300);
                // Update balance
                if (data.newBalance !== undefined) {
                    if (typeof updateBalance === 'function') updateBalance(data.newBalance);
                    if (typeof balance !== 'undefined') window.balance = data.newBalance;
                    var balEl = document.getElementById('bundleBalanceAmt');
                    if (balEl) balEl.textContent = '$' + _fmt(data.newBalance);
                }
            })
            .catch(function () {
                btn.disabled = false;
                btn.textContent = 'Error — try again';
                setTimeout(function () { btn.textContent = 'BUY $' + _fmt(b.price); }, 3000);
            });
    }

    function renderModal() {
        var modal = document.getElementById('bundleModal');
        var grid = modal.querySelector('.bundle-grid');
        while (grid.firstChild) grid.removeChild(grid.firstChild);

        var cur = _currentBalance();
        var balEl = document.getElementById('bundleBalanceAmt');
        if (balEl && cur !== null) balEl.textContent = '$' + _fmt(cur);

        _bundles.forEach(function (b) {
            grid.appendChild(buildCard(b));
        });
    }

    function _ensureModal() {
        if (document.getElementById('bundleOverlay')) return;

        injectStyles();

        var overlay = document.createElement('div');
        overlay.id = 'bundleOverlay';
        overlay.className = 'modal-overlay';
        overlay.style.cssText = 'display:none;position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:10400;display:flex;align-items:center;justify-content:center';
        overlay.addEventListener('click', function (e) { if (e.target === overlay) closeBundleStore(); });

        var modal = document.createElement('div');
        modal.id = 'bundleModal';
        modal.className = 'modal bundle-modal';

        var header = document.createElement('div');
        header.className = 'bundle-modal-header';
        var title = document.createElement('div');
        title.className = 'bundle-modal-title';
        title.textContent = '💎 CREDIT BUNDLES';
        var sub = document.createElement('p');
        sub.className = 'bundle-modal-sub';
        sub.textContent = 'Bulk up your balance — bonus credits included';
        var closeBtn = document.createElement('button');
        closeBtn.className = 'modal-close';
        closeBtn.textContent = '×';
        closeBtn.style.cssText = 'float:right;background:none;border:none;color:#fff;font-size:24px;cursor:pointer;line-height:1;margin-top:-4px';
        closeBtn.addEventListener('click', closeBundleStore);
        header.appendChild(closeBtn);
        header.appendChild(title);
        header.appendChild(sub);

        var balBar = document.createElement('div');
        balBar.className = 'bundle-balance';
        var balLabel = document.createTextNode('Your balance: ');
        var balAmt = document.createElement('strong');
        balAmt.id = 'bundleBalanceAmt';
        var cur = _currentBalance();
        balAmt.textContent = cur !== null ? '$' + _fmt(cur) : '—';
        balBar.appendChild(balLabel);
        balBar.appendChild(balAmt);

        var grid = document.createElement('div');
        grid.className = 'bundle-grid';

        modal.appendChild(header);
        modal.appendChild(balBar);
        modal.appendChild(grid);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
    }

    function openBundleStore() {
        _ensureModal();
        var overlay = document.getElementById('bundleOverlay');
        overlay.style.display = 'flex';
        document.addEventListener('keydown', _onEsc);

        fetch('/api/bundles')
            .then(function (r) { return r.json(); })
            .then(function (data) {
                _bundles = data.bundles || [];
                renderModal();
            })
            .catch(function () {
                var grid = document.querySelector('#bundleModal .bundle-grid');
                if (grid) { var msg = document.createElement('p'); msg.style.cssText = 'color:rgba(255,255,255,.5);padding:20px;text-align:center'; msg.textContent = 'Unable to load bundles.'; grid.appendChild(msg); }
            });
    }

    function closeBundleStore() {
        var overlay = document.getElementById('bundleOverlay');
        if (overlay) overlay.style.display = 'none';
        document.removeEventListener('keydown', _onEsc);
    }

    function _onEsc(e) { if (e.key === 'Escape') closeBundleStore(); }

    window.openBundleStore = openBundleStore;
    window.closeBundleStore = closeBundleStore;
}());
