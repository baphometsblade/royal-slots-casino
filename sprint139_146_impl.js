// Sprint 139-146 implementation — CRLF-aware patching
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
//  SPRINT 139-146 -- Spin timer, symbol streak, balance %,
//                    scatter pos, autoplay P&L, feature freq,
//                    symbol dist, session grade
// ===============================================================

// Sprint 139: Spin-to-win timer (ms from spin press to win reveal)
var _spinTimerStart139 = 0;
function _resetSpinTimerBadge() {
    _spinTimerStart139 = 0;
    var el = document.getElementById('spinTimerBadge');
    if (el) el.style.display = 'none';
}
function _startSpinTimer139() {
    _spinTimerStart139 = Date.now();
}
function _stopSpinTimer139(won) {
    if (!_spinTimerStart139) return;
    var elapsed = Date.now() - _spinTimerStart139;
    _spinTimerStart139 = 0;
    if (!won) return; // only show on wins
    var el = document.getElementById('spinTimerBadge');
    if (!el) return;
    el.textContent = elapsed + 'ms spin';
    el.style.display = '';
}

// Sprint 140: Balance % change since session start
var _balPctStart140 = 0;
function _resetBalPctBadge() {
    _balPctStart140 = (typeof balance !== 'undefined') ? balance : 0;
    var el = document.getElementById('balPctBadge');
    if (el) el.style.display = 'none';
}
function _updateBalPctBadge() {
    var cur = (typeof balance !== 'undefined') ? balance : 0;
    if (!_balPctStart140) return;
    var pct = ((cur - _balPctStart140) / _balPctStart140) * 100;
    var el = document.getElementById('balPctBadge');
    if (!el) return;
    var sign = pct >= 0 ? '+' : '';
    el.textContent = sign + pct.toFixed(1) + '% balance';
    el.className = 'bal-pct-badge' + (pct >= 0 ? ' bpb-pos' : ' bpb-neg');
    el.style.display = '';
}

// Sprint 141: Max win multiplier this session (shown as x factor)
var _sessionMaxMult141 = 0;
function _resetSessionMaxMult() {
    _sessionMaxMult141 = 0;
    var el = document.getElementById('sessionMaxMult');
    if (el) el.style.display = 'none';
}
function _updateSessionMaxMult(winAmount, betAmount) {
    if (!winAmount || !betAmount || betAmount <= 0) return;
    var mult = winAmount / betAmount;
    if (mult <= 1) return;
    if (mult > _sessionMaxMult141) {
        _sessionMaxMult141 = mult;
        var el = document.getElementById('sessionMaxMult');
        if (!el) return;
        el.textContent = '\\u00D7' + Math.round(_sessionMaxMult141) + ' max mult';
        el.style.display = '';
    }
}

// Sprint 142: Symbol distribution tracker (top 3 symbols this session)
var _symDistCounts142 = {};
function _resetSymbolDist() {
    _symDistCounts142 = {};
    var el = document.getElementById('symbolDistBar');
    if (el) { while (el.firstChild) el.removeChild(el.firstChild); el.style.display = 'none'; }
}
function _updateSymbolDist(grid) {
    if (!grid) return;
    for (var r = 0; r < grid.length; r++) {
        for (var c = 0; c < (grid[r] ? grid[r].length : 0); c++) {
            var sym = grid[r][c];
            if (!sym) continue;
            _symDistCounts142[sym] = (_symDistCounts142[sym] || 0) + 1;
        }
    }
    var el = document.getElementById('symbolDistBar');
    if (!el) return;
    var syms = Object.keys(_symDistCounts142);
    if (syms.length === 0) return;
    syms.sort(function(a, b) { return _symDistCounts142[b] - _symDistCounts142[a]; });
    var top3 = syms.slice(0, 3);
    var maxCount = _symDistCounts142[top3[0]] || 1;
    while (el.firstChild) el.removeChild(el.firstChild);
    for (var i = 0; i < top3.length; i++) {
        var sym2 = top3[i];
        var pct = Math.round((_symDistCounts142[sym2] / maxCount) * 100);
        var wrap = document.createElement('span');
        wrap.className = 'sdb-item';
        var bar = document.createElement('span');
        bar.className = 'sdb-fill';
        bar.style.width = pct + '%';
        var label = document.createElement('span');
        label.className = 'sdb-sym';
        label.textContent = sym2.slice(0, 3);
        wrap.appendChild(bar);
        wrap.appendChild(label);
        el.appendChild(wrap);
    }
    el.style.display = '';
}

