(function() {
    'use strict';

    var ELEMENT_ID = 'tournamentCountdownBanner';
    var Z_INDEX = 10400;
    var TOURNAMENT_HOURS = [0, 6, 12, 18];
    var LIVE_DURATION_MS = 30 * 60 * 1000;

    var bannerEl = null;
    var countdownSpan = null;
    var statusSpan = null;
    var tooltipEl = null;
    var tickInterval = null;
    var isLive = false;
    var liveStartedAt = 0;

    function getNextTournamentTime() {
        var now = new Date();
        var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        for (var i = 0; i < TOURNAMENT_HOURS.length; i++) {
            var t = new Date(today.getTime() + TOURNAMENT_HOURS[i] * 3600000);
            if (t.getTime() > now.getTime()) return t.getTime();
        }
        var tomorrow = new Date(today.getTime() + 86400000);
        return new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), TOURNAMENT_HOURS[0]).getTime();
    }

    function getMostRecentTournamentTime() {
        var now = new Date();
        var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        var mostRecent = null;
        for (var i = TOURNAMENT_HOURS.length - 1; i >= 0; i--) {
            var t = new Date(today.getTime() + TOURNAMENT_HOURS[i] * 3600000);
            if (t.getTime() <= now.getTime()) {
                mostRecent = t.getTime();
                break;
            }
        }
        if (mostRecent === null) {
            var yesterday = new Date(today.getTime() - 86400000);
            mostRecent = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), TOURNAMENT_HOURS[TOURNAMENT_HOURS.length - 1]).getTime();
        }
        return mostRecent;
    }

    function formatCountdown(ms) {
        if (ms < 0) ms = 0;
        var totalSec = Math.floor(ms / 1000);
        var h = Math.floor(totalSec / 3600);
        var m = Math.floor((totalSec % 3600) / 60);
        var s = totalSec % 60;
        return h + 'h ' + (m < 10 ? '0' : '') + m + 'm ' + (s < 10 ? '0' : '') + s + 's';
    }

    function generatePrizePool() {
        return (Math.floor(Math.random() * 10) + 1) * 1000;
    }

    function createBanner() {
        if (document.getElementById(ELEMENT_ID)) return;

        bannerEl = document.createElement('div');
        bannerEl.id = ELEMENT_ID;
        bannerEl.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:40px;background:linear-gradient(90deg,#0d0d1a,#1a1a2e,#0d0d1a);border-bottom:2px solid #ffd700;z-index:' + Z_INDEX + ';display:flex;align-items:center;justify-content:center;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#fff;cursor:pointer;user-select:none;box-shadow:0 2px 10px rgba(0,0,0,0.5);';

        statusSpan = document.createElement('span');
        statusSpan.style.cssText = 'margin-right:8px;';

        countdownSpan = document.createElement('span');
        countdownSpan.style.cssText = 'color:#ffd700;font-weight:bold;font-size:15px;text-shadow:0 0 6px rgba(255,215,0,0.4);';

        bannerEl.appendChild(statusSpan);
        bannerEl.appendChild(countdownSpan);

        tooltipEl = document.createElement('div');
        tooltipEl.style.cssText = 'position:fixed;top:44px;left:50%;transform:translateX(-50%);background:#1a1a2e;border:1px solid #ffd700;border-radius:8px;padding:12px 20px;color:#fff;font-family:Arial,Helvetica,sans-serif;font-size:13px;z-index:' + (Z_INDEX + 1) + ';display:none;box-shadow:0 4px 15px rgba(0,0,0,0.6);text-align:center;white-space:nowrap;';
        tooltipEl.textContent = 'Prize Pool: $' + generatePrizePool().toLocaleString() + ' | Top 50 players win prizes!';

        bannerEl.addEventListener('click', function() {
            if (tooltipEl.style.display === 'none') {
                tooltipEl.style.display = 'block';
                setTimeout(function() {
                    tooltipEl.style.display = 'none';
                }, 4000);
            } else {
                tooltipEl.style.display = 'none';
            }
        });

        document.body.appendChild(bannerEl);
        document.body.appendChild(tooltipEl);

        var styleId = ELEMENT_ID + '_style';
        if (!document.getElementById(styleId)) {
            var style = document.createElement('style');
            style.id = styleId;
            style.textContent = '@keyframes tournPulse{0%,100%{text-shadow:0 0 6px rgba(46,204,113,0.4)}50%{text-shadow:0 0 16px rgba(46,204,113,0.8),0 0 30px rgba(46,204,113,0.3)}}';
            document.head.appendChild(style);
        }
    }

    function tick() {
        var now = Date.now();

        if (isLive) {
            var elapsed = now - liveStartedAt;
            if (elapsed >= LIVE_DURATION_MS) {
                isLive = false;
                liveStartedAt = 0;
            } else {
                statusSpan.textContent = '\uD83C\uDFC6 ';
                countdownSpan.textContent = 'TOURNAMENT LIVE!';
                countdownSpan.style.color = '#2ecc71';
                countdownSpan.style.animation = 'tournPulse 1.2s ease-in-out infinite';
                return;
            }
        }

        var recentTime = getMostRecentTournamentTime();
        if (now - recentTime < LIVE_DURATION_MS && !isLive) {
            isLive = true;
            liveStartedAt = recentTime;
            statusSpan.textContent = '\uD83C\uDFC6 ';
            countdownSpan.textContent = 'TOURNAMENT LIVE!';
            countdownSpan.style.color = '#2ecc71';
            countdownSpan.style.animation = 'tournPulse 1.2s ease-in-out infinite';
            return;
        }

        var nextTime = getNextTournamentTime();
        var remaining = nextTime - now;

        statusSpan.textContent = '\uD83C\uDFC6 Next Tournament: ';
        countdownSpan.textContent = formatCountdown(remaining);
        countdownSpan.style.color = '#ffd700';
        countdownSpan.style.animation = 'none';
    }

    function init() {
        createBanner();
        tick();
        tickInterval = setInterval(tick, 1000);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(init, 3000);
        });
    } else {
        setTimeout(init, 3000);
    }
})();
