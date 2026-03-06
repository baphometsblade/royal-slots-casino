// Sprint 163-170 implementation — CRLF-aware patching
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
//  SPRINT 163-170 -- Win type label, longest streak, bet changes,
//                    lucky symbol, win denomination, return gap,
//                    no-scatter counter, session summary
// ===============================================================

// Sprint 163: Last win type label
function _resetWinTypeLabel() {
    var el = document.getElementById('winTypeLabel');
    if (el) el.style.display = 'none';
}
function _setWinTypeLabel(type) {
    // type: 'line', 'scatter', 'bonus', 'respin'
    var el = document.getElementById('winTypeLabel');
    if (!el) return;
    var labels = { line: 'LINE WIN', scatter: 'SCATTER WIN', bonus: 'BONUS WIN', respin: 'RESPIN WIN' };
    var cls = { line: 'wtl-line', scatter: 'wtl-scatter', bonus: 'wtl-bonus', respin: 'wtl-respin' };
    el.textContent = labels[type] || 'WIN';
    el.className = 'win-type-label ' + (cls[type] || '');
    el.style.display = '';
    // auto-hide after 3s
    if (el._wtlTimer) clearTimeout(el._wtlTimer);
    el._wtlTimer = setTimeout(function() { el.style.display = 'none'; }, 3000);
}

// Sprint 164: Session longest win/loss streak
var _longestWinStreak164 = 0; var _longestLossStreak164 = 0;
var _curWin164 = 0; var _curLoss164 = 0;
function _resetLongestStreak() {
    _longestWinStreak164 = 0; _longestLossStreak164 = 0;
    _curWin164 = 0; _curLoss164 = 0;
    var el = document.getElementById('longestStreakBadge');
    if (el) el.style.display = 'none';
}
function _updateLongestStreak(won) {
    if (won) {
        _curWin164++;
        _curLoss164 = 0;
        if (_curWin164 > _longestWinStreak164) _longestWinStreak164 = _curWin164;
    } else {
        _curLoss164++;
        _curWin164 = 0;
        if (_curLoss164 > _longestLossStreak164) _longestLossStreak164 = _curLoss164;
    }
    var el = document.getElementById('longestStreakBadge');
    if (!el) return;
    if (_longestWinStreak164 >= 3 || _longestLossStreak164 >= 5) {
        var parts = [];
        if (_longestWinStreak164 >= 3) parts.push('Best: ' + _longestWinStreak164 + 'W');
        if (_longestLossStreak164 >= 5) parts.push('Worst: ' + _longestLossStreak164 + 'L');
        el.textContent = parts.join(' | ');
        el.style.display = '';
    } else {
        el.style.display = 'none';
    }
}

// Sprint 165: Bet change counter
var _betChanges165 = 0; var _lastBet165 = 0;
function _resetBetChanges() {
    _betChanges165 = 0;
    _lastBet165 = (typeof currentBet !== 'undefined') ? currentBet : 0;
    var el = document.getElementById('betChangeBadge');
    if (el) el.style.display = 'none';
}
function _checkBetChange() {
    var bet = (typeof currentBet !== 'undefined') ? currentBet : 0;
    if (_lastBet165 !== 0 && bet !== _lastBet165) {
        _betChanges165++;
        var el = document.getElementById('betChangeBadge');
        if (el && _betChanges165 >= 3) {
            el.textContent = _betChanges165 + ' bet changes';
            el.style.display = '';
        }
    }
    _lastBet165 = bet;
}

