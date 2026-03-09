/**
 * ui-megawheel.js -- Mega Wheel UI
 * Animated spin wheel with 3 gem tiers and prize reveal.
 * Global scope IIFE (no ES modules).
 * Public API: window.openMegaWheelModal, window.closeMegaWheelModal.
 */
(function () {
  'use strict';

  // --- Constants ---
  var SEGMENT_COLORS = ['#ef4444','#f97316','#eab308','#22c55e','#06b6d4','#3b82f6','#8b5cf6','#ec4899','#10b981'];
  var SEGMENT_COUNT    = 9;
  var SEGMENT_DEG      = 360 / SEGMENT_COUNT;
  var SPIN_REVOLUTIONS = 4;
  var SPIN_DURATION_MS = 3000;

  var TIERS = [
    { id: 'basic', label: 'BASIC',  cost: 50,  multiplier: 1 },
    { id: 'super', label: 'SUPER',  cost: 200, multiplier: 2 },
    { id: 'mega',  label: 'MEGA',   cost: 500, multiplier: 5 }
  ];

  // --- State ---
  var _selectedTier    = 'basic';
  var _gemBalance      = null;
  var _isSpinning      = false;
  var _currentRotation = 0;
  var _wheelEl         = null;
  var _spinBtnEl       = null;
  var _balanceEl       = null;
  var _historyBodyEl   = null;
  var _prizePopupEl    = null;
  var _tierCards       = {};

  // --- Helpers ---
  function _getAuthToken() {
    var key = typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken';
    return localStorage.getItem(key);
  }
  function _isLoggedIn() { return !!_getAuthToken(); }
  function _authHeaders() {
    var token = _getAuthToken();
    var h = { 'Content-Type': 'application/json' };
    if (token) h['Authorization'] = 'Bearer ' + token;
    return h;
  }
  function _toast(msg, type) {
    if (typeof showToast === 'function') { showToast(msg, type || 'info'); }
    else { console.log('[MegaWheel toast]', msg); }
  }
  function _timeAgo(dateStr) {
    try {
      var diff = Date.now() - new Date(dateStr).getTime();
      var s = Math.floor(diff / 1000);
      if (s < 60)  return s + 's ago';
      var m = Math.floor(s / 60);
      if (m < 60)  return m + 'm ago';
      var hr = Math.floor(m / 60);
      if (hr < 24) return hr + 'h ago';
      return Math.floor(hr / 24) + 'd ago';
    } catch (e) { return '--'; }
  }

  // --- API calls ---
  function _fetchGemBalance() {
    return fetch('/api/gems/balance', { headers: _authHeaders() })
      .then(function (r) { return r.json(); })
      .then(function (d) { return d.balance != null ? d.balance : null; })
      .catch(function () { return null; });
  }
  function _fetchConfig() {
    return fetch('/api/megawheel/config', { headers: _authHeaders() })
      .then(function (r) { return r.json(); })
      .catch(function () { return null; });
  }
  function _fetchHistory() {
    return fetch('/api/megawheel/history', { headers: _authHeaders() })
      .then(function (r) { return r.json(); })
      .catch(function () { return { history: [] }; });
  }
  function _postSpin(tier) {
    return fetch('/api/megawheel/spin', {
      method: 'POST',
      headers: _authHeaders(),
      body: JSON.stringify({ tier: tier })
    }).then(function (r) {
      if (!r.ok) return r.json().then(function (d) { throw new Error(d.error || 'Spin failed'); });
      return r.json();
    });
  }

  // --- SVG Wheel builder ---
  function _buildWheelSVG(segments) {
    var cx = 140, cy = 140, radius = 134;
    var ns = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 280 280');
    svg.setAttribute('width', 280); svg.setAttribute('height', 280);
    svg.style.cssText = 'display:block;';
    var defs = document.createElementNS(ns, 'defs');
    var filt = document.createElementNS(ns, 'filter');
    filt.setAttribute('id', 'mw-shadow');
    filt.setAttribute('x', '-20%'); filt.setAttribute('y', '-20%');
    filt.setAttribute('width', '140%'); filt.setAttribute('height', '140%');
    var feds = document.createElementNS(ns, 'feDropShadow');
    feds.setAttribute('dx', '0'); feds.setAttribute('dy', '2');
    feds.setAttribute('stdDeviation', '4');
    feds.setAttribute('flood-color', 'rgba(0,0,0,0.5)');
    filt.appendChild(feds); defs.appendChild(filt); svg.appendChild(defs);
    var n = segments.length, sliceDeg = 360 / n;
    segments.forEach(function (seg, i) {
      var sa = i * sliceDeg - 90, ea = sa + sliceDeg;
      var sr = sa * Math.PI / 180, er = ea * Math.PI / 180;
      var x1 = cx + radius * Math.cos(sr), y1 = cy + radius * Math.sin(sr);
      var x2 = cx + radius * Math.cos(er), y2 = cy + radius * Math.sin(er);
      var d = 'M '+cx+' '+cy+' L '+x1.toFixed(3)+' '+y1.toFixed(3);
      d += ' A '+radius+' '+radius+' 0 0 1 '+x2.toFixed(3)+' '+y2.toFixed(3)+' Z';
      var path = document.createElementNS(ns, 'path');
      path.setAttribute('d', d);
      path.setAttribute('fill', SEGMENT_COLORS[i % SEGMENT_COLORS.length]);
      path.setAttribute('stroke', '#1a1a2e');
      path.setAttribute('stroke-width', '2');
      svg.appendChild(path);
      var ma = (sa + sliceDeg / 2) * Math.PI / 180;
      var lx = cx + radius * 0.65 * Math.cos(ma);
      var ly = cy + radius * 0.65 * Math.sin(ma);
      var txt = document.createElementNS(ns, 'text');
      txt.setAttribute('x', lx.toFixed(3));
      txt.setAttribute('y', ly.toFixed(3));
      txt.setAttribute('text-anchor', 'middle');
      txt.setAttribute('dominant-baseline', 'middle');
      var rot = sa + sliceDeg / 2 + 90;
      txt.setAttribute('transform', 'rotate('+rot+','+lx.toFixed(3)+','+ly.toFixed(3)+')');
      txt.setAttribute('fill', '#ffffff');
      txt.setAttribute('font-size', '11');
      txt.setAttribute('font-weight', 'bold');
      txt.setAttribute('font-family', 'Arial, sans-serif');
      txt.setAttribute('filter', 'url(#mw-shadow)');
      txt.textContent = seg.label || '';
      svg.appendChild(txt);
    });
    var ring = document.createElementNS(ns, 'circle');
    ring.setAttribute('cx', 140); ring.setAttribute('cy', 140);
    ring.setAttribute('r', 134); ring.setAttribute('fill', 'none');
    ring.setAttribute('stroke', '#ffd700'); ring.setAttribute('stroke-width', '4');
    svg.appendChild(ring);
    var cc = document.createElementNS(ns, 'circle');
    cc.setAttribute('cx', 140); cc.setAttribute('cy', 140); cc.setAttribute('r', 18);
    cc.setAttribute('fill', '#1a1a2e'); cc.setAttribute('stroke', '#ffd700');
    cc.setAttribute('stroke-width', '3');
    svg.appendChild(cc);
    var ct = document.createElementNS(ns, 'text');
    ct.setAttribute('x', 140); ct.setAttribute('y', 140);
    ct.setAttribute('text-anchor', 'middle'); ct.setAttribute('dominant-baseline', 'middle');
    ct.setAttribute('fill', '#ffd700'); ct.setAttribute('font-size', '16');
    ct.textContent = '🎡';
    svg.appendChild(ct);
    return svg;
  }

  function _buildDefaultSegments() {
    return [
      { label: '5 Gems',   type: 'gems',    amount: 5   },
      { label: '10 Gems',  type: 'gems',    amount: 10  },
      { label: '25 Gems',  type: 'gems',    amount: 25  },
      { label: '$1',      type: 'cash',    amount: 1   },
      { label: '50 Gems',  type: 'gems',    amount: 50  },
      { label: '$5',      type: 'cash',    amount: 5   },
      { label: '100 Gems', type: 'gems',    amount: 100 },
      { label: '$25',     type: 'cash',    amount: 25  },
      { label: 'JACKPOT',  type: 'jackpot', amount: 100 }
    ];
  }

  // --- Build modal DOM ---
  function _buildModal() {
    var overlay = document.createElement('div');
    overlay.id = 'megawheel-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.75);display:flex;align-items:center;justify-content:center;z-index:10400;padding:16px;';
    overlay.addEventListener('click', function (e) { if (e.target === overlay) closeMegaWheelModal(); });

    var panel = document.createElement('div');
    panel.id = 'megawheel-panel';
    panel.style.cssText = 'background:#1a1a2e;border:2px solid #ffd700;border-radius:16px;max-width:520px;width:100%;max-height:90vh;overflow-y:auto;padding:24px;box-sizing:border-box;color:#e0e0e0;font-family:Arial,sans-serif;position:relative;';

    // Header
    var hdr = document.createElement('div');
    hdr.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;';
    var ttl = document.createElement('h2');
    ttl.style.cssText = 'margin:0;color:#ffd700;font-size:1.5rem;letter-spacing:2px;';
    ttl.textContent = '🎡 MEGA WHEEL';
    var cbtn = document.createElement('button');
    cbtn.textContent = '×';
    cbtn.style.cssText = 'background:none;border:2px solid #555;border-radius:8px;color:#aaa;font-size:1.2rem;cursor:pointer;padding:4px 10px;transition:border-color 0.2s,color 0.2s;';
    cbtn.addEventListener('mouseover', function () { cbtn.style.borderColor = '#ffd700'; cbtn.style.color = '#ffd700'; });
    cbtn.addEventListener('mouseout',  function () { cbtn.style.borderColor = '#555';    cbtn.style.color = '#aaa'; });
    cbtn.addEventListener('click', closeMegaWheelModal);
    hdr.appendChild(ttl); hdr.appendChild(cbtn); panel.appendChild(hdr);

    // Gem balance row
    var balRow = document.createElement('div');
    balRow.style.cssText = 'display:flex;align-items:center;justify-content:space-between;background:#0d0d1a;border:1px solid #333;border-radius:10px;padding:10px 14px;margin-bottom:16px;';
    var balL = document.createElement('div');
    balL.style.cssText = 'display:flex;align-items:center;gap:8px;';
    var balLbl = document.createElement('span');
    balLbl.style.cssText = 'color:#aaa;font-size:0.85rem;'; balLbl.textContent = 'Your Gems:';
    var balDisp = document.createElement('span');
    balDisp.id = 'mw-gem-balance';
    balDisp.style.cssText = 'color:#a78bfa;font-weight:bold;font-size:1rem;';
    balDisp.textContent = '💎 --';
    _balanceEl = balDisp;
    balL.appendChild(balLbl); balL.appendChild(balDisp);
    var ggBtn = document.createElement('button');
    ggBtn.textContent = '+ Get Gems';
    ggBtn.style.cssText = 'background:linear-gradient(135deg,#7c3aed,#5b21b6);border:none;border-radius:8px;color:#fff;font-size:0.8rem;cursor:pointer;padding:6px 12px;font-weight:bold;transition:opacity 0.2s;';
    ggBtn.addEventListener('mouseover', function () { ggBtn.style.opacity = '0.8'; });
    ggBtn.addEventListener('mouseout',  function () { ggBtn.style.opacity = '1'; });
    ggBtn.addEventListener('click', function () { if (typeof openGemsShop === 'function') openGemsShop(); });
    balRow.appendChild(balL); balRow.appendChild(ggBtn); panel.appendChild(balRow);

    // Tier selector
    var tierRow = document.createElement('div');
    tierRow.style.cssText = 'display:flex;gap:10px;margin-bottom:20px;';
    var tierEmojis = { basic: '⭐', super: '🌟', mega: '💫' };
    TIERS.forEach(function (tier) {
      var card = document.createElement('div');
      card.style.cssText = 'flex:1;text-align:center;padding:12px 6px;border-radius:10px;border:2px solid #333;cursor:pointer;transition:border-color 0.2s,background 0.2s;background:#0d0d1a;user-select:none;';
      var em = document.createElement('div'); em.style.cssText = 'font-size:1.4rem;margin-bottom:4px;'; em.textContent = tierEmojis[tier.id] || '';
      var nm = document.createElement('div'); nm.style.cssText = 'font-weight:bold;font-size:0.85rem;color:#ffd700;letter-spacing:1px;'; nm.textContent = tier.label;
      var ct2 = document.createElement('div'); ct2.style.cssText = 'font-size:0.75rem;color:#a78bfa;margin-top:2px;'; ct2.textContent = tier.cost + '💎';
      var ml = document.createElement('div'); ml.style.cssText = 'font-size:0.7rem;color:#888;margin-top:2px;'; ml.textContent = tier.multiplier + 'x prizes';
      card.appendChild(em); card.appendChild(nm); card.appendChild(ct2); card.appendChild(ml);
      card.addEventListener('click', (function (id) { return function () { _setTier(id); }; })(tier.id));
      tierRow.appendChild(card); _tierCards[tier.id] = card;
    });
    panel.appendChild(tierRow);

    // Wheel area
    var wArea = document.createElement('div');
    wArea.style.cssText = 'display:flex;flex-direction:column;align-items:center;margin-bottom:20px;position:relative;';
    var ptr = document.createElement('div');
    ptr.style.cssText = 'width:0;height:0;border-left:12px solid transparent;border-right:12px solid transparent;border-top:22px solid #ffd700;margin-bottom:-4px;z-index:10400;position:relative;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.6));';
    wArea.appendChild(ptr);
    var wWrap = document.createElement('div');
    wWrap.id = 'mw-wheel-wrapper';
    wWrap.style.cssText = 'width:280px;height:280px;border-radius:50%;overflow:hidden;border:4px solid #ffd700;box-shadow:0 0 30px rgba(255,215,0,0.3);transition:none;will-change:transform;';
    _wheelEl = wWrap;
    wWrap.appendChild(_buildWheelSVG(_buildDefaultSegments()));
    wArea.appendChild(wWrap);

    // Prize popup
    var pzPop = document.createElement('div');
    pzPop.id = 'mw-prize-popup';
    pzPop.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) scale(0);background:linear-gradient(135deg,#1a1a2e,#0d0d1a);border:2px solid #ffd700;border-radius:16px;padding:24px 32px;text-align:center;z-index:10400;transition:transform 0.3s cubic-bezier(0.34,1.56,0.64,1);pointer-events:none;min-width:180px;';
    _prizePopupEl = pzPop;
    var pzE = document.createElement('div'); pzE.id = 'mw-prize-emoji'; pzE.style.cssText = 'font-size:2.5rem;margin-bottom:8px;';
    var pzL = document.createElement('div'); pzL.id = 'mw-prize-label'; pzL.style.cssText = 'color:#ffd700;font-size:1.4rem;font-weight:bold;';
    var pzD = document.createElement('div'); pzD.id = 'mw-prize-desc'; pzD.style.cssText = 'color:#aaa;font-size:0.85rem;margin-top:4px;';
    pzPop.appendChild(pzE); pzPop.appendChild(pzL); pzPop.appendChild(pzD);
    wArea.appendChild(pzPop); panel.appendChild(wArea);

    // Spin button
    var sb = document.createElement('button');
    sb.id = 'mw-spin-btn';
    sb.textContent = '🎡 SPIN THE WHEEL';
    sb.style.cssText = 'width:100%;padding:14px;font-size:1.1rem;font-weight:bold;letter-spacing:2px;background:linear-gradient(135deg,#ffd700,#f59e0b);color:#1a1a2e;border:none;border-radius:12px;cursor:pointer;transition:opacity 0.2s,transform 0.1s;margin-bottom:20px;';
    sb.addEventListener('mouseover', function () { if (!_isSpinning) sb.style.opacity = '0.85'; });
    sb.addEventListener('mouseout',  function () { sb.style.opacity = '1'; });
    sb.addEventListener('mousedown', function () { if (!_isSpinning) sb.style.transform = 'scale(0.97)'; });
    sb.addEventListener('mouseup',   function () { sb.style.transform = 'scale(1)'; });
    sb.addEventListener('click', _onSpin);
    _spinBtnEl = sb; panel.appendChild(sb);

    // History section
    var hSec = document.createElement('div'); hSec.style.cssText = 'border-top:1px solid #333;padding-top:16px;';
    var hTitle = document.createElement('div');
    hTitle.style.cssText = 'color:#888;font-size:0.8rem;font-weight:bold;letter-spacing:1px;margin-bottom:10px;text-transform:uppercase;';
    hTitle.textContent = 'Recent Spins';
    var hTbl = document.createElement('table'); hTbl.style.cssText = 'width:100%;border-collapse:collapse;font-size:0.8rem;';
    var hThead = document.createElement('thead');
    var hThr = document.createElement('tr');
    ['Tier', 'Prize', 'Time'].forEach(function (c) {
      var th = document.createElement('th');
      th.style.cssText = 'text-align:left;color:#666;padding:4px 6px;font-weight:normal;border-bottom:1px solid #222;';
      th.textContent = c; hThr.appendChild(th);
    });
    hThead.appendChild(hThr); hTbl.appendChild(hThead);
    var hTbody = document.createElement('tbody');
    hTbody.id = 'mw-history-body'; _historyBodyEl = hTbody;
    var lr = document.createElement('tr'); var lc = document.createElement('td');
    lc.setAttribute('colspan', '3');
    lc.style.cssText = 'color:#555;text-align:center;padding:12px;';
    lc.textContent = 'Loading history...';
    lr.appendChild(lc); hTbody.appendChild(lr); hTbl.appendChild(hTbody);
    hSec.appendChild(hTitle); hSec.appendChild(hTbl); panel.appendChild(hSec);
    overlay.appendChild(panel);
    return overlay;
  }

  // --- Tier selection ---
  function _setTier(tierId) {
    _selectedTier = tierId;
    Object.keys(_tierCards).forEach(function (id) {
      var c = _tierCards[id];
      if (id === tierId) { c.style.borderColor = '#ffd700'; c.style.background = 'rgba(255,215,0,0.08)'; }
      else               { c.style.borderColor = '#333';    c.style.background = '#0d0d1a'; }
    });
  }

  // --- Balance refresh ---
  function _refreshBalance() {
    if (!_isLoggedIn()) {
      if (_balanceEl) _balanceEl.textContent = '💎 --';
      _gemBalance = null; return Promise.resolve(null);
    }
    return _fetchGemBalance().then(function (bal) {
      _gemBalance = bal;
      if (_balanceEl) _balanceEl.textContent = bal != null ? ('💎 ' + bal + ' Gems') : '💎 --';
      return bal;
    });
  }

  // --- History refresh ---
  function _refreshHistory() {
    if (!_historyBodyEl) return;
    _fetchHistory().then(function (data) {
      var rows = (data && data.history) ? data.history.slice(0, 10) : [];
      while (_historyBodyEl.firstChild) _historyBodyEl.removeChild(_historyBodyEl.firstChild);
      if (rows.length === 0) {
        var er = document.createElement('tr'); var ec = document.createElement('td');
        ec.setAttribute('colspan', '3'); ec.style.cssText = 'color:#555;text-align:center;padding:12px;';
        ec.textContent = 'No spins yet.'; er.appendChild(ec); _historyBodyEl.appendChild(er); return;
      }
      var rEmoji = { basic: '⭐', super: '🌟', mega: '💫' };
      rows.forEach(function (row) {
        var tr = document.createElement('tr');
        var tc = document.createElement('td'); tc.style.cssText = 'padding:5px 6px;border-bottom:1px solid #1a1a1a;';
        var tn = row.spin_tier || '--'; tc.textContent = (rEmoji[tn] || '') + ' ' + tn;
        var pc = document.createElement('td'); pc.style.cssText = 'padding:5px 6px;border-bottom:1px solid #1a1a1a;color:#ffd700;';
        pc.textContent = (row.prize_type === 'gems' || row.prize_type === 'jackpot') ? ('💎 ' + row.prize_amount) : ('$' + parseFloat(row.prize_amount || 0).toFixed(2));
        var tic = document.createElement('td'); tic.style.cssText = 'padding:5px 6px;border-bottom:1px solid #1a1a1a;color:#666;'; tic.textContent = _timeAgo(row.created_at);
        tr.appendChild(tc); tr.appendChild(pc); tr.appendChild(tic); _historyBodyEl.appendChild(tr);
      });
    });
  }

  // --- Update wheel from server config ---
  function _updateWheelFromConfig(config) {
    if (!config || !config.segments || !_wheelEl) return;
    while (_wheelEl.firstChild) _wheelEl.removeChild(_wheelEl.firstChild);
    _wheelEl.appendChild(_buildWheelSVG(config.segments));
  }

  // --- Wheel animation ---
  // Each segment = SEGMENT_DEG (40deg). Segment 0 starts at the top.
  // To land segment i under the top pointer we rotate:
  //   (4 full revolutions) + (360 - i*40 - 20) degrees from current position.
  function _animateToSegment(segmentIndex) {
    return new Promise(function (resolve) {
      var norm = ((_currentRotation % 360) + 360) % 360;
      var targetAngle = 360 - (segmentIndex * SEGMENT_DEG) - (SEGMENT_DEG / 2);
      var delta = ((targetAngle - norm) + 360) % 360;
      var newRotation = _currentRotation + SPIN_REVOLUTIONS * 360 + delta;
      if (_wheelEl) {
        _wheelEl.style.transition = 'transform ' + SPIN_DURATION_MS + 'ms cubic-bezier(0.17, 0.67, 0.12, 0.99)';
        _wheelEl.style.transform  = 'rotate(' + newRotation + 'deg)';
      }
      _currentRotation = newRotation;
      setTimeout(function () {
        if (_wheelEl) _wheelEl.style.transition = 'none';
        resolve();
      }, SPIN_DURATION_MS + 100);
    });
  }

  // --- Prize popup ---
  function _showPrizePopup(prize) {
    if (!_prizePopupEl) return;
    var eEl = document.getElementById('mw-prize-emoji');
    var lEl = document.getElementById('mw-prize-label');
    var dEl = document.getElementById('mw-prize-desc');
    if (prize.type === 'jackpot') {
      if (eEl) eEl.textContent = '🏆';
      if (lEl) lEl.textContent = 'JACKPOT!';
      if (dEl) dEl.textContent = '$' + parseFloat(prize.amount || 0).toFixed(2) + ' Cash';
    } else if (prize.type === 'cash') {
      if (eEl) eEl.textContent = '💰';
      if (lEl) lEl.textContent = '$' + parseFloat(prize.amount || 0).toFixed(2);
      if (dEl) dEl.textContent = 'Cash prize added to your balance';
    } else {
      if (eEl) eEl.textContent = '💎';
      if (lEl) lEl.textContent = (prize.amount || 0) + ' Gems';
      if (dEl) dEl.textContent = 'Gems added to your account';
    }
    _prizePopupEl.style.pointerEvents = 'auto';
    _prizePopupEl.style.transform = 'translate(-50%, -50%) scale(1)';
    setTimeout(function () {
      if (_prizePopupEl) {
        _prizePopupEl.style.transform = 'translate(-50%, -50%) scale(0)';
        _prizePopupEl.style.pointerEvents = 'none';
      }
    }, 3000);
  }

  // --- Spin handler ---
  function _onSpin() {
    if (_isSpinning) return;
    if (!_isLoggedIn()) { _toast('Log in to spin!', 'error'); return; }
    var tierObj = null;
    for (var i = 0; i < TIERS.length; i++) {
      if (TIERS[i].id === _selectedTier) { tierObj = TIERS[i]; break; }
    }
    if (!tierObj) return;
    if (_gemBalance !== null && _gemBalance < tierObj.cost) { _toast('Not enough gems! Get more in the Gem Shop.', 'error'); return; }
    _isSpinning = true;
    if (_spinBtnEl) {
      _spinBtnEl.textContent = 'Spinning...';
      _spinBtnEl.disabled = true; _spinBtnEl.style.opacity = '0.6'; _spinBtnEl.style.cursor = 'not-allowed';
    }
    if (_prizePopupEl) {
      _prizePopupEl.style.transform = 'translate(-50%, -50%) scale(0)';
      _prizePopupEl.style.pointerEvents = 'none';
    }
    _postSpin(_selectedTier)
      .then(function (result) {
        var segIdx = (result.segmentIndex != null) ? result.segmentIndex : 0;
        var prize  = result.prize || {};
        return _animateToSegment(segIdx).then(function () {
          _showPrizePopup(prize);
          var msg = '';
          if (prize.type === 'jackpot')   { msg = 'JACKPOT! You won $' + parseFloat(prize.amount || 0).toFixed(2) + '!'; }
          else if (prize.type === 'cash') { msg = 'You won $' + parseFloat(prize.amount || 0).toFixed(2) + ' cash!'; }
          else                            { msg = 'You won ' + (prize.amount || 0) + ' gems!'; }
          _toast(msg, 'success');
          return _refreshBalance();
        });
      })
      .catch(function (err) { _toast((err && err.message) || 'Spin failed. Please try again.', 'error'); })
      .then(function () {
        _isSpinning = false;
        if (_spinBtnEl) {
          _spinBtnEl.textContent = '🎡 SPIN THE WHEEL';
          _spinBtnEl.disabled = false; _spinBtnEl.style.opacity = '1'; _spinBtnEl.style.cursor = 'pointer';
        }
        _refreshHistory();
      });
  }

  // --- Open modal ---
  function openMegaWheelModal() {
    var existing = document.getElementById('megawheel-overlay');
    if (existing && existing.parentNode) existing.parentNode.removeChild(existing);
    _selectedTier = 'basic'; _isSpinning = false; _currentRotation = 0;
    _wheelEl = null; _spinBtnEl = null; _balanceEl = null;
    _historyBodyEl = null; _prizePopupEl = null; _tierCards = {};
    var overlay = _buildModal();
    document.body.appendChild(overlay);
    _setTier('basic');
    overlay.style.opacity = '0'; overlay.style.transition = 'opacity 0.25s';
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        overlay.style.opacity = '1';
      });
    });
    _refreshBalance();
    _refreshHistory();
    _fetchConfig().then(function (config) { _updateWheelFromConfig(config); });
  }

  // --- Close modal ---
  function closeMegaWheelModal() {
    var overlay = document.getElementById('megawheel-overlay');
    if (!overlay) return;
    overlay.style.transition = 'opacity 0.25s'; overlay.style.opacity = '0';
    setTimeout(function () { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }, 250);
  }

  // --- Keyboard shortcut ---
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && document.getElementById('megawheel-overlay')) closeMegaWheelModal();
  });

  // --- Public API ---
  window.openMegaWheelModal  = openMegaWheelModal;
  window.closeMegaWheelModal = closeMegaWheelModal;

}());
