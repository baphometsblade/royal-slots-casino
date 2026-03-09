(function() {
  'use strict';

  var TOKEN_KEY = typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken';

  var _overlay    = null;
  var _stylesInj  = false;
  var _spinning   = false;
  var _segments   = null;   // loaded from /api/wheel/segments once
  var _currentDeg = 0;      // tracks cumulative rotation so wheel doesn't reset

  function getToken() {
    try { return localStorage.getItem(TOKEN_KEY); } catch(e) { return null; }
  }

  function injectStyles() {
    if (_stylesInj) return;
    _stylesInj = true;
    var s = document.createElement('style');
    s.textContent = [
      '#wofOverlay{position:fixed;inset:0;background:rgba(0,0,0,.93);z-index:10400;display:none;align-items:center;justify-content:center;font-family:monospace}',
      '#wofOverlay.active{display:flex}',
      '#wofModal{background:linear-gradient(135deg,#0c0a1e,#140a2e);border:2px solid rgba(217,119,6,.4);border-radius:20px;padding:20px 22px;max-width:420px;width:96%;text-align:center;max-height:96vh;overflow-y:auto}',
      '#wofModal h2{color:#fbbf24;font-size:20px;margin:0 0 2px;letter-spacing:2px}',
      '#wofModal .wof-sub{color:rgba(255,255,255,.35);font-size:11px;margin-bottom:14px}',
      '.wof-wheel-wrap{position:relative;width:240px;height:240px;margin:0 auto 14px;user-select:none}',
      '#wofCanvas{width:240px;height:240px;border-radius:50%;border:4px solid rgba(217,119,6,.5);box-shadow:0 0 20px rgba(217,119,6,.3);transition:transform 4s cubic-bezier(.17,.67,.12,1)}',
      '.wof-pointer{position:absolute;top:-14px;left:50%;transform:translateX(-50%);font-size:24px;line-height:1;filter:drop-shadow(0 2px 4px rgba(0,0,0,.8))}',
      '.wof-center{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:36px;height:36px;border-radius:50%;background:radial-gradient(circle,#fbbf24,#d97706);border:3px solid rgba(255,255,255,.3);box-shadow:0 0 10px rgba(217,119,6,.6)}',
      '.wof-odds{display:flex;flex-wrap:wrap;gap:4px;justify-content:center;margin-bottom:12px}',
      '.wof-odd-pill{font-size:9px;font-weight:800;border-radius:5px;padding:2px 7px;letter-spacing:.3px}',
      '.wof-input-row{display:flex;gap:10px;align-items:center;justify-content:center;margin-bottom:12px}',
      '.wof-input-row label{font-size:10px;color:rgba(255,255,255,.35);text-transform:uppercase;letter-spacing:.5px}',
      '.wof-input{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);border-radius:8px;color:#fff;padding:7px 10px;font-size:14px;font-weight:700;width:90px;text-align:center}',
      '.wof-input:focus{outline:none;border-color:rgba(251,191,36,.6)}',
      '#wofSpinBtn{background:linear-gradient(135deg,#92400e,#b45309);color:#fff;border:1px solid rgba(217,119,6,.5);padding:13px 0;border-radius:12px;font-size:16px;font-weight:900;cursor:pointer;width:100%;margin-bottom:6px;letter-spacing:.5px;transition:transform .1s}',
      '#wofSpinBtn:hover:not(:disabled){transform:scale(1.02)}',
      '#wofSpinBtn:disabled{opacity:.4;cursor:not-allowed;transform:none}',
      '#wofResult{font-size:15px;font-weight:800;min-height:22px;color:#a5b4fc;margin-bottom:8px}',
      '#wofClose{background:none;border:none;color:rgba(255,255,255,.3);font-size:12px;cursor:pointer;text-decoration:underline}',
    ].join('\n');
    document.head.appendChild(s);
  }

  // ── wheel drawing ────────────────────────────────────────────────────────────

  function drawWheel(canvas, segments) {
    var ctx = canvas.getContext('2d');
    var n   = segments.length;
    var cx  = canvas.width / 2;
    var cy  = canvas.height / 2;
    var r   = cx - 2;
    var arc = (2 * Math.PI) / n;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (var i = 0; i < n; i++) {
      var start = i * arc - Math.PI / 2;
      var end   = start + arc;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, start, end);
      ctx.closePath();
      ctx.fillStyle = segments[i].color;
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,.3)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Label text
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(i * arc + arc / 2 - Math.PI / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 9px monospace';
      ctx.fillText(segments[i].label, r - 6, 3);
      ctx.restore();
    }
  }

  function getSegments(cb) {
    if (_segments) { cb(_segments); return; }
    fetch('/api/wheel/segments')
      .then(function(r) { return r.json(); })
      .then(function(data) {
        _segments = data.segments;
        cb(_segments);
      })
      .catch(function() { cb(null); });
  }

  // ── spin ─────────────────────────────────────────────────────────────────────

  function setResult(text, color) {
    var el = document.getElementById('wofResult');
    if (!el) return;
    el.textContent = text;
    el.style.color = color || '#a5b4fc';
  }

  function doSpin() {
    if (_spinning) return;
    var token = getToken();
    if (!token) { setResult('Please log in to play.', '#f87171'); return; }

    var betInput = document.getElementById('wofBetInput');
    var betVal   = betInput ? parseFloat(betInput.value) : 5.00;
    if (isNaN(betVal) || betVal < 0.25) betVal = 0.25;

    _spinning = true;
    var spinBtn = document.getElementById('wofSpinBtn');
    if (spinBtn) { spinBtn.disabled = true; spinBtn.textContent = 'Spinning\u2026'; }
    setResult('', '');

    fetch('/api/wheel/play', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ bet: betVal }),
    })
    .then(function(r) { return r.ok ? r.json() : r.json().then(function(e) { throw e; }); })
    .then(function(data) {
      // Animate to the correct segment
      var n          = data.totalSegments;
      var segDeg     = 360 / n;
      // Pointer is at top (0°). Segment i starts at i*segDeg - 90° in canvas coords.
      // We want segment i to land under the pointer:
      // target rotation = 360*spins - (segDeg * idx + segDeg/2)
      var spins      = 5 + Math.floor(Math.random() * 3);
      var targetStop = segDeg * data.segmentIndex + segDeg / 2;
      var newDeg     = _currentDeg + 360 * spins + (360 - ((_currentDeg % 360) + targetStop) % 360);
      _currentDeg    = newDeg;

      var canvas = document.getElementById('wofCanvas');
      if (canvas) canvas.style.transform = 'rotate(' + _currentDeg + 'deg)';

      // Show result after animation (4s transition)
      setTimeout(function() {
        _spinning = false;
        if (spinBtn) { spinBtn.disabled = false; spinBtn.textContent = '\uD83C\uDFB0 Spin!'; }

        if (typeof window.updateBalance === 'function' && data.newBalance != null) {
          window.updateBalance(data.newBalance);
        }

        var msg, color;
        if (data.multiplier === 0) {
          msg   = '\uD83D\uDCA5 No win — better luck next spin!';
          color = '#f87171';
        } else if (data.multiplier >= 10) {
          msg   = '\uD83C\uDF89 JACKPOT ' + data.multiplier + 'x! +$' + data.profit.toFixed(2);
          color = '#fbbf24';
        } else {
          msg   = '\uD83C\uDF89 ' + data.multiplier + 'x! +$' + data.profit.toFixed(2);
          color = '#4ade80';
        }
        setResult(msg, color);
      }, 4200);
    })
    .catch(function(err) {
      _spinning = false;
      if (spinBtn) { spinBtn.disabled = false; spinBtn.textContent = '\uD83C\uDFB0 Spin!'; }
      setResult((err && err.error) || 'Error \u2014 check balance.', '#f87171');
    });
  }

  // ── modal build ──────────────────────────────────────────────────────────────

  function buildModal() {
    if (_overlay) return;
    _overlay = document.createElement('div');
    _overlay.id = 'wofOverlay';

    var modal = document.createElement('div');
    modal.id = 'wofModal';

    var icon = document.createElement('div');
    icon.style.cssText = 'font-size:30px;margin-bottom:2px';
    icon.textContent = '\uD83C\uDFB0';
    modal.appendChild(icon);

    var h2 = document.createElement('h2');
    h2.textContent = 'WHEEL OF FORTUNE';
    modal.appendChild(h2);

    var sub = document.createElement('div');
    sub.className = 'wof-sub';
    sub.textContent = 'Spin to win up to 20x your bet!';
    modal.appendChild(sub);

    // Wheel
    var wrap = document.createElement('div');
    wrap.className = 'wof-wheel-wrap';

    var pointer = document.createElement('div');
    pointer.className = 'wof-pointer';
    pointer.textContent = '\u25BC';
    wrap.appendChild(pointer);

    var canvas = document.createElement('canvas');
    canvas.id = 'wofCanvas';
    canvas.width  = 240;
    canvas.height = 240;
    wrap.appendChild(canvas);

    var center = document.createElement('div');
    center.className = 'wof-center';
    wrap.appendChild(center);

    modal.appendChild(wrap);

    // Load segments and draw
    getSegments(function(segs) {
      if (segs) {
        drawWheel(canvas, segs);
        buildOdds(modal, segs);
      }
    });

    // Bet input
    var inputRow = document.createElement('div');
    inputRow.className = 'wof-input-row';
    var betLabel = document.createElement('label');
    betLabel.textContent = 'Bet ($)';
    betLabel.htmlFor = 'wofBetInput';
    var betInput = document.createElement('input');
    betInput.id = 'wofBetInput';
    betInput.className = 'wof-input';
    betInput.type = 'number';
    betInput.min = '0.25';
    betInput.max = '500';
    betInput.step = '0.25';
    betInput.value = '5.00';
    inputRow.appendChild(betLabel);
    inputRow.appendChild(betInput);
    modal.appendChild(inputRow);

    // Spin button
    var spinBtn = document.createElement('button');
    spinBtn.id = 'wofSpinBtn';
    spinBtn.textContent = '\uD83C\uDFB0 Spin!';
    spinBtn.addEventListener('click', doSpin);
    modal.appendChild(spinBtn);

    // Result
    var resultEl = document.createElement('div');
    resultEl.id = 'wofResult';
    resultEl.textContent = 'Spin to play!';
    resultEl.style.color = '#fbbf24';
    modal.appendChild(resultEl);

    // Close
    var closeBtn = document.createElement('button');
    closeBtn.id = 'wofClose';
    closeBtn.textContent = 'Close';
    closeBtn.addEventListener('click', closeWheel);
    modal.appendChild(closeBtn);

    _overlay.appendChild(modal);
    _overlay.addEventListener('click', function(e) {
      if (e.target === _overlay) closeWheel();
    });
    document.body.appendChild(_overlay);
  }

  function buildOdds(modal, segs) {
    // Count unique multipliers
    var counts = {};
    var colors = {};
    for (var i = 0; i < segs.length; i++) {
      var key = segs[i].label;
      counts[key] = (counts[key] || 0) + 1;
      colors[key] = segs[i].color;
    }
    var oddsRow = document.createElement('div');
    oddsRow.className = 'wof-odds';
    var keys = Object.keys(counts);
    for (var k = 0; k < keys.length; k++) {
      var pill = document.createElement('span');
      pill.className = 'wof-odd-pill';
      pill.style.background = colors[keys[k]];
      pill.style.color = '#fff';
      var pct = ((counts[keys[k]] / segs.length) * 100).toFixed(1);
      pill.textContent = keys[k] + ' \u00D7' + counts[keys[k]] + ' (' + pct + '%)';
      oddsRow.appendChild(pill);
    }
    // Insert before bet input
    var betRow = modal.querySelector('.wof-input-row');
    if (betRow) {
      modal.insertBefore(oddsRow, betRow);
    } else {
      modal.appendChild(oddsRow);
    }
  }

  // ── public API ───────────────────────────────────────────────────────────────

  function openWheel() {
    injectStyles();
    buildModal();
    _overlay.classList.add('active');
    setResult('Spin to play!', '#fbbf24');
  }

  function closeWheel() {
    if (_overlay) _overlay.classList.remove('active');
    _spinning = false;
  }

  window.openWheel  = openWheel;
  window.closeWheel = closeWheel;

}());
