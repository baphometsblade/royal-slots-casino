(function () {
  'use strict';

  // ── Hi-Lo Card Game UI ──────────────────────────────────────────────────────
  // Cards: A(1) 2 3 4 5 6 7 8 9 10 J(11) Q(12) K(13)
  // Guess Higher or Lower than the current card.
  // Correct = multiplier stacks. Wrong = lose bet. Cashout = bank winnings.
  // 97% RTP, server-validated on every guess.

  var SUITS = ['\u2665', '\u2666', '\u2663', '\u2660']; // ♥ ♦ ♣ ♠
  var _suit = 0; // cycles through suits for visual variety

  // ── helpers ────────────────────────────────────────────────────────────────

  function getToken() {
    try { return localStorage.getItem('casino_token') || localStorage.getItem('token') || null; }
    catch (e) { return null; }
  }

  function apiFetch(path, opts) {
    var token = getToken();
    var headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = 'Bearer ' + token;
    return fetch(path, Object.assign({ headers: headers }, opts || {}));
  }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls)  e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  function clearChildren(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  function nextSuit() {
    var s = SUITS[_suit % SUITS.length];
    _suit++;
    return s;
  }

  // ── state ──────────────────────────────────────────────────────────────────

  var state = {
    open:        false,
    active:      false,
    bet:         1.0,
    card:        null,
    cardLabel:   '',
    multiplier:  1.0,
    rounds:      0,
    higherMult:  null,
    lowerMult:   null,
    history:     [],   // [{label, won}]
    busy:        false,
  };

  // ── DOM refs (populated in buildUI) ────────────────────────────────────────

  var refs = {};

  // ── card display ───────────────────────────────────────────────────────────

  function renderCard(label, animIn) {
    var suit     = nextSuit();
    var isRed    = suit === '\u2665' || suit === '\u2666';
    var wrapper  = refs.cardFace;
    clearChildren(wrapper);

    var inner = el('div', 'hilo-card-inner');
    inner.style.color = isRed ? '#f87171' : '#e2e8f0';

    var tl = el('div', 'hilo-card-corner hilo-card-tl');
    var cLabel1 = el('div', 'hilo-card-value', label);
    var cSuit1  = el('div', 'hilo-card-suit',  suit);
    tl.appendChild(cLabel1);
    tl.appendChild(cSuit1);

    var ctr = el('div', 'hilo-card-center', suit);
    ctr.style.fontSize = '3.5rem';

    var br = el('div', 'hilo-card-corner hilo-card-br');
    br.style.transform = 'rotate(180deg)';
    var cLabel2 = el('div', 'hilo-card-value', label);
    var cSuit2  = el('div', 'hilo-card-suit',  suit);
    br.appendChild(cLabel2);
    br.appendChild(cSuit2);

    inner.appendChild(tl);
    inner.appendChild(ctr);
    inner.appendChild(br);
    wrapper.appendChild(inner);

    if (animIn) {
      wrapper.classList.remove('hilo-card-flip');
      // double-RAF to trigger CSS transition
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          wrapper.classList.add('hilo-card-flip');
        });
      });
    }
  }

  // ── history row ────────────────────────────────────────────────────────────

  function addHistory(label, won) {
    state.history.push({ label: label, won: won });
    if (state.history.length > 12) state.history.shift();

    clearChildren(refs.history);
    state.history.forEach(function (h) {
      var pill = el('span', 'hilo-hist-pill ' + (h.won ? 'hilo-hist-win' : 'hilo-hist-loss'), h.label);
      refs.history.appendChild(pill);
    });
  }

  // ── UI state updates ───────────────────────────────────────────────────────

  function setMultDisplay(mult) {
    refs.multDisplay.textContent = mult.toFixed(4) + 'x';
  }

  function setBetLabel(bet) {
    refs.betLabel.textContent = '$' + bet.toFixed(2);
  }

  function updateGuessButtons() {
    var hm = state.higherMult;
    var lm = state.lowerMult;

    clearChildren(refs.btnHigher);
    var hIcon  = el('span', 'hilo-btn-icon', '\u2191'); // ↑
    var hLabel = el('span', null, 'HIGHER');
    var hOdds  = el('span', 'hilo-btn-odds', hm ? hm.toFixed(2) + 'x' : 'N/A');
    refs.btnHigher.appendChild(hIcon);
    refs.btnHigher.appendChild(hLabel);
    refs.btnHigher.appendChild(hOdds);
    refs.btnHigher.disabled = !state.active || state.busy || hm === null;

    clearChildren(refs.btnLower);
    var lIcon  = el('span', 'hilo-btn-icon', '\u2193'); // ↓
    var lLabel = el('span', null, 'LOWER');
    var lOdds  = el('span', 'hilo-btn-odds', lm ? lm.toFixed(2) + 'x' : 'N/A');
    refs.btnLower.appendChild(lIcon);
    refs.btnLower.appendChild(lLabel);
    refs.btnLower.appendChild(lOdds);
    refs.btnLower.disabled = !state.active || state.busy || lm === null;

    refs.btnCashout.disabled = !state.active || state.busy || state.rounds < 1;
    refs.btnDeal.disabled    = state.active || state.busy;
  }

  function setStatus(msg, cls) {
    refs.statusMsg.textContent = msg || '';
    refs.statusMsg.className   = 'hilo-status ' + (cls || '');
  }

  function syncBalance(newBal) {
    if (newBal == null) return;
    if (typeof window.updateBalanceDisplay === 'function') window.updateBalanceDisplay(newBal);
    if (typeof window.balance !== 'undefined') window.balance = newBal;
  }

  // ── API calls ──────────────────────────────────────────────────────────────

  function apiDeal() {
    if (state.busy) return;
    state.busy = true;
    updateGuessButtons();
    setStatus('Dealing\u2026');

    apiFetch('/api/hilo/start', {
      method: 'POST',
      body: JSON.stringify({ bet: state.bet }),
    })
    .then(function (r) { return r.json(); })
    .then(function (data) {
      state.busy = false;
      if (data.error) { setStatus(data.error, 'hilo-err'); updateGuessButtons(); return; }

      state.active     = true;
      state.card       = data.card;
      state.cardLabel  = data.cardLabel;
      state.multiplier = 1.0;
      state.rounds     = 0;
      state.higherMult = data.higherMult;
      state.lowerMult  = data.lowerMult;

      renderCard(data.cardLabel, true);
      setMultDisplay(1.0);
      setStatus('Higher or lower than ' + data.cardLabel + '?');
      updateGuessButtons();
      syncBalance(data.newBalance);
    })
    .catch(function () {
      state.busy = false;
      setStatus('Network error — try again', 'hilo-err');
      updateGuessButtons();
    });
  }

  function apiGuess(direction) {
    if (!state.active || state.busy) return;
    state.busy = true;
    updateGuessButtons();
    setStatus('Guessing\u2026');

    apiFetch('/api/hilo/guess', {
      method: 'POST',
      body: JSON.stringify({ direction: direction }),
    })
    .then(function (r) { return r.json(); })
    .then(function (data) {
      state.busy = false;
      if (data.error) { setStatus(data.error, 'hilo-err'); updateGuessButtons(); return; }

      renderCard(data.nextCardLabel, true);
      state.card      = data.nextCard;
      state.cardLabel = data.nextCardLabel;

      if (data.correct) {
        state.multiplier  = data.multiplier;
        state.rounds      = data.rounds;
        state.higherMult  = data.higherMult;
        state.lowerMult   = data.lowerMult;
        setMultDisplay(data.multiplier);
        setStatus('\u2714 Correct! Keep going or cash out.', 'hilo-ok');
        addHistory(data.nextCardLabel, true);
      } else {
        state.active = false;
        setStatus('\u2718 Wrong! The card was ' + data.nextCardLabel + '. You lost $' + state.bet.toFixed(2) + '.', 'hilo-err');
        addHistory(data.nextCardLabel, false);
        setMultDisplay(0);
      }
      updateGuessButtons();
    })
    .catch(function () {
      state.busy = false;
      setStatus('Network error — try again', 'hilo-err');
      updateGuessButtons();
    });
  }

  function apiCashout() {
    if (!state.active || state.busy || state.rounds < 1) return;
    state.busy = true;
    updateGuessButtons();
    setStatus('Cashing out\u2026');

    apiFetch('/api/hilo/cashout', { method: 'POST' })
    .then(function (r) { return r.json(); })
    .then(function (data) {
      state.busy   = false;
      state.active = false;
      if (data.error) { setStatus(data.error, 'hilo-err'); updateGuessButtons(); return; }

      setStatus('\uD83D\uDCB0 Cashed out ' + data.multiplier.toFixed(4) + 'x \u2192 $' + data.payout.toFixed(2), 'hilo-ok');
      setMultDisplay(data.multiplier);
      updateGuessButtons();
      syncBalance(data.newBalance);
    })
    .catch(function () {
      state.busy = false;
      setStatus('Network error — try again', 'hilo-err');
      updateGuessButtons();
    });
  }

  // ── bet controls ───────────────────────────────────────────────────────────

  function setBet(v) {
    state.bet = Math.max(0.10, Math.min(500, parseFloat(v) || 1.0));
    setBetLabel(state.bet);
  }

  // ── build UI ───────────────────────────────────────────────────────────────

  function buildUI() {
    if (document.getElementById('hilo-overlay')) return; // already built

    // Overlay
    var overlay = el('div', 'hilo-overlay');
    overlay.id  = 'hilo-overlay';

    // Panel
    var panel = el('div', 'hilo-panel');

    // Header
    var header = el('div', 'hilo-header');
    var title  = el('h2', 'hilo-title', '\uD83C\uDCCF Hi-Lo');
    var closeBtn = el('button', 'hilo-close-btn', '\u00D7');
    closeBtn.setAttribute('aria-label', 'Close Hi-Lo');
    closeBtn.addEventListener('click', closeHiLo);
    header.appendChild(title);
    header.appendChild(closeBtn);

    // Card area
    var cardArea  = el('div', 'hilo-card-area');
    var cardFace  = el('div', 'hilo-card-face');
    var placeholder = el('div', 'hilo-card-placeholder', '\uD83C\uDCCF');
    cardFace.appendChild(placeholder);
    cardArea.appendChild(cardFace);
    refs.cardFace = cardFace;

    // Multiplier display
    var multRow = el('div', 'hilo-mult-row');
    var multLbl = el('span', 'hilo-mult-label', 'Multiplier');
    var multVal = el('span', 'hilo-mult-value', '1.0000x');
    multRow.appendChild(multLbl);
    multRow.appendChild(multVal);
    refs.multDisplay = multVal;

    // Status
    var statusMsg = el('div', 'hilo-status', 'Set your bet and deal to start!');
    refs.statusMsg = statusMsg;

    // Guess buttons
    var guessRow = el('div', 'hilo-guess-row');

    var btnHigher = el('button', 'hilo-btn hilo-btn-higher');
    var hIcon     = el('span', 'hilo-btn-icon', '\u2191');
    var hLbl      = el('span', null, 'HIGHER');
    var hOdds     = el('span', 'hilo-btn-odds', '---');
    btnHigher.appendChild(hIcon);
    btnHigher.appendChild(hLbl);
    btnHigher.appendChild(hOdds);
    btnHigher.disabled = true;
    btnHigher.addEventListener('click', function () { apiGuess('higher'); });

    var btnLower = el('button', 'hilo-btn hilo-btn-lower');
    var lIcon    = el('span', 'hilo-btn-icon', '\u2193');
    var lLbl     = el('span', null, 'LOWER');
    var lOdds    = el('span', 'hilo-btn-odds', '---');
    btnLower.appendChild(lIcon);
    btnLower.appendChild(lLbl);
    btnLower.appendChild(lOdds);
    btnLower.disabled = true;
    btnLower.addEventListener('click', function () { apiGuess('lower'); });

    guessRow.appendChild(btnHigher);
    guessRow.appendChild(btnLower);
    refs.btnHigher = btnHigher;
    refs.btnLower  = btnLower;

    // Cashout button
    var btnCashout = el('button', 'hilo-btn hilo-btn-cashout', '\uD83D\uDCB0 CASH OUT');
    btnCashout.disabled = true;
    btnCashout.addEventListener('click', apiCashout);
    refs.btnCashout = btnCashout;

    // Bet controls
    var betRow = el('div', 'hilo-bet-row');
    var betLbl = el('label', 'hilo-field-label', 'Bet');
    var betCtrl = el('div', 'hilo-bet-ctrl');

    var btnHalf = el('button', 'hilo-adj-btn', '½');
    btnHalf.addEventListener('click', function () { setBet(state.bet / 2); });
    var betLabel = el('span', 'hilo-bet-label', '$1.00');
    var btnDbl   = el('button', 'hilo-adj-btn', '2×');
    btnDbl.addEventListener('click', function () { setBet(state.bet * 2); });
    refs.betLabel = betLabel;

    betCtrl.appendChild(btnHalf);
    betCtrl.appendChild(betLabel);
    betCtrl.appendChild(btnDbl);

    // Quick-bet chips
    var chips = el('div', 'hilo-chips');
    [0.10, 0.50, 1, 5, 10, 25, 100].forEach(function (v) {
      var chip = el('button', 'hilo-chip', v < 1 ? ('$' + v.toFixed(2)) : ('$' + v));
      chip.addEventListener('click', function () { setBet(v); });
      chips.appendChild(chip);
    });

    betRow.appendChild(betLbl);
    betRow.appendChild(betCtrl);

    // Deal button
    var btnDeal = el('button', 'hilo-btn hilo-btn-deal', '\uD83C\uDCCF DEAL');
    btnDeal.addEventListener('click', apiDeal);
    refs.btnDeal = btnDeal;

    // History
    var histSection = el('div', 'hilo-history-section');
    var histLbl     = el('div', 'hilo-hist-label', 'History');
    var histRow     = el('div', 'hilo-hist-row');
    refs.history = histRow;
    histSection.appendChild(histLbl);
    histSection.appendChild(histRow);

    // Assemble panel
    panel.appendChild(header);
    panel.appendChild(cardArea);
    panel.appendChild(multRow);
    panel.appendChild(statusMsg);
    panel.appendChild(guessRow);
    panel.appendChild(btnCashout);
    panel.appendChild(betRow);
    panel.appendChild(chips);
    panel.appendChild(btnDeal);
    panel.appendChild(histSection);

    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    // Close on backdrop click
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeHiLo();
    });

    // Inject styles
    injectStyles();
  }

  // ── open / close ───────────────────────────────────────────────────────────

  function openHiLo() {
    if (!getToken()) return; // silent no-op when logged out
    buildUI();
    var overlay = document.getElementById('hilo-overlay');
    if (overlay) {
      overlay.style.display = 'flex';
      state.open = true;
    }
    // Restore any existing active game from server
    apiFetch('/api/hilo/state')
    .then(function (r) { return r.json(); })
    .then(function (data) {
      if (!data.active) return;
      state.active     = true;
      state.card       = data.card;
      state.cardLabel  = data.cardLabel;
      state.multiplier = data.multiplier;
      state.rounds     = data.rounds;
      state.higherMult = data.higherMult;
      state.lowerMult  = data.lowerMult;
      renderCard(data.cardLabel, false);
      setMultDisplay(data.multiplier);
      setStatus('Game in progress — Higher or lower than ' + data.cardLabel + '?');
      updateGuessButtons();
    })
    .catch(function () {}); // ignore if server unreachable
  }

  function closeHiLo() {
    var overlay = document.getElementById('hilo-overlay');
    if (overlay) overlay.style.display = 'none';
    state.open = false;
  }

  // ── CSS injection ───────────────────────────────────────────────────────────

  function injectStyles() {
    if (document.getElementById('hilo-styles')) return;
    var s = document.createElement('style');
    s.id  = 'hilo-styles';
    s.textContent = [
      '.hilo-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:9100;align-items:center;justify-content:center;padding:1rem;box-sizing:border-box}',
      '.hilo-panel{background:#1e293b;border:1px solid #334155;border-radius:1rem;padding:1.5rem;width:100%;max-width:420px;display:flex;flex-direction:column;gap:.9rem;color:#e2e8f0;font-family:inherit;max-height:95vh;overflow-y:auto}',
      '.hilo-header{display:flex;justify-content:space-between;align-items:center}',
      '.hilo-title{margin:0;font-size:1.4rem;color:#f8fafc}',
      '.hilo-close-btn{background:none;border:none;color:#94a3b8;font-size:1.6rem;cursor:pointer;line-height:1;padding:.2rem .5rem}',
      '.hilo-close-btn:hover{color:#e2e8f0}',
      /* Card */
      '.hilo-card-area{display:flex;justify-content:center;perspective:600px}',
      '.hilo-card-face{width:120px;height:168px;background:#fff;border-radius:.75rem;display:flex;align-items:center;justify-content:center;position:relative;box-shadow:0 4px 20px rgba(0,0,0,.4);transition:transform .35s ease;transform:rotateY(0deg)}',
      '.hilo-card-flip{animation:hiloFlipIn .35s ease}',
      '@keyframes hiloFlipIn{0%{transform:rotateY(-90deg) scale(.85)}100%{transform:rotateY(0deg) scale(1)}}',
      '.hilo-card-inner{width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:.4rem;box-sizing:border-box}',
      '.hilo-card-corner{position:absolute;display:flex;flex-direction:column;align-items:center;line-height:1.1}',
      '.hilo-card-tl{top:.4rem;left:.5rem}',
      '.hilo-card-br{bottom:.4rem;right:.5rem}',
      '.hilo-card-value{font-size:.85rem;font-weight:700}',
      '.hilo-card-suit{font-size:.75rem}',
      '.hilo-card-center{font-size:3.5rem;line-height:1}',
      '.hilo-card-placeholder{font-size:4rem;opacity:.25}',
      /* Multiplier */
      '.hilo-mult-row{display:flex;justify-content:space-between;align-items:center;background:#0f172a;border-radius:.5rem;padding:.5rem 1rem}',
      '.hilo-mult-label{font-size:.8rem;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em}',
      '.hilo-mult-value{font-size:1.5rem;font-weight:700;color:#facc15;font-variant-numeric:tabular-nums}',
      /* Status */
      '.hilo-status{text-align:center;font-size:.9rem;color:#94a3b8;min-height:1.2em}',
      '.hilo-ok{color:#4ade80}',
      '.hilo-err{color:#f87171}',
      /* Guess buttons */
      '.hilo-guess-row{display:grid;grid-template-columns:1fr 1fr;gap:.6rem}',
      '.hilo-btn{border:none;border-radius:.6rem;padding:.7rem 1rem;font-size:.95rem;font-weight:700;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:.2rem;transition:opacity .15s,transform .1s}',
      '.hilo-btn:hover:not(:disabled){transform:translateY(-1px);opacity:.9}',
      '.hilo-btn:disabled{opacity:.35;cursor:not-allowed}',
      '.hilo-btn-icon{font-size:1.4rem;line-height:1}',
      '.hilo-btn-odds{font-size:.75rem;opacity:.8}',
      '.hilo-btn-higher{background:linear-gradient(135deg,#059669,#10b981);color:#fff}',
      '.hilo-btn-lower{background:linear-gradient(135deg,#dc2626,#ef4444);color:#fff}',
      '.hilo-btn-cashout{background:linear-gradient(135deg,#92400e,#f59e0b);color:#fff;width:100%;font-size:1.05rem;padding:.75rem}',
      '.hilo-btn-deal{background:linear-gradient(135deg,#1d4ed8,#3b82f6);color:#fff;width:100%;font-size:1rem;padding:.7rem}',
      /* Bet row */
      '.hilo-bet-row{display:flex;align-items:center;gap:.8rem}',
      '.hilo-field-label{font-size:.8rem;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em;flex-shrink:0}',
      '.hilo-bet-ctrl{display:flex;align-items:center;gap:.5rem;flex:1}',
      '.hilo-adj-btn{background:#334155;border:none;color:#e2e8f0;border-radius:.4rem;padding:.25rem .6rem;cursor:pointer;font-size:.85rem}',
      '.hilo-adj-btn:hover{background:#475569}',
      '.hilo-bet-label{flex:1;text-align:center;font-weight:700;color:#f8fafc}',
      /* Chips */
      '.hilo-chips{display:flex;flex-wrap:wrap;gap:.35rem}',
      '.hilo-chip{background:#0f172a;border:1px solid #334155;color:#94a3b8;border-radius:.4rem;padding:.25rem .55rem;font-size:.78rem;cursor:pointer}',
      '.hilo-chip:hover{border-color:#60a5fa;color:#60a5fa}',
      /* History */
      '.hilo-history-section{display:flex;flex-direction:column;gap:.35rem}',
      '.hilo-hist-label{font-size:.75rem;color:#64748b;text-transform:uppercase;letter-spacing:.05em}',
      '.hilo-hist-row{display:flex;flex-wrap:wrap;gap:.3rem;min-height:1.4rem}',
      '.hilo-hist-pill{font-size:.75rem;padding:.1rem .45rem;border-radius:.3rem;font-weight:600}',
      '.hilo-hist-win{background:#14532d;color:#4ade80}',
      '.hilo-hist-loss{background:#450a0a;color:#f87171}',
    ].join('\n');
    document.head.appendChild(s);
  }

  // ── public API ─────────────────────────────────────────────────────────────

  window.openHiLo  = openHiLo;
  window.closeHiLo = closeHiLo;

}());
