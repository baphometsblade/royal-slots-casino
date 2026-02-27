// Sprint 147-154 implementation — CRLF-aware patching
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
//  SPRINT 147-154 -- Outcome streak, RTP convergence, scatter gap,
//                    bonus depth, reel hit freq, session start time,
//                    spin pace, cumulative XP
// ===============================================================

// Sprint 147: Current outcome streak (wins or losses in a row)
var _outcomeStreak147 = 0; // positive = wins, negative = losses
function _resetOutcomeStreak() {
    _outcomeStreak147 = 0;
    var el = document.getElementById('outcomeStreakBadge');
    if (el) el.style.display = 'none';
}
function _updateOutcomeStreak(won) {
    if (won) {
        _outcomeStreak147 = _outcomeStreak147 > 0 ? _outcomeStreak147 + 1 : 1;
    } else {
        _outcomeStreak147 = _outcomeStreak147 < 0 ? _outcomeStreak147 - 1 : -1;
    }
    var el = document.getElementById('outcomeStreakBadge');
    if (!el) return;
    var abs = Math.abs(_outcomeStreak147);
    if (abs < 2) { el.style.display = 'none'; return; }
    if (_outcomeStreak147 > 0) {
        el.textContent = abs + 'x win streak';
        el.className = 'outcome-streak-badge osb-win';
    } else {
        el.textContent = abs + 'x cold streak';
        el.className = 'outcome-streak-badge osb-loss';
    }
    el.style.display = '';
}

// Sprint 148: RTP convergence meter (how close to 88% theoretical)
var _rtpConvWon148 = 0; var _rtpConvWag148 = 0;
function _resetRtpConvergence() {
    _rtpConvWon148 = 0; _rtpConvWag148 = 0;
    var el = document.getElementById('rtpConvergence');
    if (el) el.style.display = 'none';
}
function _updateRtpConvergence(winAmount, betAmount) {
    if (!betAmount || betAmount <= 0) return;
    _rtpConvWag148 += betAmount;
    _rtpConvWon148 += (winAmount || 0);
    if (_rtpConvWag148 < 10) return;
    var sessionRtp = (_rtpConvWon148 / _rtpConvWag148) * 100;
    var theoretical = 88;
    var diff = Math.abs(sessionRtp - theoretical);
    var el = document.getElementById('rtpConvergence');
    if (!el) return;
    el.textContent = 'RTP ' + sessionRtp.toFixed(0) + '% (target ' + theoretical + '%)';
    el.className = 'rtp-convergence' + (diff <= 5 ? ' rtpc-near' : diff <= 15 ? ' rtpc-mid' : ' rtpc-far');
    el.style.display = '';
}

// Sprint 149: Scatter gap tracker (spins since last scatter)
var _scatterGap149 = 0; var _scatterGapSeen149 = false;
function _resetScatterGap() {
    _scatterGap149 = 0; _scatterGapSeen149 = false;
    var el = document.getElementById('scatterGapBadge');
    if (el) el.style.display = 'none';
}
function _updateScatterGap(grid) {
    if (!grid) return;
    var found = false;
    var symKey = (typeof currentGame !== 'undefined' && currentGame && currentGame.scatterSymbol)
        ? currentGame.scatterSymbol : 'scatter';
    for (var r = 0; r < grid.length; r++) {
        for (var c = 0; c < (grid[r] ? grid[r].length : 0); c++) {
            if (grid[r][c] === symKey) { found = true; break; }
        }
        if (found) break;
    }
    if (found) {
        _scatterGapSeen149 = true;
        _scatterGap149 = 0;
    } else {
        _scatterGap149++;
    }
    if (!_scatterGapSeen149) return;
    var el = document.getElementById('scatterGapBadge');
    if (!el) return;
    if (_scatterGap149 >= 5) {
        el.textContent = _scatterGap149 + ' since scatter';
        el.className = 'scatter-gap-badge' + (_scatterGap149 >= 30 ? ' sgb-long' : _scatterGap149 >= 15 ? ' sgb-mid' : '');
        el.style.display = '';
    } else {
        el.style.display = 'none';
    }
}

