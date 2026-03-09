(function () {
  'use strict';

  // ── European Roulette UI ────────────────────────────────────────────────────
  // Standard European layout: 0-36, single zero.
  // Inside bets: straight (35:1). Outside: red/black, odd/even, low/high (1:1).
  // Dozens & Columns (2:1). Up to 20 simultaneous bets per spin.

  var RED_NUMS = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);

  function numColor(n) {
    if (n === 0) return 'green';
    return RED_NUMS.has(n) ? 'red' : 'black';
  }

  // ── state ──────────────────────────────────────────────────────────────────

  var state = {
    open:      false,
    spinning:  false,
    chipValue: 1,
    bets:      [],  // [{type, value, amount, cellKey}] — cellKey for chip display
    chips:     {},  // cellKey → total amount stacked
    history:   [],  // [{number, color}]
  };

  var refs = {};

  // ── helpers ────────────────────────────────────────────────────────────────

  function getToken() {
    try { return localStorage.getItem('casino_token') || localStorage.getItem(typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken') || localStorage.getItem('token') || null; }
    catch (e) { return null; }
  }

  function apiFetch(path, opts) {
    var token = getToken();
    var h = { 'Content-Type': 'application/json' };
    if (token) h['Authorization'] = 'Bearer ' + token;
    return fetch(path, Object.assign({ headers: h }, opts || {}));
  }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls)  e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  function clearChildren(n) { while (n.firstChild) n.removeChild(n.firstChild); }

  function totalBet() {
    return state.bets.reduce(function(s, b) { return s + b.amount; }, 0);
  }

  // ── chip-on-table management ────────────────────────────────────────────────

  function addBet(type, value, cellKey) {
    var amount = state.chipValue;
    // accumulate on same cell
    state.chips[cellKey] = (state.chips[cellKey] || 0) + amount;
    // find existing bet of same type+value
    var existing = null;
    for (var i = 0; i < state.bets.length; i++) {
      if (state.bets[i].type === type && state.bets[i].value === value) {
        existing = state.bets[i];
        break;
      }
    }
    if (existing) {
      existing.amount += amount;
    } else {
      if (state.bets.length >= 20) { setStatus('Maximum 20 bet spots reached', 'rl-err'); return; }
      state.bets.push({ type: type, value: value, amount: amount, cellKey: cellKey });
    }
    refreshChipOnCell(cellKey);
    updateBetDisplay();
  }

  function clearBets() {
    state.bets  = [];
    state.chips = {};
    refreshAllChips();
    updateBetDisplay();
    setStatus('Bets cleared. Place your bets!');
  }

  function refreshChipOnCell(cellKey) {
    var cell = document.querySelector('[data-rlkey="' + cellKey + '"]');
    if (!cell) return;
    var existing = cell.querySelector('.rl-chip');
    if (existing) cell.removeChild(existing);
    var total = state.chips[cellKey] || 0;
    if (total > 0) {
      var chip = el('span', 'rl-chip', total >= 1000 ? (total/1000).toFixed(1) + 'k' : '$' + total.toFixed(total < 10 ? 2 : 0));
      cell.appendChild(chip);
    }
  }

  function refreshAllChips() {
    var cells = document.querySelectorAll('[data-rlkey]');
    for (var i = 0; i < cells.length; i++) {
      var cell   = cells[i];
      var key    = cell.getAttribute('data-rlkey');
      var existing = cell.querySelector('.rl-chip');
      if (existing) cell.removeChild(existing);
      var total = state.chips[key] || 0;
      if (total > 0) {
        var chip = el('span', 'rl-chip', total >= 1000 ? (total/1000).toFixed(1) + 'k' : '$' + total.toFixed(total < 10 ? 2 : 0));
        cell.appendChild(chip);
      }
    }
  }

  // ── UI helpers ──────────────────────────────────────────────────────────────

  function updateBetDisplay() {
    refs.betTotal.textContent = '$' + totalBet().toFixed(2);
    refs.btnSpin.disabled     = state.spinning || state.bets.length === 0;
    refs.btnClear.disabled    = state.spinning || state.bets.length === 0;
  }

  function setStatus(msg, cls) {
    refs.statusMsg.textContent = msg || '';
    refs.statusMsg.className   = 'rl-status ' + (cls || '');
  }

  function syncBalance(newBal) {
    if (newBal == null) return;
    if (typeof window.updateBalanceDisplay === 'function') window.updateBalanceDisplay(newBal);
    if (typeof window.balance !== 'undefined') window.balance = newBal;
  }

  function setChipValue(v) {
    state.chipValue = v;
    var btns = document.querySelectorAll('.rl-chip-btn');
    for (var i = 0; i < btns.length; i++) {
      btns[i].classList.toggle('rl-chip-active', parseFloat(btns[i].getAttribute('data-cv')) === v);
    }
  }

  // ── wheel animation ─────────────────────────────────────────────────────────

  function spinWheel(result, onDone) {
    var wheel = refs.wheelDisc;
    var label = refs.wheelNum;
    var color = numColor(result);

    // Reset then animate
    wheel.style.transition = 'none';
    wheel.style.transform  = 'rotate(0deg)';

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        wheel.style.transition = 'transform 3s cubic-bezier(0.17,0.67,0.12,0.99)';
        // Spin multiple full rotations then land
        var extraSpins = 5 + Math.floor(Math.random() * 3);
        var deg = extraSpins * 360 + (result * (360 / 37));
        wheel.style.transform = 'rotate(' + deg + 'deg)';

        setTimeout(function () {
          // Show result
          label.textContent = result === 0 ? '0' : String(result);
          wheel.style.background = color === 'green' ? '#16a34a' :
                                   color === 'red'   ? '#dc2626' : '#1e1e1e';
          onDone();
        }, 3200);
      });
    });
  }

  // ── highlight winning cells ─────────────────────────────────────────────────

  function highlightResult(resultNum) {
    var cells = document.querySelectorAll('[data-rlkey]');
    for (var i = 0; i < cells.length; i++) {
      cells[i].classList.remove('rl-cell-win', 'rl-cell-lose');
    }

    var resultColor = numColor(resultNum);

    for (var j = 0; j < state.bets.length; j++) {
      var b    = state.bets[j];
      var cell = document.querySelector('[data-rlkey="' + b.cellKey + '"]');
      if (!cell) continue;

      var won = false;
      switch (b.type) {
        case 'straight': won = resultNum === Number(b.value); break;
        case 'red':      won = resultNum > 0 && RED_NUMS.has(resultNum); break;
        case 'black':    won = resultNum > 0 && !RED_NUMS.has(resultNum); break;
        case 'odd':      won = resultNum > 0 && resultNum % 2 === 1; break;
        case 'even':     won = resultNum > 0 && resultNum % 2 === 0; break;
        case 'low':      won = resultNum >= 1 && resultNum <= 18; break;
        case 'high':     won = resultNum >= 19 && resultNum <= 36; break;
        case 'dozen': {
          var d = Number(b.value);
          won = d === 1 ? (resultNum >= 1 && resultNum <= 12) :
                d === 2 ? (resultNum >= 13 && resultNum <= 24) :
                           (resultNum >= 25 && resultNum <= 36);
          break;
        }
        case 'column': {
          var col = Number(b.value);
          won = resultNum > 0 && resultNum % 3 === (col === 3 ? 0 : col);
          break;
        }
      }
      cell.classList.add(won ? 'rl-cell-win' : 'rl-cell-lose');
    }

    // Also highlight the exact number cell
    var numCell = document.querySelector('[data-rlkey="n' + resultNum + '"]');
    if (numCell) numCell.classList.add('rl-cell-landed');
  }

  // ── history ──────────────────────────────────────────────────────────────────

  function addHistory(number, color) {
    state.history.push({ number: number, color: color });
    if (state.history.length > 15) state.history.shift();
    clearChildren(refs.histRow);
    state.history.forEach(function (h) {
      var pill = el('span', 'rl-hist-pill rl-hist-' + h.color, String(h.number));
      refs.histRow.appendChild(pill);
    });
  }

  // ── spin API ─────────────────────────────────────────────────────────────────

  function doSpin() {
    if (state.spinning || state.bets.length === 0) return;
    state.spinning = true;
    refs.btnSpin.disabled  = true;
    refs.btnClear.disabled = true;

    // Show spin result placeholder
    refs.wheelNum.textContent  = '?';
    refs.wheelDisc.style.background = '#334155';
    setStatus('No more bets! Spinning\u2026');

    // Clear cell highlights
    var cells = document.querySelectorAll('[data-rlkey]');
    for (var i = 0; i < cells.length; i++) {
      cells[i].classList.remove('rl-cell-win', 'rl-cell-lose', 'rl-cell-landed');
    }

    var betsPayload = state.bets.map(function(b) {
      return { type: b.type, value: b.value, amount: b.amount };
    });

    apiFetch('/api/roulette/spin', {
      method: 'POST',
      body: JSON.stringify({ bets: betsPayload }),
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (data.error) {
        state.spinning = false;
        updateBetDisplay();
        setStatus(data.error, 'rl-err');
        return;
      }

      spinWheel(data.number, function () {
        highlightResult(data.number);
        addHistory(data.number, data.color);

        var profit = data.profit;
        if (profit > 0) {
          setStatus('\uD83C\uDF89 Winner! +'  + '$' + profit.toFixed(2) + ' on ' + data.number + ' (' + data.color + ')', 'rl-ok');
        } else if (profit === 0) {
          setStatus('\uD83D\uDD04 Push — bet returned. Number: ' + data.number);
        } else {
          setStatus('Number: ' + data.number + ' (' + data.color + '). Better luck next time!', 'rl-err');
        }

        syncBalance(data.newBalance);
        clearBets();
        state.spinning = false;
        updateBetDisplay();
      });
    })
    .catch(function () {
      state.spinning = false;
      updateBetDisplay();
      setStatus('Network error — try again', 'rl-err');
    });
  }

  // ── build the roulette table ────────────────────────────────────────────────
  // Standard European layout (rotated 90°, numbers go left-to-right in rows of 3):
  // Row 1: 3, 6, 9, ... 36   (col 3)
  // Row 2: 2, 5, 8, ... 35   (col 2)  + 0 spanning all rows
  // Row 3: 1, 4, 7, ... 34   (col 1)
  // Then outside bets below.

  function makeNumberCell(n) {
    var c = numColor(n);
    var cell = el('div', 'rl-num-cell rl-num-' + c);
    cell.setAttribute('data-rlkey', 'n' + n);
    var label = el('span', 'rl-num-label', String(n));
    cell.appendChild(label);
    cell.addEventListener('click', function() {
      if (state.spinning) return;
      addBet('straight', n, 'n' + n);
    });
    return cell;
  }

  function makeOutsideCell(text, type, value, key, colorCls) {
    var cell = el('div', 'rl-outside-cell' + (colorCls ? ' ' + colorCls : ''), text);
    cell.setAttribute('data-rlkey', key);
    cell.addEventListener('click', function() {
      if (state.spinning) return;
      addBet(type, value, key);
    });
    return cell;
  }

  function buildTable() {
    var wrap = el('div', 'rl-table-wrap');

    // Zero cell (spans vertically on left)
    var zeroCell = el('div', 'rl-zero-cell rl-num-green');
    zeroCell.setAttribute('data-rlkey', 'n0');
    var zLabel = el('span', 'rl-num-label', '0');
    zeroCell.appendChild(zLabel);
    zeroCell.addEventListener('click', function() {
      if (state.spinning) return;
      addBet('straight', 0, 'n0');
    });

    // Number grid: 3 rows × 12 columns
    // Row indices: row 0 = top (3,6,...36), row 1 = mid (2,5,...35), row 2 = bot (1,4,...34)
    var grid = el('div', 'rl-num-grid');
    for (var row = 0; row < 3; row++) {
      for (var col = 0; col < 12; col++) {
        // number = col*3 + (3 - row)
        var n = col * 3 + (3 - row);
        grid.appendChild(makeNumberCell(n));
      }
    }

    // Column bets (right side of each row → "2:1" cells at end of each grid row)
    var colBets = el('div', 'rl-col-bets');
    [1, 2, 3].forEach(function(c) {
      colBets.appendChild(makeOutsideCell('2:1', 'column', c, 'col' + c));
    });

    var tableInner = el('div', 'rl-table-inner');
    tableInner.appendChild(zeroCell);
    tableInner.appendChild(grid);
    tableInner.appendChild(colBets);

    // Dozen row
    var dozenRow = el('div', 'rl-dozen-row');
    dozenRow.appendChild(makeOutsideCell('1st 12', 'dozen', 1, 'doz1'));
    dozenRow.appendChild(makeOutsideCell('2nd 12', 'dozen', 2, 'doz2'));
    dozenRow.appendChild(makeOutsideCell('3rd 12', 'dozen', 3, 'doz3'));

    // Outside bets row
    var outsideRow = el('div', 'rl-outside-row');
    outsideRow.appendChild(makeOutsideCell('1-18',  'low',   null, 'low'));
    outsideRow.appendChild(makeOutsideCell('ODD',   'odd',   null, 'odd'));
    outsideRow.appendChild(makeOutsideCell('\u2665 RED', 'red', null, 'redbet', 'rl-red-cell'));
    outsideRow.appendChild(makeOutsideCell('\u25A0 BLACK', 'black', null, 'blackbet', 'rl-black-cell'));
    outsideRow.appendChild(makeOutsideCell('EVEN',  'even',  null, 'even'));
    outsideRow.appendChild(makeOutsideCell('19-36', 'high',  null, 'high'));

    wrap.appendChild(tableInner);
    wrap.appendChild(dozenRow);
    wrap.appendChild(outsideRow);
    return wrap;
  }

  // ── build full UI ───────────────────────────────────────────────────────────

  function buildUI() {
    if (document.getElementById('rl-overlay')) return;

    var overlay = el('div', 'rl-overlay');
    overlay.id  = 'rl-overlay';

    var panel = el('div', 'rl-panel');

    // Header
    var header  = el('div', 'rl-header');
    var title   = el('h2', 'rl-title', '\uD83C\uDFB0 Roulette');
    var sub     = el('span', 'rl-sub', 'European \u2022 Single Zero');
    var titleWrap = el('div');
    titleWrap.appendChild(title);
    titleWrap.appendChild(sub);
    var closeBtn = el('button', 'rl-close-btn', '\u00D7');
    closeBtn.setAttribute('aria-label', 'Close Roulette');
    closeBtn.addEventListener('click', closeRoulette);
    header.appendChild(titleWrap);
    header.appendChild(closeBtn);

    // Wheel display
    var wheelArea = el('div', 'rl-wheel-area');
    var wheelDisc = el('div', 'rl-wheel-disc');
    var wheelNum  = el('span', 'rl-wheel-num', '\u2b24'); // ●
    wheelDisc.appendChild(wheelNum);
    wheelArea.appendChild(wheelDisc);
    refs.wheelDisc = wheelDisc;
    refs.wheelNum  = wheelNum;

    // Status
    var statusMsg = el('div', 'rl-status', 'Click a chip, then click the table to place bets!');
    refs.statusMsg = statusMsg;

    // Table
    var table = buildTable();

    // Chip selector
    var chipRow = el('div', 'rl-chip-row');
    var chipLabel = el('span', 'rl-chip-label', 'Chip:');
    chipRow.appendChild(chipLabel);
    [0.50, 1, 5, 10, 25, 100, 500].forEach(function(v) {
      var btn = el('button', 'rl-chip-btn' + (v === state.chipValue ? ' rl-chip-active' : ''));
      btn.textContent = v < 1 ? ('$' + v.toFixed(2)) : ('$' + v);
      btn.setAttribute('data-cv', String(v));
      btn.addEventListener('click', function() { setChipValue(v); });
      chipRow.appendChild(btn);
    });

    // Bet total + controls
    var betRow   = el('div', 'rl-bet-row');
    var betTotal = el('span', 'rl-bet-total', '$0.00');
    refs.betTotal = betTotal;

    var btnClear = el('button', 'rl-btn rl-btn-clear', '\u267B Clear');
    btnClear.disabled = true;
    btnClear.addEventListener('click', clearBets);
    refs.btnClear = btnClear;

    var btnSpin = el('button', 'rl-btn rl-btn-spin', '\uD83D\uDD04 SPIN');
    btnSpin.disabled = true;
    btnSpin.addEventListener('click', doSpin);
    refs.btnSpin = btnSpin;

    var betLabel = el('span', 'rl-field-label', 'Total Bet:');
    betRow.appendChild(betLabel);
    betRow.appendChild(betTotal);
    betRow.appendChild(btnClear);
    betRow.appendChild(btnSpin);

    // History
    var histSection = el('div', 'rl-hist-section');
    var histLabel   = el('div', 'rl-hist-label', 'Recent Numbers');
    var histRow     = el('div', 'rl-hist-row');
    refs.histRow = histRow;
    histSection.appendChild(histLabel);
    histSection.appendChild(histRow);

    panel.appendChild(header);
    panel.appendChild(wheelArea);
    panel.appendChild(statusMsg);
    panel.appendChild(table);
    panel.appendChild(chipRow);
    panel.appendChild(betRow);
    panel.appendChild(histSection);

    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) closeRoulette();
    });

    injectStyles();
  }

  // ── open / close ────────────────────────────────────────────────────────────

  function openRoulette() {
    if (!getToken()) return;
    buildUI();
    var ov = document.getElementById('rl-overlay');
    if (ov) {
      ov.style.display = 'flex';
      state.open = true;
    }
  }

  function closeRoulette() {
    var ov = document.getElementById('rl-overlay');
    if (ov) ov.style.display = 'none';
    state.open = false;
  }

  // ── styles ──────────────────────────────────────────────────────────────────

  function injectStyles() {
    if (document.getElementById('rl-styles')) return;
    var s = document.createElement('style');
    s.id  = 'rl-styles';
    s.textContent = [
      /* overlay */
      '.rl-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.8);z-index:10400;align-items:center;justify-content:center;padding:.5rem;box-sizing:border-box}',
      /* panel */
      '.rl-panel{background:#0f172a;border:1px solid #1e3a5f;border-radius:1rem;padding:1.2rem;width:100%;max-width:700px;max-height:98vh;overflow-y:auto;display:flex;flex-direction:column;gap:.75rem;color:#e2e8f0;font-family:inherit}',
      /* header */
      '.rl-header{display:flex;justify-content:space-between;align-items:flex-start}',
      '.rl-title{margin:0;font-size:1.35rem;color:#f8fafc}',
      '.rl-sub{font-size:.72rem;color:#64748b;display:block;margin-top:.1rem}',
      '.rl-close-btn{background:none;border:none;color:#94a3b8;font-size:1.6rem;cursor:pointer;line-height:1;padding:.2rem .5rem}',
      '.rl-close-btn:hover{color:#e2e8f0}',
      /* wheel */
      '.rl-wheel-area{display:flex;justify-content:center}',
      '.rl-wheel-disc{width:90px;height:90px;border-radius:50%;background:#334155;display:flex;align-items:center;justify-content:center;border:3px solid #fbbf24;box-shadow:0 0 20px rgba(251,191,36,.3)}',
      '.rl-wheel-num{font-size:2rem;font-weight:900;color:#fff;font-variant-numeric:tabular-nums}',
      /* status */
      '.rl-status{text-align:center;font-size:.85rem;color:#94a3b8;min-height:1.1em}',
      '.rl-ok{color:#4ade80}',
      '.rl-err{color:#f87171}',
      /* table */
      '.rl-table-wrap{display:flex;flex-direction:column;gap:2px}',
      '.rl-table-inner{display:flex;gap:2px}',
      /* zero cell */
      '.rl-zero-cell{width:32px;min-width:32px;display:flex;align-items:center;justify-content:center;border-radius:4px;cursor:pointer;font-weight:700;font-size:.9rem;color:#fff;border:1px solid rgba(255,255,255,.15);position:relative;transition:filter .1s}',
      '.rl-zero-cell:hover{filter:brightness(1.25)}',
      '.rl-num-green{background:#16a34a}',
      /* number grid */
      '.rl-num-grid{display:grid;grid-template-columns:repeat(12,1fr);grid-template-rows:repeat(3,1fr);gap:2px;flex:1}',
      '.rl-num-cell{display:flex;align-items:center;justify-content:center;border-radius:3px;cursor:pointer;font-weight:600;font-size:.78rem;color:#fff;min-height:32px;border:1px solid rgba(255,255,255,.1);position:relative;transition:filter .12s}',
      '.rl-num-cell:hover{filter:brightness(1.3)}',
      '.rl-num-red{background:#b91c1c}',
      '.rl-num-black{background:#1e1e1e}',
      '.rl-num-label{pointer-events:none;z-index:10400}',
      /* col bets */
      '.rl-col-bets{display:flex;flex-direction:column;gap:2px;width:42px;min-width:42px}',
      /* outside cells */
      '.rl-outside-cell{display:flex;align-items:center;justify-content:center;border-radius:3px;cursor:pointer;font-weight:600;font-size:.75rem;color:#e2e8f0;min-height:28px;border:1px solid rgba(255,255,255,.12);background:#1e293b;position:relative;transition:filter .12s;flex:1}',
      '.rl-outside-cell:hover{filter:brightness(1.25)}',
      '.rl-dozen-row{display:flex;gap:2px}',
      '.rl-outside-row{display:flex;gap:2px;margin-left:34px}',
      '.rl-red-cell{background:#b91c1c!important}',
      '.rl-black-cell{background:#1e1e1e!important;border-color:rgba(255,255,255,.2)!important}',
      /* win/lose highlights */
      '.rl-cell-win{outline:2px solid #4ade80!important;filter:brightness(1.4)!important}',
      '.rl-cell-lose{opacity:.45}',
      '.rl-cell-landed{outline:3px solid #fbbf24!important;animation:rlLand .4s ease}',
      '@keyframes rlLand{0%{transform:scale(1.2)}100%{transform:scale(1)}}',
      /* chip on cell */
      '.rl-chip{position:absolute;top:-6px;right:-6px;background:#fbbf24;color:#000;border-radius:50%;min-width:18px;height:18px;font-size:.58rem;font-weight:900;display:flex;align-items:center;justify-content:center;padding:0 3px;z-index:10400;pointer-events:none;box-shadow:0 1px 4px rgba(0,0,0,.5)}',
      /* chip selector */
      '.rl-chip-row{display:flex;align-items:center;gap:.35rem;flex-wrap:wrap}',
      '.rl-chip-label{font-size:.78rem;color:#64748b;margin-right:.1rem}',
      '.rl-chip-btn{background:#1e293b;border:1px solid #334155;color:#94a3b8;border-radius:.4rem;padding:.28rem .55rem;font-size:.78rem;cursor:pointer;font-weight:600;transition:border-color .15s,color .15s}',
      '.rl-chip-btn:hover{border-color:#60a5fa;color:#60a5fa}',
      '.rl-chip-active{background:#1d4ed8!important;border-color:#3b82f6!important;color:#fff!important}',
      /* bet row */
      '.rl-bet-row{display:flex;align-items:center;gap:.6rem;flex-wrap:wrap}',
      '.rl-field-label{font-size:.78rem;color:#64748b;text-transform:uppercase;letter-spacing:.05em}',
      '.rl-bet-total{font-size:1.1rem;font-weight:700;color:#fbbf24;flex:1}',
      '.rl-btn{border:none;border-radius:.5rem;padding:.55rem 1.1rem;font-size:.9rem;font-weight:700;cursor:pointer;transition:opacity .15s}',
      '.rl-btn:disabled{opacity:.35;cursor:not-allowed}',
      '.rl-btn-clear{background:#334155;color:#e2e8f0}',
      '.rl-btn-spin{background:linear-gradient(135deg,#7c3aed,#6d28d9);color:#fff;font-size:1rem;padding:.6rem 1.4rem}',
      '.rl-btn-spin:not(:disabled):hover{opacity:.85}',
      /* history */
      '.rl-hist-section{display:flex;flex-direction:column;gap:.3rem}',
      '.rl-hist-label{font-size:.72rem;color:#64748b;text-transform:uppercase;letter-spacing:.05em}',
      '.rl-hist-row{display:flex;flex-wrap:wrap;gap:.3rem;min-height:1.3rem}',
      '.rl-hist-pill{width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:.7rem;font-weight:700;color:#fff}',
      '.rl-hist-red{background:#b91c1c}',
      '.rl-hist-black{background:#1e1e1e;border:1px solid #475569}',
      '.rl-hist-green{background:#16a34a}',
    ].join('\n');
    document.head.appendChild(s);
  }

  // ── public API ──────────────────────────────────────────────────────────────

  window.openRoulette  = openRoulette;
  window.closeRoulette = closeRoulette;

}());
