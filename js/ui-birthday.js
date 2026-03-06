(function () {
  'use strict';

  var TOKEN_KEY = typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken';
  var _overlay  = null;
  var _checked  = false;
  var _stylesDone = false;

  function getToken() { return localStorage.getItem(TOKEN_KEY) || ''; }

  function injectStyles() {
    if (_stylesDone) return;
    _stylesDone = true;
    var s = document.createElement('style');
    s.textContent = [
      '#bdayOverlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:19800;',
      'align-items:center;justify-content:center}',
      '#bdayOverlay.active{display:flex}',
      '#bdayModal{background:linear-gradient(160deg,#1a0533,#0d0d1a);',
      'border:2px solid rgba(251,191,36,.45);border-radius:20px;padding:32px 28px;',
      'width:min(400px,94vw);text-align:center;animation:bdayPop .4s cubic-bezier(.34,1.56,.64,1)}',
      '@keyframes bdayPop{from{opacity:0;transform:scale(.85)}to{opacity:1;transform:none}}',
      '#bdayModal .bday-emoji{font-size:64px;line-height:1;display:block;margin-bottom:12px}',
      '#bdayModal h2{color:#fbbf24;font-size:24px;font-weight:900;margin:0 0 6px;letter-spacing:.04em}',
      '#bdayModal .bday-sub{color:rgba(255,255,255,.55);font-size:14px;margin-bottom:20px}',
      '.bday-rewards{display:flex;justify-content:center;gap:14px;margin-bottom:22px;flex-wrap:wrap}',
      '.bday-reward{background:rgba(251,191,36,.1);border:1px solid rgba(251,191,36,.3);',
      'border-radius:12px;padding:12px 16px;min-width:80px}',
      '.bday-reward-val{font-size:20px;font-weight:900;color:#fbbf24;display:block}',
      '.bday-reward-lbl{font-size:11px;color:rgba(255,255,255,.5);margin-top:3px}',
      '#bdayClaim{width:100%;padding:14px;background:linear-gradient(135deg,#fbbf24,#d97706);',
      'color:#000;font-weight:900;font-size:16px;border:none;border-radius:12px;cursor:pointer;',
      'letter-spacing:.04em;transition:opacity .15s}',
      '#bdayClaim:hover{opacity:.9}',
      '#bdayClose{display:block;margin:12px auto 0;background:none;border:none;',
      'color:rgba(255,255,255,.3);font-size:13px;cursor:pointer;text-decoration:underline}'
    ].join('');
    document.head.appendChild(s);
  }

  function buildOverlay(data) {
    injectStyles();
    if (_overlay) { if (_overlay.parentNode) _overlay.parentNode.removeChild(_overlay); }
    _overlay = document.createElement('div');
    _overlay.id = 'bdayOverlay';
    _overlay.addEventListener('click', function (e) { if (e.target === _overlay) close(); });

    var modal = document.createElement('div');
    modal.id = 'bdayModal';

    var emoji = document.createElement('span');
    emoji.className = 'bday-emoji';
    emoji.textContent = '\uD83C\uDF82'; // 🎂
    modal.appendChild(emoji);

    var h2 = document.createElement('h2');
    h2.textContent = 'HAPPY BIRTHDAY!';
    modal.appendChild(h2);

    var sub = document.createElement('div');
    sub.className = 'bday-sub';
    sub.textContent = 'Your special day is here! Claim your birthday gift.';
    modal.appendChild(sub);

    var rewards = document.createElement('div');
    rewards.className = 'bday-rewards';

    function makeReward(val, lbl) {
      var r = document.createElement('div');
      r.className = 'bday-reward';
      var v = document.createElement('span');
      v.className = 'bday-reward-val';
      v.textContent = val;
      var l = document.createElement('div');
      l.className = 'bday-reward-lbl';
      l.textContent = lbl;
      r.appendChild(v); r.appendChild(l);
      return r;
    }

    rewards.appendChild(makeReward('$' + (data.bonusCredits || 10).toFixed(2), 'Free Credits'));
    rewards.appendChild(makeReward('\uD83D\uDC8E ' + (data.bonusGems || 500), 'Gems'));
    rewards.appendChild(makeReward('\u2728 ' + (data.bonusFreeSpins || 10), 'Free Spins'));
    modal.appendChild(rewards);

    var claimBtn = document.createElement('button');
    claimBtn.id = 'bdayClaim';
    claimBtn.textContent = '\uD83C\uDF81 CLAIM BIRTHDAY GIFT';
    claimBtn.addEventListener('click', claim);
    modal.appendChild(claimBtn);

    var closeBtn = document.createElement('button');
    closeBtn.id = 'bdayClose';
    closeBtn.textContent = 'Maybe later';
    closeBtn.addEventListener('click', close);
    modal.appendChild(closeBtn);

    _overlay.appendChild(modal);
    document.body.appendChild(_overlay);
    _overlay.classList.add('active');
  }

  function claim() {
    var token = getToken();
    if (!token) return;
    var btn = document.getElementById('bdayClaim');
    if (btn) { btn.disabled = true; btn.textContent = 'Claiming...'; }

    fetch('/api/birthday/claim', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }
    })
    .then(function (r) { return r.json(); })
    .then(function (data) {
      if (data.success) {
        if (typeof balance !== 'undefined' && typeof data.newBalance === 'number') {
          try { balance = data.newBalance; if (typeof updateBalance === 'function') updateBalance(); } catch(e) {}
        }
        close();
        _showConfetti();
        _showToast('\uD83C\uDF82 Birthday gift claimed! +$' + data.creditsAwarded.toFixed(2) + ' + \uD83D\uDC8E ' + data.gemsAwarded + ' gems + ' + data.freeSpinsAwarded + ' free spins!');
      } else {
        if (btn) { btn.disabled = false; btn.textContent = '\uD83C\uDF81 CLAIM BIRTHDAY GIFT'; }
        _showToast(data.error || 'Failed to claim bonus');
      }
    })
    .catch(function () {
      if (btn) { btn.disabled = false; btn.textContent = '\uD83C\uDF81 CLAIM BIRTHDAY GIFT'; }
    });
  }

  function close() {
    if (_overlay) _overlay.classList.remove('active');
  }

  function _showToast(msg) {
    var t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = 'position:fixed;bottom:32px;left:50%;transform:translateX(-50%);background:linear-gradient(135deg,#fbbf24,#d97706);color:#000;font-weight:800;font-size:14px;padding:12px 24px;border-radius:999px;z-index:99999;box-shadow:0 4px 24px rgba(251,191,36,0.5);pointer-events:none;transition:opacity 0.4s;white-space:nowrap';
    document.body.appendChild(t);
    setTimeout(function () { t.style.opacity = '0'; }, 3000);
    setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 3500);
  }

  function _showConfetti() {
    if (typeof triggerWinParticles === 'function') {
      try { triggerWinParticles('epic'); } catch(e) {}
    }
  }

  function checkBirthday() {
    if (_checked) return;
    _checked = true;
    var token = getToken();
    if (!token) return;

    fetch('/api/birthday/status', {
      headers: { 'Authorization': 'Bearer ' + token }
    })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (data) {
      if (data && data.isBirthday && !data.alreadyClaimed) {
        // Delay 2s so lobby loads first
        setTimeout(function () { buildOverlay(data); }, 2000);
      }
    })
    .catch(function () {});
  }

  // ── Profile integration: set birthday ──────────────────────────────────────
  // Hooks into the profile modal to add a birthday date picker
  function hookProfileModal() {
    var _prevOpen = window.openProfileModal;
    if (typeof _prevOpen !== 'function') return;
    window.openProfileModal = function () {
      _prevOpen.apply(this, arguments);
      // After RAF for the modal to render
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { _injectBirthdayField(); });
      });
    };
  }

  function _injectBirthdayField() {
    if (document.getElementById('bdayFieldWrap')) return; // already injected
    var saveBtn = document.querySelector('#profileModal button[onclick*="saveProfile"], #profileModal .profile-save-btn, #profileModal button.btn--primary');
    if (!saveBtn) return;

    var token = getToken();
    if (!token) return;

    var wrap = document.createElement('div');
    wrap.id = 'bdayFieldWrap';
    wrap.style.cssText = 'margin-bottom:14px;';

    var lbl = document.createElement('label');
    lbl.style.cssText = 'display:block;font-size:12px;font-weight:700;color:rgba(255,255,255,.5);margin-bottom:6px;text-transform:uppercase;letter-spacing:.5px';
    lbl.textContent = '\uD83C\uDF82 Birthday (optional — get a yearly bonus!)';

    var row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:8px;align-items:center';

    var monthSel = document.createElement('select');
    monthSel.id = 'bdayMonth';
    monthSel.style.cssText = 'flex:1;background:#1a1a2e;border:1px solid rgba(255,255,255,.15);color:#e2e8f0;border-radius:8px;padding:8px;font-size:14px';
    var monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    var opt0 = document.createElement('option');
    opt0.value = '';
    opt0.textContent = 'Month';
    monthSel.appendChild(opt0);
    for (var m = 1; m <= 12; m++) {
      var opt = document.createElement('option');
      opt.value = m;
      opt.textContent = monthNames[m-1];
      monthSel.appendChild(opt);
    }

    var daySel = document.createElement('select');
    daySel.id = 'bdayDay';
    daySel.style.cssText = 'width:90px;background:#1a1a2e;border:1px solid rgba(255,255,255,.15);color:#e2e8f0;border-radius:8px;padding:8px;font-size:14px';
    var opt0d = document.createElement('option');
    opt0d.value = '';
    opt0d.textContent = 'Day';
    daySel.appendChild(opt0d);
    for (var day = 1; day <= 31; day++) {
      var optd = document.createElement('option');
      optd.value = day;
      optd.textContent = day;
      daySel.appendChild(optd);
    }

    var saveB = document.createElement('button');
    saveB.textContent = 'Save';
    saveB.style.cssText = 'background:rgba(251,191,36,.15);border:1px solid rgba(251,191,36,.35);color:#fbbf24;font-size:12px;font-weight:700;padding:8px 14px;border-radius:8px;cursor:pointer;white-space:nowrap';
    saveB.addEventListener('click', function () {
      var mo = monthSel.value;
      var dy = daySel.value;
      if (!mo || !dy) { _showToast('Select both month and day'); return; }
      fetch('/api/birthday/set', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ month: parseInt(mo), day: parseInt(dy) })
      })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (d.success) { _showToast('\uD83C\uDF82 Birthday saved!'); }
        else { _showToast(d.error || 'Failed to save birthday'); }
      })
      .catch(function () {});
    });

    row.appendChild(monthSel); row.appendChild(daySel); row.appendChild(saveB);
    wrap.appendChild(lbl); wrap.appendChild(row);
    saveBtn.parentNode.insertBefore(wrap, saveBtn);

    // Pre-populate if birthday already set
    fetch('/api/birthday/status', { headers: { 'Authorization': 'Bearer ' + token } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (d && d.hasBirthday) {
          // We don't expose month/day from status, that's fine — user can re-set
        }
      })
      .catch(function () {});
  }

  // ── Auto-check on login event ─────────────────────────────────────────────
  // Check 3s after page load (gives auth time to restore)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(checkBirthday, 3000); });
  } else {
    setTimeout(checkBirthday, 3000);
  }

  // Also hook profile modal for birthday input
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      setTimeout(hookProfileModal, 1000);
    });
  } else {
    setTimeout(hookProfileModal, 1000);
  }

  window.checkBirthdayBonus = checkBirthday;

}());
