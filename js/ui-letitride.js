(function() {
  'use strict';

  var TOKEN_KEY = typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken';

  var _overlay   = null;
  var _stylesInj = false;
  var _playing   = false;
  var _gameId    = null;
  var _bet       = 0;
  var _phase     = 'idle'; // idle | phase1 | phase2 | done

  function getToken() {
    try { return localStorage.getItem(TOKEN_KEY); } catch(e) { return null; }
  }

  function injectStyles() {
    if (_stylesInj) return;
    _stylesInj = true;
    var s = document.createElement('style');
    s.textContent = [
      '#lirOverlay{position:fixed;inset:0;background:rgba(0,0,0,.93);z-index:20000;display:none;align-items:center;justify-content:center;font-family:monospace}',
      '#lirOverlay.active{display:flex}',
      '#lirModal{background:linear-gradient(135deg,#0a0505,#1a0a0a);border:2px solid rgba(251,191,36,.3);border-radius:20px;padding:18px 20px;max-width:480px;width:96%;text-align:center;max-height:96vh;overflow-y:auto}',
      '#lirModal h2{color:#fde68a;font-size:20px;margin:0 0 2px;letter-spacing:2px}',
      '#lirModal .lir-sub{color:rgba(255,255,255,.35);font-size:11px;margin-bottom:12px}',
      '.lir-board{display:flex;gap:10px;justify-content:center;align-items:flex-end;margin-bottom:12px;flex-wrap:wrap}',
      '.lir-col{display:flex;flex-direction:column;align-items:center;gap:4px}',
      '.lir-col-label{font-size:9px;color:rgba(255,255,255,.35);text-transform:uppercase;letter-spacing:.4px}',
      '.lir-cards{display:flex;gap:4px;justify-content:center}',
      '.lir-card{width:40px;height:58px;border-radius:6px;background:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;font-weight:900;font-size:13px;border:2px solid rgba(255,255,255,.1);box-shadow:0 2px 8px rgba(0,0,0,.5);position:relative;transition:transform .2s}',
      '.lir-card.red{color:#dc2626}',
      '.lir-card.black{color:#1e293b}',
      '.lir-card.back{background:linear-gradient(135deg,#3d1a00,#1a0900);color:rgba(255,255,255,.15);font-size:18px}',
      '.lir-card.empty{background:rgba(255,255,255,.05);border:2px dashed rgba(255,255,255,.1);color:rgba(255,255,255,.15)}',
      '.lir-card.flip-in{animation:lirFlip .35s ease}',
      '@keyframes lirFlip{0%{transform:rotateY(90deg) scale(.8)}100%{transform:rotateY(0) scale(1)}}',
      '.lir-bet-chip{width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:900;border:3px solid;transition:all .3s}',
      '.lir-bet-chip.active{background:rgba(251,191,36,.2);border-color:#fbbf24;color:#fde68a}',
      '.lir-bet-chip.pulled{background:rgba(255,255,255,.05);border-color:rgba(255,255,255,.15);color:rgba(255,255,255,.3);text-decoration:line-through}',
      '.lir-divider{width:100%;height:1px;background:rgba(255,255,255,.08);margin:6px 0}',
      '.lir-input-row{display:flex;gap:10px;align-items:center;justify-content:center;margin-bottom:10px}',
      '.lir-input-row label{font-size:10px;color:rgba(255,255,255,.35);text-transform:uppercase;letter-spacing:.5px}',
      '.lir-input{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);border-radius:8px;color:#fff;padding:6px 10px;font-size:14px;font-weight:700;width:90px;text-align:center}',
      '.lir-input:focus{outline:none;border-color:rgba(251,191,36,.6)}',
      '.lir-btn-row{display:flex;gap:8px;margin-bottom:8px}',
      '.lir-btn{flex:1;padding:11px 0;border-radius:12px;border:none;font-size:13px;font-weight:900;cursor:pointer;transition:transform .1s,opacity .1s;letter-spacing:.3px}',
      '.lir-btn:hover:not(:disabled){transform:scale(1.02)}',
      '.lir-btn:disabled{opacity:.35;cursor:not-allowed;transform:none}',
      '#lirDealBtn{background:linear-gradient(135deg,#78350f,#d97706);color:#fff;border:1px solid rgba(251,191,36,.4)}',
      '#lirRideBtn{background:linear-gradient(135deg,#14532d,#16a34a);color:#fff;border:1px solid rgba(74,222,128,.4)}',
      '#lirPullBtn{background:linear-gradient(135deg,#7f1d1d,#dc2626);color:#fff;border:1px solid rgba(248,113,113,.4)}',
      '#lirResult{font-size:14px;font-weight:800;min-height:20px;color:#fde68a;margin-bottom:8px}',
      '.lir-hand-name{font-size:12px;font-weight:700;color:#fbbf24;margin:4px 0;min-height:16px}',
      '.lir-paytable{font-size:9px;color:rgba(255,255,255,.22);text-align:left;margin-bottom:8px;line-height:1.7}',
      '.lir-paytable b{color:rgba(255,255,255,.5)}',
      '#lirClose{background:none;border:none;color:rgba(255,255,255,.3);font-size:12px;cursor:pointer;text-decoration:underline}',
    ].join('\n');
    document.head.appendChild(s);
  }

  // ── helpers ──────────────────────────────────────────────────────────────────

  var RED_SUITS = ['\u2665', '\u2666'];

  function cardEl(card, faceDown, empty) {
    var el = document.createElement('div');
    if (empty) {
      el.className = 'lir-card empty';
      el.textContent = '?';
      return el;
    }
    var col = RED_SUITS.indexOf(card.suit) >= 0 ? 'red' : 'black';
    el.className = 'lir-card ' + (faceDown ? 'back' : 'flip-in ' + col);
    if (faceDown) {
      el.textContent = '\u2605';
    } else {
      var top = document.createElement('div');
      top.style.cssText = 'position:absolute;top:2px;left:3px;font-size:9px;line-height:1';
      top.textContent = card.rank + card.suit;
      var mid = document.createElement('div');
      mid.style.cssText = 'font-size:16px;line-height:1';
      mid.textContent = card.suit;
      el.appendChild(top);
      el.appendChild(mid);
    }
    return el;
  }

  function placeCard(containerId, card, faceDown) {
    var el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = '';
    el.appendChild(cardEl(card, faceDown, !card || card.rank === '?'));
  }

  function updateChip(n, active) {
    var el = document.getElementById('lirChip' + n);
    if (!el) return;
    el.className = 'lir-bet-chip ' + (active ? 'active' : 'pulled');
    el.textContent = active ? ('$' + _bet.toFixed(2)) : 'BACK';
  }

  function setResult(txt, col) {
    var el = document.getElementById('lirResult');
    if (!el) return;
    el.textContent = txt;
    el.style.color = col || '#fde68a';
  }

  function setHandName(name) {
    var el = document.getElementById('lirHandName');
    if (el) el.textContent = name || '';
  }

  function showPhase(phase) {
    _phase = phase;
    var dealSection   = document.getElementById('lirDealSection');
    var decideSection = document.getElementById('lirDecideSection');
    if (phase === 'idle' || phase === 'done') {
      if (dealSection)   dealSection.style.display   = 'block';
      if (decideSection) decideSection.style.display = 'none';
    } else {
      if (dealSection)   dealSection.style.display   = 'none';
      if (decideSection) decideSection.style.display = 'block';
    }
    var rideBtn = document.getElementById('lirRideBtn');
    var pullBtn = document.getElementById('lirPullBtn');
    if (phase === 'phase1') {
      if (rideBtn) rideBtn.textContent = '\u2665 Let It Ride (keep Bet 1)';
      if (pullBtn) pullBtn.textContent = '\u2190 Pull Back Bet 1';
    } else if (phase === 'phase2') {
      if (rideBtn) rideBtn.textContent = '\u2665 Let It Ride (keep Bet 2)';
      if (pullBtn) pullBtn.textContent = '\u2190 Pull Back Bet 2';
    }
  }

  function setBtns(enabled) {
    ['lirDealBtn','lirRideBtn','lirPullBtn'].forEach(function(id) {
      var b = document.getElementById(id);
      if (b) b.disabled = !enabled;
    });
  }

  // ── deal ─────────────────────────────────────────────────────────────────────

  function doDeal() {
    if (_playing) return;
    var token = getToken();
    if (!token) { setResult('Please log in to play.', '#f87171'); return; }
    var inp = document.getElementById('lirBetInput');
    var bet = inp ? parseFloat(inp.value) : 1.00;
    if (isNaN(bet) || bet < 0.50) bet = 0.50;

    _playing = true;
    setBtns(false);
    setResult('Dealing\u2026', '#fde68a');
    setHandName('');

    fetch('/api/letitride/deal', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ bet: bet }),
    })
    .then(function(r) { return r.ok ? r.json() : r.json().then(function(e) { throw e; }); })
    .then(function(data) {
      _gameId = data.gameId;
      _bet    = bet;

      // Render player cards
      placeCard('lirP1', data.playerCards[0], false);
      placeCard('lirP2', data.playerCards[1], false);
      placeCard('lirP3', data.playerCards[2], false);
      // Community cards still hidden
      placeCard('lirC1', { rank:'?', suit:'' }, true);
      placeCard('lirC2', { rank:'?', suit:'' }, true);

      // Reset chips
      updateChip(1, true);
      updateChip(2, true);
      updateChip(3, true);

      _playing = false;
      showPhase('phase1');
      setBtns(true);
      setResult('Pull back Bet 1 or Let It Ride?', '#fbbf24');
    })
    .catch(function(err) {
      _playing = false;
      setBtns(true);
      setResult((err && err.error) || 'Error \u2014 check balance.', '#f87171');
    });
  }

  // ── decide ────────────────────────────────────────────────────────────────────

  function doDecide(pullBack) {
    if (_playing || !_gameId) return;
    var token = getToken();
    if (!token) return;

    var endpoint = _phase === 'phase1' ? 'decide1' : 'decide2';
    _playing = true;
    setBtns(false);

    fetch('/api/letitride/' + endpoint, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameId: _gameId, pullBack: pullBack }),
    })
    .then(function(r) { return r.ok ? r.json() : r.json().then(function(e) { throw e; }); })
    .then(function(data) {
      if (typeof window.updateBalance === 'function' && data.newBalance != null) {
        window.updateBalance(data.newBalance);
      }

      if (_phase === 'phase1') {
        // Reveal community card 1
        updateChip(1, !pullBack);
        placeCard('lirC1', data.community1, false);
        _playing = false;
        showPhase('phase2');
        setBtns(true);
        setResult('Pull back Bet 2 or Let It Ride?', '#fbbf24');
      } else {
        // Final — reveal community card 2 and resolve
        updateChip(2, !pullBack);
        placeCard('lirC2', data.community2, false);

        setHandName(data.hand ? data.hand.name : '');

        _gameId  = null;
        _playing = false;
        showPhase('done');
        showPhase('idle');  // show deal section again

        var dealBtn = document.getElementById('lirDealBtn');
        if (dealBtn) dealBtn.disabled = false;

        var msg, col;
        if (data.profit > 0) {
          msg = '\uD83C\uDF89 ' + (data.hand ? data.hand.name : '') + ' \u2014 +$' + data.profit.toFixed(2);
          col = data.profit >= 20 ? '#fbbf24' : '#4ade80';
        } else if (data.profit === 0) {
          msg = '\uD83E\uDD1D Push \u2014 $0';
          col = '#a5b4fc';
        } else {
          msg = '\uD83D\uDCA5 ' + (data.hand ? data.hand.name : '') + ' \u2014 -$' + Math.abs(data.profit).toFixed(2);
          col = '#f87171';
        }
        setResult(msg, col);
      }
    })
    .catch(function(err) {
      _playing = false;
      setBtns(true);
      setResult((err && err.error) || 'Error.', '#f87171');
    });
  }

  // ── modal build ───────────────────────────────────────────────────────────────

  function buildModal() {
    if (_overlay) return;
    _overlay = document.createElement('div');
    _overlay.id = 'lirOverlay';

    var modal = document.createElement('div');
    modal.id = 'lirModal';

    var icon = document.createElement('div');
    icon.style.cssText = 'font-size:28px;margin-bottom:2px';
    icon.textContent = '\u2665';
    modal.appendChild(icon);

    var h2 = document.createElement('h2');
    h2.textContent = 'LET IT RIDE';
    modal.appendChild(h2);

    var sub = document.createElement('div');
    sub.className = 'lir-sub';
    sub.textContent = '3 bets, 2 decisions \u2014 pull back or press your luck!';
    modal.appendChild(sub);

    // ── Board ──
    var board = document.createElement('div');
    board.className = 'lir-board';

    // Player cards column
    var pCol = document.createElement('div');
    pCol.className = 'lir-col';
    var pLbl = document.createElement('div');
    pLbl.className = 'lir-col-label';
    pLbl.textContent = 'Your Cards';
    pCol.appendChild(pLbl);
    var pCards = document.createElement('div');
    pCards.className = 'lir-cards';
    ['lirP1','lirP2','lirP3'].forEach(function(id) {
      var slot = document.createElement('div');
      slot.id = id;
      slot.className = 'lir-card empty';
      slot.textContent = '?';
      pCards.appendChild(slot);
    });
    pCol.appendChild(pCards);
    board.appendChild(pCol);

    // Community cards column
    var cCol = document.createElement('div');
    cCol.className = 'lir-col';
    var cLbl = document.createElement('div');
    cLbl.className = 'lir-col-label';
    cLbl.textContent = 'Community';
    cCol.appendChild(cLbl);
    var cCards = document.createElement('div');
    cCards.className = 'lir-cards';
    ['lirC1','lirC2'].forEach(function(id) {
      var slot = document.createElement('div');
      slot.id = id;
      slot.className = 'lir-card empty';
      slot.textContent = '?';
      cCards.appendChild(slot);
    });
    cCol.appendChild(cCards);
    board.appendChild(cCol);

    // Bet chips column
    var bCol = document.createElement('div');
    bCol.className = 'lir-col';
    var bLbl = document.createElement('div');
    bLbl.className = 'lir-col-label';
    bLbl.textContent = 'Bets';
    bCol.appendChild(bLbl);
    var bChips = document.createElement('div');
    bChips.style.cssText = 'display:flex;gap:5px';
    [1,2,3].forEach(function(n) {
      var chip = document.createElement('div');
      chip.id = 'lirChip' + n;
      chip.className = 'lir-bet-chip active';
      chip.textContent = '$-';
      bChips.appendChild(chip);
    });
    bCol.appendChild(bChips);
    board.appendChild(bCol);

    modal.appendChild(board);

    // Hand name display
    var handName = document.createElement('div');
    handName.className = 'lir-hand-name';
    handName.id = 'lirHandName';
    modal.appendChild(handName);

    var divider = document.createElement('div');
    divider.className = 'lir-divider';
    modal.appendChild(divider);

    // ── Deal section ──
    var dealSection = document.createElement('div');
    dealSection.id = 'lirDealSection';
    dealSection.style.display = 'block';

    var betRow = document.createElement('div');
    betRow.className = 'lir-input-row';
    var lbl = document.createElement('label');
    lbl.textContent = 'Bet per spot ($)';
    lbl.htmlFor = 'lirBetInput';
    var inp = document.createElement('input');
    inp.id = 'lirBetInput'; inp.className = 'lir-input';
    inp.type = 'number'; inp.min = '0.50'; inp.max = '100'; inp.step = '0.50'; inp.value = '1.00';
    betRow.appendChild(lbl);
    betRow.appendChild(inp);
    dealSection.appendChild(betRow);

    var dealBtnRow = document.createElement('div');
    dealBtnRow.className = 'lir-btn-row';
    var dealBtn = document.createElement('button');
    dealBtn.id = 'lirDealBtn';
    dealBtn.className = 'lir-btn';
    dealBtn.textContent = '\uD83C\uDCCF Deal (3x Bet)';
    dealBtn.addEventListener('click', doDeal);
    dealBtnRow.appendChild(dealBtn);
    dealSection.appendChild(dealBtnRow);
    modal.appendChild(dealSection);

    // ── Decide section ──
    var decideSection = document.createElement('div');
    decideSection.id = 'lirDecideSection';
    decideSection.style.display = 'none';

    var decideRow = document.createElement('div');
    decideRow.className = 'lir-btn-row';
    var rideBtn = document.createElement('button');
    rideBtn.id = 'lirRideBtn';
    rideBtn.className = 'lir-btn';
    rideBtn.textContent = '\u2665 Let It Ride';
    rideBtn.addEventListener('click', function() { doDecide(false); });
    var pullBtn = document.createElement('button');
    pullBtn.id = 'lirPullBtn';
    pullBtn.className = 'lir-btn';
    pullBtn.textContent = '\u2190 Pull Back';
    pullBtn.addEventListener('click', function() { doDecide(true); });
    decideRow.appendChild(rideBtn);
    decideRow.appendChild(pullBtn);
    decideSection.appendChild(decideRow);
    modal.appendChild(decideSection);

    // Result
    var resultEl = document.createElement('div');
    resultEl.id = 'lirResult';
    resultEl.textContent = 'Set bet and deal!';
    resultEl.style.color = '#fde68a';
    modal.appendChild(resultEl);

    // Paytable
    var pt = document.createElement('div');
    pt.className = 'lir-paytable';
    pt.innerHTML = '<b>Pays per active bet:</b> Pair 10s+ 1:1 \u00b7 Two Pair 2:1 \u00b7 Trips 3:1 \u00b7 Straight 5:1 \u00b7 Flush 8:1 \u00b7 Full House 11:1 \u00b7 Quads 50:1 \u00b7 Str.Flush 200:1 \u00b7 Royal 1000:1';
    modal.appendChild(pt);

    var closeBtn = document.createElement('button');
    closeBtn.id = 'lirClose';
    closeBtn.textContent = 'Close';
    closeBtn.addEventListener('click', closeLetItRide);
    modal.appendChild(closeBtn);

    _overlay.appendChild(modal);
    _overlay.addEventListener('click', function(e) { if (e.target === _overlay) closeLetItRide(); });
    document.body.appendChild(_overlay);
  }

  // ── public API ────────────────────────────────────────────────────────────────

  function openLetItRide() {
    injectStyles();
    buildModal();
    _overlay.classList.add('active');
    setResult('Set bet and deal!', '#fde68a');
    showPhase('idle');
  }

  function closeLetItRide() {
    if (_overlay) _overlay.classList.remove('active');
    _playing = false;
    _gameId  = null;
  }

  window.openLetItRide  = openLetItRide;
  window.closeLetItRide = closeLetItRide;

}());
