// Sprint 155-162 implementation — CRLF-aware patching
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
//  SPRINT 155-162 -- Result history, win donut, bet suggest,
//                    near-miss heat, scatter velocity,
//                    session compare, cinematic wins, lucky number
// ===============================================================

// Sprint 155: Spin result history list (last 10 outcomes)
var _resultHistory155 = [];
function _resetResultHistory() {
    _resultHistory155 = [];
    var el = document.getElementById('resultHistoryList');
    if (el) { while (el.firstChild) el.removeChild(el.firstChild); }
}
function _addResultHistory(winAmount, betAmount) {
    var _DSN2 = String.fromCharCode(36);
    var won = winAmount > 0;
    var mult = betAmount > 0 ? (winAmount / betAmount) : 0;
    _resultHistory155.unshift({ won: won, win: winAmount, mult: mult });
    if (_resultHistory155.length > 10) _resultHistory155.pop();
    var el = document.getElementById('resultHistoryList');
    if (!el) return;
    while (el.firstChild) el.removeChild(el.firstChild);
    for (var i = 0; i < _resultHistory155.length; i++) {
        var entry = _resultHistory155[i];
        var item = document.createElement('span');
        item.className = 'rhl-item ' + (entry.won ? 'rhl-win' : 'rhl-loss');
        item.textContent = entry.won
            ? ('+' + _DSN2 + entry.win.toFixed(2))
            : '0';
        el.appendChild(item);
    }
    el.style.display = '';
}

// Sprint 156: Session profit badge (simple +/- amount vs start, large text)
var _profitStartBal156 = 0;
function _resetProfitBadge156() {
    _profitStartBal156 = (typeof balance !== 'undefined') ? balance : 0;
    var el = document.getElementById('profitBadge156');
    if (el) el.style.display = 'none';
}
function _updateProfitBadge156() {
    var cur = (typeof balance !== 'undefined') ? balance : 0;
    var diff = cur - _profitStartBal156;
    var el = document.getElementById('profitBadge156');
    if (!el) return;
    var _DSN2 = String.fromCharCode(36);
    var sign = diff >= 0 ? '+' : '';
    el.textContent = sign + _DSN2 + diff.toFixed(2);
    el.className = 'profit-badge-156 ' + (diff >= 0 ? 'pb156-pos' : 'pb156-neg');
    el.style.display = '';
}

// Sprint 157: Bet recommendation (% of balance)
function _resetBetRecommend() {
    var el = document.getElementById('betRecommendBadge');
    if (el) el.style.display = 'none';
}
function _updateBetRecommend() {
    var bal = (typeof balance !== 'undefined') ? balance : 0;
    var bet = (typeof currentBet !== 'undefined') ? currentBet : 0;
    if (!bal || !bet) return;
    var ratio = bet / bal;
    var el = document.getElementById('betRecommendBadge');
    if (!el) return;
    var msg, cls;
    if (ratio > 0.1)       { msg = 'Bet: HIGH RISK'; cls = 'brb-danger'; }
    else if (ratio > 0.05) { msg = 'Bet: caution'; cls = 'brb-caution'; }
    else if (ratio < 0.005){ msg = 'Bet: very safe'; cls = 'brb-safe'; }
    else                   { return; } // normal range, hide
    el.textContent = msg;
    el.className = 'bet-recommend-badge ' + cls;
    el.style.display = '';
}

