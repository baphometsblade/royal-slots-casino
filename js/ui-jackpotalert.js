(function() {
    'use strict';

    var ELEMENT_ID = 'jackpotAlert';
    var Z_INDEX = 10400;
    var STORAGE_KEY = 'ms_jackpotAmount';
    var THRESHOLD_KEY = 'ms_jackpotThresholdsHit';
    var THRESHOLDS = [25000, 50000, 75000, 100000];
    var TICKER_SIZE = { w: 180, h: 36 };
    var BANNER_HEIGHT = 56;
    var INCREMENT_INTERVAL = 30000;
    var BANNER_DURATION = 5000;
    var RESET_CEILING = 100000;
    var RESET_BASE = 10000;

    var tickerEl = null;
    var bannerEl = null;
    var currentAmount = 0;
    var thresholdsHit = [];
    var incrementTimer = null;

    function loadState() {
        try {
            var saved = localStorage.getItem(STORAGE_KEY);
            currentAmount = saved ? parseFloat(saved) : 10000;
            if (isNaN(currentAmount) || currentAmount < 0) currentAmount = 10000;
            var savedThresholds = localStorage.getItem(THRESHOLD_KEY);
            thresholdsHit = savedThresholds ? JSON.parse(savedThresholds) : [];
            if (!Array.isArray(thresholdsHit)) thresholdsHit = [];
        } catch (e) {
            currentAmount = 10000;
            thresholdsHit = [];
        }
    }

    function saveState() {
        try {
            localStorage.setItem(STORAGE_KEY, String(currentAmount));
            localStorage.setItem(THRESHOLD_KEY, JSON.stringify(thresholdsHit));
        } catch (e) { /* silent */ }
    }

    function formatMoney(val) {
        return '$' + Math.floor(val).toLocaleString('en-US');
    }

    function createTicker() {
        tickerEl = document.createElement('div');
        tickerEl.id = ELEMENT_ID;
        tickerEl.style.cssText = 'position:fixed;top:8px;right:8px;width:' + TICKER_SIZE.w + 'px;height:' + TICKER_SIZE.h + 'px;' +
            'background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);border:1px solid #daa520;border-radius:8px;' +
            'display:flex;align-items:center;justify-content:center;z-index:' + Z_INDEX + ';' +
            'font-family:Arial,sans-serif;font-size:12px;color:#ffd700;font-weight:bold;' +
            'box-shadow:0 2px 8px rgba(0,0,0,0.5);cursor:default;user-select:none;' +
            'transition:transform 0.3s ease;';
        tickerEl.textContent = '\uD83C\uDFB0 ' + formatMoney(currentAmount);
        tickerEl.addEventListener('mouseenter', function() { tickerEl.style.transform = 'scale(1.08)'; });
        tickerEl.addEventListener('mouseleave', function() { tickerEl.style.transform = 'scale(1)'; });
        document.body.appendChild(tickerEl);
    }

    function updateTicker() {
        if (tickerEl) {
            tickerEl.textContent = '\uD83C\uDFB0 ' + formatMoney(currentAmount);
        }
    }

    function showBanner(amount) {
        if (bannerEl && bannerEl.parentNode) {
            bannerEl.parentNode.removeChild(bannerEl);
        }
        bannerEl = document.createElement('div');
        bannerEl.style.cssText = 'position:fixed;top:0;left:0;right:0;height:' + BANNER_HEIGHT + 'px;' +
            'background:linear-gradient(90deg,#b8860b 0%,#ffd700 30%,#ffec80 50%,#ffd700 70%,#b8860b 100%);' +
            'display:flex;align-items:center;justify-content:center;z-index:' + (Z_INDEX + 1) + ';' +
            'font-family:Arial,sans-serif;font-size:20px;font-weight:bold;color:#1a1a2e;' +
            'text-shadow:0 1px 2px rgba(255,255,255,0.3);box-shadow:0 4px 16px rgba(255,215,0,0.4);' +
            'transform:translateY(-100%);transition:transform 0.4s cubic-bezier(0.34,1.56,0.64,1);' +
            'animation:jackpotPulseGlow 1s ease-in-out infinite alternate;';

        var style = document.createElement('style');
        style.textContent = '@keyframes jackpotPulseGlow{0%{box-shadow:0 4px 16px rgba(255,215,0,0.4)}100%{box-shadow:0 4px 32px rgba(255,215,0,0.8)}}';
        bannerEl.appendChild(style);

        var text = document.createElement('span');
        text.textContent = '\uD83C\uDFB0 JACKPOT NOW: ' + formatMoney(amount) + '!';
        bannerEl.appendChild(text);

        document.body.appendChild(bannerEl);

        requestAnimationFrame(function() {
            requestAnimationFrame(function() {
                bannerEl.style.transform = 'translateY(0)';
            });
        });

        setTimeout(function() {
            if (bannerEl) {
                bannerEl.style.transform = 'translateY(-100%)';
                setTimeout(function() {
                    if (bannerEl && bannerEl.parentNode) {
                        bannerEl.parentNode.removeChild(bannerEl);
                        bannerEl = null;
                    }
                }, 500);
            }
        }, BANNER_DURATION);
    }

    function incrementJackpot() {
        var increment = 10 + Math.random() * 40;
        currentAmount += increment;

        for (var i = 0; i < THRESHOLDS.length; i++) {
            var t = THRESHOLDS[i];
            if (currentAmount >= t && thresholdsHit.indexOf(t) === -1) {
                thresholdsHit.push(t);
                showBanner(currentAmount);
                break;
            }
        }

        if (currentAmount >= RESET_CEILING) {
            currentAmount = RESET_BASE + Math.random() * 5000;
            thresholdsHit = [];
        }

        updateTicker();
        saveState();
    }

    function init() {
        if (document.getElementById(ELEMENT_ID)) return;
        loadState();
        createTicker();
        incrementTimer = setInterval(incrementJackpot, INCREMENT_INTERVAL);
    }

    function cleanup() {
        if (incrementTimer) {
            clearInterval(incrementTimer);
            incrementTimer = null;
        }
        if (tickerEl && tickerEl.parentNode) tickerEl.parentNode.removeChild(tickerEl);
        if (bannerEl && bannerEl.parentNode) bannerEl.parentNode.removeChild(bannerEl);
        tickerEl = null;
        bannerEl = null;
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(init, 3500);
        });
    } else {
        setTimeout(init, 3500);
    }

    window._jackpotAlert = { cleanup: cleanup };
})();
