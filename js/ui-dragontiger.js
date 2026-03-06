(function() {
  'use strict';

  var TOKEN_KEY = typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken';

  var _overlay   = null;
  var _stylesInj = false;
  var _betOn     = 'dragon';
  var _playing   = false;

  function getToken() {
    try { return localStorage.getItem(TOKEN_KEY); } catch(e) { return null; }
  }

  function injectStyles() {
    if (_stylesInj) return;
    _stylesInj = true;
    var s = document.createElement('style');
    s.textContent = [
      '#dtOverlay{position:fixed;inset:0;background:rgba(0,0,0,.93);z-index:20000;display:none;align-items:center;justify-content:center;font-family:monospace}',
      '#dtOverlay.active{display:flex}',
      '#dtModal{background:linear-gradient(135deg,#0a0500,#140800);border:2px solid rgba(251,146,60,.3);border-radius:20px;padding:22px 26px;max-width:440px;width:96%;text-align:center;max-height:96vh;overflow-y:auto}',
      '#dtModal h2{color:#fb923c;font-size:20px;margin:0 0 2px;letter-spacing:2px}',
      '#dtModal .dt-sub{color:rgba(255,255,255,.35);font-size:11px;margin-bottom:16px}',
      '.dt-bet-row{display:flex;gap:8px;justify-content:center;margin-bottom:14px}',
      '.dt-bet-btn{flex:1;padding:10px 6px;border-radius:10px;border:2px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06);color:rgba(255,255,255,.6);font-size:13px;font-weight:800;cursor:pointer;transition:all .15s;letter-spacing:.5px}',
      '.dt-bet-btn:hover:not(:disabled){opacity:.9}',
      '.dt-bet-btn.dt-sel-dragon{background:rgba(239,68,68,.3);border-color:#f87171;color:#fecaca}',
      '.dt-bet-btn.dt-sel-tiger{background:rgba(251,146,60,.3);border-color:#fb923c;color:#fed7aa}',
      '.dt-bet-btn.dt-sel-tie{background:rgba(16,185,129,.3);border-color:#34d399;color:#a7f3d0}',
      '.dt-bet-btn:disabled{opacity:.4;cursor:not-allowed}',
      '.dt-input-row{display:flex;gap:10px;align-items:center;justify-content:center;margin-bottom:14px}',
      '.dt-input-row label{font-size:10px;color:rgba(255,255,255,.35);text-transform:uppercase;letter-spacing:.5px}',
      '.dt-input{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);border-radius:8px;color:#fff;padding:7px 10px;font-size:14px;font-weight:700;width:90px;text-align:center}',
      '.dt-input:focus{outline:none;border-color:rgba(251,146,60,.6)}',
      '.dt-odds{display:flex;gap:6px;justify-content:center;margin-bottom:14px;font-size:10px;color:rgba(255,255,255,.3)}',
      '.dt-odds span{background:rgba(255,255,255,.05);border-radius:5px;padding:3px 8px}',
      '.dt-arena{display:grid;grid-template-columns:1fr auto 1fr;gap:12px;align-items:center;margin-bottom:14px}',
      '.dt-side{background:rgba(0,0,0,.4);border-radius:12px;padding:12px 8px}',
      '.dt-side-lbl{font-size:11px;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px}',
      '.dt-side-lbl.dt-dragon-lbl{color:#f87171}',
      '.dt-side-lbl.dt-tiger-lbl{color:#fb923c}',
      '.dt-side-lbl.dt-winner-lbl{font-weight:900;font-size:13px}',
      '.dt-card-wrap{min-height:60px;display:flex;align-items:center;justify-content:center}',
      '.dt-card{width:42px;height:58px;border-radius:6px;background:#fff;border:1px solid rgba(0,0,0,.2);display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:900;line-height:1;transition:transform .2s}',
      '.dt-card.dt-red{color:#dc2626}',
      '.dt-card.dt-black{color:#111}',
      '.dt-card.dt-new{animation:dtFlip .35s ease}',
      '@keyframes dtFlip{0%{transform:rotateY(90deg) scale(.7)}100%{transform:rotateY(0) scale(1)}}',
      '.dt-card-val{font-size:18px;font-weight:900;color:#e0e7ff;margin-top:6px}',
      '.dt-vs{font-size:20px;color:rgba(255,255,255,.25);font-weight:900}',
      '#dtResult{font-size:15px;font-weight:800;min-height:22px;color:#a5b4fc;margin-bottom:10px}',
      '#dtDealBtn{background:linear-gradient(135deg,#7c2d12,#9a3412);color:#fff;border:none;padding:13px 0;border-radius:12px;font-size:16px;font-weight:900;cursor:pointer;width:100%;margin-bottom:6px;letter-spacing:.5px;transition:transform .1s;border:1px solid rgba(251,146,60,.4)}',
      '#dtDealBtn:hover:not(:disabled){transform:scale(1.02)}',
      '#dtDealBtn:disabled{opacity:.4;cursor:not-allowed;transform:none}',
      '#dtClose{background:none;border:none;color:rgba(255,255,255,.3);font-size:12px;cursor:pointer;text-decoration:underline}',
    ].join('\n');
    document.head.appendChild(s);
  }

  // ── card rendering ──────────────────────────────────────────────────────────

  var SUIT_SYMBOLS = { H: '\u2665', D: '\u2666', C: '\u2663', S: '\u2660' };
  var RED_SUITS    = { H: true, D: true };

  function makeCardEl(card, isNew) {
    var el = document.createElement('div');
    el.className = 'dt-card' + (RED_SUITS[card.s] ? ' dt-red' : ' dt-black') + (isNew ? ' dt-new' : '');
    el.textContent = card.r + SUIT_SYMBOLS[card.s];
    return el;
  }

  function renderSide(side, card, isWinner, isNew) {
    // side = 'Dragon' | 'Tiger'
    var wrapId = 'dt' + side + 'Wrap';
    var valId  = 'dt' + side + 'Val';
    var lblId  = 'dt' + side + 'Lbl';

    var wrap = document.getElementById(wrapId);
    if (wrap) {
      while (wrap.firstChild) wrap.removeChild(wrap.firstChild);
      if (card) wrap.appendChild(makeCardEl(card, isNew));
    }
    var valEl = document.getElementById(valId);
    if (valEl) valEl.textContent = card ? String(card.v) : '';
    var lblEl = document.getElementById(lblId);
    if (lblEl) {
      if (isWinner) {
        lblEl.classList.add('dt-winner-lbl');
      } else {
        lblEl.classList.remove('dt-winner-lbl');
      }
    }
  }

  // ── bet selection ───────────────────────────────────────────────────────────

  function selectBet(which) {
    if (_playing) return;
    _betOn = which;
    var btns = ['dragon', 'tiger', 'tie'];
    for (var i = 0; i < btns.length; i++) {
      var btn = document.getElementById('dtBtn_' + btns[i]);
      if (!btn) continue;
      btn.classList.remove('dt-sel-dragon', 'dt-sel-tiger', 'dt-sel-tie');
      if (btns[i] === which) btn.classList.add('dt-sel-' + which);
    }
  }

  function setResult(text, color) {
    var el = document.getElementById('dtResult');
    if (!el) return;
    el.textContent = text;
    el.style.color = color || '#a5b4fc';
  }

  // ── deal ────────────────────────────────────────────────────────────────────

  function doDeal() {
    if (_playing) return;
    var token = getToken();
    if (!token) { setResult('Please log in to play.', '#f87171'); return; }
    var betInput = document.getElementById('dtBetInput');
    var betVal   = betInput ? parseFloat(betInput.value) : 5.00;
    if (isNaN(betVal) || betVal < 0.25) betVal = 0.25;

    _playing = true;
    var dealBtn = document.getElementById('dtDealBtn');
    if (dealBtn) { dealBtn.disabled = true; dealBtn.textContent = 'Dealing\u2026'; }
    setResult('', '');

    renderSide('Dragon', null, false, false);
    renderSide('Tiger',  null, false, false);

    fetch('/api/dragontiger/play', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ bet: betVal, betOn: _betOn }),
    })
    .then(function(r) { return r.ok ? r.json() : r.json().then(function(e) { throw e; }); })
    .then(function(data) {
      _playing = false;
      if (dealBtn) { dealBtn.disabled = false; dealBtn.textContent = '\uD83C\uDCCF Deal'; }

      renderSide('Dragon', data.dragonCard, data.winner === 'dragon', true);
      renderSide('Tiger',  data.tigerCard,  data.winner === 'tiger',  true);

      if (typeof window.updateBalance === 'function' && data.newBalance != null) {
        window.updateBalance(data.newBalance);
      }

      var msg, color;
      if (data.winner === 'tie') {
        if (data.betOn === 'tie') {
          msg   = '\uD83C\uDF89 Tie! You win $' + data.payout.toFixed(2) + ' (8:1)';
          color = '#4ade80';
        } else {
          msg   = '\uD83E\uDD1D Tie \u2014 push! Bet returned';
          color = '#fbbf24';
        }
      } else if (data.winner === data.betOn) {
        msg   = '\uD83C\uDF89 ' + cap(data.winner) + ' wins! +$' + data.profit.toFixed(2);
        color = '#4ade80';
      } else {
        msg   = '\uD83D\uDCA5 ' + cap(data.winner) + ' wins \u2014 you lose';
        color = '#f87171';
      }
      setResult(msg, color);
    })
    .catch(function(err) {
      _playing = false;
      if (dealBtn) { dealBtn.disabled = false; dealBtn.textContent = '\uD83C\uDCCF Deal'; }
      setResult((err && err.error) || 'Error \u2014 check balance.', '#f87171');
    });
  }

  function cap(str) {
    return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
  }

  // ── modal build ─────────────────────────────────────────────────────────────

  function buildModal() {
    if (_overlay) return;
    _overlay = document.createElement('div');
    _overlay.id = 'dtOverlay';

    var modal = document.createElement('div');
    modal.id = 'dtModal';

    // Icon + title
    var icon = document.createElement('div');
    icon.style.cssText = 'font-size:32px;margin-bottom:2px';
    icon.textContent = '\uD83D\uDC09\uD83D\uDC2F';
    modal.appendChild(icon);

    var h2 = document.createElement('h2');
    h2.textContent = 'DRAGON TIGER';
    modal.appendChild(h2);

    var sub = document.createElement('div');
    sub.className = 'dt-sub';
    sub.textContent = 'Higher card wins \u2014 simple, fast, deadly!';
    modal.appendChild(sub);

    // Bet buttons
    var betRow = document.createElement('div');
    betRow.className = 'dt-bet-row';
    var bets = [
      { id: 'dragon', label: '\uD83D\uDC09 Dragon' },
      { id: 'tiger',  label: '\uD83D\uDC2F Tiger'  },
      { id: 'tie',    label: '\u267E\uFE0F Tie'    },
    ];
    for (var bi = 0; bi < bets.length; bi++) {
      (function(b) {
        var btn = document.createElement('button');
        btn.id = 'dtBtn_' + b.id;
        btn.className = 'dt-bet-btn';
        btn.textContent = b.label;
        btn.addEventListener('click', function() { selectBet(b.id); });
        betRow.appendChild(btn);
      })(bets[bi]);
    }
    modal.appendChild(betRow);

    // Odds strip
    var oddsRow = document.createElement('div');
    oddsRow.className = 'dt-odds';
    ['Dragon 1:1', 'Tiger 1:1', 'Tie 8:1 (push on D/T)'].forEach(function(t) {
      var span = document.createElement('span');
      span.textContent = t;
      oddsRow.appendChild(span);
    });
    modal.appendChild(oddsRow);

    // Bet input
    var inputRow = document.createElement('div');
    inputRow.className = 'dt-input-row';
    var betLabel = document.createElement('label');
    betLabel.textContent = 'Bet ($)';
    betLabel.htmlFor = 'dtBetInput';
    var betInput = document.createElement('input');
    betInput.id = 'dtBetInput';
    betInput.className = 'dt-input';
    betInput.type = 'number';
    betInput.min = '0.25';
    betInput.max = '500';
    betInput.step = '0.25';
    betInput.value = '5.00';
    inputRow.appendChild(betLabel);
    inputRow.appendChild(betInput);
    modal.appendChild(inputRow);

    // Arena: Dragon | VS | Tiger
    var arena = document.createElement('div');
    arena.className = 'dt-arena';

    ['Dragon', 'Tiger'].forEach(function(side, idx) {
      var sideEl = document.createElement('div');
      sideEl.className = 'dt-side';

      var lbl = document.createElement('div');
      lbl.id = 'dt' + side + 'Lbl';
      lbl.className = 'dt-side-lbl dt-' + side.toLowerCase() + '-lbl';
      lbl.textContent = side.toUpperCase();
      sideEl.appendChild(lbl);

      var wrap = document.createElement('div');
      wrap.id = 'dt' + side + 'Wrap';
      wrap.className = 'dt-card-wrap';
      sideEl.appendChild(wrap);

      var valEl = document.createElement('div');
      valEl.id = 'dt' + side + 'Val';
      valEl.className = 'dt-card-val';
      sideEl.appendChild(valEl);

      arena.appendChild(sideEl);

      if (idx === 0) {
        var vs = document.createElement('div');
        vs.className = 'dt-vs';
        vs.textContent = 'VS';
        arena.appendChild(vs);
      }
    });
    modal.appendChild(arena);

    // Result
    var resultEl = document.createElement('div');
    resultEl.id = 'dtResult';
    resultEl.textContent = 'Select a bet and press Deal!';
    resultEl.style.color = '#a5b4fc';
    modal.appendChild(resultEl);

    // Deal button
    var dealBtn = document.createElement('button');
    dealBtn.id = 'dtDealBtn';
    dealBtn.textContent = '\uD83C\uDCCF Deal';
    dealBtn.addEventListener('click', doDeal);
    modal.appendChild(dealBtn);

    // Close
    var closeBtn = document.createElement('button');
    closeBtn.id = 'dtClose';
    closeBtn.textContent = 'Close';
    closeBtn.addEventListener('click', closeDragonTiger);
    modal.appendChild(closeBtn);

    _overlay.appendChild(modal);
    _overlay.addEventListener('click', function(e) {
      if (e.target === _overlay) closeDragonTiger();
    });
    document.body.appendChild(_overlay);
  }

  // ── public API ──────────────────────────────────────────────────────────────

  function openDragonTiger() {
    injectStyles();
    buildModal();
    _overlay.classList.add('active');
    selectBet('dragon');
    setResult('Select a bet and press Deal!', '#a5b4fc');
  }

  function closeDragonTiger() {
    if (_overlay) _overlay.classList.remove('active');
    _playing = false;
  }

  window.openDragonTiger  = openDragonTiger;
  window.closeDragonTiger = closeDragonTiger;

}());
