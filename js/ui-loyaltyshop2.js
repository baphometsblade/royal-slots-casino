(function(){ 'use strict';

/* =====================================================
   ui-loyaltyshop2.js \u2014 Loyalty Points Shop v2
   Sprint 39 \u00b7 Matrix Spins Casino
   Earn 1 point per $1 wagered, spend on rewards
   ===================================================== */

var STORAGE_KEY = 'ms_loyaltyShop2';

var SHOP_ITEMS = [
  { name: '$5 Bonus',       cost: 50,  type: 'balance',  value: 5,           icon: '\uD83D\uDCB0' },
  { name: '$20 Bonus',      cost: 150, type: 'balance',  value: 20,          icon: '\uD83D\uDC8E' },
  { name: 'Free Insurance', cost: 30,  type: 'perk',     value: 'insurance', icon: '\uD83D\uDEE1\uFE0F' },
  { name: '2x Next Win',    cost: 75,  type: 'perk',     value: 'doublewin', icon: '\u2728' }
];

/* ---------- state ---------- */

function _loadState() {
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      var parsed = JSON.parse(raw);
      return { points: parsed.points || 0, perks: parsed.perks || [] };
    }
  } catch (e) { /* ignore */ }
  return { points: 0, perks: [] };
}

function _saveState(state) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
}

/* ---------- balance helper ---------- */

function _creditBalance(amount) {
  if (amount <= 0) return;
  if (typeof balance !== 'undefined' && typeof updateBalance === 'function') {
    balance = (typeof balance === 'number' ? balance : 0) + amount;
    updateBalance();
  }
  if (typeof saveBalance === 'function') saveBalance();
}

/* ---------- DOM helpers ---------- */

function _el(tag, cls, text) {
  var e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
}

/* ---------- modal ---------- */

var _modal = null;

function _buildModal() {
  if (_modal) return _modal;

  var overlay = _el('div', 'ls2-overlay');
  overlay.id = 'loyaltyShop2Modal';
  overlay.style.cssText = 'display:none;position:fixed;inset:0;z-index:12000;background:rgba(0,0,0,0.82);' +
    'align-items:center;justify-content:center;';

  var box = _el('div', 'ls2-box');
  box.style.cssText = 'background:linear-gradient(135deg,#1a1a2e,#16213e);border-radius:16px;padding:28px;' +
    'max-width:460px;width:92%;max-height:80vh;overflow-y:auto;border:1px solid rgba(255,215,0,0.3);' +
    'box-shadow:0 8px 40px rgba(0,0,0,0.6);color:#fff;font-family:inherit;';

  /* header */
  var hdr = _el('div', 'ls2-hdr');
  hdr.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;';

  var title = _el('h2', '', '\uD83D\uDED2 Loyalty Shop');
  title.style.cssText = 'margin:0;font-size:1.3rem;color:#ffd700;';

  var ptsBadge = _el('span', 'ls2-pts');
  ptsBadge.style.cssText = 'background:rgba(255,215,0,0.15);padding:4px 12px;border-radius:20px;' +
    'font-size:0.9rem;color:#ffd700;font-weight:bold;';

  var closeBtn = _el('button', 'ls2-close', '\u2715');
  closeBtn.style.cssText = 'background:none;border:none;color:#aaa;font-size:1.4rem;cursor:pointer;' +
    'margin-left:12px;';
  closeBtn.addEventListener('click', function() { _hideModal(); });

  hdr.appendChild(title);
  var hdrRight = _el('div', '');
  hdrRight.style.cssText = 'display:flex;align-items:center;';
  hdrRight.appendChild(ptsBadge);
  hdrRight.appendChild(closeBtn);
  hdr.appendChild(hdrRight);

  /* items grid */
  var grid = _el('div', 'ls2-grid');
  grid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:14px;';

  box.appendChild(hdr);
  box.appendChild(grid);
  overlay.appendChild(box);

  overlay.addEventListener('click', function(ev) {
    if (ev.target === overlay) _hideModal();
  });

  document.body.appendChild(overlay);
  _modal = { overlay: overlay, ptsBadge: ptsBadge, grid: grid };
  return _modal;
}

