(function() {
  'use strict';

  var TOKEN_KEY = typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken';
  var _overlay = null;
  var _stylesInjected = false;
  var _badge = null;
  var _missions = [];

  function getToken() {
    try { return localStorage.getItem(TOKEN_KEY); } catch(e) { return null; }
  }

  function injectStyles() {
    if (_stylesInjected) return;
    _stylesInjected = true;
    var s = document.createElement('style');
    s.textContent = [
      '#dmOverlay{position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:10400;display:none;align-items:center;justify-content:center}',
      '#dmOverlay.active{display:flex}',
      '#dmModal{background:linear-gradient(135deg,#0d1117,#1a2236);border:2px solid rgba(56,189,248,.35);border-radius:18px;padding:26px 28px;max-width:400px;width:92%;text-align:center}',
      '#dmModal h2{color:#38bdf8;font-size:20px;margin:0 0 4px}',
      '#dmModal .dm-date{color:rgba(255,255,255,.35);font-size:12px;margin-bottom:18px}',
      '.dm-mission{background:rgba(56,189,248,.06);border:1px solid rgba(56,189,248,.2);border-radius:10px;padding:12px 14px;margin-bottom:10px;text-align:left}',
      '.dm-mission.dm-done{border-color:rgba(74,222,128,.4);background:rgba(74,222,128,.06)}',
      '.dm-mission.dm-claimed{opacity:.5}',
      '.dm-mission .dm-label{font-size:13px;font-weight:700;color:#e2e8f0;margin-bottom:6px}',
      '.dm-mission .dm-progress-bar{height:6px;background:rgba(255,255,255,.1);border-radius:3px;overflow:hidden;margin-bottom:6px}',
      '.dm-mission .dm-progress-fill{height:100%;background:linear-gradient(90deg,#38bdf8,#818cf8);border-radius:3px;transition:width .4s ease}',
      '.dm-mission .dm-progress-fill.dm-fill-done{background:linear-gradient(90deg,#4ade80,#22c55e)}',
      '.dm-mission .dm-bottom{display:flex;align-items:center;justify-content:space-between}',
      '.dm-mission .dm-prog-text{font-size:11px;color:rgba(255,255,255,.4)}',
      '.dm-mission .dm-reward{font-size:11px;color:#818cf8;font-weight:700}',
      '.dm-mission .dm-reward.dm-reward-cash{color:#fbbf24}',
      '.dm-claim-btn{background:linear-gradient(135deg,#0284c7,#0369a1);color:#fff;border:none;padding:5px 12px;border-radius:7px;font-size:12px;font-weight:800;cursor:pointer}',
      '.dm-claim-btn:disabled{opacity:.4;cursor:not-allowed}',
      '#dmClose{background:none;border:none;color:rgba(255,255,255,.3);font-size:12px;cursor:pointer;text-decoration:underline;margin-top:6px}',
      '#dmBadge{position:fixed;top:155px;right:12px;z-index:10400;background:linear-gradient(135deg,#0284c7,#0369a1);color:#fff;font-size:11px;font-weight:800;padding:5px 9px;border-radius:7px;cursor:pointer;box-shadow:0 2px 8px rgba(2,132,199,.5);display:none}'
    ].join('\n');
    document.head.appendChild(s);
  }

  function buildBadge(ready) {
    if (_badge) {
      _badge.textContent = ready ? '\uD83C\uDFAF ' + ready + ' ready' : '\uD83C\uDFAF Missions';
      _badge.style.display = 'block';
      return;
    }
    _badge = document.createElement('div');
    _badge.id = 'dmBadge';
    _badge.textContent = ready ? '\uD83C\uDFAF ' + ready + ' ready' : '\uD83C\uDFAF Missions';
    _badge.addEventListener('click', openDailyMissions);
    document.body.appendChild(_badge);
  }

  function makeMissionRow(m, index) {
    var row = document.createElement('div');
    row.className = 'dm-mission' + (m.completed ? ' dm-done' : '') + (m.claimed ? ' dm-claimed' : '');
    row.id = 'dmMission' + index;

    var label = document.createElement('div');
    label.className = 'dm-label';
    label.textContent = m.label;
    row.appendChild(label);

    var barWrap = document.createElement('div');
    barWrap.className = 'dm-progress-bar';
    var fill = document.createElement('div');
    fill.className = 'dm-progress-fill' + (m.completed ? ' dm-fill-done' : '');
    var pct = Math.min(100, Math.round((m.progress / m.target) * 100));
    fill.style.width = pct + '%';
    barWrap.appendChild(fill);
    row.appendChild(barWrap);

    var bottom = document.createElement('div');
    bottom.className = 'dm-bottom';

    var progText = document.createElement('div');
    progText.className = 'dm-prog-text';
    progText.textContent = Math.min(m.progress, m.target) + ' / ' + m.target;
    bottom.appendChild(progText);

    var right = document.createElement('div');
    right.style.cssText = 'display:flex;align-items:center;gap:8px';

    var rewardEl = document.createElement('div');
    rewardEl.className = 'dm-reward' + (m.reward_type === 'cash' ? ' dm-reward-cash' : '');
    rewardEl.textContent = m.reward_type === 'cash'
      ? '+$' + parseFloat(m.reward_amount).toFixed(2)
      : '+' + m.reward_amount + ' pts';
    right.appendChild(rewardEl);

    if (m.completed && !m.claimed) {
      var btn = document.createElement('button');
      btn.className = 'dm-claim-btn';
      btn.textContent = 'CLAIM';
      btn.dataset.slot = m.slot;
      btn.addEventListener('click', function() { doClaim(btn, m.slot, m); });
      right.appendChild(btn);
    } else if (m.claimed) {
      var doneEl = document.createElement('div');
      doneEl.style.cssText = 'font-size:11px;color:#4ade80;font-weight:700';
      doneEl.textContent = '\u2713 Claimed';
      right.appendChild(doneEl);
    }

    bottom.appendChild(right);
    row.appendChild(bottom);
    return row;
  }

  function renderMissions(missions) {
    var container = document.getElementById('dmMissions');
    if (!container) return;
    // Clear existing
    while (container.firstChild) container.removeChild(container.firstChild);
    missions.forEach(function(m, i) {
      container.appendChild(makeMissionRow(m, i));
    });
  }

  function buildModal() {
    if (_overlay) return;
    _overlay = document.createElement('div');
    _overlay.id = 'dmOverlay';

    var modal = document.createElement('div');
    modal.id = 'dmModal';

    var icon = document.createElement('div');
    icon.style.cssText = 'font-size:32px;margin-bottom:6px';
    icon.textContent = '\uD83C\uDFAF';
    modal.appendChild(icon);

    var h2 = document.createElement('h2');
    h2.textContent = 'Daily Missions';
    modal.appendChild(h2);

    var dateEl = document.createElement('div');
    dateEl.className = 'dm-date';
    dateEl.id = 'dmDate';
    dateEl.textContent = 'Today\'s challenges — resets at midnight';
    modal.appendChild(dateEl);

    var missionContainer = document.createElement('div');
    missionContainer.id = 'dmMissions';
    modal.appendChild(missionContainer);

    var close = document.createElement('button');
    close.id = 'dmClose';
    close.textContent = 'Close';
    close.addEventListener('click', closeDailyMissions);
    modal.appendChild(close);

    _overlay.appendChild(modal);
    _overlay.addEventListener('click', function(e) {
      if (e.target === _overlay) closeDailyMissions();
    });
    document.body.appendChild(_overlay);
  }

  function doClaim(btn, slot, mission) {
    var token = getToken();
    if (!token) return;
    if (btn) { btn.disabled = true; btn.textContent = '...'; }

    fetch('/api/dailymissions/claim/' + slot, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }
    })
    .then(function(r) { return r.ok ? r.json() : null; })
    .then(function(data) {
      if (data && data.success) {
        if (typeof window.updateBalance === 'function' && data.newBalance !== null) {
          window.updateBalance(data.newBalance);
        }
        // Refresh missions list
        loadMissions(true);
      } else {
        if (btn) { btn.disabled = false; btn.textContent = 'CLAIM'; }
      }
    })
    .catch(function() {
      if (btn) { btn.disabled = false; btn.textContent = 'CLAIM'; }
    });
  }

  function loadMissions(forceRefresh) {
    var token = getToken();
    if (!token) return;
    fetch('/api/dailymissions', {
      headers: { 'Authorization': 'Bearer ' + token }
    })
    .then(function(r) { return r.ok ? r.json() : null; })
    .then(function(data) {
      if (!data || !data.missions) return;
      _missions = data.missions;
      if (forceRefresh || _overlay) renderMissions(_missions);
      // Update badge
      var claimable = _missions.filter(function(m) { return m.completed && !m.claimed; }).length;
      if (claimable > 0 || _missions.some(function(m) { return m.progress > 0; })) {
        buildBadge(claimable || null);
      }
    })
    .catch(function() {});
  }

  function openDailyMissions() {
    injectStyles();
    buildModal();
    loadMissions(true);
    _overlay.classList.add('active');
  }

  function closeDailyMissions() {
    if (_overlay) _overlay.classList.remove('active');
  }

  // Report spin progress after each spin
  function reportSpinProgress(won, betAmount) {
    var token = getToken();
    if (!token) return;
    fetch('/api/dailymissions/progress', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ spins: 1, wins: won ? 1 : 0, betAmount: betAmount || 0 })
    })
    .then(function(r) { return r.ok ? r.json() : null; })
    .then(function(data) {
      if (!data || !data.missions) return;
      _missions = data.missions;
      if (_overlay && _overlay.classList.contains('active')) renderMissions(_missions);
      var claimable = _missions.filter(function(m) { return m.completed && !m.claimed; }).length;
      if (claimable > 0) buildBadge(claimable);
    })
    .catch(function() {});
  }

  // Hook updateBalance to detect spin completions
  setTimeout(function() {
    var _ub = window.updateBalance;
    if (typeof _ub === 'function') {
      window.updateBalance = function(newBal) {
        _ub.apply(this, arguments);
        // Detect win from message element
        var msgEl = document.getElementById('messageDisplay') || document.getElementById('spinMessage') || document.querySelector('.win-message');
        var won = false;
        var betAmount = typeof bet !== 'undefined' ? bet : 1;
        if (msgEl) {
          var txt = msgEl.textContent || '';
          won = txt.length > 0 && !(/no win|better luck|try again/i.test(txt));
        }
        reportSpinProgress(won, betAmount);
      };
    }
  }, 3000);

  // Load missions on lobby load
  setTimeout(loadMissions, 6000);

  window.openDailyMissions  = openDailyMissions;
  window.closeDailyMissions = closeDailyMissions;
  window.reportMissionSpin  = reportSpinProgress;

}());
