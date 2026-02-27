// Sprint 123-130 implementation — CRLF-aware patching
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

// ─── JS: Append Sprint 123-130 functions ───────────────────────────────────
const JS_CODE = `
// ===============================================================
//  SPRINT 123-130 -- Highest win, loss streak, sparkline,
//                    bonus timer, peak balance, mult history,
//                    bet efficiency, lucky streak fire
// ===============================================================

// Sprint 123: Highest single-spin win badge
var _highWinKey123 = 'casino_highwin_';
function _resetHighWinBadge() {
    var el = document.getElementById('highWinBadge');
    if (el) el.style.display = 'none';
}
function _updateHighWinBadge(winAmount, gameId) {
    if (!winAmount || winAmount <= 0) return;
    var gid = gameId || (typeof currentGame !== 'undefined' && currentGame ? currentGame.id : 'unknown');
    var key = _highWinKey123 + gid;
    var prev = parseFloat(localStorage.getItem(key) || '0');
    if (winAmount > prev) localStorage.setItem(key, winAmount.toFixed(2));
    var best = parseFloat(localStorage.getItem(key) || '0');
    var el = document.getElementById('highWinBadge');
    if (!el) return;
    var _DSN2 = String.fromCharCode(36);
    el.textContent = '\\u2605 Best: ' + _DSN2 + best.toFixed(2);
    el.style.display = '';
}
function _initHighWinBadge() {
    var el = document.getElementById('highWinBadge');
    if (!el) return;
    var gid = (typeof currentGame !== 'undefined' && currentGame) ? currentGame.id : 'unknown';
    var best = parseFloat(localStorage.getItem(_highWinKey123 + gid) || '0');
    if (best > 0) {
        var _DSN2 = String.fromCharCode(36);
        el.textContent = '\\u2605 Best: ' + _DSN2 + best.toFixed(2);
        el.style.display = '';
    } else {
        el.style.display = 'none';
    }
}

// Sprint 124: Consecutive loss streak alert
var _lossStreak124 = 0;
function _resetLossStreak() {
    _lossStreak124 = 0;
    var el = document.getElementById('lossStreakAlert');
    if (el) el.style.display = 'none';
}
function _updateLossStreak(won) {
    if (won) {
        _lossStreak124 = 0;
        var el = document.getElementById('lossStreakAlert');
        if (el) el.style.display = 'none';
        return;
    }
    _lossStreak124++;
    var el = document.getElementById('lossStreakAlert');
    if (!el) return;
    if (_lossStreak124 >= 5) {
        el.textContent = '\\u26A0 ' + _lossStreak124 + ' dry spins';
        el.className = 'loss-streak-alert' + (_lossStreak124 >= 15 ? ' lsa-severe' : _lossStreak124 >= 10 ? ' lsa-warn' : '');
        el.style.display = '';
    } else {
        el.style.display = 'none';
    }
}

// Sprint 125: Spin history sparkline (last 20 spins)
var _sparkHistory125 = [];
function _resetSparkline() {
    _sparkHistory125 = [];
    var el = document.getElementById('spinSparkline');
    if (el) { while (el.firstChild) el.removeChild(el.firstChild); }
}
function _updateSparkline(winAmount) {
    _sparkHistory125.push(winAmount);
    if (_sparkHistory125.length > 20) _sparkHistory125.shift();
    var max = 0;
    for (var i = 0; i < _sparkHistory125.length; i++) {
        if (_sparkHistory125[i] > max) max = _sparkHistory125[i];
    }
    var _max = max || 1;
    var el = document.getElementById('spinSparkline');
    if (!el) return;
    while (el.firstChild) el.removeChild(el.firstChild);
    for (var j = 0; j < _sparkHistory125.length; j++) {
        var val = _sparkHistory125[j];
        var pct = Math.round((val / _max) * 100);
        var bar = document.createElement('span');
        bar.className = 'spk-bar ' + (val > 0 ? 'spk-win' : 'spk-loss');
        bar.style.height = Math.max(2, pct) + '%';
        el.appendChild(bar);
    }
    el.style.display = '';
}

// Sprint 126: Bonus trigger timer (time since last bonus)
var _lastBonusTime126 = 0;
var _bonusTimerInterval126 = null;
function _resetBonusTimer() {
    _lastBonusTime126 = 0;
    if (_bonusTimerInterval126) clearInterval(_bonusTimerInterval126);
    _bonusTimerInterval126 = null;
    var el = document.getElementById('bonusTimerDisplay');
    if (el) el.style.display = 'none';
}
function _recordBonusTrigger126() {
    _lastBonusTime126 = Date.now();
    _startBonusTimerDisplay();
}
function _startBonusTimerDisplay() {
    if (_bonusTimerInterval126) clearInterval(_bonusTimerInterval126);
    var el = document.getElementById('bonusTimerDisplay');
    if (!el) return;
    _bonusTimerInterval126 = setInterval(function() {
        if (!_lastBonusTime126) { el.style.display = 'none'; return; }
        var secs = Math.floor((Date.now() - _lastBonusTime126) / 1000);
        var m = Math.floor(secs / 60);
        var s = secs % 60;
        el.textContent = '\\u23F1 Last bonus: ' + (m > 0 ? m + 'm ' : '') + s + 's ago';
        el.style.display = '';
    }, 1000);
}

// Sprint 127: Session peak balance
var _peakBalance127 = 0;
function _resetPeakBalance() {
    _peakBalance127 = (typeof balance !== 'undefined') ? balance : 0;
    var el = document.getElementById('peakBalanceDisplay');
    if (el) el.style.display = 'none';
}
function _updatePeakBalance() {
    var bal = (typeof balance !== 'undefined') ? balance : 0;
    if (bal > _peakBalance127) _peakBalance127 = bal;
    var el = document.getElementById('peakBalanceDisplay');
    if (!el) return;
    var _DSN2 = String.fromCharCode(36);
    el.textContent = '\\u25B2 Peak: ' + _DSN2 + _peakBalance127.toFixed(2);
    el.style.display = '';
}

// Sprint 128: Multiplier history (last 5 notable mults)
var _multHistory128 = [];
function _resetMultHistory() {
    _multHistory128 = [];
    var el = document.getElementById('multHistoryDisplay');
    if (el) { el.textContent = ''; el.style.display = 'none'; }
}
function _addMultHistory(winAmount, betAmount) {
    if (!winAmount || !betAmount || betAmount <= 0) return;
    var mult = winAmount / betAmount;
    if (mult < 2) return;
    _multHistory128.push(Math.round(mult));
    if (_multHistory128.length > 5) _multHistory128.shift();
    var el = document.getElementById('multHistoryDisplay');
    if (!el) return;
    el.textContent = '\\u00D7' + _multHistory128.slice().reverse().join(' \\u00B7 \\u00D7');
    el.style.display = '';
}

// Sprint 129: Bet efficiency badge (return per unit wagered)
var _effTotalWon129 = 0;
var _effTotalBet129 = 0;
function _resetBetEfficiency() {
    _effTotalWon129 = 0;
    _effTotalBet129 = 0;
    var el = document.getElementById('betEfficiencyBadge');
    if (el) el.style.display = 'none';
}
function _updateBetEfficiency(winAmount, betAmount) {
    if (!betAmount || betAmount <= 0) return;
    _effTotalBet129 += betAmount;
    _effTotalWon129 += (winAmount || 0);
    var eff = (_effTotalWon129 / _effTotalBet129);
    var el = document.getElementById('betEfficiencyBadge');
    if (!el) return;
    var pct = Math.round(eff * 100);
    el.textContent = 'Eff: ' + pct + '%';
    el.className = 'bet-efficiency-badge' + (pct >= 100 ? ' beb-good' : pct >= 70 ? ' beb-mid' : ' beb-low');
    el.style.display = '';
}

// Sprint 130: Lucky streak fire display
var _luckyStreakFire130 = 0;
function _resetLuckyStreakFire() {
    _luckyStreakFire130 = 0;
    var el = document.getElementById('luckyStreakFire');
    if (el) el.style.display = 'none';
}
function _updateLuckyStreakFire(won) {
    if (won) {
        _luckyStreakFire130++;
    } else {
        _luckyStreakFire130 = 0;
    }
    var el = document.getElementById('luckyStreakFire');
    if (!el) return;
    if (_luckyStreakFire130 >= 3) {
        var fires = '';
        var cap = Math.min(_luckyStreakFire130, 7);
        for (var i = 0; i < cap; i++) fires += '\\uD83D\\uDD25';
        el.textContent = fires + ' ' + _luckyStreakFire130 + 'x';
        el.style.display = '';
    } else {
        el.style.display = 'none';
    }
}
`;

