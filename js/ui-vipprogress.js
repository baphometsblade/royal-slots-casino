(function(){ 'use strict';

/* =====================================================
   ui-vipprogress.js — VIP Tier Progression Bar
   Sprint 30 · Matrix Spins Casino
   ===================================================== */

var TIERS = [
  { name: 'Bronze',   icon: '🥉', xp: 0,     color: 'bronze' },
  { name: 'Silver',   icon: '🥈', xp: 1000,   color: 'silver' },
  { name: 'Gold',     icon: '🏆', xp: 5000,   color: 'gold' },
  { name: 'Platinum', icon: '💠', xp: 15000,  color: 'platinum' },
  { name: 'Diamond',  icon: '💎', xp: 50000,  color: 'diamond' },
];

/* ---------- XP helpers ---------- */

function _readXp() {
  var key = (typeof STORAGE_KEY_XP !== 'undefined') ? STORAGE_KEY_XP : 'ms_xp';
  try {
    var raw = localStorage.getItem(key);
    if (!raw) return 0;
    /* Handle both {xp: N} objects and plain numbers */
    var parsed = JSON.parse(raw);
    if (typeof parsed === 'object' && parsed !== null && typeof parsed.xp === 'number') {
      return parsed.xp;
    }
    if (typeof parsed === 'number') return parsed;
    return 0;
  } catch (e) {
    /* Might be a plain number string */
    var num = parseInt(raw, 10);
    return isNaN(num) ? 0 : num;
  }
}

function _getCurrentTier(xp) {
  var tier = TIERS[0];
  for (var i = 0; i < TIERS.length; i++) {
    if (xp >= TIERS[i].xp) tier = TIERS[i];
  }
  return tier;
}

function _getNextTier(xp) {
  for (var i = 0; i < TIERS.length; i++) {
    if (TIERS[i].xp > xp) return TIERS[i];
  }
  return null; /* Diamond — max tier */
}

function _formatNumber(n) {
  return n.toLocaleString();
}

/* ---------- UI update ---------- */

function _updateDisplay() {
  var xp = _readXp();
  var current = _getCurrentTier(xp);
  var next = _getNextTier(xp);

  /* Tier badge */
  var badge = document.getElementById('vpTierBadge');
  if (badge) {
    badge.textContent = current.icon + ' ' + current.name;
    badge.className = 'vp-tier-badge vp-tier-' + current.color;
  }

  /* Next tier label */
  var nextEl = document.getElementById('vpNextTier');
  if (nextEl) {
    if (next) {
      nextEl.innerHTML = 'Next: <strong>' + next.name + '</strong>';
    } else {
      nextEl.innerHTML = '🎉 Max Tier!';
    }
  }

  /* Progress bar fill */
  var barFill = document.getElementById('vpBarFill');
  if (barFill) {
    var pct;
    if (!next) {
      pct = 100;
    } else {
      var range = next.xp - current.xp;
      var progress = xp - current.xp;
      pct = range > 0 ? Math.min(100, Math.max(0, (progress / range) * 100)) : 0;
    }
    barFill.style.width = pct + '%';
    barFill.className = 'vp-bar-fill vp-bar-' + current.color;
  }

  /* XP text */
  var xpCurrent = document.getElementById('vpXpCurrent');
  if (xpCurrent) xpCurrent.textContent = _formatNumber(xp) + ' XP';

  var xpTarget = document.getElementById('vpXpTarget');
  if (xpTarget) {
    if (next) {
      xpTarget.innerHTML = '<strong>' + _formatNumber(next.xp) + ' XP</strong>';
    } else {
      xpTarget.innerHTML = '<strong>' + _formatNumber(xp) + ' XP</strong>';
    }
  }

  /* Show container */
  var container = document.getElementById('vipProgressContainer');
  if (container) container.classList.add('vp-visible');
}

/* ---------- public API ---------- */

window._vipProgressTrackXp = function() {
  _updateDisplay();
};

/* ---------- init ---------- */

function _init() {
  if (window.location.search.indexOf('noBonus=1') !== -1) return;

  _updateDisplay();

  /* Click on progress bar to open VIP modal */
  var bar = document.getElementById('vpBarTrack');
  if (bar) {
    bar.style.cursor = 'pointer';
    bar.addEventListener('click', function() {
      if (typeof openVipModal === 'function') openVipModal();
    });
  }

  /* Also allow clicking the container */
  var container = document.getElementById('vipProgressContainer');
  if (container) {
    container.style.cursor = 'pointer';
    container.addEventListener('click', function(e) {
      /* Avoid double-firing if clicked on bar */
      if (e.target.closest && e.target.closest('#vpBarTrack')) return;
      if (typeof openVipModal === 'function') openVipModal();
    });
  }

  /* Refresh every 30 seconds */
  setInterval(_updateDisplay, 30000);
}

document.addEventListener('DOMContentLoaded', function() {
  setTimeout(_init, 1600);
});

})();
