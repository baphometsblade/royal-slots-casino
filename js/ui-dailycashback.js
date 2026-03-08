(function() {
  'use strict';

  var TOKEN_KEY = typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken';
  var _overlay = null;
  var _stylesInjected = false;
  var _badge = null;
  var _countUpTimer = null;
  var _soundTimer = null;
  var _coinEls = [];

  function getToken() {
    try { return localStorage.getItem(TOKEN_KEY); } catch(e) { return null; }
  }

  function injectStyles() {
    if (_stylesInjected) return;
    _stylesInjected = true;
    var s = document.createElement('style');
    s.textContent = [
      /* ── overlay ── */
      '#cbOverlay{position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:19500;display:none;align-items:center;justify-content:center}',
      '#cbOverlay.active{display:flex}',
      /* ── badge ── */
      '#cbBadge{position:fixed;top:72px;right:12px;z-index:14000;background:linear-gradient(135deg,#10b981,#059669);color:#fff;font-size:14px;font-weight:800;padding:8px 14px;border-radius:10px;cursor:pointer;box-shadow:0 4px 16px rgba(16,185,129,.55);display:none;animation:cbPulse 2s infinite;letter-spacing:.5px}',
      '#cbBadge .cb-badge-coin{display:inline-block;animation:cbCoinSpin 1.5s linear infinite;margin-right:4px}',
      '@keyframes cbPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.07)}}',
      '@keyframes cbCoinSpin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}'
    ].join('\n');
    document.head.appendChild(s);
  }

  function buildBadge(amount) {
    if (_badge) { _badge.style.display = 'block'; return; }
    _badge = document.createElement('div');
    _badge.id = 'cbBadge';

    /* spinning coin span */
    var coinSpan = document.createElement('span');
    coinSpan.className = 'cb-badge-coin';
    coinSpan.textContent = '\uD83E\uDE99';
    _badge.appendChild(coinSpan);

    /* badge label text node */
    _badge.appendChild(document.createTextNode('\uD83D\uDCB0 CASHBACK $' + amount.toFixed(2)));

    _badge.addEventListener('click', openDailyCashbackModal);
    document.body.appendChild(_badge);
  }

  /* ── count-up animation ── */
  function _cbCountUp(el, targetAmount, duration) {
    if (!el) return;
    if (_countUpTimer) clearInterval(_countUpTimer);
    if (_soundTimer) clearInterval(_soundTimer);
    duration = duration || 1500;
    var steps = Math.ceil(duration / 50);
    var increment = targetAmount / steps;
    var step = 0;

    /* sound ticks every 100ms */
    var soundStep = 0;
    _soundTimer = setInterval(function() {
      soundStep++;
      if (soundStep * 100 >= duration) { clearInterval(_soundTimer); _soundTimer = null; return; }
      if (typeof SoundManager !== 'undefined' && typeof SoundManager.playCounterTick === 'function') {
        try { SoundManager.playCounterTick(); } catch(e) {}
      }
    }, 100);

    _countUpTimer = setInterval(function() {
      step++;
      var current = (step >= steps) ? targetAmount : increment * step;
      el.textContent = '$' + current.toFixed(2);
      if (step >= steps) {
        clearInterval(_countUpTimer);
        _countUpTimer = null;
        clearInterval(_soundTimer);
        _soundTimer = null;
      }
    }, 50);
  }

  /* ── coin rain ── */
  function _spawnCoinRain(container) {
    /* remove any leftover coins */
    _coinEls.forEach(function(c) { if (c.parentNode) c.parentNode.removeChild(c); });
    _coinEls = [];

    var positions = [8, 22, 38, 58, 78]; /* % from left */
    var delays    = [0, 0.25, 0.5, 0.15, 0.4]; /* s */
    var durations = [1.4, 1.2, 1.6, 1.3, 1.5];

    positions.forEach(function(left, i) {
      var coin = document.createElement('span');
      coin.className = 'cb-coin';
      coin.textContent = '\uD83E\uDE99';
      coin.style.left             = left + '%';
      coin.style.animationDelay   = delays[i] + 's';
      coin.style.animationDuration = durations[i] + 's';
      container.appendChild(coin);
      _coinEls.push(coin);
    });

    container.classList.add('cb-coins-active');
    setTimeout(function() {
      container.classList.remove('cb-coins-active');
    }, 2000);
  }

  /* ── modal DOM ── */
  function buildModal() {
    if (_overlay) return;
    _overlay = document.createElement('div');
    _overlay.id = 'cbOverlay';

    var card = document.createElement('div');
    card.className = 'cb-modal-v2';
    card.id = 'cbModal';

    /* coin rain wrapper — coins are injected here */
    var coinWrap = document.createElement('div');
    coinWrap.className = 'cb-coin-wrap';
    coinWrap.id = 'cbCoinWrap';
    card.appendChild(coinWrap);

    /* icon */
    var icon = document.createElement('div');
    icon.style.cssText = 'font-size:42px;margin-bottom:10px;';
    icon.textContent = '\uD83D\uDCB0';
    card.appendChild(icon);

    /* heading */
    var h2 = document.createElement('h2');
    h2.style.cssText = 'color:#10b981;font-size:22px;margin:0 0 6px;font-weight:800;letter-spacing:1px;';
    h2.textContent = 'Daily Cashback Ready!';
    card.appendChild(h2);

    /* label */
    var label = document.createElement('div');
    label.style.cssText = 'font-variant:small-caps;font-size:11px;color:#6ee7b7;letter-spacing:3px;margin-bottom:10px;';
    label.textContent = 'CASHBACK EARNED';
    card.appendChild(label);

    /* amount */
    var amount = document.createElement('div');
    amount.className = 'cb-amount-v2';
    amount.id = 'cbAmount';
    amount.textContent = '$0.00';
    card.appendChild(amount);

    /* sub */
    var sub = document.createElement('div');
    sub.id = 'cbSub';
    sub.style.cssText = 'color:rgba(255,255,255,.45);font-size:13px;margin-bottom:24px;';
    sub.textContent = '5% of your net losses returned';
    card.appendChild(sub);

    /* claim button */
    var btn = document.createElement('button');
    btn.id = 'cbClaimBtn';
    btn.className = 'cb-btn-v2';
    btn.textContent = 'CLAIM CASHBACK';
    btn.addEventListener('click', claimCashback);
    card.appendChild(btn);

    /* claimed checkmark (hidden initially) */
    var check = document.createElement('div');
    check.id = 'cbCheck';
    check.className = 'cb-claimed-check';
    check.textContent = '\u2713';
    card.appendChild(check);

    /* message */
    var msg = document.createElement('div');
    msg.id = 'cbMsg';
    msg.style.cssText = 'margin-top:12px;font-size:13px;color:#34d399;min-height:18px;';
    card.appendChild(msg);

    /* close */
    var closeBtn = document.createElement('button');
    closeBtn.id = 'cbClose';
    closeBtn.style.cssText = 'background:none;border:none;color:rgba(255,255,255,.3);font-size:12px;cursor:pointer;margin-top:12px;text-decoration:underline;';
    closeBtn.textContent = 'Close';
    closeBtn.addEventListener('click', closeDailyCashbackModal);
    card.appendChild(closeBtn);

    _overlay.appendChild(card);
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
        /* premium claim animation */
        if (btn) {
          btn.textContent = '\u2713 CLAIMED!';
          btn.style.background = 'linear-gradient(135deg,#059669,#047857)';
        }
        var check = document.getElementById('cbCheck');
        if (check) check.classList.add('cb-claimed-check--visible');
        /* second coin rain */
        var coinWrap = document.getElementById('cbCoinWrap');
        if (coinWrap) _spawnCoinRain(coinWrap);

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
      var btn2 = document.getElementById('cbClaimBtn');
      if (btn2) { btn2.disabled = false; btn2.textContent = 'CLAIM CASHBACK'; }
    });
  }

  function openDailyCashbackModal() {
    injectStyles();
    buildModal();

    var token = getToken();
    if (!token) return;

    var amountEl = document.getElementById('cbAmount');
    var subEl    = document.getElementById('cbSub');
    var btn      = document.getElementById('cbClaimBtn');
    var msg      = document.getElementById('cbMsg');
    var check    = document.getElementById('cbCheck');
    var coinWrap = document.getElementById('cbCoinWrap');

    if (msg)   msg.textContent = '';
    if (check) check.classList.remove('cb-claimed-check--visible');
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'CLAIM CASHBACK';
      btn.style.background = '';
    }

    _overlay.classList.add('active');

    fetch('/api/dailycashback/status', {
      headers: { 'Authorization': 'Bearer ' + token }
    })
    .then(function(r) { return r.ok ? r.json() : null; })
    .then(function(data) {
      if (!data) return;

      var targetAmount = parseFloat(data.amount) || 0;

      if (data.claimed) {
        if (amountEl) amountEl.textContent = '$' + targetAmount.toFixed(2);
        if (subEl) subEl.textContent = 'Already claimed today.';
        if (btn) { btn.disabled = true; btn.textContent = 'Claimed \u2705'; }
      } else if (!data.eligible) {
        if (amountEl) amountEl.textContent = '$' + targetAmount.toFixed(2);
        if (subEl) subEl.textContent = 'No qualifying losses today.';
        if (btn) btn.disabled = true;
      } else {
        /* eligible — run count-up + coin rain */
        setTimeout(function() {
          _cbCountUp(amountEl, targetAmount, 1500);
          if (coinWrap) _spawnCoinRain(coinWrap);
        }, 300);
      }
    })
    .catch(function() {});
  }

  function closeDailyCashbackModal() {
    if (_overlay) _overlay.classList.remove('active');
    /* stop any in-flight timers */
    if (_countUpTimer) { clearInterval(_countUpTimer); _countUpTimer = null; }
    if (_soundTimer)   { clearInterval(_soundTimer);   _soundTimer   = null; }
  }

  function checkOnLoad() {
    if (new URLSearchParams(window.location.search).get('noBonus') === '1') return;
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

  /* Hook renderGames to check on lobby load */
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

  window.openDailyCashbackModal  = openDailyCashbackModal;
  window.closeDailyCashbackModal = closeDailyCashbackModal;

}());
