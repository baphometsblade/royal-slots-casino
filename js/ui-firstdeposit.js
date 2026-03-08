/**
 * ui-firstdeposit.js — First Deposit Conversion Modal (Sprint 31)
 *
 * Shows a persuasive modal to new users who haven't deposited yet.
 * Re-shows up to 3 times across page loads with escalating delay.
 * localStorage key: ms_firstDepositData
 */
(function () {
    'use strict';

    // ── Constants ──────────────────────────────────────────────────
    var STORAGE_KEY = 'ms_firstDepositData';
    var GOLD = '#fbbf24';
    var INITIAL_DELAY_MS = 15000;   // 15 seconds for first show
    var RE_SHOW_DELAY_MS = 30000;   // 30 seconds for subsequent shows
    var MAX_SHOW_COUNT = 3;

    // ── Helpers ────────────────────────────────────────────────────
    function _isQASuppressed() {
        try {
            var qs = window.location.search || '';
            return qs.indexOf('noBonus=1') !== -1;
        } catch (e) { return false; }
    }

    function _loadData() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            if (raw) return JSON.parse(raw);
        } catch (e) { /* corrupted — reset */ }
        return { dismissed: false, deposited: false, shownCount: 0 };
    }

    function _saveData(data) {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (e) {}
    }

    function _getOverlay() {
        return document.getElementById('firstDepositOverlay');
    }

    // ── Show / Hide ───────────────────────────────────────────────
    function _showOverlay() {
        var el = _getOverlay();
        if (!el) return;
        el.style.display = 'flex';
    }

    function _hideOverlay() {
        var el = _getOverlay();
        if (!el) return;
        el.style.display = 'none';
    }

    // ── Public API ────────────────────────────────────────────────

    /**
     * Dismiss the overlay without depositing.
     * Increments shownCount so re-show logic knows how many times it has appeared.
     */
    window.dismissFirstDeposit = function () {
        var data = _loadData();
        data.dismissed = true;
        data.shownCount = (data.shownCount || 0) + 1;
        _saveData(data);
        _hideOverlay();
    };

    /**
     * User clicked "Deposit Now" — dismiss and open the wallet modal.
     */
    window.claimFirstDeposit = function () {
        window.dismissFirstDeposit();
        if (typeof openWalletModal === 'function') openWalletModal();
    };

    /**
     * Mark the user as having deposited — hides overlay permanently.
     * Call this from the wallet/cashier flow after a successful deposit.
     */
    window._firstDepositMarkDeposited = function () {
        var data = _loadData();
        data.deposited = true;
        _saveData(data);
        _hideOverlay();
    };

    // ── Init ──────────────────────────────────────────────────────
    function _init() {
        if (_isQASuppressed()) return;

        var data = _loadData();

        // Already deposited — never show again
        if (data.deposited) return;

        // Determine delay based on whether this is first show or re-show
        var isFirstEver = data.shownCount === 0 && !data.dismissed;
        var delay = isFirstEver ? INITIAL_DELAY_MS : RE_SHOW_DELAY_MS;

        // If dismissed too many times, stop showing
        if (data.shownCount >= MAX_SHOW_COUNT) return;

        // If previously dismissed, reset the dismissed flag so the re-show can happen
        if (data.dismissed && data.shownCount < MAX_SHOW_COUNT) {
            data.dismissed = false;
            _saveData(data);
        }

        // Schedule the show
        setTimeout(function () {
            // Re-check in case state changed (e.g. user deposited while waiting)
            var fresh = _loadData();
            if (fresh.deposited || fresh.dismissed) return;
            _showOverlay();
        }, delay);
    }

    // ── Bootstrap ─────────────────────────────────────────────────
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            setTimeout(_init, 2200);
        });
    } else {
        setTimeout(_init, 2200);
    }

    // ── Expose gold accent for inline style consumers ─────────────
    window._FIRST_DEPOSIT_GOLD = GOLD;

})();
