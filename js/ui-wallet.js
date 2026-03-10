// ═══════════════════════════════════════════════════════
// WALLET / CASHIER MODULE
// ═══════════════════════════════════════════════════════


// ── State ─────────────────────────────────────────────
let walletPaymentMethods = [];
let walletDepositHistory = [];
let walletWithdrawalHistory = [];
let walletActiveTab = 'deposit'; // 'deposit' | 'withdraw' | 'methods' | 'history'
let walletHistoryPage = 1;
let walletHistoryTotalPages = 1;
let walletAddMethodType = null; // tracks which sub-form is open
let walletSessionStartBalance = null;


// ── Payment Type Metadata ─────────────────────────────
const WALLET_PAYMENT_TYPES = {
    visa: {
        label: 'Visa',
        icon: `<span class="wallet-pay-icon wallet-pay-icon--card"><span class="wallet-pay-icon__emoji">\u{1F4B3}</span><span class="wallet-pay-icon__label">VISA</span></span>`,
        color: '#1a1f71'
    },
    mastercard: {
        label: 'Mastercard',
        icon: `<span class="wallet-pay-icon wallet-pay-icon--card"><span class="wallet-pay-icon__emoji">\u{1F4B3}</span><span class="wallet-pay-icon__label">MC</span></span>`,
        color: '#eb001b'
    },
    payid: {
        label: 'PayID',
        icon: `<span class="wallet-pay-icon wallet-pay-icon--payid"><span class="wallet-pay-icon__emoji">\u{1F4F1}</span><span class="wallet-pay-icon__label">PayID</span></span>`,
        color: '#00b2a9'
    },
    bank_transfer: {
        label: 'Bank Transfer',
        icon: `<span class="wallet-pay-icon wallet-pay-icon--bank"><span class="wallet-pay-icon__emoji">\u{1F3E6}</span><span class="wallet-pay-icon__label">Bank</span></span>`,
        color: '#2563eb'
    },
    btc: {
        label: 'Bitcoin',
        icon: `<span class="wallet-pay-icon wallet-pay-icon--crypto"><span class="wallet-pay-icon__symbol">\u20BF</span></span>`,
        color: '#f7931a'
    },
    eth: {
        label: 'Ethereum',
        icon: `<span class="wallet-pay-icon wallet-pay-icon--crypto"><span class="wallet-pay-icon__symbol">\u039E</span></span>`,
        color: '#627eea'
    },
    usdt: {
        label: 'Tether',
        icon: `<span class="wallet-pay-icon wallet-pay-icon--crypto"><span class="wallet-pay-icon__symbol">\u20AE</span></span>`,
        color: '#26a17b'
    }
};

const WALLET_QUICK_AMOUNTS = [10, 25, 50, 100, 250, 500];


// ═══════════════════════════════════════════════════════
// SHOW / HIDE
// ═══════════════════════════════════════════════════════

function showWalletModal() {
    if (!currentUser) {
        showToast('Please log in to access the cashier.', 'error');
        return;
    }
    if (walletSessionStartBalance === null) walletSessionStartBalance = balance;
    const modal = document.getElementById('walletModal');
    if (!modal) return;
    walletActiveTab = 'deposit';
    modal.classList.add('active');
    // Sync balance display in wallet header
    const walletBal = document.getElementById('walletBalance');
    if (walletBal) walletBal.textContent = formatMoney(balance);
    loadPaymentMethods();
    // Check if user has any completed deposits (for first-deposit bonus banner)
    _checkFirstDepositStatus();
    renderWalletContent();
    // Inject gem balance badge + Gem Shop button into wallet header (once)
    _injectWalletGemBar(modal);
    // Refresh gem and loyalty balances from server
    if (typeof refreshGemBalance === 'function') refreshGemBalance();
    refreshLoyaltyBalance();
    refreshRakebackBalance();
    refreshCashbackBalance();
    // Render the full Loyalty Points card section (persistent slot above walletContent)
    _renderLoyaltySection(modal);
    // Render the Deposit Match card section below Loyalty, above Rakeback
    _renderDepositMatchSection(modal);
    // Render the Rakeback card section below Deposit Match
    _renderRakebackSection(modal);
    // Render the Daily Cashback card section below Rakeback
    _renderDailyCashbackSection(modal);
    // Render the Loyalty Shop card section below Daily Cashback
    // walletRenderLoyaltySection applies the ID guard then delegates to _renderLoyaltyShopSection
    walletRenderLoyaltySection(modal);
    // Render the VIP Deposit Bonus card section below Loyalty Shop
    walletRenderVipDepositSection(modal);
    // Render the Weekend Cashback card section below VIP Deposit Bonus
    walletRenderWeekendCashbackSection(modal);
    // Render the Win-Back Bonus card section at the top (after modal is in place)
    walletRenderWinbackSection(modal);
}

function _injectWalletGemBar(modal) {
    if (modal.querySelector('#walletGemBar')) return; // already injected
    const header = modal.querySelector('.wallet-header');
    if (!header) return;

    const bar = document.createElement('div');
    bar.id = 'walletGemBar';
    bar.style.cssText = [
        'display:flex',
        'align-items:center',
        'justify-content:space-between',
        'padding:8px 20px',
        'background:rgba(167,139,250,0.07)',
        'border-top:1px solid rgba(167,139,250,0.15)',
        'margin-top:12px'
    ].join(';');

    const gemBadge = document.createElement('span');
    gemBadge.style.cssText = 'font-size:0.85rem;color:#a78bfa;font-weight:600;display:flex;align-items:center;gap:6px;';
    // innerHTML used here to embed the gem icon span safely (no user input involved)
    gemBadge.innerHTML = '\uD83D\uDC8E Gems: <span id="walletGemBalance" style="color:#c4b5fd;">...</span>';

    const shopBtn = document.createElement('button');
    shopBtn.textContent = '\uD83D\uDC8E Gem Shop';
    shopBtn.style.cssText = [
        'background:linear-gradient(135deg,#a78bfa,#8b5cf6)',
        'color:#fff',
        'border:none',
        'border-radius:6px',
        'padding:5px 14px',
        'font-size:0.78rem',
        'font-weight:700',
        'cursor:pointer',
        'letter-spacing:0.3px'
    ].join(';');
    shopBtn.addEventListener('click', function() {
        if (typeof openGemsShop === 'function') openGemsShop();
    });

    bar.appendChild(gemBadge);
    bar.appendChild(shopBtn);
    header.appendChild(bar);

    // ── Loyalty Points bar (injected right after gem bar) ──
    const loyaltyBar = document.createElement('div');
    loyaltyBar.id = 'walletLoyaltyBar';
    loyaltyBar.style.cssText = [
        'display:flex',
        'align-items:center',
        'justify-content:space-between',
        'padding:7px 20px',
        'background:rgba(52,211,153,0.06)',
        'border-top:1px solid rgba(52,211,153,0.12)'
    ].join(';');

    const loyaltyBadge = document.createElement('span');
    loyaltyBadge.style.cssText = 'font-size:0.82rem;color:#6ee7b7;font-weight:600;display:flex;align-items:center;gap:5px;';
    loyaltyBadge.innerHTML = '\u{1F3AF} Loyalty: <span id="walletLoyaltyPoints" style="color:#a7f3d0;">...</span> pts';

    const redeemBtn = document.createElement('button');
    redeemBtn.id = 'walletLoyaltyRedeemBtn';
    redeemBtn.textContent = 'Redeem';
    redeemBtn.title = '100 pts = $1.00 — minimum 100 pts';
    redeemBtn.style.cssText = [
        'background:linear-gradient(135deg,#34d399,#059669)',
        'color:#fff',
        'border:none',
        'border-radius:6px',
        'padding:4px 12px',
        'font-size:0.75rem',
        'font-weight:700',
        'cursor:pointer',
        'letter-spacing:0.3px'
    ].join(';');
    redeemBtn.addEventListener('click', function() {
        _redeemLoyaltyPoints();
    });

    loyaltyBar.appendChild(loyaltyBadge);
    loyaltyBar.appendChild(redeemBtn);
    header.appendChild(loyaltyBar);

    // ── Rakeback bar (weekly 1% on net losses, paid weekly) ──
    var rakeBar = document.createElement('div');
    rakeBar.id = 'walletRakebackBar';
    rakeBar.style.cssText = [
        'display:flex', 'align-items:center', 'justify-content:space-between',
        'padding:7px 20px',
        'background:rgba(251,191,36,0.06)',
        'border-top:1px solid rgba(251,191,36,0.12)'
    ].join(';');
    var rakeBadge = document.createElement('span');
    rakeBadge.style.cssText = 'font-size:0.82rem;color:#fcd34d;font-weight:600;display:flex;align-items:center;gap:5px;';
    rakeBadge.innerHTML = '\uD83D\uDCB0 Rakeback: <span id="walletRakebackAmt" style="color:#fef08a;">...</span>';
    var rakeBtn = document.createElement('button');
    rakeBtn.id = 'walletRakebackClaimBtn';
    rakeBtn.textContent = 'Claim';
    rakeBtn.title = 'Weekly 1% rakeback on net losses (paid weekly, up to $50)';
    rakeBtn.style.cssText = [
        'background:linear-gradient(135deg,#f59e0b,#d97706)',
        'color:#fff', 'border:none', 'border-radius:6px',
        'padding:4px 12px', 'font-size:0.75rem', 'font-weight:700',
        'cursor:pointer', 'letter-spacing:0.3px'
    ].join(';');
    rakeBtn.addEventListener('click', function() { _claimRakeback(); });
    rakeBar.appendChild(rakeBadge);
    rakeBar.appendChild(rakeBtn);
    header.appendChild(rakeBar);

    // ── Daily cashback bar (tiered: 2-10% of net losses past 24h) ──
    var cbBar = document.createElement('div');
    cbBar.id = 'walletCashbackBar';
    cbBar.style.cssText = [
        'display:flex', 'align-items:center', 'justify-content:space-between',
        'padding:7px 20px',
        'background:rgba(249,115,22,0.06)',
        'border-top:1px solid rgba(249,115,22,0.12)'
    ].join(';');
    var cbBadge = document.createElement('span');
    cbBadge.style.cssText = 'font-size:0.82rem;color:#fdba74;font-weight:600;display:flex;align-items:center;gap:5px;';
    cbBadge.innerHTML = '\uD83D\uDD04 Cashback: <span id="walletCashbackAmt" style="color:#fed7aa;">...</span>';
    var cbBtn = document.createElement('button');
    cbBtn.id = 'walletCashbackClaimBtn';
    cbBtn.textContent = 'Claim';
    cbBtn.title = 'Daily cashback on net losses (2-10% by VIP tier)';
    cbBtn.style.cssText = [
        'background:linear-gradient(135deg,#f97316,#ea580c)',
        'color:#fff', 'border:none', 'border-radius:6px',
        'padding:4px 12px', 'font-size:0.75rem', 'font-weight:700',
        'cursor:pointer', 'letter-spacing:0.3px'
    ].join(';');
    cbBtn.addEventListener('click', function() { _claimDailyCashback(); });
    cbBar.appendChild(cbBadge);
    cbBar.appendChild(cbBtn);
    header.appendChild(cbBar);
}

function refreshGemBalance() {
    const token = localStorage.getItem(typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken');
    if (!token || typeof isServerAuthToken === 'function' && !isServerAuthToken(token)) return;
    fetch('/api/gems', { headers: { Authorization: 'Bearer ' + token } })
        .then(function(r) { return r.ok ? r.json() : null; })
        .then(function(data) {
            if (data && typeof data.gems !== 'undefined') {
                const el = document.getElementById('walletGemBalance');
                if (el) el.textContent = (data.gems || 0).toLocaleString();
            }
        })
        .catch(function() {});
}

function refreshLoyaltyBalance() {
    const token = localStorage.getItem(typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken');
    if (!token || typeof isServerAuthToken === 'function' && !isServerAuthToken(token)) return;
    fetch('/api/loyaltyshop/status', { headers: { Authorization: 'Bearer ' + token } })
        .then(function(r) { return r.ok ? r.json() : null; })
        .then(function(data) {
            if (data && typeof data.points !== 'undefined') {
                const el = document.getElementById('walletLoyaltyPoints');
                if (el) el.textContent = (data.points || 0).toLocaleString();
                const btn = document.getElementById('walletLoyaltyRedeemBtn');
                if (btn) btn.disabled = (data.points || 0) < 100;
            }
        })
        .catch(function() {});
}

function _redeemLoyaltyPoints() {
    const el = document.getElementById('walletLoyaltyPoints');
    const currentPts = el ? parseInt(el.textContent.replace(/,/g, ''), 10) || 0 : 0;
    if (currentPts < 100) {
        if (typeof showToast === 'function') showToast('Need at least 100 loyalty pts to redeem (100 pts = $1.00)', 'info', 3000);
        return;
    }
    // Redeem in 100-pt blocks (= $1 each)
    const blocks = Math.floor(currentPts / 100);
    const redeemPts = blocks * 100;
    const creditAmt = (redeemPts / 100).toFixed(2);
    if (!confirm('Redeem ' + redeemPts.toLocaleString() + ' loyalty pts for $' + creditAmt + '?')) return;
    const token = localStorage.getItem(typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken');
    if (!token) return;
    fetch('/api/loyaltyshop/redeem', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ points: redeemPts })
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
        if (data.success) {
            if (typeof showToast === 'function') showToast('\uD83C\uDFAF Redeemed ' + redeemPts.toLocaleString() + ' pts → $' + creditAmt + ' credited!', 'win', 4000);
            if (typeof updateBalanceDisplay === 'function') updateBalanceDisplay(data.newBalance);
            else if (typeof balance !== 'undefined') { balance = data.newBalance; }
            refreshLoyaltyBalance();
            refreshGemBalance();
        } else {
            if (typeof showToast === 'function') showToast(data.error || 'Redemption failed', 'error', 3000);
        }
    })
    .catch(function() {
        if (typeof showToast === 'function') showToast('Redemption failed — try again', 'error', 3000);
    });
}

