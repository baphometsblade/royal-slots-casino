/* ui-flashsale.js — Flash Sale Modal
 * Sprint 29: Time-limited deposit bonus pop-up shown once per session.
 * Fires after 2 minutes of page activity. Creates its own DOM element.
 */
(function () {
    'use strict';

    var FS_KEY      = 'ms_flashSaleShown';
    var DELAY_MS    = 120000; // 2 minutes before first show
    var _overlayEl  = null;
    var _cdInterval = null;
    var _expiresAt  = 0;

    // ── Seeded duration (10–15 min based on session start) ───────────────────
    function _saleDurationMs() {
        var seed = Math.floor(Date.now() / 3600000); // changes each hour
        var s = seed % 2147483647 || 1;
        s = s * 16807 % 2147483647;
        var frac = (s - 1) / 2147483646;
        return Math.floor(frac * 5 + 10) * 60000; // 10–15 min in ms
    }

    // ── Formatting ────────────────────────────────────────────────────────────
    function _fmtMs(ms) {
        if (ms <= 0) return '00:00';
        var secs = Math.floor(ms / 1000);
        var m = Math.floor(secs / 60);
        var s = secs % 60;
        return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
    }

    // ── DOM creation ─────────────────────────────────────────────────────────
    function _createOverlay() {
        if (_overlayEl) return;
        var el = document.createElement('div');
        el.id = 'flashSaleOverlay';
        el.className = 'flash-sale-overlay';
        el.style.display = 'none';
        el.setAttribute('role', 'dialog');
        el.setAttribute('aria-modal', 'true');
        el.innerHTML =
            '<div class="flash-sale-card">' +
                '<button class="fs-close" onclick="if(typeof dismissFlashSale===\'function\')dismissFlashSale()">✕</button>' +
                '<div class="fs-icon">⚡</div>' +
                '<div class="fs-title">Limited Time Offer</div>' +
                '<div class="fs-headline">100% Deposit Match</div>' +
                '<div class="fs-sub">Double your money — instantly. This deal disappears when the timer hits zero.</div>' +
                '<div class="fs-countdown-wrap">' +
                    '<div class="fs-countdown-label">OFFER EXPIRES IN</div>' +
                    '<div class="fs-countdown" id="fsCountdown">--:--</div>' +
                '</div>' +
                '<button class="fs-cta" onclick="if(typeof claimFlashSale===\'function\')claimFlashSale()">⚡ CLAIM 100% MATCH NOW</button>' +
                '<br>' +
                '<button class="fs-dismiss" onclick="if(typeof dismissFlashSale===\'function\')dismissFlashSale()">No thanks, I don\'t want free money</button>' +
            '</div>';
        document.body.appendChild(el);
        _overlayEl = el;
    }

    // ── Countdown tick ────────────────────────────────────────────────────────
    function _cdTick() {
        var remaining = _expiresAt - Date.now();
        var el = document.getElementById('fsCountdown');
        if (el) el.textContent = _fmtMs(remaining);
        if (remaining <= 0) {
            if (_cdInterval) { clearInterval(_cdInterval); _cdInterval = null; }
            dismissFlashSale();
        }
    }

    // ── Show ──────────────────────────────────────────────────────────────────
    function _show() {
        _createOverlay();
        _expiresAt = Date.now() + _saleDurationMs();
        if (_overlayEl) _overlayEl.style.display = 'flex';
        _cdTick();
        if (_cdInterval) clearInterval(_cdInterval);
        _cdInterval = setInterval(_cdTick, 1000);
        try { sessionStorage.setItem(FS_KEY, '1'); } catch (e) {}
    }

    // ── Public API ────────────────────────────────────────────────────────────
    window.dismissFlashSale = function () {
        if (_cdInterval) { clearInterval(_cdInterval); _cdInterval = null; }
        if (_overlayEl) {
            _overlayEl.style.opacity = '0';
            _overlayEl.style.transition = 'opacity 0.3s';
            setTimeout(function () {
                if (_overlayEl) { _overlayEl.style.display = 'none'; _overlayEl.style.opacity = ''; _overlayEl.style.transition = ''; }
            }, 300);
        }
    };

    window.claimFlashSale = function () {
        dismissFlashSale();
        setTimeout(function () {
            if (typeof openWalletModal === 'function') openWalletModal();
            else if (typeof openDepositModal === 'function') openDepositModal();
        }, 350);
    };

    // ── Init ──────────────────────────────────────────────────────────────────
    function _init() {
        if (new URLSearchParams(window.location.search).get('noBonus') === '1') return;
        // Only show once per session
        try { if (sessionStorage.getItem(FS_KEY)) return; } catch (e) {}
        _createOverlay();
        setTimeout(_show, DELAY_MS);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { setTimeout(_init, 500); });
    } else {
        setTimeout(_init, 500);
    }

})();
