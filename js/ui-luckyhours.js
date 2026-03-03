'use strict';

(function () {

  var bannerEl = null;
  var countdownInterval = null;
  var refreshTimer = null;

  function getToken() {
    var key = typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken';
    return localStorage.getItem(key);
  }

  function fetchLuckyHoursState() {
    return fetch('/api/luckyhours/status').then(function (res) {
      return res.json();
    });
  }

  function injectStyles() {
    if (document.getElementById('luckyHoursStyles')) { return; }
    var style = document.createElement('style');
    style.id = 'luckyHoursStyles';
    style.textContent = [
      '#luckyHoursBanner {',
      '  height: 48px;',
      '  display: flex;',
      '  align-items: center;',
      '  justify-content: center;',
      '  gap: 12px;',
      '  font-size: 13px;',
      '  position: relative;',
      '  overflow: hidden;',
      '  color: #f3f4f6;',
      '  font-weight: 500;',
      '  letter-spacing: 0.02em;',
      '}',
      '.lhb-active {',
      '  background: linear-gradient(90deg, rgba(251,191,36,0.15), rgba(245,158,11,0.08), rgba(251,191,36,0.15));',
      '  border-bottom: 2px solid #f59e0b;',
      '  animation: lhbShimmer 2s linear infinite;',
      '}',
      '@keyframes lhbShimmer {',
      '  0%, 100% { opacity: 1; }',
      '  50% { opacity: .75; }',
      '}',
      '.lhb-inactive {',
      '  background: rgba(255,255,255,0.04);',
      '  border-bottom: 1px solid rgba(255,255,255,0.08);',
      '}',
      '#lhbCountdown {',
      '  font-variant-numeric: tabular-nums;',
      '  font-weight: 700;',
      '  color: #fbbf24;',
      '}'
    ].join('\n');
    document.head.appendChild(style);
  }

  function buildBanner() {
    if (bannerEl) { return; }
    bannerEl = document.createElement('div');
    bannerEl.id = 'luckyHoursBanner';

    // Try to insert after .casino-header inside its parent, or before #gameGrid
    var header = document.querySelector('.casino-header');
    if (header && header.parentNode) {
      header.parentNode.insertBefore(bannerEl, header.nextSibling);
    } else {
      var gameGrid = document.getElementById('gameGrid');
      if (gameGrid && gameGrid.parentNode) {
        gameGrid.parentNode.insertBefore(bannerEl, gameGrid);
      } else {
        document.body.appendChild(bannerEl);
      }
    }
  }

  function startCountdown(targetDate) {
    if (countdownInterval) {
      clearInterval(countdownInterval);
      countdownInterval = null;
    }

    function tick() {
      var el = document.getElementById('lhbCountdown');
      if (!el) { return; }
      var diff = targetDate.getTime() - Date.now();
      if (diff <= 0) {
        clearInterval(countdownInterval);
        countdownInterval = null;
        el.textContent = '00:00:00';
        refresh();
        return;
      }
      var totalSec = Math.floor(diff / 1000);
      var hours = Math.floor(totalSec / 3600);
      var minutes = Math.floor((totalSec % 3600) / 60);
      var seconds = totalSec % 60;
      var hh = hours < 10 ? '0' + hours : '' + hours;
      var mm = minutes < 10 ? '0' + minutes : '' + minutes;
      var ss = seconds < 10 ? '0' + seconds : '' + seconds;
      el.textContent = hh + ':' + mm + ':' + ss;
    }

    tick();
    countdownInterval = setInterval(tick, 1000);
  }

  function updateBanner(data) {
    if (!bannerEl) { return; }

    if (data.active) {
      bannerEl.classList.add('lhb-active');
      bannerEl.classList.remove('lhb-inactive');
      bannerEl.innerHTML = (
        '\uD83C\uDF1F LUCKY HOUR \u2014 2\u00d7 Gems on every spin! &nbsp; ' +
        'Ends in: <span id="lhbCountdown">--:--:--</span>'
      );
      startCountdown(new Date(data.endsAt));
    } else {
      bannerEl.classList.add('lhb-inactive');
      bannerEl.classList.remove('lhb-active');
      bannerEl.innerHTML = (
        '\u23F0 Next Lucky Hour in: <span id="lhbCountdown">--:--:--</span>'
      );
      startCountdown(new Date(data.nextWindowAt));
    }
  }

  function refresh() {
    if (refreshTimer) {
      clearTimeout(refreshTimer);
      refreshTimer = null;
    }
    fetchLuckyHoursState().then(function (data) {
      updateBanner(data);
      refreshTimer = setTimeout(refresh, 60000);
    }).catch(function () {
      refreshTimer = setTimeout(refresh, 60000);
    });
  }

  function init() {
    injectStyles();
    buildBanner();
    refresh();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      setTimeout(init, 4000);
    });
  } else {
    setTimeout(init, 4000);
  }

  window.refreshLuckyHours = refresh;

})();
