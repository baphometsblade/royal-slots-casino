(function () {
  'use strict';

  if (new URLSearchParams(window.location.search).get('noBonus') === '1') return;

  var STORAGE_KEY = 'ms_cashbackStreak';
  var MAX_STREAK = 7;
  var BASE_CASHBACK = 2;
  var SPIN_AWARD_INTERVAL = 100;

  var streakDays = 0;
  var lastLoginDate = '';
  var spinCount = 0;
  var containerEl = null;
  var dayMarkersEl = null;
  var multiplierTextEl = null;

  function getMultiplier(days) {
    if (days >= 7) return 3;
    if (days >= 5) return 2;
    if (days >= 3) return 1.5;
    return 1;
  }

  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var data = JSON.parse(raw);
        var today = new Date().toDateString();
        var yesterday = new Date(Date.now() - 86400000).toDateString();

        if (data.lastLoginDate === today) {
          streakDays = data.streakDays || 1;
          spinCount = data.spinCount || 0;
        } else if (data.lastLoginDate === yesterday) {
          streakDays = Math.min(MAX_STREAK, (data.streakDays || 0) + 1);
          spinCount = 0;
          lastLoginDate = today;
          saveState();
        } else {
          streakDays = 1;
          spinCount = 0;
          lastLoginDate = today;
          saveState();
          return;
        }
        lastLoginDate = data.lastLoginDate === today ? today : today;
      } else {
        streakDays = 1;
        lastLoginDate = new Date().toDateString();
        spinCount = 0;
        saveState();
      }
    } catch (e) {
      streakDays = 1;
      lastLoginDate = new Date().toDateString();
      spinCount = 0;
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        streakDays: streakDays,
        lastLoginDate: lastLoginDate || new Date().toDateString(),
        spinCount: spinCount
      }));
    } catch (e) { /* ignore */ }
  }

  function buildDayMarkers() {
    dayMarkersEl = document.createElement('div');
    dayMarkersEl.style.cssText =
      'display:flex;gap:6px;align-items:center;';

    for (var i = 1; i <= MAX_STREAK; i++) {
      var marker = document.createElement('div');
      marker.style.cssText =
        'width:28px;height:28px;border-radius:50%;display:flex;' +
        'align-items:center;justify-content:center;font-size:11px;' +
        'font-weight:700;transition:all 0.3s ease;';

      if (i <= streakDays) {
        marker.style.background = 'linear-gradient(135deg,#ffd700,#ff8c00)';
        marker.style.color = '#1a1a2e';
        marker.style.boxShadow = '0 0 8px rgba(255,215,0,0.5)';
      } else {
        marker.style.background = 'rgba(255,255,255,0.1)';
        marker.style.color = '#666';
        marker.style.border = '1px solid rgba(255,255,255,0.15)';
      }

      marker.textContent = String(i);
      dayMarkersEl.appendChild(marker);
    }
    return dayMarkersEl;
  }

  function updateMultiplierDisplay() {
    if (!multiplierTextEl) return;
    var mult = getMultiplier(streakDays);
    multiplierTextEl.textContent = mult + 'x Cashback';
    if (mult >= 3) {
      multiplierTextEl.style.color = '#ffd700';
    } else if (mult >= 2) {
      multiplierTextEl.style.color = '#ff8c00';
    } else if (mult >= 1.5) {
      multiplierTextEl.style.color = '#00e676';
    } else {
      multiplierTextEl.style.color = '#aaa';
    }
  }

  function awardCashback() {
    var mult = getMultiplier(streakDays);
    var amount = BASE_CASHBACK * mult;
    if (typeof window.balance === 'number') {
      window.balance += amount;
    }
    if (typeof window.updateBalanceDisplay === 'function') {
      window.updateBalanceDisplay();
    }
    showCashbackToast(amount);
  }

  function showCashbackToast(amount) {
    var toast = document.createElement('div');
    toast.style.cssText =
      'position:fixed;top:80px;left:50%;transform:translateX(-50%);' +
      'background:linear-gradient(135deg,#1a1a2e,#16213e);' +
      'border:1px solid rgba(255,215,0,0.4);border-radius:10px;' +
      'padding:10px 20px;color:#ffd700;font-size:14px;font-weight:700;' +
      'z-index:10000;box-shadow:0 4px 16px rgba(0,0,0,0.5);' +
      'animation:ddg-fadein 0.3s ease;';
    toast.textContent = '\uD83D\uDCB0 Cashback +$' + amount.toFixed(2) + '!';
    document.body.appendChild(toast);

    setTimeout(function () {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.4s ease';
      setTimeout(function () {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 400);
    }, 2500);
  }

  function buildUI() {
    containerEl = document.createElement('div');
    containerEl.id = 'cashbackStreakBar';
    containerEl.style.cssText =
      'position:fixed;top:60px;left:50%;transform:translateX(-50%);' +
      'background:linear-gradient(135deg,#1a1a2e,#0f3460);' +
      'border:1px solid rgba(255,215,0,0.25);border-radius:12px;' +
      'padding:10px 18px;z-index:9500;font-family:inherit;color:#fff;' +
      'box-shadow:0 4px 20px rgba(0,0,0,0.5);display:flex;' +
      'align-items:center;gap:14px;display:none;';

    var icon = document.createElement('span');
    icon.style.cssText = 'font-size:20px;';
    icon.textContent = '\uD83D\uDD25';
    containerEl.appendChild(icon);

    var streakLabel = document.createElement('div');
    streakLabel.style.cssText = 'display:flex;flex-direction:column;gap:2px;';

    var titleRow = document.createElement('span');
    titleRow.style.cssText = 'font-size:12px;font-weight:700;color:#ffd700;';
    titleRow.textContent = 'Login Streak: Day ' + streakDays;
    streakLabel.appendChild(titleRow);

    multiplierTextEl = document.createElement('span');
    multiplierTextEl.style.cssText = 'font-size:11px;font-weight:600;';
    streakLabel.appendChild(multiplierTextEl);
    containerEl.appendChild(streakLabel);

    containerEl.appendChild(buildDayMarkers());

    var closeBtn = document.createElement('span');
    closeBtn.style.cssText =
      'cursor:pointer;font-size:16px;color:#888;margin-left:8px;line-height:1;';
    closeBtn.textContent = '\u2715';
    closeBtn.addEventListener('click', function () {
      if (containerEl) containerEl.style.display = 'none';
    });
    containerEl.appendChild(closeBtn);

    document.body.appendChild(containerEl);
    updateMultiplierDisplay();
  }

  function onSpinComplete() {
    spinCount++;
    saveState();
    if (spinCount % SPIN_AWARD_INTERVAL === 0) {
      awardCashback();
    }
  }

  function init() {
    loadState();
    buildUI();
    if (streakDays > 0) {
      containerEl.style.display = 'flex';
      setTimeout(function () {
        containerEl.style.display = 'none';
      }, 8000);
    }
    document.addEventListener('spinComplete', onSpinComplete);
  }

  window.dismissCashbackStreak = function () {
    if (containerEl) containerEl.style.display = 'none';
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
