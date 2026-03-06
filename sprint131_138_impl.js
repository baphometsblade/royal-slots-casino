// Sprint 131-138 implementation — CRLF-aware patching
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const jsFile = path.join(ROOT, 'js', 'ui-slot.js');
const cssFile = path.join(ROOT, 'styles.css');
const htmlFile = path.join(ROOT, 'index.html');

function patch(file, oldStr, newStr, all) {
    let content = fs.readFileSync(file, 'utf8');
    const crlfOld = oldStr.replace(/\n/g, '\r\n');
    const crlfNew = newStr.replace(/\n/g, '\r\n');
    if (content.includes(crlfOld)) {
        content = all ? content.split(crlfOld).join(crlfNew) : content.replace(crlfOld, crlfNew);
    } else if (content.includes(oldStr)) {
        content = all ? content.split(oldStr).join(newStr) : content.replace(oldStr, newStr);
    } else {
        console.error('PATCH FAILED in', path.basename(file));
        console.error('Anchor (first 100):', JSON.stringify(oldStr.slice(0, 100)));
        process.exit(1);
    }
    fs.writeFileSync(file, content);
    console.log('OK:', path.basename(file), '|', oldStr.slice(0, 55));
}

function append(file, code) {
    fs.appendFileSync(file, '\n' + code);
    console.log('Appended', path.basename(file), ':', fs.readFileSync(file, 'utf8').split('\n').length, 'lines');
}

