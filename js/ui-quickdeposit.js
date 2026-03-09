(function(){
    'use strict';

    var ELEMENT_ID = 'quickDepositBanner';
    var Z_INDEX = 10400;
    var STORAGE_KEY = 'ms_quickDeposit';
    var DISMISS_DURATION_MS = 30 * 60 * 1000;

    function isDismissed() {
        try {
            var ts = localStorage.getItem(STORAGE_KEY);
            if (!ts) return false;
            var dismissedAt = parseInt(ts, 10);
            if (isNaN(dismissedAt)) return false;
            return (Date.now() - dismissedAt) < DISMISS_DURATION_MS;
        } catch(e) { return false; }
    }

    function setDismissed() {
        try { localStorage.setItem(STORAGE_KEY, String(Date.now())); } catch(e) {}
    }

    function showToast(msg) {
        var toast = document.createElement('div');
        toast.style.cssText = 'position:fixed;bottom:50px;left:50%;transform:translateX(-50%);' +
            'background:rgba(22,33,62,0.95);color:#ffd700;padding:8px 18px;border-radius:8px;' +
            'font-size:12px;font-weight:600;z-index:' + (Z_INDEX + 10) + ';' +
            'border:1px solid rgba(255,215,0,0.3);box-shadow:0 4px 12px rgba(0,0,0,0.5);' +
            'transition:opacity 0.4s ease;font-family:inherit;';
        toast.textContent = msg;
        document.body.appendChild(toast);
        setTimeout(function() {
            toast.style.opacity = '0';
            setTimeout(function() {
                if (toast.parentNode) toast.parentNode.removeChild(toast);
            }, 400);
        }, 2000);
    }

    function init() {
        if (document.getElementById(ELEMENT_ID)) return;
        if (isDismissed()) return;

        var banner = document.createElement('div');
        banner.id = ELEMENT_ID;
        banner.style.cssText = 'position:fixed;bottom:0;left:0;right:0;height:28px;' +
            'z-index:' + Z_INDEX + ';display:flex;align-items:center;justify-content:center;' +
            'gap:10px;font-family:inherit;font-size:11px;color:#daa520;' +
            'background:rgba(26,26,46,0.88);border-top:1px solid rgba(255,215,0,0.12);' +
            'backdrop-filter:blur(4px);';

        var shimmerStyle = document.createElement('style');
        shimmerStyle.textContent = '@keyframes qdShimmer{0%{background-position:-200px 0}100%{background-position:200px 0}}';
        document.head.appendChild(shimmerStyle);

        var textEl = document.createElement('span');
        textEl.style.cssText = 'background:linear-gradient(90deg,#daa520,#ffd700,#daa520);' +
            'background-size:200px 100%;-webkit-background-clip:text;-webkit-text-fill-color:transparent;' +
            'background-clip:text;animation:qdShimmer 3s linear infinite;font-weight:600;';
        textEl.textContent = '\uD83D\uDCB3 Quick Deposit \u2014 Instant play with bonus!';

        var depositBtn = document.createElement('button');
        depositBtn.style.cssText = 'background:linear-gradient(135deg,#daa520,#b8860b);color:#fff;' +
            'border:none;border-radius:4px;padding:2px 10px;font-size:10px;font-weight:700;' +
            'cursor:pointer;font-family:inherit;';
        depositBtn.textContent = 'Deposit';
        depositBtn.addEventListener('click', function() {
            showToast('Coming soon!');
        });

        var dismissBtn = document.createElement('button');
        dismissBtn.style.cssText = 'background:none;border:none;color:rgba(255,255,255,0.3);' +
            'font-size:14px;cursor:pointer;padding:0 4px;line-height:1;font-family:inherit;';
        dismissBtn.textContent = '\u00D7';
        dismissBtn.addEventListener('click', function() {
            setDismissed();
            banner.style.display = 'none';
        });

        banner.appendChild(textEl);
        banner.appendChild(depositBtn);
        banner.appendChild(dismissBtn);
        document.body.appendChild(banner);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(init, 6000);
        });
    } else {
        setTimeout(init, 6000);
    }
})();
