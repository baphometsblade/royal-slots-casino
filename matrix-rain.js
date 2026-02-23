// matrix-rain.js — Matrix-style falling character rain on the site background.
// Loaded after constants.js; relies on nothing else.
(function () {
    'use strict';

    // Character pool: digits + katakana fragments
    var CHARS = '01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン';
    var FONT_SIZE = 14;
    var INTERVAL  = 55;     // ms per frame

    function init() {
        var canvas = document.createElement('canvas');
        canvas.id = 'matrixRainCanvas';
        document.body.insertBefore(canvas, document.body.firstChild);

        var ctx = canvas.getContext('2d');
        var drops = [];

        function resize() {
            canvas.width  = window.innerWidth;
            canvas.height = window.innerHeight;
            var cols = Math.floor(canvas.width / FONT_SIZE);
            while (drops.length < cols) drops.push(Math.random() * -50 | 0);
            drops.length = cols;
        }

        function draw() {
            ctx.fillStyle = 'rgba(0,0,0,0.045)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.font = FONT_SIZE + 'px monospace';
            for (var i = 0; i < drops.length; i++) {
                var char = CHARS[Math.floor(Math.random() * CHARS.length)];
                var y    = drops[i] * FONT_SIZE;
                ctx.fillStyle = drops[i] > 5 ? '#00ff41' : '#afffbc';
                ctx.fillText(char, i * FONT_SIZE, y);
                if (y > canvas.height && Math.random() > 0.975) {
                    drops[i] = 0;
                }
                drops[i]++;
            }
        }

        resize();
        window.addEventListener('resize', resize);

        if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            draw();
            return;
        }

        setInterval(draw, INTERVAL);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
