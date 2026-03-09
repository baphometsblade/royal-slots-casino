/* ui-hotstreakbonus.js — Hot Streak Bonus Overlay
 * Sprint 51: Tracks consecutive wins; at 5 in a row shows full-screen overlay
 * awarding a 1.5x multiplier for the next spin.
 * Dynamically creates its own DOM elements (no static HTML required).
 */
(function () {
    'use strict';

    var STORAGE_KEY       = 'ms_hotStreak';
    var STREAK_TRIGGER    = 5;
    var MULTIPLIER        = 1.5;
    var AUTO_DISMISS_MS   = 8000;
    var OVERLAY_ID        = 'hotStreakBonus';

    var _overlayEl  = null;
    var _streak     = 0;
    var _dismissTimer = null;

    // ── Global multiplier readable by spin engine ────────────────────────────
    window._hotStreakMultiplier = 1;

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

    // ── DOM build ────────────────────────────────────────────────────────────
    function _build() {
        var overlay = document.createElement('div');
        overlay.id = OVERLAY_ID;
        overlay.style.cssText = [
            'position:fixed', 'inset:0',
            'z-index:99500',
            'display:flex', 'flex-direction:column',
            'align-items:center', 'justify-content:center',
            'background:rgba(10,5,20,0.88)',
            'backdrop-filter:blur(4px)',
            'opacity:0', 'transition:opacity 0.4s ease',
            'cursor:pointer'
        ].join(';');

        // Fire icon row
        var fireRow = document.createElement('div');
        fireRow.style.cssText = 'font-size:64px;line-height:1;margin-bottom:12px;';
        fireRow.textContent = '\uD83D\uDD25\uD83D\uDD25\uD83D\uDD25'; // 🔥🔥🔥

        // Title
        var title = document.createElement('div');
        title.textContent = 'HOT STREAK!';
        title.style.cssText = [
            'font-size:52px', 'font-weight:900', 'letter-spacing:4px',
            'color:#ff6a00',
            'text-shadow:0 0 30px rgba(255,106,0,0.9),0 0 60px rgba(255,106,0,0.5)',
            'margin-bottom:12px'
        ].join(';');

        // Sub
        var sub = document.createElement('div');
        sub.textContent = '5 Wins In A Row \u2014 Next Spin Gets 1.5\u00D7 Multiplier!';
        sub.style.cssText = [
            'font-size:20px', 'color:#fff',
            'margin-bottom:32px', 'text-align:center',
            'max-width:420px', 'line-height:1.4'
        ].join(';');

        // Badge
        var badge = document.createElement('div');
        badge.style.cssText = [
            'background:linear-gradient(135deg,#ff6a00,#ee0979)',
            'color:#fff', 'border-radius:50%',
            'width:120px', 'height:120px',
            'display:flex', 'flex-direction:column',
            'align-items:center', 'justify-content:center',
            'font-size:14px', 'font-weight:700',
            'box-shadow:0 0 40px rgba(238,9,121,0.7)',
            'margin-bottom:28px',
            'animation:hsbPulse 0.8s ease-in-out infinite alternate'
        ].join(';');
        var badgeMult = document.createElement('div');
        badgeMult.textContent = '1.5\u00D7';
        badgeMult.style.cssText = 'font-size:38px;font-weight:900;line-height:1;';
        var badgeLbl = document.createElement('div');
        badgeLbl.textContent = 'BONUS';
        badge.appendChild(badgeMult);
        badge.appendChild(badgeLbl);

        // Dismiss hint
        var hint = document.createElement('div');
        hint.textContent = 'Tap anywhere to continue \u2014 multiplier saved';
        hint.style.cssText = 'color:rgba(255,255,255,0.5);font-size:13px;';

        // Keyframe injection (once)
        if (!document.getElementById('hsbKeyframes')) {
            var style = document.createElement('style');
            style.id = 'hsbKeyframes';
            style.textContent = '@keyframes hsbPulse{from{transform:scale(1)}to{transform:scale(1.08)}}';
            document.head.appendChild(style);
        }

        overlay.appendChild(fireRow);
        overlay.appendChild(title);
        overlay.appendChild(sub);
        overlay.appendChild(badge);
        overlay.appendChild(hint);

        overlay.addEventListener('click', function () {
            window.dismissHotStreakBonus();
        });

        return overlay;
    }

    // ── Show overlay ─────────────────────────────────────────────────────────
    function _showOverlay() {
        if (_overlayEl) return;

        // Store multiplier
        window._hotStreakMultiplier = MULTIPLIER;
        var data = _load();
        data.pendingMultiplier = MULTIPLIER;
        _save(data);

        _overlayEl = _build();
        document.body.appendChild(_overlayEl);
        requestAnimationFrame(function () {
            _overlayEl.style.opacity = '1';
        });

        _dismissTimer = setTimeout(function () {
            window.dismissHotStreakBonus();
        }, AUTO_DISMISS_MS);
    }

    // ── Hide overlay ─────────────────────────────────────────────────────────
    function _hideOverlay() {
        if (!_overlayEl) return;
        if (_dismissTimer) { clearTimeout(_dismissTimer); _dismissTimer = null; }
        var el = _overlayEl;
        el.style.opacity = '0';
        setTimeout(function () {
            if (el.parentNode) el.parentNode.removeChild(el);
        }, 400);
        _overlayEl = null;
    }

    // ── Public API ───────────────────────────────────────────────────────────
    window.dismissHotStreakBonus = function () {
        _hideOverlay();
    };

    // ── Spin event listener ──────────────────────────────────────────────────
    document.addEventListener('spinComplete', function (e) {
        if (new URLSearchParams(window.location.search).get('noBonus') === '1') return;

        var detail = (e && e.detail) ? e.detail : {};
        var won = (typeof detail.win === 'number' && detail.win > 0) ||
                  (typeof detail.payout === 'number' && detail.payout > 0) ||
                  (detail.state && typeof detail.state.win === 'number' && detail.state.win > 0);

        if (won) {
            // Consume pending multiplier after one win
            if (window._hotStreakMultiplier > 1) {
                window._hotStreakMultiplier = 1;
                var data = _load();
                data.pendingMultiplier = 1;
                _save(data);
            }
            _streak += 1;
            if (_streak >= STREAK_TRIGGER) {
                _streak = 0;
                _showOverlay();
            }
        } else {
            // Loss resets streak
            _streak = 0;
            window._hotStreakMultiplier = 1;
            var data2 = _load();
            data2.pendingMultiplier = 1;
            _save(data2);
        }
    });

    // ── Init ─────────────────────────────────────────────────────────────────
    function _init() {
        if (new URLSearchParams(window.location.search).get('noBonus') === '1') return;
        // Restore pending multiplier across page loads
        var data = _load();
        if (data.pendingMultiplier && data.pendingMultiplier > 1) {
            window._hotStreakMultiplier = data.pendingMultiplier;
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _init);
    } else {
        _init();
    }

})();