// Sprint 143: Autoplay session P&L
var _autoplayPnlStart143 = 0;
var _autoplayTracking143 = false;
function _resetAutoplayPnl() {
    _autoplayPnlStart143 = 0;
    _autoplayTracking143 = false;
    var el = document.getElementById('autoplayPnlBadge');
    if (el) el.style.display = 'none';
}
function _startAutoplayTracking143() {
    _autoplayPnlStart143 = (typeof balance !== 'undefined') ? balance : 0;
    _autoplayTracking143 = true;
}
function _updateAutoplayPnl() {
    if (!_autoplayTracking143) return;
    var cur = (typeof balance !== 'undefined') ? balance : 0;
    var pnl = cur - _autoplayPnlStart143;
    var el = document.getElementById('autoplayPnlBadge');
    if (!el) return;
    var _DSN2 = String.fromCharCode(36);
    var sign = pnl >= 0 ? '+' : '';
    el.textContent = 'Auto: ' + sign + _DSN2 + pnl.toFixed(2);
    el.className = 'autoplay-pnl-badge' + (pnl >= 0 ? ' apb-pos' : ' apb-neg');
    el.style.display = '';
}

// Sprint 144: Feature frequency meter (how often per spin features fire)
var _featFreqCount144 = 0; var _featFreqSpins144 = 0;
function _resetFeatFreq() {
    _featFreqCount144 = 0; _featFreqSpins144 = 0;
    var el = document.getElementById('featFreqBadge');
    if (el) el.style.display = 'none';
}
function _recordFeatFreqSpin(triggered) {
    _featFreqSpins144++;
    if (triggered) _featFreqCount144++;
    if (_featFreqSpins144 < 10) return;
    var el = document.getElementById('featFreqBadge');
    if (!el) return;
    var rate = (_featFreqCount144 / _featFreqSpins144) * 100;
    el.textContent = 'Feature: 1/' + Math.round(_featFreqSpins144 / Math.max(_featFreqCount144, 1));
    el.style.display = '';
}

// Sprint 145: Session grade (A-F based on RTP performance)
function _resetSessionGrade() {
    var el = document.getElementById('sessionGrade');
    if (el) el.style.display = 'none';
}
function _updateSessionGrade(totalWon, totalWagered) {
    if (!totalWagered || totalWagered <= 0) return;
    var rtp = totalWon / totalWagered;
    var el = document.getElementById('sessionGrade');
    if (!el) return;
    var grade, cls;
    if (rtp >= 1.5)      { grade = 'S'; cls = 'sg-s'; }
    else if (rtp >= 1.2) { grade = 'A'; cls = 'sg-a'; }
    else if (rtp >= 1.0) { grade = 'B'; cls = 'sg-b'; }
    else if (rtp >= 0.8) { grade = 'C'; cls = 'sg-c'; }
    else if (rtp >= 0.6) { grade = 'D'; cls = 'sg-d'; }
    else                 { grade = 'F'; cls = 'sg-f'; }
    el.textContent = 'Grade: ' + grade;
    el.className = 'session-grade ' + cls;
    el.style.display = '';
}

