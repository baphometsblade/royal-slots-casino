(function() {
  'use strict';

  var TOKEN_KEY = typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken';

  var _overlay   = null;
  var _stylesInj = false;
  var _rolling   = false;
  var _betType   = 'big';
  var _betValue  = null;

  function getToken() {
    try { return localStorage.getItem(TOKEN_KEY); } catch(e) { return null; }
  }

  function injectStyles() {
    if (_stylesInj) return;
    _stylesInj = true;
    var s = document.createElement('style');
    s.textContent = [
      '#sbOverlay{position:fixed;inset:0;background:rgba(0,0,0,.93);z-index:10400;display:none;align-items:center;justify-content:center;font-family:monospace}',
      '#sbOverlay.active{display:flex}',
      '#sbModal{background:linear-gradient(135deg,#0f0500,#1c0a00);border:2px solid rgba(220,38,38,.3);border-radius:20px;padding:18px 20px;max-width:440px;width:96%;text-align:center;max-height:96vh;overflow-y:auto}',
      '#sbModal h2{color:#f87171;font-size:20px;margin:0 0 2px;letter-spacing:2px}',
      '#sbModal .sb-sub{color:rgba(255,255,255,.35);font-size:11px;margin-bottom:12px}',
      '.sb-dice-row{display:flex;gap:14px;justify-content:center;margin-bottom:12px}',
      '.sb-die{width:52px;height:52px;border-radius:10px;background:#fff;border:2px solid rgba(0,0,0,.15);display:flex;align-items:center;justify-content:center;font-size:28px;box-shadow:2px 2px 6px rgba(0,0,0,.4)}',
      '.sb-die.sb-new{animation:sbRoll .5s ease}',
      '@keyframes sbRoll{0%{transform:rotateY(0) scale(.8)}50%{transform:rotateY(360deg) scale(1.1)}100%{transform:rotateY(720deg) scale(1)}}',
      '#sbTotal{font-size:22px;font-weight:900;color:#e0e7ff;margin-bottom:10px}',
      '.sb-bets{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:12px}',
      '.sb-bet-btn{padding:8px 4px;border-radius:8px;border:2px solid rgba(255,255,255,.1);background:rgba(255,255,255,.05);color:rgba(255,255,255,.55);font-size:11px;font-weight:800;cursor:pointer;transition:all .15s;line-height:1.3}',
      '.sb-bet-btn:hover:not(:disabled){opacity:.9}',
      '.sb-bet-btn.sb-sel{background:rgba(220,38,38,.3);border-color:#f87171;color:#fecaca}',
      '.sb-bet-btn:disabled{opacity:.35;cursor:not-allowed}',
      '.sb-bet-btn.sb-big{background:rgba(59,130,246,.08)}',
      '.sb-bet-btn.sb-small{background:rgba(16,185,129,.08)}',
      '.sb-input-row{display:flex;gap:10px;align-items:center;justify-content:center;margin-bottom:10px}',
      '.sb-input-row label{font-size:10px;color:rgba(255,255,255,.35);text-transform:uppercase;letter-spacing:.5px}',
      '.sb-input{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);border-radius:8px;color:#fff;padding:6px 10px;font-size:14px;font-weight:700;width:90px;text-align:center}',
      '.sb-input:focus{outline:none;border-color:rgba(220,38,38,.6)}',
      '#sbRollBtn{background:linear-gradient(135deg,#7f1d1d,#991b1b);color:#fff;border:1px solid rgba(220,38,38,.4);padding:12px 0;border-radius:12px;font-size:16px;font-weight:900;cursor:pointer;width:100%;margin-bottom:6px;letter-spacing:.5px;transition:transform .1s}',
      '#sbRollBtn:hover:not(:disabled){transform:scale(1.02)}',
      '#sbRollBtn:disabled{opacity:.4;cursor:not-allowed;transform:none}',
      '#sbResult{font-size:14px;font-weight:800;min-height:20px;color:#a5b4fc;margin-bottom:8px}',
      '#sbClose{background:none;border:none;color:rgba(255,255,255,.3);font-size:12px;cursor:pointer;text-decoration:underline}',
    ].join('\n');
    document.head.appendChild(s);
  }

  // ── die face ─────────────────────────────────────────────────────────────────

  var DIE_FACES = ['\u2680', '\u2681', '\u2682', '\u2683', '\u2684', '\u2685'];

  function renderDice(dice, isNew) {
    for (var i = 0; i < 3; i++) {
      var el = document.getElementById('sbDie' + i);
      if (!el) continue;
      el.textContent = dice && dice[i] ? DIE_FACES[dice[i] - 1] : '\u2688';
      el.className = 'sb-die' + (isNew ? ' sb-new' : '');
    }
  }

  // ── bet selection ─────────────────────────────────────────────────────────────

  var BET_DEFS = [
    { type: 'big',      val: null, label: '\u2b06 BIG (11-17)', sub: '1:1 | 48.6%',  cls: 'sb-big' },
    { type: 'small',    val: null, label: '\u2b07 SMALL (4-10)', sub: '1:1 | 48.6%', cls: 'sb-small' },
    { type: 'anytriple',val: null, label: '\u2234 Any Triple',   sub: '30:1 | 2.78%', cls: '' },
    { type: 'total',    val: 7,    label: '\u2007 Total = 7',    sub: '12:1 | 6.94%', cls: '' },
    { type: 'total',    val: 10,   label: '\u2007 Total = 10',   sub: '6:1 | 12.5%',  cls: '' },
    { type: 'total',    val: 4,    label: '\u2007 Total = 4',    sub: '60:1 | 1.39%', cls: '' },
    { type: 'triple',   val: 6,    label: '\u2685\u2685\u2685 Triple 6', sub: '180:1 | 0.46%', cls: '' },
    { type: 'double',   val: 6,    label: '\u2685\u2685 Double 6',       sub: '10:1 | 7.41%',  cls: '' },
  ];

  function selectBet(type, val) {
    if (_rolling) return;
    _betType  = type;
    _betValue = val;
    for (var i = 0; i < BET_DEFS.length; i++) {
      var btn = document.getElementById('sbBet_' + i);
      if (!btn) continue;
      var match = BET_DEFS[i].type === type && BET_DEFS[i].val === val;
      btn.classList.toggle('sb-sel', match);
    }
  }

  function setResult(text, color) {
    var el = document.getElementById('sbResult');
    if (!el) return;
    el.textContent = text;
    el.style.color = color || '#a5b4fc';
  }

  // ── roll ──────────────────────────────────────────────────────────────────────

  function doRoll() {
    if (_rolling) return;
    var token = getToken();
    if (!token) { setResult('Please log in to play.', '#f87171'); return; }

    var betInput = document.getElementById('sbBetInput');
    var betVal   = betInput ? parseFloat(betInput.value) : 5.00;
    if (isNaN(betVal) || betVal < 0.25) betVal = 0.25;

    _rolling = true;
    var rollBtn = document.getElementById('sbRollBtn');
    if (rollBtn) { rollBtn.disabled = true; rollBtn.textContent = 'Rolling\u2026'; }
    setResult('', '');

    // Animate dice immediately
    renderDice(null, false);

    var body = { bet: betVal, betType: _betType };
    if (_betValue !== null) body.betValue = _betValue;

    fetch('/api/sicbo/play', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    .then(function(r) { return r.ok ? r.json() : r.json().then(function(e) { throw e; }); })
    .then(function(data) {
      _rolling = false;
      if (rollBtn) { rollBtn.disabled = false; rollBtn.textContent = '\uD83C\uDFB2 Roll!'; }

      renderDice(data.dice, true);

      var totalEl = document.getElementById('sbTotal');
      if (totalEl) {
        totalEl.textContent = 'Total: ' + data.total + (data.triple ? ' \u2234 TRIPLE!' : '');
        totalEl.style.color = data.triple ? '#fbbf24' : '#e0e7ff';
      }

      if (typeof window.updateBalance === 'function' && data.newBalance != null) {
        window.updateBalance(data.newBalance);
      }

      var msg, color;
      if (data.win) {
        msg   = '\uD83C\uDF89 WIN! ' + data.multiplier + ':1 — +$' + data.profit.toFixed(2);
        color = '#4ade80';
      } else {
        msg   = '\uD83D\uDCA5 No win — dice: ' + data.dice.join(', ');
        color = '#f87171';
      }
      setResult(msg, color);
    })
    .catch(function(err) {
      _rolling = false;
      if (rollBtn) { rollBtn.disabled = false; rollBtn.textContent = '\uD83C\uDFB2 Roll!'; }
      setResult((err && err.error) || 'Error \u2014 check balance.', '#f87171');
    });
  }

  // ── modal build ───────────────────────────────────────────────────────────────

  function buildModal() {
    if (_overlay) return;
    _overlay = document.createElement('div');
    _overlay.id = 'sbOverlay';

    var modal = document.createElement('div');
    modal.id = 'sbModal';

    var icon = document.createElement('div');
    icon.style.cssText = 'font-size:28px;margin-bottom:2px';
    icon.textContent = '\u2680\u2683\u2685';
    modal.appendChild(icon);

    var h2 = document.createElement('h2');
    h2.textContent = 'SIC BO';
    modal.appendChild(h2);

    var sub = document.createElement('div');
    sub.className = 'sb-sub';
    sub.textContent = '3 dice — bet on Big/Small, totals, triples & more!';
    modal.appendChild(sub);

    // Dice display
    var diceRow = document.createElement('div');
    diceRow.className = 'sb-dice-row';
    for (var d = 0; d < 3; d++) {
      var die = document.createElement('div');
      die.id = 'sbDie' + d;
      die.className = 'sb-die';
      die.textContent = '\u2688';
      diceRow.appendChild(die);
    }
    modal.appendChild(diceRow);

    var totalEl = document.createElement('div');
    totalEl.id = 'sbTotal';
    totalEl.textContent = 'Choose a bet below';
    modal.appendChild(totalEl);

    // Bet buttons grid
    var betsGrid = document.createElement('div');
    betsGrid.className = 'sb-bets';
    for (var bi = 0; bi < BET_DEFS.length; bi++) {
      (function(i, def) {
        var btn = document.createElement('button');
        btn.id = 'sbBet_' + i;
        btn.className = 'sb-bet-btn' + (def.cls ? ' ' + def.cls : '') + (i === 0 ? ' sb-sel' : '');
        var l1 = document.createElement('div');
        l1.style.fontWeight = '900';
        l1.textContent = def.label;
        var l2 = document.createElement('div');
        l2.style.cssText = 'font-size:9px;opacity:.6;margin-top:1px';
        l2.textContent = def.sub;
        btn.appendChild(l1);
        btn.appendChild(l2);
        btn.addEventListener('click', function() { selectBet(def.type, def.val); });
        betsGrid.appendChild(btn);
      })(bi, BET_DEFS[bi]);
    }
    modal.appendChild(betsGrid);

    // Bet input
    var inputRow = document.createElement('div');
    inputRow.className = 'sb-input-row';
    var betLabel = document.createElement('label');
    betLabel.textContent = 'Bet ($)';
    betLabel.htmlFor = 'sbBetInput';
    var betInput = document.createElement('input');
    betInput.id = 'sbBetInput';
    betInput.className = 'sb-input';
    betInput.type = 'number';
    betInput.min = '0.25';
    betInput.max = '500';
    betInput.step = '0.25';
    betInput.value = '5.00';
    inputRow.appendChild(betLabel);
    inputRow.appendChild(betInput);
    modal.appendChild(inputRow);

    // Roll button
    var rollBtn = document.createElement('button');
    rollBtn.id = 'sbRollBtn';
    rollBtn.textContent = '\uD83C\uDFB2 Roll!';
    rollBtn.addEventListener('click', doRoll);
    modal.appendChild(rollBtn);

    // Result
    var resultEl = document.createElement('div');
    resultEl.id = 'sbResult';
    resultEl.textContent = 'Select a bet and roll!';
    resultEl.style.color = '#f87171';
    modal.appendChild(resultEl);

    // Close
    var closeBtn = document.createElement('button');
    closeBtn.id = 'sbClose';
    closeBtn.textContent = 'Close';
    closeBtn.addEventListener('click', closeSicBo);
    modal.appendChild(closeBtn);

    _overlay.appendChild(modal);
    _overlay.addEventListener('click', function(e) {
      if (e.target === _overlay) closeSicBo();
    });
    document.body.appendChild(_overlay);
  }

  // ── public API ────────────────────────────────────────────────────────────────

  function openSicBo() {
    injectStyles();
    buildModal();
    _overlay.classList.add('active');
    selectBet('big', null);
    setResult('Select a bet and roll!', '#f87171');
  }

  function closeSicBo() {
    if (_overlay) _overlay.classList.remove('active');
    _rolling = false;
  }

  window.openSicBo  = openSicBo;
  window.closeSicBo = closeSicBo;

}());
