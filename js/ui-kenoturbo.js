(function () {
  'use strict';

  var BALLS  = 80;
  var DRAWN  = 20;

  // Paytable mirrors server
  var PAYTABLE = {
    1:  { 0: 0, 1: 3 },
    2:  { 0: 0, 1: 0, 2: 12 },
    3:  { 0: 0, 1: 0, 2: 2,  3: 42 },
    4:  { 0: 0, 1: 0, 2: 1,  3: 5,   4: 100 },
    5:  { 0: 0, 1: 0, 2: 0,  3: 3,   4: 12,  5: 750 },
    6:  { 0: 0, 1: 0, 2: 0,  3: 2,   4: 6,   5: 80,   6: 1500 },
    7:  { 0: 0, 1: 0, 2: 0,  3: 1,   4: 3,   5: 20,   6: 200,  7: 5000 },
    8:  { 0: 0, 1: 0, 2: 0,  3: 0,   4: 2,   5: 8,    6: 50,   7: 500,  8: 10000 },
    9:  { 0: 0, 1: 0, 2: 0,  3: 0,   4: 1,   5: 4,    6: 20,   7: 100,  8: 2000, 9: 25000 },
    10: { 0: 0, 1: 0, 2: 0,  3: 0,   4: 0,   5: 2,    6: 10,   7: 50,   8: 500,  9: 5000, 10: 100000 },
  };

  var modal, picks = new Set(), spinning = false;
  var ballEls = [];

  // ── CSS ──────────────────────────────────────────────────────────────────────

  function injectCSS() {
    if (document.getElementById('kt-css')) return;
    var s = document.createElement('style');
    s.id = 'kt-css';
    s.textContent = `
      #ktModal { display:none; position:fixed; inset:0; background:rgba(0,0,0,.88);
        z-index:10400; align-items:center; justify-content:center; }
      #ktModal.active { display:flex; }
      .kt-box { background:#1e1e2e; border:2px solid #a855f7; border-radius:16px;
        padding:20px; max-width:600px; width:97%; color:#e2e8f0;
        font-family:sans-serif; max-height:94vh; overflow-y:auto; }
      .kt-title { text-align:center; font-size:1.5rem; font-weight:800;
        color:#a855f7; margin-bottom:4px; }
      .kt-subtitle { text-align:center; font-size:.75rem; color:#64748b;
        margin-bottom:14px; }
      /* Ball grid */
      .kt-grid { display:grid; grid-template-columns:repeat(10,1fr); gap:4px;
        margin-bottom:14px; }
      .kt-ball { aspect-ratio:1; border-radius:50%; border:2px solid #334155;
        background:#0f172a; color:#94a3b8; font-size:.7rem; font-weight:700;
        cursor:pointer; display:flex; align-items:center; justify-content:center;
        transition:background .12s,border-color .12s,color .12s; user-select:none; }
      .kt-ball.picked  { background:#a855f722; border-color:#a855f7; color:#a855f7; }
      .kt-ball.drawn   { background:#1e3a5f;   border-color:#3b82f6; color:#93c5fd; }
      .kt-ball.hit     { background:#14532d;   border-color:#4ade80; color:#4ade80;
        box-shadow:0 0 8px #4ade8066; }
      .kt-ball.miss    { background:#3b0a0a;   border-color:#ef4444; color:#ef4444; }

      /* Controls */
      .kt-controls { display:flex; gap:8px; align-items:center; margin-bottom:12px;
        flex-wrap:wrap; }
      .kt-bet-label { font-size:.8rem; color:#94a3b8; white-space:nowrap; }
      .kt-bet-input { width:80px; padding:6px 8px; background:#0f172a;
        border:1px solid #475569; border-radius:6px; color:#e2e8f0;
        font-size:.9rem; text-align:center; }
      .kt-bet-input:focus { outline:none; border-color:#a855f7; }
      .kt-pick-info { flex:1; text-align:center; font-size:.8rem; color:#64748b; }
      .kt-clear-btn { padding:5px 12px; background:transparent; border:1px solid #475569;
        color:#94a3b8; border-radius:6px; cursor:pointer; font-size:.8rem; }
      .kt-clear-btn:hover { border-color:#a855f7; color:#a855f7; }

      .kt-play-btn { width:100%; padding:13px; background:linear-gradient(135deg,#a855f7,#7c3aed);
        color:#fff; font-weight:800; font-size:1.1rem; border:none; border-radius:10px;
        cursor:pointer; letter-spacing:.04em; transition:opacity .2s; }
      .kt-play-btn:disabled { opacity:.4; cursor:not-allowed; }

      /* Paytable */
      .kt-paytable { margin-top:12px; font-size:.72rem; }
      .kt-paytable-title { color:#64748b; margin-bottom:6px; font-weight:700; }
      .kt-pt-row { display:flex; gap:6px; flex-wrap:wrap; margin-bottom:3px; }
      .kt-pt-chip { background:#0f172a; border:1px solid #334155; border-radius:4px;
        padding:2px 6px; color:#94a3b8; }
      .kt-pt-chip.active { border-color:#a855f7; color:#a855f7; }
      .kt-pt-chip.hit    { border-color:#4ade80; color:#4ade80; }

      .kt-result { text-align:center; font-size:1.1rem; font-weight:800;
        min-height:36px; margin-top:10px; }
      .kt-win  { color:#4ade80; }
      .kt-lose { color:#f87171; }
      .kt-close { display:block; margin:12px auto 0; background:transparent;
        border:1px solid #475569; color:#94a3b8; padding:6px 20px;
        border-radius:8px; cursor:pointer; font-size:.85rem; }

      /* Stats bar */
      .kt-stats { display:flex; gap:16px; justify-content:center; font-size:.75rem;
        color:#64748b; margin-bottom:10px; }
      .kt-stats span { color:#e2e8f0; font-weight:700; }
    `;
    document.head.appendChild(s);
  }

  // ── Build modal ───────────────────────────────────────────────────────────────

  function buildModal() {
    if (document.getElementById('ktModal')) return;
    injectCSS();

    modal = document.createElement('div');
    modal.id = 'ktModal';
    modal.innerHTML = `
      <div class="kt-box">
        <div class="kt-title">&#x1F7E3; Keno Turbo</div>
        <div class="kt-subtitle">Pick 1–10 numbers · 20 balls drawn · ~27% house edge</div>

        <div class="kt-stats">
          Picks: <span id="ktPickCount">0</span>/10 &nbsp;|&nbsp;
          Hits: <span id="ktHitCount">—</span> &nbsp;|&nbsp;
          Multiplier: <span id="ktMult">—</span>
        </div>

        <div class="kt-grid" id="ktGrid"></div>

        <div class="kt-controls">
          <span class="kt-bet-label">Bet $</span>
          <input type="number" class="kt-bet-input" id="ktBet" min="0.25" max="100" step="0.25" value="1">
          <span class="kt-pick-info" id="ktPickInfo">Click numbers to select</span>
          <button class="kt-clear-btn" id="ktClearBtn">Clear</button>
        </div>

        <button class="kt-play-btn" id="ktPlayBtn">&#x1F7E3; PLAY</button>
        <div class="kt-result" id="ktResult"></div>

        <div class="kt-paytable" id="ktPaytable"></div>

        <button class="kt-close" id="ktClose">Close</button>
      </div>
    `;
    document.body.appendChild(modal);

    // Build ball grid
    var grid = document.getElementById('ktGrid');
    ballEls = [];
    for (var n = 1; n <= BALLS; n++) {
      (function (num) {
        var el = document.createElement('div');
        el.className = 'kt-ball';
        el.textContent = num;
        el.dataset.n = num;
        el.addEventListener('click', function () { togglePick(num, el); });
        grid.appendChild(el);
        ballEls[num] = el;
      })(n);
    }

    document.getElementById('ktClearBtn').addEventListener('click', clearPicks);
    document.getElementById('ktPlayBtn').addEventListener('click', doPlay);
    document.getElementById('ktClose').addEventListener('click', window.closeKenoTurbo);
    modal.addEventListener('click', function (e) {
      if (e.target === modal) window.closeKenoTurbo();
    });

    renderPaytable();
  }

  function togglePick(n, el) {
    if (spinning) return;
    if (picks.has(n)) {
      picks.delete(n);
      el.classList.remove('picked');
    } else {
      if (picks.size >= 10) return;
      picks.add(n);
      el.classList.add('picked');
    }
    updatePickInfo();
    renderPaytable();
  }

  function clearPicks() {
    picks.forEach(function (n) {
      if (ballEls[n]) ballEls[n].classList.remove('picked', 'drawn', 'hit', 'miss');
    });
    picks.clear();
    updatePickInfo();
    renderPaytable();
  }

  function resetBalls() {
    for (var n = 1; n <= BALLS; n++) {
      if (ballEls[n]) ballEls[n].classList.remove('drawn', 'hit', 'miss');
    }
  }

  function updatePickInfo() {
    var pc = document.getElementById('ktPickCount');
    var pi = document.getElementById('ktPickInfo');
    if (pc) pc.textContent = picks.size;
    if (pi) pi.textContent = picks.size === 0 ? 'Click numbers to select'
      : picks.size + ' number' + (picks.size > 1 ? 's' : '') + ' selected';
  }

  function renderPaytable() {
    var el = document.getElementById('ktPaytable');
    if (!el) return;
    var p = picks.size;
    if (p === 0) { el.innerHTML = ''; return; }
    var table = PAYTABLE[p] || {};
    var html = '<div class="kt-paytable-title">Paytable for ' + p + ' pick' + (p > 1 ? 's' : '') + ':</div>';
    html += '<div class="kt-pt-row">';
    for (var h = 0; h <= p; h++) {
      var m = table[h] || 0;
      if (m > 0) {
        html += '<div class="kt-pt-chip active">' + h + ' hit' + (h !== 1 ? 's' : '') + ' → ' + m + 'x</div>';
      }
    }
    html += '</div>';
    el.innerHTML = html;
  }

  // ── Play ──────────────────────────────────────────────────────────────────────

  function doPlay() {
    if (spinning) return;
    if (picks.size === 0) { setResult('Select at least 1 number.', false); return; }

    var bet = parseFloat(document.getElementById('ktBet').value) || 0;
    if (bet <= 0) { setResult('Enter a bet amount.', false); return; }

    var token = localStorage.getItem('authToken') || '';
    spinning  = true;
    document.getElementById('ktPlayBtn').disabled = true;
    document.getElementById('ktHitCount').textContent = '—';
    document.getElementById('ktMult').textContent = '—';
    setResult('', null);
    resetBalls();

    fetch('/api/kenoturbo/play', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body:    JSON.stringify({ bet: bet, picks: Array.from(picks) }),
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.error) { endPlay(); setResult('\u274C ' + data.error, false); return; }

        // Animate ball reveal
        var drawnSet = new Set(data.drawn);
        var picksArr = Array.from(picks);
        var delay    = 0;
        var INTERVAL = Math.min(80, Math.floor(1600 / DRAWN));

        data.drawn.forEach(function (n) {
          setTimeout(function () {
            var el = ballEls[n];
            if (!el) return;
            if (picksArr.indexOf(n) >= 0) {
              el.classList.add('hit');
            } else {
              el.classList.add('drawn');
            }
          }, delay);
          delay += INTERVAL;
        });

        // Mark misses (picked but not drawn)
        picksArr.forEach(function (n) {
          if (!drawnSet.has(n)) {
            setTimeout(function () {
              if (ballEls[n]) ballEls[n].classList.add('miss');
            }, delay);
          }
        });

        setTimeout(function () {
          endPlay();
          document.getElementById('ktHitCount').textContent = data.hits;
          document.getElementById('ktMult').textContent = data.mult > 0 ? data.mult + 'x' : '0x';

          if (data.profit > 0) {
            setResult('\uD83C\uDF89 ' + data.hits + '/' + picks.size + ' hits — Won $' + data.payout.toFixed(2) + '! (+$' + data.profit.toFixed(2) + ')', true);
          } else {
            setResult('\uD83D\uDEAB ' + data.hits + '/' + picks.size + ' hits — Lost $' + bet.toFixed(2), false);
          }
          if (typeof updateBalance === 'function') updateBalance(data.newBalance);
        }, delay + 200);
      })
      .catch(function (err) {
        endPlay();
        setResult('\u274C Network error', false);
        console.error('[KenoTurbo]', err);
      });
  }

  function endPlay() {
    spinning = false;
    var btn = document.getElementById('ktPlayBtn');
    if (btn) btn.disabled = false;
  }

  function setResult(msg, win) {
    var el = document.getElementById('ktResult');
    if (!el) return;
    el.textContent = msg;
    el.className = 'kt-result' + (win === true ? ' kt-win' : win === false && msg ? ' kt-lose' : '');
  }

  // ── Public API ────────────────────────────────────────────────────────────────

  window.openKenoTurbo = function () {
    buildModal();
    modal.classList.add('active');
    updatePickInfo();
  };

  window.closeKenoTurbo = function () {
    if (modal) modal.classList.remove('active');
  };
}());
