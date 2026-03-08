/* ui-depositmatch.js — Deposit Match Popup
 * Sprint 33: Drives deposits by showing tiered match offers.
 * Dynamically creates its own DOM elements (no static HTML required).
 */
(function () {
    'use strict';

    // ── Constants ────────────────────────────────────────────────────────────
    var STORAGE_KEY = 'ms_depositMatchData';
    var TIERS = [
        { amount: 10, match: 10 },
        { amount: 25, match: 25 },
        { amount: 50, match: 50 },
        { amount: 100, match: 100 }
    ];
    var MAX_SHOWS    = 3;
    var DELAY_MS     = 20000;  // 20s before first show
    var COOLDOWN_MS  = 7200000; // 2 hours between shows

    var _overlayEl   = null;
    var _selectedIdx = 0;
    var _showTimer   = null;

    // ── Persistence helpers ─────────────────────────────────────────────────
    function _load() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : {};
        } catch (e) { return {}; }
    }

    function _save(data) {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (e) {}
    }

    // ── DOM creation ────────────────────────────────────────────────────────
    function _createOverlay() {
        if (_overlayEl) return;
        var el = document.createElement('div');
        el.id = 'depositMatchOverlay';
        el.className = 'deposit-match-overlay';
        el.style.cssText = 'display:none;position:fixed;inset:0;z-index:20600;' +
            'background:rgba(0,0,0,0.82);align-items:center;justify-content:center;';
        el.setAttribute('role', 'dialog');
        el.setAttribute('aria-modal', 'true');

        var card = document.createElement('div');
        card.className = 'dm-card';
        card.style.cssText = 'background:linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%);' +
            'border:2px solid #fbbf24;border-radius:20px;padding:36px 40px;text-align:center;' +
            'max-width:420px;width:90%;box-shadow:0 0 60px rgba(251,191,36,0.25),0 20px 60px rgba(0,0,0,0.5);';

        // Close button
        var closeBtn = document.createElement('button');
        closeBtn.className = 'dm-close';
        closeBtn.style.cssText = 'position:absolute;top:12px;right:16px;background:none;border:none;' +
            'color:#aaa;font-size:22px;cursor:pointer;';
        closeBtn.textContent = '\u2715';
        closeBtn.addEventListener('click', function () {
            if (typeof window.dismissDepositMatch === 'function') window.dismissDepositMatch();
        });
        card.style.position = 'relative';
        card.appendChild(closeBtn);

        // Icon
        var icon = document.createElement('div');
        icon.style.cssText = 'font-size:42px;margin-bottom:8px;';
        icon.textContent = '\uD83D\uDCB0';
        card.appendChild(icon);

        // Title
        var title = document.createElement('div');
        title.className = 'dm-title';
        title.style.cssText = 'font-size:24px;font-weight:900;color:#fbbf24;margin-bottom:8px;' +
            'text-shadow:0 0 18px rgba(251,191,36,0.4);';
        title.textContent = 'Double Your Deposit';
        card.appendChild(title);

        // Subtitle
        var sub = document.createElement('div');
        sub.className = 'dm-sub';
        sub.style.cssText = 'font-size:15px;color:#ccc;margin-bottom:18px;line-height:1.4;';
        sub.textContent = 'Pick a tier and we match it dollar-for-dollar!';
        card.appendChild(sub);

        // Tier buttons container
        var tierWrap = document.createElement('div');
        tierWrap.className = 'dm-tiers';
        tierWrap.id = 'dmTierWrap';
        tierWrap.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-bottom:20px;';
        for (var i = 0; i < TIERS.length; i++) {
            var btn = document.createElement('button');
            btn.style.cssText = 'padding:10px 18px;border-radius:10px;font-size:14px;font-weight:700;' +
                'cursor:pointer;transition:all 0.15s;border:2px solid ' +
                (i === 0 ? '#fbbf24' : '#444') + ';background:' +
                (i === 0 ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.05)') + ';color:' +
                (i === 0 ? '#fbbf24' : '#ccc') + ';';
            btn.className = 'dm-tier-btn' + (i === 0 ? ' dm-tier-selected' : '');
            btn.setAttribute('data-idx', String(i));
            btn.textContent = '$' + TIERS[i].amount + ' \u2192 +$' + TIERS[i].match;
            btn.addEventListener('click', _onTierClick);
            tierWrap.appendChild(btn);
        }
        card.appendChild(tierWrap);

        // CTA
        var cta = document.createElement('button');
        cta.className = 'dm-cta';
        cta.style.cssText = 'background:linear-gradient(135deg,#fbbf24,#f59e0b);color:#000;' +
            'font-size:18px;font-weight:900;padding:14px 44px;border:none;border-radius:12px;' +
            'cursor:pointer;letter-spacing:1px;box-shadow:0 4px 20px rgba(251,191,36,0.35);' +
            'transition:transform 0.15s,box-shadow 0.15s;';
        cta.textContent = '\uD83C\uDFB0 Claim Match Bonus';
        cta.addEventListener('click', function () {
            if (typeof window.claimDepositMatch === 'function') window.claimDepositMatch();
        });
        card.appendChild(cta);

        // Dismiss link
        var dismiss = document.createElement('button');
        dismiss.className = 'dm-dismiss';
        dismiss.style.cssText = 'display:block;margin:14px auto 0;background:none;border:none;' +
            'color:#888;font-size:13px;cursor:pointer;text-decoration:underline;';
        dismiss.textContent = 'No thanks';
        dismiss.addEventListener('click', function () {
            if (typeof window.dismissDepositMatch === 'function') window.dismissDepositMatch();
        });
        card.appendChild(dismiss);

        el.appendChild(card);
        document.body.appendChild(el);
        _overlayEl = el;
    }

    function _onTierClick(e) {
        var idx = parseInt(e.currentTarget.getAttribute('data-idx'), 10);
        _selectedIdx = idx;
        var wrap = document.getElementById('dmTierWrap');
        if (!wrap) return;
        var btns = wrap.querySelectorAll('.dm-tier-btn');
        for (var i = 0; i < btns.length; i++) {
            var sel = (i === idx);
            btns[i].className = 'dm-tier-btn' + (sel ? ' dm-tier-selected' : '');
            btns[i].style.borderColor = sel ? '#fbbf24' : '#444';
            btns[i].style.background = sel ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.05)';
            btns[i].style.color = sel ? '#fbbf24' : '#ccc';
        }
    }

    // ── Show / hide ─────────────────────────────────────────────────────────
    function _show() {
        _createOverlay();
        _overlayEl.style.display = 'flex';
        var data = _load();
        data.sessionShows = (data.sessionShows || 0) + 1;
        data.lastShownAt = Date.now();
        _save(data);
    }

    window.dismissDepositMatch = function () {
        if (_overlayEl) {
            _overlayEl.style.opacity = '0';
            _overlayEl.style.transition = 'opacity 0.25s';
            setTimeout(function () {
                if (_overlayEl) { _overlayEl.style.display = 'none'; _overlayEl.style.opacity = ''; }
            }, 250);
        }
    };

    window.claimDepositMatch = function () {
        if (_overlayEl) _overlayEl.style.display = 'none';
        if (typeof openWalletModal === 'function') openWalletModal();
    };

    window._depositMatchMarkDeposited = function () {
        var data = _load();
        data.deposited = true;
        _save(data);
    };

    // ── Init ────────────────────────────────────────────────────────────────
    function _init() {
        // QA suppression
        try { if (new URLSearchParams(location.search).get('noBonus') === '1') return; } catch (e) {}

        var data = _load();
        // Permanently suppressed after deposit
        if (data.deposited) return;
        // Max shows per session
        if ((data.sessionShows || 0) >= MAX_SHOWS) return;
        // Cooldown check (2 hours)
        if (data.lastShownAt && (Date.now() - data.lastShownAt) < COOLDOWN_MS) return;
        // Only for logged-in users
        if (typeof currentUser === 'undefined' || !currentUser) return;

        _showTimer = setTimeout(function () {
            // Re-check conditions at display time
            if (typeof currentUser === 'undefined' || !currentUser) return;
            var d2 = _load();
            if (d2.deposited) return;
            if ((d2.sessionShows || 0) >= MAX_SHOWS) return;
            _show();
        }, DELAY_MS);
    }

    // ── Bootstrap ───────────────────────────────────────────────────────────
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _init);
    } else {
        _init();
    }
})();
