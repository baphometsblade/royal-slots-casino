(function() {
  'use strict';

  var TOKEN_KEY = typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken';
  var _overlay = null;
  var _stylesInjected = false;
  var _spinning = false;

  // Mirror of server segment list (labels only — amounts come from server response)
  var SEGMENT_LABELS = [
    '$0.25 Cash', '$0.25 Cash', '$0.50 Cash', '$0.50 Cash',
    '$1.00 Cash', '50 Points', '100 Points', '3 Free Spins'
  ];
  var SEGMENT_COLORS = [
    '#6366f1','#818cf8','#4f46e5','#7c3aed',
    '#a855f7','#f59e0b','#d97706','#10b981'
  ];

  function getToken() {
    try { return localStorage.getItem(TOKEN_KEY); } catch(e) { return null; }
  }

  function injectStyles() {
    if (_stylesInjected) return;
    _stylesInjected = true;
    var s = document.createElement('style');
    s.textContent = [
      '#fwOverlay{position:fixed;inset:0;background:rgba(0,0,0,.88);z-index:19500;display:none;align-items:center;justify-content:center}',
      '#fwOverlay.active{display:flex}',
      '#fwModal{background:linear-gradient(135deg,#080818,#1a1035);border:2px solid rgba(99,102,241,.4);border-radius:20px;padding:28px 32px;max-width:420px;width:92%;text-align:center}',
      '#fwModal h2{color:#818cf8;font-size:20px;margin:0 0 4px}',
      '#fwModal .fw-sub{color:rgba(255,255,255,.4);font-size:13px;margin-bottom:20px}',
      '#fwCanvas{display:block;margin:0 auto 20px;border-radius:50%;box-shadow:0 0 30px rgba(99,102,241,.5)}',
      '#fwPointer{font-size:28px;margin-bottom:6px;display:block}',
      '#fwSpinBtn{background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;border:none;padding:14px 40px;border-radius:12px;font-size:16px;font-weight:800;cursor:pointer;width:100%;margin-bottom:8px;transition:transform .1s}',
      '#fwSpinBtn:active{transform:scale(.97)}',
      '#fwSpinBtn:disabled{opacity:.4;cursor:not-allowed}',
      '#fwResult{font-size:16px;font-weight:800;color:#a5b4fc;min-height:22px;margin-bottom:10px}',
      '#fwClose{background:none;border:none;color:rgba(255,255,255,.3);font-size:12px;cursor:pointer;text-decoration:underline}',
      '#fwCooldown{font-size:13px;color:rgba(255,255,255,.4);margin-top:8px}'
    ].join('\n');
    document.head.appendChild(s);
  }

  function drawWheel(canvas, rotation) {
    var ctx = canvas.getContext('2d');
    var w = canvas.width;
    var cx = w / 2, cy = w / 2, r = cx - 4;
    var n = SEGMENT_LABELS.length;
    var arc = (2 * Math.PI) / n;
    ctx.clearRect(0, 0, w, w);

    for (var i = 0; i < n; i++) {
      var start = rotation + i * arc;
      var end = start + arc;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, start, end);
      ctx.closePath();
      ctx.fillStyle = SEGMENT_COLORS[i];
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.15)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Label
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(start + arc / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px monospace';
      ctx.shadowColor = 'rgba(0,0,0,.6)';
      ctx.shadowBlur = 3;
      ctx.fillText(SEGMENT_LABELS[i], r - 8, 4);
      ctx.restore();
    }

    // Center hub
    ctx.beginPath();
    ctx.arc(cx, cy, 14, 0, 2 * Math.PI);
    ctx.fillStyle = '#1e1b4b';
    ctx.fill();
    ctx.strokeStyle = 'rgba(165,180,252,.6)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  function animateSpin(canvas, targetSegment, onDone) {
    var n = SEGMENT_LABELS.length;
    var arc = (2 * Math.PI) / n;
    // Full rotations + land on target segment
    var fullRots = (5 + Math.floor(Math.random() * 4)) * 2 * Math.PI;
    // Target: pointer is at top (0), segment i occupies i*arc to (i+1)*arc
    // We want center of targetSegment to be at top
    var targetAngle = -(targetSegment * arc + arc / 2);
    var totalAngle = fullRots + targetAngle;
    var startTime = null;
    var duration = 3500;
    var startRot = 0;

    function ease(t) {
      // Ease out cubic
      return 1 - Math.pow(1 - t, 3);
    }

    function frame(ts) {
      if (!startTime) startTime = ts;
      var elapsed = ts - startTime;
      var t = Math.min(elapsed / duration, 1);
      var rot = startRot + totalAngle * ease(t);
      drawWheel(canvas, rot);
      if (t < 1) {
        requestAnimationFrame(frame);
      } else {
        onDone();
      }
    }
    requestAnimationFrame(frame);
  }

  function buildModal() {
    if (_overlay) return;
    _overlay = document.createElement('div');
    _overlay.id = 'fwOverlay';

    var modal = document.createElement('div');
    modal.id = 'fwModal';

    var icon = document.createElement('div');
    icon.style.cssText = 'font-size:32px;margin-bottom:6px';
    icon.textContent = '\uD83C\uDFAE';
    modal.appendChild(icon);

    var h2 = document.createElement('h2');
    h2.textContent = 'Fortune Wheel';
    modal.appendChild(h2);

    var sub = document.createElement('div');
    sub.className = 'fw-sub';
    sub.textContent = 'Free daily spin — win cash, points or free spins!';
    modal.appendChild(sub);

    // Pointer
    var pointer = document.createElement('span');
    pointer.id = 'fwPointer';
    pointer.textContent = '\u25BC';
    pointer.style.color = '#fbbf24';
    modal.appendChild(pointer);

    // Canvas
    var canvas = document.createElement('canvas');
    canvas.id = 'fwCanvas';
    canvas.width = 260;
    canvas.height = 260;
    modal.appendChild(canvas);

    var result = document.createElement('div');
    result.id = 'fwResult';
    modal.appendChild(result);

    var btn = document.createElement('button');
    btn.id = 'fwSpinBtn';
    btn.textContent = '\uD83C\uDF00 SPIN!';
    btn.addEventListener('click', function() { doSpin(canvas, btn, result); });
    modal.appendChild(btn);

    var cooldown = document.createElement('div');
    cooldown.id = 'fwCooldown';
    modal.appendChild(cooldown);

    var close = document.createElement('button');
    close.id = 'fwClose';
    close.textContent = 'Close';
    close.addEventListener('click', closeFortuneWheel);
    modal.appendChild(close);

    _overlay.appendChild(modal);
    _overlay.addEventListener('click', function(e) {
      if (e.target === _overlay) closeFortuneWheel();
    });
    document.body.appendChild(_overlay);

    // Initial draw
    drawWheel(canvas, 0);
  }

  function doSpin(canvas, btn, result) {
    var token = getToken();
    if (!token || _spinning) return;
    _spinning = true;
    if (btn) { btn.disabled = true; btn.textContent = 'Spinning...'; }
    if (result) result.textContent = '';

    fetch('/api/fortunewheel/spin', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }
    })
    .then(function(r) { return r.ok ? r.json() : null; })
    .then(function(data) {
      if (!data || !data.success) {
        _spinning = false;
        if (btn) { btn.disabled = true; }
        var cooldownEl = document.getElementById('fwCooldown');
        if (cooldownEl) cooldownEl.textContent = 'You\'ve already spun today. Come back tomorrow!';
        if (result) result.textContent = 'Already used today.';
        return;
      }
      var segIdx = data.segmentIndex || 0;
      animateSpin(canvas, segIdx, function() {
        _spinning = false;
        if (btn) { btn.disabled = true; btn.textContent = '\u2713 Spun!'; }
        var rewardTxt = data.reward
          ? (data.reward.type === 'cash'
              ? '\uD83D\uDCB0 You won $' + parseFloat(data.reward.amount).toFixed(2) + '!'
              : data.reward.type === 'points'
                ? '\u2B50 You won ' + data.reward.amount + ' loyalty points!'
                : '\uD83C\uDFB0 You won ' + data.reward.amount + ' free spins!')
          : 'Reward credited!';
        if (result) result.textContent = rewardTxt;
        if (typeof window.updateBalance === 'function' && data.newBalance !== null) {
          window.updateBalance(data.newBalance);
        }
        var cooldownEl = document.getElementById('fwCooldown');
        if (cooldownEl) cooldownEl.textContent = 'See you tomorrow for your next free spin!';
      });
    })
    .catch(function() {
      _spinning = false;
      if (btn) { btn.disabled = false; btn.textContent = '\uD83C\uDF00 SPIN!'; }
    });
  }

  function openFortuneWheel() {
    injectStyles();
    buildModal();
    var token = getToken();
    var btn = document.getElementById('fwSpinBtn');
    var cooldownEl = document.getElementById('fwCooldown');
    var canvas = document.getElementById('fwCanvas');

    if (!token) {
      if (btn) btn.disabled = true;
      return;
    }

    // Check availability
    fetch('/api/fortunewheel/status', {
      headers: { 'Authorization': 'Bearer ' + token }
    })
    .then(function(r) { return r.ok ? r.json() : null; })
    .then(function(data) {
      if (!data) return;
      if (!data.available) {
        if (btn) { btn.disabled = true; btn.textContent = '\u2713 Spun today'; }
        if (cooldownEl) cooldownEl.textContent = 'Come back tomorrow for your next free spin!';
      }
      // Draw wheel with segments from server (labels already in SEGMENT_LABELS)
      if (canvas) drawWheel(canvas, 0);
    })
    .catch(function() {});

    _overlay.classList.add('active');
  }

  function closeFortuneWheel() {
    if (_overlay) _overlay.classList.remove('active');
  }

  window.openFortuneWheel  = openFortuneWheel;
  window.closeFortuneWheel = closeFortuneWheel;

}());
