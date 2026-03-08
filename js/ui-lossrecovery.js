/* ui-lossrecovery.js — Loss Recovery Popup
 * Sprint 29: Shows a recovery offer when session losses exceed thresholds.
 * Dynamically creates its own DOM elements (no static HTML required).
 */
(function () {
    'use strict';

    var LR_KEY       = 'ms_lossRecovery';
    var THRESHOLD_1  = 50;   // $50 loss → first offer
    var THRESHOLD_2  = 150;  // $150 loss → second offer

    var _sessionLoss = 0;
    var _shown1 = false;
    var _shown2 = false;
    var _overlayEl = null;

    // ── DOM creation ─────────────────────────────────────────────────────────
    function _createOverlay() {
        if (_overlayEl) return;
        var el = document.createElement('div');
        el.id = 'lossRecoveryOverlay';
        el.className = 'loss-recovery-overlay';
        el.style.display = 'none';
        el.setAttribute('role', 'dialog');
        el.setAttribute('aria-modal', 'true');
        el.innerHTML =
            '<div class="loss-recovery-card">' +
                '<button class="lr-close" onclick="if(typeof dismissLossRecovery===\'function\')dismissLossRecovery()">✕</button>' +
                '<div class="lr-icon" id="lrIcon">😔</div>' +
                '<div class="lr-title" id="lrTitle">Tough Break!</div>' +
                '<div class="lr-sub" id="lrSub">Everyone has off days. Let us help you bounce back.</div>' +
                '<div class="lr-amount-box">' +
                    '<span id="lrAmountLabel">Session loss so far:</span>' +
                    '<span class="lr-amount" id="lrAmount">$0.00</span>' +
                '</div>' +
                '<div class="lr-offer-box" id="lrOfferBox">' +
                    '<b id="lrOfferTitle">🎁 Recovery Bonus</b><br>' +
                    '<span id="lrOfferDetail">Deposit now and get a 50% recovery match up to $50</span>' +
                '</div>' +
                '<button class="lr-cta" onclick="if(typeof claimLossRecovery===\'function\')claimLossRecovery()">💚 Claim Recovery Bonus</button>' +
                '<br>' +
                '<button class="lr-dismiss" onclick="if(typeof dismissLossRecovery===\'function\')dismissLossRecovery()">No thanks, I\'ll keep playing</button>' +
            '</div>';
        document.body.appendChild(el);
        _overlayEl = el;
    }

    // ── Show popup ────────────────────────────────────────────────────────────
    function _show(tier) {
        _createOverlay();
        var icon  = document.getElementById('lrIcon');
        var title = document.getElementById('lrTitle');
        var sub   = document.getElementById('lrSub');
        var amt   = document.getElementById('lrAmount');
        var oTitle = document.getElementById('lrOfferTitle');
        var oDetail = document.getElementById('lrOfferDetail');

        if (amt) amt.textContent = '-$' + _sessionLoss.toFixed(2);

        if (tier === 2) {
            if (icon)  icon.textContent  = '😢';
            if (title) title.textContent = 'We\'ve Got Your Back!';
            if (sub)   sub.textContent   = 'That\'s a rough session — here\'s a bigger boost to turn it around.';
            if (oTitle)  oTitle.innerHTML = '🎁 <b>50 Free Spins + 75% Match</b>';
            if (oDetail) oDetail.textContent = 'Our best recovery package, just for you — limited time!';
        } else {
            if (icon)  icon.textContent  = '😔';
            if (title) title.textContent = 'Tough Break!';
            if (sub)   sub.textContent   = 'Everyone has off days. Let us help you bounce back.';
            if (oTitle)  oTitle.innerHTML = '🎁 Recovery Bonus';
            if (oDetail) oDetail.textContent = 'Deposit now and get a 50% recovery match up to $50';
        }

        if (_overlayEl) _overlayEl.style.display = 'flex';

        // Mark shown in sessionStorage so we don't repeat
        try { sessionStorage.setItem(LR_KEY + '_shown' + tier, '1'); } catch (e) {}
    }

    // ── Public API ────────────────────────────────────────────────────────────
    window.dismissLossRecovery = function () {
        if (_overlayEl) {
            _overlayEl.style.opacity = '0';
            _overlayEl.style.transition = 'opacity 0.3s';
            setTimeout(function () {
                if (_overlayEl) { _overlayEl.style.display = 'none'; _overlayEl.style.opacity = ''; _overlayEl.style.transition = ''; }
            }, 300);
        }
    };

    window.claimLossRecovery = function () {
        dismissLossRecovery();
        setTimeout(function () {
            if (typeof openWalletModal === 'function') openWalletModal();
            else if (typeof openDepositModal === 'function') openDepositModal();
        }, 350);
    };

    // Called after each spin with the bet amount and win amount
    window._lossRecoveryTrackSpin = function (betAmt, winAmt) {
        betAmt = parseFloat(betAmt) || 0;
        winAmt = parseFloat(winAmt) || 0;
        var net = winAmt - betAmt;
        if (net < 0) {
            _sessionLoss += Math.abs(net);
        }

        // Check thresholds
        if (!_shown2 && _sessionLoss >= THRESHOLD_2) {
            _shown2 = true;
            _shown1 = true; // skip tier 1 if tier 2 fires
            try { if (sessionStorage.getItem(LR_KEY + '_shown2')) return; } catch (e) {}
            setTimeout(function () { _show(2); }, 800);
        } else if (!_shown1 && _sessionLoss >= THRESHOLD_1) {
            _shown1 = true;
            try { if (sessionStorage.getItem(LR_KEY + '_shown1')) return; } catch (e) {}
            setTimeout(function () { _show(1); }, 800);
        }
    };

    // ── Init ──────────────────────────────────────────────────────────────────
    function _init() {
        // Restore session state
        try {
            var stored = parseFloat(sessionStorage.getItem(LR_KEY + '_loss') || '0');
            _sessionLoss = stored;
            _shown1 = !!sessionStorage.getItem(LR_KEY + '_shown1');
            _shown2 = !!sessionStorage.getItem(LR_KEY + '_shown2');
        } catch (e) {}

        // Persist session loss on unload
        window.addEventListener('beforeunload', function () {
            try { sessionStorage.setItem(LR_KEY + '_loss', String(_sessionLoss)); } catch (e) {}
        });

        _createOverlay();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { setTimeout(_init, 1200); });
    } else {
        setTimeout(_init, 1200);
    }

})();
