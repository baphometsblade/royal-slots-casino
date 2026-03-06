(function() {
  'use strict';

  var TOKEN_KEY = typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken';
  var _bar = null;
  var _stylesInjected = false;
  var _currentStreak = 0;
  var _watchTimer = null;
  var _lastSpinning = false;

  function getToken() {
    try { return localStorage.getItem(TOKEN_KEY); } catch(e) { return null; }
  }

  function injectStyles() {
    if (_stylesInjected) return;
    _stylesInjected = true;
    var s = document.createElement('style');
    s.textContent = [
      '#wsBar{position:fixed;bottom:70px;left:12px;z-index:15500;background:linear-gradient(135deg,#1e1b4b,#312e81);border:1px solid rgba(129,140,248,.4);border-radius:10px;padding:8px 12px;display:none;align-items:center;gap:8px;box-shadow:0 2px 12px rgba(99,102,241,.3);transition:all 0.3s ease}',
      '#wsBar.active{display:flex}',
      '#wsBar.ws-fire{border-color:rgba(251,146,60,.6);background:linear-gradient(135deg,#431407,#7c2d12);box-shadow:0 2px 16px rgba(251,146,60,.4)}',
      '#wsBar.ws-epic{border-color:rgba(251,191,36,.7);background:linear-gradient(135deg,#1c1917,#44403c);box-shadow:0 2px 20px rgba(251,191,36,.5);animation:wsGlow 1.5s ease-in-out infinite alternate}',
      '#wsBar .ws-icon{font-size:20px}',
      '#wsBar .ws-info{display:flex;flex-direction:column;gap:1px}',
      '#wsBar .ws-label{font-size:11px;font-weight:800;color:#a5b4fc;text-transform:uppercase;letter-spacing:0.5px}',
      '#wsBar.ws-fire .ws-label{color:#fb923c}',
      '#wsBar.ws-epic .ws-label{color:#fbbf24}',
      '#wsBar .ws-mult{font-size:16px;font-weight:900;color:#fff}',
      '@keyframes wsGlow{from{box-shadow:0 2px 20px rgba(251,191,36,.5)}to{box-shadow:0 2px 30px rgba(251,191,36,.8)}}'
    ].join('\n');
    document.head.appendChild(s);
  }

  function getStreakStyle(streak) {
    if (streak >= 5) return { cls: 'ws-epic', icon: '\uD83D\uDD25', label: 'UNSTOPPABLE!', mult: '1.5x' };
    if (streak >= 3) return { cls: 'ws-fire', icon: '\uD83D\uDD25', label: 'On Fire!', mult: '1.25x' };
    if (streak >= 2) return { cls: '', icon: '\u2728', label: 'Hot Streak!', mult: '1.1x' };
    return null;
  }

  function buildBar() {
    if (_bar) return;
    injectStyles();
    _bar = document.createElement('div');
    _bar.id = 'wsBar';

    var icon = document.createElement('span');
    icon.className = 'ws-icon';
    icon.id = 'wsIcon';
    icon.textContent = '\u2728';
    _bar.appendChild(icon);

    var info = document.createElement('div');
    info.className = 'ws-info';

    var label = document.createElement('div');
    label.className = 'ws-label';
    label.id = 'wsLabel';
    label.textContent = 'Win Streak';
    info.appendChild(label);

    var mult = document.createElement('div');
    mult.className = 'ws-mult';
    mult.id = 'wsMult';
    mult.textContent = '1.0x';
    info.appendChild(mult);

    _bar.appendChild(info);
    document.body.appendChild(_bar);
  }

  function updateBar(streak) {
    _currentStreak = streak;
    var info = getStreakStyle(streak);
    if (!_bar) return;
    if (!info) {
      _bar.classList.remove('active', 'ws-fire', 'ws-epic');
      return;
    }
    _bar.className = 'active' + (info.cls ? ' ' + info.cls : '');
    var iconEl = document.getElementById('wsIcon');
    var labelEl = document.getElementById('wsLabel');
    var multEl = document.getElementById('wsMult');
    if (iconEl) iconEl.textContent = info.icon;
    if (labelEl) labelEl.textContent = info.label;
    if (multEl) multEl.textContent = streak + '\u00D7 streak \u2192 ' + info.mult;
  }

  function recordWin(won) {
    var token = getToken();
    if (!token) return;
    fetch('/api/winstreak/record', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ won: won })
    })
    .then(function(r) { return r.ok ? r.json() : null; })
    .then(function(data) {
      if (!data) return;
      buildBar();
      updateBar(data.streak || 0);
    })
    .catch(function() {});
  }

  function resetStreak() {
    var token = getToken();
    if (!token) return;
    fetch('/api/winstreak/reset', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }
    }).catch(function() {});
    if (_bar) _bar.classList.remove('active', 'ws-fire', 'ws-epic');
    _currentStreak = 0;
  }

  // Watch for spin completion (same pattern as ui-spinstreak.js)
  function startWatcher() {
    if (_watchTimer) return;
    _lastSpinning = false;
    _watchTimer = setInterval(function() {
      var slotModal = document.getElementById('slotModal');
      if (!slotModal || !slotModal.classList.contains('active')) {
        // Slot closed — reset
        if (_bar && _bar.classList.contains('active')) {
          resetStreak();
        }
        return;
      }
      var nowSpinning = (typeof spinning !== 'undefined') ? spinning : false;
      if (_lastSpinning && !nowSpinning) {
        // Spin just completed — detect win by checking message element
        var msgEl = document.getElementById('messageDisplay') || document.getElementById('spinMessage') || document.querySelector('.win-message');
        var won = false;
        if (msgEl) {
          var txt = msgEl.textContent || '';
          won = txt.length > 0 && !(/no win|better luck|try again/i.test(txt));
        } else {
          // Fallback: check via render_game_to_text
          try {
            var state = JSON.parse(window.render_game_to_text());
            won = state.message && state.message.type === 'win';
          } catch(e) {}
        }
        recordWin(won);
      }
      _lastSpinning = nowSpinning;
    }, 200);
  }

  // Start watcher when slot modal opens
  (function hookSlot() {
    var _prevOpenSlot = window.openSlot;
    if (typeof _prevOpenSlot === 'function') {
      window.openSlot = function() {
        var result = _prevOpenSlot.apply(this, arguments);
        setTimeout(startWatcher, 500);
        return result;
      };
    } else {
      setTimeout(function() {
        var _os = window.openSlot;
        if (typeof _os === 'function') {
          window.openSlot = function() {
            var result = _os.apply(this, arguments);
            setTimeout(startWatcher, 500);
            return result;
          };
        }
      }, 3000);
    }
  }());

  window.resetWinStreak = resetStreak;

}());
