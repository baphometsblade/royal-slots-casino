(function() {
  'use strict';

  var TOKEN_KEY = typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken';
  var _overlay = null;
  var _stylesInjected = false;
  var _shown = false;
  var BALANCE_THRESHOLD = 5;
  var CHECK_INTERVAL_MS = 15000;

  function getToken() {
    try { return localStorage.getItem(TOKEN_KEY); } catch(e) { return null; }
  }

  function injectStyles() {
    if (_stylesInjected) return;
    _stylesInjected = true;
    var s = document.createElement('style');
    s.textContent = [
      '#rbOverlay{position:fixed;inset:0;background:rgba(0,0,0,.8);z-index:18500;display:none;align-items:center;justify-content:center}',
      '#rbOverlay.active{display:flex}',
      '#rbModal{background:linear-gradient(135deg,#1a1035,#0d0d1a);border:2px solid rgba(139,92,246,.4);border-radius:18px;padding:28px 32px;max-width:360px;width:90%;text-align:center}',
      '#rbModal h2{color:#a78bfa;font-size:20px;margin:0 0 8px}',
      '#rbModal .rb-balance{color:rgba(255,255,255,.5);font-size:13px;margin-bottom:16px}',
      '#rbModal .rb-offer{background:rgba(139,92,246,.08);border:1px solid rgba(139,92,246,.3);border-radius:10px;padding:14px;margin-bottom:18px}',
      '#rbModal .rb-free{font-size:32px;font-weight:900;color:#c4b5fd;margin:6px 0}',
      '#rbModal .rb-cond{font-size:11px;color:rgba(255,255,255,.4)}',
      '#rbDepositBtn{background:linear-gradient(135deg,#7c3aed,#5b21b6);color:#fff;border:none;padding:14px 40px;border-radius:10px;font-size:16px;font-weight:800;cursor:pointer;width:100%;margin-bottom:8px}',
      '#rbDepositBtn:disabled{opacity:.5;cursor:not-allowed}',
      '#rbMsg{font-size:13px;color:#a78bfa;min-height:16px;margin-bottom:8px}',
      '#rbSkip{background:none;border:none;color:rgba(255,255,255,.25);font-size:12px;cursor:pointer;text-decoration:underline}'
    ].join('\n');
    document.head.appendChild(s);
  }

  function buildModal() {
    if (_overlay) return;
    _overlay = document.createElement('div');
    _overlay.id = 'rbOverlay';

    var modal = document.createElement('div');
    modal.id = 'rbModal';

    var icon = document.createElement('div');
    icon.style.cssText = 'font-size:32px;margin-bottom:8px;';
    icon.textContent = '\uD83D\uDCB3';
    modal.appendChild(icon);

    var h2 = document.createElement('h2');
    h2.textContent = 'Running Low?';
    modal.appendChild(h2);

    var bal = document.createElement('div');
    bal.className = 'rb-balance';
    bal.id = 'rbBalance';
    bal.textContent = 'Your balance is below $5.00';
    modal.appendChild(bal);

    var offer = document.createElement('div');
    offer.className = 'rb-offer';
    var offerLabel = document.createElement('div');
    offerLabel.style.cssText = 'font-size:12px;color:rgba(255,255,255,.5);margin-bottom:4px;';
    offerLabel.textContent = 'Deposit $10+ and get:';
    offer.appendChild(offerLabel);
    var free = document.createElement('div');
    free.className = 'rb-free';
    free.textContent = '+$1.00 FREE';
    offer.appendChild(free);
    var cond = document.createElement('div');
    cond.className = 'rb-cond';
    cond.textContent = 'Bonus credited automatically after deposit';
    offer.appendChild(cond);
    modal.appendChild(offer);

    var depositBtn = document.createElement('button');
    depositBtn.id = 'rbDepositBtn';
    depositBtn.textContent = '\uD83D\uDCB0 DEPOSIT & CLAIM $1';
    depositBtn.addEventListener('click', function() {
      claimAndDeposit(modal, depositBtn);
    });
    modal.appendChild(depositBtn);

    var msg = document.createElement('div');
    msg.id = 'rbMsg';
    modal.appendChild(msg);

    var skip = document.createElement('button');
    skip.id = 'rbSkip';
    skip.textContent = 'No thanks, keep playing';
    skip.addEventListener('click', closeReloadBonus);
    modal.appendChild(skip);

    _overlay.appendChild(modal);
    _overlay.addEventListener('click', function(e) {
      if (e.target === _overlay) closeReloadBonus();
    });
    document.body.appendChild(_overlay);
  }

  function claimAndDeposit(modal, btn) {
    var token = getToken();
    if (!token) return;
    if (btn) { btn.disabled = true; btn.textContent = 'Claiming...'; }

    fetch('/api/reloadbonus/claim', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token }
    })
    .then(function(r) { return r.ok ? r.json() : null; })
    .then(function(data) {
      var msg = document.getElementById('rbMsg');
      if (data && data.success) {
        if (msg) msg.textContent = '\u2705 +$1.00 credited!';
        if (typeof window.updateBalance === 'function') window.updateBalance(data.newBalance);
        setTimeout(function() {
          closeReloadBonus();
          if (typeof openWalletModal === 'function') openWalletModal();
        }, 1200);
      } else {
        if (msg) msg.textContent = 'Bonus already used today.';
        // Still open wallet
        setTimeout(function() {
          closeReloadBonus();
          if (typeof openWalletModal === 'function') openWalletModal();
        }, 1000);
      }
    })
    .catch(function() {
      closeReloadBonus();
      if (typeof openWalletModal === 'function') openWalletModal();
    });
  }

  function openReloadBonus() {
    if (_shown) return;
    _shown = true;
    injectStyles();
    buildModal();

    var token = getToken();
    if (token) {
      fetch('/api/reloadbonus/status', {
        headers: { 'Authorization': 'Bearer ' + token }
      })
      .then(function(r) { return r.ok ? r.json() : null; })
      .then(function(data) {
        if (!data || !data.eligible) { _shown = false; return; }
        var balEl = document.getElementById('rbBalance');
        if (balEl && data.balance !== undefined) {
          balEl.textContent = 'Your balance is $' + parseFloat(data.balance).toFixed(2);
        }
        _overlay.classList.add('active');
      })
      .catch(function() { _shown = false; });
    } else {
      _overlay.classList.add('active');
    }
  }

  function closeReloadBonus() {
    if (_overlay) _overlay.classList.remove('active');
  }

  function checkBalance() {
    if (new URLSearchParams(window.location.search).get('noBonus') === '1') return;
    var slotModal = document.getElementById('slotModal');
    if (slotModal && slotModal.classList.contains('active')) return; // don't interrupt slots
    if (_shown) return;

    var token = getToken();
    if (!token) return;

    // Only prompt after user has actually wagered — avoids QA/fresh-load false triggers
    if (typeof stats === 'undefined' || !stats.totalWagered) return;

    var currentBal = typeof balance !== 'undefined' ? balance : null;
    if (currentBal !== null && currentBal < BALANCE_THRESHOLD) {
      openReloadBonus();
    }
  }

  // Check periodically
  setTimeout(function() {
    checkBalance();
    setInterval(checkBalance, CHECK_INTERVAL_MS);
  }, 8000);

  window.openReloadBonus = openReloadBonus;
  window.closeReloadBonus = closeReloadBonus;

}());
