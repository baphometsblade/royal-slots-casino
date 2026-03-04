(function () {
  'use strict';

  var TOKEN_KEY = typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken';
  var _panel = null;
  var _stylesInjected = false;
  var _loaded = false;

  function getToken() {
    try { return localStorage.getItem(TOKEN_KEY); } catch (e) { return null; }
  }

  function injectStyles() {
    if (_stylesInjected) return;
    _stylesInjected = true;
    var s = document.createElement('style');
    s.textContent = [
      '#dsPanel{position:fixed;bottom:70px;right:12px;z-index:15400;width:300px;max-width:92vw;background:#0d0d1a;border:1px solid rgba(99,102,241,.35);border-radius:14px;padding:14px 16px 12px;box-shadow:0 4px 24px rgba(99,102,241,.2);display:none;animation:dsFadeIn .3s ease}',
      '#dsPanel.active{display:block}',
      '@keyframes dsFadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}',
      '.ds-title{font-size:12px;font-weight:800;color:#818cf8;text-transform:uppercase;letter-spacing:.6px;margin-bottom:10px}',
      '.ds-days{display:flex;gap:6px;justify-content:center;margin-bottom:10px}',
      '.ds-day{display:flex;flex-direction:column;align-items:center;gap:3px;flex:1}',
      '.ds-bubble{width:32px;height:32px;border-radius:50%;border:2px solid rgba(129,140,248,.25);background:rgba(255,255,255,.04);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;color:rgba(255,255,255,.25);transition:all .2s}',
      '.ds-bubble.done{background:linear-gradient(135deg,#6366f1,#4f46e5);border-color:#6366f1;color:#fff}',
      '.ds-bubble.today{background:linear-gradient(135deg,#818cf8,#6366f1);border-color:#a5b4fc;color:#fff;box-shadow:0 0 10px rgba(129,140,248,.5);animation:dsPulse 1.5s ease-in-out infinite alternate}',
      '.ds-bubble.mega{background:linear-gradient(135deg,#f59e0b,#d97706);border-color:#fbbf24;color:#fff;box-shadow:0 0 12px rgba(251,191,36,.5)}',
      '@keyframes dsPulse{from{box-shadow:0 0 8px rgba(129,140,248,.4)}to{box-shadow:0 0 16px rgba(129,140,248,.7)}}',
      '.ds-day-num{font-size:9px;font-weight:700;color:rgba(255,255,255,.3);letter-spacing:.3px}',
      '.ds-day-num.active{color:rgba(255,255,255,.6)}',
      '.ds-reward-row{text-align:center;margin-bottom:10px}',
      '.ds-reward-text{font-size:12px;color:rgba(255,255,255,.55);line-height:1.5}',
      '.ds-reward-text strong{color:#a5b4fc;font-weight:800}',
      '.ds-cta{background:linear-gradient(135deg,#6366f1,#4f46e5);color:#fff;border:none;padding:9px;border-radius:9px;font-size:13px;font-weight:800;cursor:pointer;width:100%;margin-bottom:6px}',
      '.ds-cta:hover{opacity:.9}',
      '.ds-cta.done{background:linear-gradient(135deg,#374151,#1f2937);cursor:default;opacity:.7}',
      '.ds-footer{font-size:10px;color:rgba(255,255,255,.25);text-align:center}',
      '.ds-close{position:absolute;top:8px;right:10px;background:none;border:none;color:rgba(255,255,255,.3);font-size:16px;cursor:pointer;line-height:1;padding:2px 6px}'
    ].join('');
    document.head.appendChild(s);
  }

  var REWARDS = {
    1: { gems: 100,  credits: 0    },
    2: { gems: 150,  credits: 0    },
    3: { gems: 300,  credits: 2.00 },
    4: { gems: 300,  credits: 0    },
    5: { gems: 500,  credits: 5.00 },
    6: { gems: 500,  credits: 0    },
    7: { gems: 1000, credits: 10.00 }
  };

  function buildPanel() {
    if (_panel) return;
    injectStyles();

    _panel = document.createElement('div');
    _panel.id = 'dsPanel';

    // Close button
    var closeBtn = document.createElement('button');
    closeBtn.className = 'ds-close';
    closeBtn.textContent = '\u00D7';
    closeBtn.onclick = hidePanel;
    _panel.appendChild(closeBtn);

    // Title
    var title = document.createElement('div');
    title.className = 'ds-title';
    title.textContent = '\uD83D\uDCC5 Daily Deposit Streak';
    _panel.appendChild(title);

    // Day bubbles row
    var daysRow = document.createElement('div');
    daysRow.className = 'ds-days';
    daysRow.id = 'dsDays';
    _panel.appendChild(daysRow);

    // Reward text row
    var rewardRow = document.createElement('div');
    rewardRow.className = 'ds-reward-row';
    rewardRow.id = 'dsRewardRow';
    _panel.appendChild(rewardRow);

    // CTA button
    var cta = document.createElement('button');
    cta.className = 'ds-cta';
    cta.id = 'dsCtaBtn';
    cta.textContent = 'Deposit to Continue Streak';
    cta.onclick = handleCTA;
    _panel.appendChild(cta);

    // Footer
    var footer = document.createElement('div');
    footer.className = 'ds-footer';
    footer.id = 'dsFooter';
    _panel.appendChild(footer);

    document.body.appendChild(_panel);
  }

  function renderDays(streak, nextDay, depositedToday) {
    var daysRow = document.getElementById('dsDays');
    if (!daysRow) return;
    while (daysRow.firstChild) daysRow.removeChild(daysRow.firstChild);

    for (var d = 1; d <= 7; d++) {
      var dayWrap = document.createElement('div');
      dayWrap.className = 'ds-day';

      var bubble = document.createElement('div');
      bubble.className = 'ds-bubble';

      var isDone = (d < nextDay) || (d <= streak && depositedToday);
      var isToday = (d === nextDay && !depositedToday);
      var isMega = (d === 7);

      if (isDone) bubble.classList.add(isMega ? 'mega' : 'done');
      else if (isToday) bubble.classList.add(isMega ? 'mega' : 'today');

      if (isDone) {
        bubble.textContent = '\u2713';
      } else {
        var r = REWARDS[d];
        if (isMega) {
          bubble.textContent = '\uD83C\uDFC6';
        } else if (r && r.credits > 0) {
          bubble.textContent = '\uD83D\uDCB0';
        } else {
          bubble.textContent = '\uD83D\uDC8E';
        }
      }

      var label = document.createElement('div');
      label.className = 'ds-day-num' + (isToday || isDone ? ' active' : '');
      label.textContent = 'D' + d;

      dayWrap.appendChild(bubble);
      dayWrap.appendChild(label);
      daysRow.appendChild(dayWrap);
    }
  }

  function renderReward(nextDay, depositedToday) {
    var rewardRow = document.getElementById('dsRewardRow');
    if (!rewardRow) return;
    while (rewardRow.firstChild) rewardRow.removeChild(rewardRow.firstChild);

    var p = document.createElement('div');
    p.className = 'ds-reward-text';

    if (depositedToday) {
      var todayReward = REWARDS[nextDay - 1] || REWARDS[1];
      var parts = [];
      if (todayReward && todayReward.gems > 0) parts.push('\uD83D\uDC8E ' + todayReward.gems + ' gems');
      if (todayReward && todayReward.credits > 0) parts.push('$' + todayReward.credits.toFixed(2) + ' credits');
      p.textContent = 'Today\'s reward claimed! ';
      var strong = document.createElement('strong');
      strong.textContent = parts.join(' + ');
      p.appendChild(strong);
    } else {
      p.textContent = 'Deposit today to earn ';
      var r = REWARDS[nextDay] || REWARDS[1];
      var strong2 = document.createElement('strong');
      var parts2 = [];
      if (r.gems > 0) parts2.push('\uD83D\uDC8E ' + r.gems + ' gems');
      if (r.credits > 0) parts2.push('$' + r.credits.toFixed(2) + ' credits');
      strong2.textContent = parts2.join(' + ');
      p.appendChild(strong2);
    }
    rewardRow.appendChild(p);
  }

  function renderCTA(depositedToday) {
    var btn = document.getElementById('dsCtaBtn');
    if (!btn) return;
    if (depositedToday) {
      btn.textContent = '\u2713 Streak Secured Today!';
      btn.className = 'ds-cta done';
      btn.onclick = null;
    } else {
      btn.textContent = 'Deposit to Continue Streak';
      btn.className = 'ds-cta';
      btn.onclick = handleCTA;
    }
  }

  function renderFooter(streak, streakMax) {
    var footer = document.getElementById('dsFooter');
    if (!footer) return;
    footer.textContent = 'Current: ' + streak + ' day streak  \u2022  Best: ' + streakMax + ' days';
  }

  function updatePanel(data) {
    var streak = data.streak || 0;
    var nextDay = data.nextDay || 1;
    var depositedToday = !!data.depositedToday;
    var streakMax = data.streakMax || 0;

    renderDays(streak, nextDay, depositedToday);
    renderReward(nextDay, depositedToday);
    renderCTA(depositedToday);
    renderFooter(streak, streakMax);
  }

  function loadStatus() {
    var token = getToken();
    if (!token) return;
    fetch('/api/deposit-streak/status', {
      headers: { 'Authorization': 'Bearer ' + token }
    })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (!data) return;
        buildPanel();
        updatePanel(data);
        // Show panel if streak is active or it's day 1 opportunity
        if (data.streak > 0 || !data.depositedToday) {
          showPanel();
        }
        _loaded = true;
      })
      .catch(function () {});
  }

  function showPanel() {
    if (_panel) _panel.classList.add('active');
  }

  function hidePanel() {
    if (_panel) _panel.classList.remove('active');
  }

  function handleCTA() {
    hidePanel();
    if (typeof openWalletModal === 'function') { openWalletModal(); return; }
    if (typeof openBundleStore === 'function') { openBundleStore(); }
  }

  // Refresh panel after a deposit completes
  function onDepositComplete() {
    if (!_loaded) return;
    var token = getToken();
    if (!token) return;
    fetch('/api/deposit-streak/status', {
      headers: { 'Authorization': 'Bearer ' + token }
    })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (!data) return;
        updatePanel(data);
        showPanel();
      })
      .catch(function () {});
  }

  function init() {
    // Load after a short delay to avoid blocking initial page load
    var token = getToken();
    if (!token) return;
    setTimeout(loadStatus, 8000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.showDepositStreakPanel = showPanel;
  window.hideDepositStreakPanel = hidePanel;
  window.refreshDepositStreak = onDepositComplete;

}());
