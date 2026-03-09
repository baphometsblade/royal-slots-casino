(function() {
  'use strict';

  var TOKEN_KEY = typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken';

  var _overlay  = null;
  var _stylesInj = false;
  var _flipping  = false;
  var _pick      = 'heads';

  function getToken() {
    try { return localStorage.getItem(TOKEN_KEY); } catch(e) { return null; }
  }

  function injectStyles() {
    if (_stylesInj) return;
    _stylesInj = true;
    var s = document.createElement('style');
    s.textContent = [
      '#cfOverlay{position:fixed;inset:0;background:rgba(0,0,0,.93);z-index:10400;display:none;align-items:center;justify-content:center;font-family:monospace}',
      '#cfOverlay.active{display:flex}',
      '#cfModal{background:linear-gradient(135deg,#0a0a0a,#1a1208);border:2px solid rgba(234,179,8,.3);border-radius:20px;padding:22px 26px;max-width:380px;width:96%;text-align:center;max-height:96vh;overflow-y:auto}',
      '#cfModal h2{color:#eab308;font-size:20px;margin:0 0 2px;letter-spacing:2px}',
      '#cfModal .cf-sub{color:rgba(255,255,255,.35);font-size:11px;margin-bottom:16px}',
      '.cf-coin-wrap{perspective:600px;width:110px;height:110px;margin:0 auto 16px}',
      '.cf-coin{width:110px;height:110px;position:relative;transform-style:preserve-3d;transition:transform .7s ease-in-out}',
      '.cf-coin.cf-flip-heads{animation:cfFlipH .7s ease-in-out forwards}',
      '.cf-coin.cf-flip-tails{animation:cfFlipT .7s ease-in-out forwards}',
      '@keyframes cfFlipH{0%{transform:rotateY(0)}50%{transform:rotateY(900deg)}100%{transform:rotateY(1080deg)}}',
      '@keyframes cfFlipT{0%{transform:rotateY(0)}50%{transform:rotateY(900deg)}100%{transform:rotateY(1260deg)}}',
      '.cf-face{position:absolute;width:100%;height:100%;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:42px;backface-visibility:hidden;border:4px solid rgba(234,179,8,.5);box-shadow:0 0 18px rgba(234,179,8,.25)}',
      '.cf-heads{background:radial-gradient(circle at 35% 35%,#fde68a,#d97706);transform:rotateY(0deg)}',
      '.cf-tails{background:radial-gradient(circle at 35% 35%,#d1d5db,#6b7280);transform:rotateY(180deg)}',
      '.cf-pick-row{display:flex;gap:10px;justify-content:center;margin-bottom:14px}',
      '.cf-pick-btn{flex:1;padding:12px 6px;border-radius:12px;border:2px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06);color:rgba(255,255,255,.6);font-size:20px;cursor:pointer;transition:all .15s}',
      '.cf-pick-btn.cf-sel{background:rgba(234,179,8,.2);border-color:#eab308;color:#fef08a}',
      '.cf-pick-btn:disabled{opacity:.4;cursor:not-allowed}',
      '.cf-streak{font-size:11px;color:rgba(255,255,255,.3);margin-bottom:10px;min-height:16px}',
      '.cf-input-row{display:flex;gap:10px;align-items:center;justify-content:center;margin-bottom:12px}',
      '.cf-input-row label{font-size:10px;color:rgba(255,255,255,.35);text-transform:uppercase;letter-spacing:.5px}',
      '.cf-input{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);border-radius:8px;color:#fff;padding:7px 10px;font-size:14px;font-weight:700;width:90px;text-align:center}',
      '.cf-input:focus{outline:none;border-color:rgba(234,179,8,.6)}',
      '#cfFlipBtn{background:linear-gradient(135deg,#713f12,#92400e);color:#fff;border:1px solid rgba(234,179,8,.4);padding:13px 0;border-radius:12px;font-size:16px;font-weight:900;cursor:pointer;width:100%;margin-bottom:6px;letter-spacing:.5px;transition:transform .1s}',
      '#cfFlipBtn:hover:not(:disabled){transform:scale(1.02)}',
      '#cfFlipBtn:disabled{opacity:.4;cursor:not-allowed;transform:none}',
      '#cfResult{font-size:15px;font-weight:800;min-height:22px;color:#a5b4fc;margin-bottom:8px}',
      '#cfClose{background:none;border:none;color:rgba(255,255,255,.3);font-size:12px;cursor:pointer;text-decoration:underline}',
    ].join('\n');
    document.head.appendChild(s);
  }

  // ── state ────────────────────────────────────────────────────────────────────

  var _streak = 0;

  function setResult(text, color) {
    var el = document.getElementById('cfResult');
    if (!el) return;
    el.textContent = text;
    el.style.color = color || '#a5b4fc';
  }

  function updateStreak(win) {
    if (win) {
      _streak = _streak > 0 ? _streak + 1 : 1;
    } else {
      _streak = _streak < 0 ? _streak - 1 : -1;
    }
    var el = document.getElementById('cfStreak');
    if (!el) return;
    if (_streak >= 2) {
      el.textContent = '\uD83D\uDD25 ' + _streak + '-win streak!';
      el.style.color = '#4ade80';
    } else if (_streak <= -2) {
      el.textContent = '\uD83E\uDD21 ' + Math.abs(_streak) + '-loss streak';
      el.style.color = '#f87171';
    } else {
      el.textContent = '';
    }
  }

  function selectPick(which) {
    if (_flipping) return;
    _pick = which;
    var h = document.getElementById('cfPickHeads');
    var t = document.getElementById('cfPickTails');
    if (h) h.classList.toggle('cf-sel', which === 'heads');
    if (t) t.classList.toggle('cf-sel', which === 'tails');
  }

  // ── flip ─────────────────────────────────────────────────────────────────────

  function doFlip() {
    if (_flipping) return;
    var token = getToken();
    if (!token) { setResult('Please log in to play.', '#f87171'); return; }

    var betInput = document.getElementById('cfBetInput');
    var betVal   = betInput ? parseFloat(betInput.value) : 5.00;
    if (isNaN(betVal) || betVal < 0.25) betVal = 0.25;

    _flipping = true;
    var flipBtn = document.getElementById('cfFlipBtn');
    if (flipBtn) { flipBtn.disabled = true; flipBtn.textContent = 'Flipping\u2026'; }
    var hBtn = document.getElementById('cfPickHeads');
    var tBtn = document.getElementById('cfPickTails');
    if (hBtn) hBtn.disabled = true;
    if (tBtn) tBtn.disabled = true;
    setResult('', '');

    // Start coin spinning animation immediately
    var coin = document.getElementById('cfCoin');
    if (coin) {
      coin.className = 'cf-coin';   // reset
      void coin.offsetWidth;        // force reflow
    }

    fetch('/api/coinflip/play', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ bet: betVal, pick: _pick }),
    })
    .then(function(r) { return r.ok ? r.json() : r.json().then(function(e) { throw e; }); })
    .then(function(data) {
      // Apply flip animation based on result
      if (coin) {
        coin.className = 'cf-coin cf-flip-' + data.result;
      }

      setTimeout(function() {
        _flipping = false;
        if (flipBtn) { flipBtn.disabled = false; flipBtn.textContent = '\uD83E\uDE99 Flip!'; }
        if (hBtn) hBtn.disabled = false;
        if (tBtn) tBtn.disabled = false;

        if (typeof window.updateBalance === 'function' && data.newBalance != null) {
          window.updateBalance(data.newBalance);
        }

        updateStreak(data.win);

        var face = document.getElementById('cfFaceLabel');
        if (face) face.textContent = data.result === 'heads' ? '\uD83E\uDE99' : '\uD83E\uDE99';

        var msg, color;
        if (data.win) {
          msg   = '\uD83C\uDF89 ' + cap(data.result) + '! +$' + data.profit.toFixed(2) + ' (2x)';
          color = '#4ade80';
        } else {
          msg   = '\uD83D\uDCA5 ' + cap(data.result) + ' \u2014 you lose';
          color = '#f87171';
        }
        setResult(msg, color);
      }, 750);
    })
    .catch(function(err) {
      _flipping = false;
      if (flipBtn) { flipBtn.disabled = false; flipBtn.textContent = '\uD83E\uDE99 Flip!'; }
      if (hBtn) hBtn.disabled = false;
      if (tBtn) tBtn.disabled = false;
      setResult((err && err.error) || 'Error \u2014 check balance.', '#f87171');
    });
  }

  function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }

  // ── modal build ──────────────────────────────────────────────────────────────

  function buildModal() {
    if (_overlay) return;
    _overlay = document.createElement('div');
    _overlay.id = 'cfOverlay';

    var modal = document.createElement('div');
    modal.id = 'cfModal';

    var h2 = document.createElement('h2');
    h2.textContent = 'COINFLIP';
    modal.appendChild(h2);

    var sub = document.createElement('div');
    sub.className = 'cf-sub';
    sub.textContent = 'Call it \u2014 Heads or Tails? Win 2x your bet!';
    modal.appendChild(sub);

    // Coin display
    var coinWrap = document.createElement('div');
    coinWrap.className = 'cf-coin-wrap';

    var coin = document.createElement('div');
    coin.id = 'cfCoin';
    coin.className = 'cf-coin';

    var heads = document.createElement('div');
    heads.className = 'cf-face cf-heads';
    heads.id = 'cfFaceLabel';
    heads.textContent = '\uD83E\uDE99';

    var tails = document.createElement('div');
    tails.className = 'cf-face cf-tails';
    tails.textContent = '\u2605';

    coin.appendChild(heads);
    coin.appendChild(tails);
    coinWrap.appendChild(coin);
    modal.appendChild(coinWrap);

    // Pick buttons
    var pickRow = document.createElement('div');
    pickRow.className = 'cf-pick-row';

    var headsBtn = document.createElement('button');
    headsBtn.id = 'cfPickHeads';
    headsBtn.className = 'cf-pick-btn cf-sel';
    var hLine1 = document.createElement('div');
    hLine1.textContent = '\uD83E\uDE99';
    var hLine2 = document.createElement('div');
    hLine2.style.cssText = 'font-size:11px;margin-top:2px;font-weight:800';
    hLine2.textContent = 'HEADS';
    headsBtn.appendChild(hLine1);
    headsBtn.appendChild(hLine2);
    headsBtn.addEventListener('click', function() { selectPick('heads'); });
    pickRow.appendChild(headsBtn);

    var tailsBtn = document.createElement('button');
    tailsBtn.id = 'cfPickTails';
    tailsBtn.className = 'cf-pick-btn';
    var tLine1 = document.createElement('div');
    tLine1.textContent = '\u2B50';
    var tLine2 = document.createElement('div');
    tLine2.style.cssText = 'font-size:11px;margin-top:2px;font-weight:800';
    tLine2.textContent = 'TAILS';
    tailsBtn.appendChild(tLine1);
    tailsBtn.appendChild(tLine2);
    tailsBtn.addEventListener('click', function() { selectPick('tails'); });
    pickRow.appendChild(tailsBtn);

    modal.appendChild(pickRow);

    // Streak display
    var streakEl = document.createElement('div');
    streakEl.id = 'cfStreak';
    streakEl.className = 'cf-streak';
    modal.appendChild(streakEl);

    // Bet input
    var inputRow = document.createElement('div');
    inputRow.className = 'cf-input-row';
    var betLabel = document.createElement('label');
    betLabel.textContent = 'Bet ($)';
    betLabel.htmlFor = 'cfBetInput';
    var betInput = document.createElement('input');
    betInput.id = 'cfBetInput';
    betInput.className = 'cf-input';
    betInput.type = 'number';
    betInput.min = '0.25';
    betInput.max = '1000';
    betInput.step = '0.25';
    betInput.value = '5.00';
    inputRow.appendChild(betLabel);
    inputRow.appendChild(betInput);
    modal.appendChild(inputRow);

    // Flip button
    var flipBtn = document.createElement('button');
    flipBtn.id = 'cfFlipBtn';
    flipBtn.textContent = '\uD83E\uDE99 Flip!';
    flipBtn.addEventListener('click', doFlip);
    modal.appendChild(flipBtn);

    // Result
    var resultEl = document.createElement('div');
    resultEl.id = 'cfResult';
    resultEl.textContent = 'Pick a side and flip!';
    resultEl.style.color = '#eab308';
    modal.appendChild(resultEl);

    // Close
    var closeBtn = document.createElement('button');
    closeBtn.id = 'cfClose';
    closeBtn.textContent = 'Close';
    closeBtn.addEventListener('click', closeCoinflip);
    modal.appendChild(closeBtn);

    _overlay.appendChild(modal);
    _overlay.addEventListener('click', function(e) {
      if (e.target === _overlay) closeCoinflip();
    });
    document.body.appendChild(_overlay);
  }

  // ── public API ───────────────────────────────────────────────────────────────

  function openCoinflip() {
    injectStyles();
    buildModal();
    _overlay.classList.add('active');
    selectPick('heads');
    setResult('Pick a side and flip!', '#eab308');
  }

  function closeCoinflip() {
    if (_overlay) _overlay.classList.remove('active');
    _flipping = false;
  }

  window.openCoinflip  = openCoinflip;
  window.closeCoinflip = closeCoinflip;

}());
