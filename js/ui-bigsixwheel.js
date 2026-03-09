(function () {
  'use strict';

  var SEGMENTS = [
    { id: '1',     label: '$1',    color: '#3b82f6', payout: 1  },
    { id: '2',     label: '$2',    color: '#10b981', payout: 2  },
    { id: '5',     label: '$5',    color: '#f59e0b', payout: 5  },
    { id: '10',    label: '$10',   color: '#ef4444', payout: 10 },
    { id: '20',    label: '$20',   color: '#8b5cf6', payout: 20 },
    { id: 'joker', label: 'Joker', color: '#ec4899', payout: 45 },
    { id: 'logo',  label: 'Logo',  color: '#fbbf24', payout: 45 },
  ];

  // Wheel slot distribution (54 total)
  var WHEEL = [];
  var COUNTS = { '1': 24, '2': 15, '5': 7, '10': 4, '20': 2, 'joker': 1, 'logo': 1 };
  SEGMENTS.forEach(function (seg) {
    for (var i = 0; i < COUNTS[seg.id]; i++) WHEEL.push(seg.id);
  });
  var TOTAL = WHEEL.length; // 54

  var modal, canvas, ctx, bets = {}, spinning = false;
  var currentAngle = 0, animFrame = null;

  function segForId(id) { return SEGMENTS.find(function (s) { return s.id === id; }); }

  // ── CSS ──────────────────────────────────────────────────────────────────────

  function injectCSS() {
    if (document.getElementById('bsw-css')) return;
    var s = document.createElement('style');
    s.id = 'bsw-css';
    s.textContent = `
      #bswModal { display:none; position:fixed; inset:0; background:rgba(0,0,0,.82);
        z-index:10400; align-items:center; justify-content:center; }
      #bswModal.active { display:flex; }
      .bsw-box { background:#1e1e2e; border:2px solid #fbbf24; border-radius:16px;
        padding:24px; max-width:560px; width:95%; color:#e2e8f0; font-family:sans-serif; }
      .bsw-title { text-align:center; font-size:1.5rem; font-weight:700;
        color:#fbbf24; margin-bottom:16px; }
      .bsw-canvas-wrap { display:flex; justify-content:center; margin-bottom:16px; position:relative; }
      #bswCanvas { border-radius:50%; box-shadow:0 0 24px #fbbf2466; }
      .bsw-needle { position:absolute; top:-10px; left:50%; transform:translateX(-50%);
        width:0; height:0;
        border-left:10px solid transparent; border-right:10px solid transparent;
        border-top:28px solid #fbbf24; filter:drop-shadow(0 0 6px #fbbf24); }
      .bsw-bets { display:grid; grid-template-columns:repeat(4,1fr); gap:8px; margin-bottom:14px; }
      .bsw-bet-cell { display:flex; flex-direction:column; align-items:center; gap:4px; }
      .bsw-bet-label { font-size:.75rem; font-weight:700; }
      .bsw-bet-input { width:64px; padding:4px 6px; border-radius:6px; border:1px solid #475569;
        background:#0f172a; color:#e2e8f0; text-align:center; font-size:.85rem; }
      .bsw-bet-input:focus { outline:none; border-color:#fbbf24; }
      .bsw-payout-tag { font-size:.65rem; color:#94a3b8; }
      .bsw-spin-btn { width:100%; padding:12px; background:#fbbf24; color:#0f172a;
        font-weight:800; font-size:1.1rem; border:none; border-radius:10px; cursor:pointer;
        transition:opacity .2s; }
      .bsw-spin-btn:disabled { opacity:.45; cursor:not-allowed; }
      .bsw-result { text-align:center; min-height:36px; font-size:1.1rem; font-weight:700;
        margin-top:12px; }
      .bsw-win  { color:#4ade80; }
      .bsw-lose { color:#f87171; }
      .bsw-close { display:block; margin:14px auto 0; background:transparent;
        border:1px solid #475569; color:#94a3b8; padding:6px 20px; border-radius:8px;
        cursor:pointer; font-size:.85rem; }
      .bsw-odds { display:flex; flex-wrap:wrap; gap:6px; justify-content:center;
        margin-bottom:12px; font-size:.72rem; color:#64748b; }
      .bsw-odds span { background:#0f172a; border-radius:4px; padding:2px 6px; }
    `;
    document.head.appendChild(s);
  }

  // ── Canvas wheel ─────────────────────────────────────────────────────────────

  function drawWheel(angle) {
    if (!canvas || !ctx) return;
    var W = canvas.width, cx = W / 2, cy = W / 2, r = cx - 4;
    ctx.clearRect(0, 0, W, W);

    var sliceAngle = (Math.PI * 2) / TOTAL;
    WHEEL.forEach(function (id, i) {
      var seg = segForId(id);
      var start = angle + i * sliceAngle;
      var end   = start + sliceAngle;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, start, end);
      ctx.closePath();
      ctx.fillStyle = seg.color + (i % 2 === 0 ? 'dd' : 'aa');
      ctx.fill();
      ctx.strokeStyle = '#1e1e2e';
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    // Segment labels — only draw for larger segments
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    SEGMENTS.forEach(function (seg) {
      var count = COUNTS[seg.id];
      if (count < 2) return; // skip tiny segments (text too cramped)
      // Find first occurrence
      var firstIdx = WHEEL.indexOf(seg.id);
      var midIdx   = firstIdx + Math.floor(count / 2);
      var midAngle = angle + midIdx * sliceAngle + sliceAngle / 2;
      var tx = cx + (r * 0.62) * Math.cos(midAngle);
      var ty = cy + (r * 0.62) * Math.sin(midAngle);
      ctx.save();
      ctx.translate(tx, ty);
      ctx.rotate(midAngle + Math.PI / 2);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold ' + (count > 10 ? '11' : '9') + 'px sans-serif';
      ctx.fillText(seg.label, 0, 0);
      ctx.restore();
    });
    ctx.restore();

    // Center circle
    ctx.beginPath();
    ctx.arc(cx, cy, 14, 0, Math.PI * 2);
    ctx.fillStyle = '#1e1e2e';
    ctx.fill();
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // ── Build modal ───────────────────────────────────────────────────────────────

  function buildModal() {
    if (document.getElementById('bswModal')) return;
    injectCSS();

    modal = document.createElement('div');
    modal.id = 'bswModal';
    modal.innerHTML = `
      <div class="bsw-box">
        <div class="bsw-title">&#x1F3A1; Big Six Wheel</div>
        <div class="bsw-canvas-wrap">
          <canvas id="bswCanvas" width="220" height="220"></canvas>
          <div class="bsw-needle"></div>
        </div>
        <div class="bsw-odds">
          <span>$1 ×24 → 1:1 (11% edge)</span>
          <span>$2 ×15 → 2:1 (16% edge)</span>
          <span>$5 ×7 → 5:1 (22% edge)</span>
          <span>$10 ×4 → 10:1 (18% edge)</span>
          <span>$20 ×2 → 20:1 (22% edge)</span>
          <span>Joker/Logo ×1 → 45:1 (17% edge)</span>
        </div>
        <div class="bsw-bets" id="bswBetsGrid"></div>
        <button class="bsw-spin-btn" id="bswSpinBtn">SPIN</button>
        <div class="bsw-result" id="bswResult"></div>
        <button class="bsw-close" id="bswClose">Close</button>
      </div>
    `;
    document.body.appendChild(modal);

    canvas = document.getElementById('bswCanvas');
    ctx    = canvas.getContext('2d');
    drawWheel(currentAngle);

    // Build bet cells
    var grid = document.getElementById('bswBetsGrid');
    SEGMENTS.forEach(function (seg) {
      var cell = document.createElement('div');
      cell.className = 'bsw-bet-cell';
      cell.innerHTML =
        '<span class="bsw-bet-label" style="color:' + seg.color + '">' + seg.label + '</span>' +
        '<input type="number" class="bsw-bet-input" id="bswBet_' + seg.id + '" min="0" step="0.25" placeholder="0">' +
        '<span class="bsw-payout-tag">' + seg.payout + ':1</span>';
      grid.appendChild(cell);
    });

    document.getElementById('bswSpinBtn').addEventListener('click', doSpin);
    document.getElementById('bswClose').addEventListener('click', window.closeBigSixWheel);

    modal.addEventListener('click', function (e) {
      if (e.target === modal) window.closeBigSixWheel();
    });
  }

  // ── Spin animation ────────────────────────────────────────────────────────────

  function animateSpin(targetSlot, onDone) {
    // Full rotations + land on targetSlot
    var sliceAngle = (Math.PI * 2) / TOTAL;
    // Needle is at top (−π/2); target slot center angle in wheel coords:
    var targetAngle = -(targetSlot * sliceAngle + sliceAngle / 2) - Math.PI / 2;
    var fullSpins   = (5 + Math.floor(Math.random() * 4)) * Math.PI * 2;
    var endAngle    = targetAngle - fullSpins;

    var startAngle  = currentAngle;
    var duration    = 3500 + Math.random() * 1000;
    var startTime   = null;

    function ease(t) {
      // ease-out cubic
      return 1 - Math.pow(1 - t, 3);
    }

    function frame(ts) {
      if (!startTime) startTime = ts;
      var t = Math.min(1, (ts - startTime) / duration);
      currentAngle = startAngle + (endAngle - startAngle) * ease(t);
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

  // ── API call ──────────────────────────────────────────────────────────────────

  function doSpin() {
    if (spinning) return;

    var betPayload = {};
    var anyBet = false;
    SEGMENTS.forEach(function (seg) {
      var inp = document.getElementById('bswBet_' + seg.id);
      var v   = parseFloat(inp ? inp.value : 0) || 0;
      if (v > 0) { betPayload[seg.id] = v; anyBet = true; }
    });

    if (!anyBet) {
      setResult('Place a bet on at least one segment.', false);
      return;
    }

    var token = localStorage.getItem('authToken') || (typeof getAuthToken === 'function' ? getAuthToken() : '');
    spinning = true;
    document.getElementById('bswSpinBtn').disabled = true;
    setResult('', false);

    fetch('/api/bigsixwheel/spin', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body:    JSON.stringify({ bets: betPayload }),
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.error) { endSpin(); setResult('\u274C ' + data.error, false); return; }
        animateSpin(data.slotIndex, function () {
          endSpin();
          var seg  = segForId(data.result);
          var won  = data.profit > 0;
          var msg;
          if (won) {
            msg = '\uD83C\uDF89 ' + seg.label + ' — You win $' + data.profit.toFixed(2) + '!';
          } else if (data.profit === 0) {
            msg = '\uD83D\uDCB0 ' + seg.label + ' — Push (returned $' + Math.abs(data.winAmount || 0).toFixed(2) + ')';
          } else {
            msg = '\uD83D\uDEAB ' + seg.label + ' — Lost $' + Math.abs(data.profit).toFixed(2);
          }
          setResult(msg, won);
          if (typeof updateBalance === 'function') updateBalance(data.newBalance);
        });
      })
      .catch(function (err) {
        endSpin();
        setResult('\u274C Network error', false);
        console.error('[BigSix]', err);
      });
  }

  function endSpin() {
    spinning = false;
    var btn = document.getElementById('bswSpinBtn');
    if (btn) btn.disabled = false;
  }

  function setResult(msg, win) {
    var el = document.getElementById('bswResult');
    if (!el) return;
    el.textContent = msg;
    el.className   = 'bsw-result ' + (win ? 'bsw-win' : win === false && msg ? 'bsw-lose' : '');
  }

  // ── Public API ────────────────────────────────────────────────────────────────

  window.openBigSixWheel = function () {
    buildModal();
    modal.classList.add('active');
    drawWheel(currentAngle);
  };

  window.closeBigSixWheel = function () {
    if (modal) modal.classList.remove('active');
    if (animFrame) { cancelAnimationFrame(animFrame); animFrame = null; }
  };
}());
