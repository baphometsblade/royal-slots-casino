(function() {
  'use strict';

  var TOKEN_KEY = typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken';

  var _overlay   = null;
  var _stylesInj = false;
  var _playing   = false;

  function getToken() {
    try { return localStorage.getItem(TOKEN_KEY); } catch(e) { return null; }
  }

  function injectStyles() {
    if (_stylesInj) return;
    _stylesInj = true;
    var s = document.createElement('style');
    s.textContent = [
      '#limboOverlay{position:fixed;inset:0;background:rgba(0,0,0,.93);z-index:10400;display:none;align-items:center;justify-content:center;font-family:monospace}',
      '#limboOverlay.active{display:flex}',
      '#limboModal{background:linear-gradient(135deg,#030712,#0f0520);border:2px solid rgba(139,92,246,.3);border-radius:20px;padding:22px 26px;max-width:420px;width:96%;text-align:center;max-height:96vh;overflow-y:auto}',
      '#limboModal h2{color:#a78bfa;font-size:20px;margin:0 0 2px;letter-spacing:2px}',
      '#limboModal .lb-sub{color:rgba(255,255,255,.35);font-size:11px;margin-bottom:16px}',
      '.lb-display{background:rgba(0,0,0,.5);border-radius:14px;padding:20px 10px;margin-bottom:14px;position:relative;overflow:hidden}',
      '#limboResultNum{font-size:52px;font-weight:900;color:#e0e7ff;line-height:1;transition:color .2s;letter-spacing:-1px}',
      '#limboResultNum.lb-win{color:#4ade80;animation:lbPop .3s ease}',
      '#limboResultNum.lb-lose{color:#f87171;animation:lbShake .3s ease}',
      '@keyframes lbPop{0%,100%{transform:scale(1)}40%{transform:scale(1.2)}}',
      '@keyframes lbShake{0%,100%{transform:translateX(0)}25%{transform:translateX(-6px)}75%{transform:translateX(6px)}}',
      '#limboResultX{font-size:18px;color:rgba(255,255,255,.4);margin-top:2px}',
      '#limboTargetLine{font-size:12px;color:rgba(255,255,255,.3);margin-top:6px}',
      '.lb-controls{display:flex;gap:10px;align-items:center;justify-content:center;margin-bottom:10px;flex-wrap:wrap}',
      '.lb-field{display:flex;flex-direction:column;align-items:center;gap:3px}',
      '.lb-field label{font-size:10px;color:rgba(255,255,255,.35);text-transform:uppercase;letter-spacing:.5px}',
      '.lb-input{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);border-radius:8px;color:#fff;padding:7px 10px;font-size:14px;font-weight:700;width:100px;text-align:center}',
      '.lb-input:focus{outline:none;border-color:rgba(139,92,246,.6)}',
      '.lb-quick{display:flex;gap:6px;justify-content:center;margin-bottom:14px;flex-wrap:wrap}',
      '.lb-quick-btn{background:rgba(139,92,246,.15);border:1px solid rgba(139,92,246,.3);border-radius:7px;color:#c4b5fd;font-size:11px;font-weight:700;padding:4px 10px;cursor:pointer;transition:background .1s}',
      '.lb-quick-btn:hover{background:rgba(139,92,246,.3)}',
      '.lb-win-chance{font-size:11px;color:rgba(255,255,255,.3);margin-bottom:10px}',
      '#limboResult{font-size:14px;font-weight:800;min-height:20px;color:#a5b4fc;margin-bottom:10px}',
      '#limboPlayBtn{background:linear-gradient(135deg,#4c1d95,#5b21b6);color:#fff;border:none;padding:13px 0;border-radius:12px;font-size:16px;font-weight:900;cursor:pointer;width:100%;margin-bottom:6px;letter-spacing:.5px;transition:transform .1s;border:1px solid rgba(139,92,246,.4)}',
      '#limboPlayBtn:hover:not(:disabled){transform:scale(1.02)}',
      '#limboPlayBtn:disabled{opacity:.4;cursor:not-allowed;transform:none}',
      '#limboClose{background:none;border:none;color:rgba(255,255,255,.3);font-size:12px;cursor:pointer;text-decoration:underline}',
    ].join('\n');
    document.head.appendChild(s);
  }

  // ── helpers ─────────────────────────────────────────────────────────────────

  function fmtMultiplier(v) {
    if (v >= 1000000) return '1,000,000.00';
    if (v >= 1000) return v.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return v.toFixed(2);
  }

  function updateWinChance(targetVal) {
    var el = document.getElementById('limboWinChance');
    if (!el) return;
    var pct = Math.min(100, (0.97 / targetVal) * 100);
    el.textContent = 'Win chance: ' + pct.toFixed(2) + '%  |  Payout: ' + fmtMultiplier(targetVal) + 'x';
  }

  function setResult(text, color) {
    var el = document.getElementById('limboResult');
    if (!el) return;
    el.textContent = text;
    el.style.color = color || '#a5b4fc';
  }

  // ── play ─────────────────────────────────────────────────────────────────────

  function doPlay() {
    if (_playing) return;
    var token = getToken();
    if (!token) { setResult('Please log in to play.', '#f87171'); return; }

    var betInput    = document.getElementById('limboBetInput');
    var targetInput = document.getElementById('limboTargetInput');
    var betVal    = betInput    ? parseFloat(betInput.value)    : 1.00;
    var targetVal = targetInput ? parseFloat(targetInput.value) : 2.00;
    if (isNaN(betVal)    || betVal    < 0.25)   betVal    = 0.25;
    if (isNaN(targetVal) || targetVal < 1.01)   targetVal = 1.01;
    if (targetVal > 1000000) targetVal = 1000000;

    _playing = true;
    var playBtn = document.getElementById('limboPlayBtn');
    if (playBtn) { playBtn.disabled = true; playBtn.textContent = 'Rolling\u2026'; }
    setResult('', '');

    // Animate result display to a random-looking roll
    var numEl = document.getElementById('limboResultNum');
    if (numEl) {
      numEl.className = '';
      numEl.textContent = '?';
    }

    fetch('/api/limbo/play', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ bet: betVal, target: targetVal }),
    })
    .then(function(r) { return r.ok ? r.json() : r.json().then(function(e) { throw e; }); })
    .then(function(data) {
      _playing = false;
      if (playBtn) { playBtn.disabled = false; playBtn.textContent = '\u26A1 Roll'; }

      if (typeof window.updateBalance === 'function' && data.newBalance != null) {
        window.updateBalance(data.newBalance);
      }

      // Animate counter
      animateCounter(data.result, data.win, data.target);

      var tgtLine = document.getElementById('limboTargetLine');
      if (tgtLine) {
        tgtLine.textContent = 'Target: \u2265' + fmtMultiplier(data.target) + 'x';
      }

      var msg, color;
      if (data.win) {
        msg   = '\uD83C\uDF89 WIN! +$' + data.profit.toFixed(2) + ' (' + fmtMultiplier(data.target) + 'x)';
        color = '#4ade80';
      } else {
        msg   = '\uD83D\uDCA5 BUST \u2014 result ' + fmtMultiplier(data.result) + 'x < target';
        color = '#f87171';
      }
      setResult(msg, color);
    })
    .catch(function(err) {
      _playing = false;
      if (playBtn) { playBtn.disabled = false; playBtn.textContent = '\u26A1 Roll'; }
      setResult((err && err.error) || 'Error \u2014 check balance.', '#f87171');
    });
  }

  function animateCounter(finalResult, win, target) {
    var numEl = document.getElementById('limboResultNum');
    if (!numEl) return;
    numEl.className = '';

    // Quick random roll then settle on final
    var steps = 8;
    var delay = 40;
    var count = 0;
    var iv = setInterval(function() {
      count++;
      if (count >= steps) {
        clearInterval(iv);
        numEl.textContent = fmtMultiplier(finalResult);
        numEl.className = win ? 'lb-win' : 'lb-lose';
      } else {
        // Random intermediate value
        var fake = 1 + Math.random() * Math.max(finalResult * 1.5, 20);
        numEl.textContent = fmtMultiplier(fake);
      }
    }, delay);
  }

  // ── modal build ──────────────────────────────────────────────────────────────

  function buildModal() {
    if (_overlay) return;
    _overlay = document.createElement('div');
    _overlay.id = 'limboOverlay';

    var modal = document.createElement('div');
    modal.id = 'limboModal';

    var icon = document.createElement('div');
    icon.style.cssText = 'font-size:32px;margin-bottom:2px';
    icon.textContent = '\u26A1';
    modal.appendChild(icon);

    var h2 = document.createElement('h2');
    h2.textContent = 'LIMBO';
    modal.appendChild(h2);

    var sub = document.createElement('div');
    sub.className = 'lb-sub';
    sub.textContent = 'Set your target multiplier — beat it to win!';
    modal.appendChild(sub);

    // Result display
    var display = document.createElement('div');
    display.className = 'lb-display';

    var numEl = document.createElement('div');
    numEl.id = 'limboResultNum';
    numEl.textContent = '?';
    display.appendChild(numEl);

    var xEl = document.createElement('div');
    xEl.id = 'limboResultX';
    xEl.textContent = 'x';
    display.appendChild(xEl);

    var tgtLine = document.createElement('div');
    tgtLine.id = 'limboTargetLine';
    tgtLine.textContent = 'Roll to start!';
    display.appendChild(tgtLine);

    modal.appendChild(display);

    // Controls row: bet + target
    var controls = document.createElement('div');
    controls.className = 'lb-controls';

    var betField = document.createElement('div');
    betField.className = 'lb-field';
    var betLabel = document.createElement('label');
    betLabel.textContent = 'Bet ($)';
    betLabel.htmlFor = 'limboBetInput';
    var betInput = document.createElement('input');
    betInput.id = 'limboBetInput';
    betInput.className = 'lb-input';
    betInput.type = 'number';
    betInput.min = '0.25';
    betInput.max = '500';
    betInput.step = '0.25';
    betInput.value = '5.00';
    betField.appendChild(betLabel);
    betField.appendChild(betInput);
    controls.appendChild(betField);

    var targetField = document.createElement('div');
    targetField.className = 'lb-field';
    var targetLabel = document.createElement('label');
    targetLabel.textContent = 'Target (x)';
    targetLabel.htmlFor = 'limboTargetInput';
    var targetInput = document.createElement('input');
    targetInput.id = 'limboTargetInput';
    targetInput.className = 'lb-input';
    targetInput.type = 'number';
    targetInput.min = '1.01';
    targetInput.max = '1000000';
    targetInput.step = '0.01';
    targetInput.value = '2.00';
    targetInput.addEventListener('input', function() {
      var v = parseFloat(targetInput.value);
      if (!isNaN(v) && v >= 1.01) updateWinChance(v);
    });
    targetField.appendChild(targetLabel);
    targetField.appendChild(targetInput);
    controls.appendChild(targetField);

    modal.appendChild(controls);

    // Quick target presets
    var quick = document.createElement('div');
    quick.className = 'lb-quick';
    var presets = [1.5, 2, 3, 5, 10, 25, 100, 1000];
    presets.forEach(function(p) {
      var btn = document.createElement('button');
      btn.className = 'lb-quick-btn';
      btn.textContent = p + 'x';
      btn.addEventListener('click', function() {
        targetInput.value = p.toFixed(2);
        updateWinChance(p);
      });
      quick.appendChild(btn);
    });
    modal.appendChild(quick);

    // Win chance line
    var wcEl = document.createElement('div');
    wcEl.id = 'limboWinChance';
    wcEl.className = 'lb-win-chance';
    modal.appendChild(wcEl);
    updateWinChance(2.00);

    // Result text
    var resultEl = document.createElement('div');
    resultEl.id = 'limboResult';
    resultEl.textContent = 'Set your target and roll!';
    resultEl.style.color = '#a5b4fc';
    modal.appendChild(resultEl);

    // Play button
    var playBtn = document.createElement('button');
    playBtn.id = 'limboPlayBtn';
    playBtn.textContent = '\u26A1 Roll';
    playBtn.addEventListener('click', doPlay);
    modal.appendChild(playBtn);

    // Close
    var closeBtn = document.createElement('button');
    closeBtn.id = 'limboClose';
    closeBtn.textContent = 'Close';
    closeBtn.addEventListener('click', closeLimbo);
    modal.appendChild(closeBtn);

    _overlay.appendChild(modal);
    _overlay.addEventListener('click', function(e) {
      if (e.target === _overlay) closeLimbo();
    });
    document.body.appendChild(_overlay);
  }

  // ── public API ───────────────────────────────────────────────────────────────

  function openLimbo() {
    injectStyles();
    buildModal();
    _overlay.classList.add('active');
    setResult('Set your target and roll!', '#a5b4fc');
  }

  function closeLimbo() {
    if (_overlay) _overlay.classList.remove('active');
    _playing = false;
  }

  window.openLimbo  = openLimbo;
  window.closeLimbo = closeLimbo;

}());