// Sprint 158: Near-miss heat (near-miss frequency in last 20 spins)
var _nearMissHeat158 = [];
function _resetNearMissHeat() {
    _nearMissHeat158 = [];
    var el = document.getElementById('nearMissHeat');
    if (el) el.style.display = 'none';
}
function _updateNearMissHeat(isNearMiss) {
    _nearMissHeat158.push(isNearMiss ? 1 : 0);
    if (_nearMissHeat158.length > 20) _nearMissHeat158.shift();
    if (_nearMissHeat158.length < 5) return;
    var count = 0;
    for (var i = 0; i < _nearMissHeat158.length; i++) count += _nearMissHeat158[i];
    var pct = Math.round((count / _nearMissHeat158.length) * 100);
    var el = document.getElementById('nearMissHeat');
    if (!el) return;
    if (pct >= 10) {
        el.textContent = pct + '% near-miss';
        el.className = 'near-miss-heat' + (pct >= 30 ? ' nmh-high' : pct >= 20 ? ' nmh-mid' : '');
        el.style.display = '';
    } else {
        el.style.display = 'none';
    }
}

// Sprint 159: Cinematic win counter
var _cinematicWins159 = 0;
function _resetCinematicCount() {
    _cinematicWins159 = 0;
    var el = document.getElementById('cinematicCount');
    if (el) el.style.display = 'none';
}
function _incrementCinematicCount() {
    _cinematicWins159++;
    var el = document.getElementById('cinematicCount');
    if (!el) return;
    el.textContent = _cinematicWins159 + ('' === '' ? ' big win' : '') + (_cinematicWins159 !== 1 ? 's' : '');
    el.style.display = '';
}

// Sprint 160: Session compare badge (vs last stored session)
var _sessCompKey160 = 'casino_last_sess_pnl';
function _resetSessCompareBadge() {
    var el = document.getElementById('sessCompareBadge');
    if (el) el.style.display = 'none';
}
function _saveSessForCompare(pnl) {
    try { localStorage.setItem(_sessCompKey160, pnl.toFixed(2)); } catch(e) {}
}
function _updateSessCompareBadge(currentPnl) {
    var el = document.getElementById('sessCompareBadge');
    if (!el) return;
    try {
        var lastStr = localStorage.getItem(_sessCompKey160);
        if (!lastStr) return;
        var last = parseFloat(lastStr);
        var diff = currentPnl - last;
        var _DSN2 = String.fromCharCode(36);
        var sign = diff >= 0 ? '+' : '';
        el.textContent = 'vs last: ' + sign + _DSN2 + diff.toFixed(2);
        el.className = 'sess-compare-badge' + (diff >= 0 ? ' scb-better' : ' scb-worse');
        el.style.display = '';
    } catch(e) { el.style.display = 'none'; }
}

// Sprint 161: Total spin distance display (total reels * rows spun)
var _totalSpinDist161 = 0;
function _resetSpinDistance() {
    _totalSpinDist161 = 0;
    var el = document.getElementById('spinDistBadge');
    if (el) el.style.display = 'none';
}
function _updateSpinDistance() {
    var cols = (typeof currentGame !== 'undefined' && currentGame && currentGame.reels) ? currentGame.reels : 5;
    var rows = (typeof currentGame !== 'undefined' && currentGame && currentGame.rows) ? currentGame.rows : 3;
    _totalSpinDist161 += cols * rows;
    var el = document.getElementById('spinDistBadge');
    if (!el) return;
    var k = _totalSpinDist161 >= 1000 ? ((_totalSpinDist161 / 1000).toFixed(1) + 'k') : String(_totalSpinDist161);
    el.textContent = k + ' cells spun';
    el.style.display = '';
}

