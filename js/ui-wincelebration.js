/* ==========================================================
   ui-wincelebration.js — Win Celebration Overlay
   Sprint 45 — Shows celebratory overlay on big wins (10x+)
   ========================================================== */
(function () {
    'use strict';

    var OVERLAY_ID = 'winCelebrationOverlay';
    var MIN_MULTIPLIER = 10;
    var AUTO_DISMISS_MS = 5000;

    var _dismissTimer = null;

    /* ---- Helpers ---- */

    function _isQA() {
        try {
            return new URLSearchParams(window.location.search).get('noBonus') === '1';
        } catch (e) {
            return false;
        }
    }

    function _el(tag, className, textContent) {
        var el = document.createElement(tag);
        if (className) el.className = className;
        if (textContent !== undefined) el.textContent = textContent;
        return el;
    }

    function _getTier(multiplier) {
        if (multiplier >= 50) {
            return { title: 'JACKPOT!', tier: 'jackpot' };
        } else if (multiplier >= 25) {
            return { title: 'EPIC WIN!', tier: 'epic' };
        } else {
            return { title: 'MEGA WIN!', tier: 'mega' };
        }
    }

    /* ---- Build Overlay ---- */

    function _buildOverlay(amount, multiplier) {
        var existing = document.getElementById(OVERLAY_ID);
        if (existing) existing.remove();

        if (_dismissTimer) {
            clearTimeout(_dismissTimer);
            _dismissTimer = null;
        }

        var info = _getTier(multiplier);

        var overlay = _el('div', 'win-celebration-overlay');
        overlay.id = OVERLAY_ID;
        overlay.classList.add('s45-celeb-tier-' + info.tier);

        var backdrop = _el('div', 's45-celeb-backdrop');
        backdrop.addEventListener('click', _dismiss);
        overlay.appendChild(backdrop);

        var content = _el('div', 's45-celeb-content');

        /* Crown */
        var crown = _el('div', 's45-celeb-crown', '\uD83D\uDC51');
        content.appendChild(crown);

        /* Title */
        var title = _el('div', 's45-celeb-title', info.title);
        content.appendChild(title);

        /* Amount */
        var amountEl = _el('div', 's45-celeb-amount');
        amountEl.textContent = '$' + _formatAmount(amount);
        content.appendChild(amountEl);

        /* Multiplier badge */
        var multEl = _el('div', 's45-celeb-multiplier');
        multEl.textContent = multiplier.toFixed(1) + 'x';
        content.appendChild(multEl);

        /* Dismiss button */
        var dismissBtn = _el('button', 's45-celeb-dismiss-btn', 'Collect');
        dismissBtn.addEventListener('click', _dismiss);
        content.appendChild(dismissBtn);

        overlay.appendChild(content);
        document.body.appendChild(overlay);

        return overlay;
    }

    function _formatAmount(amount) {
        if (typeof amount !== 'number' || isNaN(amount)) return '0.00';
        if (amount >= 1000000) {
            return (amount / 1000000).toFixed(2) + 'M';
        } else if (amount >= 10000) {
            return (amount / 1000).toFixed(1) + 'K';
        }
        return amount.toFixed(2);
    }

    /* ---- Show / Dismiss ---- */

    function _show(amount, multiplier) {
        if (_isQA()) return;
        if (typeof multiplier !== 'number' || multiplier < MIN_MULTIPLIER) return;
        if (typeof amount !== 'number' || amount <= 0) return;

        var overlay = _buildOverlay(amount, multiplier);

        requestAnimationFrame(function () {
            overlay.classList.add('active');
        });

        /* Auto-dismiss */
        _dismissTimer = setTimeout(function () {
            _dismiss();
        }, AUTO_DISMISS_MS);
    }

    function _dismiss() {
        if (_dismissTimer) {
            clearTimeout(_dismissTimer);
            _dismissTimer = null;
        }

        var overlay = document.getElementById(OVERLAY_ID);
        if (!overlay) return;

        overlay.classList.remove('active');
        overlay.classList.add('s45-celeb-dismissing');

        setTimeout(function () {
            if (overlay.parentNode) overlay.remove();
        }, 400);
    }

    /* ---- Public API ---- */

    window._showWinCelebration = function (amount, multiplier) {
        _show(amount, multiplier);
    };

    window.dismissWinCelebration = _dismiss;

    /* ---- Passive init (nothing to init at load) ---- */

    function _init() {
        if (_isQA()) return;
        /* No persistent state needed — overlay is event-driven */
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _init);
    } else {
        _init();
    }

})();
