/**
 * Happy Hour Bonus System
 * Displays active happy hour bonuses and upcoming events with countdown timers
 * Features: Active hour banner (top), next hour teaser (bottom), 1-second countdown updates
 */

(function() {
    'use strict';

    // ─── API Helper ───
    async function api(path, opts) {
        opts = opts || {};
        if (typeof apiRequest === 'function') return apiRequest(path, opts);
        var tokenKey = typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken';
        var token = localStorage.getItem(tokenKey);
        if (!token) return null;
        var res = await fetch(path, Object.assign({}, opts, {
            headers: Object.assign({ 'Content-Type': 'application/json' },
                token ? { Authorization: 'Bearer ' + token } : {},
                opts.headers || {})
        }));
        return res.json();
    }

    // ─── State ───
    var activeBanner = null;
    var nextBanner = null;
    var countdownInterval = null;
    var lastActiveHour = null;
    var dismissedAt = null;
    var currentData = null;

    var REAPPEAR_INTERVAL = 5 * 60 * 1000; // 5 minutes for happy hour banner to reappear
    var REFRESH_INTERVAL = 60 * 1000;      // Refresh status every 60 seconds
    var COUNTDOWN_INTERVAL = 1000;         // Update countdown every second

    // ─── Helper: Format time as MM:SS or H:MM:SS ───
    function formatCountdown(ms) {
        if (ms < 0) return '0:00';
        var totalSeconds = Math.floor(ms / 1000);
        var hours = Math.floor(totalSeconds / 3600);
        var minutes = Math.floor((totalSeconds % 3600) / 60);
        var seconds = totalSeconds % 60;

        if (hours > 0) {
            return hours + ':' + String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');
        } else {
            return minutes + ':' + String(seconds).padStart(2, '0');
        }
    }

    // ─── Helper: Check if active banner should be dismissed based on cooldown ───
    function isActiveBannerDismissed() {
        if (!dismissedAt) return false;
        var now = Date.now();
        return (now - dismissedAt) < REAPPEAR_INTERVAL;
    }

    // ─── Create & Show Active Happy Hour Banner ───
    function createActiveBanner(data) {
        if (!data.current) return null;

        if (!activeBanner) {
            activeBanner = document.createElement('div');
            activeBanner.id = 'happyHourActiveBanner';
            activeBanner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;width:100%;box-sizing:border-box;';
            document.body.appendChild(activeBanner);

            // Add CSS for pulsing animation
            if (!document.getElementById('happyHourStyle')) {
                var style = document.createElement('style');
                style.id = 'happyHourStyle';
                style.textContent = '@keyframes hhPulse{0%,100%{box-shadow:0 0 15px rgba(255,140,0,0.4)}50%{box-shadow:0 0 30px rgba(255,215,0,0.6)}}' +
                    '.hh-active-content{animation:hhPulse 2s infinite;}' +
                    '@keyframes hhFlame{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.8;transform:scale(1.1)}}' +
                    '.hh-flame{animation:hhFlame 1.5s ease-in-out infinite;}';
                document.head.appendChild(style);
            }
        }

        var current = data.current;
        var endsAtMs = new Date(current.endsAt).getTime() - Date.now();
        var countdownText = formatCountdown(endsAtMs);

        // Determine background color and intensity based on multiplier
        var bgColor = current.multiplier >= 2 ? 'linear-gradient(90deg,rgba(255,0,0,0.3),rgba(255,140,0,0.3))' :
                      current.multiplier >= 1.75 ? 'linear-gradient(90deg,rgba(255,69,0,0.3),rgba(255,140,0,0.3))' :
                      'linear-gradient(90deg,rgba(255,140,0,0.3),rgba(255,215,0,0.2))';

        activeBanner.innerHTML = '<div class="hh-active-content" style="background:' + bgColor + ';border-bottom:2px solid rgba(255,215,0,0.6);padding:12px 20px;display:flex;align-items:center;justify-content:center;gap:16px;backdrop-filter:blur(8px);text-align:center;">' +
            '<span class="hh-flame" style="font-size:24px;">🔥</span>' +
            '<span style="font-size:14px;font-weight:700;color:#ffd700;letter-spacing:1px;">HAPPY HOUR: ' + current.name.toUpperCase() + '</span>' +
            '<span style="font-size:16px;font-weight:700;color:#ffff00;padding:4px 10px;background:rgba(255,215,0,0.2);border-radius:6px;">×' + current.multiplier + ' WINS!</span>' +
            '<span style="font-size:13px;color:#ffccaa;">Ends in <strong id="hhActiveCountdown" style="color:#ffff00;">' + countdownText + '</strong></span>' +
            '<span class="hh-flame" style="font-size:24px;">🔥</span>' +
            '<button id="hhActiveDismiss" style="position:absolute;right:16px;background:none;border:none;color:#ff8c00;font-size:20px;cursor:pointer;padding:4px 8px;line-height:1;">&times;</button>' +
        '</div>';

        activeBanner.style.display = 'block';

        // Dismiss button
        var dismissBtn = document.getElementById('hhActiveDismiss');
        if (dismissBtn) {
            dismissBtn.addEventListener('click', function() {
                activeBanner.style.display = 'none';
                dismissedAt = Date.now();
            });
        }

        return activeBanner;
    }

    // ─── Create & Show Next Happy Hour Teaser ───
    function createNextBanner(data) {
        if (!data.next) return null;

        if (!nextBanner) {
            nextBanner = document.createElement('div');
            nextBanner.id = 'happyHourNextBanner';
            nextBanner.style.cssText = 'position:fixed;bottom:20px;left:20px;z-index:9990;max-width:320px;box-sizing:border-box;';
            document.body.appendChild(nextBanner);
        }

        var next = data.next;
        var startsAtMs = new Date(next.startsAt).getTime() - Date.now();
        var countdownText = formatCountdown(startsAtMs);

        nextBanner.innerHTML = '<div style="background:linear-gradient(135deg,rgba(30,30,50,0.95),rgba(50,40,60,0.95));border:1px solid rgba(255,215,0,0.3);border-radius:10px;padding:12px 16px;display:flex;align-items:center;gap:10px;backdrop-filter:blur(10px);">' +
            '<span style="font-size:16px;">⏰</span>' +
            '<div style="flex:1;min-width:0;">' +
                '<div style="font-size:12px;font-weight:700;color:#ffd700;">Next Happy Hour</div>' +
                '<div style="font-size:11px;color:#ddd;margin-top:2px;">' + next.name + ' — ×' + next.multiplier + ' wins</div>' +
                '<div style="font-size:11px;color:#ffcc00;margin-top:3px;">Starts in <strong id="hhNextCountdown">' + countdownText + '</strong></div>' +
            '</div>' +
        '</div>';

        nextBanner.style.display = data.active ? 'none' : 'block';

        return nextBanner;
    }

    // ─── Update Active Banner Countdown ───
    function updateActiveBannerCountdown() {
        if (!activeBanner || !currentData || !currentData.current) return;

        var current = currentData.current;
        var endsAtMs = new Date(current.endsAt).getTime() - Date.now();
        var countdownText = formatCountdown(endsAtMs);
        var element = document.getElementById('hhActiveCountdown');

        if (element) {
            element.textContent = countdownText;

            // Turn red when < 5 minutes
            if (endsAtMs < 5 * 60 * 1000) {
                element.style.color = '#ff4444';
            } else {
                element.style.color = '#ffff00';
            }
        }

        // Hide banner if expired
        if (endsAtMs <= 0) {
            activeBanner.style.display = 'none';
        }
    }

    // ─── Update Next Banner Countdown ───
    function updateNextBannerCountdown() {
        if (!nextBanner || !currentData || !currentData.next) return;

        var next = currentData.next;
        var startsAtMs = new Date(next.startsAt).getTime() - Date.now();
        var countdownText = formatCountdown(startsAtMs);
        var element = document.getElementById('hhNextCountdown');

        if (element) {
            element.textContent = countdownText;
        }
    }

    // ─── Start Countdown Timer ───
    function startCountdownTimer() {
        if (countdownInterval) clearInterval(countdownInterval);

        countdownInterval = setInterval(function() {
            updateActiveBannerCountdown();
            updateNextBannerCountdown();
        }, COUNTDOWN_INTERVAL);
    }

    // ─── Fetch & Refresh Status ───
    async function refreshStatus() {
        try {
            var data = await api('/api/happy-hour');
            if (!data) return;

            currentData = data;

            // Handle active happy hour
            if (data.active && !isActiveBannerDismissed()) {
                createActiveBanner(data);
            } else if (data.active && isActiveBannerDismissed()) {
                // Dismissed, but keep showing next hour
                if (activeBanner) activeBanner.style.display = 'none';
            } else {
                // No active happy hour, hide active banner
                if (activeBanner) activeBanner.style.display = 'none';
                dismissedAt = null; // Reset dismiss cooldown when no active hour
            }

            // Handle next happy hour teaser
            if (!data.active && data.next) {
                createNextBanner(data);
            } else if (data.active && nextBanner) {
                nextBanner.style.display = 'none';
            }

            startCountdownTimer();
        } catch (err) {
            console.warn('[HappyHour] refreshStatus error: ' + (err.message || err));
        }
    }

    // ─── Initialize ───
    function init() {
        // Initial fetch
        refreshStatus();

        // Refresh status every 60 seconds
        setInterval(refreshStatus, REFRESH_INTERVAL);

        // If a happy hour expires and we're looking at the teaser, check for new active hour every 10 seconds
        setInterval(function() {
            if (currentData && !currentData.active && nextBanner && nextBanner.style.display !== 'none') {
                var nextStartMs = new Date(currentData.next.startsAt).getTime() - Date.now();
                if (nextStartMs <= 0) {
                    refreshStatus();
                }
            }
        }, 10000);
    }

    window.HappyHour = {
        init: init
    };
})();
