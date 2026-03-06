(function() {
  'use strict';

  var TOKEN_KEY = typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken';
  var _overlay = null;
  var _stylesInjected = false;
  var _lastKnownLevel = 0;
  var _checking = false;

  function getToken() {
    try { return localStorage.getItem(TOKEN_KEY); } catch(e) { return null; }
  }

  function injectStyles() {
    if (_stylesInjected) return;
    _stylesInjected = true;
    var s = document.createElement('style');
    s.textContent = [
      '#lubOverlay{position:fixed;inset:0;background:rgba(0,0,0,.88);z-index:20000;display:none;align-items:center;justify-content:center}',
      '#lubOverlay.active{display:flex}',
      '#lubModal{background:linear-gradient(135deg,#0c0a1e,#1a1040);border:2px solid rgba(167,139,250,.5);border-radius:20px;padding:32px 36px;max-width:380px;width:90%;text-align:center;animation:lubPop .4s cubic-bezier(.175,.885,.32,1.275)}',
      '@keyframes lubPop{from{transform:scale(.7);opacity:0}to{transform:scale(1);opacity:1}}',
      '#lubModal .lub-burst{font-size:56px;margin-bottom:8px;animation:lubSpin 1s ease-out}',
      '@keyframes lubSpin{from{transform:rotate(-20deg) scale(.5)}to{transform:rotate(0) scale(1)}}',
      '#lubModal h2{color:#a78bfa;font-size:22px;margin:0 0 4px}',
      '#lubModal .lub-level{font-size:48px;font-weight:900;color:#fbbf24;text-shadow:0 0 24px rgba(251,191,36,.6);margin:8px 0}',
      '#lubModal .lub-sub{color:rgba(255,255,255,.5);font-size:13px;margin-bottom:20px}',
      '#lubModal .lub-reward{background:rgba(167,139,250,.1);border:1px solid rgba(167,139,250,.3);border-radius:10px;padding:14px;margin-bottom:20px}',
      '#lubModal .lub-cash{font-size:32px;font-weight:900;color:#a78bfa;margin:4px 0}',
      '#lubClaimBtn{background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#fff;border:none;padding:14px 40px;border-radius:12px;font-size:16px;font-weight:800;cursor:pointer;width:100%;margin-bottom:8px;transition:transform .1s}',
      '#lubClaimBtn:active{transform:scale(.97)}',
      '#lubClaimBtn:disabled{opacity:.4;cursor:not-allowed}',
      '#lubMsg{font-size:13px;color:#a78bfa;min-height:18px;margin-bottom:8px}',
      '#lubClose{background:none;border:none;color:rgba(255,255,255,.3);font-size:12px;cursor:pointer;text-decoration:underline}'
    ].join('\n');
    document.head.appendChild(s);
  }

  function buildModal() {
    if (_overlay) return;
    _overlay = document.createElement('div');
    _overlay.id = 'lubOverlay';

    var modal = document.createElement('div');
    modal.id = 'lubModal';

    var burst = document.createElement('div');
    burst.className = 'lub-burst';
    burst.textContent = '\uD83C\uDF89';
    modal.appendChild(burst);

    var h2 = document.createElement('h2');
    h2.textContent = 'Level Up!';
    modal.appendChild(h2);

    var levelEl = document.createElement('div');
    levelEl.className = 'lub-level';
    levelEl.id = 'lubLevel';
    levelEl.textContent = '1';
    modal.appendChild(levelEl);

    var sub = document.createElement('div');
    sub.className = 'lub-sub';
    sub.id = 'lubSub';
    sub.textContent = 'You reached a new level!';
    modal.appendChild(sub);

    var reward = document.createElement('div');
    reward.className = 'lub-reward';
    var rewardLabel = document.createElement('div');
    rewardLabel.style.cssText = 'font-size:12px;color:rgba(255,255,255,.5);margin-bottom:4px';
    rewardLabel.textContent = 'Level-Up Bonus';
    reward.appendChild(rewardLabel);
    var cash = document.createElement('div');
    cash.className = 'lub-cash';
    cash.id = 'lubCash';
    cash.textContent = '+$1.00';
    reward.appendChild(cash);
    modal.appendChild(reward);

    var btn = document.createElement('button');
    btn.id = 'lubClaimBtn';
    btn.textContent = '\uD83C\uDF81 CLAIM BONUS';
    btn.addEventListener('click', function() { doClaim(btn); });
    modal.appendChild(btn);

    var msg = document.createElement('div');
    msg.id = 'lubMsg';
    modal.appendChild(msg);

    var close = document.createElement('button');
    close.id = 'lubClose';
    close.textContent = 'Close';
    close.addEventListener('click', closeLevelUpBonus);
    modal.appendChild(close);

    _overlay.appendChild(modal);
    _overlay.addEventListener('click', function(e) {
      if (e.target === _overlay) closeLevelUpBonus();
    });
    document.body.appendChild(_overlay);
  }

  function doClaim(btn) {
    var token = getToken();
    if (!token) return;
    if (btn) { btn.disabled = true; btn.textContent = 'Claiming...'; }
    var msg = document.getElementById('lubMsg');
    if (msg) msg.textContent = '';

    fetch('/api/levelupbonus/claim', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }
    })
    .then(function(r) { return r.ok ? r.json() : null; })
    .then(function(data) {
      if (btn) { btn.disabled = false; btn.textContent = '\uD83C\uDF81 CLAIM BONUS'; }
      if (data && data.success) {
        if (msg) msg.textContent = '\u2705 +$' + parseFloat(data.bonus).toFixed(2) + ' credited!';
        if (typeof window.updateBalance === 'function' && data.newBalance !== null) {
          window.updateBalance(data.newBalance);
        }
        setTimeout(closeLevelUpBonus, 1500);
      } else {
        if (msg) msg.textContent = 'Nothing to claim right now.';
        setTimeout(closeLevelUpBonus, 1200);
      }
    })
    .catch(function() {
      if (btn) { btn.disabled = false; btn.textContent = '\uD83C\uDF81 CLAIM BONUS'; }
      closeLevelUpBonus();
    });
  }

  function openLevelUpBonus(data) {
    injectStyles();
    buildModal();
    var levelEl = document.getElementById('lubLevel');
    var subEl   = document.getElementById('lubSub');
    var cashEl  = document.getElementById('lubCash');
    var msgEl   = document.getElementById('lubMsg');
    if (msgEl) msgEl.textContent = '';
    if (data) {
      if (levelEl) levelEl.textContent = data.currentLevel || '?';
      if (subEl) {
        var gained = data.levelsGained || 1;
        subEl.textContent = gained > 1
          ? 'You gained ' + gained + ' levels!'
          : 'You reached level ' + (data.currentLevel || '?') + '!';
      }
      if (cashEl) cashEl.textContent = '+$' + parseFloat(data.bonusAmount || 1).toFixed(2);
    }
    _overlay.classList.add('active');
  }

  function closeLevelUpBonus() {
    if (_overlay) _overlay.classList.remove('active');
  }

  // Check for unclaimed level-up bonuses after each spin
  function checkLevelUp() {
    var token = getToken();
    if (!token || _checking) return;
    _checking = true;
    fetch('/api/levelupbonus/status', {
      headers: { 'Authorization': 'Bearer ' + token }
    })
    .then(function(r) { return r.ok ? r.json() : null; })
    .then(function(data) {
      _checking = false;
      if (!data || !data.claimable) return;
      // Only show if level actually changed since last check
      if (_lastKnownLevel && data.currentLevel <= _lastKnownLevel) return;
      _lastKnownLevel = data.currentLevel;
      openLevelUpBonus(data);
    })
    .catch(function() { _checking = false; });
  }

  // Hook updateBalance — fires after every spin (balance change = spin happened)
  setTimeout(function() {
    var _ub = window.updateBalance;
    if (typeof _ub === 'function') {
      window.updateBalance = function(newBal) {
        _ub.apply(this, arguments);
        // Small delay so XP has been awarded server-side
        setTimeout(checkLevelUp, 1500);
      };
    }
  }, 2500);

  window.openLevelUpBonus  = openLevelUpBonus;
  window.closeLevelUpBonus = closeLevelUpBonus;

}());
