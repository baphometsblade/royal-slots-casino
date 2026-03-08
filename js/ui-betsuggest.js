/* ui-betsuggest.js — Bet Suggestion Engine
 * Sprint 38: Floating chip near bet controls that nudges optimal bet sizes.
 * Creates its own DOM elements (no static HTML required).
 */
(function () {
    'use strict';

    var BS_KEY       = 'ms_betSuggest';
    var RESHOW_SPINS = 5;          // re-show chip after 5 spins if dismissed
    var _chipEl      = null;
    var _dismissed   = false;
    var _spinsSinceDismiss = 0;
    var _lastSuggestion = null;

    // ── Suggestion logic ────────────────────────────────────────────────────
    function _calcSuggestion(bal, winStreak, lossStreak) {
        bal = parseFloat(bal) || 0;
        winStreak  = parseInt(winStreak, 10) || 0;
        lossStreak = parseInt(lossStreak, 10) || 0;

        // Streak overrides
        if (winStreak >= 3) {
            var streakBet = Math.max(0.20, Math.floor(bal * 0.03 * 100) / 100);
            return { amount: streakBet, label: 'You\'re on a streak!', color: '#ff6b35' };
        }
        if (lossStreak >= 3) {
            return { amount: 0.20, label: 'Play it safe', color: '#4ecdc4' };
        }

        // Balance-based tiers
        if (bal > 200) {
            var highBet = Math.max(0.20, Math.floor(bal * 0.02 * 100) / 100);
            return { amount: highBet, label: 'High roller mode!', color: '#ffd700' };
        }
        if (bal >= 50) {
            var midBet = Math.max(0.20, Math.floor(bal * 0.01 * 100) / 100);
            return { amount: midBet, label: 'Balanced risk', color: '#45b7d1' };
        }
        return { amount: 0.20, label: 'Conservative play', color: '#4ecdc4' };
    }

    // ── Snap to nearest BET_STEPS value ─────────────────────────────────────
    function _snapToBetStep(amount) {
        if (typeof BET_STEPS === 'undefined' || !Array.isArray(BET_STEPS)) return amount;
        var best = BET_STEPS[0] || 0.20;
        var bestDist = Math.abs(amount - best);
        for (var i = 1; i < BET_STEPS.length; i++) {
            var d = Math.abs(amount - BET_STEPS[i]);
            if (d < bestDist) { best = BET_STEPS[i]; bestDist = d; }
        }
        return best;
    }

    // ── Create chip element ─────────────────────────────────────────────────
    function _createChip() {
        if (_chipEl) return;

        var chip = document.createElement('div');
        chip.id = 'betSuggestChip';
        chip.style.cssText = 'position:fixed;bottom:52px;right:16px;z-index:9980;display:none;cursor:pointer;transition:transform 0.2s,opacity 0.3s;';

        // Inner container
        var inner = document.createElement('div');
        inner.id = 'bsInner';
        inner.style.cssText = 'background:linear-gradient(135deg,#1a1a2e,#16213e);border:1px solid rgba(255,215,0,0.4);border-radius:20px;padding:8px 14px 8px 12px;display:flex;align-items:center;gap:8px;box-shadow:0 4px 16px rgba(0,0,0,0.4);';

        // Icon
        var iconEl = document.createElement('span');
        iconEl.style.cssText = 'font-size:18px;';
        iconEl.textContent = '\uD83D\uDCA1';
        inner.appendChild(iconEl);

        // Text container
        var textWrap = document.createElement('div');
        textWrap.style.cssText = 'display:flex;flex-direction:column;line-height:1.2;';

        var labelEl = document.createElement('span');
        labelEl.id = 'bsLabel';
        labelEl.style.cssText = 'font-size:11px;color:#aaa;white-space:nowrap;';
        labelEl.textContent = 'Balanced risk';
        textWrap.appendChild(labelEl);

        var amtEl = document.createElement('span');
        amtEl.id = 'bsAmount';
        amtEl.style.cssText = 'font-size:15px;font-weight:700;color:#ffd700;white-space:nowrap;';
        amtEl.textContent = 'Bet $1.00';
        textWrap.appendChild(amtEl);

        inner.appendChild(textWrap);

        // Close button
        var closeBtn = document.createElement('button');
        closeBtn.style.cssText = 'background:none;border:none;color:#666;font-size:14px;cursor:pointer;padding:0 0 0 4px;line-height:1;';
        closeBtn.textContent = '\u2715';
        closeBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            _dismiss();
        });
        inner.appendChild(closeBtn);

        chip.appendChild(inner);

        // Click chip to apply bet
        chip.addEventListener('click', function () {
            if (_lastSuggestion) {
                _applyBet(_lastSuggestion.amount);
            }
        });

        // Hover effect
        chip.addEventListener('mouseenter', function () { chip.style.transform = 'scale(1.06)'; });
        chip.addEventListener('mouseleave', function () { chip.style.transform = 'scale(1)'; });

        document.body.appendChild(chip);
        _chipEl = chip;

        // Pulse animation via injected style
        _injectPulseStyle();
    }

    // ── Inject pulse keyframes ──────────────────────────────────────────────
    var _pulseInjected = false;
    function _injectPulseStyle() {
        if (_pulseInjected) return;
        _pulseInjected = true;
        var style = document.createElement('style');
        style.textContent = '@keyframes bsPulse{0%,100%{box-shadow:0 4px 16px rgba(0,0,0,0.4)}50%{box-shadow:0 4px 20px rgba(255,215,0,0.35)}}';
        document.head.appendChild(style);
    }

    // ── Display chip ────────────────────────────────────────────────────────
    function _showChip(suggestion) {
        _createChip();
        _lastSuggestion = suggestion;

        var labelEl = document.getElementById('bsLabel');
        var amtEl   = document.getElementById('bsAmount');
        var innerEl = document.getElementById('bsInner');

        if (labelEl) { labelEl.textContent = suggestion.label; labelEl.style.color = suggestion.color; }
        if (amtEl)   amtEl.textContent = 'Bet $' + suggestion.amount.toFixed(2);
        if (innerEl) innerEl.style.animation = 'bsPulse 2s ease-in-out infinite';

        if (_chipEl) _chipEl.style.display = 'block';
    }

    function _hideChip() {
        if (_chipEl) _chipEl.style.display = 'none';
    }

    function _dismiss() {
        _dismissed = true;
        _spinsSinceDismiss = 0;
        _hideChip();
    }

    // ── Apply suggested bet ─────────────────────────────────────────────────
    function _applyBet(amount) {
        var snapped = _snapToBetStep(amount);
        if (typeof currentBet !== 'undefined') {
            /* global currentBet */
            currentBet = snapped;
        }
        if (typeof updateBetDisplay === 'function') {
            updateBetDisplay();
        }
        // Also try bet input element
        var betInput = document.getElementById('betAmount');
        if (betInput) {
            betInput.value = snapped.toFixed(2);
            betInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
        // Brief visual feedback
        if (_chipEl) {
            _chipEl.style.transform = 'scale(1.15)';
            setTimeout(function () { if (_chipEl) _chipEl.style.transform = 'scale(1)'; }, 200);
        }
    }

    // ── Public API ──────────────────────────────────────────────────────────
    window._betSuggestUpdate = function (bal, winStreak, lossStreak) {
        // Handle re-show after dismiss
        if (_dismissed) {
            _spinsSinceDismiss++;
            if (_spinsSinceDismiss >= RESHOW_SPINS) {
                _dismissed = false;
                _spinsSinceDismiss = 0;
            } else {
                return;
            }
        }

        var suggestion = _calcSuggestion(bal, winStreak, lossStreak);
        suggestion.amount = _snapToBetStep(suggestion.amount);
        _showChip(suggestion);
    };

    // ── Init ────────────────────────────────────────────────────────────────
    function _init() {
        if (/[?&]noBonus=1/.test(window.location.search)) return;
        _createChip();
        // Show initial suggestion based on default balance
        var initBal = (typeof balance !== 'undefined') ? balance : 100;
        var suggestion = _calcSuggestion(initBal, 0, 0);
        suggestion.amount = _snapToBetStep(suggestion.amount);
        _showChip(suggestion);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { setTimeout(_init, 1200); });
    } else {
        setTimeout(_init, 1200);
    }

})();
