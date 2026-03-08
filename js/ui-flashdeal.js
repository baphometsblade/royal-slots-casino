/* ui-flashdeal.js — Countdown Flash Deals
 * Sprint 34: Periodic time-limited deal banners that create urgency.
 * Dynamically creates its own DOM element. 25% chance every 30 minutes.
 */
(function () {
    'use strict';

    var STORAGE_KEY     = 'ms_flashDealData';
    var DEALS = [
        { offer: 'Get $20 for $10!',        discount: 10 },
        { offer: '$50 bonus for $25!',       discount: 25 },
        { offer: '5x Free Spins bundle!',    discount: 5 },
        { offer: '$10 instant credits!',     discount: 10 }
    ];
    var DEAL_DURATION   = 300;        // 5 minutes in seconds
    var CHECK_INTERVAL  = 1800000;    // 30 minutes in ms
    var TRIGGER_CHANCE  = 0.03;
    var MIN_GAP_MS      = 3600000;    // minimum 1 hour between deals

    var _bannerEl    = null;
    var _tickTimer   = null;
    var _checkTimer  = null;
    var _expiresAt   = 0;
    var _activeDeal  = null;

    // ── Persistence ─────────────────────────────────────────────────────────
    function _getLastDealTime() {
        try {
            var data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
            return data.lastDealTime || 0;
        } catch (e) { return 0; }
    }

    function _setLastDealTime() {
        try {
            var data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
            data.lastDealTime = Date.now();
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (e) {}
    }

    // ── Formatting ──────────────────────────────────────────────────────────
    function _fmtSecs(totalSecs) {
        if (totalSecs <= 0) return '00:00';
        var m = Math.floor(totalSecs / 60);
        var s = totalSecs % 60;
        return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
    }

    // ── DOM creation ────────────────────────────────────────────────────────
    function _createBanner() {
        if (_bannerEl) return;
        var el = document.createElement('div');
        el.id = 'flashDealBanner';
        el.className = 'flash-deal-banner';
        el.style.display = 'none';

        var icon = document.createElement('span');
        icon.className = 'fd-icon';
        icon.textContent = '\u26A1'; // lightning

        var text = document.createElement('span');
        text.className = 'fd-text';
        text.id = 'fdOfferText';
        text.textContent = '';

        var timer = document.createElement('span');
        timer.className = 'fd-timer';
        timer.id = 'fdTimer';
        timer.textContent = '';

        var claimBtn = document.createElement('button');
        claimBtn.className = 'fd-cta';
        claimBtn.textContent = 'Claim Now';
        claimBtn.onclick = function () { if (typeof window.claimFlashDeal === 'function') window.claimFlashDeal(); };

        var closeBtn = document.createElement('button');
        closeBtn.className = 'fd-close';
        closeBtn.textContent = '\u2715';
        closeBtn.onclick = function () { if (typeof window.dismissFlashDeal === 'function') window.dismissFlashDeal(); };

        el.appendChild(icon);
        el.appendChild(text);
        el.appendChild(timer);
        el.appendChild(claimBtn);
        el.appendChild(closeBtn);

        // Insert below header
        var header = document.querySelector('.site-header') || document.querySelector('header');
        if (header && header.parentNode) {
            header.parentNode.insertBefore(el, header.nextSibling);
        } else {
            document.body.insertBefore(el, document.body.firstChild);
        }
        _bannerEl = el;
    }

    // ── Countdown tick ──────────────────────────────────────────────────────
    function _tick() {
        var remaining = Math.max(0, Math.floor((_expiresAt - Date.now()) / 1000));
        var timerEl = document.getElementById('fdTimer');
        if (timerEl) timerEl.textContent = _fmtSecs(remaining);
        if (remaining <= 0) {
            _hideBanner();
        }
    }

    // ── Show deal ───────────────────────────────────────────────────────────
    function _showDeal(deal) {
        _createBanner();
        _activeDeal = deal;
        _expiresAt = Date.now() + DEAL_DURATION * 1000;
        _setLastDealTime();

        var textEl = document.getElementById('fdOfferText');
        if (textEl) textEl.textContent = '\uD83D\uDD25 FLASH DEAL: ' + deal.offer;

        if (_bannerEl) _bannerEl.style.display = 'flex';
        _tick();
        if (_tickTimer) clearInterval(_tickTimer);
        _tickTimer = setInterval(_tick, 1000);
    }

    // ── Hide banner ─────────────────────────────────────────────────────────
    function _hideBanner() {
        if (_tickTimer) { clearInterval(_tickTimer); _tickTimer = null; }
        if (_bannerEl) {
            _bannerEl.style.opacity = '0';
            _bannerEl.style.transition = 'opacity 0.3s';
            setTimeout(function () {
                if (_bannerEl) { _bannerEl.style.display = 'none'; _bannerEl.style.opacity = ''; _bannerEl.style.transition = ''; }
            }, 300);
        }
        _activeDeal = null;
    }

    // ── Periodic check ──────────────────────────────────────────────────────
    function _periodicCheck() {
        // Already showing a deal
        if (_activeDeal) return;
        // Enforce minimum gap
        var lastTime = _getLastDealTime();
        if (lastTime && Date.now() - lastTime < MIN_GAP_MS) return;
        // 25% chance to trigger
        if (Math.random() > TRIGGER_CHANCE) return;
        // Pick a random deal
        var idx = Math.floor(Math.random() * DEALS.length);
        _showDeal(DEALS[idx]);
    }

    // ── Public API ──────────────────────────────────────────────────────────
    window.claimFlashDeal = function () {
        _hideBanner();
        setTimeout(function () {
            if (typeof openWalletModal === 'function') openWalletModal();
            else if (typeof openDepositModal === 'function') openDepositModal();
        }, 350);
    };

    window.dismissFlashDeal = function () {
        _setLastDealTime();
        _hideBanner();
    };

    // ── Init ────────────────────────────────────────────────────────────────
    function _init() {
        try { if (new URLSearchParams(location.search).get('noBonus') === '1') return; } catch (e) {}
        _createBanner();
        // Start periodic checks
        _checkTimer = setInterval(_periodicCheck, CHECK_INTERVAL);
        // Also run a first check after a short delay (gives user time to settle)
        setTimeout(_periodicCheck, 60000);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { setTimeout(_init, 700); });
    } else {
        setTimeout(_init, 700);
    }

})();
