/* ui-lossrecovery2.js — Loss Recovery Packs
 * Sprint 38: After cumulative losses exceed $50, offer discounted recovery packs.
 * Creates its own DOM elements (no static HTML required).
 */
(function () {
    'use strict';

    var LR2_KEY      = 'ms_lossRecovery2';
    var LOSS_THRESH   = 50;       // $50 cumulative loss triggers offer
    var COOLDOWN_MS   = 7200000;  // 2 hours between shows
    var _sessionLoss  = 0;
    var _sessionWin   = 0;
    var _overlayEl    = null;

    var PACKS = [
        { name: 'Starter Recovery', cost: 5,  bonus: 15, mult: '3x' },
        { name: 'Big Recovery',     cost: 10, bonus: 35, mult: '3.5x' },
        { name: 'Mega Recovery',    cost: 20, bonus: 80, mult: '4x' }
    ];

    // ── Cooldown helpers ────────────────────────────────────────────────────
    function _isOnCooldown() {
        try {
            var last = parseInt(localStorage.getItem(LR2_KEY + '_lastShown') || '0', 10);
            return (Date.now() - last) < COOLDOWN_MS;
        } catch (e) { return false; }
    }

    function _setCooldown() {
        try { localStorage.setItem(LR2_KEY + '_lastShown', String(Date.now())); } catch (e) {}
    }

    // ── DOM creation (createElement only) ───────────────────────────────────
    function _createOverlay() {
        if (_overlayEl) return;

        var overlay = document.createElement('div');
        overlay.id = 'lossRecovery2Overlay';
        overlay.className = 'loss-recovery2-overlay';
        overlay.style.display = 'none';
        overlay.style.position = 'fixed';
        overlay.style.inset = '0';
        overlay.style.zIndex = '10400';
        overlay.style.background = 'rgba(0,0,0,0.75)';
        overlay.style.display = 'none';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');

        var card = document.createElement('div');
        card.className = 'lr2-card';
        card.style.cssText = 'background:linear-gradient(135deg,#1a1a2e,#16213e);border-radius:16px;padding:28px 24px;max-width:420px;width:90%;color:#fff;text-align:center;position:relative;box-shadow:0 8px 32px rgba(0,0,0,0.6);';

        // Close button
        var closeBtn = document.createElement('button');
        closeBtn.className = 'lr2-close';
        closeBtn.textContent = '\u2715';
        closeBtn.style.cssText = 'position:absolute;top:8px;right:12px;background:none;border:none;color:#aaa;font-size:20px;cursor:pointer;';
        closeBtn.addEventListener('click', function () { window._lossRecovery2Dismiss(); });
        card.appendChild(closeBtn);

        // Icon
        var icon = document.createElement('div');
        icon.style.cssText = 'font-size:48px;margin-bottom:8px;';
        icon.textContent = '\uD83D\uDCB0';
        card.appendChild(icon);

        // Title
        var title = document.createElement('div');
        title.style.cssText = 'font-size:22px;font-weight:700;margin-bottom:4px;';
        title.textContent = 'Recovery Packs Available!';
        card.appendChild(title);

        // Subtitle
        var sub = document.createElement('div');
        sub.style.cssText = 'font-size:14px;color:#aaa;margin-bottom:18px;';
        sub.textContent = 'Tough session? Grab a discounted recovery pack and get back in the game.';
        card.appendChild(sub);

        // Loss display
        var lossBox = document.createElement('div');
        lossBox.style.cssText = 'background:rgba(255,50,50,0.15);border:1px solid rgba(255,50,50,0.3);border-radius:8px;padding:8px 14px;margin-bottom:18px;';
        var lossLabel = document.createElement('span');
        lossLabel.style.cssText = 'color:#ff6b6b;font-size:13px;';
        lossLabel.textContent = 'Session net loss: ';
        var lossAmt = document.createElement('span');
        lossAmt.id = 'lr2LossAmount';
        lossAmt.style.cssText = 'color:#ff4444;font-weight:700;font-size:16px;';
        lossAmt.textContent = '$0.00';
        lossBox.appendChild(lossLabel);
        lossBox.appendChild(lossAmt);
        card.appendChild(lossBox);

        // Pack options container
        var packsWrap = document.createElement('div');
        packsWrap.style.cssText = 'display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-bottom:16px;';

        for (var i = 0; i < PACKS.length; i++) {
            (function (pack, idx) {
                var packEl = document.createElement('div');
                packEl.style.cssText = 'background:rgba(255,255,255,0.08);border:1px solid rgba(255,215,0,0.3);border-radius:10px;padding:14px 12px;flex:1;min-width:100px;cursor:pointer;transition:transform 0.2s,border-color 0.2s;';
                packEl.addEventListener('mouseenter', function () { packEl.style.borderColor = '#ffd700'; packEl.style.transform = 'scale(1.04)'; });
                packEl.addEventListener('mouseleave', function () { packEl.style.borderColor = 'rgba(255,215,0,0.3)'; packEl.style.transform = 'scale(1)'; });

                // Badge
                var badge = document.createElement('div');
                badge.style.cssText = 'background:#ffd700;color:#1a1a2e;font-size:11px;font-weight:700;border-radius:6px;padding:2px 6px;display:inline-block;margin-bottom:6px;';
                badge.textContent = pack.mult + ' value!';
                packEl.appendChild(badge);

                // Pack name
                var pName = document.createElement('div');
                pName.style.cssText = 'font-size:13px;font-weight:600;margin-bottom:4px;color:#eee;';
                pName.textContent = pack.name;
                packEl.appendChild(pName);

                // Cost
                var pCost = document.createElement('div');
                pCost.style.cssText = 'font-size:12px;color:#aaa;margin-bottom:6px;';
                pCost.textContent = 'Pay $' + pack.cost;
                packEl.appendChild(pCost);

                // Bonus
                var pBonus = document.createElement('div');
                pBonus.style.cssText = 'font-size:18px;font-weight:700;color:#4ecdc4;';
                pBonus.textContent = 'Get $' + pack.bonus;
                packEl.appendChild(pBonus);

                // Claim button
                var claimBtn = document.createElement('button');
                claimBtn.style.cssText = 'margin-top:8px;background:linear-gradient(135deg,#ffd700,#f0a500);color:#1a1a2e;border:none;border-radius:8px;padding:6px 14px;font-size:12px;font-weight:700;cursor:pointer;width:100%;';
                claimBtn.textContent = 'Claim';
                claimBtn.addEventListener('click', function () { _claimPack(idx); });
                packEl.appendChild(claimBtn);

                packsWrap.appendChild(packEl);
            })(PACKS[i], i);
        }
        card.appendChild(packsWrap);

        // Dismiss link
        var dismissLink = document.createElement('button');
        dismissLink.style.cssText = 'background:none;border:none;color:#888;font-size:12px;cursor:pointer;text-decoration:underline;';
        dismissLink.textContent = 'No thanks, I\'ll keep playing';
        dismissLink.addEventListener('click', function () { window._lossRecovery2Dismiss(); });
        card.appendChild(dismissLink);

        overlay.appendChild(card);
        document.body.appendChild(overlay);
        _overlayEl = overlay;
    }

    // ── Show overlay ────────────────────────────────────────────────────────
    function _show() {
        if (_isOnCooldown()) return;
        _createOverlay();
        var netLoss = _sessionLoss - _sessionWin;
        var amtEl = document.getElementById('lr2LossAmount');
        if (amtEl) amtEl.textContent = '-$' + netLoss.toFixed(2);
        if (_overlayEl) { _overlayEl.style.display = 'flex'; }
        _setCooldown();
    }

    // ── Claim pack ──────────────────────────────────────────────────────────
    function _claimPack(idx) {
        var pack = PACKS[idx];
        if (!pack) return;
        if (typeof balance !== 'undefined') {
            balance += pack.bonus;
            if (typeof updateBalanceDisplay === 'function') updateBalanceDisplay();
        }
        window._lossRecovery2Dismiss();
    }

    // ── Public API ──────────────────────────────────────────────────────────
    window._lossRecovery2Dismiss = function () {
        if (_overlayEl) {
            _overlayEl.style.opacity = '0';
            _overlayEl.style.transition = 'opacity 0.3s';
            setTimeout(function () {
                if (_overlayEl) { _overlayEl.style.display = 'none'; _overlayEl.style.opacity = ''; _overlayEl.style.transition = ''; }
            }, 300);
        }
    };

    window._lossRecovery2TrackResult = function (betAmount, isWin, winAmount) {
        betAmount = parseFloat(betAmount) || 0;
        winAmount = parseFloat(winAmount) || 0;
        if (isWin) {
            _sessionWin += winAmount;
        } else {
            _sessionLoss += betAmount;
        }
        var netLoss = _sessionLoss - _sessionWin;
        if (netLoss >= LOSS_THRESH) {
            setTimeout(function () { _show(); }, 600);
        }
    };

    // ── Init ────────────────────────────────────────────────────────────────
    function _init() {
        if (/[?&]noBonus=1/.test(window.location.search)) return;
        _createOverlay();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { setTimeout(_init, 1000); });
    } else {
        setTimeout(_init, 1000);
    }

})();
