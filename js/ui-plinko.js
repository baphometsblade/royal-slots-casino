(function() {
  'use strict';

  var TOKEN_KEY = typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken';

  var _overlay   = null;
  var _stylesInj = false;
  var _dropping  = false;
  var _risk      = 'medium';
  var _bet       = 1.00;

  // Board geometry constants
  var ROWS        = 8;
  var PEG_R       = 5;
  var BALL_R      = 7;
  var ROW_H       = 28;
  var PEG_SPACING = 32;

  // Multiplier display colours
  var MULT_COLORS = {
    low:    ['#f87171','#d1fae5','#d1fae5','#d1fae5','#d1fae5','#d1fae5','#d1fae5','#d1fae5','#f87171'],
    medium: ['#fbbf24','#86efac','#a5f3fc','#c4b5fd','#f87171','#c4b5fd','#a5f3fc','#86efac','#fbbf24'],
    high:   ['#fde047','#fbbf24','#a5f3fc','#f87171','#450a0a','#f87171','#a5f3fc','#fbbf24','#fde047'],
  };

  var MULTIPLIERS = {
    low:    [0.5,  1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.5],
    medium: [9.0,  2.6, 1.3, 0.9, 0.3, 0.9, 1.3, 2.6, 9.0],
    high:   [25.0, 4.5, 1.3, 0.4, 0.1, 0.4, 1.3, 4.5, 25.0],
  };

  function getToken() {
    try { return localStorage.getItem(TOKEN_KEY); } catch(e) { return null; }
  }

  // ── Styles ────────────────────────────────────────────────────────────────

  function injectStyles() {
    if (_stylesInj) return;
    _stylesInj = true;
    var s = document.createElement('style');
    s.textContent = [
      '#plinkoOverlay{position:fixed;inset:0;background:rgba(0,0,0,.92);z-index:20200;display:none;align-items:center;justify-content:center}',
      '#plinkoOverlay.active{display:flex}',
      '#plinkoModal{background:linear-gradient(135deg,#04040f,#0d1120);border:2px solid rgba(251,191,36,.25);border-radius:20px;padding:20px 24px;max-width:420px;width:96%;text-align:center;font-family:monospace;max-height:96vh;overflow-y:auto}',
      '#plinkoModal h2{color:#fbbf24;font-size:20px;margin:0 0 2px;letter-spacing:2px}',
      '#plinkoModal .pl-sub{color:rgba(255,255,255,.35);font-size:11px;margin-bottom:14px}',

      /* Canvas */
      '#plinkoCanvas{display:block;width:100%;border-radius:12px;background:radial-gradient(ellipse at 50% 0%,#1e1b4b,#04040f);margin-bottom:12px}',

      /* Result */
      '#plinkoResult{font-size:22px;font-weight:900;min-height:28px;color:#fbbf24;margin-bottom:10px;letter-spacing:.5px}',

      /* Controls */
      '.pl-controls{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-bottom:10px}',
      '.pl-ctrl{display:flex;flex-direction:column;align-items:flex-start;gap:3px}',
      '.pl-ctrl label{font-size:10px;color:rgba(255,255,255,.35);text-transform:uppercase;letter-spacing:.5px}',
      '.pl-input{background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.14);border-radius:8px;color:#fff;padding:8px 12px;font-size:14px;font-weight:700;width:95px;text-align:center}',
      '.pl-input:focus{outline:none;border-color:rgba(251,191,36,.5)}',

      /* Risk selector */
      '.pl-risk{display:flex;gap:8px;justify-content:center;margin-bottom:12px}',
      '.pl-rbtn{background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.14);border-radius:8px;color:rgba(255,255,255,.6);padding:7px 16px;font-size:13px;font-weight:700;cursor:pointer;transition:all .15s}',
      '.pl-rbtn:hover{border-color:rgba(251,191,36,.5)}',
      '.pl-rbtn.sel{background:rgba(251,191,36,.2);border-color:#fbbf24;color:#fde68a}',

      /* Drop button */
      '#plinkoDropBtn{background:linear-gradient(135deg,#d97706,#78350f);color:#fff;border:none;padding:13px 0;border-radius:12px;font-size:16px;font-weight:900;cursor:pointer;width:100%;margin-bottom:8px;letter-spacing:.5px;transition:transform .1s}',
      '#plinkoDropBtn:hover{transform:scale(1.02)}',
      '#plinkoDropBtn:disabled{opacity:.4;cursor:not-allowed;transform:none}',

      /* Quick bets */
      '.pl-quick{display:flex;gap:5px;justify-content:center;flex-wrap:wrap;margin-bottom:10px}',
      '.pl-qbtn{background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);border-radius:7px;color:rgba(255,255,255,.55);padding:4px 9px;font-size:11px;font-weight:700;cursor:pointer;transition:all .12s}',
      '.pl-qbtn:hover{background:rgba(251,191,36,.15);border-color:rgba(251,191,36,.4);color:#fde68a}',

      /* History */
      '#plinkoHistory{display:flex;gap:4px;flex-wrap:wrap;justify-content:center;margin-bottom:10px;min-height:22px}',
      '.pl-hist{font-size:10px;font-weight:800;padding:2px 7px;border-radius:20px;color:#000}',

      '#plinkoClose{background:none;border:none;color:rgba(255,255,255,.25);font-size:11px;cursor:pointer;text-decoration:underline}',
    ].join('\n');
    document.head.appendChild(s);
  }

  // ── Canvas drawing ────────────────────────────────────────────────────────

  function canvasW(canvas) { return canvas.width; }
  function canvasH(canvas) { return canvas.height; }

  // Peg position: row r (0-indexed), col c (0-indexed, range 0..r+1)
  // Row r has r+2 pegs
  function pegX(canvas, r, c) {
    var cols   = r + 2;
    var span   = (cols - 1) * PEG_SPACING;
    var left   = (canvasW(canvas) - span) / 2;
    return left + c * PEG_SPACING;
  }
  function pegY(r) {
    return 24 + r * ROW_H;
  }

  // Bucket X centres (9 buckets for 8 rows)
  function bucketX(canvas, b) {
    var cols = 10; // 9 buckets need 10 spacing units... actually use last peg row
    var pegsLastRow = ROWS + 1; // row 7 has 9 pegs → 8 spaces
    var span = (pegsLastRow - 1) * PEG_SPACING;
    var left = (canvasW(canvas) - span) / 2;
    // Bucket b is between peg b and peg b+1 of last row
    return left + (b + 0.5) * (span / (pegsLastRow - 1));
  }
  function bucketY() {
    return pegY(ROWS - 1) + ROW_H + 4;
  }

  function drawBoard(canvas, ctx, activeBucket) {
    var W = canvasW(canvas);
    var H = canvasH(canvas);
    ctx.clearRect(0, 0, W, H);

    // Pegs
    for (var r = 0; r < ROWS; r++) {
      var pegs = r + 2;
      for (var c = 0; c < pegs; c++) {
        ctx.beginPath();
        ctx.arc(pegX(canvas, r, c), pegY(r), PEG_R, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,.55)';
        ctx.fill();
      }
    }

    // Bucket cells
    var mults   = MULTIPLIERS[_risk];
    var colors  = MULT_COLORS[_risk];
    var buckets = mults.length;
    var lastPegs = ROWS + 1; // 9 pegs in last row
    var span = (lastPegs - 1) * PEG_SPACING;
    var left = (W - span) / 2;
    var cellW = span / (lastPegs - 1);
    var bY    = bucketY();

    for (var b = 0; b < buckets; b++) {
      var bx = left + b * cellW;
      var active = (activeBucket === b);
      ctx.fillStyle = active
        ? (colors[b] || '#fbbf24')
        : 'rgba(255,255,255,.07)';
      ctx.strokeStyle = active ? (colors[b] || '#fbbf24') : 'rgba(255,255,255,.12)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(bx + 1, bY, cellW - 2, 22, 4);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = active ? '#000' : 'rgba(255,255,255,.45)';
      ctx.font = '700 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(mults[b] + 'x', bx + cellW / 2, bY + 14);
    }
  }

  function drawBall(canvas, ctx, bx, by) {
    ctx.beginPath();
    ctx.arc(bx, by, BALL_R, 0, Math.PI * 2);
    var grad = ctx.createRadialGradient(bx - 2, by - 2, 1, bx, by, BALL_R);
    grad.addColorStop(0, '#fff');
    grad.addColorStop(1, '#fbbf24');
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.3)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // ── Animation ─────────────────────────────────────────────────────────────

  function animateDrop(canvas, ctx, path, onDone) {
    var STEPS_PER_ROW = 18;
    var step = 0;
    var totalSteps = ROWS * STEPS_PER_ROW;
    var bucket = 0; // accumulated rights

    function frame() {
      var row      = Math.floor(step / STEPS_PER_ROW);
      var progress = (step % STEPS_PER_ROW) / STEPS_PER_ROW; // 0..1

      if (row >= ROWS) {
        // Final frame — ball lands in bucket
        drawBoard(canvas, ctx, bucket);
        var finalX = bucketX(canvas, bucket);
        var finalY = bucketY() + 11;
        drawBall(canvas, ctx, finalX, finalY);
        onDone(bucket);
        return;
      }

      // Ball position at start of this row: column = bucket (number of R so far)
      // within row r, peg c=bucket is at pegX(canvas, r, bucket)
      var startX = pegX(canvas, row, bucket);
      var startY = pegY(row);

      // Direction this row
      var dir    = path[row]; // 0=left, 1=right
      var nextBucket = bucket + dir;

      // End position: start of next row, column = nextBucket
      var endX = (row + 1 < ROWS)
        ? pegX(canvas, row + 1, nextBucket)
        : bucketX(canvas, nextBucket);
      var endY = (row + 1 < ROWS) ? pegY(row + 1) : bucketY() + 11;

      var bx = startX + (endX - startX) * progress;
      var by = startY + (endY - startY) * progress;

      drawBoard(canvas, ctx, -1);
      drawBall(canvas, ctx, bx, by);

      step++;
      if (step >= totalSteps) {
        bucket = nextBucket;
      } else if ((step % STEPS_PER_ROW) === 0) {
        bucket = nextBucket;
      }

      requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
  }

  // ── History ───────────────────────────────────────────────────────────────

  var _history = [];

  function addHistory(mult) {
    _history.unshift(mult);
    if (_history.length > 12) _history.pop();
    var container = document.getElementById('plinkoHistory');
    if (!container) return;
    while (container.firstChild) container.removeChild(container.firstChild);
    var colors = MULT_COLORS[_risk];
    var mults  = MULTIPLIERS[_risk];
    for (var i = 0; i < _history.length; i++) {
      var pill = document.createElement('span');
      pill.className = 'pl-hist';
      // Find bucket index
      var bi = mults.indexOf(_history[i]);
      pill.style.background = bi >= 0 ? (colors[bi] || '#fbbf24') : '#fbbf24';
      pill.textContent = _history[i] + 'x';
      container.appendChild(pill);
    }
  }

  // ── UI helpers ────────────────────────────────────────────────────────────

  function setResult(text, color) {
    var el = document.getElementById('plinkoResult');
    if (!el) return;
    el.textContent = text;
    el.style.color = color || '#fbbf24';
  }

  function selectRisk(r) {
    _risk = r;
    var btns = document.querySelectorAll('.pl-rbtn');
    for (var i = 0; i < btns.length; i++) {
      btns[i].classList.toggle('sel', btns[i].dataset.risk === r);
    }
    // Redraw board with new risk colours
    var canvas = document.getElementById('plinkoCanvas');
    if (canvas) {
      var ctx = canvas.getContext('2d');
      drawBoard(canvas, ctx, -1);
    }
  }

  // ── Drop action ───────────────────────────────────────────────────────────

  function doDrop() {
    var token = getToken();
    if (!token) { setResult('Please log in to play.', '#f87171'); return; }
    if (_dropping) return;

    var betInput = document.getElementById('plinkoBetInput');
    var betVal   = betInput ? parseFloat(betInput.value) : 1.00;
    if (isNaN(betVal) || betVal < 0.10) betVal = 0.10;
    _bet = betVal;

    _dropping = true;
    var btn = document.getElementById('plinkoDropBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'Dropping\u2026'; }
    setResult('', '');

    fetch('/api/plinko/drop', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ bet: _bet, risk: _risk }),
    })
    .then(function(r) { return r.ok ? r.json() : r.json().then(function(e) { throw e; }); })
    .then(function(data) {
      if (typeof window.updateBalance === 'function' && data.newBalance != null) {
        window.updateBalance(data.newBalance);
      }

      var canvas = document.getElementById('plinkoCanvas');
      var ctx    = canvas ? canvas.getContext('2d') : null;
      if (!canvas || !ctx) {
        _dropping = false;
        if (btn) { btn.disabled = false; btn.textContent = '\uD83C\uDFB1 Drop Ball'; }
        return;
      }

      animateDrop(canvas, ctx, data.path, function(bucket) {
        _dropping = false;
        if (btn) { btn.disabled = false; btn.textContent = '\uD83C\uDFB1 Drop Ball'; }

        var mult    = data.multiplier;
        var payout  = data.payout;
        var won     = payout > _bet;
        var color   = won ? '#4ade80' : (payout === 0 ? '#f87171' : '#fbbf24');
        setResult(
          mult + 'x \u2192 ' + (won ? '+' : '') + '$' + payout.toFixed(2),
          color
        );
        addHistory(mult);
      });
    })
    .catch(function(err) {
      _dropping = false;
      if (btn) { btn.disabled = false; btn.textContent = '\uD83C\uDFB1 Drop Ball'; }
      setResult((err && err.error) || 'Failed. Check balance.', '#f87171');
    });
  }

  // ── Modal build ───────────────────────────────────────────────────────────

  function buildModal() {
    if (_overlay) return;
    _overlay = document.createElement('div');
    _overlay.id = 'plinkoOverlay';

    var modal = document.createElement('div');
    modal.id = 'plinkoModal';

    var icon = document.createElement('div');
    icon.style.cssText = 'font-size:30px;margin-bottom:2px';
    icon.textContent = '\uD83C\uDFB1';
    modal.appendChild(icon);

    var h2 = document.createElement('h2');
    h2.textContent = 'PLINKO';
    modal.appendChild(h2);

    var sub = document.createElement('div');
    sub.className = 'pl-sub';
    sub.textContent = 'Drop the ball — watch it bounce to your prize!';
    modal.appendChild(sub);

    // Canvas
    var canvas = document.createElement('canvas');
    canvas.id = 'plinkoCanvas';
    canvas.width  = 320;
    canvas.height = ROWS * ROW_H + 60;
    modal.appendChild(canvas);

    // Result
    var result = document.createElement('div');
    result.id = 'plinkoResult';
    modal.appendChild(result);

    // History
    var hist = document.createElement('div');
    hist.id = 'plinkoHistory';
    modal.appendChild(hist);

    // Risk selector
    var riskRow = document.createElement('div');
    riskRow.className = 'pl-risk';
    ['low', 'medium', 'high'].forEach(function(r) {
      var btn = document.createElement('button');
      btn.className = 'pl-rbtn' + (r === 'medium' ? ' sel' : '');
      btn.dataset.risk = r;
      btn.textContent = r.charAt(0).toUpperCase() + r.slice(1);
      btn.addEventListener('click', function() {
        if (!_dropping) selectRisk(r);
      });
      riskRow.appendChild(btn);
    });
    modal.appendChild(riskRow);

    // Bet controls
    var controls = document.createElement('div');
    controls.className = 'pl-controls';

    var betGroup = document.createElement('div');
    betGroup.className = 'pl-ctrl';
    var betLabel = document.createElement('label');
    betLabel.textContent = 'Bet ($)';
    var betInput = document.createElement('input');
    betInput.id = 'plinkoBetInput';
    betInput.className = 'pl-input';
    betInput.type = 'number';
    betInput.min = '0.10';
    betInput.max = '500';
    betInput.step = '0.50';
    betInput.value = '1.00';
    betGroup.appendChild(betLabel);
    betGroup.appendChild(betInput);
    controls.appendChild(betGroup);
    modal.appendChild(controls);

    // Quick bets
    var quick = document.createElement('div');
    quick.className = 'pl-quick';
    ['0.50', '1', '5', '10', '25', '100'].forEach(function(amt) {
      var btn = document.createElement('button');
      btn.className = 'pl-qbtn';
      btn.textContent = '$' + amt;
      btn.addEventListener('click', function() {
        if (!_dropping) {
          var inp = document.getElementById('plinkoBetInput');
          if (inp) inp.value = amt;
        }
      });
      quick.appendChild(btn);
    });
    modal.appendChild(quick);

    // Drop button
    var dropBtn = document.createElement('button');
    dropBtn.id = 'plinkoDropBtn';
    dropBtn.textContent = '\uD83C\uDFB1 Drop Ball';
    dropBtn.addEventListener('click', doDrop);
    modal.appendChild(dropBtn);

    // Close
    var closeBtn = document.createElement('button');
    closeBtn.id = 'plinkoClose';
    closeBtn.textContent = 'Close';
    closeBtn.addEventListener('click', closePlinko);
    modal.appendChild(closeBtn);

    _overlay.appendChild(modal);
    _overlay.addEventListener('click', function(e) {
      if (e.target === _overlay) closePlinko();
    });
    document.body.appendChild(_overlay);
  }

  // ── Public API ────────────────────────────────────────────────────────────

  function openPlinko() {
    injectStyles();
    buildModal();
    _overlay.classList.add('active');
    // Draw initial board
    requestAnimationFrame(function() {
      var canvas = document.getElementById('plinkoCanvas');
      if (canvas) {
        var ctx = canvas.getContext('2d');
        drawBoard(canvas, ctx, -1);
      }
    });
    setResult('Choose your risk level and drop!', 'rgba(255,255,255,.4)');
    selectRisk(_risk);
  }

  function closePlinko() {
    if (_overlay) _overlay.classList.remove('active');
  }

  window.openPlinko  = openPlinko;
  window.closePlinko = closePlinko;

}());
