/* ui-betinsurance.js — Bet Insurance optional protection bar (Sprint 44) */
(function () {
    'use strict';

    var STORAGE_KEY = 'ms_betInsurance';
    var BAR_ID = 'betInsuranceBar';
    var INSURANCE_COST_RATE = 0.10;   // 10% of bet as insurance cost
    var INSURANCE_REFUND_RATE = 0.50; // 50% of bet returned on loss

    var _active = false;
    var _observer = null;

    // ── QA bypass ──
    function _isQA() {
        try {
            return new URLSearchParams(window.location.search).get('noBonus') === '1';
        } catch (e) {
            return false;
        }
    }

    // ── localStorage helpers ──
    function _loadState() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            if (raw) return JSON.parse(raw);
        } catch (e) { /* ignore */ }
        return { active: false, totalInsured: 0, totalRefunded: 0 };
    }

    function _saveState() {
        try {
            var data = _loadState();
            data.active = _active;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (e) { /* ignore */ }
    }

    // ── Track insurance stats ──
    function _trackInsured(amount) {
        try {
            var data = _loadState();
            data.totalInsured = (data.totalInsured || 0) + amount;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (e) { /* ignore */ }
    }

    function _trackRefund(amount) {
        try {
            var data = _loadState();
            data.totalRefunded = (data.totalRefunded || 0) + amount;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (e) { /* ignore */ }
    }

    // ── Build the insurance bar ──
    function _buildBar() {
        var existing = document.getElementById(BAR_ID);
        if (existing && existing.parentNode) {
            existing.parentNode.removeChild(existing);
        }

        var bar = document.createElement('div');
        bar.id = BAR_ID;
        bar.className = 'bet-insurance-bar';

        // Icon
        var icon = document.createElement('span');
        icon.className = 's44-ins-icon';
        icon.textContent = '\uD83D\uDEE1\uFE0F'; // shield emoji
        bar.appendChild(icon);

        // Label
        var label = document.createElement('span');
        label.className = 's44-ins-label';
        label.textContent = 'Bet Insurance';
        bar.appendChild(label);

        // Toggle container
        var toggleWrap = document.createElement('label');
        toggleWrap.className = 's44-ins-toggle';

        var toggleInput = document.createElement('input');
        toggleInput.type = 'checkbox';
        toggleInput.checked = _active;
        toggleInput.addEventListener('change', function () {
            _active = toggleInput.checked;
            _saveState();
            _updateBarState(bar);
        });
        toggleWrap.appendChild(toggleInput);

        var slider = document.createElement('span');
        slider.className = 's44-ins-slider';
        toggleWrap.appendChild(slider);

        bar.appendChild(toggleWrap);

        // Status
        var status = document.createElement('span');
        status.className = 's44-ins-status';
        bar.appendChild(status);

        // Cost info
        var cost = document.createElement('span');
        cost.className = 's44-ins-cost';
        cost.textContent = (INSURANCE_COST_RATE * 100) + '% cost \u2192 ' + (INSURANCE_REFUND_RATE * 100) + '% refund on loss';
        bar.appendChild(cost);

        // Close button
        var closeBtn = document.createElement('button');
        closeBtn.className = 's44-ins-close';
        closeBtn.textContent = '\u2715';
        closeBtn.addEventListener('click', function () {
            _dismiss();
        });
        bar.appendChild(closeBtn);

        _updateBarState(bar);

        return bar;
    }

    // ── Update bar visual state ──
    function _updateBarState(bar) {
        if (!bar) bar = document.getElementById(BAR_ID);
        if (!bar) return;

        if (_active) {
            bar.classList.add('s44-ins-active');
        } else {
            bar.classList.remove('s44-ins-active');
        }

        var status = bar.querySelector('.s44-ins-status');
        if (status) {
            if (_active) {
                status.textContent = '\u2705 Protected';
                status.classList.add('s44-ins-protected');
            } else {
                status.textContent = 'Off';
                status.classList.remove('s44-ins-protected');
            }
        }
    }

    // ── Show/hide bar ──
    function _showBar() {
        if (_isQA()) return;

        var bar = document.getElementById(BAR_ID);
        if (!bar) {
            bar = _buildBar();
            document.body.appendChild(bar);
        }

        requestAnimationFrame(function () {
            bar.classList.add('s44-visible');
        });
    }

    function _hideBar() {
        var bar = document.getElementById(BAR_ID);
        if (!bar) return;

        bar.classList.remove('s44-visible');
    }

    function _dismiss() {
        _active = false;
        _saveState();

        var bar = document.getElementById(BAR_ID);
        if (!bar) return;

        bar.classList.remove('s44-visible');
        setTimeout(function () {
            if (bar.parentNode) bar.parentNode.removeChild(bar);
        }, 300);
    }

    // ── Calculate insurance cost for a given bet ──
    function _getInsuranceCost(bet) {
        if (!_active) return 0;
        return Math.round(bet * INSURANCE_COST_RATE * 100) / 100;
    }

    // ── Process refund on loss ──
    function _processRefund(bet) {
        if (!_active) return 0;

        var refund = Math.round(bet * INSURANCE_REFUND_RATE * 100) / 100;
        _trackRefund(refund);

        if (typeof window.balance === 'number') {
            window.balance += refund;
        }
        if (typeof window.updateBalanceDisplay === 'function') {
            window.updateBalanceDisplay();
        }

        // Show refund notification
        _showRefundToast(refund);

        return refund;
    }

    // ── Refund toast ──
    function _showRefundToast(amount) {
        var toast = document.createElement('div');
        toast.className = 's44-ins-toast';

        var text = document.createElement('span');
        text.textContent = '\uD83D\uDEE1\uFE0F Insurance refund: +$' + amount.toFixed(2);
        toast.appendChild(text);

        document.body.appendChild(toast);

        requestAnimationFrame(function () {
            toast.classList.add('s44-ins-toast-show');
        });

        setTimeout(function () {
            toast.classList.remove('s44-ins-toast-show');
            setTimeout(function () {
                if (toast.parentNode) toast.parentNode.removeChild(toast);
            }, 400);
        }, 3000);
    }

    // ── MutationObserver for slot modal detection ──
    function _setupObserver() {
        if (_observer) return;

        _observer = new MutationObserver(function (mutations) {
            for (var i = 0; i < mutations.length; i++) {
                var target = mutations[i].target;
                if (target && target.id === 'slotModal') {
                    if (target.classList && target.classList.contains('active')) {
                        _showBar();
                    } else {
                        _hideBar();
                    }
                }
            }
        });

        var slotModal = document.getElementById('slotModal');
        if (slotModal) {
            _observer.observe(slotModal, { attributes: true, attributeFilter: ['class'] });
        } else {
            // Wait for slot modal to exist
            var bodyObs = new MutationObserver(function (muts) {
                var modal = document.getElementById('slotModal');
                if (modal) {
                    bodyObs.disconnect();
                    _observer.observe(modal, { attributes: true, attributeFilter: ['class'] });
                }
            });
            bodyObs.observe(document.body, { childList: true, subtree: true });
        }
    }

    // ── Public API ──
    window._betInsuranceActive = function () { return _active; };
    window._betInsuranceCost = _getInsuranceCost;
    window._betInsuranceRefund = function (bet) { return _processRefund(bet); };
    window.dismissBetInsurance = _dismiss;

    // ── Init ──
    function _init() {
        if (_isQA()) return;

        // Restore active state
        var data = _loadState();
        _active = !!data.active;

        // Setup observer for slot modal
        _setupObserver();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            setTimeout(_init, 1000);
        });
    } else {
        setTimeout(_init, 1000);
    }
})();