// Sprint 150: Bonus rounds counter
var _bonusRoundCount150 = 0;
function _resetBonusRoundCount() {
    _bonusRoundCount150 = 0;
    var el = document.getElementById('bonusRoundCount');
    if (el) el.style.display = 'none';
}
function _incrementBonusRound() {
    _bonusRoundCount150++;
    var el = document.getElementById('bonusRoundCount');
    if (!el) return;
    el.textContent = _bonusRoundCount150 + ' bonus' + (_bonusRoundCount150 !== 1 ? 'es' : '');
    el.style.display = '';
}

// Sprint 151: Reel hit frequency (which column wins most)
var _reelHits151 = [0, 0, 0, 0, 0];
function _resetReelHitFreq() {
    _reelHits151 = [0, 0, 0, 0, 0];
    var el = document.getElementById('reelHitFreq');
    if (el) el.style.display = 'none';
}
function _updateReelHitFreq(winningPositions) {
    if (!winningPositions || !winningPositions.length) return;
    for (var i = 0; i < winningPositions.length; i++) {
        var pos = winningPositions[i];
        if (Array.isArray(pos) && pos.length >= 2) {
            var col = pos[1];
            if (col >= 0 && col < _reelHits151.length) _reelHits151[col]++;
        }
    }
    var bestCol = 0;
    for (var j = 1; j < _reelHits151.length; j++) {
        if (_reelHits151[j] > _reelHits151[bestCol]) bestCol = j;
    }
    var totalHits = 0;
    for (var k = 0; k < _reelHits151.length; k++) totalHits += _reelHits151[k];
    if (!totalHits) return;
    var el = document.getElementById('reelHitFreq');
    if (!el) return;
    el.textContent = 'Reel ' + (bestCol + 1) + ' hottest';
    el.style.display = '';
}

// Sprint 152: Session start time display
var _sessStartTime152 = 0;
function _initSessStartTime() {
    _sessStartTime152 = Date.now();
    var el = document.getElementById('sessStartTime');
    if (!el) return;
    var d = new Date(_sessStartTime152);
    var h = d.getHours();
    var m = String(d.getMinutes()).padStart(2, '0');
    var ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    el.textContent = 'Started ' + h + ':' + m + ' ' + ampm;
    el.style.display = '';
}

// Sprint 153: Spin pace vs average
var _paceSpins153 = 0; var _paceStart153 = 0; var _paceWindowSpins153 = 0; var _paceWindowStart153 = 0;
function _resetSpinPace() {
    _paceSpins153 = 0; _paceStart153 = Date.now();
    _paceWindowSpins153 = 0; _paceWindowStart153 = Date.now();
    var el = document.getElementById('spinPaceBadge');
    if (el) el.style.display = 'none';
}
function _updateSpinPace() {
    _paceSpins153++;
    _paceWindowSpins153++;
    var now = Date.now();
    var totalMins = (now - _paceStart153) / 60000;
    var windowMins = (now - _paceWindowStart153) / 60000;
    if (windowMins >= 1) {
        _paceWindowSpins153 = 0;
        _paceWindowStart153 = now;
    }
    if (totalMins < 0.5 || _paceSpins153 < 10) return;
    var avgSpm = _paceSpins153 / totalMins;
    var curSpm = windowMins > 0.1 ? (_paceWindowSpins153 / windowMins) : avgSpm;
    var el = document.getElementById('spinPaceBadge');
    if (!el) return;
    el.textContent = Math.round(curSpm) + '/min pace';
    el.style.display = '';
}

