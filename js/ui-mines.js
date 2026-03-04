(function() {
  'use strict';

  var TOKEN_KEY = typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken';
  var _overlay      = null;
  var _stylesInj    = false;
  var _gameActive   = false;
  var _revealed     = [];
  var _mineCount    = 3;
  var _bet          = 1.00;
  var _multiplier   = 1.0;

  var GRID_SIZE = 25; // 5x5

  function getToken() {
    try { return localStorage.getItem(TOKEN_KEY); } catch(e) { return null; }
  }

  function injectStyles() {
    if (_stylesInj) return;
    _stylesInj = true;
    var s = document.createElement('style');
    s.textContent = [
      '#minesOverlay{position:fixed;inset:0;background:rgba(0,0,0,.90);z-index:20000;display:none;align-items:center;justify-content:center;font-family:monospace}',
      '#minesOverlay.active{display:flex}',
      '#minesModal{background:linear-gradient(135deg,#050510,#0d1b2a);border:2px solid rgba(239,68,68,.35);border-radius:20px;padding:24px 28px;max-width:480px;width:96%;text-align:center;max-height:96vh;overflow-y:auto}',
      '#minesModal h2{color:#f87171;font-size:20px;margin:0 0 4px;letter-spacing:1px}',
      '#minesModal .ms-sub{color:rgba(255,255,255,.4);font-size:12px;margin-bottom:18px}',
      '.ms-controls{display:flex;gap:10px;align-items:center;justify-content:center;margin-bottom:16px;flex-wrap:wrap}',
      '.ms-ctrl-group{display:flex;flex-direction:column;align-items:flex-start;gap:4px}',
      '.ms-ctrl-group label{font-size:11px;color:rgba(255,255,255,.4);text-transform:uppercase;letter-spacing:.5px}',
      '.ms-input{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);border-radius:8px;color:#fff;padding:8px 12px;font-size:14px;font-weight:700;width:90px;text-align:center}',
      '.ms-input:focus{outline:none;border-color:rgba(239,68,68,.6)}',
      '.ms-mine-select{display:flex;gap:6px;flex-wrap:wrap;justify-content:center;margin-bottom:14px}',
      '.ms-mine-btn{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);border-radius:8px;color:rgba(255,255,255,.7);padding:6px 12px;font-size:13px;font-weight:700;cursor:pointer;transition:all .15s}',
      '.ms-mine-btn:hover{background:rgba(239,68,68,.2);border-color:rgba(239,68,68,.5)}',
      '.ms-mine-btn.selected{background:rgba(239,68,68,.3);border-color:#ef4444;color:#fca5a5}',
      '#minesMultiplier{font-size:28px;font-weight:900;color:#fbbf24;min-height:36px;margin-bottom:10px;transition:transform .15s}',
      '#minesMultiplier.bump{transform:scale(1.18)}',
      '#minesGrid{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin:0 auto 16px;max-width:340px}',
      '.ms-cell{aspect-ratio:1;border-radius:10px;border:2px solid rgba(255,255,255,.12);background:linear-gradient(135deg,#1e293b,#0f172a);cursor:pointer;font-size:20px;display:flex;align-items:center;justify-content:center;transition:all .15s;user-select:none}',
      '.ms-cell:hover:not(.revealed):not(.disabled){border-color:rgba(99,102,241,.7);background:rgba(99,102,241,.15);transform:scale(1.06)}',
      '.ms-cell.gem{background:linear-gradient(135deg,#064e3b,#065f46);border-color:#10b981;animation:msGemPop .25s ease}',
      '.ms-cell.mine{background:linear-gradient(135deg,#450a0a,#7f1d1d);border-color:#ef4444;animation:msMineShake .3s ease}',
      '.ms-cell.mine-hidden{background:rgba(239,68,68,.08);border-color:rgba(239,68,68,.2);opacity:.45}',
      '.ms-cell.disabled{cursor:default}',
      '@keyframes msGemPop{0%{transform:scale(.7)}70%{transform:scale(1.12)}100%{transform:scale(1)}}',
      '@keyframes msMineShake{0%,100%{transform:translateX(0)}25%{transform:translateX(-4px)}75%{transform:translateX(4px)}}',
      '#minesStartBtn{background:linear-gradient(135deg,#dc2626,#991b1b);color:#fff;border:none;padding:14px 0;border-radius:12px;font-size:16px;font-weight:900;cursor:pointer;width:100%;margin-bottom:8px;letter-spacing:.5px;transition:transform .1s}',
      '#minesStartBtn:hover{transform:scale(1.02)}',
      '#minesStartBtn:disabled{opacity:.4;cursor:not-allowed;transform:none}',
      '#minesCashoutBtn{background:linear-gradient(135deg,#d97706,#92400e);color:#fff;border:none;padding:12px 0;border-radius:12px;font-size:15px;font-weight:800;cursor:pointer;width:100%;margin-bottom:8px;display:none;transition:transform .1s}',
      '#minesCashoutBtn:hover{transform:scale(1.02)}',
      '#minesResult{font-size:15px;font-weight:800;min-height:22px;color:#a5b4fc;margin-bottom:8px}',
      '#minesClose{background:none;border:none;color:rgba(255,255,255,.3);font-size:12px;cursor:pointer;text-decoration:underline}',
    ].join('\n');
    document.head.appendChild(s);
  }

  function clearChildren(el) {
    while (el.firstChild) el.removeChild(el.firstChild);
  }

  function buildGrid() {
    var grid = document.getElementById('minesGrid');
    if (!grid) return;
    clearChildren(grid);
    for (var i = 0; i < GRID_SIZE; i++) {
      (function(idx) {
        var cell = document.createElement('div');
        cell.className = 'ms-cell disabled';
        cell.dataset.idx = String(idx);
        cell.addEventListener('click', function() { onCellClick(idx); });
        grid.appendChild(cell);
      })(i);
    }
  }

  function getCellEl(idx) {
    var grid = document.getElementById('minesGrid');
    if (!grid) return null;
    return grid.querySelector('[data-idx="' + idx + '"]');
  }

  function setCellGem(idx) {
    var el = getCellEl(idx);
    if (!el) return;
    el.classList.add('revealed', 'gem');
    el.classList.remove('disabled');
    el.textContent = '\uD83D\uDC8E'; // 💎
  }

  function setCellMine(idx) {
    var el = getCellEl(idx);
    if (!el) return;
    el.classList.add('revealed', 'mine', 'disabled');
    el.textContent = '\uD83D\uDCA3'; // 💣
  }

  function revealAllMines(positions, hitIdx) {
    for (var i = 0; i < positions.length; i++) {
      var idx = positions[i];
      var el = getCellEl(idx);
      if (!el) continue;
      if (idx === hitIdx) {
        // already revealed as red mine
      } else {
        el.classList.add('mine-hidden', 'disabled');
        el.textContent = '\uD83D\uDCA3';
      }
    }
  }

  function disableAllCells() {
    var cells = document.querySelectorAll('#minesGrid .ms-cell');
    for (var i = 0; i < cells.length; i++) {
      cells[i].classList.add('disabled');
    }
  }

  function enableUnrevealedCells() {
    var cells = document.querySelectorAll('#minesGrid .ms-cell:not(.revealed)');
    for (var i = 0; i < cells.length; i++) {
      cells[i].classList.remove('disabled');
    }
  }

  function setMultiplier(val) {
    var el = document.getElementById('minesMultiplier');
    if (!el) return;
    el.textContent = val.toFixed(2) + 'x';
    el.classList.remove('bump');
    void el.offsetWidth;
    el.classList.add('bump');
    setTimeout(function() { el.classList.remove('bump'); }, 200);
  }

  function setResult(text, color) {
    var el = document.getElementById('minesResult');
    if (!el) return;
    el.textContent = text;
    el.style.color = color || '#a5b4fc';
  }

  function showCashoutBtn(show) {
    var el = document.getElementById('minesCashoutBtn');
    if (el) el.style.display = show ? 'block' : 'none';
  }

  function showStartBtn(show) {
    var el = document.getElementById('minesStartBtn');
    if (el) el.style.display = show ? 'block' : 'none';
  }

  function selectMineCount(count) {
    _mineCount = count;
    var btns = document.querySelectorAll('.ms-mine-btn');
    for (var i = 0; i < btns.length; i++) {
      var b = btns[i];
      if (parseInt(b.dataset.mines, 10) === count) {
        b.classList.add('selected');
      } else {
        b.classList.remove('selected');
      }
    }
  }

  function onCellClick(idx) {
    if (!_gameActive) return;
    if (_revealed.indexOf(idx) !== -1) return;
    var token = getToken();
    if (!token) return;

    disableAllCells();

    fetch('/api/mines/reveal', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ tileIndex: idx }),
    })
    .then(function(r) { return r.ok ? r.json() : r.json().then(function(e) { throw e; }); })
    .then(function(data) {
      if (data.result === 'safe') {
        setCellGem(idx);
        _revealed.push(idx);
        _multiplier = data.multiplier || _multiplier;
        setMultiplier(_multiplier);

        if (data.gameOver && data.autoWin) {
          _gameActive = false;
          setResult('\uD83C\uDFC6 Perfect! All gems found! Payout: $' + parseFloat(data.payout).toFixed(2), '#4ade80');
          showCashoutBtn(false);
          showStartBtn(true);
          if (typeof window.updateBalance === 'function' && data.newBalance != null) {
            window.updateBalance(data.newBalance);
          }
          disableAllCells();
        } else {
          enableUnrevealedCells();
          showCashoutBtn(true);
        }
      } else if (data.result === 'mine') {
        _gameActive = false;
        setCellMine(idx);
        if (data.minePositions) revealAllMines(data.minePositions, idx);
        setResult('\uD83D\uDCA5 Boom! You hit a mine!', '#f87171');
        showCashoutBtn(false);
        showStartBtn(true);
        disableAllCells();
        setMultiplier(1.0);
      }
    })
    .catch(function(err) {
      enableUnrevealedCells();
      setResult('Error: ' + ((err && err.error) || 'Network error'), '#f87171');
    });
  }

  function doStart() {
    var token = getToken();
    if (!token) {
      setResult('Please log in to play.', '#f87171');
      return;
    }

    var betInput = document.getElementById('minesBetInput');
    var betVal = betInput ? parseFloat(betInput.value) : 1.00;
    if (isNaN(betVal) || betVal < 0.10) betVal = 0.10;
    _bet = betVal;

    setResult('', '');
    setMultiplier(1.0);
    buildGrid();
    disableAllCells();

    var startBtn = document.getElementById('minesStartBtn');
    if (startBtn) { startBtn.disabled = true; startBtn.textContent = 'Starting\u2026'; }

    fetch('/api/mines/start', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ bet: _bet, mineCount: _mineCount }),
    })
    .then(function(r) { return r.ok ? r.json() : r.json().then(function(e) { throw e; }); })
    .then(function(data) {
      _gameActive = true;
      _revealed   = [];
      _multiplier = 1.0;

      enableUnrevealedCells();
      showCashoutBtn(false);
      showStartBtn(false);
      if (startBtn) { startBtn.disabled = false; startBtn.textContent = '\uD83D\uDCA3 Start Game'; }

      if (typeof window.updateBalance === 'function' && data.newBalance != null) {
        window.updateBalance(data.newBalance);
      }
      setResult('Click tiles to find gems \u2014 avoid the mines!', '#a5b4fc');
    })
    .catch(function(err) {
      _gameActive = false;
      if (startBtn) { startBtn.disabled = false; startBtn.textContent = '\uD83D\uDCA3 Start Game'; }
      buildGrid();
      disableAllCells();
      setResult((err && err.error) || 'Failed to start. Check your balance.', '#f87171');
    });
  }

  function doCashout() {
    var token = getToken();
    if (!token || !_gameActive) return;

    disableAllCells();
    var cashoutBtn = document.getElementById('minesCashoutBtn');
    if (cashoutBtn) { cashoutBtn.disabled = true; cashoutBtn.textContent = 'Cashing out\u2026'; }

    fetch('/api/mines/cashout', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: '{}',
    })
    .then(function(r) { return r.ok ? r.json() : r.json().then(function(e) { throw e; }); })
    .then(function(data) {
      _gameActive = false;
      if (cashoutBtn) { cashoutBtn.disabled = false; }
      if (data.minePositions) revealAllMines(data.minePositions, -1);
      setResult('\uD83D\uDCB0 Cashed out! Payout: $' + parseFloat(data.payout).toFixed(2), '#4ade80');
      showCashoutBtn(false);
      showStartBtn(true);
      if (typeof window.updateBalance === 'function' && data.newBalance != null) {
        window.updateBalance(data.newBalance);
      }
    })
    .catch(function(err) {
      if (cashoutBtn) { cashoutBtn.disabled = false; }
      enableUnrevealedCells();
      setResult((err && err.error) || 'Cashout failed', '#f87171');
    });
  }

  function buildModal() {
    if (_overlay) return;
    _overlay = document.createElement('div');
    _overlay.id = 'minesOverlay';

    var modal = document.createElement('div');
    modal.id = 'minesModal';

    var icon = document.createElement('div');
    icon.style.cssText = 'font-size:34px;margin-bottom:4px';
    icon.textContent = '\uD83D\uDCA3';
    modal.appendChild(icon);

    var h2 = document.createElement('h2');
    h2.textContent = 'MINES';
    modal.appendChild(h2);

    var sub = document.createElement('div');
    sub.className = 'ms-sub';
    sub.textContent = 'Click tiles to reveal gems. Cash out before hitting a mine!';
    modal.appendChild(sub);

    // Bet input
    var controls = document.createElement('div');
    controls.className = 'ms-controls';

    var betGroup = document.createElement('div');
    betGroup.className = 'ms-ctrl-group';

    var betLabel = document.createElement('label');
    betLabel.textContent = 'Bet ($)';

    var betInput = document.createElement('input');
    betInput.id = 'minesBetInput';
    betInput.className = 'ms-input';
    betInput.type = 'number';
    betInput.min = '0.10';
    betInput.max = '500';
    betInput.step = '0.10';
    betInput.value = '1.00';

    betGroup.appendChild(betLabel);
    betGroup.appendChild(betInput);
    controls.appendChild(betGroup);
    modal.appendChild(controls);

    // Mine count label
    var mineLabel = document.createElement('div');
    mineLabel.style.cssText = 'font-size:11px;color:rgba(255,255,255,.4);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px';
    mineLabel.textContent = 'Mines';
    modal.appendChild(mineLabel);

    // Mine count selector
    var mineSelect = document.createElement('div');
    mineSelect.className = 'ms-mine-select';
    var mineCounts = [1, 3, 5, 10, 15, 20];
    for (var mi = 0; mi < mineCounts.length; mi++) {
      (function(count) {
        var btn = document.createElement('button');
        btn.className = 'ms-mine-btn' + (count === 3 ? ' selected' : '');
        btn.dataset.mines = String(count);
        btn.textContent = String(count);
        btn.addEventListener('click', function() {
          if (!_gameActive) selectMineCount(count);
        });
        mineSelect.appendChild(btn);
      })(mineCounts[mi]);
    }
    modal.appendChild(mineSelect);

    // Multiplier display
    var multEl = document.createElement('div');
    multEl.id = 'minesMultiplier';
    multEl.textContent = '1.00x';
    modal.appendChild(multEl);

    // Grid
    var grid = document.createElement('div');
    grid.id = 'minesGrid';
    modal.appendChild(grid);

    // Result text
    var result = document.createElement('div');
    result.id = 'minesResult';
    modal.appendChild(result);

    // Cashout button (hidden initially)
    var cashoutBtn = document.createElement('button');
    cashoutBtn.id = 'minesCashoutBtn';
    cashoutBtn.textContent = '\uD83D\uDCB0 Cash Out';
    cashoutBtn.addEventListener('click', doCashout);
    modal.appendChild(cashoutBtn);

    // Start button
    var startBtn = document.createElement('button');
    startBtn.id = 'minesStartBtn';
    startBtn.textContent = '\uD83D\uDCA3 Start Game';
    startBtn.addEventListener('click', doStart);
    modal.appendChild(startBtn);

    // Close
    var closeBtn = document.createElement('button');
    closeBtn.id = 'minesClose';
    closeBtn.textContent = 'Close';
    closeBtn.addEventListener('click', closeMinesGame);
    modal.appendChild(closeBtn);

    _overlay.appendChild(modal);
    _overlay.addEventListener('click', function(e) {
      if (e.target === _overlay) closeMinesGame();
    });
    document.body.appendChild(_overlay);

    buildGrid();
  }

  function openMinesGame() {
    injectStyles();
    buildModal();
    _overlay.classList.add('active');
    setResult('Set your bet and mine count, then start!', '#a5b4fc');
    selectMineCount(_mineCount);
    showCashoutBtn(false);
    showStartBtn(true);
  }

  function closeMinesGame() {
    if (_overlay) _overlay.classList.remove('active');
    _gameActive = false;
  }

  window.openMinesGame  = openMinesGame;
  window.closeMinesGame = closeMinesGame;

}());