// Sprint 166: Lucky symbol (symbol with best avg multiplier)
var _symMultSums166 = {}; var _symMultCounts166 = {};
function _resetLuckySymbol() {
    _symMultSums166 = {}; _symMultCounts166 = {};
    var el = document.getElementById('luckySymbolBadge');
    if (el) el.style.display = 'none';
}
function _updateLuckySymbol(winAmount, betAmount, grid) {
    if (!winAmount || !betAmount || betAmount <= 0 || !grid) return;
    var mult = winAmount / betAmount;
    if (mult < 2) return;
    // Identify the symbol that appeared most in the winning grid
    var counts = {};
    for (var r = 0; r < grid.length; r++) {
        for (var c = 0; c < (grid[r] ? grid[r].length : 0); c++) {
            var s = grid[r][c];
            if (s) counts[s] = (counts[s] || 0) + 1;
        }
    }
    var topSym = null; var topCount = 0;
    var keys = Object.keys(counts);
    for (var i = 0; i < keys.length; i++) {
        if (counts[keys[i]] > topCount) { topCount = counts[keys[i]]; topSym = keys[i]; }
    }
    if (!topSym) return;
    _symMultSums166[topSym] = (_symMultSums166[topSym] || 0) + mult;
    _symMultCounts166[topSym] = (_symMultCounts166[topSym] || 0) + 1;
    var bestSym = null; var bestAvg = 0;
    var symKeys = Object.keys(_symMultSums166);
    for (var j = 0; j < symKeys.length; j++) {
        var avg = _symMultSums166[symKeys[j]] / _symMultCounts166[symKeys[j]];
        if (avg > bestAvg) { bestAvg = avg; bestSym = symKeys[j]; }
    }
    var el = document.getElementById('luckySymbolBadge');
    if (!el || !bestSym) return;
    el.textContent = '\\u2728 Lucky: ' + bestSym.slice(0, 6);
    el.style.display = '';
}

// Sprint 167: Return gap display (session vs theoretical 88%)
var _retGapWon167 = 0; var _retGapWag167 = 0;
function _resetReturnGap() {
    _retGapWon167 = 0; _retGapWag167 = 0;
    var el = document.getElementById('returnGapBadge');
    if (el) el.style.display = 'none';
}
function _updateReturnGap(winAmount, betAmount) {
    if (!betAmount || betAmount <= 0) return;
    _retGapWag167 += betAmount;
    _retGapWon167 += (winAmount || 0);
    if (_retGapWag167 < 10) return;
    var sessionRtp = (_retGapWon167 / _retGapWag167) * 100;
    var gap = sessionRtp - 88;
    var el = document.getElementById('returnGapBadge');
    if (!el) return;
    var sign = gap >= 0 ? '+' : '';
    el.textContent = sign + gap.toFixed(0) + '% vs house';
    el.className = 'return-gap-badge' + (gap >= 0 ? ' rgb-ahead' : ' rgb-behind');
    el.style.display = '';
}

// Sprint 168: Total wins value vs total losses value ratio
var _valWon168 = 0; var _valLost168 = 0;
function _resetValueRatio() {
    _valWon168 = 0; _valLost168 = 0;
    var el = document.getElementById('valueRatioBadge');
    if (el) el.style.display = 'none';
}
function _updateValueRatio(winAmount, betAmount) {
    if (!betAmount || betAmount <= 0) return;
    _valLost168 += betAmount;
    _valWon168 += (winAmount || 0);
    if (_valLost168 < 10) return;
    var ratio = _valWon168 / _valLost168;
    var el = document.getElementById('valueRatioBadge');
    if (!el) return;
    el.textContent = ratio.toFixed(2) + 'x return';
    el.className = 'value-ratio-badge' + (ratio >= 1 ? ' vrb-pos' : ratio >= 0.7 ? ' vrb-mid' : ' vrb-low');
    el.style.display = '';
}

// Sprint 169: Longest gap without any win (spins)
var _longestDrought169 = 0; var _curDrought169 = 0;
function _resetLongestDrought() {
    _longestDrought169 = 0; _curDrought169 = 0;
    var el = document.getElementById('longestDroughtBadge');
    if (el) el.style.display = 'none';
}
function _updateLongestDrought(won) {
    if (won) {
        _curDrought169 = 0;
    } else {
        _curDrought169++;
        if (_curDrought169 > _longestDrought169) _longestDrought169 = _curDrought169;
    }
    var el = document.getElementById('longestDroughtBadge');
    if (!el) return;
    if (_longestDrought169 >= 10) {
        el.textContent = 'Longest drought: ' + _longestDrought169;
        el.className = 'longest-drought-badge' + (_longestDrought169 >= 50 ? ' ldb-severe' : _longestDrought169 >= 25 ? ' ldb-warn' : '');
        el.style.display = '';
    } else {
        el.style.display = 'none';
    }
}

