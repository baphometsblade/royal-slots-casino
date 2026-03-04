/**
 * ui-lowbalance.js - Low-balance deposit nudge overlay
 * Sprint 16 conversion tool: fires when balance drops below $10.
 * IIFE, global scope, no ES modules.
 */
(function () {
    'use strict';

    // -- Constants
    var BALANCE_THRESHOLD = 10;
    var SNOOZE_KEY        = 'lbn_snoozed';
    var SNOOZE_DURATION   = 5 * 60 * 1000;
    var AUTO_DISMISS_MS   = 15000;
    var OVERLAY_ID        = 'lbnOverlay';
    var STYLES_ID         = 'lbnStyles';

    // -- Internal state
    var _autoDismissTimer = null;
    var _stylesInjected   = false;

    // -- Auth token helper
    function _getToken() {
        var key = typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken';
        return localStorage.getItem(key);
    }

    // -- Snooze helpers
    function _isSnoozed() {
        var ts = parseInt(localStorage.getItem(SNOOZE_KEY) || '0', 10);
        return (Date.now() - ts) < SNOOZE_DURATION;
    }
    function _setSnooze() {
        localStorage.setItem(SNOOZE_KEY, String(Date.now()));
    }

    // -- Style injection
    function _injectStyles() {
        if (_stylesInjected || document.getElementById(STYLES_ID)) {
            _stylesInjected = true; return;
        }
        var style = document.createElement('style');
        style.id = STYLES_ID;
        var rules = [
            '#lbnOverlay{position:fixed;bottom:0;left:50%;transform:translateX(-50%);z-index:20000;width:100%;max-width:380px}',
            '#lbnCard{background:#0d0d1a;border:1px solid rgba(255,215,0,.4);border-radius:16px 16px 0 0;padding:24px;box-shadow:0 -8px 40px rgba(0,0,0,.8);animation:lbnSlideUp .4s ease}',
            '@keyframes lbnSlideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}',
            '.lbn-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px}',
            '.lbn-icon{font-size:32px;line-height:1}',
            '.lbn-close{background:none;border:1px solid rgba(255,255,255,.15);color:rgba(255,255,255,.5);border-radius:6px;width:28px;height:28px;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center}',
            '.lbn-title{font-size:18px;font-weight:800;color:#ffd700;margin:8px 0 4px}',
            '.lbn-sub{font-size:13px;color:rgba(255,255,255,.5);margin-bottom:14px}',
            '.lbn-bundle-card{background:rgba(255,215,0,.08);border:1px solid rgba(255,215,0,.25);border-radius:10px;padding:12px 14px;margin-bottom:12px}',
            '.lbn-bundle-name{font-size:12px;color:rgba(255,255,255,.5);margin-bottom:4px}',
            '.lbn-bundle-credits{font-size:18px;font-weight:800;color:#fff;margin-bottom:2px}',
            '.lbn-bundle-price{font-size:22px;font-weight:900;color:#ffd700}',
            '.lbn-bundle-generic{font-size:14px;color:rgba(255,255,255,.6);text-align:center;padding:8px 0 4px}',
            '.lbn-campaign-badge{background:rgba(34,197,94,.15);border:1px solid rgba(34,197,94,.4);color:#4ade80;border-radius:8px;padding:8px 12px;font-size:13px;font-weight:700;text-align:center;margin-bottom:12px}',
            '.lbn-actions{display:flex;gap:10px;margin-top:16px}',
            '.lbn-buy-btn{flex:1;background:linear-gradient(135deg,#f59e0b,#d97706);color:#000;border:none;padding:12px;border-radius:8px;font-size:15px;font-weight:800;cursor:pointer}',
            '.lbn-dismiss{background:none;border:1px solid rgba(255,255,255,.2);color:rgba(255,255,255,.4);border-radius:8px;padding:12px 16px;font-size:14px;cursor:pointer;white-space:nowrap}',
            '.lbn-dismiss:hover{color:rgba(255,255,255,.7)}',
            '.lbn-progress-bar{height:2px;background:rgba(255,215,0,.3);border-radius:1px;margin-top:16px;overflow:hidden}',
            '.lbn-progress-fill{height:100%;background:#ffd700;width:100%;transition:width 15s linear}'
        ];
        style.textContent = rules.join(nl);
        document.head.appendChild(style);
        _stylesInjected = true;
    }

    // -- DOM builder helper
    function _el(tag, attrs, text) {
        var node = document.createElement(tag);
        if (attrs) {
            Object.keys(attrs).forEach(function (k) {
                if (k === 'className') { node.className = attrs[k]; }
                else if (k === 'id') { node.id = attrs[k]; }
                else { node.setAttribute(k, attrs[k]); }
            });
        }
        if (text !== undefined) node.textContent = text;
        return node;
    }

    // -- Render bundle card
    function _renderBundleCard(bundle) {
        var card    = _el('div', { className: 'lbn-bundle-card' });
        var name    = _el('div', { className: 'lbn-bundle-name' }, bundle.name || 'Gold Bundle');
        var tot     = bundle.totalCredits ? Number(bundle.totalCredits).toLocaleString() : '15,000';
        var credits = _el('div', { className: 'lbn-bundle-credits' }, tot + ' total credits');
        var price   = _el('div', { className: 'lbn-bundle-price' }, '$' + parseFloat(bundle.price || 49.99).toFixed(2));
        card.appendChild(name);
        card.appendChild(credits);
        card.appendChild(price);
        return card;
    }

    // -- Close
    function closeLowBalanceNudge() {
        _clearAutoDismiss();
        _setSnooze();
        var overlay = document.getElementById(OVERLAY_ID);
        if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }
    function _clearAutoDismiss() {
        if (_autoDismissTimer !== null) { clearTimeout(_autoDismissTimer); _autoDismissTimer = null; }
    }

    // -- Buy button action
    function _handleBuy() {
        closeLowBalanceNudge();
        if (typeof openBundleStore === 'function') { openBundleStore(); }
        else if (typeof openWalletModal === 'function') { openWalletModal(); }
    }

    // -- Show nudge
    function _showNudge() {
        if (document.getElementById(OVERLAY_ID)) return;
        _injectStyles();

        var overlay = _el('div', { id: OVERLAY_ID });
        var card    = _el('div', { id: 'lbnCard' });

        // Header
        var header   = _el('div', { className: 'lbn-header' });
        var icon     = _el('div', { className: 'lbn-icon' });
        icon.textContent = '💸';
        var closeBtn = _el('button', { className: 'lbn-close' });
        closeBtn.textContent = '×';
        closeBtn.addEventListener('click', function () { closeLowBalanceNudge(); });
        header.appendChild(icon);
        header.appendChild(closeBtn);

        // Title / subtitle
        var title = _el('div', { className: 'lbn-title' }, 'Running Low?');
        var sub   = _el('div', { className: 'lbn-sub' }, 'Top up now and keep the streak alive!');

        // Placeholders replaced after async fetch
        var bundlePlaceholder   = _el('div', { className: 'lbn-bundle-placeholder' });
        var campaignPlaceholder = _el('div', { className: 'lbn-campaign-placeholder' });

        // Action buttons
        var actions = _el('div', { className: 'lbn-actions' });
        var buyBtn  = _el('button', { className: 'lbn-buy-btn' });
        buyBtn.textContent = '💎 Buy Credits';
        var dismiss = _el('button', { className: 'lbn-dismiss' }, 'Not now');
        buyBtn.addEventListener('click', function () { _handleBuy(); });
        dismiss.addEventListener('click', function () { closeLowBalanceNudge(); });
        actions.appendChild(buyBtn);
        actions.appendChild(dismiss);

        // Progress bar
        var progressBar  = _el('div', { className: 'lbn-progress-bar' });
        var progressFill = _el('div', { className: 'lbn-progress-fill' });
        progressBar.appendChild(progressFill);

        // Assemble card
        card.appendChild(header);
        card.appendChild(title);
        card.appendChild(sub);
        card.appendChild(bundlePlaceholder);
        card.appendChild(campaignPlaceholder);
        card.appendChild(actions);
        card.appendChild(progressBar);
        overlay.appendChild(card);
        document.body.appendChild(overlay);

        // Animate progress bar to 0% over 15 s (double-RAF)
        requestAnimationFrame(function () {
            requestAnimationFrame(function () { progressFill.style.width = '0%'; });
        });

        // Auto-dismiss after 15 s
        _autoDismissTimer = setTimeout(function () { closeLowBalanceNudge(); }, AUTO_DISMISS_MS);

        // -- Fetch bundle data
        fetch('/api/bundles')
            .then(function (r) { return r.ok ? r.json() : null; })
            .then(function (data) {
                var ov = document.getElementById(OVERLAY_ID); if (!ov) return;
                var ph = ov.querySelector('.lbn-bundle-placeholder'); if (!ph) return;
                var bundles = Array.isArray(data) ? data
                    : (data && Array.isArray(data.bundles) ? data.bundles : null);
                var bundle = null;
                if (bundles && bundles.length) {
                    bundle = bundles.filter(function (b) { return b.id === 'gold'; })[0] || null;
                    if (!bundle) {
                        bundle = bundles.slice().sort(function (a, b) {
                            return parseFloat(b.price || 0) - parseFloat(a.price || 0);
                        })[0] || null;
                    }
                }
                if (bundle) {
                    ph.parentNode.replaceChild(_renderBundleCard(bundle), ph);
                } else {
                    var g = _el('div', { className: 'lbn-bundle-generic' }, 'View bundle deals for bonus credits');
                    ph.parentNode.replaceChild(g, ph);
                }
            })
            .catch(function () {
                var ov = document.getElementById(OVERLAY_ID); if (!ov) return;
                var ph = ov.querySelector('.lbn-bundle-placeholder'); if (!ph) return;
                var g = _el('div', { className: 'lbn-bundle-generic' }, 'View bundle deals for bonus credits');
                ph.parentNode.replaceChild(g, ph);
            });

        // -- Fetch campaign data
        var token = _getToken();
        var hdrs = { 'Content-Type': 'application/json' };
        if (token) hdrs['Authorization'] = 'Bearer ' + token;

        fetch('/api/campaigns', { headers: hdrs })
            .then(function (r) { return r.ok ? r.json() : null; })
            .then(function (data) {
                var ov = document.getElementById(OVERLAY_ID); if (!ov) return;
                var ph2 = ov.querySelector('.lbn-campaign-placeholder'); if (!ph2) return;
                var campaigns = Array.isArray(data) ? data
                    : (data && Array.isArray(data.campaigns) ? data.campaigns : null);
                var dm = null;
                if (campaigns && campaigns.length) {
                    var active = campaigns.filter(function (c) {
                        return c.active || c.isActive || c.status === 'active';
                    });
                    dm = active.filter(function (c) {
                        var t = (c.type || c.campaignType || '').toLowerCase();
                        return t.indexOf('deposit') !== -1 || t.indexOf('match') !== -1;
                    })[0] || null;
                }
                if (dm) {
                    var badge = _el('div', { className: 'lbn-campaign-badge' });
                    badge.textContent = '🎁 Deposit Match Active!';
                    ph2.parentNode.replaceChild(badge, ph2);
                } else {
                    if (ph2.parentNode) ph2.parentNode.removeChild(ph2);
                }
            })
            .catch(function () {
                var ov = document.getElementById(OVERLAY_ID); if (!ov) return;
                var ph2 = ov.querySelector('.lbn-campaign-placeholder');
                if (ph2 && ph2.parentNode) ph2.parentNode.removeChild(ph2);
            });
    }

    // -- Balance change handler
    function _onBalanceChange(newBal) {
        var n = parseFloat(newBal);
        if (isNaN(n) || n >= BALANCE_THRESHOLD) return;
        if (_isSnoozed()) return;
        var bo = document.getElementById('bundleOverlay');
        if (bo && bo.style.display !== 'none') return;
        var wm = document.getElementById('walletModal');
        if (wm && wm.classList.contains('active')) return;
        _showNudge();
    }

    // -- Intercept updateBalance
    var _prevUpdateBalance = window.updateBalance;
    window.updateBalance = function (newBal) {
        if (_prevUpdateBalance) _prevUpdateBalance.apply(this, arguments);
        _onBalanceChange(newBal);
    };

    // -- Intercept window.balance via defineProperty
    try {
        var _bs = (typeof window.balance === 'number') ? window.balance : 0;
        Object.defineProperty(window, 'balance', {
            get: function () { return _bs; },
            set: function (v) { _bs = v; _onBalanceChange(v); },
            configurable: true
        });
    } catch (e) {
        // defineProperty may fail in some environments -- silently acceptable
    }

    // -- Public API
    function openLowBalanceNudge() {
        if (_isSnoozed()) return;
        _showNudge();
    }

    window.openLowBalanceNudge  = openLowBalanceNudge;
    window.closeLowBalanceNudge = closeLowBalanceNudge;

}());
