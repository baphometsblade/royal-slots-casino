(function() {
  'use strict';

  var TOKEN_KEY = typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken';
  var _overlay = null;
  var _stylesInjected = false;
  var _spinning = false;
  var _countdownTimer = null;

  var SEGMENT_COLORS = ['#7c3aed', '#4c1d95', '#7c3aed', '#4c1d95', '#7c3aed', '#4c1d95', '#7c3aed', '#4c1d95'];

  function injectStyles() {
    if (_stylesInjected) return;
    _stylesInjected = true;
    var s = document.createElement('style');
    s.id = 'vipWheelStyles';
    s.textContent = [
      '#vwOverlay{position:fixed;inset:0;background:rgba(0,0,0,.88);z-index:10400;display:none;align-items:center;justify-content:center}',
      '#vwOverlay.active{display:flex}',
      '#vwModal{background:linear-gradient(160deg,#0d0d1a 0%,#1a1035 100%);border:2px solid rgba(255,215,0,.3);border-radius:20px;padding:28px;max-width:420px;width:92%;text-align:center}',
      '#vwModal h2{color:#ffd700;font-size:22px;margin:0 0 4px}',
      '#vwModal .vw-sub{color:rgba(255,255,255,.5);font-size:12px;margin-bottom:18px}',
      '.vw-wheel-wrap{position:relative;width:260px;height:260px;margin:0 auto 18px}',
      '.vw-wheel{width:260px;height:260px;border-radius:50%;border:4px solid rgba(255,215,0,.5);position:relative;transition:transform 4s cubic-bezier(.17,.67,.12,.99);overflow:hidden}',
      '.vw-segment{position:absolute;width:100%;height:100%;display:flex;align-items:flex-start;justify-content:center;padding-top:18px;font-size:10px;font-weight:700;color:rgba(255,255,255,.9);text-shadow:0 1px 3px rgba(0,0,0,.5)}',
      '.vw-pointer{position:absolute;top:-10px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:10px solid transparent;border-right:10px solid transparent;border-top:18px solid #ffd700;z-index:10400;filter:drop-shadow(0 2px 4px rgba(0,0,0,.5))}',
      '.vw-center-btn{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:60px;height:60px;border-radius:50%;background:linear-gradient(135deg,#ffd700,#f59e0b);border:3px solid rgba(255,255,255,.3);color:#000;font-weight:900;font-size:12px;cursor:pointer;z-index:10400;display:flex;align-items:center;justify-content:center}',
      '.vw-center-btn:hover{opacity:.9}',
      '.vw-center-btn:disabled{opacity:.5;cursor:not-allowed}',
      '#vwPrize{display:none;background:rgba(255,215,0,.08);border:1px solid rgba(255,215,0,.3);border-radius:10px;padding:14px;margin-bottom:14px}',
      '#vwPrize .vw-prize-label{color:rgba(255,255,255,.6);font-size:12px}',
      '#vwPrize .vw-prize-val{color:#ffd700;font-size:22px;font-weight:800;margin-top:4px}',
      '#vwLocked{color:rgba(255,255,255,.5);font-size:14px;margin:20px 0}',
      '#vwCountdown{color:rgba(255,255,255,.45);font-size:13px;margin-top:8px}',
      '#vwClose{background:none;border:none;color:rgba(255,255,255,.35);font-size:13px;cursor:pointer;margin-top:12px;text-decoration:underline}'
    ].join('\n');
    document.head.appendChild(s);
  }

  function buildOverlay() {
    if (_overlay) return;

    _overlay = document.createElement('div');
    _overlay.id = 'vwOverlay';

    var modal = document.createElement('div');
    modal.id = 'vwModal';

    var h2 = document.createElement('h2');
    h2.textContent = '\uD83D\uDC51 VIP WHEEL';
    modal.appendChild(h2);

    var sub = document.createElement('div');
    sub.className = 'vw-sub';
    sub.textContent = 'VIP Level 3+ exclusive \u00B7 One spin per day';
    modal.appendChild(sub);

    // Wheel container
    var wheelWrap = document.createElement('div');
    wheelWrap.className = 'vw-wheel-wrap';

    var pointer = document.createElement('div');
    pointer.className = 'vw-pointer';
    wheelWrap.appendChild(pointer);

    var wheel = document.createElement('div');
    wheel.className = 'vw-wheel';
    wheel.id = 'vwWheel';

    // Build segments with conic-gradient
    var gradientParts = [];
    var segAngle = 360 / 8;
    for (var i = 0; i < 8; i++) {
      var start = i * segAngle;
      var end = (i + 1) * segAngle;
      gradientParts.push(SEGMENT_COLORS[i] + ' ' + start + 'deg ' + end + 'deg');
    }
    wheel.style.background = 'conic-gradient(' + gradientParts.join(', ') + ')';

    // Prize labels positioned absolutely
    var prizeLabels = ['500 Gems', '$2', '1K Gems', '$5', '2.5K Gems', '$10', '5K Gems', '$25'];
    for (var j = 0; j < 8; j++) {
      var seg = document.createElement('div');
      seg.className = 'vw-segment';
      seg.style.transform = 'rotate(' + (j * segAngle + segAngle / 2) + 'deg)';
      seg.textContent = prizeLabels[j];
      wheel.appendChild(seg);
    }

    wheelWrap.appendChild(wheel);

    // Center spin button
    var centerBtn = document.createElement('button');
    centerBtn.className = 'vw-center-btn';
    centerBtn.id = 'vwSpinBtn';
    centerBtn.textContent = 'SPIN';
    centerBtn.addEventListener('click', spinWheel);
    wheelWrap.appendChild(centerBtn);

    modal.appendChild(wheelWrap);

    // Locked message
    var locked = document.createElement('div');
    locked.id = 'vwLocked';
    locked.style.display = 'none';
    locked.textContent = '\uD83D\uDD12 Reach VIP Level 3 to unlock!';
    modal.appendChild(locked);

    // Prize display
    var prizeEl = document.createElement('div');
    prizeEl.id = 'vwPrize';
    var prizeLabel = document.createElement('div');
    prizeLabel.className = 'vw-prize-label';
    prizeLabel.textContent = '\uD83C\uDF89 You won!';
    var prizeVal = document.createElement('div');
    prizeVal.className = 'vw-prize-val';
    prizeVal.id = 'vwPrizeVal';
    prizeEl.appendChild(prizeLabel);
    prizeEl.appendChild(prizeVal);
    modal.appendChild(prizeEl);

    // Countdown
    var countdown = document.createElement('div');
    countdown.id = 'vwCountdown';
    modal.appendChild(countdown);

    // Close
    var closeBtn = document.createElement('button');
    closeBtn.id = 'vwClose';
    closeBtn.textContent = 'Close';
    closeBtn.addEventListener('click', closeVipWheelModal);
    modal.appendChild(closeBtn);

    _overlay.appendChild(modal);
    document.body.appendChild(_overlay);

    _overlay.addEventListener('click', function(e) {
      if (e.target === _overlay && !_spinning) closeVipWheelModal();
    });
  }

  function spinWheel() {
    if (_spinning) return;
    var token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;
    _spinning = true;

    var btn = document.getElementById('vwSpinBtn');
    if (btn) { btn.disabled = true; btn.textContent = '...'; }

    fetch('/api/vipwheel/spin', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token }
    })
    .then(function(r) { return r.ok ? r.json() : r.json().then(function(d) { return { error: d.error }; }); })
    .then(function(data) {
      if (data.error) {
        _spinning = false;
        if (btn) { btn.disabled = false; btn.textContent = 'SPIN'; }
        return;
      }

      // Calculate rotation angle
      var segAngle = 360 / 8;
      var targetAngle = 360 - (data.prizeIndex * segAngle + segAngle / 2);
      var totalRotation = 360 * 5 + targetAngle; // 5 full rotations + target

      var wheel = document.getElementById('vwWheel');
      if (wheel) {
        wheel.style.transition = 'transform 4s cubic-bezier(.17,.67,.12,.99)';
        wheel.style.transform = 'rotate(' + totalRotation + 'deg)';
      }

      setTimeout(function() {
        _spinning = false;
        // Show prize
        var prizeEl = document.getElementById('vwPrize');
        var prizeVal = document.getElementById('vwPrizeVal');
        if (prizeVal) prizeVal.textContent = data.prize.label;
        if (prizeEl) prizeEl.style.display = 'block';
        if (btn) btn.style.display = 'none';

        if (data.newBalance !== undefined && typeof window.updateBalance === 'function') {
          window.updateBalance(data.newBalance);
        }
      }, 4200);
    })
    .catch(function() {
      _spinning = false;
      if (btn) { btn.disabled = false; btn.textContent = 'SPIN'; }
    });
  }

  function startCountdown(endsAt) {
    if (_countdownTimer) clearInterval(_countdownTimer);
    var el = document.getElementById('vwCountdown');
    if (!el || !endsAt) return;
    function tick() {
      var diff = Math.max(0, Math.floor((new Date(endsAt) - Date.now()) / 1000));
      var h = Math.floor(diff / 3600);
      var m = Math.floor((diff % 3600) / 60);
      var s = diff % 60;
      el.textContent = 'Next spin in ' + String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
    }
    tick();
    _countdownTimer = setInterval(tick, 1000);
  }

  function openVipWheelModal() {
    injectStyles();
    buildOverlay();

    // Reset state
    var wheel = document.getElementById('vwWheel');
    if (wheel) { wheel.style.transition = 'none'; wheel.style.transform = 'rotate(0deg)'; }
    var prizeEl = document.getElementById('vwPrize');
    if (prizeEl) prizeEl.style.display = 'none';
    var locked = document.getElementById('vwLocked');
    if (locked) locked.style.display = 'none';
    var countdown = document.getElementById('vwCountdown');
    if (countdown) countdown.textContent = '';
    var btn = document.getElementById('vwSpinBtn');
    if (btn) { btn.style.display = 'flex'; btn.disabled = false; btn.textContent = 'SPIN'; }
    if (_countdownTimer) { clearInterval(_countdownTimer); _countdownTimer = null; }

    var token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      fetch('/api/vipwheel/status', {
        headers: { 'Authorization': 'Bearer ' + token }
      })
      .then(function(r) { return r.ok ? r.json() : null; })
      .then(function(data) {
        if (!data) return;
        if (!data.eligible) {
          if (locked) locked.style.display = 'block';
          if (btn) btn.style.display = 'none';
        } else if (!data.available && data.cooldownEnds) {
          if (btn) { btn.disabled = true; btn.textContent = 'WAIT'; }
          startCountdown(data.cooldownEnds);
        }
      })
      .catch(function() {});
    }

    _overlay.classList.add('active');
  }

  function closeVipWheelModal() {
    if (_spinning) return;
    if (_overlay) _overlay.classList.remove('active');
    if (_countdownTimer) { clearInterval(_countdownTimer); _countdownTimer = null; }
  }

  window.openVipWheelModal = openVipWheelModal;
  window.closeVipWheelModal = closeVipWheelModal;

}());
