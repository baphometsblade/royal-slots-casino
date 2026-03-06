#!/usr/bin/env node
'use strict';
/*
  cinematic_impl.js
  Cinematic Slot UI Redesign — Approach C
  ───────────────────────────────────────
  Phase 1 : HTML  — 📊 button + toast container + stats panel overlay
  Phase 2 : CSS   — slim top/bottom bars, hide badge clutter, toast & panel styles
  Phase 3 : JS    — toast system + stats panel functions
  Phase 4 : Hooks — wire into openSlot and post-spin handlers (all 4 locations)
*/

const fs   = require('fs');
const path = require('path');
const ROOT = __dirname;

// ── CRLF-aware patch ──────────────────────────────────────────────────────────
function patch(file, oldStr, newStr, opts = {}) {
  const abs = path.join(ROOT, file);
  let src = fs.readFileSync(abs, 'utf8');
  const hasCRLF = src.includes('\r\n');
  const old = hasCRLF ? oldStr.replace(/\n/g, '\r\n') : oldStr;
  const rep = hasCRLF ? newStr.replace(/\n/g, '\r\n') : newStr;
  if (!src.includes(old)) {
    if (opts.required === false) { console.warn('  SKIP (not found):', file, '—', JSON.stringify(oldStr).slice(0, 80)); return; }
    console.error('\nPATCH FAILED:', file);
    console.error('  Looking for:', JSON.stringify(old).slice(0, 300));
    process.exit(1);
  }
  const count = (src.split(old).length - 1);
  if (!opts.all && count > 1) {
    console.error('\nPATCH AMBIGUOUS in', file, '— found', count, 'occurrences');
    console.error('  Needle:', JSON.stringify(old).slice(0, 200));
    process.exit(1);
  }
  src = opts.all ? src.split(old).join(rep) : src.replace(old, rep);
  fs.writeFileSync(abs, src, 'utf8');
  console.log(`  ✓ patched ${file}${opts.all && count > 1 ? ' (' + count + 'x)' : ''}`);
}

function append(file, content) {
  const abs = path.join(ROOT, file);
  fs.appendFileSync(abs, content, 'utf8');
  console.log(`  ✓ appended → ${file}`);
}

const _D = String.fromCharCode(36); // $

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 1 — HTML
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n── Phase 1: HTML patches ──');

// 1a. Add 📊 Stats button to top-bar right (before closing divs)
patch('index.html',
`                    <input type="range" class="qv-slider" id="qvSlider" min="0" max="100" value="50" oninput="if(typeof _qvSliderInput==='function')_qvSliderInput(this.value)" title="Volume">
                </div>
            </div>`,
`                    <input type="range" class="qv-slider" id="qvSlider" min="0" max="100" value="50" oninput="if(typeof _qvSliderInput==='function')_qvSliderInput(this.value)" title="Volume">
                    <!-- Cinematic: Stats Report Button -->
                    <button class="cine-stats-btn" id="statsReportBtn" onclick="if(typeof openStatsPanel==='function')openStatsPanel()" title="Session Stats (S)">&#x1F4CA;</button>
                </div>
            </div>`
);

// 1b. Add toast container inside .slot-reel-area
patch('index.html',
`                <div id="winAnimation"></div>
            </div>`,
`                <div id="winAnimation"></div>
                <!-- Cinematic: Spin toast feed -->
                <div id="toastContainer" class="toast-container"></div>
            </div>`
);

// 1c. Add Stats Report Panel overlay before bottom bar
patch('index.html',
`            <!-- Pragmatic Play Bottom Bar -->
            <div class="slot-bottom-bar">`,
`            <!-- Cinematic: Stats Report Panel (full overlay) -->
            <div id="statsReportPanel" class="stats-report-panel" style="display:none">
                <div class="srp-header">
                    <div class="srp-title">&#x1F4CA; Session Report</div>
                    <div class="srp-subtitle" id="srpSubtitle">Live Stats</div>
                    <button class="srp-close-btn" onclick="if(typeof closeStatsPanel==='function')closeStatsPanel()">&#x2715;</button>
                </div>
                <div class="srp-body" id="srpBody"></div>
            </div>
            <!-- Pragmatic Play Bottom Bar -->
            <div class="slot-bottom-bar">`
);

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 2 — CSS
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n── Phase 2: CSS append ──');

