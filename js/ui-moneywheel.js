(function () {
  'use strict';

  var SEGMENTS = [
    { mult: 1,   count: 26, color: '#3b82f6' },
    { mult: 2,   count: 14, color: '#10b981' },
    { mult: 5,   count:  8, color: '#f59e0b' },
    { mult: 10,  count:  4, color: '#ef4444' },
    { mult: 20,  count:  3, color: '#8b5cf6' },
    { mult: 50,  count:  2, color: '#ec4899' },
    { mult: 100, count:  1, color: '#fbbf24' },
    { mult: 200, count:  1, color: '#f97316' },
    { mult: 500, count:  1, color: '#22c55e' },
  ];

  var TOTAL = 60;
  var WHEEL = [];
  SEGMENTS.forEach(function (seg) {
    for (var i = 0; i < seg.count; i++) WHEEL.push(seg.mult);
  });

  function segForMult(m) { return SEGMENTS.find(function (s) { return s.mult === m; }); }

  var modal, canvas, ctx;
  var currentAngle = 0, spinning = false, animFrame = null;

  // ── CSS ──────────────────────────────────────────────────────────────────────

  function injectCSS() {
    if (document.getElementById('mw-css')) return;
    var s = document.createElement('style');
    s.id = 'mw-css';
    s.textContent = `
      #mwModal { display:none; position:fixed; inset:0; background:rgba(0,0,0,.85);
        z-index:10400; align-items:center; justify-content:center; }
      #mwModal.active { display:flex; }
      .mw-box { background:#1e1e2e; border:2px solid #22c55e; border-radius:16px;
        padding:24px; max-width:500px; width:95%; color:#e2e8f0; font-family:sans-serif; }
      .mw-title { text-align:center; font-size:1.6rem; font-weight:800;
        color:#22c55e; margin-bottom:16px; letter-spacing:.02em; }
      .mw-canvas-wrap { display:flex; justify-content:center; position:relative; margin-bottom:18px; }
      #mwCanvas { border-radius:50%;
        box-shadow:0 0 32px #22c55e44, 0 0 8px #22c55e88; }
      .mw-needle { position:absolute; top:-12px; left:50%; transform:translateX(-50%);
        width:0; height:0;
        border-left:12px solid transparent; border-right:12px solid transparent;
        border-top:32px solid #22c55e; filter:drop-shadow(0 0 8px #22c55e); }
      .mw-multiplier { text-align:center; font-size:2.4rem; font-weight:900;
        color:#fbbf24; min-height:48px; margin-bottom:12px;
        text-shadow:0 0 16px #fbbf2466; transition:color .3s; }
      .mw-bet-row { display:flex; gap:10px; align-items:center; margin-bottom:14px; }
      .mw-bet-row label { font-size:.85rem; color:#94a3b8; white-space:nowrap; }
      .mw-bet-input { flex:1; padding:8px 12px; background:#0f172a;
        border:1px solid #475569; border-radius:8px; color:#e2e8f0;
        font-size:1rem; text-align:center; }
      .mw-bet-input:focus { outline:none; border-color:#22c55e; }
      .mw-quick-bets { display:flex; gap:6px; margin-bottom:14px; justify-content:center; }
      .mw-qb { padding:4px 12px; background:#0f172a; border:1px solid #475569;
        border-radius:6px; color:#e2e8f0; cursor:pointer; font-size:.8rem; }
      .mw-qb:hover { border-color:#22c55e; color:#22c55e; }
      .mw-spin-btn { width:100%; padding:14px; background:linear-gradient(135deg,#22c55e,#16a34a);
        color:#fff; font-weight:800; font-size:1.2rem; border:none; border-radius:10px;
        cursor:pointer; letter-spacing:.05em; transition:opacity .2s; }
      .mw-spin-btn:disabled { opacity:.4; cursor:not-allowed; }
      .mw-result { text-align:center; font-size:1rem; font-weight:700; min-height:32px;
        margin-top:10px; }
      .mw-win  { color:#4ade80; }
      .mw-lose { color:#f87171; }
      .mw-legend { display:flex; flex-wrap:wrap; gap:6px; justify-content:center;
        margin-top:12px; font-size:.7rem; }
      .mw-leg-item { display:flex; align-items:center; gap:4px; }
      .mw-leg-dot { width:10px; height:10px; border-radius:50%; }
      .mw-close { display:block; margin:14px auto 0; background:transparent;
        border:1px solid #475569; color:#94a3b8; padding:6px 20px;
        border-radius:8px; cursor:pointer; font-size:.85rem; }
    `;
    document.head.appendChild(s);
  }

  // ── Canvas wheel ─────────────────────────────────────────────────────────────

  function drawWheel(angle) {
    if (!canvas || !ctx) return;
    var W   = canvas.width;
    var cx  = W / 2, cy = W / 2, r = cx - 4;
    ctx.clearRect(0, 0, W, W);

    var sliceAngle = (Math.PI * 2) / TOTAL;
    WHEEL.forEach(function (mult, i) {
      var seg   = segForMult(mult);
      var start = angle + i * sliceAngle;
      var end   = start + sliceAngle;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, start, end);
      ctx.closePath();
      ctx.fillStyle = seg.color + (i % 2 === 0 ? 'dd' : 'aa');
      ctx.fill();
      ctx.strokeStyle = '#1e1e2e';
      ctx.lineWidth = 0.8;
      ctx.stroke();
    });

    // Labels for segments with enough space
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    SEGMENTS.forEach(function (seg) {
      if (seg.count < 2) return;
      var firstIdx = WHEEL.indexOf(seg.mult);
      var midIdx   = firstIdx + Math.floor(seg.count / 2);
      var midAngle = angle + midIdx * sliceAngle + sliceAngle / 2;
      var tx = cx + (r * 0.65) * Math.cos(midAngle);
      var ty = cy + (r * 0.65) * Math.sin(midAngle);
      ctx.save();
      ctx.translate(tx, ty);
      ctx.rotate(midAngle + Math.PI / 2);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold ' + (seg.count > 8 ? 11 : 9) + 'px sans-serif';
      ctx.fillText(seg.mult + 'x', 0, 0);
      ctx.restore();
    });
    ctx.restore();

    // Center hub
    ctx.beginPath();
    ctx.arc(cx, cy, 14, 0, Math.PI * 2);
    ctx.fillStyle = '#1e1e2e';
    ctx.fill();
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }

  // ── Spin animation ────────────────────────────────────────────────────────────

  function animateSpin(targetSlot, onDone) {
    var sliceAngle = (Math.PI * 2) / TOTAL;
    var targetAngle = -(targetSlot * sliceAngle + sliceAngle / 2) - Math.PI / 2;
    var fullSpins   = (6 + Math.floor(Math.random() * 5)) * Math.PI * 2;
    var endAngle    = targetAngle - fullSpins;
    var startAngle  = currentAngle;
    var duration    = 4000 + Math.random() * 1500;
    var startTime   = null;

    function easeOut(t) { return 1 - Math.pow(1 - t, 4); }

    function frame(ts) {
      if (!startTime) startTime = ts;
      var t = Math.min(1, (ts - startTime) / duration);
      currentAngle = startAngle + (endAngle - startAngle) * easeOut(t);
      drawWheel(currentAngle);
      if (t < 1) {
        animFrame = requestAnimationFrame(frame);
      } else {
        currentAngle = endAngle;
        drawWheel(currentAngle);
        onDone();
      }
    }
    animFrame = requestAnimationFrame(frame);
  }

  // ── Modal ─────────────────────────────────────────────────────────────────────

  function buildModal() {
    if (document.getElementById('mwModal')) return;
    injectCSS();

    modal = document.createElement('div');
    modal.id = 'mwModal';
    modal.innerHTML = `
      <div class="mw-box">
        <div class="mw-title">&#x1F4B0; Money Wheel</div>
        <div class="mw-canvas-wrap">
          <canvas id="mwCanvas" width="220" height="220"></canvas>
          <div class="mw-needle"></div>
        </div>
        <div class="mw-multiplier" id="mwMult">?</div>
        <div class="mw-bet-row">
          <label>Bet:</label>
          <input type="number" class="mw-bet-input" id="mwBet" min="0.25" max="250" step="0.25" value="1">
        </div>
        <div class="mw-quick-bets">
          <button class="mw-qb" data-v="1">$1</button>
          <button class="mw-qb" data-v="5">$5</button>
          <button class="mw-qb" data-v="10">$10</button>
          <button class="mw-qb" data-v="25">$25</button>
          <button class="mw-qb" data-v="50">$50</button>
          <button class="mw-qb" data-v="100">$100</button>
        </div>
        <button class="mw-spin-btn" id="mwSpinBtn">&#x1F4B0; SPIN</button>
        <div class="mw-result" id="mwResult"></div>
        <div class="mw-legend" id="mwLegend"></div>
        <button class="mw-close" id="mwClose">Close</button>
      </div>
    `;
    document.body.appendChild(modal);

    canvas = document.getElementById('mwCanvas');
    ctx    = canvas.getContext('2d');
    drawWheel(currentAngle);

    // Legend
    var leg = document.getElementById('mwLegend');
    SEGMENTS.forEach(function (seg) {
      var item = document.createElement('div');
      item.className = 'mw-leg-item';
      item.innerHTML =
        '<div class="mw-leg-dot" style="background:' + seg.color + '"></div>' +
        '<span style="color:' + seg.color + '">' + seg.mult + 'x</span>' +
        '<span style="color:#475569">×' + seg.count + '</span>';
      leg.appendChild(item);
    });

    // Quick bets
    modal.querySelectorAll('.mw-qb').forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.getElementById('mwBet').value = btn.dataset.v;
      });
    });

    document.getElementById('mwSpinBtn').addEventListener('click', doSpin);
    document.getElementById('mwClose').addEventListener('click', window.closeMoneyWheel);
    modal.addEventListener('click', function (e) {
      if (e.target === modal) window.closeMoneyWheel();
    });
  }

  // ── Spin ──────────────────────────────────────────────────────────────────────

  function doSpin() {
    if (spinning) return;
    var bet = parseFloat(document.getElementById('mwBet').value) || 0;
    if (bet <= 0) { setResult('Enter a bet amount.', false); return; }

    var token = localStorage.getItem('authToken') || '';
    spinning  = true;
    document.getElementById('mwSpinBtn').disabled = true;
    document.getElementById('mwMult').textContent = '?';
    setResult('', null);

    fetch('/api/moneywheel/spin', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body:    JSON.stringify({ bet: bet }),
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.error) { endSpin(); setResult('\u274C ' + data.error, false); return; }
        animateSpin(data.slotIndex, function () {
          var seg = segForMult(data.mult);
          var multEl = document.getElementById('mwMult');
          multEl.textContent = data.mult + 'x';
          multEl.style.color = seg ? seg.color : '#fbbf24';
          endSpin();

          if (data.profit > 0) {
            setResult('\uD83C\uDF89 ' + data.mult + 'x — Won $' + data.payout.toFixed(2) + ' (profit +$' + data.profit.toFixed(2) + ')', true);
          } else if (data.mult === 1) {
            setResult('\uD83D\uDCB0 1x — Got your $' + bet.toFixed(2) + ' back', null);
          } else {
            setResult('\uD83D\uDEAB Lost $' + bet.toFixed(2), false);
          }
          if (typeof updateBalance === 'function') updateBalance(data.newBalance);
        });
      })
      .catch(function (err) {
        endSpin();
        setResult('\u274C Network error', false);
        console.error('[MoneyWheel]', err);
      });
  }

  function endSpin() {
    spinning = false;
    var btn = document.getElementById('mwSpinBtn');
    if (btn) btn.disabled = false;
  }

  function setResult(msg, win) {
    var el = document.getElementById('mwResult');
    if (!el) return;
    el.textContent = msg;
    el.className = 'mw-result' + (win === true ? ' mw-win' : win === false && msg ? ' mw-lose' : '');
  }

  // ── Public API ────────────────────────────────────────────────────────────────

  window.openMoneyWheel = function () {
    buildModal();
    modal.classList.add('active');
    drawWheel(currentAngle);
  };

  window.closeMoneyWheel = function () {
    if (modal) modal.classList.remove('active');
    if (animFrame) { cancelAnimationFrame(animFrame); animFrame = null; }
  };
}());
