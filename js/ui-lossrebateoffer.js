/* ui-lossrebateoffer.js — Loss Rebate Offer
 * Sprint 57: Full-screen overlay offering a 20% rebate after net losses exceed $20.
 * Dynamically creates its own DOM elements (no static HTML required).
 */
(function () {
    'use strict';

    var STORAGE_KEY = 'ms_lossRebateOffer';
    var SESSION_KEY = 'ms_lossRebateSession';
    var ELEMENT_ID = 'lossRebateOffer';
    var LOSS_THRESHOLD = 20;
    var REBATE_PCT = 0.20;
    var COOLDOWN_MS = 4 * 60 * 60 * 1000;

    var _overlay = null;
    var _shown = false;
    var _lastBalance = null;

    function _loadStorage() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : {};
        } catch (e) {
            return {};
        }
    }

    function _saveStorage(data) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (e) {}
    }

    function _loadSession() {
        try {
            var raw = sessionStorage.getItem(SESSION_KEY);
            return raw ? JSON.parse(raw) : { totalLoss: 0 };
        } catch (e) {
            return { totalLoss: 0 };
        }
    }

    function _saveSession(data) {
        try {
            sessionStorage.setItem(SESSION_KEY, JSON.stringify(data));
        } catch (e) {}
    }

    function _formatCurrency(amount) {
        return '$' + Math.abs(amount).toFixed(2);
    }

    function _isOnCooldown() {
        var stored = _loadStorage();
        if (!stored.lastShown) return false;
        return (Date.now() - stored.lastShown) < COOLDOWN_MS;
    }

    function _removeOverlay() {
        if (_overlay && _overlay.parentNode) {
            _overlay.parentNode.removeChild(_overlay);
        }
        _overlay = null;
        _shown = false;
    }

    function _build(totalLoss) {
        if (new URLSearchParams(window.location.search).get('noBonus') === '1') return;
        if (_shown) return;
        if (_isOnCooldown()) return;

        _shown = true;
        _saveStorage({ lastShown: Date.now() });

        var rebateAmount = parseFloat((totalLoss * REBATE_PCT).toFixed(2));

        var overlay = document.createElement('div');
        overlay.id = ELEMENT_ID;
        overlay.style.cssText = [
            'position:fixed',
            'top:0',
            'left:0',
            'width:100%',
            'height:100%',
            'background:rgba(5,5,25,0.94)',
            'display:flex',
            'align-items:center',
            'justify-content:center',
            'z-index:99300',
            'font-family:sans-serif',
            'animation:lossRebateFadeIn 0.4s ease'
        ].join(';');

        var style = document.createElement('style');
        style.textContent = '@keyframes lossRebateFadeIn{from{opacity:0}to{opacity:1}}';
        document.head.appendChild(style);

        var card = document.createElement('div');
        card.style.cssText = [
            'background:linear-gradient(180deg,#1a0a1a 0%,#0d0515 100%)',
            'border:1px solid rgba(231,76,60,0.5)',
            'border-radius:20px',
            'padding:40px 36px',
            'max-width:380px',
            'width:90%',
            'text-align:center',
            'box-shadow:0 8px 48px rgba(231,76,60,0.3)'
        ].join(';');

        var icon = document.createElement('div');
        icon.style.cssText = 'font-size:48px;margin-bottom:16px;';
        icon.textContent = '\uD83D\uDCB8';

        var heading = document.createElement('div');
        heading.style.cssText = 'font-size:22px;font-weight:800;color:#fff;margin-bottom:10px;';
        heading.textContent = 'Tough Session?';

        var lossLine = document.createElement('div');
        lossLine.style.cssText = 'font-size:14px;color:#ccc;margin-bottom:6px;';
        lossLine.textContent = "You've lost " + _formatCurrency(totalLoss) + " today";

        var offerLine = document.createElement('div');
        offerLine.style.cssText = [
            'font-size:16px',
            'font-weight:700',
            'margin-bottom:24px',
            'background:linear-gradient(135deg,#e74c3c,#c0392b)',
            '-webkit-background-clip:text',
            '-webkit-text-fill-color:transparent',
            'background-clip:text'
        ].join(';');
        offerLine.textContent = 'We\u2019ll rebate 20% \u2014 claim ' + _formatCurrency(rebateAmount) + '!';

        var btnClaim = document.createElement('button');
        btnClaim.style.cssText = [
            'width:100%',
            'padding:14px',
            'background:linear-gradient(135deg,#e74c3c,#c0392b)',
            'border:none',
            'border-radius:10px',
            'color:#fff',
            'font-size:15px',
            'font-weight:700',
            'cursor:pointer',
            'margin-bottom:12px',
            'letter-spacing:0.5px'
        ].join(';');
        btnClaim.textContent = 'Claim Your ' + _formatCurrency(rebateAmount) + ' Rebate';

        var btnDecline = document.createElement('button');
        btnDecline.style.cssText = [
            'width:100%',
            'padding:10px',
            'background:transparent',
            'border:1px solid rgba(255,255,255,0.2)',
            'border-radius:10px',
            'color:#999',
            'font-size:13px',
            'cursor:pointer'
        ].join(';');
        btnDecline.textContent = 'No thanks, I\u2019ll keep playing';

        btnClaim.addEventListener('click', function () {
            if (typeof window.balance === 'number') {
                window.balance = parseFloat((window.balance + rebateAmount).toFixed(2));
            }
            if (typeof window.updateBalanceDisplay === 'function') {
                window.updateBalanceDisplay();
            }
            _saveSession({ totalLoss: 0 });
            window.dismissLossRebateOffer();
        });

        btnDecline.addEventListener('click', function () {
            window.dismissLossRebateOffer();
        });

        card.appendChild(icon);
        card.appendChild(heading);
        card.appendChild(lossLine);
        card.appendChild(offerLine);
        card.appendChild(btnClaim);
        card.appendChild(btnDecline);
        overlay.appendChild(card);
        document.body.appendChild(overlay);
        _overlay = overlay;
    }

    function _onSpinComplete(evt) {
        var detail = (evt && evt.detail) || {};
        var bet = parseFloat(detail.betAmount) || 0;
        var winAmount = parseFloat(detail.winAmount) || 0;
        var netChange = winAmount - bet;

        if (netChange < 0) {
            var sess = _loadSession();
            sess.totalLoss = parseFloat((sess.totalLoss + Math.abs(netChange)).toFixed(2));
            _saveSession(sess);

            if (sess.totalLoss >= LOSS_THRESHOLD && !_shown && !_isOnCooldown()) {
                _build(sess.totalLoss);
            }
        }

        if (_lastBalance !== null) {
            var current = typeof window.balance === 'number' ? window.balance : _lastBalance;
            var diff = _lastBalance - current;
            if (diff > 0 && !winAmount) {
                var sess2 = _loadSession();
                sess2.totalLoss = parseFloat((sess2.totalLoss + diff).toFixed(2));
                _saveSession(sess2);
                if (sess2.totalLoss >= LOSS_THRESHOLD && !_shown && !_isOnCooldown()) {
                    _build(sess2.totalLoss);
                }
            }
        }
        _lastBalance = typeof window.balance === 'number' ? window.balance : null;
    }

    window.dismissLossRebateOffer = function () {
        _removeOverlay();
    };

    document.addEventListener('spinComplete', _onSpinComplete);

    if (document.readyState !== 'loading') {
        _lastBalance = typeof window.balance === 'number' ? window.balance : null;
    } else {
        document.addEventListener('DOMContentLoaded', function () {
            _lastBalance = typeof window.balance === 'number' ? window.balance : null;
        });
    }

})();
