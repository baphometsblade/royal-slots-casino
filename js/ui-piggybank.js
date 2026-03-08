/**
 * ui-piggybank.js — Piggy Bank Savings Widget (Sprint 31)
 *
 * Accumulates a micro-percentage of each bet into a piggy bank.
 * Users can "break" the bank once savings reach $5.00, with a 24-hour cooldown.
 * localStorage key: ms_piggyBankData
 */
(function () {
    'use strict';

    // ── Constants ──────────────────────────────────────────────────
    var STORAGE_KEY = 'ms_piggyBankData';
    var GOLD = '#fbbf24';
    var PIGGY_RATE = 0.02;              // 2% of each bet
    var MIN_SHOW_THRESHOLD = 0.50;      // show widget when savings > $0.50
    var MIN_BREAK_THRESHOLD = 5.00;     // minimum to break the bank
    var BREAK_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours
    var UI_REFRESH_INTERVAL = 5000;     // refresh every 5 seconds

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
            if (raw) {
                var d = JSON.parse(raw);
                d.savings = parseFloat(d.savings) || 0;
                d.lastBreak = d.lastBreak || 0;
                return d;
            }
        } catch (e) { /* corrupted — reset */ }
        return { savings: 0, lastBreak: 0 };
    }

    function _saveData(data) {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (e) {}
    }

    function _fmt(n) {
        return '$' + (parseFloat(n) || 0).toFixed(2);
    }

    function _isInSlotMode() {
        var sm = document.getElementById('slotModal');
        return sm && sm.classList.contains('active');
    }

    function _canBreak(data) {
        if (data.savings < MIN_BREAK_THRESHOLD) return false;
        var now = Date.now();
        if (data.lastBreak && (now - data.lastBreak) < BREAK_COOLDOWN_MS) return false;
        return true;
    }

    // ── UI Updates ────────────────────────────────────────────────
    function _updateBadge(savings) {
        var badge = document.getElementById('pbAmountBadge');
        if (badge) badge.textContent = _fmt(savings);
    }

    function _updateWidgetVisibility(savings) {
        var widget = document.getElementById('piggyBankWidget');
        if (!widget) return;

        if (savings > MIN_SHOW_THRESHOLD && !_isInSlotMode()) {
            widget.classList.add('pb-visible');
        } else {
            widget.classList.remove('pb-visible');
        }
    }

    function _updateModalAmount(savings) {
        var el = document.getElementById('pbModalAmount');
        if (el) el.textContent = _fmt(savings);
    }

    function _refreshUI() {
        var data = _loadData();
        _updateBadge(data.savings);
        _updateWidgetVisibility(data.savings);
    }

    // ── Public API ────────────────────────────────────────────────

    /**
     * Track a spin — adds PIGGY_RATE of the bet to savings.
     * Called externally after each spin resolves.
     */
    window._piggyBankTrackSpin = function (betAmt) {
        var amt = parseFloat(betAmt) || 0;
        if (amt <= 0) return;

        var data = _loadData();
        data.savings = Math.round((data.savings + amt * PIGGY_RATE) * 100) / 100;
        _saveData(data);

        _updateBadge(data.savings);
        _updateWidgetVisibility(data.savings);
    };

    /**
     * Open the piggy bank modal showing current savings.
     */
    window.openPiggyBank = function () {
        var data = _loadData();
        _updateModalAmount(data.savings);

        var modal = document.getElementById('pbModalOverlay');
        if (modal) modal.style.display = 'flex';

        // Update break button state
        var breakBtn = document.getElementById('pbBreakBtn');
        if (breakBtn) {
            if (_canBreak(data)) {
                breakBtn.disabled = false;
                breakBtn.title = '';
            } else if (data.savings < MIN_BREAK_THRESHOLD) {
                breakBtn.disabled = true;
                breakBtn.title = 'Keep saving! Need ' + _fmt(MIN_BREAK_THRESHOLD) + ' minimum.';
            } else {
                breakBtn.disabled = true;
                var remaining = BREAK_COOLDOWN_MS - (Date.now() - data.lastBreak);
                var hrs = Math.ceil(remaining / (60 * 60 * 1000));
                breakBtn.title = 'Cooldown: ' + hrs + 'h remaining';
            }
        }
    };

    /**
     * Close the piggy bank modal.
     */
    window.closePiggyBank = function () {
        var modal = document.getElementById('pbModalOverlay');
        if (modal) modal.style.display = 'none';
    };

    /**
     * Break the piggy bank — transfer savings to balance.
     * Requires >= $5.00 and 24-hour cooldown since last break.
     */
    window.breakPiggyBank = function () {
        var data = _loadData();

        if (data.savings < MIN_BREAK_THRESHOLD) {
            var msgEl = document.getElementById('pbModalMsg');
            if (msgEl) msgEl.textContent = 'Keep saving! Need ' + _fmt(MIN_BREAK_THRESHOLD) + ' minimum.';
            return;
        }

        var now = Date.now();
        if (data.lastBreak && (now - data.lastBreak) < BREAK_COOLDOWN_MS) {
            var remaining = BREAK_COOLDOWN_MS - (now - data.lastBreak);
            var hrs = Math.ceil(remaining / (60 * 60 * 1000));
            var msgEl2 = document.getElementById('pbModalMsg');
            if (msgEl2) msgEl2.textContent = 'Cooldown active. Try again in ' + hrs + 'h.';
            return;
        }

        // Transfer to balance
        var payout = data.savings;
        if (typeof balance !== 'undefined') {
            balance = (parseFloat(balance) || 0) + payout;
            if (typeof updateBalance === 'function') updateBalance();
        }

        // Reset piggy bank
        data.savings = 0;
        data.lastBreak = now;
        _saveData(data);

        // Update UI
        _updateBadge(0);
        _updateModalAmount(0);
        _updateWidgetVisibility(0);

        var msgEl3 = document.getElementById('pbModalMsg');
        if (msgEl3) msgEl3.textContent = _fmt(payout) + ' added to your balance!';

        // Auto-close modal after a brief display
        setTimeout(function () {
            window.closePiggyBank();
            if (msgEl3) msgEl3.textContent = '';
        }, 2500);
    };

    // ── Init ──────────────────────────────────────────────────────
    function _init() {
        if (_isQASuppressed()) return;

        // Initial UI sync
        _refreshUI();

        // Periodic refresh (handles slot mode hide/show transitions)
        setInterval(_refreshUI, UI_REFRESH_INTERVAL);
    }

    // ── Bootstrap ─────────────────────────────────────────────────
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            setTimeout(_init, 2500);
        });
    } else {
        setTimeout(_init, 2500);
    }

    // ── Expose gold accent for inline style consumers ─────────────
    window._PIGGY_BANK_GOLD = GOLD;

})();
