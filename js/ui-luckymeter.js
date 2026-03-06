// =====================================================================
// Lucky Spin Meter — Passive Engagement Reward System
// =====================================================================
//
// A circular arc meter that fills with every spin. After ~50 spins it
// reaches 100% and awards a guaranteed bonus ($2-$10). The meter
// provides a visible sense of progression that keeps players spinning
// even during cold streaks.
//
// Depends on globals: balance, updateBalance(), saveBalance(),
//   formatMoney(), showWinToast(), currentGame, spinning, currentBet
//
// Hooks: patches displayServerWinResult to increment the meter on
//   every resolved spin.
//
// All DOM via document.createElement, CSS via injected <style>.
// =====================================================================
(function() {
    'use strict';

    // ── QA suppression ──────────────────────────────────────────
    var search = window.location.search || '';
    if (search.indexOf('noBonus=1') !== -1 || search.indexOf('qaTools=1') !== -1) {
        return;
    }

    // ── Config ──────────────────────────────────────────────────
    var STORAGE_KEY       = 'luckyMeterState';
    var SIZE              = 56;          // px — outer ring diameter
    var RING_WIDTH        = 5;           // px — ring stroke width
    var SPIN_FILL_MIN     = 1.5;         // % added per spin (loss)
    var SPIN_FILL_MAX     = 3.0;         // % added per spin (loss)
    var WIN_FILL_MIN      = 3.0;         // % extra for wins
    var WIN_FILL_MAX      = 5.0;         // % extra for wins
    var BONUS_MIN         = 2.00;        // $ minimum lucky bonus
    var BONUS_MAX         = 10.00;       // $ maximum lucky bonus
    var GLOW_THRESHOLD    = 75;          // % before glow pulse starts
    var ANIM_DURATION_MS  = 600;         // fill animation length
    var EXPLODE_MS        = 1200;        // explosion animation length
    var OVERLAY_MS        = 2800;        // overlay display time

    // ── Color thresholds ────────────────────────────────────────
    var COLOR_GRAY   = '#555';           // 0-25%
    var COLOR_BLUE   = '#3b82f6';        // 25-50%
    var COLOR_PURPLE = '#a855f7';        // 50-75%
    var COLOR_GOLD   = '#f59e0b';        // 75-100%

    // ── State ───────────────────────────────────────────────────
    var _fill         = 0;    // 0-100 (percent)
    var _stylesReady  = false;
    var _containerEl  = null;
    var _ringEl       = null;
    var _pctEl        = null;
    var _labelEl      = null;
    var _animFrame    = null;
    var _exploding    = false;

    // ── Persistence ─────────────────────────────────────────────
    function loadState() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                var parsed = JSON.parse(raw);
                _fill = Math.min(100, Math.max(0, parsed.fill || 0));
            }
        } catch (e) { /* keep defaults */ }
    }

    function saveState() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ fill: _fill }));
        } catch (e) { /* silent */ }
    }

    // ── Utility ─────────────────────────────────────────────────
    function rand(min, max) {
        return min + Math.random() * (max - min);
    }

    function ringColor(pct) {
        if (pct >= 75) return COLOR_GOLD;
        if (pct >= 50) return COLOR_PURPLE;
        if (pct >= 25) return COLOR_BLUE;
        return COLOR_GRAY;
    }

    // ── CSS Injection ───────────────────────────────────────────
    function injectStyles() {
        if (_stylesReady) return;
        _stylesReady = true;
        var s = document.createElement('style');
        s.id = 'luckyMeterStyles';
        s.textContent = [
            '.lmtr-wrap{position:fixed;bottom:80px;right:16px;z-index:9900;' +
                'display:flex;flex-direction:column;align-items:center;gap:3px;' +
                'pointer-events:auto;user-select:none;transition:opacity .3s ease;opacity:1}',
            '.lmtr-wrap.lmtr-hidden{opacity:0;pointer-events:none}',

            '.lmtr-ring{width:' + SIZE + 'px;height:' + SIZE + 'px;border-radius:50%;' +
                'display:flex;align-items:center;justify-content:center;' +
                'transition:box-shadow .4s ease;cursor:default;position:relative}',

            '.lmtr-pct{font-size:13px;font-weight:800;color:#fff;' +
                'text-shadow:0 1px 3px rgba(0,0,0,.6);letter-spacing:-.5px;' +
                'position:relative;z-index:2}',

            '.lmtr-label{font-size:9px;font-weight:700;color:rgba(255,255,255,.7);' +
                'letter-spacing:.5px;text-transform:uppercase;text-align:center;' +
                'text-shadow:0 1px 2px rgba(0,0,0,.5)}',

            '.lmtr-glow{animation:lmtr-pulse 1.5s ease-in-out infinite}',
            '@keyframes lmtr-pulse{0%,100%{box-shadow:0 0 8px rgba(245,158,11,.4),' +
                '0 0 18px rgba(245,158,11,.2)}50%{box-shadow:0 0 14px rgba(245,158,11,.7),' +
                '0 0 30px rgba(245,158,11,.35)}}',

            '.lmtr-fill-flash{animation:lmtr-bump .35s ease-out}',
            '@keyframes lmtr-bump{0%{transform:scale(1)}40%{transform:scale(1.12)}100%{transform:scale(1)}}',

            /* Explosion */
            '.lmtr-explode{animation:lmtr-explode-anim ' + EXPLODE_MS + 'ms ease-out forwards}',
            '@keyframes lmtr-explode-anim{' +
                '0%{transform:scale(1);opacity:1}' +
                '30%{transform:scale(1.5);opacity:1}' +
                '60%{transform:scale(1.8);opacity:.6}' +
                '100%{transform:scale(2.2);opacity:0}}',

            /* Particles (pseudo-element burst) */
            '.lmtr-burst::before,.lmtr-burst::after{content:"";position:absolute;' +
                'width:6px;height:6px;border-radius:50%;pointer-events:none}',
            '.lmtr-burst::before{background:#f59e0b;animation:lmtr-p1 .8s ease-out forwards}',
            '.lmtr-burst::after{background:#a855f7;animation:lmtr-p2 .9s ease-out forwards}',
            '@keyframes lmtr-p1{0%{transform:translate(0,0) scale(1);opacity:1}' +
                '100%{transform:translate(-28px,-35px) scale(.3);opacity:0}}',
            '@keyframes lmtr-p2{0%{transform:translate(0,0) scale(1);opacity:1}' +
                '100%{transform:translate(30px,-30px) scale(.2);opacity:0}}',

            /* Ring sparks */
            '.lmtr-spark{position:absolute;width:4px;height:4px;border-radius:50%;' +
                'pointer-events:none;animation:lmtr-spark-fly 0.7s ease-out forwards}',
            '@keyframes lmtr-spark-fly{0%{opacity:1;transform:translate(0,0) scale(1)}' +
                '100%{opacity:0;transform:translate(var(--sx),var(--sy)) scale(0)}}',

            /* Overlay */
            '.lmtr-overlay{position:fixed;top:0;left:0;right:0;bottom:0;z-index:20000;' +
                'display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;' +
                'background:rgba(0,0,0,.65);opacity:0;transition:opacity .35s ease;pointer-events:none}',
            '.lmtr-overlay.lmtr-show{opacity:1;pointer-events:auto}',
            '.lmtr-overlay-title{font-size:28px;font-weight:900;color:#f59e0b;' +
                'text-shadow:0 0 20px rgba(245,158,11,.6),0 2px 4px rgba(0,0,0,.5);' +
                'letter-spacing:3px;animation:lmtr-slam .5s cubic-bezier(.17,.67,.29,1.4) forwards}',
            '@keyframes lmtr-slam{0%{transform:scale(2.5);opacity:0}100%{transform:scale(1);opacity:1}}',
            '.lmtr-overlay-amount{font-size:36px;font-weight:900;color:#fff;' +
                'text-shadow:0 0 16px rgba(255,255,255,.4);animation:lmtr-fadeup .6s .2s ease-out both}',
            '@keyframes lmtr-fadeup{0%{transform:translateY(20px);opacity:0}100%{transform:translateY(0);opacity:1}}'
        ].join('\n');
        document.head.appendChild(s);
    }

    // ── Build DOM ───────────────────────────────────────────────
    function buildUI() {
        if (_containerEl) return;
        injectStyles();

        _containerEl = document.createElement('div');
        _containerEl.className = 'lmtr-wrap';

        _ringEl = document.createElement('div');
        _ringEl.className = 'lmtr-ring';

        _pctEl = document.createElement('span');
        _pctEl.className = 'lmtr-pct';
        _pctEl.textContent = '0%';

        _labelEl = document.createElement('span');
        _labelEl.className = 'lmtr-label';
        _labelEl.textContent = 'Lucky Meter';

        _ringEl.appendChild(_pctEl);
        _containerEl.appendChild(_ringEl);
        _containerEl.appendChild(_labelEl);
        document.body.appendChild(_containerEl);

        renderRing(_fill);
    }

    // ── Ring rendering (conic-gradient) ─────────────────────────
    function renderRing(pct) {
        if (!_ringEl) return;
        var clamped = Math.min(100, Math.max(0, pct));
        var color = ringColor(clamped);
        var deg = (clamped / 100) * 360;
        var bg = 'conic-gradient(' +
            color + ' 0deg, ' +
            color + ' ' + deg + 'deg, ' +
            'rgba(255,255,255,.12) ' + deg + 'deg, ' +
            'rgba(255,255,255,.12) 360deg)';

        // Create a ring effect using mask
        var innerRadius = ((SIZE / 2) - RING_WIDTH);
        var maskCircle = 'radial-gradient(circle, transparent ' + innerRadius + 'px, #000 ' + (innerRadius + 1) + 'px)';
        _ringEl.style.background = bg;
        _ringEl.style.webkitMaskImage = maskCircle;
        _ringEl.style.maskImage = maskCircle;

        // Center background for percentage text
        _pctEl.textContent = Math.floor(clamped) + '%';

        // Glow class toggle
        if (clamped >= GLOW_THRESHOLD && !_exploding) {
            _ringEl.classList.add('lmtr-glow');
        } else {
            _ringEl.classList.remove('lmtr-glow');
        }
    }

    // ── Animated fill ───────────────────────────────────────────
    function animateFill(fromPct, toPct, cb) {
        if (_animFrame) cancelAnimationFrame(_animFrame);
        var start = performance.now();
        var duration = ANIM_DURATION_MS;
        function step(now) {
            var elapsed = now - start;
            var t = Math.min(1, elapsed / duration);
            // Ease out cubic
            var ease = 1 - Math.pow(1 - t, 3);
            var current = fromPct + (toPct - fromPct) * ease;
            renderRing(current);
            if (t < 1) {
                _animFrame = requestAnimationFrame(step);
            } else {
                _animFrame = null;
                if (cb) cb();
            }
        }
        _animFrame = requestAnimationFrame(step);
    }

    // ── Spark particles on increment ────────────────────────────
    function emitSparks() {
        if (!_ringEl) return;
        var count = 5 + Math.floor(Math.random() * 4);
        for (var i = 0; i < count; i++) {
            var spark = document.createElement('span');
            spark.className = 'lmtr-spark';
            var angle = Math.random() * Math.PI * 2;
            var dist = 20 + Math.random() * 18;
            spark.style.setProperty('--sx', Math.cos(angle) * dist + 'px');
            spark.style.setProperty('--sy', Math.sin(angle) * dist + 'px');
            spark.style.left = (SIZE / 2 - 2) + 'px';
            spark.style.top = (SIZE / 2 - 2) + 'px';
            var colors = [COLOR_GOLD, COLOR_PURPLE, COLOR_BLUE, '#fff'];
            spark.style.background = colors[Math.floor(Math.random() * colors.length)];
            spark.style.animationDuration = (0.5 + Math.random() * 0.4) + 's';
            _ringEl.appendChild(spark);
            (function(el) {
                setTimeout(function() {
                    if (el.parentNode) el.parentNode.removeChild(el);
                }, 1000);
            })(spark);
        }
    }

    // ── Explosion + overlay ─────────────────────────────────────
    function triggerBonus() {
        if (_exploding) return;
        _exploding = true;

        // Determine bonus amount
        var bonusAmt = Math.round(rand(BONUS_MIN, BONUS_MAX) * 100) / 100;

        // Explode the ring
        _ringEl.classList.remove('lmtr-glow');
        _ringEl.classList.add('lmtr-explode');
        _ringEl.classList.add('lmtr-burst');
        emitSparks();
        emitSparks(); // double burst

        // Build overlay
        var overlay = document.createElement('div');
        overlay.className = 'lmtr-overlay';

        var title = document.createElement('div');
        title.className = 'lmtr-overlay-title';
        title.textContent = 'LUCKY METER FULL!';

        var amount = document.createElement('div');
        amount.className = 'lmtr-overlay-amount';
        var formattedAmt = (typeof formatMoney === 'function')
            ? formatMoney(bonusAmt)
            : '+$' + bonusAmt.toFixed(2);
        amount.textContent = formattedAmt;

        overlay.appendChild(title);
        overlay.appendChild(amount);
        document.body.appendChild(overlay);

        // Show overlay after brief pause
        requestAnimationFrame(function() {
            requestAnimationFrame(function() {
                overlay.classList.add('lmtr-show');
            });
        });

        // Credit the bonus
        if (typeof balance !== 'undefined') balance += bonusAmt;
        if (typeof updateBalance === 'function') updateBalance();
        if (typeof saveBalance === 'function') saveBalance();

        // Stats tracking
        if (typeof stats !== 'undefined') {
            stats.totalWon = (stats.totalWon || 0) + bonusAmt;
            if (typeof saveStats === 'function') saveStats();
        }

        // Show win toast
        if (typeof showWinToast === 'function') {
            showWinToast('Lucky Meter Bonus! +$' + bonusAmt.toFixed(2), 'epic');
        }

        // Reset meter after explosion
        _fill = 0;
        saveState();

        // Cleanup after overlay
        setTimeout(function() {
            overlay.classList.remove('lmtr-show');
            setTimeout(function() {
                if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
            }, 400);

            // Reset ring visual
            _ringEl.classList.remove('lmtr-explode', 'lmtr-burst');
            _ringEl.style.transform = '';
            _ringEl.style.opacity = '';
            _exploding = false;
            renderRing(0);
        }, OVERLAY_MS);
    }

    // ── Increment meter (called per spin) ───────────────────────
    function incrementMeter(isWin) {
        if (_exploding) return;
        buildUI();

        var prevFill = _fill;

        // Base fill from spin
        var baseFill = rand(SPIN_FILL_MIN, SPIN_FILL_MAX);

        // Bonus fill for wins
        var winFill = isWin ? rand(WIN_FILL_MIN, WIN_FILL_MAX) : 0;

        _fill = Math.min(100, _fill + baseFill + winFill);
        saveState();

        // Visual bump
        _ringEl.classList.add('lmtr-fill-flash');
        setTimeout(function() {
            _ringEl.classList.remove('lmtr-fill-flash');
        }, 400);

        // Animate the fill
        animateFill(prevFill, _fill, function() {
            // Check for 100% threshold
            if (_fill >= 100) {
                setTimeout(function() {
                    triggerBonus();
                }, 200);
            }
        });

        // Emit sparks on high fills
        if (_fill >= 50) {
            emitSparks();
        }
    }

    // ── Visibility toggle (hide in lobby, show in slot) ─────────
    function showMeter() {
        buildUI();
        _containerEl.classList.remove('lmtr-hidden');
    }

    function hideMeter() {
        if (_containerEl) {
            _containerEl.classList.add('lmtr-hidden');
        }
    }

    // ── Hook into displayServerWinResult ────────────────────────
    function hookDisplayResult() {
        if (typeof displayServerWinResult !== 'function') {
            // Retry once after a short delay (load-order tolerance)
            setTimeout(function() {
                if (typeof displayServerWinResult === 'function') {
                    patchDisplayResult();
                }
            }, 2000);
            return;
        }
        patchDisplayResult();
    }

    function patchDisplayResult() {
        var _origDSWR_lmtr = displayServerWinResult;
        displayServerWinResult = function(result, game) {
            _origDSWR_lmtr(result, game);
            // Determine if the spin was a win
            var isWin = result && result.winAmount > 0;
            incrementMeter(isWin);
        };
    }

    // ── Init ────────────────────────────────────────────────────
    function init() {
        loadState();
        buildUI();
        renderRing(_fill);

        // Start hidden — show when in a slot game
        if (typeof currentGame === 'undefined' || !currentGame) {
            hideMeter();
        }

        hookDisplayResult();

        // Listen for game open/close to toggle visibility
        // Use a periodic check since openSlot/exitToLobby are in global scope
        var _lastGameState = !!(typeof currentGame !== 'undefined' && currentGame);
        setInterval(function() {
            var inGame = !!(typeof currentGame !== 'undefined' && currentGame);
            if (inGame !== _lastGameState) {
                _lastGameState = inGame;
                if (inGame) {
                    showMeter();
                } else {
                    hideMeter();
                }
            }
        }, 500);
    }

    // ── Bootstrap ───────────────────────────────────────────────
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // ── Public API (for QA / debugging) ─────────────────────────
    window._luckyMeter = {
        getFill: function() { return _fill; },
        setFill: function(v) {
            _fill = Math.min(100, Math.max(0, v));
            saveState();
            renderRing(_fill);
        },
        increment: incrementMeter,
        triggerBonus: triggerBonus,
        show: showMeter,
        hide: hideMeter
    };

}());
