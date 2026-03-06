(function () {
  'use strict';

  var modal, spinning = false;
  var lastDice = [1, 1, 1];

  // ── CSS ──────────────────────────────────────────────────────────────────────

  function injectCSS() {
    if (document.getElementById('cal-css')) return;
    var s = document.createElement('style');
    s.id = 'cal-css';
    s.textContent = `
      #calModal { display:none; position:fixed; inset:0; background:rgba(0,0,0,.82);
        z-index:9000; align-items:center; justify-content:center; }
      #calModal.active { display:flex; }
      .cal-box { background:#1e1e2e; border:2px solid #f59e0b; border-radius:16px;
        padding:24px; max-width:520px; width:95%; color:#e2e8f0; font-family:sans-serif;
        max-height:90vh; overflow-y:auto; }
      .cal-title { text-align:center; font-size:1.5rem; font-weight:700;
        color:#f59e0b; margin-bottom:16px; }
      .cal-dice-row { display:flex; justify-content:center; gap:16px; margin-bottom:20px; }
      .cal-die { width:64px; height:64px; background:#0f172a; border:3px solid #475569;
        border-radius:12px; display:flex; align-items:center; justify-content:center;
        font-size:2.2rem; transition:transform .15s; }
      .cal-die.rolling { animation: cal-shake .08s ease-in-out infinite alternate; }
      @keyframes cal-shake {
        from { transform: rotate(-8deg) scale(1.05); }
        to   { transform: rotate(8deg)  scale(1.05); }
      }
      .cal-die.win { border-color:#4ade80; box-shadow:0 0 12px #4ade8066; }

      .cal-section { margin-bottom:14px; }
      .cal-section-title { font-size:.8rem; font-weight:700; color:#94a3b8;
        text-transform:uppercase; letter-spacing:.05em; margin-bottom:8px; }

      /* Number picker */
      .cal-num-row { display:flex; gap:8px; flex-wrap:wrap; align-items:center; }
      .cal-num-btn { width:38px; height:38px; border-radius:8px; border:2px solid #475569;
        background:#0f172a; color:#e2e8f0; font-weight:700; cursor:pointer;
        transition:border-color .15s,background .15s; font-size:1rem; }
      .cal-num-btn.sel { border-color:#f59e0b; background:#f59e0b22; color:#f59e0b; }
      .cal-num-input { width:80px; padding:6px 8px; background:#0f172a; border:1px solid #475569;
        border-radius:6px; color:#e2e8f0; font-size:.9rem; text-align:center; }
      .cal-num-input:focus { outline:none; border-color:#f59e0b; }

      /* Other bets */
      .cal-bet-grid { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
      .cal-bet-cell { display:flex; flex-direction:column; gap:4px; }
      .cal-bet-cell label { font-size:.8rem; color:#94a3b8; }
      .cal-bet-cell input { padding:6px 8px; background:#0f172a; border:1px solid #475569;
        border-radius:6px; color:#e2e8f0; font-size:.9rem; text-align:center; }
      .cal-bet-cell input:focus { outline:none; border-color:#f59e0b; }
      .cal-edge-tag { font-size:.65rem; color:#64748b; }

      .cal-roll-btn { width:100%; padding:12px; background:#f59e0b; color:#0f172a;
        font-weight:800; font-size:1.1rem; border:none; border-radius:10px;
        cursor:pointer; margin-top:12px; transition:opacity .2s; }
      .cal-roll-btn:disabled { opacity:.45; cursor:not-allowed; }
      .cal-result { text-align:center; min-height:36px; font-size:1rem; font-weight:700;
        margin-top:10px; white-space:pre-line; }
      .cal-win  { color:#4ade80; }
      .cal-lose { color:#f87171; }
      .cal-close { display:block; margin:12px auto 0; background:transparent;
        border:1px solid #475569; color:#94a3b8; padding:6px 20px;
        border-radius:8px; cursor:pointer; font-size:.85rem; }

      /* Triple bet row */
      .cal-triple-row { display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
      .cal-triple-num { display:flex; gap:4px; }
      .cal-triple-num .cal-num-btn { width:32px; height:32px; font-size:.85rem; }
    `;
    document.head.appendChild(s);
  }

  var DIE_FACES = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

  function buildModal() {
    if (document.getElementById('calModal')) return;
    injectCSS();

    modal = document.createElement('div');
    modal.id = 'calModal';
    modal.innerHTML = `
      <div class="cal-box">
        <div class="cal-title">&#x1F3B2; Chuck-a-Luck</div>

        <div class="cal-dice-row">
          <div class="cal-die" id="calDie0">&#x2680;</div>
          <div class="cal-die" id="calDie1">&#x2681;</div>
          <div class="cal-die" id="calDie2">&#x2682;</div>
        </div>

        <!-- Number bet -->
        <div class="cal-section">
          <div class="cal-section-title">Number Bet <span class="cal-edge-tag">(1 match=1:1, 2=2:1, 3=10:1 — ~8% edge)</span></div>
          <div class="cal-num-row">
            <div id="calNumBtns"></div>
            <input type="number" class="cal-num-input" id="calNumAmt" min="0" step="0.25" placeholder="$0">
          </div>
        </div>

        <!-- Other bets -->
        <div class="cal-section">
          <div class="cal-section-title">Other Bets</div>
          <div class="cal-bet-grid">
            <div class="cal-bet-cell">
              <label>Field (total 3-7 or 14-18) <span class="cal-edge-tag">~2.8% edge</span></label>
              <input type="number" id="calField" min="0" step="0.25" placeholder="$0">
            </div>
            <div class="cal-bet-cell">
              <label>Big (total 11-17, no triple) <span class="cal-edge-tag">~2.8% edge</span></label>
              <input type="number" id="calBig" min="0" step="0.25" placeholder="$0">
            </div>
            <div class="cal-bet-cell">
              <label>Small (total 4-10, no triple) <span class="cal-edge-tag">~2.8% edge</span></label>
              <input type="number" id="calSmall" min="0" step="0.25" placeholder="$0">
            </div>
            <div class="cal-bet-cell">
              <label>Any Triple <span class="cal-edge-tag">5:1 — ~14% edge</span></label>
              <input type="number" id="calAnyTriple" min="0" step="0.25" placeholder="$0">
            </div>
          </div>
        </div>

        <!-- Specific triple -->
        <div class="cal-section">
          <div class="cal-section-title">Specific Triple <span class="cal-edge-tag">(30:1 — ~14% edge)</span></div>
          <div class="cal-triple-row">
            <div class="cal-triple-num" id="calTripleNums"></div>
            <input type="number" class="cal-num-input" id="calTripleAmt" min="0" step="0.25" placeholder="$0">
          </div>
        </div>

        <button class="cal-roll-btn" id="calRollBtn">&#x1F3B2; ROLL</button>
        <div class="cal-result" id="calResult"></div>
        <button class="cal-close" id="calClose">Close</button>
      </div>
    `;
    document.body.appendChild(modal);

    // Number picker buttons
    var numContainer = document.getElementById('calNumBtns');
    numContainer.style.display = 'flex';
    numContainer.style.gap = '6px';
    var selectedNum = 1;
    for (var i = 1; i <= 6; i++) {
      (function (n) {
        var btn = document.createElement('button');
        btn.className = 'cal-num-btn' + (n === 1 ? ' sel' : '');
        btn.textContent = n;
        btn.addEventListener('click', function () {
          selectedNum = n;
          document.querySelectorAll('#calNumBtns .cal-num-btn').forEach(function (b) {
            b.classList.toggle('sel', parseInt(b.textContent) === n);
          });
        });
        numContainer.appendChild(btn);
      })(i);
    }

    // Triple number picker
    var tripleContainer = document.getElementById('calTripleNums');
    var selectedTriple = 1;
    for (var j = 1; j <= 6; j++) {
      (function (n) {
        var btn = document.createElement('button');
        btn.className = 'cal-num-btn' + (n === 1 ? ' sel' : '');
        btn.textContent = n;
        btn.addEventListener('click', function () {
          selectedTriple = n;
          document.querySelectorAll('#calTripleNums .cal-num-btn').forEach(function (b) {
            b.classList.toggle('sel', parseInt(b.textContent) === n);
          });
        });
        tripleContainer.appendChild(btn);
      })(j);
    }

    document.getElementById('calRollBtn').addEventListener('click', function () {
      doRoll(selectedNum, selectedTriple);
    });
    document.getElementById('calClose').addEventListener('click', window.closeChuckALuck);
    modal.addEventListener('click', function (e) {
      if (e.target === modal) window.closeChuckALuck();
    });
  }

  function getDieEl(i) { return document.getElementById('calDie' + i); }

  function showDice(dice) {
    [0, 1, 2].forEach(function (i) {
      var el = getDieEl(i);
      if (el) {
        el.textContent = DIE_FACES[dice[i]];
        el.classList.remove('rolling');
      }
    });
  }

  function startRolling() {
    [0, 1, 2].forEach(function (i) {
      var el = getDieEl(i);
      if (el) { el.classList.add('rolling'); el.textContent = DIE_FACES[Math.ceil(Math.random() * 6)]; }
    });
  }

  function doRoll(selectedNum, selectedTriple) {
    if (spinning) return;

    var numAmt     = parseFloat(document.getElementById('calNumAmt').value) || 0;
    var fieldAmt   = parseFloat(document.getElementById('calField').value)  || 0;
    var bigAmt     = parseFloat(document.getElementById('calBig').value)    || 0;
    var smallAmt   = parseFloat(document.getElementById('calSmall').value)  || 0;
    var anyTriple  = parseFloat(document.getElementById('calAnyTriple').value) || 0;
    var tripleAmt  = parseFloat(document.getElementById('calTripleAmt').value) || 0;

    if (!numAmt && !fieldAmt && !bigAmt && !smallAmt && !anyTriple && !tripleAmt) {
      setResult('Place at least one bet.', false); return;
    }

    var token = localStorage.getItem('authToken') || '';
    spinning  = true;
    document.getElementById('calRollBtn').disabled = true;
    setResult('', null);

    var rollInterval = setInterval(startRolling, 80);

    var payload = {
      field:     fieldAmt || undefined,
      big:       bigAmt   || undefined,
      small:     smallAmt || undefined,
      anyTriple: anyTriple || undefined,
    };
    if (numAmt > 0)    payload.number   = { n: selectedNum,    amt: numAmt };
    if (tripleAmt > 0) payload.triple   = { n: selectedTriple, amt: tripleAmt };

    fetch('/api/chuckaluck/roll', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body:    JSON.stringify(payload),
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        clearInterval(rollInterval);
        endSpin();

        if (data.error) { showDice(lastDice); setResult('\u274C ' + data.error, false); return; }

        lastDice = data.dice;
        showDice(data.dice);

        // Highlight winning dice for number bet
        if (data.breakdown && data.breakdown.number && data.breakdown.number.hits > 0) {
          data.dice.forEach(function (d, i) {
            if (d === data.breakdown.number.n) getDieEl(i).classList.add('win');
          });
        }
        if (data.isTriple) {
          [0, 1, 2].forEach(function (i) { getDieEl(i).classList.add('win'); });
        }

        var lines = ['\uD83C\uDFB2 [' + data.dice.join(', ') + '] — Total: ' + data.total + (data.isTriple ? ' (TRIPLE!)' : '')];
        var bk = data.breakdown || {};
        if (bk.number)    lines.push((bk.number.hits > 0 ? '\u2705' : '\u274C') + ' Number ' + bk.number.n + ' (' + bk.number.hits + ' hits): ' + (bk.number.profit >= 0 ? '+' : '') + '$' + bk.number.profit.toFixed(2));
        if (bk.field)     lines.push((bk.field.win ? '\u2705' : '\u274C') + ' Field: ' + (bk.field.profit >= 0 ? '+' : '') + '$' + bk.field.profit.toFixed(2));
        if (bk.big)       lines.push((bk.big.win ? '\u2705' : '\u274C') + ' Big: ' + (bk.big.profit >= 0 ? '+' : '') + '$' + bk.big.profit.toFixed(2));
        if (bk.small)     lines.push((bk.small.win ? '\u2705' : '\u274C') + ' Small: ' + (bk.small.profit >= 0 ? '+' : '') + '$' + bk.small.profit.toFixed(2));
        if (bk.anyTriple) lines.push((bk.anyTriple.win ? '\u2705' : '\u274C') + ' Any Triple: ' + (bk.anyTriple.profit >= 0 ? '+' : '') + '$' + bk.anyTriple.profit.toFixed(2));
        if (bk.triple)    lines.push((bk.triple.win ? '\u2705' : '\u274C') + ' Triple ' + bk.triple.n + ': ' + (bk.triple.profit >= 0 ? '+' : '') + '$' + bk.triple.profit.toFixed(2));
        lines.push('\nNet: ' + (data.profit >= 0 ? '+' : '') + '$' + data.profit.toFixed(2));

        setResult(lines.join('\n'), data.profit > 0);
        if (typeof updateBalance === 'function') updateBalance(data.newBalance);
      })
      .catch(function (err) {
        clearInterval(rollInterval);
        endSpin();
        showDice(lastDice);
        setResult('\u274C Network error', false);
        console.error('[ChuckALuck]', err);
      });
  }

  function endSpin() {
    spinning = false;
    var btn = document.getElementById('calRollBtn');
    if (btn) btn.disabled = false;
    [0, 1, 2].forEach(function (i) {
      var el = getDieEl(i);
      if (el) el.classList.remove('rolling', 'win');
    });
  }

  function setResult(msg, win) {
    var el = document.getElementById('calResult');
    if (!el) return;
    el.textContent = msg;
    el.className = 'cal-result' + (win === true ? ' cal-win' : win === false && msg ? ' cal-lose' : '');
  }

  // ── Public API ────────────────────────────────────────────────────────────────

  window.openChuckALuck = function () {
    buildModal();
    modal.classList.add('active');
  };

  window.closeChuckALuck = function () {
    if (modal) modal.classList.remove('active');
  };
}());
