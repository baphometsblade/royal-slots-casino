(function() {
  'use strict';

  var TOKEN_KEY = typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken';
  var _overlay = null;
  var _badge = null;
  var _stylesInjected = false;
  var _points = 0;

  function getToken() {
    try { return localStorage.getItem(TOKEN_KEY); } catch(e) { return null; }
  }

  function injectStyles() {
    if (_stylesInjected) return;
    _stylesInjected = true;
    var s = document.createElement('style');
    s.textContent = [
      '#lsOverlay{position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:19000;display:none;align-items:center;justify-content:center}',
      '#lsOverlay.active{display:flex}',
      '#lsModal{background:linear-gradient(135deg,#0a0a1a,#1a1535);border:2px solid rgba(251,191,36,.35);border-radius:18px;padding:28px 32px;max-width:400px;width:90%;text-align:center}',
      '#lsModal h2{color:#fbbf24;font-size:20px;margin:0 0 4px}',
      '#lsModal .ls-pts{font-size:42px;font-weight:900;color:#fcd34d;margin:10px 0 2px;text-shadow:0 0 20px rgba(252,211,77,.4)}',
      '#lsModal .ls-sub{color:rgba(255,255,255,.45);font-size:13px;margin-bottom:18px}',
      '#lsModal .ls-rate{background:rgba(251,191,36,.08);border:1px solid rgba(251,191,36,.2);border-radius:8px;padding:10px 14px;font-size:12px;color:rgba(255,255,255,.6);margin-bottom:16px}',
      '#lsModal .ls-rate strong{color:#fbbf24}',
      '#lsRedeemRow{display:flex;gap:8px;margin-bottom:12px}',
      '#lsRedeemAmt{flex:1;background:rgba(255,255,255,.06);border:1px solid rgba(251,191,36,.3);border-radius:8px;padding:10px 12px;color:#fff;font-size:15px;font-weight:700;text-align:center}',
      '#lsRedeemBtn{background:linear-gradient(135deg,#d97706,#b45309);color:#fff;border:none;padding:10px 20px;border-radius:8px;font-size:14px;font-weight:800;cursor:pointer;white-space:nowrap}',
      '#lsRedeemBtn:disabled{opacity:.4;cursor:not-allowed}',
      '#lsMsg{font-size:13px;color:#fcd34d;min-height:18px;margin-bottom:10px}',
      '#lsClose{background:none;border:none;color:rgba(255,255,255,.3);font-size:12px;cursor:pointer;text-decoration:underline}',
      '#lsBadge{position:fixed;top:110px;right:12px;z-index:14500;background:linear-gradient(135deg,#d97706,#b45309);color:#fff;font-size:11px;font-weight:800;padding:5px 9px;border-radius:7px;cursor:pointer;box-shadow:0 2px 8px rgba(217,119,6,.5);display:none;animation:lsPulse 2.5s infinite}',
      '@keyframes lsPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}'
    ].join('\n');
    document.head.appendChild(s);
  }

  function buildBadge(pts) {
    if (_badge) { _badge.textContent = '\u2B50 ' + pts + ' pts'; _badge.style.display = 'block'; return; }
    _badge = document.createElement('div');
    _badge.id = 'lsBadge';
    _badge.textContent = '\u2B50 ' + pts + ' pts';
    _badge.addEventListener('click', openLoyaltyShop);
    document.body.appendChild(_badge);
  }

  function buildModal() {
    if (_overlay) return;
    _overlay = document.createElement('div');
    _overlay.id = 'lsOverlay';

    var modal = document.createElement('div');
    modal.id = 'lsModal';

    var icon = document.createElement('div');
    icon.style.cssText = 'font-size:32px;margin-bottom:6px';
    icon.textContent = '\u2B50';
    modal.appendChild(icon);

    var h2 = document.createElement('h2');
    h2.textContent = 'Loyalty Points Shop';
    modal.appendChild(h2);

    var pts = document.createElement('div');
    pts.className = 'ls-pts';
    pts.id = 'lsPts';
    pts.textContent = '0';
    modal.appendChild(pts);

    var sub = document.createElement('div');
    sub.className = 'ls-sub';
    sub.textContent = 'points available';
    modal.appendChild(sub);

    var rate = document.createElement('div');
    rate.className = 'ls-rate';
    var rate1 = document.createTextNode('100 points = ');
    var rateStrong = document.createElement('strong');
    rateStrong.textContent = '$1.00 credit';
    var rate2 = document.createTextNode(' \u2022 Earn 1 pt per spin');
    rate.appendChild(rate1);
    rate.appendChild(rateStrong);
    rate.appendChild(rate2);
    modal.appendChild(rate);

    var row = document.createElement('div');
    row.id = 'lsRedeemRow';

    var amt = document.createElement('select');
    amt.id = 'lsRedeemAmt';
    [100, 200, 500, 1000].forEach(function(v) {
      var opt = document.createElement('option');
      opt.value = v;
      opt.textContent = v + ' pts = $' + (v / 100).toFixed(2);
      amt.appendChild(opt);
    });
    row.appendChild(amt);

    var btn = document.createElement('button');
    btn.id = 'lsRedeemBtn';
    btn.textContent = 'REDEEM';
    btn.addEventListener('click', function() { doRedeem(btn); });
    row.appendChild(btn);
    modal.appendChild(row);

    var msg = document.createElement('div');
    msg.id = 'lsMsg';
    modal.appendChild(msg);

    var close = document.createElement('button');
    close.id = 'lsClose';
    close.textContent = 'Close';
    close.addEventListener('click', closeLoyaltyShop);
    modal.appendChild(close);

    _overlay.appendChild(modal);
    _overlay.addEventListener('click', function(e) {
      if (e.target === _overlay) closeLoyaltyShop();
    });
    document.body.appendChild(_overlay);
  }

  function doRedeem(btn) {
    var token = getToken();
    if (!token) return;
    var amtEl = document.getElementById('lsRedeemAmt');
    var amt = amtEl ? (parseInt(amtEl.value, 10) || 100) : 100;
    var msg = document.getElementById('lsMsg');
    if (msg) msg.textContent = '';
    if (btn) { btn.disabled = true; btn.textContent = 'Redeeming...'; }

    fetch('/api/loyaltyshop/redeem', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ points: amt })
    })
    .then(function(r) { return r.ok ? r.json() : null; })
    .then(function(data) {
      if (btn) { btn.disabled = false; btn.textContent = 'REDEEM'; }
      if (data && data.success) {
        _points = data.newPoints || 0;
        var ptsEl = document.getElementById('lsPts');
        if (ptsEl) ptsEl.textContent = _points;
        if (_badge) _badge.textContent = '\u2B50 ' + _points + ' pts';
        if (msg) msg.textContent = '\u2705 $' + (amt / 100).toFixed(2) + ' credited!';
        if (typeof window.updateBalance === 'function') window.updateBalance(data.newBalance);
      } else {
        if (msg) msg.textContent = 'Not enough points.';
      }
    })
    .catch(function() {
      if (btn) { btn.disabled = false; btn.textContent = 'REDEEM'; }
    });
  }

  function openLoyaltyShop() {
    injectStyles();
    buildModal();
    var token = getToken();
    if (!token) return;
    var msg = document.getElementById('lsMsg');
    if (msg) msg.textContent = '';

    fetch('/api/loyaltyshop/status', {
      headers: { 'Authorization': 'Bearer ' + token }
    })
    .then(function(r) { return r.ok ? r.json() : null; })
    .then(function(data) {
      if (!data) return;
      _points = data.points || 0;
      var ptsEl = document.getElementById('lsPts');
      if (ptsEl) ptsEl.textContent = _points;
      var btn = document.getElementById('lsRedeemBtn');
      if (btn) btn.disabled = _points < 100;
    })
    .catch(function() {});

    _overlay.classList.add('active');
  }

  function closeLoyaltyShop() {
    if (_overlay) _overlay.classList.remove('active');
  }

  // Award a point after each spin by hooking updateBalance
  function earnPoint() {
    var token = getToken();
    if (!token) return;
    fetch('/api/loyaltyshop/earn', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ spinsCount: 1 })
    })
    .then(function(r) { return r.ok ? r.json() : null; })
    .then(function(data) {
      if (!data) return;
      _points = data.points || 0;
      if (_badge) {
        _badge.textContent = '\u2B50 ' + _points + ' pts';
        if (_badge.style.display === 'none') _badge.style.display = 'block';
      }
    })
    .catch(function() {});
  }

  // Hook updateBalance — called after every spin result; safe because we don't
  // wrap with retry timers (no QA interference)
  setTimeout(function() {
    var _ub = window.updateBalance;
    if (typeof _ub === 'function') {
      window.updateBalance = function() {
        _ub.apply(this, arguments);
        earnPoint();
      };
    }
  }, 2000);

  // Show badge when lobby loads if user has points
  function loadPoints() {
    var token = getToken();
    if (!token) return;
    fetch('/api/loyaltyshop/status', {
      headers: { 'Authorization': 'Bearer ' + token }
    })
    .then(function(r) { return r.ok ? r.json() : null; })
    .then(function(data) {
      if (!data || data.points < 10) return;
      injectStyles();
      buildBadge(data.points);
    })
    .catch(function() {});
  }

  if (typeof window.renderGames === 'function') {
    var _prevRG = window.renderGames;
    window.renderGames = function() {
      _prevRG.apply(this, arguments);
      setTimeout(loadPoints, 1000);
      window.renderGames = _prevRG;
    };
  } else {
    setTimeout(loadPoints, 5000);
  }

  window.openLoyaltyShop = openLoyaltyShop;
  window.closeLoyaltyShop = closeLoyaltyShop;

}());
