// Sprint 115-122 implementation (CRLF-aware)
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
        console.error('Anchor:', JSON.stringify(oldStr.slice(0, 100)));
        process.exit(1);
    }
    fs.writeFileSync(file, content);
    console.log('OK:', path.basename(file), '|', oldStr.slice(0, 55));
}

function append(file, code) {
    fs.appendFileSync(file, '\n' + code);
    console.log('Appended', path.basename(file), ':', fs.readFileSync(file,'utf8').split('\n').length, 'lines');
}

// ── JS ─────────────────────────────────────────────────────────────────────────

const JS_CODE = `
// ═══════════════════════════════════════════════════════
// SPRINT 115-122: ENHANCED SLOT UI WIDGETS (BATCH 6)
// ═══════════════════════════════════════════════════════

// Sprint 115: Scatter progress dots (0/3 per spin)
var _spinScatterFound115 = 0;
function _resetScatterProgress() {
    _spinScatterFound115 = 0;
    var el = document.getElementById('scatterProgress');
    if (el) { while (el.firstChild) el.removeChild(el.firstChild); el.style.display = 'none'; }
}
function _updateScatterProgress(grid) {
    var el = document.getElementById('scatterProgress');
    if (!el || !grid) return;
    var count = 0;
    grid.forEach(function(col) {
        if (!Array.isArray(col)) return;
        col.forEach(function(sym) { if (sym === 'scatter' || (sym && sym.indexOf('scatter') !== -1)) count++; });
    });
    _spinScatterFound115 = count;
    while (el.firstChild) el.removeChild(el.firstChild);
    var needed = 3;
    for (var i = 0; i < needed; i++) {
        var dot = document.createElement('span');
        dot.className = 'sp-dot' + (i < count ? ' sp-active' : '');
        el.appendChild(dot);
    }
    el.style.display = count > 0 ? '' : 'none';
}

// Sprint 116: Win type breakdown badge
var _wtLine116 = 0, _wtScatter116 = 0, _wtBonus116 = 0;
function _resetWinBreakdown() {
    _wtLine116 = 0; _wtScatter116 = 0; _wtBonus116 = 0;
    var el = document.getElementById('winBreakdown');
    if (el) el.style.display = 'none';
}
function _updateWinBreakdown(type) {
    if (type === 'scatter') _wtScatter116++;
    else if (type === 'bonus' || type === 'free') _wtBonus116++;
    else _wtLine116++;
    var el = document.getElementById('winBreakdown');
    if (!el) return;
    var parts = [];
    if (_wtLine116 > 0) parts.push(_wtLine116 + ' line');
    if (_wtScatter116 > 0) parts.push(_wtScatter116 + ' scat');
    if (_wtBonus116 > 0) parts.push(_wtBonus116 + ' bonus');
    if (parts.length === 0) { el.style.display = 'none'; return; }
    el.textContent = parts.join(' \u00B7 ');
    el.style.display = '';
}

// Sprint 117: Active bonus feature display
function _updateFeatureActiveDisplay() {
    var el = document.getElementById('featureActiveDisplay');
    if (!el) return;
    if (freeSpinsActive) {
        el.textContent = '\\u2728 FREE SPINS';
        el.style.display = '';
    } else if (typeof expandingWildRespinsLeft !== 'undefined' && expandingWildRespinsLeft > 0) {
        el.textContent = '\\uD83C\\uDF1F EXPANDING WILD';
        el.style.display = '';
    } else if (typeof respinCount !== 'undefined' && respinCount > 0) {
        el.textContent = '\\uD83D\\uDD04 RESPIN';
        el.style.display = '';
    } else {
        el.style.display = 'none';
    }
}

// Sprint 118: Session milestone display
var _lastMilestone118 = 0;
var _milestoneSpin118 = 0;
function _resetSessionMilestone() {
    _lastMilestone118 = 0;
    _milestoneSpin118 = 0;
    var el = document.getElementById('sessionMilestone');
    if (el) el.style.display = 'none';
}
function _checkSessionMilestone() {
    _milestoneSpin118++;
    var milestones = [10, 25, 50, 100, 250, 500];
    var el = document.getElementById('sessionMilestone');
    if (!el) return;
    var milestone = milestones.find(function(m) { return _milestoneSpin118 === m; });
    if (!milestone) return;
    el.textContent = '\\uD83C\\uDFAF ' + milestone + ' spins!';
    el.style.display = '';
    setTimeout(function() { el.style.display = 'none'; }, 3000);
}

// Sprint 119: Net P&L display
function _resetNetPnl() {
    var el = document.getElementById('netPnl');
    if (el) { el.textContent = _DSN + '0.00'; el.style.display = 'none'; }
}
function _updateNetPnl() {
    var el = document.getElementById('netPnl');
    if (!el || typeof _slotSessionStartBal === 'undefined') return;
    var net = balance - _slotSessionStartBal;
    el.className = 'net-pnl' + (net >= 0 ? ' pnl-up' : ' pnl-down');
    el.textContent = (net >= 0 ? '+' : '') + _DSN + net.toFixed(2);
    el.style.display = '';
}

// Sprint 120: Session rating (stars based on RTP performance)
function _updateSessionRating() {
    var el = document.getElementById('sessionRating');
    if (!el) return;
    var sessWag = typeof _sessWagered84 !== 'undefined' ? _sessWagered84 : 0;
    if (sessWag < 10) { el.style.display = 'none'; return; }
    var rtp = sessWag > 0 ? (typeof _sessWon84 !== 'undefined' ? _sessWon84 : 0) / sessWag : 0;
    var stars = rtp >= 1.5 ? 5 : rtp >= 1.1 ? 4 : rtp >= 0.9 ? 3 : rtp >= 0.7 ? 2 : 1;
    el.textContent = '\\u2605'.repeat(stars) + '\\u2606'.repeat(5 - stars);
    el.className = 'session-rating' + (stars >= 4 ? ' sr-high' : stars >= 3 ? ' sr-mid' : ' sr-low');
    el.style.display = '';
}

// Sprint 121: Lucky coins earned (1 per spin, cosmetic progression)
var _luckyCoins121 = 0;
function _resetLuckyCoins() {
    _luckyCoins121 = 0;
    var el = document.getElementById('luckyCoinDisplay');
    if (el) el.style.display = 'none';
}
function _earnLuckyCoin(won) {
    _luckyCoins121 += won ? 2 : 1;
    var el = document.getElementById('luckyCoinDisplay');
    if (!el) return;
    el.textContent = '\\uD83E\\uDE99 ' + _luckyCoins121;
    el.style.display = '';
}

// Sprint 122: Inline volume micro-control
function _initVolumeSliderMicro() {
    var el = document.getElementById('volumeSliderMicro');
    if (!el) return;
    var vol = (typeof appSettings !== 'undefined' && appSettings) ? (appSettings.volume || 50) : 50;
    el.value = vol;
    el.style.display = '';
}
function _handleVolumeSliderMicro(val) {
    if (typeof appSettings !== 'undefined' && appSettings) {
        appSettings.volume = parseInt(val, 10);
        if (typeof saveSettings === 'function') saveSettings(appSettings);
    }
    if (typeof SoundManager !== 'undefined' && SoundManager && SoundManager.setVolume) {
        SoundManager.setVolume(parseInt(val, 10) / 100);
    }
}
`;

