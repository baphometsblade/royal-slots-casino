(function () {
  'use strict';

  // ── Blackjack UI ────────────────────────────────────────────────────────────
  // 6-deck shoe, dealer stands on all 17s, Blackjack pays 3:2.
  // Actions: Hit, Stand, Double Down.

  var SUIT_SYMBOLS = { H: '\u2665', D: '\u2666', C: '\u2663', S: '\u2660' };

  // ── state ──────────────────────────────────────────────────────────────────

  var state = {
    open:   false,
    busy:   false,
    active: false,
    bet:    5.0,
  };

  var refs = {};

  // ── helpers ────────────────────────────────────────────────────────────────

  function getToken() {
    try { return localStorage.getItem('casino_token') || localStorage.getItem(typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken') || localStorage.getItem('token') || null; }
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

  function syncBalance(newBal) {
    if (newBal == null) return;
    if (typeof window.updateBalanceDisplay === 'function') window.updateBalanceDisplay(newBal);
    if (typeof window.balance !== 'undefined') window.balance = newBal;
  }

  // ── card rendering ─────────────────────────────────────────────────────────

  function makeCard(cardData, animate) {
    var wrap = el('div', 'bj-card' + (animate ? ' bj-card-in' : ''));

    if (cardData.hidden) {
      wrap.classList.add('bj-card-back');
      var back = el('div', 'bj-card-back-inner', '\uD83C\uDCA0'); // 🂠
      wrap.appendChild(back);
      return wrap;
    }

    var suit   = SUIT_SYMBOLS[cardData.s] || '?';
    var label  = cardData.l || String(cardData.v);
    var isRed  = cardData.s === 'H' || cardData.s === 'D';
    wrap.classList.add(isRed ? 'bj-card-red' : 'bj-card-black');

    var tl = el('div', 'bj-card-corner bj-card-tl');
    tl.appendChild(el('div', 'bj-card-val', label));
    tl.appendChild(el('div', 'bj-card-suit-sm', suit));

    var ctr = el('div', 'bj-card-ctr', suit);

    var br = el('div', 'bj-card-corner bj-card-br');
    br.style.transform = 'rotate(180deg)';
    br.appendChild(el('div', 'bj-card-val', label));
    br.appendChild(el('div', 'bj-card-suit-sm', suit));

    wrap.appendChild(tl);
    wrap.appendChild(ctr);
    wrap.appendChild(br);
    return wrap;
  }

  function renderHand(container, cards, value, label) {
    clearChildren(container);
    var header = el('div', 'bj-hand-header');
    header.appendChild(el('span', 'bj-hand-label', label));
    header.appendChild(el('span', 'bj-hand-value', value > 0 ? String(value) : ''));
    container.appendChild(header);
    var row = el('div', 'bj-card-row');
    for (var i = 0; i < cards.length; i++) {
      row.appendChild(makeCard(cards[i], i === cards.length - 1 && cards.length > 2));
    }
    container.appendChild(row);
  }

  // ── UI state ───────────────────────────────────────────────────────────────

  function setStatus(msg, cls) {
    refs.statusMsg.textContent = msg || '';
    refs.statusMsg.className   = 'bj-status ' + (cls || '');
  }

  function setBet(v) {
    state.bet = Math.max(0.50, Math.min(500, parseFloat(v) || 5.0));
    refs.betLabel.textContent = '$' + state.bet.toFixed(2);
  }

  function showActions(canDouble) {
    refs.actionRow.style.display = 'flex';
    refs.btnDouble.style.display = canDouble ? '' : 'none';
    refs.betSection.style.display = 'none';
    refs.btnDeal.style.display    = 'none';
  }

  function showDeal() {
    refs.actionRow.style.display = 'none';
    refs.betSection.style.display = 'flex';
    refs.btnDeal.style.display    = '';
  }

  function setAllBusy(busy) {
    state.busy = busy;
    refs.btnHit.disabled    = busy;
    refs.btnStand.disabled  = busy;
    refs.btnDouble.disabled = busy;
    refs.btnDeal.disabled   = busy;
  }

  // ── result banner ──────────────────────────────────────────────────────────

  var STATUS_MESSAGES = {
    blackjack:   '\uD83C\uDF89 BLACKJACK! Pays 3:2!',
    player_win:  '\uD83D\uDCB0 You win!',
    dealer_win:  '\u274C Dealer wins.',
    push:        '\uD83D\uDD04 Push — bet returned.',
    player_bust: '\uD83D\uDCA5 Bust! You went over 21.',
    dealer_bust: '\uD83C\uDF89 Dealer busts — you win!',
    forfeited:   'Game forfeited.',
  };

  var STATUS_CLASSES = {
    blackjack:   'bj-ok',
    player_win:  'bj-ok',
    dealer_bust: 'bj-ok',
    push:        '',
    dealer_win:  'bj-err',
    player_bust: 'bj-err',
  };

  function applyResult(data) {
    renderHand(refs.dealerArea, data.dealerHand, data.dealerValue, 'Dealer');
    renderHand(refs.playerArea, data.playerHand, data.playerValue, 'You');

    var msg = STATUS_MESSAGES[data.status] || ('Result: ' + data.status);
    var cls = STATUS_CLASSES[data.status] || '';

    if (data.payout > 0 && data.status !== 'push') {
      msg += ' +$' + (data.payout - data.bet).toFixed(2);
    }
    setStatus(msg, cls);
    addHistory(data.status);
    showDeal();
    syncBalance(data.newBalance);
    state.active = false;
  }

  // ── history ────────────────────────────────────────────────────────────────

  var _history = [];

  function addHistory(status) {
    _history.push(status);
    if (_history.length > 20) _history.shift();
    clearChildren(refs.histRow);
    _history.forEach(function(s) {
      var isWin  = s === 'player_win' || s === 'dealer_bust' || s === 'blackjack';
      var isPush = s === 'push';
      var text   = s === 'blackjack' ? 'BJ' : isWin ? 'W' : isPush ? 'P' : 'L';
      var cls    = isWin ? 'bj-hist-win' : isPush ? 'bj-hist-push' : 'bj-hist-lose';
      refs.histRow.appendChild(el('span', 'bj-hist-pill ' + cls, text));
    });
  }

  // ── API calls ──────────────────────────────────────────────────────────────

  function apiDeal() {
    if (state.busy) return;
    setAllBusy(true);
    setStatus('Dealing\u2026');

    apiFetch('/api/blackjack/start', {
      method: 'POST',
      body: JSON.stringify({ bet: state.bet }),
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      setAllBusy(false);
      if (data.error) { setStatus(data.error, 'bj-err'); showDeal(); return; }

      renderHand(refs.dealerArea, data.dealerHand, data.dealerValue, 'Dealer');
      renderHand(refs.playerArea, data.playerHand, data.playerValue, 'You');

      if (!data.active) {
        applyResult(data);
        return;
      }

      state.active = true;
      setStatus('Your turn — Hit, Stand, or Double?');
      showActions(data.canDouble);
    })
    .catch(function() {
      setAllBusy(false);
      setStatus('Network error', 'bj-err');
      showDeal();
    });
  }

  function apiAction(endpoint) {
    if (state.busy || !state.active) return;
    setAllBusy(true);
    setStatus('Processing\u2026');

    apiFetch('/api/blackjack/' + endpoint, { method: 'POST' })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      setAllBusy(false);
      if (data.error) { setStatus(data.error, 'bj-err'); return; }

      renderHand(refs.dealerArea, data.dealerHand, data.dealerValue, 'Dealer');
      renderHand(refs.playerArea, data.playerHand, data.playerValue, 'You');
      syncBalance(data.newBalance);

      if (!data.active) {
        applyResult(data);
        return;
      }

      setStatus('Your turn — Hit or Stand?');
      showActions(data.canDouble);
    })
    .catch(function() {
      setAllBusy(false);
      setStatus('Network error', 'bj-err');
    });
  }

  // ── build UI ───────────────────────────────────────────────────────────────

  function buildUI() {
    if (document.getElementById('bj-overlay')) return;

    var overlay = el('div', 'bj-overlay');
    overlay.id  = 'bj-overlay';

    var panel = el('div', 'bj-panel');

    // Header
    var header   = el('div', 'bj-header');
    var titleWrap = el('div');
    var title    = el('h2', 'bj-title', '\uD83C\uDCCF Blackjack');
    var sub      = el('span', 'bj-sub', '6-Deck \u2022 Dealer Stands on 17 \u2022 BJ Pays 3:2');
    titleWrap.appendChild(title);
    titleWrap.appendChild(sub);
    var closeBtn = el('button', 'bj-close-btn', '\u00D7');
    closeBtn.setAttribute('aria-label', 'Close Blackjack');
    closeBtn.addEventListener('click', closeBlackjack);
    header.appendChild(titleWrap);
    header.appendChild(closeBtn);

    // Table felt area
    var felt = el('div', 'bj-felt');

    // Dealer hand
    var dealerArea = el('div', 'bj-hand-area');
    renderHand(dealerArea, [], 0, 'Dealer');
    refs.dealerArea = dealerArea;

    var divider = el('div', 'bj-divider');

    // Player hand
    var playerArea = el('div', 'bj-hand-area');
    renderHand(playerArea, [], 0, 'You');
    refs.playerArea = playerArea;

    felt.appendChild(dealerArea);
    felt.appendChild(divider);
    felt.appendChild(playerArea);

    // Status
    var statusMsg = el('div', 'bj-status', 'Set your bet and deal to start!');
    refs.statusMsg = statusMsg;

    // Action row (hit/stand/double)
    var actionRow = el('div', 'bj-action-row');
    actionRow.style.display = 'none';
    var btnStand  = el('button', 'bj-btn bj-btn-stand', '\u270B Stand');
    var btnHit    = el('button', 'bj-btn bj-btn-hit',   '\u261F Hit');
    var btnDouble = el('button', 'bj-btn bj-btn-double', '\u00D7 2 Double');
    btnStand.addEventListener('click',  function() { apiAction('stand');  });
    btnHit.addEventListener('click',    function() { apiAction('hit');    });
    btnDouble.addEventListener('click', function() { apiAction('double'); });
    refs.btnStand  = btnStand;
    refs.btnHit    = btnHit;
    refs.btnDouble = btnDouble;
    refs.actionRow = actionRow;
    actionRow.appendChild(btnStand);
    actionRow.appendChild(btnHit);
    actionRow.appendChild(btnDouble);

    // Bet section
    var betSection = el('div', 'bj-bet-section');
    betSection.style.display = 'flex';
    var betLabel_ = el('span', 'bj-field-label', 'Bet');
    var betCtrl   = el('div', 'bj-bet-ctrl');
    var btnHalf   = el('button', 'bj-adj-btn', '\u00BD');
    btnHalf.addEventListener('click', function() { setBet(state.bet / 2); });
    var betLabel  = el('span', 'bj-bet-label', '$5.00');
    refs.betLabel = betLabel;
    var btnDbl    = el('button', 'bj-adj-btn', '2\u00D7');
    btnDbl.addEventListener('click', function() { setBet(state.bet * 2); });
    betCtrl.appendChild(btnHalf);
    betCtrl.appendChild(betLabel);
    betCtrl.appendChild(btnDbl);
    betSection.appendChild(betLabel_);
    betSection.appendChild(betCtrl);
    refs.betSection = betSection;

    // Quick chips
    var chips = el('div', 'bj-chips');
    [0.50, 1, 5, 10, 25, 100].forEach(function(v) {
      var c = el('button', 'bj-chip', v < 1 ? ('$' + v.toFixed(2)) : ('$' + v));
      c.addEventListener('click', function() { setBet(v); });
      chips.appendChild(c);
    });

    // Deal button
    var btnDeal = el('button', 'bj-btn bj-btn-deal', '\uD83C\uDCCF DEAL');
    btnDeal.addEventListener('click', apiDeal);
    refs.btnDeal = btnDeal;

    // History
    var histSec = el('div', 'bj-hist-section');
    var histLbl = el('div', 'bj-hist-label', 'Results');
    var histRow = el('div', 'bj-hist-row');
    refs.histRow = histRow;
    histSec.appendChild(histLbl);
    histSec.appendChild(histRow);

    panel.appendChild(header);
    panel.appendChild(felt);
    panel.appendChild(statusMsg);
    panel.appendChild(actionRow);
    panel.appendChild(betSection);
    panel.appendChild(chips);
    panel.appendChild(btnDeal);
    panel.appendChild(histSec);

    overlay.appendChild(panel);
    document.body.appendChild(overlay);
    overlay.addEventListener('click', function(e) { if (e.target === overlay) closeBlackjack(); });

    injectStyles();
  }

  // ── open / close ────────────────────────────────────────────────────────────

  function openBlackjack() {
    if (!getToken()) return;
    buildUI();
    var ov = document.getElementById('bj-overlay');
    if (ov) { ov.style.display = 'flex'; state.open = true; }

    // Restore any active game
    apiFetch('/api/blackjack/state')
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (!data.active) return;
      state.active = true;
      renderHand(refs.dealerArea, data.dealerHand, data.dealerValue, 'Dealer');
      renderHand(refs.playerArea, data.playerHand, data.playerValue, 'You');
      setStatus('Game in progress — Hit or Stand?');
      showActions(data.canDouble);
    })
    .catch(function() {});
  }

  function closeBlackjack() {
    var ov = document.getElementById('bj-overlay');
    if (ov) ov.style.display = 'none';
    state.open = false;
  }

  // ── styles ──────────────────────────────────────────────────────────────────

  function injectStyles() {
    if (document.getElementById('bj-styles')) return;
    var s = document.createElement('style');
    s.id  = 'bj-styles';
    s.textContent = [
      /* overlay */
      '.bj-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.82);z-index:9400;align-items:center;justify-content:center;padding:.75rem;box-sizing:border-box}',
      /* panel */
      '.bj-panel{background:#0f2318;border:2px solid #1a4a2a;border-radius:1rem;padding:1.3rem;width:100%;max-width:500px;max-height:96vh;overflow-y:auto;display:flex;flex-direction:column;gap:.75rem;color:#e2e8f0;font-family:inherit}',
      /* header */
      '.bj-header{display:flex;justify-content:space-between;align-items:flex-start}',
      '.bj-title{margin:0;font-size:1.35rem;color:#f8fafc}',
      '.bj-sub{font-size:.7rem;color:#4ade80;display:block;margin-top:.1rem;opacity:.8}',
      '.bj-close-btn{background:none;border:none;color:#94a3b8;font-size:1.6rem;cursor:pointer;padding:.2rem .5rem}',
      '.bj-close-btn:hover{color:#e2e8f0}',
      /* felt table */
      '.bj-felt{background:linear-gradient(160deg,#14532d,#0f3d1f);border:2px solid #1a5c34;border-radius:.75rem;padding:1rem;display:flex;flex-direction:column;gap:.6rem;min-height:200px}',
      '.bj-divider{border:none;border-top:1px dashed rgba(255,255,255,.15);margin:.2rem 0}',
      '.bj-hand-area{display:flex;flex-direction:column;gap:.4rem}',
      '.bj-hand-header{display:flex;align-items:center;gap:.6rem}',
      '.bj-hand-label{font-size:.75rem;color:#86efac;text-transform:uppercase;letter-spacing:.05em}',
      '.bj-hand-value{font-size:1.1rem;font-weight:700;color:#fbbf24}',
      '.bj-card-row{display:flex;flex-wrap:wrap;gap:.4rem;min-height:72px}',
      /* cards */
      '.bj-card{width:52px;height:72px;border-radius:5px;background:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;position:relative;box-shadow:2px 2px 6px rgba(0,0,0,.5);flex-shrink:0}',
      '.bj-card-in{animation:bjCardIn .28s ease}',
      '@keyframes bjCardIn{0%{transform:translateY(-12px) scale(.85);opacity:0}100%{transform:translateY(0) scale(1);opacity:1}}',
      '.bj-card-back{background:repeating-linear-gradient(45deg,#1d4ed8,#1d4ed8 4px,#1e3a8a 4px,#1e3a8a 8px)}',
      '.bj-card-back-inner{font-size:2rem;color:rgba(255,255,255,.3)}',
      '.bj-card-corner{position:absolute;display:flex;flex-direction:column;align-items:center;gap:.05rem;line-height:1.05}',
      '.bj-card-tl{top:.25rem;left:.3rem}',
      '.bj-card-br{bottom:.25rem;right:.3rem}',
      '.bj-card-val{font-size:.7rem;font-weight:700}',
      '.bj-card-suit-sm{font-size:.55rem}',
      '.bj-card-ctr{font-size:1.4rem;pointer-events:none}',
      '.bj-card-red .bj-card-val,.bj-card-red .bj-card-suit-sm,.bj-card-red .bj-card-ctr{color:#dc2626}',
      '.bj-card-black .bj-card-val,.bj-card-black .bj-card-suit-sm,.bj-card-black .bj-card-ctr{color:#111}',
      /* status */
      '.bj-status{text-align:center;font-size:.9rem;color:#94a3b8;min-height:1.2em;font-weight:500}',
      '.bj-ok{color:#4ade80}',
      '.bj-err{color:#f87171}',
      /* action row */
      '.bj-action-row{display:none;gap:.5rem}',
      /* buttons */
      '.bj-btn{border:none;border-radius:.5rem;padding:.65rem 1rem;font-size:.9rem;font-weight:700;cursor:pointer;flex:1;transition:opacity .15s}',
      '.bj-btn:disabled{opacity:.35;cursor:not-allowed}',
      '.bj-btn:not(:disabled):hover{opacity:.85}',
      '.bj-btn-stand{background:linear-gradient(135deg,#dc2626,#b91c1c);color:#fff}',
      '.bj-btn-hit{background:linear-gradient(135deg,#16a34a,#15803d);color:#fff}',
      '.bj-btn-double{background:linear-gradient(135deg,#d97706,#b45309);color:#fff}',
      '.bj-btn-deal{background:linear-gradient(135deg,#1d4ed8,#1e40af);color:#fff;width:100%;font-size:1rem;padding:.7rem}',
      /* bet section */
      '.bj-bet-section{display:flex;align-items:center;gap:.8rem}',
      '.bj-field-label{font-size:.78rem;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em;flex-shrink:0}',
      '.bj-bet-ctrl{display:flex;align-items:center;gap:.5rem;flex:1}',
      '.bj-adj-btn{background:#334155;border:none;color:#e2e8f0;border-radius:.4rem;padding:.28rem .65rem;cursor:pointer;font-size:.85rem}',
      '.bj-adj-btn:hover{background:#475569}',
      '.bj-bet-label{flex:1;text-align:center;font-weight:700;color:#f8fafc}',
      /* chips */
      '.bj-chips{display:flex;flex-wrap:wrap;gap:.3rem}',
      '.bj-chip{background:#0f172a;border:1px solid #334155;color:#94a3b8;border-radius:.4rem;padding:.25rem .55rem;font-size:.78rem;cursor:pointer}',
      '.bj-chip:hover{border-color:#60a5fa;color:#60a5fa}',
      /* history */
      '.bj-hist-section{display:flex;flex-direction:column;gap:.3rem}',
      '.bj-hist-label{font-size:.72rem;color:#64748b;text-transform:uppercase;letter-spacing:.05em}',
      '.bj-hist-row{display:flex;flex-wrap:wrap;gap:.3rem;min-height:1.3rem}',
      '.bj-hist-pill{width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:.68rem;font-weight:700}',
      '.bj-hist-win{background:#14532d;color:#4ade80}',
      '.bj-hist-lose{background:#450a0a;color:#f87171}',
      '.bj-hist-push{background:#334155;color:#94a3b8}',
    ].join('\n');
    document.head.appendChild(s);
  }

  // ── public API ──────────────────────────────────────────────────────────────

  window.openBlackjack  = openBlackjack;
  window.closeBlackjack = closeBlackjack;

}());