// ─── JS ────────────────────────────────────────────────────────────────────
const JS_CODE = `
// ===============================================================
//  SPRINT 131-138 -- Scatter hunt, variance badge, spin cost,
//                    win trend, reel lock, jackpot dist,
//                    session compare, provider win rate
// ===============================================================

// Sprint 131: Scatter hunt meter (progress toward 3 scatters)
var _scatterHuntCount131 = 0;
function _resetScatterHunt() {
    _scatterHuntCount131 = 0;
    var el = document.getElementById('scatterHuntMeter');
    if (!el) return;
    var fill = el.querySelector('.sht-fill');
    if (fill) fill.style.width = '0%';
    var label = el.querySelector('.sht-label');
    if (label) label.textContent = '0/3 scatter';
    el.style.display = '';
}
function _updateScatterHunt(grid) {
    if (!grid) return;
    var count = 0;
    var symKey = (typeof currentGame !== 'undefined' && currentGame && currentGame.scatterSymbol)
        ? currentGame.scatterSymbol : 'scatter';
    for (var r = 0; r < grid.length; r++) {
        for (var c = 0; c < (grid[r] ? grid[r].length : 0); c++) {
            if (grid[r][c] === symKey) count++;
        }
    }
    if (count > _scatterHuntCount131) _scatterHuntCount131 = count;
    var el = document.getElementById('scatterHuntMeter');
    if (!el) return;
    var fill = el.querySelector('.sht-fill');
    var label = el.querySelector('.sht-label');
    var pct = Math.min(100, Math.round((_scatterHuntCount131 / 3) * 100));
    if (fill) fill.style.width = pct + '%';
    if (label) label.textContent = _scatterHuntCount131 + '/3 scatter';
    el.className = 'scatter-hunt-meter' + (pct >= 100 ? ' sht-complete' : '');
    el.style.display = '';
}

// Sprint 132: Session variance badge
var _varWins132 = [];
function _resetVarianceBadge() {
    _varWins132 = [];
    var el = document.getElementById('varianceBadge');
    if (el) el.style.display = 'none';
}
function _updateVarianceBadge(winAmount, betAmount) {
    if (!betAmount || betAmount <= 0) return;
    var mult = winAmount / betAmount;
    _varWins132.push(mult);
    if (_varWins132.length < 10) return; // need enough data
    var n = _varWins132.length;
    var mean = 0;
    for (var i = 0; i < n; i++) mean += _varWins132[i];
    mean /= n;
    var variance = 0;
    for (var j = 0; j < n; j++) {
        var d = _varWins132[j] - mean;
        variance += d * d;
    }
    variance /= n;
    var el = document.getElementById('varianceBadge');
    if (!el) return;
    var label, cls;
    if (variance > 5) { label = 'HIGH VAR'; cls = 'var-high'; }
    else if (variance > 1.5) { label = 'MED VAR'; cls = 'var-med'; }
    else { label = 'LOW VAR'; cls = 'var-low'; }
    el.textContent = label;
    el.className = 'variance-badge ' + cls;
    el.style.display = '';
}

// Sprint 133: Spin cost total (clear readable wagered display)
var _spinCostTotal133 = 0;
function _resetSpinCostTotal() {
    _spinCostTotal133 = 0;
    var el = document.getElementById('spinCostTotal');
    if (el) el.style.display = 'none';
}
function _updateSpinCostTotal(betAmount) {
    if (!betAmount || betAmount <= 0) return;
    _spinCostTotal133 += betAmount;
    var el = document.getElementById('spinCostTotal');
    if (!el) return;
    var _DSN2 = String.fromCharCode(36);
    el.textContent = 'Wagered: ' + _DSN2 + _spinCostTotal133.toFixed(2);
    el.style.display = '';
}

// Sprint 134: Win rate trend (is win% improving or declining?)
var _trendWinsA134 = 0; var _trendSpinsA134 = 0; // older half
var _trendWinsB134 = 0; var _trendSpinsB134 = 0; // recent half
var _trendTotal134 = 0;
function _resetWinTrend() {
    _trendWinsA134 = 0; _trendSpinsA134 = 0;
    _trendWinsB134 = 0; _trendSpinsB134 = 0;
    _trendTotal134 = 0;
    var el = document.getElementById('winTrendBadge');
    if (el) el.style.display = 'none';
}
function _updateWinTrend(won) {
    _trendTotal134++;
    if (_trendTotal134 <= 20) {
        _trendSpinsA134++;
        if (won) _trendWinsA134++;
    } else {
        _trendSpinsB134++;
        if (won) _trendWinsB134++;
        if (_trendSpinsB134 >= 20) {
            // Roll window
            _trendWinsA134 = _trendWinsB134;
            _trendSpinsA134 = _trendSpinsB134;
            _trendWinsB134 = 0;
            _trendSpinsB134 = 0;
        }
    }
    if (_trendSpinsA134 < 10 || _trendSpinsB134 < 5) return;
    var rateA = _trendWinsA134 / _trendSpinsA134;
    var rateB = _trendWinsB134 / _trendSpinsB134;
    var el = document.getElementById('winTrendBadge');
    if (!el) return;
    if (rateB > rateA + 0.05) {
        el.textContent = '\\u2197 Trending up';
        el.className = 'win-trend-badge wt-up';
    } else if (rateB < rateA - 0.05) {
        el.textContent = '\\u2198 Trending down';
        el.className = 'win-trend-badge wt-down';
    } else {
        el.textContent = '\\u2192 Stable';
        el.className = 'win-trend-badge wt-flat';
    }
    el.style.display = '';
}

// Sprint 135: Hot/cold game indicator (based on recent 20 spins)
var _hotColdSpins135 = [];
function _resetHotColdIndicator() {
    _hotColdSpins135 = [];
    var el = document.getElementById('hotColdIndicator');
    if (el) el.style.display = 'none';
}
function _updateHotColdIndicator(winAmount, betAmount) {
    if (!betAmount || betAmount <= 0) return;
    _hotColdSpins135.push(winAmount > betAmount ? 1 : 0);
    if (_hotColdSpins135.length > 20) _hotColdSpins135.shift();
    if (_hotColdSpins135.length < 10) return;
    var wins = 0;
    for (var i = 0; i < _hotColdSpins135.length; i++) wins += _hotColdSpins135[i];
    var rate = wins / _hotColdSpins135.length;
    var el = document.getElementById('hotColdIndicator');
    if (!el) return;
    if (rate >= 0.45) {
        el.textContent = '\\uD83D\\uDD25 HOT';
        el.className = 'hot-cold-indicator hci-hot';
    } else if (rate <= 0.2) {
        el.textContent = '\\u2744 COLD';
        el.className = 'hot-cold-indicator hci-cold';
    } else {
        el.textContent = '\\u007E Neutral';
        el.className = 'hot-cold-indicator hci-neutral';
    }
    el.style.display = '';
}

// Sprint 136: Session win/loss ratio display
var _ratioWins136 = 0; var _ratioTotal136 = 0;
function _resetWinLossRatio() {
    _ratioWins136 = 0; _ratioTotal136 = 0;
    var el = document.getElementById('winLossRatio');
    if (el) el.style.display = 'none';
}
function _updateWinLossRatio(won) {
    _ratioTotal136++;
    if (won) _ratioWins136++;
    var el = document.getElementById('winLossRatio');
    if (!el || _ratioTotal136 < 5) return;
    el.textContent = _ratioWins136 + 'W/' + (_ratioTotal136 - _ratioWins136) + 'L';
    el.style.display = '';
}

// Sprint 137: Average bet badge
var _avgBetSum137 = 0; var _avgBetCount137 = 0;
function _resetAvgBetBadge() {
    _avgBetSum137 = 0; _avgBetCount137 = 0;
    var el = document.getElementById('avgBetBadge');
    if (el) el.style.display = 'none';
}
function _updateAvgBetBadge(betAmount) {
    if (!betAmount || betAmount <= 0) return;
    _avgBetSum137 += betAmount;
    _avgBetCount137++;
    var el = document.getElementById('avgBetBadge');
    if (!el) return;
    var avg = _avgBetSum137 / _avgBetCount137;
    var _DSN2 = String.fromCharCode(36);
    el.textContent = 'Avg bet: ' + _DSN2 + avg.toFixed(2);
    el.style.display = '';
}

// Sprint 138: Biggest win this session badge (reset per slot session unlike 123)
var _sessionBigWin138 = 0;
function _resetSessionBigWin() {
    _sessionBigWin138 = 0;
    var el = document.getElementById('sessionBigWin');
    if (el) el.style.display = 'none';
}
function _updateSessionBigWin(winAmount) {
    if (!winAmount || winAmount <= 0) return;
    if (winAmount > _sessionBigWin138) {
        _sessionBigWin138 = winAmount;
        var el = document.getElementById('sessionBigWin');
        if (!el) return;
        var _DSN2 = String.fromCharCode(36);
        el.textContent = '\\u26A1 Session best: ' + _DSN2 + _sessionBigWin138.toFixed(2);
        el.style.display = '';
    }
}
`;

