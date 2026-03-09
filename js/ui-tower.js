(function() {
  'use strict';

  var TOKEN_KEY = typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken';

  var _overlay    = null;
  var _stylesInj  = false;
  var _playing    = false;   // mid-request debounce
  var _gameActive = false;   // game in progress
  var _currentRow = 0;
  var _tilesPerRow = 3;
  var _minesPerRow = 1;
  var _totalRows   = 10;
  var _bet         = 5.00;
  var _risk        = 'medium';

  function getToken() {
    try { return localStorage.getItem(TOKEN_KEY); } catch(e) { return null; }
  }

  function injectStyles() {
    if (_stylesInj) return;
    _stylesInj = true;
    var s = document.createElement('style');
    s.textContent = [
      '#towerOverlay{position:fixed;inset:0;background:rgba(0,0,0,.93);z-index:10400;display:none;align-items:center;justify-content:center;font-family:monospace}',
      '#towerOverlay.active{display:flex}',
      '#towerModal{background:linear-gradient(135deg,#030a1a,#0a1628);border:2px solid rgba(56,189,248,.3);border-radius:20px;padding:18px 20px;max-width:400px;width:96%;text-align:center;max-height:96vh;overflow-y:auto}',
      '#towerModal h2{color:#38bdf8;font-size:20px;margin:0 0 2px;letter-spacing:2px}',
      '#towerModal .tw-sub{color:rgba(255,255,255,.35);font-size:11px;margin-bottom:10px}',
      '.tw-setup{margin-bottom:12px}',
      '.tw-risk-row{display:flex;gap:6px;justify-content:center;margin-bottom:8px}',
      '.tw-risk-btn{flex:1;padding:7px 4px;border-radius:8px;border:2px solid rgba(255,255,255,.1);background:rgba(255,255,255,.05);color:rgba(255,255,255,.5);font-size:11px;font-weight:800;cursor:pointer;transition:all .15s}',
      '.tw-risk-btn.tw-sel{background:rgba(56,189,248,.25);border-color:#38bdf8;color:#bae6fd}',
      '.tw-risk-btn:disabled{opacity:.4;cursor:not-allowed}',
      '.tw-input-row{display:flex;gap:8px;align-items:center;justify-content:center;margin-bottom:8px}',
      '.tw-input-row label{font-size:10px;color:rgba(255,255,255,.35);text-transform:uppercase;letter-spacing:.5px}',
      '.tw-input{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);border-radius:8px;color:#fff;padding:6px 10px;font-size:14px;font-weight:700;width:90px;text-align:center}',
      '.tw-input:focus{outline:none;border-color:rgba(56,189,248,.6)}',
      '#towerStartBtn{background:linear-gradient(135deg,#075985,#0369a1);color:#fff;border:1px solid rgba(56,189,248,.4);padding:11px 0;border-radius:12px;font-size:15px;font-weight:900;cursor:pointer;width:100%;margin-bottom:10px;transition:transform .1s}',
      '#towerStartBtn:hover:not(:disabled){transform:scale(1.02)}',
      '#towerStartBtn:disabled{opacity:.4;cursor:not-allowed;transform:none}',
      '.tw-game{display:none}',
      '.tw-game.active{display:block}',
      '#towerGrid{display:flex;flex-direction:column-reverse;gap:4px;margin-bottom:10px}',
      '.tw-row{display:flex;gap:6px;justify-content:center}',
      '.tw-tile{flex:1;max-width:80px;padding:10px 4px;border-radius:8px;border:2px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06);color:rgba(255,255,255,.5);font-size:18px;cursor:pointer;transition:all .15s;min-height:40px}',
      '.tw-tile:hover:not(:disabled):not(.tw-cleared){background:rgba(56,189,248,.2);border-color:#38bdf8;color:#fff}',
      '.tw-tile.tw-active{border-color:rgba(56,189,248,.5);background:rgba(56,189,248,.1)}',
      '.tw-tile.tw-safe{background:rgba(34,197,94,.25);border-color:#4ade80;color:#86efac;cursor:default}',
      '.tw-tile.tw-mine{background:rgba(239,68,68,.3);border-color:#f87171;color:#fca5a5;cursor:default;animation:twShake .3s ease}',
      '.tw-tile.tw-hidden-mine{background:rgba(239,68,68,.15);border-color:rgba(239,68,68,.3);color:rgba(252,165,165,.6);cursor:default}',
      '.tw-tile:disabled{cursor:not-allowed}',
      '.tw-tile.tw-cleared{cursor:default;opacity:.5}',
      '@keyframes twShake{0%,100%{transform:translateX(0)}25%{transform:translateX(-5px)}75%{transform:translateX(5px)}}',
      '.tw-row-lbl{font-size:9px;color:rgba(255,255,255,.2);text-align:right;padding-right:4px;align-self:center;min-width:28px}',
      '.tw-mult-badge{font-size:9px;color:rgba(255,255,255,.2);align-self:center;min-width:32px;text-align:left;padding-left:4px}',
      '#towerMultiplier{font-size:22px;font-weight:900;color:#38bdf8;margin-bottom:4px}',
      '#towerPotential{font-size:12px;color:rgba(255,255,255,.4);margin-bottom:10px}',
      '#towerCashoutBtn{background:linear-gradient(135deg,#065f46,#047857);color:#fff;border:1px solid rgba(52,211,153,.4);padding:10px 0;border-radius:12px;font-size:14px;font-weight:900;cursor:pointer;width:100%;margin-bottom:6px;transition:transform .1s}',
      '#towerCashoutBtn:hover:not(:disabled){transform:scale(1.02)}',
      '#towerCashoutBtn:disabled{opacity:.4;cursor:not-allowed;transform:none}',
      '#towerResult{font-size:14px;font-weight:800;min-height:20px;color:#a5b4fc;margin-bottom:8px}',
      '#towerClose{background:none;border:none;color:rgba(255,255,255,.3);font-size:12px;cursor:pointer;text-decoration:underline}',
    ].join('\n');
    document.head.appendChild(s);
  }

  // ── helpers ──────────────────────────────────────────────────────────────────

  function setResult(text, color) {
    var el = document.getElementById('towerResult');
    if (!el) return;
    el.textContent = text;
    el.style.color = color || '#a5b4fc';
  }

  function updateMultiplierDisplay(mult, bet) {
    var mEl = document.getElementById('towerMultiplier');
    if (mEl) mEl.textContent = mult.toFixed(2) + 'x';
    var pEl = document.getElementById('towerPotential');
    if (pEl) pEl.textContent = 'Potential: $' + (bet * mult).toFixed(2);
  }

  function rowMultiplierForRisk(risk) {
    var configs = { easy: {t:4,m:1}, medium: {t:3,m:1}, hard: {t:2,m:1}, expert: {t:3,m:2} };
    var c = configs[risk] || configs.medium;
    return (c.t / (c.t - c.m)) * 0.97;
  }

  // ── grid ─────────────────────────────────────────────────────────────────────

  function buildGrid(tilesPerRow, totalRows, currentRow, risk) {
    var grid = document.getElementById('towerGrid');
    if (!grid) return;
    while (grid.firstChild) grid.removeChild(grid.firstChild);

    var rowMult = rowMultiplierForRisk(risk);

    for (var r = 0; r < totalRows; r++) {
      var rowEl = document.createElement('div');
      rowEl.style.cssText = 'display:flex;gap:4px;align-items:center;justify-content:center';
      rowEl.id = 'twRow_' + r;

      // Left label: row number (1-based from bottom)
      var lbl = document.createElement('div');
      lbl.className = 'tw-row-lbl';
      lbl.textContent = (r + 1);
      rowEl.appendChild(lbl);

      // Tiles container
      var tilesWrap = document.createElement('div');
      tilesWrap.className = 'tw-row';
      tilesWrap.style.flex = '1';
      tilesWrap.style.justifyContent = 'center';

      for (var t = 0; t < tilesPerRow; t++) {
        (function(rowIdx, tileIdx) {
          var tile = document.createElement('button');
          tile.className = 'tw-tile';
          tile.id = 'twTile_' + rowIdx + '_' + tileIdx;
          tile.textContent = '\u2666';
          if (rowIdx !== currentRow) {
            tile.disabled = true;
            tile.classList.add('tw-cleared');
          } else {
            tile.classList.add('tw-active');
            tile.addEventListener('click', function() { doStep(tileIdx); });
          }
          tilesWrap.appendChild(tile);
        })(r, t);
      }
      rowEl.appendChild(tilesWrap);

      // Right label: cumulative multiplier
      var mBadge = document.createElement('div');
      mBadge.className = 'tw-mult-badge';
      mBadge.textContent = Math.pow(rowMult, r + 1).toFixed(2) + 'x';
      rowEl.appendChild(mBadge);

      grid.appendChild(rowEl);
    }
  }

  function activateRow(rowIdx) {
    // Disable all rows, enable only rowIdx
    for (var r = 0; r < _totalRows; r++) {
      for (var t = 0; t < _tilesPerRow; t++) {
        var tile = document.getElementById('twTile_' + r + '_' + t);
        if (!tile) continue;
        tile.classList.remove('tw-active');
        if (r === rowIdx) {
          tile.disabled = false;
          tile.classList.add('tw-active');
          tile.classList.remove('tw-cleared');
        } else {
          tile.disabled = true;
        }
      }
    }
  }

  function markRowResult(rowIdx, chosenTile, mineTiles, safe) {
    for (var t = 0; t < _tilesPerRow; t++) {
      var tile = document.getElementById('twTile_' + rowIdx + '_' + t);
      if (!tile) continue;
      tile.disabled = true;
      tile.classList.remove('tw-active');
      if (t === chosenTile) {
        tile.classList.add(safe ? 'tw-safe' : 'tw-mine');
        tile.textContent = safe ? '\u2605' : '\uD83D\uDCA5';
      } else if (!safe && mineTiles && mineTiles.indexOf(t) !== -1) {
        tile.classList.add('tw-hidden-mine');
        tile.textContent = '\uD83D\uDCA5';
      } else {
        tile.classList.add('tw-cleared');
      }
    }
  }

  function revealAllMines(mineMap) {
    for (var r = 0; r < mineMap.length; r++) {
      for (var t = 0; t < _tilesPerRow; t++) {
        var tile = document.getElementById('twTile_' + r + '_' + t);
        if (!tile) continue;
        if (mineMap[r].indexOf(t) !== -1) {
          if (!tile.classList.contains('tw-mine')) {
            tile.classList.add('tw-hidden-mine');
            tile.textContent = '\uD83D\uDCA5';
          }
        }
      }
    }
  }

  // ── game actions ─────────────────────────────────────────────────────────────

  function doStart() {
    if (_playing) return;
    var token = getToken();
    if (!token) { setResult('Please log in to play.', '#f87171'); return; }

    var betInput = document.getElementById('towerBetInput');
    _bet = betInput ? parseFloat(betInput.value) : 5.00;
    if (isNaN(_bet) || _bet < 0.25) _bet = 0.25;

    _playing = true;
    var startBtn = document.getElementById('towerStartBtn');
    if (startBtn) { startBtn.disabled = true; startBtn.textContent = 'Starting\u2026'; }
    setResult('', '');

    fetch('/api/tower/start', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ bet: _bet, risk: _risk }),
    })
    .then(function(r) { return r.ok ? r.json() : r.json().then(function(e) { throw e; }); })
    .then(function(data) {
      _playing    = false;
      _gameActive = true;
      _currentRow = 0;
      _tilesPerRow = data.tilesPerRow;
      _minesPerRow = data.minesPerRow;
      _totalRows   = data.rows;
      _bet         = data.bet;

      if (typeof window.updateBalance === 'function' && data.newBalance != null) {
        window.updateBalance(data.newBalance);
      }

      // Show game panel
      var setup = document.getElementById('towerSetup');
      var game  = document.getElementById('towerGame');
      if (setup) setup.style.display = 'none';
      if (game)  game.classList.add('active');

      var cashoutBtn = document.getElementById('towerCashoutBtn');
      if (cashoutBtn) { cashoutBtn.disabled = true; }

      buildGrid(_tilesPerRow, _totalRows, _currentRow, _risk);
      updateMultiplierDisplay(1.0, _bet);
      setResult('Pick a tile to start climbing!', '#38bdf8');
    })
    .catch(function(err) {
      _playing = false;
      if (startBtn) { startBtn.disabled = false; startBtn.textContent = '\uD83D\uDEF7 Start'; }
      setResult((err && err.error) || 'Error starting game.', '#f87171');
    });
  }

  function doStep(tileIdx) {
    if (_playing || !_gameActive) return;
    var token = getToken();
    if (!token) return;

    _playing = true;
    // Disable all tiles immediately
    for (var t = 0; t < _tilesPerRow; t++) {
      var tile = document.getElementById('twTile_' + _currentRow + '_' + t);
      if (tile) tile.disabled = true;
    }

    fetch('/api/tower/step', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ tileIndex: tileIdx }),
    })
    .then(function(r) { return r.ok ? r.json() : r.json().then(function(e) { throw e; }); })
    .then(function(data) {
      _playing = false;

      markRowResult(_currentRow, tileIdx, data.rowMines, data.result === 'safe');

      if (data.result === 'mine') {
        _gameActive = false;
        if (data.allMineMap) revealAllMines(data.allMineMap);
        updateMultiplierDisplay(0, _bet);
        var pEl = document.getElementById('towerPotential');
        if (pEl) pEl.textContent = 'Lost $' + _bet.toFixed(2);
        setResult('\uD83D\uDCA5 Mine! Better luck next time.', '#f87171');
        showSetupAfterDelay();
        return;
      }

      // Safe
      _currentRow = data.row;
      updateMultiplierDisplay(data.multiplier, _bet);

      if (typeof window.updateBalance === 'function' && data.newBalance != null) {
        window.updateBalance(data.newBalance);
      }

      if (data.gameOver && data.autoWin) {
        _gameActive = false;
        setResult('\uD83C\uDFC6 Summit reached! +$' + (data.payout - _bet).toFixed(2), '#4ade80');
        showSetupAfterDelay();
        return;
      }

      // Activate next row
      activateRow(_currentRow);
      var cashoutBtn = document.getElementById('towerCashoutBtn');
      if (cashoutBtn) {
        cashoutBtn.disabled = false;
        cashoutBtn.textContent = '\uD83D\uDCB0 Cash Out $' + data.payout.toFixed(2);
      }
      setResult('Row ' + _currentRow + ' cleared! Keep going or cash out.', '#38bdf8');
    })
    .catch(function(err) {
      _playing = false;
      // Re-enable current row
      activateRow(_currentRow);
      setResult((err && err.error) || 'Error.', '#f87171');
    });
  }

  function doCashout() {
    if (_playing || !_gameActive) return;
    var token = getToken();
    if (!token) return;

    _playing = true;
    var cashoutBtn = document.getElementById('towerCashoutBtn');
    if (cashoutBtn) cashoutBtn.disabled = true;

    fetch('/api/tower/cashout', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    .then(function(r) { return r.ok ? r.json() : r.json().then(function(e) { throw e; }); })
    .then(function(data) {
      _playing    = false;
      _gameActive = false;

      if (typeof window.updateBalance === 'function' && data.newBalance != null) {
        window.updateBalance(data.newBalance);
      }

      updateMultiplierDisplay(data.multiplier, _bet);
      setResult('\uD83D\uDCB0 Cashed out! +$' + (data.payout - _bet).toFixed(2) + ' (' + data.multiplier.toFixed(2) + 'x)', '#4ade80');
      showSetupAfterDelay();
    })
    .catch(function(err) {
      _playing = false;
      if (cashoutBtn) cashoutBtn.disabled = false;
      setResult((err && err.error) || 'Error cashing out.', '#f87171');
    });
  }

  function showSetupAfterDelay() {
    setTimeout(function() {
      var setup = document.getElementById('towerSetup');
      var game  = document.getElementById('towerGame');
      if (setup) setup.style.display = '';
      if (game)  game.classList.remove('active');
      var startBtn = document.getElementById('towerStartBtn');
      if (startBtn) { startBtn.disabled = false; startBtn.textContent = '\uD83D\uDEF7 Start Climb'; }
      var cashoutBtn = document.getElementById('towerCashoutBtn');
      if (cashoutBtn) cashoutBtn.disabled = true;
    }, 1800);
  }

  // ── modal build ──────────────────────────────────────────────────────────────

  function buildModal() {
    if (_overlay) return;
    _overlay = document.createElement('div');
    _overlay.id = 'towerOverlay';

    var modal = document.createElement('div');
    modal.id = 'towerModal';

    var icon = document.createElement('div');
    icon.style.cssText = 'font-size:32px;margin-bottom:2px';
    icon.textContent = '\uD83C\uDFDB\uFE0F';
    modal.appendChild(icon);

    var h2 = document.createElement('h2');
    h2.textContent = 'TOWER';
    modal.appendChild(h2);

    var sub = document.createElement('div');
    sub.className = 'tw-sub';
    sub.textContent = 'Climb the tower — avoid mines, cash out before you bust!';
    modal.appendChild(sub);

    // ── Setup panel ──────────────────────────────────────────────────────────
    var setup = document.createElement('div');
    setup.id = 'towerSetup';
    setup.className = 'tw-setup';

    // Risk buttons
    var riskRow = document.createElement('div');
    riskRow.className = 'tw-risk-row';
    var risks = [
      { id: 'easy',   label: 'Easy\n3/4',   desc: '3 safe / 4' },
      { id: 'medium', label: 'Med\n2/3',    desc: '2 safe / 3' },
      { id: 'hard',   label: 'Hard\n1/2',   desc: '1 safe / 2' },
      { id: 'expert', label: 'Expert\n1/3', desc: '1 safe / 3' },
    ];
    for (var ri = 0; ri < risks.length; ri++) {
      (function(r) {
        var btn = document.createElement('button');
        btn.id = 'twRisk_' + r.id;
        btn.className = 'tw-risk-btn' + (r.id === _risk ? ' tw-sel' : '');
        // Use textContent with line breaks via two spans
        var line1 = document.createElement('div');
        line1.style.fontWeight = '900';
        line1.textContent = r.id.charAt(0).toUpperCase() + r.id.slice(1);
        var line2 = document.createElement('div');
        line2.style.cssText = 'font-size:9px;opacity:.7;margin-top:1px';
        line2.textContent = r.desc;
        btn.appendChild(line1);
        btn.appendChild(line2);
        btn.addEventListener('click', function() {
          _risk = r.id;
          for (var j = 0; j < risks.length; j++) {
            var b = document.getElementById('twRisk_' + risks[j].id);
            if (b) b.classList.toggle('tw-sel', risks[j].id === r.id);
          }
        });
        riskRow.appendChild(btn);
      })(risks[ri]);
    }
    setup.appendChild(riskRow);

    // Bet input
    var inputRow = document.createElement('div');
    inputRow.className = 'tw-input-row';
    var betLabel = document.createElement('label');
    betLabel.textContent = 'Bet ($)';
    betLabel.htmlFor = 'towerBetInput';
    var betInput = document.createElement('input');
    betInput.id = 'towerBetInput';
    betInput.className = 'tw-input';
    betInput.type = 'number';
    betInput.min = '0.25';
    betInput.max = '200';
    betInput.step = '0.25';
    betInput.value = '5.00';
    inputRow.appendChild(betLabel);
    inputRow.appendChild(betInput);
    setup.appendChild(inputRow);

    // Start button
    var startBtn = document.createElement('button');
    startBtn.id = 'towerStartBtn';
    startBtn.textContent = '\uD83D\uDEF7 Start Climb';
    startBtn.addEventListener('click', doStart);
    setup.appendChild(startBtn);

    modal.appendChild(setup);

    // ── Game panel ───────────────────────────────────────────────────────────
    var game = document.createElement('div');
    game.id = 'towerGame';
    game.className = 'tw-game';

    var multEl = document.createElement('div');
    multEl.id = 'towerMultiplier';
    multEl.textContent = '1.00x';
    game.appendChild(multEl);

    var potEl = document.createElement('div');
    potEl.id = 'towerPotential';
    potEl.textContent = '';
    game.appendChild(potEl);

    var grid = document.createElement('div');
    grid.id = 'towerGrid';
    game.appendChild(grid);

    var cashoutBtn = document.createElement('button');
    cashoutBtn.id = 'towerCashoutBtn';
    cashoutBtn.textContent = '\uD83D\uDCB0 Cash Out';
    cashoutBtn.disabled = true;
    cashoutBtn.addEventListener('click', doCashout);
    game.appendChild(cashoutBtn);

    modal.appendChild(game);

    // Result
    var resultEl = document.createElement('div');
    resultEl.id = 'towerResult';
    resultEl.textContent = 'Choose a risk level and start climbing!';
    resultEl.style.color = '#a5b4fc';
    modal.appendChild(resultEl);

    // Close
    var closeBtn = document.createElement('button');
    closeBtn.id = 'towerClose';
    closeBtn.textContent = 'Close';
    closeBtn.addEventListener('click', closeTower);
    modal.appendChild(closeBtn);

    _overlay.appendChild(modal);
    _overlay.addEventListener('click', function(e) {
      if (e.target === _overlay) closeTower();
    });
    document.body.appendChild(_overlay);
  }

  // ── public API ───────────────────────────────────────────────────────────────

  function openTower() {
    injectStyles();
    buildModal();
    _overlay.classList.add('active');
    setResult('Choose a risk level and start climbing!', '#a5b4fc');
  }

  function closeTower() {
    if (_overlay) _overlay.classList.remove('active');
    _playing = false;
  }

  window.openTower  = openTower;
  window.closeTower = closeTower;

}());
