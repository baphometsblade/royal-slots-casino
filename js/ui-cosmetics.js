/**
 * ui-cosmetics.js - Cosmetics Shop UI
 * Public API: window.openCosmeticsShop(), window.closeCosmeticsShop()
 */
(function () {
  'use strict';

  function _getAuthToken() {
    return localStorage.getItem(
      typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken'
    ) || null;
  }
  function _authHeaders() {
    var t = _getAuthToken();
    return t ? { Authorization: 'Bearer ' + t } : {};
  }
  function _isLoggedIn() { return !!_getAuthToken(); }

  var CATEGORIES = [
    { key: 'avatars',    label: 'AVATARS',     icon: '👤' },
    { key: 'cardbacks',  label: 'CARD BACKS',  icon: '🃏' },
    { key: 'wineffects', label: 'WIN EFFECTS', icon: '✨' },
    { key: 'themes',     label: 'THEMES',      icon: '🎨' }
  ];

  var RARITY_STYLES = {
    common:    { color: '#94a3b8', bg: 'rgba(148,163,184,0.18)' },
    uncommon:  { color: '#22c55e', bg: 'rgba(34,197,94,0.18)'  },
    rare:      { color: '#3b82f6', bg: 'rgba(59,130,246,0.18)' },
    epic:      { color: '#8b5cf6', bg: 'rgba(139,92,246,0.18)' },
    legendary: { color: '#f59e0b', bg: 'rgba(245,158,11,0.18)' }
  };

  var _modalEl = null, _overlayEl = null, _activeCategory = 'avatars';
  var _shopData = null, _inventory = [], _gemBalance = 0;
  var _gemBadgeEl = null, _gridWrapEl = null, _tabEls = {}, _isOpen = false;

  function _toast(msg, type) {
    if (typeof showToast === 'function') { showToast(msg, type || 'success'); return; }
    var t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);' +
      'background:#1e293b;color:#f1f5f9;padding:10px 20px;border-radius:8px;' +
      'font-size:14px;z-index:20000;border:1px solid #334155;pointer-events:none;' +
      'box-shadow:0 4px 20px rgba(0,0,0,0.5);';
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 2800);
  }

  function _fetchGemBalance(cb) {
    var h = Object.assign({ 'Content-Type': 'application/json' }, _authHeaders());
    fetch('/api/gems/balance', { headers: h })
      .then(function (r) { return r.json(); })
      .then(function (d) { cb(null, d.balance || 0); })
      .catch(function (e) { cb(e, 0); });
  }
  function _fetchShop(cb) {
    fetch('/api/cosmetics/shop', { headers: { 'Content-Type': 'application/json' } })
      .then(function (r) { return r.json(); })
      .then(function (d) { cb(null, d.shop || {}); })
      .catch(function (e) { cb(e, null); });
  }
  function _fetchInventory(cb) {
    var h = Object.assign({ 'Content-Type': 'application/json' }, _authHeaders());
    fetch('/api/cosmetics/inventory', { headers: h })
      .then(function (r) { return r.json(); })
      .then(function (d) { cb(null, d.inventory || []); })
      .catch(function (e) { cb(e, []); });
  }
  function _purchaseItem(itemId, cb) {
    var h = Object.assign({ 'Content-Type': 'application/json' }, _authHeaders());
    fetch('/api/cosmetics/purchase', { method: 'POST', headers: h, body: JSON.stringify({ itemId: itemId }) })
      .then(function (r) { return r.json(); })
      .then(function (d) { cb(null, d); })
      .catch(function (e) { cb(e, null); });
  }
  function _equipItem(itemId, cb) {
    var h = Object.assign({ 'Content-Type': 'application/json' }, _authHeaders());
    fetch('/api/cosmetics/equip', { method: 'POST', headers: h, body: JSON.stringify({ itemId: itemId }) })
      .then(function (r) { return r.json(); })
      .then(function (d) { cb(null, d); })
      .catch(function (e) { cb(e, null); });
  }

  function _el(tag, styles, text) {
    var e = document.createElement(tag);
    if (styles) e.style.cssText = styles;
    if (text != null) e.textContent = text;
    return e;
  }

  function _makeRarityBadge(rarity) {
    var r = (rarity || 'common').toLowerCase();
    var s = RARITY_STYLES[r] || RARITY_STYLES['common'];
    return _el('span',
      'display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;' +
      'font-weight:700;letter-spacing:0.05em;text-transform:uppercase;' +
      'color:' + s.color + ';background:' + s.bg + ';border:1px solid ' + s.color + '44;',
      r
    );
  }

  function _itemEmoji(imageKey, category) {
    var key = (imageKey || '').toLowerCase();
    var cat = (category || '').toLowerCase();
    if (key.indexOf('avatar') === 0 || cat === 'avatars' || cat === 'avatar') return '👤';
    if (key.indexOf('cardback') === 0 || cat === 'cardbacks' || cat === 'cardback') return '🃏';
    if (key.indexOf('wineffect') === 0 || cat === 'wineffects' || cat === 'wineffect') return '✨';
    if (key.indexOf('theme') === 0 || cat === 'themes' || cat === 'theme') return '🎨';
    return '🎰';
  }

  function _injectLimitedPulseCSS() {
    if (document.getElementById('limitedPulseStyle')) return;
    var s = document.createElement('style');
    s.id = 'limitedPulseStyle';
    s.textContent = '@keyframes limitedPulse { 0%,100%{opacity:1} 50%{opacity:0.6} }';
    document.head.appendChild(s);
  }

  function _makeItemCard(item, isOwned, isEquipped, onBuy, onEquip) {
    var card = _el('div',
      'display:flex;flex-direction:column;align-items:stretch;background:rgba(255,255,255,0.04);' +
      'border-radius:10px;padding:14px;gap:8px;transition:background 0.15s;position:relative;' +
      'border:1px solid ' + (isOwned ? 'rgba(34,197,94,0.45)' : '#1e2d3d') + ';'
    );
    card.addEventListener('mouseenter', function () { card.style.background = 'rgba(255,255,255,0.07)'; });
    card.addEventListener('mouseleave', function () { card.style.background = 'rgba(255,255,255,0.04)'; });

    // Limited-time badge (top-right corner)
    if (item.is_limited && item.limited_expires_at) {
      _injectLimitedPulseCSS();
      var limitedBadge = _el('div',
        'position:absolute;top:6px;right:6px;background:#e53935;color:#fff;' +
        'font-size:0.65rem;font-weight:700;padding:2px 6px;border-radius:4px;' +
        'letter-spacing:0.5px;animation:limitedPulse 1.5s ease-in-out infinite;',
        'LIMITED'
      );
      card.appendChild(limitedBadge);
    }

    if (isOwned) {
      var dot = _el('div',
        'position:absolute;top:8px;right:8px;width:8px;height:8px;border-radius:50%;' +
        'background:#22c55e;box-shadow:0 0 6px #22c55e;'
      );
      card.appendChild(dot);
    }
    card.appendChild(_el('div',
      'text-align:center;font-size:36px;line-height:1;padding:8px 0 4px;user-select:none;',
      _itemEmoji(item.image_key, item.category)
    ));
    card.appendChild(_el('div',
      'font-size:13px;font-weight:700;color:#f1f5f9;text-align:center;line-height:1.3;',
      item.name || 'Unknown Item'
    ));
    var rarityRow = _el('div', 'text-align:center;');
    rarityRow.appendChild(_makeRarityBadge(item.rarity));
    card.appendChild(rarityRow);
    if (item.description) {
      card.appendChild(_el('div',
        'font-size:11px;color:#64748b;text-align:center;line-height:1.4;flex:1;',
        item.description
      ));
    }
    card.appendChild(_el('div',
      'font-size:12px;color:#fbbf24;text-align:center;font-weight:600;',
      '💎 ' + (item.gem_price || 0) + ' gems'
    ));

    // Limited countdown timer displayed below the price
    if (item.is_limited && item.limited_expires_at) {
      var expMs = new Date(item.limited_expires_at).getTime();
      var msLeft = Math.max(0, expMs - Date.now());
      var hoursLeft = Math.floor(msLeft / 3600000);
      var minsLeft = Math.floor((msLeft % 3600000) / 60000);
      card.appendChild(_el('div',
        'color:#e53935;font-size:0.7rem;font-weight:600;text-align:center;margin-top:-4px;',
        '\u23F0 ' + hoursLeft + 'h ' + minsLeft + 'm left'
      ));
    }

    var btn;
    if (isEquipped) {
      btn = _el('button',
        'width:100%;padding:7px 0;border-radius:7px;border:none;cursor:default;font-size:12px;' +
        'font-weight:700;background:rgba(34,197,94,0.2);color:#22c55e;border:1px solid rgba(34,197,94,0.4);',
        '✓ Equipped'
      );
      btn.disabled = true;
    } else if (isOwned) {
      btn = _el('button',
        'width:100%;padding:7px 0;border-radius:7px;border:none;cursor:pointer;font-size:12px;' +
        'font-weight:700;background:rgba(59,130,246,0.25);color:#93c5fd;' +
        'border:1px solid rgba(59,130,246,0.45);transition:background 0.15s;',
        'Equip'
      );
      btn.addEventListener('mouseenter', function () { btn.style.background = 'rgba(59,130,246,0.40)'; });
      btn.addEventListener('mouseleave', function () { btn.style.background = 'rgba(59,130,246,0.25)'; });
      btn.addEventListener('click', function () { onEquip(item); });
    } else {
      btn = _el('button',
        'width:100%;padding:7px 0;border-radius:7px;border:none;cursor:pointer;font-size:12px;' +
        'font-weight:700;background:rgba(245,158,11,0.25);color:#fbbf24;' +
        'border:1px solid rgba(245,158,11,0.45);transition:background 0.15s;',
        'Buy 💎 ' + (item.gem_price || 0)
      );
      btn.addEventListener('mouseenter', function () { btn.style.background = 'rgba(245,158,11,0.40)'; });
      btn.addEventListener('mouseleave', function () { btn.style.background = 'rgba(245,158,11,0.25)'; });
      btn.addEventListener('click', function () { onBuy(item, btn); });
    }
    card.appendChild(btn);
    return card;
  }

  function _makeSpinner() {
    var wrap = _el('div', 'display:flex;justify-content:center;align-items:center;padding:60px 0;width:100%;');
    wrap.appendChild(_el('div',
      'width:36px;height:36px;border-radius:50%;border:3px solid #334155;' +
      'border-top-color:#fbbf24;animation:cosShopSpin 0.8s linear infinite;'
    ));
    return wrap;
  }

  function _activeCategoryName() {
    var map = { avatars: 'avatar', cardbacks: 'cardback', wineffects: 'wineffect', themes: 'theme' };
    return map[_activeCategory] || _activeCategory;
  }

  function _findShopItem(itemId) {
    if (!_shopData) return null;
    var found = null;
    Object.keys(_shopData).forEach(function (k) {
      (_shopData[k] || []).forEach(function (it) { if (it.id === itemId) found = it; });
    });
    return found;
  }

  function _renderGrid(container) {
    while (container.firstChild) container.removeChild(container.firstChild);
    if (!_isLoggedIn()) {
      container.appendChild(_el('div', 'text-align:center;padding:50px 20px;color:#64748b;font-size:15px;',
        'Log in to browse and equip cosmetics.'));
      return;
    }
    if (!_shopData) { container.appendChild(_makeSpinner()); return; }
    var items = _shopData[_activeCategory] || [];
    if (!items.length) {
      container.appendChild(_el('div', 'text-align:center;padding:50px 20px;color:#64748b;font-size:14px;',
        'No items available in this category yet.'));
      return;
    }
    var invMap = {};
    (_inventory || []).forEach(function (inv) { invMap[inv.item_id] = inv; });
    var grid = _el('div',
      'display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:14px;width:100%;'
    );
    items.forEach(function (item) {
      var inv = invMap[item.id] || null;
      var isOwned = !!inv, isEquipped = !!(inv && inv.equipped);
      grid.appendChild(_makeItemCard(item, isOwned, isEquipped,
        function (buyItem, btn) {
          btn.disabled = true; btn.textContent = '...';
          _purchaseItem(buyItem.id, function (err, data) {
            if (err || !data || !data.success) {
              btn.disabled = false;
              btn.textContent = 'Buy 💎 ' + (buyItem.gem_price || 0);
              _toast('Purchase failed. Check your gem balance.', 'error'); return;
            }
            if (data.newGemBalance !== undefined) _gemBalance = data.newGemBalance;
            _updateGemBadge();
            _fetchInventory(function (e2, inv2) { if (!e2) _inventory = inv2; _renderGrid(_gridWrapEl); });
            _toast('✨ ' + buyItem.name + ' purchased!', 'success');
          });
        },
        function (eqItem) {
          _equipItem(eqItem.id, function (err, data) {
            if (err || !data || !data.success) { _toast('Could not equip item. Try again.', 'error'); return; }
            var activeCat = _activeCategoryName();
            _inventory = (_inventory || []).map(function (e) {
              var si = _findShopItem(e.item_id);
              if (!si) return e;
              var ic = (si.category || '').toLowerCase();
              if (ic === activeCat || ic === _activeCategory) {
                return Object.assign({}, e, { equipped: e.item_id === eqItem.id ? 1 : 0 });
              }
              return e;
            });
            _renderGrid(_gridWrapEl);
            _toast('✨ ' + eqItem.name + ' equipped!', 'success');
          });
        }
      ));
    });
    container.appendChild(grid);
  }

  function _updateGemBadge() {
    if (_gemBadgeEl) _gemBadgeEl.textContent = '💎 ' + _gemBalance;
  }

  function _setActiveTab(catKey) {
    _activeCategory = catKey;
    CATEGORIES.forEach(function (cat) {
      var tab = _tabEls[cat.key]; if (!tab) return;
      tab.style.color = cat.key === catKey ? '#fbbf24' : '#64748b';
      tab.style.borderBottomColor = cat.key === catKey ? '#fbbf24' : 'transparent';
    });
    if (_gridWrapEl) _renderGrid(_gridWrapEl);
  }

  function _buildModal() {
    if (_modalEl) return;
    if (!document.getElementById('cos-shop-styles')) {
      var styleEl = document.createElement('style');
      styleEl.id = 'cos-shop-styles';
      styleEl.textContent = '@keyframes cosShopSpin { to { transform: rotate(360deg); } }';
      document.head.appendChild(styleEl);
    }
    _overlayEl = _el('div',
      'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:9999;' +
      'display:none;align-items:center;justify-content:center;backdrop-filter:blur(4px);'
    );
    _overlayEl.addEventListener('click', function (e) {
      if (e.target === _overlayEl) window.closeCosmeticsShop();
    });
    var panel = _el('div',
      'background:#0f0f1a;border:1px solid #334155;border-radius:16px;' +
      'width:min(650px,95vw);max-height:88vh;display:flex;flex-direction:column;' +
      'overflow:hidden;box-shadow:0 24px 80px rgba(0,0,0,0.7);position:relative;'
    );
    var header = _el('div',
      'display:flex;align-items:center;justify-content:space-between;' +
      'padding:16px 20px 14px;border-bottom:1px solid #1e293b;flex-shrink:0;gap:10px;'
    );
    header.appendChild(_el('div',
      'font-size:18px;font-weight:800;color:#f1f5f9;letter-spacing:0.05em;flex:1;',
      '✨ COSMETICS SHOP'
    ));
    _gemBadgeEl = _el('div',
      'padding:5px 14px;border-radius:20px;background:rgba(251,191,36,0.15);' +
      'color:#fbbf24;font-size:13px;font-weight:700;' +
      'border:1px solid rgba(251,191,36,0.35);white-space:nowrap;',
      '💎 ...'
    );
    header.appendChild(_gemBadgeEl);
    var closeBtn = _el('button',
      'background:none;border:none;cursor:pointer;font-size:20px;' +
      'color:#64748b;padding:0 4px;line-height:1;transition:color 0.15s;',
      '✕'
    );
    closeBtn.title = 'Close';
    closeBtn.addEventListener('mouseenter', function () { closeBtn.style.color = '#f1f5f9'; });
    closeBtn.addEventListener('mouseleave', function () { closeBtn.style.color = '#64748b'; });
    closeBtn.addEventListener('click', function () { window.closeCosmeticsShop(); });
    header.appendChild(closeBtn);
    panel.appendChild(header);
    var tabBar = _el('div',
      'display:flex;gap:0;padding:0 20px;border-bottom:1px solid #1e293b;' +
      'flex-shrink:0;overflow-x:auto;scrollbar-width:none;'
    );
    _tabEls = {};
    CATEGORIES.forEach(function (cat) {
      var isAct = cat.key === _activeCategory;
      var tab = _el('button',
        'background:none;border:none;border-bottom:2px solid transparent;' +
        'font-size:12px;font-weight:700;letter-spacing:0.06em;' +
        'padding:12px 14px;cursor:pointer;white-space:nowrap;' +
        'transition:color 0.15s,border-color 0.15s;' +
        'color:' + (isAct ? '#fbbf24' : '#64748b') + ';' +
        'border-bottom-color:' + (isAct ? '#fbbf24' : 'transparent') + ';',
        cat.icon + ' ' + cat.label
      );
      tab.addEventListener('click', function () { _setActiveTab(cat.key); });
      _tabEls[cat.key] = tab;
      tabBar.appendChild(tab);
    });
    panel.appendChild(tabBar);
    var scrollArea = _el('div',
      'flex:1;overflow-y:auto;padding:18px 20px 24px;' +
      'scrollbar-width:thin;scrollbar-color:#334155 #0f0f1a;'
    );
    _gridWrapEl = _el('div', 'min-height:120px;');
    scrollArea.appendChild(_gridWrapEl);
    panel.appendChild(scrollArea);
    _overlayEl.appendChild(panel);
    document.body.appendChild(_overlayEl);
    _modalEl = panel;
  }

  function _loadAndRender() {
    if (!_isLoggedIn()) { _renderGrid(_gridWrapEl); return; }
    while (_gridWrapEl.firstChild) _gridWrapEl.removeChild(_gridWrapEl.firstChild);
    _gridWrapEl.appendChild(_makeSpinner());
    var shopDone = false, invDone = false, gemDone = false;
    function _check() {
      if (shopDone && invDone && gemDone) { _updateGemBadge(); _renderGrid(_gridWrapEl); }
    }
    _fetchShop(function (err, s) { if (!err && s) _shopData = s; shopDone = true; _check(); });
    _fetchInventory(function (err, i) { if (!err) _inventory = i; invDone = true; _check(); });
    _fetchGemBalance(function (err, b) { if (!err) _gemBalance = b; gemDone = true; _check(); });
  }

  window.openCosmeticsShop = function () {
    if (_isOpen) return;
    _buildModal();
    _overlayEl.style.display = 'flex';
    _isOpen = true;
    _shopData = null; _inventory = []; _gemBalance = 0;
    if (_gemBadgeEl) _gemBadgeEl.textContent = '💎 ...';
    _loadAndRender();
    document._cosShopKeydown = function (e) {
      if (e.key === 'Escape') window.closeCosmeticsShop();
    };
    document.addEventListener('keydown', document._cosShopKeydown);
  };

  window.closeCosmeticsShop = function () {
    if (!_isOpen) return;
    if (_overlayEl) _overlayEl.style.display = 'none';
    _isOpen = false;
    if (document._cosShopKeydown) {
      document.removeEventListener('keydown', document._cosShopKeydown);
      delete document._cosShopKeydown;
    }
  };

}());
