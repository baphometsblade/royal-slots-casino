(function() {
  'use strict';

  var TOKEN_KEY = typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken';

  var _overlay   = null;
  var _stylesInj = false;
  var _betOn     = 'banker';  // default: banker (lowest house edge)
  var _playing   = false;

  function getToken() {
    try { return localStorage.getItem(TOKEN_KEY); } catch(e) { return null; }
  }

  function injectStyles() {
    if (_stylesInj) return;
    _stylesInj = true;
    var s = document.createElement('style');
    s.textContent = [
      '#baccaratOverlay{position:fixed;inset:0;background:rgba(0,0,0,.92);z-index:10400;display:none;align-items:center;justify-content:center;font-family:monospace}',
      '#baccaratOverlay.active{display:flex}',
      '#baccaratModal{background:linear-gradient(135deg,#020b0a,#05160e);border:2px solid rgba(16,185,129,.3);border-radius:20px;padding:22px 26px;max-width:480px;width:96%;text-align:center;max-height:96vh;overflow-y:auto}',
      '#baccaratModal h2{color:#34d399;font-size:20px;margin:0 0 2px;letter-spacing:2px}',
      '#baccaratModal .bc-sub{color:rgba(255,255,255,.35);font-size:11px;margin-bottom:16px}',
      '.bc-bet-row{display:flex;gap:8px;justify-content:center;margin-bottom:14px}',
      '.bc-bet-btn{flex:1;padding:10px 6px;border-radius:10px;border:2px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06);color:rgba(255,255,255,.6);font-size:12px;font-weight:800;cursor:pointer;transition:all .15s;letter-spacing:.5px}',
      '.bc-bet-btn:hover:not(:disabled){opacity:.9}',
      '.bc-bet-btn.bc-selected-player{background:rgba(59,130,246,.3);border-color:#60a5fa;color:#bfdbfe}',
      '.bc-bet-btn.bc-selected-banker{background:rgba(239,68,68,.3);border-color:#f87171;color:#fecaca}',
      '.bc-bet-btn.bc-selected-tie{background:rgba(16,185,129,.3);border-color:#34d399;color:#a7f3d0}',
      '.bc-bet-btn:disabled{opacity:.4;cursor:not-allowed}',
      '.bc-input-row{display:flex;gap:10px;align-items:center;justify-content:center;margin-bottom:14px}',
      '.bc-input-row label{font-size:10px;color:rgba(255,255,255,.35);text-transform:uppercase;letter-spacing:.5px}',
      '.bc-input{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);border-radius:8px;color:#fff;padding:7px 10px;font-size:14px;font-weight:700;width:90px;text-align:center}',
      '.bc-input:focus{outline:none;border-color:rgba(16,185,129,.6)}',
      '.bc-odds{display:flex;gap:6px;justify-content:center;margin-bottom:14px;font-size:10px;color:rgba(255,255,255,.3)}',
      '.bc-odds span{background:rgba(255,255,255,.05);border-radius:5px;padding:3px 8px}',
      '.bc-table{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px}',
      '.bc-hand{background:rgba(0,0,0,.4);border-radius:10px;padding:10px 8px}',
      '.bc-hand-label{font-size:10px;color:rgba(255,255,255,.4);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px}',
      '.bc-hand-label.bc-winner-lbl{color:#fbbf24;font-weight:800}',
      '.bc-cards{display:flex;gap:4px;justify-content:center;min-height:52px;align-items:center;flex-wrap:wrap}',
      '.bc-card{width:34px;height:48px;border-radius:5px;background:#fff;border:1px solid rgba(0,0,0,.2);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:900;line-height:1;transition:transform .2s;position:relative}',
      '.bc-card.bc-red{color:#dc2626}',
      '.bc-card.bc-black{color:#111}',
      '.bc-card.bc-new{animation:bcFlip .3s ease}',
      '@keyframes bcFlip{0%{transform:rotateY(90deg) scale(.8)}100%{transform:rotateY(0) scale(1)}}',
      '.bc-total{font-size:22px;font-weight:900;color:#e0e7ff;margin-top:6px}',
      '.bc-natural{font-size:10px;color:#fbbf24;font-weight:800;letter-spacing:.5px}',
      '#baccaratResult{font-size:15px;font-weight:800;min-height:22px;color:#a5b4fc;margin-bottom:10px}',
      '#baccaratDealBtn{background:linear-gradient(135deg,#065f46,#064e3b);color:#fff;border:none;padding:13px 0;border-radius:12px;font-size:16px;font-weight:900;cursor:pointer;width:100%;margin-bottom:6px;letter-spacing:.5px;transition:transform .1s;border:1px solid rgba(16,185,129,.4)}',
      '#baccaratDealBtn:hover:not(:disabled){transform:scale(1.02)}',
      '#baccaratDealBtn:disabled{opacity:.4;cursor:not-allowed;transform:none}',
      '#baccaratClose{background:none;border:none;color:rgba(255,255,255,.3);font-size:12px;cursor:pointer;text-decoration:underline}',
    ].join('\n');
    document.head.appendChild(s);
  }

  // ── card rendering ────────────────────────────────────────────────────────

  var SUIT_SYMBOLS = { H: '\u2665', D: '\u2666', C: '\u2663', S: '\u2660' };
  var RED_SUITS    = { H: true, D: true };

  function makeCardEl(card, isNew) {
    var el = document.createElement('div');
    el.className = 'bc-card' + (RED_SUITS[card.s] ? ' bc-red' : ' bc-black') + (isNew ? ' bc-new' : '');
    el.textContent = card.l + SUIT_SYMBOLS[card.s];
    return el;
  }

  function renderHand(containerId, cards, total, isWinner, isNew) {
    var container = document.getElementById(containerId + 'Cards');
    if (!container) return;
    while (container.firstChild) container.removeChild(container.firstChild);
    for (var i = 0; i < cards.length; i++) {
      container.appendChild(makeCardEl(cards[i], isNew));
    }
    var totalEl = document.getElementById(containerId + 'Total');
    if (totalEl) totalEl.textContent = String(total);
    var lblEl = document.getElementById(containerId + 'Label');
    if (lblEl) {
      if (isWinner) {
        lblEl.classList.add('bc-winner-lbl');
      } else {
        lblEl.classList.remove('bc-winner-lbl');
      }
    }
    // natural badge
    var natEl = document.getElementById(containerId + 'Natural');
    if (natEl) natEl.textContent = (total === 8 || total === 9) ? 'NATURAL' : '';
  }

  // ── bet selection ─────────────────────────────────────────────────────────

  function selectBet(which) {
    if (_playing) return;
    _betOn = which;
    var btns = ['player', 'banker', 'tie'];
    for (var i = 0; i < btns.length; i++) {
      var btn = document.getElementById('bcBtn_' + btns[i]);
      if (!btn) continue;
      btn.classList.remove('bc-selected-player', 'bc-selected-banker', 'bc-selected-tie');
      if (btns[i] === which) btn.classList.add('bc-selected-' + which);
    }
  }

  function setResult(text, color) {
    var el = document.getElementById('baccaratResult');
    if (!el) return;
    el.textContent = text;
    el.style.color = color || '#a5b4fc';
  }

  // ── deal ──────────────────────────────────────────────────────────────────

  function doDeal() {
    if (_playing) return;
    var token = getToken();
    if (!token) { setResult('Please log in to play.', '#f87171'); return; }
    var betInput = document.getElementById('baccaratBetInput');
    var betVal   = betInput ? parseFloat(betInput.value) : 5.00;
    if (isNaN(betVal) || betVal < 0.50) betVal = 0.50;

    _playing = true;
    var dealBtn = document.getElementById('baccaratDealBtn');
    if (dealBtn) { dealBtn.disabled = true; dealBtn.textContent = 'Dealing\u2026'; }
    setResult('', '');

    // Clear old hands
    renderHand('bcPlayer', [], '', false, false);
    renderHand('bcBanker', [], '', false, false);

    fetch('/api/baccarat/play', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ bet: betVal, betOn: _betOn }),
    })
    .then(function(r) { return r.ok ? r.json() : r.json().then(function(e) { throw e; }); })
    .then(function(data) {
      _playing = false;
      if (dealBtn) { dealBtn.disabled = false; dealBtn.textContent = '\uD83C\uDCCF Deal'; }

      renderHand('bcPlayer', data.playerCards, data.playerTotal, data.winner === 'player', true);
      renderHand('bcBanker', data.bankerCards, data.bankerTotal, data.winner === 'banker', true);

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
        var odds = data.betOn === 'banker' ? '0.95:1' : '1:1';
        msg   = '\uD83C\uDF89 ' + cap(data.winner) + ' wins! +$' + data.profit.toFixed(2) + ' (' + odds + ')';
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

  // ── modal build ───────────────────────────────────────────────────────────

  function buildModal() {
    if (_overlay) return;
    _overlay = document.createElement('div');
    _overlay.id = 'baccaratOverlay';

    var modal = document.createElement('div');
    modal.id = 'baccaratModal';

    var icon = document.createElement('div');
    icon.style.cssText = 'font-size:32px;margin-bottom:2px';
    icon.textContent = '\uD83C\uDCCF';
    modal.appendChild(icon);

    var h2 = document.createElement('h2');
    h2.textContent = 'BACCARAT';
    modal.appendChild(h2);

    var sub = document.createElement('div');
    sub.className = 'bc-sub';
    sub.textContent = 'Bet on Player, Banker, or Tie \u2014 closest to 9 wins!';
    modal.appendChild(sub);

    // Bet selection row
    var betRow = document.createElement('div');
    betRow.className = 'bc-bet-row';
    var bets = [
      { id: 'player', label: '\uD83D\uDC64 Player', odds: '1:1' },
      { id: 'banker', label: '\uD83C\uDFE6 Banker', odds: '0.95:1' },
      { id: 'tie',    label: '\u267E\uFE0F Tie',    odds: '8:1' },
    ];
    for (var bi = 0; bi < bets.length; bi++) {
      (function(b) {
        var btn = document.createElement('button');
        btn.id = 'bcBtn_' + b.id;
        btn.className = 'bc-bet-btn';
        btn.textContent = b.label;
        btn.addEventListener('click', function() { selectBet(b.id); });
        betRow.appendChild(btn);
      })(bets[bi]);
    }
    modal.appendChild(betRow);

    // Odds labels
    var oddsRow = document.createElement('div');
    oddsRow.className = 'bc-odds';
    ['Player 1:1', 'Banker 0.95:1', 'Tie 8:1'].forEach(function(t) {
      var span = document.createElement('span');
      span.textContent = t;
      oddsRow.appendChild(span);
    });
    modal.appendChild(oddsRow);

    // Bet input
    var inputRow = document.createElement('div');
    inputRow.className = 'bc-input-row';
    var betLabel = document.createElement('label');
    betLabel.textContent = 'Bet ($)';
    betLabel.htmlFor = 'baccaratBetInput';
    var betInput = document.createElement('input');
    betInput.id = 'baccaratBetInput';
    betInput.className = 'bc-input';
    betInput.type = 'number';
    betInput.min = '0.50';
    betInput.max = '1000';
    betInput.step = '0.50';
    betInput.value = '5.00';
    inputRow.appendChild(betLabel);
    inputRow.appendChild(betInput);
    modal.appendChild(inputRow);

    // Card table (Player | Banker)
    var table = document.createElement('div');
    table.className = 'bc-table';

    ['Player', 'Banker'].forEach(function(side) {
      var hand = document.createElement('div');
      hand.className = 'bc-hand';

      var lbl = document.createElement('div');
      lbl.id = 'bc' + side + 'Label';
      lbl.className = 'bc-hand-label';
      lbl.textContent = side.toUpperCase();
      hand.appendChild(lbl);

      var cards = document.createElement('div');
      cards.id = 'bc' + side + 'Cards';
      cards.className = 'bc-cards';
      hand.appendChild(cards);

      var total = document.createElement('div');
      total.id = 'bc' + side + 'Total';
      total.className = 'bc-total';
      hand.appendChild(total);

      var nat = document.createElement('div');
      nat.id = 'bc' + side + 'Natural';
      nat.className = 'bc-natural';
      hand.appendChild(nat);

      table.appendChild(hand);
    });
    modal.appendChild(table);

    // Result
    var resultEl = document.createElement('div');
    resultEl.id = 'baccaratResult';
    resultEl.textContent = 'Select a bet and press Deal!';
    resultEl.style.color = '#a5b4fc';
    modal.appendChild(resultEl);

    // Deal button
    var dealBtn = document.createElement('button');
    dealBtn.id = 'baccaratDealBtn';
    dealBtn.textContent = '\uD83C\uDCCF Deal';
    dealBtn.addEventListener('click', doDeal);
    modal.appendChild(dealBtn);

    // Close
    var closeBtn = document.createElement('button');
    closeBtn.id = 'baccaratClose';
    closeBtn.textContent = 'Close';
    closeBtn.addEventListener('click', closeBaccarat);
    modal.appendChild(closeBtn);

    _overlay.appendChild(modal);
    _overlay.addEventListener('click', function(e) {
      if (e.target === _overlay) closeBaccarat();
    });
    document.body.appendChild(_overlay);
  }

  // ── public API ────────────────────────────────────────────────────────────

  function openBaccarat() {
    injectStyles();
    buildModal();
    _overlay.classList.add('active');
    selectBet('banker');
    setResult('Select a bet and press Deal!', '#a5b4fc');
  }

  function closeBaccarat() {
    if (_overlay) _overlay.classList.remove('active');
    _playing = false;
  }

  window.openBaccarat  = openBaccarat;
  window.closeBaccarat = closeBaccarat;

}());