// Sprint 170: Total game sessions played (localStorage)
var _gameSessionKey170 = 'casino_sessions_';
function _resetGameSessionCount() {
    var el = document.getElementById('gameSessionCount');
    if (!el) return;
    var gid = (typeof currentGame !== 'undefined' && currentGame) ? currentGame.id : 'unknown';
    var key = _gameSessionKey170 + gid;
    var prev = parseInt(localStorage.getItem(key) || '0');
    prev++;
    try { localStorage.setItem(key, String(prev)); } catch(e) {}
    el.textContent = 'Session #' + prev + ' on this game';
    el.style.display = '';
}
`;

append(jsFile, JS_CODE);

// ─── JS patches ────────────────────────────────────────────────────────────

// openSlot: add 163-170 inits
patch(jsFile,
    `        _resetBiggestLoss();      // 162 — biggest loss`,
    `        _resetBiggestLoss();      // 162 — biggest loss
        _resetWinTypeLabel();     // 163 — win type label
        _resetLongestStreak();    // 164 — longest streak
        _resetBetChanges();       // 165 — bet changes
        _resetLuckySymbol();      // 166 — lucky symbol
        _resetReturnGap();        // 167 — return gap
        _resetValueRatio();       // 168 — value ratio
        _resetLongestDrought();   // 169 — longest drought
        _resetGameSessionCount(); // 170 — game session count`,
    false
);

// Win hooks: after _updateBiggestLoss(winAmount, currentBet)
patch(jsFile,
    `                _updateBiggestLoss(winAmount, currentBet); // 162 — biggest loss`,
    `                _updateBiggestLoss(winAmount, currentBet); // 162 — biggest loss
                _setWinTypeLabel('line');               // 163 — win type label
                _updateLongestStreak(true);             // 164 — longest streak
                _checkBetChange();                      // 165 — bet changes
                _updateLuckySymbol(winAmount, currentBet, currentGrid); // 166 — lucky sym
                _updateReturnGap(winAmount, currentBet); // 167 — return gap
                _updateValueRatio(winAmount, currentBet); // 168 — value ratio
                _updateLongestDrought(true);            // 169 — longest drought`,
    true
);

// Post-spin hooks: after _updateBiggestLoss(winAmount, currentBet)
patch(jsFile,
    `            _updateBiggestLoss(winAmount, currentBet); // 162 — biggest loss`,
    `            _updateBiggestLoss(winAmount, currentBet); // 162 — biggest loss
            _updateLongestStreak(winAmount > 0);       // 164 — longest streak
            _checkBetChange();                         // 165 — bet changes
            _updateLuckySymbol(winAmount, currentBet, currentGrid); // 166 — lucky sym
            _updateReturnGap(winAmount, currentBet);   // 167 — return gap
            _updateValueRatio(winAmount, currentBet);  // 168 — value ratio
            _updateLongestDrought(winAmount > 0);      // 169 — longest drought`,
    true
);

console.log('JS patches done');

// ─── HTML ──────────────────────────────────────────────────────────────────
patch(htmlFile,
    `            <!-- Sprint 162: Biggest loss badge -->
            <span class="biggest-loss-badge" id="biggestLossBadge" style="display:none"></span>`,
    `            <!-- Sprint 162: Biggest loss badge -->
            <span class="biggest-loss-badge" id="biggestLossBadge" style="display:none"></span>
            <!-- Sprint 163: Win type label -->
            <span class="win-type-label" id="winTypeLabel" style="display:none"></span>
            <!-- Sprint 164: Longest streak badge -->
            <span class="longest-streak-badge" id="longestStreakBadge" style="display:none"></span>
            <!-- Sprint 165: Bet change badge -->
            <span class="bet-change-badge" id="betChangeBadge" style="display:none"></span>
            <!-- Sprint 166: Lucky symbol badge -->
            <span class="lucky-symbol-badge" id="luckySymbolBadge" style="display:none"></span>
            <!-- Sprint 167: Return gap badge -->
            <span class="return-gap-badge" id="returnGapBadge" style="display:none"></span>
            <!-- Sprint 168: Value ratio badge -->
            <span class="value-ratio-badge" id="valueRatioBadge" style="display:none"></span>
            <!-- Sprint 169: Longest drought badge -->
            <span class="longest-drought-badge" id="longestDroughtBadge" style="display:none"></span>
            <!-- Sprint 170: Game session count -->
            <span class="game-session-count" id="gameSessionCount" style="display:none"></span>`,
    false
);

