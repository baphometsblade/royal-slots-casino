(function() {
  'use strict';

  var _bar = null;
  var _onlineEl = null;
  var _spinsEl = null;
  var _membersEl = null;
  var _pollTimer = null;
  var _stylesInjected = false;

  // Live player count state
  var _baseOnline = 0;
  var _onlineDriftTimer = null;

  // localStorage key for persisting a stable-ish base count across sessions
  var STORAGE_ONLINE_KEY = 'spBaseOnline';

  function injectStyles() {
    if (_stylesInjected) return;
    _stylesInjected = true;
    if (document.getElementById('socialProofStyles')) return;
    var s = document.createElement('style');
    s.id = 'socialProofStyles';
    s.textContent = [
      '#socialProofBar{display:flex;align-items:center;justify-content:center;gap:18px;height:32px;background:rgba(0,0,0,.35);border-bottom:1px solid rgba(255,255,255,.06);font-size:12px;color:rgba(255,255,255,.55);padding:0 12px;overflow:hidden;white-space:nowrap}',
      '#socialProofBar .sp-stat{display:inline-flex;align-items:center;gap:4px;transition:color .3s}',
      '#socialProofBar .sp-stat.flash{color:#ffd700}',
      '#socialProofBar .sp-num{font-weight:700;color:rgba(255,255,255,.75);font-variant-numeric:tabular-nums;min-width:1ch}',
      '#socialProofBar .sp-dot{width:6px;height:6px;border-radius:50%;background:#22c55e;box-shadow:0 0 4px #22c55e;animation:spPulse 2s ease-in-out infinite}',
      '@keyframes spPulse{0%,100%{opacity:1}50%{opacity:.4}}',

      // Big-win corner toast
      '#spBigWinToast{position:fixed;bottom:24px;left:24px;z-index:18600;' +
        'background:linear-gradient(135deg,rgba(168,85,247,.15),rgba(59,130,246,.15));' +
        'border:1px solid rgba(168,85,247,.4);border-radius:12px;padding:10px 14px;' +
        'max-width:280px;display:flex;align-items:flex-start;gap:8px;' +
        'box-shadow:0 6px 20px rgba(0,0,0,.4);' +
        'transform:translateX(-120%);opacity:0;' +
        'transition:transform .4s cubic-bezier(.34,1.56,.64,1),opacity .3s ease}',
      '#spBigWinToast.active{transform:translateX(0);opacity:1}',
      '#spBigWinToast .spbw-ico{font-size:20px;flex-shrink:0;line-height:1.2}',
      '#spBigWinToast .spbw-body{flex:1;min-width:0}',
      '#spBigWinToast .spbw-msg{font-size:12px;font-weight:700;color:#e0e7ff;line-height:1.4}',
      '#spBigWinToast .spbw-sub{font-size:10px;color:rgba(255,255,255,.4);margin-top:2px}',
      '#spBigWinToast .spbw-close{background:none;border:none;color:rgba(255,255,255,.3);' +
        'font-size:14px;cursor:pointer;padding:0 0 0 4px;line-height:1;flex-shrink:0}'
    ].join('\n');
    document.head.appendChild(s);
  }

  function fmtNum(n) {
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  // Compute a realistic online count: base + random drift in [-50, +50]
  function _computeOnline(base) {
    var drift = Math.floor(Math.random() * 101) - 50; // -50..+50
    return Math.max(200, base + drift);
  }

  // Slowly drift the base count so it doesn't jump suddenly
  function _driftBase() {
    var step = Math.floor(Math.random() * 21) - 10; // -10..+10 per 30s tick
    _baseOnline = Math.max(400, Math.min(2000, _baseOnline + step));
    try { localStorage.setItem(STORAGE_ONLINE_KEY, String(_baseOnline)); } catch (e) {}
    if (_onlineEl) animateValue(_onlineEl, _computeOnline(_baseOnline));
  }

  function _initBaseOnline(serverVal) {
    if (serverVal && serverVal > 0) {
      _baseOnline = serverVal;
    } else {
      // Try localStorage-persisted value first
      try {
        var stored = parseInt(localStorage.getItem(STORAGE_ONLINE_KEY), 10);
        if (stored && stored > 0) {
          _baseOnline = stored;
        } else {
          // Seed with a realistic-feeling value in 750–1200
          _baseOnline = 750 + Math.floor(Math.random() * 450);
          localStorage.setItem(STORAGE_ONLINE_KEY, String(_baseOnline));
        }
      } catch (e) {
        _baseOnline = 847 + Math.floor(Math.random() * 200) - 100;
      }
    }
    if (_onlineEl) animateValue(_onlineEl, _computeOnline(_baseOnline));

    // Drift every 30 seconds for realistic variation
    if (_onlineDriftTimer) clearInterval(_onlineDriftTimer);
    _onlineDriftTimer = setInterval(_driftBase, 30000);
  }

  function buildBar() {
    if (_bar) return;

    _bar = document.createElement('div');
    _bar.id = 'socialProofBar';

    // Online now
    var s1 = document.createElement('span');
    s1.className = 'sp-stat';
    var dot = document.createElement('span');
    dot.className = 'sp-dot';
    var lbl1 = document.createTextNode(' ');
    _onlineEl = document.createElement('span');
    _onlineEl.className = 'sp-num';
    _onlineEl.textContent = '---';
    var txt1 = document.createTextNode(' playing now');
    s1.appendChild(dot);
    s1.appendChild(lbl1);
    s1.appendChild(_onlineEl);
    s1.appendChild(txt1);

    // Spins today
    var s2 = document.createElement('span');
    s2.className = 'sp-stat';
    var ico2 = document.createTextNode('\uD83C\uDFB0 ');
    _spinsEl = document.createElement('span');
    _spinsEl.className = 'sp-num';
    _spinsEl.textContent = '---';
    var txt2 = document.createTextNode(' spins today');
    s2.appendChild(ico2);
    s2.appendChild(_spinsEl);
    s2.appendChild(txt2);

    // Members
    var s3 = document.createElement('span');
    s3.className = 'sp-stat';
    var ico3 = document.createTextNode('\uD83D\uDC65 ');
    _membersEl = document.createElement('span');
    _membersEl.className = 'sp-num';
    _membersEl.textContent = '---';
    var txt3 = document.createTextNode(' members');
    s3.appendChild(ico3);
    s3.appendChild(_membersEl);
    s3.appendChild(txt3);

    var sep1 = document.createTextNode('  \u00B7  ');
    var sep2 = document.createTextNode('  \u00B7  ');

    _bar.appendChild(s1);
    _bar.appendChild(sep1);
    _bar.appendChild(s2);
    _bar.appendChild(sep2);
    _bar.appendChild(s3);

    // Insert after header, before container
    var header = document.querySelector('.casino-header') || document.querySelector('header');
    if (header && header.nextSibling) {
      header.parentNode.insertBefore(_bar, header.nextSibling);
    } else {
      var container = document.querySelector('.container');
      if (container) {
        container.parentNode.insertBefore(_bar, container);
      }
    }
  }

  function animateValue(el, newVal) {
    if (!el) return;
    var current = parseInt(el.textContent.replace(/,/g, ''), 10) || 0;
    if (current === newVal) return;
    el.textContent = fmtNum(newVal);
    // Flash effect
    var parent = el.parentElement;
    if (parent) {
      parent.classList.add('flash');
      setTimeout(function() { parent.classList.remove('flash'); }, 800);
    }
  }

  function poll() {
    fetch('/api/socialproof')
    .then(function(r) { return r.ok ? r.json() : null; })
    .then(function(data) {
      if (!data) {
        // Server not available — use local drift values
        _initBaseOnline(0);
        return;
      }
      // Use server value for online count if provided and > 0
      if (data.onlineNow && data.onlineNow > 0) {
        _initBaseOnline(data.onlineNow);
      } else {
        _initBaseOnline(0);
      }
      if (data.spinsToday) animateValue(_spinsEl, data.spinsToday || 0);
      if (data.registeredUsers) animateValue(_membersEl, data.registeredUsers || 0);
    })
    .catch(function() {
      // Server unreachable — start local drift
      _initBaseOnline(0);
    });
  }

  // ── Big-win corner toast ───────────────────────────────────────────
  var _bigWinToastEl = null;
  var _bigWinDismissTimer = null;

  function showBigWinCornerToast(playerName, amount, gameName) {
    // Don't show if slot modal is open
    var slotModal = document.getElementById('slotModal');
    if (slotModal && slotModal.classList.contains('active')) return;

    injectStyles();

    // Remove existing toast if any
    _dismissBigWinToast(true);

    _bigWinToastEl = document.createElement('div');
    _bigWinToastEl.id = 'spBigWinToast';

    var ico = document.createElement('span');
    ico.className = 'spbw-ico';
    ico.textContent = '\uD83C\uDF89';

    var body = document.createElement('div');
    body.className = 'spbw-body';

    var msg = document.createElement('div');
    msg.className = 'spbw-msg';
    msg.textContent = '\uD83C\uDFB0 ' + playerName + ' just won $' + amount + ' on ' + gameName + '!';

    var sub = document.createElement('div');
    sub.className = 'spbw-sub';
    sub.textContent = 'Join the winning streak \u2192';

    body.appendChild(msg);
    body.appendChild(sub);

    var closeBtn = document.createElement('button');
    closeBtn.className = 'spbw-close';
    closeBtn.textContent = '\u00D7';
    closeBtn.title = 'Dismiss';
    closeBtn.addEventListener('click', function() { _dismissBigWinToast(false); });

    _bigWinToastEl.appendChild(ico);
    _bigWinToastEl.appendChild(body);
    _bigWinToastEl.appendChild(closeBtn);
    document.body.appendChild(_bigWinToastEl);

    requestAnimationFrame(function() {
      requestAnimationFrame(function() {
        if (_bigWinToastEl) _bigWinToastEl.classList.add('active');
      });
    });

    // Auto-dismiss after 6 seconds
    if (_bigWinDismissTimer) clearTimeout(_bigWinDismissTimer);
    _bigWinDismissTimer = setTimeout(function() { _dismissBigWinToast(false); }, 6000);
  }

  function _dismissBigWinToast(immediate) {
    if (_bigWinDismissTimer) { clearTimeout(_bigWinDismissTimer); _bigWinDismissTimer = null; }
    if (!_bigWinToastEl) return;
    var el = _bigWinToastEl;
    _bigWinToastEl = null;
    if (immediate) {
      if (el.parentNode) el.parentNode.removeChild(el);
      return;
    }
    el.classList.remove('active');
    setTimeout(function() { if (el.parentNode) el.parentNode.removeChild(el); }, 400);
  }

  // Expose globally so ui-winticker.js can call it for big/mega/jackpot wins
  window.showBigWinCornerToast = showBigWinCornerToast;

  function hideWhenSlotOpen() {
    if (!_bar) return;
    var slotModal = document.getElementById('slotModal');
    _bar.style.display = (slotModal && slotModal.classList.contains('active')) ? 'none' : 'flex';
  }

  function init() {
    injectStyles();
    buildBar();

    // Show placeholder online count immediately (before first API call)
    _initBaseOnline(0);

    setTimeout(function() {
      poll();
      _pollTimer = setInterval(poll, 45000);
    }, 4000);

    // Observe slot modal changes to auto-hide bar
    var slotModal = document.getElementById('slotModal');
    if (slotModal) {
      var obs = new MutationObserver(hideWhenSlotOpen);
      obs.observe(slotModal, { attributes: true, attributeFilter: ['class'] });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 0);
  }

}());
