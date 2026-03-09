(function () {
  'use strict';

  if (new URLSearchParams(window.location.search).get('noBonus') === '1') return;

  var STORAGE_KEY = 'ms_dailyDepositGoal';
  var DAILY_TARGET = 100;
  var SPIN_DEPOSIT_INTERVAL = 500;
  var DEPOSIT_INCREMENT = 10;
  var MILESTONES = [
    { pct: 25, bonus: 5, claimed: false },
    { pct: 50, bonus: 10, claimed: false },
    { pct: 75, bonus: 20, claimed: false },
    { pct: 100, bonus: 50, claimed: false }
  ];

  var spinCount = 0;
  var deposited = 0;
  var claimedMilestones = {};
  var containerEl = null;
  var progressRingEl = null;
  var amountTextEl = null;
  var milestoneListEl = null;

  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var data = JSON.parse(raw);
        var today = new Date().toDateString();
        if (data.date === today) {
          deposited = data.deposited || 0;
          claimedMilestones = data.claimedMilestones || {};
          spinCount = data.spinCount || 0;
        } else {
          deposited = 0;
          claimedMilestones = {};
          spinCount = 0;
          saveState();
        }
      }
    } catch (e) { /* ignore */ }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        date: new Date().toDateString(),
        deposited: deposited,
        claimedMilestones: claimedMilestones,
        spinCount: spinCount
      }));
    } catch (e) { /* ignore */ }
  }

  function createSVGRing(pct) {
    var radius = 36;
    var circumference = 2 * Math.PI * radius;
    var offset = circumference - (pct / 100) * circumference;

    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '90');
    svg.setAttribute('height', '90');
    svg.setAttribute('viewBox', '0 0 90 90');

    var bgCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    bgCircle.setAttribute('cx', '45');
    bgCircle.setAttribute('cy', '45');
    bgCircle.setAttribute('r', String(radius));
    bgCircle.setAttribute('fill', 'none');
    bgCircle.setAttribute('stroke', 'rgba(255,255,255,0.15)');
    bgCircle.setAttribute('stroke-width', '6');
    svg.appendChild(bgCircle);

    var fgCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    fgCircle.setAttribute('cx', '45');
    fgCircle.setAttribute('cy', '45');
    fgCircle.setAttribute('r', String(radius));
    fgCircle.setAttribute('fill', 'none');
    fgCircle.setAttribute('stroke', '#00e676');
    fgCircle.setAttribute('stroke-width', '6');
    fgCircle.setAttribute('stroke-linecap', 'round');
    fgCircle.setAttribute('stroke-dasharray', String(circumference));
    fgCircle.setAttribute('stroke-dashoffset', String(offset));
    fgCircle.setAttribute('transform', 'rotate(-90 45 45)');
    fgCircle.style.transition = 'stroke-dashoffset 0.6s ease';
    svg.appendChild(fgCircle);

    progressRingEl = fgCircle;
    return svg;
  }

  function updateRing() {
    if (!progressRingEl) return;
    var pct = Math.min(100, (deposited / DAILY_TARGET) * 100);
    var radius = 36;
    var circumference = 2 * Math.PI * radius;
    var offset = circumference - (pct / 100) * circumference;
    progressRingEl.setAttribute('stroke-dashoffset', String(offset));

    if (amountTextEl) {
      amountTextEl.textContent = '$' + deposited + ' / $' + DAILY_TARGET;
    }
    updateMilestoneMarkers();
  }

  function updateMilestoneMarkers() {
    if (!milestoneListEl) return;
    var items = milestoneListEl.children;
    for (var i = 0; i < MILESTONES.length; i++) {
      var m = MILESTONES[i];
      var item = items[i];
      if (!item) continue;
      var pct = (deposited / DAILY_TARGET) * 100;
      if (pct >= m.pct) {
        item.style.opacity = '1';
        if (claimedMilestones[m.pct]) {
          item.style.color = '#888';
          item.style.textDecoration = 'line-through';
        } else {
          item.style.color = '#00e676';
          item.style.cursor = 'pointer';
        }
      } else {
        item.style.opacity = '0.4';
        item.style.color = '#ccc';
        item.style.cursor = 'default';
      }
    }
  }

  function claimMilestone(index) {
    var m = MILESTONES[index];
    var pct = (deposited / DAILY_TARGET) * 100;
    if (pct < m.pct || claimedMilestones[m.pct]) return;
    claimedMilestones[m.pct] = true;
    if (typeof window.balance === 'number') {
      window.balance += m.bonus;
    }
    if (typeof window.updateBalanceDisplay === 'function') {
      window.updateBalanceDisplay();
    }
    saveState();
    updateMilestoneMarkers();
  }

  function buildUI() {
    containerEl = document.createElement('div');
    containerEl.id = 'dailyDepositGoal';
    containerEl.style.cssText =
      'position:fixed;bottom:20px;left:20px;width:220px;' +
      'background:linear-gradient(135deg,#1a1a2e,#16213e);' +
      'border:1px solid rgba(0,230,118,0.3);border-radius:14px;' +
      'padding:14px;z-index:10400;font-family:inherit;color:#fff;' +
      'box-shadow:0 4px 20px rgba(0,0,0,0.5);display:none;';

    var header = document.createElement('div');
    header.style.cssText =
      'display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;';

    var title = document.createElement('span');
    title.style.cssText = 'font-size:13px;font-weight:700;color:#00e676;';
    title.textContent = '\uD83C\uDFAF Daily Goal';
    header.appendChild(title);

    var closeBtn = document.createElement('span');
    closeBtn.style.cssText =
      'cursor:pointer;font-size:16px;color:#888;line-height:1;';
    closeBtn.textContent = '\u2715';
    closeBtn.addEventListener('click', function () {
      if (containerEl) containerEl.style.display = 'none';
    });
    header.appendChild(closeBtn);
    containerEl.appendChild(header);

    var ringWrap = document.createElement('div');
    ringWrap.style.cssText = 'text-align:center;margin-bottom:8px;';
    var pct = Math.min(100, (deposited / DAILY_TARGET) * 100);
    ringWrap.appendChild(createSVGRing(pct));
    containerEl.appendChild(ringWrap);

    amountTextEl = document.createElement('div');
    amountTextEl.style.cssText =
      'text-align:center;font-size:14px;font-weight:600;margin-bottom:10px;';
    amountTextEl.textContent = '$' + deposited + ' / $' + DAILY_TARGET;
    containerEl.appendChild(amountTextEl);

    milestoneListEl = document.createElement('div');
    milestoneListEl.style.cssText = 'display:flex;flex-direction:column;gap:4px;';
    for (var i = 0; i < MILESTONES.length; i++) {
      (function (idx) {
        var m = MILESTONES[idx];
        var row = document.createElement('div');
        row.style.cssText =
          'font-size:11px;padding:4px 8px;background:rgba(255,255,255,0.05);' +
          'border-radius:6px;display:flex;justify-content:space-between;';
        var label = document.createElement('span');
        label.textContent = m.pct + '%';
        row.appendChild(label);
        var bonus = document.createElement('span');
        bonus.textContent = '+$' + m.bonus;
        bonus.style.fontWeight = '600';
        row.appendChild(bonus);
        row.addEventListener('click', function () {
          claimMilestone(idx);
        });
        milestoneListEl.appendChild(row);
      })(i);
    }
    containerEl.appendChild(milestoneListEl);
    document.body.appendChild(containerEl);
    updateMilestoneMarkers();
  }

  function onSpinComplete() {
    spinCount++;
    if (spinCount % SPIN_DEPOSIT_INTERVAL === 0) {
      deposited = Math.min(DAILY_TARGET, deposited + DEPOSIT_INCREMENT);
      saveState();
      updateRing();
      if (containerEl && containerEl.style.display === 'none') {
        containerEl.style.display = 'block';
      }
    }
  }

  function init() {
    loadState();
    buildUI();
    if (deposited > 0) {
      containerEl.style.display = 'block';
    }
    document.addEventListener('spinComplete', onSpinComplete);
  }

  window.dismissDailyDepositGoal = function () {
    if (containerEl) containerEl.style.display = 'none';
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
