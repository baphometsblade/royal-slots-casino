// =====================================================================
// UI-MYSTERYBOX MODULE — Mystery Box Rewards System
// =====================================================================
//
// Self-contained IIFE. After every 15-25 spins (randomized), a mystery
// box slides in from the right. Tap to open for a bonus credit reward.
// Box auto-dismisses after 10 seconds if not clicked (urgency mechanic).
//
// Depends on globals: balance, updateBalance(), saveBalance(),
//   showWinToast(), formatMoney(), spinning, currentUser
//
// Hooks: window.displayServerWinResult (counts every spin result)
//
// localStorage key: mysteryBoxState
// CSS prefix: .mbox- / #mbox
// =====================================================================

(function() {
    'use strict';

    // ── Config ────────────────────────────────────────────────────
    var MIN_SPINS        = 15;       // minimum spins between boxes
    var MAX_SPINS        = 25;       // maximum spins between boxes
    var DISMISS_MS       = 10000;    // auto-dismiss after 10 seconds
    var SHAKE_MS         = 500;      // shake duration before reveal
    var REVEAL_DISPLAY   = 3000;     // show reward text for 3 seconds
    var COOLDOWN_MS      = 180000;   // 3 minute cooldown between boxes
    var STORAGE_KEY      = 'mysteryBoxState';

    // Reward tiers (weighted random selection)
    var REWARD_TIERS = [
        { name: 'small',   min: 0.25, max: 1.00,  weight: 50, color: '#22c55e', label: 'SMALL BONUS'   },
        { name: 'medium',  min: 1.00, max: 5.00,  weight: 30, color: '#3b82f6', label: 'MEDIUM BONUS'  },
        { name: 'large',   min: 5.00, max: 15.00, weight: 15, color: '#a855f7', label: 'LARGE BONUS'   },
        { name: 'jackpot', min: 15.00, max: 50.00, weight: 5,  color: '#f59e0b', label: 'JACKPOT BONUS' }
    ];

    // ── State ─────────────────────────────────────────────────────
    var _spinCount       = 0;
    var _nextThreshold   = 0;
    var _totalOpened     = 0;
    var _lastBoxTime     = 0;
    var _boxVisible      = false;
    var _boxOpened       = false;
    var _dismissTimer    = null;
    var _containerEl     = null;
    var _stylesInjected  = false;
    var _origDSWR        = null;

    // ── QA Suppression ────────────────────────────────────────────
    function isSuppressed() {
        var search = window.location.search || '';
        return search.indexOf('noBonus=1') !== -1 || search.indexOf('qaTools=1') !== -1;
    }

    // ── Persistence ───────────────────────────────────────────────
    function loadState() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                var parsed = JSON.parse(raw);
                _spinCount   = parsed.spinCount   || 0;
                _totalOpened = parsed.totalOpened  || 0;
                _lastBoxTime = parsed.lastBoxTime  || 0;
            }
        } catch (e) { /* keep defaults */ }
        _nextThreshold = randomBetween(MIN_SPINS, MAX_SPINS);
    }

    function saveState() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                spinCount:   _spinCount,
                totalOpened: _totalOpened,
                lastBoxTime: _lastBoxTime
            }));
        } catch (e) { /* quota exceeded — silent */ }
    }

    // ── Utility ───────────────────────────────────────────────────
    function randomBetween(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function pickReward() {
        var totalWeight = 0;
        for (var i = 0; i < REWARD_TIERS.length; i++) {
            totalWeight += REWARD_TIERS[i].weight;
        }
        var roll = Math.random() * totalWeight;
        var cumulative = 0;
        for (var j = 0; j < REWARD_TIERS.length; j++) {
            cumulative += REWARD_TIERS[j].weight;
            if (roll < cumulative) {
                var tier = REWARD_TIERS[j];
                var amount = tier.min + Math.random() * (tier.max - tier.min);
                amount = Math.round(amount * 100) / 100;
                return { tier: tier, amount: amount };
            }
        }
        // Fallback to first tier
        var fallback = REWARD_TIERS[0];
        return { tier: fallback, amount: fallback.min };
    }

    function fmtMoney(val) {
        if (typeof formatMoney === 'function') return formatMoney(val);
        return '$' + val.toFixed(2);
    }

    // ── CSS Injection ─────────────────────────────────────────────
    function injectStyles() {
        if (_stylesInjected) return;
        _stylesInjected = true;

        var s = document.createElement('style');
        s.id = 'mysteryBoxStyles';
        s.textContent = [
            // Container
            '#mboxContainer{position:fixed;top:50%;right:20px;transform:translateY(-50%) translateX(140%);' +
                'z-index:25000;pointer-events:none;transition:transform .5s cubic-bezier(.34,1.56,.64,1),' +
                'opacity .4s ease}',
            '#mboxContainer.mbox-visible{transform:translateY(-50%) translateX(0);pointer-events:auto}',
            '#mboxContainer.mbox-fadeout{transform:translateY(-50%) translateX(140%);opacity:0;' +
                'transition:transform .4s ease-in,opacity .4s ease-in;pointer-events:none}',

            // Card
            '.mbox-card{background:linear-gradient(145deg,#1a1a2e,#16213e);' +
                'border:2px solid #f59e0b;border-radius:16px;padding:20px 24px;' +
                'text-align:center;cursor:pointer;user-select:none;min-width:180px;' +
                'box-shadow:0 0 30px rgba(245,158,11,.3),0 8px 32px rgba(0,0,0,.6);' +
                'position:relative;overflow:hidden}',
            '.mbox-card::before{content:"";position:absolute;top:-50%;left:-50%;' +
                'width:200%;height:200%;' +
                'background:conic-gradient(from 0deg,transparent,rgba(245,158,11,.15),transparent,rgba(245,158,11,.1),transparent);' +
                'animation:mbox-cardSweep 3s linear infinite}',
            '@keyframes mbox-cardSweep{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}',

            // Outer glow pulse
            '.mbox-glow{position:absolute;top:-4px;left:-4px;right:-4px;bottom:-4px;' +
                'border-radius:18px;border:2px solid rgba(245,158,11,.4);' +
                'animation:mbox-glowPulse 1.5s ease-in-out infinite;pointer-events:none}',
            '@keyframes mbox-glowPulse{0%,100%{box-shadow:0 0 12px rgba(245,158,11,.3),' +
                '0 0 24px rgba(245,158,11,.1);opacity:.8}' +
                '50%{box-shadow:0 0 20px rgba(245,158,11,.5),' +
                '0 0 40px rgba(245,158,11,.2);opacity:1}}',

            // Gift icon
            '.mbox-gift{font-size:48px;line-height:1;position:relative;z-index:1;' +
                'animation:mbox-giftBob 1.2s ease-in-out infinite;' +
                'filter:drop-shadow(0 2px 8px rgba(245,158,11,.4))}',
            '@keyframes mbox-giftBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}',

            // Header text
            '.mbox-header{font-size:14px;font-weight:900;color:#f59e0b;letter-spacing:2px;' +
                'text-transform:uppercase;margin-top:10px;position:relative;z-index:1;' +
                'text-shadow:0 0 10px rgba(245,158,11,.5)}',

            // Subtitle
            '.mbox-subtitle{font-size:11px;color:rgba(255,255,255,.6);margin-top:6px;' +
                'position:relative;z-index:1;animation:mbox-subtitlePulse 1.5s ease-in-out infinite}',
            '@keyframes mbox-subtitlePulse{0%,100%{opacity:.6}50%{opacity:1}}',

            // Timer bar
            '.mbox-timer-bar{height:3px;background:rgba(255,255,255,.1);border-radius:2px;' +
                'margin-top:12px;overflow:hidden;position:relative;z-index:1}',
            '.mbox-timer-fill{height:100%;background:linear-gradient(90deg,#f59e0b,#ef4444);' +
                'border-radius:2px;width:100%;transition:width .1s linear}',

            // Shake animation
            '.mbox-shake .mbox-gift{animation:mbox-shakeAnim .1s ease-in-out infinite}',
            '@keyframes mbox-shakeAnim{' +
                '0%,100%{transform:translateX(0) rotate(0)}' +
                '25%{transform:translateX(-4px) rotate(-5deg)}' +
                '75%{transform:translateX(4px) rotate(5deg)}}',

            // Reward reveal
            '.mbox-reward{position:relative;z-index:1;opacity:0;transform:scale(.5);' +
                'transition:opacity .4s ease,transform .4s cubic-bezier(.34,1.56,.64,1)}',
            '.mbox-reward.mbox-show{opacity:1;transform:scale(1)}',
            '.mbox-reward-amount{font-size:28px;font-weight:900;line-height:1.2;' +
                'text-shadow:0 2px 12px rgba(0,0,0,.5)}',
            '.mbox-reward-label{font-size:11px;font-weight:700;letter-spacing:1.5px;' +
                'text-transform:uppercase;margin-top:4px;opacity:.8}',
            '.mbox-reward-msg{font-size:10px;color:rgba(255,255,255,.5);margin-top:6px}',

            // Jackpot special animation
            '.mbox-jackpot .mbox-reward-amount{animation:mbox-jackpotGlow 1s ease-in-out infinite}',
            '@keyframes mbox-jackpotGlow{0%,100%{text-shadow:0 0 10px rgba(245,158,11,.6),' +
                '0 0 20px rgba(245,158,11,.3),0 2px 12px rgba(0,0,0,.5)}' +
                '50%{text-shadow:0 0 20px rgba(245,158,11,.9),' +
                '0 0 40px rgba(245,158,11,.5),0 2px 12px rgba(0,0,0,.5)}}',

            // Burst particles (CSS-only)
            '.mbox-burst{position:absolute;top:50%;left:50%;width:0;height:0;z-index:0}',
            '.mbox-burst-dot{position:absolute;width:6px;height:6px;border-radius:50%;' +
                'animation:mbox-burstOut .8s ease-out forwards;opacity:0}',
            '@keyframes mbox-burstOut{0%{transform:translate(0,0) scale(0);opacity:1}' +
                '80%{opacity:1}100%{transform:translate(var(--bx),var(--by)) scale(0);opacity:0}}',

            // Counter badge
            '.mbox-count{position:absolute;top:6px;right:8px;font-size:9px;color:rgba(255,255,255,.3);' +
                'z-index:1;pointer-events:none}'
        ].join('\n');
        document.head.appendChild(s);
    }

    // ── DOM Construction ──────────────────────────────────────────
    function buildContainer() {
        if (_containerEl) return _containerEl;

        var container = document.createElement('div');
        container.id = 'mboxContainer';

        var card = document.createElement('div');
        card.className = 'mbox-card';

        // Glow border
        var glow = document.createElement('div');
        glow.className = 'mbox-glow';
        card.appendChild(glow);

        // Gift emoji
        var gift = document.createElement('div');
        gift.className = 'mbox-gift';
        gift.textContent = '\uD83C\uDF81';
        card.appendChild(gift);

        // Header
        var header = document.createElement('div');
        header.className = 'mbox-header';
        header.textContent = 'MYSTERY BOX!';
        card.appendChild(header);

        // Subtitle
        var subtitle = document.createElement('div');
        subtitle.className = 'mbox-subtitle';
        subtitle.textContent = 'TAP TO OPEN';
        card.appendChild(subtitle);

        // Timer bar
        var timerBar = document.createElement('div');
        timerBar.className = 'mbox-timer-bar';
        var timerFill = document.createElement('div');
        timerFill.className = 'mbox-timer-fill';
        timerBar.appendChild(timerFill);
        card.appendChild(timerBar);

        // Reward (hidden initially)
        var reward = document.createElement('div');
        reward.className = 'mbox-reward';
        var rewardAmount = document.createElement('div');
        rewardAmount.className = 'mbox-reward-amount';
        var rewardLabel = document.createElement('div');
        rewardLabel.className = 'mbox-reward-label';
        var rewardMsg = document.createElement('div');
        rewardMsg.className = 'mbox-reward-msg';
        rewardMsg.textContent = 'Added to balance!';
        reward.appendChild(rewardAmount);
        reward.appendChild(rewardLabel);
        reward.appendChild(rewardMsg);
        card.appendChild(reward);

        // Burst container (particles on open)
        var burst = document.createElement('div');
        burst.className = 'mbox-burst';
        card.appendChild(burst);

        // Total opened counter
        var count = document.createElement('div');
        count.className = 'mbox-count';
        card.appendChild(count);

        container.appendChild(card);
        document.body.appendChild(container);
        _containerEl = container;

        // Click handler
        card.addEventListener('click', function(e) {
            e.stopPropagation();
            if (!_boxVisible || _boxOpened) return;
            openBox();
        });

        return container;
    }

    // ── Show Box ──────────────────────────────────────────────────
    function showBox() {
        if (_boxVisible || _boxOpened) return;
        if (isSuppressed()) return;

        // Cooldown enforcement
        var now = Date.now();
        if (now - _lastBoxTime < COOLDOWN_MS && _lastBoxTime > 0) return;

        injectStyles();
        var container = buildContainer();

        // Update counter display
        var countEl = container.querySelector('.mbox-count');
        if (countEl) {
            countEl.textContent = _totalOpened > 0 ? ('#' + (_totalOpened + 1)) : '';
        }

        // Reset card to initial state
        var card = container.querySelector('.mbox-card');
        card.classList.remove('mbox-shake');

        var gift    = container.querySelector('.mbox-gift');
        var header  = container.querySelector('.mbox-header');
        var sub     = container.querySelector('.mbox-subtitle');
        var tBar    = container.querySelector('.mbox-timer-bar');
        var reward  = container.querySelector('.mbox-reward');

        gift.style.display    = '';
        header.style.display  = '';
        sub.style.display     = '';
        tBar.style.display    = '';
        reward.classList.remove('mbox-show');
        reward.style.display  = 'none';
        card.classList.remove('mbox-jackpot');

        // Clear old burst dots
        var burstEl = container.querySelector('.mbox-burst');
        while (burstEl.firstChild) burstEl.removeChild(burstEl.firstChild);

        // Slide in
        container.classList.remove('mbox-fadeout');
        _boxVisible = true;
        _boxOpened  = false;

        // Force reflow then add visible class
        void container.offsetWidth;
        container.classList.add('mbox-visible');

        // Start dismiss countdown with timer bar
        startDismissTimer(container);
    }

    // ── Dismiss Timer (10s countdown with visual bar) ─────────────
    function startDismissTimer(container) {
        clearDismissTimer();

        var fill = container.querySelector('.mbox-timer-fill');
        var startTime = Date.now();

        // Animate the timer bar
        var tickId = setInterval(function() {
            var elapsed = Date.now() - startTime;
            var pct = Math.max(0, 1 - elapsed / DISMISS_MS);
            if (fill) fill.style.width = (pct * 100) + '%';
            if (elapsed >= DISMISS_MS) {
                clearInterval(tickId);
            }
        }, 50);

        _dismissTimer = setTimeout(function() {
            clearInterval(tickId);
            if (_boxVisible && !_boxOpened) {
                dismissBox();
            }
        }, DISMISS_MS);

        // Store interval ID for cleanup
        _dismissTimer._tickId = tickId;
    }

    function clearDismissTimer() {
        if (_dismissTimer) {
            clearTimeout(_dismissTimer);
            if (_dismissTimer._tickId) clearInterval(_dismissTimer._tickId);
            _dismissTimer = null;
        }
    }

    // ── Dismiss Box (fade out) ────────────────────────────────────
    function dismissBox() {
        if (!_containerEl) return;
        clearDismissTimer();
        _containerEl.classList.remove('mbox-visible');
        _containerEl.classList.add('mbox-fadeout');
        _boxVisible = false;
        _boxOpened  = false;

        // Reset spin tracking for next box
        _spinCount = 0;
        _nextThreshold = randomBetween(MIN_SPINS, MAX_SPINS);
        saveState();
    }

    // ── Open Box ──────────────────────────────────────────────────
    function openBox() {
        if (_boxOpened || !_boxVisible) return;
        _boxOpened = true;
        clearDismissTimer();

        var container = _containerEl;
        var card      = container.querySelector('.mbox-card');
        var gift      = container.querySelector('.mbox-gift');
        var header    = container.querySelector('.mbox-header');
        var sub       = container.querySelector('.mbox-subtitle');
        var tBar      = container.querySelector('.mbox-timer-bar');
        var reward    = container.querySelector('.mbox-reward');
        var amountEl  = container.querySelector('.mbox-reward-amount');
        var labelEl   = container.querySelector('.mbox-reward-label');
        var burstEl   = container.querySelector('.mbox-burst');

        // Phase 1: Shake
        card.classList.add('mbox-shake');

        setTimeout(function() {
            // Phase 2: Reveal
            card.classList.remove('mbox-shake');

            // Pick reward
            var result = pickReward();
            var tier   = result.tier;
            var amount = result.amount;

            // Hide initial elements
            gift.style.display   = 'none';
            header.style.display = 'none';
            sub.style.display    = 'none';
            tBar.style.display   = 'none';

            // Set reward display
            amountEl.textContent = '+' + fmtMoney(amount);
            amountEl.style.color = tier.color;
            labelEl.textContent  = tier.label;
            labelEl.style.color  = tier.color;

            // Jackpot special treatment
            if (tier.name === 'jackpot') {
                card.classList.add('mbox-jackpot');
                card.style.borderColor = '#f59e0b';
                card.style.boxShadow   = '0 0 40px rgba(245,158,11,.5),0 8px 32px rgba(0,0,0,.6)';
            }

            // Show reward with scale animation
            reward.style.display = '';
            void reward.offsetWidth;
            reward.classList.add('mbox-show');

            // Burst particles
            spawnBurstParticles(burstEl, tier.color);

            // Credit the balance
            creditReward(amount);

            // Toast notification
            if (typeof showWinToast === 'function') {
                showWinToast('Mystery Box: +' + fmtMoney(amount), tier.name === 'jackpot' ? 'epic' : 'big');
            }

            // Update tracking
            _totalOpened++;
            _lastBoxTime = Date.now();
            _spinCount   = 0;
            _nextThreshold = randomBetween(MIN_SPINS, MAX_SPINS);
            saveState();

            // Auto-dismiss after reward display
            setTimeout(function() {
                dismissBox();
            }, REVEAL_DISPLAY);

        }, SHAKE_MS);
    }

    // ── Burst Particles (CSS-only) ────────────────────────────────
    function spawnBurstParticles(burstEl, color) {
        while (burstEl.firstChild) burstEl.removeChild(burstEl.firstChild);

        var count = 12;
        for (var i = 0; i < count; i++) {
            var dot = document.createElement('div');
            dot.className = 'mbox-burst-dot';
            var angle = (Math.PI * 2 / count) * i;
            var dist  = 40 + Math.random() * 30;
            var bx    = Math.cos(angle) * dist;
            var by    = Math.sin(angle) * dist;
            dot.style.setProperty('--bx', bx + 'px');
            dot.style.setProperty('--by', by + 'px');
            dot.style.background = color;
            dot.style.animationDelay = (Math.random() * 0.15) + 's';
            burstEl.appendChild(dot);
        }
    }

    // ── Credit Reward ─────────────────────────────────────────────
    function creditReward(amount) {
        if (typeof balance !== 'undefined') {
            balance += amount;
        }
        if (typeof updateBalance === 'function') {
            updateBalance();
        }
        if (typeof saveBalance === 'function') {
            saveBalance();
        }
    }

    // ── Spin Hook ─────────────────────────────────────────────────
    function hookSpinResult() {
        _origDSWR = window.displayServerWinResult;
        if (typeof _origDSWR !== 'function') return;

        window.displayServerWinResult = function(result, game) {
            // Call original first
            _origDSWR.call(this, result, game);

            // Count this spin regardless of win/loss
            onSpinCompleted();
        };
    }

    function onSpinCompleted() {
        if (isSuppressed()) return;
        if (_boxVisible) return;          // don't stack boxes
        if (typeof currentUser === 'undefined' || !currentUser) return;

        _spinCount++;
        saveState();

        // Check if threshold reached
        if (_spinCount >= _nextThreshold) {
            // Enforce cooldown
            var now = Date.now();
            if (_lastBoxTime > 0 && now - _lastBoxTime < COOLDOWN_MS) return;
            showBox();
        }
    }

    // ── Init ──────────────────────────────────────────────────────
    function initMysteryBox() {
        if (isSuppressed()) return;

        loadState();
        hookSpinResult();
    }

    // ── Bootstrap ─────────────────────────────────────────────────
    // Run on DOMContentLoaded (or immediately if already loaded)
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initMysteryBox);
    } else {
        initMysteryBox();
    }

    // Expose for external integration / testing
    window.initMysteryBox = initMysteryBox;

}());