append(jsFile, JS_CODE);

// ── HOOKS ─────────────────────────────────────────────────────────────────────

// openSlot: after Sprint 107-114 inits
patch(jsFile,
    `        _resetProfitPctBadge();  // 114 — profit % badge`,
    `        _resetProfitPctBadge();  // 114 — profit % badge
        _resetScatterProgress(); // 115 — scatter progress
        _resetWinBreakdown();    // 116 — win breakdown
        _updateFeatureActiveDisplay(); // 117 — feature active
        _resetSessionMilestone(); // 118 — milestones
        _resetNetPnl();          // 119 — net P&L
        _resetLuckyCoins();      // 121 — lucky coins
        _initVolumeSliderMicro(); // 122 — volume slider`,
    false
);

// Win hooks — both engines
patch(jsFile,
    `                _updateProfitPctBadge();                // 114 — profit %`,
    `                _updateProfitPctBadge();                // 114 — profit %
                _updateScatterProgress(currentGrid);    // 115 — scatter progress
                _updateWinBreakdown('line');             // 116 — win type
                _updateFeatureActiveDisplay();           // 117 — feature active
                _checkSessionMilestone();               // 118 — milestone
                _updateNetPnl();                        // 119 — net P&L
                _updateSessionRating();                 // 120 — session rating
                _earnLuckyCoin(true);                   // 121 — lucky coins (win)`,
    true
);

