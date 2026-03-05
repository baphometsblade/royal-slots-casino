(function() {
  'use strict';

  var TOKEN_KEY = typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken';

  var _overlay     = null;
  var _stylesInj   = false;
  var _rafId       = null;       // requestAnimationFrame handle
  var _gameActive  = false;
  var _bet         = 1.00;
  var _startTime   = null;       // ms timestamp from Date.now()
  var _crashTimeMs = null;       // ms at which crash occurs
  var _crashPoint  = null;       // crash multiplier
  var _cashedOut   = false;
  var _crashed     = false;

  // Growth constant must match server: e^(0.07 * t_seconds)
  var GROWTH_K = 0.07;

  function getToken() {
    try { return localStorage.getItem(TOKEN_KEY); } catch(e) { return null; }
  }

  function currentMultiplier() {
    if (!_startTime) return 1.0;
    var elapsedS = (Date.now() - _startTime) / 1000;
    return Math.exp(GROWTH_K * elapsedS);
  }

  // ── Styles ────────────────────────────────────────────────────────────────

  function injectStyles() {
    if (_stylesInj) return;
    _stylesInj = true;
    var s = document.createElement('style');
    s.textContent = [
      '#crashOverlay{position:fixed;inset:0;background:rgba(0,0,0,.92);z-index:20100;display:none;align-items:center;justify-content:center}',
      '#crashOverlay.active{display:flex}',
      '#crashModal{background:linear-gradient(135deg,#040411,#0d1120);border:2px solid rgba(99,102,241,.3);border-radius:20px;padding:24px 28px;max-width:460px;width:96%;text-align:center;font-family:monospace}',
      '#crashModal h2{color:#818cf8;font-size:20px;margin:0 0 4px;letter-spacing:2px}',
      '#crashModal .cr-sub{color:rgba(255,255,255,.35);font-size:12px;margin-bottom:20px}',

      /* Canvas / multiplier display */
      '#crashCanvas{width:100%;height:160px;border-radius:12px;background:#070714;margin-bottom:14px;display:block}',

      '#crashMultiplier{font-size:52px;font-weight:900;color:#a5f3fc;letter-spacing:-1px;line-height:1;margin-bottom:6px;transition:color .1s}',
      '#crashMultiplier.crashed{color:#f87171;animation:crShake .4s ease}',
      '#crashMultiplier.won{color:#4ade80}',
      '@keyframes crShake{0%,100%{transform:translateX(0)}20%{transform:translateX(-6px)}40%{transform:translateX(6px)}60%{transform:translateX(-4px)}80%{transform:translateX(4px)}}',

      '#crashStatus{font-size:14px;font-weight:700;min-height:20px;color:rgba(255,255,255,.5);margin-bottom:16px}',

      /* Bet row */
      '.cr-bet-row{display:flex;gap:10px;align-items:flex-end;justify-content:center;margin-bottom:16px;flex-wrap:wrap}',
      '.cr-bet-group{display:flex;flex-direction:column;align-items:flex-start;gap:4px}',
      '.cr-bet-group label{font-size:11px;color:rgba(255,255,255,.35);text-transform:uppercase;letter-spacing:.5px}',
      '.cr-input{background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.14);border-radius:8px;color:#fff;padding:9px 14px;font-size:15px;font-weight:700;width:110px;text-align:center}',
      '.cr-input:focus{outline:none;border-color:rgba(99,102,241,.6)}',

      /* Quick-bet buttons */
      '.cr-quick{display:flex;gap:6px;justify-content:center;flex-wrap:wrap;margin-bottom:14px}',
      '.cr-qbtn{background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.13);border-radius:7px;color:rgba(255,255,255,.6);padding:5px 10px;font-size:12px;font-weight:700;cursor:pointer;transition:all .12s}',
      '.cr-qbtn:hover{background:rgba(99,102,241,.2);border-color:rgba(99,102,241,.5);color:#c7d2fe}',

      /* Action buttons */
      '#crashStartBtn{background:linear-gradient(135deg,#4f46e5,#312e81);color:#fff;border:none;padding:14px 0;border-radius:12px;font-size:16px;font-weight:900;cursor:pointer;width:100%;margin-bottom:8px;letter-spacing:.5px;transition:transform .1s}',
      '#crashStartBtn:hover{transform:scale(1.02)}',
      '#crashStartBtn:disabled{opacity:.4;cursor:not-allowed;transform:none}',
      '#crashCashoutBtn{background:linear-gradient(135deg,#d97706,#92400e);color:#fff;border:none;padding:13px 0;border-radius:12px;font-size:16px;font-weight:900;cursor:pointer;width:100%;margin-bottom:8px;display:none;animation:crPulse 1s ease infinite}',
      '@keyframes crPulse{0%,100%{box-shadow:0 0 0 0 rgba(251,191,36,.4)}50%{box-shadow:0 0 0 8px rgba(251,191,36,0)}}',
      '#crashCashoutBtn:hover{animation:none;transform:scale(1.03);filter:brightness(1.15)}',
      '#crashCashoutBtn:disabled{animation:none;opacity:.4;cursor:not-allowed}',

      '#crashClose{background:none;border:none;color:rgba(255,255,255,.25);font-size:12px;cursor:pointer;text-decoration:underline}',

      /* History pills */
      '#crashHistory{display:flex;gap:5px;flex-wrap:wrap;justify-content:center;margin-bottom:14px;min-height:26px}',
      '.cr-hist{font-size:11px;font-weight:800;padding:3px 8px;border-radius:20px;color:#fff}',
      '.cr-hist.low{background:rgba(239,68,68,.35)}',
      '.cr-hist.mid{background:rgba(251,191,36,.3);color:#fde68a}',
      '.cr-hist.high{background:rgba(74,222,128,.3);color:#86efac}',
    ].join('\n');
    document.head.appendChild(s);
  }

  // ── Canvas graph ──────────────────────────────────────────────────────────

  var _canvasPoints = []; // [{t, m}] normalized 0..1

  function drawCanvas() {
    var canvas = document.getElementById('crashCanvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    if (!ctx) return;
    var W = canvas.width  = canvas.offsetWidth;
    var H = canvas.height = canvas.offsetHeight;

    ctx.clearRect(0, 0, W, H);

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,.04)';
    ctx.lineWidth = 1;
    for (var gy = 0; gy < 4; gy++) {
      var y = H * gy / 4;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    if (_canvasPoints.length < 2) return;

    // Gradient fill
    var grad = ctx.createLinearGradient(0, 0, 0, H);
    if (_crashed) {
      grad.addColorStop(0, 'rgba(239,68,68,.3)');
      grad.addColorStop(1, 'rgba(239,68,68,.0)');
    } else {
      grad.addColorStop(0, 'rgba(165,243,252,.2)');
      grad.addColorStop(1, 'rgba(165,243,252,.0)');
    }

    // Scale: max multiplier seen or crash point
    var maxM = _crashPoint || 2.0;
    for (var pi = 0; pi < _canvasPoints.length; pi++) {
      if (_canvasPoints[pi].m > maxM) maxM = _canvasPoints[pi].m;
    }
    maxM = Math.max(maxM * 1.1, 1.5);

    var totalT = _canvasPoints[_canvasPoints.length - 1].t;
    if (totalT <= 0) totalT = 1;

    function px(t) { return (t / totalT) * W; }
    function py(m) { return H - (((m - 1) / (maxM - 1)) * H * 0.85 + H * 0.05); }

    // Fill area
    ctx.beginPath();
    ctx.moveTo(px(_canvasPoints[0].t), H);
    for (var i = 0; i < _canvasPoints.length; i++) {
      ctx.lineTo(px(_canvasPoints[i].t), py(_canvasPoints[i].m));
    }
    ctx.lineTo(px(_canvasPoints[_canvasPoints.length - 1].t), H);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Line
    ctx.beginPath();
    ctx.moveTo(px(_canvasPoints[0].t), py(_canvasPoints[0].m));
    for (var j = 1; j < _canvasPoints.length; j++) {
      ctx.lineTo(px(_canvasPoints[j].t), py(_canvasPoints[j].m));
    }
    ctx.strokeStyle = _crashed ? '#f87171' : '#a5f3fc';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Dot at tip
    var last = _canvasPoints[_canvasPoints.length - 1];
    ctx.beginPath();
    ctx.arc(px(last.t), py(last.m), 5, 0, Math.PI * 2);
    ctx.fillStyle = _crashed ? '#f87171' : '#a5f3fc';
    ctx.fill();
  }

  // ── Animation loop ────────────────────────────────────────────────────────

  function tick() {
    if (!_gameActive || _cashedOut || _crashed) return;

    var elapsed = Date.now() - _startTime;
    var mult    = Math.exp(GROWTH_K * elapsed / 1000);

    // Record canvas point every ~100ms
    if (_canvasPoints.length === 0 || elapsed - _canvasPoints[_canvasPoints.length - 1].t > 80) {
      _canvasPoints.push({ t: elapsed, m: mult });
    }

    // Update display
    var el = document.getElementById('crashMultiplier');
    if (el) el.textContent = mult.toFixed(2) + 'x';
    drawCanvas();

    // Check if we've passed the crash point
    if (_crashTimeMs !== null && elapsed >= _crashTimeMs) {
      onCrash();
      return;
    }

    _rafId = requestAnimationFrame(tick);
  }

  function onCrash() {
    _gameActive = false;
    _crashed    = true;
    cancelAnimationFrame(_rafId);

    // Final canvas point at crash
    if (_crashTimeMs !== null) {
      _canvasPoints.push({ t: _crashTimeMs, m: _crashPoint });
    }
    drawCanvas();

    var el = document.getElementById('crashMultiplier');
    if (el) {
      el.textContent = _crashPoint.toFixed(2) + 'x';
      el.className = 'crashed';
    }
    setStatus('\uD83D\uDCA5 CRASHED at ' + _crashPoint.toFixed(2) + 'x!', '#f87171');
    showCashout(false);
    showStart(true);
    addHistoryPill(_crashPoint, false);
  }

  // ── History ───────────────────────────────────────────────────────────────

  var _history = [];

  function addHistoryPill(mult, won) {
    _history.unshift({ mult: mult, won: won });
    if (_history.length > 10) _history.pop();
    var container = document.getElementById('crashHistory');
    if (!container) return;
    while (container.firstChild) container.removeChild(container.firstChild);
    for (var i = 0; i < _history.length; i++) {
      var pill = document.createElement('span');
      pill.className = 'cr-hist ' + (
        _history[i].mult < 1.5 ? 'low' :
        _history[i].mult < 3.0 ? 'mid' : 'high'
      );
      pill.textContent = _history[i].mult.toFixed(2) + 'x';
      container.appendChild(pill);
    }
  }

  // ── UI helpers ────────────────────────────────────────────────────────────

  function setStatus(text, color) {
    var el = document.getElementById('crashStatus');
    if (!el) return;
    el.textContent = text;
    el.style.color = color || 'rgba(255,255,255,.5)';
  }

  function setMultDisplay(val, cls) {
    var el = document.getElementById('crashMultiplier');
    if (!el) return;
    el.textContent = val;
    el.className = cls || '';
  }

  function showCashout(show) {
    var el = document.getElementById('crashCashoutBtn');
    if (el) el.style.display = show ? 'block' : 'none';
  }

  function showStart(show) {
    var el = document.getElementById('crashStartBtn');
    if (el) el.style.display = show ? 'block' : 'none';
  }

  // ── Game actions ──────────────────────────────────────────────────────────

  function doStart() {
    var token = getToken();
    if (!token) { setStatus('Please log in to play.', '#f87171'); return; }

    var betInput = document.getElementById('crashBetInput');
    var betVal   = betInput ? parseFloat(betInput.value) : 1.00;
    if (isNaN(betVal) || betVal < 0.10) betVal = 0.10;
    _bet = betVal;

    var startBtn = document.getElementById('crashStartBtn');
    if (startBtn) { startBtn.disabled = true; startBtn.textContent = 'Launching\u2026'; }

    setStatus('Starting\u2026', 'rgba(255,255,255,.4)');
    setMultDisplay('1.00x', '');

    fetch('/api/crash/start', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ bet: _bet }),
    })
    .then(function(r) { return r.ok ? r.json() : r.json().then(function(e) { throw e; }); })
    .then(function(data) {
      _gameActive  = true;
      _cashedOut   = false;
      _crashed     = false;
      _startTime   = data.startTime || Date.now();
      _crashTimeMs = data.crashTimeMs;
      _crashPoint  = data.crashPoint;
      _canvasPoints = [{ t: 0, m: 1.0 }];

      if (startBtn) { startBtn.disabled = false; startBtn.textContent = '\uD83D\uDE80 Start'; }
      showStart(false);
      showCashout(true);
      setStatus('\uD83D\uDE80 Rocket launched! Cash out before it crashes!', '#a5f3fc');

      if (typeof window.updateBalance === 'function' && data.newBalance != null) {
        window.updateBalance(data.newBalance);
      }

      _rafId = requestAnimationFrame(tick);
    })
    .catch(function(err) {
      if (startBtn) { startBtn.disabled = false; startBtn.textContent = '\uD83D\uDE80 Start'; }
      setStatus((err && err.error) || 'Failed to start. Check your balance.', '#f87171');
      showStart(true);
    });
  }

  function doCashout() {
    var token = getToken();
    if (!token || !_gameActive || _cashedOut || _crashed) return;

    _cashedOut = true;
    cancelAnimationFrame(_rafId);

    var cashoutBtn = document.getElementById('crashCashoutBtn');
    if (cashoutBtn) { cashoutBtn.disabled = true; cashoutBtn.textContent = 'Cashing out\u2026'; }

    fetch('/api/crash/cashout', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: '{}',
    })
    .then(function(r) { return r.ok ? r.json() : r.json().then(function(e) { throw e; }); })
    .then(function(data) {
      if (cashoutBtn) { cashoutBtn.disabled = false; }
      _gameActive = false;

      if (data.crashed) {
        // Narrowly missed
        _crashed = true;
        var el = document.getElementById('crashMultiplier');
        if (el) {
          el.textContent = data.crashPoint.toFixed(2) + 'x';
          el.className = 'crashed';
        }
        setStatus('\uD83D\uDCA5 Too late! Crashed at ' + data.crashPoint.toFixed(2) + 'x', '#f87171');
        addHistoryPill(data.crashPoint, false);
      } else {
        var mult = data.cashoutMultiplier;
        setMultDisplay(mult.toFixed(2) + 'x', 'won');
        setStatus('\u2705 Cashed out at ' + mult.toFixed(2) + 'x! Won $' + parseFloat(data.payout).toFixed(2), '#4ade80');
        addHistoryPill(data.crashPoint, true);
        if (typeof window.updateBalance === 'function' && data.newBalance != null) {
          window.updateBalance(data.newBalance);
        }
      }

      // Animate crash line to end
      if (_crashTimeMs !== null && _crashPoint !== null) {
        _canvasPoints.push({ t: _crashTimeMs, m: _crashPoint });
      }
      _crashed = true;
      drawCanvas();
      showCashout(false);
      showStart(true);
    })
    .catch(function(err) {
      _cashedOut = false;
      if (cashoutBtn) { cashoutBtn.disabled = false; }
      setStatus((err && err.error) || 'Cashout error', '#f87171');
      // Resume animation
      _rafId = requestAnimationFrame(tick);
    });
  }

  // ── Modal build ───────────────────────────────────────────────────────────

  function buildModal() {
    if (_overlay) return;
    _overlay = document.createElement('div');
    _overlay.id = 'crashOverlay';

    var modal = document.createElement('div');
    modal.id = 'crashModal';

    // Header
    var icon = document.createElement('div');
    icon.style.cssText = 'font-size:32px;margin-bottom:4px';
    icon.textContent = '\uD83D\uDE80';
    modal.appendChild(icon);

    var h2 = document.createElement('h2');
    h2.textContent = 'CRASH';
    modal.appendChild(h2);

    var sub = document.createElement('div');
    sub.className = 'cr-sub';
    sub.textContent = 'Rocket launches — multiplier grows. Cash out before it crashes!';
    modal.appendChild(sub);

    // Canvas chart
    var canvas = document.createElement('canvas');
    canvas.id = 'crashCanvas';
    modal.appendChild(canvas);

    // Multiplier display
    var multEl = document.createElement('div');
    multEl.id = 'crashMultiplier';
    multEl.textContent = '1.00x';
    modal.appendChild(multEl);

    // Status
    var status = document.createElement('div');
    status.id = 'crashStatus';
    status.textContent = 'Set your bet and launch!';
    modal.appendChild(status);

    // History
    var history = document.createElement('div');
    history.id = 'crashHistory';
    modal.appendChild(history);

    // Bet row
    var betRow = document.createElement('div');
    betRow.className = 'cr-bet-row';

    var betGroup = document.createElement('div');
    betGroup.className = 'cr-bet-group';

    var betLabel = document.createElement('label');
    betLabel.textContent = 'Bet ($)';

    var betInput = document.createElement('input');
    betInput.id = 'crashBetInput';
    betInput.className = 'cr-input';
    betInput.type = 'number';
    betInput.min = '0.10';
    betInput.max = '500';
    betInput.step = '0.50';
    betInput.value = '1.00';

    betGroup.appendChild(betLabel);
    betGroup.appendChild(betInput);
    betRow.appendChild(betGroup);
    modal.appendChild(betRow);

    // Quick bet buttons
    var quick = document.createElement('div');
    quick.className = 'cr-quick';
    var amounts = ['0.50', '1', '5', '10', '25', '100'];
    for (var qi = 0; qi < amounts.length; qi++) {
      (function(amt) {
        var btn = document.createElement('button');
        btn.className = 'cr-qbtn';
        btn.textContent = '$' + amt;
        btn.addEventListener('click', function() {
          if (!_gameActive) {
            var inp = document.getElementById('crashBetInput');
            if (inp) inp.value = amt;
          }
        });
        quick.appendChild(btn);
      })(amounts[qi]);
    }
    modal.appendChild(quick);

    // Cashout button (hidden by default)
    var cashoutBtn = document.createElement('button');
    cashoutBtn.id = 'crashCashoutBtn';
    cashoutBtn.textContent = '\uD83D\uDCB0 CASH OUT';
    cashoutBtn.addEventListener('click', doCashout);
    modal.appendChild(cashoutBtn);

    // Start button
    var startBtn = document.createElement('button');
    startBtn.id = 'crashStartBtn';
    startBtn.textContent = '\uD83D\uDE80 Start';
    startBtn.addEventListener('click', doStart);
    modal.appendChild(startBtn);

    // Close
    var closeBtn = document.createElement('button');
    closeBtn.id = 'crashClose';
    closeBtn.textContent = 'Close';
    closeBtn.addEventListener('click', closeCrashGame);
    modal.appendChild(closeBtn);

    _overlay.appendChild(modal);
    _overlay.addEventListener('click', function(e) {
      if (e.target === _overlay) closeCrashGame();
    });
    document.body.appendChild(_overlay);
  }

  // ── Public API ────────────────────────────────────────────────────────────

  function openCrashGame() {
    injectStyles();
    buildModal();
    _overlay.classList.add('active');
    // Draw empty canvas
    requestAnimationFrame(drawCanvas);
  }

  function closeCrashGame() {
    if (_gameActive) {
      cancelAnimationFrame(_rafId);
      _gameActive = false;
    }
    if (_overlay) _overlay.classList.remove('active');
  }

  window.openCrashGame  = openCrashGame;
  window.closeCrashGame = closeCrashGame;

}());
