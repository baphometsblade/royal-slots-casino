(function() {
  'use strict';

  var TOKEN_KEY = typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken';

  var _overlay   = null;
  var _stylesInj = false;
  var _playing   = false;
  var _gameId    = null;
  var _steps     = 0;
  var _multiplier= 1.0;

  function getToken() {
    try { return localStorage.getItem(TOKEN_KEY); } catch(e) { return null; }
  }

  // ── styles ───────────────────────────────────────────────────────────────────

  function injectStyles() {
    if (_stylesInj) return;
    _stylesInj = true;
    var s = document.createElement('style');
    s.textContent = [
      '#hiOverlay{position:fixed;inset:0;background:rgba(0,0,0,.93);z-index:10400;display:none;align-items:center;justify-content:center;font-family:monospace}',
      '#hiOverlay.active{display:flex}',
      '#hiModal{background:linear-gradient(135deg,#050a00,#0a1500);border:2px solid rgba(74,222,128,.25);border-radius:20px;padding:18px 20px;max-width:400px;width:96%;text-align:center;max-height:96vh;overflow-y:auto}',
      '#hiModal h2{color:#4ade80;font-size:20px;margin:0 0 2px;letter-spacing:2px}',
      '#hiModal .hi-sub{color:rgba(255,255,255,.35);font-size:11px;margin-bottom:14px}',
      '.hi-card-area{display:flex;align-items:center;justify-content:center;gap:18px;margin-bottom:14px}',
      '.hi-card{width:70px;height:96px;border-radius:10px;background:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:26px;font-weight:900;box-shadow:0 4px 16px rgba(0,0,0,.5);transition:all .2s;position:relative}',
      '.hi-card.hi-red{color:#e11d48}',
      '.hi-card.hi-black{color:#1e293b}',
      '.hi-card.hi-new{animation:hiFlip .3s ease}',
      '.hi-card.hi-empty{background:rgba(255,255,255,.06);border:2px dashed rgba(255,255,255,.15);color:rgba(255,255,255,.2);font-size:18px}',
      '@keyframes hiFlip{0%{transform:rotateY(90deg) scale(.8)}100%{transform:rotateY(0) scale(1)}}',
      '.hi-card-suit{font-size:13px;position:absolute;top:6px;left:8px}',
      '.hi-mult-display{font-size:28px;font-weight:900;color:#e0e7ff;margin-bottom:4px}',
      '.hi-mult-sub{font-size:11px;color:rgba(255,255,255,.3);margin-bottom:14px}',
      '.hi-btn-row{display:flex;gap:8px;margin-bottom:10px}',
      '.hi-btn{flex:1;padding:12px 4px;border-radius:10px;border:2px solid rgba(255,255,255,.1);font-size:13px;font-weight:900;cursor:pointer;transition:all .15s;letter-spacing:.5px}',
      '.hi-btn:hover:not(:disabled){transform:scale(1.03)}',
      '.hi-btn:disabled{opacity:.35;cursor:not-allowed;transform:none}',
      '#hiHigher{background:rgba(59,130,246,.15);border-color:rgba(59,130,246,.4);color:#93c5fd}',
      '#hiLower{background:rgba(220,38,38,.15);border-color:rgba(220,38,38,.4);color:#fca5a5}',
      '#hiCashout{background:rgba(74,222,128,.15);border-color:rgba(74,222,128,.4);color:#4ade80}',
      '.hi-input-row{display:flex;gap:10px;align-items:center;justify-content:center;margin-bottom:10px}',
      '.hi-input-row label{font-size:10px;color:rgba(255,255,255,.35);text-transform:uppercase;letter-spacing:.5px}',
      '.hi-input{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);border-radius:8px;color:#fff;padding:6px 10px;font-size:14px;font-weight:700;width:90px;text-align:center}',
      '.hi-input:focus{outline:none;border-color:rgba(74,222,128,.6)}',
      '#hiStartBtn{background:linear-gradient(135deg,#14532d,#166534);color:#fff;border:1px solid rgba(74,222,128,.4);padding:12px 0;border-radius:12px;font-size:16px;font-weight:900;cursor:pointer;width:100%;margin-bottom:6px;letter-spacing:.5px;transition:transform .1s}',
      '#hiStartBtn:hover:not(:disabled){transform:scale(1.02)}',
      '#hiStartBtn:disabled{opacity:.4;cursor:not-allowed;transform:none}',
      '#hiResult{font-size:14px;font-weight:800;min-height:20px;color:#a5b4fc;margin-bottom:8px}',
      '#hiClose{background:none;border:none;color:rgba(255,255,255,.3);font-size:12px;cursor:pointer;text-decoration:underline}',
    ].join('\n');
    document.head.appendChild(s);
  }

  // ── helpers ───────────────────────────────────────────────────────────────────

  var SUIT_COLORS = { '\u2660': 'hi-black', '\u2663': 'hi-black', '\u2665': 'hi-red', '\u2666': 'hi-red' };

  function renderCard(elId, card, isNew) {
    var el = document.getElementById(elId);
    if (!el) return;
    el.className = 'hi-card' + (card ? (' ' + (SUIT_COLORS[card.suit] || 'hi-black')) : ' hi-empty') + (isNew ? ' hi-new' : '');
    if (card) {
      el.textContent = '';
      var suitEl = document.createElement('span');
      suitEl.className = 'hi-card-suit';
      suitEl.textContent = card.suit;
      el.appendChild(suitEl);
      var rankNode = document.createTextNode(card.rank);
      el.appendChild(rankNode);
    } else {
      el.textContent = '?';
    }
  }

  function updateMultDisplay(mult, steps) {
    var el = document.getElementById('hiMultDisplay');
    if (el) el.textContent = mult.toFixed(2) + 'x';
    var sub = document.getElementById('hiMultSub');
    if (sub) sub.textContent = steps === 0 ? 'Make your first guess' : steps + ' correct guess' + (steps !== 1 ? 'es' : '');
  }

  function setResult(txt, col) {
    var el = document.getElementById('hiResult');
    if (!el) return;
    el.textContent = txt;
    el.style.color = col || '#a5b4fc';
  }

  function setGuessButtons(enabled, canCashout) {
    var higher  = document.getElementById('hiHigher');
    var lower   = document.getElementById('hiLower');
    var cashout = document.getElementById('hiCashout');
    if (higher)  higher.disabled  = !enabled;
    if (lower)   lower.disabled   = !enabled;
    if (cashout) cashout.disabled = !(enabled && canCashout);
  }

  function setPhase(phase) {
    // phase: 'idle' | 'playing' | 'over'
    var startBtn  = document.getElementById('hiStartBtn');
    var inputRow  = document.getElementById('hiBetRow');
    var guessArea = document.getElementById('hiGuessArea');
    if (startBtn)  startBtn.style.display  = phase === 'idle' ? '' : 'none';
    if (inputRow)  inputRow.style.display  = phase === 'idle' ? '' : 'none';
    if (guessArea) guessArea.style.display = phase === 'playing' ? '' : 'none';
  }

  // ── start ─────────────────────────────────────────────────────────────────────

  function doStart() {
    var token = getToken();
    if (!token) { setResult('Please log in to play.', '#f87171'); return; }
    var betInput = document.getElementById('hiBetInput');
    var betVal   = betInput ? parseFloat(betInput.value) : 5.00;
    if (isNaN(betVal) || betVal < 0.25) betVal = 0.25;

    var startBtn = document.getElementById('hiStartBtn');
    if (startBtn) { startBtn.disabled = true; startBtn.textContent = 'Dealing\u2026'; }
    setResult('', '');

    fetch('/api/hilo/start', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ bet: betVal }),
    })
    .then(function(r) { return r.ok ? r.json() : r.json().then(function(e) { throw e; }); })
    .then(function(data) {
      if (startBtn) { startBtn.disabled = false; startBtn.textContent = '\u25BA Start'; }
      _gameId     = data.gameId;
      _steps      = 0;
      _multiplier = 1.0;
      _playing    = true;

      renderCard('hiCurrentCard', data.card, true);
      renderCard('hiNextCard', null, false);
      updateMultDisplay(1.0, 0);
      setResult('\u2191 Higher or \u2193 Lower?', '#a5b4fc');
      setGuessButtons(true, false);
      setPhase('playing');
    })
    .catch(function(err) {
      if (startBtn) { startBtn.disabled = false; startBtn.textContent = '\u25BA Start'; }
      setResult((err && err.error) || 'Error \u2014 check balance.', '#f87171');
    });
  }

  // ── guess ─────────────────────────────────────────────────────────────────────

  function doGuess(guess) {
    if (!_playing || !_gameId) return;
    var token = getToken();
    if (!token) return;

    setGuessButtons(false, false);
    setResult('', '');

    fetch('/api/hilo/guess', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameId: _gameId, guess: guess }),
    })
    .then(function(r) { return r.ok ? r.json() : r.json().then(function(e) { throw e; }); })
    .then(function(data) {
      renderCard('hiNextCard', data.newCard, true);

      setTimeout(function() {
        renderCard('hiCurrentCard', data.newCard, false);
        renderCard('hiNextCard', null, false);

        if (data.correct) {
          _steps++;
          _multiplier = data.multiplier;
          updateMultDisplay(_multiplier, _steps);
          setResult('\u2705 Correct! Keep going or cashout.', '#4ade80');
          setGuessButtons(true, true);

          if (typeof window.updateBalance === 'function' && data.newBalance != null) {
            window.updateBalance(data.newBalance);
          }
        } else {
          _playing = false;
          _gameId  = null;
          updateMultDisplay(0, _steps);
          setResult('\u274C Wrong! You lost your bet.', '#f87171');
          setPhase('idle');
          var startBtn = document.getElementById('hiStartBtn');
          if (startBtn) { startBtn.textContent = '\u25BA Play Again'; startBtn.disabled = false; }
        }
      }, 350);
    })
    .catch(function(err) {
      setGuessButtons(true, _steps > 0);
      setResult((err && err.error) || 'Error.', '#f87171');
    });
  }

  // ── cashout ───────────────────────────────────────────────────────────────────

  function doCashout() {
    if (!_playing || !_gameId || _steps === 0) return;
    var token = getToken();
    if (!token) return;

    setGuessButtons(false, false);

    fetch('/api/hilo/cashout', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameId: _gameId }),
    })
    .then(function(r) { return r.ok ? r.json() : r.json().then(function(e) { throw e; }); })
    .then(function(data) {
      _playing = false;
      _gameId  = null;

      if (typeof window.updateBalance === 'function' && data.newBalance != null) {
        window.updateBalance(data.newBalance);
      }

      setResult('\uD83C\uDF89 Cashed out! +$' + data.profit.toFixed(2) + ' (' + data.multiplier + 'x)', '#4ade80');
      setPhase('idle');
      var startBtn = document.getElementById('hiStartBtn');
      if (startBtn) { startBtn.textContent = '\u25BA Play Again'; startBtn.disabled = false; }
    })
    .catch(function(err) {
      setGuessButtons(true, true);
      setResult((err && err.error) || 'Error.', '#f87171');
    });
  }

  // ── modal build ───────────────────────────────────────────────────────────────

  function buildModal() {
    if (_overlay) return;
    _overlay = document.createElement('div');
    _overlay.id = 'hiOverlay';

    var modal = document.createElement('div');
    modal.id = 'hiModal';

    var icon = document.createElement('div');
    icon.style.cssText = 'font-size:28px;margin-bottom:2px';
    icon.textContent = '\u25B2\u25BC';
    modal.appendChild(icon);

    var h2 = document.createElement('h2');
    h2.textContent = 'HI-LO';
    modal.appendChild(h2);

    var sub = document.createElement('div');
    sub.className = 'hi-sub';
    sub.textContent = 'Predict the next card \u2014 chain wins, cashout before you bust!';
    modal.appendChild(sub);

    // Card area
    var cardArea = document.createElement('div');
    cardArea.className = 'hi-card-area';

    var currentCard = document.createElement('div');
    currentCard.id = 'hiCurrentCard';
    currentCard.className = 'hi-card hi-empty';
    currentCard.textContent = '?';

    var arrow = document.createElement('div');
    arrow.style.cssText = 'font-size:28px;color:rgba(255,255,255,.3)';
    arrow.textContent = '\u2192';

    var nextCard = document.createElement('div');
    nextCard.id = 'hiNextCard';
    nextCard.className = 'hi-card hi-empty';
    nextCard.textContent = '?';

    cardArea.appendChild(currentCard);
    cardArea.appendChild(arrow);
    cardArea.appendChild(nextCard);
    modal.appendChild(cardArea);

    // Multiplier display
    var multDisp = document.createElement('div');
    multDisp.id = 'hiMultDisplay';
    multDisp.className = 'hi-mult-display';
    multDisp.textContent = '1.00x';
    modal.appendChild(multDisp);

    var multSub = document.createElement('div');
    multSub.id = 'hiMultSub';
    multSub.className = 'hi-mult-sub';
    multSub.textContent = 'Start a game below';
    modal.appendChild(multSub);

    // Bet input row (shown only when idle)
    var inputRow = document.createElement('div');
    inputRow.id = 'hiBetRow';
    inputRow.className = 'hi-input-row';
    var lbl = document.createElement('label');
    lbl.textContent = 'Bet ($)';
    lbl.htmlFor = 'hiBetInput';
    var inp = document.createElement('input');
    inp.id = 'hiBetInput'; inp.className = 'hi-input';
    inp.type = 'number'; inp.min = '0.25'; inp.max = '500'; inp.step = '0.25'; inp.value = '5.00';
    inputRow.appendChild(lbl);
    inputRow.appendChild(inp);
    modal.appendChild(inputRow);

    // Start button (shown only when idle)
    var startBtn = document.createElement('button');
    startBtn.id = 'hiStartBtn';
    startBtn.textContent = '\u25BA Start';
    startBtn.addEventListener('click', doStart);
    modal.appendChild(startBtn);

    // Guess area (shown only when playing)
    var guessArea = document.createElement('div');
    guessArea.id = 'hiGuessArea';
    guessArea.style.display = 'none';

    var btnRow = document.createElement('div');
    btnRow.className = 'hi-btn-row';

    var higherBtn = document.createElement('button');
    higherBtn.id = 'hiHigher';
    higherBtn.className = 'hi-btn';
    higherBtn.textContent = '\u2191 Higher';
    higherBtn.disabled = true;
    higherBtn.addEventListener('click', function() { doGuess('higher'); });

    var lowerBtn = document.createElement('button');
    lowerBtn.id = 'hiLower';
    lowerBtn.className = 'hi-btn';
    lowerBtn.textContent = '\u2193 Lower';
    lowerBtn.disabled = true;
    lowerBtn.addEventListener('click', function() { doGuess('lower'); });

    var cashoutBtn = document.createElement('button');
    cashoutBtn.id = 'hiCashout';
    cashoutBtn.className = 'hi-btn';
    cashoutBtn.textContent = '\uD83D\uDCB0 Cashout';
    cashoutBtn.disabled = true;
    cashoutBtn.addEventListener('click', doCashout);

    btnRow.appendChild(higherBtn);
    btnRow.appendChild(lowerBtn);
    btnRow.appendChild(cashoutBtn);
    guessArea.appendChild(btnRow);
    modal.appendChild(guessArea);

    // Result
    var resultEl = document.createElement('div');
    resultEl.id = 'hiResult';
    resultEl.textContent = 'Set your bet and start!';
    resultEl.style.color = '#a5b4fc';
    modal.appendChild(resultEl);

    // Close
    var closeBtn = document.createElement('button');
    closeBtn.id = 'hiClose';
    closeBtn.textContent = 'Close';
    closeBtn.addEventListener('click', closeHilo);
    modal.appendChild(closeBtn);

    _overlay.appendChild(modal);
    _overlay.addEventListener('click', function(e) { if (e.target === _overlay) closeHilo(); });
    document.body.appendChild(_overlay);
  }

  // ── public API ────────────────────────────────────────────────────────────────

  function openHilo() {
    injectStyles();
    buildModal();
    _overlay.classList.add('active');
    setResult('Set your bet and start!', '#a5b4fc');
    setPhase('idle');
  }

  function closeHilo() {
    if (_overlay) _overlay.classList.remove('active');
    // Abandon in-progress game (bet already deducted — server cleans up via TTL)
    _playing = false;
    _gameId  = null;
  }

  window.openHilo  = openHilo;
  window.closeHilo = closeHilo;
  // Alias for existing nav button casing (openHiLo)
  window.openHiLo  = openHilo;
  window.closeHiLo = closeHilo;

}());
