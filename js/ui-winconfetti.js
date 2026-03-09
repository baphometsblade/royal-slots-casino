(function() {
    'use strict';

    var ELEMENT_ID = 'winConfettiBurst';
    var Z_INDEX = 10400;
    var POLL_INTERVAL = 2000;
    var WIN_THRESHOLD = 20;
    var CONFETTI_COUNT = 50;
    var DISPLAY_DURATION = 3000;

    var lastKnownBalance = null;
    var pollTimer = null;
    var overlayEl = null;

    var CONFETTI_COLORS = [
        '#ffd700', '#ff6b6b', '#2ecc71', '#3498db', '#e74c3c',
        '#9b59b6', '#f39c12', '#1abc9c', '#e67e22', '#ff69b4'
    ];

    function getCurrentBalance() {
        if (typeof balance !== 'undefined' && typeof balance === 'number') {
            return balance;
        }
        return null;
    }

    function showCelebration() {
        if (overlayEl && overlayEl.parentNode) {
            overlayEl.parentNode.removeChild(overlayEl);
        }

        overlayEl = document.createElement('div');
        overlayEl.id = ELEMENT_ID;
        overlayEl.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;' +
            'pointer-events:none;z-index:' + Z_INDEX + ';overflow:hidden;';

        var style = document.createElement('style');
        style.textContent = '@keyframes confettiFall{0%{transform:translateY(-10px) rotate(0deg);opacity:1}' +
            '80%{opacity:1}100%{transform:translateY(100vh) rotate(720deg);opacity:0}}' +
            '@keyframes bigWinBounce{0%{transform:translate(-50%,-50%) scale(0);opacity:0}' +
            '30%{transform:translate(-50%,-50%) scale(1.3);opacity:1}' +
            '50%{transform:translate(-50%,-50%) scale(0.9)}' +
            '70%{transform:translate(-50%,-50%) scale(1.1)}' +
            '100%{transform:translate(-50%,-50%) scale(1);opacity:1}}' +
            '@keyframes bigWinGlow{0%{text-shadow:0 0 10px rgba(255,215,0,0.5)}' +
            '100%{text-shadow:0 0 40px rgba(255,215,0,1),0 0 80px rgba(255,215,0,0.5)}}';
        overlayEl.appendChild(style);

        for (var i = 0; i < CONFETTI_COUNT; i++) {
            var piece = document.createElement('div');
            var color = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
            var left = Math.random() * 100;
            var delay = Math.random() * 1.5;
            var duration = 1.5 + Math.random() * 2;
            var width = 5 + Math.random() * 8;
            var height = 5 + Math.random() * 10;
            var shape = Math.random();
            var borderRadius = shape < 0.33 ? '50%' : (shape < 0.66 ? '2px' : '0');
            var rotation = Math.floor(Math.random() * 360);

            piece.style.cssText = 'position:absolute;top:-15px;left:' + left + '%;' +
                'width:' + width + 'px;height:' + height + 'px;' +
                'background:' + color + ';border-radius:' + borderRadius + ';' +
                'transform:rotate(' + rotation + 'deg);' +
                'animation:confettiFall ' + duration + 's ' + delay + 's linear forwards;' +
                'opacity:0;';
            overlayEl.appendChild(piece);
        }

        var textEl = document.createElement('div');
        textEl.style.cssText = 'position:absolute;top:50%;left:50%;' +
            'transform:translate(-50%,-50%) scale(0);' +
            'font-family:Arial,sans-serif;font-size:48px;font-weight:bold;' +
            'color:#ffd700;white-space:nowrap;' +
            'animation:bigWinBounce 0.8s ease forwards,bigWinGlow 1s 0.8s ease-in-out infinite alternate;' +
            'text-shadow:0 0 10px rgba(255,215,0,0.5),0 2px 4px rgba(0,0,0,0.8);';
        textEl.textContent = 'BIG WIN!';
        overlayEl.appendChild(textEl);

        document.body.appendChild(overlayEl);

        setTimeout(function() {
            if (overlayEl && overlayEl.parentNode) {
                overlayEl.parentNode.removeChild(overlayEl);
                overlayEl = null;
            }
        }, DISPLAY_DURATION);
    }

    function checkBalance() {
        var current = getCurrentBalance();
        if (current === null) return;

        if (lastKnownBalance !== null) {
            var diff = current - lastKnownBalance;
            if (diff >= WIN_THRESHOLD) {
                showCelebration();
            }
        }

        lastKnownBalance = current;
    }

    function init() {
        lastKnownBalance = getCurrentBalance();
        pollTimer = setInterval(checkBalance, POLL_INTERVAL);
    }

    function cleanup() {
        if (pollTimer) {
            clearInterval(pollTimer);
            pollTimer = null;
        }
        if (overlayEl && overlayEl.parentNode) {
            overlayEl.parentNode.removeChild(overlayEl);
            overlayEl = null;
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(init, 3000);
        });
    } else {
        setTimeout(init, 3000);
    }

    window._winConfetti = { cleanup: cleanup, trigger: showCelebration };
})();
