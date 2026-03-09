// ═══════════════════════════════════════════════════════
// GEMS & BOOSTS SHOP MODULE
// ═══════════════════════════════════════════════════════

// ── Boosts Catalog ─────────────────────────────────────
const BOOSTS_CATALOG = [
    { id: 'xp_boost_1h',    label: '2× XP',           desc: '2× XP on all spins for 1 hour',       cost: 100, icon: '⚡' },
    { id: 'win_boost_30m',  label: '1.5× Wins',       desc: '1.5× win multiplier for 30 min',      cost: 150, icon: '🚀' },
    { id: 'daily_triple',   label: '3× Daily Limit',  desc: 'Triple your daily spin limit',         cost: 200, icon: '🎯' },
    { id: 'cashback_boost', label: '2× Cashback',     desc: '2× cashback rate on losses',          cost: 250, icon: '💰' }
];

// ── Cache ───────────────────────────────────────────────
let _gemBalance = null;
let _gemBalanceFetchedAt = 0;
const GEM_CACHE_TTL = 30000; // 30 seconds

// ── Active modal state ──────────────────────────────────
let _gemsShopActiveTab = 'buy-gems'; // 'buy-gems' | 'buy-boosts'

// ═══════════════════════════════════════════════════════
// AUTH HELPER
// ═══════════════════════════════════════════════════════