append(jsFile, JS_CODE);

// ─── JS patches ────────────────────────────────────────────────────────────

// openSlot hook: add 123-130 inits
patch(jsFile,
    `        _initVolumeSliderMicro(); // 122 — volume slider`,
    `        _initVolumeSliderMicro(); // 122 — volume slider
        _initHighWinBadge();      // 123 — highest win badge
        _resetLossStreak();       // 124 — loss streak alert
        _resetSparkline();        // 125 — sparkline
        _resetBonusTimer();       // 126 — bonus timer
        _resetPeakBalance();      // 127 — peak balance
        _resetMultHistory();      // 128 — mult history
        _resetBetEfficiency();    // 129 — bet efficiency
        _resetLuckyStreakFire();  // 130 — lucky streak fire`,
    false
);

// Win hooks (both engines): after _earnLuckyCoin(true)
patch(jsFile,
    `                _earnLuckyCoin(true);                   // 121 — lucky coins (win)`,
    `                _earnLuckyCoin(true);                   // 121 — lucky coins (win)
                _updateHighWinBadge(winAmount);         // 123 — highest win
                _updateLossStreak(true);                // 124 — loss streak
                _updateSparkline(winAmount);            // 125 — sparkline
                _updatePeakBalance();                   // 127 — peak balance
                _addMultHistory(winAmount, currentBet); // 128 — mult history
                _updateBetEfficiency(winAmount, currentBet); // 129 — bet efficiency
                _updateLuckyStreakFire(true);            // 130 — lucky streak fire`,
    true
);

