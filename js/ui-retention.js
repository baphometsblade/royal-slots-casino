// Retention & conversion hooks
// Three triggers: (1) zero-balance re-deposit modal, (2) big-win share prompt,
// (3) loss-streak cashback offer — all driven by wrapping window.updateBalance
(function () {
    'use strict';

    // ── Config ────────────────────────────────────────────────────────────────
    var WIN_SHARE_MULT   = 20;   // show share prompt when win ≥ bet × this
    var LOSS_STREAK_TRIG = 7;    // consecutive losses before showing cashback offer
    var SHARE_COOLDOWN   = 300000; // 5 min between share prompts
    var OFFER_COOLDOWN   = 600000; // 10 min between loss-offer prompts
    var ZERO_RESHOW_KEY  = 'retZeroShown';

    // ── State ─────────────────────────────────────────────────────────────────
    var _prevBalance     = null;
    var _lossStreak      = 0;
    var _stylesInjected  = false;
    var _lastShareMs     = 0;
    var _lastOfferMs     = 0;
    var _zeroShown       = false;

    // ── Styles ────────────────────────────────────────────────────────────────
    function injectStyles() {
        if (_stylesInjected) return;
        _stylesInjected = true;
        var s = document.createElement('style');
        s.textContent = [
            /* Zero modal overlay */
            '#retZeroOverlay{position:fixed;inset:0;z-index:30000;background:rgba(0,0,0,.92);' +
                'display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box}',
            '#retZeroModal{background:linear-gradient(160deg,#0d0d1a,#1c0a2e);border:2px solid rgba(239,68,68,.5);' +
                'border-radius:20px;padding:32px 28px;max-width:400px;width:100%;text-align:center;' +
                'box-shadow:0 0 60px rgba(239,68,68,.25)}',
            '#retZeroModal h2{color:#f87171;font-size:22px;margin:0 0 8px;letter-spacing:1px}',
            '#retZeroModal .ret-sub{color:rgba(255,255,255,.55);font-size:13px;margin-bottom:22px}',
            '.ret-deposit-btn{width:100%;padding:14px;background:linear-gradient(135deg,#f59e0b,#d97706);' +
                'border:none;border-radius:10px;color:#fff;font-size:16px;font-weight:900;' +
                'cursor:pointer;letter-spacing:.5px;margin-bottom:10px;transition:opacity .15s}',
            '.ret-deposit-btn:hover{opacity:.88}',
            '.ret-dismiss-btn{background:none;border:none;color:rgba(255,255,255,.3);font-size:12px;' +
                'cursor:pointer;text-decoration:underline}',
            /* Share toast */
            '#retShareToast{position:fixed;top:20px;left:50%;transform:translateX(-50%) translateY(-80px);' +
                'z-index:30000;background:linear-gradient(135deg,#14532d,#166534);' +
                'border:2px solid #22c55e;border-radius:14px;padding:14px 20px;' +
                'box-shadow:0 0 30px rgba(34,197,94,.45);color:#f0fdf4;font-family:inherit;' +
                'text-align:center;min-width:260px;transition:transform .4s cubic-bezier(.34,1.56,.64,1)}',
            '#retShareToast.active{transform:translateX(-50%) translateY(0)}',
            '#retShareToast .rst-title{font-size:15px;font-weight:800;margin-bottom:4px}',
            '#retShareToast .rst-sub{font-size:12px;color:rgba(255,255,255,.65);margin-bottom:10px}',
            '#retShareToast .rst-btns{display:flex;gap:8px;justify-content:center}',
            '.rst-btn{padding:7px 16px;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;border:none;transition:opacity .15s}',
            '.rst-btn:hover{opacity:.85}',
            '.rst-share{background:#22c55e;color:#0d0d1a}',
            '.rst-close{background:rgba(255,255,255,.15);color:#fff}',
            /* Loss offer toast */
            '#retOfferToast{position:fixed;bottom:80px;left:20px;z-index:29999;' +
                'background:linear-gradient(135deg,#1e1b4b,#312e81);' +
                'border:2px solid #818cf8;border-radius:14px;padding:14px 18px;max-width:280px;' +
                'box-shadow:0 0 30px rgba(129,140,248,.4);color:#e0e7ff;font-family:inherit;' +
                'transform:translateX(-120%);transition:transform .4s cubic-bezier(.34,1.56,.64,1)}',
            '#retOfferToast.active{transform:translateX(0)}',
            '#retOfferToast .rot-title{font-size:13px;font-weight:800;margin-bottom:4px;color:#a5b4fc}',
            '#retOfferToast .rot-body{font-size:12px;color:rgba(255,255,255,.65);margin-bottom:10px;line-height:1.5}',
            '#retOfferToast .rot-btns{display:flex;gap:8px}',
            '.rot-btn{padding:6px 14px;border-radius:7px;font-size:12px;font-weight:700;cursor:pointer;border:none;transition:opacity .15s}',
            '.rot-btn:hover{opacity:.85}',
            '.rot-claim{background:#818cf8;color:#0d0d1a}',
            '.rot-pass{background:rgba(255,255,255,.12);color:rgba(255,255,255,.7)}'
        ].join('\n');
        document.head.appendChild(s);
    }

    // ── Zero balance modal ────────────────────────────────────────────────────
    function showZeroModal() {
        if (_zeroShown) return;
        // Snooze: don't show more than once per 30 minutes per session
        try {
            var last = parseInt(localStorage.getItem(ZERO_RESHOW_KEY) || '0', 10);
            if (Date.now() - last < 1800000) return;
        } catch (e) { /* ignore */ }
        _zeroShown = true;

        injectStyles();
        var ov = document.createElement('div');
        ov.id = 'retZeroOverlay';

        var modal = document.createElement('div');
        modal.id = 'retZeroModal';

        var icon = document.createElement('div');
        icon.style.cssText = 'font-size:3rem;margin-bottom:8px';
        icon.textContent = '\uD83D\uDCB8';
        modal.appendChild(icon);

        var h2 = document.createElement('h2');
        h2.textContent = 'Balance Empty!';
        modal.appendChild(h2);

        var sub = document.createElement('div');
        sub.className = 'ret-sub';
        sub.textContent = 'Top up your account and keep the spins going. Your next win could be huge!';
        modal.appendChild(sub);

        var depBtn = document.createElement('button');
        depBtn.className = 'ret-deposit-btn';
        depBtn.textContent = '\uD83D\uDCB3 DEPOSIT NOW';
        depBtn.addEventListener('click', function () {
            closeZeroModal(ov);
            if (typeof showWalletModal === 'function') showWalletModal();
        });
        modal.appendChild(depBtn);

        var dis = document.createElement('button');
        dis.className = 'ret-dismiss-btn';
        dis.textContent = 'Maybe later';
        dis.addEventListener('click', function () { closeZeroModal(ov); });
        modal.appendChild(dis);

        ov.appendChild(modal);
        ov.addEventListener('click', function (e) { if (e.target === ov) closeZeroModal(ov); });
        document.body.appendChild(ov);

        try { localStorage.setItem(ZERO_RESHOW_KEY, String(Date.now())); } catch (e) { /* ignore */ }

        // Auto-dismiss after 90s
        setTimeout(function () { closeZeroModal(ov); }, 90000);
    }

    function closeZeroModal(ov) {
        _zeroShown = false;
        if (ov && ov.parentNode) ov.parentNode.removeChild(ov);
    }

    // ── Big-win share prompt ──────────────────────────────────────────────────
    function showWinShare(winAmt) {
        if (Date.now() - _lastShareMs < SHARE_COOLDOWN) return;
        _lastShareMs = Date.now();

        injectStyles();
        var el = document.getElementById('retShareToast');
        if (!el) {
            el = document.createElement('div');
            el.id = 'retShareToast';

            var title = document.createElement('div');
            title.className = 'rst-title';
            title.textContent = '\uD83C\uDF89 MASSIVE WIN!';

            var sub = document.createElement('div');
            sub.className = 'rst-sub';
            sub.id = 'retShareAmt';
            sub.textContent = '';

            var btns = document.createElement('div');
            btns.className = 'rst-btns';

            var share = document.createElement('button');
            share.className = 'rst-btn rst-share';
            share.textContent = '\uD83D\uDCF1 Share';
            share.addEventListener('click', function () {
                dismissShareToast(el);
                var text = 'I just won ' + share._winText + ' on Matrix Spins! \uD83C\uDF89 #MatrixSpins';
                if (navigator.share) {
                    navigator.share({ title: 'Big Win!', text: text }).catch(function () {});
                } else {
                    var url = 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(text);
                    window.open(url, '_blank', 'width=550,height=420');
                }
            });

            var close = document.createElement('button');
            close.className = 'rst-btn rst-close';
            close.textContent = 'Nice!';
            close.addEventListener('click', function () { dismissShareToast(el); });

            btns.appendChild(share);
            btns.appendChild(close);
            el.appendChild(title);
            el.appendChild(sub);
            el.appendChild(btns);
            document.body.appendChild(el);
        }

        var fmt = '$' + winAmt.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        var subEl = document.getElementById('retShareAmt');
        if (subEl) subEl.textContent = 'You won ' + fmt + '! Share the excitement!';
        var shareBtn = el.querySelector('.rst-share');
        if (shareBtn) shareBtn._winText = fmt;

        requestAnimationFrame(function () {
            requestAnimationFrame(function () { el.classList.add('active'); });
        });
        setTimeout(function () { dismissShareToast(el); }, 12000);
    }

    function dismissShareToast(el) {
        if (!el) return;
        el.classList.remove('active');
        setTimeout(function () {
            if (el.parentNode) el.parentNode.removeChild(el);
        }, 450);
    }

    // ── Loss-streak cashback offer ────────────────────────────────────────────
    function showLossOffer() {
        if (Date.now() - _lastOfferMs < OFFER_COOLDOWN) return;
        _lastOfferMs = Date.now();

        injectStyles();
        var el = document.getElementById('retOfferToast');
        if (!el) {
            el = document.createElement('div');
            el.id = 'retOfferToast';

            var title = document.createElement('div');
            title.className = 'rot-title';
            title.textContent = '\uD83D\uDCB0 Rough Streak? We\u2019ve Got You';

            var body = document.createElement('div');
            body.className = 'rot-body';
            body.textContent = 'Claim 5% cashback on your next losses. Sometimes luck just needs a nudge.';

            var btns = document.createElement('div');
            btns.className = 'rot-btns';

            var claim = document.createElement('button');
            claim.className = 'rot-btn rot-claim';
            claim.textContent = '\u2728 Claim Offer';
            claim.addEventListener('click', function () {
                dismissLossOffer(el);
                // Navigate to promos or open wallet
                if (typeof showWalletModal === 'function') showWalletModal();
            });

            var pass = document.createElement('button');
            pass.className = 'rot-btn rot-pass';
            pass.textContent = 'No thanks';
            pass.addEventListener('click', function () { dismissLossOffer(el); });

            btns.appendChild(claim);
            btns.appendChild(pass);
            el.appendChild(title);
            el.appendChild(body);
            el.appendChild(btns);
            document.body.appendChild(el);
        }

        el.style.transform = 'translateX(-120%)';
        requestAnimationFrame(function () {
            requestAnimationFrame(function () { el.classList.add('active'); });
        });
        setTimeout(function () { dismissLossOffer(el); }, 15000);
    }

    function dismissLossOffer(el) {
        if (!el) return;
        el.classList.remove('active');
    }

    // ── Balance hook ──────────────────────────────────────────────────────────
    function hookBalance() {
        var _orig = window.updateBalance;
        window.updateBalance = function (n) {
            if (_orig) _orig.apply(this, arguments);

            var newBal = parseFloat(n);
            if (isNaN(newBal)) return;

            // Zero / near-empty balance
            var minBet = (typeof BET_STEPS !== 'undefined' && BET_STEPS && BET_STEPS.length)
                ? BET_STEPS[0] : 0.20;
            if (newBal < minBet) {
                showZeroModal();
            }

            // Win/loss detection (compare to previous balance + infer bet)
            if (_prevBalance !== null) {
                var diff = newBal - _prevBalance;
                if (diff > 0) {
                    // Win
                    _lossStreak = 0;
                    // Show share prompt if win ≥ WIN_SHARE_MULT × minimum bet
                    var curBet = (typeof currentBet !== 'undefined') ? currentBet : minBet;
                    if (diff >= curBet * WIN_SHARE_MULT) {
                        showWinShare(diff);
                    }
                } else if (diff < 0) {
                    // Loss (balance decreased — net loss after bet deduction)
                    _lossStreak += 1;
                    if (_lossStreak >= LOSS_STREAK_TRIG) {
                        _lossStreak = 0; // reset to avoid repeat-firing
                        showLossOffer();
                    }
                }
            }

            _prevBalance = newBal;
        };
    }

    function init() {
        hookBalance();
        // Seed initial balance from localStorage
        try {
            var key = typeof STORAGE_KEY_BALANCE !== 'undefined' ? STORAGE_KEY_BALANCE : 'casinoBalance';
            var raw = localStorage.getItem(key);
            if (raw !== null) _prevBalance = parseFloat(raw);
        } catch (e) { /* ignore */ }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        setTimeout(init, 0);
    }
}());