append('styles.css', `

/* ═══════════════════════════════════════════════════════════════════════════
   CINEMATIC REDESIGN — layout overrides, toast system, stats panel, polish
   ═══════════════════════════════════════════════════════════════════════════ */

/* ── Slim top bar ──────────────────────────────────────────────────────── */
.slot-top-bar {
  min-height: 36px !important;
  padding: 3px 10px !important;
}

/* Hide cluttered top-bar widgets — data still lives in DOM for stats panel */
#budgetBtn,
#goalBtn,
.slot-payout,
#sessionTimer,
#vmMeter,
#rtpGauge,
#balanceSparkline,
#stTimer,
#gsNavPrev,
#gsNavNext,
#qvSlider {
  display: none !important;
}

/* Compact the ambient toggle in top bar */
#ambientToggleBtn { font-size: 13px; padding: 2px 5px; }

/* Shrink game tag pill */
#slotGameTag { font-size: 8px !important; padding: 1px 5px !important; }

/* ── 📊 Stats button ───────────────────────────────────────────────────── */
.cine-stats-btn {
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.13);
  border-radius: 8px;
  color: #64748b;
  cursor: pointer;
  font-size: 15px;
  line-height: 1;
  padding: 4px 8px;
  transition: background 0.15s, color 0.15s, border-color 0.15s, transform 0.1s;
  flex-shrink: 0;
}
.cine-stats-btn:hover {
  background: rgba(255,255,255,0.12);
  border-color: rgba(255,255,255,0.28);
  color: #e2e8f0;
  transform: scale(1.05);
}
.cine-stats-btn:active { transform: scale(0.97); }

/* ── Expand reel area to fill available height ─────────────────────────── */
.slot-reel-area {
  flex: 1 1 0 !important;
  min-height: 0 !important;
  position: relative;
}

/* ── Slim bottom bar ───────────────────────────────────────────────────── */
.slot-bottom-bar {
  min-height: 58px !important;
  padding: 5px 14px !important;
  flex-wrap: nowrap !important;
}

/* Hide secondary bottom-bar widgets (data still in DOM) */
#slotNetDisplay,
#recentOutcomes,
#sessionHiLo,
#balBuffer,
#profitTarget,
#symbolHeat,
#lossRecovery,
#scatterAlert,
#scatterCollect,
#nearMissCount,
#balAlertDisplay,
#sessionXpEarned,
#hotSymbol,
#spinRateDisplay,
#cascadeDepth,
#autoplayCountdown,
#deadSpinCounter,
#turboBadge,
#jackpotProgress,
#autoSpeedBadge,
#scatterProgress,
#featureActiveDisplay,
#volumeSliderMicro,
#spinSparkline,
#wrDisplay,
#pnlSparkline,
#winGoalTracker,
#bankrollBarRow,
#betRange,
#quickBetPresets,
#betLockBtn,
#autoStopWinBtn,
#betSteps,
#betIndicator,
#bhChart,
#abDisplay,
#apProgress,
#featureCountBadge,
#powerMeter,
#gameTagChips,
#winBreakdown,
#sessionMilestone,
#netPnl,
#sessionRating,
#luckyCoinDisplay,
#highWinBadge,
#lossStreakAlert,
#bonusTimerDisplay,
#peakBalanceDisplay,
#multHistoryDisplay,
#betEfficiencyBadge,
#luckyStreakFire,
#scatterHuntMeter,
#varianceBadge,
#spinCostTotal,
#winTrendBadge,
#hotColdIndicator,
#winLossRatio,
#avgBetBadge,
#sessionBigWin,
#spinTimerBadge,
#balPctBadge,
#sessionMaxMult,
#symbolDistBar,
#autoplayPnlBadge,
#featFreqBadge,
#sessionGrade,
#timeEffBadge,
#outcomeStreakBadge,
#rtpConvergence,
#scatterGapBadge,
#bonusRoundCount,
#reelHitFreq,
#sessStartTime,
#spinPaceBadge,
#cumulativeXpBadge,
#resultHistoryList,
#profitBadge156,
#betRecommendBadge,
#nearMissHeat,
#cinematicCount,
#sessCompareBadge,
#spinDistBadge,
#biggestLossBadge,
#winTypeLabel,
#longestStreakBadge,
#betChangeBadge,
#luckySymbolBadge,
#returnGapBadge,
#valueRatioBadge,
#longestDroughtBadge,
#gameSessionCount,
#megaWinBadge,
#winFreqBadge,
#totalBetDisplay,
#hcBadge,
#lsTracker,
#lastWinPreview,
#slotQuickfireStrip,
#quickSwitchStrip,
#winStreakBadge,
#lossStreakBadge,
#fsRemainingBadge,
#maxWinSeen {
  display: none !important;
}

/* Keep the spin counter visible in the balance section */
#spinCounter { display: inline !important; font-size: 10px; color: #64748b; }

/* ── Bottom bar visual polish ──────────────────────────────────────────── */
.slot-bar-label {
  font-size: 8px !important;
  letter-spacing: 1.5px !important;
  color: #475569 !important;
}
.slot-bar-value {
  font-size: 17px !important;
  font-weight: 800 !important;
}
/* Make spin button slightly larger for the cinematic look */
.slot-spin-btn {
  width: 74px !important;
  height: 74px !important;
  box-shadow: 0 0 28px rgba(16,185,129,0.45), 0 4px 16px rgba(0,0,0,0.5) !important;
}

/* ── Reel visual polish ────────────────────────────────────────────────── */
/* Win-cell golden glow */
.reel-cell.win-cell {
  box-shadow: 0 0 0 2px rgba(255,200,0,0.85), 0 0 22px rgba(255,200,0,0.4) !important;
  border-radius: 6px;
  z-index: 2;
  position: relative;
}
/* Mega win shimmer pulse */
@keyframes cine-win-shimmer {
  0%   { box-shadow: 0 0 0 2px rgba(255,185,0,0.8),  0 0 24px rgba(255,185,0,0.4); }
  50%  { box-shadow: 0 0 0 3px rgba(255,230,0,1.0),  0 0 48px rgba(255,230,0,0.7); }
  100% { box-shadow: 0 0 0 2px rgba(255,185,0,0.8),  0 0 24px rgba(255,185,0,0.4); }
}
.reel-cell.win-cell-mega {
  animation: cine-win-shimmer 0.65s ease-in-out infinite !important;
  border-radius: 7px;
  z-index: 3;
  position: relative;
}
/* Subtle depth on the reels container */
.reels-container {
  border-radius: 10px;
  overflow: hidden;
}

/* ── Toast notification system ─────────────────────────────────────────── */
.toast-container {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  gap: 5px;
  z-index: 55;
  pointer-events: none;
  max-width: 175px;
}

@keyframes cine-toast-in {
  from { opacity: 0; transform: translateX(110%); }
  to   { opacity: 1; transform: translateX(0); }
}
@keyframes cine-toast-out {
  from { opacity: 1; transform: translateX(0); }
  to   { opacity: 0; transform: translateX(110%); }
}

.cine-toast {
  background: rgba(8,8,20,0.93);
  border: 1px solid rgba(255,255,255,0.09);
  border-radius: 9px;
  padding: 6px 11px;
  font-size: 11px;
  font-family: "Trebuchet MS","Segoe UI",sans-serif;
  color: #cbd5e1;
  animation: cine-toast-in 0.22s cubic-bezier(0.22,1,0.36,1) forwards;
  backdrop-filter: blur(6px);
  line-height: 1.45;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 175px;
}
.cine-toast.toast-exiting {
  animation: cine-toast-out 0.22s ease forwards;
}

/* Toast type colours */
.cine-toast.ct-win    { border-color: rgba(16,185,129,0.50); color: #6ee7b7; }
.cine-toast.ct-mega   { border-color: rgba(245,158,11,0.65); color: #fcd34d; font-weight: 700; font-size: 12px; }
.cine-toast.ct-streak { border-color: rgba(239,68,68,0.50);  color: #fca5a5; }
.cine-toast.ct-info   { border-color: rgba(99,102,241,0.45); color: #a5b4fc; }
.cine-toast.ct-bonus  { border-color: rgba(168,85,247,0.60); color: #d8b4fe; font-weight: 600; }
.cine-toast.ct-loss   { border-color: rgba(100,116,139,0.35); color: #94a3b8; }

/* ── Stats Report Panel ────────────────────────────────────────────────── */
@keyframes srp-slide-up {
  from { transform: translateY(100%); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
}
@keyframes srp-slide-down {
  from { transform: translateY(0);    opacity: 1; }
  to   { transform: translateY(100%); opacity: 0; }
}

.stats-report-panel {
  position: absolute;
  inset: 0;
  background: rgba(4,4,14,0.97);
  backdrop-filter: blur(18px) saturate(0.5);
  z-index: 180;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: srp-slide-up 0.35s cubic-bezier(0.22,1,0.36,1) forwards;
  border-radius: inherit;
}
.stats-report-panel.srp-closing {
  animation: srp-slide-down 0.26s ease forwards;
}

.srp-header {
  display: flex;
  align-items: center;
  padding: 11px 18px 9px;
  border-bottom: 1px solid rgba(255,255,255,0.07);
  flex-shrink: 0;
  gap: 10px;
  background: rgba(255,255,255,0.02);
}
.srp-title {
  font-size: 14px;
  font-weight: 700;
  color: #e2e8f0;
  letter-spacing: 0.3px;
}
.srp-subtitle {
  font-size: 10px;
  color: #475569;
  flex: 1;
}
.srp-close-btn {
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.11);
  border-radius: 7px;
  color: #94a3b8;
  cursor: pointer;
  font-size: 14px;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.14s, color 0.14s;
  flex-shrink: 0;
}
.srp-close-btn:hover { background: rgba(255,255,255,0.13); color: #e2e8f0; }

.srp-body {
  flex: 1;
  overflow-y: auto;
  padding: 12px 14px 20px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
  gap: 12px;
  align-content: start;
}

/* Category card */
.srp-category {
  background: rgba(255,255,255,0.025);
  border: 1px solid rgba(255,255,255,0.065);
  border-radius: 10px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.srp-cat-title {
  font-size: 9px;
  font-weight: 700;
  color: #374151;
  text-transform: uppercase;
  letter-spacing: 1.3px;
  margin-bottom: 3px;
  padding-bottom: 5px;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}
.srp-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}
.srp-label {
  font-size: 10px;
  color: #4b5563;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.srp-value {
  font-size: 11px;
  font-weight: 600;
  color: #94a3b8;
  text-align: right;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex-shrink: 0;
}
.srp-value.srp-pos { color: #34d399; }
.srp-value.srp-neg { color: #f87171; }
.srp-value.srp-hot { color: #fbbf24; }
.srp-value.srp-grade { color: #818cf8; font-size: 13px; font-weight: 800; }
`);

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 3 — JS functions (append to ui-slot.js)
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n── Phase 3: JS append ──');

