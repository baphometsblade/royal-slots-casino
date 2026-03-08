(function () {
    'use strict';

    /* ── Sprint 43 \u2014 Spin Multiplier Event ────────────────────────────── */

    var STORAGE_KEY = 'ms_spinMultData';
    var BANNER_ID   = 'spinMultiplierBanner';
    var DURATION_MS = 10000;
    var TRIGGER_CHANCE = 0.05;

    /* Multiplier tier roll: 2x 70%, 3x 25%, 5x 5% */
    var TIERS = [
        { mult: 2, weight: 70, cls: 's43-mult-2x', label: '2\u00D7' },
        { mult: 3, weight: 25, cls: 's43-mult-3x', label: '3\u00D7' },
        { mult: 5, weight: 5,  cls: 's43-mult-5x', label: '5\u00D7' }
    ];

    var _bannerEl  = null;
    var _timer     = null;
    var _labelEl   = null;
    var _barEl     = null;
    var _startTime = 0;
    var _rafId     = null;

    window._activeSpinMultiplier = null;

    /* ── helpers ──────────────────────────────────────────────────────── */

    function _pickTier() {
        var roll = Math.random() * 100;
        var cum = 0;
        for (var i = 0; i < TIERS.length; i++) {
            cum += TIERS[i].weight;
            if (roll < cum) return TIERS[i];
        }
        return TIERS[0];
    }

    function _save(obj) {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(obj)); } catch (e) { /* noop */ }
    }

    function _load() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch (e) { return null; }
    }

    /* ── DOM ──────────────────────────────────────────────────────────── */

    function _ensureBanner() {
        if (_bannerEl) return;

        _bannerEl = document.createElement('div');
        _bannerEl.id = BANNER_ID;
        _bannerEl.style.cssText = 'position:fixed;top:60px;left:50%;transform:translateX(-50%);' +
            'z-index:10200;background:linear-gradient(135deg,#1a0a2e,#2d1b69);border:2px solid #ffd700;' +
            'border-radius:12px;padding:12px 24px;display:none;flex-direction:column;align-items:center;' +
            'gap:6px;box-shadow:0 0 30px rgba(255,215,0,0.4);min-width:220px;';

        var title = document.createElement('div');
        title.style.cssText = 'color:#ffd700;font-weight:bold;font-size:13px;letter-spacing:1px;';
        title.textContent = '\u26A1 SPIN MULTIPLIER ACTIVE';
        _bannerEl.appendChild(title);

        _labelEl = document.createElement('div');
        _labelEl.style.cssText = 'color:#fff;font-size:28px;font-weight:bold;text-shadow:0 0 12px rgba(255,215,0,0.6);';
        _bannerEl.appendChild(_labelEl);

        var barWrap = document.createElement('div');
        barWrap.style.cssText = 'width:100%;height:4px;background:rgba(255,255,255,0.15);border-radius:2px;overflow:hidden;';
        _barEl = document.createElement('div');
        _barEl.style.cssText = 'height:100%;width:100%;background:#ffd700;border-radius:2px;transition:width 0.3s linear;';
        barWrap.appendChild(_barEl);
        _bannerEl.appendChild(barWrap);

        var dismissBtn = document.createElement('button');
        dismissBtn.style.cssText = 'position:absolute;top:4px;right:8px;background:none;border:none;' +
            'color:#ffd700;font-size:16px;cursor:pointer;padding:2px 6px;';
        dismissBtn.textContent = '\u2715';
        dismissBtn.addEventListener('click', function () { window.dismissSpinMultiplier(); });
        _bannerEl.appendChild(dismissBtn);

        document.body.appendChild(_bannerEl);
    }

    /* ── countdown bar ───────────────────────────────────────────────── */

    function _tickBar() {
        var elapsed = Date.now() - _startTime;
        var pct = Math.max(0, 1 - elapsed / DURATION_MS) * 100;
        if (_barEl) _barEl.style.width = pct + '%';
        if (pct > 0) {
            _rafId = requestAnimationFrame(_tickBar);
        }
    }

    /* ── activate / dismiss ──────────────────────────────────────────── */

    function _activate(tier) {
        _ensureBanner();
        window._activeSpinMultiplier = tier.mult;

        /* Remove old tier classes */
        TIERS.forEach(function (t) { _bannerEl.classList.remove(t.cls); });
        _bannerEl.classList.add(tier.cls);
        _labelEl.textContent = tier.label + ' MULTIPLIER';
        _bannerEl.style.display = 'flex';
        _startTime = Date.now();

        if (_barEl) _barEl.style.width = '100%';
        if (_rafId) cancelAnimationFrame(_rafId);
        _rafId = requestAnimationFrame(_tickBar);

        _save({ mult: tier.mult, cls: tier.cls, label: tier.label, expiresAt: _startTime + DURATION_MS });

        clearTimeout(_timer);
        _timer = setTimeout(function () { window.dismissSpinMultiplier(); }, DURATION_MS);
    }

    function _dismiss() {
        window._activeSpinMultiplier = null;
        if (_bannerEl) {
            _bannerEl.style.display = 'none';
            TIERS.forEach(function (t) { _bannerEl.classList.remove(t.cls); });
        }
        clearTimeout(_timer);
        if (_rafId) cancelAnimationFrame(_rafId);
        _rafId = null;
        try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* noop */ }
    }

    /* ── public API ──────────────────────────────────────────────────── */

    window._spinMultiplierCheck = function () {
        if (window._activeSpinMultiplier) return;
        if (Math.random() < TRIGGER_CHANCE) {
            _activate(_pickTier());
        }
    };

    window.dismissSpinMultiplier = function () {
        _dismiss();
    };

    /* ── restore persisted state ─────────────────────────────────────── */

    function _restore() {
        var data = _load();
        if (!data || !data.expiresAt) return;
        var remaining = data.expiresAt - Date.now();
        if (remaining <= 0) {
            try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* noop */ }
            return;
        }
        var tier = null;
        for (var i = 0; i < TIERS.length; i++) {
            if (TIERS[i].mult === data.mult) { tier = TIERS[i]; break; }
        }
        if (!tier) return;

        _ensureBanner();
        window._activeSpinMultiplier = tier.mult;
        TIERS.forEach(function (t) { _bannerEl.classList.remove(t.cls); });
        _bannerEl.classList.add(tier.cls);
        _labelEl.textContent = tier.label + ' MULTIPLIER';
        _bannerEl.style.display = 'flex';
        _startTime = data.expiresAt - DURATION_MS;

        if (_rafId) cancelAnimationFrame(_rafId);
        _rafId = requestAnimationFrame(_tickBar);

        clearTimeout(_timer);
        _timer = setTimeout(function () { window.dismissSpinMultiplier(); }, remaining);
    }

    /* ── init ─────────────────────────────────────────────────────────── */

    function _init() {
        if (new URLSearchParams(window.location.search).get('noBonus') === '1') return;
        _ensureBanner();
        _restore();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { setTimeout(_init, 600); });
    } else {
        setTimeout(_init, 600);
    }

})();