console.log('HTML done');

// ─── CSS ───────────────────────────────────────────────────────────────────
const CSS_CODE = `
/* =====================================================
   SPRINT 163-170 STYLES
   ===================================================== */

/* Sprint 163: Win type label */
.win-type-label {
    font-size: 11px;
    font-weight: 900;
    padding: 3px 10px;
    border-radius: 10px;
    letter-spacing: 1px;
    animation: wtl-appear 0.3s ease-out;
}
@keyframes wtl-appear {
    from { transform: scale(0.8); opacity: 0; }
    to   { transform: scale(1);   opacity: 1; }
}
.wtl-line    { color: #00ff88; background: rgba(0,255,136,0.12); border: 1px solid rgba(0,255,136,0.25); }
.wtl-scatter { color: #fdcb6e; background: rgba(253,203,110,0.12); border: 1px solid rgba(253,203,110,0.25); }
.wtl-bonus   { color: #fd79a8; background: rgba(253,121,168,0.12); border: 1px solid rgba(253,121,168,0.25); }
.wtl-respin  { color: #74b9ff; background: rgba(116,185,255,0.12); border: 1px solid rgba(116,185,255,0.25); }

/* Sprint 164: Longest streak badge */
.longest-streak-badge {
    font-size: 10px;
    font-weight: 600;
    padding: 2px 7px;
    border-radius: 8px;
    background: rgba(255,255,255,0.05);
    color: #dfe6e9;
}

/* Sprint 165: Bet change badge */
.bet-change-badge {
    font-size: 10px;
    color: #b2bec3;
    padding: 2px 7px;
    border-radius: 8px;
    background: rgba(178,190,195,0.07);
    font-weight: 400;
}

/* Sprint 166: Lucky symbol badge */
.lucky-symbol-badge {
    font-size: 10px;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 8px;
    background: linear-gradient(135deg, rgba(253,203,110,0.15), rgba(255,234,167,0.15));
    color: #ffeaa7;
}

/* Sprint 167: Return gap badge */
.return-gap-badge {
    font-size: 10px;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 8px;
}
.rgb-ahead  { color: #00ff88; background: rgba(0,255,136,0.1); }
.rgb-behind { color: #ff7675; background: rgba(255,118,117,0.1); }

/* Sprint 168: Value ratio badge */
.value-ratio-badge {
    font-size: 10px;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 8px;
}
.vrb-pos { color: #00ff88; background: rgba(0,255,136,0.1); }
.vrb-mid { color: #fdcb6e; background: rgba(253,203,110,0.1); }
.vrb-low { color: #ff7675; background: rgba(255,118,117,0.1); }

/* Sprint 169: Longest drought badge */
.longest-drought-badge {
    font-size: 10px;
    padding: 2px 7px;
    border-radius: 8px;
    background: rgba(99,110,114,0.1);
    color: #636e72;
    font-weight: 600;
}
.longest-drought-badge.ldb-warn   { color: #fdcb6e; background: rgba(253,203,110,0.1); }
.longest-drought-badge.ldb-severe { color: #ff7675; background: rgba(255,118,117,0.12); }

/* Sprint 170: Game session count */
.game-session-count {
    font-size: 10px;
    color: #74b9ff;
    padding: 2px 7px;
    border-radius: 8px;
    background: rgba(116,185,255,0.08);
    font-weight: 500;
}
`;

append(cssFile, CSS_CODE);

console.log('Sprint 163-170 DONE!');
console.log('  ui-slot.js:', fs.readFileSync(jsFile, 'utf8').split('\n').length);
console.log('  styles.css:', fs.readFileSync(cssFile, 'utf8').split('\n').length);
console.log('  index.html:', fs.readFileSync(htmlFile, 'utf8').split('\n').length);
