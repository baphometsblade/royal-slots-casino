/* ui-losscomfort.js — Loss Streak Comfort Bonus
 * Sprint 34: Prevents churn by offering a small comfort bonus after consecutive losses.
 * Dynamically creates its own DOM element. Enforces a cooldown between offers.
 */
(function () {
    'use strict';

    var STORAGE_KEY     = 'ms_lossComfortData';
    var LOSS_THRESHOLD  = 5;
    var COMFORT_AMOUNTS = [2, 3, 5];
    var COOLDOWN_HOURS  = 4;

    var _overlayEl   = null;
    var _lossCount   = 0;
    var _pendingAmt  = 0;

    // ── Persistence ─────────────────────────────────────────────────────────
    function _load() {
        try {
            var data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
            _lossCount = data.lossCount || 0;
            return data;
        } catch (e) { return {}; }
    }

    function _save() {
        try {
            var data = _load();
            data.lossCount = _lossCount;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (e) {}
    }

    function _isOnCooldown() {
        try {
            var data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
            if (data.lastShown) {
                var elapsed = Date.now() - data.lastShown;
                return elapsed < COOLDOWN_HOURS * 3600000;
            }
        } catch (e) {}
        return false;
    }

    function _markShown() {
        try {
            var data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
            data.lastShown = Date.now();
            data.lossCount = 0;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (e) {}
    }

    // ── DOM creation ────────────────────────────────────────────────────────
    function _createOverlay() {
        if (_overlayEl) return;
        var el = document.createElement('div');
        el.id = 'lossComfortOverlay';
        el.className = 'loss-comfort-overlay';
        el.style.display = 'none';
        el.setAttribute('role', 'dialog');
        el.setAttribute('aria-modal', 'true');

        var card = document.createElement('div');
        card.className = 'loss-comfort-card';

        var closeBtn = document.createElement('button');
        closeBtn.className = 'lc-close';
        closeBtn.textContent = '\u2715';
        closeBtn.onclick = function () { if (typeof window.dismissLossComfort === 'function') window.dismissLossComfort(); };

        var icon = document.createElement('div');
        icon.className = 'lc-icon';
        icon.textContent = '\uD83D\uDCAA'; // muscle emoji

        var title = document.createElement('div');
        title.className = 'lc-title';
        title.textContent = 'Hang in There!';

        var sub = document.createElement('div');
        sub.className = 'lc-sub';
        sub.id = 'lcSubText';
        sub.textContent = 'Here\u2019s a little boost to keep you going.';

        var cta = document.createElement('button');
        cta.className = 'lc-cta';
        cta.id = 'lcClaimBtn';
        cta.textContent = 'Claim Bonus';
        cta.onclick = function () { if (typeof window.claimLossComfort === 'function') window.claimLossComfort(); };

        var dismiss = document.createElement('button');
        dismiss.className = 'lc-dismiss';
        dismiss.textContent = 'No thanks';
        dismiss.onclick = function () { if (typeof window.dismissLossComfort === 'function') window.dismissLossComfort(); };

        card.appendChild(closeBtn);
        card.appendChild(icon);
        card.appendChild(title);
        card.appendChild(sub);
        card.appendChild(cta);
        card.appendChild(dismiss);
        el.appendChild(card);
        document.body.appendChild(el);
        _overlayEl = el;
    }

    // ── Show overlay ────────────────────────────────────────────────────────
    function _show(amount) {
        _createOverlay();
        _pendingAmt = amount;
        var subEl = document.getElementById('lcSubText');
        if (subEl) subEl.textContent = 'Here\u2019s $' + amount + ' to keep the reels spinning!';
        var claimBtn = document.getElementById('lcClaimBtn');
        if (claimBtn) claimBtn.textContent = '\u26A1 Claim $' + amount + ' Bonus';
        if (_overlayEl) _overlayEl.style.display = 'flex';
        _markShown();
    }

    // ── Public API ──────────────────────────────────────────────────────────
    window.claimLossComfort = function () {
        if (_pendingAmt > 0 && typeof balance !== 'undefined') {
            balance += _pendingAmt;
            if (typeof updateBalanceDisplay === 'function') updateBalanceDisplay();
        }
        _lossCount = 0;
        _pendingAmt = 0;
        _save();
        if (_overlayEl) {
            _overlayEl.style.opacity = '0';
            _overlayEl.style.transition = 'opacity 0.3s';
            setTimeout(function () {
                if (_overlayEl) { _overlayEl.style.display = 'none'; _overlayEl.style.opacity = ''; _overlayEl.style.transition = ''; }
            }, 300);
        }
    };

    window.dismissLossComfort = function () {
        _lossCount = 0;
        _pendingAmt = 0;
        _save();
        if (_overlayEl) {
            _overlayEl.style.opacity = '0';
            _overlayEl.style.transition = 'opacity 0.3s';
            setTimeout(function () {
                if (_overlayEl) { _overlayEl.style.display = 'none'; _overlayEl.style.opacity = ''; _overlayEl.style.transition = ''; }
            }, 300);
        }
    };

    window._lossComfortTrackResult = function (isWin) {
        if (isWin) {
            _lossCount = 0;
            _save();
            return;
        }
        _lossCount++;
        _save();
        if (_lossCount >= LOSS_THRESHOLD && !_isOnCooldown()) {
            var idx = Math.floor(Math.random() * COMFORT_AMOUNTS.length);
            _show(COMFORT_AMOUNTS[idx]);
        }
    };

    // ── Init ────────────────────────────────────────────────────────────────
    function _init() {
        try { if (new URLSearchParams(location.search).get('noBonus') === '1') return; } catch (e) {}
        _load();
        _createOverlay();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { setTimeout(_init, 500); });
    } else {
        setTimeout(_init, 500);
    }

})();