// Post-spin hooks — both engines
patch(jsFile,
    `            _updateProfitPctBadge();                   // 114 — profit %`,
    `            _updateProfitPctBadge();                   // 114 — profit %
            _updateScatterProgress(currentGrid);       // 115 — scatter progress
            _updateFeatureActiveDisplay();             // 117 — feature active
            _checkSessionMilestone();                  // 118 — milestone
            _updateNetPnl();                           // 119 — net P&L
            _updateSessionRating();                    // 120 — session rating
            _earnLuckyCoin(false);                     // 121 — lucky coins`,
    true
);

console.log('JS patches done');

// ── HTML ───────────────────────────────────────────────────────────────────────

// After spinRec add netPnl + sessionRating + sessionMilestone
patch(htmlFile,
    `            <!-- Sprint 110: Spin recommendation -->
            <div class="spin-rec" id="spinRec" style="display:none"></div>`,
    `            <!-- Sprint 110: Spin recommendation -->
            <div class="spin-rec" id="spinRec" style="display:none"></div>
            <!-- Sprint 119: Net P&L display -->
            <span class="net-pnl" id="netPnl" style="display:none">+$0.00</span>
            <!-- Sprint 120: Session rating -->
            <span class="session-rating" id="sessionRating" style="display:none"></span>
            <!-- Sprint 118: Session milestone -->
            <div class="session-milestone" id="sessionMilestone" style="display:none"></div>`,
    false
);

// After totalBetDisplay add luckyCoins + winBreakdown
patch(htmlFile,
    `            <!-- Sprint 111: Total bet (session wagered) -->
            <span class="total-bet-display" id="totalBetDisplay" style="display:none"></span>`,
    `            <!-- Sprint 111: Total bet (session wagered) -->
            <span class="total-bet-display" id="totalBetDisplay" style="display:none"></span>
            <!-- Sprint 116: Win type breakdown -->
            <span class="win-breakdown" id="winBreakdown" style="display:none"></span>
            <!-- Sprint 121: Lucky coins -->
            <span class="lucky-coin-display" id="luckyCoinDisplay" style="display:none"></span>`,
    false
);

// After autoSpeedBadge add scatterProgress + featureActiveDisplay + volumeSlider
patch(htmlFile,
    `                    <!-- Sprint 113: Auto-spin speed badge -->
                    <span class="auto-speed-badge" id="autoSpeedBadge" style="display:none"></span>`,
    `                    <!-- Sprint 113: Auto-spin speed badge -->
                    <span class="auto-speed-badge" id="autoSpeedBadge" style="display:none"></span>
                    <!-- Sprint 115: Scatter progress dots -->
                    <div class="scatter-progress" id="scatterProgress" style="display:none"></div>
                    <!-- Sprint 117: Feature active display -->
                    <div class="feature-active-display" id="featureActiveDisplay" style="display:none"></div>
                    <!-- Sprint 122: Volume micro-slider -->
                    <input type="range" class="volume-slider-micro" id="volumeSliderMicro" min="0" max="100" step="5" oninput="_handleVolumeSliderMicro(this.value)" style="display:none">`,
    false
);

