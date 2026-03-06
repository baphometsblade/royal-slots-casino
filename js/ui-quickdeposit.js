(function () {
  'use strict';

  var NUDGE_THRESHOLD = 3.00;   // show when balance drops below $3
  var POLL_MS         = 2500;
  var HIDE_MS         = 8000;   // auto-hide after 8s if not interacted with

  var _bar        = null;
  var _hideTimer  = null;
  var _visible    = false;
  var _lastBal    = null;

  function getBalance() {
    if (typeof balance !== 'undefined' && typeof balance === 'number') return balance;
    return null;
  }

  function isLoggedIn() {
    return typeof currentUser !== 'undefined' && currentUser !== null;
  }

  function openDeposit() {
    hide();
    if (typeof showWalletModal === 'function') {
      showWalletModal();
    }
  }

  function buildBar() {
    if (_bar) return;
    var bar = document.createElement('div');
    bar.id = 'qdNudge';
    bar.style.cssText = [
      'position:fixed;bottom:80px;left:50%;transform:translateX(-50%) translateY(20px)',
      'z-index:16000;background:linear-gradient(135deg,#1e1b4b,#312e81)',
      'border:1px solid rgba(167,139,250,.4);border-radius:14px',
      'padding:10px 16px;display:flex;align-items:center;gap:12px',
      'box-shadow:0 8px 32px rgba(0,0,0,.6);opacity:0',
      'transition:opacity .3s ease,transform .3s ease;pointer-events:none'
    ].join(';');

    var icon = document.createElement('span');
    icon.style.cssText = 'font-size:20px;flex-shrink:0';
    icon.textContent = '\uD83D\uDCB0';
    bar.appendChild(icon);

    var msg = document.createElement('span');
    msg.style.cssText = 'color:rgba(255,255,255,.85);font-size:12px;white-space:nowrap';
    msg.textContent = 'Low balance — top up:';
    bar.appendChild(msg);

    var btns = [
      { label: '+$5',  amt: 5  },
      { label: '+$10', amt: 10 },
      { label: '+$25', amt: 25 }
    ];

    btns.forEach(function (b) {
      var btn = document.createElement('button');
      btn.style.cssText = [
        'background:linear-gradient(135deg,#7c3aed,#5b21b6);color:#fff',
        'border:none;border-radius:8px;padding:5px 10px;font-size:12px',
        'font-weight:700;cursor:pointer;white-space:nowrap'
      ].join(';');
      btn.textContent = b.label;
      btn.addEventListener('click', openDeposit);
      bar.appendChild(btn);
    });

    var close = document.createElement('button');
    close.style.cssText = 'background:none;border:none;color:rgba(255,255,255,.35);font-size:16px;cursor:pointer;padding:0 0 0 4px;flex-shrink:0';
    close.textContent = '\u00D7';
    close.addEventListener('click', function () { hide(true); });
    bar.appendChild(close);

    document.body.appendChild(bar);
    _bar = bar;
  }

  function show() {
    if (_visible) return;
    buildBar();
    _visible = true;
    _bar.style.pointerEvents = 'auto';
    // double-RAF for transition
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        _bar.style.opacity = '1';
        _bar.style.transform = 'translateX(-50%) translateY(0)';
      });
    });

    if (_hideTimer) clearTimeout(_hideTimer);
    _hideTimer = setTimeout(function () { hide(); }, HIDE_MS);
  }

  function hide(permanent) {
    if (!_visible || !_bar) return;
    _visible = false;
    _bar.style.opacity = '0';
    _bar.style.transform = 'translateX(-50%) translateY(20px)';
    _bar.style.pointerEvents = 'none';
    if (_hideTimer) { clearTimeout(_hideTimer); _hideTimer = null; }
    if (permanent) _lastBal = NUDGE_THRESHOLD + 1; // suppress for this session
  }

  function check() {
    if (!isLoggedIn()) { if (_visible) hide(); return; }

    var bal = getBalance();
    if (bal === null) return;

    if (bal < NUDGE_THRESHOLD) {
      show();
    } else {
      if (_visible) hide();
      _lastBal = bal;
    }
  }

  function init() {
    setInterval(check, POLL_MS);
    check();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(init, 3000); });
  } else {
    setTimeout(init, 3000);
  }

}());