// Sprint 146: Session time efficiency (wins per minute)
var _timeEffStart146 = 0; var _timeEffWins146 = 0;
function _resetTimeEff() {
    _timeEffStart146 = Date.now();
    _timeEffWins146 = 0;
    var el = document.getElementById('timeEffBadge');
    if (el) el.style.display = 'none';
}
function _updateTimeEff(won) {
    if (won) _timeEffWins146++;
    if (_timeEffWins146 === 0) return;
    var mins = (Date.now() - _timeEffStart146) / 60000;
    if (mins < 0.5) return;
    var wpm = _timeEffWins146 / mins;
    var el = document.getElementById('timeEffBadge');
    if (!el) return;
    el.textContent = wpm.toFixed(1) + ' wins/min';
    el.style.display = '';
}
`;

append(jsFile, JS_CODE);

// ─── JS patches ────────────────────────────────────────────────────────────

// openSlot: add 139-146 inits
patch(jsFile,
    `        _resetSessionBigWin();    // 138 — session big win`,
    `        _resetSessionBigWin();    // 138 — session big win
        _resetSpinTimerBadge();   // 139 — spin timer
        _resetBalPctBadge();      // 140 — balance %
        _resetSessionMaxMult();   // 141 — session max mult
        _resetSymbolDist();       // 142 — symbol dist
        _resetAutoplayPnl();      // 143 — autoplay P&L
        _resetFeatFreq();         // 144 — feature freq
        _resetSessionGrade();     // 145 — session grade
        _resetTimeEff();          // 146 — time efficiency`,
    false
);

// Win hooks: after _updateSessionBigWin(winAmount)
patch(jsFile,
    `                _updateSessionBigWin(winAmount);        // 138 — session big win`,
    `                _updateSessionBigWin(winAmount);        // 138 — session big win
                _stopSpinTimer139(true);               // 139 — spin timer (win)
                _updateBalPctBadge();                  // 140 — balance %
                _updateSessionMaxMult(winAmount, currentBet); // 141 — session max mult
                _updateSymbolDist(currentGrid);        // 142 — symbol dist
                _updateAutoplayPnl();                  // 143 — autoplay P&L
                _recordFeatFreqSpin(freeSpinsActive);  // 144 — feature freq
                _updateSessionGrade(_sessWon84, _sessWagered84); // 145 — grade
                _updateTimeEff(true);                  // 146 — time eff`,
    true
);

// Post-spin hooks: after _updateSessionBigWin(winAmount)
patch(jsFile,
    `            _updateSessionBigWin(winAmount);           // 138 — session big win`,
    `            _updateSessionBigWin(winAmount);           // 138 — session big win
            _stopSpinTimer139(winAmount > 0);          // 139 — spin timer
            _updateBalPctBadge();                      // 140 — balance %
            _updateSessionMaxMult(winAmount, currentBet); // 141 — session max mult
            _updateSymbolDist(currentGrid);            // 142 — symbol dist
            _updateAutoplayPnl();                      // 143 — autoplay P&L
            _recordFeatFreqSpin(freeSpinsActive);      // 144 — feature freq
            _updateSessionGrade(_sessWon84, _sessWagered84); // 145 — grade
            _updateTimeEff(winAmount > 0);             // 146 — time eff`,
    true
);

// Spin start hook: record timer start when spin begins
patch(jsFile,
    `            spinning = true;
            _incrementSpinCounter(); // Sprint 48`,
    `            spinning = true;
            if (typeof _startSpinTimer139 === 'function') _startSpinTimer139(); // 139
            _incrementSpinCounter(); // Sprint 48`,
    false
);

console.log('JS patches done');

// ─── HTML ──────────────────────────────────────────────────────────────────
patch(htmlFile,
    `            <!-- Sprint 138: Session big win -->
            <span class="session-big-win" id="sessionBigWin" style="display:none"></span>`,
    `            <!-- Sprint 138: Session big win -->
            <span class="session-big-win" id="sessionBigWin" style="display:none"></span>
            <!-- Sprint 139: Spin timer badge -->
            <span class="spin-timer-badge" id="spinTimerBadge" style="display:none"></span>
            <!-- Sprint 140: Balance % change -->
            <span class="bal-pct-badge" id="balPctBadge" style="display:none"></span>
            <!-- Sprint 141: Session max multiplier -->
            <span class="session-max-mult" id="sessionMaxMult" style="display:none"></span>
            <!-- Sprint 142: Symbol distribution bar -->
            <div class="symbol-dist-bar" id="symbolDistBar" style="display:none"></div>
            <!-- Sprint 143: Autoplay P&L badge -->
            <span class="autoplay-pnl-badge" id="autoplayPnlBadge" style="display:none"></span>
            <!-- Sprint 144: Feature frequency badge -->
            <span class="feat-freq-badge" id="featFreqBadge" style="display:none"></span>
            <!-- Sprint 145: Session grade -->
            <span class="session-grade" id="sessionGrade" style="display:none"></span>
            <!-- Sprint 146: Time efficiency badge -->
            <span class="time-eff-badge" id="timeEffBadge" style="display:none"></span>`,
    false
);