function _getAuthToken() {
    return localStorage.getItem(typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken') || '';
}

function _gemFetch(path, options) {
    const token = _getAuthToken();
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = 'Bearer ' + token;
    return fetch(path, Object.assign({ headers: headers }, options));
}

// ═══════════════════════════════════════════════════════
// GEM BALANCE
// ═══════════════════════════════════════════════════════

async function getGemBalance() {
    const now = Date.now();
    if (_gemBalance !== null && (now - _gemBalanceFetchedAt) < GEM_CACHE_TTL) {
        return _gemBalance;
    }
    try {
        const res = await _gemFetch('/api/gems');
        if (!res.ok) throw new Error('Failed to fetch gem balance');
        const data = await res.json();
        _gemBalance = typeof data.balance === 'number' ? data.balance : 0;
        _gemBalanceFetchedAt = Date.now();
        return _gemBalance;
    } catch (e) {
        return _gemBalance !== null ? _gemBalance : 0;
    }
}

function _invalidateGemCache() {
    _gemBalance = null;
    _gemBalanceFetchedAt = 0;
}

function renderGemBalance() {
    const bal = _gemBalance !== null ? _gemBalance : 0;
    return '<span style="color:#a78bfa;font-weight:700;">💎 ' + bal.toLocaleString() + '</span>';
}

// ── Refresh gem balance in wallet header ────────────────
async function refreshGemBalance() {
    _invalidateGemCache();
    const bal = await getGemBalance();
    const el = document.getElementById('walletGemBalance');
    if (el) el.innerHTML = '💎 ' + bal.toLocaleString();
}

// ═══════════════════════════════════════════════════════
// PURCHASE GEM PACK
// ═══════════════════════════════════════════════════════

async function purchaseGemPack(packId) {
    const btn = document.querySelector('[data-pack-id="' + packId + '"]');
    if (btn) { btn.disabled = true; btn.textContent = 'Processing...'; }

    try {
        const res = await _gemFetch('/api/gems/purchase', {
            method: 'POST',
            body: JSON.stringify({ packId: packId })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || data.message || 'Purchase failed');

        _gemBalance = data.newBalance;
        _gemBalanceFetchedAt = Date.now();

        const headerEl = document.getElementById('walletGemBalance');
        if (headerEl) headerEl.innerHTML = '💎 ' + (_gemBalance || 0).toLocaleString();
        const shopHdr = document.getElementById('gemsShopBalance');
        if (shopHdr) shopHdr.innerHTML = '💎 ' + (_gemBalance || 0).toLocaleString();

        if (typeof showToast === 'function') {
            showToast('💎 ' + data.gemsAdded + ' gems added to your account!', 'success');
        }

        _renderGemsShopContent();
    } catch (err) {
        if (typeof showToast === 'function') {
            showToast(err.message || 'Purchase failed. Please try again.', 'error');
        }
        if (btn) { btn.disabled = false; btn.textContent = 'Buy'; }
    }
}

// ═══════════════════════════════════════════════════════
// PURCHASE BOOST
// ═══════════════════════════════════════════════════════

async function purchaseBoost(boostId) {
    const btn = document.querySelector('[data-boost-id="' + boostId + '"]');
    if (btn) { btn.disabled = true; btn.textContent = 'Activating...'; }

    try {
        const res = await _gemFetch('/api/boosts/purchase', {
            method: 'POST',
            body: JSON.stringify({ boostId: boostId })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || data.message || 'Boost purchase failed');

        _gemBalance = data.newGemBalance;
        _gemBalanceFetchedAt = Date.now();

        const shopHdr = document.getElementById('gemsShopBalance');
        if (shopHdr) shopHdr.innerHTML = '💎 ' + (_gemBalance || 0).toLocaleString();
        const headerEl = document.getElementById('walletGemBalance');
        if (headerEl) headerEl.innerHTML = '💎 ' + (_gemBalance || 0).toLocaleString();

        if (typeof showToast === 'function') {
            const boost = BOOSTS_CATALOG.find(function(b) { return b.id === boostId; });
            showToast((boost ? boost.icon + ' ' + boost.label : 'Boost') + ' activated!', 'success');
        }

        _renderGemsShopContent();
    } catch (err) {
        if (typeof showToast === 'function') {
            showToast(err.message || 'Failed to activate boost. Please try again.', 'error');
        }
        if (btn) { btn.disabled = false; btn.textContent = 'Activate'; }
    }
}

// ═══════════════════════════════════════════════════════
// OPEN GEM SHOP MODAL
// ═══════════════════════════════════════════════════════

function openGemsShop() {
    if (!currentUser) {
        if (typeof showToast === 'function') showToast('Please log in to access the Gem Shop.', 'error');
        return;
    }

    const existing = document.getElementById('gemsShopModal');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'gemsShopModal';
    overlay.style.cssText = [
        'position:fixed',
        'inset:0',
        'z-index:10400',
        'background:rgba(0,0,0,0.85)',
        'display:flex',
        'align-items:center',
        'justify-content:center',
        'padding:16px'
    ].join(';');

    overlay.addEventListener('click', function(e) {
        if (e.target === overlay) closeGemsShop();
    });

    const panel = document.createElement('div');
    panel.style.cssText = [
        'background:#0f0f1a',
        'border:1px solid rgba(251,191,36,0.3)',
        'border-radius:16px',
        'width:100%',
        'max-width:640px',
        'max-height:90vh',
        'display:flex',
        'flex-direction:column',
        'overflow:hidden',
        'box-shadow:0 0 60px rgba(167,139,250,0.2)'
    ].join(';');

    panel.innerHTML = _buildGemsShopShell();
    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    const tabBuyGems = document.getElementById('gemsTabBuyGems');
    const tabBuyBoosts = document.getElementById('gemsTabBuyBoosts');
    if (tabBuyGems) tabBuyGems.addEventListener('click', function() { _switchGemsTab('buy-gems'); });
    if (tabBuyBoosts) tabBuyBoosts.addEventListener('click', function() { _switchGemsTab('buy-boosts'); });

    const closeBtn = document.getElementById('gemsShopClose');
    if (closeBtn) closeBtn.addEventListener('click', closeGemsShop);

    _gemsShopActiveTab = 'buy-gems';
    _loadAndRenderGemsShop();
}

function closeGemsShop() {
    const modal = document.getElementById('gemsShopModal');
    if (modal) modal.remove();
}

function _buildGemsShopShell() {
    return [
        '<div style="display:flex;align-items:center;justify-content:space-between;padding:20px 24px 0;">',
        '  <div style="display:flex;align-items:center;gap:12px;">',
        '    <span style="font-size:1.8rem;">💎</span>',
        '    <div>',
        '      <div style="font-size:1.25rem;font-weight:700;color:#fbbf24;letter-spacing:0.5px;">GEM SHOP</div>',
        '      <div id="gemsShopBalance" style="font-size:0.85rem;color:#a78bfa;font-weight:600;">💎 Loading...</div>',
        '    </div>',
        '  </div>',
        '  <button id="gemsShopClose" style="background:none;border:none;color:#94a3b8;font-size:1.5rem;cursor:pointer;line-height:1;padding:4px;">&times;</button>',
        '</div>',
        '<div style="display:flex;padding:16px 24px 0;border-bottom:1px solid rgba(255,255,255,0.08);">',
        '  <button id="gemsTabBuyGems" style="flex:1;padding:10px 0;border:none;background:none;color:#fbbf24;font-weight:700;font-size:0.9rem;cursor:pointer;border-bottom:2px solid #fbbf24;letter-spacing:0.5px;">BUY GEMS</button>',
        '  <button id="gemsTabBuyBoosts" style="flex:1;padding:10px 0;border:none;background:none;color:#64748b;font-weight:700;font-size:0.9rem;cursor:pointer;border-bottom:2px solid transparent;letter-spacing:0.5px;">BUY BOOSTS</button>',
        '</div>',
        '<div id="gemsShopContent" style="flex:1;overflow-y:auto;padding:20px 24px;">',
        '  <div style="text-align:center;color:#64748b;padding:40px 0;">Loading...</div>',
        '</div>'
    ].join('');
}

function _switchGemsTab(tab) {
    _gemsShopActiveTab = tab;
    const buyGemsBtn = document.getElementById('gemsTabBuyGems');
    const buyBoostsBtn = document.getElementById('gemsTabBuyBoosts');
    if (!buyGemsBtn || !buyBoostsBtn) return;
    if (tab === 'buy-gems') {
        buyGemsBtn.style.color = '#fbbf24';
        buyGemsBtn.style.borderBottom = '2px solid #fbbf24';
        buyBoostsBtn.style.color = '#64748b';
        buyBoostsBtn.style.borderBottom = '2px solid transparent';
    } else {
        buyBoostsBtn.style.color = '#a78bfa';
        buyBoostsBtn.style.borderBottom = '2px solid #a78bfa';
        buyGemsBtn.style.color = '#64748b';
        buyGemsBtn.style.borderBottom = '2px solid transparent';
    }
    _renderGemsShopContent();
}

async function _loadAndRenderGemsShop() {
    const bal = await getGemBalance();
    const shopHdr = document.getElementById('gemsShopBalance');
    if (shopHdr) shopHdr.innerHTML = '💎 ' + bal.toLocaleString();
    _renderGemsShopContent();
}

async function _renderGemsShopContent() {
    const container = document.getElementById('gemsShopContent');
    if (!container) return;
    container.innerHTML = '<div style="text-align:center;color:#64748b;padding:40px 0;">Loading...</div>';
    if (_gemsShopActiveTab === 'buy-gems') {
        await _renderBuyGemsTab(container);
    } else {
        await _renderBuyBoostsTab(container);
    }
}

async function _renderBuyGemsTab(container) {
    let packs = [];
    try {
        const res = await _gemFetch('/api/gems/packs');
        if (res.ok) {
            const data = await res.json();
            packs = Array.isArray(data.packs) ? data.packs : [];
        }
    } catch (e) { /* use empty packs */ }

    if (packs.length === 0) {
        container.innerHTML = '<div style="text-align:center;color:#64748b;padding:40px 0;">No gem packs available at this time.</div>';
        return;
    }

    const packsHtml = packs.map(function(pack) {
        const isPopular = pack.popular;
        const bonusHtml = pack.bonus
            ? '<div style="font-size:0.72rem;color:#10b981;font-weight:600;margin-top:2px;">+' + pack.bonus + '% BONUS</div>'
            : '';
        const popularBadge = isPopular
            ? '<div style="position:absolute;top:-10px;left:50%;transform:translateX(-50%);background:#fbbf24;color:#0f0f1a;font-size:0.65rem;font-weight:800;padding:2px 10px;border-radius:20px;letter-spacing:1px;">POPULAR</div>'
            : '';
        const price = typeof pack.price === 'number' ? pack.price.toFixed(2) : pack.price;
        const borderColor = isPopular ? 'rgba(251,191,36,0.4)' : 'rgba(255,255,255,0.08)';
        const bgColor = isPopular
            ? 'linear-gradient(135deg,rgba(251,191,36,0.08),rgba(167,139,250,0.08))'
            : 'rgba(255,255,255,0.03)';
        // onclick uses escaped single quotes so it survives inside double-quoted attribute
        const onclickAttr = 'purchaseGemPack(\'' + pack.id + '\')';
        return [
            '<div style="position:relative;background:' + bgColor + ';border:1px solid ' + borderColor + ';border-radius:12px;padding:16px;display:flex;align-items:center;justify-content:space-between;gap:12px;">',
            popularBadge,
            '<div style="display:flex;align-items:center;gap:12px;">',
            '  <span style="font-size:2rem;">💎</span>',
            '  <div>',
            '    <div style="font-weight:700;color:#e2e8f0;font-size:1rem;">' + (pack.name || pack.gems + ' Gems') + '</div>',
            '    <div style="font-size:0.85rem;color:#a78bfa;font-weight:600;">💎 ' + Number(pack.gems).toLocaleString() + ' gems</div>',
            bonusHtml,
            '  </div>',
            '</div>',
            '<button data-pack-id="' + pack.id + '" onclick="' + onclickAttr + '" style="background:linear-gradient(135deg,#fbbf24,#f59e0b);color:#0f0f1a;border:none;border-radius:8px;padding:10px 20px;font-weight:800;font-size:0.9rem;cursor:pointer;white-space:nowrap;min-width:80px;box-shadow:0 0 16px rgba(251,191,36,0.25);">$' + price + '</button>',
            '</div>'
        ].join('');
    }).join('');

    container.innerHTML = [
        '<div style="margin-bottom:12px;font-size:0.8rem;color:#64748b;">Gems can be used to activate powerful boosts in the Boosts tab.</div>',
        '<div style="display:flex;flex-direction:column;gap:12px;">',
        packsHtml,
        '</div>'
    ].join('');
}

async function _renderBuyBoostsTab(container) {
    let activeBoosts = [];
    try {
        const res = await _gemFetch('/api/boosts/active');
        if (res.ok) {
            const data = await res.json();
            activeBoosts = Array.isArray(data.boosts) ? data.boosts : [];
        }
    } catch (e) { /* ignore */ }

    const gemBal = _gemBalance !== null ? _gemBalance : 0;
    let html = '';

    if (activeBoosts.length > 0) {
        const activeHtml = activeBoosts.map(function(boost) {
            const expiresAt = boost.expiresAt ? new Date(boost.expiresAt) : null;
            let timeStr = '';
            if (expiresAt) {
                const msLeft = expiresAt - Date.now();
                if (msLeft > 0) {
                    const minLeft = Math.ceil(msLeft / 60000);
                    timeStr = minLeft >= 60
                        ? Math.floor(minLeft / 60) + 'h ' + (minLeft % 60) + 'm left'
                        : minLeft + 'm left';
                } else { timeStr = 'Expired'; }
            }
            return [
                '<div style="background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.3);border-radius:10px;padding:12px 14px;display:flex;align-items:center;justify-content:space-between;gap:8px;">',
                '<div style="display:flex;align-items:center;gap:10px;">',
                '  <span style="font-size:1.4rem;">✅</span>',
                '  <div>',
                '    <div style="font-weight:700;color:#10b981;font-size:0.9rem;">' + (boost.label || boost.type) + '</div>',
                timeStr ? '<div style="font-size:0.75rem;color:#64748b;">' + timeStr + '</div>' : '',
                '  </div>',
                '</div>',
                '<span style="font-size:0.75rem;color:#10b981;font-weight:600;background:rgba(16,185,129,0.15);padding:3px 8px;border-radius:20px;">ACTIVE</span>',
                '</div>'
            ].join('');
        }).join('');

        html += [
            '<div style="margin-bottom:20px;">',
            '  <div style="font-size:0.8rem;font-weight:700;color:#10b981;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">⚡ Active Boosts</div>',
            '  <div style="display:flex;flex-direction:column;gap:8px;">' + activeHtml + '</div>',
            '</div>'
        ].join('');
    }

    const catalogHtml = BOOSTS_CATALOG.map(function(boost) {
        const canAfford = gemBal >= boost.cost;
        const alreadyActive = activeBoosts.some(function(a) { return a.type === boost.id || a.id === boost.id; });
        const btnBg = alreadyActive
            ? 'rgba(16,185,129,0.2)'
            : canAfford ? 'linear-gradient(135deg,#a78bfa,#8b5cf6)' : 'rgba(255,255,255,0.05)';
        const btnColor = alreadyActive ? '#10b981' : canAfford ? '#fff' : '#475569';
        const btnLabel = alreadyActive ? 'Active' : canAfford ? 'Activate' : 'Need Gems';
        const btnDisabled = (alreadyActive || !canAfford) ? 'disabled' : '';
        const btnOpacity = (alreadyActive || !canAfford) ? '0.65' : '1';
        const btnCursor = (alreadyActive || !canAfford) ? 'default' : 'pointer';
        const onclickAttr = 'purchaseBoost(\'' + boost.id + '\')';
        return [
            '<div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:16px;display:flex;align-items:center;justify-content:space-between;gap:12px;">',
            '<div style="display:flex;align-items:center;gap:12px;">',
            '  <span style="font-size:2rem;">' + boost.icon + '</span>',
            '  <div>',
            '    <div style="font-weight:700;color:#e2e8f0;font-size:0.95rem;">' + boost.label + '</div>',
            '    <div style="font-size:0.78rem;color:#94a3b8;margin-top:2px;">' + boost.desc + '</div>',
            '    <div style="font-size:0.75rem;color:#a78bfa;font-weight:600;margin-top:4px;">💎 ' + boost.cost + ' gems</div>',
            '  </div>',
            '</div>',
            '<button data-boost-id="' + boost.id + '" onclick="' + onclickAttr + '" ' + btnDisabled + ' style="background:' + btnBg + ';color:' + btnColor + ';border:none;border-radius:8px;padding:10px 18px;font-weight:700;font-size:0.85rem;cursor:' + btnCursor + ';white-space:nowrap;min-width:88px;opacity:' + btnOpacity + ';">' + btnLabel + '</button>',
            '</div>'
        ].join('');
    }).join('');

    html += [
        '<div>',
        '  <div style="font-size:0.8rem;font-weight:700;color:#a78bfa;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">💎 Available Boosts</div>',
        '  <div style="font-size:0.78rem;color:#64748b;margin-bottom:12px;">Your balance: 💎 ' + gemBal.toLocaleString() + ' gems</div>',
        '  <div style="display:flex;flex-direction:column;gap:10px;">' + catalogHtml + '</div>',
        '</div>'
    ].join('');

    container.innerHTML = html;
}
