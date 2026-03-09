/* ui-depositboost.js — Deposit Boost Banner
 * Sprint 51: Fixed top banner showing 100% deposit match offer with 4-hour refresh.
 * Dynamically creates its own DOM elements (no static HTML required).
 */
(function () {
    'use strict';

    var STORAGE_KEY  = 'ms_depositBoost';
    var WINDOW_MS    = 4 * 60 * 60 * 1000; // 4 hours
    var BANNER_ID    = 'depositBoostBanner';

    var _bannerEl = null;

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

    // ── Window helpers ───────────────────────────────────────────────────────
    function _getWindowStart() {
        var now = Date.now();
        return Math.floor(now / WINDOW_MS) * WINDOW_MS;
    }

    function _isDismissedThisWindow(data) {
        return data.dismissedWindow === _getWindowStart();
    }

    // ── Toast fallback ───────────────────────────────────────────────────────
    function _showToast(msg) {
        var t = document.createElement('div');
        t.textContent = msg;
        t.style.cssText = [
            'position:fixed', 'bottom:80px', 'left:50%', 'transform:translateX(-50%)',
            'background:#1a1a2e', 'color:#fff', 'padding:10px 20px',
            'border-radius:8px', 'z-index:10400', 'font-size:14px',
            'pointer-events:none', 'opacity:0',
            'transition:opacity 0.3s ease'
        ].join(';');
        document.body.appendChild(t);
        requestAnimationFrame(function () {
            t.style.opacity = '1';
            setTimeout(function () {
                t.style.opacity = '0';
                setTimeout(function () {
                    if (t.parentNode) t.parentNode.removeChild(t);
                }, 350);
            }, 2500);
        });
    }

    // ── DOM build ────────────────────────────────────────────────────────────
    function _build() {
        var banner = document.createElement('div');
        banner.id = BANNER_ID;
        banner.style.cssText = [
            'position:fixed', 'top:0', 'left:0', 'right:0',
            'z-index:10400',
            'background:linear-gradient(90deg,#7b2ff7,#f107a3)',
            'color:#fff', 'display:flex', 'align-items:center',
            'justify-content:center', 'gap:14px',
            'padding:9px 16px', 'font-size:14px', 'font-weight:600',
            'box-shadow:0 2px 12px rgba(123,47,247,0.55)',
            'transform:translateY(-100%)',
            'transition:transform 0.4s cubic-bezier(0.34,1.56,0.64,1)'
        ].join(';');

        // Icon
        var icon = document.createElement('span');
        icon.textContent = '\uD83D\uDCB0'; // 💰
        icon.style.fontSize = '18px';

        // Label
        var label = document.createElement('span');
        label.textContent = '100% Deposit Match — Limited Time Offer!';

        // CTA button
        var cta = document.createElement('button');
        cta.textContent = 'Claim Now';
        cta.style.cssText = [
            'background:#fff', 'color:#7b2ff7',
            'border:none', 'border-radius:20px',
            'padding:5px 16px', 'font-size:13px', 'font-weight:700',
            'cursor:pointer', 'white-space:nowrap',
            'transition:transform 0.15s'
        ].join(';');
        cta.addEventListener('mouseover', function () { cta.style.transform = 'scale(1.05)'; });
        cta.addEventListener('mouseout',  function () { cta.style.transform = 'scale(1)'; });
        cta.addEventListener('click', function () {
            if (typeof openWalletModal === 'function') {
                openWalletModal();
            } else {
                _showToast('Opening wallet\u2026');
            }
        });

        // Dismiss button
        var dismiss = document.createElement('button');
        dismiss.textContent = '\u00D7'; // ×
        dismiss.setAttribute('aria-label', 'Dismiss deposit boost');
        dismiss.style.cssText = [
            'background:transparent', 'border:none', 'color:#fff',
            'font-size:20px', 'line-height:1', 'cursor:pointer',
            'padding:0 4px', 'opacity:0.8',
            'margin-left:6px'
        ].join(';');
        dismiss.addEventListener('click', function () {
            window.dismissDepositBoost();
        });

        banner.appendChild(icon);
        banner.appendChild(label);
        banner.appendChild(cta);
        banner.appendChild(dismiss);
        return banner;
    }

    // ── Show / hide ──────────────────────────────────────────────────────────
    function _show() {
        if (_bannerEl) return;
        _bannerEl = _build();
        document.body.insertBefore(_bannerEl, document.body.firstChild);
        // Push body down so content isn't hidden under banner
        requestAnimationFrame(function () {
            _bannerEl.style.transform = 'translateY(0)';
        });
    }

    function _hide() {
        if (!_bannerEl) return;
        _bannerEl.style.transform = 'translateY(-100%)';
        var el = _bannerEl;
        setTimeout(function () {
            if (el.parentNode) el.parentNode.removeChild(el);
        }, 450);
        _bannerEl = null;
    }

    // ── Public API ───────────────────────────────────────────────────────────
    window.dismissDepositBoost = function () {
        var data = _load();
        data.dismissedWindow = _getWindowStart();
        _save(data);
        _hide();
    };

    // ── Init ─────────────────────────────────────────────────────────────────
    function _init() {
        if (new URLSearchParams(window.location.search).get('noBonus') === '1') return;

        var data = _load();
        if (_isDismissedThisWindow(data)) return;

        // Short delay so page layout settles
        setTimeout(_show, 1200);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _init);
    } else {
        _init();
    }

})();
