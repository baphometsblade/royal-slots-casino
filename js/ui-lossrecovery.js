// Sprint 80: Loss Recovery Bonus — Comfort offers after losing streaks
// Tracks consecutive losses and offers small "comfort" bonuses to keep
// players engaged. Three tiers (5/8/12 losses) with escalating rewards.
// Self-contained IIFE — wraps displayServerWinResult to detect losses.
(function() {
    'use strict';

    // ── Config ────────────────────────────────────────────────
    var TIER_COMFORT  = { losses: 5,  pct: 0.25, label: 'COMFORT BONUS',  emoji: '\uD83D\uDC9A', color: '#22c55e', glowColor: 'rgba(34,197,94,0.35)',  msg: 'Everyone hits a rough patch!' };
    var TIER_RECOVERY = { losses: 8,  pct: 0.50, label: 'RECOVERY BONUS', emoji: '\uD83D\uDC99', color: '#3b82f6', glowColor: 'rgba(59,130,246,0.35)', msg: 'Hang in there \u2014 your luck is turning!' };
    var TIER_COMEBACK = { losses: 12, pct: 1.00, label: 'COMEBACK BONUS', emoji: '\uD83D\uDC9C', color: '#a855f7', glowColor: 'rgba(168,85,247,0.35)', msg: 'Your luck is about to turn!' };
    var TIERS = [TIER_COMFORT, TIER_RECOVERY, TIER_COMEBACK];

    var MAX_BET_HISTORY     = 10;       // Track last N bets for average
    var COOLDOWN_MS         = 600000;   // 10 min between recovery offers
    var AUTO_DISMISS_MS     = 20000;    // Auto-dismiss after 20s
    var SHOW_DELAY_MS       = 2000;     // Delay after spin to show offer
    var BALANCE_JUMP_LIMIT  = 1000;     // Suppress if balance jumps > $1000
    var STORAGE_KEY         = 'lossRecoveryState';

    // ── State ─────────────────────────────────────────────────
    var _consecutiveLosses = 0;
    var _recentBets        = [];        // last N bet amounts
    var _tiersUsed         = {};        // { 5: true, 8: true, 12: true } — per session
    var _lastOfferTime     = 0;
    var _prevBalance       = null;
    var _stylesInjected    = false;
    var _overlayEl         = null;
    var _dismissTimer      = null;

    // ── QA suppression ───────────────────────────────────────
    function isSuppressed() {
        var search = window.location.search || '';
        return search.indexOf('noBonus=1') !== -1 || search.indexOf('qaTools=1') !== -1;
    }

    // ── Persistence ──────────────────────────────────────────
    function loadState() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                var s = JSON.parse(raw);
                _consecutiveLosses = s.losses || 0;
                _recentBets = Array.isArray(s.bets) ? s.bets : [];
                _lastOfferTime = s.lastOffer || 0;
            }
        } catch (e) { /* ignore */ }
    }

    function saveState() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                losses: _consecutiveLosses,
                bets: _recentBets,
                lastOffer: _lastOfferTime
            }));
        } catch (e) { /* ignore */ }
    }

    // ── Average bet calculation ──────────────────────────────
    function recordBet(amount) {
        if (typeof amount !== 'number' || !isFinite(amount) || amount <= 0) return;
        _recentBets.push(amount);
        if (_recentBets.length > MAX_BET_HISTORY) {
            _recentBets.shift();
        }
    }

    function getAverageBet() {
        if (_recentBets.length === 0) return 1; // fallback $1
        var sum = 0;
        for (var i = 0; i < _recentBets.length; i++) {
            sum += _recentBets[i];
        }
        return sum / _recentBets.length;
    }

    // ── Styles ───────────────────────────────────────────────
    function injectStyles() {
        if (_stylesInjected) return;
        _stylesInjected = true;
        var s = document.createElement('style');
        s.id = 'lossRecoveryStyles';
        s.textContent = [
            '#lrOverlay{position:fixed;inset:0;z-index:28500;background:rgba(0,0,0,.88);' +
                'display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;' +
                'opacity:0;transition:opacity .35s ease}',
            '#lrOverlay.active{opacity:1}',
            '#lrModal{background:linear-gradient(160deg,#0d0d1a,#1a0a2e);' +
                'border-radius:20px;padding:32px 28px;max-width:380px;width:100%;text-align:center;' +
                'transform:scale(.8);transition:transform .45s cubic-bezier(.34,1.56,.64,1)}',
            '#lrOverlay.active #lrModal{transform:scale(1)}',
            '.lr-emoji{font-size:3.2rem;margin-bottom:8px}',
            '.lr-title{font-size:22px;font-weight:900;letter-spacing:1.5px;margin-bottom:4px;' +
                'text-shadow:0 2px 8px rgba(0,0,0,.5)}',
            '.lr-msg{color:rgba(255,255,255,.6);font-size:13px;margin-bottom:16px;line-height:1.4}',
            '.lr-bonus-box{background:rgba(255,215,0,.08);border:1px solid rgba(255,215,0,.3);' +
                'border-radius:12px;padding:16px;margin-bottom:18px}',
            '.lr-bonus-label{font-size:11px;color:rgba(255,255,255,.5);text-transform:uppercase;' +
                'letter-spacing:1px;margin-bottom:4px}',
            '.lr-bonus-amt{color:#ffd700;font-size:28px;font-weight:900;text-shadow:0 0 12px rgba(255,215,0,.3)}',
            '.lr-streak-info{font-size:11px;color:rgba(255,255,255,.35);margin-bottom:16px}',
            '.lr-claim-btn{width:100%;padding:14px;border:none;border-radius:10px;color:#fff;' +
                'font-size:16px;font-weight:900;cursor:pointer;letter-spacing:.5px;margin-bottom:8px;' +
                'transition:opacity .15s}',
            '.lr-claim-btn:hover{opacity:.88}',
            '.lr-dismiss{background:none;border:none;color:rgba(255,255,255,.3);' +
                'font-size:12px;cursor:pointer;text-decoration:underline}',
            '.lr-timer{font-size:10px;color:rgba(255,255,255,.2);margin-top:8px}'
        ].join('\n');
        document.head.appendChild(s);
    }

    // ── Modal UI ─────────────────────────────────────────────
    function showOffer(tier, bonusAmt) {
        injectStyles();

        // Remove any existing overlay
        var old = document.getElementById('lrOverlay');
        if (old && old.parentNode) old.parentNode.removeChild(old);
        if (_dismissTimer) { clearTimeout(_dismissTimer); _dismissTimer = null; }

        var ov = document.createElement('div');
        ov.id = 'lrOverlay';
        _overlayEl = ov;

        var modal = document.createElement('div');
        modal.id = 'lrModal';
        modal.style.borderColor = tier.color;
        modal.style.boxShadow = '0 0 50px ' + tier.glowColor;

        // Emoji
        var emoji = document.createElement('div');
        emoji.className = 'lr-emoji';
        emoji.textContent = tier.emoji;

        // Title
        var title = document.createElement('div');
        title.className = 'lr-title';
        title.style.color = tier.color;
        title.textContent = tier.label + '!';

        // Empathetic message
        var msg = document.createElement('div');
        msg.className = 'lr-msg';
        msg.textContent = tier.msg;

        // Bonus box
        var bonusBox = document.createElement('div');
        bonusBox.className = 'lr-bonus-box';

        var bLabel = document.createElement('div');
        bLabel.className = 'lr-bonus-label';
        bLabel.textContent = 'Free Credits';

        var bAmt = document.createElement('div');
        bAmt.className = 'lr-bonus-amt';
        bAmt.textContent = '+$' + bonusAmt.toFixed(2);

        bonusBox.appendChild(bLabel);
        bonusBox.appendChild(bAmt);

        // Streak info
        var streakInfo = document.createElement('div');
        streakInfo.className = 'lr-streak-info';
        streakInfo.textContent = _consecutiveLosses + ' spins without a win';

        // Claim button
        var claimBtn = document.createElement('button');
        claimBtn.className = 'lr-claim-btn';
        claimBtn.style.background = 'linear-gradient(135deg, ' + tier.color + ', ' + tier.color + 'cc)';
        claimBtn.textContent = '\uD83C\uDF1F Claim Bonus';
        claimBtn.addEventListener('click', function() {
            // Credit the bonus
            if (typeof balance !== 'undefined') balance += bonusAmt;
            if (typeof updateBalance === 'function') updateBalance();
            if (typeof saveBalance === 'function') saveBalance();
            if (typeof stats !== 'undefined') {
                stats.totalWon = (stats.totalWon || 0) + bonusAmt;
                if (typeof saveStats === 'function') saveStats();
            }
            closeOverlay();
            // Toast confirmation
            if (typeof showWinToast === 'function') {
                showWinToast(tier.label + ' +$' + bonusAmt.toFixed(2), 'epic');
            }
        });

        // Dismiss button
        var dismiss = document.createElement('button');
        dismiss.className = 'lr-dismiss';
        dismiss.textContent = 'Skip';
        dismiss.addEventListener('click', function() { closeOverlay(); });

        // Timer text
        var timerEl = document.createElement('div');
        timerEl.className = 'lr-timer';
        var _remaining = Math.floor(AUTO_DISMISS_MS / 1000);
        timerEl.textContent = 'Auto-dismiss in ' + _remaining + 's';

        // Countdown interval for timer display
        var _countdownInterval = setInterval(function() {
            _remaining--;
            if (_remaining <= 0) {
                clearInterval(_countdownInterval);
                return;
            }
            timerEl.textContent = 'Auto-dismiss in ' + _remaining + 's';
        }, 1000);

        // Assemble modal
        modal.appendChild(emoji);
        modal.appendChild(title);
        modal.appendChild(msg);
        modal.appendChild(bonusBox);
        modal.appendChild(streakInfo);
        modal.appendChild(claimBtn);
        modal.appendChild(dismiss);
        modal.appendChild(timerEl);
        ov.appendChild(modal);

        // Click outside to dismiss
        ov.addEventListener('click', function(e) { if (e.target === ov) closeOverlay(); });

        document.body.appendChild(ov);

        // Animate in (double-RAF for layout settling)
        requestAnimationFrame(function() {
            requestAnimationFrame(function() { ov.classList.add('active'); });
        });

        // Auto-dismiss
        _dismissTimer = setTimeout(function() {
            clearInterval(_countdownInterval);
            closeOverlay();
        }, AUTO_DISMISS_MS);
    }

    function closeOverlay() {
        if (_dismissTimer) { clearTimeout(_dismissTimer); _dismissTimer = null; }
        if (!_overlayEl) return;
        _overlayEl.classList.remove('active');
        var el = _overlayEl;
        _overlayEl = null;
        setTimeout(function() { if (el.parentNode) el.parentNode.removeChild(el); }, 450);
    }

    // ── Tier evaluation ──────────────────────────────────────
    function evaluateLossStreak() {
        if (isSuppressed()) return;

        // Cooldown check
        if (Date.now() - _lastOfferTime < COOLDOWN_MS) return;

        // Check tiers from highest to lowest (12, 8, 5)
        for (var i = TIERS.length - 1; i >= 0; i--) {
            var tier = TIERS[i];
            if (_consecutiveLosses >= tier.losses && !_tiersUsed[tier.losses]) {
                // Mark tier as used for this session
                _tiersUsed[tier.losses] = true;
                _lastOfferTime = Date.now();
                saveState();

                // Calculate bonus amount
                var avgBet = getAverageBet();
                var bonusAmt = Math.round(avgBet * tier.pct * 100) / 100;
                if (bonusAmt < 0.10) bonusAmt = 0.10; // minimum $0.10
                if (bonusAmt > 50.00) bonusAmt = 50.00; // cap at $50

                // Delay to let spin animation finish
                (function(t, b) {
                    setTimeout(function() { showOffer(t, b); }, SHOW_DELAY_MS);
                })(tier, bonusAmt);

                break; // only one offer at a time
            }
        }
    }

    // ── Hook into displayServerWinResult ─────────────────────
    function hookWinResult() {
        var _orig = window.displayServerWinResult;
        if (typeof _orig !== 'function') return;

        window.displayServerWinResult = function(result, game) {
            // Call original first
            _orig.call(this, result, game);

            // Record the bet amount
            var bet = (typeof currentBet !== 'undefined') ? currentBet : 1;
            recordBet(bet);

            // Detect win vs loss
            if (result && result.winAmount > 0) {
                // Win — reset loss streak
                _consecutiveLosses = 0;
            } else {
                // Loss — increment streak
                _consecutiveLosses++;
            }
            saveState();

            // Balance jump guard
            if (_prevBalance !== null) {
                var currentBal = (typeof balance !== 'undefined') ? balance : 0;
                if (Math.abs(currentBal - _prevBalance) > BALANCE_JUMP_LIMIT) {
                    // Suspicious jump — reset tracking
                    _consecutiveLosses = 0;
                    _prevBalance = currentBal;
                    saveState();
                    return;
                }
                _prevBalance = currentBal;
            } else {
                _prevBalance = (typeof balance !== 'undefined') ? balance : 0;
            }

            // Only evaluate on losses
            if (!result || result.winAmount <= 0) {
                evaluateLossStreak();
            }
        };
    }

    // ── Init ─────────────────────────────────────────────────
    function init() {
        loadState();
        // Seed initial balance reference
        try {
            var key = (typeof STORAGE_KEY_BALANCE !== 'undefined') ? STORAGE_KEY_BALANCE : 'casinoBalance';
            var raw = localStorage.getItem(key);
            if (raw !== null) _prevBalance = parseFloat(raw);
        } catch (e) { /* ignore */ }
        hookWinResult();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        setTimeout(init, 0);
    }
}());
