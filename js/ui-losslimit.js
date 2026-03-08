(function () {
  'use strict';

  /* Sprint 42 -- Loss Limit Reminder Bar */

  var STORAGE_KEY = 'ms_lossLimitData';
  var DISMISS_DURATION_MS = 30 * 60 * 1000; /* 30 minutes */
  var WARNING_THRESHOLD = 100;
  var CRITICAL_THRESHOLD = 500;

  var _bar = null;
  var _stylesInjected = false;
  var _sessionStart = Date.now();
  var _totalWagered = 0;
  var _totalWon = 0;
  var _dismissedUntil = 0;

  function _shouldBypass() {
    try { return new URLSearchParams(window.location.search).get('noBonus') === '1'; }
    catch (e) { return false; }
  }

  function _loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var d = JSON.parse(raw);
        _totalWagered = typeof d.totalWagered === 'number' ? d.totalWagered : 0;
        _totalWon = typeof d.totalWon === 'number' ? d.totalWon : 0;
        _sessionStart = typeof d.sessionStart === 'number' ? d.sessionStart : Date.now();
        _dismissedUntil = typeof d.dismissedUntil === 'number' ? d.dismissedUntil : 0;
      }
    } catch (e) { /* ignore */ }
  }

  function _saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        totalWagered: _totalWagered,
        totalWon: _totalWon,
        sessionStart: _sessionStart,
        dismissedUntil: _dismissedUntil
      }));
    } catch (e) { /* ignore */ }
  }

  function _injectStyles() {
    if (_stylesInjected) return;
    _stylesInjected = true;
    var s = document.createElement('style');
    s.id = 's42LossLimitStyles';
    s.textContent = [
      '#lossLimitBar{position:fixed;bottom:0;left:0;right:0;z-index:18500;',
      'background:linear-gradient(90deg,#1a1035 0%,#2d1b4e 100%);',
      'border-top:2px solid rgba(255,165,0,.5);padding:10px 18px;',
      'display:none;align-items:center;justify-content:space-between;',
      'font-family:inherit;font-size:13px;color:rgba(255,255,255,.85);',
      'gap:12px;flex-wrap:wrap}',
      '#lossLimitBar.active{display:flex}',
      '#lossLimitBar.s42-critical{border-top-color:#ef4444;',
      'background:linear-gradient(90deg,#2a0a0a 0%,#3b1111 100%)}',
      '#lossLimitBar.s42-critical .ll-icon{color:#ef4444}',
      '.ll-icon{font-size:18px;flex-shrink:0;color:#f59e0b}',
      '.ll-info{flex:1;min-width:180px}',
      '.ll-info-amount{font-weight:700;color:#fbbf24}',
      '#lossLimitBar.s42-critical .ll-info-amount{color:#ef4444}',
      '.ll-info-duration{color:rgba(255,255,255,.5);font-size:11px;margin-top:2px}',
      '.ll-actions{display:flex;gap:8px;flex-shrink:0}',
      '.ll-btn{border:none;border-radius:8px;padding:6px 14px;font-size:12px;',
      'font-weight:600;cursor:pointer;transition:opacity .2s}',
      '.ll-btn:hover{opacity:.85}',
      '.ll-btn-break{background:linear-gradient(135deg,#f59e0b,#d97706);color:#000}',
      '.ll-btn-dismiss{background:rgba(255,255,255,.1);color:rgba(255,255,255,.7)}'
    ].join('\n');
    document.head.appendChild(s);
  }

  function _formatDuration(ms) {
    var totalSec = Math.floor(ms / 1000);
    var h = Math.floor(totalSec / 3600);
    var m = Math.floor((totalSec % 3600) / 60);
    if (h > 0) {
      return h + 'h ' + m + 'm';
    }
    return m + 'm';
  }

  function _buildBar() {
    if (_bar) return;

    _bar = document.createElement('div');
    _bar.id = 'lossLimitBar';

    var icon = document.createElement('span');
    icon.className = 'll-icon';
    icon.textContent = '\u26A0\uFE0F';
    _bar.appendChild(icon);

    var info = document.createElement('div');
    info.className = 'll-info';

    var amountEl = document.createElement('div');
    amountEl.className = 'll-info-amount';
    amountEl.id = 'llAmount';
    amountEl.textContent = 'Session loss: $0.00';
    info.appendChild(amountEl);

    var durationEl = document.createElement('div');
    durationEl.className = 'll-info-duration';
    durationEl.id = 'llDuration';
    durationEl.textContent = 'Playing for 0m';
    info.appendChild(durationEl);

    _bar.appendChild(info);

    var actions = document.createElement('div');
    actions.className = 'll-actions';

    var breakBtn = document.createElement('button');
    breakBtn.className = 'll-btn ll-btn-break';
    breakBtn.textContent = 'Take a Break';
    breakBtn.addEventListener('click', _handleTakeBreak);
    actions.appendChild(breakBtn);

    var dismissBtn = document.createElement('button');
    dismissBtn.className = 'll-btn ll-btn-dismiss';
    dismissBtn.textContent = 'Dismiss';
    dismissBtn.addEventListener('click', _handleDismiss);
    actions.appendChild(dismissBtn);

    _bar.appendChild(actions);
    document.body.appendChild(_bar);
  }

  function _updateDisplay() {
    if (!_bar) return;

    var loss = _totalWagered - _totalWon;
    var now = Date.now();

    /* Check dismissed state */
    if (_dismissedUntil > 0 && now < _dismissedUntil) {
      _bar.classList.remove('active');
      return;
    }

    if (loss < WARNING_THRESHOLD) {
      _bar.classList.remove('active');
      return;
    }

    /* Update amount */
    var amountEl = document.getElementById('llAmount');
    if (amountEl) {
      amountEl.textContent = 'Session loss: $' + loss.toFixed(2);
    }

    /* Update duration */
    var durationEl = document.getElementById('llDuration');
    if (durationEl) {
      var elapsed = now - _sessionStart;
      durationEl.textContent = 'Playing for ' + _formatDuration(elapsed);
    }

    /* Critical class */
    if (loss >= CRITICAL_THRESHOLD) {
      _bar.classList.add('s42-critical');
    } else {
      _bar.classList.remove('s42-critical');
    }

    _bar.classList.add('active');
  }

  function _handleTakeBreak() {
    if (typeof window.stopAutoSpin === 'function') window.stopAutoSpin();
    if (typeof window.autoSpinActive !== 'undefined') window.autoSpinActive = false;
    _handleDismiss();
  }

  function _handleDismiss() {
    _dismissedUntil = Date.now() + DISMISS_DURATION_MS;
    _saveState();
    if (_bar) {
      _bar.classList.remove('active');
    }
  }

  function trackSpin(wagered, won) {
    if (_shouldBypass()) return;

    wagered = typeof wagered === 'number' ? wagered : 0;
    won = typeof won === 'number' ? won : 0;

    _totalWagered += wagered;
    _totalWon += won;
    _saveState();
    _updateDisplay();
  }

  function dismissLossLimit() {
    _handleDismiss();
  }

  function _init() {
    if (_shouldBypass()) return;

    _loadState();

    var now = Date.now();
    if (now - _sessionStart > 2 * 60 * 60 * 1000) {
      _totalWagered = 0;
      _totalWon = 0;
      _sessionStart = now;
      _dismissedUntil = 0;
      _saveState();
    }

    _injectStyles();
    _buildBar();
    _updateDisplay();

    setInterval(function () {
      if (_bar && _bar.classList.contains('active')) {
        _updateDisplay();
      }
    }, 60000);
  }

  window._lossLimitTrackSpin = trackSpin;
  window.dismissLossLimit = dismissLossLimit;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      setTimeout(_init, 2800);
    });
  } else {
    setTimeout(_init, 2800);
  }

})();
