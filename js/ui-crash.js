(function() {
  'use strict';

  var TOKEN_KEY = typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken';

  var _overlay   = null;
  var _stylesInj = false;
  var _gameId    = null;
  var _bet       = 0;
  var _running   = false;   // rocket is flying
  var _animId    = null;
  var _mult      = 1.00;
  var _startTime = 0;
  var _speed     = 0.00035; // mult/ms growth rate (accelerates)

  function getToken() {
    try { return localStorage.getItem(TOKEN_KEY); } catch(e) { return null; }
  }

  function injectStyles() {
    if (_stylesInj) return;
    _stylesInj = true;
    var s = document.createElement('style');
    s.textContent = [
      '#crOverlay{position:fixed;inset:0;background:rgba(0,0,0,.95);z-index:10400;display:none;align-items:center;justify-content:center;font-family:monospace}',
      '#crOverlay.active{display:flex}',
      '#crModal{background:linear-gradient(135deg,#010510,#030d20);border:2px solid rgba(239,68,68,.3);border-radius:20px;padding:18px 20px;max-width:460px;width:96%;text-align:center;max-height:96vh;overflow-y:auto}',
      '#crModal h2{color:#fca5a5;font-size:20px;margin:0 0 2px;letter-spacing:2px}',
      '#crModal .cr-sub{color:rgba(255,255,255,.35);font-size:11px;margin-bottom:12px}',
      '#crCanvas{display:block;margin:0 auto 12px;border-radius:12px;background:#010510;border:1px solid rgba(239,68,68,.15)}',
      '.cr-mult-display{font-size:42px;font-weight:900;color:#f97316;margin:-4px 0 8px;letter-spacing:-1px;text-shadow:0 0 20px rgba(249,115,22,.5);transition:color .2s}',
      '.cr-mult-display.crashed{color:#ef4444;text-shadow:0 0 20px rgba(239,68,68,.8)}',
      '.cr-mult-display.safe{color:#4ade80;text-shadow:0 0 20px rgba(74,222,128,.5)}',
      '.cr-input-row{display:flex;gap:10px;align-items:center;justify-content:center;margin-bottom:10px}',
      '.cr-input-row label{font-size:10px;color:rgba(255,255,255,.35);text-transform:uppercase;letter-spacing:.5px}',
      '.cr-input{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);border-radius:8px;color:#fff;padding:6px 10px;font-size:14px;font-weight:700;width:90px;text-align:center}',
      '.cr-input:focus{outline:none;border-color:rgba(239,68,68,.6)}',
      '.cr-btn-row{display:flex;gap:8px;margin-bottom:8px}',
      '.cr-btn{flex:1;padding:13px 0;border-radius:12px;border:none;font-size:15px;font-weight:900;cursor:pointer;transition:transform .1s,opacity .15s;letter-spacing:.5px}',
      '.cr-btn:hover:not(:disabled){transform:scale(1.02)}',
      '.cr-btn:disabled{opacity:.35;cursor:not-allowed;transform:none}',
      '#crBetBtn{background:linear-gradient(135deg,#7f1d1d,#dc2626);color:#fff;border:1px solid rgba(239,68,68,.5)}',
      '#crCashBtn{background:linear-gradient(135deg,#14532d,#16a34a);color:#fff;border:1px solid rgba(74,222,128,.4)}',
      '#crResult{font-size:14px;font-weight:800;min-height:20px;color:#fca5a5;margin-bottom:8px}',
      '.cr-history{display:flex;gap:4px;justify-content:center;flex-wrap:wrap;margin-bottom:8px;min-height:22px}',
      '.cr-hist-chip{padding:2px 7px;border-radius:12px;font-size:10px;font-weight:800;border:1px solid}',
      '.cr-hist-chip.big{background:rgba(74,222,128,.15);border-color:#4ade80;color:#4ade80}',
      '.cr-hist-chip.med{background:rgba(251,191,36,.1);border-color:#fbbf24;color:#fbbf24}',
      '.cr-hist-chip.low{background:rgba(239,68,68,.1);border-color:#ef4444;color:#ef4444}',
      '#crClose{background:none;border:none;color:rgba(255,255,255,.3);font-size:12px;cursor:pointer;text-decoration:underline}',
    ].join('\n');
    document.head.appendChild(s);
  }

  // ── canvas graph ──────────────────────────────────────────────────────────────

  var CW = 400, CH = 180;
  var _history = []; // recent crash points for history bar

  function drawGraph(crashed) {
    var cv = document.getElementById('crCanvas');
    if (!cv) return;
    var ctx = cv.getContext('2d');
    ctx.clearRect(0, 0, CW, CH);

    // Background grid
    ctx.strokeStyle = 'rgba(255,255,255,.04)';
    ctx.lineWidth = 1;
    for (var gy = 0; gy <= CH; gy += 30) {
      ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(CW, gy); ctx.stroke();
    }

    // Curve
    var elapsed = Date.now() - _startTime;
    var points = Math.max(2, Math.floor(elapsed / 16));
    var maxM   = Math.max(_mult * 1.2, 2);

    ctx.beginPath();
    ctx.moveTo(0, CH);
    for (var i = 0; i <= points; i++) {
      var t  = i / points;
      var m  = 1 + Math.pow(t * (_mult - 1), 0.85); // smooth curve
      var px = (i / points) * CW;
      var py = CH - ((m - 1) / (maxM - 1)) * (CH - 10);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }

    var grad = ctx.createLinearGradient(0, CH, 0, 0);
    if (crashed) {
      grad.addColorStop(0, 'rgba(239,68,68,0)');
      grad.addColorStop(1, 'rgba(239,68,68,.3)');
      ctx.strokeStyle = '#ef4444';
    } else {
      grad.addColorStop(0, 'rgba(249,115,22,0)');
      grad.addColorStop(1, 'rgba(249,115,22,.3)');
      ctx.strokeStyle = '#f97316';
    }
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Rocket emoji at tip
    if (!crashed) {
      var rx = CW - 8;
      var ry = CH - ((_mult - 1) / (maxM - 1)) * (CH - 10);
      ctx.font = '18px monospace';
      ctx.fillText('\uD83D\uDE80', rx - 18, ry + 8);
    } else {
      var ex = CW - 8;
      var ey = CH - ((_mult - 1) / (maxM - 1)) * (CH - 10);
      ctx.font = '18px monospace';
      ctx.fillText('\uD83D\uDCA5', ex - 18, ey + 8);
    }
  }

  function updateMultDisplay(crashed, safe) {
    var el = document.getElementById('crMultDisplay');
    if (!el) return;
    el.textContent = _mult.toFixed(2) + 'x';
    el.className = 'cr-mult-display' + (crashed ? ' crashed' : safe ? ' safe' : '');
  }

  // ── animation loop ────────────────────────────────────────────────────────────

  function tick() {
    var elapsed = Date.now() - _startTime;
    // Exponential growth: mult = e^(speed * elapsed) — smooth climb
    _mult = parseFloat(Math.exp(_speed * elapsed).toFixed(4));
    updateMultDisplay(false, false);
    drawGraph(false);
    _animId = requestAnimationFrame(tick);
  }

  function stopAnim() {
    if (_animId) { cancelAnimationFrame(_animId); _animId = null; }
  }

  // ── history bar ───────────────────────────────────────────────────────────────

  function addHistory(crashAt) {
    _history.unshift(crashAt);
    if (_history.length > 10) _history.pop();
    var bar = document.getElementById('crHistory');
    if (!bar) return;
    bar.innerHTML = '';
    _history.forEach(function(v) {
      var chip = document.createElement('div');
      var cls  = v >= 5 ? 'big' : v >= 2 ? 'med' : 'low';
      chip.className = 'cr-hist-chip ' + cls;
      chip.textContent = v.toFixed(2) + 'x';
      bar.appendChild(chip);
    });
  }

  // ── bet / cashout / crash ─────────────────────────────────────────────────────

  function setResult(txt, col) {
    var el = document.getElementById('crResult');
    if (!el) return;
    el.textContent = txt;
    el.style.color = col || '#fca5a5';
  }

  function setBetBtn(enabled) {
    var b = document.getElementById('crBetBtn');
    if (b) b.disabled = !enabled;
  }

  function setCashBtn(visible, enabled) {
    var b = document.getElementById('crCashBtn');
    if (!b) return;
    b.style.display = visible ? '' : 'none';
    b.disabled = !enabled;
  }

  function doBet() {
    if (_running) return;
    var token = getToken();
    if (!token) { setResult('Please log in to play.', '#f87171'); return; }
    var inp = document.getElementById('crBetInput');
    var bet = inp ? parseFloat(inp.value) : 1.00;
    if (isNaN(bet) || bet < 0.25) bet = 0.25;

    setBetBtn(false);
    setCashBtn(false, false);
    setResult('Launching\u2026', '#fca5a5');

    fetch('/api/crash/bet', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ bet: bet }),
    })
    .then(function(r) { return r.ok ? r.json() : r.json().then(function(e) { throw e; }); })
    .then(function(data) {
      _gameId    = data.gameId;
      _bet       = bet;
      _mult      = 1.00;
      _running   = true;
      _startTime = Date.now();
      _speed     = 0.00035;

      setCashBtn(true, true);
      setResult('', '');
      updateMultDisplay(false, false);
      tick();
    })
    .catch(function(err) {
      setBetBtn(true);
      setCashBtn(false, false);
      setResult((err && err.error) || 'Error \u2014 check balance.', '#f87171');
    });
  }

  function doCashout() {
    if (!_running || !_gameId) return;
    var token = getToken();
    if (!token) return;

    var cashMult = _mult; // snapshot current multiplier
    stopAnim();
    _running = false;
    setCashBtn(true, false); // keep visible but disabled

    fetch('/api/crash/cashout', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameId: _gameId, mult: cashMult }),
    })
    .then(function(r) { return r.ok ? r.json() : r.json().then(function(e) { throw e; }); })
    .then(function(data) {
      if (typeof window.updateBalance === 'function' && data.newBalance != null) {
        window.updateBalance(data.newBalance);
      }

      addHistory(data.crashAt);
      _mult = cashMult;
      updateMultDisplay(false, true);
      drawGraph(false);
      setCashBtn(false, false);
      setBetBtn(true);
      _gameId = null;

      if (data.result === 'crash') {
        // Edge case: server says already crashed
        _mult = data.crashAt;
        updateMultDisplay(true, false);
        drawGraph(true);
        setResult('\uD83D\uDCA5 Crashed at ' + data.crashAt + 'x \u2014 -$' + Math.abs(data.profit).toFixed(2), '#ef4444');
      } else {
        setResult('\uD83D\uDE80 Cashed out at ' + cashMult.toFixed(2) + 'x \u2014 +$' + data.profit.toFixed(2), '#4ade80');
      }
    })
    .catch(function(err) {
      _running = false;
      setBetBtn(true);
      setCashBtn(false, false);
      setResult((err && err.error) || 'Error.', '#f87171');
    });
  }

  // Auto-crash: simulate crash detection by polling server after a delay
  // (Real implementation: client rides animation; server validates on cashout)
  // For single-player mode, we let the client run and validate on cashout.
  // If player never cashes out, we call /result after they hit the "Crashed!" button.

  function doCrashReveal() {
    if (!_gameId) return;
    var token = getToken();
    if (!token) return;

    stopAnim();
    _running = false;
    setCashBtn(false, false);

    fetch('/api/crash/result', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameId: _gameId }),
    })
    .then(function(r) { return r.ok ? r.json() : r.json().then(function(e) { throw e; }); })
    .then(function(data) {
      if (typeof window.updateBalance === 'function' && data.newBalance != null) {
        window.updateBalance(data.newBalance);
      }
      addHistory(data.crashAt);
      _mult = data.crashAt;
      updateMultDisplay(true, false);
      drawGraph(true);
      setBetBtn(true);
      _gameId = null;
      setResult('\uD83D\uDCA5 Crashed at ' + data.crashAt + 'x \u2014 -$' + Math.abs(data.profit).toFixed(2), '#ef4444');
    })
    .catch(function(err) {
      setBetBtn(true);
      setResult((err && err.error) || 'Error.', '#f87171');
    });
  }

  // ── modal build ───────────────────────────────────────────────────────────────

  function buildModal() {
    if (_overlay) return;
    _overlay = document.createElement('div');
    _overlay.id = 'crOverlay';

    var modal = document.createElement('div');
    modal.id = 'crModal';

    var icon = document.createElement('div');
    icon.style.cssText = 'font-size:28px;margin-bottom:2px';
    icon.textContent = '\uD83D\uDE80';
    modal.appendChild(icon);

    var h2 = document.createElement('h2');
    h2.textContent = 'CRASH';
    modal.appendChild(h2);

    var sub = document.createElement('div');
    sub.className = 'cr-sub';
    sub.textContent = 'Watch the multiplier climb \u2014 cash out before it crashes!';
    modal.appendChild(sub);

    // Canvas
    var canvas = document.createElement('canvas');
    canvas.id = 'crCanvas';
    canvas.width = CW; canvas.height = CH;
    canvas.style.width = '360px';
    canvas.style.height = Math.round(CH * 360 / CW) + 'px';
    modal.appendChild(canvas);

    // Multiplier display
    var multEl = document.createElement('div');
    multEl.className = 'cr-mult-display';
    multEl.id = 'crMultDisplay';
    multEl.textContent = '1.00x';
    modal.appendChild(multEl);

    // History bar
    var hist = document.createElement('div');
    hist.className = 'cr-history';
    hist.id = 'crHistory';
    modal.appendChild(hist);

    // Bet input
    var betRow = document.createElement('div');
    betRow.className = 'cr-input-row';
    var lbl = document.createElement('label');
    lbl.textContent = 'Bet ($)';
    lbl.htmlFor = 'crBetInput';
    var inp = document.createElement('input');
    inp.id = 'crBetInput'; inp.className = 'cr-input';
    inp.type = 'number'; inp.min = '0.25'; inp.max = '500'; inp.step = '0.25'; inp.value = '5.00';
    betRow.appendChild(lbl);
    betRow.appendChild(inp);
    modal.appendChild(betRow);

    // Bet / Cashout buttons
    var btnRow = document.createElement('div');
    btnRow.className = 'cr-btn-row';
    var betBtn = document.createElement('button');
    betBtn.id = 'crBetBtn';
    betBtn.className = 'cr-btn';
    betBtn.textContent = '\uD83D\uDE80 Bet & Launch';
    betBtn.addEventListener('click', doBet);
    var cashBtn = document.createElement('button');
    cashBtn.id = 'crCashBtn';
    cashBtn.className = 'cr-btn';
    cashBtn.textContent = '\uD83D\uDCB0 Cash Out';
    cashBtn.style.display = 'none';
    cashBtn.addEventListener('click', doCashout);
    btnRow.appendChild(betBtn);
    btnRow.appendChild(cashBtn);
    modal.appendChild(btnRow);

    // Crash reveal button (shown when running, as manual crash sim)
    var crashRow = document.createElement('div');
    crashRow.className = 'cr-btn-row';
    var crashBtn = document.createElement('button');
    crashBtn.id = 'crCrashBtn';
    crashBtn.className = 'cr-btn';
    crashBtn.style.cssText = 'background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.15);color:rgba(255,255,255,.4);font-size:11px;padding:7px 0';
    crashBtn.textContent = '\uD83D\uDCA5 Simulate Crash (reveal crash point)';
    crashBtn.addEventListener('click', function() {
      if (_gameId) doCrashReveal();
    });
    crashRow.appendChild(crashBtn);
    modal.appendChild(crashRow);

    // Result
    var resultEl = document.createElement('div');
    resultEl.id = 'crResult';
    resultEl.textContent = 'Place your bet and launch the rocket!';
    resultEl.style.color = '#fca5a5';
    modal.appendChild(resultEl);

    var closeBtn = document.createElement('button');
    closeBtn.id = 'crClose';
    closeBtn.textContent = 'Close';
    closeBtn.addEventListener('click', closeCrash);
    modal.appendChild(closeBtn);

    _overlay.appendChild(modal);
    _overlay.addEventListener('click', function(e) { if (e.target === _overlay) closeCrash(); });
    document.body.appendChild(_overlay);
  }

  // ── public API ────────────────────────────────────────────────────────────────

  function openCrash() {
    injectStyles();
    buildModal();
    _overlay.classList.add('active');
    setResult('Place your bet and launch the rocket!', '#fca5a5');
    // Draw initial empty canvas
    requestAnimationFrame(function() {
      var cv = document.getElementById('crCanvas');
      if (cv) {
        var ctx = cv.getContext('2d');
        ctx.fillStyle = '#010510';
        ctx.fillRect(0, 0, CW, CH);
      }
    });
  }

  function closeCrash() {
    stopAnim();
    _running = false;
    if (_overlay) _overlay.classList.remove('active');
  }

  window.openCrash  = openCrash;
  window.closeCrash = closeCrash;

}());
