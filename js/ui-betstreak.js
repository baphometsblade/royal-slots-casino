// =====================================================================
// BET STREAK BONUS MODULE — Consecutive-Bet Loyalty Multipliers
// =====================================================================
//
// Self-contained IIFE. Tracks consecutive spins where the bet amount
// stays the same or increases. Reaching milestones awards next-win
// multipliers and flat cash bonuses.
//
// Milestones:
//   5 spins  -> 1.1x  next win
//  10 spins  -> 1.25x next win
//  20 spins  -> 1.5x  next win + $1.00 bonus
//  50 spins  -> 2x    next win + $5.00 bonus
//
// Depends on: globals.js (currentBet, balance, formatMoney),
//   ui-modals.js (showToast), ui-slot.js (displayServerWinResult)
//
// Public API (window):
//   _betStreakMultiplier   — multiplier applied to next win (consumed once)
//   getBetStreakInfo()     — { streak, multiplier, lastBet }
//   resetBetStreak()      — force-reset (for QA)
// =====================================================================

(function() {
    'use strict';

    // ── QA Suppression ─────────────────────────────────────────────
    function isQaSuppressed() {
        var qs = window.location.search || '';
        return qs.indexOf('noBonus=1') !== -1 || qs.indexOf('qaTools=1') !== -1;
    }

    // ── Constants ──────────────────────────────────────────────────
    var STORAGE_KEY = 'betStreakState';

    var MILESTONES = [
        { at: 5,  mult: 1.1,  bonus: 0,    flame: '\uD83D\uDD25'                                     },
        { at: 10, mult: 1.25, bonus: 0,    flame: '\uD83D\uDD25\uD83D\uDD25'                         },
        { at: 20, mult: 1.5,  bonus: 1.00, flame: '\uD83D\uDD25\uD83D\uDD25\uD83D\uDD25'             },
        { at: 50, mult: 2.0,  bonus: 5.00, flame: '\uD83D\uDCA5'                                     }
    ];

    var PILL_VISIBLE_THRESHOLD = 3;
    var TOAST_DURATION_MS      = 4500;
    var BROKEN_TOAST_MS        = 2500;
    var GLOW_BASE_OPACITY      = 0.35;
    var GLOW_MAX_OPACITY       = 0.9;
    var GLOW_SCALE_CAP         = 50;   // streak count at which glow maxes out

    // ── State ──────────────────────────────────────────────────────
    var _streak     = 0;
    var _lastBet    = 0;
    var _multiplier = 1;  // pending next-win multiplier
    var _pillEl     = null;
    var _stylesInjected = false;

    // ── Persistence ────────────────────────────────────────────────
    function loadState() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                var parsed = JSON.parse(raw);
                _streak     = typeof parsed.streak === 'number' ? parsed.streak : 0;
                _lastBet    = typeof parsed.lastBet === 'number' ? parsed.lastBet : 0;
                _multiplier = typeof parsed.multiplier === 'number' ? parsed.multiplier : 1;
            }
        } catch (e) { /* keep defaults */ }
    }

    function saveState() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                streak: _streak,
                lastBet: _lastBet,
                multiplier: _multiplier
            }));
        } catch (e) { /* localStorage full — silently ignore */ }
    }

    // ── Style Injection ────────────────────────────────────────────
    function injectStyles() {
        if (_stylesInjected) return;
        _stylesInjected = true;

        var s = document.createElement('style');
        s.id = 'betStreakStyles';
        s.textContent = [
            /* ── Persistent Pill Badge ───────────────── */
            '.bstrk-pill {',
            '    position: fixed;',
            '    top: 12px;',
            '    left: 50%;',
            '    transform: translateX(-50%) scale(0);',
            '    z-index:10400;',
            '    display: flex;',
            '    align-items: center;',
            '    gap: 6px;',
            '    padding: 5px 14px;',
            '    border-radius: 20px;',
            '    background: linear-gradient(135deg, #7c3aed, #ea580c);',
            '    border: 1.5px solid rgba(251, 146, 60, 0.6);',
            '    box-shadow: 0 0 12px rgba(124, 58, 237, 0.4),',
            '                0 4px 14px rgba(0, 0, 0, 0.35);',
            '    font-family: inherit;',
            '    font-size: 13px;',
            '    font-weight: 800;',
            '    color: #fff;',
            '    letter-spacing: 0.6px;',
            '    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);',
            '    white-space: nowrap;',
            '    pointer-events: none;',
            '    opacity: 0;',
            '    transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1),',
            '                opacity 0.35s ease,',
            '                box-shadow 0.3s ease;',
            '}',
            '.bstrk-pill.visible {',
            '    transform: translateX(-50%) scale(1);',
            '    opacity: 1;',
            '}',
            '.bstrk-pill-flame {',
            '    font-size: 15px;',
            '    line-height: 1;',
            '}',
            '.bstrk-pill-text {',
            '    font-variant-numeric: tabular-nums;',
            '}',

            /* ── Milestone Toast ─────────────────────── */
            '.bstrk-toast {',
            '    position: fixed;',
            '    bottom: 80px;',
            '    left: 50%;',
            '    transform: translateX(-50%) translateY(30px) scale(0.85);',
            '    z-index:10400;',
            '    display: flex;',
            '    flex-direction: column;',
            '    align-items: center;',
            '    gap: 4px;',
            '    padding: 14px 24px;',
            '    border-radius: 14px;',
            '    background: linear-gradient(135deg, rgba(124, 58, 237, 0.92), rgba(234, 88, 12, 0.92));',
            '    backdrop-filter: blur(16px);',
            '    -webkit-backdrop-filter: blur(16px);',
            '    border: 1.5px solid rgba(251, 146, 60, 0.55);',
            '    box-shadow: 0 0 32px rgba(124, 58, 237, 0.35),',
            '                0 8px 32px rgba(0, 0, 0, 0.45);',
            '    font-family: inherit;',
            '    color: #fff;',
            '    text-align: center;',
            '    opacity: 0;',
            '    pointer-events: none;',
            '    transition: transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1),',
            '                opacity 0.35s ease;',
            '}',
            '.bstrk-toast.show {',
            '    transform: translateX(-50%) translateY(0) scale(1);',
            '    opacity: 1;',
            '}',
            '.bstrk-toast-flame {',
            '    font-size: 28px;',
            '    line-height: 1;',
            '}',
            '.bstrk-toast-title {',
            '    font-size: 16px;',
            '    font-weight: 900;',
            '    letter-spacing: 1px;',
            '    text-transform: uppercase;',
            '    text-shadow: 0 2px 6px rgba(0, 0, 0, 0.5);',
            '}',
            '.bstrk-toast-mult {',
            '    font-size: 22px;',
            '    font-weight: 900;',
            '    color: #fef3c7;',
            '    text-shadow: 0 0 10px rgba(251, 191, 36, 0.6);',
            '}',
            '.bstrk-toast-bonus {',
            '    font-size: 13px;',
            '    font-weight: 700;',
            '    color: #a5f3fc;',
            '    text-shadow: 0 1px 4px rgba(0, 0, 0, 0.4);',
            '}',

            /* ── Streak Broken Indicator ─────────────── */
            '.bstrk-broken {',
            '    position: fixed;',
            '    bottom: 80px;',
            '    left: 50%;',
            '    transform: translateX(-50%) translateY(20px);',
            '    z-index:10400;',
            '    padding: 8px 18px;',
            '    border-radius: 10px;',
            '    background: rgba(239, 68, 68, 0.85);',
            '    backdrop-filter: blur(10px);',
            '    -webkit-backdrop-filter: blur(10px);',
            '    border: 1px solid rgba(252, 165, 165, 0.5);',
            '    font-family: inherit;',
            '    font-size: 13px;',
            '    font-weight: 700;',
            '    color: #fff;',
            '    letter-spacing: 0.5px;',
            '    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);',
            '    opacity: 0;',
            '    pointer-events: none;',
            '    transition: transform 0.35s ease, opacity 0.3s ease;',
            '}',
            '.bstrk-broken.show {',
            '    transform: translateX(-50%) translateY(0);',
            '    opacity: 1;',
            '}',

            /* ── Pulse animation for high streaks ────── */
            '@keyframes bstrk-pulse {',
            '    0%, 100% { box-shadow: 0 0 12px rgba(124, 58, 237, 0.4), 0 4px 14px rgba(0, 0, 0, 0.35); }',
            '    50% { box-shadow: 0 0 24px rgba(234, 88, 12, 0.6), 0 4px 20px rgba(0, 0, 0, 0.4); }',
            '}',
            '.bstrk-pill.pulse {',
            '    animation: bstrk-pulse 1.8s ease-in-out infinite;',
            '}'
        ].join('\n');

        document.head.appendChild(s);
    }

    // ── Pill Badge (persistent streak indicator) ───────────────────
    function buildPill() {
        if (_pillEl) return;
        injectStyles();

        _pillEl = document.createElement('div');
        _pillEl.className = 'bstrk-pill';

        var flame = document.createElement('span');
        flame.className = 'bstrk-pill-flame';
        flame.textContent = '\uD83D\uDD25';

        var text = document.createElement('span');
        text.className = 'bstrk-pill-text';
        text.textContent = 'Streak: 0';

        _pillEl.appendChild(flame);
        _pillEl.appendChild(text);
        document.body.appendChild(_pillEl);
    }

    function updatePill() {
        buildPill();

        var textEl = _pillEl.querySelector('.bstrk-pill-text');
        var flameEl = _pillEl.querySelector('.bstrk-pill-flame');

        if (_streak >= PILL_VISIBLE_THRESHOLD) {
            if (textEl) textEl.textContent = 'Streak: ' + _streak;

            // Escalate flame emoji based on streak level
            if (flameEl) {
                if (_streak >= 50)      flameEl.textContent = '\uD83D\uDCA5';
                else if (_streak >= 20) flameEl.textContent = '\uD83D\uDD25\uD83D\uDD25\uD83D\uDD25';
                else if (_streak >= 10) flameEl.textContent = '\uD83D\uDD25\uD83D\uDD25';
                else                    flameEl.textContent = '\uD83D\uDD25';
            }

            // Scale glow with streak length
            var glowProgress = Math.min(_streak / GLOW_SCALE_CAP, 1);
            var glowOpacity  = GLOW_BASE_OPACITY + (GLOW_MAX_OPACITY - GLOW_BASE_OPACITY) * glowProgress;
            var purpleGlow   = 'rgba(124, 58, 237, ' + glowOpacity.toFixed(2) + ')';
            var orangeGlow   = 'rgba(234, 88, 12, ' + (glowOpacity * 0.7).toFixed(2) + ')';
            _pillEl.style.boxShadow = '0 0 ' + Math.round(12 + 20 * glowProgress) + 'px ' + purpleGlow +
                ', 0 0 ' + Math.round(8 + 16 * glowProgress) + 'px ' + orangeGlow +
                ', 0 4px 14px rgba(0, 0, 0, 0.35)';

            // Pulse animation for streaks >= 10
            if (_streak >= 10) {
                _pillEl.classList.add('pulse');
            } else {
                _pillEl.classList.remove('pulse');
            }

            // Double-RAF to ensure layout before showing
            if (!_pillEl.classList.contains('visible')) {
                requestAnimationFrame(function() {
                    requestAnimationFrame(function() {
                        if (_pillEl) _pillEl.classList.add('visible');
                    });
                });
            }
        } else {
            _pillEl.classList.remove('visible');
            _pillEl.classList.remove('pulse');
        }
    }

    // ── Milestone Toast ────────────────────────────────────────────
    function showMilestoneToast(milestone) {
        injectStyles();

        var toast = document.createElement('div');
        toast.className = 'bstrk-toast';

        var flameEl = document.createElement('div');
        flameEl.className = 'bstrk-toast-flame';
        flameEl.textContent = milestone.flame;

        var titleEl = document.createElement('div');
        titleEl.className = 'bstrk-toast-title';
        titleEl.textContent = 'Bet Streak \u00D7' + milestone.at + '!';

        var multEl = document.createElement('div');
        multEl.className = 'bstrk-toast-mult';
        multEl.textContent = milestone.mult + '\u00D7 Next Win';

        toast.appendChild(flameEl);
        toast.appendChild(titleEl);
        toast.appendChild(multEl);

        if (milestone.bonus > 0) {
            var bonusEl = document.createElement('div');
            bonusEl.className = 'bstrk-toast-bonus';
            bonusEl.textContent = '+$' + milestone.bonus.toFixed(2) + ' Bonus Credited!';
            toast.appendChild(bonusEl);
        }

        document.body.appendChild(toast);

        // Animate in
        requestAnimationFrame(function() {
            requestAnimationFrame(function() {
                toast.classList.add('show');
            });
        });

        // Animate out and remove
        setTimeout(function() {
            toast.classList.remove('show');
            setTimeout(function() {
                if (toast.parentNode) toast.parentNode.removeChild(toast);
            }, 400);
        }, TOAST_DURATION_MS);
    }

    // ── Streak Broken Indicator ────────────────────────────────────
    function showBrokenIndicator() {
        injectStyles();

        var broken = document.createElement('div');
        broken.className = 'bstrk-broken';
        broken.textContent = 'Streak Broken';

        document.body.appendChild(broken);

        requestAnimationFrame(function() {
            requestAnimationFrame(function() {
                broken.classList.add('show');
            });
        });

        setTimeout(function() {
            broken.classList.remove('show');
            setTimeout(function() {
                if (broken.parentNode) broken.parentNode.removeChild(broken);
            }, 350);
        }, BROKEN_TOAST_MS);
    }

    // ── Core Logic ─────────────────────────────────────────────────
    function getMilestoneAt(count) {
        for (var i = 0; i < MILESTONES.length; i++) {
            if (MILESTONES[i].at === count) return MILESTONES[i];
        }
        return null;
    }

    function creditBonus(amount) {
        if (amount <= 0) return;
        if (typeof balance !== 'undefined' && typeof updateBalance === 'function') {
            balance = (typeof balance === 'number' ? balance : 0) + amount;
            updateBalance();
        }
        if (typeof saveBalance === 'function') saveBalance();
    }

    function recordSpin(betAmount) {
        if (typeof betAmount !== 'number' || !isFinite(betAmount) || betAmount <= 0) return;

        var previousStreak = _streak;

        if (betAmount >= _lastBet || _lastBet === 0) {
            // Bet stayed the same or increased — extend streak
            _streak++;
            _lastBet = betAmount;

            // Check milestones
            var milestone = getMilestoneAt(_streak);
            if (milestone) {
                _multiplier = milestone.mult;
                window._betStreakMultiplier = _multiplier;

                // Credit flat bonus immediately
                if (milestone.bonus > 0) {
                    creditBonus(milestone.bonus);
                }

                // Show milestone toast
                showMilestoneToast(milestone);

                // Also fire a showToast if available for redundancy
                if (typeof showToast === 'function') {
                    var msg = milestone.flame + ' Bet Streak \u00D7' + milestone.at +
                              '! ' + milestone.mult + '\u00D7 next win';
                    if (milestone.bonus > 0) msg += ' + $' + milestone.bonus.toFixed(2);
                    showToast(msg, 'win');
                }
            }
        } else {
            // Bet decreased — break the streak
            if (previousStreak >= PILL_VISIBLE_THRESHOLD) {
                showBrokenIndicator();
            }
            _streak = 1;      // current spin counts as first of new streak
            _lastBet = betAmount;
            _multiplier = 1;
            window._betStreakMultiplier = 1;
        }

        updatePill();
        saveState();
    }

    function consumeMultiplier() {
        // Returns the pending multiplier and resets it to 1
        var m = _multiplier;
        if (m > 1) {
            _multiplier = 1;
            window._betStreakMultiplier = 1;
            saveState();
        }
        return m;
    }

    // ── Hook displayServerWinResult ────────────────────────────────
    function hookWinResult() {
        var _orig = window.displayServerWinResult;
        if (typeof _orig !== 'function') return;

        window.displayServerWinResult = function(result, game) {
            // Record the spin for streak tracking
            var bet = (typeof currentBet !== 'undefined') ? currentBet : 0;
            recordSpin(bet);

            // Apply pending bet-streak multiplier to win
            if (result && result.winAmount > 0) {
                var streakMult = consumeMultiplier();
                if (streakMult > 1) {
                    var bonus = result.winAmount * (streakMult - 1);
                    bonus = Math.round(bonus * 100) / 100;
                    result.winAmount = Math.round((result.winAmount + bonus) * 100) / 100;

                    // Adjust balance in result to reflect bonus
                    if (typeof result.balance === 'number' || typeof result.balance === 'string') {
                        var bal = Number(result.balance);
                        if (Number.isFinite(bal)) {
                            result.balance = bal + bonus;
                        }
                    }

                    // Toast for consumed multiplier
                    if (typeof showToast === 'function') {
                        showToast('\uD83D\uDD25 Bet Streak ' + streakMult + '\u00D7 applied! +$' +
                                  bonus.toFixed(2) + ' bonus!', 'win');
                    }
                }
            } else if (result && result.winAmount === 0) {
                // No win — still count the spin (already recorded above)
                // but do NOT consume the multiplier on a loss
                // (multiplier stays pending for the next actual win)
            }

            // Call original handler
            _orig.call(this, result, game);
        };
    }

    // ── Public API ─────────────────────────────────────────────────
    window._betStreakMultiplier = 1;

    window.getBetStreakInfo = function() {
        return {
            streak: _streak,
            multiplier: _multiplier,
            lastBet: _lastBet
        };
    };

    window.resetBetStreak = function() {
        _streak = 0;
        _lastBet = 0;
        _multiplier = 1;
        window._betStreakMultiplier = 1;
        saveState();
        updatePill();
    };

    // ── Init ───────────────────────────────────────────────────────
    function init() {
        if (isQaSuppressed()) return;

        loadState();

        // Restore window multiplier from persisted state
        if (_multiplier > 1) {
            window._betStreakMultiplier = _multiplier;
        }

        // Build and update the pill badge
        updatePill();

        // Hook into win result pipeline
        hookWinResult();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        setTimeout(init, 0);
    }
}());
