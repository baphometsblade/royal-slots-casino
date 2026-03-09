(function () {
  'use strict';

  var _sessionStartBalance = null;
  var _recoveryShownThisSession = false;
  var _overlayEl = null;
  var _countdownInt = null;
  var _offerExpiresAt = null;
  var _snoozeKey = 'rco_snoozed';
  var _snoozeMinutes = 60;
  var _stylesInjected = false;
  var _autoDismissTimer = null;

  function getToken() {
    var key = typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken';
    return localStorage.getItem(key) || '';
  }

  function isSnoozed() {
    var val = localStorage.getItem(_snoozeKey);
    if (!val) return false;
    return Date.now() - parseInt(val, 10) < _snoozeMinutes * 60000;
  }

  function snooze() {
    try { localStorage.setItem(_snoozeKey, String(Date.now())); } catch (e) { /* ignore */ }
  }
  function injectStyles() {
    if (_stylesInjected) return;
    _stylesInjected = true;
    var s = document.createElement('style');
    s.id = 'rcStyles';
    s.textContent = [
      '#rcOverlay{display:none;position:fixed;bottom:0;right:0;z-index:10400;width:360px;max-width:95vw;padding:16px}',
      '#rcOverlay.active{display:block}',
      '#rcModal{background:#0d0d1a;border-radius:16px;border:1px solid rgba(239,68,68,.25);padding:20px;box-shadow:0 -4px 30px rgba(239,68,68,.15);animation:rcSlideUp .35s ease;position:relative}',
      '@keyframes rcSlideUp{from{transform:translateY(40px);opacity:0}to{transform:translateY(0);opacity:1}}',
      '.rc-header{font-size:14px;font-weight:800;color:#f87171;margin-bottom:2px;letter-spacing:.5px}',
      '.rc-loss{font-size:26px;font-weight:900;color:#fff;margin-bottom:6px}',
      '.rc-msg{font-size:13px;color:rgba(255,255,255,.6);margin-bottom:12px;line-height:1.5}',
      '.rc-offer-badge{background:rgba(239,68,68,.12);border:1px solid rgba(239,68,68,.28);border-radius:8px;padding:10px;text-align:center;margin-bottom:12px}',
      '.rc-offer-text{font-size:13px;font-weight:800;color:#fca5a5}',
      '.rc-offer-timer{font-size:11px;color:rgba(255,255,255,.4);margin-top:3px}',
      '.rc-bundle-card{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:10px 12px;display:flex;align-items:center;gap:10px;margin-bottom:12px;cursor:pointer}',
      '.rc-bundle-card:hover{border-color:rgba(239,68,68,.35)}',
      '.rc-bundle-info{flex:1;min-width:0}',
      '.rc-bundle-label{font-size:10px;color:rgba(255,255,255,.45);text-transform:uppercase;letter-spacing:.5px}',
      '.rc-bundle-name{font-size:14px;font-weight:800;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.rc-bundle-price{font-size:14px;font-weight:800;color:#4ade80;flex-shrink:0}',
      '.rc-cta{background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff;border:none;padding:11px;border-radius:10px;font-size:14px;font-weight:800;cursor:pointer;width:100%;margin-bottom:8px}',
      '.rc-cta:hover{opacity:.9}',
      '.rc-dismiss{background:none;border:none;color:rgba(255,255,255,.3);font-size:12px;cursor:pointer;width:100%;text-align:center;padding:4px}',
      '.rc-dismiss:hover{color:rgba(255,255,255,.5)}',
      '.rc-close{position:absolute;top:10px;right:10px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.1);color:rgba(255,255,255,.6);border-radius:6px;width:24px;height:24px;cursor:pointer;font-size:14px;line-height:24px;text-align:center}',
    ].join('');
    document.head.appendChild(s);
  }
  function buildOverlay() {
    if (_overlayEl) return;
    _overlayEl = document.createElement('div');
    _overlayEl.id = 'rcOverlay';
    _overlayEl.innerHTML = [
      '<div id="rcModal">',
      '  <button class="rc-close" id="rcCloseBtn">&times;</button>',
      '  <div class="rc-header">📉 RECOVERY OFFER</div>',
      '  <div class="rc-loss" id="rcLossAmt"></div>',
      '  <div class="rc-msg">Deposit $20 or more and we\'ll match 25% up to $10. One smart move can flip this session.</div>',
      '  <div class="rc-offer-badge">',
      '    <div class="rc-offer-text">🎁 25% MATCH &middot; UP TO $10</div>',
      '    <div class="rc-offer-timer" id="rcTimer"></div>',
      '  </div>',
      '  <div class="rc-bundle-card" id="rcBundleCard" style="display:none">',
      '    <div class="rc-bundle-info">',
      '      <div class="rc-bundle-label">Recommended</div>',
      '      <div class="rc-bundle-name" id="rcBundleName">Gold Bundle</div>',
      '    </div>',
      '    <div class="rc-bundle-price" id="rcBundlePrice"></div>',
      '  </div>',
      '  <button class="rc-cta" id="rcCtaBtn">Claim Offer</button>',
      '  <button class="rc-dismiss" id="rcDismissBtn">Not now</button>',
      '</div>',
    ].join('');
    document.body.appendChild(_overlayEl);
    document.getElementById('rcCloseBtn').onclick = hideRecovery;
    document.getElementById('rcDismissBtn').onclick = dismiss;
    document.getElementById('rcCtaBtn').onclick = handleCTA;
    document.getElementById('rcBundleCard').onclick = handleCTA;
  }
  function startOfferCountdown() {
    if (_countdownInt) clearInterval(_countdownInt);
    var timerEl = document.getElementById('rcTimer');
    _countdownInt = setInterval(function () {
      if (!timerEl) { clearInterval(_countdownInt); return; }
      var diff = _offerExpiresAt - Date.now();
      if (diff <= 0) {
        clearInterval(_countdownInt);
        hideRecovery();
        return;
      }
      var min = Math.floor(diff / 60000);
      var sec = Math.floor((diff % 60000) / 1000);
      timerEl.textContent = 'Expires in ' + min + ':' + (sec < 10 ? '0' : '') + sec;
    }, 1000);
  }
  function showRecovery(lossAmount) {
    if (_recoveryShownThisSession || isSnoozed()) return;
    _recoveryShownThisSession = true;
    var lossEl = document.getElementById('rcLossAmt');
    if (lossEl) lossEl.textContent = "You're down $" + lossAmount.toFixed(2) + ' this session.';
    _offerExpiresAt = Date.now() + 15 * 60 * 1000;
    startOfferCountdown();
    // fetch bundle data
    var token = getToken();
    var headers = token ? { 'Authorization': 'Bearer ' + token } : {};
    fetch('/api/bundles', { headers: headers })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var bundles = data.bundles || data;
        var b = null;
        if (Array.isArray(bundles)) {
          for (var i = 0; i < bundles.length; i++) {
            if (bundles[i].type === 'gold' || bundles[i].badge === 'BEST VALUE') { b = bundles[i]; break; }
          }
          if (!b && bundles.length) b = bundles[bundles.length - 1];
        }
        if (b) {
          var nameEl = document.getElementById('rcBundleName');
          var priceEl = document.getElementById('rcBundlePrice');
          var cardEl = document.getElementById('rcBundleCard');
          if (nameEl) nameEl.textContent = b.name || 'Gold Bundle';
          if (priceEl) priceEl.textContent = b.price ? '$' + parseFloat(b.price).toFixed(2) : '';
          if (cardEl) cardEl.style.display = 'flex';
        }
      })
      .catch(function () {});
    _overlayEl.classList.add('active');
    if (_autoDismissTimer) clearTimeout(_autoDismissTimer);
    _autoDismissTimer = setTimeout(hideRecovery, 30000);
  }
  function hideRecovery() {
    if (_overlayEl) _overlayEl.classList.remove('active');
    if (_countdownInt) clearInterval(_countdownInt);
    if (_autoDismissTimer) clearTimeout(_autoDismissTimer);
  }

  function dismiss() {
    snooze();
    hideRecovery();
  }

  function handleCTA() {
    snooze();
    hideRecovery();
    if (typeof openWalletModal === 'function') { openWalletModal(); return; }
    if (typeof openBundleStore === 'function') { openBundleStore(); }
  }
  function hookOpenSlot() {
    var _prevOpen = window.openSlot;
    window.openSlot = function () {
      _sessionStartBalance = typeof window.balance === 'number'
        ? window.balance
        : (parseFloat(window.balance) || 0);
      _recoveryShownThisSession = false;
      if (_prevOpen) _prevOpen.apply(this, arguments);
    };
  }
  function hookUpdateBalance() {
    var _prevUpdate = window.updateBalance;
    window.updateBalance = function (n) {
      if (_prevUpdate) _prevUpdate.apply(this, arguments);
      if (_sessionStartBalance === null) return;
      var slotModal = document.getElementById('slotModal');
      if (!slotModal || !slotModal.classList.contains('active')) return;
      var current = typeof n === 'number' ? n : (parseFloat(n) || 0);
      var loss = _sessionStartBalance - current;
      if (loss >= 15 && !_recoveryShownThisSession && !isSnoozed()) {
        showRecovery(loss);
      }
    };
  }

  function init() {
    injectStyles();
    buildOverlay();
    hookOpenSlot();
    hookUpdateBalance();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.showRecoveryOffer = showRecovery;
  window.hideRecoveryOffer = hideRecovery;

}());