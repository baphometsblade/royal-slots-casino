(function() {
  'use strict';

  var TOKEN_KEY = typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken';

  var _overlay   = null;
  var _stylesInj = false;
  var _playing   = false;
  var _gameId    = null;
  var _ante      = 0;

  function getToken() {
    try { return localStorage.getItem(TOKEN_KEY); } catch(e) { return null; }
  }

  function injectStyles() {
    if (_stylesInj) return;
    _stylesInj = true;
    var s = document.createElement('style');
    s.textContent = [
      '#csOverlay{position:fixed;inset:0;background:rgba(0,0,0,.93);z-index:20000;display:none;align-items:center;justify-content:center;font-family:monospace}',
      '#csOverlay.active{display:flex}',
      '#csModal{background:linear-gradient(135deg,#030a06,#05160a);border:2px solid rgba(52,211,153,.3);border-radius:20px;padding:18px 20px;max-width:480px;width:96%;text-align:center;max-height:96vh;overflow-y:auto}',
      '#csModal h2{color:#6ee7b7;font-size:20px;margin:0 0 2px;letter-spacing:2px}',
      '#csModal .cs-sub{color:rgba(255,255,255,.35);font-size:11px;margin-bottom:12px}',
      '.cs-table{display:flex;gap:6px;justify-content:center;margin-bottom:12px;flex-wrap:wrap}',
      '.cs-hand-label{color:rgba(255,255,255,.4);font-size:10px;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px}',
      '.cs-cards{display:flex;gap:4px;justify-content:center}',
      '.cs-card{width:38px;height:56px;border-radius:6px;background:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;font-weight:900;font-size:13px;border:2px solid rgba(255,255,255,.15);box-shadow:0 2px 8px rgba(0,0,0,.5);transition:transform .3s;position:relative}',
      '.cs-card.red{color:#dc2626}',
      '.cs-card.black{color:#1e293b}',
      '.cs-card.back{background:linear-gradient(135deg,#1e3a2f,#0d2018);color:rgba(255,255,255,.15);font-size:18px}',
      '.cs-card.flip-in{animation:csFlip .35s ease}',
      '@keyframes csFlip{0%{transform:rotateY(90deg) scale(.85)}100%{transform:rotateY(0deg) scale(1)}}',
      '.cs-hand-name{font-size:12px;font-weight:700;color:#6ee7b7;margin-top:4px;min-height:16px}',
      '.cs-dealer-section{margin-bottom:10px}',
      '.cs-divider{width:100%;height:1px;background:rgba(255,255,255,.08);margin:6px 0}',
      '.cs-input-row{display:flex;gap:10px;align-items:center;justify-content:center;margin-bottom:10px}',
      '.cs-input-row label{font-size:10px;color:rgba(255,255,255,.35);text-transform:uppercase;letter-spacing:.5px}',
      '.cs-input{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);border-radius:8px;color:#fff;padding:6px 10px;font-size:14px;font-weight:700;width:90px;text-align:center}',
      '.cs-input:focus{outline:none;border-color:rgba(52,211,153,.6)}',
      '.cs-btn-row{display:flex;gap:8px;margin-bottom:8px}',
      '.cs-btn{flex:1;padding:12px 0;border-radius:12px;border:none;font-size:14px;font-weight:900;cursor:pointer;transition:transform .1s,opacity .1s;letter-spacing:.5px}',
      '.cs-btn:hover:not(:disabled){transform:scale(1.02)}',
      '.cs-btn:disabled{opacity:.35;cursor:not-allowed;transform:none}',
      '#csDealBtn{background:linear-gradient(135deg,#065f46,#059669);color:#fff;border:1px solid rgba(52,211,153,.4)}',
      '#csCallBtn{background:linear-gradient(135deg,#1e40af,#2563eb);color:#fff;border:1px solid rgba(96,165,250,.4)}',
      '#csFoldBtn{background:linear-gradient(135deg,#7f1d1d,#dc2626);color:#fff;border:1px solid rgba(248,113,113,.4)}',
      '#csResult{font-size:14px;font-weight:800;min-height:20px;color:#a7f3d0;margin-bottom:8px}',
      '.cs-paytable{font-size:10px;color:rgba(255,255,255,.25);text-align:left;margin-bottom:8px;line-height:1.6}',
      '.cs-paytable span{color:rgba(255,255,255,.5)}',
      '#csClose{background:none;border:none;color:rgba(255,255,255,.3);font-size:12px;cursor:pointer;text-decoration:underline}',
    ].join('\n');
    document.head.appendChild(s);
  }

  // ── helpers ──────────────────────────────────────────────────────────────────

  var RED_SUITS = ['\u2665', '\u2666'];

  function cardColor(card) {
    return RED_SUITS.indexOf(card.suit) >= 0 ? 'red' : 'black';
  }

  function renderCardEl(card, faceDown) {
    var el = document.createElement('div');
    el.className = 'cs-card' + (faceDown ? ' back' : ' flip-in ' + cardColor(card));
    if (faceDown) {
      el.textContent = '\u2605';
    } else {
      var top = document.createElement('div');
      top.style.cssText = 'position:absolute;top:3px;left:4px;font-size:10px;line-height:1';
      top.textContent = card.rank + card.suit;
      var mid = document.createElement('div');
      mid.style.cssText = 'font-size:16px;line-height:1';
      mid.textContent = card.suit;
      el.appendChild(top);
      el.appendChild(mid);
    }
    return el;
  }

  function renderHand(containerId, cards, faceDownIndices) {
    var el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = '';
    faceDownIndices = faceDownIndices || [];
    cards.forEach(function(card, i) {
      el.appendChild(renderCardEl(card, faceDownIndices.indexOf(i) >= 0));
    });
  }

  function setResult(txt, col) {
    var el = document.getElementById('csResult');
    if (!el) return;
    el.textContent = txt;
    el.style.color = col || '#a7f3d0';
  }

  function setHandName(id, name) {
    var el = document.getElementById(id);
    if (el) el.textContent = name || '';
  }

  function setPhase(phase) {
    var dealRow  = document.getElementById('csDealRow');
    var actionRow = document.getElementById('csActionRow');
    if (phase === 'deal') {
      if (dealRow)  dealRow.style.display  = 'flex';
      if (actionRow) actionRow.style.display = 'none';
    } else {
      if (dealRow)  dealRow.style.display  = 'none';
      if (actionRow) actionRow.style.display = 'flex';
    }
  }

  function setBtns(enabled) {
    ['csDealBtn','csCallBtn','csFoldBtn'].forEach(function(id) {
      var b = document.getElementById(id);
      if (b) b.disabled = !enabled;
    });
  }

  // ── deal ─────────────────────────────────────────────────────────────────────

  function doDeal() {
    if (_playing) return;
    var token = getToken();
    if (!token) { setResult('Please log in to play.', '#f87171'); return; }
    var inp = document.getElementById('csAnteInput');
    var bet = inp ? parseFloat(inp.value) : 1.00;
    if (isNaN(bet) || bet < 0.50) bet = 0.50;

    _playing = true;
    setBtns(false);
    setResult('Dealing\u2026', '#a7f3d0');
    setHandName('csPlayerHandName', '');
    setHandName('csDealerHandName', '');

    fetch('/api/caribbeanstud/deal', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ bet: bet }),
    })
    .then(function(r) { return r.ok ? r.json() : r.json().then(function(e) { throw e; }); })
    .then(function(data) {
      _gameId = data.gameId;
      _ante   = bet;

      // Render player 5 cards face up
      renderHand('csPlayerCards', data.playerCards, []);
      // Render dealer: 1 face up, 4 face down
      var dealerPlaceholders = [
        data.dealerUp,
        { rank: '?', suit: '?', value: 0 },
        { rank: '?', suit: '?', value: 0 },
        { rank: '?', suit: '?', value: 0 },
        { rank: '?', suit: '?', value: 0 },
      ];
      renderHand('csDealerCards', dealerPlaceholders, [1,2,3,4]);

      _playing = false;
      setPhase('action');
      setBtns(true);

      var callAmt = (bet * 2).toFixed(2);
      setResult('Call ($' + callAmt + ') or Fold?', '#fbbf24');
    })
    .catch(function(err) {
      _playing = false;
      setBtns(true);
      setResult((err && err.error) || 'Error \u2014 check balance.', '#f87171');
    });
  }

  // ── fold / call ───────────────────────────────────────────────────────────────

  function doAction(action) {
    if (_playing || !_gameId) return;
    var token = getToken();
    if (!token) return;

    _playing = true;
    setBtns(false);
    setResult(action === 'fold' ? 'Folding\u2026' : 'Calling\u2026', '#a7f3d0');

    fetch('/api/caribbeanstud/' + action, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameId: _gameId }),
    })
    .then(function(r) { return r.ok ? r.json() : r.json().then(function(e) { throw e; }); })
    .then(function(data) {
      if (typeof window.updateBalance === 'function' && data.newBalance != null) {
        window.updateBalance(data.newBalance);
      }

      // Reveal dealer hand if available
      if (data.dealerHand) {
        renderHand('csDealerCards', data.dealerHand.cards, []);
        setHandName('csDealerHandName', data.dealerHand.name);
      } else if (data.dealerCards) {
        renderHand('csDealerCards', data.dealerCards, []);
      }

      if (data.playerHand) {
        setHandName('csPlayerHandName', data.playerHand.name);
      }

      _gameId  = null;
      _playing = false;
      setPhase('deal');

      // Refresh deal button
      var dealBtn = document.getElementById('csDealBtn');
      if (dealBtn) dealBtn.disabled = false;

      var msg, col;
      if (data.result === 'fold') {
        msg = '\uD83C\uDCCF Folded \u2014 -$' + _ante.toFixed(2);
        col = '#f87171';
      } else if (data.result === 'no-qualify') {
        msg = '\uD83D\uDCB0 Dealer doesn\'t qualify \u2014 +$' + data.profit.toFixed(2);
        col = '#4ade80';
      } else if (data.result === 'win') {
        msg = '\uD83C\uDF89 Win! ' + (data.playerHand ? data.playerHand.name : '') + ' \u2014 +$' + data.profit.toFixed(2);
        col = data.profit >= 20 ? '#fbbf24' : '#4ade80';
      } else if (data.result === 'tie') {
        msg = '\uD83E\uDD1D Push \u2014 $0';
        col = '#a5b4fc';
      } else {
        msg = '\uD83D\uDCA5 Dealer wins \u2014 -$' + Math.abs(data.profit).toFixed(2);
        col = '#f87171';
      }
      setResult(msg, col);
    })
    .catch(function(err) {
      _playing = false;
      setPhase('deal');
      var dealBtn = document.getElementById('csDealBtn');
      if (dealBtn) dealBtn.disabled = false;
      setResult((err && err.error) || 'Error.', '#f87171');
    });
  }

  // ── modal build ───────────────────────────────────────────────────────────────

  function emptyHand(n) {
    var arr = [];
    for (var i = 0; i < n; i++) arr.push({ rank: '\u2013', suit: '', value: 0 });
    return arr;
  }

  function buildModal() {
    if (_overlay) return;
    _overlay = document.createElement('div');
    _overlay.id = 'csOverlay';

    var modal = document.createElement('div');
    modal.id = 'csModal';

    // Title
    var icon = document.createElement('div');
    icon.style.cssText = 'font-size:28px;margin-bottom:2px';
    icon.textContent = '\uD83C\uDCCF';
    modal.appendChild(icon);

    var h2 = document.createElement('h2');
    h2.textContent = 'CARIBBEAN STUD';
    modal.appendChild(h2);

    var sub = document.createElement('div');
    sub.className = 'cs-sub';
    sub.textContent = 'Beat the dealer\u2019s 5-card hand \u2014 or fold and cut your losses';
    modal.appendChild(sub);

    // Dealer hand
    var dealerSec = document.createElement('div');
    dealerSec.className = 'cs-dealer-section';
    var dlabel = document.createElement('div');
    dlabel.className = 'cs-hand-label';
    dlabel.textContent = 'Dealer';
    dealerSec.appendChild(dlabel);
    var dcards = document.createElement('div');
    dcards.className = 'cs-cards';
    dcards.id = 'csDealerCards';
    dealerSec.appendChild(dcards);
    var dname = document.createElement('div');
    dname.className = 'cs-hand-name';
    dname.id = 'csDealerHandName';
    dealerSec.appendChild(dname);
    modal.appendChild(dealerSec);

    // Player hand
    var playerSec = document.createElement('div');
    var plabel = document.createElement('div');
    plabel.className = 'cs-hand-label';
    plabel.textContent = 'Your Hand';
    playerSec.appendChild(plabel);
    var pcards = document.createElement('div');
    pcards.className = 'cs-cards';
    pcards.id = 'csPlayerCards';
    playerSec.appendChild(pcards);
    var pname = document.createElement('div');
    pname.className = 'cs-hand-name';
    pname.id = 'csPlayerHandName';
    playerSec.appendChild(pname);
    modal.appendChild(playerSec);

    // Render blank cards initially
    var blankDealer = emptyHand(5);
    var blankPlayer = emptyHand(5);
    // just leave empty
    void blankDealer; void blankPlayer;

    var divider = document.createElement('div');
    divider.className = 'cs-divider';
    modal.appendChild(divider);

    // Bet input row (deal phase)
    var dealRow = document.createElement('div');
    dealRow.id = 'csDealRow';
    dealRow.className = 'cs-input-row';
    dealRow.style.display = 'flex';
    var lbl = document.createElement('label');
    lbl.textContent = 'Ante ($)';
    lbl.htmlFor = 'csAnteInput';
    var inp = document.createElement('input');
    inp.id = 'csAnteInput'; inp.className = 'cs-input';
    inp.type = 'number'; inp.min = '0.50'; inp.max = '250'; inp.step = '0.50'; inp.value = '2.00';
    dealRow.appendChild(lbl);
    dealRow.appendChild(inp);
    modal.appendChild(dealRow);

    // Deal button
    var dealBtnRow = document.createElement('div');
    dealBtnRow.className = 'cs-btn-row';
    dealBtnRow.id = 'csDealRow2';
    var dealBtn = document.createElement('button');
    dealBtn.id = 'csDealBtn';
    dealBtn.className = 'cs-btn';
    dealBtn.textContent = '\uD83C\uDCCF Deal';
    dealBtn.addEventListener('click', doDeal);
    dealBtnRow.appendChild(dealBtn);
    modal.appendChild(dealBtnRow);

    // Action buttons (call phase)
    var actionRow = document.createElement('div');
    actionRow.id = 'csActionRow';
    actionRow.className = 'cs-btn-row';
    actionRow.style.display = 'none';
    var callBtn = document.createElement('button');
    callBtn.id = 'csCallBtn';
    callBtn.className = 'cs-btn';
    callBtn.textContent = '\u2191 Call (2x)';
    callBtn.addEventListener('click', function() { doAction('call'); });
    var foldBtn = document.createElement('button');
    foldBtn.id = 'csFoldBtn';
    foldBtn.className = 'cs-btn';
    foldBtn.textContent = '\u2715 Fold';
    foldBtn.addEventListener('click', function() { doAction('fold'); });
    actionRow.appendChild(callBtn);
    actionRow.appendChild(foldBtn);
    modal.appendChild(actionRow);

    // Result
    var resultEl = document.createElement('div');
    resultEl.id = 'csResult';
    resultEl.textContent = 'Post your ante and deal!';
    resultEl.style.color = '#a7f3d0';
    modal.appendChild(resultEl);

    // Paytable
    var pt = document.createElement('div');
    pt.className = 'cs-paytable';
    pt.innerHTML = 'Raise pays: <span>Royal Flush 100:1</span> \u00b7 <span>Str.Flush 50:1</span> \u00b7 <span>Quads 20:1</span> \u00b7 <span>Full House 7:1</span> \u00b7 <span>Flush 5:1</span> \u00b7 <span>Straight 4:1</span> \u00b7 <span>Trips 3:1</span> \u00b7 <span>Two Pair 2:1</span> \u00b7 <span>Pair+ 1:1</span>';
    modal.appendChild(pt);

    // Close
    var closeBtn = document.createElement('button');
    closeBtn.id = 'csClose';
    closeBtn.textContent = 'Close';
    closeBtn.addEventListener('click', closeCaribbeanStud);
    modal.appendChild(closeBtn);

    _overlay.appendChild(modal);
    _overlay.addEventListener('click', function(e) { if (e.target === _overlay) closeCaribbeanStud(); });
    document.body.appendChild(_overlay);
  }

  // ── public API ────────────────────────────────────────────────────────────────

  function openCaribbeanStud() {
    injectStyles();
    buildModal();
    _overlay.classList.add('active');
    setResult('Post your ante and deal!', '#a7f3d0');
    setPhase('deal');
  }

  function closeCaribbeanStud() {
    if (_overlay) _overlay.classList.remove('active');
    _playing = false;
    _gameId  = null;
  }

  window.openCaribbeanStud  = openCaribbeanStud;
  window.closeCaribbeanStud = closeCaribbeanStud;

}());
