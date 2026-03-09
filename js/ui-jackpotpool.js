// Sprint 84: Progressive Jackpot Pool
// Three-tier progressive jackpots (MINI / MAJOR / MEGA) that grow over time.
// Ticker bar shown at the top of the lobby with rolling counter animations.
// On each spin, a tiny chance to hit a jackpot — full-screen celebration overlay.
// Values persist in localStorage; ticker hides when a slot is open.
(function() {
    'use strict';

    // ── Config ────────────────────────────────────────────────
    var TIERS = [
        {
            key: 'mini',
            label: 'MINI',
            color: '#22c55e',
            glow: 'rgba(34,197,94,0.5)',
            seed: 50,
            growMin: 0.01,
            growMax: 0.05,
            hitMin: 75,
            hitMax: 100,
            odds: 500          // 1 in 500 per spin
        },
        {
            key: 'major',
            label: 'MAJOR',
            color: '#3b82f6',
            glow: 'rgba(59,130,246,0.5)',
            seed: 500,
            growMin: 0.05,
            growMax: 0.25,
            hitMin: 750,
            hitMax: 1500,
            odds: 5000          // 1 in 5000 per spin
        },
        {
            key: 'mega',
            label: 'MEGA',
            color: '#a855f7',
            glow: 'rgba(168,85,247,0.5)',
            seed: 5000,
            growMin: 0.10,
            growMax: 0.50,
            hitMin: 8000,
            hitMax: 15000,
            odds: 50000          // 1 in 50000 per spin
        }
    ];

    var TICK_INTERVAL_MS   = 2500;   // grow every 2.5s
    var COUNTER_ANIM_MS    = 800;    // digit roll duration
    var STORAGE_KEY        = 'jackpotPoolState';
    var CELEBRATION_DURATION_MS = 8000;

    // ── State ─────────────────────────────────────────────────
    var _pools = {};            // { mini: 50.00, major: 500.00, mega: 5000.00 }
    var _tickTimer = null;
    var _stylesInjected = false;
    var _barEl = null;
    var _digitEls = {};         // { mini: el, major: el, mega: el }
    var _animFrames = {};       // running animation frames per tier
    var _celebrationEl = null;
    var _visibilityInterval = null;

    // ── QA Suppression ───────────────────────────────────────
    function isSuppressed() {
        var qs = window.location.search || '';
        return qs.indexOf('noBonus=1') !== -1 || qs.indexOf('qaTools=1') !== -1;
    }

    // ── Persistence ──────────────────────────────────────────
    function loadPools() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                var parsed = JSON.parse(raw);
                for (var i = 0; i < TIERS.length; i++) {
                    var t = TIERS[i];
                    _pools[t.key] = (typeof parsed[t.key] === 'number' && parsed[t.key] >= t.seed)
                        ? parsed[t.key]
                        : t.seed;
                }
                return;
            }
        } catch (e) { /* ignore */ }
        // Default seed values
        for (var j = 0; j < TIERS.length; j++) {
            _pools[TIERS[j].key] = TIERS[j].seed;
        }
    }

    function savePools() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(_pools));
        } catch (e) { /* ignore */ }
    }

    // ── Number formatting ────────────────────────────────────
    function formatMoney(val) {
        var parts = val.toFixed(2).split('.');
        var intPart = parts[0];
        var decPart = parts[1];
        // Add commas
        var formatted = '';
        var count = 0;
        for (var i = intPart.length - 1; i >= 0; i--) {
            if (count > 0 && count % 3 === 0) formatted = ',' + formatted;
            formatted = intPart[i] + formatted;
            count++;
        }
        return '$' + formatted + '.' + decPart;
    }

    // ── Styles ────────────────────────────────────────────────
    function injectStyles() {
        if (_stylesInjected) return;
        _stylesInjected = true;
        var s = document.createElement('style');
        s.id = 'jpPoolStyles';
        s.textContent = [
            /* ── Ticker bar ── */
            '#jpBar{position:fixed;top:0;left:0;right:0;z-index:10400;height:42px;' +
                'background:linear-gradient(135deg,#1a1500 0%,#3d2e00 30%,#614a00 60%,#3d2e00 100%);' +
                'border-bottom:2px solid rgba(255,215,0,.35);' +
                'display:flex;align-items:center;justify-content:center;gap:24px;' +
                'font-family:inherit;box-shadow:0 4px 20px rgba(0,0,0,.5);' +
                'transform:translateY(-100%);transition:transform .4s cubic-bezier(.34,1.56,.64,1);' +
                'user-select:none}',
            '#jpBar.visible{transform:translateY(0)}',

            /* ── Tier cell ── */
            '.jp-tier{display:flex;align-items:center;gap:6px}',
            '.jp-label{font-size:10px;font-weight:900;letter-spacing:1.5px;padding:2px 7px;' +
                'border-radius:4px;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,.5)}',
            '.jp-amount{font-size:15px;font-weight:800;color:#ffd700;letter-spacing:.5px;' +
                'text-shadow:0 0 8px rgba(255,215,0,.3);min-width:90px;text-align:right;' +
                'font-variant-numeric:tabular-nums}',

            /* ── Shimmer on bar ── */
            '#jpBar::after{content:"";position:absolute;top:0;left:-100%;width:60%;height:100%;' +
                'background:linear-gradient(90deg,transparent,rgba(255,215,0,.06),transparent);' +
                'animation:jp-shimmer 4s ease-in-out infinite}',
            '@keyframes jp-shimmer{0%{left:-100%}100%{left:200%}}',

            /* ── Pulse on amount during growth ── */
            '.jp-amount.jp-tick{animation:jp-tick-pulse .3s ease-out}',
            '@keyframes jp-tick-pulse{0%{transform:scale(1.08);color:#fff}100%{transform:scale(1);color:#ffd700}}',

            /* ── Celebration overlay ── */
            '#jpCelebration{position:fixed;inset:0;z-index:10400;background:rgba(0,0,0,.92);' +
                'display:flex;flex-direction:column;align-items:center;justify-content:center;' +
                'padding:24px;box-sizing:border-box;opacity:0;transition:opacity .4s ease;pointer-events:none}',
            '#jpCelebration.active{opacity:1;pointer-events:auto}',
            '.jp-cel-burst{font-size:4rem;margin-bottom:8px;animation:jp-cel-bounce 1s ease-in-out infinite}',
            '@keyframes jp-cel-bounce{0%,100%{transform:scale(1)}50%{transform:scale(1.15)}}',
            '.jp-cel-tier{font-size:16px;font-weight:900;letter-spacing:3px;text-transform:uppercase;margin-bottom:4px}',
            '.jp-cel-title{font-size:32px;font-weight:900;color:#ffd700;letter-spacing:2px;' +
                'text-shadow:0 0 30px rgba(255,215,0,.5);margin-bottom:8px}',
            '.jp-cel-amount{font-size:48px;font-weight:900;color:#fff;letter-spacing:1px;' +
                'text-shadow:0 0 40px rgba(255,255,255,.3);margin-bottom:20px}',
            '.jp-cel-sub{color:rgba(255,255,255,.5);font-size:13px;margin-bottom:24px}',
            '.jp-cel-claim{padding:16px 48px;border:none;border-radius:12px;font-size:18px;font-weight:900;' +
                'color:#fff;cursor:pointer;letter-spacing:1px;transition:opacity .15s;' +
                'box-shadow:0 0 30px rgba(255,215,0,.4)}',
            '.jp-cel-claim:hover{opacity:.88}',

            /* ── Coin rain ── */
            '.jp-coin{position:absolute;font-size:24px;top:-30px;animation:jp-coin-fall linear forwards;pointer-events:none}',
            '@keyframes jp-coin-fall{0%{transform:translateY(0) rotate(0deg);opacity:1}' +
                '80%{opacity:1}100%{transform:translateY(110vh) rotate(720deg);opacity:0}}',

            /* ── Responsive ── */
            '@media(max-width:600px){#jpBar{gap:10px;height:38px}.jp-label{font-size:8px;padding:2px 5px}' +
                '.jp-amount{font-size:12px;min-width:70px}}'
        ].join('\n');
        document.head.appendChild(s);
    }

    // ── Ticker bar DOM ───────────────────────────────────────
    function buildBar() {
        if (_barEl) return;
        injectStyles();
        _barEl = document.createElement('div');
        _barEl.id = 'jpBar';

        for (var i = 0; i < TIERS.length; i++) {
            var t = TIERS[i];
            var cell = document.createElement('div');
            cell.className = 'jp-tier';

            var label = document.createElement('span');
            label.className = 'jp-label';
            label.style.background = t.color;
            label.textContent = t.label;

            var amount = document.createElement('span');
            amount.className = 'jp-amount';
            amount.id = 'jpAmt_' + t.key;
            amount.textContent = formatMoney(_pools[t.key]);

            _digitEls[t.key] = amount;

            cell.appendChild(label);
            cell.appendChild(amount);
            _barEl.appendChild(cell);
        }

        document.body.appendChild(_barEl);
    }

    // ── Animated counter roll ────────────────────────────────
    function animateValue(tierKey, from, to) {
        if (_animFrames[tierKey]) cancelAnimationFrame(_animFrames[tierKey]);
        var el = _digitEls[tierKey];
        if (!el) return;
        var start = performance.now();
        var duration = COUNTER_ANIM_MS;

        function step(now) {
            var elapsed = now - start;
            var progress = Math.min(elapsed / duration, 1);
            // Ease-out cubic
            var eased = 1 - Math.pow(1 - progress, 3);
            var current = from + (to - from) * eased;
            el.textContent = formatMoney(current);
            if (progress < 1) {
                _animFrames[tierKey] = requestAnimationFrame(step);
            } else {
                el.textContent = formatMoney(to);
                _animFrames[tierKey] = null;
                // Pulse class
                el.classList.add('jp-tick');
                setTimeout(function() { el.classList.remove('jp-tick'); }, 350);
            }
        }
        _animFrames[tierKey] = requestAnimationFrame(step);
    }

    // ── Tick: grow pools ─────────────────────────────────────
    function tick() {
        for (var i = 0; i < TIERS.length; i++) {
            var t = TIERS[i];
            var prev = _pools[t.key];
            var grow = t.growMin + Math.random() * (t.growMax - t.growMin);
            grow = Math.round(grow * 100) / 100;
            _pools[t.key] = Math.round((_pools[t.key] + grow) * 100) / 100;

            // Auto-reset if pool drifts above max hit range (safety valve)
            if (_pools[t.key] > t.hitMax * 1.5) {
                _pools[t.key] = t.seed;
            }

            animateValue(t.key, prev, _pools[t.key]);
        }
        savePools();
    }

    function startTicking() {
        if (_tickTimer) return;
        _tickTimer = setInterval(tick, TICK_INTERVAL_MS);
    }

    function stopTicking() {
        if (_tickTimer) { clearInterval(_tickTimer); _tickTimer = null; }
    }

    // ── Visibility: show/hide based on slot modal ────────────
    function updateVisibility() {
        if (!_barEl) return;
        var slotModal = document.getElementById('slotModal');
        var slotOpen = slotModal && slotModal.classList.contains('active');
        if (slotOpen) {
            _barEl.classList.remove('visible');
        } else {
            _barEl.classList.add('visible');
        }
    }

    function startVisibilityWatcher() {
        // Check every 500ms — lightweight, avoids MutationObserver complexity
        _visibilityInterval = setInterval(updateVisibility, 500);
        updateVisibility();
    }

    // ── Celebration overlay ──────────────────────────────────
    function showCelebration(tier, amount) {
        injectStyles();
        // Remove old celebration
        var old = document.getElementById('jpCelebration');
        if (old && old.parentNode) old.parentNode.removeChild(old);

        _celebrationEl = document.createElement('div');
        _celebrationEl.id = 'jpCelebration';

        // Coin rain
        spawnCoinRain(_celebrationEl, 30);

        // Burst emoji
        var burst = document.createElement('div');
        burst.className = 'jp-cel-burst';
        burst.textContent = '\uD83C\uDFC6';

        // Tier label
        var tierLabel = document.createElement('div');
        tierLabel.className = 'jp-cel-tier';
        tierLabel.style.color = tier.color;
        tierLabel.textContent = tier.label + ' JACKPOT';

        // Title
        var title = document.createElement('div');
        title.className = 'jp-cel-title';
        title.textContent = 'JACKPOT WON!';

        // Amount
        var amtEl = document.createElement('div');
        amtEl.className = 'jp-cel-amount';
        amtEl.textContent = formatMoney(amount);

        // Sub text
        var sub = document.createElement('div');
        sub.className = 'jp-cel-sub';
        sub.textContent = 'Congratulations! The jackpot has been added to your balance.';

        // Claim button
        var claimBtn = document.createElement('button');
        claimBtn.className = 'jp-cel-claim';
        claimBtn.style.background = 'linear-gradient(135deg, ' + tier.color + ', #ffd700)';
        claimBtn.textContent = 'COLLECT ' + formatMoney(amount);
        claimBtn.addEventListener('click', function() {
            closeCelebration();
        });

        _celebrationEl.appendChild(burst);
        _celebrationEl.appendChild(tierLabel);
        _celebrationEl.appendChild(title);
        _celebrationEl.appendChild(amtEl);
        _celebrationEl.appendChild(sub);
        _celebrationEl.appendChild(claimBtn);

        // Click backdrop to close
        _celebrationEl.addEventListener('click', function(e) {
            if (e.target === _celebrationEl) closeCelebration();
        });

        document.body.appendChild(_celebrationEl);

        requestAnimationFrame(function() {
            requestAnimationFrame(function() {
                _celebrationEl.classList.add('active');
            });
        });

        // Auto-close after duration
        setTimeout(closeCelebration, CELEBRATION_DURATION_MS);
    }

    function closeCelebration() {
        if (!_celebrationEl) return;
        _celebrationEl.classList.remove('active');
        var el = _celebrationEl;
        _celebrationEl = null;
        setTimeout(function() {
            if (el.parentNode) el.parentNode.removeChild(el);
        }, 500);
    }

    function spawnCoinRain(container, count) {
        var coins = ['\uD83E\uDE99', '\uD83D\uDCB0', '\u2B50', '\uD83D\uDCB5'];
        for (var i = 0; i < count; i++) {
            var coin = document.createElement('span');
            coin.className = 'jp-coin';
            coin.textContent = coins[Math.floor(Math.random() * coins.length)];
            coin.style.left = (Math.random() * 100) + '%';
            coin.style.animationDuration = (2 + Math.random() * 3) + 's';
            coin.style.animationDelay = (Math.random() * 2) + 's';
            coin.style.fontSize = (18 + Math.random() * 16) + 'px';
            container.appendChild(coin);
        }
    }

    // ── Jackpot roll on spin ─────────────────────────────────
    function rollJackpot() {
        for (var i = 0; i < TIERS.length; i++) {
            var t = TIERS[i];
            // Only eligible if pool is within hit range
            if (_pools[t.key] < t.hitMin) continue;
            var roll = Math.random() * t.odds;
            if (roll < 1) {
                // HIT!
                awardJackpot(t);
                return true; // only one jackpot per spin
            }
        }
        return false;
    }

    function awardJackpot(tier) {
        var amount = Math.round(_pools[tier.key] * 100) / 100;

        // Credit balance
        if (typeof balance !== 'undefined') {
            balance += amount;
            balance = Math.round(balance * 100) / 100;
        }
        if (typeof updateBalance === 'function') updateBalance();
        if (typeof saveBalance === 'function') saveBalance();

        // Track in stats
        if (typeof stats !== 'undefined') {
            stats.totalWon = (stats.totalWon || 0) + amount;
            if (typeof saveStats === 'function') saveStats();
        }

        // Reset this tier
        _pools[tier.key] = tier.seed;
        savePools();

        // Update ticker immediately
        var el = _digitEls[tier.key];
        if (el) el.textContent = formatMoney(tier.seed);

        // Show celebration
        showCelebration(tier, amount);

        // Toast
        if (typeof showWinToast === 'function') {
            showWinToast(tier.label + ' JACKPOT! ' + formatMoney(amount), 'epic');
        }

        // Sound
        if (typeof SoundManager !== 'undefined' && typeof SoundManager.playSoundEvent === 'function') {
            SoundManager.playSoundEvent('jackpot');
        }
    }

    // ── Hook into displayServerWinResult ─────────────────────
    function hookWinResult() {
        var _orig = window.displayServerWinResult;
        if (typeof _orig !== 'function') return;

        window.displayServerWinResult = function(result, game) {
            // Call original first
            _orig.call(this, result, game);

            // Skip if suppressed
            if (isSuppressed()) return;

            // Roll for jackpot on every spin (even losses — jackpot is independent)
            // Small delay so it doesn't conflict with win animations
            setTimeout(function() {
                rollJackpot();
            }, 1500);
        };
    }

    // ── Init ──────────────────────────────────────────────────
    function init() {
        if (isSuppressed()) return;

        loadPools();
        buildBar();
        startTicking();
        startVisibilityWatcher();
        hookWinResult();
    }

    // ── Cleanup (for hot-reload safety) ──────────────────────
    window._jpPoolCleanup = function() {
        stopTicking();
        if (_visibilityInterval) { clearInterval(_visibilityInterval); _visibilityInterval = null; }
        if (_barEl && _barEl.parentNode) _barEl.parentNode.removeChild(_barEl);
        _barEl = null;
        _digitEls = {};
    };

    // ── Public API ───────────────────────────────────────────
    window.getJackpotPools = function() {
        return { mini: _pools.mini, major: _pools.major, mega: _pools.mega };
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        setTimeout(init, 0);
    }
}());
