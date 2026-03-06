(function() {
  'use strict';

  var TOKEN_KEY = typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken';

  var _overlay   = null;
  var _stylesInj = false;
  var _gameId    = null;
  var _playing   = false;
  var _bet       = 0;
  var _mines     = 3;
  var _revealed  = [];   // indices of revealed safe tiles
  var _mult      = 1.0;

  function getToken() {
    try { return localStorage.getItem(TOKEN_KEY); } catch(e) { return null; }
  }

  function injectStyles() {
    if (_stylesInj) return;
    _stylesInj = true;
    var s = document.createElement('style');
    s.textContent = [
      '#mnOverlay{position:fixed;inset:0;background:rgba(0,0,0,.94);z-index:20000;display:none;align-items:center;justify-content:center;font-family:monospace}',
      '#mnOverlay.active{display:flex}',
      '#mnModal{background:linear-gradient(135deg,#030a03,#050f05);border:2px solid rgba(74,222,128,.25);border-radius:20px;padding:18px 20px;max-width:440px;width:96%;text-align:center;max-height:96vh;overflow-y:auto}',
      '#mnModal h2{color:#86efac;font-size:20px;margin:0 0 2px;letter-spacing:2px}',
      '#mnModal .mn-sub{color:rgba(255,255,255,.35);font-size:11px;margin-bottom:12px}',
      '#mnGrid{display:grid;grid-template-columns:repeat(5,1fr);gap:5px;margin:0 auto 12px;max-width:300px}',
      '.mn-tile{aspect-ratio:1;border-radius:8px;border:none;cursor:pointer;font-size:18px;font-weight:900;display:flex;align-items:center;justify-content:center;transition:transform .1s,background .2s;background:rgba(255,255,255,.1);color:transparent}',
      '.mn-tile:hover:not(:disabled):not(.mn-safe):not(.mn-mine){background:rgba(74,222,128,.25);transform:scale(1.05)}',
      '.mn-tile.mn-safe{background:rgba(74,222,128,.2);border:2px solid #4ade80;color:#4ade80;cursor:default;animation:mnPop .25s ease}',
      '.mn-tile.mn-mine{background:rgba(239,68,68,.25);border:2px solid #ef4444;color:#ef4444;cursor:default;animation:mnShake .3s ease}',
      '.mn-tile.mn-reveal{background:rgba(251,191,36,.15);border:2px solid rgba(251,191,36,.4);color:rgba(251,191,36,.5)}',
      '.mn-tile:disabled{cursor:default;opacity:.7}',
      '@keyframes mnPop{0%{transform:scale(.6)}60%{transform:scale(1.15)}100%{transform:scale(1)}}',
      '@keyframes mnShake{0%{transform:translateX(0)}20%{transform:translateX(-5px)}40%{transform:translateX(5px)}60%{transform:translateX(-4px)}80%{transform:translateX(4px)}100%{transform:translateX(0)}}',
      '.mn-mult{font-size:36px;font-weight:900;color:#4ade80;margin:0 0 10px;text-shadow:0 0 16px rgba(74,222,128,.4);transition:color .2s}',
      '.mn-mult.mn-crashed{color:#ef4444;text-shadow:0 0 16px rgba(239,68,68,.5)}',
      '.mn-controls{display:flex;gap:8px;align-items:center;justify-content:center;margin-bottom:10px;flex-wrap:wrap}',
      '.mn-ctrl-grp{display:flex;flex-direction:column;align-items:center;gap:3px}',
      '.mn-ctrl-label{font-size:9px;color:rgba(255,255,255,.35);text-transform:uppercase;letter-spacing:.4px}',
      '.mn-input{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);border-radius:8px;color:#fff;padding:5px 8px;font-size:13px;font-weight:700;width:72px;text-align:center}',
      '.mn-input:focus{outline:none;border-color:rgba(74,222,128,.5)}',
      '.mn-mine-sel{display:flex;gap:4px;flex-wrap:wrap;justify-content:center;max-width:220px}',
      '.mn-mine-btn{padding:4px 8px;border-radius:6px;border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.06);color:rgba(255,255,255,.5);font-size:11px;font-weight:700;cursor:pointer;transition:all .12s}',
      '.mn-mine-btn.mn-sel{background:rgba(239,68,68,.2);border-color:#f87171;color:#fca5a5}',
      '.mn-btn-row{display:flex;gap:8px;margin-bottom:8px}',
      '.mn-btn{flex:1;padding:11px 0;border-radius:12px;border:none;font-size:14px;font-weight:900;cursor:pointer;transition:transform .1s,opacity .1s;letter-spacing:.4px}',
      '.mn-btn:hover:not(:disabled){transform:scale(1.02)}',
      '.mn-btn:disabled{opacity:.35;cursor:not-allowed;transform:none}',
      '#mnStartBtn{background:linear-gradient(135deg,#14532d,#16a34a);color:#fff;border:1px solid rgba(74,222,128,.4)}',
      '#mnCashBtn{background:linear-gradient(135deg,#1e3a8a,#2563eb);color:#fff;border:1px solid rgba(96,165,250,.4)}',
      '#mnResult{font-size:13px;font-weight:800;min-height:18px;color:#86efac;margin-bottom:8px}',
      '#mnClose{background:none;border:none;color:rgba(255,255,255,.3);font-size:12px;cursor:pointer;text-decoration:underline}',
    ].join('\n');
    document.head.appendChild(s);
  }

  // ── helpers ──────────────────────────────────────────────────────────────────

  function setResult(txt, col) {
    var el = document.getElementById('mnResult');
    if (!el) return;
    el.textContent = txt;
    el.style.color = col || '#86efac';
  }

  function setMult(m, crashed) {
    _mult = m;
    var el = document.getElementById('mnMult');
    if (!el) return;
    el.textContent = m.toFixed(2) + 'x';
    el.className = 'mn-mult' + (crashed ? ' mn-crashed' : '');
  }

  function setTileState(idx, state) {
    var tile = document.getElementById('mnTile' + idx);
    if (!tile) return;
    tile.classList.remove('mn-safe', 'mn-mine', 'mn-reveal');
    if (state === 'safe')  { tile.classList.add('mn-safe');  tile.textContent = '\uD83D\uDC8E'; tile.disabled = true; }
    if (state === 'mine')  { tile.classList.add('mn-mine');  tile.textContent = '\uD83D\uDCA3'; tile.disabled = true; }
    if (state === 'reveal'){ tile.classList.add('mn-reveal'); tile.textContent = ''; }
  }

  function disableAllTiles() {
    for (var i = 0; i < 25; i++) {
      var t = document.getElementById('mnTile' + i);
      if (t) t.disabled = true;
    }
  }

  function resetGrid() {
    for (var i = 0; i < 25; i++) {
      var t = document.getElementById('mnTile' + i);
      if (!t) continue;
      t.className   = 'mn-tile';
      t.textContent = '';
      t.disabled    = false;
    }
    _revealed = [];
  }

  function showControls(phase) {
    var setup    = document.getElementById('mnSetup');
    var cashRow  = document.getElementById('mnCashRow');
    if (phase === 'setup') {
      if (setup)   setup.style.display   = 'block';
      if (cashRow) cashRow.style.display = 'none';
    } else {
      if (setup)   setup.style.display   = 'none';
      if (cashRow) cashRow.style.display = 'flex';
    }
  }

  function selectMines(n) {
    _mines = n;
    document.querySelectorAll('.mn-mine-btn').forEach(function(b) {
      b.classList.toggle('mn-sel', parseInt(b.dataset.mines, 10) === n);
    });
  }

  // ── start ─────────────────────────────────────────────────────────────────────

  function doStart() {
    if (_playing) return;
    var token = getToken();
    if (!token) { setResult('Please log in to play.', '#f87171'); return; }
    var inp = document.getElementById('mnBetInput');
    var bet = inp ? parseFloat(inp.value) : 1.00;
    if (isNaN(bet) || bet < 0.25) bet = 0.25;

    _playing = true;
    var startBtn = document.getElementById('mnStartBtn');
    if (startBtn) startBtn.disabled = true;
    setResult('Starting\u2026', '#86efac');

    fetch('/api/mines/start', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ bet: bet, mines: _mines }),
    })
    .then(function(r) { return r.ok ? r.json() : r.json().then(function(e) { throw e; }); })
    .then(function(data) {
      _gameId = data.gameId;
      _bet    = bet;
      resetGrid();
      setMult(1.00, false);
      showControls('playing');
      setResult('Pick a tile! (' + _mines + ' mines hidden)', '#86efac');
    })
    .catch(function(err) {
      _playing = false;
      if (startBtn) startBtn.disabled = false;
      setResult((err && err.error) || 'Error \u2014 check balance.', '#f87171');
    });
  }

  // ── reveal ────────────────────────────────────────────────────────────────────

  function doReveal(idx) {
    if (!_playing || !_gameId) return;
    if (_revealed.indexOf(idx) >= 0) return;
    var token = getToken();
    if (!token) return;

    var tile = document.getElementById('mnTile' + idx);
    if (tile) { tile.disabled = true; tile.textContent = '\u231B'; }

    fetch('/api/mines/reveal', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameId: _gameId, tile: idx }),
    })
    .then(function(r) { return r.ok ? r.json() : r.json().then(function(e) { throw e; }); })
    .then(function(data) {
      if (data.safe) {
        _revealed.push(idx);
        setTileState(idx, 'safe');
        setMult(data.multiplier, false);

        if (data.gameOver && data.autoWin) {
          // Found all safe tiles
          if (typeof window.updateBalance === 'function' && data.newBalance != null) {
            window.updateBalance(data.newBalance);
          }
          // Reveal mines
          if (data.minePositions) {
            data.minePositions.forEach(function(m) { setTileState(m, 'reveal'); });
          }
          _playing = false;
          _gameId  = null;
          showControls('setup');
          var startBtn = document.getElementById('mnStartBtn');
          if (startBtn) startBtn.disabled = false;
          setResult('\uD83C\uDF89 All safe! +$' + data.profit.toFixed(2) + ' (' + data.multiplier.toFixed(2) + 'x)', '#fbbf24');
        } else {
          setResult('\uD83D\uDC8E Safe! ' + data.multiplier.toFixed(2) + 'x \u2014 keep going or cash out', '#86efac');
        }
      } else {
        // Hit a mine
        setTileState(idx, 'mine');
        disableAllTiles();
        if (data.minePositions) {
          data.minePositions.forEach(function(m) {
            if (m !== idx) setTileState(m, 'reveal');
          });
        }
        setMult(0, true);
        _playing = false;
        _gameId  = null;
        showControls('setup');
        var startBtn2 = document.getElementById('mnStartBtn');
        if (startBtn2) startBtn2.disabled = false;
        setResult('\uD83D\uDCA3 BOOM! Mine hit \u2014 -$' + _bet.toFixed(2), '#ef4444');
      }
    })
    .catch(function(err) {
      if (tile) { tile.disabled = false; tile.textContent = ''; }
      setResult((err && err.error) || 'Error.', '#f87171');
    });
  }

  // ── cashout ───────────────────────────────────────────────────────────────────

  function doCashout() {
    if (!_playing || !_gameId) return;
    var token = getToken();
    if (!token) return;

    var cashBtn = document.getElementById('mnCashBtn');
    if (cashBtn) cashBtn.disabled = true;
    disableAllTiles();

    fetch('/api/mines/cashout', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameId: _gameId }),
    })
    .then(function(r) { return r.ok ? r.json() : r.json().then(function(e) { throw e; }); })
    .then(function(data) {
      if (typeof window.updateBalance === 'function' && data.newBalance != null) {
        window.updateBalance(data.newBalance);
      }
      if (data.minePositions) {
        data.minePositions.forEach(function(m) { setTileState(m, 'reveal'); });
      }
      _playing = false;
      _gameId  = null;
      showControls('setup');
      var startBtn = document.getElementById('mnStartBtn');
      if (startBtn) startBtn.disabled = false;
      setResult('\uD83D\uDCB0 Cashed out ' + data.multiplier.toFixed(2) + 'x \u2014 +$' + data.profit.toFixed(2), '#4ade80');
    })
    .catch(function(err) {
      if (cashBtn) cashBtn.disabled = false;
      setResult((err && err.error) || 'Error.', '#f87171');
    });
  }

  // ── modal build ───────────────────────────────────────────────────────────────

  function buildModal() {
    if (_overlay) return;
    _overlay = document.createElement('div');
    _overlay.id = 'mnOverlay';

    var modal = document.createElement('div');
    modal.id = 'mnModal';

    var icon = document.createElement('div');
    icon.style.cssText = 'font-size:28px;margin-bottom:2px';
    icon.textContent = '\uD83D\uDCA3';
    modal.appendChild(icon);

    var h2 = document.createElement('h2');
    h2.textContent = 'MINES';
    modal.appendChild(h2);

    var sub = document.createElement('div');
    sub.className = 'mn-sub';
    sub.textContent = 'Find the gems, dodge the mines \u2014 cash out before you explode';
    modal.appendChild(sub);

    // Multiplier display
    var multEl = document.createElement('div');
    multEl.className = 'mn-mult';
    multEl.id = 'mnMult';
    multEl.textContent = '1.00x';
    modal.appendChild(multEl);

    // Grid
    var grid = document.createElement('div');
    grid.id = 'mnGrid';
    for (var i = 0; i < 25; i++) {
      var tile = document.createElement('button');
      tile.id        = 'mnTile' + i;
      tile.className = 'mn-tile';
      tile.disabled  = true;
      (function(idx) {
        tile.addEventListener('click', function() { doReveal(idx); });
      }(i));
      grid.appendChild(tile);
    }
    modal.appendChild(grid);

    // Setup controls
    var setup = document.createElement('div');
    setup.id = 'mnSetup';
    setup.style.display = 'block';

    var ctrlRow = document.createElement('div');
    ctrlRow.className = 'mn-controls';

    // Bet group
    var betGrp = document.createElement('div');
    betGrp.className = 'mn-ctrl-grp';
    var betLbl = document.createElement('div');
    betLbl.className = 'mn-ctrl-label';
    betLbl.textContent = 'Bet ($)';
    var betInp = document.createElement('input');
    betInp.id = 'mnBetInput'; betInp.className = 'mn-input';
    betInp.type = 'number'; betInp.min = '0.25'; betInp.max = '500'; betInp.step = '0.25'; betInp.value = '2.00';
    betGrp.appendChild(betLbl); betGrp.appendChild(betInp);

    // Mines selector group
    var mineGrp = document.createElement('div');
    mineGrp.className = 'mn-ctrl-grp';
    var mineLbl = document.createElement('div');
    mineLbl.className = 'mn-ctrl-label';
    mineLbl.textContent = 'Mines';
    var mineSel = document.createElement('div');
    mineSel.className = 'mn-mine-sel';
    [1, 3, 5, 10, 15, 20, 24].forEach(function(n) {
      var b = document.createElement('button');
      b.className     = 'mn-mine-btn' + (n === _mines ? ' mn-sel' : '');
      b.dataset.mines = n;
      b.textContent   = n;
      b.addEventListener('click', function() { selectMines(n); });
      mineSel.appendChild(b);
    });
    mineGrp.appendChild(mineLbl); mineGrp.appendChild(mineSel);

    ctrlRow.appendChild(betGrp);
    ctrlRow.appendChild(mineGrp);
    setup.appendChild(ctrlRow);

    // Start button
    var startRow = document.createElement('div');
    startRow.className = 'mn-btn-row';
    var startBtn = document.createElement('button');
    startBtn.id = 'mnStartBtn';
    startBtn.className = 'mn-btn';
    startBtn.textContent = '\uD83D\uDCA3 Start Game';
    startBtn.addEventListener('click', function() {
      // Enable tiles when starting
      for (var ti = 0; ti < 25; ti++) {
        var t = document.getElementById('mnTile' + ti);
        if (t) t.disabled = false;
      }
      doStart();
    });
    startRow.appendChild(startBtn);
    setup.appendChild(startRow);
    modal.appendChild(setup);

    // Cash out row (shown during play)
    var cashRow = document.createElement('div');
    cashRow.id = 'mnCashRow';
    cashRow.className = 'mn-btn-row';
    cashRow.style.display = 'none';
    var cashBtn = document.createElement('button');
    cashBtn.id = 'mnCashBtn';
    cashBtn.className = 'mn-btn';
    cashBtn.textContent = '\uD83D\uDCB0 Cash Out';
    cashBtn.addEventListener('click', doCashout);
    cashRow.appendChild(cashBtn);
    modal.appendChild(cashRow);

    // Result
    var resultEl = document.createElement('div');
    resultEl.id = 'mnResult';
    resultEl.textContent = 'Choose your mines count and bet to start!';
    resultEl.style.color = '#86efac';
    modal.appendChild(resultEl);

    var closeBtn = document.createElement('button');
    closeBtn.id = 'mnClose';
    closeBtn.textContent = 'Close';
    closeBtn.addEventListener('click', closeMines);
    modal.appendChild(closeBtn);

    _overlay.appendChild(modal);
    _overlay.addEventListener('click', function(e) { if (e.target === _overlay) closeMines(); });
    document.body.appendChild(_overlay);
  }

  // ── public API ────────────────────────────────────────────────────────────────

  function openMines() {
    injectStyles();
    buildModal();
    _overlay.classList.add('active');
    setResult('Choose your mines count and bet to start!', '#86efac');
    showControls('setup');
  }

  function closeMines() {
    if (_overlay) _overlay.classList.remove('active');
    _playing = false;
    _gameId  = null;
  }

  window.openMines  = openMines;
  window.closeMines = closeMines;

}());
