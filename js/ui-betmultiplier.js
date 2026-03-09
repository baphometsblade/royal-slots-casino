(function() {
    'use strict';

    var ELEMENT_ID = 'betMultiplierTimer';
    var Z_INDEX = 10400;
    var STORAGE_KEY = 'ms_betMultiplier';
    var MIN_INTERVAL_MS = 5 * 60 * 1000;
    var MAX_INTERVAL_MS = 10 * 60 * 1000;
    var MIN_DURATION_MS = 2 * 60 * 1000;
    var MAX_DURATION_MS = 5 * 60 * 1000;
    var MULTIPLIERS = [
        { value: 2, label: '2x', weight: 50 },
        { value: 3, label: '3x', weight: 35 },
        { value: 5, label: '5x', weight: 15 }
    ];

    var bannerEl = null;
    var timerInterval = null;
    var scheduleTimeout = null;
    var isActive = false;
    var currentMultiplier = 1;
    var expiresAt = 0;

    function pickMultiplier() {
        var total = 0;
        for (var i = 0; i < MULTIPLIERS.length; i++) total += MULTIPLIERS[i].weight;
        var r = Math.random() * total;
        var cum = 0;
        for (var j = 0; j < MULTIPLIERS.length; j++) {
            cum += MULTIPLIERS[j].weight;
            if (r <= cum) return MULTIPLIERS[j];
        }
        return MULTIPLIERS[0];
    }

    function formatTime(ms) {
        if (ms < 0) ms = 0;
        var totalSec = Math.floor(ms / 1000);
        var min = Math.floor(totalSec / 60);
        var sec = totalSec % 60;
        return min + ':' + (sec < 10 ? '0' : '') + sec;
    }

    function createBanner() {
        if (document.getElementById(ELEMENT_ID)) return;

        bannerEl = document.createElement('div');
        bannerEl.id = ELEMENT_ID;
        bannerEl.style.cssText = 'position:fixed;top:-60px;left:0;width:100%;height:50px;z-index:' + Z_INDEX + ';display:flex;align-items:center;justify-content:center;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:bold;color:#fff;transition:top 0.5s ease;pointer-events:none;';

        var inner = document.createElement('div');
        inner.style.cssText = 'background:linear-gradient(90deg,#e74c3c,#ff6b35,#e74c3c);padding:8px 24px;border-radius:0 0 12px 12px;box-shadow:0 4px 20px rgba(231,76,60,0.5);display:flex;align-items:center;gap:12px;border:1px solid rgba(255,215,0,0.4);border-top:none;';

        var labelSpan = document.createElement('span');
        labelSpan.setAttribute('data-role', 'label');
        labelSpan.style.cssText = 'text-shadow:0 0 8px rgba(255,107,53,0.8);';

        var timerSpan = document.createElement('span');
        timerSpan.setAttribute('data-role', 'timer');
        timerSpan.style.cssText = 'color:#ffd700;font-size:18px;text-shadow:0 0 6px rgba(255,215,0,0.6);';

        inner.appendChild(labelSpan);
        inner.appendChild(timerSpan);
        bannerEl.appendChild(inner);
        document.body.appendChild(bannerEl);

        addPulseAnimation();
    }

    function addPulseAnimation() {
        var styleId = ELEMENT_ID + '_style';
        if (document.getElementById(styleId)) return;
        var style = document.createElement('style');
        style.id = styleId;
        style.textContent = '@keyframes betMultPulse{0%,100%{box-shadow:0 4px 20px rgba(231,76,60,0.5)}50%{box-shadow:0 4px 30px rgba(255,107,53,0.8),0 0 40px rgba(255,215,0,0.3)}}';
        document.head.appendChild(style);
    }

    function showBanner(mult) {
        createBanner();
        var inner = bannerEl.querySelector('div');
        if (inner) inner.style.animation = 'betMultPulse 1.5s ease-in-out infinite';

        var labelSpan = bannerEl.querySelector('[data-role="label"]');
        if (labelSpan) labelSpan.textContent = '\uD83D\uDD25 MULTIPLIER ACTIVE! All wins \u00D7' + mult.label.replace('x', '') + ' for ';

        bannerEl.style.top = '0';
        spawnConfetti();
    }

    function hideBanner() {
        if (bannerEl) {
            bannerEl.style.top = '-60px';
        }
    }

    function updateTimer() {
        var remaining = expiresAt - Date.now();
        if (remaining <= 0) {
            deactivate();
            return;
        }
        var timerSpan = bannerEl ? bannerEl.querySelector('[data-role="timer"]') : null;
        if (timerSpan) timerSpan.textContent = formatTime(remaining);
    }

    function activate() {
        var mult = pickMultiplier();
        currentMultiplier = mult.value;
        var duration = MIN_DURATION_MS + Math.floor(Math.random() * (MAX_DURATION_MS - MIN_DURATION_MS));
        expiresAt = Date.now() + duration;
        isActive = true;

        window._betMultiplierActive = currentMultiplier;

        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                multiplier: currentMultiplier,
                expiresAt: expiresAt
            }));
        } catch (e) { /* storage full */ }

        showBanner(mult);
        if (timerInterval) clearInterval(timerInterval);
        timerInterval = setInterval(updateTimer, 1000);
        updateTimer();
    }

    function deactivate() {
        isActive = false;
        currentMultiplier = 1;
        expiresAt = 0;
        window._betMultiplierActive = 1;

        try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* ignore */ }

        if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
        hideBanner();
        scheduleNext();
    }

    function scheduleNext() {
        if (scheduleTimeout) clearTimeout(scheduleTimeout);
        var delay = MIN_INTERVAL_MS + Math.floor(Math.random() * (MAX_INTERVAL_MS - MIN_INTERVAL_MS));
        scheduleTimeout = setTimeout(activate, delay);
    }

    function restoreState() {
        try {
            var saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                var data = JSON.parse(saved);
                if (data.expiresAt && data.expiresAt > Date.now()) {
                    currentMultiplier = data.multiplier || 2;
                    expiresAt = data.expiresAt;
                    isActive = true;
                    window._betMultiplierActive = currentMultiplier;

                    var mult = null;
                    for (var i = 0; i < MULTIPLIERS.length; i++) {
                        if (MULTIPLIERS[i].value === currentMultiplier) { mult = MULTIPLIERS[i]; break; }
                    }
                    if (!mult) mult = MULTIPLIERS[0];

                    showBanner(mult);
                    if (timerInterval) clearInterval(timerInterval);
                    timerInterval = setInterval(updateTimer, 1000);
                    updateTimer();
                    return true;
                } else {
                    localStorage.removeItem(STORAGE_KEY);
                }
            }
        } catch (e) { /* ignore */ }
        return false;
    }

    function spawnConfetti() {
        var colors = ['#ffd700', '#e74c3c', '#ff6b35', '#fff', '#daa520'];
        for (var i = 0; i < 20; i++) {
            (function(idx) {
                setTimeout(function() {
                    var dot = document.createElement('div');
                    var x = 30 + Math.random() * 40;
                    var color = colors[Math.floor(Math.random() * colors.length)];
                    dot.style.cssText = 'position:fixed;top:50px;left:' + x + '%;width:6px;height:6px;background:' + color + ';border-radius:50%;z-index:' + (Z_INDEX + 1) + ';pointer-events:none;transition:all 1.5s ease-out;opacity:1;';
                    document.body.appendChild(dot);
                    requestAnimationFrame(function() {
                        dot.style.top = (60 + Math.random() * 30) + '%';
                        dot.style.left = (x + (Math.random() - 0.5) * 20) + '%';
                        dot.style.opacity = '0';
                    });
                    setTimeout(function() { if (dot.parentNode) dot.parentNode.removeChild(dot); }, 1600);
                }, idx * 50);
            })(i);
        }
    }

    function init() {
        window._betMultiplierActive = 1;
        if (!restoreState()) {
            scheduleNext();
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(init, 6000);
        });
    } else {
        setTimeout(init, 6000);
    }
})();
