// ================================================================
// UI-BATTLEPASS MODULE
// Seasonal Battle Pass modal - tier grid, XP progress,
// premium upgrade, per-level reward claiming.
// All DOM nodes built via createElement/textContent (no innerHTML)
// to avoid XSS vectors. API data set only via .textContent.
// ================================================================

(function () {
    'use strict';

    var MODAL_ID          = 'battlePassModalOverlay';
    var MAX_LEVEL         = 50;
    var XP_PER_LEVEL_BASE = 100;
    var PREMIUM_PRICE     = 9.99;

    function _getAuthToken() {
        var key = (typeof STORAGE_KEY_TOKEN !== 'undefined') ? STORAGE_KEY_TOKEN : 'casinoToken';
        return localStorage.getItem(key) || null;
    }
    function _authHeaders() {
        var token = _getAuthToken();
        if (!token) return {};
        return { 'Authorization': 'Bearer ' + token };
    }

    function _toast(msg, type) {
        if (typeof showToast === 'function') { showToast(msg, type || 'success'); return; }
        var t = document.createElement('div');
        t.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#7c3aed;color:#fff;padding:10px 20px;border-radius:8px;font-weight:700;z-index:99999;font-size:15px;box-shadow:0 4px 16px rgba(0,0,0,0.4);';
        t.textContent = msg;
        document.body.appendChild(t);
        setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 3000);
    }

    function _daysLeft(endsAt) {
        if (!endsAt) return null;
        var diff = new Date(endsAt).getTime() - Date.now();
        if (diff <= 0) return 0;
        return Math.ceil(diff / (1000 * 60 * 60 * 24));
    }

    function _rewardIcon(type) {
        if (!type) return '—';
        if (type === 'credits')     return '💰';
        if (type === 'free_spins')  return '🎰';
        if (type === 'wheel_spins') return '🎡';
        return '🎁';
    }

    function _ensureSpinnerStyle() {
        if (document.getElementById('bp-spin-style')) return;
        var st = document.createElement('style');
        st.id = 'bp-spin-style'; st.textContent = '@keyframes bp-spin{to{transform:rotate(360deg)}}';
        document.head.appendChild(st);
    }
    function _makeSpinner() {
        _ensureSpinnerStyle();
        var sp = document.createElement('div');
        sp.style.cssText = 'width:40px;height:40px;border:4px solid rgba(124,58,237,0.3);border-top-color:#7c3aed;border-radius:50%;animation:bp-spin 0.8s linear infinite;margin:40px auto;';
        return sp;
    }

    function _getOrCreateOverlay() {
        var existing = document.getElementById(MODAL_ID);
        if (existing) return existing;
        var ov = document.createElement('div');
        ov.id = MODAL_ID;
        ov.style.position = 'fixed'; ov.style.top = '0'; ov.style.left = '0'; ov.style.right = '0'; ov.style.bottom = '0';
        ov.style.background = 'rgba(0,0,0,0.82)'; ov.style.zIndex = '10000'; ov.style.display = 'flex';
        ov.style.alignItems = 'center'; ov.style.justifyContent = 'center'; ov.style.padding = '16px'; ov.style.boxSizing = 'border-box';
        ov.addEventListener('click', function (e) { if (e.target === ov) closeBattlePassModal(); });
        document.body.appendChild(ov); return ov;
    }
    function _rewardCell(reward, locked, claimed) {
        var cell = document.createElement('div');
        cell.style.cssText = 'display:flex;align-items:center;gap:4px;';
        if (!reward || (!reward.type && reward.amount == null)) {
            var none = document.createElement('span');
            none.style.cssText = 'color:#374151;font-size:12px;'; none.textContent = '—';
            cell.appendChild(none); return cell;
        }
        var ico = document.createElement('span');
        ico.style.fontSize = '14px'; ico.textContent = locked ? '🔒' : _rewardIcon(reward.type);
        var amt = document.createElement('span');
        amt.style.cssText = 'font-size:12px;font-weight:700;color:' + (locked ? '#4b5563' : (claimed ? '#6d28d9' : '#e2e8f0')) + ';';
        amt.textContent = (reward.amount != null) ? String(reward.amount) : '';
        if (claimed) { cell.style.opacity = '0.5'; cell.title = 'Claimed'; }
        cell.appendChild(ico); cell.appendChild(amt); return cell;
    }

    function _claimButton(level, track, rewardCell, claimWrap, progress) {
        var btn = document.createElement('button');
        btn.style.cssText = 'font-size:10px;font-weight:700;padding:4px 8px;border-radius:4px;cursor:pointer;border:none;white-space:nowrap;transition:opacity 0.15s;' + (track === 'premium' ? 'background:#4c1d95;color:#c4b5fd;' : 'background:#1e3a5f;color:#93c5fd;');
        btn.textContent = (track === 'premium') ? 'Claim 👑' : 'Claim Free';
        btn.addEventListener('click', function () { _claimReward(level, track, btn, rewardCell, claimWrap, progress); });
        return btn;
    }

    function _buyPremium(btn) {
        var token = _getAuthToken();
        if (!token) { _toast('Please log in to upgrade.', 'error'); return; }
        btn.disabled = true; btn.textContent = 'Processing…'; btn.style.opacity = '0.7';
        var hdrs = _authHeaders(); hdrs['Content-Type'] = 'application/json';
        fetch('/api/battlepass/buy-premium', { method: 'POST', headers: hdrs, body: JSON.stringify({}) })
        .then(function (r) { return r.json(); })
        .then(function (res) {
            if (res.success) {
                if (typeof balance !== 'undefined' && res.newBalance != null) balance = res.newBalance;
                if (typeof window.updateBalanceDisplay === 'function') window.updateBalanceDisplay();
                _toast('👑 Premium Battle Pass activated!'); openBattlePassModal();
            } else {
                _toast(res.error || 'Upgrade failed.', 'error');
                btn.disabled = false; btn.textContent = '⭐ UPGRADE TO PREMIUM — $' + PREMIUM_PRICE.toFixed(2); btn.style.opacity = '1';
            }
        })
        .catch(function (err) {
            console.error('[BattlePass] buy-premium error:', err);
            _toast('Network error. Please try again.', 'error');
            btn.disabled = false; btn.textContent = '⭐ UPGRADE TO PREMIUM — $' + PREMIUM_PRICE.toFixed(2); btn.style.opacity = '1';
        });
    }

    function _claimReward(level, track, btn, rewardCell, claimWrap, progress) {
        var token = _getAuthToken();
        if (!token) { _toast('Please log in to claim rewards.', 'error'); return; }
        btn.disabled = true; btn.style.opacity = '0.5'; btn.textContent = '…';
        var hdrs = _authHeaders(); hdrs['Content-Type'] = 'application/json';
        fetch('/api/battlepass/claim/' + level, { method: 'POST', headers: hdrs, body: JSON.stringify({ track: track }) })
        .then(function (r) { return r.json(); })
        .then(function (res) {
            if (res.success) {
                var reward = res.reward || {};
                _toast(('Claimed: ' + _rewardIcon(reward.type) + ' ' + (reward.amount || '') + ' ' + (reward.type || '')).trim());
                if (track === 'free') {
                    progress.claimed_free = progress.claimed_free || [];
                    if (progress.claimed_free.indexOf(level) === -1) progress.claimed_free.push(level);
                } else {
                    progress.claimed_premium = progress.claimed_premium || [];
                    if (progress.claimed_premium.indexOf(level) === -1) progress.claimed_premium.push(level);
                }
                rewardCell.style.opacity = '0.5'; rewardCell.title = 'Claimed';
                if (claimWrap.children.length <= 1) {
                    var par = claimWrap.parentNode; var chk = document.createElement('span');
                    chk.style.cssText = 'font-size:16px;color:#10b981;'; chk.textContent = '✓';
                    if (par) { par.innerHTML = ''; par.appendChild(chk); }
                } else { if (btn.parentNode) btn.parentNode.removeChild(btn); }
                if (reward.type === 'credits' && reward.amount) {
                    if (typeof balance !== 'undefined') balance = (parseFloat(balance) || 0) + parseFloat(reward.amount);
                    if (typeof window.updateBalanceDisplay === 'function') window.updateBalanceDisplay();
                }
            } else {
                _toast(res.error || 'Claim failed.', 'error');
                btn.disabled = false; btn.style.opacity = '1';
                btn.textContent = (track === 'premium') ? 'Claim 👑' : 'Claim Free';
            }
        })
        .catch(function (err) {
            console.error('[BattlePass] claim error:', err);
            _toast('Network error. Please try again.', 'error');
            btn.disabled = false; btn.style.opacity = '1';
            btn.textContent = (track === 'premium') ? 'Claim 👑' : 'Claim Free';
        });
    }

    function _buildModal(overlay, data) {
        overlay.innerHTML = '';
        var season   = data.season   || {};
        var progress = data.progress || {};
        var tiers    = data.tiers    || [];
        var currentLevel = progress.level          || 0;
        var currentXP    = progress.xp             || 0;
        var isPremium    = !!progress.is_premium;
        var claimedFree  = progress.claimed_free    || [];
        var claimedPrem  = progress.claimed_premium || [];
        var days = _daysLeft(season.ends_at);

        var panel = document.createElement('div');
        panel.style.cssText = 'background:linear-gradient(160deg,#0f0a1e,#1a0a2e,#0f0a1e);border:1px solid #4c1d95;border-radius:14px;width:100%;max-width:700px;max-height:88vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 8px 40px rgba(124,58,237,0.35);';

        var header = document.createElement('div');
        header.style.cssText = 'background:linear-gradient(90deg,#4c1d95,#7c3aed,#4c1d95);padding:16px 20px;display:flex;align-items:center;gap:12px;flex-shrink:0;';
        var titleWrap = document.createElement('div');
        titleWrap.style.cssText = 'flex:1;min-width:0;';
        var titleEl = document.createElement('div');
        titleEl.style.cssText = 'font-size:20px;font-weight:900;color:#fff;letter-spacing:1px;';
        titleEl.textContent   = '⚔️ BATTLE PASS';
        var snEl = document.createElement('div');
        snEl.style.cssText = 'font-size:12px;color:#c4b5fd;margin-top:2px;';
        snEl.textContent   = season.name || 'Current Season';
        titleWrap.appendChild(titleEl); titleWrap.appendChild(snEl);
        var metaWrap = document.createElement('div');
        metaWrap.style.cssText = 'display:flex;align-items:center;gap:8px;';
        if (days !== null) {
            var cd = document.createElement('div');
            cd.style.cssText = 'font-size:12px;font-weight:700;color:#fbbf24;background:rgba(0,0,0,0.3);padding:3px 8px;border-radius:4px;';
            cd.textContent = days + ' day' + (days !== 1 ? 's' : '') + ' left';
            metaWrap.appendChild(cd);
        }
        var closeBtn = document.createElement('button');
        closeBtn.style.cssText = 'background:rgba(255,255,255,0.15);border:none;color:#fff;font-size:20px;line-height:1;cursor:pointer;border-radius:6px;width:34px;height:34px;display:flex;align-items:center;justify-content:center;transition:background 0.15s;flex-shrink:0;';
        closeBtn.textContent = '×'; closeBtn.title = 'Close';
        closeBtn.addEventListener('mouseover', function () { closeBtn.style.background = 'rgba(255,255,255,0.3)'; });
        closeBtn.addEventListener('mouseout',  function () { closeBtn.style.background = 'rgba(255,255,255,0.15)'; });
        closeBtn.addEventListener('click', closeBattlePassModal);
        metaWrap.appendChild(closeBtn); header.appendChild(titleWrap); header.appendChild(metaWrap);

        var upgradeSection = null;
        if (!isPremium) {
            upgradeSection = document.createElement('div');
            upgradeSection.style.cssText = 'padding:12px 20px;background:rgba(251,191,36,0.07);border-bottom:1px solid rgba(251,191,36,0.2);flex-shrink:0;';
            var upgradeBtn = document.createElement('button');
            upgradeBtn.style.cssText = 'width:100%;padding:11px;border:none;border-radius:8px;cursor:pointer;background:linear-gradient(90deg,#d97706,#f59e0b,#d97706);color:#1a0a00;font-size:14px;font-weight:900;letter-spacing:0.5px;box-shadow:0 2px 12px rgba(245,158,11,0.4);transition:opacity 0.15s;';
            upgradeBtn.textContent = '⭐ UPGRADE TO PREMIUM — $' + PREMIUM_PRICE.toFixed(2);
            upgradeBtn.addEventListener('mouseover', function () { upgradeBtn.style.opacity = '0.88'; });
            upgradeBtn.addEventListener('mouseout',  function () { upgradeBtn.style.opacity = '1'; });
            upgradeBtn.addEventListener('click', function () { _buyPremium(upgradeBtn); });
            upgradeSection.appendChild(upgradeBtn);
        }

        var xpSection = document.createElement('div');
        xpSection.style.cssText = 'padding:14px 20px;border-bottom:1px solid rgba(124,58,237,0.25);flex-shrink:0;';
        var xpRow = document.createElement('div');
        xpRow.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;';
        var levelLbl = document.createElement('div');
        levelLbl.style.cssText = 'font-size:15px;font-weight:800;color:#c4b5fd;';
        levelLbl.textContent = 'Level ' + currentLevel + ' / ' + MAX_LEVEL;
        var xpForNext = (currentLevel < MAX_LEVEL) ? (currentLevel + 1) * XP_PER_LEVEL_BASE : 0;
        var xpPct     = (xpForNext > 0) ? Math.min(100, (currentXP / xpForNext) * 100) : 100;
        var xpLbl = document.createElement('div');
        xpLbl.style.cssText = 'font-size:12px;color:#8b5cf6;';
        xpLbl.textContent = (currentLevel >= MAX_LEVEL) ? 'MAX LEVEL' : (currentXP + ' / ' + xpForNext + ' XP');
        xpRow.appendChild(levelLbl); xpRow.appendChild(xpLbl);
        var barTrack = document.createElement('div');
        barTrack.style.cssText = 'height:8px;background:rgba(124,58,237,0.2);border-radius:4px;overflow:hidden;';
        var barFill = document.createElement('div');
        barFill.style.cssText = 'height:100%;border-radius:4px;transition:width 0.5s ease;background:linear-gradient(90deg,#7c3aed,#a78bfa,#7c3aed);width:' + xpPct + '%;';
        barTrack.appendChild(barFill); xpSection.appendChild(xpRow); xpSection.appendChild(barTrack);

        var trackHeader = document.createElement('div');
        trackHeader.style.cssText = 'display:grid;grid-template-columns:48px 1fr 1fr 100px;gap:6px;padding:8px 20px;background:rgba(0,0,0,0.3);border-bottom:1px solid rgba(124,58,237,0.2);flex-shrink:0;';
        function _thCell(txt, align) {
            var c = document.createElement('div');
            c.style.cssText = 'font-size:10px;font-weight:700;color:#8b5cf6;text-transform:uppercase;letter-spacing:0.5px;text-align:' + (align || 'left') + ';';
            c.textContent = txt; return c;
        }
        trackHeader.appendChild(_thCell('LVL', 'center'));
        trackHeader.appendChild(_thCell('🆓 Free'));
        trackHeader.appendChild(_thCell('👑 Premium'));
        trackHeader.appendChild(_thCell('Action', 'center'));

        var tierList = document.createElement('div');
        tierList.style.cssText = 'overflow-y:auto;flex:1;';
        var tierMap = {};
        for (var ti = 0; ti < tiers.length; ti++) { tierMap[tiers[ti].level] = tiers[ti]; }

        for (var lvl = 1; lvl <= MAX_LEVEL; lvl++) {
            var tier         = tierMap[lvl] || { level: lvl, free: null, premium: null };
            var isCurrentRow = (lvl === currentLevel);
            var isUnlocked   = (lvl <= currentLevel);
            var freeClaimd   = (claimedFree.indexOf(lvl) !== -1);
            var premClaimd   = (claimedPrem.indexOf(lvl) !== -1);
            var row = document.createElement('div');
            row.style.cssText = 'display:grid;grid-template-columns:48px 1fr 1fr 100px;gap:6px;padding:7px 20px;align-items:center;border-bottom:1px solid rgba(255,255,255,0.04);transition:background 0.15s;' + (isCurrentRow ? 'border-left:3px solid #fbbf24;background:rgba(251,191,36,0.07);' : 'border-left:3px solid transparent;');
            (function (r, isCur) {
                r.addEventListener('mouseover', function () { r.style.background = 'rgba(124,58,237,0.1)'; });
                r.addEventListener('mouseout',  function () { r.style.background = isCur ? 'rgba(251,191,36,0.07)' : ''; });
            }(row, isCurrentRow));
            var lvlCell = document.createElement('div');
            lvlCell.style.cssText = 'text-align:center;font-size:13px;font-weight:' + (isCurrentRow ? '900' : '600') + ';color:' + (isCurrentRow ? '#fbbf24' : (isUnlocked ? '#a78bfa' : '#4b5563')) + ';';
            lvlCell.textContent = String(lvl);
            var freeCell = _rewardCell(tier.free,    false,      freeClaimd);
            var premCell = _rewardCell(tier.premium, !isPremium, premClaimd);
            var actionCell = document.createElement('div');
            actionCell.style.cssText = 'text-align:center;';
            if (isUnlocked) {
                var canClaimFree = tier.free    && tier.free.type    && !freeClaimd;
                var canClaimPrem = isPremium && tier.premium && tier.premium.type && !premClaimd;
                if (canClaimFree || canClaimPrem) {
                    var claimWrap = document.createElement('div');
                    claimWrap.style.cssText = 'display:flex;flex-direction:column;gap:4px;align-items:center;';
                    if (canClaimFree) claimWrap.appendChild(_claimButton(lvl, 'free',    freeCell, claimWrap, progress));
                    if (canClaimPrem) claimWrap.appendChild(_claimButton(lvl, 'premium', premCell, claimWrap, progress));
                    actionCell.appendChild(claimWrap);
                } else {
                    var checkEl = document.createElement('span');
                    checkEl.style.cssText = 'font-size:16px;color:#10b981;'; checkEl.textContent = '✓';
                    actionCell.appendChild(checkEl);
                }
            } else {
                var lockEl = document.createElement('span');
                lockEl.style.cssText = 'font-size:13px;color:#4b5563;'; lockEl.textContent = '🔒';
                actionCell.appendChild(lockEl);
            }
            row.appendChild(lvlCell); row.appendChild(freeCell); row.appendChild(premCell); row.appendChild(actionCell);
            tierList.appendChild(row);
        }

        panel.appendChild(header);
        if (upgradeSection) panel.appendChild(upgradeSection);
        panel.appendChild(xpSection); panel.appendChild(trackHeader); panel.appendChild(tierList);
        overlay.appendChild(panel);
        if (currentLevel > 3) { setTimeout(function () { tierList.scrollTop = (currentLevel - 3) * 38; }, 80); }
    }

    function _buildErrorState(overlay, message) {
        overlay.innerHTML = '';
        var panel = document.createElement('div');
        panel.style.cssText = 'background:#1a0a2e;border:1px solid #4c1d95;border-radius:14px;padding:40px;text-align:center;max-width:420px;width:100%;box-shadow:0 8px 40px rgba(124,58,237,0.35);';
        var errIcon = document.createElement('div');
        errIcon.style.fontSize = '48px'; errIcon.textContent = '⚠️';
        var errMsg = document.createElement('div');
        errMsg.style.cssText = 'color:#e2e8f0;font-size:15px;margin:16px 0 24px;';
        errMsg.textContent   = message || 'Unable to load Battle Pass data.';
        var retryBtn = document.createElement('button');
        retryBtn.style.cssText = 'background:#7c3aed;color:#fff;border:none;border-radius:8px;padding:10px 24px;font-size:14px;font-weight:700;cursor:pointer;margin-right:8px;transition:opacity 0.15s;';
        retryBtn.textContent = 'Try Again'; retryBtn.addEventListener('click', openBattlePassModal);
        var errClose = document.createElement('button');
        errClose.style.cssText = 'background:rgba(255,255,255,0.1);color:#e2e8f0;border:none;border-radius:8px;padding:10px 20px;font-size:14px;cursor:pointer;';
        errClose.textContent = 'Close'; errClose.addEventListener('click', closeBattlePassModal);
        panel.appendChild(errIcon); panel.appendChild(errMsg); panel.appendChild(retryBtn); panel.appendChild(errClose);
        overlay.appendChild(panel);
    }

    function _buildLoginPrompt(overlay) {
        overlay.innerHTML = '';
        var panel = document.createElement('div');
        panel.style.cssText = 'background:#1a0a2e;border:1px solid #4c1d95;border-radius:14px;padding:40px;text-align:center;max-width:400px;width:100%;box-shadow:0 8px 40px rgba(124,58,237,0.35);';
        var lIcon = document.createElement('div');
        lIcon.style.fontSize = '48px'; lIcon.textContent = '⚔️';
        var lHdr = document.createElement('div');
        lHdr.style.cssText = 'font-size:20px;font-weight:900;color:#fff;margin:12px 0 8px;'; lHdr.textContent = 'Battle Pass';
        var lMsg = document.createElement('div');
        lMsg.style.cssText = 'color:#a78bfa;font-size:14px;margin-bottom:24px;'; lMsg.textContent = 'Log in to view your Battle Pass progress and claim rewards.';
        var lClose = document.createElement('button');
        lClose.style.cssText = 'background:rgba(255,255,255,0.1);color:#e2e8f0;border:none;border-radius:8px;padding:10px 24px;font-size:14px;cursor:pointer;';
        lClose.textContent = 'Close'; lClose.addEventListener('click', closeBattlePassModal);
        panel.appendChild(lIcon); panel.appendChild(lHdr); panel.appendChild(lMsg); panel.appendChild(lClose);
        overlay.appendChild(panel);
    }

    function _buildLoadingState(overlay) {
        overlay.innerHTML = '';
        var panel = document.createElement('div');
        panel.style.cssText = 'background:#1a0a2e;border:1px solid #4c1d95;border-radius:14px;padding:40px;text-align:center;max-width:400px;width:100%;box-shadow:0 8px 40px rgba(124,58,237,0.35);';
        var ldTitle = document.createElement('div');
        ldTitle.style.cssText = 'font-size:18px;font-weight:900;color:#c4b5fd;margin-bottom:8px;'; ldTitle.textContent = '⚔️ BATTLE PASS';
        var ldLabel = document.createElement('div');
        ldLabel.style.cssText = 'color:#8b5cf6;font-size:13px;'; ldLabel.textContent = 'Loading season data…';
        panel.appendChild(ldTitle); panel.appendChild(_makeSpinner()); panel.appendChild(ldLabel);
        overlay.appendChild(panel);
    }

    function openBattlePassModal() {
        var overlay = _getOrCreateOverlay();
        overlay.style.display = 'flex';
        var token = _getAuthToken();
        if (!token) { _buildLoginPrompt(overlay); return; }
        _buildLoadingState(overlay);
        var hdrs = _authHeaders();
        fetch('/api/battlepass', { headers: hdrs })
            .then(function (r) {
                if (!r.ok) throw new Error('HTTP ' + r.status);
                return r.json();
            })
            .then(function (data) { _buildModal(overlay, data); })
            .catch(function (err) {
                console.error('[BattlePass] fetch error:', err);
                _buildErrorState(overlay, 'Failed to load Battle Pass. Please try again.');
            });
    }

    function closeBattlePassModal() {
        var overlay = document.getElementById(MODAL_ID);
        if (overlay) overlay.style.display = 'none';
    }

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            var overlay = document.getElementById(MODAL_ID);
            if (overlay && overlay.style.display !== 'none') closeBattlePassModal();
        }
    });

    window.openBattlePassModal  = openBattlePassModal;
    window.closeBattlePassModal = closeBattlePassModal;

}());