// Post-spin hooks (both engines): after _earnLuckyCoin(false)
patch(jsFile,
    `            _earnLuckyCoin(false);                     // 121 — lucky coins`,
    `            _earnLuckyCoin(false);                     // 121 — lucky coins
            _updateHighWinBadge(winAmount);             // 123 — highest win
            _updateLossStreak(winAmount > 0);           // 124 — loss streak
            _updateSparkline(winAmount);                // 125 — sparkline
            _updatePeakBalance();                       // 127 — peak balance
            _addMultHistory(winAmount, currentBet);     // 128 — mult history
            _updateBetEfficiency(winAmount, currentBet); // 129 — bet efficiency
            _updateLuckyStreakFire(winAmount > 0);      // 130 — lucky streak fire`,
    true
);

// Bonus trigger hook: in triggerFreeSpins (both engines)
patch(jsFile,
    `        function triggerFreeSpins(game, count) {
            freeSpinsActive = true;`,
    `        function triggerFreeSpins(game, count) {
            freeSpinsActive = true;
            if (typeof _recordBonusTrigger126 === 'function') _recordBonusTrigger126(); // 126`,
    true
);

console.log('JS patches done');

// ─── HTML ──────────────────────────────────────────────────────────────────

patch(htmlFile,
    `                    <!-- Sprint 122: Volume micro-slider -->
                    <input type="range" class="volume-slider-micro" id="volumeSliderMicro" min="0" max="100" step="5" oninput="_handleVolumeSliderMicro(this.value)" style="display:none">`,
    `                    <!-- Sprint 122: Volume micro-slider -->
                    <input type="range" class="volume-slider-micro" id="volumeSliderMicro" min="0" max="100" step="5" oninput="_handleVolumeSliderMicro(this.value)" style="display:none">
                    <!-- Sprint 125: Spin history sparkline -->
                    <span class="spin-sparkline" id="spinSparkline" style="display:none"></span>`,
    false
);

// Add main stat badges after Sprint 121 lucky coins
patch(htmlFile,
    `            <!-- Sprint 121: Lucky coins -->
            <span class="lucky-coin-display" id="luckyCoinDisplay" style="display:none"></span>`,
    `            <!-- Sprint 121: Lucky coins -->
            <span class="lucky-coin-display" id="luckyCoinDisplay" style="display:none"></span>
            <!-- Sprint 123: Highest win badge -->
            <span class="high-win-badge" id="highWinBadge" style="display:none"></span>
            <!-- Sprint 124: Loss streak alert -->
            <span class="loss-streak-alert" id="lossStreakAlert" style="display:none"></span>
            <!-- Sprint 126: Bonus trigger timer -->
            <span class="bonus-timer-display" id="bonusTimerDisplay" style="display:none"></span>
            <!-- Sprint 127: Session peak balance -->
            <span class="peak-balance-display" id="peakBalanceDisplay" style="display:none"></span>
            <!-- Sprint 128: Multiplier history -->
            <span class="mult-history-display" id="multHistoryDisplay" style="display:none"></span>
            <!-- Sprint 129: Bet efficiency badge -->
            <span class="bet-efficiency-badge" id="betEfficiencyBadge" style="display:none"></span>
            <!-- Sprint 130: Lucky streak fire -->
            <span class="lucky-streak-fire" id="luckyStreakFire" style="display:none"></span>`,
    false
);