function _renderItems() {
  var m = _buildModal();
  var state = _loadState();
  m.ptsBadge.textContent = '\u2B50 ' + state.points + ' pts';

  while (m.grid.firstChild) m.grid.removeChild(m.grid.firstChild);

  SHOP_ITEMS.forEach(function(item, idx) {
    var card = _el('div', 'ls2-card');
    card.style.cssText = 'background:rgba(255,255,255,0.06);border-radius:12px;padding:16px;' +
      'text-align:center;border:1px solid rgba(255,255,255,0.08);transition:transform 0.2s;';

    var icon = _el('div', '', item.icon);
    icon.style.cssText = 'font-size:2rem;margin-bottom:6px;';

    var name = _el('div', '', item.name);
    name.style.cssText = 'font-weight:bold;font-size:0.95rem;margin-bottom:4px;';

    var costBadge = _el('div', '', item.cost + ' pts');
    costBadge.style.cssText = 'font-size:0.8rem;color:#ffd700;margin-bottom:10px;';

    var canAfford = state.points >= item.cost;
    var btn = _el('button', '', canAfford ? 'Buy' : 'Need ' + (item.cost - state.points) + ' more');
    btn.style.cssText = 'padding:6px 18px;border:none;border-radius:8px;font-weight:bold;cursor:pointer;' +
      'font-size:0.85rem;transition:background 0.2s;' +
      (canAfford ? 'background:#ffd700;color:#000;' : 'background:#444;color:#888;cursor:not-allowed;');

    if (canAfford) {
      btn.addEventListener('click', (function(i) {
        return function() { _buyItem(i); };
      })(idx));
    }

    card.appendChild(icon);
    card.appendChild(name);
    card.appendChild(costBadge);
    card.appendChild(btn);
    m.grid.appendChild(card);
  });
}

function _buyItem(idx) {
  var item = SHOP_ITEMS[idx];
  var state = _loadState();
  if (state.points < item.cost) return;

  state.points -= item.cost;

  if (item.type === 'balance') {
    _creditBalance(item.value);
  } else if (item.type === 'perk') {
    state.perks.push({ perk: item.value, ts: Date.now() });
  }

  _saveState(state);
  _renderItems();
}

function _showModal() {
  var m = _buildModal();
  _renderItems();
  m.overlay.style.display = 'flex';
}

function _hideModal() {
  if (_modal) _modal.overlay.style.display = 'none';
}

/* ---------- FAB ---------- */

function _createFab() {
  var fab = _el('button', 'ls2-fab', '\uD83D\uDED2');
  fab.id = 'loyaltyShop2Fab';
  fab.style.cssText = 'position:fixed;bottom:90px;right:20px;z-index:9500;width:50px;height:50px;' +
    'border-radius:50%;border:2px solid rgba(255,215,0,0.4);background:linear-gradient(135deg,#1a1a2e,#16213e);' +
    'color:#ffd700;font-size:1.4rem;cursor:pointer;box-shadow:0 4px 16px rgba(0,0,0,0.4);' +
    'transition:transform 0.2s;display:flex;align-items:center;justify-content:center;';
  fab.addEventListener('click', function() { _showModal(); });
  document.body.appendChild(fab);
}

/* ---------- public API ---------- */

window._loyaltyShop2AddPoints = function(amount) {
  if (typeof amount !== 'number' || amount <= 0) return;
  var state = _loadState();
  state.points += Math.floor(amount);
  _saveState(state);
};

window._loyaltyShop2GetPoints = function() {
  return _loadState().points;
};

/* ---------- init ---------- */

function _init() {
  try {
    if (new URLSearchParams(window.location.search).get('noBonus') === '1') return;
  } catch (e) {}

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { _createFab(); });
  } else {
    _createFab();
  }
}

_init();

})();
