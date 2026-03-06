(function() {
  'use strict';

  var TOKEN_KEY = typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken';

  var _overlay   = null;
  var _stylesInj = false;
  var _playing   = false;
  var _inTie     = false;   // waiting for war/surrender decision
  var _lastBet   = 5.00;

  function getToken() {
    try { return localStorage.getItem(TOKEN_KEY); } catch(e) { return null; }
  }

  function injectStyles() {
    if (_stylesInj) return;
    _stylesInj = true;
    var s = document.createElement('style');
    s.textContent = [
      '#cwOverlay{position:fixed;inset:0;background:rgba(0,0,0,.93);z-index:20000;display:none;align-items:center;justify-content:center;font-family:monospace}',
      '#cwOverlay.active{display:flex}',
      '#cwModal{background:linear-gradient(135deg,#030d1a,#061428);border:2px solid rgba(99,102,241,.3);border-radius:20px;padding:20px 22px;max-width:400px;width:96%;text-align:center;max-height:96vh;overflow-y:auto}',
      '#cwModal h2{color:#818cf8;font-size:20px;margin:0 0 2px;letter-spacing:2px}',
      '#cwModal .cw-sub{color:rgba(255,255,255,.35);font-size:11px;margin-bottom:14px}',
      '.cw-table{display:grid;grid-template-columns:1fr auto 1fr;gap:10px;align-items:center;margin-bottom:12px}',
      '.cw-side{background:rgba(0,0,0,.4);border-radius:12px;padding:12px 8px}',
      '.cw-side-lbl{font-size:10px;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;color:rgba(255,255,255,.4)}',
      '.cw-side-lbl.cw-win-lbl{color:#fbbf24;font-weight:900;font-size:12px}',
      '.cw-card-slot{min-height:64px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px}',
      '.cw-card{width:44px;height:60px;border-radius:6px;background:#fff;border:1px solid rgba(0,0,0,.15);display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:900;line-height:1}',
      '.cw-card.cw-red{color:#dc2626}',
      '.cw-card.cw-black{color:#111}',
      '.cw-card.cw-new{animation:cwFlip .35s ease}',
      '.cw-card.cw-war{animation:cwFlip .35s ease .15s both}',
      '@keyframes cwFlip{0%{transform:rotateY(90deg) scale(.7)}100%{transform:rotateY(0) scale(1)}}',
      '.cw-vs{font-size:18px;color:rgba(255,255,255,.2);font-weight:900}',
      '.cw-war-label{font-size:9px;color:rgba(99,102,241,.6);text-transform:uppercase;letter-spacing:.5px;margin-top:2px}',
      '.cw-tie-actions{display:flex;gap:8px;justify-content:center;margin-bottom:10px}',
      '.cw-tie-btn{flex:1;padding:10px 4px;border-radius:10px;border:2px solid;font-size:13px;font-weight:900;cursor:pointer;transition:all .15s}',
      '#cwWarBtn{background:rgba(239,68,68,.2);border-color:#f87171;color:#fecaca}',
      '#cwWarBtn:hover:not(:disabled){background:rgba(239,68,68,.35)}',
      '#cwSurrBtn{background:rgba(255,255,255,.06);border-color:rgba(255,255,255,.2);color:rgba(255,255,255,.5)}',
      '#cwSurrBtn:hover:not(:disabled){background:rgba(255,255,255,.12)}',
      '.cw-tie-btn:disabled{opacity:.35;cursor:not-allowed}',
      '.cw-input-row{display:flex;gap:10px;align-items:center;justify-content:center;margin-bottom:10px}',
      '.cw-input-row label{font-size:10px;color:rgba(255,255,255,.35);text-transform:uppercase;letter-spacing:.5px}',
      '.cw-input{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);border-radius:8px;color:#fff;padding:7px 10px;font-size:14px;font-weight:700;width:90px;text-align:center}',
      '.cw-input:focus{outline:none;border-color:rgba(99,102,241,.6)}',
      '#cwDealBtn{background:linear-gradient(135deg,#312e81,#3730a3);color:#fff;border:1px solid rgba(99,102,241,.4);padding:12px 0;border-radius:12px;font-size:16px;font-weight:900;cursor:pointer;width:100%;margin-bottom:6px;letter-spacing:.5px;transition:transform .1s}',
      '#cwDealBtn:hover:not(:disabled){transform:scale(1.02)}',
      '#cwDealBtn:disabled{opacity:.4;cursor:not-allowed;transform:none}',
      '#cwResult{font-size:14px;font-weight:800;min-height:20px;color:#a5b4fc;margin-bottom:8px}',
      '#cwClose{background:none;border:none;color:rgba(255,255,255,.3);font-size:12px;cursor:pointer;text-decoration:underline}',
    ].join('\n');
    document.head.appendChild(s);
  }

  // ── card rendering ────────────────────────────────────────────────────────────

  var SUIT_SYMS = { H: '\u2665', D: '\u2666', C: '\u2663', S: '\u2660' };
  var RED_SUITS = { H: true, D: true };

  function makeCard(card, extraClass) {
    var el = document.createElement('div');
    el.className = 'cw-card' + (RED_SUITS[card.s] ? ' cw-red' : ' cw-black') + (extraClass ? ' ' + extraClass : '');
    el.textContent = card.r + SUIT_SYMS[card.s];
    return el;
  }

  function placeCard(slotId, card, extraClass) {
    var slot = document.getElementById(slotId);
    if (!slot) return;
    // Keep existing war-card label if present
    var label = slot.querySelector('.cw-war-label');
    while (slot.firstChild && slot.firstChild !== label) slot.removeChild(slot.firstChild);
    if (label) slot.removeChild(label);
    var cardEl = makeCard(card, extraClass);
    slot.insertBefore(cardEl, slot.firstChild);
    if (label) slot.appendChild(label);
  }

  function clearSlots() {
    ['cwPlayerSlot', 'cwDealerSlot'].forEach(function(id) {
      var slot = document.getElementById(id);
      if (slot) {
        var lbl = slot.querySelector('.cw-war-label');
        while (slot.firstChild) slot.removeChild(slot.firstChild);
        if (lbl) slot.appendChild(lbl);
      }
    });
    ['cwPlayerLbl', 'cwDealerLbl'].forEach(function(id) {
      var el = document.getElementById(id);
      if (el) el.classList.remove('cw-win-lbl');
    });
  }

  function setWinLabel(side) {
    var el = document.getElementById(side === 'player' ? 'cwPlayerLbl' : 'cwDealerLbl');
    if (el) el.classList.add('cw-win-lbl');
  }

  function setResult(text, color) {
    var el = document.getElementById('cwResult');
    if (!el) return;
    el.textContent = text;
    el.style.color = color || '#a5b4fc';
  }

  function showTieActions(show) {
    var row = document.getElementById('cwTieActions');
    if (row) row.style.display = show ? 'flex' : 'none';
    var dealBtn = document.getElementById('cwDealBtn');
    var betInput = document.getElementById('cwBetInput');
    if (dealBtn) dealBtn.disabled = show;
    if (betInput) betInput.disabled = show;
  }

  // ── deal ──────────────────────────────────────────────────────────────────────

  function doDeal() {
    if (_playing || _inTie) return;
    var token = getToken();
    if (!token) { setResult('Please log in to play.', '#f87171'); return; }

    var betInput = document.getElementById('cwBetInput');
    _lastBet = betInput ? parseFloat(betInput.value) : 5.00;
    if (isNaN(_lastBet) || _lastBet < 0.25) _lastBet = 0.25;

    _playing = true;
    var dealBtn = document.getElementById('cwDealBtn');
    if (dealBtn) { dealBtn.disabled = true; dealBtn.textContent = 'Dealing\u2026'; }
    setResult('', '');
    clearSlots();

    fetch('/api/casinowar/play', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ bet: _lastBet }),
    })
    .then(function(r) { return r.ok ? r.json() : r.json().then(function(e) { throw e; }); })
    .then(function(data) {
      _playing = false;
      if (dealBtn) { dealBtn.disabled = false; dealBtn.textContent = '\u2694\uFE0F Deal'; }

      placeCard('cwPlayerSlot', data.playerCard, 'cw-new');
      placeCard('cwDealerSlot', data.dealerCard, 'cw-new');

      if (typeof window.updateBalance === 'function' && data.newBalance != null) {
        window.updateBalance(data.newBalance);
      }

      if (data.result === 'win') {
        setWinLabel('player');
        setResult('\uD83C\uDF89 You win! +$' + data.profit.toFixed(2), '#4ade80');
      } else if (data.result === 'lose') {
        setWinLabel('dealer');
        setResult('\uD83D\uDCA5 Dealer wins — you lose', '#f87171');
      } else {
        // Tie
        _inTie = true;
        showTieActions(true);
        var warBtn = document.getElementById('cwWarBtn');
        if (warBtn) warBtn.textContent = '\u2694\uFE0F Go to War! (+$' + _lastBet.toFixed(2) + ')';
        setResult('\u2694\uFE0F TIE! Surrender (lose \u00BD) or Go to War?', '#fbbf24');
      }
    })
    .catch(function(err) {
      _playing = false;
      if (dealBtn) { dealBtn.disabled = false; dealBtn.textContent = '\u2694\uFE0F Deal'; }
      setResult((err && err.error) || 'Error \u2014 check balance.', '#f87171');
    });
  }

  function doWarChoice(choice) {
    if (_playing || !_inTie) return;
    var token = getToken();
    if (!token) return;

    _playing = true;
    _inTie   = false;
    showTieActions(false);

    fetch('/api/casinowar/war', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ bet: _lastBet, warChoice: choice }),
    })
    .then(function(r) { return r.ok ? r.json() : r.json().then(function(e) { throw e; }); })
    .then(function(data) {
      _playing = false;

      if (typeof window.updateBalance === 'function' && data.newBalance != null) {
        window.updateBalance(data.newBalance);
      }

      if (choice === 'surrender') {
        setResult('\uD83C\uDFF3\uFE0F Surrendered — lost $' + data.surrendered.toFixed(2), '#f87171');
        return;
      }

      // War cards
      if (data.playerWarCard) placeCard('cwPlayerSlot', data.playerWarCard, 'cw-war');
      if (data.dealerWarCard) placeCard('cwDealerSlot', data.dealerWarCard, 'cw-war');

      if (data.result === 'win') {
        setWinLabel('player');
        setResult('\uD83C\uDF89 War won! +$' + data.profit.toFixed(2), '#4ade80');
      } else {
        setWinLabel('dealer');
        setResult('\uD83D\uDCA5 War lost — dealer wins', '#f87171');
      }
    })
    .catch(function(err) {
      _playing = false;
      _inTie   = true;
      showTieActions(true);
      setResult((err && err.error) || 'Error.', '#f87171');
    });
  }

  // ── modal build ───────────────────────────────────────────────────────────────

  function buildModal() {
    if (_overlay) return;
    _overlay = document.createElement('div');
    _overlay.id = 'cwOverlay';

    var modal = document.createElement('div');
    modal.id = 'cwModal';

    var icon = document.createElement('div');
    icon.style.cssText = 'font-size:28px;margin-bottom:2px';
    icon.textContent = '\u2694\uFE0F';
    modal.appendChild(icon);

    var h2 = document.createElement('h2');
    h2.textContent = 'CASINO WAR';
    modal.appendChild(h2);

    var sub = document.createElement('div');
    sub.className = 'cw-sub';
    sub.textContent = 'Higher card wins — tie = War or Surrender!';
    modal.appendChild(sub);

    // Card table
    var table = document.createElement('div');
    table.className = 'cw-table';

    ['Player', 'Dealer'].forEach(function(side, idx) {
      var sideEl = document.createElement('div');
      sideEl.className = 'cw-side';

      var lbl = document.createElement('div');
      lbl.id = 'cw' + side + 'Lbl';
      lbl.className = 'cw-side-lbl';
      lbl.textContent = side.toUpperCase();
      sideEl.appendChild(lbl);

      var slot = document.createElement('div');
      slot.id = 'cw' + side + 'Slot';
      slot.className = 'cw-card-slot';
      // war card label placeholder
      var warLbl = document.createElement('div');
      warLbl.className = 'cw-war-label';
      warLbl.style.display = 'none';
      warLbl.textContent = 'WAR CARD';
      slot.appendChild(warLbl);
      sideEl.appendChild(slot);

      table.appendChild(sideEl);

      if (idx === 0) {
        var vs = document.createElement('div');
        vs.className = 'cw-vs';
        vs.textContent = 'VS';
        table.appendChild(vs);
      }
    });
    modal.appendChild(table);

    // Tie actions (hidden by default)
    var tieRow = document.createElement('div');
    tieRow.id = 'cwTieActions';
    tieRow.className = 'cw-tie-actions';
    tieRow.style.display = 'none';

    var warBtn = document.createElement('button');
    warBtn.id = 'cwWarBtn';
    warBtn.className = 'cw-tie-btn';
    warBtn.textContent = '\u2694\uFE0F Go to War!';
    warBtn.addEventListener('click', function() { doWarChoice('war'); });
    tieRow.appendChild(warBtn);

    var surrBtn = document.createElement('button');
    surrBtn.id = 'cwSurrBtn';
    surrBtn.className = 'cw-tie-btn';
    surrBtn.textContent = '\uD83C\uDFF3\uFE0F Surrender (\u00BD)';
    surrBtn.addEventListener('click', function() { doWarChoice('surrender'); });
    tieRow.appendChild(surrBtn);

    modal.appendChild(tieRow);

    // Bet input
    var inputRow = document.createElement('div');
    inputRow.className = 'cw-input-row';
    var betLabel = document.createElement('label');
    betLabel.textContent = 'Bet ($)';
    betLabel.htmlFor = 'cwBetInput';
    var betInput = document.createElement('input');
    betInput.id = 'cwBetInput';
    betInput.className = 'cw-input';
    betInput.type = 'number';
    betInput.min = '0.25';
    betInput.max = '500';
    betInput.step = '0.25';
    betInput.value = '5.00';
    inputRow.appendChild(betLabel);
    inputRow.appendChild(betInput);
    modal.appendChild(inputRow);

    // Deal button
    var dealBtn = document.createElement('button');
    dealBtn.id = 'cwDealBtn';
    dealBtn.textContent = '\u2694\uFE0F Deal';
    dealBtn.addEventListener('click', doDeal);
    modal.appendChild(dealBtn);

    // Result
    var resultEl = document.createElement('div');
    resultEl.id = 'cwResult';
    resultEl.textContent = 'Place a bet and deal!';
    resultEl.style.color = '#818cf8';
    modal.appendChild(resultEl);

    // Close
    var closeBtn = document.createElement('button');
    closeBtn.id = 'cwClose';
    closeBtn.textContent = 'Close';
    closeBtn.addEventListener('click', closeCasinoWar);
    modal.appendChild(closeBtn);

    _overlay.appendChild(modal);
    _overlay.addEventListener('click', function(e) {
      if (e.target === _overlay) closeCasinoWar();
    });
    document.body.appendChild(_overlay);
  }

  // ── public API ────────────────────────────────────────────────────────────────

  function openCasinoWar() {
    injectStyles();
    buildModal();
    _overlay.classList.add('active');
    _inTie   = false;
    showTieActions(false);
    setResult('Place a bet and deal!', '#818cf8');
  }

  function closeCasinoWar() {
    if (_overlay) _overlay.classList.remove('active');
    _playing = false;
    _inTie   = false;
  }

  window.openCasinoWar  = openCasinoWar;
  window.closeCasinoWar = closeCasinoWar;

}());