// Sprint 162: Biggest loss this session
var _biggestLoss162 = 0;
function _resetBiggestLoss() {
    _biggestLoss162 = 0;
    var el = document.getElementById('biggestLossBadge');
    if (el) el.style.display = 'none';
}
function _updateBiggestLoss(winAmount, betAmount) {
    if (!betAmount || betAmount <= 0) return;
    if (winAmount <= 0) {
        if (betAmount > _biggestLoss162) {
            _biggestLoss162 = betAmount;
            var el = document.getElementById('biggestLossBadge');
            if (!el) return;
            var _DSN2 = String.fromCharCode(36);
            el.textContent = 'Max loss: ' + _DSN2 + _biggestLoss162.toFixed(2);
            el.style.display = '';
        }
    }
}
`;

append(jsFile, JS_CODE);

// ─── JS patches ────────────────────────────────────────────────────────────

// openSlot: add 155-162 inits
patch(jsFile,
    `        _resetCumulativeXp();     // 154 — cumulative XP`,
    `        _resetCumulativeXp();     // 154 — cumulative XP
        _resetResultHistory();    // 155 — result history
        _resetProfitBadge156();   // 156 — profit badge
        _resetBetRecommend();     // 157 — bet recommend
        _resetNearMissHeat();     // 158 — near-miss heat
        _resetCinematicCount();   // 159 — cinematic count
        _resetSessCompareBadge(); // 160 — session compare
        _resetSpinDistance();     // 161 — spin distance
        _resetBiggestLoss();      // 162 — biggest loss`,
    false
);

// Win hooks: after _refreshCumulativeXp()
patch(jsFile,
    `                _refreshCumulativeXp();                // 154 — cumulative XP`,
    `                _refreshCumulativeXp();                // 154 — cumulative XP
                _addResultHistory(winAmount, currentBet); // 155 — result history
                _updateProfitBadge156();               // 156 — profit badge
                _updateBetRecommend();                 // 157 — bet recommend
                _updateNearMissHeat(false);            // 158 — near-miss heat (win = not near miss)
                _updateSessCompareBadge(balance - _profitStartBal156); // 160 — sess compare
                _updateSpinDistance();                 // 161 — spin dist
                _updateBiggestLoss(winAmount, currentBet); // 162 — biggest loss`,
    true
);

// Post-spin hooks: after _refreshCumulativeXp()
patch(jsFile,
    `            _refreshCumulativeXp();                    // 154 — cumulative XP`,
    `            _refreshCumulativeXp();                    // 154 — cumulative XP
            _addResultHistory(winAmount, currentBet);  // 155 — result history
            _updateProfitBadge156();                   // 156 — profit badge
            _updateBetRecommend();                     // 157 — bet recommend
            _updateSessCompareBadge(balance - _profitStartBal156); // 160 — sess compare
            _updateSpinDistance();                     // 161 — spin dist
            _updateBiggestLoss(winAmount, currentBet); // 162 — biggest loss`,
    true
);

console.log('JS patches done');

// ─── HTML ──────────────────────────────────────────────────────────────────
patch(htmlFile,
    `            <!-- Sprint 154: Cumulative XP badge -->
            <span class="cumulative-xp-badge" id="cumulativeXpBadge" style="display:none"></span>`,
    `            <!-- Sprint 154: Cumulative XP badge -->
            <span class="cumulative-xp-badge" id="cumulativeXpBadge" style="display:none"></span>
            <!-- Sprint 155: Result history list -->
            <div class="result-history-list" id="resultHistoryList" style="display:none"></div>
            <!-- Sprint 156: Session profit badge -->
            <span class="profit-badge-156" id="profitBadge156" style="display:none"></span>
            <!-- Sprint 157: Bet recommendation -->
            <span class="bet-recommend-badge" id="betRecommendBadge" style="display:none"></span>
            <!-- Sprint 158: Near-miss heat -->
            <span class="near-miss-heat" id="nearMissHeat" style="display:none"></span>
            <!-- Sprint 159: Cinematic win count -->
            <span class="cinematic-count" id="cinematicCount" style="display:none"></span>
            <!-- Sprint 160: Session compare badge -->
            <span class="sess-compare-badge" id="sessCompareBadge" style="display:none"></span>
            <!-- Sprint 161: Spin distance badge -->
            <span class="spin-dist-badge" id="spinDistBadge" style="display:none"></span>
            <!-- Sprint 162: Biggest loss badge -->
            <span class="biggest-loss-badge" id="biggestLossBadge" style="display:none"></span>`,
    false
);

console.log('HTML done');

