/* ui-vipfasttrack.js -- VIP Fast-Track pitch panel (goal gradient effect)
 * Slides in from the right when a player is within 10% of the next VIP tier.
 * Client-only IIFE, no ES modules, global scope.
 */
(function () {
    'use strict';

    // VIP tier definitions -- must match ui-vipprogress.js
    var VIP_TIERS = [
        { id: 'bronze',   label: 'Bronze',   emoji: '🥉', minSpins: 0,     benefit: 'Starter rewards & daily bonus' },
        { id: 'silver',   label: 'Silver',   emoji: '🥈', minSpins: 500,   benefit: '5% boost on all wins' },
        { id: 'gold',     label: 'Gold',     emoji: '🥇', minSpins: 2000,  benefit: 'Priority withdrawals + exclusive games' },
        { id: 'platinum', label: 'Platinum', emoji: '💎', minSpins: 5000,  benefit: 'Personal manager + 10% rakeback' },
        { id: 'diamond',  label: 'Diamond',  emoji: '💠', minSpins: 10000, benefit: 'Max rakeback + custom limits + VIP lounge' }
    ];

    // Internal state
    var _spinCount = 0;
    var _autoDismissTimer = null;
    var _stylesInjected = false;

    // Auth token helper
    function _getToken() {
        var key = typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken';
        return localStorage.getItem(key);
    }

    // Snooze helpers
    function _snooze(tierId) {
        try { localStorage.setItem('vft_snoozed_' + tierId, Date.now()); } catch (e) { /* ignore */ }
    }

    function _isSnoozed(tierId) {
        var t = parseInt(localStorage.getItem('vft_snoozed_' + tierId) || 0, 10);
        return Date.now() - t < 30 * 60 * 1000; // 30 minutes
    }

    // Style injection
    function _injectStyles() {
        if (_stylesInjected || document.getElementById('vftStyles')) {
            _stylesInjected = true;
            return;
        }
        var style = document.createElement('style');
        style.id = 'vftStyles';
        style.textContent = [
            '#vftPanel{position:fixed;right:16px;bottom:80px;z-index:10400;width:300px;background:#0d0d1a;border:1px solid rgba(255,215,0,.4);border-radius:14px;box-shadow:0 8px 40px rgba(0,0,0,.7);animation:vftSlideIn .4s ease;overflow:hidden}',
            '@keyframes vftSlideIn{from{transform:translateX(120%);opacity:0}to{transform:translateX(0);opacity:1}}',
            '.vft-header{background:linear-gradient(135deg,rgba(255,215,0,.15),rgba(255,215,0,.05));padding:12px 14px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(255,215,0,.2)}',
            '.vft-badge{font-size:12px;font-weight:800;color:#ffd700;letter-spacing:1px}',
            '.vft-close-btn{background:none;border:1px solid rgba(255,255,255,.2);color:rgba(255,255,255,.5);border-radius:6px;width:24px;height:24px;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center}',
            '.vft-body{padding:14px}',
            '.vft-headline{font-size:17px;font-weight:800;color:#ffd700;margin-bottom:6px}',
            '.vft-benefit{font-size:12px;color:rgba(255,255,255,.6);background:rgba(255,215,0,.08);border-radius:6px;padding:6px 10px;margin-bottom:12px}',
            '.vft-offer-text{font-size:12px;color:rgba(255,255,255,.4);margin-bottom:8px}',
            '.vft-bundle-card{background:rgba(255,215,0,.06);border:1px solid rgba(255,215,0,.2);border-radius:8px;padding:10px 12px;margin-bottom:10px;text-align:center}',
            '.vft-bundle-name{font-size:10px;color:rgba(255,255,255,.4);margin-bottom:2px}',
            '.vft-bundle-credits{font-size:14px;font-weight:800;color:#fff}',
            '.vft-bundle-price{font-size:18px;font-weight:900;color:#ffd700}',
            '.vft-cta-btn{background:linear-gradient(135deg,#f59e0b,#d97706);color:#000;border:none;padding:11px;border-radius:8px;font-size:14px;font-weight:800;cursor:pointer;width:100%;margin-bottom:6px}',
            '.vft-cta-btn:hover{filter:brightness(1.1)}',
            '.vft-dismiss{background:none;border:none;color:rgba(255,255,255,.3);font-size:12px;cursor:pointer;width:100%;text-align:center;padding:4px}',
            '.vft-dismiss:hover{color:rgba(255,255,255,.6)}',
            '.vft-progress{height:3px;background:rgba(255,215,0,.1)}',
            '.vft-progress-fill{height:100%;background:#ffd700;width:100%;transition:width 25s linear}'
        ].join("");
        document.head.appendChild(style);
        _stylesInjected = true;
    }

    // Close / snooze
    function _closePanel(tierId) {
        var panel = document.getElementById('vftPanel');
        if (panel && panel.parentNode) {
            panel.parentNode.removeChild(panel);
        }
        if (tierId) {
            _snooze(tierId);
        }
        if (_autoDismissTimer) {
            clearTimeout(_autoDismissTimer);
            _autoDismissTimer = null;
        }
    }

    // Bundle card fetch
    function _populateBundleCard(card, nextTierLabel) {
        var token = _getToken();
        var headers = { 'Content-Type': 'application/json' };
        if (token) { headers['Authorization'] = 'Bearer ' + token; }

        fetch('/api/bundles', { headers: headers })
            .then(function (res) {
                if (!res.ok) { throw new Error('bundles fetch failed'); }
                return res.json();
            })
            .then(function (data) {
                var bundles = Array.isArray(data) ? data : (data.bundles || []);
                if (!bundles.length) { throw new Error('no bundles'); }

                // Prefer the 'gold' bundle; fall back to highest totalCredits
                var bundle = null;
                for (var i = 0; i < bundles.length; i++) {
                    if (bundles[i].id === 'gold') { bundle = bundles[i]; break; }
                }
                if (!bundle) {
                    bundles.sort(function (a, b) {
                        return (b.totalCredits || b.credits || 0) - (a.totalCredits || a.credits || 0);
                    });
                    bundle = bundles[0];
                }

                var credits = bundle.totalCredits || bundle.credits || 0;
                var price   = bundle.price || bundle.cost || 0;
                var name    = bundle.name || bundle.label || 'Credit Bundle';

                card.querySelector('.vft-bundle-name').textContent    = name;
                card.querySelector('.vft-bundle-credits').textContent  = credits + ' total credits';
                card.querySelector('.vft-bundle-price').textContent    = '$' + parseFloat(price).toFixed(2);
            })
            .catch(function () {
                // Silent fail -- hide the card
                if (card && card.parentNode) {
                    card.style.display = 'none';
                }
            });
    }

    // Show panel
    function _showPanel(nextTier, spinsLeft) {
        _injectStyles();

        var panel = document.createElement('div');
        panel.id = 'vftPanel';

        // Header
        var header = document.createElement('div');
        header.className = 'vft-header';

        var badge = document.createElement('span');
        badge.className = 'vft-badge';
        badge.textContent = '⚡ VIP FAST-TRACK';

        var closeBtn = document.createElement('button');
        closeBtn.className = 'vft-close-btn';
        closeBtn.textContent = '×';
        closeBtn.setAttribute('aria-label', 'Close');
        closeBtn.addEventListener('click', function () {
            _closePanel(nextTier.id);
        });

        header.appendChild(badge);
        header.appendChild(closeBtn);

        // Body
        var body = document.createElement('div');
        body.className = 'vft-body';

        var headline = document.createElement('div');
        headline.className = 'vft-headline';
        headline.textContent = nextTier.emoji + ' ' + spinsLeft + ' spins to ' + nextTier.label + ' VIP!';

        var benefit = document.createElement('div');
        benefit.className = 'vft-benefit';
        benefit.textContent = '🔓 Unlock: ' + nextTier.benefit;

        var divider = document.createElement('hr');
        divider.className = 'vft-divider';
        divider.style.cssText = 'border:none;border-top:1px solid rgba(255,215,0,.12);margin:0 0 10px';

        var offerText = document.createElement('div');
        offerText.className = 'vft-offer-text';
        offerText.textContent = 'Buy credits to play faster and unlock ' + nextTier.label + ' sooner:';

        // Bundle card placeholder
        var bundleCard = document.createElement('div');
        bundleCard.className = 'vft-bundle-card';

        var bundleName = document.createElement('div');
        bundleName.className = 'vft-bundle-name';
        bundleName.textContent = 'Loading offer…';

        var bundleCredits = document.createElement('div');
        bundleCredits.className = 'vft-bundle-credits';
        bundleCredits.textContent = '';

        var bundlePrice = document.createElement('div');
        bundlePrice.className = 'vft-bundle-price';
        bundlePrice.textContent = '';

        bundleCard.appendChild(bundleName);
        bundleCard.appendChild(bundleCredits);
        bundleCard.appendChild(bundlePrice);

        // CTA button
        var ctaBtn = document.createElement('button');
        ctaBtn.className = 'vft-cta-btn';
        ctaBtn.textContent = '💎 Fast-Track to ' + nextTier.label;
        ctaBtn.addEventListener('click', function () {
            _closePanel(nextTier.id);
            if (typeof openBundleStore === 'function') {
                openBundleStore();
            } else if (typeof openWalletModal === 'function') {
                openWalletModal();
            }
        });

        // Dismiss
        var dismiss = document.createElement('button');
        dismiss.className = 'vft-dismiss';
        dismiss.textContent = 'Continue playing';
        dismiss.addEventListener('click', function () {
            _closePanel(nextTier.id);
        });

        body.appendChild(headline);
        body.appendChild(benefit);
        body.appendChild(divider);
        body.appendChild(offerText);
        body.appendChild(bundleCard);
        body.appendChild(ctaBtn);
        body.appendChild(dismiss);

        // Progress bar (auto-dismiss timer visual)
        var progressWrap = document.createElement('div');
        progressWrap.className = 'vft-progress';

        var progressFill = document.createElement('div');
        progressFill.className = 'vft-progress-fill';

        progressWrap.appendChild(progressFill);

        // Assemble and add to DOM
        panel.appendChild(header);
        panel.appendChild(body);
        panel.appendChild(progressWrap);
        document.body.appendChild(panel);

        // Kick off CSS transition to shrink bar to 0 over 25s
        requestAnimationFrame(function () {
            requestAnimationFrame(function () {
                progressFill.style.width = '0%';
            });
        });

        // Auto-dismiss after 25 seconds
        _autoDismissTimer = setTimeout(function () {
            _closePanel(nextTier.id);
        }, 25000);

        // Fetch bundle data asynchronously
        _populateBundleCard(bundleCard, nextTier.label);
    }

    // Trigger check
    function _checkTrigger() {
        try {
            var spins = (window.stats && window.stats.totalSpins) || 0;

            // Find current and next tier
            var currentTier = VIP_TIERS[0];
            var nextTier = null;
            var i, j;
            for (i = 0; i < VIP_TIERS.length; i++) {
                if (spins >= VIP_TIERS[i].minSpins) {
                    currentTier = VIP_TIERS[i];
                }
            }
            for (j = 0; j < VIP_TIERS.length; j++) {
                if (VIP_TIERS[j].minSpins > currentTier.minSpins) {
                    nextTier = VIP_TIERS[j];
                    break;
                }
            }

            // Already at Diamond -- nothing to promote
            if (!nextTier) { return; }

            var pct = (spins - currentTier.minSpins) / (nextTier.minSpins - currentTier.minSpins);

            // Only trigger when within the last 10%
            if (pct < 0.90) { return; }

            // Snooze guard
            if (_isSnoozed(nextTier.id)) { return; }

            // Panel already shown
            if (document.getElementById('vftPanel')) { return; }

            var spinsLeft = nextTier.minSpins - spins;
            _showPanel(nextTier, spinsLeft);
        } catch (e) {
            // Silent catch
        }
    }

    // Hook into updateBalance (fires after every spin)
    var _prevUpdateBalance = window.updateBalance;
    window.updateBalance = function (newBal) {
        if (_prevUpdateBalance) { _prevUpdateBalance.apply(this, arguments); }
        _spinCount = (_spinCount || 0) + 1;
        if (_spinCount % 5 === 0) { _checkTrigger(); }
    };

    // Initial check on load (5 s delay)
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            setTimeout(_checkTrigger, 5000);
        });
    } else {
        setTimeout(_checkTrigger, 5000);
    }

    // Global export
    window.closeFastTrack = function () {
        var panel = document.getElementById('vftPanel');
        if (panel && panel.parentNode) {
            panel.parentNode.removeChild(panel);
        }
    };

}());
