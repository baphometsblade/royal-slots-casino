(function() {
  'use strict';

  var TOKEN_KEY = typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken';

  var _overlay   = null;
  var _stylesInj = false;
  var _busy      = false;
  var _gameId    = null;
  var _bet       = 5.00;
  var _spread    = -1;

  function getToken() {
    try { return localStorage.getItem(TOKEN_KEY); } catch(e) { return null; }
  }

  // ── styles ───────────────────────────────────────────────────────────────────

  function injectStyles() {
    if (_stylesInj) return;
    _stylesInj = true;
    var s = document.createElement('style');
    s.textContent = [
      '#rdOverlay{position:fixed;inset:0;background:rgba(0,0,0,.93);z-index:20000;display:none;align-items:center;justify-content:center;font-family:monospace}',
      '#rdOverlay.active{display:flex}',
      '#rdModal{background:linear-gradient(135deg,#0a0500,#180800);border:2px solid rgba(239,68,68,.3);border-radius:20px;padding:18px 20px;max-width:420px;width:96%;text-align:center;max-height:96vh;overflow-y:auto}',
      '#rdModal h2{color:#f87171;font-size:20px;margin:0 0 2px;letter-spacing:2px}',
      '#rdModal .rd-sub{color:rgba(255,255,255,.35);font-size:11px;margin-bottom:14px}',
      '.rd-table{display:flex;align-items:center;justify-content:center;gap:10px;margin-bottom:12px}',
      '.rd-card{width:64px;height:88px;border-radius:10px;background:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:24px;font-weight:900;box-shadow:0 4px 14px rgba(0,0,0,.5);position:relative;transition:all .2s}',
      '.rd-card.rd-red{color:#dc2626}',
      '.rd-card.rd-black{color:#1e293b}',
      '.rd-card.rd-new{animation:rdFlip .3s ease}',
      '.rd-card.rd-empty{background:rgba(255,255,255,.06);border:2px dashed rgba(255,255,255,.2);color:rgba(255,255,255,.2);font-size:16px}',
      '@keyframes rdFlip{0%{transform:rotateY(90deg) scale(.85)}100%{transform:rotateY(0deg) scale(1)}}',
      '.rd-card-suit{font-size:11px;position:absolute;top:5px;left:7px}',
      '.rd-spread{font-size:13px;font-weight:700;color:rgba(255,255,255,.45);padding:6px 16px;border:1px solid rgba(255,255,255,.1);border-radius:20px;margin-bottom:4px}',
      '.rd-payout{font-size:11px;color:rgba(255,255,255,.3);margin-bottom:12px}',
      '.rd-arrow{font-size:20px;color:rgba(255,255,255,.2)}',
      '.rd-input-row{display:flex;gap:10px;align-items:center;justify-content:center;margin-bottom:10px}',
      '.rd-input-row label{font-size:10px;color:rgba(255,255,255,.35);text-transform:uppercase;letter-spacing:.5px}',
      '.rd-input{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);border-radius:8px;color:#fff;padding:6px 10px;font-size:14px;font-weight:700;width:90px;text-align:center}',
      '.rd-input:focus{outline:none;border-color:rgba(239,68,68,.6)}',
      '#rdDealBtn{background:linear-gradient(135deg,#7f1d1d,#991b1b);color:#fff;border:1px solid rgba(239,68,68,.4);padding:12px 0;border-radius:12px;font-size:16px;font-weight:900;cursor:pointer;width:100%;margin-bottom:8px;letter-spacing:.5px;transition:transform .1s}',
      '#rdDealBtn:hover:not(:disabled){transform:scale(1.02)}',
      '#rdDealBtn:disabled{opacity:.4;cursor:not-allowed;transform:none}',
      '.rd-action-row{display:flex;gap:8px;margin-bottom:8px}',
      '.rd-act-btn{flex:1;padding:11px 4px;border-radius:10px;border:2px solid rgba(255,255,255,.1);font-size:13px;font-weight:900;cursor:pointer;transition:all .15s}',
      '.rd-act-btn:disabled{opacity:.35;cursor:not-allowed}',
      '#rdRaise{background:rgba(239,68,68,.15);border-color:rgba(239,68,68,.4);color:#fca5a5}',
      '#rdRaise:hover:not(:disabled){background:rgba(239,68,68,.25)}',
      '#rdStand{background:rgba(74,222,128,.1);border-color:rgba(74,222,128,.3);color:#86efac}',
      '#rdStand:hover:not(:disabled){background:rgba(74,222,128,.2)}',
      '#rdResult{font-size:14px;font-weight:800;min-height:20px;color:#a5b4fc;margin-bottom:8px}',
      '#rdClose{background:none;border:none;color:rgba(255,255,255,.3);font-size:12px;cursor:pointer;text-decoration:underline}',
    ].join('\n');
    document.head.appendChild(s);
  }

  // ── helpers ───────────────────────────────────────────────────────────────────

  var SUIT_COLORS = { '\u2660': 'rd-black', '\u2663': 'rd-black', '\u2665': 'rd-red', '\u2666': 'rd-red' };

  function renderCard(id, card, isNew) {
    var el = document.getElementById(id);
    if (!el) return;
    if (!card) {
      el.className = 'rd-card rd-empty';
      el.textContent = '?';
      return;
    }
    el.className = 'rd-card ' + (SUIT_COLORS[card.suit] || 'rd-black') + (isNew ? ' rd-new' : '');
    el.textContent = '';
    var sEl = document.createElement('span');
    sEl.className = 'rd-card-suit';
    sEl.textContent = card.suit;
    el.appendChild(sEl);
    el.appendChild(document.createTextNode(card.rank));
  }

  function spreadLabel(spread) {
    if (spread < 0) return 'Pair';
    if (spread === 0) return 'Consecutive \u2014 Push';
    return 'Spread: ' + spread;
  }

  function payoutLabel(spread) {
    if (spread <= 0) return '';
    var map = { 1: '5:1', 2: '4:1', 3: '2:1' };
    return 'Payout: ' + (map[spread] || '1:1') + ' if between';
  }

  function setSpreadInfo(spread) {
    var sl = document.getElementById('rdSpreadLabel');
    var pl = document.getElementById('rdPayoutLabel');
    if (sl) sl.textContent = spreadLabel(spread);
    if (pl) pl.textContent = payoutLabel(spread);
  }

  function setResult(txt, col) {
    var el = document.getElementById('rdResult');
    if (!el) return;
    el.textContent = txt;
    el.style.color = col || '#a5b4fc';
  }

  function setPhase(phase) {
    var dealRow  = document.getElementById('rdDealRow');
    var actRow   = document.getElementById('rdActionRow');
    var dealBtn  = document.getElementById('rdDealBtn');
    if (dealRow) dealRow.style.display  = phase === 'idle' ? '' : 'none';
    if (actRow)  actRow.style.display   = phase === 'acting' ? '' : 'none';
    if (dealBtn) dealBtn.disabled       = phase !== 'idle';
  }

  function setActionButtons(enabled) {
    var raise = document.getElementById('rdRaise');
    var stand = document.getElementById('rdStand');
    if (raise) raise.disabled = !enabled;
    if (stand) stand.disabled = !enabled;
  }

  // ── deal ─────────────────────────────────────────────────────────────────────

  function doDeal() {
    if (_busy) return;
    var token = getToken();
    if (!token) { setResult('Please log in to play.', '#f87171'); return; }
    var betInput = document.getElementById('rdBetInput');
    _bet = betInput ? parseFloat(betInput.value) : 5.00;
    if (isNaN(_bet) || _bet < 0.25) _bet = 0.25;

    _busy = true;
    var dealBtn = document.getElementById('rdDealBtn');
    if (dealBtn) { dealBtn.disabled = true; dealBtn.textContent = 'Dealing\u2026'; }
    setResult('', '');

    fetch('/api/reddog/deal', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ bet: _bet }),
    })
    .then(function(r) { return r.ok ? r.json() : r.json().then(function(e) { throw e; }); })
    .then(function(data) {
      _busy   = false;
      _gameId = data.gameId;
      _spread = data.spread;

      renderCard('rdCard1', data.card1, true);
      renderCard('rdCard3', null, false);
      renderCard('rdCard2', data.card2, true);
      setSpreadInfo(data.spread);

      if (data.spread === 0) {
        // Consecutive — auto-push (stand instantly)
        setResult('\u21C4 Consecutive cards \u2014 Push! Bet returned.', '#fbbf24');
        if (dealBtn) { dealBtn.textContent = '\u25BA Deal Again'; }
        setPhase('idle');
      } else {
        // Playable spread or pair
        setPhase('acting');
        setActionButtons(true);
        if (data.spread < 0) {
          // Pair
          setResult('\u2665 Pair! Raise for 11:1 if three-of-a-kind.', '#fbbf24');
        } else {
          setResult('Raise (2x bet) or Stand?', '#a5b4fc');
        }
      }
    })
    .catch(function(err) {
      _busy = false;
      if (dealBtn) { dealBtn.disabled = false; dealBtn.textContent = '\u25BA Deal'; }
      setResult((err && err.error) || 'Error \u2014 check balance.', '#f87171');
    });
  }

  // ── resolve (raise or stand) ──────────────────────────────────────────────────

  function doResolve(action) {
    if (_busy || !_gameId) return;
    var token = getToken();
    if (!token) return;

    _busy = true;
    setActionButtons(false);

    fetch('/api/reddog/' + action, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameId: _gameId }),
    })
    .then(function(r) { return r.ok ? r.json() : r.json().then(function(e) { throw e; }); })
    .then(function(data) {
      _busy   = false;
      _gameId = null;

      renderCard('rdCard3', data.card3, true);

      if (typeof window.updateBalance === 'function' && data.newBalance != null) {
        window.updateBalance(data.newBalance);
      }

      var msg, col;
      if (data.profit > 0) {
        msg = '\uD83C\uDF89 WIN! +$' + data.profit.toFixed(2);
        col = '#4ade80';
      } else if (data.profit === 0) {
        msg = '\u21C4 Push \u2014 bet returned.';
        col = '#fbbf24';
      } else {
        msg = '\uD83D\uDCA5 Miss \u2014 -$' + Math.abs(data.profit).toFixed(2);
        col = '#f87171';
      }
      setResult(msg, col);
      setPhase('idle');
      var dealBtn = document.getElementById('rdDealBtn');
      if (dealBtn) { dealBtn.textContent = '\u25BA Deal Again'; dealBtn.disabled = false; }
    })
    .catch(function(err) {
      _busy = false;
      setActionButtons(true);
      setResult((err && err.error) || 'Error.', '#f87171');
    });
  }

  // ── modal build ───────────────────────────────────────────────────────────────

  function buildModal() {
    if (_overlay) return;
    _overlay = document.createElement('div');
    _overlay.id = 'rdOverlay';

    var modal = document.createElement('div');
    modal.id = 'rdModal';

    var icon = document.createElement('div');
    icon.style.cssText = 'font-size:28px;margin-bottom:2px';
    icon.textContent = '\uD83D\uDFE5';
    modal.appendChild(icon);

    var h2 = document.createElement('h2');
    h2.textContent = 'RED DOG';
    modal.appendChild(h2);

    var sub = document.createElement('div');
    sub.className = 'rd-sub';
    sub.textContent = 'Will the third card fall between the first two?';
    modal.appendChild(sub);

    // Card table
    var table = document.createElement('div');
    table.className = 'rd-table';

    var c1 = document.createElement('div'); c1.id = 'rdCard1'; c1.className = 'rd-card rd-empty'; c1.textContent = '?';
    var arr = document.createElement('div'); arr.className = 'rd-arrow'; arr.textContent = '\u2193';
    var c3 = document.createElement('div'); c3.id = 'rdCard3'; c3.className = 'rd-card rd-empty'; c3.textContent = '?';
    var arr2 = document.createElement('div'); arr2.className = 'rd-arrow'; arr2.textContent = '\u2191';
    var c2 = document.createElement('div'); c2.id = 'rdCard2'; c2.className = 'rd-card rd-empty'; c2.textContent = '?';
    table.appendChild(c1);
    table.appendChild(arr);
    table.appendChild(c3);
    table.appendChild(arr2);
    table.appendChild(c2);
    modal.appendChild(table);

    // Spread display
    var spreadEl = document.createElement('div');
    spreadEl.id = 'rdSpreadLabel';
    spreadEl.className = 'rd-spread';
    spreadEl.textContent = 'Deal to start';
    modal.appendChild(spreadEl);

    var payoutEl = document.createElement('div');
    payoutEl.id = 'rdPayoutLabel';
    payoutEl.className = 'rd-payout';
    payoutEl.textContent = 'Spread 1=5:1 | 2=4:1 | 3=2:1 | 4+=1:1';
    modal.appendChild(payoutEl);

    // Deal row (bet input + deal button)
    var dealRow = document.createElement('div');
    dealRow.id = 'rdDealRow';

    var inputRow = document.createElement('div');
    inputRow.className = 'rd-input-row';
    var lbl = document.createElement('label');
    lbl.textContent = 'Bet ($)';
    lbl.htmlFor = 'rdBetInput';
    var inp = document.createElement('input');
    inp.id = 'rdBetInput'; inp.className = 'rd-input';
    inp.type = 'number'; inp.min = '0.25'; inp.max = '500'; inp.step = '0.25'; inp.value = '5.00';
    inputRow.appendChild(lbl);
    inputRow.appendChild(inp);
    dealRow.appendChild(inputRow);

    var dealBtn = document.createElement('button');
    dealBtn.id = 'rdDealBtn';
    dealBtn.textContent = '\u25BA Deal';
    dealBtn.addEventListener('click', doDeal);
    dealRow.appendChild(dealBtn);
    modal.appendChild(dealRow);

    // Action row (raise / stand — hidden initially)
    var actRow = document.createElement('div');
    actRow.id = 'rdActionRow';
    actRow.className = 'rd-action-row';
    actRow.style.display = 'none';

    var raiseBtn = document.createElement('button');
    raiseBtn.id = 'rdRaise';
    raiseBtn.className = 'rd-act-btn';
    raiseBtn.textContent = '\u2B06 Raise (2x)';
    raiseBtn.disabled = true;
    raiseBtn.addEventListener('click', function() { doResolve('raise'); });

    var standBtn = document.createElement('button');
    standBtn.id = 'rdStand';
    standBtn.className = 'rd-act-btn';
    standBtn.textContent = '\u2713 Stand';
    standBtn.disabled = true;
    standBtn.addEventListener('click', function() { doResolve('stand'); });

    actRow.appendChild(raiseBtn);
    actRow.appendChild(standBtn);
    modal.appendChild(actRow);

    // Result
    var resultEl = document.createElement('div');
    resultEl.id = 'rdResult';
    resultEl.textContent = 'Set your bet and deal!';
    resultEl.style.color = '#a5b4fc';
    modal.appendChild(resultEl);

    // Close
    var closeBtn = document.createElement('button');
    closeBtn.id = 'rdClose';
    closeBtn.textContent = 'Close';
    closeBtn.addEventListener('click', closeRedDog);
    modal.appendChild(closeBtn);

    _overlay.appendChild(modal);
    _overlay.addEventListener('click', function(e) { if (e.target === _overlay) closeRedDog(); });
    document.body.appendChild(_overlay);
  }

  // ── public API ────────────────────────────────────────────────────────────────

  function openRedDog() {
    injectStyles();
    buildModal();
    _overlay.classList.add('active');
    setResult('Set your bet and deal!', '#a5b4fc');
    setPhase('idle');
  }

  function closeRedDog() {
    if (_overlay) _overlay.classList.remove('active');
    _busy   = false;
    _gameId = null;
  }

  window.openRedDog  = openRedDog;
  window.closeRedDog = closeRedDog;

}());
