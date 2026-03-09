(function() {
  'use strict';

  var TOKEN_KEY = typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken';

  var _overlay   = null;
  var _stylesInj = false;
  var _playing   = false;
  var _gameId    = null;
  var _ante      = 0;
  var _pp        = 0;

  function getToken() {
    try { return localStorage.getItem(TOKEN_KEY); } catch(e) { return null; }
  }

  function injectStyles() {
    if (_stylesInj) return;
    _stylesInj = true;
    var s = document.createElement('style');
    s.textContent = [
      '#tcpOverlay{position:fixed;inset:0;background:rgba(0,0,0,.93);z-index:10400;display:none;align-items:center;justify-content:center;font-family:monospace}',
      '#tcpOverlay.active{display:flex}',
      '#tcpModal{background:linear-gradient(135deg,#020b14,#041526);border:2px solid rgba(96,165,250,.3);border-radius:20px;padding:18px 20px;max-width:460px;width:96%;text-align:center;max-height:96vh;overflow-y:auto}',
      '#tcpModal h2{color:#93c5fd;font-size:20px;margin:0 0 2px;letter-spacing:2px}',
      '#tcpModal .tcp-sub{color:rgba(255,255,255,.35);font-size:11px;margin-bottom:12px}',
      '.tcp-section{margin-bottom:10px}',
      '.tcp-hand-label{color:rgba(255,255,255,.4);font-size:10px;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px}',
      '.tcp-cards{display:flex;gap:6px;justify-content:center}',
      '.tcp-card{width:44px;height:64px;border-radius:7px;background:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;font-weight:900;font-size:14px;border:2px solid rgba(255,255,255,.1);box-shadow:0 2px 8px rgba(0,0,0,.6);position:relative}',
      '.tcp-card.red{color:#dc2626}',
      '.tcp-card.black{color:#1e293b}',
      '.tcp-card.back{background:linear-gradient(135deg,#1e3a5f,#0d2040);color:rgba(255,255,255,.15);font-size:20px}',
      '.tcp-card.flip-in{animation:tcpFlip .3s ease}',
      '@keyframes tcpFlip{0%{transform:rotateY(90deg) scale(.85)}100%{transform:rotateY(0) scale(1)}}',
      '.tcp-hand-name{font-size:12px;font-weight:700;color:#93c5fd;margin-top:4px;min-height:16px}',
      '.tcp-divider{width:100%;height:1px;background:rgba(255,255,255,.08);margin:6px 0}',
      '.tcp-bets{display:flex;gap:10px;justify-content:center;margin-bottom:10px;flex-wrap:wrap}',
      '.tcp-bet-group{display:flex;flex-direction:column;align-items:center;gap:3px}',
      '.tcp-bet-label{font-size:10px;color:rgba(255,255,255,.35);text-transform:uppercase;letter-spacing:.4px}',
      '.tcp-input{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);border-radius:8px;color:#fff;padding:6px 8px;font-size:14px;font-weight:700;width:80px;text-align:center}',
      '.tcp-input:focus{outline:none;border-color:rgba(96,165,250,.6)}',
      '.tcp-btn-row{display:flex;gap:8px;margin-bottom:8px}',
      '.tcp-btn{flex:1;padding:11px 0;border-radius:12px;border:none;font-size:14px;font-weight:900;cursor:pointer;transition:transform .1s,opacity .1s;letter-spacing:.5px}',
      '.tcp-btn:hover:not(:disabled){transform:scale(1.02)}',
      '.tcp-btn:disabled{opacity:.35;cursor:not-allowed;transform:none}',
      '#tcpDealBtn{background:linear-gradient(135deg,#1e3a8a,#2563eb);color:#fff;border:1px solid rgba(96,165,250,.4)}',
      '#tcpPlayBtn{background:linear-gradient(135deg,#065f46,#059669);color:#fff;border:1px solid rgba(52,211,153,.4)}',
      '#tcpFoldBtn{background:linear-gradient(135deg,#7f1d1d,#dc2626);color:#fff;border:1px solid rgba(248,113,113,.4)}',
      '#tcpResult{font-size:14px;font-weight:800;min-height:20px;color:#bfdbfe;margin-bottom:8px}',
      '.tcp-paytable{font-size:9px;color:rgba(255,255,255,.22);text-align:left;margin-bottom:8px;line-height:1.7}',
      '.tcp-paytable b{color:rgba(255,255,255,.5)}',
      '#tcpClose{background:none;border:none;color:rgba(255,255,255,.3);font-size:12px;cursor:pointer;text-decoration:underline}',
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
    el.className = 'tcp-card' + (faceDown ? ' back' : ' flip-in ' + cardColor(card));
    if (faceDown) {
      el.textContent = '\u2605';
    } else {
      var top = document.createElement('div');
      top.style.cssText = 'position:absolute;top:3px;left:4px;font-size:9px;line-height:1';
      top.textContent = card.rank + card.suit;
      var mid = document.createElement('div');
      mid.style.cssText = 'font-size:18px;line-height:1';
      mid.textContent = card.suit;
      el.appendChild(top);
      el.appendChild(mid);
    }
    return el;
  }

  function renderHand(containerId, cards, faceDownIdx) {
    var el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = '';
    faceDownIdx = faceDownIdx || [];
    cards.forEach(function(card, i) {
      el.appendChild(renderCardEl(card, faceDownIdx.indexOf(i) >= 0));
    });
  }

  function setResult(txt, col) {
    var el = document.getElementById('tcpResult');
    if (!el) return;
    el.textContent = txt;
    el.style.color = col || '#bfdbfe';
  }

  function setHandName(id, name) {
    var el = document.getElementById(id);
    if (el) el.textContent = name || '';
  }

  function setPhase(phase) {
    var betRow    = document.getElementById('tcpBetRow');
    var dealRow   = document.getElementById('tcpDealRow');
    var actionRow = document.getElementById('tcpActionRow');
    if (phase === 'deal') {
      if (betRow)    betRow.style.display    = 'flex';
      if (dealRow)   dealRow.style.display   = 'flex';
      if (actionRow) actionRow.style.display = 'none';
    } else {
      if (betRow)    betRow.style.display    = 'none';
      if (dealRow)   dealRow.style.display   = 'none';
      if (actionRow) actionRow.style.display = 'flex';
    }
  }

  function setBtns(enabled) {
    ['tcpDealBtn','tcpPlayBtn','tcpFoldBtn'].forEach(function(id) {
      var b = document.getElementById(id);
      if (b) b.disabled = !enabled;
    });
  }

  // ── deal ─────────────────────────────────────────────────────────────────────

  function doDeal() {
    if (_playing) return;
    var token = getToken();
    if (!token) { setResult('Please log in to play.', '#f87171'); return; }

    var anteInp = document.getElementById('tcpAnteInput');
    var ppInp   = document.getElementById('tcpPPInput');
    var ante = anteInp ? parseFloat(anteInp.value) : 1.00;
    var pp   = ppInp   ? parseFloat(ppInp.value)   : 0;
    if (isNaN(ante) || ante < 0.50) ante = 0.50;
    if (isNaN(pp) || pp < 0) pp = 0;

    _playing = true;
    setBtns(false);
    setResult('Dealing\u2026', '#bfdbfe');
    setHandName('tcpPlayerHandName', '');
    setHandName('tcpDealerHandName', '');

    fetch('/api/threecardpoker/deal', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ bet: ante, pairPlus: pp }),
    })
    .then(function(r) { return r.ok ? r.json() : r.json().then(function(e) { throw e; }); })
    .then(function(data) {
      _gameId = data.gameId;
      _ante   = ante;
      _pp     = pp;

      renderHand('tcpPlayerCards', data.playerCards, []);
      // Dealer: 1 up, 2 face down
      var dPlaceholders = [
        data.dealerUp,
        { rank: '?', suit: '?', value: 0 },
        { rank: '?', suit: '?', value: 0 },
      ];
      renderHand('tcpDealerCards', dPlaceholders, [1,2]);

      _playing = false;
      setPhase('action');
      setBtns(true);
      setResult('Play (match ante) or Fold?', '#fbbf24');
    })
    .catch(function(err) {
      _playing = false;
      setBtns(true);
      setResult((err && err.error) || 'Error \u2014 check balance.', '#f87171');
    });
  }

  // ── fold / play ───────────────────────────────────────────────────────────────

  function doAction(action) {
    if (_playing || !_gameId) return;
    var token = getToken();
    if (!token) return;

    _playing = true;
    setBtns(false);
    setResult(action === 'fold' ? 'Folding\u2026' : 'Playing\u2026', '#bfdbfe');

    fetch('/api/threecardpoker/' + action, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameId: _gameId }),
    })
    .then(function(r) { return r.ok ? r.json() : r.json().then(function(e) { throw e; }); })
    .then(function(data) {
      if (typeof window.updateBalance === 'function' && data.newBalance != null) {
        window.updateBalance(data.newBalance);
      }

      if (data.dealerHand) {
        renderHand('tcpDealerCards', data.dealerHand.cards, []);
        setHandName('tcpDealerHandName', data.dealerHand.name);
      } else if (data.dealerCards) {
        renderHand('tcpDealerCards', data.dealerCards, []);
      }
      if (data.playerHand) setHandName('tcpPlayerHandName', data.playerHand.name);

      _gameId  = null;
      _playing = false;
      setPhase('deal');
      var dealBtn = document.getElementById('tcpDealBtn');
      if (dealBtn) dealBtn.disabled = false;

      var msg, col;
      if (data.result === 'fold') {
        msg = '\uD83C\uDCCF Folded \u2014 -$' + (_ante + _pp).toFixed(2);
        col = '#f87171';
      } else if (data.result === 'no-qualify') {
        msg = '\uD83D\uDCB0 Dealer doesn\u2019t qualify \u2014 +$' + data.profit.toFixed(2);
        col = '#4ade80';
      } else if (data.result === 'win') {
        msg = '\uD83C\uDF89 Win! ' + (data.playerHand ? data.playerHand.name : '') + ' \u2014 +$' + data.profit.toFixed(2);
        col = data.profit >= 15 ? '#fbbf24' : '#4ade80';
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
      var dealBtn = document.getElementById('tcpDealBtn');
      if (dealBtn) dealBtn.disabled = false;
      setResult((err && err.error) || 'Error.', '#f87171');
    });
  }

  // ── modal build ───────────────────────────────────────────────────────────────

  function buildModal() {
    if (_overlay) return;
    _overlay = document.createElement('div');
    _overlay.id = 'tcpOverlay';

    var modal = document.createElement('div');
    modal.id = 'tcpModal';

    var icon = document.createElement('div');
    icon.style.cssText = 'font-size:28px;margin-bottom:2px';
    icon.textContent = '\uD83C\uDCCF';
    modal.appendChild(icon);

    var h2 = document.createElement('h2');
    h2.textContent = 'THREE CARD POKER';
    modal.appendChild(h2);

    var sub = document.createElement('div');
    sub.className = 'tcp-sub';
    sub.textContent = '3 cards, 2 decisions \u2014 beat the dealer or collect on Pair Plus';
    modal.appendChild(sub);

    // Dealer section
    var dealerSec = document.createElement('div');
    dealerSec.className = 'tcp-section';
    var dlbl = document.createElement('div');
    dlbl.className = 'tcp-hand-label';
    dlbl.textContent = 'Dealer';
    dealerSec.appendChild(dlbl);
    var dcards = document.createElement('div');
    dcards.className = 'tcp-cards';
    dcards.id = 'tcpDealerCards';
    dealerSec.appendChild(dcards);
    var dname = document.createElement('div');
    dname.className = 'tcp-hand-name';
    dname.id = 'tcpDealerHandName';
    dealerSec.appendChild(dname);
    modal.appendChild(dealerSec);

    var div1 = document.createElement('div');
    div1.className = 'tcp-divider';
    modal.appendChild(div1);

    // Player section
    var playerSec = document.createElement('div');
    playerSec.className = 'tcp-section';
    var plbl = document.createElement('div');
    plbl.className = 'tcp-hand-label';
    plbl.textContent = 'Your Hand';
    playerSec.appendChild(plbl);
    var pcards = document.createElement('div');
    pcards.className = 'tcp-cards';
    pcards.id = 'tcpPlayerCards';
    playerSec.appendChild(pcards);
    var pname = document.createElement('div');
    pname.className = 'tcp-hand-name';
    pname.id = 'tcpPlayerHandName';
    playerSec.appendChild(pname);
    modal.appendChild(playerSec);

    var div2 = document.createElement('div');
    div2.className = 'tcp-divider';
    modal.appendChild(div2);

    // Bet inputs
    var betRow = document.createElement('div');
    betRow.id = 'tcpBetRow';
    betRow.className = 'tcp-bets';
    betRow.style.display = 'flex';

    var anteGrp = document.createElement('div');
    anteGrp.className = 'tcp-bet-group';
    var anteLbl = document.createElement('div');
    anteLbl.className = 'tcp-bet-label';
    anteLbl.textContent = 'Ante ($)';
    var anteInp = document.createElement('input');
    anteInp.id = 'tcpAnteInput'; anteInp.className = 'tcp-input';
    anteInp.type = 'number'; anteInp.min = '0.50'; anteInp.max = '250'; anteInp.step = '0.50'; anteInp.value = '2.00';
    anteGrp.appendChild(anteLbl); anteGrp.appendChild(anteInp);

    var ppGrp = document.createElement('div');
    ppGrp.className = 'tcp-bet-group';
    var ppLbl = document.createElement('div');
    ppLbl.className = 'tcp-bet-label';
    ppLbl.textContent = 'Pair Plus ($)';
    var ppInp = document.createElement('input');
    ppInp.id = 'tcpPPInput'; ppInp.className = 'tcp-input';
    ppInp.type = 'number'; ppInp.min = '0'; ppInp.max = '250'; ppInp.step = '0.50'; ppInp.value = '1.00';
    ppGrp.appendChild(ppLbl); ppGrp.appendChild(ppInp);

    betRow.appendChild(anteGrp);
    betRow.appendChild(ppGrp);
    modal.appendChild(betRow);

    // Deal button row
    var dealRow = document.createElement('div');
    dealRow.id = 'tcpDealRow';
    dealRow.className = 'tcp-btn-row';
    dealRow.style.display = 'flex';
    var dealBtn = document.createElement('button');
    dealBtn.id = 'tcpDealBtn';
    dealBtn.className = 'tcp-btn';
    dealBtn.textContent = '\uD83C\uDCCF Deal';
    dealBtn.addEventListener('click', doDeal);
    dealRow.appendChild(dealBtn);
    modal.appendChild(dealRow);

    // Action row
    var actionRow = document.createElement('div');
    actionRow.id = 'tcpActionRow';
    actionRow.className = 'tcp-btn-row';
    actionRow.style.display = 'none';
    var playBtn = document.createElement('button');
    playBtn.id = 'tcpPlayBtn';
    playBtn.className = 'tcp-btn';
    playBtn.textContent = '\u2714 Play (match ante)';
    playBtn.addEventListener('click', function() { doAction('play'); });
    var foldBtn = document.createElement('button');
    foldBtn.id = 'tcpFoldBtn';
    foldBtn.className = 'tcp-btn';
    foldBtn.textContent = '\u2715 Fold';
    foldBtn.addEventListener('click', function() { doAction('fold'); });
    actionRow.appendChild(playBtn);
    actionRow.appendChild(foldBtn);
    modal.appendChild(actionRow);

    // Result
    var resultEl = document.createElement('div');
    resultEl.id = 'tcpResult';
    resultEl.textContent = 'Set your bets and deal!';
    resultEl.style.color = '#bfdbfe';
    modal.appendChild(resultEl);

    // Paytable
    var pt = document.createElement('div');
    pt.className = 'tcp-paytable';
    pt.innerHTML = '<b>Pair Plus:</b> Pair 1:1 \u00b7 Flush 4:1 \u00b7 Straight 6:1 \u00b7 Trips 30:1 \u00b7 Str.Flush 40:1<br><b>Ante Bonus:</b> Straight 1:1 \u00b7 Trips 4:1 \u00b7 Str.Flush 5:1 (paid even if dealer wins)';
    modal.appendChild(pt);

    var closeBtn = document.createElement('button');
    closeBtn.id = 'tcpClose';
    closeBtn.textContent = 'Close';
    closeBtn.addEventListener('click', closeThreeCardPoker);
    modal.appendChild(closeBtn);

    _overlay.appendChild(modal);
    _overlay.addEventListener('click', function(e) { if (e.target === _overlay) closeThreeCardPoker(); });
    document.body.appendChild(_overlay);
  }

  // ── public API ────────────────────────────────────────────────────────────────

  function openThreeCardPoker() {
    injectStyles();
    buildModal();
    _overlay.classList.add('active');
    setResult('Set your bets and deal!', '#bfdbfe');
    setPhase('deal');
  }

  function closeThreeCardPoker() {
    if (_overlay) _overlay.classList.remove('active');
    _playing = false;
    _gameId  = null;
  }

  window.openThreeCardPoker  = openThreeCardPoker;
  window.closeThreeCardPoker = closeThreeCardPoker;

}());