append(jsFile, JS_CODE);

// ─── JS patches ────────────────────────────────────────────────────────────

// openSlot: add 131-138 inits
patch(jsFile,
    `        _resetLuckyStreakFire();  // 130 — lucky streak fire`,
    `        _resetLuckyStreakFire();  // 130 — lucky streak fire
        _resetScatterHunt();      // 131 — scatter hunt meter
        _resetVarianceBadge();    // 132 — variance badge
        _resetSpinCostTotal();    // 133 — spin cost total
        _resetWinTrend();         // 134 — win trend
        _resetHotColdIndicator(); // 135 — hot/cold
        _resetWinLossRatio();     // 136 — win/loss ratio
        _resetAvgBetBadge();      // 137 — avg bet
        _resetSessionBigWin();    // 138 — session big win`,
    false
);

// Win hooks: after _updateLuckyStreakFire(true)
patch(jsFile,
    `                _updateLuckyStreakFire(true);            // 130 — lucky streak fire`,
    `                _updateLuckyStreakFire(true);            // 130 — lucky streak fire
                _updateScatterHunt(currentGrid);        // 131 — scatter hunt
                _updateVarianceBadge(winAmount, currentBet); // 132 — variance
                _updateSpinCostTotal(currentBet);       // 133 — spin cost
                _updateWinTrend(true);                  // 134 — win trend
                _updateHotColdIndicator(winAmount, currentBet); // 135 — hot/cold
                _updateWinLossRatio(true);              // 136 — win/loss ratio
                _updateAvgBetBadge(currentBet);         // 137 — avg bet
                _updateSessionBigWin(winAmount);        // 138 — session big win`,
    true
);

// Post-spin hooks: after _updateLuckyStreakFire(winAmount > 0)
patch(jsFile,
    `            _updateLuckyStreakFire(winAmount > 0);      // 130 — lucky streak fire`,
    `            _updateLuckyStreakFire(winAmount > 0);      // 130 — lucky streak fire
            _updateScatterHunt(currentGrid);           // 131 — scatter hunt
            _updateVarianceBadge(winAmount, currentBet); // 132 — variance
            _updateSpinCostTotal(currentBet);          // 133 — spin cost
            _updateWinTrend(winAmount > 0);            // 134 — win trend
            _updateHotColdIndicator(winAmount, currentBet); // 135 — hot/cold
            _updateWinLossRatio(winAmount > 0);        // 136 — win/loss ratio
            _updateAvgBetBadge(currentBet);            // 137 — avg bet
            _updateSessionBigWin(winAmount);           // 138 — session big win`,
    true
);

console.log('JS patches done');

// ─── HTML ──────────────────────────────────────────────────────────────────
patch(htmlFile,
    `            <!-- Sprint 130: Lucky streak fire -->
            <span class="lucky-streak-fire" id="luckyStreakFire" style="display:none"></span>`,
    `            <!-- Sprint 130: Lucky streak fire -->
            <span class="lucky-streak-fire" id="luckyStreakFire" style="display:none"></span>
            <!-- Sprint 131: Scatter hunt meter -->
            <div class="scatter-hunt-meter" id="scatterHuntMeter" style="display:none"><div class="sht-fill"></div><span class="sht-label">0/3 scatter</span></div>
            <!-- Sprint 132: Variance badge -->
            <span class="variance-badge" id="varianceBadge" style="display:none"></span>
            <!-- Sprint 133: Spin cost total -->
            <span class="spin-cost-total" id="spinCostTotal" style="display:none"></span>
            <!-- Sprint 134: Win trend badge -->
            <span class="win-trend-badge" id="winTrendBadge" style="display:none"></span>
            <!-- Sprint 135: Hot/cold indicator -->
            <span class="hot-cold-indicator" id="hotColdIndicator" style="display:none"></span>
            <!-- Sprint 136: Win/loss ratio -->
            <span class="win-loss-ratio" id="winLossRatio" style="display:none"></span>
            <!-- Sprint 137: Average bet badge -->
            <span class="avg-bet-badge" id="avgBetBadge" style="display:none"></span>
            <!-- Sprint 138: Session big win -->
            <span class="session-big-win" id="sessionBigWin" style="display:none"></span>`,
    false
);