// Sprint 154: Cumulative XP display (all-time from localStorage)
var _xpStorKey154 = (typeof STORAGE_KEY_XP !== 'undefined') ? STORAGE_KEY_XP : 'casino_xp';
function _resetCumulativeXp() {
    var el = document.getElementById('cumulativeXpBadge');
    if (!el) return;
    try {
        var xpData = JSON.parse(localStorage.getItem(_xpStorKey154) || '{}');
        var total = xpData.total || xpData.xp || 0;
        el.textContent = total.toLocaleString() + ' XP total';
        el.style.display = total > 0 ? '' : 'none';
    } catch(e) { el.style.display = 'none'; }
}
function _refreshCumulativeXp() {
    // call after XP award to refresh
    _resetCumulativeXp();
}
`;

append(jsFile, JS_CODE);

// ─── JS patches ────────────────────────────────────────────────────────────

// openSlot: add 147-154 inits
patch(jsFile,
    `        _resetTimeEff();          // 146 — time efficiency`,
    `        _resetTimeEff();          // 146 — time efficiency
        _resetOutcomeStreak();    // 147 — outcome streak
        _resetRtpConvergence();   // 148 — RTP convergence
        _resetScatterGap();       // 149 — scatter gap
        _resetBonusRoundCount();  // 150 — bonus count
        _resetReelHitFreq();      // 151 — reel hit freq
        _initSessStartTime();     // 152 — session start time
        _resetSpinPace();         // 153 — spin pace
        _resetCumulativeXp();     // 154 — cumulative XP`,
    false
);

// Win hooks: after _updateTimeEff(true)
patch(jsFile,
    `                _updateTimeEff(true);                  // 146 — time eff`,
    `                _updateTimeEff(true);                  // 146 — time eff
                _updateOutcomeStreak(true);            // 147 — outcome streak
                _updateRtpConvergence(winAmount, currentBet); // 148 — RTP conv
                _updateScatterGap(currentGrid);        // 149 — scatter gap
                _updateSpinPace();                     // 153 — spin pace
                _refreshCumulativeXp();                // 154 — cumulative XP`,
    true
);

// Post-spin hooks: after _updateTimeEff(winAmount > 0)
patch(jsFile,
    `            _updateTimeEff(winAmount > 0);             // 146 — time eff`,
    `            _updateTimeEff(winAmount > 0);             // 146 — time eff
            _updateOutcomeStreak(winAmount > 0);       // 147 — outcome streak
            _updateRtpConvergence(winAmount, currentBet); // 148 — RTP conv
            _updateScatterGap(currentGrid);            // 149 — scatter gap
            _updateSpinPace();                         // 153 — spin pace
            _refreshCumulativeXp();                    // 154 — cumulative XP`,
    true
);

// Hook bonus trigger to increment bonus round count (in triggerFreeSpins)
patch(jsFile,
    `            if (typeof _recordBonusTrigger126 === 'function') _recordBonusTrigger126(); // 126`,
    `            if (typeof _recordBonusTrigger126 === 'function') _recordBonusTrigger126(); // 126
            if (typeof _incrementBonusRound === 'function') _incrementBonusRound(); // 150`,
    true
);

console.log('JS patches done');

// ─── HTML ──────────────────────────────────────────────────────────────────
patch(htmlFile,
    `            <!-- Sprint 146: Time efficiency badge -->
            <span class="time-eff-badge" id="timeEffBadge" style="display:none"></span>`,
    `            <!-- Sprint 146: Time efficiency badge -->
            <span class="time-eff-badge" id="timeEffBadge" style="display:none"></span>
            <!-- Sprint 147: Outcome streak badge -->
            <span class="outcome-streak-badge" id="outcomeStreakBadge" style="display:none"></span>
            <!-- Sprint 148: RTP convergence -->
            <span class="rtp-convergence" id="rtpConvergence" style="display:none"></span>
            <!-- Sprint 149: Scatter gap badge -->
            <span class="scatter-gap-badge" id="scatterGapBadge" style="display:none"></span>
            <!-- Sprint 150: Bonus round count -->
            <span class="bonus-round-count" id="bonusRoundCount" style="display:none"></span>
            <!-- Sprint 151: Reel hit frequency -->
            <span class="reel-hit-freq" id="reelHitFreq" style="display:none"></span>
            <!-- Sprint 152: Session start time -->
            <span class="sess-start-time" id="sessStartTime" style="display:none"></span>
            <!-- Sprint 153: Spin pace badge -->
            <span class="spin-pace-badge" id="spinPaceBadge" style="display:none"></span>
            <!-- Sprint 154: Cumulative XP badge -->
            <span class="cumulative-xp-badge" id="cumulativeXpBadge" style="display:none"></span>`,
    false
);

