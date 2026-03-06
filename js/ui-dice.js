(function () {
  'use strict';

  // ── Dice (Roll Over / Roll Under) ───────────────────────────────────────────
  // Player sets a target (1–99) and picks Over or Under.
  // Roll is 0.00–100.00. Win chance and multiplier update live.
  // 97% RTP, server-validated. Ultra-fast rounds.

  // ── state ──────────────────────────────────────────────────────────────────

  var state = {
    open:      false,
    rolling:   false,
    bet:       1.0,
    target:    50,
    direction: 'over', // 'over' | 'under'
    lastRoll:  null,
    history:   [],
  };

  var refs = {};

  // ── helpers ────────────────────────────────────────────────────────────────

  function getToken() {
    try { return localStorage.getItem('casino_token') || localStorage.getItem('token') || null; }
    catch (e) { return null; }
  }

  function apiFetch(path, opts) {
    var token = getToken();
    var h = { 'Content-Type': 'application/json' };
    if (token) h['Authorization'] = 'Bearer ' + token;
    return fetch(path, Object.assign({ headers: h }, opts || {}));
  }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls)  e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  function clearChildren(n) { while (n.firstChild) n.removeChild(n.firstChild); }

  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

  // ── live calc (mirrors server logic) ────────────────────────────────────────

  function calcLocal(target, direction) {
    var chance = direction === 'over' ? (100 - target) : target;
    chance     = clamp(chance, 1, 97);
    var mult   = parseFloat((0.97 / (chance / 100)).toFixed(4));
    return { chance: chance, mult: mult };
  }

  // ── UI updates ──────────────────────────────────────────────────────────────

  function refreshStats() {
    var res = calcLocal(state.target, state.direction);
    refs.chanceVal.textContent = res.chance.toFixed(2) + '%';
    refs.multVal.textContent   = res.mult.toFixed(4) + 'x';
    refs.payoutVal.textContent = '$' + (state.bet * res.mult).toFixed(2);
    // Track line
    updateTrack();
  }

  function updateTrack() {
    var pct = state.direction === 'over'
      ? (100 - state.target)
      : state.target;
    var winPct = clamp(pct, 1, 99);

    // Lose zone = target position on bar
    var loseW = state.direction === 'over' ? state.target : (100 - state.target);
    var winW  = 100 - loseW;

    refs.trackLose.style.width = loseW + '%';
    refs.trackWin.style.width  = winW + '%';

    // Needle
    refs.trackNeedle.style.left = state.target + '%';

    // Labels
    refs.trackLabel.textContent = (state.direction === 'over' ? 'Roll > ' : 'Roll < ') + state.target;
    void winPct; // used implicitly in refreshStats
  }

  function setResult(roll, won) {
    refs.diceResult.textContent = roll.toFixed(2);
    refs.diceResult.className   = 'dice-result-num ' + (won ? 'dice-win' : 'dice-lose');
    // move ball on track
    var pct = clamp(roll, 0, 100);
    refs.trackBall.style.left    = pct + '%';
    refs.trackBall.style.display = 'block';
    refs.trackBall.className     = 'dice-ball ' + (won ? 'dice-ball-win' : 'dice-ball-lose');
  }

  function setStatus(msg, cls) {
    refs.statusMsg.textContent = msg || '';
    refs.statusMsg.className   = 'dice-status ' + (cls || '');
  }

  function setDir(dir) {
    state.direction = dir;
    refs.btnOver.classList.toggle('dice-dir-active',  dir === 'over');
    refs.btnUnder.classList.toggle('dice-dir-active', dir === 'under');
    refreshStats();
  }

  function setTarget(v) {
    state.target = clamp(Math.round(v), 2, 98);
    refs.targetSlider.value       = state.target;
    refs.targetInput.value        = state.target;
    refreshStats();
  }

  function setBet(v) {
    state.bet = Math.max(0.10, Math.min(1000, parseFloat(v) || 1.0));
    refs.betLabel.textContent = '$' + state.bet.toFixed(2);
    refreshStats();
  }

  function syncBalance(newBal) {
    if (newBal == null) return;
    if (typeof window.updateBalanceDisplay === 'function') window.updateBalanceDisplay(newBal);
    if (typeof window.balance !== 'undefined') window.balance = newBal;
  }

  // ── history ──────────────────────────────────────────────────────────────────

  function addHistory(roll, won) {
    state.history.push({ roll: roll, won: won });
    if (state.history.length > 20) state.history.shift();
    clearChildren(refs.histRow);
    state.history.forEach(function(h) {
      var pill = el('span', 'dice-hist-pill ' + (h.won ? 'dice-hist-win' : 'dice-hist-lose'),
        h.roll.toFixed(1));
      refs.histRow.appendChild(pill);
    });
  }

  // ── roll ──────────────────────────────────────────────────────────────────────

  function doRoll() {
    if (state.rolling) return;
    state.rolling = true;
    refs.btnRoll.disabled = true;
    refs.trackBall.style.display = 'none';

    // Animate the display number quickly
    var animStart = Date.now();
    var animDur   = 700;
    var animId    = setInterval(function() {
      refs.diceResult.textContent = (Math.random() * 100).toFixed(2);
    }, 40);

    apiFetch('/api/dice/roll', {
      method: 'POST',
      body: JSON.stringify({ bet: state.bet, target: state.target, direction: state.direction }),
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      var elapsed = Date.now() - animStart;
      var delay   = Math.max(0, animDur - elapsed);
      setTimeout(function() {
        clearInterval(animId);
        state.rolling = false;
        refs.btnRoll.disabled = false;

        if (data.error) {
          refs.diceResult.textContent = '?';
          setStatus(data.error, 'dice-err');
          return;
        }

        setResult(data.roll, data.won);
        addHistory(data.roll, data.won);

        if (data.won) {
          setStatus('\uD83C\uDFB2 Rolled ' + data.roll.toFixed(2) + ' — WIN! +$' + data.profit.toFixed(2), 'dice-ok');
        } else {
          setStatus('\uD83C\uDFB2 Rolled ' + data.roll.toFixed(2) + ' — lose.', 'dice-lose-st');
        }
        syncBalance(data.newBalance);
      }, delay);
    })
    .catch(function() {
      clearInterval(animId);
      state.rolling = false;
      refs.btnRoll.disabled = false;
      refs.diceResult.textContent = '!';
      setStatus('Network error — try again', 'dice-err');
    });
  }

  // ── build UI ───────────────────────────────────────────────────────────────

  function buildUI() {
    if (document.getElementById('dice-overlay')) return;

    var overlay = el('div', 'dice-overlay');
    overlay.id  = 'dice-overlay';

    var panel = el('div', 'dice-panel');

    // Header
    var header   = el('div', 'dice-header');
    var title    = el('h2', 'dice-title', '\uD83C\uDFB2 Dice');
    var closeBtn = el('button', 'dice-close-btn', '\u00D7');
    closeBtn.setAttribute('aria-label', 'Close Dice');
    closeBtn.addEventListener('click', closeDice);
    header.appendChild(title);
    header.appendChild(closeBtn);

    // Big result display
    var resultArea = el('div', 'dice-result-area');
    var resultNum  = el('span', 'dice-result-num', '--');
    resultArea.appendChild(resultNum);
    refs.diceResult = resultNum;

    // Status
    var statusMsg = el('div', 'dice-status', 'Set your target, pick direction, and roll!');
    refs.statusMsg = statusMsg;

    // Track (win/lose zone bar)
    var trackWrap   = el('div', 'dice-track-wrap');
    var trackBar    = el('div', 'dice-track-bar');
    var trackLose   = el('div', 'dice-track-zone dice-track-lose');
    var trackWin    = el('div', 'dice-track-zone dice-track-win');
    var trackNeedle = el('div', 'dice-track-needle');
    var trackBall   = el('div', 'dice-ball');
    trackBall.style.display = 'none';
    trackBar.appendChild(trackLose);
    trackBar.appendChild(trackWin);
    trackBar.appendChild(trackNeedle);
    trackBar.appendChild(trackBall);
    var trackLbl = el('div', 'dice-track-label', 'Roll > 50');
    trackWrap.appendChild(trackBar);
    trackWrap.appendChild(trackLbl);
    refs.trackLose   = trackLose;
    refs.trackWin    = trackWin;
    refs.trackNeedle = trackNeedle;
    refs.trackBall   = trackBall;
    refs.trackLabel  = trackLbl;

    // Stats row
    var statsRow  = el('div', 'dice-stats-row');
    var statChance = el('div', 'dice-stat');
    var scLabel    = el('div', 'dice-stat-label', 'Win Chance');
    var scVal      = el('div', 'dice-stat-val', '50.00%');
    statChance.appendChild(scLabel);
    statChance.appendChild(scVal);
    refs.chanceVal = scVal;

    var statMult   = el('div', 'dice-stat');
    var smLabel    = el('div', 'dice-stat-label', 'Multiplier');
    var smVal      = el('div', 'dice-stat-val', '1.9400x');
    statMult.appendChild(smLabel);
    statMult.appendChild(smVal);
    refs.multVal = smVal;

    var statPay    = el('div', 'dice-stat');
    var spLabel    = el('div', 'dice-stat-label', 'Payout');
    var spVal      = el('div', 'dice-stat-val', '$1.94');
    statPay.appendChild(spLabel);
    statPay.appendChild(spVal);
    refs.payoutVal = spVal;

    statsRow.appendChild(statChance);
    statsRow.appendChild(statMult);
    statsRow.appendChild(statPay);

    // Target slider
    var targetWrap  = el('div', 'dice-target-wrap');
    var targetLabel = el('label', 'dice-field-label', 'Target');
    var targetRow   = el('div', 'dice-target-row');
    var targetSlider = document.createElement('input');
    targetSlider.type  = 'range';
    targetSlider.min   = '2';
    targetSlider.max   = '98';
    targetSlider.value = '50';
    targetSlider.className = 'dice-slider';
    targetSlider.addEventListener('input', function() { setTarget(parseInt(this.value, 10)); });
    var targetInput = document.createElement('input');
    targetInput.type      = 'number';
    targetInput.min       = '2';
    targetInput.max       = '98';
    targetInput.value     = '50';
    targetInput.className = 'dice-target-input';
    targetInput.addEventListener('change', function() { setTarget(parseInt(this.value, 10)); });
    refs.targetSlider = targetSlider;
    refs.targetInput  = targetInput;
    targetRow.appendChild(targetSlider);
    targetRow.appendChild(targetInput);
    targetWrap.appendChild(targetLabel);
    targetWrap.appendChild(targetRow);

    // Direction buttons
    var dirRow    = el('div', 'dice-dir-row');
    var btnOver   = el('button', 'dice-dir-btn dice-dir-active', '\u2191 Roll Over');
    var btnUnder  = el('button', 'dice-dir-btn', '\u2193 Roll Under');
    btnOver.addEventListener('click',  function() { setDir('over');  });
    btnUnder.addEventListener('click', function() { setDir('under'); });
    refs.btnOver  = btnOver;
    refs.btnUnder = btnUnder;
    dirRow.appendChild(btnOver);
    dirRow.appendChild(btnUnder);

    // Bet row
    var betRow   = el('div', 'dice-bet-row');
    var betLabel_= el('label', 'dice-field-label', 'Bet');
    var betCtrl  = el('div', 'dice-bet-ctrl');
    var btnHalf  = el('button', 'dice-adj-btn', '\u00BD');
    btnHalf.addEventListener('click', function() { setBet(state.bet / 2); });
    var betLabel = el('span', 'dice-bet-label', '$1.00');
    refs.betLabel = betLabel;
    var btnDbl   = el('button', 'dice-adj-btn', '2\u00D7');
    btnDbl.addEventListener('click', function() { setBet(state.bet * 2); });
    betCtrl.appendChild(btnHalf);
    betCtrl.appendChild(betLabel);
    betCtrl.appendChild(btnDbl);
    betRow.appendChild(betLabel_);
    betRow.appendChild(betCtrl);

    // Quick chips
    var chips = el('div', 'dice-chips');
    [0.10, 0.50, 1, 5, 10, 50, 100].forEach(function(v) {
      var c = el('button', 'dice-chip', v < 1 ? ('$' + v.toFixed(2)) : ('$' + v));
      c.addEventListener('click', function() { setBet(v); });
      chips.appendChild(c);
    });

    // Roll button
    var btnRoll = el('button', 'dice-btn-roll', '\uD83C\uDFB2 ROLL');
    btnRoll.addEventListener('click', doRoll);
    refs.btnRoll = btnRoll;

    // History
    var histSec = el('div', 'dice-hist-section');
    var histLbl = el('div', 'dice-hist-label', 'History');
    var histRow = el('div', 'dice-hist-row');
    refs.histRow = histRow;
    histSec.appendChild(histLbl);
    histSec.appendChild(histRow);

    // Assemble
    panel.appendChild(header);
    panel.appendChild(resultArea);
    panel.appendChild(statusMsg);
    panel.appendChild(trackWrap);
    panel.appendChild(statsRow);
    panel.appendChild(dirRow);
    panel.appendChild(targetWrap);
    panel.appendChild(betRow);
    panel.appendChild(chips);
    panel.appendChild(btnRoll);
    panel.appendChild(histSec);

    overlay.appendChild(panel);
    document.body.appendChild(overlay);
    overlay.addEventListener('click', function(e) { if (e.target === overlay) closeDice(); });

    injectStyles();
    refreshStats();
  }

  // ── open / close ────────────────────────────────────────────────────────────

  function openDice() {
    if (!getToken()) return;
    buildUI();
    var ov = document.getElementById('dice-overlay');
    if (ov) { ov.style.display = 'flex'; state.open = true; }
  }

  function closeDice() {
    var ov = document.getElementById('dice-overlay');
    if (ov) ov.style.display = 'none';
    state.open = false;
  }

  // ── styles ──────────────────────────────────────────────────────────────────

  function injectStyles() {
    if (document.getElementById('dice-styles')) return;
    var s = document.createElement('style');
    s.id  = 'dice-styles';
    s.textContent = [
      '.dice-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.78);z-index:9300;align-items:center;justify-content:center;padding:1rem;box-sizing:border-box}',
      '.dice-panel{background:#0f172a;border:1px solid #1e3a5f;border-radius:1rem;padding:1.4rem;width:100%;max-width:440px;max-height:96vh;overflow-y:auto;display:flex;flex-direction:column;gap:.8rem;color:#e2e8f0;font-family:inherit}',
      /* header */
      '.dice-header{display:flex;justify-content:space-between;align-items:center}',
      '.dice-title{margin:0;font-size:1.4rem;color:#f8fafc}',
      '.dice-close-btn{background:none;border:none;color:#94a3b8;font-size:1.6rem;cursor:pointer;line-height:1;padding:.2rem .5rem}',
      '.dice-close-btn:hover{color:#e2e8f0}',
      /* result */
      '.dice-result-area{display:flex;justify-content:center;align-items:center;padding:.5rem 0}',
      '.dice-result-num{font-size:4rem;font-weight:900;color:#e2e8f0;font-variant-numeric:tabular-nums;transition:color .2s}',
      '.dice-win{color:#4ade80}',
      '.dice-lose{color:#f87171}',
      /* status */
      '.dice-status{text-align:center;font-size:.85rem;color:#94a3b8;min-height:1.1em}',
      '.dice-ok{color:#4ade80}',
      '.dice-err{color:#f87171}',
      '.dice-lose-st{color:#f87171}',
      /* track bar */
      '.dice-track-wrap{display:flex;flex-direction:column;gap:.4rem}',
      '.dice-track-bar{position:relative;height:18px;border-radius:9px;overflow:visible;display:flex}',
      '.dice-track-zone{height:100%;transition:width .25s}',
      '.dice-track-lose{background:#dc2626;border-radius:9px 0 0 9px}',
      '.dice-track-win{background:#16a34a;border-radius:0 9px 9px 0;flex:1}',
      '.dice-track-needle{position:absolute;top:-5px;bottom:-5px;width:3px;background:#fbbf24;border-radius:2px;transform:translateX(-50%);transition:left .25s}',
      '.dice-ball{position:absolute;top:50%;width:14px;height:14px;border-radius:50%;transform:translate(-50%,-50%);transition:left .35s cubic-bezier(.34,1.56,.64,1)}',
      '.dice-ball-win{background:#4ade80;box-shadow:0 0 8px #4ade80}',
      '.dice-ball-lose{background:#f87171;box-shadow:0 0 8px #f87171}',
      '.dice-track-label{font-size:.78rem;color:#64748b;text-align:center}',
      /* stats */
      '.dice-stats-row{display:grid;grid-template-columns:repeat(3,1fr);gap:.5rem}',
      '.dice-stat{background:#1e293b;border-radius:.5rem;padding:.5rem;text-align:center}',
      '.dice-stat-label{font-size:.7rem;color:#64748b;text-transform:uppercase;letter-spacing:.05em}',
      '.dice-stat-val{font-size:1.05rem;font-weight:700;color:#fbbf24;font-variant-numeric:tabular-nums}',
      /* direction buttons */
      '.dice-dir-row{display:grid;grid-template-columns:1fr 1fr;gap:.5rem}',
      '.dice-dir-btn{background:#1e293b;border:2px solid #334155;color:#94a3b8;border-radius:.5rem;padding:.55rem;font-size:.9rem;font-weight:700;cursor:pointer;transition:all .15s}',
      '.dice-dir-btn:hover{border-color:#60a5fa;color:#60a5fa}',
      '.dice-dir-active{background:#1d4ed8!important;border-color:#3b82f6!important;color:#fff!important}',
      /* target */
      '.dice-target-wrap{display:flex;flex-direction:column;gap:.3rem}',
      '.dice-target-row{display:flex;align-items:center;gap:.6rem}',
      '.dice-slider{flex:1;accent-color:#3b82f6;cursor:pointer;height:6px}',
      '.dice-target-input{width:54px;background:#1e293b;border:1px solid #334155;color:#e2e8f0;border-radius:.4rem;padding:.3rem .4rem;text-align:center;font-size:.9rem;-moz-appearance:textfield}',
      '.dice-target-input::-webkit-outer-spin-button,.dice-target-input::-webkit-inner-spin-button{-webkit-appearance:none}',
      /* bet */
      '.dice-bet-row{display:flex;align-items:center;gap:.8rem}',
      '.dice-field-label{font-size:.78rem;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em;flex-shrink:0}',
      '.dice-bet-ctrl{display:flex;align-items:center;gap:.5rem;flex:1}',
      '.dice-adj-btn{background:#334155;border:none;color:#e2e8f0;border-radius:.4rem;padding:.28rem .65rem;cursor:pointer;font-size:.85rem}',
      '.dice-adj-btn:hover{background:#475569}',
      '.dice-bet-label{flex:1;text-align:center;font-weight:700;color:#f8fafc}',
      /* chips */
      '.dice-chips{display:flex;flex-wrap:wrap;gap:.3rem}',
      '.dice-chip{background:#0f172a;border:1px solid #334155;color:#94a3b8;border-radius:.4rem;padding:.25rem .55rem;font-size:.78rem;cursor:pointer}',
      '.dice-chip:hover{border-color:#60a5fa;color:#60a5fa}',
      /* roll button */
      '.dice-btn-roll{background:linear-gradient(135deg,#ea580c,#f97316);color:#fff;border:none;border-radius:.6rem;padding:.8rem;font-size:1.1rem;font-weight:900;cursor:pointer;width:100%;letter-spacing:.05em;transition:opacity .15s}',
      '.dice-btn-roll:hover:not(:disabled){opacity:.88}',
      '.dice-btn-roll:disabled{opacity:.35;cursor:not-allowed}',
      /* history */
      '.dice-hist-section{display:flex;flex-direction:column;gap:.3rem}',
      '.dice-hist-label{font-size:.72rem;color:#64748b;text-transform:uppercase;letter-spacing:.05em}',
      '.dice-hist-row{display:flex;flex-wrap:wrap;gap:.3rem;min-height:1.3rem}',
      '.dice-hist-pill{font-size:.7rem;padding:.15rem .4rem;border-radius:.3rem;font-weight:600}',
      '.dice-hist-win{background:#14532d;color:#4ade80}',
      '.dice-hist-lose{background:#450a0a;color:#f87171}',
    ].join('\n');
    document.head.appendChild(s);
  }

  // ── public API ──────────────────────────────────────────────────────────────

  window.openDice  = openDice;
  window.closeDice = closeDice;

}());
