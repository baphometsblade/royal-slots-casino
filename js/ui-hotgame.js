(function() {
  'use strict';

  var _banner = null;
  var _stylesInjected = false;
  var _refreshTimer = null;
  var _currentGameId = null;

  function injectStyles() {
    if (_stylesInjected) return;
    _stylesInjected = true;
    var s = document.createElement('style');
    s.textContent = [
      '#hotGameBanner{background:linear-gradient(90deg,#7c2d12,#b45309,#7c2d12);background-size:200% 100%;animation:hotShimmer 3s linear infinite;border-radius:10px;padding:10px 16px;margin:8px 12px;display:none;align-items:center;gap:10px;cursor:pointer;box-shadow:0 2px 12px rgba(251,146,60,.3)}',
      '#hotGameBanner.active{display:flex}',
      '#hotGameBanner .hg-fire{font-size:22px;animation:hotFlame 0.8s ease-in-out infinite alternate}',
      '#hotGameBanner .hg-text{flex:1}',
      '#hotGameBanner .hg-title{font-size:13px;font-weight:800;color:#fbbf24;text-transform:uppercase;letter-spacing:0.5px}',
      '#hotGameBanner .hg-sub{font-size:11px;color:rgba(255,255,255,.7);margin-top:1px}',
      '#hotGameBanner .hg-badge{background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff;font-size:11px;font-weight:900;padding:4px 8px;border-radius:6px;white-space:nowrap}',
      '#hotGameBanner .hg-timer{font-size:10px;color:rgba(255,255,255,.5);margin-left:6px;font-variant-numeric:tabular-nums}',
      '@keyframes hotShimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}',
      '@keyframes hotFlame{from{transform:scale(1) rotate(-5deg)}to{transform:scale(1.15) rotate(5deg)}}'
    ].join('\n');
    document.head.appendChild(s);
  }

  function buildBanner() {
    if (_banner) return;
    injectStyles();

    _banner = document.createElement('div');
    _banner.id = 'hotGameBanner';

    var fire = document.createElement('span');
    fire.className = 'hg-fire';
    fire.textContent = '\uD83D\uDD25';
    _banner.appendChild(fire);

    var text = document.createElement('div');
    text.className = 'hg-text';
    var title = document.createElement('div');
    title.className = 'hg-title';
    title.id = 'hgTitle';
    title.textContent = 'Hot Game of the Hour';
    var sub = document.createElement('div');
    sub.className = 'hg-sub';
    sub.id = 'hgSub';
    sub.textContent = 'Loading...';
    text.appendChild(title);
    text.appendChild(sub);
    _banner.appendChild(text);

    var badge = document.createElement('div');
    badge.className = 'hg-badge';
    badge.textContent = '+20% RTP Boost!';
    _banner.appendChild(badge);

    var timer = document.createElement('span');
    timer.className = 'hg-timer';
    timer.id = 'hgTimer';
    _banner.appendChild(timer);

    _banner.addEventListener('click', function() {
      if (_currentGameId && typeof openSlot === 'function') openSlot(_currentGameId);
    });

    // Insert after filter tabs or at top of game list
    var insertTarget = document.getElementById('filterTabs') || document.getElementById('gameGrid') || document.querySelector('.game-grid');
    if (insertTarget && insertTarget.parentNode) {
      insertTarget.parentNode.insertBefore(_banner, insertTarget);
    } else {
      document.body.appendChild(_banner);
    }
  }

  function startCountdown(expiresAt) {
    if (_refreshTimer) clearInterval(_refreshTimer);
    var timerEl = document.getElementById('hgTimer');
    function tick() {
      var diff = Math.max(0, Math.floor((new Date(expiresAt) - Date.now()) / 1000));
      if (timerEl) timerEl.textContent = 'Resets in ' + Math.floor(diff / 60) + ':' + String(diff % 60).padStart(2, '0');
      if (diff <= 0) { loadHotGame(); }
    }
    tick();
    _refreshTimer = setInterval(tick, 1000);
  }

  function getGameName(gameId) {
    if (typeof games !== 'undefined') {
      var g = games.find(function(x) { return x.id === gameId; });
      if (g) return g.name || gameId;
    }
    return gameId.replace(/_/g, ' ').replace(/\b\w/g, function(c) { return c.toUpperCase(); });
  }

  function loadHotGame() {
    fetch('/api/hotgame/current')
    .then(function(r) { return r.ok ? r.json() : null; })
    .then(function(data) {
      if (!data || !data.gameId) return;
      _currentGameId = data.gameId;

      buildBanner();

      var subEl = document.getElementById('hgSub');
      if (subEl) subEl.textContent = getGameName(data.gameId) + ' \u2014 Click to play!';

      _banner.classList.add('active');
      startCountdown(data.expiresAt);
    })
    .catch(function() {});
  }

  // Init after lobby renders
  if (typeof window.renderGames === 'function') {
    var _prev = window.renderGames;
    window.renderGames = function() {
      _prev.apply(this, arguments);
      setTimeout(loadHotGame, 600);
    };
  } else {
    setTimeout(loadHotGame, 3500);
  }

}());
