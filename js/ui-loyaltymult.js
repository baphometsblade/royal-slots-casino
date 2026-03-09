/* ui-loyaltymult.js — Loyalty Multiplier Widget
 * Sprint 52: Bottom-left widget showing today's loyalty multiplier based on
 * consecutive login days. Exposes window._loyaltyMultiplier for other systems.
 * Dynamically creates its own DOM elements (no static HTML required).
 */
(function () {
    'use strict';

    var STORAGE_KEY = 'ms_loyaltyMult';
    var WIDGET_ID   = 'loyaltyMultBoost';

    // Multipliers by consecutive days (index = days - 1, capped at 7+)
    var DAY_MULTS = [
        { days: 7, mult: 3.0, label: '7+ Days' },
        { days: 5, mult: 2.0, label: '5 Days' },
        { days: 3, mult: 1.5, label: '3 Days' },
        { days: 2, mult: 1.2, label: '2 Days' },
        { days: 1, mult: 1.0, label: '1 Day'  }
    ];

    var _widgetEl = null;

    // ── Date helpers ─────────────────────────────────────────────────────────
    function _todayStr() {
        var d = new Date();
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }

    function _daysBetween(dateStrA, dateStrB) {
        var a = new Date(dateStrA);
        var b = new Date(dateStrB);
        return Math.round(Math.abs(b - a) / 86400000);
    }

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

    // ── Compute streak + multiplier ──────────────────────────────────────────
    function _computeStreak() {
        var data   = _load();
        var today  = _todayStr();
        var streak = data.streak || 1;
        var last   = data.lastLogin;

        if (!last) {
            // First recorded login
            streak = 1;
        } else if (last === today) {
            // Already logged today — keep streak as-is
            streak = data.streak || 1;
        } else {
            var gap = _daysBetween(last, today);
            if (gap === 1) {
                streak = (data.streak || 0) + 1;
            } else {
                streak = 1; // streak broken
            }
        }

        data.streak    = streak;
        data.lastLogin = today;
        _save(data);
        return streak;
    }

    function _getMultiplierForStreak(streak) {
        for (var i = 0; i < DAY_MULTS.length; i++) {
            if (streak >= DAY_MULTS[i].days) return DAY_MULTS[i];
        }
        return DAY_MULTS[DAY_MULTS.length - 1];
    }

    // ── DOM build ────────────────────────────────────────────────────────────
    function _build(streak, tier) {
        if (!document.getElementById('lmKeyframes')) {
            var style = document.createElement('style');
            style.id = 'lmKeyframes';
            style.textContent = [
                '@keyframes lmPulse{',
                '0%{box-shadow:0 0 0 0 rgba(123,47,247,0.7)}',
                '70%{box-shadow:0 0 0 10px rgba(123,47,247,0)}',
                '100%{box-shadow:0 0 0 0 rgba(123,47,247,0)}',
                '}',
                '@keyframes lmSlideIn{from{transform:translateX(-110%);opacity:0}',
                'to{transform:translateX(0);opacity:1}}'
            ].join('');
            document.head.appendChild(style);
        }

        var widget = document.createElement('div');
        widget.id = WIDGET_ID;
        widget.style.cssText = [
            'position:fixed', 'bottom:48px', 'left:14px',
            'z-index:10400',
            'background:linear-gradient(145deg,#0f0820,#1e0e40)',
            'border:1px solid rgba(123,47,247,0.5)',
            'border-radius:14px', 'padding:10px 14px',
            'display:flex', 'align-items:center', 'gap:10px',
            'box-shadow:0 4px 24px rgba(0,0,0,0.5)',
            'animation:lmSlideIn 0.5s cubic-bezier(0.34,1.56,0.64,1) both',
            'cursor:default'
        ].join(';');

        // Badge
        var badge = document.createElement('div');
        badge.style.cssText = [
            'background:linear-gradient(135deg,#7b2ff7,#f107a3)',
            'border-radius:50%', 'width:44px', 'height:44px',
            'display:flex', 'flex-direction:column',
            'align-items:center', 'justify-content:center',
            'flex-shrink:0',
            'animation:lmPulse 2s ease-in-out infinite'
        ].join(';');

        var multText = document.createElement('div');
        multText.textContent = tier.mult.toFixed(1) + '\u00D7'; // e.g. "3.0×"
        multText.style.cssText = 'font-size:15px;font-weight:900;color:#fff;line-height:1;';

        badge.appendChild(multText);

        // Info column
        var info = document.createElement('div');
        info.style.cssText = 'display:flex;flex-direction:column;gap:2px;';

        var title = document.createElement('div');
        title.textContent = 'Loyalty Boost';
        title.style.cssText = 'font-size:12px;font-weight:700;color:#fff;white-space:nowrap;';

        var sub = document.createElement('div');
        sub.textContent = '\uD83D\uDD25 ' + streak + ' day' + (streak !== 1 ? 's' : '') + ' streak';
        sub.style.cssText = 'font-size:11px;color:rgba(255,255,255,0.55);white-space:nowrap;';

        info.appendChild(title);
        info.appendChild(sub);

        // Dismiss
        var dismiss = document.createElement('button');
        dismiss.textContent = '\u00D7';
        dismiss.setAttribute('aria-label', 'Dismiss loyalty widget');
        dismiss.style.cssText = [
            'background:transparent', 'border:none',
            'color:rgba(255,255,255,0.3)', 'font-size:14px',
            'cursor:pointer', 'padding:0', 'line-height:1',
            'flex-shrink:0'
        ].join(';');
        dismiss.addEventListener('click', function () {
            window.dismissLoyaltyMult();
        });

        widget.appendChild(badge);
        widget.appendChild(info);
        widget.appendChild(dismiss);

        return widget;
    }

    // ── Public API ───────────────────────────────────────────────────────────
    window.dismissLoyaltyMult = function () {
        if (!_widgetEl) return;
        _widgetEl.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
        _widgetEl.style.transform  = 'translateX(-110%)';
        _widgetEl.style.opacity    = '0';
        var el = _widgetEl;
        setTimeout(function () {
            if (el.parentNode) el.parentNode.removeChild(el);
        }, 340);
        _widgetEl = null;
    };

    // ── Init ─────────────────────────────────────────────────────────────────
    function _init() {
        if (new URLSearchParams(window.location.search).get('noBonus') === '1') return;

        var streak = _computeStreak();
        var tier   = _getMultiplierForStreak(streak);

        // Expose global multiplier for spin engine / other systems
        window._loyaltyMultiplier = tier.mult;

        // Build and show widget after short delay
        setTimeout(function () {
            _widgetEl = _build(streak, tier);
            document.body.appendChild(_widgetEl);
        }, 2000);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _init);
    } else {
        _init();
    }

})();
