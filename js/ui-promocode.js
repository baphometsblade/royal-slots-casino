(function() {
  'use strict';

  var TOKEN_KEY = typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken';
  var _overlay = null;
  var _modal = null;
  var _input = null;
  var _resultEl = null;
  var _stylesInjected = false;

  function injectStyles() {
    if (_stylesInjected) return;
    _stylesInjected = true;
    var s = document.createElement('style');
    s.id = 'promoStyles';
    s.textContent = [
      '#promoOverlay{position:fixed;inset:0;background:rgba(0,0,0,.8);z-index:19500;display:none;align-items:center;justify-content:center}',
      '#promoOverlay.active{display:flex}',
      '#promoModal{background:#0d0d1a;border:1px solid rgba(255,255,255,.15);border-radius:16px;padding:28px;max-width:380px;width:90%;text-align:center}',
      '#promoModal h2{color:#ffd700;font-size:20px;margin:0 0 6px}',
      '#promoModal .pm-sub{color:rgba(255,255,255,.5);font-size:13px;margin-bottom:18px}',
      '#promoInput{width:100%;padding:12px 14px;background:#1a1a30;border:1px solid rgba(255,255,255,.15);border-radius:8px;color:#fff;font-size:16px;text-transform:uppercase;letter-spacing:2px;text-align:center;outline:none;box-sizing:border-box}',
      '#promoInput:focus{border-color:rgba(255,215,0,.5)}',
      '#promoInput::placeholder{color:rgba(255,255,255,.25);text-transform:none;letter-spacing:normal}',
      '#promoRedeemBtn{width:100%;margin-top:12px;padding:12px;background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;border:none;border-radius:8px;font-size:15px;font-weight:700;cursor:pointer}',
      '#promoRedeemBtn:hover{opacity:.9}',
      '#promoRedeemBtn:disabled{opacity:.5;cursor:not-allowed}',
      '#promoResult{margin-top:14px;padding:12px;border-radius:8px;font-size:13px;display:none}',
      '#promoResult.success{display:block;background:rgba(16,185,129,.12);border:1px solid rgba(16,185,129,.3);color:#34d399}',
      '#promoResult.error{display:block;background:rgba(239,68,68,.12);border:1px solid rgba(239,68,68,.3);color:#f87171}',
      '#promoClose{background:none;border:none;color:rgba(255,255,255,.35);font-size:13px;cursor:pointer;margin-top:14px;text-decoration:underline}'
    ].join('\n');
    document.head.appendChild(s);
  }

  function buildModal() {
    if (_overlay) return;

    _overlay = document.createElement('div');
    _overlay.id = 'promoOverlay';

    _modal = document.createElement('div');
    _modal.id = 'promoModal';

    var h2 = document.createElement('h2');
    h2.textContent = '\uD83C\uDF9F\uFE0F PROMO CODE';
    _modal.appendChild(h2);

    var sub = document.createElement('div');
    sub.className = 'pm-sub';
    sub.textContent = 'Enter a code to claim your reward';
    _modal.appendChild(sub);

    _input = document.createElement('input');
    _input.id = 'promoInput';
    _input.type = 'text';
    _input.placeholder = 'Enter code...';
    _input.maxLength = 30;
    _input.autocomplete = 'off';
    _modal.appendChild(_input);

    var btn = document.createElement('button');
    btn.id = 'promoRedeemBtn';
    btn.textContent = '\u2728 REDEEM';
    btn.addEventListener('click', redeem);
    _modal.appendChild(btn);

    _resultEl = document.createElement('div');
    _resultEl.id = 'promoResult';
    _modal.appendChild(_resultEl);

    var closeBtn = document.createElement('button');
    closeBtn.id = 'promoClose';
    closeBtn.textContent = 'Close';
    closeBtn.addEventListener('click', closePromoCodeModal);
    _modal.appendChild(closeBtn);

    _overlay.appendChild(_modal);
    document.body.appendChild(_overlay);

    _overlay.addEventListener('click', function(e) {
      if (e.target === _overlay) closePromoCodeModal();
    });

    _input.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') redeem();
    });
  }

  function redeem() {
    var token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;
    var code = _input ? _input.value.trim() : '';
    if (!code) return;

    var btn = document.getElementById('promoRedeemBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'Redeeming...'; }

    _resultEl.className = '';
    _resultEl.style.display = 'none';

    fetch('/api/promocode/redeem', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify({ code: code })
    })
    .then(function(r) { return r.json().then(function(d) { return { ok: r.ok, data: d }; }); })
    .then(function(res) {
      if (btn) { btn.disabled = false; btn.textContent = '\u2728 REDEEM'; }

      if (res.ok && res.data.success) {
        var parts = [];
        if (res.data.reward.gems) parts.push('+' + res.data.reward.gems + ' \uD83D\uDC8E Gems');
        if (res.data.reward.credits) parts.push('+$' + Number(res.data.reward.credits).toFixed(2) + ' Credits');
        _resultEl.textContent = '\uD83C\uDF89 ' + (parts.join(' \u00B7 ') || 'Reward claimed!');
        _resultEl.className = 'success';

        if (res.data.newBalance !== undefined && typeof window.updateBalance === 'function') {
          window.updateBalance(res.data.newBalance);
        }
        if (_input) _input.value = '';
      } else {
        _resultEl.textContent = '\u274C ' + (res.data.error || 'Failed to redeem');
        _resultEl.className = 'error';
      }
    })
    .catch(function() {
      if (btn) { btn.disabled = false; btn.textContent = '\u2728 REDEEM'; }
      _resultEl.textContent = '\u274C Network error. Try again.';
      _resultEl.className = 'error';
    });
  }

  function openPromoCodeModal() {
    injectStyles();
    buildModal();
    _resultEl.className = '';
    _resultEl.style.display = 'none';
    if (_input) _input.value = '';
    _overlay.classList.add('active');
    setTimeout(function() { if (_input) _input.focus(); }, 100);
  }

  function closePromoCodeModal() {
    if (_overlay) _overlay.classList.remove('active');
  }

  // Auto-open if URL has ?promoCode=XXX
  function checkUrlParam() {
    var params = new URLSearchParams(window.location.search);
    var code = params.get('promoCode');
    if (code) {
      openPromoCodeModal();
      if (_input) _input.value = code;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { setTimeout(checkUrlParam, 2000); });
  } else {
    setTimeout(checkUrlParam, 2000);
  }

  window.openPromoCodeModal = openPromoCodeModal;
  window.closePromoCodeModal = closePromoCodeModal;
  // Also alias for the existing nav button that calls openPromoCode
  window.openPromoCode = openPromoCodeModal;

}());
