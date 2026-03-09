(function () {
  'use strict';

  if (new URLSearchParams(window.location.search).get('noBonus') === '1') return;

  var STORAGE_KEY = 'ms_mysteryGift';
  var SPIN_TRIGGER = 600;
  var COOLDOWN_MS = 4 * 60 * 60 * 1000;
  var TIERS = [
    { name: 'Common', amount: 5, weight: 50, color: '#aaa' },
    { name: 'Uncommon', amount: 15, weight: 30, color: '#00e676' },
    { name: 'Rare', amount: 50, weight: 15, color: '#7c4dff' },
    { name: 'Legendary', amount: 200, weight: 5, color: '#ffd700' }
  ];

  var spinCount = 0;
  var lastGiftTime = 0;
  var overlayEl = null;
  var giftBoxEl = null;
  var lidEl = null;
  var prizeRevealEl = null;
  var claimBtnEl = null;
  var pendingPrize = null;

  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var data = JSON.parse(raw);
        spinCount = data.spinCount || 0;
        lastGiftTime = data.lastGiftTime || 0;
      }
    } catch (e) { /* ignore */ }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        spinCount: spinCount,
        lastGiftTime: lastGiftTime
      }));
    } catch (e) { /* ignore */ }
  }

  function pickTier() {
    var roll = Math.random() * 100;
    var cumulative = 0;
    for (var i = 0; i < TIERS.length; i++) {
      cumulative += TIERS[i].weight;
      if (roll < cumulative) return TIERS[i];
    }
    return TIERS[0];
  }

  function buildOverlay() {
    overlayEl = document.createElement('div');
    overlayEl.id = 'mysteryGiftOverlay';
    overlayEl.style.cssText =
      'position:fixed;top:0;left:0;width:100%;height:100%;' +
      'background:rgba(0,0,0,0.85);z-index:10400;display:none;' +
      'align-items:center;justify-content:center;flex-direction:column;' +
      'font-family:inherit;';

    var titleEl = document.createElement('div');
    titleEl.style.cssText =
      'color:#ffd700;font-size:24px;font-weight:800;margin-bottom:20px;' +
      'text-shadow:0 0 12px rgba(255,215,0,0.5);';
    titleEl.textContent = '\uD83C\uDF81 Mystery Gift!';
    overlayEl.appendChild(titleEl);

    giftBoxEl = document.createElement('div');
    giftBoxEl.style.cssText =
      'width:140px;height:120px;position:relative;cursor:pointer;' +
      'margin-bottom:30px;';

    var boxBody = document.createElement('div');
    boxBody.style.cssText =
      'width:140px;height:90px;background:linear-gradient(135deg,#e53935,#c62828);' +
      'border-radius:8px;position:absolute;bottom:0;' +
      'box-shadow:0 4px 20px rgba(229,57,53,0.4);';

    var ribbon1 = document.createElement('div');
    ribbon1.style.cssText =
      'position:absolute;top:0;left:50%;transform:translateX(-50%);' +
      'width:20px;height:100%;background:#ffd700;';
    boxBody.appendChild(ribbon1);

    var ribbon2 = document.createElement('div');
    ribbon2.style.cssText =
      'position:absolute;top:50%;left:0;transform:translateY(-50%);' +
      'width:100%;height:20px;background:#ffd700;';
    boxBody.appendChild(ribbon2);

    giftBoxEl.appendChild(boxBody);

    lidEl = document.createElement('div');
    lidEl.style.cssText =
      'width:150px;height:30px;background:linear-gradient(135deg,#f44336,#d32f2f);' +
      'border-radius:6px 6px 0 0;position:absolute;top:0;left:-5px;' +
      'transition:transform 0.6s ease;transform-origin:left bottom;' +
      'box-shadow:0 -2px 10px rgba(0,0,0,0.3);';

    var lidRibbon = document.createElement('div');
    lidRibbon.style.cssText =
      'position:absolute;top:0;left:50%;transform:translateX(-50%);' +
      'width:20px;height:100%;background:#ffd700;';
    lidEl.appendChild(lidRibbon);

    var bow = document.createElement('div');
    bow.style.cssText =
      'position:absolute;top:-16px;left:50%;transform:translateX(-50%);' +
      'width:40px;height:20px;background:#ffd700;border-radius:50% 50% 0 0;';
    lidEl.appendChild(bow);

    giftBoxEl.appendChild(lidEl);
    overlayEl.appendChild(giftBoxEl);

    prizeRevealEl = document.createElement('div');
    prizeRevealEl.style.cssText =
      'text-align:center;display:none;';

    var prizeLabel = document.createElement('div');
    prizeLabel.className = 'mg-prize-label';
    prizeLabel.style.cssText =
      'font-size:16px;font-weight:700;color:#fff;margin-bottom:6px;';
    prizeRevealEl.appendChild(prizeLabel);

    var prizeAmount = document.createElement('div');
    prizeAmount.className = 'mg-prize-amount';
    prizeAmount.style.cssText =
      'font-size:40px;font-weight:900;margin-bottom:18px;' +
      'text-shadow:0 0 20px rgba(255,215,0,0.6);';
    prizeRevealEl.appendChild(prizeAmount);

    claimBtnEl = document.createElement('button');
    claimBtnEl.style.cssText =
      'background:linear-gradient(135deg,#ffd700,#ff8c00);color:#1a1a2e;' +
      'border:none;border-radius:10px;padding:12px 36px;font-size:16px;' +
      'font-weight:800;cursor:pointer;box-shadow:0 4px 16px rgba(255,215,0,0.4);' +
      'transition:transform 0.2s ease;';
    claimBtnEl.textContent = 'Claim Prize!';
    claimBtnEl.addEventListener('mouseenter', function () {
      claimBtnEl.style.transform = 'scale(1.05)';
    });
    claimBtnEl.addEventListener('mouseleave', function () {
      claimBtnEl.style.transform = 'scale(1)';
    });
    claimBtnEl.addEventListener('click', claimPrize);
    prizeRevealEl.appendChild(claimBtnEl);

    overlayEl.appendChild(prizeRevealEl);

    var skipBtn = document.createElement('div');
    skipBtn.style.cssText =
      'position:absolute;top:20px;right:20px;color:#888;font-size:14px;' +
      'cursor:pointer;';
    skipBtn.textContent = 'Skip \u2715';
    skipBtn.addEventListener('click', hideOverlay);
    overlayEl.appendChild(skipBtn);

    giftBoxEl.addEventListener('click', openGift);
    document.body.appendChild(overlayEl);
  }

  function openGift() {
    if (!lidEl || !prizeRevealEl) return;

    var tier = pickTier();
    pendingPrize = tier;

    lidEl.style.transform = 'rotate(-120deg)';

    setTimeout(function () {
      giftBoxEl.style.display = 'none';
      prizeRevealEl.style.display = 'block';

      var label = prizeRevealEl.querySelector('.mg-prize-label');
      var amount = prizeRevealEl.querySelector('.mg-prize-amount');
      if (label) {
        label.textContent = tier.name + ' Gift';
        label.style.color = tier.color;
      }
      if (amount) {
        amount.textContent = '+$' + tier.amount;
        amount.style.color = tier.color;
      }
    }, 600);
  }

  function claimPrize() {
    if (!pendingPrize) return;
    if (typeof window.balance === 'number') {
      window.balance += pendingPrize.amount;
    }
    if (typeof window.updateBalanceDisplay === 'function') {
      window.updateBalanceDisplay();
    }
    lastGiftTime = Date.now();
    pendingPrize = null;
    saveState();
    hideOverlay();
  }

  function showOverlay() {
    if (!overlayEl) return;
    giftBoxEl.style.display = 'block';
    prizeRevealEl.style.display = 'none';
    lidEl.style.transform = 'rotate(0deg)';
    pendingPrize = null;
    overlayEl.style.display = 'flex';
  }

  function hideOverlay() {
    if (overlayEl) overlayEl.style.display = 'none';
    pendingPrize = null;
  }

  function canShowGift() {
    if (lastGiftTime === 0) return true;
    return (Date.now() - lastGiftTime) >= COOLDOWN_MS;
  }

  function onSpinComplete() {
    spinCount++;
    saveState();
    if (spinCount % SPIN_TRIGGER === 0 && canShowGift()) {
      showOverlay();
    }
  }

  function init() {
    loadState();
    buildOverlay();
    document.addEventListener('spinComplete', onSpinComplete);
  }

  window.dismissMysteryGift = function () {
    hideOverlay();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
