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
