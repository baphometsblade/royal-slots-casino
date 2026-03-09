/**
 * ui-rental.js -- VIP Game Rentals UI
 * Self-contained IIFE module. Global scope (no ES modules).
 * Public API: window.openRentalModal(gameId?), window.closeRentalModal()
 */
(function () {
    'use strict';

    var RENTAL_TIERS = [
        { id: '1hour',     name: '1 Hour Access',    creditPrice: 1.99,  gemPrice: 200  },
        { id: '24hours',   name: '24 Hour Access',   creditPrice: 4.99,  gemPrice: 500  },
        { id: '7days',     name: '7 Day Access',     creditPrice: 14.99, gemPrice: 1500, bestValue: true },
        { id: 'permanent', name: 'Permanent Unlock', creditPrice: 29.99, gemPrice: 3000, permanent: true }
    ];

    function _getAuthToken() {
        return localStorage.getItem(typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken') || null;
    }

    function _authHeaders() {
        var t = _getAuthToken();
        return t ? { Authorization: 'Bearer ' + t } : {};
    }

    function _gameName(gameId) {
        if (typeof GAMES !== 'undefined') {
            var g = GAMES.find(function (x) { return x.id === gameId; });
            if (g) return g.name;
        }
        return gameId.replace(/-/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
    }

    function _formatExpiry(expiresAt) {
        if (!expiresAt) return '';
        var d = new Date(expiresAt), now = new Date(), ms = d - now;
        if (ms <= 0) return 'Expired';
        var h = ms / 3600000;
        if (h < 1) { var m = Math.floor(ms / 60000); return m + ' min' + (m !== 1 ? 's' : '') + ' remaining'; }
        if (h < 24) { var hrs = Math.floor(h); return hrs + ' hour' + (hrs !== 1 ? 's' : '') + ' remaining'; }
        var days = Math.floor(h / 24); return days + ' day' + (days !== 1 ? 's' : '') + ' remaining';
    }

    function _formatExpiryDate(expiresAt) {
        if (!expiresAt) return '';
        return new Date(expiresAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
    function _showToast(msg) {
        var t = document.createElement('div');
        t.textContent = msg;
        t.style.cssText = 'position:fixed;bottom:32px;left:50%;transform:translateX(-50%);background:linear-gradient(135deg,#fbbf24,#d97706);color:#000;font-weight:800;font-size:15px;padding:12px 28px;border-radius:999px;z-index:10400;box-shadow:0 4px 24px rgba(251,191,36,0.5);pointer-events:none;transition:opacity 0.4s';
        document.body.appendChild(t);
        setTimeout(function () { t.style.opacity = '0'; }, 2200);
        setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 2700);
    }

    var _overlay = null, _panel = null, _currentGameId = null;
    var _selectedTierId = '24hours', _paymentType = 'credits';

    function _ensureOverlay() {
        if (_overlay) return;
        _overlay = document.createElement('div');
        _overlay.id = 'rentalOverlay';
        _overlay.style.cssText = 'display:none;position:fixed;inset:0;background:rgba(0,0,0,0.78);z-index:10400;align-items:center;justify-content:center;padding:16px';
        _overlay.addEventListener('click', function (e) { if (e.target === _overlay) closeRentalModal(); });
        document.body.appendChild(_overlay);
    }

    function _clearPanel() {
        if (_panel && _panel.parentNode) _panel.parentNode.removeChild(_panel);
        _panel = null;
    }
    var _cssInjected = false;
    function _injectCSS() {
        if (_cssInjected) return;
        _cssInjected = true;
        var s = document.createElement('style');
        s.id = 'rentalModalStyles';
        var r = [];
        r.push('#rentalOverlay{display:none}');
        r.push('#rentalOverlay.active{display:flex}');
        r.push('.rental-panel{background:#0f0f1a;border:1px solid #334155;border-radius:16px;overflow:hidden;box-shadow:0 24px 80px rgba(0,0,0,.8);animation:rentalSlideIn .28s cubic-bezier(.34,1.56,.64,1);position:relative}');
        r.push('@keyframes rentalSlideIn{from{opacity:0;transform:translateY(32px) scale(.96)}to{opacity:1;transform:none}}');
        r.push('.rental-header{display:flex;align-items:center;justify-content:space-between;padding:18px 22px 16px;border-bottom:1px solid #1e293b;background:linear-gradient(135deg,rgba(251,191,36,.06),rgba(217,119,6,.04))}');
        r.push('.rental-header-title{font-size:16px;font-weight:800;color:#fbbf24;letter-spacing:.04em;text-transform:uppercase;word-break:break-word}');
        r.push('.rental-close-btn{background:rgba(255,255,255,.06);border:1px solid #334155;color:#94a3b8;width:32px;height:32px;border-radius:8px;cursor:pointer;font-size:18px;display:flex;align-items:center;justify-content:center;transition:background .15s;flex-shrink:0}');
        r.push('.rental-close-btn:hover{background:rgba(239,68,68,.18);color:#f87171;border-color:rgba(239,68,68,.4)}');
        r.push('.rental-body{padding:20px 22px;overflow-y:auto;max-height:calc(90vh - 80px)}');
        r.push('.rental-game-preview{display:flex;align-items:center;gap:14px;padding:14px 16px;border-radius:12px;background:rgba(239,68,68,.07);border:1px solid rgba(239,68,68,.25);margin-bottom:16px}');
        r.push('.rental-game-preview.has-access{background:rgba(16,185,129,.07);border-color:rgba(16,185,129,.25)}');
        r.push('.rental-lock-icon{font-size:32px;flex-shrink:0;line-height:1}');
        r.push('.rental-game-info{flex:1;min-width:0}');
        r.push('.rental-game-name{font-size:15px;font-weight:700;color:#f1f5f9;margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}');
        r.push('.rental-badge{display:inline-block;font-size:10px;font-weight:800;letter-spacing:.08em;padding:2px 8px;border-radius:999px;text-transform:uppercase}');
        r.push('.rental-badge.premium{background:rgba(251,191,36,.15);color:#fbbf24;border:1px solid rgba(251,191,36,.3)}');
        r.push('.rental-badge.active{background:rgba(16,185,129,.15);color:#10b981;border:1px solid rgba(16,185,129,.3)}');
        r.push('.rental-badge.tier{background:rgba(139,92,246,.15);color:#a78bfa;border:1px solid rgba(139,92,246,.3)}');
        r.push('.rental-access-status{padding:10px 14px;border-radius:10px;font-size:13px;font-weight:600;margin-bottom:18px}');
        r.push('.rental-access-status.locked{background:rgba(239,68,68,.1);color:#fca5a5;border:1px solid rgba(239,68,68,.3)}');
        r.push('.rental-access-status.unlocked{background:rgba(16,185,129,.1);color:#6ee7b7;border:1px solid rgba(16,185,129,.3)}');
        r.push('.rental-tier-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px}');
        r.push('.rental-tier-card{position:relative;background:#161627;border:2px solid #334155;border-radius:12px;padding:14px 10px 12px;cursor:pointer;transition:border-color .15s,background .15s,transform .1s;text-align:center}');
        r.push('.rental-tier-card:hover{border-color:#475569;background:#1e1e35;transform:translateY(-1px)}');
        r.push('.rental-tier-card.selected{border-color:#fbbf24;background:rgba(251,191,36,.07)}');
        r.push('.rental-tier-badge{position:absolute;top:-10px;left:50%;transform:translateX(-50%);font-size:9px;font-weight:800;letter-spacing:.08em;padding:2px 8px;border-radius:999px;text-transform:uppercase;white-space:nowrap}');
        r.push('.rental-tier-badge.best-value{background:linear-gradient(135deg,#10b981,#059669);color:#fff}');
        r.push('.rental-tier-badge.permanent{background:linear-gradient(135deg,#fbbf24,#d97706);color:#000}');
        r.push('.rental-tier-name{font-size:12px;font-weight:700;color:#cbd5e1;margin-bottom:8px}');
        r.push('.rental-tier-price{font-size:11px;color:#94a3b8;line-height:1.6}');
        r.push('.rental-tier-price .credit-price{font-size:15px;font-weight:800;color:#f1f5f9;display:block}');
        r.push('.rental-tier-price .gem-price{font-size:12px;font-weight:700;color:#a78bfa}');
        r.push('.rental-payment-toggle{display:flex;background:#161627;border:1px solid #334155;border-radius:10px;padding:3px;margin-bottom:16px;gap:2px}');
        r.push('.rental-pay-btn{flex:1;padding:8px 4px;border:none;border-radius:8px;background:transparent;color:#64748b;font-size:13px;font-weight:700;cursor:pointer;transition:background .15s,color .15s}');
        r.push('.rental-pay-btn.active{background:rgba(251,191,36,.15);color:#fbbf24}');
        r.push('.rental-unlock-btn{width:100%;padding:14px;background:linear-gradient(135deg,#fbbf24,#d97706);color:#000;font-weight:800;font-size:15px;letter-spacing:.04em;border:none;border-radius:12px;cursor:pointer;transition:opacity .15s,transform .1s;text-transform:uppercase}');
        r.push('.rental-unlock-btn:hover:not(:disabled){opacity:.9;transform:translateY(-1px)}');
        r.push('.rental-unlock-btn:active:not(:disabled){transform:translateY(1px)}');
        r.push('.rental-unlock-btn:disabled{opacity:.5;cursor:not-allowed}');
        r.push('.rental-list{display:flex;flex-direction:column;gap:10px;margin-bottom:18px}');
        r.push('.rental-list-item{display:flex;align-items:center;gap:12px;padding:12px 14px;background:#161627;border:1px solid #334155;border-radius:12px}');
        r.push('.rental-list-icon{font-size:24px;flex-shrink:0}');
        r.push('.rental-list-info{flex:1;min-width:0}');
        r.push('.rental-list-name{font-size:14px;font-weight:700;color:#f1f5f9;margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}');
        r.push('.rental-list-expiry{font-size:12px;color:#94a3b8}');
        r.push('.rental-list-expiry.expiring-soon{color:#fb923c}');
        r.push('.rental-empty{text-align:center;padding:32px 20px;color:#64748b;font-size:14px;line-height:1.6}');
        r.push('.rental-empty-icon{font-size:48px;display:block;margin-bottom:12px}');
        r.push('.rental-browse-btn{width:100%;padding:13px;background:rgba(251,191,36,.12);color:#fbbf24;font-weight:700;font-size:14px;border:1px solid rgba(251,191,36,.3);border-radius:12px;cursor:pointer;transition:background .15s}');
        r.push('.rental-browse-btn:hover{background:rgba(251,191,36,.2)}');
        r.push('.rental-section-label{font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#475569;margin-bottom:10px}');
        s.textContent = r.join('\n');
        document.head.appendChild(s);
    }

    function _makeHeader(titleText) {
        var hdr = document.createElement('div');
        hdr.className = 'rental-header';
        var ttl = document.createElement('div');
        ttl.className = 'rental-header-title';
        ttl.textContent = titleText;
        var btn = document.createElement('button');
        btn.className = 'rental-close-btn';
        btn.innerHTML = '&times;';
        btn.setAttribute('aria-label', 'Close');
        btn.addEventListener('click', closeRentalModal);
        hdr.appendChild(ttl);
        hdr.appendChild(btn);
        return hdr;
    }

    function _makeSectionLabel(text) {
        var el = document.createElement('div');
        el.className = 'rental-section-label';
        el.textContent = text;
        return el;
    }

    function _updateUnlockBtnLabel(btn) {
        var tier = RENTAL_TIERS.find(function (t) { return t.id === _selectedTierId; });
        if (!tier) { btn.textContent = 'UNLOCK ACCESS'; return; }
        var price = _paymentType === 'gems'
            ? ('💎 ' + tier.gemPrice.toLocaleString() + ' Gems')
            : ('$' + tier.creditPrice.toFixed(2));
        btn.textContent = 'UNLOCK ACCESS — ' + price;
    }

    function _loadGameStatus(gameId, statusDiv, preview, lockIcon, unlockBtn) {
        var token = _getAuthToken();
        if (!token) {
            statusDiv.className = 'rental-access-status locked';
            statusDiv.textContent = '🔒 Log in to check your access status';
            return;
        }
        var h = Object.assign({ 'Content-Type': 'application/json' }, _authHeaders());
        fetch('/api/rentals/status/' + encodeURIComponent(gameId), { headers: h })
            .then(function (r) { return r.json(); })
            .then(function (data) {
                if (data.unlocked) {
                    preview.classList.add('has-access');
                    lockIcon.textContent = '🔓';
                    statusDiv.className = 'rental-access-status unlocked';
                    if (data.rental && data.rental.permanent) {
                        statusDiv.textContent = '✓ Permanent Access';
                    } else if (data.rental && data.rental.expires_at) {
                        statusDiv.textContent = '✓ You have access until ' + _formatExpiryDate(data.rental.expires_at);
                    } else {
                        statusDiv.textContent = '✓ You have access to this game';
                    }
                    unlockBtn.textContent = 'EXTEND ACCESS';
                } else {
                    statusDiv.className = 'rental-access-status locked';
                    statusDiv.textContent = '🔒 This game requires VIP access';
                    _updateUnlockBtnLabel(unlockBtn);
                }
            })
            .catch(function () {
                statusDiv.className = 'rental-access-status locked';
                statusDiv.textContent = '🔒 This game requires VIP access';
            });
    }

    function _handleRent(gameId, unlockBtn, statusDiv, preview, lockIcon) {
        var token = _getAuthToken();
        if (!token) { _showToast('Please log in to rent games'); return; }
        unlockBtn.disabled = true;
        unlockBtn.textContent = 'Processing...';
        var h = Object.assign({ 'Content-Type': 'application/json' }, _authHeaders());
        fetch('/api/rentals/rent', {
            method: 'POST', headers: h,
            body: JSON.stringify({ gameId: gameId, tierId: _selectedTierId, payWith: _paymentType })
        })
            .then(function (r) { return r.json(); })
            .then(function (data) {
                if (data.success) {
                    if (data.newBalance !== undefined) {
                        if (typeof balance !== 'undefined') { try { balance = data.newBalance; } catch(e){} }
                        if (typeof updateBalance === 'function') { try { updateBalance(); } catch(e){} }
                    }
                    preview.classList.add('has-access');
                    lockIcon.textContent = '🔓';
                    statusDiv.className = 'rental-access-status unlocked';
                    if (data.permanent) {
                        statusDiv.textContent = '✓ Permanent Access';
                    } else if (data.expiresAt) {
                        statusDiv.textContent = '✓ You have access until ' + _formatExpiryDate(data.expiresAt);
                    } else {
                        statusDiv.textContent = '✓ Access granted!';
                    }
                    unlockBtn.disabled = false;
                    unlockBtn.textContent = 'EXTEND ACCESS';
                    _showToast('🔓 Access granted! Enjoy ' + _gameName(gameId));
                } else {
                    unlockBtn.disabled = false;
                    _updateUnlockBtnLabel(unlockBtn);
                    _showToast(data.message || 'Rental failed. Please try again.');
                }
            })
            .catch(function () {
                unlockBtn.disabled = false;
                _updateUnlockBtnLabel(unlockBtn);
                _showToast('Network error. Please try again.');
            });
    }

    function _buildGamePanel(gameId) {
        var panel = document.createElement('div');
        panel.className = 'rental-panel';
        panel.style.cssText = 'width:100%;max-width:480px;';
        panel.appendChild(_makeHeader('🔐 VIP ACCESS — ' + _gameName(gameId)));
        var body = document.createElement('div');
        body.className = 'rental-body';
        var preview = document.createElement('div');
        preview.className = 'rental-game-preview';
        var lockIcon = document.createElement('div');
        lockIcon.className = 'rental-lock-icon';
        lockIcon.textContent = '🔒';
        var gameInfo = document.createElement('div');
        gameInfo.className = 'rental-game-info';
        var gameNameEl = document.createElement('div');
        gameNameEl.className = 'rental-game-name';
        gameNameEl.textContent = _gameName(gameId);
        var premBadge = document.createElement('span');
        premBadge.className = 'rental-badge premium';
        premBadge.textContent = 'PREMIUM EXCLUSIVE';
        gameInfo.appendChild(gameNameEl);
        gameInfo.appendChild(premBadge);
        preview.appendChild(lockIcon);
        preview.appendChild(gameInfo);
        body.appendChild(preview);
        var statusDiv = document.createElement('div');
        statusDiv.className = 'rental-access-status locked';
        statusDiv.textContent = '🔒 Checking access...';
        body.appendChild(statusDiv);
        body.appendChild(_makeSectionLabel('Choose Access Duration'));
        var tierGrid = document.createElement('div');
        tierGrid.className = 'rental-tier-grid';
        var unlockBtn;
        RENTAL_TIERS.forEach(function (tier) {
            var card = document.createElement('div');
            card.className = 'rental-tier-card' + (tier.id === _selectedTierId ? ' selected' : '');
            card.dataset.tierId = tier.id;
            if (tier.bestValue) {
                var bv = document.createElement('div');
                bv.className = 'rental-tier-badge best-value';
                bv.textContent = 'BEST VALUE';
                card.appendChild(bv);
            }
            if (tier.permanent) {
                var pb = document.createElement('div');
                pb.className = 'rental-tier-badge permanent';
                pb.textContent = 'PERMANENT';
                card.appendChild(pb);
            }
            var tn = document.createElement('div');
            tn.className = 'rental-tier-name';
            tn.textContent = tier.name;
            var tp = document.createElement('div');
            tp.className = 'rental-tier-price';
            var cs = document.createElement('span');
            cs.className = 'credit-price';
            cs.textContent = '$' + tier.creditPrice.toFixed(2);
            var gs = document.createElement('span');
            gs.className = 'gem-price';
            gs.textContent = '💎 ' + tier.gemPrice.toLocaleString();
            tp.appendChild(cs); tp.appendChild(gs);
            card.appendChild(tn); card.appendChild(tp);
            card.addEventListener('click', function () {
                _selectedTierId = tier.id;
                tierGrid.querySelectorAll('.rental-tier-card').forEach(function (c) { c.classList.remove('selected'); });
                card.classList.add('selected');
                if (unlockBtn) _updateUnlockBtnLabel(unlockBtn);
            });
            tierGrid.appendChild(card);
        });
        body.appendChild(tierGrid);
        body.appendChild(_makeSectionLabel('Payment Method'));
        var pt = document.createElement('div');
        pt.className = 'rental-payment-toggle';
        var cbtn = document.createElement('button');
        cbtn.className = 'rental-pay-btn' + (_paymentType === 'credits' ? ' active' : '');
        cbtn.textContent = '💵 Credits';
        var gbtn = document.createElement('button');
        gbtn.className = 'rental-pay-btn' + (_paymentType === 'gems' ? ' active' : '');
        gbtn.textContent = '💎 Gems';
        cbtn.addEventListener('click', function () {
            _paymentType = 'credits';
            cbtn.classList.add('active'); gbtn.classList.remove('active');
            if (unlockBtn) _updateUnlockBtnLabel(unlockBtn);
        });
        gbtn.addEventListener('click', function () {
            _paymentType = 'gems';
            gbtn.classList.add('active'); cbtn.classList.remove('active');
            if (unlockBtn) _updateUnlockBtnLabel(unlockBtn);
        });
        pt.appendChild(cbtn); pt.appendChild(gbtn);
        body.appendChild(pt);
        unlockBtn = document.createElement('button');
        unlockBtn.className = 'rental-unlock-btn';
        _updateUnlockBtnLabel(unlockBtn);
        unlockBtn.addEventListener('click', function () {
            _handleRent(gameId, unlockBtn, statusDiv, preview, lockIcon);
        });
        body.appendChild(unlockBtn);
        panel.appendChild(body);
        _loadGameStatus(gameId, statusDiv, preview, lockIcon, unlockBtn);
        return panel;
    }

    function _buildOverviewPanel() {
        var panel = document.createElement('div');
        panel.className = 'rental-panel';
        panel.style.cssText = 'width:100%;max-width:520px;';
        panel.appendChild(_makeHeader('🔐 MY VIP RENTALS'));
        var body = document.createElement('div');
        body.className = 'rental-body';
        var loadDiv = document.createElement('div');
        loadDiv.className = 'rental-empty';
        loadDiv.innerHTML = "<span class='rental-empty-icon'>⏳</span>Loading your rentals...";
        body.appendChild(loadDiv);
        var browseBtn = document.createElement('button');
        browseBtn.className = 'rental-browse-btn';
        browseBtn.textContent = '🎮 Browse Premium Games';
        browseBtn.addEventListener('click', function () {
            closeRentalModal();
            setTimeout(function () {
                var el = document.getElementById('lobby') || document.querySelector('.lobby-section') || document.querySelector('.games-grid');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
            }, 200);
        });
        panel.appendChild(body);
        var token = _getAuthToken();
        if (!token) {
            loadDiv.innerHTML = "<span class='rental-empty-icon'>🔐</span>Please log in to view your rentals.";
            body.appendChild(browseBtn);
            return panel;
        }
        var h = Object.assign({ 'Content-Type': 'application/json' }, _authHeaders());
        fetch('/api/rentals/my-rentals', { headers: h })
            .then(function (r) { return r.json(); })
            .then(function (data) {
                loadDiv.style.display = 'none';
                var rentals = (data.rentals || []).filter(function (r) {
                    if (r.permanent) return true;
                    return r.expires_at && new Date(r.expires_at) > new Date();
                });
                if (rentals.length === 0) {
                    var ed = document.createElement('div');
                    ed.className = 'rental-empty';
                    ed.innerHTML = "<span class='rental-empty-icon'>🎮</span>You have no active rentals.<br>Unlock premium games to play exclusive titles!";
                    body.appendChild(ed);
                } else {
                    body.appendChild(_makeSectionLabel('Active Rentals (' + rentals.length + ')'));
                    var list = document.createElement('div');
                    list.className = 'rental-list';
                    rentals.forEach(function (rental) { list.appendChild(_buildRentalListItem(rental)); });
                    body.appendChild(list);
                }
                body.appendChild(browseBtn);
            })
            .catch(function () {
                loadDiv.innerHTML = "<span class='rental-empty-icon'>⚠️</span>Could not load rentals. Please try again.";
                body.appendChild(browseBtn);
            });
        return panel;
    }

    function _buildRentalListItem(rental) {
        var item = document.createElement('div');
        item.className = 'rental-list-item';
        var icon = document.createElement('div');
        icon.className = 'rental-list-icon';
        icon.textContent = rental.permanent ? '⭐' : '🔓';
        var info = document.createElement('div');
        info.className = 'rental-list-info';
        var nameDiv = document.createElement('div');
        nameDiv.className = 'rental-list-name';
        nameDiv.textContent = _gameName(rental.game_id);
        var expiryDiv = document.createElement('div');
        expiryDiv.className = 'rental-list-expiry';
        if (rental.permanent) {
            expiryDiv.textContent = 'Permanent access';
        } else {
            expiryDiv.textContent = 'Expires: ' + _formatExpiry(rental.expires_at);
            if (rental.expires_at && (new Date(rental.expires_at) - new Date()) / 3600000 < 2) {
                expiryDiv.classList.add('expiring-soon');
            }
        }
        var badgeRow = document.createElement('div');
        badgeRow.style.cssText = 'display:flex;gap:6px;margin-top:5px;flex-wrap:wrap;';
        var tierObj = RENTAL_TIERS.find(function (t) { return t.id === rental.tier; });
        var tierBadge = document.createElement('span');
        tierBadge.className = 'rental-badge tier';
        tierBadge.textContent = tierObj ? tierObj.name : (rental.tier || 'Access');
        badgeRow.appendChild(tierBadge);
        var activeBadge = document.createElement('span');
        activeBadge.className = 'rental-badge active';
        activeBadge.textContent = 'ACTIVE';
        badgeRow.appendChild(activeBadge);
        info.appendChild(nameDiv); info.appendChild(expiryDiv); info.appendChild(badgeRow);
        var playBtn = document.createElement('button');
        playBtn.style.cssText = 'background:rgba(251,191,36,.12);border:1px solid rgba(251,191,36,.3);color:#fbbf24;font-size:12px;font-weight:700;padding:6px 12px;border-radius:8px;cursor:pointer;white-space:nowrap;flex-shrink:0;transition:background .15s';
        playBtn.textContent = 'Play';
        playBtn.addEventListener('mouseover', function () { playBtn.style.background = 'rgba(251,191,36,.22)'; });
        playBtn.addEventListener('mouseout',  function () { playBtn.style.background = 'rgba(251,191,36,.12)'; });
        (function (gId) {
            playBtn.addEventListener('click', function () {
                closeRentalModal();
                if (typeof openSlot === 'function') setTimeout(function () { openSlot(gId); }, 200);
            });
        }(rental.game_id));
        item.appendChild(icon); item.appendChild(info); item.appendChild(playBtn);
        return item;
    }

    function openRentalModal(gameId) {
        _injectCSS();
        _ensureOverlay();
        _clearPanel();
        _selectedTierId = '24hours';
        _paymentType    = 'credits';
        _currentGameId  = gameId || null;
        _panel = gameId ? _buildGamePanel(gameId) : _buildOverviewPanel();
        _overlay.appendChild(_panel);
        _overlay.classList.add('active');
        _overlay.style.display = 'flex';
        document.addEventListener('keydown', _onEscKey);
    }

    function closeRentalModal() {
        if (_overlay) {
            _overlay.classList.remove('active');
            _overlay.style.display = 'none';
        }
        _clearPanel();
        _currentGameId = null;
        document.removeEventListener('keydown', _onEscKey);
    }

    function _onEscKey(e) { if (e.key === 'Escape') closeRentalModal(); }

    window.openRentalModal  = openRentalModal;
    window.closeRentalModal = closeRentalModal;

}());
