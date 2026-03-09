/* ui-losscomfort2.js -- Loss Streak Comfort Modal (v2)
 * Sprint 48: Modal overlay after 10 consecutive losses with suggestion cards,
 * optional 5% cashback, and 30-minute cooldown between shows.
 */
(function () {
    'use strict';

    var STORAGE_KEY = 'ms_lossComfort';
    var LOSS_THRESHOLD = 10;
    var COOLDOWN_MS = 1800000; // 30 minutes
    var CASHBACK_RATE = 0.05;

    var _overlayEl = null;
    var _lossStreak = 0;
    var _totalLossDuringStreak = 0;

    // ── Persistence ────────────────────────────────────────────────────────
    function _load() {
        try {
            var data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
            _lossStreak = typeof data.lossStreak === 'number' ? data.lossStreak : 0;
            _totalLossDuringStreak = typeof data.totalLoss === 'number' ? data.totalLoss : 0;
            return data;
        } catch (e) {
            _lossStreak = 0;
            _totalLossDuringStreak = 0;
            return {};
        }
    }

    function _save() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            var data = raw ? JSON.parse(raw) : {};
            data.lossStreak = _lossStreak;
            data.totalLoss = _totalLossDuringStreak;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (e) { /* silent */ }
    }

    function _isOnCooldown() {
        try {
            var data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
            if (typeof data.lastShownV2 === 'number') {
                return (Date.now() - data.lastShownV2) < COOLDOWN_MS;
            }
        } catch (e) { /* silent */ }
        return false;
    }

    function _markShown() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            var data = raw ? JSON.parse(raw) : {};
            data.lastShownV2 = Date.now();
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (e) { /* silent */ }
    }

    // ── DOM Creation ───────────────────────────────────────────────────────
    function _createOverlay() {
        if (_overlayEl) return;

        var overlay = document.createElement('div');
        overlay.id = 'lossStreakComfort';
        overlay.style.cssText = 'position:fixed;inset:0;z-index:10400;display:none;' +
            'align-items:center;justify-content:center;' +
            'background:rgba(0,0,0,0.7);backdrop-filter:blur(4px);font-family:inherit;';

        var card = document.createElement('div');
        card.style.cssText = 'background:linear-gradient(145deg,#1a1a3e,#0f1628);' +
            'border:1px solid rgba(100,149,237,0.3);border-radius:16px;padding:28px 24px;' +
            'max-width:380px;width:90vw;text-align:center;position:relative;' +
            'box-shadow:0 8px 32px rgba(0,0,0,0.5);';

        // Close button
        var closeBtn = document.createElement('button');
        closeBtn.style.cssText = 'position:absolute;top:10px;right:14px;background:none;' +
            'border:none;color:#94a3b8;font-size:18px;cursor:pointer;padding:4px;';
        closeBtn.textContent = '\u2715';
        closeBtn.addEventListener('click', function () {
            if (typeof window.dismissLossComfort2 === 'function') window.dismissLossComfort2();
        });

        // Heart icon
        var icon = document.createElement('div');
        icon.style.cssText = 'font-size:36px;margin-bottom:8px;';
        icon.textContent = '\uD83D\uDC99'; // blue heart

        // Title
        var title = document.createElement('div');
        title.style.cssText = 'font-size:18px;font-weight:700;color:#e2e8f0;margin-bottom:6px;';
        title.textContent = 'Tough Luck Streak';

        // Subtitle
        var subtitle = document.createElement('div');
        subtitle.style.cssText = 'font-size:13px;color:#94a3b8;margin-bottom:18px;line-height:1.4;';
        subtitle.textContent = 'Everyone hits a rough patch. Here are some tips to help turn things around.';

        card.appendChild(closeBtn);
        card.appendChild(icon);
        card.appendChild(title);
        card.appendChild(subtitle);

        // Suggestion cards
        var suggestions = [
            { icon: '\u23F8', title: 'Take a Break', desc: 'Step away for a few minutes to reset.', color: '#6366f1' },
            { icon: '\u2B07\uFE0F', title: 'Lower Your Bet', desc: 'Reduce your stake to extend your session.', color: '#f59e0b' },
            { icon: '\uD83C\uDFB0', title: 'Try a Different Game', desc: 'A fresh game might change your luck.', color: '#10b981' }
        ];

        var cardsRow = document.createElement('div');
        cardsRow.style.cssText = 'display:flex;gap:10px;margin-bottom:18px;flex-wrap:wrap;justify-content:center;';

        for (var i = 0; i < suggestions.length; i++) {
            var s = suggestions[i];
            var sCard = document.createElement('div');
            sCard.style.cssText = 'flex:1;min-width:90px;max-width:110px;' +
                'background:rgba(255,255,255,0.05);border:1px solid ' + s.color + '33;' +
                'border-radius:10px;padding:12px 8px;cursor:default;' +
                'transition:border-color 0.2s,background 0.2s;';

            var sIcon = document.createElement('div');
            sIcon.style.cssText = 'font-size:22px;margin-bottom:4px;';
            sIcon.textContent = s.icon;

            var sTitle = document.createElement('div');
            sTitle.style.cssText = 'font-size:11px;font-weight:700;color:' + s.color + ';margin-bottom:3px;';
            sTitle.textContent = s.title;

            var sDesc = document.createElement('div');
            sDesc.style.cssText = 'font-size:9px;color:#94a3b8;line-height:1.3;';
            sDesc.textContent = s.desc;

            sCard.appendChild(sIcon);
            sCard.appendChild(sTitle);
            sCard.appendChild(sDesc);
            cardsRow.appendChild(sCard);
        }
        card.appendChild(cardsRow);

        // Cashback section
        var cashbackSection = document.createElement('div');
        cashbackSection.id = 'lossComfort2Cashback';
        cashbackSection.style.cssText = 'background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.25);' +
            'border-radius:10px;padding:10px 14px;margin-bottom:14px;';

        var cashbackTitle = document.createElement('div');
        cashbackTitle.style.cssText = 'font-size:11px;color:#10b981;font-weight:600;margin-bottom:4px;';
        cashbackTitle.textContent = '\u26A1 Cashback Available';

        var cashbackAmount = document.createElement('div');
        cashbackAmount.id = 'lossComfort2Amount';
        cashbackAmount.style.cssText = 'font-size:16px;font-weight:800;color:#4ade80;';
        cashbackAmount.textContent = '$0.00';

        var cashbackDesc = document.createElement('div');
        cashbackDesc.style.cssText = 'font-size:9px;color:#94a3b8;margin-top:2px;';
        cashbackDesc.textContent = '5% of your losses during this streak';

        cashbackSection.appendChild(cashbackTitle);
        cashbackSection.appendChild(cashbackAmount);
        cashbackSection.appendChild(cashbackDesc);
        card.appendChild(cashbackSection);

        // Claim button
        var claimBtn = document.createElement('button');
        claimBtn.id = 'lossComfort2ClaimBtn';
        claimBtn.style.cssText = 'background:linear-gradient(135deg,#10b981,#059669);color:#fff;' +
            'border:none;border-radius:8px;padding:10px 24px;font-size:14px;font-weight:700;' +
            'cursor:pointer;width:100%;margin-bottom:8px;transition:opacity 0.2s;';
        claimBtn.textContent = 'Claim Cashback';
        claimBtn.addEventListener('click', function () {
            _claimCashback();
        });

        // Dismiss link
        var dismissLink = document.createElement('button');
        dismissLink.style.cssText = 'background:none;border:none;color:#64748b;font-size:12px;' +
            'cursor:pointer;padding:4px;';
        dismissLink.textContent = 'No thanks, I\'ll keep going';
        dismissLink.addEventListener('click', function () {
            if (typeof window.dismissLossComfort2 === 'function') window.dismissLossComfort2();
        });

        card.appendChild(claimBtn);
        card.appendChild(dismissLink);
        overlay.appendChild(card);
        document.body.appendChild(overlay);
        _overlayEl = overlay;
    }

    // ── Show / Hide ────────────────────────────────────────────────────────
    function _show() {
        _createOverlay();
        var cashbackAmt = Math.round(_totalLossDuringStreak * CASHBACK_RATE * 100) / 100;
        var amountEl = document.getElementById('lossComfort2Amount');
        if (amountEl) {
            amountEl.textContent = '$' + cashbackAmt.toFixed(2);
        }
        var claimBtn = document.getElementById('lossComfort2ClaimBtn');
        if (claimBtn) {
            claimBtn.textContent = 'Claim $' + cashbackAmt.toFixed(2) + ' Cashback';
            if (cashbackAmt <= 0) {
                claimBtn.style.display = 'none';
            } else {
                claimBtn.style.display = '';
            }
        }
        if (_overlayEl) {
            _overlayEl.style.display = 'flex';
        }
        _markShown();
    }

    function _hide() {
        if (_overlayEl) {
            _overlayEl.style.opacity = '0';
            _overlayEl.style.transition = 'opacity 0.3s';
            setTimeout(function () {
                if (_overlayEl) {
                    _overlayEl.style.display = 'none';
                    _overlayEl.style.opacity = '';
                    _overlayEl.style.transition = '';
                }
            }, 300);
        }
    }

    // ── Cashback ───────────────────────────────────────────────────────────
    function _claimCashback() {
        var cashbackAmt = Math.round(_totalLossDuringStreak * CASHBACK_RATE * 100) / 100;
        if (cashbackAmt > 0 && typeof window.balance !== 'undefined') {
            window.balance += cashbackAmt;
            if (typeof window.updateBalanceDisplay === 'function') {
                window.updateBalanceDisplay();
            }
        }
        _lossStreak = 0;
        _totalLossDuringStreak = 0;
        _save();
        _hide();
    }

    // ── Spin handler ───────────────────────────────────────────────────────
    function _onSpinComplete(e) {
        var detail = e && e.detail ? e.detail : {};
        var isWin = detail.win === true || (typeof detail.winAmount === 'number' && detail.winAmount > 0);
        var betAmount = typeof detail.betAmount === 'number' ? detail.betAmount : 0;

        if (isWin) {
            _lossStreak = 0;
            _totalLossDuringStreak = 0;
            _save();
            return;
        }

        _lossStreak++;
        _totalLossDuringStreak += betAmount;
        _save();

        if (_lossStreak >= LOSS_THRESHOLD && !_isOnCooldown()) {
            _show();
        }
    }

    // ── Public API ─────────────────────────────────────────────────────────
    window.dismissLossComfort2 = function () {
        _lossStreak = 0;
        _totalLossDuringStreak = 0;
        _save();
        _hide();
    };

    // ── Init ───────────────────────────────────────────────────────────────
    function _init() {
        try {
            if (new URLSearchParams(window.location.search).get('noBonus') === '1') return;
        } catch (e) { /* old browser */ }

        _load();
        _createOverlay();
        document.addEventListener('spinComplete', _onSpinComplete);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { setTimeout(_init, 800); });
    } else {
        setTimeout(_init, 800);
    }

})();