console.log('HTML done');

// ─── CSS ───────────────────────────────────────────────────────────────────
const CSS_CODE = `
/* =====================================================
   SPRINT 139-146 STYLES
   ===================================================== */

/* Sprint 139: Spin timer badge */
.spin-timer-badge {
    font-size: 10px;
    color: #00cec9;
    padding: 2px 7px;
    border-radius: 8px;
    background: rgba(0,206,201,0.08);
    font-weight: 600;
    font-variant-numeric: tabular-nums;
}

/* Sprint 140: Balance % change */
.bal-pct-badge {
    font-size: 10px;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 8px;
}
.bpb-pos { color: #00ff88; background: rgba(0,255,136,0.1); }
.bpb-neg { color: #ff7675; background: rgba(255,118,117,0.1); }

/* Sprint 141: Session max multiplier */
.session-max-mult {
    font-size: 11px;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 10px;
    background: linear-gradient(135deg, rgba(253,203,110,0.15), rgba(253,121,168,0.15));
    color: #fdcb6e;
    border: 1px solid rgba(253,203,110,0.3);
}

/* Sprint 142: Symbol distribution bar */
.symbol-dist-bar {
    display: flex;
    flex-direction: column;
    gap: 2px;
    width: 100%;
    padding: 3px 0;
}
.sdb-item {
    display: flex;
    align-items: center;
    gap: 4px;
    position: relative;
    height: 10px;
}
.sdb-fill {
    height: 100%;
    background: linear-gradient(90deg, rgba(108,92,231,0.4), rgba(162,155,254,0.4));
    border-radius: 3px;
    min-width: 4px;
    transition: width 0.3s ease;
}
.sdb-sym {
    font-size: 8px;
    color: rgba(255,255,255,0.6);
    font-weight: 600;
    min-width: 20px;
    text-transform: uppercase;
    letter-spacing: 0.3px;
}

/* Sprint 143: Autoplay P&L badge */
.autoplay-pnl-badge {
    font-size: 10px;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 8px;
}
.apb-pos { color: #00ff88; background: rgba(0,255,136,0.1); }
.apb-neg { color: #ff7675; background: rgba(255,118,117,0.1); }

/* Sprint 144: Feature frequency badge */
.feat-freq-badge {
    font-size: 10px;
    color: #a29bfe;
    padding: 2px 7px;
    border-radius: 8px;
    background: rgba(162,155,254,0.08);
    font-weight: 500;
}

/* Sprint 145: Session grade */
.session-grade {
    font-size: 12px;
    font-weight: 900;
    padding: 2px 8px;
    border-radius: 8px;
    letter-spacing: 0.5px;
}
.sg-s { color: #ffd700; background: rgba(255,215,0,0.15); border: 1px solid rgba(255,215,0,0.3); }
.sg-a { color: #00ff88; background: rgba(0,255,136,0.12); }
.sg-b { color: #74b9ff; background: rgba(116,185,255,0.12); }
.sg-c { color: #fdcb6e; background: rgba(253,203,110,0.12); }
.sg-d { color: #ff7675; background: rgba(255,118,117,0.12); }
.sg-f { color: #d63031; background: rgba(214,48,49,0.15); }

/* Sprint 146: Time efficiency badge */
.time-eff-badge {
    font-size: 10px;
    color: #00cec9;
    padding: 2px 7px;
    border-radius: 8px;
    background: rgba(0,206,201,0.08);
    font-weight: 500;
}
`;

append(cssFile, CSS_CODE);

console.log('Sprint 139-146 DONE!');
console.log('  ui-slot.js:', fs.readFileSync(jsFile, 'utf8').split('\n').length);
console.log('  styles.css:', fs.readFileSync(cssFile, 'utf8').split('\n').length);
console.log('  index.html:', fs.readFileSync(htmlFile, 'utf8').split('\n').length);
