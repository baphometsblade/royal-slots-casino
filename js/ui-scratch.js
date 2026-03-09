(function() {
  'use strict';

  var TOKEN_KEY = typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken';

  var _overlay   = null;
  var _stylesInj = false;
  var _tier      = 1;
  var _scratching = false;

  function getToken() {
    try { return localStorage.getItem(TOKEN_KEY); } catch(e) { return null; }
  }

  // Symbol display map
  var SYMBOL_ICONS = {
    '7':       '\uD83D\uDD22',   // 🔢  → use text
    'BAR':     '\uD83C\uDF7A',   // 🍺
    'cherry':  '\uD83C\uDF52',   // 🍒
    'lemon':   '\uD83C\uDF4B',   // 🍋
    'grape':   '\uD83C\uDF47',   // 🍇
    'bell':    '\uD83D\uDD14',   // 🔔
    'star':    '\u2B50',         // ⭐
    'diamond': '\uD83D\uDC8E',   // 💎
  };

  function symIcon(sym) {
    return SYMBOL_ICONS[sym] || sym;
  }

  function injectStyles() {
    if (_stylesInj) return;
    _stylesInj = true;
    var s = document.createElement('style');
    s.textContent = [
      '#scOverlay{position:fixed;inset:0;background:rgba(0,0,0,.93);z-index:10400;display:none;align-items:center;justify-content:center;font-family:monospace}',
      '#scOverlay.active{display:flex}',
      '#scModal{background:linear-gradient(135deg,#0d0a00,#1a1400);border:2px solid rgba(251,191,36,.3);border-radius:20px;padding:18px 20px;max-width:400px;width:96%;text-align:center;max-height:96vh;overflow-y:auto}',
      '#scModal h2{color:#fde68a;font-size:20px;margin:0 0 2px;letter-spacing:2px}',
      '#scModal .sc-sub{color:rgba(255,255,255,.35);font-size:11px;margin-bottom:12px}',
      '.sc-tier-row{display:flex;gap:8px;justify-content:center;margin-bottom:12px}',
      '.sc-tier-btn{flex:1;max-width:90px;padding:8px 4px;border-radius:10px;border:2px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06);color:rgba(255,255,255,.5);font-size:13px;font-weight:900;cursor:pointer;transition:all .15s}',
      '.sc-tier-btn.sc-sel{background:rgba(251,191,36,.2);border-color:#fbbf24;color:#fde68a}',
      '#scCard{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin:0 auto 14px;max-width:260px}',
      '.sc-cell{aspect-ratio:1;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:26px;position:relative;overflow:hidden;cursor:pointer;border:2px solid rgba(255,255,255,.1);background:rgba(255,255,255,.07);transition:transform .15s}',
      '.sc-cell.sc-covered{background:linear-gradient(135deg,#78350f,#92400e);cursor:pointer;border-color:rgba(251,191,36,.3)}',
      '.sc-cell.sc-covered:hover{transform:scale(1.06);background:linear-gradient(135deg,#92400e,#b45309)}',
      '.sc-cell.sc-revealed{background:rgba(255,255,255,.08);cursor:default;border-color:rgba(255,255,255,.12)}',
      '.sc-cell.sc-win{background:rgba(251,191,36,.2);border-color:#fbbf24;animation:scPop .3s ease}',
      '.sc-scratch-cover{position:absolute;inset:0;background:repeating-linear-gradient(45deg,rgba(180,100,20,.8),rgba(180,100,20,.8) 4px,rgba(120,60,10,.8) 4px,rgba(120,60,10,.8) 8px);display:flex;align-items:center;justify-content:center;font-size:16px;color:rgba(255,220,100,.7);transition:opacity .2s}',
      '.sc-cell.sc-revealed .sc-scratch-cover{opacity:0;pointer-events:none}',
      '@keyframes scPop{0%{transform:scale(.8)}60%{transform:scale(1.15)}100%{transform:scale(1)}}',
      '.sc-reveal-all-btn{width:100%;padding:10px;border-radius:12px;border:1px solid rgba(251,191,36,.3);background:rgba(251,191,36,.1);color:#fde68a;font-size:12px;font-weight:700;cursor:pointer;margin-bottom:10px;transition:all .12s}',
      '.sc-reveal-all-btn:hover{background:rgba(251,191,36,.2)}',
      '.sc-btn-row{display:flex;gap:8px;margin-bottom:8px}',
      '.sc-btn{flex:1;padding:12px 0;border-radius:12px;border:none;font-size:14px;font-weight:900;cursor:pointer;transition:transform .1s;letter-spacing:.4px}',
      '.sc-btn:hover:not(:disabled){transform:scale(1.02)}',
      '.sc-btn:disabled{opacity:.35;cursor:not-allowed;transform:none}',
      '#scBuyBtn{background:linear-gradient(135deg,#78350f,#d97706);color:#fff;border:1px solid rgba(251,191,36,.4)}',
      '#scResult{font-size:14px;font-weight:800;min-height:20px;color:#fde68a;margin-bottom:8px}',
      '.sc-prize-table{font-size:9px;color:rgba(255,255,255,.22);text-align:left;margin-bottom:8px;line-height:1.8;column-count:2;column-gap:8px}',
      '.sc-prize-table b{color:rgba(255,255,255,.45)}',
      '#scClose{background:none;border:none;color:rgba(255,255,255,.3);font-size:12px;cursor:pointer;text-decoration:underline}',
    ].join('\n');
    document.head.appendChild(s);
  }

  // ── helpers ──────────────────────────────────────────────────────────────────

  function setResult(txt, col) {
    var el = document.getElementById('scResult');
    if (!el) return;
    el.textContent = txt;
    el.style.color = col || '#fde68a';
  }

  function selectTier(t) {
    _tier = t;
    [1,2,3].forEach(function(n) {
      var b = document.getElementById('scTier' + n);
      if (b) b.classList.toggle('sc-sel', n === t);
    });
  }

  function setCellRevealed(idx, sym, isWin) {
    var cell = document.getElementById('scCell' + idx);
    if (!cell) return;
    cell.classList.remove('sc-covered');
    cell.classList.add('sc-revealed');
    if (isWin) cell.classList.add('sc-win');
    var cover = cell.querySelector('.sc-scratch-cover');
    var icon  = cell.querySelector('.sc-icon');
    if (icon) icon.textContent = symIcon(sym);
    if (cover) cover.style.opacity = '0';
    cell.style.cursor = 'default';
    cell.onclick = null;
  }

  // Animate reveal one by one
  function animateReveal(cells, winLines, prize, profit, newBalance, delay) {
    var winCells = [];
    winLines.forEach(function(li) {
      var LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
      if (LINES[li]) LINES[li].forEach(function(c) { if (winCells.indexOf(c) < 0) winCells.push(c); });
    });

    cells.forEach(function(sym, i) {
      setTimeout(function() {
        setCellRevealed(i, sym, winCells.indexOf(i) >= 0);
        if (i === cells.length - 1) {
          // All revealed
          if (typeof window.updateBalance === 'function' && newBalance != null) {
            window.updateBalance(newBalance);
          }
          var buyBtn = document.getElementById('scBuyBtn');
          if (buyBtn) buyBtn.disabled = false;
          _scratching = false;

          if (prize > 0) {
            setResult('\uD83C\uDF89 Winner! +$' + profit.toFixed(2), profit >= 10 ? '#fbbf24' : '#4ade80');
          } else {
            setResult('\uD83D\uDE14 No match \u2014 try again!', '#f87171');
          }
        }
      }, delay * i);
    });
  }

  // ── buy + reveal ──────────────────────────────────────────────────────────────

  function doBuy() {
    if (_scratching) return;
    var token = getToken();
    if (!token) { setResult('Please log in to play.', '#f87171'); return; }

    _scratching = true;
    var buyBtn = document.getElementById('scBuyBtn');
    if (buyBtn) buyBtn.disabled = true;
    setResult('Generating card\u2026', '#fde68a');

    // Reset grid to covered
    for (var i = 0; i < 9; i++) {
      var cell = document.getElementById('scCell' + i);
      if (!cell) continue;
      cell.className = 'sc-cell sc-covered';
      var icon = cell.querySelector('.sc-icon');
      if (icon) icon.textContent = '';
      var cover = cell.querySelector('.sc-scratch-cover');
      if (cover) cover.style.opacity = '1';
    }

    var gameId;

    fetch('/api/scratch/buy', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ tier: _tier }),
    })
    .then(function(r) { return r.ok ? r.json() : r.json().then(function(e) { throw e; }); })
    .then(function(data) {
      gameId = data.gameId;
      setResult('Scratch to reveal!', '#fde68a');

      // Now immediately reveal (fetch all cells)
      return fetch('/api/scratch/reveal', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId: gameId }),
      });
    })
    .then(function(r) { return r.ok ? r.json() : r.json().then(function(e) { throw e; }); })
    .then(function(data) {
      // Animate reveal with 120ms per cell
      animateReveal(data.cells, data.winLines, data.prize, data.profit, data.newBalance, 120);
    })
    .catch(function(err) {
      _scratching = false;
      if (buyBtn) buyBtn.disabled = false;
      setResult((err && err.error) || 'Error \u2014 check balance.', '#f87171');
    });
  }

  // ── modal build ───────────────────────────────────────────────────────────────

  function buildModal() {
    if (_overlay) return;
    _overlay = document.createElement('div');
    _overlay.id = 'scOverlay';

    var modal = document.createElement('div');
    modal.id = 'scModal';

    var icon = document.createElement('div');
    icon.style.cssText = 'font-size:28px;margin-bottom:2px';
    icon.textContent = '\uD83C\uDF9F\uFE0F';
    modal.appendChild(icon);

    var h2 = document.createElement('h2');
    h2.textContent = 'SCRATCH CARDS';
    modal.appendChild(h2);

    var sub = document.createElement('div');
    sub.className = 'sc-sub';
    sub.textContent = 'Match 3 symbols in a line to win!';
    modal.appendChild(sub);

    // Tier selector
    var tierRow = document.createElement('div');
    tierRow.className = 'sc-tier-row';
    [
      { n:1, lbl:'$1 Card' },
      { n:2, lbl:'$5 Card' },
      { n:3, lbl:'$20 Card' },
    ].forEach(function(t) {
      var b = document.createElement('button');
      b.id = 'scTier' + t.n;
      b.className = 'sc-tier-btn' + (t.n === _tier ? ' sc-sel' : '');
      b.textContent = t.lbl;
      b.addEventListener('click', function() { if (!_scratching) selectTier(t.n); });
      tierRow.appendChild(b);
    });
    modal.appendChild(tierRow);

    // Card grid
    var card = document.createElement('div');
    card.id = 'scCard';
    for (var i = 0; i < 9; i++) {
      var cell = document.createElement('div');
      cell.id = 'scCell' + i;
      cell.className = 'sc-cell sc-covered';

      var icon2 = document.createElement('div');
      icon2.className = 'sc-icon';
      icon2.style.cssText = 'font-size:26px;position:relative;z-index:10400';
      cell.appendChild(icon2);

      var cover = document.createElement('div');
      cover.className = 'sc-scratch-cover';
      cover.textContent = '\uD83E\uDD11';
      cell.appendChild(cover);

      card.appendChild(cell);
    }
    modal.appendChild(card);

    // Buy button
    var btnRow = document.createElement('div');
    btnRow.className = 'sc-btn-row';
    var buyBtn = document.createElement('button');
    buyBtn.id = 'scBuyBtn';
    buyBtn.className = 'sc-btn';
    buyBtn.textContent = '\uD83C\uDF9F\uFE0F Buy & Scratch!';
    buyBtn.addEventListener('click', doBuy);
    btnRow.appendChild(buyBtn);
    modal.appendChild(btnRow);

    // Result
    var resultEl = document.createElement('div');
    resultEl.id = 'scResult';
    resultEl.textContent = 'Pick a card tier and scratch!';
    resultEl.style.color = '#fde68a';
    modal.appendChild(resultEl);

    // Prize table
    var pt = document.createElement('div');
    pt.className = 'sc-prize-table';
    pt.innerHTML = '<b>$1 card:</b> 7×7×7=50x \u00b7 BAR=10x \u00b7 \uD83D\uDD14=3x<br>' +
                   '<b>$5 card:</b> 7=250x \u00b7 \uD83D\uDC8E=100x \u00b7 \u2B50=30x<br>' +
                   '<b>$20 card:</b> 7=1000x \u00b7 \uD83D\uDC8E=400x \u00b7 \u2B50=150x';
    modal.appendChild(pt);

    var closeBtn = document.createElement('button');
    closeBtn.id = 'scClose';
    closeBtn.textContent = 'Close';
    closeBtn.addEventListener('click', closeScratch);
    modal.appendChild(closeBtn);

    _overlay.appendChild(modal);
    _overlay.addEventListener('click', function(e) { if (e.target === _overlay) closeScratch(); });
    document.body.appendChild(_overlay);
  }

  // ── public API ────────────────────────────────────────────────────────────────

  function openScratch() {
    injectStyles();
    buildModal();
    _overlay.classList.add('active');
    setResult('Pick a card tier and scratch!', '#fde68a');
  }

  function closeScratch() {
    if (_overlay) _overlay.classList.remove('active');
    _scratching = false;
  }

  window.openScratch  = openScratch;
  window.closeScratch = closeScratch;

}());
