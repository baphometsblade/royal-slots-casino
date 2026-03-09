(function() {
  'use strict';

  var TOKEN_KEY = typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken';

  var _overlay    = null;
  var _stylesInj  = false;
  var _picks      = [];
  var _bet        = 1.00;
  var _playing    = false;
  var MAX_PICKS   = 10;
  var POOL_SIZE   = 80;

  function getToken() {
    try { return localStorage.getItem(TOKEN_KEY); } catch(e) { return null; }
  }

  function injectStyles() {
    if (_stylesInj) return;
    _stylesInj = true;
    var s = document.createElement('style');
    s.textContent = [
      '#kenoOverlay{position:fixed;inset:0;background:rgba(0,0,0,.92);z-index:10400;display:none;align-items:center;justify-content:center;font-family:monospace}',
      '#kenoOverlay.active{display:flex}',
      '#kenoModal{background:linear-gradient(135deg,#050510,#0a1628);border:2px solid rgba(99,102,241,.35);border-radius:20px;padding:20px 24px;max-width:540px;width:96%;text-align:center;max-height:96vh;overflow-y:auto}',
      '#kenoModal h2{color:#818cf8;font-size:20px;margin:0 0 2px;letter-spacing:1px}',
      '#kenoModal .kn-sub{color:rgba(255,255,255,.4);font-size:11px;margin-bottom:14px}',
      '.kn-controls{display:flex;gap:10px;align-items:center;justify-content:center;margin-bottom:12px;flex-wrap:wrap}',
      '.kn-ctrl-group{display:flex;flex-direction:column;align-items:flex-start;gap:3px}',
      '.kn-ctrl-group label{font-size:10px;color:rgba(255,255,255,.4);text-transform:uppercase;letter-spacing:.5px}',
      '.kn-input{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);border-radius:8px;color:#fff;padding:7px 10px;font-size:14px;font-weight:700;width:80px;text-align:center}',
      '.kn-input:focus{outline:none;border-color:rgba(99,102,241,.6)}',
      '.kn-pick-info{font-size:12px;color:rgba(255,255,255,.5);margin-bottom:10px;min-height:16px}',
      '.kn-pick-info .kn-pick-count{color:#a5b4fc;font-weight:700}',
      '#kenoGrid{display:grid;grid-template-columns:repeat(10,1fr);gap:4px;margin:0 auto 14px;max-width:480px}',
      '.kn-num{aspect-ratio:1;border-radius:6px;border:1px solid rgba(255,255,255,.10);background:rgba(255,255,255,.05);cursor:pointer;font-size:11px;font-weight:700;color:rgba(255,255,255,.55);display:flex;align-items:center;justify-content:center;transition:all .12s;user-select:none}',
      '.kn-num:hover:not(.kn-disabled){border-color:rgba(99,102,241,.6);background:rgba(99,102,241,.15);color:#c7d2fe}',
      '.kn-num.kn-picked{background:rgba(99,102,241,.35);border-color:#818cf8;color:#e0e7ff;font-weight:900}',
      '.kn-num.kn-drawn{background:rgba(251,191,36,.18);border-color:#fbbf24;color:#fde68a}',
      '.kn-num.kn-match{background:linear-gradient(135deg,#065f46,#064e3b);border-color:#10b981;color:#6ee7b7;animation:knPop .25s ease}',
      '.kn-num.kn-miss{opacity:.3}',
      '.kn-num.kn-disabled{cursor:default}',
      '@keyframes knPop{0%{transform:scale(.7)}70%{transform:scale(1.15)}100%{transform:scale(1)}}',
      '#kenoMultiplier{font-size:26px;font-weight:900;color:#fbbf24;min-height:32px;margin-bottom:8px;transition:transform .15s}',
      '#kenoMultiplier.bump{transform:scale(1.2)}',
      '#kenoResult{font-size:14px;font-weight:800;min-height:20px;color:#a5b4fc;margin-bottom:10px}',
      '.kn-quick-picks{display:flex;gap:6px;justify-content:center;margin-bottom:10px;flex-wrap:wrap}',
      '.kn-qp-btn{background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.13);border-radius:7px;color:rgba(255,255,255,.6);padding:4px 10px;font-size:11px;font-weight:700;cursor:pointer;transition:all .12s}',
      '.kn-qp-btn:hover{background:rgba(99,102,241,.2);border-color:rgba(99,102,241,.5);color:#c7d2fe}',
      '#kenoPlayBtn{background:linear-gradient(135deg,#4f46e5,#3730a3);color:#fff;border:none;padding:13px 0;border-radius:12px;font-size:16px;font-weight:900;cursor:pointer;width:100%;margin-bottom:6px;letter-spacing:.5px;transition:transform .1s}',
      '#kenoPlayBtn:hover:not(:disabled){transform:scale(1.02)}',
      '#kenoPlayBtn:disabled{opacity:.4;cursor:not-allowed;transform:none}',
      '#kenoClearBtn{background:none;border:1px solid rgba(255,255,255,.12);color:rgba(255,255,255,.4);padding:7px 0;border-radius:8px;font-size:12px;cursor:pointer;width:100%;margin-bottom:6px;transition:all .1s}',
      '#kenoClearBtn:hover{border-color:rgba(255,255,255,.25);color:rgba(255,255,255,.65)}',
      '#kenoClose{background:none;border:none;color:rgba(255,255,255,.3);font-size:12px;cursor:pointer;text-decoration:underline}',
      '.kn-payout-row{display:flex;justify-content:space-between;font-size:11px;color:rgba(255,255,255,.45);padding:2px 6px;border-radius:4px}',
      '.kn-payout-row.kn-active-tier{background:rgba(16,185,129,.15);color:#6ee7b7;font-weight:800}',
      '#kenoPayTable{background:rgba(0,0,0,.3);border-radius:8px;padding:8px;margin-bottom:10px;font-size:11px}',
      '#kenoPayTable .kn-pt-header{color:rgba(255,255,255,.35);font-size:10px;text-transform:uppercase;letter-spacing:.5px;text-align:left;padding:0 6px;margin-bottom:4px}',
    ].join('\n');
    document.head.appendChild(s);
  }

  // ── number grid ──────────────────────────────────────────────────────────────

  function buildGrid() {
    var grid = document.getElementById('kenoGrid');
    if (!grid) return;
    while (grid.firstChild) grid.removeChild(grid.firstChild);
    for (var n = 1; n <= POOL_SIZE; n++) {
      (function(num) {
        var cell = document.createElement('div');
        cell.className = 'kn-num';
        cell.dataset.num = String(num);
        cell.textContent = String(num);
        cell.addEventListener('click', function() { onNumClick(num); });
        grid.appendChild(cell);
      })(n);
    }
  }

  function getNumEl(n) {
    var grid = document.getElementById('kenoGrid');
    return grid ? grid.querySelector('[data-num="' + n + '"]') : null;
  }

  function refreshPickHighlights() {
    for (var n = 1; n <= POOL_SIZE; n++) {
      var el = getNumEl(n);
      if (!el) continue;
      if (_picks.indexOf(n) !== -1) {
        el.classList.add('kn-picked');
      } else {
        el.classList.remove('kn-picked');
      }
    }
    // update pick-count display using safe DOM manipulation
    var info = document.getElementById('kenoPickInfo');
    if (info) {
      while (info.firstChild) info.removeChild(info.firstChild);
      info.appendChild(document.createTextNode('Selected: '));
      var span = document.createElement('span');
      span.className = 'kn-pick-count';
      span.textContent = _picks.length + ' / ' + MAX_PICKS;
      info.appendChild(span);
    }
    // update play button state
    var btn = document.getElementById('kenoPlayBtn');
    if (btn) btn.disabled = _playing || _picks.length === 0;
  }

  function onNumClick(num) {
    if (_playing) return;
    var idx = _picks.indexOf(num);
    if (idx !== -1) {
      _picks.splice(idx, 1);
    } else {
      if (_picks.length >= MAX_PICKS) return;
      _picks.push(num);
    }
    refreshPickHighlights();
    updatePayTableDisplay();
  }

  function clearPicks() {
    _picks = [];
    refreshPickHighlights();
    updatePayTableDisplay();
    setResult('Pick up to 10 numbers, then press Play!', '#a5b4fc');
    setMultiplier('');
    resetGridClasses();
  }

  function resetGridClasses() {
    var els = document.querySelectorAll('#kenoGrid .kn-num');
    for (var i = 0; i < els.length; i++) {
      els[i].classList.remove('kn-drawn', 'kn-match', 'kn-miss', 'kn-disabled');
    }
  }

  function quickPick(n) {
    if (_playing) return;
    _picks = [];
    var pool = [];
    for (var i = 1; i <= POOL_SIZE; i++) pool.push(i);
    for (var j = pool.length - 1; j > 0; j--) {
      var k = Math.floor(Math.random() * (j + 1));
      var tmp = pool[j]; pool[j] = pool[k]; pool[k] = tmp;
    }
    _picks = pool.slice(0, Math.min(n, MAX_PICKS));
    resetGridClasses();
    refreshPickHighlights();
    updatePayTableDisplay();
    setResult('Quick pick: ' + _picks.length + ' numbers selected!', '#a5b4fc');
  }

  // ── pay table display ─────────────────────────────────────────────────────

  var PAY_TABLE_CLIENT = {
    1:  { 1: 3 },
    2:  { 2: 9 },
    3:  { 2: 2,   3: 27 },
    4:  { 2: 1,   3: 4,   4: 72 },
    5:  { 3: 3,   4: 12,  5: 450 },
    6:  { 3: 2,   4: 8,   5: 50,   6: 900 },
    7:  { 3: 1,   4: 5,   5: 25,   6: 200,  7: 3500 },
    8:  { 4: 2,   5: 12,  6: 80,   7: 500,  8: 10000 },
    9:  { 5: 5,   6: 20,  7: 150,  8: 1500, 9: 10000 },
    10: { 5: 2,   6: 8,   7: 40,   8: 300,  9: 2500,  10: 10000 },
  };

  function updatePayTableDisplay(activeCatches) {
    var container = document.getElementById('kenoPayTable');
    if (!container) return;
    while (container.firstChild) container.removeChild(container.firstChild);
    var spots = _picks.length;
    if (spots === 0) {
      var ph = document.createElement('div');
      ph.style.cssText = 'color:rgba(255,255,255,.25);font-size:11px;padding:4px 6px;text-align:center';
      ph.textContent = 'Select numbers to see pay table';
      container.appendChild(ph);
      return;
    }
    var hdr = document.createElement('div');
    hdr.className = 'kn-pt-header';
    hdr.textContent = 'Pay table \u2014 ' + spots + ' spot' + (spots > 1 ? 's' : '');
    container.appendChild(hdr);
    var tbl = PAY_TABLE_CLIENT[spots] || {};
    var catches = Object.keys(tbl).map(Number).sort(function(a, b) { return b - a; });
    for (var i = 0; i < catches.length; i++) {
      var c = catches[i];
      var row = document.createElement('div');
      row.className = 'kn-payout-row' + (activeCatches === c ? ' kn-active-tier' : '');
      var left = document.createElement('span');
      left.textContent = 'Match ' + c;
      var right = document.createElement('span');
      right.textContent = tbl[c] + 'x';
      row.appendChild(left);
      row.appendChild(right);
      container.appendChild(row);
    }
  }

  // ── display helpers ───────────────────────────────────────────────────────

  function setMultiplier(text) {
    var el = document.getElementById('kenoMultiplier');
    if (!el) return;
    el.textContent = text;
    el.classList.remove('bump');
    void el.offsetWidth;
    if (text) el.classList.add('bump');
    setTimeout(function() { el.classList.remove('bump'); }, 250);
  }

  function setResult(text, color) {
    var el = document.getElementById('kenoResult');
    if (!el) return;
    el.textContent = text;
    el.style.color = color || '#a5b4fc';
  }

  // ── animate draw ──────────────────────────────────────────────────────────

  function animateDraw(drawn, matches, onDone) {
    var delay = 0;
    var STEP  = 80;
    for (var i = 0; i < drawn.length; i++) {
      (function(num, d) {
        setTimeout(function() {
          var el = getNumEl(num);
          if (!el) return;
          if (matches.indexOf(num) !== -1) {
            el.classList.add('kn-match', 'kn-disabled');
            el.classList.remove('kn-picked');
          } else {
            el.classList.add('kn-drawn', 'kn-disabled');
          }
        }, d);
      })(drawn[i], delay);
      delay += STEP;
    }
    setTimeout(onDone, delay + 50);
  }

  // ── play ──────────────────────────────────────────────────────────────────

  function doPlay() {
    if (_playing || _picks.length === 0) return;
    var token = getToken();
    if (!token) { setResult('Please log in to play.', '#f87171'); return; }
    var betInput = document.getElementById('kenoBetInput');
    var betVal   = betInput ? parseFloat(betInput.value) : 1.00;
    if (isNaN(betVal) || betVal < 0.25) betVal = 0.25;
    _bet = betVal;

    _playing = true;
    resetGridClasses();
    refreshPickHighlights();
    setResult('Drawing numbers\u2026', '#a5b4fc');
    setMultiplier('');

    var playBtn = document.getElementById('kenoPlayBtn');
    if (playBtn) { playBtn.disabled = true; playBtn.textContent = 'Drawing\u2026'; }

    fetch('/api/keno/play', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ bet: _bet, picks: _picks }),
    })
    .then(function(r) { return r.ok ? r.json() : r.json().then(function(e) { throw e; }); })
    .then(function(data) {
      // dim tiles that are neither picked nor drawn
      for (var n = 1; n <= POOL_SIZE; n++) {
        var el = getNumEl(n);
        if (!el) continue;
        var inPicks = _picks.indexOf(n) !== -1;
        var inDrawn = data.drawn.indexOf(n) !== -1;
        if (!inPicks && !inDrawn) el.classList.add('kn-miss', 'kn-disabled');
      }

      animateDraw(data.drawn, data.matches, function() {
        _playing = false;
        if (playBtn) { playBtn.disabled = false; playBtn.textContent = '\uD83C\uDFB1 Play'; }

        if (typeof window.updateBalance === 'function' && data.newBalance != null) {
          window.updateBalance(data.newBalance);
        }

        var catches = data.catches;
        updatePayTableDisplay(data.multiplier > 0 ? catches : -1);

        if (data.multiplier > 0) {
          setMultiplier(data.multiplier + 'x');
          setResult(
            '\uD83C\uDF89 ' + catches + '/' + data.spots + ' matches! Won $' + data.payout.toFixed(2),
            '#4ade80'
          );
        } else if (catches > 0) {
          setResult(catches + '/' + data.spots + ' matches \u2014 try again!', '#fbbf24');
        } else {
          setResult('No matches \u2014 pick more numbers!', '#f87171');
        }
      });
    })
    .catch(function(err) {
      _playing = false;
      if (playBtn) { playBtn.disabled = false; playBtn.textContent = '\uD83C\uDFB1 Play'; }
      setResult((err && err.error) || 'Error \u2014 check your balance.', '#f87171');
    });
  }

  // ── modal build ───────────────────────────────────────────────────────────

  function buildModal() {
    if (_overlay) return;
    _overlay = document.createElement('div');
    _overlay.id = 'kenoOverlay';

    var modal = document.createElement('div');
    modal.id = 'kenoModal';

    var icon = document.createElement('div');
    icon.style.cssText = 'font-size:30px;margin-bottom:2px';
    icon.textContent = '\uD83C\uDFB1';
    modal.appendChild(icon);

    var h2 = document.createElement('h2');
    h2.textContent = 'KENO';
    modal.appendChild(h2);

    var sub = document.createElement('div');
    sub.className = 'kn-sub';
    sub.textContent = 'Pick up to 10 numbers \u2014 20 are drawn. Match more, win more!';
    modal.appendChild(sub);

    // Bet control
    var controls = document.createElement('div');
    controls.className = 'kn-controls';

    var betGroup = document.createElement('div');
    betGroup.className = 'kn-ctrl-group';

    var betLabel = document.createElement('label');
    betLabel.textContent = 'Bet ($)';
    betLabel.htmlFor = 'kenoBetInput';

    var betInput = document.createElement('input');
    betInput.id = 'kenoBetInput';
    betInput.className = 'kn-input';
    betInput.type = 'number';
    betInput.min = '0.25';
    betInput.max = '200';
    betInput.step = '0.25';
    betInput.value = '1.00';

    betGroup.appendChild(betLabel);
    betGroup.appendChild(betInput);
    controls.appendChild(betGroup);
    modal.appendChild(controls);

    // Quick-pick row
    var qpDiv = document.createElement('div');
    qpDiv.className = 'kn-quick-picks';
    var qpLabel = document.createElement('span');
    qpLabel.style.cssText = 'font-size:10px;color:rgba(255,255,255,.35);align-self:center;margin-right:2px;text-transform:uppercase';
    qpLabel.textContent = 'Quick pick:';
    qpDiv.appendChild(qpLabel);
    [3, 5, 7, 10].forEach(function(n) {
      var btn = document.createElement('button');
      btn.className = 'kn-qp-btn';
      btn.textContent = n + ' spots';
      btn.addEventListener('click', function() { quickPick(n); });
      qpDiv.appendChild(btn);
    });
    modal.appendChild(qpDiv);

    // Pick info
    var pickInfo = document.createElement('div');
    pickInfo.id = 'kenoPickInfo';
    pickInfo.className = 'kn-pick-info';
    pickInfo.textContent = 'Selected: 0 / 10';
    modal.appendChild(pickInfo);

    // Number grid
    var grid = document.createElement('div');
    grid.id = 'kenoGrid';
    modal.appendChild(grid);

    // Pay table
    var ptContainer = document.createElement('div');
    ptContainer.id = 'kenoPayTable';
    modal.appendChild(ptContainer);

    // Multiplier + result
    var multEl = document.createElement('div');
    multEl.id = 'kenoMultiplier';
    modal.appendChild(multEl);

    var resultEl = document.createElement('div');
    resultEl.id = 'kenoResult';
    resultEl.textContent = 'Pick up to 10 numbers, then press Play!';
    resultEl.style.color = '#a5b4fc';
    modal.appendChild(resultEl);

    // Play button
    var playBtn = document.createElement('button');
    playBtn.id = 'kenoPlayBtn';
    playBtn.textContent = '\uD83C\uDFB1 Play';
    playBtn.disabled = true;
    playBtn.addEventListener('click', doPlay);
    modal.appendChild(playBtn);

    // Clear button
    var clearBtn = document.createElement('button');
    clearBtn.id = 'kenoClearBtn';
    clearBtn.textContent = 'Clear Selection';
    clearBtn.addEventListener('click', clearPicks);
    modal.appendChild(clearBtn);

    // Close
    var closeBtn = document.createElement('button');
    closeBtn.id = 'kenoClose';
    closeBtn.textContent = 'Close';
    closeBtn.addEventListener('click', closeKeno);
    modal.appendChild(closeBtn);

    _overlay.appendChild(modal);
    _overlay.addEventListener('click', function(e) {
      if (e.target === _overlay) closeKeno();
    });
    document.body.appendChild(_overlay);

    buildGrid();
    updatePayTableDisplay();
  }

  // ── public API ────────────────────────────────────────────────────────────

  function openKeno() {
    injectStyles();
    buildModal();
    _overlay.classList.add('active');
    clearPicks();
  }

  function closeKeno() {
    if (_overlay) _overlay.classList.remove('active');
    _playing = false;
  }

  window.openKeno  = openKeno;
  window.closeKeno = closeKeno;

}());