console.log('HTML done');

// ── CSS ─────────────────────────────────────────────────────────────────────────

const CSS_CODE = `
/* ═══════════════════════════════════════════════════════
   SPRINT 115-122 STYLES
   ═══════════════════════════════════════════════════════ */

/* Sprint 115: Scatter progress dots */
.scatter-progress {
    display: flex;
    gap: 3px;
    align-items: center;
    padding: 2px;
}
.sp-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: rgba(255,255,255,0.15);
    border: 1px solid rgba(255,255,255,0.2);
    transition: background 0.2s, box-shadow 0.2s;
}
.sp-dot.sp-active {
    background: #ff9f43;
    border-color: #ff9f43;
    box-shadow: 0 0 6px rgba(255,159,67,0.6);
}

/* Sprint 116: Win type breakdown */
.win-breakdown {
    font-size: 9px;
    color: #b2bec3;
    padding: 2px 7px;
    border-radius: 8px;
    background: rgba(178,190,195,0.06);
    font-weight: 500;
    letter-spacing: 0.3px;
}

/* Sprint 117: Feature active display */
.feature-active-display {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 1px;
    padding: 3px 10px;
    border-radius: 8px;
    background: linear-gradient(90deg, rgba(108,92,231,0.25), rgba(162,155,254,0.25));
    color: #a29bfe;
    border: 1px solid rgba(162,155,254,0.3);
    animation: feat-pulse 1.5s ease-in-out infinite alternate;
}
@keyframes feat-pulse {
    from { opacity: 0.8; }
    to   { opacity: 1; box-shadow: 0 0 8px rgba(162,155,254,0.3); }
}

/* Sprint 118: Session milestone */
.session-milestone {
    font-size: 12px;
    font-weight: 700;
    text-align: center;
    padding: 4px 12px;
    border-radius: 12px;
    background: linear-gradient(135deg, rgba(253,203,110,0.3), rgba(253,121,168,0.3));
    color: #ffeaa7;
    border: 1px solid rgba(253,203,110,0.4);
    animation: milestone-pop 0.3s ease;
}
@keyframes milestone-pop {
    0% { transform: scale(0.8); opacity: 0; }
    80% { transform: scale(1.05); }
    100% { transform: scale(1); opacity: 1; }
}

/* Sprint 119: Net P&L */
.net-pnl {
    font-size: 12px;
    font-weight: 700;
    padding: 2px 9px;
    border-radius: 10px;
    font-variant-numeric: tabular-nums;
}
.pnl-up   { color: #00ff88; background: rgba(0,255,136,0.12); }
.pnl-down { color: #ff7675; background: rgba(255,118,117,0.12); }

/* Sprint 120: Session rating stars */
.session-rating {
    font-size: 11px;
    letter-spacing: 1px;
}
.sr-high { color: #ffd700; }
.sr-mid  { color: #fdcb6e; }
.sr-low  { color: #636e72; }

/* Sprint 121: Lucky coins */
.lucky-coin-display {
    font-size: 10px;
    color: #fdcb6e;
    padding: 2px 7px;
    border-radius: 8px;
    background: rgba(253,203,110,0.08);
    font-weight: 600;
}

/* Sprint 122: Volume micro-slider */
.volume-slider-micro {
    -webkit-appearance: none;
    appearance: none;
    width: 60px;
    height: 4px;
    border-radius: 2px;
    background: rgba(255,255,255,0.15);
    outline: none;
    cursor: pointer;
    align-self: center;
}
.volume-slider-micro::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #74b9ff;
    cursor: pointer;
}
`;

append(cssFile, CSS_CODE);

console.log('Sprint 115-122 DONE!');
console.log('  ui-slot.js:', fs.readFileSync(jsFile,'utf8').split('\n').length);
console.log('  styles.css:', fs.readFileSync(cssFile,'utf8').split('\n').length);
console.log('  index.html:', fs.readFileSync(htmlFile,'utf8').split('\n').length);
