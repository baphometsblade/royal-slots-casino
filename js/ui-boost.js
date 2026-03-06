(function () {
  'use strict';

  var TOKEN_KEY  = typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken';
  var _overlay   = null;
  var _stylesDone = false;

  var BOOST_ICONS = {
    xp_surge:     '\uD83E\uDD16',
    bp_rush:      '\uD83D\uDE80',
    lucky_streak: '\uD83C\uDF40',
    gem_miner:    '\uD83D\uDC8E',
    mega_boost:   '\u26A1'
  };

  // ── Styles ────────────────────────────────────────────────────────────────

  function injectStyles() {
    if (_stylesDone) return;
    _stylesDone = true;
    var s = document.createElement('style');
    s.textContent = [
      '#boostOverlay{position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:19500;',
      'display:none;align-items:center;justify-content:center}',
      '#boostOverlay.active{display:flex}',
      '#boostModal{background:linear-gradient(160deg,#0d0d1a,#1a1035);',
      'border:2px solid rgba(139,92,246,.35);border-radius:18px;padding:24px;',
      'width:min(420px,94vw);max-height:88vh;overflow-y:auto}',
      '#boostModal h2{color:#c084fc;font-size:20px;margin:0 0 4px;text-align:center}',
      '.boost-sub{color:rgba(255,255,255,.4);font-size:12px;text-align:center;margin-bottom:18px}',
      '.boost-active-bar{background:rgba(139,92,246,.12);border:1px solid rgba(139,92,246,.25);',
      'border-radius:10px;padding:10px 14px;margin-bottom:14px;display:none}',
      '.boost-active-bar.has-boosts{display:block}',
      '.boost-active-title{color:rgba(255,255,255,.5);font-size:11px;margin-bottom:8px;',
      'text-transform:uppercase;letter-spacing:.5px}',
      '.boost-active-list{display:flex;flex-direction:column;gap:6px}',
      '.boost-active-row{display:flex;align-items:center;justify-content:space-between;',
      'font-size:12px;color:rgba(255,255,255,.8)}',
      '.boost-active-cd{color:#c084fc;font-size:11px;font-variant-numeric:tabular-nums}',
      '.boost-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}',
      '.boost-card{background:rgba(255,255,255,.04);border:1px solid rgba(139,92,246,.2);',
      'border-radius:12px;padding:14px;cursor:pointer;transition:border-color .2s,background .2s;',
      'display:flex;flex-direction:column;gap:6px}',
      '.boost-card:hover{background:rgba(139,92,246,.1);border-color:rgba(139,92,246,.5)}',
      '.boost-card.active-boost{border-color:#10b981;background:rgba(16,185,129,.08)}',
      '.boost-card.active-boost:hover{background:rgba(16,185,129,.12)}',
      '.bc-icon{font-size:26px;line-height:1}',
      '.bc-name{font-weight:800;font-size:13px;color:#e2e8f0}',
      '.bc-desc{font-size:11px;color:rgba(255,255,255,.45);line-height:1.3}',
      '.bc-cost{display:flex;align-items:center;gap:4px;font-size:12px;font-weight:700;',
      'color:#fbbf24;margin-top:2px}',
      '.bc-dur{font-size:10px;color:rgba(255,255,255,.35)}',
      '.bc-active-badge{font-size:10px;font-weight:700;color:#10b981;',
      'background:rgba(16,185,129,.15);border-radius:6px;padding:2px 6px;margin-top:2px;',
      'display:inline-block}',
      '#boostGemBal{color:rgba(255,255,255,.45);font-size:12px;text-align:center;margin-top:14px}',
      '#boostGemBal span{color:#fbbf24;font-weight:700}',
      '#boostClose{display:block;margin:14px auto 0;background:none;border:none;',
      'color:rgba(255,255,255,.3);font-size:13px;cursor:pointer;text-decoration:underline}'
    ].join('');
    document.head.appendChild(s);
  }

  // ── Build overlay ─────────────────────────────────────────────────────────

  function buildOverlay() {
    if (_overlay) return;
    injectStyles();

    _overlay = document.createElement('div');
    _overlay.id = 'boostOverlay';

    var modal = document.createElement('div');
    modal.id = 'boostModal';

    var h2 = document.createElement('h2');
    h2.textContent = '\u26A1 BOOSTS';
    modal.appendChild(h2);

    var sub = document.createElement('div');
    sub.className = 'boost-sub';
    sub.textContent = 'Spend gems for timed power-ups';
    modal.appendChild(sub);

    // Active boosts section
    var activeBar = document.createElement('div');
    activeBar.className = 'boost-active-bar';
    activeBar.id = 'boostActiveBar';

    var activeTitle = document.createElement('div');
    activeTitle.className = 'boost-active-title';
    activeTitle.textContent = 'Active Boosts';
    activeBar.appendChild(activeTitle);

    var activeList = document.createElement('div');
    activeList.className = 'boost-active-list';
    activeList.id = 'boostActiveList';
    activeBar.appendChild(activeList);
    modal.appendChild(activeBar);

    // Grid of purchasable boosts
    var grid = document.createElement('div');
    grid.className = 'boost-grid';
    grid.id = 'boostGrid';
    modal.appendChild(grid);

    // Gem balance
    var gemBal = document.createElement('div');
    gemBal.id = 'boostGemBal';
    gemBal.textContent = 'Loading gem balance...';
    modal.appendChild(gemBal);

    var closeBtn = document.createElement('button');
    closeBtn.id = 'boostClose';
    closeBtn.textContent = 'Close';
    closeBtn.addEventListener('click', closeBoostModal);
    modal.appendChild(closeBtn);

    _overlay.appendChild(modal);
    _overlay.addEventListener('click', function (e) {
      if (e.target === _overlay) closeBoostModal();
    });
    document.body.appendChild(_overlay);
  }

  // ── Countdown formatter ───────────────────────────────────────────────────

  function fmtCountdown(expiresAt) {
    var diff = Math.max(0, Math.floor((new Date(expiresAt) - Date.now()) / 1000));
    var m = Math.floor(diff / 60);
    var s = diff % 60;
    return String(m) + ':' + String(s).padStart(2, '0') + ' left';
  }

  // ── Render ────────────────────────────────────────────────────────────────

  function renderBoosts(defs, active, gemBalance) {
    // Active boosts bar
    var activeBar  = document.getElementById('boostActiveBar');
    var activeList = document.getElementById('boostActiveList');
    if (activeBar && activeList) {
      while (activeList.firstChild) activeList.removeChild(activeList.firstChild);
      if (active && active.length > 0) {
        activeBar.classList.add('has-boosts');
        active.forEach(function (ab) {
          var row = document.createElement('div');
          row.className = 'boost-active-row';
          var icon = BOOST_ICONS[ab.boost_type] || '\u26A1';
          var name = document.createElement('span');
          name.textContent = icon + ' ' + (ab.name || ab.boost_type);
          var cd = document.createElement('span');
          cd.className = 'boost-active-cd';
          cd.textContent = fmtCountdown(ab.expires_at);
          row.appendChild(name);
          row.appendChild(cd);
          activeList.appendChild(row);
        });
      } else {
        activeBar.classList.remove('has-boosts');
      }
    }

    // Gem balance display
    var gemEl = document.getElementById('boostGemBal');
    if (gemEl) {
      var g = document.createElement('span');
      g.textContent = typeof gemBalance === 'number' ? String(gemBalance) : '—';
      gemEl.textContent = 'Your gems: ';
      gemEl.appendChild(g);
    }

    // Boost cards
    var grid = document.getElementById('boostGrid');
    if (!grid) return;
    while (grid.firstChild) grid.removeChild(grid.firstChild);

    var activeTypes = new Set((active || []).map(function (ab) { return ab.boost_type; }));

    defs.forEach(function (def) {
      var isActive = activeTypes.has(def.type);

      var card = document.createElement('div');
      card.className = 'boost-card' + (isActive ? ' active-boost' : '');

      var icon = document.createElement('div');
      icon.className = 'bc-icon';
      icon.textContent = BOOST_ICONS[def.type] || '\u26A1';
      card.appendChild(icon);

      var name = document.createElement('div');
      name.className = 'bc-name';
      name.textContent = def.name;
      card.appendChild(name);

      var desc = document.createElement('div');
      desc.className = 'bc-desc';
      desc.textContent = def.desc;
      card.appendChild(desc);

      if (isActive) {
        var badge = document.createElement('div');
        badge.className = 'bc-active-badge';
        badge.textContent = '\u2705 Active';
        card.appendChild(badge);
      } else {
        var cost = document.createElement('div');
        cost.className = 'bc-cost';
        cost.textContent = '\uD83D\uDC8E ' + def.gemCost + ' gems';
        card.appendChild(cost);

        var dur = document.createElement('div');
        dur.className = 'bc-dur';
        dur.textContent = def.duration + ' minutes';
        card.appendChild(dur);

        card.addEventListener('click', (function (boostType, boostName, gemCost) {
          return function () { purchaseBoost(boostType, boostName, gemCost); };
        })(def.type, def.name, def.gemCost));
      }

      grid.appendChild(card);
    });
  }

  // ── Fetch data ────────────────────────────────────────────────────────────

  function fetchAndRender() {
    var token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;

    var headers = { 'Authorization': 'Bearer ' + token };

    Promise.all([
      fetch('/api/boosts/available').then(function (r) { return r.ok ? r.json() : { boosts: [] }; }),
      fetch('/api/boosts', { headers: headers }).then(function (r) { return r.ok ? r.json() : { boosts: [] }; }),
      fetch('/api/gems/balance', { headers: headers }).then(function (r) { return r.ok ? r.json() : {}; })
    ]).then(function (results) {
      renderBoosts(results[0].boosts || [], results[1].boosts || [], results[2].gems || results[2].balance || 0);
    }).catch(function () {});
  }

  // ── Purchase ──────────────────────────────────────────────────────────────

  function purchaseBoost(boostType, boostName, gemCost) {
    var token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;

    fetch('/api/boosts/purchase', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ boostType: boostType })
    })
    .then(function (r) { return r.json(); })
    .then(function (data) {
      if (data.error) {
        alert(data.error);
      } else {
        fetchAndRender(); // refresh after purchase
      }
    })
    .catch(function () {});
  }

  // ── Open / Close ──────────────────────────────────────────────────────────

  function openBoostModal() {
    buildOverlay();
    _overlay.classList.add('active');
    fetchAndRender();
  }

  function closeBoostModal() {
    if (_overlay) _overlay.classList.remove('active');
  }

  window.openBoostModal  = openBoostModal;
  window.closeBoostModal = closeBoostModal;

}());