append('js/ui-slot.js', `

// ─────────────────────────────────────────────────────────────────────────────
// CINEMATIC REDESIGN — Toast System + Stats Report Panel
// ─────────────────────────────────────────────────────────────────────────────

// ── Toast System ─────────────────────────────────────────────────────────────
var _cineToastMax = 4;

function showCinematicToast(text, type, duration) {
    var container = document.getElementById('toastContainer');
    if (!container) return;
    var dur = typeof duration === 'number' ? duration : 2500;

    // Evict oldest if at limit
    var existing = container.querySelectorAll('.cine-toast:not(.toast-exiting)');
    if (existing.length >= _cineToastMax) {
        var oldest = existing[0];
        oldest.classList.add('toast-exiting');
        setTimeout(function () { if (oldest.parentNode) oldest.parentNode.removeChild(oldest); }, 230);
    }

    var el = document.createElement('div');
    el.className = 'cine-toast ct-' + (type || 'info');
    el.textContent = text;
    container.appendChild(el);

    // Auto-remove
    setTimeout(function () {
        el.classList.add('toast-exiting');
        setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 230);
    }, dur);
}

function _dispatchSpinToasts(won, winAmount, betAmount, extras) {
    var ex = extras || {};
    var bet = betAmount || 1;
    var mult = winAmount / Math.max(bet, 0.01);

    if (winAmount >= bet * 100) {
        showCinematicToast('${_D}${_D}${_D} MEGA WIN  \u00d7' + Math.round(mult), 'mega', 4000);
    } else if (winAmount >= bet * 25) {
        showCinematicToast('\u26A1 BIG WIN  \u00d7' + Math.round(mult), 'mega', 3200);
    } else if (won && winAmount >= bet * 5) {
        showCinematicToast('\u2605 Win  \u00d7' + mult.toFixed(1), 'win', 2600);
    } else if (won && winAmount > 0) {
        showCinematicToast('\u2713 Win  +' + String.fromCharCode(36) + winAmount.toFixed(2), 'win', 2000);
    }

    // Win streak milestone (check outcomeStreak)
    if (typeof _outcomeStreak147 !== 'undefined' && _outcomeStreak147 >= 5 && _outcomeStreak147 % 5 === 0) {
        showCinematicToast('\uD83D\uDD25 ' + _outcomeStreak147 + '-Win Streak!', 'streak', 2800);
    }
    // Loss streak warning (every 10 dry spins)
    if (typeof _lossStreak124 !== 'undefined' && _lossStreak124 > 0 && _lossStreak124 % 10 === 0) {
        showCinematicToast('\u2744 ' + _lossStreak124 + ' spins no win', 'loss', 2400);
    }
    // Bonus triggered
    if (ex.bonusTriggered) {
        showCinematicToast('\uD83C\uDF89 FREE SPINS TRIGGERED!', 'bonus', 3500);
    }
    // Near miss
    if (ex.nearMiss) {
        showCinematicToast('\uD83D\uDE2E Near miss\u2026', 'info', 1800);
    }
    // Scatter progress hint
    if (typeof _spinScatterFound115 !== 'undefined' && _spinScatterFound115 === 2) {
        showCinematicToast('\uD83D\uDD35 2 scatters — one more!', 'info', 2000);
    }
    // Lucky coin milestone
    if (typeof _luckyCoins121 !== 'undefined' && _luckyCoins121 > 0 && _luckyCoins121 % 20 === 0) {
        showCinematicToast('\uD83E\uDE99 ' + _luckyCoins121 + ' lucky coins!', 'info', 2200);
    }
}

// ── Stats Report Panel ────────────────────────────────────────────────────────
var _statsReportOpen  = false;
var _cineAutoInterval = null;
var _cineLastAutoSpin = 0;

// Badge catalogue — {cat, rows[{id, label}]}
var _srpCfg = [
    { cat: '\uD83D\uDCCA Session', rows: [
        { id: 'spinCounter',       label: 'Total Spins' },
        { id: 'netPnl',            label: 'Net P&L' },
        { id: 'sessionRating',     label: 'Rating' },
        { id: 'sessionGrade',      label: 'Grade' },
        { id: 'sessStartTime',     label: 'Started' },
        { id: 'timeEffBadge',      label: 'Efficiency' },
        { id: 'balPctBadge',       label: 'Balance \u0394' },
        { id: 'gameSessionCount',  label: 'Session #' },
    ]},
    { cat: '\uD83C\uDFC6 Wins', rows: [
        { id: 'maxWinSeen',        label: 'Biggest Win' },
        { id: 'sessionBigWin',     label: 'Session Best' },
        { id: 'sessionMaxMult',    label: 'Max Mult' },
        { id: 'rtpConvergence',    label: 'RTP' },
        { id: 'returnGapBadge',    label: 'vs House' },
        { id: 'valueRatioBadge',   label: 'Return Ratio' },
        { id: 'cinematicCount',    label: 'Big Wins' },
        { id: 'winBreakdown',      label: 'Win Types' },
    ]},
    { cat: '\uD83D\uDCB0 Balance', rows: [
        { id: 'peakBalanceDisplay',label: 'Peak' },
        { id: 'profitBadge156',    label: 'Profit/Loss' },
        { id: 'spinCostTotal',     label: 'Total Wagered' },
        { id: 'biggestLossBadge',  label: 'Biggest Loss' },
    ]},
    { cat: '\uD83C\uDFB2 Bets', rows: [
        { id: 'avgBetBadge',       label: 'Avg Bet' },
        { id: 'betEfficiencyBadge',label: 'Efficiency' },
        { id: 'betRecommendBadge', label: 'Risk Level' },
        { id: 'betChangeBadge',    label: 'Bet Changes' },
    ]},
    { cat: '\uD83D\uDD25 Streaks', rows: [
        { id: 'outcomeStreakBadge', label: 'Current' },
        { id: 'longestStreakBadge', label: 'Longest' },
        { id: 'longestDroughtBadge',label: 'Drought Record' },
        { id: 'winLossRatio',      label: 'W/L Ratio' },
        { id: 'luckyStreakFire',   label: 'Lucky Streak' },
        { id: 'nearMissHeat',      label: 'Near Miss %' },
        { id: 'lossStreakAlert',   label: 'Loss Alert' },
    ]},
    { cat: '\uD83C\uDFAE Game', rows: [
        { id: 'bonusRoundCount',   label: 'Bonuses Hit' },
        { id: 'featFreqBadge',     label: 'Feature Rate' },
        { id: 'scatterGapBadge',   label: 'Scatter Gap' },
        { id: 'reelHitFreq',       label: 'Hottest Reel' },
        { id: 'luckySymbolBadge',  label: 'Lucky Symbol' },
        { id: 'varianceBadge',     label: 'Variance' },
        { id: 'hotColdIndicator',  label: 'Hot / Cold' },
    ]},
    { cat: '\uD83D\uDCC8 History', rows: [
        { id: 'spinPaceBadge',     label: 'Spin Pace' },
        { id: 'spinDistBadge',     label: 'Spin Distance' },
        { id: 'cumulativeXpBadge', label: 'XP Earned' },
        { id: 'sessCompareBadge',  label: 'vs Last Session' },
        { id: 'winTrendBadge',     label: 'Win Trend' },
        { id: 'rtpConvergence',    label: 'RTP Convergence' },
    ]},
];

function _populateStatsPanel() {
    var body = document.getElementById('srpBody');
    if (!body) return;
    // Clear old content
    while (body.firstChild) body.removeChild(body.firstChild);

    var totalRows = 0;
    _srpCfg.forEach(function (cat) {
        var rows = [];
        cat.rows.forEach(function (r) {
            var el = document.getElementById(r.id);
            var txt = el ? el.textContent.trim() : '';
            if (txt) rows.push({ label: r.label, txt: txt });
        });
        if (!rows.length) return;
        totalRows += rows.length;

        var card = document.createElement('div');
        card.className = 'srp-category';

        var hdr = document.createElement('div');
        hdr.className = 'srp-cat-title';
        hdr.textContent = cat.cat;
        card.appendChild(hdr);

        rows.forEach(function (r) {
            var row = document.createElement('div');
            row.className = 'srp-row';

            var lbl = document.createElement('span');
            lbl.className = 'srp-label';
            lbl.textContent = r.label;

            var val = document.createElement('span');
            val.className = 'srp-value';
            // Colour coding
            if (/\+/.test(r.txt) && !/[A-Za-z]{5}/.test(r.txt)) val.classList.add('srp-pos');
            else if (/^[-\u2212]|[-]\s*[\$]/.test(r.txt)) val.classList.add('srp-neg');
            else if (/[\uD83D\uDD25]|HOT/.test(r.txt)) val.classList.add('srp-hot');
            else if (/^[SABCDF]$/.test(r.txt.trim())) val.classList.add('srp-grade');
            val.textContent = r.txt;
            val.title = r.txt;

            row.appendChild(lbl);
            row.appendChild(val);
            card.appendChild(row);
        });

        body.appendChild(card);
    });

    // Update subtitle
    var sub = document.getElementById('srpSubtitle');
    if (sub) {
        var sc = document.getElementById('spinCounter');
        var scTxt = sc ? sc.textContent.trim() : '';
        sub.textContent = scTxt ? 'After ' + scTxt + ' \u2022 ' + totalRows + ' data points' : 'Live session data';
    }
}

function openStatsPanel() {
    var panel = document.getElementById('statsReportPanel');
    if (!panel) return;
    _populateStatsPanel();
    panel.style.display = 'flex';
    panel.classList.remove('srp-closing');
    _statsReportOpen = true;
}

function closeStatsPanel() {
    var panel = document.getElementById('statsReportPanel');
    if (!panel) return;
    panel.classList.add('srp-closing');
    setTimeout(function () {
        panel.style.display = 'none';
        panel.classList.remove('srp-closing');
    }, 280);
    _statsReportOpen = false;
}

function _initCinematicUI() {
    // Auto-open stats panel every 25 spins (check every 2s)
    if (_cineAutoInterval) clearInterval(_cineAutoInterval);
    _cineLastAutoSpin = 0;
    _cineAutoInterval = setInterval(function () {
        if (_statsReportOpen) return;
        var sc = document.getElementById('spinCounter');
        if (!sc) return;
        var n = parseInt(sc.textContent) || 0;
        if (n >= 25 && n !== _cineLastAutoSpin && n % 25 === 0) {
            _cineLastAutoSpin = n;
            openStatsPanel();
            showCinematicToast('\uD83D\uDCCA ' + n + '-spin report ready', 'info', 2500);
        }
    }, 1800);
}
`);

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 4 — JS HOOK PATCHES
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n── Phase 4: JS hook patches ──');

