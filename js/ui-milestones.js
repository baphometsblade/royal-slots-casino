(function () {
  'use strict';

  // helpers
  function getToken() {
    var key = typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken';
    return localStorage.getItem(key) || '';
  }

  var _overlayEl = null;
  var _spinCheckCount = 0;
  var _stylesInjected = false;

  function injectStyles() {
    if (_stylesInjected) return;
    _stylesInjected = true;
    var s = document.createElement('style');
    s.id = 'msStyles';
    s.textContent = [
      '#msClaimOverlay{display:none;position:fixed;inset:0;z-index:10400;background:rgba(0,0,0,.85);backdrop-filter:blur(4px);align-items:center;justify-content:center}',
      '#msClaimOverlay.active{display:flex}',
      '#msClaimModal{background:#0d0d1a;border-radius:16px;border:1px solid rgba(255,215,0,.3);padding:28px;max-width:400px;width:90%;text-align:center;position:relative}',
      '.ms-emoji{font-size:48px;margin-bottom:8px}',
      '.ms-title{font-size:26px;font-weight:900;color:#ffd700;margin-bottom:4px}',
      '.ms-label{font-size:16px;color:rgba(255,255,255,.75);margin-bottom:18px}',
      '.ms-reward{background:linear-gradient(135deg,#1a1a2e,#16213e);border-radius:12px;padding:14px;margin-bottom:18px}',
      '.ms-reward-line{font-size:15px;color:#fff;margin:4px 0}',
      '.ms-reward-line span{color:#ffd700;font-weight:800}',
      '.ms-claim-btn{background:linear-gradient(135deg,#ffd700,#f59e0b);color:#000;border:none;padding:13px 28px;border-radius:10px;font-size:17px;font-weight:900;cursor:pointer;width:100%;margin-bottom:8px}',
      '.ms-claim-btn:hover{opacity:.9}',
      '.ms-dismiss{background:none;border:none;color:rgba(255,255,255,.3);font-size:12px;cursor:pointer;width:100%;padding:4px}',
      '.ms-close{position:absolute;top:10px;right:10px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);color:#fff;border-radius:6px;width:26px;height:26px;cursor:pointer;font-size:15px;line-height:26px;text-align:center}',
      '#msMiniWidget{padding:8px 16px;background:rgba(255,215,0,.05);border-bottom:1px solid rgba(255,215,0,.1);display:flex;align-items:center;gap:10px;font-size:13px;color:rgba(255,255,255,.7)}',
      '#msMiniWidget.ms-hidden{display:none}',
      '.ms-pw-label{flex:0 0 auto;font-weight:700;color:#ffd700}',
      '.ms-pw-bar-wrap{flex:1;background:rgba(255,255,255,.08);border-radius:6px;height:7px;overflow:hidden}',
      '.ms-pw-fill{height:7px;background:linear-gradient(90deg,#ffd700,#f59e0b);border-radius:6px;transition:width .5s}',
      '.ms-pw-count{flex:0 0 auto;font-size:12px;color:rgba(255,255,255,.45);white-space:nowrap}',
    ].join('');
    document.head.appendChild(s);
  }

  function buildClaimOverlay() {
    if (_overlayEl) return;
    _overlayEl = document.createElement('div');
    _overlayEl.id = 'msClaimOverlay';
    _overlayEl.innerHTML = [
      '<div id="msClaimModal">',
      '  <button class="ms-close" id="msCloseBtn">&times;</button>',
      '  <div class="ms-emoji">🎯</div>',
      '  <div class="ms-title">MILESTONE REACHED!</div>',
      '  <div class="ms-label" id="msLabel"></div>',
      '  <div class="ms-reward" id="msReward"></div>',
      '  <button class="ms-claim-btn" id="msClaimBtn">CLAIM REWARD!</button>',
      '  <button class="ms-dismiss" id="msDismissBtn">Claim later</button>',
      '</div>',
    ].join('');
    document.body.appendChild(_overlayEl);
    document.getElementById('msCloseBtn').onclick = hideClaim;
    document.getElementById('msDismissBtn').onclick = hideClaim;
    document.getElementById('msClaimBtn').onclick = handleClaim;
  }

  function showClaimOverlay(data) {
    if (!_overlayEl || !data.pendingMilestone) return;
    var m = data.pendingMilestone;
    var labelEl = document.getElementById('msLabel');
    var rewardEl = document.getElementById('msReward');
    if (labelEl) labelEl.textContent = m.label + ' — ' + m.spins.toLocaleString() + ' Spins';
    if (rewardEl) {
      var lines = [];
      if (m.gems) lines.push('<div class="ms-reward-line">💎 <span>+' + m.gems + ' Gems</span></div>');
      if (m.credits) lines.push('<div class="ms-reward-line">💵 <span>+$' + m.credits.toFixed(2) + ' Credits</span></div>');
      rewardEl.innerHTML = lines.join('');
    }
    _overlayEl.classList.add('active');
    setTimeout(hideClaim, 30000);
  }

  function hideClaim() {
    if (_overlayEl) _overlayEl.classList.remove('active');
  }

  function handleClaim() {
    var token = getToken();
    if (!token) { hideClaim(); return; }
    fetch('/api/milestones/claim', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
    })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        hideClaim();
        if (d.success) {
          if (typeof updateBalance === 'function') updateBalance(d.newBalance);
          var gemStr = d.reward && d.reward.gems ? ' +' + d.reward.gems + ' 💎' : '';
          var credStr = d.reward && d.reward.credits ? ' +$' + d.reward.credits.toFixed(2) : '';
          showToast('🎯 Milestone!' + gemStr + credStr);
          setTimeout(function () { checkStatus(); }, 1000);
        }
      })
      .catch(function () { hideClaim(); });
  }

  function showToast(msg) {
    if (typeof window.showToast === 'function') { window.showToast(msg); return; }
    var t = document.createElement('div');
    t.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#ffd700;color:#000;padding:10px 18px;border-radius:8px;font-weight:800;z-index:10400;font-size:14px;pointer-events:none';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 3500);
  }

  function injectMiniWidget(data) {
    var existing = document.getElementById('msMiniWidget');
    if (existing) existing.remove();
    if (!data.nextMilestone) return;
    var total = data.totalSpins || 0;
    var next = data.nextMilestone;
    // find previous milestone (or 0) for progress calculation
    var allMilestones = [100, 250, 500, 1000, 2500, 5000, 10000];
    var prev = 0;
    for (var i = 0; i < allMilestones.length; i++) {
      if (allMilestones[i] < next) prev = allMilestones[i];
    }
    var pct = prev >= next ? 100 : Math.min(100, Math.round((total - prev) / (next - prev) * 100));
    var widget = document.createElement('div');
    widget.id = 'msMiniWidget';
    widget.innerHTML = [
      '<span class="ms-pw-label">🎯 Next Milestone</span>',
      '<div class="ms-pw-bar-wrap"><div class="ms-pw-fill" style="width:' + pct + '%"></div></div>',
      '<span class="ms-pw-count">' + total.toLocaleString() + ' / ' + next.toLocaleString() + '</span>',
    ].join('');
    // inject before gameGrid or after vipProgressWidget
    var vipW = document.getElementById('vipProgressWidget');
    var gameGrid = document.getElementById('gameGrid');
    if (vipW && vipW.parentNode) {
      vipW.parentNode.insertBefore(widget, vipW.nextSibling);
    } else if (gameGrid && gameGrid.parentNode) {
      gameGrid.parentNode.insertBefore(widget, gameGrid);
    } else {
      document.body.appendChild(widget);
    }
    // hide during slot play
    var slotModal = document.getElementById('slotModal');
    if (slotModal && slotModal.classList.contains('active')) {
      widget.classList.add('ms-hidden');
    }
  }

  function checkStatus() {
    var token = getToken();
    if (!token) return;
    fetch('/api/milestones/status', {
      headers: { 'Authorization': 'Bearer ' + token },
    })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        injectMiniWidget(d);
        if (d.pendingClaim && d.pendingMilestone) {
          showClaimOverlay(d);
        }
      })
      .catch(function () {});
  }

  function hookUpdateBalance() {
    var _prev = window.updateBalance;
    window.updateBalance = function (n) {
      if (_prev) _prev.apply(this, arguments);
      _spinCheckCount++;
      if (_spinCheckCount % 25 === 0) checkStatus();
      // also hide/show widget based on slot state
      var w = document.getElementById('msMiniWidget');
      if (w) {
        var slotModal = document.getElementById('slotModal');
        if (slotModal && slotModal.classList.contains('active')) {
          w.classList.add('ms-hidden');
        } else {
          w.classList.remove('ms-hidden');
        }
      }
    };
  }

  function init() {
    injectStyles();
    buildClaimOverlay();
    hookUpdateBalance();
    setTimeout(checkStatus, 6000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.checkMilestoneStatus = checkStatus;

}());
