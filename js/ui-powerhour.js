(function(){
    'use strict';

    var ELEMENT_ID = 'powerHourBanner';
    var Z_INDEX = 10400;
    var POWER_WINDOW_MINUTES = 15;
    var CHECK_INTERVAL = 30000;

    var lastState = null;

    function isPowerHourActive() {
        var now = new Date();
        return now.getMinutes() < POWER_WINDOW_MINUTES;
    }

    function getRemainingTime() {
        var now = new Date();
        var minutesLeft = POWER_WINDOW_MINUTES - 1 - now.getMinutes();
        var secondsLeft = 59 - now.getSeconds();
        if (minutesLeft < 0) return { m: 0, s: 0 };
        return { m: minutesLeft, s: secondsLeft };
    }

    function padTwo(n) {
        return n < 10 ? '0' + n : String(n);
    }

    function init() {
        if (document.getElementById(ELEMENT_ID)) return;

        var banner = document.createElement('div');
        banner.id = ELEMENT_ID;
        banner.style.cssText = 'position:fixed;top:0;left:0;right:0;height:32px;z-index:' + Z_INDEX + ';' +
            'display:none;align-items:center;justify-content:center;font-family:inherit;' +
            'font-size:13px;font-weight:700;color:#fff;text-shadow:0 1px 3px rgba(0,0,0,0.5);' +
            'background:linear-gradient(90deg,#e67e22,#f39c12,#e67e22);' +
            'box-shadow:0 2px 10px rgba(230,126,34,0.4);letter-spacing:0.5px;' +
            'animation:phPulse 2s ease-in-out infinite;';

        var style = document.createElement('style');
        style.textContent = '@keyframes phPulse{0%,100%{background:linear-gradient(90deg,#e67e22,#f39c12,#e67e22)}' +
            '50%{background:linear-gradient(90deg,#f39c12,#ffd700,#f39c12)}}';
        document.head.appendChild(style);

        var textSpan = document.createElement('span');
        textSpan.id = ELEMENT_ID + '_text';
        textSpan.textContent = '';

        banner.appendChild(textSpan);
        document.body.appendChild(banner);

        var countdownTimer = null;

        function startCountdown() {
            if (countdownTimer) clearInterval(countdownTimer);
            countdownTimer = setInterval(function() {
                if (!isPowerHourActive()) {
                    updateState();
                    return;
                }
                var rem = getRemainingTime();
                textSpan.textContent = '\u26A1 POWER HOUR \u2014 All rewards doubled! ' +
                    padTwo(rem.m) + ':' + padTwo(rem.s) + ' remaining';
            }, 1000);
        }

        function stopCountdown() {
            if (countdownTimer) {
                clearInterval(countdownTimer);
                countdownTimer = null;
            }
        }

        function updateState() {
            var active = isPowerHourActive();
            if (active === lastState) return;
            lastState = active;

            if (active) {
                banner.style.display = 'flex';
                var rem = getRemainingTime();
                textSpan.textContent = '\u26A1 POWER HOUR \u2014 All rewards doubled! ' +
                    padTwo(rem.m) + ':' + padTwo(rem.s) + ' remaining';
                startCountdown();
            } else {
                banner.style.display = 'none';
                stopCountdown();
            }
        }

        updateState();
        setInterval(updateState, CHECK_INTERVAL);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(init, 3000);
        });
    } else {
        setTimeout(init, 3000);
    }
})();