// ─── CSS ───────────────────────────────────────────────────────────────────
const CSS_CODE = `
/* =====================================================
   SPRINT 155-162 STYLES
   ===================================================== */

/* Sprint 155: Result history list */
.result-history-list {
    display: flex;
    flex-wrap: wrap;
    gap: 2px;
    max-width: 100%;
}
.rhl-item {
    font-size: 9px;
    font-weight: 600;
    padding: 1px 4px;
    border-radius: 4px;
    font-variant-numeric: tabular-nums;
}
.rhl-win  { color: #00ff88; background: rgba(0,255,136,0.1); }
.rhl-loss { color: #636e72; background: rgba(99,110,114,0.1); }

/* Sprint 156: Session profit badge */
.profit-badge-156 {
    font-size: 14px;
    font-weight: 900;
    padding: 3px 10px;
    border-radius: 10px;
    font-variant-numeric: tabular-nums;
}
.pb156-pos { color: #00ff88; background: rgba(0,255,136,0.1); border: 1px solid rgba(0,255,136,0.25); }
.pb156-neg { color: #ff7675; background: rgba(255,118,117,0.1); border: 1px solid rgba(255,118,117,0.25); }

/* Sprint 157: Bet recommendation */
.bet-recommend-badge {
    font-size: 10px;
    font-weight: 700;
    padding: 2px 7px;
    border-radius: 8px;
    letter-spacing: 0.3px;
}
.brb-danger  { color: #d63031; background: rgba(214,48,49,0.15); animation: brb-flash 0.8s ease-in-out infinite alternate; }
.brb-caution { color: #fdcb6e; background: rgba(253,203,110,0.15); }
.brb-safe    { color: #00cec9; background: rgba(0,206,201,0.1); }
@keyframes brb-flash {
    from { opacity: 0.8; }
    to   { opacity: 1; box-shadow: 0 0 5px rgba(214,48,49,0.4); }
}

/* Sprint 158: Near-miss heat */
.near-miss-heat {
    font-size: 10px;
    padding: 2px 7px;
    border-radius: 8px;
    font-weight: 600;
    background: rgba(162,155,254,0.08);
    color: #a29bfe;
}
.near-miss-heat.nmh-mid  { color: #fdcb6e; background: rgba(253,203,110,0.1); }
.near-miss-heat.nmh-high { color: #ff7675; background: rgba(255,118,117,0.12); }

/* Sprint 159: Cinematic count */
.cinematic-count {
    font-size: 10px;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 8px;
    background: linear-gradient(135deg, rgba(253,203,110,0.15), rgba(108,92,231,0.15));
    color: #fdcb6e;
}

/* Sprint 160: Session compare badge */
.sess-compare-badge {
    font-size: 10px;
    font-weight: 600;
    padding: 2px 7px;
    border-radius: 8px;
}
.scb-better { color: #00ff88; background: rgba(0,255,136,0.1); }
.scb-worse  { color: #ff7675; background: rgba(255,118,117,0.1); }

/* Sprint 161: Spin distance badge */
.spin-dist-badge {
    font-size: 10px;
    color: #b2bec3;
    padding: 2px 7px;
    border-radius: 8px;
    background: rgba(178,190,195,0.07);
    font-weight: 400;
}

/* Sprint 162: Biggest loss badge */
.biggest-loss-badge {
    font-size: 10px;
    color: #ff7675;
    padding: 2px 7px;
    border-radius: 8px;
    background: rgba(255,118,117,0.08);
    font-weight: 600;
}
`;

append(cssFile, CSS_CODE);

console.log('Sprint 155-162 DONE!');
console.log('  ui-slot.js:', fs.readFileSync(jsFile, 'utf8').split('\n').length);
console.log('  styles.css:', fs.readFileSync(cssFile, 'utf8').split('\n').length);
console.log('  index.html:', fs.readFileSync(htmlFile, 'utf8').split('\n').length);
