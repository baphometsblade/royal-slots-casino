/* ui-comebackreward.js — Comeback Reward Modal
 * Sprint 52: Detects player absence and awards tiered bonus credits on return.
 * 24h absence = $5, 48h = $10, 72h = $25.
 * Dynamically creates its own DOM elements (no static HTML required).
 */
(function () {
    'use strict';

    var STORAGE_KEY  = 'ms_comebackReward';
    var VISIT_KEY    = 'ms_lastVisit';
    var MODAL_ID     = 'comebackReward';

    var TIERS = [
        { hours: 72, bonus: 25, label: 'over 3 days' },
        { hours: 48, bonus: 10, label: 'over 2 days' },
        { hours: 24, bonus: 5,  label: 'over 24 hours' }
    ];
    var COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24h until next trigger

    var _modalEl = null;

    // ── Persistence helpers ──────────────────────────────────────────────────
    function _load() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : {};
        } catch (e) { return {}; }
    }

    function _save(data) {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (e) {}
    }

    function _loadVisit() {
        try {
            var raw = localStorage.getItem(VISIT_KEY);
            return raw ? parseInt(raw, 10) : 0;
        } catch (e) { return 0; }
    }

    function _saveVisit(ts) {
        try { localStorage.setItem(VISIT_KEY, String(ts)); } catch (e) {}
    }

    // ── Utility: format hours away ───────────────────────────────────────────
    function _formatAbsence(ms) {
        var h = Math.floor(ms / 3600000);
        var d = Math.floor(h / 24);
        if (d >= 1) return d + (d === 1 ? ' day' : ' days');
        return h + ' hour' + (h !== 1 ? 's' : '');
    }

    // ── Award bonus ──────────────────────────────────────────────────────────
    function _awardBonus(amount) {
        if (typeof window.balance === 'number') {
            window.balance += amount;
            if (typeof window.updateBalanceDisplay === 'function') {
                window.updateBalanceDisplay();
            }
        }
    }

    // ── DOM build ────────────────────────────────────────────────────────────
    function _build(tier, absenceMs) {
        // Backdrop
        var backdrop = document.createElement('div');
        backdrop.id = MODAL_ID;
        backdrop.style.cssText = [
            'position:fixed', 'inset:0',
            'z-index:99200',
            'background:rgba(0,0,0,0.72)',
            'display:flex', 'align-items:center', 'justify-content:center',
            'opacity:0', 'transition:opacity 0.35s ease'
        ].join(';');

        // Panel
        var panel = document.createElement('div');
        panel.style.cssText = [
            'background:linear-gradient(160deg,#0f0c29,#302b63,#24243e)',
            'border:1px solid rgba(123,47,247,0.4)',
            'border-radius:20px', 'padding:36px 40px',
            'max-width:380px', 'width:90%',
            'text-align:center',
            'box-shadow:0 8px 60px rgba(123,47,247,0.35)',
            'transform:translateY(20px)',
            'transition:transform 0.35s ease'
        ].join(';');

        // Wave emoji
        var wave = document.createElement('div');
        wave.textContent = '\uD83D\uDC4B'; // 👋
        wave.style.cssText = 'font-size:56px;line-height:1;margin-bottom:12px;';

        // Title
        var title = document.createElement('div');
        title.textContent = 'Welcome Back!';
        title.style.cssText = [
            'font-size:28px', 'font-weight:800',
            'color:#fff', 'margin-bottom:8px',
            'text-shadow:0 0 20px rgba(123,47,247,0.6)'
        ].join(';');

        // Sub
        var sub = document.createElement('div');
        sub.textContent = 'You were away for ' + _formatAbsence(absenceMs) + '.';
        sub.style.cssText = 'font-size:15px;color:rgba(255,255,255,0.65);margin-bottom:24px;';

        // Bonus card
        var card = document.createElement('div');
        card.style.cssText = [
            'background:linear-gradient(135deg,#7b2ff7,#f107a3)',
            'border-radius:14px', 'padding:22px',
            'margin-bottom:24px',
            'box-shadow:0 4px 24px rgba(241,7,163,0.4)'
        ].join(';');

        var bonusLabel = document.createElement('div');
        bonusLabel.textContent = 'Comeback Bonus';
        bonusLabel.style.cssText = 'color:rgba(255,255,255,0.8);font-size:13px;margin-bottom:6px;';

        var bonusAmount = document.createElement('div');
        bonusAmount.textContent = '$' + tier.bonus + '.00';
        bonusAmount.style.cssText = [
            'font-size:44px', 'font-weight:900', 'color:#fff',
            'line-height:1', 'text-shadow:0 2px 12px rgba(0,0,0,0.3)'
        ].join(';');

        card.appendChild(bonusLabel);
        card.appendChild(bonusAmount);

        // Claim button
        var claimBtn = document.createElement('button');
        claimBtn.textContent = 'Claim Bonus';
        claimBtn.style.cssText = [
            'width:100%', 'padding:14px',
            'background:linear-gradient(90deg,#7b2ff7,#f107a3)',
            'color:#fff', 'border:none', 'border-radius:12px',
            'font-size:16px', 'font-weight:700',
            'cursor:pointer', 'margin-bottom:12px',
            'transition:transform 0.15s, box-shadow 0.15s',
            'box-shadow:0 4px 20px rgba(123,47,247,0.5)'
        ].join(';');
        claimBtn.addEventListener('mouseover', function () {
            claimBtn.style.transform = 'scale(1.03)';
        });
        claimBtn.addEventListener('mouseout', function () {
            claimBtn.style.transform = 'scale(1)';
        });
        claimBtn.addEventListener('click', function () {
            _awardBonus(tier.bonus);
            window.dismissComebackReward();
        });

        // Dismiss link
        var skipLink = document.createElement('button');
        skipLink.textContent = 'No thanks';
        skipLink.style.cssText = [
            'background:transparent', 'border:none',
            'color:rgba(255,255,255,0.35)', 'font-size:13px',
            'cursor:pointer', 'padding:0'
        ].join(';');
        skipLink.addEventListener('click', function () {
            window.dismissComebackReward();
        });

        panel.appendChild(wave);
        panel.appendChild(title);
        panel.appendChild(sub);
        panel.appendChild(card);
        panel.appendChild(claimBtn);
        panel.appendChild(skipLink);
        backdrop.appendChild(panel);

        backdrop.addEventListener('click', function (ev) {
            if (ev.target === backdrop) window.dismissComebackReward();
        });

        // Animate in
        requestAnimationFrame(function () {
            backdrop.style.opacity = '1';
            panel.style.transform  = 'translateY(0)';
        });

        return backdrop;
    }

    // ── Public API ───────────────────────────────────────────────────────────
    window.dismissComebackReward = function () {
        if (!_modalEl) return;
        var el = _modalEl;
        el.style.opacity = '0';
        setTimeout(function () {
            if (el.parentNode) el.parentNode.removeChild(el);
        }, 380);
        _modalEl = null;
    };

    // ── Init ─────────────────────────────────────────────────────────────────
    function _init() {
        if (new URLSearchParams(window.location.search).get('noBonus') === '1') return;

        var now       = Date.now();
        var lastVisit = _loadVisit();

        // Always update last visit timestamp
        _saveVisit(now);

        if (!lastVisit) return; // first ever visit — no absence to measure

        var absenceMs = now - lastVisit;
        var data      = _load();

        // Check cooldown on next trigger
        if (data.nextTriggerAfter && now < data.nextTriggerAfter) return;

        // Find tier
        var matched = null;
        for (var i = 0; i < TIERS.length; i++) {
            if (absenceMs >= TIERS[i].hours * 3600000) {
                matched = TIERS[i];
                break;
            }
        }
        if (!matched) return;

        // Set cooldown
        data.nextTriggerAfter = now + COOLDOWN_MS;
        _save(data);

        setTimeout(function () {
            _modalEl = _build(matched, absenceMs);
            document.body.appendChild(_modalEl);
        }, 1500);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _init);
    } else {
        _init();
    }

})();
