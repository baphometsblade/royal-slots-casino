(function() {
  'use strict';

  var TOKEN_KEY = typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken';

  var _overlay   = null;
  var _stylesInj = false;
  var _playing   = false;
  var _risk      = 'medium';
  var _animId    = null;

  function getToken() {
    try { return localStorage.getItem(TOKEN_KEY); } catch(e) { return null; }
  }

  function injectStyles() {
    if (_stylesInj) return;
    _stylesInj = true;
    var s = document.createElement('style');
    s.textContent = [
      '#plOverlay{position:fixed;inset:0;background:rgba(0,0,0,.93);z-index:20000;display:none;align-items:center;justify-content:center;font-family:monospace}',
      '#plOverlay.active{display:flex}',
      '#plModal{background:linear-gradient(135deg,#030712,#0a0520);border:2px solid rgba(167,139,250,.3);border-radius:20px;padding:16px 18px;max-width:460px;width:96%;text-align:center;max-height:96vh;overflow-y:auto}',
      '#plModal h2{color:#c4b5fd;font-size:20px;margin:0 0 2px;letter-spacing:2px}',
      '#plModal .pl-sub{color:rgba(255,255,255,.35);font-size:11px;margin-bottom:10px}',
      '#plCanvas{display:block;margin:0 auto 10px;border-radius:10px;background:#060616}',
      '.pl-risk-row{display:flex;gap:6px;justify-content:center;margin-bottom:10px}',
      '.pl-risk-btn{flex:1;max-width:90px;padding:6px 4px;border-radius:8px;border:2px solid rgba(255,255,255,.1);background:rgba(255,255,255,.05);color:rgba(255,255,255,.55);font-size:11px;font-weight:800;cursor:pointer;transition:all .15s}',
      '.pl-risk-btn.pl-sel{background:rgba(167,139,250,.3);border-color:#c4b5fd;color:#ede9fe}',
      '.pl-input-row{display:flex;gap:10px;align-items:center;justify-content:center;margin-bottom:10px}',
      '.pl-input-row label{font-size:10px;color:rgba(255,255,255,.35);text-transform:uppercase;letter-spacing:.5px}',
      '.pl-input{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);border-radius:8px;color:#fff;padding:6px 10px;font-size:14px;font-weight:700;width:90px;text-align:center}',
      '.pl-input:focus{outline:none;border-color:rgba(167,139,250,.6)}',
      '#plDropBtn{background:linear-gradient(135deg,#4c1d95,#6d28d9);color:#fff;border:1px solid rgba(167,139,250,.4);padding:12px 0;border-radius:12px;font-size:16px;font-weight:900;cursor:pointer;width:100%;margin-bottom:6px;letter-spacing:.5px;transition:transform .1s}',
      '#plDropBtn:hover:not(:disabled){transform:scale(1.02)}',
      '#plDropBtn:disabled{opacity:.4;cursor:not-allowed;transform:none}',
      '#plResult{font-size:14px;font-weight:800;min-height:20px;color:#a5b4fc;margin-bottom:8px}',
      '#plClose{background:none;border:none;color:rgba(255,255,255,.3);font-size:12px;cursor:pointer;text-decoration:underline}',
    ].join('\n');
    document.head.appendChild(s);
  }

  // ── board constants ───────────────────────────────────────────────────────────

  var ROWS = 16, BUCKETS = 17;
  var MULT = {
    low:    [5.6, 2.1, 1.1, 1.0, 0.5, 0.3, 0.2, 0.2, 0.2, 0.2, 0.2, 0.3, 0.5, 1.0, 1.1, 2.1, 5.6],
    medium: [110,  41,  10,   5,   3, 1.5,   1, 0.5, 0.3, 0.5,   1, 1.5,   3,   5,  10,  41, 110],
    high:   [1000,130,  26,   9,   4,   2, 0.2, 0.2, 0.2, 0.2, 0.2,   2,   4,   9,  26, 130,1000],
  };

  var CW = 400, CH = 300;
  var PEG_R = 3.5, BALL_R = 5;
  var PAD_X = 18, PAD_Y = 8;
  var BOARD_W = CW - PAD_X * 2;
  var BOARD_H = CH - PAD_Y * 2 - 28;

  function pegX(row, col) {
    var spacing = BOARD_W / (row + 2);
    return PAD_X + spacing + col * spacing;
  }
  function pegY(row) {
    return PAD_Y + (row + 0.5) * (BOARD_H / ROWS);
  }
  function bucketCX(b) {
    return PAD_X + (b + 0.5) * (BOARD_W / BUCKETS);
  }
  function bucketY() { return PAD_Y + BOARD_H + 4; }

  function bucketColor(m) {
    if (m >= 100)  return '#fbbf24';
    if (m >= 10)   return '#f97316';
    if (m >= 3)    return '#a78bfa';
    if (m >= 1.5)  return '#60a5fa';
    if (m >= 1)    return '#34d399';
    return '#6b7280';
  }

  function drawBoard(ctx, risk, hBucket) {
    ctx.clearRect(0, 0, CW, CH);
    ctx.fillStyle = '#060616';
    ctx.fillRect(0, 0, CW, CH);

    // Pegs
    for (var row = 0; row < ROWS; row++) {
      var cnt = row + 2;
      for (var col = 0; col < cnt; col++) {
        ctx.beginPath();
        ctx.arc(pegX(row, col), pegY(row), PEG_R, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(180,180,255,0.6)';
        ctx.fill();
      }
    }

    // Buckets
    var bw = BOARD_W / BUCKETS;
    var by = bucketY();
    var mults = MULT[risk];
    for (var b = 0; b < BUCKETS; b++) {
      var bx = PAD_X + b * bw;
      var c  = bucketColor(mults[b]);
      ctx.fillStyle   = b === hBucket ? c + 'cc' : c + '2a';
      ctx.strokeStyle = c;
      ctx.lineWidth   = 1;
      ctx.beginPath();
      ctx.rect(bx + 1, by, bw - 2, 20);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle  = b === hBucket ? '#fff' : 'rgba(255,255,255,.4)';
      ctx.font       = 'bold 7px monospace';
      ctx.textAlign  = 'center';
      var m = mults[b];
      var lbl = m >= 1000 ? '1k' : m >= 100 ? String(Math.round(m)) : m >= 10 ? m.toFixed(0) : m.toFixed(1);
      ctx.fillText(lbl + 'x', bx + bw / 2, by + 13);
    }
  }

  function drawBall(ctx, x, y, col) {
    var g = ctx.createRadialGradient(x - 1, y - 1, 1, x, y, BALL_R + 1);
    g.addColorStop(0, '#fff');
    g.addColorStop(1, col || '#a78bfa');
    ctx.beginPath();
    ctx.arc(x, y, BALL_R, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();
  }

  // ── animation ────────────────────────────────────────────────────────────────

  function animateBall(canvas, path, bucket, onDone) {
    var ctx = canvas.getContext('2d');
    // Build keyframes from peg path
    var frames = [{ x: CW / 2, y: PAD_Y - 8 }];
    var col = 0;
    for (var r = 0; r < ROWS; r++) {
      var dir = path[r];
      col += dir;
      frames.push({ x: pegX(r, col), y: pegY(r) });
    }
    frames.push({ x: bucketCX(bucket), y: bucketY() + 10 });

    var fi = 0, sub = 0, STEPS = 5;
    function tick() {
      var a = frames[fi];
      var b = frames[Math.min(fi + 1, frames.length - 1)];
      var t = sub / STEPS;
      drawBoard(ctx, _risk, fi >= frames.length - 2 ? bucket : -1);
      drawBall(ctx, a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t,
               fi >= frames.length - 2 ? bucketColor(MULT[_risk][bucket]) : null);
      sub++;
      if (sub >= STEPS) { sub = 0; fi++; }
      if (fi >= frames.length - 1) {
        drawBoard(ctx, _risk, bucket);
        drawBall(ctx, bucketCX(bucket), bucketY() + 10, bucketColor(MULT[_risk][bucket]));
        _animId = null;
        onDone();
        return;
      }
      _animId = requestAnimationFrame(tick);
    }
    _animId = requestAnimationFrame(tick);
  }

  // ── helpers ───────────────────────────────────────────────────────────────────

  function setResult(txt, col) {
    var el = document.getElementById('plResult');
    if (!el) return;
    el.textContent = txt;
    el.style.color = col || '#a5b4fc';
  }

  function selectRisk(r) {
    _risk = r;
    ['low','medium','high'].forEach(function(k) {
      var b = document.getElementById('plRisk_' + k);
      if (b) b.classList.toggle('pl-sel', k === r);
    });
    var cv = document.getElementById('plCanvas');
    if (cv) drawBoard(cv.getContext('2d'), _risk, -1);
  }

  // ── drop ─────────────────────────────────────────────────────────────────────

  function doDrop() {
    if (_playing) return;
    var token = getToken();
    if (!token) { setResult('Please log in to play.', '#f87171'); return; }
    var betInput = document.getElementById('plBetInput');
    var betVal   = betInput ? parseFloat(betInput.value) : 5.00;
    if (isNaN(betVal) || betVal < 0.25) betVal = 0.25;

    _playing = true;
    var btn = document.getElementById('plDropBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'Dropping\u2026'; }
    setResult('', '');

    fetch('/api/plinko/play', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ bet: betVal, risk: _risk }),
    })
    .then(function(r) { return r.ok ? r.json() : r.json().then(function(e) { throw e; }); })
    .then(function(data) {
      if (typeof window.updateBalance === 'function' && data.newBalance != null) {
        window.updateBalance(data.newBalance);
      }
      var cv = document.getElementById('plCanvas');
      animateBall(cv, data.path, data.bucket, function() {
        _playing = false;
        if (btn) { btn.disabled = false; btn.textContent = '\u25BC Drop Ball'; }
        var m = data.multiplier, msg, col;
        if (m >= 1) {
          msg = '\uD83C\uDF89 ' + m + 'x \u2014 +$' + data.profit.toFixed(2);
          col = m >= 5 ? '#fbbf24' : '#4ade80';
        } else {
          msg = '\uD83D\uDCA5 ' + m + 'x \u2014 -$' + Math.abs(data.profit).toFixed(2);
          col = '#f87171';
        }
        setResult(msg, col);
      });
    })
    .catch(function(err) {
      _playing = false;
      if (btn) { btn.disabled = false; btn.textContent = '\u25BC Drop Ball'; }
      setResult((err && err.error) || 'Error \u2014 check balance.', '#f87171');
    });
  }

  // ── modal build ───────────────────────────────────────────────────────────────

  function buildModal() {
    if (_overlay) return;
    _overlay = document.createElement('div');
    _overlay.id = 'plOverlay';

    var modal = document.createElement('div');
    modal.id = 'plModal';

    var icon = document.createElement('div');
    icon.style.cssText = 'font-size:28px;margin-bottom:2px';
    icon.textContent = '\u25C6';
    modal.appendChild(icon);

    var h2 = document.createElement('h2');
    h2.textContent = 'PLINKO';
    modal.appendChild(h2);

    var sub = document.createElement('div');
    sub.className = 'pl-sub';
    sub.textContent = 'Drop the ball \u2014 watch it bounce to your multiplier!';
    modal.appendChild(sub);

    var canvas = document.createElement('canvas');
    canvas.id     = 'plCanvas';
    canvas.width  = CW;
    canvas.height = CH;
    canvas.style.width  = '360px';
    canvas.style.height = Math.round(CH * 360 / CW) + 'px';
    modal.appendChild(canvas);

    // Risk selector
    var riskRow = document.createElement('div');
    riskRow.className = 'pl-risk-row';
    ['low','medium','high'].forEach(function(r) {
      var b = document.createElement('button');
      b.id = 'plRisk_' + r;
      b.className = 'pl-risk-btn' + (r === _risk ? ' pl-sel' : '');
      b.textContent = r.charAt(0).toUpperCase() + r.slice(1) + ' Risk';
      b.addEventListener('click', function() { if (!_playing) selectRisk(r); });
      riskRow.appendChild(b);
    });
    modal.appendChild(riskRow);

    // Bet input
    var inputRow = document.createElement('div');
    inputRow.className = 'pl-input-row';
    var lbl = document.createElement('label');
    lbl.textContent = 'Bet ($)';
    lbl.htmlFor = 'plBetInput';
    var inp = document.createElement('input');
    inp.id = 'plBetInput'; inp.className = 'pl-input';
    inp.type = 'number'; inp.min = '0.25'; inp.max = '500'; inp.step = '0.25'; inp.value = '5.00';
    inputRow.appendChild(lbl);
    inputRow.appendChild(inp);
    modal.appendChild(inputRow);

    // Drop button
    var dropBtn = document.createElement('button');
    dropBtn.id = 'plDropBtn';
    dropBtn.textContent = '\u25BC Drop Ball';
    dropBtn.addEventListener('click', doDrop);
    modal.appendChild(dropBtn);

    // Result
    var resultEl = document.createElement('div');
    resultEl.id = 'plResult';
    resultEl.textContent = 'Choose risk and drop!';
    resultEl.style.color = '#a5b4fc';
    modal.appendChild(resultEl);

    // Close
    var closeBtn = document.createElement('button');
    closeBtn.id = 'plClose';
    closeBtn.textContent = 'Close';
    closeBtn.addEventListener('click', closePlinko);
    modal.appendChild(closeBtn);

    _overlay.appendChild(modal);
    _overlay.addEventListener('click', function(e) { if (e.target === _overlay) closePlinko(); });
    document.body.appendChild(_overlay);
  }

  // ── public API ────────────────────────────────────────────────────────────────

  function openPlinko() {
    injectStyles();
    buildModal();
    _overlay.classList.add('active');
    setResult('Choose risk and drop!', '#a5b4fc');
    requestAnimationFrame(function() {
      var cv = document.getElementById('plCanvas');
      if (cv) drawBoard(cv.getContext('2d'), _risk, -1);
    });
  }

  function closePlinko() {
    if (_overlay) _overlay.classList.remove('active');
    if (_animId) { cancelAnimationFrame(_animId); _animId = null; }
    _playing = false;
  }

  window.openPlinko  = openPlinko;
  window.closePlinko = closePlinko;

}());