function refreshRakebackBalance() {
    var token = localStorage.getItem(typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken');
    if (!token || typeof isServerAuthToken === 'function' && !isServerAuthToken(token)) return;
    fetch('/api/rakeback/status', { headers: { Authorization: 'Bearer ' + token } })
        .then(function(r) { return r.ok ? r.json() : null; })
        .then(function(data) {
            if (!data) return;
            var el = document.getElementById('walletRakebackAmt');
            var btn = document.getElementById('walletRakebackClaimBtn');
            var pending = parseFloat(data.pendingRakeback) || 0;
            if (el) el.textContent = '$' + pending.toFixed(2) + ' pending';
            if (btn) btn.disabled = pending < 0.01;
        })
        .catch(function() {});
}

function refreshCashbackBalance() {
    var token = localStorage.getItem(typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken');
    if (!token || typeof isServerAuthToken === 'function' && !isServerAuthToken(token)) return;
    fetch('/api/dailycashback/status', { headers: { Authorization: 'Bearer ' + token } })
        .then(function(r) { return r.ok ? r.json() : null; })
        .then(function(data) {
            if (!data) return;
            var el = document.getElementById('walletCashbackAmt');
            var btn = document.getElementById('walletCashbackClaimBtn');
            if (el) {
                if (data.claimed) {
                    el.textContent = '\u2713 Claimed today';
                    el.style.color = '#86efac';
                } else if (data.eligible) {
                    el.textContent = '$' + (parseFloat(data.amount) || 0).toFixed(2) + ' available (' + (data.vipLabel || '') + ' ' + Math.round((data.cashbackRate || 0) * 100) + '%)';
                    el.style.color = '#fed7aa';
                } else {
                    el.textContent = 'None yet';
                    el.style.color = '#9ca3af';
                }
            }
            if (btn) btn.disabled = !data.eligible;
        })
        .catch(function() {});
}

function _claimRakeback() {
    var token = localStorage.getItem(typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken');
    if (!token) return;
    var btn = document.getElementById('walletRakebackClaimBtn');
    if (btn) btn.disabled = true;
    fetch('/api/rakeback/claim', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
        if (data.success) {
            if (typeof showToast === 'function') showToast('\uD83D\uDCB0 Rakeback $' + (parseFloat(data.credited) || 0).toFixed(2) + ' credited!', 'win', 4000);
            if (typeof updateBalanceDisplay === 'function') updateBalanceDisplay(data.newBalance);
            else if (typeof balance !== 'undefined') balance = data.newBalance;
            refreshRakebackBalance();
        } else {
            if (typeof showToast === 'function') showToast(data.error || 'Nothing to claim yet', 'info', 3000);
            if (btn) btn.disabled = false;
        }
    })
    .catch(function() {
        if (typeof showToast === 'function') showToast('Claim failed \u2014 try again', 'error', 3000);
        if (btn) btn.disabled = false;
    });
}

function _claimDailyCashback() {
    var token = localStorage.getItem(typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken');
    if (!token) return;
    var btn = document.getElementById('walletCashbackClaimBtn');
    if (btn) btn.disabled = true;
    fetch('/api/dailycashback/claim', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
        if (data.success) {
            if (typeof showToast === 'function') showToast('\uD83D\uDD04 Daily Cashback $' + (parseFloat(data.credited) || 0).toFixed(2) + ' credited!', 'win', 4000);
            if (typeof updateBalanceDisplay === 'function') updateBalanceDisplay(data.newBalance);
            else if (typeof balance !== 'undefined') balance = data.newBalance;
            refreshCashbackBalance();
        } else {
            if (typeof showToast === 'function') showToast(data.error || 'Cashback not available', 'info', 3000);
            if (btn) btn.disabled = false;
        }
    })
    .catch(function() {
        if (typeof showToast === 'function') showToast('Claim failed \u2014 try again', 'error', 3000);
        if (btn) btn.disabled = false;
    });
}

function _checkFirstDepositStatus() {
    if (window._walletHasCompletedDeposit !== undefined) return; // already checked
    const token = localStorage.getItem(typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken');
    if (!token || !isServerAuthToken(token)) { window._walletHasCompletedDeposit = false; return; }
    fetch('/api/payment/deposits?limit=200', { headers: { Authorization: 'Bearer ' + token } })
        .then(r => r.ok ? r.json() : null)
        .then(data => {
            if (data && data.deposits) {
                const completed = data.deposits.filter(d => d.status === 'completed');
                window._walletHasCompletedDeposit = completed.length > 0;
                window._walletTotalDeposited = completed.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);
                renderWalletContent(); // re-render with updated info
            }
        })
        .catch(() => {});
}


function hideWalletModal() {
    const modal = document.getElementById('walletModal');
    if (modal) modal.classList.remove('active');
    walletAddMethodType = null;
}


// ═══════════════════════════════════════════════════════
// TAB SWITCHING
// ═══════════════════════════════════════════════════════

function switchWalletTab(tab) {
    walletActiveTab = tab;
    walletAddMethodType = null;

    // Update tab button highlights
    const tabBtns = document.querySelectorAll('.wallet-tab');
    tabBtns.forEach(btn => {
        const isActive = btn.textContent.trim().toLowerCase() === tab;
        btn.classList.toggle('active', isActive);
    });

    renderWalletContent();

    if (tab === 'history') {
        walletHistoryPage = 1;
        loadTransactionHistory(1);
    }
    if (tab === 'methods') {
        loadPaymentMethods();
    }
}


// ═══════════════════════════════════════════════════════
// MASTER RENDER
// ═══════════════════════════════════════════════════════

function renderWalletContent() {
    const container = document.getElementById('walletContent');
    if (!container) return;

    switch (walletActiveTab) {
        case 'deposit':
            renderDepositForm();
            break;
        case 'withdraw':
            renderWithdrawForm();
            break;
        case 'methods':
            renderPaymentMethods();
            break;
        case 'history':
            renderTransactionHistory(walletDepositHistory, {
                page: walletHistoryPage,
                totalPages: walletHistoryTotalPages
            });
            break;
        default:
            renderDepositForm();
    }
}


// ═══════════════════════════════════════════════════════
// PAYMENT METHODS — CRUD
// ═══════════════════════════════════════════════════════

async function loadPaymentMethods() {
    try {
        const res = await apiRequest('/api/payment/methods', { requireAuth: true });
        walletPaymentMethods = Array.isArray(res.methods) ? res.methods : [];
    } catch (err) {
        if (!err.isNetworkError) {
            console.warn('loadPaymentMethods:', err.message);
        }
        walletPaymentMethods = [];
    }
    if (walletActiveTab === 'methods') {
        renderPaymentMethods();
    }
}


function renderPaymentMethods() {
    const container = document.getElementById('walletContent');
    if (!container) return;

    const methodsList = walletPaymentMethods.length > 0
        ? walletPaymentMethods.map(m => {
            const meta = WALLET_PAYMENT_TYPES[m.type] || WALLET_PAYMENT_TYPES.visa;
            return `
                <div class="wallet-method-card${m.is_default ? ' wallet-method-card--default' : ''}">
                    <div class="wallet-method-card__icon">${meta.icon}</div>
                    <div class="wallet-method-card__info">
                        <span class="wallet-method-card__label">${escapeHtml(m.label)}</span>
                        <span class="wallet-method-card__detail">${escapeHtml(m.masked_detail || '')}</span>
                        ${m.is_default ? '<span class="wallet-method-card__badge">DEFAULT</span>' : ''}
                    </div>
                    <div class="wallet-method-card__actions">
                        ${!m.is_default ? `<button class="wallet-btn wallet-btn--sm wallet-btn--ghost" onclick="setDefaultPaymentMethod(${m.id})">Set Default</button>` : ''}
                        <button class="wallet-btn wallet-btn--sm wallet-btn--danger" onclick="removePaymentMethod(${m.id})">Remove</button>
                    </div>
                </div>`;
        }).join('')
        : '<div class="wallet-empty-state">No saved payment methods. Add one below.</div>';

    const addButtons = Object.entries(WALLET_PAYMENT_TYPES).map(([type, meta]) => `
        <button class="wallet-add-method-btn" onclick="showAddMethodForm('${type}')">
            ${meta.icon}
            <span>${meta.label}</span>
        </button>
    `).join('');

    container.innerHTML = `
        <div class="wallet-section">
            <h3 class="wallet-section__title">Saved Payment Methods</h3>
            <div class="wallet-methods-list">${methodsList}</div>
        </div>
        <div class="wallet-section">
            <h3 class="wallet-section__title">Add New Method</h3>
            <div class="wallet-add-method-grid">${addButtons}</div>
            <div id="walletAddMethodForm"></div>
        </div>`;
}


async function addPaymentMethod(type, label, details) {
    try {
        await apiRequest('/api/payment/methods', {
            method: 'POST',
            body: { type, label, details },
            requireAuth: true
        });
        showToast('Payment method added.', 'success');
        hideAddMethodForm();
        await loadPaymentMethods();
    } catch (err) {
        showToast(err.message || 'Failed to add payment method.', 'error');
    }
}


async function removePaymentMethod(id) {
    if (!confirm('Remove this payment method?')) return;
    try {
        await apiRequest(`/api/payment/methods/${id}`, {
            method: 'DELETE',
            requireAuth: true
        });
        showToast('Payment method removed.', 'success');
        await loadPaymentMethods();
    } catch (err) {
        showToast(err.message || 'Failed to remove payment method.', 'error');
    }
}


async function setDefaultPaymentMethod(id) {
    try {
        await apiRequest(`/api/payment/methods/${id}/default`, {
            method: 'PUT',
            requireAuth: true
        });
        showToast('Default payment method updated.', 'success');
        await loadPaymentMethods();
    } catch (err) {
        showToast(err.message || 'Failed to update default method.', 'error');
    }
}


// ═══════════════════════════════════════════════════════
// FIRST-DEPOSIT WELCOME BANNER
// ═══════════════════════════════════════════════════════

var _walletBannerStylesInjected = false;

function _injectFirstDepositBannerStyles() {
    if (_walletBannerStylesInjected) return;
    _walletBannerStylesInjected = true;
    var style = document.createElement('style');
    style.id = 'wallet-first-deposit-banner-styles';
    style.textContent = [
        '.wallet-first-deposit-banner{background:linear-gradient(135deg,rgba(251,191,36,0.12),rgba(217,119,6,0.06));border:1.5px solid rgba(251,191,36,0.35);border-radius:14px;padding:16px;margin-bottom:16px;text-align:center;}',
        '.wfdb-badge{display:inline-block;background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;font-size:11px;font-weight:800;letter-spacing:1px;padding:3px 12px;border-radius:20px;margin-bottom:8px;}',
        '.wfdb-title{color:#fbbf24;font-size:17px;font-weight:900;margin-bottom:12px;}',
        '.wfdb-offers{display:flex;justify-content:center;gap:16px;margin-bottom:10px;}',
        '.wfdb-offer{display:flex;flex-direction:column;align-items:center;}',
        '.wfdb-num{color:#fff;font-size:20px;font-weight:900;line-height:1;}',
        '.wfdb-lbl{color:rgba(255,255,255,0.45);font-size:10px;margin-top:3px;}',
        '.wfdb-note{color:rgba(255,255,255,0.3);font-size:10px;}'
    ].join('');
    document.head.appendChild(style);
}

function _renderFirstDepositBanner() {
    if (localStorage.getItem('hasEverDeposited')) return '';
    _injectFirstDepositBannerStyles();
    return '<div class="wallet-first-deposit-banner">' +
        '<div class="wfdb-badge">\uD83C\uDF81 WELCOME OFFER</div>' +
        '<div class="wfdb-title">100% Match on Your First Deposit!</div>' +
        '<div class="wfdb-offers">' +
            '<div class="wfdb-offer"><span class="wfdb-num">$1,000</span><span class="wfdb-lbl">Max Bonus</span></div>' +
            '<div class="wfdb-offer"><span class="wfdb-num">50</span><span class="wfdb-lbl">Free Spins</span></div>' +
            '<div class="wfdb-offer"><span class="wfdb-num">+$5</span><span class="wfdb-lbl">No-Deposit Gift</span></div>' +
        '</div>' +
        '<div class="wfdb-note">Minimum deposit $10 \xB7 T&Cs apply</div>' +
    '</div>';
}

// ═══════════════════════════════════════════════════════
// DEPOSIT FORM
// ═══════════════════════════════════════════════════════

function renderDepositForm() {
    const container = document.getElementById('walletContent');
    if (!container) return;

    // ── VIP Tier Progress Bar ──────────────────────────────────────────────
    const VIP_TIERS = [
        { label: 'Bronze',   min: 100,    cashback: '6%'  },
        { label: 'Silver',   min: 500,    cashback: '8%'  },
        { label: 'Gold',     min: 2000,   cashback: '10%' },
        { label: 'Platinum', min: 10000,  cashback: '15%' },
        { label: 'Diamond',  min: 50000,  cashback: '20%' }
    ];
    const totalWagered = (typeof stats !== 'undefined' ? stats.totalWagered || 0 : 0);
    let curTierIdx = -1;
    for (let i = VIP_TIERS.length - 1; i >= 0; i--) {
        if (totalWagered >= VIP_TIERS[i].min) { curTierIdx = i; break; }
    }
    const curTier   = curTierIdx >= 0 ? VIP_TIERS[curTierIdx]     : null;
    const nextTier  = curTierIdx < VIP_TIERS.length - 1 ? VIP_TIERS[curTierIdx + 1] : null;
    const prevMin   = curTier ? curTier.min : 0;
    const pct       = nextTier ? Math.min(100, ((totalWagered - prevMin) / (nextTier.min - prevMin)) * 100) : 100;
    const tierLabel = curTier ? curTier.label : 'No Tier';
    const tierColor = curTierIdx === 4 ? '#b9f2ff' : curTierIdx === 3 ? '#e5cfff' : curTierIdx === 2 ? '#ffd700' : curTierIdx === 1 ? '#94a3b8' : '#cd7f32';
    const vipBarHtml = `<div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:10px 14px;margin-bottom:10px;font-size:0.78rem;">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
    <span style="color:${tierColor};font-weight:700;">${tierLabel} Tier${curTier ? ' · ' + curTier.cashback + ' cashback' : ''}</span>
    <span style="color:#94a3b8;">${nextTier ? '$' + (nextTier.min - totalWagered).toLocaleString() + ' to ' + nextTier.label + ' (' + nextTier.cashback + ' cashback)' : 'Max tier reached!'}</span>
  </div>
  <div style="background:rgba(255,255,255,0.08);border-radius:4px;height:6px;overflow:hidden;">
    <div style="width:${pct.toFixed(1)}%;height:100%;background:linear-gradient(90deg,${tierColor},#fff8);border-radius:4px;transition:width 0.4s;"></div>
  </div>
</div>`;
    // ────────────────────────────────────────────────────────────────────────

    const walletStart = walletSessionStartBalance !== null ? walletSessionStartBalance : balance;
    const netChange = balance - walletStart;
    const netClass = netChange > 0 ? 'wst-pos' : netChange < 0 ? 'wst-neg' : 'wst-neutral';
    const netSign = netChange >= 0 ? '+' : '';
    const netArrow = netChange > 0 ? '▲' : netChange < 0 ? '▼' : '–';
    const sessionTrackerHtml = `<div id="walletSessionTracker">
  <span class="wst-label">Session start:</span>
  <span class="wst-amount">$${formatMoney(walletStart)}</span>
  <span class="wst-sep">·</span>
  <span class="wst-label">Net:</span>
  <span class="wst-net ${netClass}">${netSign}$${formatMoney(Math.abs(netChange))} ${netArrow}</span>
</div>`;

    const quickBtns = WALLET_QUICK_AMOUNTS.map(amt =>
        `<button class="wallet-quick-btn" onclick="walletSetDepositAmount(${amt})">$${amt}</button>`
    ).join('');

    const payTypeCards = Object.entries(WALLET_PAYMENT_TYPES).map(([type, meta]) => `
        <label class="wallet-pay-card" data-type="${type}">
            <input type="radio" name="walletDepositType" value="${type}" class="wallet-pay-card__radio">
            <div class="wallet-pay-card__inner" style="--pay-accent: ${meta.color}">
                ${meta.icon}
                <span class="wallet-pay-card__name">${meta.label}</span>
            </div>
        </label>
    `).join('');

    const savedOptions = walletPaymentMethods.length > 0
        ? `<div class="wallet-field">
                <label class="wallet-label">Use Saved Method</label>
                <select id="walletSavedMethod" class="wallet-select" onchange="walletOnSavedMethodChange()">
                    <option value="">-- Select saved method --</option>
                    ${walletPaymentMethods.map(m => {
                        const meta = WALLET_PAYMENT_TYPES[m.type] || {};
                        return `<option value="${m.id}" data-type="${m.type}">${meta.label || m.type} - ${escapeHtml(m.label)}</option>`;
                    }).join('')}
                </select>
           </div>`
        : '';

    const lowBalBanner = (balance > 0 && balance < 20) ? `
    <div style="background:linear-gradient(135deg,rgba(255,215,0,0.1),rgba(255,140,0,0.05));border:1px solid rgba(255,215,0,0.3);border-radius:10px;padding:12px 16px;margin-bottom:12px;display:flex;align-items:center;gap:12px;">
        <span style="font-size:1.5rem;">&#x1F381;</span>
        <div>
            <div style="font-size:0.85rem;font-weight:700;color:#ffd700;margin-bottom:2px;">50% Reload Bonus Available</div>
            <div style="font-size:0.75rem;color:#94a3b8;">Deposit now and we'll match 50% up to $250. Keep the winnings rolling!</div>
        </div>
    </div>` : '';

    container.innerHTML = _renderFirstDepositBanner() + vipBarHtml + sessionTrackerHtml + lowBalBanner + `
        <div class="wallet-section">
            <div class="wallet-balance-display">
                <span class="wallet-balance-display__label">Current Balance</span>
                <span class="wallet-balance-display__amount">$${formatMoney(balance)}</span>
            </div>
        </div>

        <div class="wallet-section">
            <h3 class="wallet-section__title">Deposit Amount</h3>
            <div class="wallet-field">
                <div class="wallet-amount-input-wrap">
                    <span class="wallet-amount-input-wrap__prefix">$</span>
                    <input type="number" id="walletDepositAmount" class="wallet-input wallet-input--amount"
                           min="1" step="1" value="50" placeholder="0.00">
                </div>
            </div>
            <div class="wallet-quick-amounts">${quickBtns}</div>
        </div>

        <div class="wallet-section">
            <h3 class="wallet-section__title">Payment Method</h3>
            ${savedOptions}
            <div class="wallet-pay-grid">${payTypeCards}</div>
        </div>

        <div id="cryptoDepositSection" class="crypto-deposit-section" style="display:none;"></div>

        <div class="wallet-section wallet-section--actions">
            <div style="text-align:center;font-size:12px;color:#c084fc;margin-bottom:10px;font-weight:600">
                💎 Earn gems on every deposit — $5 = 100 gems, $50 = 1000 gems, $100+ = 2500 gems
            </div>
            <button class="wallet-btn wallet-btn--primary wallet-btn--lg" onclick="submitDeposit()">
                <span class="wallet-btn__icon">\u2B07</span> Deposit Funds
            </button>
        </div>`;

    // Pre-select first payment type
    const firstRadio = container.querySelector('.wallet-pay-card__radio');
    if (firstRadio) {
        firstRadio.checked = true;
        firstRadio.closest('.wallet-pay-card').classList.add('wallet-pay-card--selected');
    }

    // Bind radio change listeners
    container.querySelectorAll('.wallet-pay-card__radio').forEach(radio => {
        radio.addEventListener('change', () => {
            container.querySelectorAll('.wallet-pay-card').forEach(c => c.classList.remove('wallet-pay-card--selected'));
            if (radio.checked) radio.closest('.wallet-pay-card').classList.add('wallet-pay-card--selected');
            // Show/hide MetaMask section for crypto types
            walletUpdateCryptoSection(radio.value);
        });
    });

    // First-deposit bonus banner (DOM-safe)
    if (!window._walletHasCompletedDeposit) {
        const banner = document.createElement('div');
        banner.style.cssText = 'background:linear-gradient(135deg,#ffd700,#ff8c00);color:#0d0d1a;padding:14px 18px;border-radius:10px;margin-bottom:16px;text-align:center;font-weight:700;box-shadow:0 0 20px rgba(255,215,0,0.4);';
        const title = document.createElement('div');
        title.style.cssText = 'font-size:1.3rem;margin-bottom:4px;';
        title.textContent = '🎁 FIRST DEPOSIT BONUS';
        const desc = document.createElement('div');
        desc.style.cssText = 'font-weight:500;font-size:0.85rem;';
        desc.textContent = 'Get +$5 free credits + 1,000 💎 gems on your first deposit!';
        banner.appendChild(title);
        banner.appendChild(desc);
        container.insertBefore(banner, container.firstChild);
    }

    // Free spins display — fetched asynchronously and injected into the balance section
    walletFetchAndShowFreeSpins(container);
}


/**
 * Fetch free spins balance from GET /api/freespins/status and inject a
 * display row after the main balance in the deposit form container.
 * Requires auth; silently no-ops if not logged in or no spins.
 */
async function walletFetchAndShowFreeSpins(container) {
    if (typeof isServerAuthToken !== 'function' || !isServerAuthToken()) return;
    var tokenKey = (typeof STORAGE_KEY_TOKEN !== 'undefined') ? STORAGE_KEY_TOKEN : 'casinoToken';
    var token = localStorage.getItem(tokenKey);
    if (!token) return;

    var data;
    try {
        var resp = await fetch('/api/freespins/status', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (!resp.ok) return;
        data = await resp.json();
    } catch (e) {
        return;
    }

    var count = (data && data.count) ? Number(data.count) : 0;
    if (count <= 0) return; // No free spins — nothing to show

    // Find the balance display element and insert a row after it
    var balanceSection = container.querySelector('.wallet-balance-display');
    if (!balanceSection || !balanceSection.parentNode) return;

    var row = document.createElement('div');
    row.id = 'walletFreeSpinsRow';
    row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-top:8px;padding:8px 12px;background:rgba(168,85,247,0.1);border:1px solid rgba(168,85,247,0.3);border-radius:8px;font-size:0.82rem;';

    var label = document.createElement('span');
    label.style.color = '#c4b5fd';
    label.textContent = 'Free Spins Available';
    row.appendChild(label);

    var badge = document.createElement('span');
    badge.style.cssText = 'font-weight:700;color:#a855f7;background:rgba(168,85,247,0.18);padding:2px 10px;border-radius:12px;';
    badge.textContent = String(count);
    row.appendChild(badge);

    if (data.expiresAt) {
        var expiry = document.createElement('div');
        expiry.style.cssText = 'font-size:0.72rem;color:#94a3b8;margin-top:4px;';
        try {
            var expDate = new Date(data.expiresAt);
            expiry.textContent = 'Expires: ' + expDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        } catch (e) {
            expiry.textContent = 'Expires: ' + data.expiresAt;
        }
        row.appendChild(expiry);
    }

    // Insert the row after the balance display div (inside the same wallet-section)
    var parentSection = balanceSection.parentNode;
    parentSection.insertBefore(row, balanceSection.nextSibling);
}


function walletSetDepositAmount(amount) {
    const input = document.getElementById('walletDepositAmount');
    if (input) input.value = amount;
}


function walletOnSavedMethodChange() {
    const sel = document.getElementById('walletSavedMethod');
    if (!sel || !sel.value) return;
    const opt = sel.options[sel.selectedIndex];
    const type = opt.dataset.type;
    if (type) {
        const radio = document.querySelector(`.wallet-pay-card__radio[value="${type}"]`);
        if (radio) {
            radio.checked = true;
            radio.dispatchEvent(new Event('change'));
        }
    }
}


async function submitDeposit() {
    const amountInput = document.getElementById('walletDepositAmount');
    const amount = parseFloat(amountInput?.value);
    if (!Number.isFinite(amount) || amount <= 0) {
        showToast('Enter a valid deposit amount.', 'error');
        return;
    }

    const selectedRadio = document.querySelector('.wallet-pay-card__radio:checked');
    const paymentType = selectedRadio?.value;
    if (!paymentType) {
        showToast('Select a payment method.', 'error');
        return;
    }

    const savedMethodSel = document.getElementById('walletSavedMethod');
    const savedMethodId = savedMethodSel?.value || null;

    try {
        const res = await apiRequest('/api/payment/deposit', {
            method: 'POST',
            body: {
                amount,
                paymentType,
                paymentMethodId: savedMethodId ? parseInt(savedMethodId, 10) : undefined
            },
            requireAuth: true
        });

        // If the server returned an updated balance (admin-approved or instant),
        // update locally. Otherwise the deposit is pending — do NOT fake-add balance.
        if (res.deposit && res.deposit.status === 'pending') {
            showToast(
                `$${formatMoney(amount)} deposit submitted! Funds will appear once payment is confirmed.`,
                'success'
            );
            if (res.gemsAwarded > 0) {
                setTimeout(() => showToast(`\u{1F48E} +${res.gemsAwarded} gems credited to your account!`, 'success', 4000), 1500);
            }
        } else {
            const newBalance = Number(res.balance);
            if (Number.isFinite(newBalance)) {
                balance = newBalance;
                updateBalance();
                resetNudgeOnDeposit();
            }
            const gemMsg = res.gemsAwarded ? ` + \u{1F48E} ${res.gemsAwarded} gems!` : '';
            showToast(`${formatMoney(amount)} deposited successfully!${gemMsg}`, 'success');
            try { localStorage.setItem('hasEverDeposited', '1'); } catch (e) { /* ignore */ }
        }
        if (amountInput) amountInput.value = '';
        renderDepositForm(); // refresh to show updated state
    } catch (err) {
        showToast(err.message || 'Deposit failed. Please try again.', 'error');
    }
}


// ═══════════════════════════════════════════════════════
// WITHDRAWAL FORM
// ═══════════════════════════════════════════════════════

function renderWithdrawForm() {
    const container = document.getElementById('walletContent');
    if (!container) return;

    const walletStart = walletSessionStartBalance !== null ? walletSessionStartBalance : balance;
    const netChange = balance - walletStart;
    const netClass = netChange > 0 ? 'wst-pos' : netChange < 0 ? 'wst-neg' : 'wst-neutral';
    const netSign = netChange >= 0 ? '+' : '';
    const netArrow = netChange > 0 ? '▲' : netChange < 0 ? '▼' : '–';
    const sessionTrackerHtml = `<div id="walletSessionTracker">
  <span class="wst-label">Session start:</span>
  <span class="wst-amount">$${formatMoney(walletStart)}</span>
  <span class="wst-sep">·</span>
  <span class="wst-label">Net:</span>
  <span class="wst-net ${netClass}">${netSign}$${formatMoney(Math.abs(netChange))} ${netArrow}</span>
</div>`;

    const payTypeCards = Object.entries(WALLET_PAYMENT_TYPES).map(([type, meta]) => `
        <label class="wallet-pay-card" data-type="${type}">
            <input type="radio" name="walletWithdrawType" value="${type}" class="wallet-pay-card__radio">
            <div class="wallet-pay-card__inner" style="--pay-accent: ${meta.color}">
                ${meta.icon}
                <span class="wallet-pay-card__name">${meta.label}</span>
            </div>
        </label>
    `).join('');

    // Pending withdrawals section
    const pendingHtml = walletWithdrawalHistory.length > 0
        ? `<div class="wallet-section">
                <h3 class="wallet-section__title">Pending Withdrawals</h3>
                <div class="wallet-pending-list">
                    ${walletWithdrawalHistory.map(w => `
                        <div class="wallet-pending-item">
                            <div class="wallet-pending-item__info">
                                <span class="wallet-pending-item__amount">$${formatMoney(w.amount)}</span>
                                <span class="wallet-pending-item__meta">${WALLET_PAYMENT_TYPES[w.payment_type]?.label || w.payment_type} &middot; ${walletFormatDate(w.created_at)}</span>
                            </div>
                            <button class="wallet-btn wallet-btn--sm wallet-btn--danger" onclick="cancelWithdrawal(${w.id})">Cancel</button>
                        </div>
                    `).join('')}
                </div>
           </div>`
        : '';

    container.innerHTML = sessionTrackerHtml + `
        <div class="wallet-section">
            <div class="wallet-balance-display">
                <span class="wallet-balance-display__label">Available to Withdraw</span>
                <span class="wallet-balance-display__amount">$${formatMoney(balance)}</span>
            </div>
        </div>

        <div class="wallet-section">
            <h3 class="wallet-section__title">Withdrawal Amount</h3>
            <div class="wallet-field">
                <div class="wallet-amount-input-wrap">
                    <span class="wallet-amount-input-wrap__prefix">$</span>
                    <input type="number" id="walletWithdrawAmount" class="wallet-input wallet-input--amount"
                           min="1" max="${balance}" step="1" value="" placeholder="0.00">
                </div>
            </div>
            <div class="wallet-quick-amounts">
                <button class="wallet-quick-btn" onclick="walletSetWithdrawAmount(25)">$25</button>
                <button class="wallet-quick-btn" onclick="walletSetWithdrawAmount(50)">$50</button>
                <button class="wallet-quick-btn" onclick="walletSetWithdrawAmount(100)">$100</button>
                <button class="wallet-quick-btn" onclick="walletSetWithdrawAmount('all')">All</button>
            </div>
        </div>

        <div class="wallet-section">
            <h3 class="wallet-section__title">Withdraw To</h3>
            <div class="wallet-pay-grid">${payTypeCards}</div>
        </div>

        <div class="wallet-section wallet-section--actions">
            <button class="wallet-btn wallet-btn--primary wallet-btn--lg" onclick="submitWithdrawal()">
                <span class="wallet-btn__icon">\u2B06</span> Request Withdrawal
            </button>
        </div>

        ${pendingHtml}`;

    // Pre-select first payment type
    const firstRadio = container.querySelector('.wallet-pay-card__radio');
    if (firstRadio) {
        firstRadio.checked = true;
        firstRadio.closest('.wallet-pay-card').classList.add('wallet-pay-card--selected');
    }

    container.querySelectorAll('.wallet-pay-card__radio').forEach(radio => {
        radio.addEventListener('change', () => {
            container.querySelectorAll('.wallet-pay-card').forEach(c => c.classList.remove('wallet-pay-card--selected'));
            if (radio.checked) radio.closest('.wallet-pay-card').classList.add('wallet-pay-card--selected');
        });
    });

    // Show wagering requirement progress (if stats available)
    if (typeof stats !== 'undefined' && stats.totalWagered !== undefined) {
        const totalDep = window._walletTotalDeposited || 0;
        if (totalDep > 0) {
            const wagered = stats.totalWagered || 0;
            const pct = Math.min(100, (wagered / totalDep) * 100);
            const met = wagered >= totalDep;
            const wagerDiv = document.createElement('div');
            wagerDiv.style.cssText = 'padding:12px 16px;border-radius:8px;margin-top:8px;border:1px solid ' + (met ? '#10b981' : '#fbbf24') + ';background:rgba(' + (met ? '16,185,129' : '251,191,36') + ',0.1);';
            const label = document.createElement('div');
            label.style.cssText = 'font-size:0.8rem;color:#94a3b8;margin-bottom:6px;';
            label.textContent = met ? 'Wagering requirement met' : 'Wagering requirement: ' + formatMoney(wagered) + ' / ' + formatMoney(totalDep);
            wagerDiv.appendChild(label);
            if (!met) {
                const barBg = document.createElement('div');
                barBg.style.cssText = 'height:6px;background:#1e293b;border-radius:3px;overflow:hidden;';
                const barFill = document.createElement('div');
                barFill.style.cssText = 'height:100%;border-radius:3px;background:linear-gradient(90deg,#fbbf24,#f59e0b);width:' + pct.toFixed(1) + '%;transition:width 0.3s;';
                barBg.appendChild(barFill);
                wagerDiv.appendChild(barBg);
            }
            // Insert before the actions section
            const actionsSection = container.querySelector('.wallet-section--actions');
            if (actionsSection) container.insertBefore(wagerDiv, actionsSection);
        }
    }
}


function walletSetWithdrawAmount(value) {
    const input = document.getElementById('walletWithdrawAmount');
    if (!input) return;
    if (value === 'all') {
        input.value = Math.floor(balance);
    } else {
        input.value = value;
    }
}


async function submitWithdrawal() {
    const amountInput = document.getElementById('walletWithdrawAmount');
    const amount = parseFloat(amountInput?.value);
    if (!Number.isFinite(amount) || amount <= 0) {
        showToast('Enter a valid withdrawal amount.', 'error');
        return;
    }
    if (amount > balance) {
        showToast('Insufficient balance for this withdrawal.', 'error');
        return;
    }

    const selectedRadio = document.querySelector('input[name="walletWithdrawType"]:checked');
    const paymentType = selectedRadio?.value;
    if (!paymentType) {
        showToast('Select a withdrawal method.', 'error');
        return;
    }

    try {
        const res = await apiRequest('/api/payment/withdraw', {
            method: 'POST',
            body: { amount, paymentType },
            requireAuth: true
        });

        const newBalance = Number(res.balance);
        if (Number.isFinite(newBalance)) {
            balance = newBalance;
            updateBalance();
        }

        const processingDays = res.estimatedDays || 3;
        const eta = new Date(Date.now() + processingDays * 86400000);
        const etaStr = eta.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        showToast(`Withdrawal of $${formatMoney(amount)} submitted. Expected by ${etaStr}.`, 'success', 6000);

        // Add to pending list
        if (res.withdrawal) {
            walletWithdrawalHistory.unshift(res.withdrawal);
        }
        renderWithdrawForm();
    } catch (err) {
        showToast(err.message || 'Withdrawal request failed.', 'error');
    }
}


async function cancelWithdrawal(id) {
    if (!confirm('Cancel this pending withdrawal?')) return;
    try {
        const res = await apiRequest(`/api/payment/withdraw/${id}/cancel`, {
            method: 'POST',
            requireAuth: true
        });

        const newBalance = Number(res.balance);
        if (Number.isFinite(newBalance)) {
            balance = newBalance;
            updateBalance();
        }

        walletWithdrawalHistory = walletWithdrawalHistory.filter(w => w.id !== id);
        showToast('Withdrawal cancelled.', 'success');
        renderWithdrawForm();
    } catch (err) {
        showToast(err.message || 'Failed to cancel withdrawal.', 'error');
    }
}


// ═══════════════════════════════════════════════════════
// TRANSACTION HISTORY
// ═══════════════════════════════════════════════════════

async function loadTransactionHistory(page) {
    walletHistoryPage = page || 1;
    try {
        const res = await apiRequest(`/api/user/transactions?page=${walletHistoryPage}&limit=20`, {
            requireAuth: true
        });
        const transactions = Array.isArray(res.transactions) ? res.transactions : [];
        const pagination = res.pagination || { page: walletHistoryPage, totalPages: 1 };
        walletHistoryTotalPages = pagination.totalPages || 1;
        renderTransactionHistory(transactions, pagination);
    } catch (err) {
        if (!err.isNetworkError) {
            console.warn('loadTransactionHistory:', err.message);
        }
        renderTransactionHistory([], { page: 1, totalPages: 1 });
    }
}


function renderTransactionHistory(transactions, pagination) {
    const container = document.getElementById('walletContent');
    if (!container) return;

    const rows = transactions.length > 0
        ? transactions.map(tx => {
            const isCredit = tx.type === 'deposit' || tx.type === 'bonus' || tx.type === 'refund';
            const sign = isCredit ? '+' : '-';
            const colorClass = isCredit ? 'wallet-tx--credit' : 'wallet-tx--debit';
            const typeLabel = walletTxTypeLabel(tx.type);
            const txIconMap = { deposit: '💰', withdrawal: '➡️', bet: '🎰', win: '🏆', bonus: '🎁', refund: '🔄', free_spin: '⚡' };
            const icon = txIconMap[tx.type] || '💳';
            return `
                <tr class="wallet-tx-row ${colorClass}">
                    <td class="wallet-tx-cell">
                        <span class="wallet-tx-type-badge wallet-tx-type-badge--${tx.type}"><span class="wallet-tx-icon">${icon}</span> ${typeLabel}</span>
                    </td>
                    <td class="wallet-tx-cell wallet-tx-cell--amount">${sign}$${formatMoney(Math.abs(tx.amount))}</td>
                    <td class="wallet-tx-cell wallet-tx-cell--date">${walletFormatDate(tx.created_at)}</td>
                    <td class="wallet-tx-cell wallet-tx-cell--ref">${escapeHtml(tx.reference || '--')}</td>
                </tr>`;
        }).join('')
        : `<tr><td class="wallet-tx-cell wallet-tx-empty" colspan="4">No transactions found.</td></tr>`;

    const paginationHtml = pagination.totalPages > 1
        ? `<div class="wallet-pagination">
                <button class="wallet-btn wallet-btn--sm wallet-btn--ghost"
                        onclick="loadTransactionHistory(${pagination.page - 1})"
                        ${pagination.page <= 1 ? 'disabled' : ''}>
                    &laquo; Prev
                </button>
                <span class="wallet-pagination__info">Page ${pagination.page} of ${pagination.totalPages}</span>
                <button class="wallet-btn wallet-btn--sm wallet-btn--ghost"
                        onclick="loadTransactionHistory(${pagination.page + 1})"
                        ${pagination.page >= pagination.totalPages ? 'disabled' : ''}>
                    Next &raquo;
                </button>
           </div>`
        : '';

    container.innerHTML = `
        <div class="wallet-section">
            <h3 class="wallet-section__title">Transaction History</h3>
            <div class="wallet-table-wrap">
                <table class="wallet-table">
                    <thead>
                        <tr>
                            <th class="wallet-th">Type</th>
                            <th class="wallet-th">Amount</th>
                            <th class="wallet-th">Date</th>
                            <th class="wallet-th">Reference</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
            ${paginationHtml}
        </div>`;
}


// ═══════════════════════════════════════════════════════
// ADD PAYMENT METHOD SUB-FORM
// ═══════════════════════════════════════════════════════

function showAddMethodForm(type) {
    walletAddMethodType = type;
    const formContainer = document.getElementById('walletAddMethodForm');
    if (!formContainer) return;

    let fieldsHtml = '';
    const meta = WALLET_PAYMENT_TYPES[type] || {};

    switch (type) {
        case 'visa':
        case 'mastercard':
            fieldsHtml = `
                <div class="wallet-field">
                    <label class="wallet-label">Name on Card</label>
                    <input type="text" id="walletMethodCardName" class="wallet-input" placeholder="John Doe" autocomplete="off">
                </div>
                <div class="wallet-field">
                    <label class="wallet-label">Card Number (last 4 digits)</label>
                    <input type="text" id="walletMethodCardLast4" class="wallet-input" maxlength="4"
                           placeholder="1234" pattern="[0-9]{4}" autocomplete="off">
                </div>`;
            break;

        case 'payid':
            fieldsHtml = `
                <div class="wallet-field">
                    <label class="wallet-label">PayID (email or phone)</label>
                    <input type="text" id="walletMethodPayId" class="wallet-input" placeholder="you@email.com or 04XX XXX XXX" autocomplete="off">
                </div>`;
            break;

        case 'bank_transfer':
            fieldsHtml = `
                <div class="wallet-field">
                    <label class="wallet-label">Account Name</label>
                    <input type="text" id="walletMethodBankName" class="wallet-input" placeholder="Account holder name" autocomplete="off">
                </div>
                <div class="wallet-field">
                    <label class="wallet-label">BSB</label>
                    <input type="text" id="walletMethodBSB" class="wallet-input" maxlength="7" placeholder="000-000" autocomplete="off">
                </div>
                <div class="wallet-field">
                    <label class="wallet-label">Account Number (last 4 digits)</label>
                    <input type="text" id="walletMethodBankLast4" class="wallet-input" maxlength="4"
                           placeholder="1234" pattern="[0-9]{4}" autocomplete="off">
                </div>`;
            break;

        case 'btc':
        case 'eth':
        case 'usdt':
            fieldsHtml = `
                <div class="wallet-field">
                    <label class="wallet-label">Wallet Address</label>
                    <input type="text" id="walletMethodCryptoAddr" class="wallet-input wallet-input--mono"
                           placeholder="${type === 'btc' ? 'bc1q...' : '0x...'}" autocomplete="off">
                </div>
                <div class="wallet-field">
                    <label class="wallet-label">Network</label>
                    <select id="walletMethodCryptoNetwork" class="wallet-select">
                        ${walletCryptoNetworkOptions(type)}
                    </select>
                </div>`;
            break;

        default:
            fieldsHtml = '<p class="wallet-text--muted">Unsupported payment type.</p>';
    }

    formContainer.innerHTML = `
        <div class="wallet-add-form">
            <div class="wallet-add-form__header">
                <span class="wallet-add-form__title">${meta.icon || ''} Add ${meta.label || type}</span>
                <button class="wallet-btn wallet-btn--sm wallet-btn--ghost" onclick="hideAddMethodForm()">&times;</button>
            </div>
            <div class="wallet-add-form__body">
                ${fieldsHtml}
            </div>
            <div class="wallet-add-form__footer">
                <button class="wallet-btn wallet-btn--primary" onclick="walletSubmitNewMethod('${type}')">Save Method</button>
                <button class="wallet-btn wallet-btn--ghost" onclick="hideAddMethodForm()">Cancel</button>
            </div>
        </div>`;
}


function hideAddMethodForm() {
    walletAddMethodType = null;
    const formContainer = document.getElementById('walletAddMethodForm');
    if (formContainer) formContainer.innerHTML = '';
}


function walletSubmitNewMethod(type) {
    let label = '';
    let details = {};

    switch (type) {
        case 'visa':
        case 'mastercard': {
            const name = document.getElementById('walletMethodCardName')?.value.trim();
            const last4 = document.getElementById('walletMethodCardLast4')?.value.trim();
            if (!name || !last4 || last4.length !== 4 || !/^\d{4}$/.test(last4)) {
                showToast('Please enter a valid name and last 4 card digits.', 'error');
                return;
            }
            label = `${name} ****${last4}`;
            details = { name_on_card: name, last4 };
            break;
        }

        case 'payid': {
            const payid = document.getElementById('walletMethodPayId')?.value.trim();
            if (!payid) {
                showToast('Please enter your PayID.', 'error');
                return;
            }
            label = payid;
            details = { payid };
            break;
        }

        case 'bank_transfer': {
            const accountName = document.getElementById('walletMethodBankName')?.value.trim();
            const bsb = document.getElementById('walletMethodBSB')?.value.trim();
            const last4 = document.getElementById('walletMethodBankLast4')?.value.trim();
            if (!accountName || !bsb || !last4 || last4.length !== 4 || !/^\d{4}$/.test(last4)) {
                showToast('Please fill all bank transfer fields correctly.', 'error');
                return;
            }
            label = `${accountName} (****${last4})`;
            details = { account_name: accountName, bsb, last4 };
            break;
        }

        case 'btc':
        case 'eth':
        case 'usdt': {
            const addr = document.getElementById('walletMethodCryptoAddr')?.value.trim();
            const network = document.getElementById('walletMethodCryptoNetwork')?.value;
            if (!addr) {
                showToast('Please enter a wallet address.', 'error');
                return;
            }
            // Show truncated address as label
            label = addr.length > 12 ? addr.slice(0, 6) + '...' + addr.slice(-4) : addr;
            details = { address: addr, network };
            break;
        }

        default:
            showToast('Unknown payment type.', 'error');
            return;
    }

    addPaymentMethod(type, label, details);
}


// ═══════════════════════════════════════════════════════
// METAMASK / CRYPTO DEPOSIT FLOW
// ═══════════════════════════════════════════════════════

/**
 * Show/hide MetaMask deposit section based on selected payment type.
 * For ETH: shows MetaMask UI + backend-wired manual tx-hash deposit fallback.
 */
function walletUpdateCryptoSection(payType) {
    const section = document.getElementById('cryptoDepositSection');
    if (!section) return;

    const isCrypto = payType === 'eth' || payType === 'btc' || payType === 'usdt';
    section.style.display = isCrypto ? 'block' : 'none';

    if (isCrypto && payType === 'eth') {
        walletRenderMetaMaskSection(section);
        // Also append the backend-wired manual deposit section
        walletRenderCryptoApiSection(section);
    } else if (isCrypto) {
        section.innerHTML = `
            <div style="padding:16px;border:1px solid rgba(255,255,255,0.1);border-radius:10px;background:rgba(255,255,255,0.03);margin-bottom:12px;text-align:center;">
                <div style="font-size:0.9rem;color:#94a3b8;">
                    ${payType === 'btc' ? '&#x20BF; Bitcoin' : '&#x20AE; Tether'} deposits &#8212; use the standard deposit button below.
                    <br><span style="color:#627eea;font-weight:600;">For instant MetaMask deposits, select Ethereum.</span>
                </div>
            </div>`;
    }
}

/**
 * Render the MetaMask connect + deposit UI.
 */
async function walletRenderMetaMaskSection(container) {
    // Check if ethers.js is available
    if (typeof cryptoIsEthersLoaded === 'undefined' || !cryptoIsEthersLoaded()) {
        container.innerHTML = `
            <div style="padding:16px;border:1px solid rgba(255,100,100,0.3);border-radius:10px;background:rgba(255,50,50,0.08);margin-bottom:12px;text-align:center;">
                <div style="font-size:0.85rem;color:#f87171;">Ethereum library not loaded. Please refresh the page.</div>
            </div>`;
        return;
    }

    // Load crypto config
    const configOk = await cryptoLoadConfig();
    if (!configOk) {
        container.innerHTML = `
            <div style="padding:16px;border:1px solid rgba(255,255,255,0.1);border-radius:10px;background:rgba(255,255,255,0.03);margin-bottom:12px;text-align:center;">
                <div style="font-size:0.85rem;color:#94a3b8;">Crypto deposits are not available right now.</div>
            </div>`;
        return;
    }

    // Fetch rate
    await cryptoFetchRate();

    if (cryptoConnectedAddress) {
        // Already connected — show deposit UI
        const ethBal = await cryptoGetBalance();
        const amountInput = document.getElementById('walletDepositAmount');
        const audAmount = parseFloat(amountInput?.value) || 50;
        const ethEquiv = cryptoAudToEth(audAmount);

        container.innerHTML = `
            <div style="padding:16px;border:1px solid rgba(98,126,234,0.4);border-radius:12px;background:linear-gradient(135deg,rgba(98,126,234,0.1),rgba(98,126,234,0.03));margin-bottom:12px;">
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
                    <div style="width:32px;height:32px;background:#627eea;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:1.1rem;font-weight:bold;color:white;">Ξ</div>
                    <div>
                        <div style="font-size:0.85rem;font-weight:700;color:#fff;">MetaMask Connected</div>
                        <div style="font-size:0.7rem;color:#94a3b8;font-family:monospace;">${cryptoConnectedAddress.slice(0, 6)}...${cryptoConnectedAddress.slice(-4)}</div>
                    </div>
                    <div style="margin-left:auto;text-align:right;">
                        <div style="font-size:0.7rem;color:#94a3b8;">Balance</div>
                        <div style="font-size:0.85rem;font-weight:600;color:#fff;">${parseFloat(ethBal).toFixed(4)} ETH</div>
                    </div>
                </div>
                <div style="background:rgba(0,0,0,0.2);border-radius:8px;padding:10px 14px;margin-bottom:12px;">
                    <div style="display:flex;justify-content:space-between;font-size:0.8rem;margin-bottom:4px;">
                        <span style="color:#94a3b8;">You pay</span>
                        <span style="color:#94a3b8;">1 ETH = $${cryptoEthRate.toLocaleString()} AUD</span>
                    </div>
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                        <span style="font-size:1.2rem;font-weight:700;color:#627eea;" id="cryptoEthAmount">${ethEquiv.toFixed(6)} ETH</span>
                        <span style="font-size:1rem;color:#fff;">→ $<span id="cryptoAudAmount">${audAmount.toFixed(2)}</span> AUD</span>
                    </div>
                </div>
                <button class="wallet-btn wallet-btn--primary wallet-btn--lg" onclick="walletCryptoDeposit()" style="background:linear-gradient(135deg,#627eea,#8b5cf6);width:100%;">
                    <span style="font-size:1.1rem;">Ξ</span> Pay with MetaMask
                </button>
                <div id="cryptoTxStatus" style="margin-top:10px;display:none;"></div>
            </div>`;

        // Update ETH amount when deposit amount changes
        const depInput = document.getElementById('walletDepositAmount');
        if (depInput) {
            depInput.addEventListener('input', function () {
                const aud = parseFloat(this.value) || 0;
                const eth = cryptoAudToEth(aud);
                const ethEl = document.getElementById('cryptoEthAmount');
                const audEl = document.getElementById('cryptoAudAmount');
                if (ethEl) ethEl.textContent = eth.toFixed(6) + ' ETH';
                if (audEl) audEl.textContent = aud.toFixed(2);
            });
        }
    } else {
        // Not connected — show connect button
        container.innerHTML = `
            <div style="padding:16px;border:1px solid rgba(98,126,234,0.4);border-radius:12px;background:linear-gradient(135deg,rgba(98,126,234,0.1),rgba(98,126,234,0.03));margin-bottom:12px;text-align:center;">
                <div style="font-size:1.5rem;margin-bottom:8px;">🦊</div>
                <div style="font-size:0.9rem;font-weight:700;color:#fff;margin-bottom:4px;">Instant ETH Deposits</div>
                <div style="font-size:0.78rem;color:#94a3b8;margin-bottom:14px;">
                    Connect your MetaMask wallet to deposit ETH instantly.<br>
                    Funds are credited at the current ETH/AUD rate after ${cryptoMinConfirmations} confirmations.
                </div>
                <button class="wallet-btn wallet-btn--primary" onclick="walletConnectMetaMask()" style="background:linear-gradient(135deg,#f6851b,#e2761b);border:none;padding:10px 24px;font-size:0.9rem;">
                    🦊 Connect MetaMask
                </button>
                ${!cryptoIsMetaMaskInstalled() ? '<div style="font-size:0.72rem;color:#f87171;margin-top:8px;">MetaMask not detected. <a href="https://metamask.io/download/" target="_blank" style="color:#627eea;">Install it here</a>.</div>' : ''}
            </div>`;
    }
}

/**
 * Connect MetaMask and refresh the deposit section.
 */
async function walletConnectMetaMask() {
    const addr = await cryptoConnectWallet();
    if (addr) {
        showToast('MetaMask connected: ' + addr.slice(0, 6) + '...' + addr.slice(-4), 'success');
        const section = document.getElementById('cryptoDepositSection');
        if (section) {
            walletRenderMetaMaskSection(section);
        }
    }
}

/**
 * Execute a MetaMask deposit: send ETH → verify on server → credit balance.
 */
async function walletCryptoDeposit() {
    const amountInput = document.getElementById('walletDepositAmount');
    const audAmount = parseFloat(amountInput?.value);
    if (!Number.isFinite(audAmount) || audAmount <= 0) {
        showToast('Enter a valid deposit amount.', 'error');
        return;
    }

    if (audAmount < cryptoMinDeposit) {
        showToast('Minimum deposit is $' + cryptoMinDeposit.toFixed(2), 'error');
        return;
    }
    if (audAmount > cryptoMaxDeposit) {
        showToast('Maximum deposit is $' + cryptoMaxDeposit.toFixed(2), 'error');
        return;
    }

    const statusEl = document.getElementById('cryptoTxStatus');
    if (statusEl) {
        statusEl.style.display = 'block';
        statusEl.innerHTML = '<div style="text-align:center;color:#fbbf24;font-size:0.85rem;">⏳ Waiting for MetaMask approval...</div>';
    }

    // Send ETH
    const txHash = await cryptoSendDeposit(audAmount);
    if (!txHash) {
        if (statusEl) statusEl.style.display = 'none';
        return;
    }

    // Show pending state
    if (statusEl) {
        statusEl.innerHTML = `
            <div style="text-align:center;padding:10px;">
                <div style="color:#10b981;font-size:0.85rem;font-weight:600;margin-bottom:6px;">✅ Transaction Sent!</div>
                <div style="font-size:0.72rem;color:#94a3b8;font-family:monospace;word-break:break-all;margin-bottom:8px;">${txHash}</div>
                <div style="color:#fbbf24;font-size:0.85rem;" id="cryptoConfirmStatus">⏳ Waiting for confirmations (0/${cryptoMinConfirmations})...</div>
            </div>`;
    }

    // Poll for confirmation
    const result = await cryptoPollDeposit(txHash, function (progress) {
        const confirmEl = document.getElementById('cryptoConfirmStatus');
        if (!confirmEl) return;

        if (progress.status === 'completed') {
            confirmEl.innerHTML = '<span style="color:#10b981;font-weight:700;">✅ Deposit Confirmed!</span>';
        } else if (progress.status === 'confirming') {
            confirmEl.innerHTML = '⏳ Confirming: ' + progress.confirmations + '/' + progress.required + ' blocks...';
        } else {
            confirmEl.innerHTML = '⏳ Checking transaction... (attempt ' + progress.attempt + ')';
        }
    });

    if (result && result.balance !== undefined) {
        // Update balance
        balance = Number(result.balance);
        updateBalance();
        resetNudgeOnDeposit();
        try { localStorage.setItem('hasEverDeposited', '1'); } catch (e) { /* ignore */ }

        const gemMsg = result.gemsAwarded ? ' + 💎 ' + result.gemsAwarded + ' gems!' : '';
        showToast('$' + result.deposit.amount.toFixed(2) + ' AUD deposited via ETH!' + gemMsg, 'success', 6000);

        // Refresh deposit form after a short delay
        setTimeout(function () { renderDepositForm(); }, 2000);
    } else {
        showToast('Deposit verification timed out. Your funds are safe — check back in a few minutes.', 'error', 8000);
    }
}


// ═══════════════════════════════════════════════════════
// BACKEND-WIRED CRYPTO DEPOSIT (manual tx hash submission)
// ═══════════════════════════════════════════════════════

/**
 * Render a backend-wired manual ETH deposit section below the MetaMask UI.
 * Uses GET /api/crypto/rate and GET /api/crypto/config (no auth required),
 * then POST /api/crypto/verify-deposit (auth required) with just { txHash }.
 */
async function walletRenderCryptoApiSection(parentContainer) {
    // Remove any previous manual section to avoid duplicates
    var prev = document.getElementById('cryptoManualDepositWrap');
    if (prev) prev.parentNode.removeChild(prev);

    // Fetch config (wallet address) and rate in parallel
    var configData, rateData;
    try {
        var responses = await Promise.all([
            fetch('/api/crypto/config'),
            fetch('/api/crypto/rate')
        ]);
        if (!responses[0].ok) return; // Crypto not configured — hide silently
        configData = await responses[0].json();
        rateData = responses[1].ok ? await responses[1].json() : null;
    } catch (e) {
        return; // Network error — hide silently
    }

    var walletAddr = (configData && configData.walletAddress) || '';
    if (!walletAddr) return; // No wallet configured — hide section

    var ethRate = (rateData && rateData.eth_aud) ? Number(rateData.eth_aud) : null;

    // Build the section using createElement / textContent only
    var wrap = document.createElement('div');
    wrap.id = 'cryptoManualDepositWrap';
    wrap.style.cssText = 'padding:16px;border:1px solid rgba(98,126,234,0.35);border-radius:12px;background:linear-gradient(135deg,rgba(98,126,234,0.08),rgba(98,126,234,0.02));margin-top:12px;';

    var heading = document.createElement('div');
    heading.style.cssText = 'font-size:0.82rem;font-weight:700;color:#c4b5fd;margin-bottom:10px;letter-spacing:0.04em;text-transform:uppercase;';
    heading.textContent = 'Manual ETH Deposit';
    wrap.appendChild(heading);

    // Rate display
    if (ethRate) {
        var rateRow = document.createElement('div');
        rateRow.style.cssText = 'font-size:0.78rem;color:#94a3b8;margin-bottom:10px;';
        var rateLabel = document.createTextNode('Current rate: 1 ETH = $');
        var rateVal = document.createElement('strong');
        rateVal.style.color = '#a5b4fc';
        rateVal.textContent = ethRate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' AUD';
        rateRow.appendChild(rateLabel);
        rateRow.appendChild(rateVal);
        wrap.appendChild(rateRow);
    }

    // Wallet address label
    var addrLabel = document.createElement('div');
    addrLabel.style.cssText = 'font-size:0.75rem;color:#94a3b8;margin-bottom:4px;';
    addrLabel.textContent = 'Send ETH to this address:';
    wrap.appendChild(addrLabel);

    // Address display + copy button row
    var addrRow = document.createElement('div');
    addrRow.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:12px;';

    var addrEl = document.createElement('span');
    addrEl.style.cssText = 'font-family:monospace;font-size:0.75rem;color:#e2e8f0;background:rgba(0,0,0,0.25);padding:6px 10px;border-radius:6px;flex:1;word-break:break-all;';
    addrEl.textContent = walletAddr;
    addrRow.appendChild(addrEl);

    var copyBtn = document.createElement('button');
    copyBtn.className = 'wallet-btn';
    copyBtn.style.cssText = 'font-size:0.72rem;padding:6px 10px;flex-shrink:0;white-space:nowrap;';
    copyBtn.textContent = 'Copy';
    copyBtn.addEventListener('click', function () {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(walletAddr).then(function () {
                copyBtn.textContent = 'Copied!';
                setTimeout(function () { copyBtn.textContent = 'Copy'; }, 1500);
            }).catch(function () {
                copyBtn.textContent = 'Error';
            });
        } else {
            // Fallback for older browsers
            var tmp = document.createElement('textarea');
            tmp.value = walletAddr;
            tmp.style.position = 'fixed';
            tmp.style.opacity = '0';
            document.body.appendChild(tmp);
            tmp.select();
            document.execCommand('copy');
            document.body.removeChild(tmp);
            copyBtn.textContent = 'Copied!';
            setTimeout(function () { copyBtn.textContent = 'Copy'; }, 1500);
        }
    });
    addrRow.appendChild(copyBtn);
    wrap.appendChild(addrRow);

    // Tx hash input
    var txLabel = document.createElement('label');
    txLabel.style.cssText = 'font-size:0.75rem;color:#94a3b8;display:block;margin-bottom:4px;';
    txLabel.textContent = 'Transaction hash (0x...):';
    wrap.appendChild(txLabel);

    var txInput = document.createElement('input');
    txInput.type = 'text';
    txInput.id = 'cryptoManualTxHash';
    txInput.placeholder = '0x...';
    txInput.className = 'wallet-input';
    txInput.style.cssText = 'font-family:monospace;font-size:0.75rem;margin-bottom:10px;width:100%;box-sizing:border-box;';
    wrap.appendChild(txInput);

    // AUD amount input (display-only reference, server derives from on-chain value)
    var audLabel = document.createElement('label');
    audLabel.style.cssText = 'font-size:0.75rem;color:#94a3b8;display:block;margin-bottom:4px;';
    audLabel.textContent = 'Expected amount (AUD, for your reference):';
    wrap.appendChild(audLabel);

    var audInput = document.createElement('input');
    audInput.type = 'number';
    audInput.id = 'cryptoManualAudAmount';
    audInput.placeholder = '50.00';
    audInput.min = '0';
    audInput.step = '0.01';
    audInput.className = 'wallet-input';
    audInput.style.cssText = 'margin-bottom:12px;width:100%;box-sizing:border-box;';
    // Pre-fill from main deposit amount input
    var mainAmtEl = document.getElementById('walletDepositAmount');
    if (mainAmtEl && mainAmtEl.value) audInput.value = mainAmtEl.value;
    wrap.appendChild(audInput);

    // Submit button
    var submitBtn = document.createElement('button');
    submitBtn.className = 'wallet-btn wallet-btn--primary';
    submitBtn.style.cssText = 'width:100%;font-size:0.85rem;';
    submitBtn.textContent = 'Verify ETH Deposit';
    wrap.appendChild(submitBtn);

    // Result message element
    var resultEl = document.createElement('div');
    resultEl.id = 'cryptoManualResult';
    resultEl.style.cssText = 'margin-top:10px;font-size:0.8rem;display:none;padding:8px 12px;border-radius:8px;';
    wrap.appendChild(resultEl);

    submitBtn.addEventListener('click', function () {
        walletCryptoManualVerify(txInput, resultEl, submitBtn);
    });

    parentContainer.appendChild(wrap);
}

/**
 * Submit a manual ETH tx hash to /api/crypto/verify-deposit and credit balance.
 */
async function walletCryptoManualVerify(txInput, resultEl, submitBtn) {
    // Auth check
    if (typeof isServerAuthToken !== 'function' || !isServerAuthToken()) {
        resultEl.style.display = 'block';
        resultEl.style.background = 'rgba(239,68,68,0.15)';
        resultEl.style.border = '1px solid rgba(239,68,68,0.35)';
        resultEl.textContent = 'You must be logged in to verify a deposit.';
        return;
    }
    var tokenKey = (typeof STORAGE_KEY_TOKEN !== 'undefined') ? STORAGE_KEY_TOKEN : 'casinoToken';
    var token = localStorage.getItem(tokenKey);
    if (!token) {
        resultEl.style.display = 'block';
        resultEl.style.background = 'rgba(239,68,68,0.15)';
        resultEl.style.border = '1px solid rgba(239,68,68,0.35)';
        resultEl.textContent = 'Session token missing. Please log in again.';
        return;
    }

    var txHash = txInput.value.trim();
    if (!txHash || !/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
        resultEl.style.display = 'block';
        resultEl.style.background = 'rgba(239,68,68,0.15)';
        resultEl.style.border = '1px solid rgba(239,68,68,0.35)';
        resultEl.textContent = 'Please enter a valid Ethereum transaction hash (0x followed by 64 hex characters).';
        return;
    }

    // Disable button while processing
    submitBtn.disabled = true;
    var origText = submitBtn.textContent;
    submitBtn.textContent = 'Verifying...';
    resultEl.style.display = 'block';
    resultEl.style.background = 'rgba(251,191,36,0.1)';
    resultEl.style.border = '1px solid rgba(251,191,36,0.3)';
    resultEl.textContent = 'Checking transaction on-chain. This may take a moment...';

    try {
        var resp = await fetch('/api/crypto/verify-deposit', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({ txHash: txHash })
        });
        var data = await resp.json();

        if (resp.ok && data.balance !== undefined) {
            // Success
            resultEl.style.background = 'rgba(16,185,129,0.12)';
            resultEl.style.border = '1px solid rgba(16,185,129,0.35)';
            var msg = data.message || 'Deposit confirmed!';
            if (data.gemsAwarded) msg += ' +' + data.gemsAwarded + ' gems awarded.';
            resultEl.textContent = msg;

            // Update balance
            if (typeof updateBalanceDisplay === 'function') {
                updateBalanceDisplay(data.balance);
            } else if (typeof updateBalance === 'function') {
                balance = Number(data.balance);
                updateBalance();
            }

            // Clear inputs
            txInput.value = '';
            submitBtn.textContent = 'Verified!';
        } else if (resp.status === 202) {
            // Pending / confirming
            resultEl.style.background = 'rgba(251,191,36,0.1)';
            resultEl.style.border = '1px solid rgba(251,191,36,0.3)';
            var pendingMsg = data.message || 'Transaction is still confirming. Please wait and try again.';
            if (data.confirmations !== undefined && data.required !== undefined) {
                pendingMsg += ' (' + data.confirmations + '/' + data.required + ' confirmations)';
            }
            resultEl.textContent = pendingMsg;
            submitBtn.disabled = false;
            submitBtn.textContent = origText;
        } else {
            // Error
            resultEl.style.background = 'rgba(239,68,68,0.15)';
            resultEl.style.border = '1px solid rgba(239,68,68,0.35)';
            resultEl.textContent = data.error || 'Verification failed. Please try again.';
            submitBtn.disabled = false;
            submitBtn.textContent = origText;
        }
    } catch (err) {
        resultEl.style.background = 'rgba(239,68,68,0.15)';
        resultEl.style.border = '1px solid rgba(239,68,68,0.35)';
        resultEl.textContent = 'Network error. Please check your connection and try again.';
        submitBtn.disabled = false;
        submitBtn.textContent = origText;
    }
}

// ═══════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════

function walletCryptoNetworkOptions(type) {
    const networks = {
        btc: [
            { value: 'bitcoin', label: 'Bitcoin (BTC)' },
            { value: 'lightning', label: 'Lightning Network' }
        ],
        eth: [
            { value: 'erc20', label: 'Ethereum (ERC-20)' },
            { value: 'arbitrum', label: 'Arbitrum' },
            { value: 'optimism', label: 'Optimism' }
        ],
        usdt: [
            { value: 'erc20', label: 'Ethereum (ERC-20)' },
            { value: 'trc20', label: 'Tron (TRC-20)' },
            { value: 'bep20', label: 'BSC (BEP-20)' }
        ]
    };
    return (networks[type] || []).map(n =>
        `<option value="${n.value}">${n.label}</option>`
    ).join('');
}


function walletFormatDate(dateStr) {
    if (!dateStr) return '--';
    try {
        const d = new Date(dateStr);
        return d.toLocaleDateString(undefined, {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    } catch {
        return dateStr;
    }
}


function walletTxTypeLabel(type) {
    const labels = {
        deposit: 'Deposit',
        withdrawal: 'Withdrawal',
        bonus: 'Bonus',
        refund: 'Refund',
        win: 'Win',
        wager: 'Wager'
    };
    return labels[type] || type.charAt(0).toUpperCase() + type.slice(1);
}


function escapeHtml(str) {
    if (typeof str !== 'string') return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}


// ── Low Balance Nudge ─────────────────────────────────────────

let _nudgeShownThisSession = false;
let _nudgeTimer = null;

function checkLowBalance() {
    // Only show once per session, only when playing, only for logged-in users
    if (_nudgeShownThisSession) return;
    if (!currentUser) return;
    if (typeof balance === 'undefined' || balance >= 20) return;
    if (balance <= 0) return; // broke — different message not implemented yet

    // Don't show if wallet is already open
    const walletModal = document.getElementById('walletModal');
    if (walletModal && walletModal.classList.contains('active')) return;

    // Delay slightly so it doesn't interrupt spin animation
    clearTimeout(_nudgeTimer);
    _nudgeTimer = setTimeout(() => {
        const nudge = document.getElementById('lowBalanceNudge');
        if (nudge) {
            _nudgeShownThisSession = true;
            nudge.classList.add('nudge--visible');
            // Auto-hide after 12 seconds
            setTimeout(() => hideLowBalanceNudge(), 12000);
        }
    }, 1500);
}

function hideLowBalanceNudge() {
    clearTimeout(_nudgeTimer);
    const nudge = document.getElementById('lowBalanceNudge');
    if (nudge) nudge.classList.remove('nudge--visible');
}

// Reset nudge flag when balance increases (new deposit)
function resetNudgeOnDeposit() {
    _nudgeShownThisSession = false;
}


// ═══════════════════════════════════════════════════════
// LOYALTY POINTS CARD SECTION
// ═══════════════════════════════════════════════════════

/**
 * Renders (or re-renders) the full Loyalty Points card into a persistent
 * slot inside the wallet modal, between the tab bar and walletContent.
 * The card is injected once and updated in-place on subsequent calls,
 * so tab switching does not destroy it.
 *
 * Fetches live status from /api/loyaltyshop/status and builds a card
 * showing the current balance, conversion rate, lifetime total, and
 * preset redemption buttons (100 / 500 / 1000 pts).
 *
 * Uses createElement/textContent throughout — no dynamic innerHTML
 * concatenation — to satisfy the security hook rules.
 *
 * @param {HTMLElement} modal  The #walletModal element (or any ancestor
 *                             that contains .wallet-modal).
 */
function _renderLoyaltySection(modal) {
    if (!modal) return;

    var token = localStorage.getItem(typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken');
    if (!token) return;

    // Find (or create) the persistent wrapper div that sits between the
    // .wallet-tabs bar and #walletContent.
    var walletInner = modal.querySelector('.wallet-modal');
    if (!walletInner) walletInner = modal;

    var wrapper = walletInner.querySelector('#walletLoyaltyCardWrapper');
    if (!wrapper) {
        wrapper = document.createElement('div');
        wrapper.id = 'walletLoyaltyCardWrapper';
        wrapper.style.cssText = 'padding:0 16px 0 16px;';
        // Insert between .wallet-tabs and #walletContent
        var walletContentEl = walletInner.querySelector('#walletContent');
        if (walletContentEl) {
            walletInner.insertBefore(wrapper, walletContentEl);
        } else {
            walletInner.appendChild(wrapper);
        }
    }

    // Remove any existing card inside the wrapper (full re-render)
    var existing = wrapper.querySelector('#walletLoyaltyCard');
    if (existing) existing.remove();

    // ── Build the card shell (shows "Loading…" state initially) ──
    var card = document.createElement('div');
    card.id = 'walletLoyaltyCard';
    card.style.cssText = [
        'background:linear-gradient(135deg,rgba(52,211,153,0.10),rgba(16,185,129,0.05))',
        'border:1.5px solid rgba(52,211,153,0.28)',
        'border-radius:14px',
        'padding:16px 18px',
        'margin:12px 0'
    ].join(';');

    // Title row
    var titleRow = document.createElement('div');
    titleRow.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;';

    var title = document.createElement('span');
    title.style.cssText = 'font-size:1rem;font-weight:800;color:#34d399;letter-spacing:0.3px;';
    title.textContent = '\u2B50 Loyalty Points';

    var rateNote = document.createElement('span');
    rateNote.style.cssText = 'font-size:0.72rem;color:#6ee7b7;opacity:0.8;';
    rateNote.textContent = '100 pts = $1.00';

    titleRow.appendChild(title);
    titleRow.appendChild(rateNote);

    // Points balance display
    var balRow = document.createElement('div');
    balRow.style.cssText = 'display:flex;align-items:baseline;gap:8px;margin-bottom:8px;';

    var pointsDisplay = document.createElement('span');
    pointsDisplay.id = 'loyaltyCardPoints';
    pointsDisplay.style.cssText = 'font-size:2rem;font-weight:900;color:#a7f3d0;line-height:1;';
    pointsDisplay.textContent = '...';

    var pointsLabel = document.createElement('span');
    pointsLabel.style.cssText = 'font-size:0.78rem;color:#6ee7b7;font-weight:600;';
    pointsLabel.textContent = 'points';

    balRow.appendChild(pointsDisplay);
    balRow.appendChild(pointsLabel);

    // Lifetime row
    var lifetimeRow = document.createElement('div');
    lifetimeRow.style.cssText = 'font-size:0.72rem;color:#6ee7b7;opacity:0.65;margin-bottom:14px;';
    var lifetimeLabel = document.createElement('span');
    lifetimeLabel.textContent = 'Lifetime total: ';
    var lifetimeValue = document.createElement('span');
    lifetimeValue.id = 'loyaltyCardLifetime';
    lifetimeValue.textContent = '...';
    lifetimeRow.appendChild(lifetimeLabel);
    lifetimeRow.appendChild(lifetimeValue);

    // Redemption buttons row
    var btnRow = document.createElement('div');
    btnRow.id = 'loyaltyCardBtnRow';
    btnRow.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;';

    var PRESETS = [
        { pts: 100,  label: 'Redeem 100 pts \u2192 $1' },
        { pts: 500,  label: 'Redeem 500 pts \u2192 $5' },
        { pts: 1000, label: 'Redeem 1000 pts \u2192 $10' }
    ];

    PRESETS.forEach(function(preset) {
        var btn = document.createElement('button');
        btn.dataset.loyaltyPts = preset.pts;
        btn.textContent = preset.label;
        btn.style.cssText = [
            'flex:1 1 auto',
            'min-width:130px',
            'padding:7px 10px',
            'border:none',
            'border-radius:8px',
            'font-size:0.74rem',
            'font-weight:700',
            'cursor:not-allowed',
            'background:linear-gradient(135deg,#34d399,#059669)',
            'color:#fff',
            'letter-spacing:0.2px',
            'opacity:0.4',
            'transition:opacity 0.2s'
        ].join(';');
        btn.disabled = true; // enabled once we know the live balance
        btn.addEventListener('click', function() {
            window.redeemLoyaltyPoints(preset.pts);
        });
        btnRow.appendChild(btn);
    });

    // Assemble card
    card.appendChild(titleRow);
    card.appendChild(balRow);
    card.appendChild(lifetimeRow);
    card.appendChild(btnRow);
    wrapper.appendChild(card);

    // ── Fetch live status and populate ──
    fetch('/api/loyaltyshop/status', {
        headers: { Authorization: 'Bearer ' + token }
    })
    .then(function(r) { return r.ok ? r.json() : null; })
    .then(function(data) {
        if (!data) return;
        var pts = parseInt(data.points, 10) || 0;
        var lifetime = parseInt(data.lifetimePoints, 10) || 0;

        var pdEl = document.getElementById('loyaltyCardPoints');
        if (pdEl) pdEl.textContent = pts.toLocaleString();

        var ltEl = document.getElementById('loyaltyCardLifetime');
        if (ltEl) ltEl.textContent = lifetime.toLocaleString() + ' pts earned';

        // Enable/disable preset buttons based on current balance
        var btnRowEl = document.getElementById('loyaltyCardBtnRow');
        if (btnRowEl) {
            btnRowEl.querySelectorAll('button').forEach(function(btn) {
                var required = parseInt(btn.dataset.loyaltyPts, 10);
                var canAfford = pts >= required;
                btn.disabled = !canAfford;
                btn.style.opacity = canAfford ? '1' : '0.4';
                btn.style.cursor = canAfford ? 'pointer' : 'not-allowed';
            });
        }

        // Also keep the compact header bar in sync
        var headerEl = document.getElementById('walletLoyaltyPoints');
        if (headerEl) headerEl.textContent = pts.toLocaleString();
        var headerBtn = document.getElementById('walletLoyaltyRedeemBtn');
        if (headerBtn) headerBtn.disabled = pts < 100;
    })
    .catch(function() {
        var pdEl = document.getElementById('loyaltyCardPoints');
        if (pdEl) pdEl.textContent = '\u2014';
    });
}


/**
 * Globally accessible loyalty redemption function.
 * Redeems exactly `points` loyalty points (must be a multiple of 100,
 * minimum 100) and credits the equivalent cash to the player's balance.
 *
 * @param {number} points  Number of points to redeem.
 */
window.redeemLoyaltyPoints = function(points) {
    points = parseInt(points, 10) || 0;
    if (points < 100 || points % 100 !== 0) {
        if (typeof showToast === 'function') {
            showToast('Minimum redemption is 100 pts (multiples of 100 only).', 'info', 3000);
        }
        return;
    }

    var creditAmt = (points / 100).toFixed(2);
    if (!confirm('Redeem ' + points.toLocaleString() + ' loyalty pts for $' + creditAmt + '?')) return;

    var token = localStorage.getItem(typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken');
    if (!token) {
        if (typeof showToast === 'function') showToast('Please log in to redeem points.', 'error', 3000);
        return;
    }

    // Disable all preset buttons while the request is in-flight
    var btnRowEl = document.getElementById('loyaltyCardBtnRow');
    if (btnRowEl) {
        btnRowEl.querySelectorAll('button').forEach(function(btn) {
            btn.disabled = true;
            btn.style.opacity = '0.5';
        });
    }

    fetch('/api/loyaltyshop/redeem', {
        method: 'POST',
        headers: {
            Authorization: 'Bearer ' + token,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ points: points })
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
        if (data.success) {
            // Update global balance
            if (typeof data.newBalance !== 'undefined') {
                balance = parseFloat(data.newBalance);
                if (typeof updateBalance === 'function') updateBalance();
                if (typeof saveBalance === 'function') saveBalance();
                // Sync the wallet header balance display
                var walletBal = document.getElementById('walletBalance');
                if (walletBal) walletBal.textContent = formatMoney(balance);
            }

            if (typeof showToast === 'function') {
                showToast(
                    '\uD83C\uDFAF Redeemed ' + points.toLocaleString() + ' pts \u2192 $' + creditAmt + ' credited!',
                    'win',
                    4000
                );
            }

            // Refresh the loyalty card to show updated balance
            var walletModal = document.getElementById('walletModal');
            if (walletModal) _renderLoyaltySection(walletModal);

            // Also refresh the compact header bar
            if (typeof refreshLoyaltyBalance === 'function') refreshLoyaltyBalance();
        } else {
            if (typeof showToast === 'function') {
                showToast(data.error || 'Redemption failed — please try again.', 'error', 3500);
            }
            // Re-enable buttons on failure
            var innerBtnRow = document.getElementById('loyaltyCardBtnRow');
            if (innerBtnRow) {
                innerBtnRow.querySelectorAll('button').forEach(function(btn) {
                    btn.disabled = false;
                    btn.style.opacity = '1';
                });
            }
        }
    })
    .catch(function() {
        if (typeof showToast === 'function') {
            showToast('Redemption failed \u2014 please try again.', 'error', 3000);
        }
        var innerBtnRow = document.getElementById('loyaltyCardBtnRow');
        if (innerBtnRow) {
            innerBtnRow.querySelectorAll('button').forEach(function(btn) {
                btn.disabled = false;
                btn.style.opacity = '1';
            });
        }
    });
};

// ── Rakeback Section ─────────────────────────────────────────────────────────
// ── Deposit Match CSS (injected once) ────────────────────────────────────────
(function _injectDepositMatchCSS() {
    if (document.getElementById('walletDepositMatchCSS')) return;
    var s = document.createElement('style');
    s.id = 'walletDepositMatchCSS';
    s.textContent = '.wallet-deposit-match-card{background:linear-gradient(135deg,#0a1f0a,#0d2b0d);border:1px solid #22c55e;border-radius:10px;padding:14px;margin:14px 0;color:#fff;}.wallet-dm-title{font-size:15px;font-weight:700;color:#4ade80;margin:0 0 4px;}.wallet-dm-tier{font-size:12px;color:#86efac;margin:0 0 10px;}.wallet-dm-eligible-box{background:rgba(34,197,94,0.1);border:1px solid #166534;border-radius:6px;padding:10px;margin-bottom:10px;font-size:13px;color:#bbf7d0;}.wallet-dm-claim-btn{width:100%;padding:10px;background:linear-gradient(135deg,#22c55e,#16a34a);color:#fff;font-weight:700;border-radius:8px;border:none;cursor:pointer;font-size:14px;margin-top:6px;}.wallet-dm-not-eligible{font-size:13px;color:#888;margin-bottom:10px;}.wallet-dm-rates-table{width:100%;border-collapse:collapse;font-size:11px;margin-top:8px;}.wallet-dm-rates-table th{color:#888;font-weight:600;text-align:left;padding:3px 4px;border-bottom:1px solid #1a1a2e;}.wallet-dm-rates-table td{color:#ccc;padding:3px 4px;border-bottom:1px solid #111;}.wallet-dm-rates-table tr.current-tier td{color:#4ade80;font-weight:700;}';
    document.head.appendChild(s);
})();

/**
 * Renders a Deposit Match Bonus card below the Loyalty section in the wallet modal.
 * Shows VIP tier, eligibility status, claim button, and rates table.
 * All dynamic text uses .textContent (no innerHTML with variables).
 * @param {HTMLElement} modal  The #walletModal element (or any ancestor containing .wallet-modal)
 */
async function _renderDepositMatchSection(modal) {
    if (!modal) return;
    if (typeof isServerAuthToken !== 'function' || !isServerAuthToken()) return;
    var token = localStorage.getItem(typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken');
    if (!token) return;

    // Find (or create) the persistent wrapper div that sits below the Loyalty card
    var walletInner = modal.querySelector('.wallet-modal');
    if (!walletInner) walletInner = modal;

    var wrapper = walletInner.querySelector('#walletDepositMatchCardWrapper');
    if (!wrapper) {
        wrapper = document.createElement('div');
        wrapper.id = 'walletDepositMatchCardWrapper';
        wrapper.style.cssText = 'padding:0 16px 0 16px;';
        // Insert after the loyalty card wrapper if present, else before walletContent
        var loyaltyWrapper = walletInner.querySelector('#walletLoyaltyCardWrapper');
        var walletContentEl = walletInner.querySelector('#walletContent');
        if (loyaltyWrapper && loyaltyWrapper.nextSibling) {
            walletInner.insertBefore(wrapper, loyaltyWrapper.nextSibling);
        } else if (walletContentEl) {
            walletInner.insertBefore(wrapper, walletContentEl);
        } else {
            walletInner.appendChild(wrapper);
        }
    }

    // Remove any existing card inside the wrapper (full re-render)
    var existingCard = wrapper.querySelector('#walletDepositMatchCard');
    if (existingCard) existingCard.remove();

    // Build card shell
    var card = document.createElement('div');
    card.id = 'walletDepositMatchCard';
    card.className = 'wallet-deposit-match-card';

    // ── Header ──
    var titleEl = document.createElement('p');
    titleEl.className = 'wallet-dm-title';
    titleEl.textContent = '\uD83C\uDF81 Deposit Match Bonus';
    card.appendChild(titleEl);

    // Tier placeholder shown while loading
    var tierEl = document.createElement('p');
    tierEl.className = 'wallet-dm-tier';
    tierEl.textContent = 'Loading\u2026';
    card.appendChild(tierEl);

    wrapper.appendChild(card);

    // ── Fetch status from server ──
    var data = null;
    try {
        var resp = await fetch('/api/depositmatch/status', {
            headers: { Authorization: 'Bearer ' + token }
        });
        if (resp.ok) data = await resp.json();
    } catch (_e) {}

    if (!data) {
        tierEl.textContent = 'Could not load deposit match data.';
        tierEl.style.color = '#f87171';
        return;
    }

    var matchRate = parseFloat(data.matchRate) || 0;
    var matchCap = parseFloat(data.matchCap) || 0;
    var pendingMatch = parseFloat(data.pendingMatch) || 0;
    var lastDepositAmount = parseFloat(data.lastDepositAmount) || 0;
    var matchAmount = parseFloat(data.matchAmount) || 0;
    var vipLabel = data.vipLabel || 'Base';
    var eligible = !!data.eligible;

    // Update tier label with real data
    var matchRatePct = Math.round(matchRate * 100);
    var tierText = vipLabel + ' Tier \u2014 ' + matchRatePct + '% match up to $' + matchCap.toFixed(2);
    tierEl.textContent = tierText;

    // ── Eligible state ──
    if (eligible) {
        var eligibleBox = document.createElement('div');
        eligibleBox.className = 'wallet-dm-eligible-box';

        var eligibleMsg = document.createElement('span');
        var depositStr = '$' + lastDepositAmount.toFixed(2);
        var matchStr = '$' + matchAmount.toFixed(2);
        eligibleMsg.textContent = 'Your last deposit of ' + depositStr + ' qualifies for a ' + matchStr + ' match bonus!';
        eligibleBox.appendChild(eligibleMsg);
        card.appendChild(eligibleBox);

        var claimBtn = document.createElement('button');
        claimBtn.className = 'wallet-dm-claim-btn';
        claimBtn.textContent = 'Claim ' + matchStr + ' Match Bonus';
        claimBtn.addEventListener('click', function() {
            var claimToken = localStorage.getItem(typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken');
            if (!claimToken) return;
            claimBtn.disabled = true;
            claimBtn.style.opacity = '0.6';

            fetch('/api/depositmatch/claim', {
                method: 'POST',
                headers: { Authorization: 'Bearer ' + claimToken, 'Content-Type': 'application/json' }
            })
            .then(function(r) { return r.json(); })
            .then(function(result) {
                if (result.success) {
                    var credited = parseFloat(result.matchAmount) || 0;
                    if (typeof showToast === 'function') {
                        showToast('\uD83C\uDF81 $' + credited.toFixed(2) + ' match bonus credited!', 'win', 4000);
                    }
                    if (typeof updateBalanceDisplay === 'function') updateBalanceDisplay();
                    // Replace claim button with confirmed text
                    claimBtn.remove();
                    var confirmedEl = document.createElement('div');
                    confirmedEl.style.cssText = 'color:#4ade80;font-weight:700;font-size:14px;margin-top:6px;';
                    confirmedEl.textContent = '\u2705 Claimed!';
                    card.appendChild(confirmedEl);
                } else {
                    if (typeof showToast === 'function') {
                        showToast(result.error || 'Nothing to claim right now.', 'info', 3000);
                    }
                    claimBtn.disabled = false;
                    claimBtn.style.opacity = '1';
                }
            })
            .catch(function() {
                if (typeof showToast === 'function') {
                    showToast('Claim failed \u2014 please try again.', 'error', 3000);
                }
                claimBtn.disabled = false;
                claimBtn.style.opacity = '1';
            });
        });
        card.appendChild(claimBtn);

    } else if (pendingMatch > 0.009) {
        // ── Pending match (already accrued, not yet claimed) ──
        var pendingBox = document.createElement('div');
        pendingBox.className = 'wallet-dm-eligible-box';

        var pendingMsg = document.createElement('span');
        var pendingStr = '$' + pendingMatch.toFixed(2);
        pendingMsg.textContent = 'You have ' + pendingStr + ' pending match \u2014 claim it!';
        pendingBox.appendChild(pendingMsg);
        card.appendChild(pendingBox);

        var pendingClaimBtn = document.createElement('button');
        pendingClaimBtn.className = 'wallet-dm-claim-btn';
        pendingClaimBtn.textContent = 'Claim ' + pendingStr + ' Match Bonus';
        pendingClaimBtn.addEventListener('click', function() {
            var claimToken2 = localStorage.getItem(typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken');
            if (!claimToken2) return;
            pendingClaimBtn.disabled = true;
            pendingClaimBtn.style.opacity = '0.6';

            fetch('/api/depositmatch/claim', {
                method: 'POST',
                headers: { Authorization: 'Bearer ' + claimToken2, 'Content-Type': 'application/json' }
            })
            .then(function(r) { return r.json(); })
            .then(function(result) {
                if (result.success) {
                    var credited2 = parseFloat(result.matchAmount) || 0;
                    if (typeof showToast === 'function') {
                        showToast('\uD83C\uDF81 $' + credited2.toFixed(2) + ' match bonus credited!', 'win', 4000);
                    }
                    if (typeof updateBalanceDisplay === 'function') updateBalanceDisplay();
                    pendingClaimBtn.remove();
                    var confirmedEl2 = document.createElement('div');
                    confirmedEl2.style.cssText = 'color:#4ade80;font-weight:700;font-size:14px;margin-top:6px;';
                    confirmedEl2.textContent = '\u2705 Claimed!';
                    card.appendChild(confirmedEl2);
                } else {
                    if (typeof showToast === 'function') {
                        showToast(result.error || 'Nothing to claim right now.', 'info', 3000);
                    }
                    pendingClaimBtn.disabled = false;
                    pendingClaimBtn.style.opacity = '1';
                }
            })
            .catch(function() {
                if (typeof showToast === 'function') {
                    showToast('Claim failed \u2014 please try again.', 'error', 3000);
                }
                pendingClaimBtn.disabled = false;
                pendingClaimBtn.style.opacity = '1';
            });
        });
        card.appendChild(pendingClaimBtn);

    } else {
        // ── Not eligible ──
        var notEligEl = document.createElement('div');
        notEligEl.className = 'wallet-dm-not-eligible';
        var depositPrompt = 'Make a deposit to unlock your ' + vipLabel + ' ' + matchRatePct + '% match bonus (up to $' + matchCap.toFixed(2) + ')';
        notEligEl.textContent = depositPrompt;
        card.appendChild(notEligEl);

        var depositNowBtn = document.createElement('button');
        depositNowBtn.className = 'wallet-dm-claim-btn';
        depositNowBtn.style.cssText = 'width:100%;padding:8px;background:linear-gradient(135deg,#374151,#1f2937);color:#9ca3af;font-weight:700;border-radius:8px;border:1px solid #374151;cursor:pointer;font-size:13px;margin-top:4px;';
        depositNowBtn.textContent = 'Deposit Now';
        depositNowBtn.addEventListener('click', function() {
            var depositSection = document.getElementById('depositSection');
            if (depositSection) depositSection.scrollIntoView({ behavior: 'smooth' });
        });
        card.appendChild(depositNowBtn);
    }

    // ── VIP Rates table ──
    var RATES_TABLE = [
        { label: 'Base',     rate: '25%',  cap: '$2.50'  },
        { label: 'Bronze',   rate: '35%',  cap: '$7'     },
        { label: 'Silver',   rate: '50%',  cap: '$15'    },
        { label: 'Gold',     rate: '60%',  cap: '$35'    },
        { label: 'Platinum', rate: '75%',  cap: '$75'    },
        { label: 'Diamond',  rate: '100%', cap: '$200'   }
    ];

    var table = document.createElement('table');
    table.className = 'wallet-dm-rates-table';

    var thead = document.createElement('thead');
    var headerRow = document.createElement('tr');
    var thTier = document.createElement('th');
    thTier.textContent = 'VIP Tier';
    var thRate = document.createElement('th');
    thRate.textContent = 'Match Rate';
    var thCap = document.createElement('th');
    thCap.textContent = 'Max Bonus';
    headerRow.appendChild(thTier);
    headerRow.appendChild(thRate);
    headerRow.appendChild(thCap);
    thead.appendChild(headerRow);
    table.appendChild(thead);

    var tbody = document.createElement('tbody');
    RATES_TABLE.forEach(function(row) {
        var tr = document.createElement('tr');
        if (row.label === vipLabel) tr.className = 'current-tier';
        var tdLabel = document.createElement('td');
        tdLabel.textContent = row.label;
        var tdRate = document.createElement('td');
        tdRate.textContent = row.rate;
        var tdCap = document.createElement('td');
        tdCap.textContent = row.cap;
        tr.appendChild(tdLabel);
        tr.appendChild(tdRate);
        tr.appendChild(tdCap);
        tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    card.appendChild(table);
}

/**
 * Renders a Weekly Rakeback card below the Loyalty section in the wallet modal.
 * Shows weekly stats, pending amount, claim button, history, and next payout countdown.
 * All dynamic text uses .textContent (no innerHTML with variables).
 * @param {HTMLElement} modal  The #walletModal element (or any ancestor containing .wallet-modal)
 */
async function _renderRakebackSection(modal) {
    if (!modal) return;
    if (typeof isServerAuthToken !== 'function' || !isServerAuthToken()) return;
    var token = localStorage.getItem(typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken');
    if (!token) return;

    // Find (or create) the persistent wrapper div that sits below the Loyalty card
    var walletInner = modal.querySelector('.wallet-modal');
    if (!walletInner) walletInner = modal;

    var wrapper = walletInner.querySelector('#walletRakebackCardWrapper');
    if (!wrapper) {
        wrapper = document.createElement('div');
        wrapper.id = 'walletRakebackCardWrapper';
        wrapper.style.cssText = 'padding:0 16px 0 16px;';
        // Insert after the loyalty card wrapper if present, else before walletContent
        var loyaltyWrapper = walletInner.querySelector('#walletLoyaltyCardWrapper');
        var walletContentEl = walletInner.querySelector('#walletContent');
        if (loyaltyWrapper && loyaltyWrapper.nextSibling) {
            walletInner.insertBefore(wrapper, loyaltyWrapper.nextSibling);
        } else if (walletContentEl) {
            walletInner.insertBefore(wrapper, walletContentEl);
        } else {
            walletInner.appendChild(wrapper);
        }
    }

    // Remove any existing card inside the wrapper (full re-render)
    var existingCard = wrapper.querySelector('#walletRakebackCard');
    if (existingCard) existingCard.remove();

    // Build card shell
    var card = document.createElement('div');
    card.id = 'walletRakebackCard';
    card.style.cssText = [
        'background:linear-gradient(135deg,rgba(251,191,36,0.10),rgba(245,158,11,0.05))',
        'border:1.5px solid rgba(251,191,36,0.28)',
        'border-radius:14px',
        'padding:16px 18px',
        'margin:12px 0'
    ].join(';');

    // ── Header ──
    var titleRow = document.createElement('div');
    titleRow.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;';

    var title = document.createElement('span');
    title.style.cssText = 'font-size:1rem;font-weight:800;color:#fbbf24;letter-spacing:0.3px;';
    title.textContent = '\u267B\uFE0F Weekly Rakeback (1%)';

    var rateNote = document.createElement('span');
    rateNote.style.cssText = 'font-size:0.72rem;color:#fde68a;opacity:0.8;';
    rateNote.textContent = '1% of net losses';

    titleRow.appendChild(title);
    titleRow.appendChild(rateNote);
    card.appendChild(titleRow);

    // ── Loading placeholder while fetching ──
    var loadingEl = document.createElement('div');
    loadingEl.style.cssText = 'color:#fde68a;font-size:0.82rem;opacity:0.7;margin-bottom:8px;';
    loadingEl.textContent = 'Loading\u2026';
    card.appendChild(loadingEl);

    wrapper.appendChild(card);

    // ── Fetch status from server ──
    var data = null;
    try {
        var resp = await fetch('/api/rakeback/status', {
            headers: { Authorization: 'Bearer ' + token }
        });
        if (resp.ok) data = await resp.json();
    } catch (_e) {}

    // Remove loading placeholder
    if (loadingEl.parentNode) loadingEl.remove();

    if (!data) {
        var errEl = document.createElement('div');
        errEl.style.cssText = 'color:#f87171;font-size:0.82rem;';
        errEl.textContent = 'Could not load rakeback data.';
        card.appendChild(errEl);
        return;
    }

    var pending = parseFloat(data.pendingRakeback) || 0;
    var wagered = parseFloat(data.weeklyWagered) || 0;
    var netLoss = parseFloat(data.weeklyNetLoss) || 0;

    // ── Stats row ──
    var statsRow = document.createElement('div');
    statsRow.style.cssText = 'display:flex;gap:16px;margin-bottom:12px;flex-wrap:wrap;';

    var wageredStat = document.createElement('div');
    wageredStat.style.cssText = 'font-size:0.8rem;color:#fde68a;';
    var wageredLabel = document.createElement('span');
    wageredLabel.style.cssText = 'opacity:0.7;';
    wageredLabel.textContent = 'Wagered this week: ';
    var wageredVal = document.createElement('span');
    wageredVal.style.cssText = 'font-weight:700;color:#fbbf24;';
    wageredVal.textContent = '$' + wagered.toFixed(2);
    wageredStat.appendChild(wageredLabel);
    wageredStat.appendChild(wageredVal);

    var pendingStat = document.createElement('div');
    pendingStat.style.cssText = 'font-size:0.8rem;color:#fde68a;';
    var pendingLabel = document.createElement('span');
    pendingLabel.style.cssText = 'opacity:0.7;';
    pendingLabel.textContent = 'Pending rakeback: ';
    var pendingVal = document.createElement('span');
    pendingVal.style.cssText = 'font-weight:700;color:#fbbf24;';
    pendingVal.textContent = '$' + pending.toFixed(2);
    pendingStat.appendChild(pendingLabel);
    pendingStat.appendChild(pendingVal);

    statsRow.appendChild(wageredStat);
    statsRow.appendChild(pendingStat);
    card.appendChild(statsRow);

    // ── Claim button or "keep playing" note ──
    if (pending < 0.01) {
        var keepPlayingEl = document.createElement('div');
        keepPlayingEl.style.cssText = 'font-size:0.8rem;color:#fde68a;opacity:0.7;margin-bottom:12px;font-style:italic;';
        keepPlayingEl.textContent = 'Keep playing to earn rakeback';
        card.appendChild(keepPlayingEl);
    } else {
        var claimBtn = document.createElement('button');
        claimBtn.id = 'rakebackCardClaimBtn';
        claimBtn.style.cssText = [
            'background:linear-gradient(135deg,#f59e0b,#d97706)',
            'color:#1c1917',
            'border:none',
            'border-radius:8px',
            'padding:8px 18px',
            'font-size:0.85rem',
            'font-weight:800',
            'cursor:pointer',
            'margin-bottom:12px',
            'letter-spacing:0.3px'
        ].join(';');
        claimBtn.textContent = 'Claim Rakeback ($' + pending.toFixed(2) + ')';

        claimBtn.addEventListener('click', function() {
            var claimToken = localStorage.getItem(typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken');
            if (!claimToken) return;
            claimBtn.disabled = true;
            claimBtn.style.opacity = '0.6';

            fetch('/api/rakeback/claim', {
                method: 'POST',
                headers: { Authorization: 'Bearer ' + claimToken, 'Content-Type': 'application/json' }
            })
            .then(function(r) { return r.json(); })
            .then(function(result) {
                if (result.success) {
                    var credited = parseFloat(result.credited) || 0;
                    if (typeof balance !== 'undefined') balance = result.newBalance;
                    if (typeof updateBalanceDisplay === 'function') updateBalanceDisplay();
                    if (typeof showToast === 'function') {
                        showToast('\u267B\uFE0F Rakeback $' + credited.toFixed(2) + ' credited!', 'win', 4000);
                    }
                    // Re-render card with fresh data
                    var walletModal = document.getElementById('walletModal');
                    if (walletModal) _renderRakebackSection(walletModal);
                } else {
                    if (typeof showToast === 'function') {
                        showToast(result.error || 'Nothing to claim yet', 'info', 3000);
                    }
                    claimBtn.disabled = false;
                    claimBtn.style.opacity = '1';
                }
            })
            .catch(function() {
                if (typeof showToast === 'function') {
                    showToast('Claim failed \u2014 please try again.', 'error', 3000);
                }
                claimBtn.disabled = false;
                claimBtn.style.opacity = '1';
            });
        });

        card.appendChild(claimBtn);
    }

    // ── Next automatic payout countdown ──
    if (data.nextPayoutAt) {
        var nextPayout = new Date(data.nextPayoutAt);
        var now = new Date();
        var diffMs = nextPayout - now;
        var countdownEl = document.createElement('div');
        countdownEl.style.cssText = 'font-size:0.76rem;color:#fde68a;opacity:0.75;margin-bottom:10px;';
        if (diffMs > 0) {
            var diffH = Math.floor(diffMs / 3600000);
            var diffM = Math.floor((diffMs % 3600000) / 60000);
            var countdownLabel = document.createElement('span');
            countdownLabel.textContent = 'Next automatic payout in ';
            var countdownVal = document.createElement('span');
            countdownVal.style.cssText = 'font-weight:700;color:#fbbf24;';
            countdownVal.textContent = diffH + 'h ' + diffM + 'm';
            countdownEl.appendChild(countdownLabel);
            countdownEl.appendChild(countdownVal);
        } else {
            countdownEl.textContent = 'Automatic payout processing soon\u2026';
        }
        card.appendChild(countdownEl);
    }

    // ── Recent history (last 3 entries) ──
    var history = Array.isArray(data.history) ? data.history.slice(0, 3) : [];
    if (history.length > 0) {
        var histTitle = document.createElement('div');
        histTitle.style.cssText = 'font-size:0.76rem;font-weight:700;color:#fbbf24;margin-bottom:6px;letter-spacing:0.2px;';
        histTitle.textContent = 'Recent Payouts';
        card.appendChild(histTitle);

        history.forEach(function(entry) {
            var row = document.createElement('div');
            row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:4px 0;border-top:1px solid rgba(251,191,36,0.12);';

            var dateEl = document.createElement('span');
            dateEl.style.cssText = 'font-size:0.72rem;color:#fde68a;opacity:0.7;';
            var entryDate = entry.created_at ? new Date(entry.created_at) : null;
            dateEl.textContent = entryDate ? entryDate.toLocaleDateString() : 'N/A';

            var descEl = document.createElement('span');
            descEl.style.cssText = 'font-size:0.72rem;color:#fde68a;flex:1;padding:0 8px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
            descEl.textContent = entry.description || 'Rakeback payout';

            var amtEl = document.createElement('span');
            amtEl.style.cssText = 'font-size:0.76rem;font-weight:700;color:#fbbf24;white-space:nowrap;';
            amtEl.textContent = '+$' + (parseFloat(entry.amount) || 0).toFixed(2);

            row.appendChild(dateEl);
            row.appendChild(descEl);
            row.appendChild(amtEl);
            card.appendChild(row);
        });
    }
}

// ── Daily Cashback CSS (injected once) ────────────────────────────────────────
(function _injectDailyCashbackCSS() {
    if (document.getElementById('walletDailyCashbackCSS')) return;
    var s = document.createElement('style');
    s.id = 'walletDailyCashbackCSS';
    s.textContent = [
        '#wallet-cashback-section{background:linear-gradient(135deg,rgba(249,115,22,0.10),rgba(234,88,12,0.05));border:1.5px solid rgba(249,115,22,0.28);border-radius:14px;padding:16px 18px;margin:12px 0;}',
        '.cashback-eligible-box{background:rgba(34,197,94,0.10);border-left:3px solid #22c55e;border-radius:6px;padding:10px 12px;margin-bottom:10px;font-size:0.82rem;color:#bbf7d0;}',
        '.cashback-claimed-box{background:rgba(156,163,175,0.08);border-left:3px solid #6b7280;border-radius:6px;padding:10px 12px;margin-bottom:10px;font-size:0.82rem;color:#9ca3af;}',
        '.cashback-inactive-box{background:rgba(107,114,128,0.06);border-left:3px solid rgba(107,114,128,0.3);border-radius:6px;padding:10px 12px;margin-bottom:10px;font-size:0.82rem;color:#9ca3af;}',
        '.cashback-tier-table{width:100%;border-collapse:collapse;font-size:0.72rem;margin-top:10px;}',
        '.cashback-tier-table th{color:#9ca3af;font-weight:600;text-align:left;padding:3px 4px;border-bottom:1px solid rgba(249,115,22,0.15);}',
        '.cashback-tier-table td{color:#d1d5db;padding:3px 4px;border-bottom:1px solid rgba(249,115,22,0.08);}',
        '.cashback-tier-table tr.cb-current-tier td{color:#fb923c;font-weight:700;}',
        '#wallet-loyalty-shop-section{background:linear-gradient(135deg,rgba(52,211,153,0.10),rgba(16,185,129,0.05));border:1.5px solid rgba(52,211,153,0.28);border-radius:14px;padding:16px 18px;margin:12px 0;}',
        '.loyalty-pts-display{font-size:2rem;font-weight:900;color:#a7f3d0;line-height:1;display:block;margin-bottom:2px;}',
        '.loyalty-pts-sub{font-size:0.72rem;color:#6ee7b7;opacity:0.65;margin-bottom:12px;display:block;}',
        '.loyalty-redeem-btns{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;}',
        '.loyalty-redeem-btns button{flex:1 1 auto;min-width:110px;padding:7px 10px;border:none;border-radius:8px;font-size:0.74rem;font-weight:700;cursor:pointer;background:linear-gradient(135deg,#34d399,#059669);color:#fff;letter-spacing:0.2px;transition:opacity 0.2s;}',
        '.loyalty-custom-redeem{display:flex;gap:8px;align-items:center;flex-wrap:wrap;}',
        '.loyalty-custom-redeem input{flex:1 1 100px;padding:7px 10px;background:rgba(52,211,153,0.08);border:1px solid rgba(52,211,153,0.25);border-radius:8px;color:#a7f3d0;font-size:0.82rem;min-width:80px;}',
        '.loyalty-custom-redeem button{padding:7px 14px;border:none;border-radius:8px;font-size:0.8rem;font-weight:700;cursor:pointer;background:linear-gradient(135deg,#34d399,#059669);color:#fff;white-space:nowrap;}'
    ].join('');
    document.head.appendChild(s);
})();

/**
 * Renders the Daily Cashback card in the wallet modal.
 * Shows VIP tier, eligibility, claim button, and tier rate table.
 * All dynamic text uses .textContent — no innerHTML with variables.
 * @param {HTMLElement} modal  The #walletModal element
 */
async function _renderDailyCashbackSection(modal) {
    if (!modal) return;
    if (typeof isServerAuthToken !== 'function' || !isServerAuthToken()) return;
    var token = localStorage.getItem(typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken');
    if (!token) return;

    var walletInner = modal.querySelector('.wallet-modal');
    if (!walletInner) walletInner = modal;

    // Find or create the persistent wrapper placed after the rakeback wrapper
    var wrapper = walletInner.querySelector('#walletDailyCashbackCardWrapper');
    if (!wrapper) {
        wrapper = document.createElement('div');
        wrapper.id = 'walletDailyCashbackCardWrapper';
        wrapper.style.cssText = 'padding:0 16px 0 16px;';
        // Insert after rakeback wrapper if present, else before walletContent
        var rakeWrapper = walletInner.querySelector('#walletRakebackCardWrapper');
        var walletContentEl = walletInner.querySelector('#walletContent');
        if (rakeWrapper && rakeWrapper.nextSibling) {
            walletInner.insertBefore(wrapper, rakeWrapper.nextSibling);
        } else if (walletContentEl) {
            walletInner.insertBefore(wrapper, walletContentEl);
        } else {
            walletInner.appendChild(wrapper);
        }
    }

    // Remove any existing card for full re-render
    var existingCard = wrapper.querySelector('#wallet-cashback-section');
    if (existingCard) existingCard.remove();

    // Build card shell
    var card = document.createElement('div');
    card.id = 'wallet-cashback-section';

    // ── Header row ──
    var titleRow = document.createElement('div');
    titleRow.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;';

    var title = document.createElement('span');
    title.style.cssText = 'font-size:1rem;font-weight:800;color:#fb923c;letter-spacing:0.3px;';
    title.textContent = '\uD83D\uDCB8 Daily Cashback';

    var subNote = document.createElement('span');
    subNote.style.cssText = 'font-size:0.72rem;color:#fdba74;opacity:0.8;';
    subNote.textContent = '2\u201310% of net losses';

    titleRow.appendChild(title);
    titleRow.appendChild(subNote);
    card.appendChild(titleRow);

    // Loading state
    var loadingEl = document.createElement('div');
    loadingEl.style.cssText = 'color:#fdba74;font-size:0.82rem;opacity:0.7;margin-bottom:8px;';
    loadingEl.textContent = 'Loading\u2026';
    card.appendChild(loadingEl);

    wrapper.appendChild(card);

    // ── Fetch status ──
    var data = null;
    try {
        var resp = await fetch('/api/dailycashback/status', {
            headers: { Authorization: 'Bearer ' + token }
        });
        if (resp.ok) data = await resp.json();
    } catch (_e) {}

    // Remove loading placeholder
    if (loadingEl.parentNode) loadingEl.remove();

    if (!data) {
        var errEl = document.createElement('div');
        errEl.style.cssText = 'color:#f87171;font-size:0.82rem;';
        errEl.textContent = 'Could not load cashback data.';
        card.appendChild(errEl);
        return;
    }

    var eligible = !!data.eligible;
    var claimed  = !!data.claimed;
    var amount   = parseFloat(data.amount) || 0;
    var netLosses = parseFloat(data.netLosses) || 0;
    var vipLabel = data.vipLabel || 'Base';
    var cashbackRate = parseFloat(data.cashbackRate) || 0;
    var cashbackCap  = parseFloat(data.cashbackCap) || 0;
    var vipLevel = parseInt(data.vipLevel, 10) || 0;

    // ── VIP badge ──
    var vipBadge = document.createElement('span');
    vipBadge.style.cssText = 'display:inline-block;font-size:0.72rem;font-weight:700;padding:2px 9px;border-radius:20px;margin-bottom:10px;background:rgba(249,115,22,0.18);color:#fb923c;border:1px solid rgba(249,115,22,0.35);';
    vipBadge.textContent = vipLabel + ' \u2014 ' + Math.round(cashbackRate * 100) + '% cashback (up to $' + cashbackCap.toFixed(2) + ')';
    card.appendChild(vipBadge);

    if (claimed) {
        // ── Claimed / cooldown state ──
        var claimedBox = document.createElement('div');
        claimedBox.className = 'cashback-claimed-box';

        var claimedTitle = document.createElement('div');
        claimedTitle.style.cssText = 'font-weight:700;margin-bottom:4px;color:#9ca3af;';
        claimedTitle.textContent = '\u2713 Daily Cashback Claimed';
        claimedBox.appendChild(claimedTitle);

        // Compute next-eligible countdown from claimedAt + 24 h
        if (data.claimedAt) {
            var claimedAt = new Date(data.claimedAt);
            var nextAt = new Date(claimedAt.getTime() + 24 * 3600 * 1000);
            var nowMs  = Date.now();
            var diffMs = nextAt - nowMs;
            var countdownEl = document.createElement('div');
            countdownEl.style.cssText = 'font-size:0.78rem;color:#9ca3af;';
            if (diffMs > 0) {
                var diffH = Math.floor(diffMs / 3600000);
                var diffM = Math.floor((diffMs % 3600000) / 60000);
                countdownEl.textContent = 'Next cashback in ' + diffH + 'h ' + diffM + 'm';
            } else {
                countdownEl.textContent = 'Next cashback available now \u2014 refresh to claim.';
            }
            claimedBox.appendChild(countdownEl);
        }

        card.appendChild(claimedBox);

    } else if (eligible && amount > 0) {
        // ── Eligible / available state ──
        var eligibleBox = document.createElement('div');
        eligibleBox.className = 'cashback-eligible-box';

        var eligMsg = document.createElement('div');
        eligMsg.style.cssText = 'font-weight:700;margin-bottom:4px;color:#4ade80;font-size:0.88rem;';
        eligMsg.textContent = '\uD83D\uDCB0 Claim Your Cashback!';
        eligibleBox.appendChild(eligMsg);

        var eligDetail = document.createElement('div');
        eligDetail.style.cssText = 'font-size:0.8rem;color:#86efac;';
        var detailAmtStr = '$' + amount.toFixed(2);
        var detailPctStr = Math.round(cashbackRate * 100) + '%';
        var detailLossStr = '$' + netLosses.toFixed(2);
        eligDetail.textContent = detailAmtStr + ' available (' + detailPctStr + ' of ' + detailLossStr + ' losses)';
        eligibleBox.appendChild(eligDetail);

        card.appendChild(eligibleBox);

        var claimBtn = document.createElement('button');
        claimBtn.style.cssText = [
            'width:100%',
            'padding:10px',
            'background:linear-gradient(135deg,#f97316,#ea580c)',
            'color:#fff',
            'font-weight:800',
            'border-radius:8px',
            'border:none',
            'cursor:pointer',
            'font-size:0.88rem',
            'margin-bottom:10px',
            'letter-spacing:0.3px'
        ].join(';');
        claimBtn.textContent = 'Claim $' + amount.toFixed(2) + ' Cashback';

        claimBtn.addEventListener('click', function() {
            var claimToken = localStorage.getItem(typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken');
            if (!claimToken) return;
            claimBtn.disabled = true;
            claimBtn.style.opacity = '0.6';

            fetch('/api/dailycashback/claim', {
                method: 'POST',
                headers: { Authorization: 'Bearer ' + claimToken, 'Content-Type': 'application/json' }
            })
            .then(function(r) { return r.json(); })
            .then(function(result) {
                if (result.success) {
                    var credited = parseFloat(result.credited) || 0;
                    if (typeof updateBalanceDisplay === 'function') updateBalanceDisplay(result.newBalance);
                    else if (typeof balance !== 'undefined') balance = result.newBalance;
                    if (typeof showToast === 'function') {
                        showToast('\uD83D\uDCB8 $' + credited.toFixed(2) + ' cashback credited!', 'win', 4000);
                    }
                    refreshCashbackBalance();
                    // Re-render section to show claimed state
                    var walletModalEl = document.getElementById('walletModal');
                    if (walletModalEl) _renderDailyCashbackSection(walletModalEl);
                } else {
                    if (typeof showToast === 'function') {
                        showToast(result.error || 'Cashback not available', 'info', 3000);
                    }
                    claimBtn.disabled = false;
                    claimBtn.style.opacity = '1';
                }
            })
            .catch(function() {
                if (typeof showToast === 'function') {
                    showToast('Claim failed \u2014 please try again.', 'error', 3000);
                }
                claimBtn.disabled = false;
                claimBtn.style.opacity = '1';
            });
        });

        card.appendChild(claimBtn);

    } else {
        // ── Not eligible / no qualifying losses ──
        var inactiveBox = document.createElement('div');
        inactiveBox.className = 'cashback-inactive-box';

        var inactiveMsg = document.createElement('div');
        inactiveMsg.style.cssText = 'font-size:0.82rem;color:#9ca3af;';
        inactiveMsg.textContent = 'No qualifying losses in the past 24 hours.';
        inactiveBox.appendChild(inactiveMsg);

        var inactiveSub = document.createElement('div');
        inactiveSub.style.cssText = 'font-size:0.75rem;color:#6b7280;margin-top:3px;';
        inactiveSub.textContent = 'Play more to earn cashback on net losses.';
        inactiveBox.appendChild(inactiveSub);

        card.appendChild(inactiveBox);
    }

    // ── VIP Tier Rate Table (static labels, current tier highlighted) ──
    var tierTableTitle = document.createElement('div');
    tierTableTitle.style.cssText = 'font-size:0.76rem;font-weight:700;color:#fb923c;margin:10px 0 4px;letter-spacing:0.2px;';
    tierTableTitle.textContent = 'Cashback Tiers';
    card.appendChild(tierTableTitle);

    var table = document.createElement('table');
    table.className = 'cashback-tier-table';

    var thead = document.createElement('thead');
    var headerRow = document.createElement('tr');
    var th1 = document.createElement('th');
    th1.textContent = 'Tier';
    var th2 = document.createElement('th');
    th2.textContent = 'Rate';
    var th3 = document.createElement('th');
    th3.textContent = 'Cap';
    headerRow.appendChild(th1);
    headerRow.appendChild(th2);
    headerRow.appendChild(th3);
    thead.appendChild(headerRow);
    table.appendChild(thead);

    var tbody = document.createElement('tbody');

    // Static tier definitions — no variable interpolation
    var tierRows = [
        { name: 'Base',     rate: '2%',  cap: '$3',   level: 0 },
        { name: 'Bronze',   rate: '3%',  cap: '$5',   level: 1 },
        { name: 'Silver',   rate: '4%',  cap: '$10',  level: 2 },
        { name: 'Gold',     rate: '5%',  cap: '$20',  level: 3 },
        { name: 'Platinum', rate: '7%',  cap: '$40',  level: 4 },
        { name: 'Diamond',  rate: '10%', cap: '$100', level: 5 }
    ];

    tierRows.forEach(function(tier) {
        var tr = document.createElement('tr');
        if (tier.level === vipLevel) tr.className = 'cb-current-tier';

        var tdName = document.createElement('td');
        tdName.textContent = tier.name + (tier.level === vipLevel ? ' \u2190' : '');
        var tdRate = document.createElement('td');
        tdRate.textContent = tier.rate;
        var tdCap = document.createElement('td');
        tdCap.textContent = tier.cap;

        tr.appendChild(tdName);
        tr.appendChild(tdRate);
        tr.appendChild(tdCap);
        tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    card.appendChild(table);
}

// ── Loyalty Shop CSS (injected once) ──────────────────────────────────────────
// (Styles already injected by _injectDailyCashbackCSS above, which includes
//  #wallet-loyalty-shop-section and associated class names.)

/**
 * Renders the Loyalty Shop card in the wallet modal.
 * Shows points balance, earning rate, progress bar, preset redeem buttons,
 * and a custom-amount redeem field.
 * All dynamic text uses .textContent — no innerHTML with variables.
 * @param {HTMLElement} modal  The #walletModal element
 */
async function _renderLoyaltyShopSection(modal) {
    if (!modal) return;
    if (typeof isServerAuthToken !== 'function' || !isServerAuthToken()) return;
    var token = localStorage.getItem(typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken');
    if (!token) return;

    var walletInner = modal.querySelector('.wallet-modal');
    if (!walletInner) walletInner = modal;

    // Find or create persistent wrapper placed after the cashback wrapper
    var wrapper = walletInner.querySelector('#walletLoyaltyShopCardWrapper');
    if (!wrapper) {
        wrapper = document.createElement('div');
        wrapper.id = 'walletLoyaltyShopCardWrapper';
        wrapper.style.cssText = 'padding:0 16px 16px 16px;';
        // Insert after cashback wrapper if present, else after rakeback, else before walletContent
        var cbWrapper = walletInner.querySelector('#walletDailyCashbackCardWrapper');
        var rakeWrapper = walletInner.querySelector('#walletRakebackCardWrapper');
        var walletContentEl = walletInner.querySelector('#walletContent');
        if (cbWrapper && cbWrapper.nextSibling) {
            walletInner.insertBefore(wrapper, cbWrapper.nextSibling);
        } else if (rakeWrapper && rakeWrapper.nextSibling) {
            walletInner.insertBefore(wrapper, rakeWrapper.nextSibling);
        } else if (walletContentEl) {
            walletInner.insertBefore(wrapper, walletContentEl);
        } else {
            walletInner.appendChild(wrapper);
        }
    }

    // Remove any existing card for full re-render
    var existingCard = wrapper.querySelector('#wallet-loyalty-shop-section');
    if (existingCard) existingCard.remove();

    // Build card shell
    var card = document.createElement('div');
    card.id = 'wallet-loyalty-shop-section';

    // ── Header row ──
    var titleRow = document.createElement('div');
    titleRow.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;';

    var title = document.createElement('span');
    title.style.cssText = 'font-size:1rem;font-weight:800;color:#34d399;letter-spacing:0.3px;';
    title.textContent = '\u2B50 Loyalty Shop';

    var rateNote = document.createElement('span');
    rateNote.style.cssText = 'font-size:0.72rem;color:#6ee7b7;opacity:0.8;';
    rateNote.textContent = '100 pts = $1.00';

    titleRow.appendChild(title);
    titleRow.appendChild(rateNote);
    card.appendChild(titleRow);

    // Loading state
    var loadingEl = document.createElement('div');
    loadingEl.style.cssText = 'color:#6ee7b7;font-size:0.82rem;opacity:0.7;margin-bottom:8px;';
    loadingEl.textContent = 'Loading\u2026';
    card.appendChild(loadingEl);

    wrapper.appendChild(card);

    // ── Fetch status ──
    var data = null;
    try {
        var resp = await fetch('/api/loyaltyshop/status', {
            headers: { Authorization: 'Bearer ' + token }
        });
        if (resp.ok) data = await resp.json();
    } catch (_e) {}

    // Remove loading placeholder
    if (loadingEl.parentNode) loadingEl.remove();

    if (!data) {
        var errEl = document.createElement('div');
        errEl.style.cssText = 'color:#f87171;font-size:0.82rem;';
        errEl.textContent = 'Could not load loyalty shop data.';
        card.appendChild(errEl);
        return;
    }

    var pts          = parseInt(data.points, 10) || 0;
    var lifetimePts  = parseInt(data.lifetimePoints, 10) || 0;
    var pendingPts   = parseInt(data.pendingPoints, 10) || 0;

    // ── Points display ──
    var ptsDisplay = document.createElement('span');
    ptsDisplay.id = 'loyaltyShopPtsDisplay';
    ptsDisplay.className = 'loyalty-pts-display';
    ptsDisplay.textContent = pts.toLocaleString();
    card.appendChild(ptsDisplay);

    var ptsSub = document.createElement('span');
    ptsSub.className = 'loyalty-pts-sub';
    var subText = 'Loyalty Points';
    if (lifetimePts > 0) {
        subText += ' \u00B7 lifetime: ' + lifetimePts.toLocaleString();
    }
    if (pendingPts > 0) {
        subText += ' \u00B7 pending: +' + pendingPts.toLocaleString();
    }
    ptsSub.textContent = subText;
    card.appendChild(ptsSub);

    // ── Earning rate note ──
    var earnNote = document.createElement('div');
    earnNote.style.cssText = 'font-size:0.75rem;color:#6ee7b7;opacity:0.7;margin-bottom:10px;';
    earnNote.textContent = '1 point per spin \u00B7 100 points = $1.00';
    card.appendChild(earnNote);

    // ── Progress bar toward next 100-pt threshold ──
    var progressPts = pts % 100;
    var progressPct = progressPts; // 0-100
    var progressWrap = document.createElement('div');
    progressWrap.style.cssText = 'background:rgba(52,211,153,0.12);border-radius:6px;height:8px;margin-bottom:14px;overflow:hidden;';
    var progressBar = document.createElement('div');
    progressBar.style.cssText = 'height:100%;border-radius:6px;background:linear-gradient(90deg,#34d399,#059669);width:' + progressPct + '%;transition:width 0.4s;';
    progressWrap.appendChild(progressBar);
    card.appendChild(progressWrap);

    var progressLabel = document.createElement('div');
    progressLabel.style.cssText = 'font-size:0.72rem;color:#6ee7b7;opacity:0.6;margin-top:-10px;margin-bottom:12px;';
    progressLabel.textContent = progressPts + ' / 100 pts toward next redemption';
    card.appendChild(progressLabel);

    // ── Status message display (for success/error feedback) ──
    var statusMsg = document.createElement('div');
    statusMsg.id = 'loyaltyShopStatusMsg';
    statusMsg.style.cssText = 'font-size:0.82rem;min-height:1.2em;margin-bottom:8px;';
    card.appendChild(statusMsg);

    // ── Helper: perform redemption ──
    function doRedeem(redeemPts) {
        redeemPts = parseInt(redeemPts, 10) || 0;
        if (redeemPts < 100 || redeemPts % 100 !== 0) {
            statusMsg.style.color = '#f87171';
            statusMsg.textContent = 'Minimum 100 pts, multiples of 100 only.';
            return;
        }
        var currentPts = parseInt((document.getElementById('loyaltyShopPtsDisplay') || {}).textContent || '0', 10);
        if (redeemPts > currentPts) {
            statusMsg.style.color = '#f87171';
            statusMsg.textContent = 'Insufficient loyalty points.';
            return;
        }

        var redeemToken = localStorage.getItem(typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken');
        if (!redeemToken) return;

        // Disable all buttons while in-flight
        card.querySelectorAll('button').forEach(function(b) { b.disabled = true; b.style.opacity = '0.5'; });
        statusMsg.style.color = '#6ee7b7';
        statusMsg.textContent = 'Redeeming\u2026';

        fetch('/api/loyaltyshop/redeem', {
            method: 'POST',
            headers: { Authorization: 'Bearer ' + redeemToken, 'Content-Type': 'application/json' },
            body: JSON.stringify({ points: redeemPts })
        })
        .then(function(r) { return r.json(); })
        .then(function(result) {
            if (result.success) {
                var credited = parseFloat(result.credited) || 0;
                if (typeof updateBalanceDisplay === 'function') updateBalanceDisplay(result.newBalance);
                else if (typeof balance !== 'undefined') balance = result.newBalance;
                statusMsg.style.color = '#4ade80';
                statusMsg.textContent = '\u2705 $' + credited.toFixed(2) + ' credited! ' + (result.newPoints || 0).toLocaleString() + ' pts remaining';
                if (typeof refreshLoyaltyBalance === 'function') refreshLoyaltyBalance();
                // Re-render to show updated balance
                var walletModalEl = document.getElementById('walletModal');
                if (walletModalEl) _renderLoyaltyShopSection(walletModalEl);
            } else {
                statusMsg.style.color = '#f87171';
                statusMsg.textContent = result.error || 'Redemption failed.';
                card.querySelectorAll('button').forEach(function(b) {
                    b.disabled = false;
                    b.style.opacity = '1';
                });
            }
        })
        .catch(function() {
            statusMsg.style.color = '#f87171';
            statusMsg.textContent = 'Redemption failed \u2014 please try again.';
            card.querySelectorAll('button').forEach(function(b) {
                b.disabled = false;
                b.style.opacity = '1';
            });
        });
    }

    // ── Preset redeem buttons ──
    var presets = [
        { pts: 100,  label: '100 pts \u2192 $1.00' },
        { pts: 500,  label: '500 pts \u2192 $5.00' },
        { pts: 1000, label: '1,000 pts \u2192 $10.00' }
    ];

    var btnRow = document.createElement('div');
    btnRow.className = 'loyalty-redeem-btns';

    presets.forEach(function(preset) {
        var btn = document.createElement('button');
        btn.textContent = preset.label;
        btn.disabled = pts < preset.pts;
        btn.style.opacity = pts >= preset.pts ? '1' : '0.4';
        btn.style.cursor = pts >= preset.pts ? 'pointer' : 'not-allowed';
        btn.addEventListener('click', function() { doRedeem(preset.pts); });
        btnRow.appendChild(btn);
    });

    card.appendChild(btnRow);

    // ── Custom redeem row ──
    var customRow = document.createElement('div');
    customRow.className = 'loyalty-custom-redeem';

    var customInput = document.createElement('input');
    customInput.type = 'number';
    customInput.min = '100';
    customInput.step = '100';
    customInput.placeholder = '100, 200, \u2026';
    customInput.style.cssText = 'flex:1 1 100px;padding:7px 10px;background:rgba(52,211,153,0.08);border:1px solid rgba(52,211,153,0.25);border-radius:8px;color:#a7f3d0;font-size:0.82rem;min-width:80px;';

    var customBtn = document.createElement('button');
    customBtn.textContent = 'Redeem';
    customBtn.style.cssText = 'padding:7px 14px;border:none;border-radius:8px;font-size:0.8rem;font-weight:700;cursor:pointer;background:linear-gradient(135deg,#34d399,#059669);color:#fff;white-space:nowrap;';
    customBtn.addEventListener('click', function() {
        var val = parseInt(customInput.value, 10) || 0;
        doRedeem(val);
    });

    // ── Live credit preview label ──
    var previewLabel = document.createElement('span');
    previewLabel.id = 'loyaltyCustomPreview';
    previewLabel.style.cssText = 'font-size:0.78rem;color:#6ee7b7;min-width:72px;white-space:nowrap;';
    previewLabel.textContent = '= $0.00';

    customInput.addEventListener('input', function() {
        var v = parseInt(customInput.value, 10) || 0;
        // snap to nearest lower multiple of 100
        var snapped = Math.floor(v / 100) * 100;
        var credit = (snapped / 100).toFixed(2);
        previewLabel.textContent = snapped > 0 ? '= $' + credit + ' credits' : '= $0.00';
    });

    customRow.appendChild(customInput);
    customRow.appendChild(previewLabel);
    customRow.appendChild(customBtn);
    card.appendChild(customRow);
}

/**
 * Public entry point for rendering the loyalty points balance + redeem section
 * inside the wallet modal.  Delegates to _renderLoyaltyShopSection (the full
 * async implementation) with an ID guard so duplicate calls are no-ops.
 *
 * Layout rendered by the delegate:
 *   - Section header "⭐ Loyalty Shop" + "100 pts = $1.00" rate note
 *   - Large points balance display
 *   - Lifetime earned + pending points
 *   - Earning rate note (1 point per spin)
 *   - Progress bar toward next 100-pt redemption threshold
 *   - If >= 100 pts: preset redeem buttons + custom amount input with live
 *     "$X.XX credits" preview + Redeem button
 *   - If < 100 pts: "Earn points by playing slots!" hint + progress text
 *
 * @param {HTMLElement} parentContainer  The #walletModal element (or .wallet-modal inner element).
 */
async function walletRenderLoyaltySection(parentContainer) {
    if (!parentContainer) return;
    // ID guard: skip if section wrapper already exists in DOM
    if (document.getElementById('walletLoyaltyShopCardWrapper')) return;
    await _renderLoyaltyShopSection(parentContainer);
}

// ── VIP Deposit Bonus CSS (injected once) ─────────────────────────────────────
(function _injectVipDepositCSS() {
    if (document.getElementById('vipDeposit-css')) return;
    var s = document.createElement('style');
    s.id = 'vipDeposit-css';
    s.textContent = [
        '#vipDepositSection{background:linear-gradient(135deg,rgba(234,179,8,0.10),rgba(161,98,7,0.06));border:1.5px solid rgba(234,179,8,0.30);border-radius:14px;padding:16px 18px;margin:12px 0;}',
        '#wallet-vip-deposit-card .vip-deposit-tier-badge{display:inline-block;font-size:0.72rem;font-weight:700;padding:2px 10px;border-radius:20px;margin-bottom:10px;background:rgba(234,179,8,0.18);color:#fbbf24;border:1px solid rgba(234,179,8,0.38);}',
        '#wallet-vip-deposit-card .vip-deposit-stat{font-size:0.82rem;color:#fde68a;margin-bottom:6px;}',
        '#wallet-vip-deposit-card .vip-deposit-stat span{color:#fbbf24;font-weight:700;}',
        '#wallet-vip-deposit-card .vip-deposit-input{width:100%;box-sizing:border-box;padding:8px 12px;background:rgba(234,179,8,0.08);border:1px solid rgba(234,179,8,0.28);border-radius:8px;color:#fde68a;font-size:0.85rem;margin-top:8px;margin-bottom:6px;}',
        '#wallet-vip-deposit-card .vip-deposit-preview{font-size:0.80rem;color:#6ee7b7;margin-bottom:10px;min-height:1.1em;}',
        '#wallet-vip-deposit-card .vip-deposit-claim-btn{width:100%;padding:10px 0;border:none;border-radius:9px;font-size:0.88rem;font-weight:800;cursor:pointer;background:linear-gradient(135deg,#fbbf24,#d97706);color:#1c1400;letter-spacing:0.3px;transition:opacity 0.15s;}',
        '#wallet-vip-deposit-card .vip-deposit-claim-btn:hover{opacity:0.88;}',
        '#wallet-vip-deposit-card .vip-deposit-cooldown{font-size:0.80rem;color:#9ca3af;padding:8px 0 4px;}',
        '#wallet-vip-deposit-card .vip-deposit-hint{font-size:0.75rem;color:#6b7280;margin-top:4px;}',
        '#wallet-vip-deposit-card .vip-deposit-progression{font-size:0.72rem;color:#78716c;margin-top:12px;border-top:1px solid rgba(234,179,8,0.15);padding-top:10px;line-height:1.5;}'
    ].join('');
    document.head.appendChild(s);
})();

/**
 * Public entry point — renders the VIP Deposit Bonus card inside the wallet modal.
 * Applies an ID guard so duplicate calls are no-ops.
 *
 * Fetches GET /api/user/vip-deposit-bonus (auth required) and renders:
 *   - VIP tier info: name, match%, maxBonus
 *   - Lifetime wagered amount
 *   - If available: deposit amount input + live bonus preview + Claim button
 *   - If on cooldown: next-available date + helper note
 *   - Tier progression note at the bottom
 *
 * On claim success: shows feedback label and calls updateBalanceDisplay(newBalance).
 *
 * @param {HTMLElement} parentContainer  The #walletModal element.
 */
async function walletRenderVipDepositSection(parentContainer) {
    if (!parentContainer) return;
    // ID guard
    if (document.getElementById('vipDepositSection')) return;
    if (typeof isServerAuthToken !== 'function' || !isServerAuthToken()) return;
    var token = localStorage.getItem(typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken');
    if (!token) return;

    var walletInner = parentContainer.querySelector('.wallet-modal');
    if (!walletInner) walletInner = parentContainer;

    // Create wrapper (placed after walletLoyaltyShopCardWrapper if present, else appended)
    var wrapper = document.createElement('div');
    wrapper.id = 'vipDepositSection';
    wrapper.style.cssText = 'padding:0 16px 0 16px;';

    var loyaltyWrapper = walletInner.querySelector('#walletLoyaltyShopCardWrapper');
    if (loyaltyWrapper && loyaltyWrapper.nextSibling) {
        walletInner.insertBefore(wrapper, loyaltyWrapper.nextSibling);
    } else if (loyaltyWrapper) {
        walletInner.appendChild(wrapper);
    } else {
        var walletContentEl = walletInner.querySelector('#walletContent');
        if (walletContentEl) {
            walletInner.insertBefore(wrapper, walletContentEl);
        } else {
            walletInner.appendChild(wrapper);
        }
    }

    // Build card shell
    var card = document.createElement('div');
    card.id = 'wallet-vip-deposit-card';

    // Header row
    var titleRow = document.createElement('div');
    titleRow.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;';

    var title = document.createElement('span');
    title.style.cssText = 'font-size:1rem;font-weight:800;color:#fbbf24;letter-spacing:0.3px;';
    title.textContent = '\uD83D\uDC51 VIP Deposit Bonus';

    titleRow.appendChild(title);
    card.appendChild(titleRow);

    // Loading placeholder
    var loadingEl = document.createElement('div');
    loadingEl.style.cssText = 'color:#fde68a;font-size:0.82rem;opacity:0.7;margin-bottom:8px;';
    loadingEl.textContent = 'Loading\u2026';
    card.appendChild(loadingEl);

    wrapper.appendChild(card);

    // Fetch VIP deposit bonus status
    var data = null;
    try {
        var resp = await fetch('/api/user/vip-deposit-bonus', {
            headers: { Authorization: 'Bearer ' + token }
        });
        if (resp.ok) data = await resp.json();
    } catch (_e) {}

    // Remove loading placeholder
    if (loadingEl.parentNode) loadingEl.remove();

    if (!data) {
        var errEl = document.createElement('div');
        errEl.style.cssText = 'color:#f87171;font-size:0.82rem;';
        errEl.textContent = 'Could not load VIP deposit bonus data.';
        card.appendChild(errEl);
        return;
    }

    var tier = data.tier || {};
    var tierName = tier.name || 'Base';
    var matchPct = parseInt(tier.matchPercent, 10) || 0;
    var maxBonus = parseFloat(tier.maxBonus) || 0;
    var lifetimeWagered = parseFloat(data.lifetimeWagered) || 0;
    var available = !!data.available;
    var nextAvailableAt = data.nextAvailableAt || null;
    var minDeposit = parseFloat(data.minDepositRequired) || 20;
    var wageringMult = parseInt(data.wageringMultiplier, 10) || 20;

    // Tier badge
    var badge = document.createElement('div');
    badge.className = 'vip-deposit-tier-badge';
    badge.textContent = 'Your Tier: ' + tierName + ' \u2014 ' + matchPct + '% match, up to $' + maxBonus.toFixed(0);
    card.appendChild(badge);

    // Lifetime wagered stat
    var wageredStat = document.createElement('div');
    wageredStat.className = 'vip-deposit-stat';
    var wageredLabel = document.createTextNode('Total wagered: ');
    var wageredValue = document.createElement('span');
    wageredValue.textContent = '$' + lifetimeWagered.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    wageredStat.appendChild(wageredLabel);
    wageredStat.appendChild(wageredValue);
    card.appendChild(wageredStat);

    if (available) {
        // Deposit amount input
        var inputLabel = document.createElement('div');
        inputLabel.style.cssText = 'font-size:0.78rem;color:#fde68a;margin-top:10px;margin-bottom:2px;';
        inputLabel.textContent = 'Deposit amount (min $' + minDeposit.toFixed(0) + '):';
        card.appendChild(inputLabel);

        var amountInput = document.createElement('input');
        amountInput.type = 'number';
        amountInput.min = String(minDeposit);
        amountInput.step = '1';
        amountInput.className = 'vip-deposit-input';
        amountInput.placeholder = 'e.g. 50';
        card.appendChild(amountInput);

        // Live bonus preview
        var previewEl = document.createElement('div');
        previewEl.className = 'vip-deposit-preview';
        previewEl.textContent = 'Estimated bonus: $0.00';
        card.appendChild(previewEl);

        amountInput.addEventListener('input', function () {
            var amt = parseFloat(amountInput.value) || 0;
            if (amt < minDeposit) {
                previewEl.textContent = 'Estimated bonus: $0.00';
                return;
            }
            var bonus = Math.min(amt * (matchPct / 100), maxBonus);
            previewEl.textContent = 'Estimated bonus: $' + bonus.toFixed(2) + ' (' + wageringMult + 'x wagering required)';
        });

        // Claim button
        var claimBtn = document.createElement('button');
        claimBtn.className = 'vip-deposit-claim-btn';
        claimBtn.textContent = 'Claim VIP Bonus';
        card.appendChild(claimBtn);

        // Feedback label (hidden until claim)
        var feedbackEl = document.createElement('div');
        feedbackEl.style.cssText = 'font-size:0.82rem;color:#6ee7b7;margin-top:8px;min-height:1.1em;';
        feedbackEl.textContent = '';
        card.appendChild(feedbackEl);

        claimBtn.addEventListener('click', async function () {
            var depositAmt = parseFloat(amountInput.value) || 0;
            if (depositAmt < minDeposit) {
                feedbackEl.style.color = '#f87171';
                feedbackEl.textContent = 'Minimum deposit is $' + minDeposit.toFixed(2) + '.';
                return;
            }
            claimBtn.disabled = true;
            claimBtn.textContent = 'Claiming\u2026';
            var claimToken = localStorage.getItem(typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken');
            var claimData = null;
            try {
                var claimResp = await fetch('/api/user/claim-vip-deposit-bonus', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: 'Bearer ' + claimToken
                    },
                    body: JSON.stringify({ depositAmount: depositAmt })
                });
                if (claimResp.ok) claimData = await claimResp.json();
            } catch (_e) {}

            if (claimData && claimData.success) {
                feedbackEl.style.color = '#6ee7b7';
                feedbackEl.textContent = '+$' + parseFloat(claimData.bonus).toFixed(2) + ' bonus added! (Tier: ' + (claimData.tier || tierName) + ')';
                claimBtn.disabled = true;
                claimBtn.textContent = 'Bonus Claimed';
                if (typeof updateBalanceDisplay === 'function') {
                    updateBalanceDisplay(claimData.newBalance);
                }
            } else {
                feedbackEl.style.color = '#f87171';
                feedbackEl.textContent = 'Claim failed. Please try again.';
                claimBtn.disabled = false;
                claimBtn.textContent = 'Claim VIP Bonus';
            }
        });

    } else {
        // Cooldown state
        var cooldownEl = document.createElement('div');
        cooldownEl.className = 'vip-deposit-cooldown';

        var cooldownText = document.createTextNode('Next available: ');
        cooldownEl.appendChild(cooldownText);

        var cooldownDate = document.createElement('span');
        cooldownDate.style.cssText = 'color:#d1d5db;font-weight:600;';
        if (nextAvailableAt) {
            var nextDate = new Date(nextAvailableAt);
            cooldownDate.textContent = nextDate.toLocaleString();
        } else {
            cooldownDate.textContent = 'Not yet available';
        }
        cooldownEl.appendChild(cooldownDate);
        card.appendChild(cooldownEl);

        var hintEl = document.createElement('div');
        hintEl.className = 'vip-deposit-hint';
        hintEl.textContent = 'Available weekly for verified deposits';
        card.appendChild(hintEl);
    }

    // Tier progression note
    var progressionEl = document.createElement('div');
    progressionEl.className = 'vip-deposit-progression';
    progressionEl.textContent = 'Bronze\u2192Silver at $1k wagered \u2022 Gold at $5k \u2022 Platinum at $20k \u2022 Diamond at $50k';
    card.appendChild(progressionEl);
}

/**
 * Renders the Weekend VIP Cashback card section in the wallet modal.
 * Shows cashback status (active/inactive) with relevant details.
 *
 * @param {HTMLElement} parentContainer  The #walletModal element.
 */
async function walletRenderWeekendCashbackSection(parentContainer) {
    if (typeof isServerAuthToken !== 'function' || !isServerAuthToken()) return;
    var token = localStorage.getItem(typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken');
    if (!token) return;

    // ID guard - only render once
    if (document.getElementById('walletWeekendCashbackSection')) return;

    // Inject CSS once
    if (!document.getElementById('weekendCashback-css')) {
        var s = document.createElement('style');
        s.id = 'weekendCashback-css';
        s.textContent = '.wallet-weekend-cashback { background: linear-gradient(135deg, #1a2a1a, #1e3a1e); border: 1px solid #2d5a2d; border-radius: 12px; padding: 16px; margin-bottom: 16px; } .wallet-weekend-cashback.active { border-color: #4CAF50; } .wallet-weekend-cashback h4 { color: #66bb6a; margin: 0 0 8px 0; font-size: 14px; } .wallet-weekend-cashback p { color: #aaa; font-size: 12px; margin: 4px 0; } .wallet-weekend-cashback .cashback-active-badge { background: #4CAF50; color: #fff; padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: bold; }';
        document.head.appendChild(s);
    }

    // Create placeholder card immediately so UI isn't empty while loading
    var section = document.createElement('div');
    section.id = 'walletWeekendCashbackSection';
    section.className = 'wallet-weekend-cashback';
    parentContainer.appendChild(section);

    var data = null;
    try {
        var resp = await fetch('/api/user/weekend-cashback', {
            headers: { Authorization: 'Bearer ' + token }
        });
        if (resp.ok) {
            data = await resp.json();
        }
    } catch (e) {
        console.error('[WeekendCashback]', e);
    }

    if (data && data.active === true) {
        // Active cashback state
        section.classList.add('active');

        var activeHeader = document.createElement('h4');

        var giftSpan = document.createTextNode('\uD83C\uDF81 Weekend Cashback ');
        activeHeader.appendChild(giftSpan);

        var badge = document.createElement('span');
        badge.className = 'cashback-active-badge';
        badge.textContent = 'ACTIVE';
        activeHeader.appendChild(badge);
        section.appendChild(activeHeader);

        var rateP = document.createElement('p');
        var rateText = document.createElement('strong');
        rateText.style.color = '#81c784';
        rateText.textContent = (data.cashbackPercent || 15) + '% cashback on losses this weekend';
        rateP.appendChild(rateText);
        section.appendChild(rateP);

        if (data.minLoss) {
            var minP = document.createElement('p');
            minP.textContent = 'Minimum loss to qualify: $' + parseFloat(data.minLoss).toFixed(2);
            section.appendChild(minP);
        }

        if (data.maxCashback) {
            var maxP = document.createElement('p');
            maxP.textContent = 'Maximum cashback: $' + parseFloat(data.maxCashback).toFixed(2);
            section.appendChild(maxP);
        }

        if (data.periodEnd) {
            var endP = document.createElement('p');
            endP.textContent = 'Period ends: ' + new Date(data.periodEnd).toLocaleString();
            section.appendChild(endP);
        }

        if (data.eligibleTier) {
            var tierP = document.createElement('p');
            tierP.textContent = 'Your tier: ' + data.eligibleTier;
            section.appendChild(tierP);
        }

    } else if (data && data.active === false) {
        // Inactive / not yet weekend state
        var inactiveHeader = document.createElement('h4');
        inactiveHeader.textContent = '\uD83C\uDF81 Weekend VIP Cashback';
        section.appendChild(inactiveHeader);

        var descP = document.createElement('p');
        descP.textContent = '15% cashback on losses every weekend for eligible VIP players';
        section.appendChild(descP);

        var scheduleP = document.createElement('p');
        if (data.periodEnd) {
            scheduleP.textContent = 'Next cashback window: ' + new Date(data.periodEnd).toLocaleString();
        } else {
            scheduleP.textContent = 'Available on weekends';
        }
        section.appendChild(scheduleP);

        if (data.eligibleTier) {
            var tierNoteP = document.createElement('p');
            tierNoteP.textContent = 'Your tier: ' + data.eligibleTier;
            section.appendChild(tierNoteP);
        }

    } else {
        // Error or no data — show eligibility info card
        var infoHeader = document.createElement('h4');
        infoHeader.textContent = '\uD83C\uDF81 Weekend VIP Cashback';
        section.appendChild(infoHeader);

        var infoP = document.createElement('p');
        infoP.textContent = 'VIP players receive cashback on weekend losses. Reach Silver tier or above to unlock this benefit.';
        section.appendChild(infoP);
    }
}

/**
 * Renders the Win-Back Bonus status card in the wallet modal.
 * Shows active bonus balance and remaining wagering requirement when the
 * player has a win-back bonus that has not yet been fully cleared.
 *
 * @param {HTMLElement} parentContainer  The #walletModal element.
 */
async function walletRenderWinbackSection(parentContainer) {
    if (typeof isServerAuthToken !== 'function' || !isServerAuthToken()) return;
    var token = localStorage.getItem(typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken');
    if (!token) return;
    if (document.getElementById('walletWinbackSection')) return;

    // Inject CSS once
    if (!document.getElementById('walletWinback-css')) {
        var s = document.createElement('style');
        s.id = 'walletWinback-css';
        s.textContent = '#walletWinbackSection { background: linear-gradient(135deg,#1a1200,#2d2000); border:1px solid rgba(251,191,36,0.5); border-radius:12px; padding:14px; margin-bottom:14px; } .wb-title { color:#fbbf24; font-size:14px; font-weight:700; margin:0 0 8px 0; } .wb-row { display:flex; justify-content:space-between; color:#aaa; font-size:12px; margin:4px 0; } .wb-row span:last-child { color:#fff; font-weight:600; } .wb-cta { background:linear-gradient(135deg,#d97706,#f59e0b); color:#000; font-weight:700; padding:8px 16px; border-radius:8px; border:none; cursor:pointer; font-size:13px; margin-top:10px; width:100%; }';
        document.head.appendChild(s);
    }

    // Create placeholder section immediately — no flash / layout shift
    var section = document.createElement('div');
    section.id = 'walletWinbackSection';
    parentContainer.appendChild(section);

    var data = null;
    try {
        var resp = await fetch('/api/user/winback-status', {
            headers: { Authorization: 'Bearer ' + token }
        });
        if (resp.ok) {
            data = await resp.json();
        }
    } catch (e) {
        console.error('[Winback]', e);
    }

    // No active winback — silently remove the placeholder and bail out
    if (!data || data.hasActiveWinback !== true) {
        if (section.parentNode) {
            section.parentNode.removeChild(section);
        }
        return;
    }

    // ── Title ─────────────────────────────────────────────────────────────
    var title = document.createElement('p');
    title.className = 'wb-title';
    title.textContent = '\uD83C\uDF81 Win-Back Bonus Active';
    section.appendChild(title);

    // ── Bonus balance row ─────────────────────────────────────────────────
    var balRow = document.createElement('div');
    balRow.className = 'wb-row';

    var balLabel = document.createElement('span');
    balLabel.textContent = 'Bonus Credits:';
    balRow.appendChild(balLabel);

    var balValue = document.createElement('span');
    balValue.textContent = '$' + parseFloat(data.bonusBalance || 0).toFixed(2);
    balRow.appendChild(balValue);

    section.appendChild(balRow);

    // ── Wagering requirement row ──────────────────────────────────────────
    var wagRow = document.createElement('div');
    wagRow.className = 'wb-row';

    var wagLabel = document.createElement('span');
    wagLabel.textContent = 'Wagering Required:';
    wagRow.appendChild(wagLabel);

    var wagValue = document.createElement('span');
    wagValue.textContent = '$' + parseFloat(data.wageringRequirement || 0).toFixed(2);
    wagRow.appendChild(wagValue);

    section.appendChild(wagRow);

    // ── Helper line ───────────────────────────────────────────────────────
    var helpRow = document.createElement('div');
    helpRow.className = 'wb-row';

    var helpSpan = document.createElement('span');
    helpSpan.textContent = 'Wager $' + parseFloat(data.wageringRequirement || 0).toFixed(2) + ' to release your bonus';
    helpRow.appendChild(helpSpan);

    section.appendChild(helpRow);

    // ── CTA button ────────────────────────────────────────────────────────
    var cta = document.createElement('button');
    cta.className = 'wb-cta';
    cta.textContent = 'Play any slot to wager through your bonus!';
    cta.addEventListener('click', function () {
        if (typeof showWalletModal === 'function') {
            var modal = document.getElementById('walletModal');
            if (modal) modal.classList.remove('active');
        }
    });
    section.appendChild(cta);
}
