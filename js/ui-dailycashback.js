(function() {
  'use strict';

  var TOKEN_KEY = typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken';
  var _overlay = null;
  var _stylesInjected = false;
  var _badge = null;

  function getToken() {
    try { return localStorage.getItem(TOKEN_KEY); } catch(e) { return null; }
  }

  function injectStyles() {
    if (_stylesInjected) return;
    _stylesInjected = true;
    var s = document.createElement('style');
    s.textContent = [
      '#cbOverlay{position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:19500;display:none;align-items:center;justify-content:center}',
      '#cbOverlay.active{display:flex}',
      '#cbModal{background:linear-gradient(135deg,#0d1b2a,#1b2838);border:2px solid rgba(16,185,129,.4);border-radius:18px;padding:28px 32px;max-width:380px;width:90%;text-align:center}',
      '#cbModal h2{color:#10b981;font-size:20px;margin:0 0 6px}',
      '#cbModal .cb-amount{font-size:44px;font-weight:900;color:#34d399;margin:12px 0;text-shadow:0 0 20px rgba(52,211,153,.4)}',
      '#cbModal .cb-sub{color:rgba(255,255,255,.5);font-size:13px;margin-bottom:18px}',
      '#cbClaimBtn{background:linear-gradient(135deg,#10b981,#059669);color:#fff;border:none;padding:14px 40px;border-radius:10px;font-size:16px;font-weight:800;cursor:pointer;width:100%}',
      '#cbClaimBtn:disabled{opacity:.5;cursor:not-allowed}',
      '#cbMsg{margin-top:12px;font-size:13px;color:#34d399;min-height:18px}',
      '#cbClose{background:none;border:none;color:rgba(255,255,255,.3);font-size:12px;cursor:pointer;margin-top:10px;text-decoration:underline}',
      '#cbBadge{position:fixed;top:72px;right:12px;z-index:14000;background:linear-gradient(135deg,#10b981,#059669);color:#fff;font-size:11px;font-weight:800;padding:6px 10px;border-radius:8px;cursor:pointer;box-shadow:0 2px 10px rgba(16,185,129,.5);display:none;animation:cbPulse 2s infinite}',
      '@keyframes cbPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}'
    ].join('\n');
    document.head.appendChild(s);
  }

  function buildBadge(amount) {
    if (_badge) { _badge.style.display = 'block'; return; }
    _badge = document.createElement('div');
    _badge.id = 'cbBadge';
    _badge.textContent = '\uD83D\uDCB0 $' + amount.toFixed(2) + ' Cashback!';
    _badge.addEventListener('click', openDailyCashbackModal);
    document.body.appendChild(_badge);
  }

  function buildModal() {
    if (_overlay) return;
    _overlay = document.createElement('div');
    _overlay.id = 'cbOverlay';

    var modal = document.createElement('div');
    modal.id = 'cbModal';

    var icon = document.createElement('div');
    icon.style.cssText = 'font-size:36px;margin-bottom:8px;';
    icon.textContent = '\uD83D\uDCB0';
    modal.appendChild(icon);

    var h2 = document.createElement('h2');
    h2.textContent = 'Daily Cashback Ready!';
    modal.appendChild(h2);

    var sub = document.createElement('div');
    sub.className = 'cb-sub';
    sub.id = 'cbSub';
    sub.textContent = '5% of your net losses returned';
    modal.appendChild(sub);

    var amount = document.createElement('div');
    amount.className = 'cb-amount';
    amount.id = 'cbAmount';
    amount.textContent = '$0.00';
    modal.appendChild(amount);

    var btn = document.createElement('button');
    btn.id = 'cbClaimBtn';
    btn.textContent = 'CLAIM CASHBACK';
    btn.addEventListener('click', claimCashback);
    modal.appendChild(btn);

    var msg = document.createElement('div');
    msg.id = 'cbMsg';
    modal.appendChild(msg);

    var closeBtn = document.createElement('button');
    closeBtn.id = 'cbClose';
    closeBtn.textContent = 'Close';
    closeBtn.addEventListener('click', closeDailyCashbackModal);
    modal.appendChild(closeBtn);

    _overlay.appendChild(modal);
    _overlay.addEventListener('click', function(e) {
      if (e.target === _overlay) closeDailyCashbackModal();
    });
    document.body.appendChild(_overlay);
  }

  function claimCashback() {
    var token = getToken();
    if (!token) return;
    var btn = document.getElementById('cbClaimBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'CLAIMING...'; }

    fetch('/api/dailycashback/claim', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token }
    })
    .then(function(r) { return r.ok ? r.json() : null; })
    .then(function(data) {
      var msg = document.getElementById('cbMsg');
      if (data && data.success) {
        if (msg) msg.textContent = '\u2705 Credited to your balance!';
        if (typeof window.updateBalance === 'function') window.updateBalance(data.newBalance);
        if (_badge) _badge.style.display = 'none';
        setTimeout(closeDailyCashbackModal, 1800);
      } else {
        if (msg) msg.textContent = 'Already claimed today.';
        if (btn) { btn.disabled = false; btn.textContent = 'CLAIM CASHBACK'; }
      }
    })
    .catch(function() {
      if (btn) { btn.disabled = false; btn.textContent = 'CLAIM CASHBACK'; }
    });
  }

  function openDailyCashbackModal() {
    injectStyles();
    buildModal();

    var token = getToken();
    if (!token) return;

    var amountEl = document.getElementById('cbAmount');
    var subEl = document.getElementById('cbSub');
    var btn = document.getElementById('cbClaimBtn');
    var msg = document.getElementById('cbMsg');
    if (msg) msg.textContent = '';

    fetch('/api/dailycashback/status', {
      headers: { 'Authorization': 'Bearer ' + token }
    })
    .then(function(r) { return r.ok ? r.json() : null; })
    .then(function(data) {
      if (!data) return;
      if (amountEl) amountEl.textContent = '$' + (data.amount || 0).toFixed(2);
      if (data.claimed) {
        if (subEl) subEl.textContent = 'Already claimed today.';
        if (btn) { btn.disabled = true; btn.textContent = 'Claimed \u2705'; }
      } else if (!data.eligible) {
        if (subEl) subEl.textContent = 'No qualifying losses today.';
        if (btn) btn.disabled = true;
      }
    })
    .catch(function() {});

    _overlay.classList.add('active');
  }

  function closeDailyCashbackModal() {
    if (_overlay) _overlay.classList.remove('active');
  }

  function checkOnLoad() {
    var token = getToken();
    if (!token) return;
    fetch('/api/dailycashback/status', {
      headers: { 'Authorization': 'Bearer ' + token }
    })
    .then(function(r) { return r.ok ? r.json() : null; })
    .then(function(data) {
      if (data && data.eligible && !data.claimed && data.amount >= 0.50) {
        injectStyles();
        buildBadge(data.amount);
      }
    })
    .catch(function() {});
  }

  // Hook renderGames to check on lobby load
  if (typeof window.renderGames === 'function') {
    var _prevRG = window.renderGames;
    window.renderGames = function() {
      _prevRG.apply(this, arguments);
      setTimeout(checkOnLoad, 800);
      window.renderGames = _prevRG; // only once
    };
  } else {
    setTimeout(checkOnLoad, 4000);
  }

  window.openDailyCashbackModal = openDailyCashbackModal;
  window.closeDailyCashbackModal = closeDailyCashbackModal;

}());
