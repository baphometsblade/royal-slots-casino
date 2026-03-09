// =====================================================================
// CASHBACK WHEEL MODULE — Loss Recovery Spinning Wheel
// =====================================================================
//
// Sprint 102: Self-contained IIFE. Tracks net session losses and
// unlocks a cashback wheel every $10 in net losses. The wheel awards
// a percentage of total session losses back as balance credit.
//
// Segments (8): 1%, 2%, 3%, 5%, 8%, 10%, 15%, 20%
// Weighted towards smaller amounts. Max cashback per spin: $25.
//
// Depends on: globals.js (balance, currentBet, formatMoney),
//   ui-slot.js (displayServerWinResult), ui-lobby.js (updateBalance),
//   app.js (saveBalance)
//
// Public API (window):
//   getCashbackWheelState()  — { sessionLoss, totalCashback, spinsUsed }
//   resetCashbackWheel()     — force-reset (for QA)
// =====================================================================

(function() {
    'use strict';

    // ── QA Suppression ───────────────────────────────────────────────
    function isQaSuppressed() {
        var qs = window.location.search || '';
        return qs.indexOf('noBonus=1') !== -1 || qs.indexOf('qaTools=1') !== -1;
    }

    // ── Constants ────────────────────────────────────────────────────
    var STORAGE_KEY       = 'cashbackWheelState';
    var SESSION_KEY       = 'cashbackWheelSessionId';
    var SESSION_TIMEOUT   = 4 * 60 * 60 * 1000; // 4 hours
    var LOSS_THRESHOLD    = 10;                  // unlock every $10
    var MAX_CASHBACK_SPIN = 25;                  // max payout per spin
    var STYLE_ID          = 'cashbackWheelStyles';

    // Wheel segments — value = percentage of total losses
    var SEGMENTS = [
        { pct: 1,  label: '1%',  color: '#6b7280', weight: 25 },
        { pct: 5,  label: '5%',  color: '#3b82f6', weight: 15 },
        { pct: 15, label: '15%', color: '#f59e0b', weight: 3  },
        { pct: 3,  label: '3%',  color: '#8b5cf6', weight: 18 },
        { pct: 10, label: '10%', color: '#10b981', weight: 7  },
        { pct: 2,  label: '2%',  color: '#ef4444', weight: 20 },
        { pct: 20, label: '20%', color: '#ec4899', weight: 2  },
        { pct: 8,  label: '8%',  color: '#14b8a6', weight: 10 }
    ];

    var TOTAL_WEIGHT = 0;
    for (var i = 0; i < SEGMENTS.length; i++) TOTAL_WEIGHT += SEGMENTS[i].weight;

    var SEG_ANGLE = 360 / SEGMENTS.length; // 45 degrees each

    // ── State ────────────────────────────────────────────────────────
    var _sessionLoss    = 0;
    var _totalCashback  = 0;
    var _lastThreshold  = 0;
    var _spinsUsed      = 0;
    var _sessionId      = '';
    var _isSpinning     = false;

    // DOM refs
    var _fabEl          = null;
    var _progressRing   = null;
    var _panelEl        = null;
    var _wheelEl        = null;
    var _spinBtn        = null;
    var _resultEl       = null;
    var _lossDisplayEl  = null;
    var _overlayEl      = null;

    // ── Session Management ───────────────────────────────────────────
    function generateSessionId() {
        return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    }

    function checkSessionValid() {
        try {
            var stored = sessionStorage.getItem(SESSION_KEY);
            if (!stored) return false;
            var parsed = JSON.parse(stored);
            if (parsed.id && (Date.now() - parsed.ts) < SESSION_TIMEOUT) {
                _sessionId = parsed.id;
                return true;
            }
        } catch (e) { /* invalid — reset */ }
        return false;
    }

    function startNewSession() {
        _sessionId = generateSessionId();
        _sessionLoss = 0;
        _totalCashback = 0;
        _lastThreshold = 0;
        _spinsUsed = 0;
        saveState();
        try {
            sessionStorage.setItem(SESSION_KEY, JSON.stringify({
                id: _sessionId,
                ts: Date.now()
            }));
        } catch (e) { /* sessionStorage unavailable */ }
    }

    // ── Persistence ──────────────────────────────────────────────────
    function loadState() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                var parsed = JSON.parse(raw);
                if (parsed.sessionId === _sessionId) {
                    _sessionLoss   = typeof parsed.sessionLoss === 'number' ? parsed.sessionLoss : 0;
                    _totalCashback = typeof parsed.totalCashback === 'number' ? parsed.totalCashback : 0;
                    _lastThreshold = typeof parsed.lastThreshold === 'number' ? parsed.lastThreshold : 0;
                    _spinsUsed     = typeof parsed.spinsUsed === 'number' ? parsed.spinsUsed : 0;
                } else {
                    // Different session — reset
                    startNewSession();
                }
            }
        } catch (e) { /* keep defaults */ }
    }

    function saveState() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                sessionId:    _sessionId,
                sessionLoss:  Math.round(_sessionLoss * 100) / 100,
                totalCashback: Math.round(_totalCashback * 100) / 100,
                lastThreshold: _lastThreshold,
                spinsUsed:    _spinsUsed
            }));
        } catch (e) { /* localStorage full */ }
    }

    // ── Wheel Logic ──────────────────────────────────────────────────
    function getAvailableSpins() {
        var thresholdCount = Math.floor(_sessionLoss / LOSS_THRESHOLD);
        return Math.max(0, thresholdCount - _spinsUsed);
    }

    function getProgressToNext() {
        // Progress 0..1 toward the next $10 threshold
        var nextThreshold = (_spinsUsed + getAvailableSpins() + 1) * LOSS_THRESHOLD;
        var progress = _sessionLoss / nextThreshold;
        return Math.min(1, Math.max(0, progress));
    }

    function pickSegment() {
        var roll = Math.random() * TOTAL_WEIGHT;
        var cumulative = 0;
        for (var i = 0; i < SEGMENTS.length; i++) {
            cumulative += SEGMENTS[i].weight;
            if (roll < cumulative) return i;
        }
        return SEGMENTS.length - 1;
    }

    function calculateCashback(segIndex) {
        var pct = SEGMENTS[segIndex].pct;
        var amount = (_sessionLoss * pct) / 100;
        amount = Math.round(amount * 100) / 100;
        return Math.min(amount, MAX_CASHBACK_SPIN);
    }

    // ── Track P&L ────────────────────────────────────────────────────
    function recordSpinResult(betAmount, winAmount) {
        // Net P&L: negative means loss
        var net = winAmount - betAmount;
        _sessionLoss = Math.max(0, _sessionLoss - net);
        _sessionLoss = Math.round(_sessionLoss * 100) / 100;
        saveState();
        updateFab();
    }

    // ── Style Injection ──────────────────────────────────────────────
    function injectStyles() {
        if (document.getElementById(STYLE_ID)) return;
        var style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = [
            '/* Cashback Wheel FAB */',
            '.cbw-fab {',
            '  position: fixed; bottom: 80px; left: 16px; z-index:10400;',
            '  width: 52px; height: 52px; border-radius: 50%;',
            '  background: linear-gradient(135deg, #f59e0b, #ef4444);',
            '  border: 2px solid rgba(255,255,255,0.25);',
            '  cursor: pointer; display: flex; align-items: center;',
            '  justify-content: center; font-size: 24px;',
            '  box-shadow: 0 4px 16px rgba(0,0,0,0.4);',
            '  transition: transform 0.2s ease, box-shadow 0.2s ease;',
            '  user-select: none;',
            '}',
            '.cbw-fab:hover {',
            '  transform: scale(1.1);',
            '  box-shadow: 0 6px 24px rgba(245,158,11,0.5);',
            '}',
            '.cbw-fab.has-spins {',
            '  animation: cbw-pulse 1.5s ease-in-out infinite;',
            '}',
            '.cbw-fab-ring {',
            '  position: absolute; top: -3px; left: -3px;',
            '  width: 58px; height: 58px;',
            '}',
            '.cbw-fab-ring circle {',
            '  fill: none; stroke-width: 3; stroke-linecap: round;',
            '  transform: rotate(-90deg); transform-origin: center;',
            '}',
            '.cbw-fab-ring .cbw-ring-bg { stroke: rgba(255,255,255,0.15); }',
            '.cbw-fab-ring .cbw-ring-fg {',
            '  stroke: #fbbf24; transition: stroke-dashoffset 0.4s ease;',
            '}',
            '',
            '/* Panel Overlay */',
            '.cbw-overlay {',
            '  position: fixed; inset: 0; z-index:10400;',
            '  background: rgba(0,0,0,0.7); backdrop-filter: blur(4px);',
            '  display: none; align-items: center; justify-content: center;',
            '  opacity: 0; transition: opacity 0.3s ease;',
            '}',
            '.cbw-overlay.active { display: flex; opacity: 1; }',
            '',
            '/* Panel */',
            '.cbw-panel {',
            '  background: linear-gradient(145deg, #1a1a2e, #16213e);',
            '  border: 1px solid rgba(255,215,0,0.3);',
            '  border-radius: 16px; padding: 24px;',
            '  width: 380px; max-width: 95vw; max-height: 90vh;',
            '  text-align: center; position: relative;',
            '  box-shadow: 0 20px 60px rgba(0,0,0,0.6);',
            '  overflow-y: auto;',
            '}',
            '.cbw-panel h2 {',
            '  margin: 0 0 4px; font-size: 22px;',
            '  background: linear-gradient(90deg, #f59e0b, #ef4444);',
            '  -webkit-background-clip: text; -webkit-text-fill-color: transparent;',
            '  background-clip: text;',
            '}',
            '.cbw-panel .cbw-subtitle {',
            '  color: #9ca3af; font-size: 13px; margin-bottom: 16px;',
            '}',
            '.cbw-close {',
            '  position: absolute; top: 8px; right: 12px;',
            '  background: none; border: none; color: #9ca3af;',
            '  font-size: 24px; cursor: pointer; line-height: 1;',
            '  padding: 4px 8px;',
            '}',
            '.cbw-close:hover { color: #fff; }',
            '',
            '/* Wheel Container */',
            '.cbw-wheel-wrap {',
            '  position: relative; width: 280px; height: 280px;',
            '  margin: 0 auto 16px;',
            '}',
            '.cbw-pointer {',
            '  position: absolute; top: -10px; left: 50%;',
            '  transform: translateX(-50%); z-index:10400;',
            '  width: 0; height: 0;',
            '  border-left: 12px solid transparent;',
            '  border-right: 12px solid transparent;',
            '  border-top: 24px solid #fbbf24;',
            '  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));',
            '}',
            '.cbw-wheel {',
            '  width: 280px; height: 280px; border-radius: 50%;',
            '  position: relative; overflow: hidden;',
            '  border: 4px solid rgba(255,215,0,0.5);',
            '  box-shadow: inset 0 0 30px rgba(0,0,0,0.3),',
            '    0 0 20px rgba(245,158,11,0.2);',
            '  transition: none;',
            '}',
            '.cbw-wheel.spinning {',
            '  transition: transform cubic-bezier(0.17, 0.67, 0.12, 0.99);',
            '}',
            '.cbw-segment {',
            '  position: absolute; width: 50%; height: 50%;',
            '  top: 0; left: 50%; transform-origin: 0% 100%;',
            '  clip-path: polygon(0 0, 100% 0, 0 100%);',
            '  display: flex; align-items: flex-start;',
            '  justify-content: flex-end; padding: 12px 4px 0 0;',
            '}',
            '.cbw-seg-label {',
            '  font-size: 13px; font-weight: 700; color: #fff;',
            '  text-shadow: 0 1px 3px rgba(0,0,0,0.6);',
            '  transform: rotate(22.5deg); transform-origin: center;',
            '  pointer-events: none;',
            '}',
            '',
            '/* Spin Button */',
            '.cbw-spin-btn {',
            '  display: inline-block; padding: 10px 32px;',
            '  background: linear-gradient(135deg, #f59e0b, #ef4444);',
            '  color: #fff; font-size: 16px; font-weight: 700;',
            '  border: none; border-radius: 8px; cursor: pointer;',
            '  text-transform: uppercase; letter-spacing: 1px;',
            '  box-shadow: 0 4px 16px rgba(245,158,11,0.4);',
            '  transition: transform 0.15s ease, opacity 0.2s;',
            '}',
            '.cbw-spin-btn:hover:not(:disabled) {',
            '  transform: translateY(-2px);',
            '}',
            '.cbw-spin-btn:disabled {',
            '  opacity: 0.4; cursor: not-allowed;',
            '}',
            '',
            '/* Result */',
            '.cbw-result {',
            '  margin-top: 12px; font-size: 18px; font-weight: 700;',
            '  color: #fbbf24; min-height: 28px;',
            '  transition: opacity 0.3s ease;',
            '}',
            '',
            '/* Stats row */',
            '.cbw-stats {',
            '  display: flex; justify-content: space-around;',
            '  margin-top: 12px; padding-top: 12px;',
            '  border-top: 1px solid rgba(255,255,255,0.1);',
            '}',
            '.cbw-stat { text-align: center; }',
            '.cbw-stat-val {',
            '  font-size: 16px; font-weight: 700; color: #fbbf24;',
            '}',
            '.cbw-stat-label {',
            '  font-size: 11px; color: #6b7280; text-transform: uppercase;',
            '  letter-spacing: 0.5px;',
            '}',
            '',
            '/* Pulse animation */',
            '@keyframes cbw-pulse {',
            '  0%, 100% { box-shadow: 0 4px 16px rgba(0,0,0,0.4); }',
            '  50% { box-shadow: 0 4px 24px rgba(245,158,11,0.6),',
            '    0 0 12px rgba(239,68,68,0.3); }',
            '}',
            '',
            '/* Notch circle center */',
            '.cbw-center-dot {',
            '  position: absolute; top: 50%; left: 50%;',
            '  transform: translate(-50%, -50%);',
            '  width: 36px; height: 36px; border-radius: 50%;',
            '  background: radial-gradient(circle, #fbbf24 30%, #f59e0b);',
            '  border: 3px solid rgba(255,255,255,0.5);',
            '  z-index:10400; box-shadow: 0 2px 8px rgba(0,0,0,0.4);',
            '}'
        ].join('\n');
        document.head.appendChild(style);
    }

    // ── Build FAB ────────────────────────────────────────────────────
    function buildFab() {
        if (_fabEl) return;

        _fabEl = document.createElement('div');
        _fabEl.className = 'cbw-fab';
        _fabEl.setAttribute('title', 'Cashback Wheel');

        // Emoji icon
        var icon = document.createElement('span');
        icon.textContent = '\uD83C\uDFA1'; // ferris wheel emoji
        icon.style.position = 'relative';
        icon.style.zIndex = '1';
        _fabEl.appendChild(icon);

        // SVG progress ring
        var svgNS = 'http://www.w3.org/2000/svg';
        var svg = document.createElementNS(svgNS, 'svg');
        svg.setAttribute('class', 'cbw-fab-ring');
        svg.setAttribute('viewBox', '0 0 58 58');

        var bgCircle = document.createElementNS(svgNS, 'circle');
        bgCircle.setAttribute('class', 'cbw-ring-bg');
        bgCircle.setAttribute('cx', '29');
        bgCircle.setAttribute('cy', '29');
        bgCircle.setAttribute('r', '26');
        svg.appendChild(bgCircle);

        _progressRing = document.createElementNS(svgNS, 'circle');
        _progressRing.setAttribute('class', 'cbw-ring-fg');
        _progressRing.setAttribute('cx', '29');
        _progressRing.setAttribute('cy', '29');
        _progressRing.setAttribute('r', '26');
        var circumference = 2 * Math.PI * 26;
        _progressRing.style.strokeDasharray = circumference;
        _progressRing.style.strokeDashoffset = circumference;
        svg.appendChild(_progressRing);

        _fabEl.appendChild(svg);

        _fabEl.addEventListener('click', function() {
            openPanel();
        });

        document.body.appendChild(_fabEl);
    }

    // ── Update FAB state ─────────────────────────────────────────────
    function updateFab() {
        if (!_fabEl || !_progressRing) return;

        var available = getAvailableSpins();
        var progress = getProgressToNext();
        var circumference = 2 * Math.PI * 26;
        var offset = circumference * (1 - progress);

        _progressRing.style.strokeDashoffset = offset;

        if (available > 0) {
            _fabEl.classList.add('has-spins');
        } else {
            _fabEl.classList.remove('has-spins');
        }
    }

    // ── Build Panel / Modal ──────────────────────────────────────────
    function buildPanel() {
        if (_overlayEl) return;

        // Overlay
        _overlayEl = document.createElement('div');
        _overlayEl.className = 'cbw-overlay';
        _overlayEl.addEventListener('click', function(e) {
            if (e.target === _overlayEl) closePanel();
        });

        // Panel container
        _panelEl = document.createElement('div');
        _panelEl.className = 'cbw-panel';

        // Close button
        var closeBtn = document.createElement('button');
        closeBtn.className = 'cbw-close';
        closeBtn.textContent = '\u00D7';
        closeBtn.addEventListener('click', closePanel);
        _panelEl.appendChild(closeBtn);

        // Title
        var title = document.createElement('h2');
        title.textContent = 'Cashback Wheel';
        _panelEl.appendChild(title);

        // Subtitle
        var subtitle = document.createElement('div');
        subtitle.className = 'cbw-subtitle';
        subtitle.textContent = 'Recover a portion of your session losses!';
        _panelEl.appendChild(subtitle);

        // Loss display
        _lossDisplayEl = document.createElement('div');
        _lossDisplayEl.style.cssText = 'color:#9ca3af;font-size:13px;margin-bottom:12px;';
        _panelEl.appendChild(_lossDisplayEl);

        // Wheel wrapper
        var wheelWrap = document.createElement('div');
        wheelWrap.className = 'cbw-wheel-wrap';

        // Pointer arrow
        var pointer = document.createElement('div');
        pointer.className = 'cbw-pointer';
        wheelWrap.appendChild(pointer);

        // Wheel
        _wheelEl = document.createElement('div');
        _wheelEl.className = 'cbw-wheel';

        // Build segments
        for (var s = 0; s < SEGMENTS.length; s++) {
            var seg = document.createElement('div');
            seg.className = 'cbw-segment';
            var rotAngle = s * SEG_ANGLE - 90;
            seg.style.transform = 'rotate(' + rotAngle + 'deg) skewY(-' + (90 - SEG_ANGLE) + 'deg)';
            seg.style.background = SEGMENTS[s].color;

            var lbl = document.createElement('span');
            lbl.className = 'cbw-seg-label';
            lbl.textContent = SEGMENTS[s].label;
            seg.appendChild(lbl);

            _wheelEl.appendChild(seg);
        }

        // Center dot
        var centerDot = document.createElement('div');
        centerDot.className = 'cbw-center-dot';
        _wheelEl.appendChild(centerDot);

        wheelWrap.appendChild(_wheelEl);
        _panelEl.appendChild(wheelWrap);

        // Spin button
        _spinBtn = document.createElement('button');
        _spinBtn.className = 'cbw-spin-btn';
        _spinBtn.textContent = 'SPIN';
        _spinBtn.addEventListener('click', spinWheel);
        _panelEl.appendChild(_spinBtn);

        // Result display
        _resultEl = document.createElement('div');
        _resultEl.className = 'cbw-result';
        _panelEl.appendChild(_resultEl);

        // Stats row
        var statsRow = document.createElement('div');
        statsRow.className = 'cbw-stats';

        var statLoss = buildStat('0', 'Session Loss');
        statLoss.querySelector('.cbw-stat-val').id = 'cbw-stat-loss';
        statsRow.appendChild(statLoss);

        var statRecovered = buildStat('0', 'Recovered');
        statRecovered.querySelector('.cbw-stat-val').id = 'cbw-stat-recovered';
        statsRow.appendChild(statRecovered);

        var statSpins = buildStat('0', 'Spins Left');
        statSpins.querySelector('.cbw-stat-val').id = 'cbw-stat-spins';
        statsRow.appendChild(statSpins);

        _panelEl.appendChild(statsRow);
        _overlayEl.appendChild(_panelEl);
        document.body.appendChild(_overlayEl);
    }

    function buildStat(value, label) {
        var wrap = document.createElement('div');
        wrap.className = 'cbw-stat';

        var val = document.createElement('div');
        val.className = 'cbw-stat-val';
        val.textContent = value;
        wrap.appendChild(val);

        var lbl = document.createElement('div');
        lbl.className = 'cbw-stat-label';
        lbl.textContent = label;
        wrap.appendChild(lbl);

        return wrap;
    }

    // ── Panel Open / Close ───────────────────────────────────────────
    function openPanel() {
        buildPanel();
        updatePanelStats();

        var available = getAvailableSpins();
        _spinBtn.disabled = available <= 0 || _isSpinning;
        _spinBtn.textContent = available > 0 ? 'SPIN' : 'NO SPINS AVAILABLE';
        _resultEl.textContent = '';

        // Use double-RAF for smooth transition
        _overlayEl.style.display = 'flex';
        _overlayEl.style.opacity = '0';
        requestAnimationFrame(function() {
            requestAnimationFrame(function() {
                _overlayEl.style.opacity = '1';
                _overlayEl.classList.add('active');
            });
        });
    }

    function closePanel() {
        if (!_overlayEl) return;
        _overlayEl.style.opacity = '0';
        setTimeout(function() {
            _overlayEl.classList.remove('active');
            _overlayEl.style.display = 'none';
        }, 300);
    }

    function updatePanelStats() {
        var fmt = typeof formatMoney === 'function' ? formatMoney : function(v) {
            return '$' + Number(v || 0).toFixed(2);
        };

        var lossEl = document.getElementById('cbw-stat-loss');
        var recEl = document.getElementById('cbw-stat-recovered');
        var spinsEl = document.getElementById('cbw-stat-spins');

        if (lossEl) lossEl.textContent = fmt(_sessionLoss);
        if (recEl) recEl.textContent = fmt(_totalCashback);
        if (spinsEl) spinsEl.textContent = String(getAvailableSpins());

        if (_lossDisplayEl) {
            var nextUnlock = ((_spinsUsed + getAvailableSpins() + 1) * LOSS_THRESHOLD);
            var remaining = Math.max(0, nextUnlock - _sessionLoss);
            remaining = Math.round(remaining * 100) / 100;
            if (getAvailableSpins() > 0) {
                _lossDisplayEl.textContent = 'You have ' + getAvailableSpins() +
                    ' spin' + (getAvailableSpins() > 1 ? 's' : '') + ' available!';
                _lossDisplayEl.style.color = '#fbbf24';
            } else if (_sessionLoss > 0) {
                _lossDisplayEl.textContent = fmt(remaining) + ' more in losses to unlock next spin';
                _lossDisplayEl.style.color = '#9ca3af';
            } else {
                _lossDisplayEl.textContent = 'Play slots to build session loss tracking';
                _lossDisplayEl.style.color = '#9ca3af';
            }
        }
    }

    // ── Spin the Wheel ───────────────────────────────────────────────
    function spinWheel() {
        if (_isSpinning) return;
        if (getAvailableSpins() <= 0) return;

        _isSpinning = true;
        _spinBtn.disabled = true;
        _resultEl.textContent = '';
        _resultEl.style.opacity = '0';

        // Pick winning segment
        var winIndex = pickSegment();
        var cashback = calculateCashback(winIndex);

        // Calculate rotation
        // Wheel segment: index 0 starts at top, going clockwise
        // Target: center of winning segment at the top (under pointer)
        var segCenter = winIndex * SEG_ANGLE + SEG_ANGLE / 2;
        var fullRotations = 3 + Math.floor(Math.random() * 3); // 3-5 full rotations
        var targetAngle = fullRotations * 360 + (360 - segCenter);

        // Duration based on rotations
        var duration = 3000 + fullRotations * 400;

        _wheelEl.classList.add('spinning');
        _wheelEl.style.transitionDuration = duration + 'ms';
        _wheelEl.style.transform = 'rotate(' + targetAngle + 'deg)';

        setTimeout(function() {
            _isSpinning = false;
            _wheelEl.classList.remove('spinning');

            // Consume spin
            _spinsUsed++;
            _totalCashback += cashback;
            _totalCashback = Math.round(_totalCashback * 100) / 100;
            saveState();

            // Credit balance
            if (cashback > 0) {
                creditBalance(cashback);
            }

            // Show result
            var fmt = typeof formatMoney === 'function' ? formatMoney : function(v) {
                return '$' + Number(v || 0).toFixed(2);
            };

            _resultEl.style.opacity = '0';
            requestAnimationFrame(function() {
                requestAnimationFrame(function() {
                    if (cashback > 0) {
                        _resultEl.textContent = '+' + fmt(cashback) + ' Cashback! (' +
                            SEGMENTS[winIndex].label + ')';
                        _resultEl.style.color = '#fbbf24';
                    } else {
                        _resultEl.textContent = 'Better luck next time!';
                        _resultEl.style.color = '#9ca3af';
                    }
                    _resultEl.style.opacity = '1';
                });
            });

            // Toast notification
            if (cashback > 0) {
                if (typeof showWinToast === 'function') {
                    showWinToast('Cashback +' + fmt(cashback) + '!', 'epic');
                }
            }

            // Update UI
            updatePanelStats();
            updateFab();

            // Re-enable spin if more available
            var remaining = getAvailableSpins();
            _spinBtn.disabled = remaining <= 0;
            _spinBtn.textContent = remaining > 0 ? 'SPIN AGAIN' : 'NO SPINS LEFT';

            // Reset wheel rotation for next spin (preserve visual position)
            setTimeout(function() {
                _wheelEl.style.transition = 'none';
                _wheelEl.style.transform = 'rotate(' + (targetAngle % 360) + 'deg)';
                requestAnimationFrame(function() {
                    requestAnimationFrame(function() {
                        _wheelEl.style.transition = '';
                    });
                });
            }, 100);

        }, duration + 200); // slight extra for visual settle
    }

    // ── Credit Balance ───────────────────────────────────────────────
    function creditBalance(amount) {
        if (typeof balance !== 'undefined') {
            balance += amount;
            balance = Math.round(balance * 100) / 100;
        }
        if (typeof updateBalance === 'function') updateBalance();
        if (typeof saveBalance === 'function') saveBalance();
    }

    // ── Hook displayServerWinResult ──────────────────────────────────
    function hookWinResult() {
        var _orig = window.displayServerWinResult;
        if (typeof _orig !== 'function') return;

        window.displayServerWinResult = function(result, game) {
            // Track P&L for cashback calculation
            var bet = (typeof currentBet !== 'undefined') ? currentBet : 0;
            var win = (result && typeof result.winAmount === 'number') ? result.winAmount : 0;

            recordSpinResult(bet, win);

            // Call original handler
            _orig.call(this, result, game);
        };
    }

    // ── Public API ───────────────────────────────────────────────────
    window.getCashbackWheelState = function() {
        return {
            sessionLoss:   _sessionLoss,
            totalCashback: _totalCashback,
            lastThreshold: _lastThreshold,
            spinsUsed:     _spinsUsed,
            availableSpins: getAvailableSpins(),
            progressToNext: getProgressToNext()
        };
    };

    window.resetCashbackWheel = function() {
        _sessionLoss = 0;
        _totalCashback = 0;
        _lastThreshold = 0;
        _spinsUsed = 0;
        saveState();
        updateFab();
        if (_overlayEl && _overlayEl.classList.contains('active')) {
            updatePanelStats();
        }
    };

    // ── Init ─────────────────────────────────────────────────────────
    function init() {
        if (isQaSuppressed()) return;

        // Session management
        if (!checkSessionValid()) {
            startNewSession();
        }

        loadState();
        injectStyles();
        buildFab();
        updateFab();
        hookWinResult();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        setTimeout(init, 0);
    }
}());