console.log('HTML done');

// ─── CSS ───────────────────────────────────────────────────────────────────
const CSS_CODE = `
/* =====================================================
   SPRINT 147-154 STYLES
   ===================================================== */

/* Sprint 147: Outcome streak badge */
.outcome-streak-badge {
    font-size: 10px;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 8px;
}
.osb-win  { color: #00ff88; background: rgba(0,255,136,0.12); }
.osb-loss { color: #ff7675; background: rgba(255,118,117,0.12); }

/* Sprint 148: RTP convergence */
.rtp-convergence {
    font-size: 10px;
    padding: 2px 7px;
    border-radius: 8px;
    font-weight: 600;
}
.rtpc-near { color: #00ff88; background: rgba(0,255,136,0.1); }
.rtpc-mid  { color: #fdcb6e; background: rgba(253,203,110,0.1); }
.rtpc-far  { color: #ff7675; background: rgba(255,118,117,0.1); }

/* Sprint 149: Scatter gap badge */
.scatter-gap-badge {
    font-size: 10px;
    padding: 2px 7px;
    border-radius: 8px;
    background: rgba(162,155,254,0.08);
    color: #a29bfe;
    font-weight: 600;
}
.scatter-gap-badge.sgb-mid  { color: #fdcb6e; background: rgba(253,203,110,0.1); }
.scatter-gap-badge.sgb-long { color: #ff7675; background: rgba(255,118,117,0.1); animation: sgb-pulse 1.2s ease-in-out infinite alternate; }
@keyframes sgb-pulse {
    from { opacity: 0.8; }
    to   { opacity: 1; box-shadow: 0 0 5px rgba(255,118,117,0.3); }
}

/* Sprint 150: Bonus round count */
.bonus-round-count {
    font-size: 10px;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 8px;
    background: linear-gradient(135deg, rgba(253,203,110,0.15), rgba(253,121,168,0.15));
    color: #fdcb6e;
}

/* Sprint 151: Reel hit frequency */
.reel-hit-freq {
    font-size: 10px;
    color: #74b9ff;
    padding: 2px 7px;
    border-radius: 8px;
    background: rgba(116,185,255,0.08);
    font-weight: 500;
}

/* Sprint 152: Session start time */
.sess-start-time {
    font-size: 10px;
    color: #636e72;
    padding: 2px 7px;
    border-radius: 8px;
    background: rgba(99,110,114,0.08);
    font-weight: 400;
}

/* Sprint 153: Spin pace badge */
.spin-pace-badge {
    font-size: 10px;
    color: #00cec9;
    padding: 2px 7px;
    border-radius: 8px;
    background: rgba(0,206,201,0.08);
    font-weight: 500;
}

/* Sprint 154: Cumulative XP badge */
.cumulative-xp-badge {
    font-size: 10px;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 8px;
    background: linear-gradient(135deg, rgba(108,92,231,0.15), rgba(162,155,254,0.15));
    color: #a29bfe;
    border: 1px solid rgba(108,92,231,0.25);
}
`;

append(cssFile, CSS_CODE);

console.log('Sprint 147-154 DONE!');
console.log('  ui-slot.js:', fs.readFileSync(jsFile, 'utf8').split('\n').length);
console.log('  styles.css:', fs.readFileSync(cssFile, 'utf8').split('\n').length);
console.log('  index.html:', fs.readFileSync(htmlFile, 'utf8').split('\n').length);
