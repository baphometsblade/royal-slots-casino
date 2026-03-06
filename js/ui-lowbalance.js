// Low-balance deposit nudge — shows a sticky bottom banner when balance drops below threshold
(function () {
    'use strict';

    var THRESHOLD = 20;      // AUD — show nudge below this balance
    var COOLDOWN_MS = 300000; // 5 minutes between shows
    var _banner = null;
    var _shown = false;
    var _lastShown = 0;
    var _stylesInjected = false;

    function injectStyles() {
        if (_stylesInjected) return;
        _stylesInjected = true;
        var s = document.createElement('style');
        s.textContent = [
            '#lbNudge{position:fixed;bottom:0;left:0;right:0;z-index:9990;' +
                'background:linear-gradient(90deg,#7c3aed 0%,#4f46e5 100%);' +
                'color:#fff;display:flex;align-items:center;justify-content:center;' +
                'gap:14px;padding:10px 20px;font-family:inherit;font-size:14px;' +
                'font-weight:700;box-shadow:0 -4px 20px rgba(124,58,237,0.55);' +
                'transform:translateY(100%);transition:transform 0.4s cubic-bezier(0.34,1.56,0.64,1)}',
            '#lbNudge.active{transform:translateY(0)}',
            '#lbNudgeBtn{background:rgba(255,255,255,0.18);border:1.5px solid rgba(255,255,255,0.45);' +
                'border-radius:8px;color:#fff;padding:6px 18px;font-size:13px;font-weight:800;' +
                'cursor:pointer;white-space:nowrap;transition:background 0.15s,transform 0.1s;letter-spacing:0.5px}',
            '#lbNudgeBtn:hover{background:rgba(255,255,255,0.28);transform:scale(1.03)}',
            '#lbNudgeClose{background:none;border:none;color:rgba(255,255,255,0.55);' +
                'cursor:pointer;font-size:20px;line-height:1;padding:0 2px;margin-left:4px;' +
                'transition:color 0.15s}',
            '#lbNudgeClose:hover{color:rgba(255,255,255,0.9)}'
        ].join('\n');
        document.head.appendChild(s);
    }

    function buildBanner() {
        _banner = document.createElement('div');
        _banner.id = 'lbNudge';
        var msg = document.createElement('span');
        msg.textContent = '\uD83D\uDCB8 Balance running low \u2014 top up to keep playing!';
        var btn = document.createElement('button');
        btn.id = 'lbNudgeBtn';
        btn.textContent = 'DEPOSIT NOW';
        btn.addEventListener('click', function () {
            hideBanner();
            if (typeof showWalletModal === 'function') showWalletModal();
        });
        var close = document.createElement('button');
        close.id = 'lbNudgeClose';
        close.title = 'Dismiss';
        close.textContent = '\u00d7';
        close.addEventListener('click', function () {
            _lastShown = Date.now();
            hideBanner();
        });
        _banner.appendChild(msg);
        _banner.appendChild(btn);
        _banner.appendChild(close);
        document.body.appendChild(_banner);
    }

    function showBanner() {
        if (_shown) return;
        if (Date.now() - _lastShown < COOLDOWN_MS) return;
        _shown = true;
        injectStyles();
        buildBanner();
        // Double-RAF to allow CSS transition to fire
        requestAnimationFrame(function () {
            requestAnimationFrame(function () {
                if (_banner) _banner.classList.add('active');
            });
        });
    }

    function hideBanner() {
        if (!_shown || !_banner) return;
        _banner.classList.remove('active');
        var b = _banner;
        setTimeout(function () {
            if (b && b.parentNode) b.parentNode.removeChild(b);
            if (_banner === b) { _banner = null; _shown = false; }
        }, 450);
    }

    function onBalance(bal) {
        var n = parseFloat(bal);
        if (isNaN(n)) return;
        if (n < THRESHOLD && n >= 0) {
            showBanner();
        } else if (_shown) {
            hideBanner();
        }
    }

    function hookBalance() {
        var _orig = window.updateBalance;
        window.updateBalance = function (n) {
            if (_orig) _orig.apply(this, arguments);
            onBalance(n);
        };
    }

    function init() {
        hookBalance();
        // Check persisted balance at start
        try {
            var key = typeof STORAGE_KEY_BALANCE !== 'undefined' ? STORAGE_KEY_BALANCE : 'casinoBalance';
            var raw = localStorage.getItem(key);
            if (raw !== null) onBalance(parseFloat(raw));
        } catch (e) { /* storage unavailable */ }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        setTimeout(init, 0);
    }
}());
