/* ui-reloadbonuspop.js — Reload Bonus Popup
 * Sprint 55: Full-screen overlay when balance drops below $50, 24h cooldown.
 * Dynamically creates its own DOM elements (no static HTML required).
 */
(function () {
    'use strict';

    var STORAGE_KEY = 'ms_reloadBonusPop';
    var BALANCE_THRESHOLD = 50;
    var CHECK_INTERVAL_MS = 60000;
    var COOLDOWN_MS = 24 * 60 * 60 * 1000;
    var Z_INDEX = 99200;
    var _el = null;
    var _checkTimer = null;
    var _triggered = false;

    function _loadTs() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            return raw ? parseInt(raw, 10) : 0;
        } catch (e) {
            return 0;
        }
    }

    function _saveTs() {
        try {
            localStorage.setItem(STORAGE_KEY, String(Date.now()));
        } catch (e) {}
    }

    function _canShow() {
        var last = _loadTs();
        return (Date.now() - last) >= COOLDOWN_MS;
    }

    function _build() {
        var overlay = document.createElement('div');
        overlay.id = 'reloadBonusPop';
        overlay.style.cssText = [
            'position:fixed',
            'inset:0',
            'background:rgba(5,10,30,0.92)',
            'z-index:' + Z_INDEX,
            'display:flex',
            'align-items:center',
            'justify-content:center',
            'opacity:0',
            'transition:opacity 0.35s ease',
            'font-family:inherit',
        ].join(';');

        var box = document.createElement('div');
        box.style.cssText = [
            'background:linear-gradient(135deg,#1a0a00,#2d1500)',
            'border:2px solid transparent',
            'border-image:linear-gradient(135deg,#f39c12,#e74c3c) 1',
            'border-radius:16px',
            'padding:40px 44px',
            'max-width:460px',
            'width:90%',
            'text-align:center',
            'position:relative',
            'box-shadow:0 16px 64px rgba(243,156,18,0.35)',
        ].join(';');

        var closeBtn = document.createElement('button');
        closeBtn.textContent = '\u00d7';
        closeBtn.style.cssText = [
            'position:absolute',
            'top:12px',
            'right:16px',
            'background:none',
            'border:none',
            'color:rgba(255,255,255,0.5)',
            'font-size:24px',
            'cursor:pointer',
            'line-height:1',
        ].join(';');
        closeBtn.addEventListener('click', function () {
            window.dismissReloadBonusPop();
        });

        var icon = document.createElement('div');
        icon.textContent = '\ud83d\udcb8';
        icon.style.cssText = 'font-size:52px;margin-bottom:12px;';

        var heading = document.createElement('h2');
        heading.textContent = 'Low Balance? Get a 50% Reload Bonus!';
        heading.style.cssText = [
            'color:#f39c12',
            'font-size:22px',
            'font-weight:800',
            'margin:0 0 10px',
            'line-height:1.3',
        ].join(';');

        var sub = document.createElement('p');
        sub.textContent = 'Deposit $20+ and get 50% extra!';
        sub.style.cssText = 'color:#e8d5b0;font-size:15px;margin:0 0 28px;line-height:1.5;';

        var ctaBtn = document.createElement('button');
        ctaBtn.textContent = 'Claim Reload Bonus';
        ctaBtn.style.cssText = [
            'background:linear-gradient(135deg,#f39c12,#e74c3c)',
            'color:#fff',
            'border:none',
            'border-radius:8px',
            'padding:14px 32px',
            'font-size:16px',
            'font-weight:700',
            'cursor:pointer',
            'width:100%',
            'transition:opacity 0.2s',
        ].join(';');
        ctaBtn.addEventListener('mouseover', function () { ctaBtn.style.opacity = '0.85'; });
        ctaBtn.addEventListener('mouseout', function () { ctaBtn.style.opacity = '1'; });
        ctaBtn.addEventListener('click', function () {
            window.dismissReloadBonusPop();
            if (typeof window.openWalletModal === 'function') {
                window.openWalletModal();
            }
        });

        var noThanks = document.createElement('button');
        noThanks.textContent = 'No thanks';
        noThanks.style.cssText = [
            'background:none',
            'border:none',
            'color:rgba(255,255,255,0.4)',
            'font-size:13px',
            'cursor:pointer',
            'margin-top:14px',
            'display:block',
            'width:100%',
        ].join(';');
        noThanks.addEventListener('click', function () {
            window.dismissReloadBonusPop();
        });

        box.appendChild(closeBtn);
        box.appendChild(icon);
        box.appendChild(heading);
        box.appendChild(sub);
        box.appendChild(ctaBtn);
        box.appendChild(noThanks);
        overlay.appendChild(box);

        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) window.dismissReloadBonusPop();
        });

        document.body.appendChild(overlay);
        _el = overlay;
    }

    function _show() {
        if (!_el) _build();
        _saveTs();
        _triggered = true;
        requestAnimationFrame(function () {
            _el.style.display = 'flex';
            requestAnimationFrame(function () {
                _el.style.opacity = '1';
            });
        });
    }

    function _check() {
        if (_triggered) return;
        if (!_canShow()) return;
        var bal = typeof window.balance === 'number' ? window.balance : NaN;
        if (!isNaN(bal) && bal < BALANCE_THRESHOLD) {
            _show();
        }
    }

    function _init() {
        if (new URLSearchParams(window.location.search).get('noBonus') === '1') return;
        _build();
        _el.style.display = 'none';
        _check();
        _checkTimer = setInterval(_check, CHECK_INTERVAL_MS);
    }

    window.dismissReloadBonusPop = function () {
        if (_el) {
            _el.style.opacity = '0';
            setTimeout(function () {
                if (_el) _el.style.display = 'none';
            }, 350);
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _init);
    } else {
        _init();
    }
})();
