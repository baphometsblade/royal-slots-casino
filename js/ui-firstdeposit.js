(function() {
  'use strict';

  var TOKEN_KEY = typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken';
  var _overlay = null;
  var _shown = false;
  var _stylesInjected = false;
  var SNOOZE_KEY = 'fdShown';

  function injectStyles() {
    if (_stylesInjected) return;
    _stylesInjected = true;
    var s = document.createElement('style');
    s.id = 'firstDepositStyles';
    s.textContent = [
      '#fdOverlay{position:fixed;inset:0;background:rgba(0,0,0,.88);z-index:21000;display:none;align-items:center;justify-content:center}',
      '#fdOverlay.active{display:flex}',
      '#fdModal{background:linear-gradient(160deg,#0d0d1a 0%,#1a1035 100%);border:2px solid rgba(255,215,0,.35);border-radius:20px;padding:32px;max-width:420px;width:92%;text-align:center;box-shadow:0 0 60px rgba(255,215,0,.15)}',
      '#fdModal h2{color:#ffd700;font-size:24px;margin:0 0 8px;text-shadow:0 2px 8px rgba(255,215,0,.3)}',
      '#fdModal .fd-sub{color:rgba(255,255,255,.6);font-size:14px;margin-bottom:20px}',
      '.fd-rewards{display:flex;gap:12px;justify-content:center;margin-bottom:22px}',
      '.fd-reward{background:rgba(255,215,0,.08);border:1px solid rgba(255,215,0,.25);border-radius:12px;padding:14px 20px;flex:1;text-align:center}',
      '.fd-reward-icon{font-size:28px;margin-bottom:4px}',
      '.fd-reward-val{color:#ffd700;font-size:18px;font-weight:800}',
      '.fd-reward-label{color:rgba(255,255,255,.5);font-size:11px;margin-top:2px}',
      '#fdClaimBtn{width:100%;padding:14px;background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;border:none;border-radius:10px;font-size:17px;font-weight:800;cursor:pointer;letter-spacing:1px}',
      '#fdClaimBtn:hover{opacity:.9}',
      '#fdClaimBtn:disabled{opacity:.5;cursor:not-allowed}',
      '#fdDismiss{background:none;border:none;color:rgba(255,255,255,.3);font-size:12px;cursor:pointer;margin-top:14px;text-decoration:underline}',
      '#fdConfirm{display:none;color:#34d399;font-size:18px;font-weight:700;margin-top:12px}'
    ].join('\n');
    document.head.appendChild(s);
  }

  function buildOverlay() {
    if (_overlay) return;

    _overlay = document.createElement('div');
    _overlay.id = 'fdOverlay';

    var modal = document.createElement('div');
    modal.id = 'fdModal';

    var h2 = document.createElement('h2');
    h2.textContent = '\uD83C\uDF89 WELCOME BONUS UNLOCKED!';
    modal.appendChild(h2);

    var sub = document.createElement('div');
    sub.className = 'fd-sub';
    sub.textContent = 'Your first deposit has been matched with exclusive rewards:';
    modal.appendChild(sub);

    var rewards = document.createElement('div');
    rewards.className = 'fd-rewards';

    // Gems reward
    var r1 = document.createElement('div');
    r1.className = 'fd-reward';
    var r1Icon = document.createElement('div');
    r1Icon.className = 'fd-reward-icon';
    r1Icon.textContent = '\uD83D\uDC8E';
    var r1Val = document.createElement('div');
    r1Val.className = 'fd-reward-val';
    r1Val.textContent = '+500';
    var r1Label = document.createElement('div');
    r1Label.className = 'fd-reward-label';
    r1Label.textContent = 'Gems';
    r1.appendChild(r1Icon);
    r1.appendChild(r1Val);
    r1.appendChild(r1Label);

    // Credits reward
    var r2 = document.createElement('div');
    r2.className = 'fd-reward';
    var r2Icon = document.createElement('div');
    r2Icon.className = 'fd-reward-icon';
    r2Icon.textContent = '\uD83D\uDCB5';
    var r2Val = document.createElement('div');
    r2Val.className = 'fd-reward-val';
    r2Val.textContent = '+$2.00';
    var r2Label = document.createElement('div');
    r2Label.className = 'fd-reward-label';
    r2Label.textContent = 'Credits';
    r2.appendChild(r2Icon);
    r2.appendChild(r2Val);
    r2.appendChild(r2Label);

    rewards.appendChild(r1);
    rewards.appendChild(r2);
    modal.appendChild(rewards);

    var claimBtn = document.createElement('button');
    claimBtn.id = 'fdClaimBtn';
    claimBtn.textContent = '\uD83C\uDF1F CLAIM NOW';
    claimBtn.addEventListener('click', claim);
    modal.appendChild(claimBtn);

    var confirm = document.createElement('div');
    confirm.id = 'fdConfirm';
    confirm.textContent = '\u2705 Bonus Claimed!';
    modal.appendChild(confirm);

    var dismiss = document.createElement('button');
    dismiss.id = 'fdDismiss';
    dismiss.textContent = 'Maybe later';
    dismiss.addEventListener('click', function() { closeOverlay(); });
    modal.appendChild(dismiss);

    _overlay.appendChild(modal);
    document.body.appendChild(_overlay);
  }

  function claim() {
    var token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;
    var btn = document.getElementById('fdClaimBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'Claiming...'; }

    fetch('/api/firstdeposit/claim', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token }
    })
    .then(function(r) { return r.ok ? r.json() : null; })
    .then(function(data) {
      if (!data || !data.success) {
        if (btn) { btn.disabled = false; btn.textContent = '\uD83C\uDF1F CLAIM NOW'; }
        return;
      }
      if (btn) btn.style.display = 'none';
      var confirm = document.getElementById('fdConfirm');
      if (confirm) confirm.style.display = 'block';

      if (data.newBalance !== undefined && typeof window.updateBalance === 'function') {
        window.updateBalance(data.newBalance);
      }
      localStorage.setItem(SNOOZE_KEY, String(Date.now()));
      setTimeout(closeOverlay, 2500);
    })
    .catch(function() {
      if (btn) { btn.disabled = false; btn.textContent = '\uD83C\uDF1F CLAIM NOW'; }
    });
  }

  function showOverlay() {
    if (_shown) return;
    _shown = true;
    injectStyles();
    buildOverlay();
    _overlay.classList.add('active');
    localStorage.setItem(SNOOZE_KEY, String(Date.now()));
    // Auto-dismiss after 60s
    setTimeout(function() {
      if (_overlay && _overlay.classList.contains('active')) closeOverlay();
    }, 60000);
  }

  function closeOverlay() {
    if (_overlay) _overlay.classList.remove('active');
  }

  function checkEligibility() {
    var token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;

    // Snooze check — don't show again within 24h
    var lastShown = parseInt(localStorage.getItem(SNOOZE_KEY) || '0', 10);
    if (Date.now() - lastShown < 86400000) return;

    fetch('/api/firstdeposit/status', {
      headers: { 'Authorization': 'Bearer ' + token }
    })
    .then(function(r) { return r.ok ? r.json() : null; })
    .then(function(data) {
      if (data && data.eligible && !data.claimed) {
        showOverlay();
      }
    })
    .catch(function() {});
  }

  function hookUpdateBalance() {
    var _prev = window.updateBalance;
    window.updateBalance = function(n) {
      if (_prev) _prev.apply(this, arguments);
      // Re-check 3s after any balance update
      if (!_shown) {
        setTimeout(checkEligibility, 3000);
      }
    };
  }

  function init() {
    setTimeout(checkEligibility, 8000);
    hookUpdateBalance();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 0);
  }

}());
