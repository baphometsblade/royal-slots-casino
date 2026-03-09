(function() {
  'use strict';

  var _modal = null;
  var _overlay = null;
  var _scratched = [];
  var _tiles = [];
  var _prize = null;
  var _committed = false;
  var _stylesInjected = false;
  var _autoCheckTimer = null;
  var _countdownTimer = null;

  function getToken() {
    var key = typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken';
    return localStorage.getItem(key) || '';
  }

  function injectStyles() {
    if (_stylesInjected) return;
    _stylesInjected = true;
    var s = document.createElement('style');
    s.id = 'scratchStyles';
    s.textContent = [
      '#scratchOverlay{position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:10400;display:none;align-items:center;justify-content:center}',
      '#scratchOverlay.active{display:flex}',
      '#scratchModal{background:#0d0d1a;border:1px solid rgba(255,255,255,.15);border-radius:16px;padding:24px;max-width:400px;width:90%;text-align:center}',
      '#scratchModal h2{color:#ffd700;font-size:20px;margin:0 0 6px}',
      '#scratchModal .sc-sub{color:rgba(255,255,255,.5);font-size:13px;margin-bottom:18px}',
      '.sc-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:16px}',
      '.sc-tile{position:relative;aspect-ratio:1;border-radius:10px;overflow:hidden;cursor:pointer;background:#1a1a30;border:1px solid rgba(255,255,255,.1);user-select:none}',
      '.sc-foil{position:absolute;inset:0;background:linear-gradient(135deg,#374151,#4b5563);display:flex;align-items:center;justify-content:center;font-size:28px;transition:opacity .35s;z-index:10400}',
      '.sc-symbol{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:26px;z-index:10400}',
      '.sc-symbol-val{font-size:10px;color:rgba(255,255,255,.55);margin-top:2px}',
      '.sc-tile.revealed .sc-foil{opacity:0;pointer-events:none}',
      '.sc-tile:hover .sc-foil{background:linear-gradient(135deg,#4b5563,#6b7280)}',
      '#scratchRevealAll{background:linear-gradient(135deg,#7c3aed,#5b21b6);color:#fff;border:none;border-radius:8px;padding:10px 20px;font-size:14px;cursor:pointer;margin-bottom:12px;width:100%}',
      '#scratchRevealAll:hover{opacity:.9}',
      '#scratchPrize{display:none;background:rgba(255,215,0,.08);border:1px solid rgba(255,215,0,.3);border-radius:10px;padding:14px;margin-bottom:14px}',
      '#scratchPrize .sp-label{color:rgba(255,255,255,.6);font-size:12px}',
      '#scratchPrize .sp-amount{color:#ffd700;font-size:22px;font-weight:800;margin-top:4px}',
      '#scratchCollect{background:linear-gradient(135deg,#10b981,#059669);color:#fff;border:none;border-radius:8px;padding:11px 20px;font-size:15px;font-weight:700;cursor:pointer;width:100%;display:none}',
      '#scratchCollect:hover{opacity:.9}',
      '#scratchCountdown{color:rgba(255,255,255,.45);font-size:13px;margin-top:8px}',
      '#scratchClose{background:none;border:none;color:rgba(255,255,255,.35);font-size:13px;cursor:pointer;margin-top:10px;text-decoration:underline}',
      '.sc-badge{width:8px;height:8px;background:#ef4444;border-radius:50%;display:inline-block;margin-left:4px;vertical-align:middle}'
    ].join('\n');
    document.head.appendChild(s);
  }

  function buildModal() {
    if (_overlay) return;

    _overlay = document.createElement('div');
    _overlay.id = 'scratchOverlay';

    _modal = document.createElement('div');
    _modal.id = 'scratchModal';

    var h2 = document.createElement('h2');
    h2.textContent = '\uD83C\uDCCF DAILY SCRATCH CARD';
    _modal.appendChild(h2);

    var sub = document.createElement('div');
    sub.className = 'sc-sub';
    sub.textContent = 'Scratch tiles to reveal your prize!';
    _modal.appendChild(sub);

    var grid = document.createElement('div');
    grid.className = 'sc-grid';
    grid.id = 'scratchGrid';
    _modal.appendChild(grid);

    var revealBtn = document.createElement('button');
    revealBtn.id = 'scratchRevealAll';
    revealBtn.textContent = '\u2728 Reveal All';
    revealBtn.addEventListener('click', revealAll);
    _modal.appendChild(revealBtn);

    var prizeEl = document.createElement('div');
    prizeEl.id = 'scratchPrize';
    var prizeLabel = document.createElement('div');
    prizeLabel.className = 'sp-label';
    prizeLabel.textContent = '\uD83C\uDF89 You won!';
    var prizeAmt = document.createElement('div');
    prizeAmt.className = 'sp-amount';
    prizeAmt.id = 'scratchPrizeAmt';
    prizeEl.appendChild(prizeLabel);
    prizeEl.appendChild(prizeAmt);
    _modal.appendChild(prizeEl);

    var collectBtn = document.createElement('button');
    collectBtn.id = 'scratchCollect';
    collectBtn.textContent = '\uD83D\uDCB0 Collect Reward';
    collectBtn.addEventListener('click', collect);
    _modal.appendChild(collectBtn);

    var countdown = document.createElement('div');
    countdown.id = 'scratchCountdown';
    _modal.appendChild(countdown);

    var closeBtn = document.createElement('button');
    closeBtn.id = 'scratchClose';
    closeBtn.textContent = 'Close';
    closeBtn.addEventListener('click', closeScratchCardModal);
    _modal.appendChild(closeBtn);

    _overlay.appendChild(_modal);
    document.body.appendChild(_overlay);

    _overlay.addEventListener('click', function(e) {
      if (e.target === _overlay) closeScratchCardModal();
    });
  }

  function buildTile(index, tileData) {
    var tile = document.createElement('div');
    tile.className = 'sc-tile';
    tile.dataset.index = String(index);

    var foil = document.createElement('div');
    foil.className = 'sc-foil';
    foil.textContent = '\u2728';

    var symbolEl = document.createElement('div');
    symbolEl.className = 'sc-symbol';

    var symIcon = document.createElement('div');
    symIcon.textContent = tileData ? (tileData.symbol || '?') : '?';

    var symVal = document.createElement('div');
    symVal.className = 'sc-symbol-val';
    symVal.textContent = (tileData && tileData.value > 0) ? ('+' + tileData.value + 'g') : '';

    symbolEl.appendChild(symIcon);
    symbolEl.appendChild(symVal);
    tile.appendChild(foil);
    tile.appendChild(symbolEl);

    tile.addEventListener('click', function() { scratchTile(index); });
    return tile;
  }

  function populateGrid(tiles) {
    var grid = document.getElementById('scratchGrid');
    if (!grid) return;
    while (grid.firstChild) grid.removeChild(grid.firstChild);
    tiles.forEach(function(t, i) { grid.appendChild(buildTile(i, t)); });
  }

  function scratchTile(index) {
    if (_scratched.indexOf(index) !== -1) return;
    if (_committed && _prize) return;
    _scratched.push(index);

    var grid = document.getElementById('scratchGrid');
    if (grid) {
      var tile = grid.querySelector('[data-index="' + index + '"]');
      if (tile) tile.classList.add('revealed');
    }

    if (_scratched.length >= 7 && !_committed) {
      commitScratch();
    }
  }

  function revealAll() {
    if (!_committed) commitScratch();
    for (var i = 0; i < (_tiles.length || 9); i++) {
      if (_scratched.indexOf(i) === -1) {
        _scratched.push(i);
        var grid = document.getElementById('scratchGrid');
        if (grid) {
          var tile = grid.querySelector('[data-index="' + i + '"]');
          if (tile) tile.classList.add('revealed');
        }
      }
    }
  }

  function commitScratch() {
    if (_committed) return;
    _committed = true;
    var token = getToken();
    if (!token) return;
    fetch('/api/scratchcard/scratch', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token }
    })
    .then(function(r) { return r.ok ? r.json() : null; })
    .then(function(data) {
      if (!data) return;
      _tiles = data.tiles || _tiles;
      _prize = data.prize || null;
      populateGrid(_tiles);
      _scratched.forEach(function(i) {
        var grid = document.getElementById('scratchGrid');
        if (grid) {
          var t = grid.querySelector('[data-index="' + i + '"]');
          if (t) t.classList.add('revealed');
        }
      });
      showPrize(data.prize, data.newBalance);
    })
    .catch(function() {});
  }

  function showPrize(prize, newBalance) {
    if (!prize) return;
    var prizeEl = document.getElementById('scratchPrize');
    var prizeAmt = document.getElementById('scratchPrizeAmt');
    var collectBtn = document.getElementById('scratchCollect');
    var revealBtn = document.getElementById('scratchRevealAll');

    if (prizeAmt) {
      var parts = [];
      if (prize.gems) parts.push('+' + prize.gems + ' \uD83D\uDC8E Gems');
      if (prize.credits) parts.push('+$' + Number(prize.credits).toFixed(2));
      prizeAmt.textContent = parts.join(' \u00B7 ') || 'Better luck tomorrow!';
    }
    if (prizeEl) prizeEl.style.display = 'block';
    if (collectBtn) collectBtn.style.display = 'block';
    if (revealBtn) revealBtn.style.display = 'none';

    if (newBalance !== undefined && typeof window.updateBalance === 'function') {
      window.updateBalance(newBalance);
    }
  }

  function collect() {
    var btn = document.getElementById('scratchCollect');
    if (btn) { btn.textContent = '\u2705 Collected!'; btn.disabled = true; }
    var badge = document.querySelector('.sc-badge');
    if (badge) badge.remove();
    setTimeout(closeScratchCardModal, 1500);
  }

  function startCountdown() {
    var el = document.getElementById('scratchCountdown');
    if (!el) return;
    function tick() {
      var now = new Date();
      var midnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
      var diff = Math.max(0, Math.floor((midnight - now) / 1000));
      var h = Math.floor(diff / 3600);
      var m = Math.floor((diff % 3600) / 60);
      var s = diff % 60;
      el.textContent = 'Next card in ' + pad(h) + ':' + pad(m) + ':' + pad(s);
    }
    function pad(n) { return String(n).padStart(2, '0'); }
    tick();
    _countdownTimer = setInterval(tick, 1000);
  }

  function addNavBadge() {
    document.querySelectorAll('.nav-btn').forEach(function(btn) {
      if (btn.textContent.indexOf('\uD83C\uDCCF') !== -1 && !btn.querySelector('.sc-badge')) {
        var dot = document.createElement('span');
        dot.className = 'sc-badge';
        btn.appendChild(dot);
      }
    });
  }

  function checkStatus() {
    var token = getToken();
    if (!token) return;
    fetch('/api/scratchcard/today', {
      headers: { 'Authorization': 'Bearer ' + token }
    })
    .then(function(r) { return r.ok ? r.json() : null; })
    .then(function(data) {
      if (!data || !data.available) return;
      addNavBadge();
      _autoCheckTimer = setTimeout(function() {
        var ov = document.getElementById('scratchOverlay');
        if (!ov || !ov.classList.contains('active')) openScratchCardModal();
      }, 10000);
    })
    .catch(function() {});
  }

  function openScratchCardModal() {
    injectStyles();
    buildModal();

    _scratched = [];
    _tiles = [];
    _prize = null;
    _committed = false;
    if (_countdownTimer) { clearInterval(_countdownTimer); _countdownTimer = null; }

    var prizeEl = document.getElementById('scratchPrize');
    var collectBtn = document.getElementById('scratchCollect');
    var revealBtn = document.getElementById('scratchRevealAll');
    var countdown = document.getElementById('scratchCountdown');
    if (prizeEl) prizeEl.style.display = 'none';
    if (collectBtn) { collectBtn.style.display = 'none'; collectBtn.disabled = false; collectBtn.textContent = '\uD83D\uDCB0 Collect Reward'; }
    if (revealBtn) revealBtn.style.display = 'block';
    if (countdown) countdown.textContent = '';

    var placeholders = [];
    for (var i = 0; i < 9; i++) placeholders.push({ symbol: '?', value: 0 });
    populateGrid(placeholders);

    var token = getToken();
    if (token) {
      fetch('/api/scratchcard/today', {
        headers: { 'Authorization': 'Bearer ' + token }
      })
      .then(function(r) { return r.ok ? r.json() : null; })
      .then(function(data) {
        if (!data) return;
        if (data.alreadyScratched && data.result) {
          _tiles = data.result.tiles || [];
          _prize = data.result.prize;
          _committed = true;
          populateGrid(_tiles);
          _tiles.forEach(function(t, i) { _scratched.push(i); });
          var grid = document.getElementById('scratchGrid');
          if (grid) {
            grid.querySelectorAll('.sc-tile').forEach(function(t) { t.classList.add('revealed'); });
          }
          showPrize(data.result.prize, undefined);
          if (collectBtn) collectBtn.style.display = 'none';
          if (revealBtn) revealBtn.style.display = 'none';
          startCountdown();
        }
      })
      .catch(function() {});
    }

    _overlay.classList.add('active');
  }

  function closeScratchCardModal() {
    if (_overlay) _overlay.classList.remove('active');
    if (_countdownTimer) { clearInterval(_countdownTimer); _countdownTimer = null; }
  }

  function init() {
    setTimeout(checkStatus, 7000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 0);
  }

  window.openScratchCardModal = openScratchCardModal;
  window.closeScratchCardModal = closeScratchCardModal;

}());
