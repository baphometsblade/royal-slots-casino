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
    // Refresh gem balance from server
    if (typeof refreshGemBalance === 'function') refreshGemBalance();
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

    container.innerHTML = vipBarHtml + sessionTrackerHtml + lowBalBanner + `
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
                payment_type: paymentType,
                saved_method_id: savedMethodId ? parseInt(savedMethodId, 10) : undefined
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
            body: { amount, payment_type: paymentType },
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