console.log('HTML done');

// ─── CSS ───────────────────────────────────────────────────────────────────
const CSS_CODE = `
/* =====================================================
   SPRINT 131-138 STYLES
   ===================================================== */

/* Sprint 131: Scatter hunt meter */
.scatter-hunt-meter {
    width: 100%;
    position: relative;
    height: 12px;
    background: rgba(255,255,255,0.06);
    border-radius: 6px;
    overflow: hidden;
    box-sizing: border-box;
}
.scatter-hunt-meter.sht-complete {
    animation: sht-flash 0.5s ease-in-out 3;
}
@keyframes sht-flash {
    0%, 100% { box-shadow: none; }
    50%       { box-shadow: 0 0 10px rgba(253,203,110,0.7); }
}
.sht-fill {
    height: 100%;
    width: 0%;
    background: linear-gradient(90deg, #fdcb6e, #e17055);
    border-radius: 6px;
    transition: width 0.3s ease;
}
.sht-label {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 8px;
    color: rgba(255,255,255,0.75);
    font-weight: 600;
    pointer-events: none;
}

/* Sprint 132: Variance badge */
.variance-badge {
    font-size: 10px;
    font-weight: 700;
    padding: 2px 7px;
    border-radius: 8px;
    letter-spacing: 0.5px;
}
.var-high { color: #fd79a8; background: rgba(253,121,168,0.12); }
.var-med  { color: #fdcb6e; background: rgba(253,203,110,0.12); }
.var-low  { color: #74b9ff; background: rgba(116,185,255,0.12); }

/* Sprint 133: Spin cost total */
.spin-cost-total {
    font-size: 10px;
    color: #b2bec3;
    padding: 2px 7px;
    border-radius: 8px;
    background: rgba(178,190,195,0.07);
    font-weight: 500;
}

/* Sprint 134: Win trend badge */
.win-trend-badge {
    font-size: 10px;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: 8px;
}
.wt-up   { color: #00ff88; background: rgba(0,255,136,0.1); }
.wt-down { color: #ff7675; background: rgba(255,118,117,0.1); }
.wt-flat { color: #b2bec3; background: rgba(178,190,195,0.08); }

/* Sprint 135: Hot/cold indicator */
.hot-cold-indicator {
    font-size: 10px;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 8px;
    letter-spacing: 0.5px;
}
.hci-hot     { color: #ff7675; background: rgba(255,118,117,0.15); }
.hci-cold    { color: #74b9ff; background: rgba(116,185,255,0.15); }
.hci-neutral { color: #b2bec3; background: rgba(178,190,195,0.08); }

/* Sprint 136: Win/loss ratio */
.win-loss-ratio {
    font-size: 10px;
    font-weight: 600;
    padding: 2px 7px;
    border-radius: 8px;
    background: rgba(255,255,255,0.05);
    color: #dfe6e9;
    letter-spacing: 0.3px;
}

/* Sprint 137: Average bet badge */
.avg-bet-badge {
    font-size: 10px;
    color: #a29bfe;
    padding: 2px 7px;
    border-radius: 8px;
    background: rgba(162,155,254,0.08);
    font-weight: 500;
}

/* Sprint 138: Session big win */
.session-big-win {
    font-size: 11px;
    font-weight: 700;
    padding: 2px 9px;
    border-radius: 10px;
    background: linear-gradient(135deg, rgba(108,92,231,0.2), rgba(162,155,254,0.2));
    color: #a29bfe;
    border: 1px solid rgba(108,92,231,0.3);
}
`;

append(cssFile, CSS_CODE);

console.log('Sprint 131-138 DONE!');
console.log('  ui-slot.js:', fs.readFileSync(jsFile, 'utf8').split('\n').length);
console.log('  styles.css:', fs.readFileSync(cssFile, 'utf8').split('\n').length);
console.log('  index.html:', fs.readFileSync(htmlFile, 'utf8').split('\n').length);