// 4a. openSlot: call _initCinematicUI() after last sprint-170 reset
patch('js/ui-slot.js',
`        _resetLongestDrought();   // 169 — longest drought
        _resetGameSessionCount(); // 170 — game session count`,
`        _resetLongestDrought();   // 169 — longest drought
        _resetGameSessionCount(); // 170 — game session count
        if (typeof _initCinematicUI === 'function') _initCinematicUI(); // cinematic`
);

// 4b. CLIENT ENGINE win path — dispatch toasts (16-space indent)
patch('js/ui-slot.js',
`                _updateNetPnl();                        // 119 — net P&L
                _updateSessionRating();                 // 120 — session rating
                _earnLuckyCoin(true);                   // 121 — lucky coins (win)`,
`                _updateNetPnl();                        // 119 — net P&L
                _updateSessionRating();                 // 120 — session rating
                _earnLuckyCoin(true);                   // 121 — lucky coins (win)
                if (typeof _dispatchSpinToasts === 'function') _dispatchSpinToasts(true, winAmount, currentBet, { bonusTriggered: (typeof freeSpinsActive !== 'undefined' && freeSpinsActive) }); // cinematic`,
{ all: true }
);

// 4c. CLIENT + SERVER ENGINE loss path — dispatch toasts (12-space indent)
patch('js/ui-slot.js',
`            _updateNetPnl();                           // 119 — net P&L
            _updateSessionRating();                    // 120 — session rating
            _earnLuckyCoin(false);                     // 121 — lucky coins`,
`            _updateNetPnl();                           // 119 — net P&L
            _updateSessionRating();                    // 120 — session rating
            _earnLuckyCoin(false);                     // 121 — lucky coins
            if (typeof _dispatchSpinToasts === 'function') _dispatchSpinToasts(winAmount > 0, winAmount, currentBet, {}); // cinematic`,
{ all: true }
);

console.log('\n✅ cinematic_impl.js complete — all 4 phases applied.\n');
