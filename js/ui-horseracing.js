(function () {
  'use strict';

  // ── Virtual Horse Racing UI ─────────────────────────────────────────────────
  // 6-horse field, animated canvas track, multi-bet queue (Win/Place/Show/
  // Quinella/Exacta), results panel with per-bet P&L.
  // Public API: window.openHorseRacing(), window.closeHorseRacing()

  var TOKEN_KEY = typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken';

  // ── Horse colors ─────────────────────────────────────────────────────────
  var HORSE_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7'];

  // ── state ──────────────────────────────────────────────────────────────────
  var state = {
    open:        false,
    racing:      false,
    fetching:    false,
    horseNames:  ['Thunder', 'Lightning', 'Blaze', 'Comet', 'Spirit', 'Shadow'],
    betType:     'win',
    selectedH1:  0,   // 0-based index
    selectedH2:  1,   // for exacta/quinella
    betAmount:   5,
    queuedBets:  [],  // [{type, h1, h2, amount, label}]
    raceHorses:  [],  // from server: [{name, splits, finishTime, place}]
    raceResults: [],  // per-bet result from server
    raceDone:    false,
    animFrame:   null,
    animStart:   null,
    ANIM_MS:     3200,
  };

  var refs = {};
  var _stylesInjected = false;

  // ── helpers ────────────────────────────────────────────────────────────────

  function getToken() {
    try { return localStorage.getItem(TOKEN_KEY); } catch (e) { return null; }
  }

  function apiFetch(path, opts) {
    var token = getToken();
    var h = { 'Content-Type': 'application/json' };
    if (token) h['Authorization'] = 'Bearer ' + token;
    return fetch(path, Object.assign({ headers: h }, opts || {}));
  }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  function clearChildren(n) { while (n.firstChild) n.removeChild(n.firstChild); }

  function fmtMoney(v) {
    return '$' + Number(v).toFixed(2);
  }

  function syncBalance(newBal) {
    if (newBal == null) return;
    if (typeof window.updateBalance === 'function') window.updateBalance(newBal);
    if (typeof window.updateBalanceDisplay === 'function') window.updateBalanceDisplay(newBal);
    if (typeof window.balance !== 'undefined') window.balance = newBal;
  }

  function showMsg(txt, isError) {
    var msg = refs.msg;
    if (!msg) return;
    msg.textContent = txt;
    msg.style.color = isError ? '#f87171' : '#fbbf24';
    msg.style.display = txt ? 'block' : 'none';
  }

  // ── CSS injection ──────────────────────────────────────────────────────────

  function injectStyles() {
    if (_stylesInjected || document.getElementById('horse-racing-css')) return;
    _stylesInjected = true;
    var s = document.createElement('style');
    s.id = 'horse-racing-css';
    s.textContent = [
      /* overlay */
      '#hrOverlay{position:fixed;inset:0;background:rgba(0,0,0,.93);z-index:10400;display:none;align-items:center;justify-content:center;font-family:monospace;padding:12px;box-sizing:border-box}',
      '#hrOverlay.active{display:flex}',
      /* modal */
      '#hrModal{background:linear-gradient(160deg,#052210,#0a3622 60%,#071c0f);border:2px solid rgba(251,191,36,.25);border-radius:20px;width:100%;max-width:780px;max-height:96vh;overflow-y:auto;padding:22px 22px 18px;box-sizing:border-box;color:#fff;position:relative}',
      /* header */
      '#hrModal .hr-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px}',
      '#hrModal .hr-title{font-size:22px;font-weight:900;color:#fbbf24;letter-spacing:2px;text-shadow:0 0 14px rgba(251,191,36,.5)}',
      '#hrModal .hr-close-btn{background:none;border:none;color:rgba(255,255,255,.35);font-size:22px;cursor:pointer;line-height:1;padding:4px 8px;border-radius:6px;transition:color .15s}',
      '#hrModal .hr-close-btn:hover{color:#f87171}',
      /* body layout */
      '#hrBody{display:flex;gap:18px;align-items:flex-start}',
      '#hrLeft{flex:1;min-width:0}',
      '#hrRight{width:280px;flex-shrink:0}',
      /* canvas track */
      '#hrTrackWrap{background:#041a0c;border-radius:14px;border:1.5px solid rgba(251,191,36,.18);overflow:hidden;margin-bottom:14px}',
      '#hrCanvas{display:block;width:100%;height:auto}',
      /* horse selection */
      '.hr-section-label{font-size:10px;color:rgba(255,255,255,.35);text-transform:uppercase;letter-spacing:.8px;margin-bottom:6px}',
      '.hr-horses{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:14px}',
      '.hr-horse-btn{padding:7px 4px;border-radius:9px;border:2px solid rgba(255,255,255,.1);background:rgba(255,255,255,.05);color:rgba(255,255,255,.65);font-size:11px;font-weight:700;cursor:pointer;transition:all .15s;text-align:center;line-height:1.3}',
      '.hr-horse-btn:hover:not(:disabled){filter:brightness(1.15)}',
      '.hr-horse-btn.selected{border-color:currentColor;filter:brightness(1.2)}',
      '.hr-horse-btn:disabled{opacity:.35;cursor:not-allowed}',
      /* bet type */
      '.hr-bet-types{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:14px}',
      '.hr-type-btn{flex:1;min-width:60px;padding:6px 4px;border-radius:8px;border:2px solid rgba(255,255,255,.1);background:rgba(255,255,255,.05);color:rgba(255,255,255,.5);font-size:11px;font-weight:700;cursor:pointer;transition:all .15s;text-align:center}',
      '.hr-type-btn:hover:not(:disabled){border-color:rgba(251,191,36,.4);color:#fbbf24}',
      '.hr-type-btn.active{background:rgba(251,191,36,.15);border-color:#fbbf24;color:#fbbf24}',
      '.hr-type-btn:disabled{opacity:.3;cursor:not-allowed}',
      /* exacta/quinella horse selectors */
      '#hrComboRow{display:flex;gap:8px;margin-bottom:12px;align-items:center}',
      '#hrComboRow label{font-size:10px;color:rgba(255,255,255,.35);white-space:nowrap}',
      '#hrComboRow select{flex:1;background:#0e2d18;border:1px solid rgba(251,191,36,.25);border-radius:7px;color:#fbbf24;padding:5px 7px;font-size:12px;font-weight:700;cursor:pointer}',
      '#hrComboRow select:focus{outline:none;border-color:#fbbf24}',
      /* bet amount */
      '.hr-amount-row{display:flex;gap:7px;align-items:center;margin-bottom:10px}',
      '.hr-amount-row label{font-size:10px;color:rgba(255,255,255,.35);white-space:nowrap}',
      '#hrBetInput{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);border-radius:8px;color:#fff;padding:6px 10px;font-size:14px;font-weight:700;width:80px;text-align:center}',
      '#hrBetInput:focus{outline:none;border-color:rgba(251,191,36,.6)}',
      '.hr-chips{display:flex;gap:5px;flex-wrap:wrap}',
      '.hr-chip{padding:5px 9px;border-radius:7px;border:1.5px solid rgba(251,191,36,.3);background:rgba(251,191,36,.08);color:#fbbf24;font-size:11px;font-weight:800;cursor:pointer;transition:all .15s}',
      '.hr-chip:hover:not(:disabled){background:rgba(251,191,36,.2)}',
      '.hr-chip:disabled{opacity:.3;cursor:not-allowed}',
      /* add bet button */
      '#hrAddBet{width:100%;margin:10px 0 14px;padding:9px;border-radius:10px;border:none;background:linear-gradient(135deg,#854d0e,#713f12);color:#fbbf24;font-size:13px;font-weight:900;cursor:pointer;letter-spacing:.5px;transition:transform .1s,opacity .1s}',
      '#hrAddBet:hover:not(:disabled){transform:scale(1.02)}',
      '#hrAddBet:disabled{opacity:.35;cursor:not-allowed;transform:none}',
      /* queued bets */
      '#hrBetList{margin-bottom:14px;min-height:24px}',
      '.hr-bet-tag{display:inline-flex;align-items:center;gap:5px;background:rgba(34,197,94,.12);border:1px solid rgba(34,197,94,.25);border-radius:6px;padding:4px 8px;font-size:11px;color:#86efac;margin:0 4px 4px 0}',
      '.hr-bet-tag .hr-remove{background:none;border:none;color:rgba(255,100,100,.6);font-size:13px;cursor:pointer;line-height:1;padding:0 2px}',
      '.hr-bet-tag .hr-remove:hover{color:#f87171}',
      /* run race button */
      '#hrRunBtn{width:100%;padding:13px;border-radius:12px;border:1.5px solid rgba(251,191,36,.4);background:linear-gradient(135deg,#1a5e33,#155127);color:#fbbf24;font-size:16px;font-weight:900;cursor:pointer;letter-spacing:.5px;transition:transform .1s,opacity .1s}',
      '#hrRunBtn:hover:not(:disabled){transform:scale(1.02)}',
      '#hrRunBtn:disabled{opacity:.4;cursor:not-allowed;transform:none}',
      /* msg */
      '#hrMsg{font-size:12px;font-weight:700;text-align:center;padding:4px 0;margin-bottom:8px;display:none}',
      /* results panel */
      '#hrResults{background:rgba(0,0,0,.35);border-radius:12px;border:1px solid rgba(255,255,255,.08);padding:14px;margin-top:16px;display:none}',
      '#hrResults h3{color:#fbbf24;font-size:14px;font-weight:900;margin:0 0 10px;letter-spacing:1px}',
      '.hr-result-row{display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid rgba(255,255,255,.06);font-size:12px}',
      '.hr-result-row:last-child{border-bottom:none}',
      '.hr-result-label{color:rgba(255,255,255,.65)}',
      '.hr-result-payout.won{color:#4ade80;font-weight:700}',
      '.hr-result-payout.lost{color:#f87171;font-weight:700}',
      '.hr-total-row{display:flex;justify-content:space-between;align-items:center;margin-top:10px;padding-top:8px;border-top:1px solid rgba(255,255,255,.12);font-size:14px;font-weight:900}',
      '.hr-total-row .hr-total-label{color:rgba(255,255,255,.5)}',
      '.hr-total-row .hr-total-val.pos{color:#4ade80}',
      '.hr-total-row .hr-total-val.neg{color:#f87171}',
      /* new race button */
      '#hrNewRace{width:100%;margin-top:12px;padding:10px;border-radius:10px;border:none;background:rgba(251,191,36,.15);color:#fbbf24;font-size:13px;font-weight:900;cursor:pointer;border:1.5px solid rgba(251,191,36,.3);transition:transform .1s}',
      '#hrNewRace:hover{transform:scale(1.02)}',
      /* finish banner */
      '#hrFinishBanner{text-align:center;font-size:13px;color:rgba(255,255,255,.55);margin-bottom:8px;min-height:18px}',
      /* place labels on canvas track */
      '.hr-place-badge{position:absolute;right:10px;top:50%;transform:translateY(-50%);font-size:10px;font-weight:700;color:#fbbf24}',
      /* responsive */
      '@media (max-width:600px){',
      '  #hrBody{flex-direction:column}',
      '  #hrRight{width:100%}',
      '  #hrCanvas{height:auto}',
      '  .hr-horses{grid-template-columns:repeat(3,1fr)}',
      '}',
    ].join('\n');
    document.head.appendChild(s);
  }

  // ── DOM build ──────────────────────────────────────────────────────────────

  function buildDOM() {
    if (document.getElementById('hrOverlay')) {
      cacheRefs();
      return;
    }

    var overlay = el('div', '');
    overlay.id = 'hrOverlay';

    var modal = el('div', '');
    modal.id = 'hrModal';

    // header
    var header = el('div', 'hr-header');
    var titleEl = el('div', 'hr-title', '\uD83C\uDFC7 Virtual Horse Racing');
    var closeBtn = el('button', 'hr-close-btn', '\u2715');
    closeBtn.id = 'hrCloseBtn';
    closeBtn.setAttribute('aria-label', 'Close horse racing');
    header.appendChild(titleEl);
    header.appendChild(closeBtn);
    modal.appendChild(header);

    // message
    var msg = el('div', '');
    msg.id = 'hrMsg';
    modal.appendChild(msg);

    // body (two-column)
    var body = el('div', '');
    body.id = 'hrBody';

    // LEFT — track canvas
    var left = el('div', '');
    left.id = 'hrLeft';

    var trackWrap = el('div', '');
    trackWrap.id = 'hrTrackWrap';
    var canvas = document.createElement('canvas');
    canvas.id = 'hrCanvas';
    canvas.width = 560;
    canvas.height = 260;
    trackWrap.appendChild(canvas);
    left.appendChild(trackWrap);

    var finishBanner = el('div', '');
    finishBanner.id = 'hrFinishBanner';
    left.appendChild(finishBanner);

    // Results panel (under canvas on left)
    var results = el('div', '');
    results.id = 'hrResults';
    var resH3 = el('h3', '', 'Race Results');
    results.appendChild(resH3);
    var resList = el('div', '');
    resList.id = 'hrResultsList';
    results.appendChild(resList);
    var totalRow = el('div', 'hr-total-row');
    var totalLabel = el('span', 'hr-total-label', 'Total P&L');
    var totalVal = el('span', '');
    totalVal.id = 'hrTotalPL';
    totalRow.appendChild(totalLabel);
    totalRow.appendChild(totalVal);
    results.appendChild(totalRow);
    var newRaceBtn = el('button', '');
    newRaceBtn.id = 'hrNewRace';
    newRaceBtn.textContent = '\uD83C\uDFC7 New Race';
    results.appendChild(newRaceBtn);
    left.appendChild(results);

    body.appendChild(left);

    // RIGHT — betting panel
    var right = el('div', '');
    right.id = 'hrRight';

    // Horse selection
    var horseSectionLabel = el('div', 'hr-section-label', 'Select Horse');
    right.appendChild(horseSectionLabel);
    var horsesGrid = el('div', 'hr-horses');
    horsesGrid.id = 'hrHorsesGrid';
    right.appendChild(horsesGrid);

    // Bet type
    var typeSectionLabel = el('div', 'hr-section-label', 'Bet Type');
    right.appendChild(typeSectionLabel);
    var betTypes = el('div', 'hr-bet-types');
    betTypes.id = 'hrBetTypes';
    var betTypeList = [
      { id: 'win',      label: 'Win' },
      { id: 'place',    label: 'Place' },
      { id: 'show',     label: 'Show' },
      { id: 'quinella', label: 'Quinella' },
      { id: 'exacta',   label: 'Exacta' },
    ];
    betTypeList.forEach(function (bt) {
      var btn = el('button', 'hr-type-btn' + (bt.id === 'win' ? ' active' : ''), bt.label);
      btn.setAttribute('data-type', bt.id);
      btn.id = 'hrType_' + bt.id;
      betTypes.appendChild(btn);
    });
    right.appendChild(betTypes);

    // Combo selectors (Exacta / Quinella)
    var comboRow = el('div', '');
    comboRow.id = 'hrComboRow';
    comboRow.style.display = 'none';
    var lbl1 = el('label', '', 'Horse 1');
    var sel1 = document.createElement('select');
    sel1.id = 'hrSel1';
    var lbl2 = el('label', '', 'Horse 2');
    var sel2 = document.createElement('select');
    sel2.id = 'hrSel2';
    comboRow.appendChild(lbl1);
    comboRow.appendChild(sel1);
    comboRow.appendChild(lbl2);
    comboRow.appendChild(sel2);
    right.appendChild(comboRow);

    // Bet amount
    var amountRow = el('div', 'hr-amount-row');
    var amtLabel = el('label', '', 'Bet $');
    var betInput = document.createElement('input');
    betInput.type = 'number';
    betInput.id = 'hrBetInput';
    betInput.min = '0.5';
    betInput.max = '10000';
    betInput.step = '0.5';
    betInput.value = '5';
    amountRow.appendChild(amtLabel);
    amountRow.appendChild(betInput);
    right.appendChild(amountRow);

    // Quick-bet chips
    var chips = el('div', 'hr-chips');
    [1, 5, 25, 100].forEach(function (v) {
      var chip = el('button', 'hr-chip', '$' + v);
      chip.setAttribute('data-chip', String(v));
      chips.appendChild(chip);
    });
    right.appendChild(chips);

    // Add bet button
    var addBetBtn = el('button', '');
    addBetBtn.id = 'hrAddBet';
    addBetBtn.textContent = '+ Add Bet';
    right.appendChild(addBetBtn);

    // Queued bets list
    var betListLabel = el('div', 'hr-section-label', 'Queued Bets (max 5)');
    right.appendChild(betListLabel);
    var betList = el('div', '');
    betList.id = 'hrBetList';
    right.appendChild(betList);

    // Run race button
    var runBtn = el('button', '');
    runBtn.id = 'hrRunBtn';
    runBtn.textContent = '\uD83C\uDFCA Run Race!';
    runBtn.disabled = true;
    right.appendChild(runBtn);

    body.appendChild(right);
    modal.appendChild(body);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    cacheRefs();
    attachEvents();
  }

  function cacheRefs() {
    refs.overlay      = document.getElementById('hrOverlay');
    refs.canvas       = document.getElementById('hrCanvas');
    refs.ctx          = refs.canvas ? refs.canvas.getContext('2d') : null;
    refs.msg          = document.getElementById('hrMsg');
    refs.horsesGrid   = document.getElementById('hrHorsesGrid');
    refs.betTypes     = document.getElementById('hrBetTypes');
    refs.comboRow     = document.getElementById('hrComboRow');
    refs.sel1         = document.getElementById('hrSel1');
    refs.sel2         = document.getElementById('hrSel2');
    refs.betInput     = document.getElementById('hrBetInput');
    refs.addBetBtn    = document.getElementById('hrAddBet');
    refs.betList      = document.getElementById('hrBetList');
    refs.runBtn       = document.getElementById('hrRunBtn');
    refs.results      = document.getElementById('hrResults');
    refs.resultsList  = document.getElementById('hrResultsList');
    refs.totalPL      = document.getElementById('hrTotalPL');
    refs.newRaceBtn   = document.getElementById('hrNewRace');
    refs.finishBanner = document.getElementById('hrFinishBanner');
    refs.closeBtn     = document.getElementById('hrCloseBtn');
  }

  // ── events ─────────────────────────────────────────────────────────────────

  function attachEvents() {
    // close
    refs.closeBtn.addEventListener('click', window.closeHorseRacing);
    refs.overlay.addEventListener('click', function (e) {
      if (e.target === refs.overlay) window.closeHorseRacing();
    });

    // bet type buttons
    refs.betTypes.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-type]');
      if (!btn || state.racing) return;
      selectBetType(btn.getAttribute('data-type'));
    });

    // chip quick-bet
    refs.overlay.addEventListener('click', function (e) {
      var chip = e.target.closest('[data-chip]');
      if (!chip || state.racing) return;
      refs.betInput.value = chip.getAttribute('data-chip');
      state.betAmount = parseFloat(chip.getAttribute('data-chip'));
    });

    // bet amount input
    refs.betInput.addEventListener('input', function () {
      state.betAmount = parseFloat(refs.betInput.value) || 1;
    });

    // add bet
    refs.addBetBtn.addEventListener('click', onAddBet);

    // run race
    refs.runBtn.addEventListener('click', onRunRace);

    // new race
    refs.newRaceBtn.addEventListener('click', onNewRace);

    // combo selectors
    refs.sel1.addEventListener('change', function () {
      state.selectedH1 = parseInt(refs.sel1.value, 10);
    });
    refs.sel2.addEventListener('change', function () {
      state.selectedH2 = parseInt(refs.sel2.value, 10);
    });
  }

  // ── bet type UI ────────────────────────────────────────────────────────────

  function selectBetType(type) {
    state.betType = type;
    var btns = refs.betTypes.querySelectorAll('[data-type]');
    btns.forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-type') === type);
    });
    var isCombo = (type === 'exacta' || type === 'quinella');
    refs.comboRow.style.display = isCombo ? 'flex' : 'none';
    // Hide horse buttons for combo types (selection done via dropdowns)
    refs.horsesGrid.style.display = isCombo ? 'none' : 'grid';
  }

  // ── horse grid ─────────────────────────────────────────────────────────────

  function buildHorseButtons() {
    clearChildren(refs.horsesGrid);
    clearChildren(refs.sel1);
    clearChildren(refs.sel2);

    state.horseNames.forEach(function (name, i) {
      // Horse selection button
      var btn = el('button', 'hr-horse-btn', (i + 1) + '. ' + name);
      btn.style.color = HORSE_COLORS[i];
      btn.style.borderColor = i === state.selectedH1 ? HORSE_COLORS[i] : '';
      if (i === state.selectedH1) btn.classList.add('selected');
      btn.setAttribute('data-hidx', String(i));
      refs.horsesGrid.appendChild(btn);

      // Combo selectors
      var opt1 = document.createElement('option');
      opt1.value = String(i);
      opt1.textContent = (i + 1) + '. ' + name;
      refs.sel1.appendChild(opt1);

      var opt2 = document.createElement('option');
      opt2.value = String(i);
      opt2.textContent = (i + 1) + '. ' + name;
      refs.sel2.appendChild(opt2);
    });

    // default combo selection
    refs.sel1.value = String(state.selectedH1);
    refs.sel2.value = String(state.selectedH2 !== state.selectedH1 ? state.selectedH2 : (state.selectedH1 + 1) % 6);

    // Horse button clicks
    refs.horsesGrid.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-hidx]');
      if (!btn || state.racing) return;
      var idx = parseInt(btn.getAttribute('data-hidx'), 10);
      state.selectedH1 = idx;
      var allBtns = refs.horsesGrid.querySelectorAll('[data-hidx]');
      allBtns.forEach(function (b) {
        var bi = parseInt(b.getAttribute('data-hidx'), 10);
        b.classList.toggle('selected', bi === idx);
        b.style.borderColor = bi === idx ? HORSE_COLORS[bi] : '';
      });
    });
  }

  // ── queued bets ────────────────────────────────────────────────────────────

  function betLabel(bet) {
    var typeMap = { win: 'WIN', place: 'PLACE', show: 'SHOW', quinella: 'QNL', exacta: 'EXA' };
    var typeStr = typeMap[bet.type] || bet.type.toUpperCase();
    if (bet.type === 'quinella' || bet.type === 'exacta') {
      return fmtMoney(bet.amount) + ' ' + typeStr + ' #' + (bet.h1 + 1) + '/' + '#' + (bet.h2 + 1);
    }
    return fmtMoney(bet.amount) + ' ' + typeStr + ' on ' + state.horseNames[bet.h1];
  }

  function renderBetList() {
    clearChildren(refs.betList);
    state.queuedBets.forEach(function (bet, i) {
      var tag = el('span', 'hr-bet-tag', betLabel(bet));
      var removeBtn = el('button', 'hr-remove', '\u2715');
      removeBtn.setAttribute('data-bidx', String(i));
      removeBtn.addEventListener('click', function () {
        state.queuedBets.splice(i, 1);
        renderBetList();
        updateRunBtn();
      });
      tag.appendChild(removeBtn);
      refs.betList.appendChild(tag);
    });
    updateRunBtn();
  }

  function updateRunBtn() {
    refs.runBtn.disabled = state.queuedBets.length === 0 || state.racing;
    refs.addBetBtn.disabled = state.queuedBets.length >= 5 || state.racing;
  }

  function onAddBet() {
    if (state.queuedBets.length >= 5) return;
    var amount = parseFloat(refs.betInput.value);
    if (!amount || amount < 0.5) { showMsg('Enter a bet amount (min $0.50)', true); return; }

    var isCombo = (state.betType === 'exacta' || state.betType === 'quinella');
    var h1 = isCombo ? parseInt(refs.sel1.value, 10) : state.selectedH1;
    var h2 = isCombo ? parseInt(refs.sel2.value, 10) : -1;

    if (isCombo && h1 === h2) { showMsg('Pick two different horses for ' + state.betType, true); return; }

    state.queuedBets.push({ type: state.betType, h1: h1, h2: h2, amount: amount });
    showMsg('', false);
    renderBetList();
  }

  // ── race API ───────────────────────────────────────────────────────────────

  function onRunRace() {
    if (state.racing || state.queuedBets.length === 0) return;
    state.racing = true;
    showMsg('', false);
    setControlsDisabled(true);

    var payload = {
      bets: state.queuedBets.map(function (b) {
        return { type: b.type, horse1: b.h1, horse2: b.h2, amount: b.amount };
      })
    };

    apiFetch('/api/horseracing/race', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
    .then(function (res) {
      if (!res.ok) return res.json().then(function (d) { throw new Error(d.error || 'Server error'); });
      return res.json();
    })
    .then(function (data) {
      if (data.newBalance != null) syncBalance(data.newBalance);
      state.raceHorses  = data.horses  || generateFallbackHorses();
      state.raceResults = data.results || [];
      startRaceAnimation();
    })
    .catch(function (err) {
      state.racing = false;
      setControlsDisabled(false);
      showMsg(err.message || 'Race failed — try again', true);
    });
  }

  // If server doesn't return horse data, generate locally for animation
  function generateFallbackHorses() {
    return state.horseNames.map(function (name, i) {
      var splits = [];
      var t = 0;
      for (var s = 0; s < 10; s++) {
        t += 0.08 + Math.random() * 0.06;
        splits.push(Math.min(t, 1));
      }
      return { name: name, splits: splits, finishTime: t, place: i + 1 };
    });
  }

  // ── race animation ─────────────────────────────────────────────────────────

  var TRACK_MARGIN_LEFT  = 90;
  var TRACK_MARGIN_RIGHT = 30;
  var LANE_H             = 36;
  var LANE_TOP           = 22;
  var HORSE_R            = 10;

  function horseXAtProgress(p) {
    var cw = refs.canvas.width;
    var trackW = cw - TRACK_MARGIN_LEFT - TRACK_MARGIN_RIGHT;
    return TRACK_MARGIN_LEFT + p * trackW;
  }

  function laneY(i) {
    return LANE_TOP + i * LANE_H + LANE_H / 2;
  }

  function drawTrack(ctx, cw, ch) {
    // felt background
    ctx.fillStyle = '#051a0a';
    ctx.fillRect(0, 0, cw, ch);

    // lane dividers
    for (var i = 0; i <= 6; i++) {
      var y = LANE_TOP + i * LANE_H;
      ctx.strokeStyle = i === 0 || i === 6 ? 'rgba(251,191,36,.5)' : 'rgba(255,255,255,.06)';
      ctx.lineWidth = i === 0 || i === 6 ? 1.5 : 1;
      ctx.beginPath();
      ctx.moveTo(TRACK_MARGIN_LEFT - 4, y);
      ctx.lineTo(cw - TRACK_MARGIN_RIGHT, y);
      ctx.stroke();
    }

    // Finish line
    var fx = cw - TRACK_MARGIN_RIGHT;
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(fx, LANE_TOP);
    ctx.lineTo(fx, LANE_TOP + 6 * LANE_H);
    ctx.stroke();
    ctx.setLineDash([]);

    // "FINISH" label
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('FINISH', fx, LANE_TOP - 6);
  }

  function drawHorses(ctx, cw, progressArr, done) {
    state.horseNames.forEach(function (name, i) {
      var p = Math.min(progressArr[i] || 0, 1);
      var x = horseXAtProgress(p);
      var y = laneY(i);
      var color = HORSE_COLORS[i];

      // Horse body circle
      ctx.beginPath();
      ctx.arc(x, y, HORSE_R, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();

      if (done && p >= 1) {
        // winner glow
        ctx.beginPath();
        ctx.arc(x, y, HORSE_R + 4, 0, Math.PI * 2);
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.5;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      // emoji
      ctx.font = '14px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('\uD83D\uDC0E', x, y);

      // name label on left
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = color;
      ctx.fillText((i + 1) + ' ' + name, TRACK_MARGIN_LEFT - 8, y);
    });
    ctx.textBaseline = 'alphabetic';
  }

  function splitsProgressAt(horse, t) {
    // t = 0..1 through the race, splits[9] = 1.0 at finish
    var segIdx = Math.floor(t * 10);
    if (segIdx >= 9) return 1;
    var segT    = (t * 10) - segIdx;
    var from    = segIdx === 0 ? 0 : horse.splits[segIdx - 1];
    var to      = horse.splits[segIdx];
    return from + (to - from) * segT;
  }

  function startRaceAnimation() {
    var ctx = refs.ctx;
    if (!ctx) { finishRace(); return; }

    // normalise splits so last split == 1
    state.raceHorses.forEach(function (horse) {
      if (!horse.splits || horse.splits.length === 0) {
        horse.splits = [0.1,0.2,0.3,0.4,0.5,0.6,0.7,0.8,0.9,1.0];
      }
      var last = horse.splits[horse.splits.length - 1];
      if (last > 0 && last !== 1) {
        horse.splits = horse.splits.map(function (v) { return v / last; });
      }
    });

    refs.finishBanner.textContent = 'And they\'re off!';
    state.animStart = null;

    function frame(ts) {
      if (!state.open) return;
      if (!state.animStart) state.animStart = ts;
      var elapsed = ts - state.animStart;
      var t = Math.min(elapsed / state.ANIM_MS, 1);

      var cw = refs.canvas.width;
      var ch = refs.canvas.height;
      ctx.clearRect(0, 0, cw, ch);
      drawTrack(ctx, cw, ch);

      var progressArr = state.raceHorses.map(function (horse) {
        return splitsProgressAt(horse, t);
      });

      drawHorses(ctx, cw, progressArr, t >= 1);

      if (t < 1) {
        state.animFrame = requestAnimationFrame(frame);
      } else {
        // Final frame — all at finish
        ctx.clearRect(0, 0, cw, ch);
        drawTrack(ctx, cw, ch);
        drawHorses(ctx, cw, state.raceHorses.map(function () { return 1; }), true);
        finishRace();
      }
    }

    state.animFrame = requestAnimationFrame(frame);
  }

  function finishRace() {
    // Show winner
    var sorted = state.raceHorses.slice().sort(function (a, b) {
      return (a.place || a.finishTime || 0) - (b.place || b.finishTime || 0);
    });
    var winnerName = sorted[0] ? sorted[0].name : '?';
    refs.finishBanner.textContent = '\uD83C\uDFC6 Winner: ' + winnerName + '!';

    // Confetti burst
    burstConfetti();

    // Show results
    showResults();
  }

  // ── confetti ───────────────────────────────────────────────────────────────

  function burstConfetti() {
    var ctx = refs.ctx;
    if (!ctx) return;
    var cw = refs.canvas.width;
    var ch = refs.canvas.height;
    var fx = cw - TRACK_MARGIN_RIGHT;

    // Build particles
    var particles = [];
    for (var i = 0; i < 40; i++) {
      particles.push({
        x:  fx + (Math.random() - 0.5) * 20,
        y:  ch / 2 + (Math.random() - 0.5) * ch * 0.8,
        vx: (Math.random() - 0.3) * 3,
        vy: (Math.random() - 0.5) * 4,
        r:  2 + Math.random() * 3,
        alpha: 1,
        color: ['#fbbf24', '#fff', '#fde68a', '#f97316', '#facc15'][Math.floor(Math.random() * 5)],
      });
    }

    var startTs = null;
    var CONFETTI_MS = 1000;

    function confettiFrame(ts) {
      if (!state.open) return;
      if (!startTs) startTs = ts;
      var prog = Math.min((ts - startTs) / CONFETTI_MS, 1);

      // Re-draw track so confetti overlays it
      ctx.clearRect(0, 0, cw, ch);
      drawTrack(ctx, cw, ch);
      drawHorses(ctx, cw, state.raceHorses.map(function () { return 1; }), true);

      particles.forEach(function (p) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.1;
        p.alpha = Math.max(0, 1 - prog * 1.5);
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
      });
      ctx.globalAlpha = 1;

      if (prog < 1) requestAnimationFrame(confettiFrame);
    }

    requestAnimationFrame(confettiFrame);
  }

  // ── results panel ──────────────────────────────────────────────────────────

  function showResults() {
    clearChildren(refs.resultsList);
    var totalPL = 0;

    if (state.raceResults.length === 0) {
      // If server didn't return result rows, show generic message
      var noRes = el('div', 'hr-result-row');
      noRes.textContent = 'Race complete — see server results';
      refs.resultsList.appendChild(noRes);
    } else {
      state.raceResults.forEach(function (res, i) {
        var bet = state.queuedBets[i];
        var row = el('div', 'hr-result-row');
        var labelEl = el('span', 'hr-result-label', bet ? betLabel(bet) : ('Bet ' + (i + 1)));
        var pl = (res.payout || 0) - (bet ? bet.amount : 0);
        totalPL += pl;
        var payoutEl = el('span', 'hr-result-payout ' + (pl >= 0 ? 'won' : 'lost'));
        if (res.won) {
          payoutEl.textContent = '+' + fmtMoney(res.payout) + ' \u2713';
        } else {
          payoutEl.textContent = '-' + fmtMoney(bet ? bet.amount : 0) + ' \u2717';
        }
        row.appendChild(labelEl);
        row.appendChild(payoutEl);
        refs.resultsList.appendChild(row);
      });
    }

    var plStr = (totalPL >= 0 ? '+' : '') + fmtMoney(Math.abs(totalPL));
    refs.totalPL.textContent = plStr;
    refs.totalPL.className = 'hr-total-val ' + (totalPL >= 0 ? 'pos' : 'neg');

    refs.results.style.display = 'block';
    state.raceDone = true;
    state.racing   = false;
  }

  // ── new race reset ─────────────────────────────────────────────────────────

  function onNewRace() {
    state.queuedBets  = [];
    state.raceHorses  = [];
    state.raceResults = [];
    state.raceDone    = false;
    state.racing      = false;

    if (state.animFrame) {
      cancelAnimationFrame(state.animFrame);
      state.animFrame = null;
    }

    refs.results.style.display = 'none';
    refs.finishBanner.textContent = '';
    showMsg('', false);
    renderBetList();
    setControlsDisabled(false);
    drawIdleTrack();
  }

  // ── idle track draw ────────────────────────────────────────────────────────

  function drawIdleTrack() {
    var ctx = refs.ctx;
    if (!ctx) return;
    var cw = refs.canvas.width;
    var ch = refs.canvas.height;
    ctx.clearRect(0, 0, cw, ch);
    drawTrack(ctx, cw, ch);

    // draw horses at start
    var startProg = state.horseNames.map(function () { return 0; });
    drawHorses(ctx, cw, startProg, false);
  }

  // ── enable/disable controls ────────────────────────────────────────────────

  function setControlsDisabled(disabled) {
    [refs.addBetBtn, refs.runBtn].forEach(function (el) {
      if (el) el.disabled = disabled || (el === refs.runBtn ? state.queuedBets.length === 0 : state.queuedBets.length >= 5);
    });
    var chips = refs.overlay.querySelectorAll('.hr-chip');
    chips.forEach(function (c) { c.disabled = disabled; });
    var typeBtns = refs.betTypes.querySelectorAll('[data-type]');
    typeBtns.forEach(function (b) { b.disabled = disabled; });
    var horseBtns = refs.horsesGrid.querySelectorAll('[data-hidx]');
    horseBtns.forEach(function (b) { b.disabled = disabled; });
    if (refs.betInput) refs.betInput.disabled = disabled;
    if (refs.sel1)     refs.sel1.disabled     = disabled;
    if (refs.sel2)     refs.sel2.disabled     = disabled;
  }

  // ── info fetch ─────────────────────────────────────────────────────────────

  function fetchInfo() {
    apiFetch('/api/horseracing/info')
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (data) {
        if (!data) return;
        if (Array.isArray(data.horses) && data.horses.length === 6) {
          state.horseNames = data.horses.map(function (h) {
            return typeof h === 'string' ? h : (h.name || h);
          });
          buildHorseButtons();
          drawIdleTrack();
        }
      })
      .catch(function () { /* use defaults */ });
  }

  // ── open / close ───────────────────────────────────────────────────────────

  window.openHorseRacing = function () {
    if (state.open) return;
    injectStyles();
    buildDOM();

    state.open = true;
    state.racing = false;
    state.raceDone = false;
    state.queuedBets = [];
    state.raceHorses = [];
    state.raceResults = [];

    refs.overlay.classList.add('active');
    document.body.style.overflow = 'hidden';

    buildHorseButtons();
    selectBetType('win');
    renderBetList();
    showMsg('', false);
    refs.results.style.display = 'none';
    refs.finishBanner.textContent = '';

    // Draw idle track after layout settles
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        drawIdleTrack();
        fetchInfo();
      });
    });
  };

  window.closeHorseRacing = function () {
    if (!state.open) return;
    state.open = false;

    if (state.animFrame) {
      cancelAnimationFrame(state.animFrame);
      state.animFrame = null;
    }

    if (refs.overlay) refs.overlay.classList.remove('active');
    document.body.style.overflow = '';
    showMsg('', false);
  };

})();
