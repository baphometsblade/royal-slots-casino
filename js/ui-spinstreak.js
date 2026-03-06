(function() {
  'use strict';

  var TOKEN_KEY = typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken';
  var _bar = null;
  var _tickTimer = null;
  var _idleTimer = null;
  var _lastSpinning = false;
  var _streakData = null;

  function getToken() {
    try { return localStorage.getItem(TOKEN_KEY); } catch(e) { return null; }
  }

  function buildBar() {
    if (_bar) return;
    _bar = document.createElement('div');
    _bar.id = 'spinStreakBar';
    _bar.style.cssText = 'position:fixed;bottom:18px;right:18px;z-index:15000;background:linear-gradient(135deg,#1a1a2e,#16213e);border:1px solid rgba(255,215,0,.3);border-radius:12px;padding:10px 16px;display:none;align-items:center;gap:10px;box-shadow:0 4px 20px rgba(0,0,0,.5);font-size:13px;color:rgba(255,255,255,.85);transition:transform .3s ease,opacity .3s ease;';

    var icon = document.createElement('span');
    icon.style.cssText = 'font-size:18px;';
    icon.textContent = '\uD83D\uDD25';
    _bar.appendChild(icon);

    var info = document.createElement('div');
    info.id = 'ssInfo';
    info.style.cssText = 'display:flex;flex-direction:column;gap:2px;';

    var top = document.createElement('div');
    top.id = 'ssTop';
    top.style.cssText = 'font-weight:700;color:#ffd700;font-size:14px;';
    info.appendChild(top);

    var bottom = document.createElement('div');
    bottom.id = 'ssBottom';
    bottom.style.cssText = 'font-size:11px;color:rgba(255,255,255,.5);';
    info.appendChild(bottom);

    _bar.appendChild(info);

    var mult = document.createElement('div');
    mult.id = 'ssMult';
    mult.style.cssText = 'background:linear-gradient(135deg,#f59e0b,#d97706);color:#000;font-weight:900;font-size:15px;padding:4px 10px;border-radius:8px;min-width:40px;text-align:center;';
    _bar.appendChild(mult);

    document.body.appendChild(_bar);
  }

  function updateBar(data) {
    _streakData = data;
    if (!_bar) buildBar();

    var slotModal = document.getElementById('slotModal');
    var isSlotOpen = slotModal && slotModal.classList.contains('active');

    if (!isSlotOpen || !data || data.count < 1) {
      _bar.style.display = 'none';
      return;
    }

    _bar.style.display = 'flex';

    var top = document.getElementById('ssTop');
    var bottom = document.getElementById('ssBottom');
    var mult = document.getElementById('ssMult');

    if (top) top.textContent = data.tierLabel + ' \u00B7 ' + data.count + ' spins';
    if (mult) mult.textContent = data.multiplier + 'x';

    if (bottom && data.nextTier) {
      bottom.textContent = data.nextTier.spinsNeeded + ' more for ' + data.nextTier.multiplier + 'x';
    } else if (bottom) {
      bottom.textContent = 'MAX STREAK!';
    }

    // Tier-up animation
    if (data.tieredUp) {
      _bar.style.transform = 'scale(1.15)';
      _bar.style.borderColor = '#ffd700';
      setTimeout(function() {
        _bar.style.transform = 'scale(1)';
        _bar.style.borderColor = 'rgba(255,215,0,.3)';
      }, 600);
    }
  }

  function tickStreak() {
    var token = getToken();
    if (!token) return;

    fetch('/api/spinstreak/tick', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token }
    })
    .then(function(r) { return r.ok ? r.json() : null; })
    .then(function(data) {
      if (data) updateBar(data);
      resetIdleTimer(data);
    })
    .catch(function() {});
  }

  function fetchStatus() {
    var token = getToken();
    if (!token) return;

    fetch('/api/spinstreak/status', {
      headers: { 'Authorization': 'Bearer ' + token }
    })
    .then(function(r) { return r.ok ? r.json() : null; })
    .then(function(data) {
      if (data) updateBar(data);
      if (data && data.count > 0) resetIdleTimer(data);
    })
    .catch(function() {});
  }

  function resetIdleTimer(data) {
    if (_idleTimer) clearTimeout(_idleTimer);
    if (!data || data.count < 1) return;

    var gapMs = data.gapMs || 300000;
    var warnMs = gapMs - 30000; // warn 30s before reset

    if (warnMs > 0) {
      _idleTimer = setTimeout(function() {
        if (_bar) {
          _bar.style.borderColor = '#ef4444';
          var bottom = document.getElementById('ssBottom');
          if (bottom) bottom.textContent = '\u26A0\uFE0F Streak expires in 30s!';
        }
      }, warnMs);
    }
  }

  // Watch for spin completion by polling the global `spinning` variable
  function startWatcher() {
    if (_tickTimer) return;
    _tickTimer = setInterval(function() {
      var isSpinning = (typeof spinning !== 'undefined') ? spinning : false;

      // Detect spin end (was spinning, now not)
      if (_lastSpinning && !isSpinning) {
        tickStreak();
      }
      _lastSpinning = isSpinning;

      // Show/hide bar based on slot modal
      if (_bar) {
        var slotModal = document.getElementById('slotModal');
        var isSlotOpen = slotModal && slotModal.classList.contains('active');
        if (!isSlotOpen && _bar.style.display !== 'none') {
          _bar.style.display = 'none';
        }
      }
    }, 200);
  }

  // Init on load
  function init() {
    buildBar();
    fetchStatus();
    startWatcher();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { setTimeout(init, 2000); });
  } else {
    setTimeout(init, 2000);
  }

}());