// ── Welcome-Back Overlay ───────────────────────────────────────────────────
// Shown once per 24h to authenticated users who haven't logged in for 3+ days.
// All styles are embedded here (styles.css is off-limits during parallel edits).
(function () {
    'use strict';

    var RETURN_OFFER_KEY   = 'returnOfferShown';  // localStorage key
    var RETURN_OFFER_TTL   = 24 * 60 * 60 * 1000; // 24 hours in ms
    var AUTO_DISMISS_MS    = 12000;                // 12s auto-dismiss
    var POLL_INTERVAL_MS   = 250;                  // polling interval for currentUser
    var POLL_TIMEOUT_MS    = 5000;                 // stop polling after 5s

    var _stylesInjected = false;
    var _pollStart      = Date.now();
    var _pollTimer      = null;
    var _overlayEl      = null;
    var _dismissTimer   = null;

    // ── Style injection ────────────────────────────────────────────────────
    function injectWelcomeBackStyles() {
        if (_stylesInjected) return;
        _stylesInjected = true;

        var s = document.createElement('style');
        s.id = 'retWelcomeBackStyles';
        s.textContent = [
            /* Overlay backdrop */
            '#retWelcomeOverlay{' +
                'position:fixed;inset:0;z-index:40000;' +
                'background:rgba(0,0,0,.88);' +
                'display:flex;align-items:center;justify-content:center;' +
                'padding:16px;box-sizing:border-box;' +
                'animation:retFadeIn .35s ease forwards' +
            '}',
            '@keyframes retFadeIn{from{opacity:0}to{opacity:1}}',
            /* Modal card */
            '#retWelcomeModal{' +
                'background:linear-gradient(160deg,#0d0d1a 0%,#1a0e2e 50%,#0d1a1a 100%);' +
                'border:2px solid rgba(251,191,36,.55);' +
                'border-radius:24px;' +
                'padding:36px 32px 28px;' +
                'max-width:440px;width:100%;text-align:center;' +
                'box-shadow:0 0 80px rgba(251,191,36,.22),0 0 30px rgba(0,0,0,.6);' +
                'position:relative;' +
                'animation:retSlideUp .4s cubic-bezier(.34,1.56,.64,1) forwards' +
            '}',
            '@keyframes retSlideUp{from{transform:translateY(40px);opacity:0}to{transform:translateY(0);opacity:1}}',
            /* Auto-dismiss progress bar */
            '#retWelcomeProgress{' +
                'position:absolute;bottom:0;left:0;height:3px;' +
                'background:linear-gradient(90deg,#f59e0b,#fbbf24);' +
                'border-radius:0 0 24px 24px;' +
                'width:100%;' +
                'transform-origin:left center;' +
                'animation:retProgressShrink ' + (AUTO_DISMISS_MS / 1000) + 's linear forwards' +
            '}',
            '@keyframes retProgressShrink{from{transform:scaleX(1)}to{transform:scaleX(0)}}',
            /* Close button */
            '#retWelcomeClose{' +
                'position:absolute;top:14px;right:16px;' +
                'background:none;border:none;color:rgba(255,255,255,.35);' +
                'font-size:20px;cursor:pointer;line-height:1;padding:4px 8px;' +
                'transition:color .15s' +
            '}',
            '#retWelcomeClose:hover{color:rgba(255,255,255,.7)}',
            /* Tier badge */
            '.ret-tier-badge{' +
                'display:inline-block;padding:4px 14px;border-radius:20px;' +
                'font-size:11px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;' +
                'margin-bottom:16px' +
            '}',
            '.ret-tier-platinum{background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#e0e7ff}',
            '.ret-tier-gold{background:linear-gradient(135deg,#d97706,#f59e0b);color:#fff8e1}',
            '.ret-tier-silver{background:linear-gradient(135deg,#64748b,#94a3b8);color:#f0f4ff}',
            '.ret-tier-bronze{background:linear-gradient(135deg,#92400e,#b45309);color:#fef3c7}',
            /* Main emoji */
            '#retWelcomeModal .rwb-emoji{font-size:3.5rem;margin-bottom:10px;display:block}',
            /* Heading */
            '#retWelcomeModal h2{' +
                'color:#fbbf24;font-size:22px;font-weight:900;margin:0 0 6px;letter-spacing:.5px' +
            '}',
            /* Sub-message */
            '#retWelcomeModal .rwb-msg{' +
                'color:rgba(255,255,255,.55);font-size:13px;margin-bottom:20px;line-height:1.5' +
            '}',
            /* Offer card */
            '.rwb-offer{' +
                'background:rgba(251,191,36,.08);border:1px solid rgba(251,191,36,.25);' +
                'border-radius:14px;padding:16px 20px;margin-bottom:22px' +
            '}',
            '.rwb-offer-row{' +
                'display:flex;align-items:center;justify-content:center;gap:18px;flex-wrap:wrap' +
            '}',
            '.rwb-offer-item{text-align:center}',
            '.rwb-offer-val{' +
                'display:block;font-size:26px;font-weight:900;' +
                'background:linear-gradient(135deg,#fbbf24,#f59e0b);' +
                '-webkit-background-clip:text;-webkit-text-fill-color:transparent;' +
                'background-clip:text' +
            '}',
            '.rwb-offer-lbl{display:block;font-size:11px;color:rgba(255,255,255,.45);margin-top:2px}',
            '.rwb-offer-sep{color:rgba(255,255,255,.2);font-size:22px}',
            /* Action buttons */
            '.rwb-btn-primary{' +
                'width:100%;padding:15px;margin-bottom:10px;' +
                'background:linear-gradient(135deg,#f59e0b,#d97706);' +
                'border:none;border-radius:12px;' +
                'color:#0d0d1a;font-size:16px;font-weight:900;letter-spacing:.5px;' +
                'cursor:pointer;transition:opacity .15s,transform .1s;' +
                'box-shadow:0 4px 20px rgba(251,191,36,.35)' +
            '}',
            '.rwb-btn-primary:hover{opacity:.9;transform:translateY(-1px)}',
            '.rwb-btn-primary:active{transform:translateY(0)}',
            '.rwb-btn-secondary{' +
                'background:none;border:none;' +
                'color:rgba(255,255,255,.3);font-size:12px;cursor:pointer;' +
                'text-decoration:underline;transition:color .15s' +
            '}',
            '.rwb-btn-secondary:hover{color:rgba(255,255,255,.55)}',
        ].join('\n');
        document.head.appendChild(s);
    }

    // ── Build and show the overlay ─────────────────────────────────────────
    function showWelcomeBack(data) {
        if (_overlayEl) return; // already showing

        injectWelcomeBackStyles();

        var username = (typeof currentUser !== 'undefined' && currentUser && currentUser.username)
            ? currentUser.username
            : 'Player';

        var tierClass = 'ret-tier-' + (data.offerTier || 'bronze');

        var ov = document.createElement('div');
        ov.id = 'retWelcomeOverlay';
        _overlayEl = ov;

        var modal = document.createElement('div');
        modal.id = 'retWelcomeModal';

        // Progress bar
        var prog = document.createElement('div');
        prog.id = 'retWelcomeProgress';
        modal.appendChild(prog);

        // Close button (using textContent to avoid XSS)
        var closeBtn = document.createElement('button');
        closeBtn.id = 'retWelcomeClose';
        closeBtn.textContent = '\u00D7'; // Unicode multiplication sign (×)
        closeBtn.setAttribute('aria-label', 'Close');
        closeBtn.addEventListener('click', dismissWelcomeBack);
        modal.appendChild(closeBtn);

        // Tier badge
        var badge = document.createElement('div');
        badge.className = 'ret-tier-badge ' + tierClass;
        badge.textContent = (data.offerTier || 'bronze').toUpperCase() + ' OFFER';
        modal.appendChild(badge);

        // Emoji
        var emoji = document.createElement('span');
        emoji.className = 'rwb-emoji';
        emoji.textContent = '\uD83C\uDF89'; // 🎉
        modal.appendChild(emoji);

        // Heading
        var h2 = document.createElement('h2');
        h2.textContent = 'Welcome Back, ' + username + '!';
        modal.appendChild(h2);

        // Sub-message
        var msgEl = document.createElement('div');
        msgEl.className = 'rwb-msg';
        msgEl.textContent = data.message || 'We have an exclusive offer waiting for you.';
        modal.appendChild(msgEl);

        // Offer card
        var offerCard = document.createElement('div');
        offerCard.className = 'rwb-offer';

        var offerRow = document.createElement('div');
        offerRow.className = 'rwb-offer-row';

        if (data.bonusPercent > 0) {
            var depositItem = document.createElement('div');
            depositItem.className = 'rwb-offer-item';
            var depositVal = document.createElement('span');
            depositVal.className = 'rwb-offer-val';
            depositVal.textContent = data.bonusPercent + '%';
            var depositLbl = document.createElement('span');
            depositLbl.className = 'rwb-offer-lbl';
            depositLbl.textContent = 'Deposit Match';
            depositItem.appendChild(depositVal);
            depositItem.appendChild(depositLbl);
            offerRow.appendChild(depositItem);
        }

        if (data.bonusPercent > 0 && data.freeSpins > 0) {
            var sep = document.createElement('div');
            sep.className = 'rwb-offer-sep';
            sep.textContent = '+';
            offerRow.appendChild(sep);
        }

        if (data.freeSpins > 0) {
            var spinsItem = document.createElement('div');
            spinsItem.className = 'rwb-offer-item';
            var spinsVal = document.createElement('span');
            spinsVal.className = 'rwb-offer-val';
            spinsVal.textContent = String(data.freeSpins);
            var spinsLbl = document.createElement('span');
            spinsLbl.className = 'rwb-offer-lbl';
            spinsLbl.textContent = 'Free Spins';
            spinsItem.appendChild(spinsVal);
            spinsItem.appendChild(spinsLbl);
            offerRow.appendChild(spinsItem);
        }

        offerCard.appendChild(offerRow);
        modal.appendChild(offerCard);

        // Claim button
        var claimBtn = document.createElement('button');
        claimBtn.className = 'rwb-btn-primary';
        claimBtn.textContent = '\uD83D\uDCB3 CLAIM NOW'; // 💳
        claimBtn.addEventListener('click', function () {
            dismissWelcomeBack();
            if (typeof showWalletModal === 'function') showWalletModal();
        });
        modal.appendChild(claimBtn);

        // Maybe later button
        var laterBtn = document.createElement('button');
        laterBtn.className = 'rwb-btn-secondary';
        laterBtn.textContent = 'Maybe Later';
        laterBtn.addEventListener('click', dismissWelcomeBack);
        modal.appendChild(laterBtn);

        // Dismiss on backdrop click
        ov.addEventListener('click', function (e) {
            if (e.target === ov) dismissWelcomeBack();
        });

        ov.appendChild(modal);
        document.body.appendChild(ov);

        // Auto-dismiss after AUTO_DISMISS_MS
        _dismissTimer = setTimeout(dismissWelcomeBack, AUTO_DISMISS_MS);
    }

    function dismissWelcomeBack() {
        if (_dismissTimer) { clearTimeout(_dismissTimer); _dismissTimer = null; }
        if (!_overlayEl) return;
        var el = _overlayEl;
        _overlayEl = null;
        el.style.animation = 'retFadeIn .25s ease reverse forwards';
        setTimeout(function () {
            if (el.parentNode) el.parentNode.removeChild(el);
        }, 280);
    }

    // ── Fetch return-status from server and conditionally show overlay ─────
    function checkReturnOffer() {
        // Only for server-authenticated users (not guests)
        if (typeof currentUser === 'undefined' || !currentUser ||
            currentUser.isGuest || !currentUser.token) {
            return;
        }

        // Skip if already shown within 24h
        try {
            var lastShown = parseInt(localStorage.getItem(RETURN_OFFER_KEY) || '0', 10);
            if (Date.now() - lastShown < RETURN_OFFER_TTL) return;
        } catch (e) { /* ignore storage errors */ }

        var token = currentUser.token;
        fetch('/api/user/return-status', {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json',
            },
        })
        .then(function (resp) {
            if (!resp.ok) throw new Error('HTTP ' + resp.status);
            return resp.json();
        })
        .then(function (data) {
            if (!data.isReturn) return;

            // Mark as shown in localStorage before displaying (prevent race on double-call)
            try { localStorage.setItem(RETURN_OFFER_KEY, String(Date.now())); } catch (e) { /* ignore */ }

            // Small delay so the page is settled before we show the overlay
            setTimeout(function () { showWelcomeBack(data); }, 800);
        })
        .catch(function (err) {
            // Non-fatal — silently ignore network / server errors
            console.warn('[ReturnOffer] Failed to fetch return-status:', err.message);
        });
    }

    // Expose globally so app.js / onPostAuthInit can call it directly
    window.checkReturnOffer = checkReturnOffer;

    // ── Auto-init: poll for currentUser up to POLL_TIMEOUT_MS ─────────────
    // This fires when the user is already logged in by the time the script
    // loads (e.g. token restored from localStorage before DOMContentLoaded).
    function pollForUser() {
        if (Date.now() - _pollStart > POLL_TIMEOUT_MS) {
            clearInterval(_pollTimer);
            return;
        }
        if (typeof currentUser !== 'undefined' && currentUser &&
            !currentUser.isGuest && currentUser.token) {
            clearInterval(_pollTimer);
            checkReturnOffer();
        }
    }

    // Also listen for the custom auth-success event fired by ui-auth / app.js
    window.addEventListener('casinoAuthSuccess', function () {
        checkReturnOffer();
    });

    // Start polling shortly after DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            _pollTimer = setInterval(pollForUser, POLL_INTERVAL_MS);
        });
    } else {
        _pollTimer = setInterval(pollForUser, POLL_INTERVAL_MS);
    }
}());