console.log('HTML done');

// ─── CSS ───────────────────────────────────────────────────────────────────
const CSS_CODE = `
/* =====================================================
   SPRINT 123-130 STYLES
   ===================================================== */

/* Sprint 123: Highest win badge */
.high-win-badge {
    font-size: 11px;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 10px;
    background: linear-gradient(135deg, rgba(253,203,110,0.2), rgba(255,234,167,0.2));
    color: #ffeaa7;
    border: 1px solid rgba(253,203,110,0.35);
}

/* Sprint 124: Loss streak alert */
.loss-streak-alert {
    font-size: 10px;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 8px;
    background: rgba(255,118,117,0.12);
    color: #ff7675;
    border: 1px solid rgba(255,118,117,0.25);
}
.loss-streak-alert.lsa-warn {
    background: rgba(255,118,117,0.2);
    color: #fd79a8;
    animation: lsa-pulse 1.5s ease-in-out infinite alternate;
}
.loss-streak-alert.lsa-severe {
    background: rgba(214,48,49,0.25);
    color: #d63031;
    animation: lsa-pulse 0.8s ease-in-out infinite alternate;
}
@keyframes lsa-pulse {
    from { opacity: 0.7; }
    to   { opacity: 1; box-shadow: 0 0 6px rgba(255,118,117,0.4); }
}

/* Sprint 125: Spin sparkline */
.spin-sparkline {
    display: inline-flex;
    align-items: flex-end;
    gap: 1px;
    height: 16px;
    padding: 0 4px;
    background: rgba(255,255,255,0.04);
    border-radius: 4px;
    overflow: hidden;
    min-width: 40px;
    vertical-align: middle;
}
.spk-bar {
    display: inline-block;
    width: 3px;
    border-radius: 1px 1px 0 0;
    transition: height 0.2s ease;
    min-height: 2px;
}
.spk-win  { background: #00cec9; }
.spk-loss { background: rgba(99,110,114,0.5); }

/* Sprint 126: Bonus timer display */
.bonus-timer-display {
    font-size: 10px;
    color: #a29bfe;
    padding: 2px 7px;
    border-radius: 8px;
    background: rgba(162,155,254,0.08);
    font-weight: 500;
}

/* Sprint 127: Peak balance display */
.peak-balance-display {
    font-size: 10px;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 8px;
    background: rgba(0,184,148,0.1);
    color: #00b894;
    border: 1px solid rgba(0,184,148,0.2);
}

/* Sprint 128: Multiplier history */
.mult-history-display {
    font-size: 10px;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: 8px;
    background: rgba(108,92,231,0.12);
    color: #a29bfe;
    letter-spacing: 0.5px;
}

/* Sprint 129: Bet efficiency badge */
.bet-efficiency-badge {
    font-size: 10px;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 8px;
}
.bet-efficiency-badge.beb-good { color: #00ff88; background: rgba(0,255,136,0.1); }
.bet-efficiency-badge.beb-mid  { color: #fdcb6e; background: rgba(253,203,110,0.1); }
.bet-efficiency-badge.beb-low  { color: #ff7675; background: rgba(255,118,117,0.1); }

/* Sprint 130: Lucky streak fire */
.lucky-streak-fire {
    font-size: 12px;
    font-weight: 700;
    padding: 1px 6px;
    border-radius: 8px;
    background: rgba(253,121,168,0.12);
    color: #fd79a8;
    animation: fire-pulse 0.7s ease-in-out infinite alternate;
}
@keyframes fire-pulse {
    from { text-shadow: none; }
    to   { text-shadow: 0 0 8px rgba(253,121,168,0.6); }
}
`;

append(cssFile, CSS_CODE);

console.log('Sprint 123-130 DONE!');
console.log('  ui-slot.js:', fs.readFileSync(jsFile, 'utf8').split('\n').length);
console.log('  styles.css:', fs.readFileSync(cssFile, 'utf8').split('\n').length);
console.log('  index.html:', fs.readFileSync(htmlFile, 'utf8').split('\n').length);
