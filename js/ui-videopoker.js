(function () {
  'use strict';

  // ── Video Poker — Jacks or Better UI ────────────────────────────────────────
  // 9/6 full-pay table (~99.5% RTP).
  // Phase 1: DEAL — 5 cards dealt, player clicks to HOLD.
  // Phase 2: DRAW — non-held cards replaced, hand evaluated.

  var SUIT_SYM = { H: '\u2665', D: '\u2666', C: '\u2663', S: '\u2660' };

  var HAND_NAMES = {
    royal_flush:     'ROYAL FLUSH',
    straight_flush:  'STRAIGHT FLUSH',
    four_of_a_kind:  'FOUR OF A KIND',
    full_house:      'FULL HOUSE',
    flush:           'FLUSH',
    straight:        'STRAIGHT',
    three_of_a_kind: 'THREE OF A KIND',
    two_pair:        'TWO PAIR',
    jacks_or_better: 'JACKS OR BETTER',
    nothing:         '',
  };

  var PAY_DISPLAY = [
    ['Royal Flush',     '800x'],
    ['Straight Flush',  '50x'],
    ['Four of a Kind',  '25x'],
    ['Full House',       '9x'],
    ['Flush',            '6x'],
    ['Straight',         '4x'],
    ['Three of a Kind',  '3x'],
    ['Two Pair',         '2x'],
    ['Jacks or Better',  '1x'],
  ];

  // ── state ──────────────────────────────────────────────────────────────────

  var state = {
    open:    false,
    phase:   'idle',  // idle | dealt | drawn
    busy:    false,
    bet:     1.0,
    hand:    [],      // [{s,v,l}]
    holds:   [false,false,false,false,false],
    result:  null,
    payout:  0,
  };

  var refs = {};

  // ── helpers ────────────────────────────────────────────────────────────────

  function getToken() {
    try { return localStorage.getItem('casino_token') || localStorage.getItem('token') || null; }
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

  function makeCard(cardData, index, isHeld, animate) {
    var suit  = SUIT_SYM[cardData.s] || '?';
    var label = cardData.l || String(cardData.v);
    var isRed = cardData.s === 'H' || cardData.s === 'D';

    var wrap = el('div', 'vp-card-wrap');

    var card = el('div', 'vp-card' +
      (isRed ? ' vp-card-red' : ' vp-card-black') +
      (isHeld ? ' vp-held' : '') +
      (animate ? ' vp-card-in' : ''));

    // HOLD badge
    var holdBadge = el('div', 'vp-hold-badge', 'HOLD');
    holdBadge.style.display = isHeld ? '' : 'none';

    var tl = el('div', 'vp-card-corner vp-card-tl');
    tl.appendChild(el('div', 'vp-card-val', label));
    tl.appendChild(el('div', 'vp-card-suit-sm', suit));

    var ctr = el('div', 'vp-card-ctr', suit);

    var br = el('div', 'vp-card-corner vp-card-br');
    br.style.transform = 'rotate(180deg)';
    br.appendChild(el('div', 'vp-card-val', label));
    br.appendChild(el('div', 'vp-card-suit-sm', suit));

    card.appendChild(holdBadge);
    card.appendChild(tl);
    card.appendChild(ctr);
    card.appendChild(br);

    // Click to toggle hold (only during 'dealt' phase)
    card.addEventListener('click', function() {
      if (state.phase !== 'dealt' || state.busy) return;
      toggleHold(index);
    });

    wrap.appendChild(card);
    return { wrap: wrap, card: card, badge: holdBadge };
  }

  var _cardRefs = []; // [{wrap, card, badge}]

  function renderHand(hand, holds, animateNew) {
    clearChildren(refs.cardRow);
    _cardRefs = [];
    for (var i = 0; i < 5; i++) {
      var c = makeCard(hand[i], i, holds[i], animateNew);
      refs.cardRow.appendChild(c.wrap);
      _cardRefs.push(c);
    }
  }

  function toggleHold(index) {
    state.holds[index] = !state.holds[index];
    if (_cardRefs[index]) {
      _cardRefs[index].card.classList.toggle('vp-held', state.holds[index]);
      _cardRefs[index].badge.style.display = state.holds[index] ? '' : 'none';
    }
  }

  // ── pay table highlight ────────────────────────────────────────────────────

  function highlightPayRow(result) {
    var rows = refs.payTable.querySelectorAll('.vp-pay-row');
    for (var i = 0; i < rows.length; i++) {
      rows[i].classList.remove('vp-pay-active');
    }
    if (result && result !== 'nothing') {
      var target = refs.payTable.querySelector('[data-result="' + result + '"]');
      if (target) target.classList.add('vp-pay-active');
    }
  }

  // ── status / result ────────────────────────────────────────────────────────

  function setStatus(msg, cls) {
    refs.statusMsg.textContent = msg || '';
    refs.statusMsg.className   = 'vp-status ' + (cls || '');
  }

  function setBet(v) {
    state.bet = Math.max(0.25, Math.min(100, parseFloat(v) || 1.0));
    refs.betLabel.textContent = '$' + state.bet.toFixed(2);
  }

  function showDealButton() {
    refs.btnDeal.style.display = '';
    refs.btnDraw.style.display = 'none';
    refs.betSection.style.display = 'flex';
  }

  function showDrawButton() {
    refs.btnDeal.style.display = 'none';
    refs.btnDraw.style.display = '';
    refs.betSection.style.display = 'none';
  }

  // ── API ────────────────────────────────────────────────────────────────────

  function apiDeal() {
    if (state.busy) return;
    state.busy = true;
    refs.btnDeal.disabled = true;
    setStatus('Dealing\u2026');
    highlightPayRow(null);

    apiFetch('/api/videopoker/deal', {
      method: 'POST',
      body: JSON.stringify({ bet: state.bet }),
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      state.busy = false;
      refs.btnDeal.disabled = false;
      if (data.error) { setStatus(data.error, 'vp-err'); showDealButton(); return; }

      state.phase  = 'dealt';
      state.hand   = data.hand;
      state.holds  = [false,false,false,false,false];
      state.result = null;
      state.payout = 0;

      renderHand(data.hand, state.holds, true);
      setStatus('Select cards to HOLD, then click DRAW.');
      showDrawButton();
      syncBalance(data.newBalance);
    })
    .catch(function() {
      state.busy = false;
      refs.btnDeal.disabled = false;
      setStatus('Network error', 'vp-err');
    });
  }

  function apiDraw() {
    if (state.busy || state.phase !== 'dealt') return;
    state.busy = true;
    refs.btnDraw.disabled = true;
    setStatus('Drawing\u2026');

    apiFetch('/api/videopoker/draw', {
      method: 'POST',
      body: JSON.stringify({ holds: state.holds }),
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      state.busy = false;
      refs.btnDraw.disabled = false;
      if (data.error) { setStatus(data.error, 'vp-err'); return; }

      state.phase  = 'drawn';
      state.hand   = data.hand;
      state.result = data.result;
      state.payout = data.payout;

      // Animate only non-held cards
      clearChildren(refs.cardRow);
      _cardRefs = [];
      for (var i = 0; i < 5; i++) {
        var isNew = !data.holds[i];
        var c = makeCard(data.hand[i], i, false, isNew);
        refs.cardRow.appendChild(c.wrap);
        _cardRefs.push(c);
      }

      highlightPayRow(data.result);
      var name = HAND_NAMES[data.result] || '';

      if (data.payout > 0) {
        var msg = (name ? name + ' \u2014 ' : '') + 'WIN $' + data.payout.toFixed(2);
        setStatus(msg, 'vp-ok');
      } else {
        setStatus(name ? name : 'No winner. Deal again?', 'vp-err');
      }

      syncBalance(data.newBalance);
      showDealButton();
    })
    .catch(function() {
      state.busy = false;
      refs.btnDraw.disabled = false;
      setStatus('Network error', 'vp-err');
    });
  }

  // ── build UI ───────────────────────────────────────────────────────────────

  function buildPayTable() {
    var table = el('div', 'vp-pay-table');
    refs.payTable = table;
    PAY_DISPLAY.forEach(function(row) {
      var key = row[0].toLowerCase().replace(/ /g, '_').replace('jacks_or_better', 'jacks_or_better');
      // Map display name → result key
      var resultKey = {
        'royal_flush': 'royal_flush', 'straight_flush': 'straight_flush',
        'four_of_a_kind': 'four_of_a_kind', 'full_house': 'full_house',
        'flush': 'flush', 'straight': 'straight', 'three_of_a_kind': 'three_of_a_kind',
        'two_pair': 'two_pair', 'jacks_or_better': 'jacks_or_better',
      }[key] || key;

      var r = el('div', 'vp-pay-row');
      r.setAttribute('data-result', resultKey);
      r.appendChild(el('span', 'vp-pay-name', row[0]));
      r.appendChild(el('span', 'vp-pay-mult', row[1]));
      table.appendChild(r);
    });
    return table;
  }

  function buildUI() {
    if (document.getElementById('vp-overlay')) return;

    var overlay = el('div', 'vp-overlay');
    overlay.id  = 'vp-overlay';

    var panel = el('div', 'vp-panel');

    // Header
    var header   = el('div', 'vp-header');
    var titleWrap = el('div');
    var title    = el('h2', 'vp-title', '\uD83C\uDCCF Video Poker');
    var sub      = el('span', 'vp-sub', 'Jacks or Better \u2022 9/6 Full Pay');
    titleWrap.appendChild(title);
    titleWrap.appendChild(sub);
    var closeBtn = el('button', 'vp-close-btn', '\u00D7');
    closeBtn.setAttribute('aria-label', 'Close Video Poker');
    closeBtn.addEventListener('click', closeVideoPoker);
    header.appendChild(titleWrap);
    header.appendChild(closeBtn);

    // Pay table
    var payWrap = el('div', 'vp-pay-wrap');
    var payLbl  = el('div', 'vp-pay-label', 'Pay Table');
    payWrap.appendChild(payLbl);
    payWrap.appendChild(buildPayTable());

    // Card area
    var cardRow = el('div', 'vp-card-row');
    refs.cardRow = cardRow;

    // Fill with placeholders
    for (var i = 0; i < 5; i++) {
      var ph = el('div', 'vp-card-wrap');
      var phCard = el('div', 'vp-card vp-card-placeholder', '\uD83C\uDCCF');
      ph.appendChild(phCard);
      cardRow.appendChild(ph);
    }

    // Status
    var statusMsg = el('div', 'vp-status', 'Set your bet and click DEAL!');
    refs.statusMsg = statusMsg;

    // Bet section
    var betSection = el('div', 'vp-bet-section');
    var betLabel_  = el('span', 'vp-field-label', 'Bet');
    var betCtrl    = el('div', 'vp-bet-ctrl');
    var btnHalf    = el('button', 'vp-adj-btn', '\u00BD');
    btnHalf.addEventListener('click', function() { setBet(state.bet / 2); });
    var betLabel   = el('span', 'vp-bet-label', '$1.00');
    refs.betLabel  = betLabel;
    var btnDbl     = el('button', 'vp-adj-btn', '2\u00D7');
    btnDbl.addEventListener('click', function() { setBet(state.bet * 2); });
    betCtrl.appendChild(btnHalf);
    betCtrl.appendChild(betLabel);
    betCtrl.appendChild(btnDbl);
    betSection.appendChild(betLabel_);
    betSection.appendChild(betCtrl);
    refs.betSection = betSection;

    // Quick chips
    var chips = el('div', 'vp-chips');
    [0.25, 0.50, 1, 5, 10, 25].forEach(function(v) {
      var c = el('button', 'vp-chip', v < 1 ? ('$' + v.toFixed(2)) : ('$' + v));
      c.addEventListener('click', function() { setBet(v); });
      chips.appendChild(c);
    });

    // Deal / Draw buttons
    var btnDeal = el('button', 'vp-btn vp-btn-deal', '\uD83C\uDCCF DEAL');
    btnDeal.addEventListener('click', apiDeal);
    refs.btnDeal = btnDeal;

    var btnDraw = el('button', 'vp-btn vp-btn-draw', '\u21BA DRAW');
    btnDraw.style.display = 'none';
    btnDraw.addEventListener('click', apiDraw);
    refs.btnDraw = btnDraw;

    panel.appendChild(header);
    panel.appendChild(payWrap);
    panel.appendChild(cardRow);
    panel.appendChild(statusMsg);
    panel.appendChild(betSection);
    panel.appendChild(chips);
    panel.appendChild(btnDeal);
    panel.appendChild(btnDraw);

    overlay.appendChild(panel);
    document.body.appendChild(overlay);
    overlay.addEventListener('click', function(e) { if (e.target === overlay) closeVideoPoker(); });

    injectStyles();
  }

  // ── open / close ────────────────────────────────────────────────────────────

  function openVideoPoker() {
    if (!getToken()) return;
    buildUI();
    var ov = document.getElementById('vp-overlay');
    if (ov) { ov.style.display = 'flex'; state.open = true; }

    // Restore active game if any
    apiFetch('/api/videopoker/state')
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (!data.active) return;
      state.phase = 'dealt';
      state.hand  = data.hand;
      state.holds = [false,false,false,false,false];
      renderHand(data.hand, state.holds, false);
      setStatus('Select cards to HOLD, then click DRAW.');
      showDrawButton();
    })
    .catch(function() {});
  }

  function closeVideoPoker() {
    var ov = document.getElementById('vp-overlay');
    if (ov) ov.style.display = 'none';
    state.open = false;
  }

  // ── styles ──────────────────────────────────────────────────────────────────

  function injectStyles() {
    if (document.getElementById('vp-styles')) return;
    var s = document.createElement('style');
    s.id  = 'vp-styles';
    s.textContent = [
      '.vp-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.82);z-index:9500;align-items:center;justify-content:center;padding:.75rem;box-sizing:border-box}',
      '.vp-panel{background:#0d1b2a;border:2px solid #1e3a5f;border-radius:1rem;padding:1.2rem;width:100%;max-width:520px;max-height:96vh;overflow-y:auto;display:flex;flex-direction:column;gap:.75rem;color:#e2e8f0;font-family:inherit}',
      /* header */
      '.vp-header{display:flex;justify-content:space-between;align-items:flex-start}',
      '.vp-title{margin:0;font-size:1.3rem;color:#f8fafc}',
      '.vp-sub{font-size:.7rem;color:#60a5fa;display:block;margin-top:.1rem;opacity:.85}',
      '.vp-close-btn{background:none;border:none;color:#94a3b8;font-size:1.6rem;cursor:pointer;padding:.2rem .5rem}',
      '.vp-close-btn:hover{color:#e2e8f0}',
      /* pay table */
      '.vp-pay-wrap{background:#111827;border:1px solid #1f2937;border-radius:.5rem;padding:.5rem .75rem}',
      '.vp-pay-label{font-size:.68rem;color:#4b5563;text-transform:uppercase;letter-spacing:.05em;margin-bottom:.25rem}',
      '.vp-pay-table{display:flex;flex-direction:column;gap:1px}',
      '.vp-pay-row{display:flex;justify-content:space-between;padding:.18rem .25rem;border-radius:.25rem;transition:background .15s}',
      '.vp-pay-name{font-size:.75rem;color:#6b7280}',
      '.vp-pay-mult{font-size:.75rem;color:#374151;font-weight:700}',
      '.vp-pay-active{background:#1e3a5f!important}',
      '.vp-pay-active .vp-pay-name{color:#93c5fd}',
      '.vp-pay-active .vp-pay-mult{color:#fbbf24}',
      /* card row */
      '.vp-card-row{display:flex;gap:.5rem;justify-content:center}',
      '.vp-card-wrap{display:flex;flex-direction:column;align-items:center;gap:.3rem}',
      /* cards */
      '.vp-card{width:64px;height:90px;border-radius:6px;background:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;position:relative;box-shadow:2px 2px 8px rgba(0,0,0,.6);cursor:pointer;transition:transform .12s,box-shadow .12s;flex-shrink:0}',
      '.vp-card:hover{transform:translateY(-3px);box-shadow:2px 5px 14px rgba(0,0,0,.7)}',
      '.vp-card-placeholder{background:#1e293b!important;color:rgba(255,255,255,.15);font-size:2rem;cursor:default}',
      '.vp-card-in{animation:vpCardIn .3s ease}',
      '@keyframes vpCardIn{0%{transform:translateY(-15px) rotateX(30deg);opacity:0}100%{transform:translateY(0) rotateX(0);opacity:1}}',
      '.vp-held{outline:2px solid #fbbf24;transform:translateY(-8px)!important;box-shadow:0 8px 20px rgba(251,191,36,.4)!important}',
      '.vp-hold-badge{position:absolute;bottom:-20px;left:50%;transform:translateX(-50%);background:#fbbf24;color:#000;border-radius:3px;font-size:.6rem;font-weight:900;padding:.1rem .4rem;white-space:nowrap}',
      '.vp-card-corner{position:absolute;display:flex;flex-direction:column;align-items:center;gap:.05rem}',
      '.vp-card-tl{top:.3rem;left:.35rem}',
      '.vp-card-br{bottom:.3rem;right:.35rem}',
      '.vp-card-val{font-size:.75rem;font-weight:700;line-height:1.1}',
      '.vp-card-suit-sm{font-size:.6rem}',
      '.vp-card-ctr{font-size:1.6rem}',
      '.vp-card-red .vp-card-val,.vp-card-red .vp-card-suit-sm,.vp-card-red .vp-card-ctr{color:#dc2626}',
      '.vp-card-black .vp-card-val,.vp-card-black .vp-card-suit-sm,.vp-card-black .vp-card-ctr{color:#111}',
      /* status */
      '.vp-status{text-align:center;font-size:.9rem;color:#94a3b8;min-height:1.1em;font-weight:500}',
      '.vp-ok{color:#4ade80}',
      '.vp-err{color:#f87171}',
      /* bet */
      '.vp-bet-section{display:flex;align-items:center;gap:.8rem}',
      '.vp-field-label{font-size:.78rem;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em;flex-shrink:0}',
      '.vp-bet-ctrl{display:flex;align-items:center;gap:.5rem;flex:1}',
      '.vp-adj-btn{background:#334155;border:none;color:#e2e8f0;border-radius:.4rem;padding:.28rem .65rem;cursor:pointer;font-size:.85rem}',
      '.vp-adj-btn:hover{background:#475569}',
      '.vp-bet-label{flex:1;text-align:center;font-weight:700;color:#f8fafc}',
      /* chips */
      '.vp-chips{display:flex;flex-wrap:wrap;gap:.3rem}',
      '.vp-chip{background:#0f172a;border:1px solid #334155;color:#94a3b8;border-radius:.4rem;padding:.25rem .55rem;font-size:.78rem;cursor:pointer}',
      '.vp-chip:hover{border-color:#60a5fa;color:#60a5fa}',
      /* buttons */
      '.vp-btn{border:none;border-radius:.5rem;padding:.7rem;font-size:1rem;font-weight:700;cursor:pointer;width:100%;transition:opacity .15s}',
      '.vp-btn:disabled{opacity:.35;cursor:not-allowed}',
      '.vp-btn-deal{background:linear-gradient(135deg,#7c3aed,#6d28d9);color:#fff}',
      '.vp-btn-draw{background:linear-gradient(135deg,#ea580c,#c2410c);color:#fff}',
      '.vp-btn:not(:disabled):hover{opacity:.85}',
    ].join('\n');
    document.head.appendChild(s);
  }

  // ── public API ──────────────────────────────────────────────────────────────

  window.openVideoPoker  = openVideoPoker;
  window.closeVideoPoker = closeVideoPoker;

}());
