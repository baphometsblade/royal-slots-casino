(function() {
  'use strict';

  var _widget = null;
  var _countdownInt = null;
  var _refreshTimer = null;
  var _stylesInjected = false;
  var _currentData = null;

  function getToken() {
    var key = typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken';
    return localStorage.getItem(key) || '';
  }

  function injectStyles() {
    if (_stylesInjected) return;
    _stylesInjected = true;
    var s = document.createElement('style');
    s.id = 'fsStyles';
    s.textContent = [
      '#freeSpinsWidget{padding:10px 16px;background:linear-gradient(90deg,rgba(251,191,36,.1),rgba(245,158,11,.06),rgba(251,191,36,.1));',
      'border-bottom:1px solid rgba(251,191,36,.2);display:flex;align-items:center;gap:10px;font-size:13px}',
      '#freeSpinsWidget.fs-hidden{display:none}',
      '#freeSpinsWidget.fs-urgent{animation:fsPulse 1s ease infinite}',
      '@keyframes fsPulse{0%,100%{border-color:rgba(251,191,36,.2)}50%{border-color:rgba(251,191,36,.6)}}',
      '.fs-label{font-weight:800;color:#fbbf24}',
      '.fs-count{font-size:16px;font-weight:900;color:#fff}',
      '.fs-timer{font-size:12px;color:rgba(255,255,255,.45);flex:1}',
      '.fs-cta{background:linear-gradient(135deg,#f59e0b,#d97706);color:#000;border:none;',
      'padding:7px 14px;border-radius:8px;font-size:12px;font-weight:800;cursor:pointer;white-space:nowrap}',
      '.fs-cta:hover{opacity:.9}',
    ].join('');
    document.head.appendChild(s);
  }

  function buildWidget() {
    if (_widget) return;
    _widget = document.createElement('div');
    _widget.id = 'freeSpinsWidget';
    _widget.innerHTML = [
      '<span class="fs-label">\uD83C\uDFB0 FREE SPINS</span>',
      '<span class="fs-count" id="fsCount">0</span>',
      '<span class="fs-timer" id="fsTimer"></span>',
      '<button class="fs-cta" id="fsUseBtn">USE NOW \u2192</button>',
    ].join('');
    // inject before gameGrid or after milestones widget
    var msW = document.getElementById('msMiniWidget');
    var gameGrid = document.getElementById('gameGrid');
    if (msW && msW.parentNode) {
      msW.parentNode.insertBefore(_widget, msW.nextSibling);
    } else if (gameGrid && gameGrid.parentNode) {
      gameGrid.parentNode.insertBefore(_widget, gameGrid);
    } else {
      document.body.appendChild(_widget);
    }
    document.getElementById('fsUseBtn').onclick = handleUse;
  }

  function handleUse() {
    // Open a game slot — use last played or first available
    var gameId = null;
    try {
      var recent = localStorage.getItem(
        typeof STORAGE_KEY_RECENTLY_PLAYED !== 'undefined' ? STORAGE_KEY_RECENTLY_PLAYED : 'recentlyPlayed'
      );
      if (recent) {
        var arr = JSON.parse(recent);
        if (arr && arr.length) gameId = arr[0];
      }
    } catch(e) {}
    if (!gameId && typeof GAMES !== 'undefined' && GAMES && GAMES.length) gameId = GAMES[0].id;
    if (gameId && typeof openSlot === 'function') openSlot(gameId);
  }

  function startCountdown(expiresAt) {
    if (_countdownInt) clearInterval(_countdownInt);
    var timerEl = document.getElementById('fsTimer');
    _countdownInt = setInterval(function() {
      if (!timerEl) { clearInterval(_countdownInt); return; }
      var diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) {
        clearInterval(_countdownInt);
        hideWidget();
        return;
      }
      // urgent styling when < 1 hour
      if (_widget) {
        if (diff < 3600000) _widget.classList.add('fs-urgent');
        else _widget.classList.remove('fs-urgent');
      }
      var h = Math.floor(diff / 3600000);
      var m = Math.floor((diff % 3600000) / 60000);
      var s = Math.floor((diff % 60000) / 1000);
      timerEl.textContent = 'Expires in ' + h + ':' + (m<10?'0':'') + m + ':' + (s<10?'0':'') + s;
    }, 1000);
  }

  function showWidget(data) {
    buildWidget();
    _currentData = data;
    var countEl = document.getElementById('fsCount');
    if (countEl) countEl.textContent = data.count;
    if (data.expiresAt) startCountdown(data.expiresAt);
    if (_widget) _widget.classList.remove('fs-hidden');
    // hide when slot is open
    var slotModal = document.getElementById('slotModal');
    if (slotModal && slotModal.classList.contains('active')) {
      _widget.classList.add('fs-hidden');
    }
  }

  function hideWidget() {
    if (_widget) _widget.classList.add('fs-hidden');
    if (_countdownInt) clearInterval(_countdownInt);
  }

  function checkStatus() {
    var token = getToken();
    if (!token) return;
    fetch('/api/freespins/status', { headers: { 'Authorization': 'Bearer ' + token } })
      .then(function(r) { return r.json(); })
      .then(function(d) {
        if (d.count > 0 && !d.expired) {
          showWidget(d);
        } else {
          hideWidget();
        }
      })
      .catch(function() {});
  }

  // Hook updateBalance to toggle widget visibility during slot
  function hookUpdateBalance() {
    var _prev = window.updateBalance;
    window.updateBalance = function(n) {
      if (_prev) _prev.apply(this, arguments);
      if (!_widget) return;
      var slotModal = document.getElementById('slotModal');
      if (slotModal && slotModal.classList.contains('active')) {
        _widget.classList.add('fs-hidden');
      } else if (_currentData && _currentData.count > 0) {
        _widget.classList.remove('fs-hidden');
      }
    };
  }

  function init() {
    injectStyles();
    hookUpdateBalance();
    setTimeout(checkStatus, 5000);
    if (_refreshTimer) clearInterval(_refreshTimer);
    _refreshTimer = setInterval(checkStatus, 60000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.checkFreeSpinsStatus = checkStatus;

}());
