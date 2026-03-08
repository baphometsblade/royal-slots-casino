(function(){ 'use strict';

/* =====================================================
   ui-loyaltyshop.js — Loyalty Points Shop
   Sprint 30 · Matrix Spins Casino
   ===================================================== */

var LS_POINTS_KEY = 'ms_loyaltyPoints';

var SHOP_ITEMS = [
  { id: 'bonus50',    icon: '💰', name: '$5 Bonus',       desc: 'Instant bonus credits',    cost: 50,  type: 'credits',   value: 5 },
  { id: 'bonus200',   icon: '💎', name: '$25 Bonus',      desc: 'Premium bonus credits',    cost: 200, type: 'credits',   value: 25 },
  { id: 'freespin5',  icon: '🎰', name: '5 Free Spins',   desc: 'On any slot game',         cost: 75,  type: 'freespins', value: 5 },
  { id: 'freespin20', icon: '🌟', name: '20 Free Spins',  desc: 'Premium free spin pack',   cost: 250, type: 'freespins', value: 20 },
  { id: 'xpboost',    icon: '⚡', name: '2× XP Boost',    desc: '1 hour of double XP',      cost: 100, type: 'xpboost',   value: 2 },
  { id: 'cashback',   icon: '🔄', name: '10% Cashback',   desc: 'Next session cashback',    cost: 150, type: 'cashback',  value: 0.1 },
];

/* ---------- points helpers ---------- */

function _getPoints() {
  try {
    var v = localStorage.getItem(LS_POINTS_KEY);
    return v ? parseInt(v, 10) || 0 : 0;
  } catch (e) { return 0; }
}

function _setPoints(pts) {
  try { localStorage.setItem(LS_POINTS_KEY, String(Math.max(0, Math.floor(pts)))); } catch (e) { /* ignore */ }
}

/* ---------- public: track spin wagers ---------- */

window._loyaltyTrackSpin = function(betAmt) {
  if (!betAmt || betAmt <= 0) return;
  var earned = Math.floor(betAmt);
  if (earned < 1) return;
  var pts = _getPoints() + earned;
  _setPoints(pts);
  _updatePointsBadge(pts);
  _updateShopBtnVisibility(pts);
};

/* ---------- UI rendering ---------- */

function _renderItems(pts) {
  var grid = document.getElementById('lsItemsGrid');
  if (!grid) return;
  var html = '';
  for (var i = 0; i < SHOP_ITEMS.length; i++) {
    var item = SHOP_ITEMS[i];
    var canAfford = pts >= item.cost;
    html += '<div class="ls-item' + (canAfford ? '' : ' ls-sold-out') + '" data-item-idx="' + i + '">';
    html += '<div class="ls-item-icon">' + item.icon + '</div>';
    html += '<div class="ls-item-name">' + item.name + '</div>';
    html += '<div class="ls-item-desc">' + item.desc + '</div>';
    html += '<div class="ls-item-cost">' + item.cost + ' pts</div>';
    html += '</div>';
  }
  grid.innerHTML = html;

  /* bind click handlers */
  var cards = grid.querySelectorAll('.ls-item');
  for (var j = 0; j < cards.length; j++) {
    cards[j].addEventListener('click', _handleItemClick);
  }
}

function _handleItemClick(e) {
  var card = e.currentTarget;
  var idx = parseInt(card.getAttribute('data-item-idx'), 10);
  if (isNaN(idx) || idx < 0 || idx >= SHOP_ITEMS.length) return;

  var item = SHOP_ITEMS[idx];
  var pts = _getPoints();
  if (pts < item.cost) return;

  /* Deduct points */
  pts -= item.cost;
  _setPoints(pts);

  /* Apply reward */
  if (item.type === 'credits') {
    if (typeof balance !== 'undefined') {
      balance += item.value;
      if (typeof updateBalanceDisplay === 'function') updateBalanceDisplay();
    }
  }

  /* Show toast */
  _showToast('Redeemed ' + item.name + '!');

  /* Re-render */
  _updatePointsBadge(pts);
  _renderItems(pts);
  _updateShopBtnVisibility(pts);
}

function _updatePointsBadge(pts) {
  var el1 = document.getElementById('lsbPts');
  var el2 = document.getElementById('lsPointsBadge');
  if (el1) el1.textContent = pts.toLocaleString();
  if (el2) el2.textContent = pts.toLocaleString();
}

function _updateShopBtnVisibility(pts) {
  var btn = document.getElementById('loyaltyShopBtn');
  if (!btn) return;
  if (pts > 0) {
    btn.classList.add('lsb-visible');
  } else {
    btn.classList.remove('lsb-visible');
  }
}

/* ---------- toast ---------- */

function _showToast(msg) {
  var existing = document.querySelector('.ls-toast');
  if (existing) existing.remove();

  var toast = document.createElement('div');
  toast.className = 'ls-toast';
  toast.textContent = msg;
  document.body.appendChild(toast);

  requestAnimationFrame(function() {
    requestAnimationFrame(function() {
      toast.classList.add('ls-toast-show');
    });
  });

  setTimeout(function() {
    toast.classList.remove('ls-toast-show');
    setTimeout(function() { toast.remove(); }, 400);
  }, 2500);
}

/* ---------- public API ---------- */

window.openLoyaltyShop = function() {
  var overlay = document.getElementById('loyaltyShopOverlay');
  if (overlay) {
    var pts = _getPoints();
    _updatePointsBadge(pts);
    _renderItems(pts);
    overlay.style.display = 'flex';
  }
};

window.closeLoyaltyShop = function() {
  var overlay = document.getElementById('loyaltyShopOverlay');
  if (overlay) overlay.style.display = 'none';
};

/* ---------- init ---------- */

function _init() {
  if (window.location.search.indexOf('noBonus=1') !== -1) return;

  var pts = _getPoints();
  _updatePointsBadge(pts);
  _updateShopBtnVisibility(pts);

  /* Bind shop button */
  var shopBtn = document.getElementById('loyaltyShopBtn');
  if (shopBtn) shopBtn.addEventListener('click', window.openLoyaltyShop);

  /* Bind close button */
  var closeBtn = document.getElementById('lsCloseBtn');
  if (closeBtn) closeBtn.addEventListener('click', window.closeLoyaltyShop);

  /* Close on overlay background click */
  var overlay = document.getElementById('loyaltyShopOverlay');
  if (overlay) {
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) window.closeLoyaltyShop();
    });
  }
}

document.addEventListener('DOMContentLoaded', function() {
  setTimeout(_init, 2000);
});

})();
