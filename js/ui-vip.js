// =====================================================================
// VIP / LOYALTY REWARDS MODULE
// =====================================================================
//
// Client-side VIP tier system with cashback, weekly reload bonuses,
// animated tier cards, and a full-screen modal.
//
// Depends on: constants.js (VIP_TIERS, STORAGE_KEY_VIP, VIP_WEEKLY_*),
//   globals.js (stats, balance, formatMoney, currentUser),
//   app.js (saveBalance, saveStats),
//   ui-modals.js (showToast)
//
// All functions are in the global scope (no ES modules).
// HTML + CSS injected via IIFE at load time.


// ── VIP State ────────────────────────────────────────────────
let vipState = {
    lastWeeklyReloadClaim: null,
    cashbackHistory: [],       // [{ date, amount, tier }]
    totalCashbackClaimed: 0
};

// ── Load / Save ──────────────────────────────────────────────

function loadVipState() {
    const saved = localStorage.getItem(STORAGE_KEY_VIP);
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            vipState = { ...vipState, ...parsed };
        } catch (e) { /* keep defaults */ }
    }
}

function saveVipState() {
    localStorage.setItem(STORAGE_KEY_VIP, JSON.stringify(vipState));
}


// ── Core VIP Logic ───────────────────────────────────────────

/**
 * Returns the VIP tier object for the current player based on stats.totalWagered.
 * @returns {object} Tier object from VIP_TIERS
 */
function getVipTier() {
    const wagered = (stats && stats.totalWagered) || 0;
    let tier = VIP_TIERS[0];
    for (let i = VIP_TIERS.length - 1; i >= 0; i--) {
        if (wagered >= VIP_TIERS[i].minWagered) {
            tier = VIP_TIERS[i];
            break;
        }
    }
    return tier;
}

/**
 * Returns the index of the current VIP tier (0-based).
 */
function getVipTierIndex() {
    const tier = getVipTier();
    return VIP_TIERS.findIndex(t => t.id === tier.id);
}

/**
 * Returns progress percentage (0-100) toward the next VIP tier.
 * Returns 100 if already at the highest tier.
 */
function getVipProgress() {
    const wagered = (stats && stats.totalWagered) || 0;
    const idx = getVipTierIndex();
    if (idx >= VIP_TIERS.length - 1) return 100;

    const current = VIP_TIERS[idx];
    const next = VIP_TIERS[idx + 1];
    const range = next.minWagered - current.minWagered;
    const progress = wagered - current.minWagered;
    return Math.min(100, Math.max(0, (progress / range) * 100));
}

/**
 * Returns the next VIP tier object, or null if at Diamond.
 */
function getNextVipTier() {
    const idx = getVipTierIndex();
    if (idx >= VIP_TIERS.length - 1) return null;
    return VIP_TIERS[idx + 1];
}

/**
 * Calculates cashback for a given wagered amount based on current tier.
 * @param {number} wageredAmount
 * @returns {number} Cashback amount in dollars
 */
function calculateCashback(wageredAmount) {
    const tier = getVipTier();
    return (wageredAmount * tier.cashbackPct) / 100;
}

/**
 * Returns milliseconds remaining until weekly reload can be claimed.
 * Returns 0 if ready to claim.
 */
function getWeeklyReloadCooldownRemaining() {
    if (!vipState.lastWeeklyReloadClaim) return 0;
    const elapsed = Date.now() - vipState.lastWeeklyReloadClaim;
    return Math.max(0, VIP_WEEKLY_RELOAD_COOLDOWN_MS - elapsed);
}

/**
 * Returns true if the player can claim the weekly reload bonus.
 */
function canClaimWeeklyReload() {
    const tier = getVipTier();
    if (tier.weeklyReloadPct <= 0) return false;
    return getWeeklyReloadCooldownRemaining() === 0;
}

/**
 * Claims the weekly reload bonus — adds funds and updates state.
 * @returns {number|false} The bonus amount, or false if not claimable
 */
function claimWeeklyReload() {
    if (!canClaimWeeklyReload()) return false;

    const tier = getVipTier();
    const bonusAmount = Math.min(
        (VIP_WEEKLY_RELOAD_BASE * tier.weeklyReloadPct) / 100,
        VIP_WEEKLY_RELOAD_MAX_BONUS
    );

    balance += bonusAmount;
    if (typeof saveBalance === 'function') saveBalance();
    if (typeof updateBalance === 'function') updateBalance();

    vipState.lastWeeklyReloadClaim = Date.now();
    saveVipState();

    showToast(`Weekly reload: +$${formatMoney(bonusAmount)}!`, 'success');

    // Re-render the modal if open
    const modal = document.querySelector('.vip-modal-wrapper');
    if (modal && modal.classList.contains('active')) {
        _renderVipModalContent();
    }

    return bonusAmount;
}


// ── Format Helpers ───────────────────────────────────────────

function _vipFormatCooldown(ms) {
    if (ms <= 0) return 'Ready!';
    const days = Math.floor(ms / (24 * 60 * 60 * 1000));
    const hours = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
}

function _vipFormatWagered(amount) {
    if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `$${(amount / 1000).toFixed(1)}K`;
    return `$${formatMoney(amount)}`;
}


// ═══════════════════════════════════════════════════════════════
// INJECT MODAL HTML + STYLES (IIFE — runs once on load)
// ═══════════════════════════════════════════════════════════════

(function injectVipModal() {
    // ── CSS ──────────────────────────────────────────────────
    const style = document.createElement('style');
    style.textContent = `
/* ── VIP Modal Overlay ────────────────────────────────── */
.vip-modal-wrapper {
    display: none;
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.94);
    z-index: 2000;
    overflow-y: auto;
    padding: 20px;
    animation: vip-fadeIn 0.3s ease-out;
}
.vip-modal-wrapper.active {
    display: flex;
    align-items: flex-start;
    justify-content: center;
}

@keyframes vip-fadeIn {
    from { opacity: 0; transform: scale(0.97); }
    to   { opacity: 1; transform: scale(1); }
}

.vip-modal {
    width: 100%;
    max-width: 900px;
    background: linear-gradient(160deg, #0a0e1a 0%, #141226 50%, #0d1117 100%);
    border: 1px solid rgba(185, 242, 255, 0.15);
    border-radius: 24px;
    overflow: hidden;
    box-shadow: 0 32px 100px rgba(0, 0, 0, 0.8), 0 0 60px rgba(185, 242, 255, 0.06);
    margin: 20px 0 40px;
}

/* ── Header ───────────────────────────────────────────── */
.vip-modal-header {
    position: relative;
    padding: 32px 32px 24px;
    background: linear-gradient(135deg, rgba(185, 242, 255, 0.06) 0%, transparent 60%);
    border-bottom: 1px solid rgba(185, 242, 255, 0.08);
    display: flex;
    justify-content: space-between;
    align-items: center;
}
.vip-modal-header h2 {
    margin: 0;
    font-size: 24px;
    font-weight: 900;
    letter-spacing: 2px;
    background: linear-gradient(135deg, #B9F2FF, #FFD700);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
}
.vip-modal-header .vip-close-btn {
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.12);
    color: #94a3b8;
    width: 36px;
    height: 36px;
    border-radius: 10px;
    font-size: 20px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
}
.vip-modal-header .vip-close-btn:hover {
    background: rgba(255, 255, 255, 0.15);
    color: #fff;
}

/* ── Tier Card ────────────────────────────────────────── */
.vip-tier-card {
    margin: 24px 32px;
    padding: 28px 32px;
    border-radius: 20px;
    position: relative;
    overflow: hidden;
    color: #fff;
}
.vip-tier-card::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, var(--vip-color) 0%, var(--vip-color-dark) 100%);
    opacity: 0.18;
    z-index: 0;
}
.vip-tier-card::after {
    content: '';
    position: absolute;
    top: -50%;
    right: -20%;
    width: 300px;
    height: 300px;
    background: radial-gradient(circle, var(--vip-color) 0%, transparent 70%);
    opacity: 0.08;
    z-index: 0;
}
.vip-tier-card > * { position: relative; z-index: 1; }

.vip-tier-card-top {
    display: flex;
    align-items: center;
    gap: 20px;
    margin-bottom: 20px;
}
.vip-tier-icon {
    font-size: 52px;
    filter: drop-shadow(0 4px 12px rgba(0,0,0,0.4));
    animation: vip-icon-float 3s ease-in-out infinite;
}
@keyframes vip-icon-float {
    0%, 100% { transform: translateY(0); }
    50%      { transform: translateY(-6px); }
}

.vip-tier-info h3 {
    margin: 0 0 4px;
    font-size: 28px;
    font-weight: 900;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: var(--vip-color);
    text-shadow: 0 2px 12px rgba(0,0,0,0.5);
}
.vip-tier-info .vip-tier-subtitle {
    font-size: 13px;
    color: #94a3b8;
    letter-spacing: 1px;
}

.vip-tier-card-border {
    position: absolute;
    inset: 0;
    border-radius: 20px;
    border: 2px solid var(--vip-color);
    opacity: 0.3;
    pointer-events: none;
    z-index: 2;
}
.vip-tier-card-shimmer {
    position: absolute;
    top: 0; left: -100%;
    width: 50%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent);
    animation: vip-shimmer 4s ease-in-out infinite;
    z-index: 1;
    pointer-events: none;
}
@keyframes vip-shimmer {
    0%   { left: -50%; }
    100% { left: 150%; }
}

/* ── Progress Bar ─────────────────────────────────────── */
.vip-progress-section {
    padding: 0 32px 24px;
}
.vip-progress-labels {
    display: flex;
    justify-content: space-between;
    margin-bottom: 8px;
    font-size: 12px;
    color: #64748b;
}
.vip-progress-labels .vip-progress-value {
    color: #e2e8f0;
    font-weight: 700;
}
.vip-progress-track {
    width: 100%;
    height: 10px;
    background: rgba(255,255,255,0.06);
    border-radius: 5px;
    overflow: hidden;
    position: relative;
}
.vip-progress-fill {
    height: 100%;
    border-radius: 5px;
    background: linear-gradient(90deg, var(--vip-color-dark), var(--vip-color));
    transition: width 1s cubic-bezier(0.22, 1, 0.36, 1);
    position: relative;
}
.vip-progress-fill::after {
    content: '';
    position: absolute;
    right: 0;
    top: 0;
    width: 20px;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4));
    border-radius: 0 5px 5px 0;
    animation: vip-progress-pulse 2s ease-in-out infinite;
}
@keyframes vip-progress-pulse {
    0%, 100% { opacity: 0.3; }
    50%      { opacity: 1; }
}
.vip-progress-next {
    text-align: center;
    font-size: 12px;
    color: #64748b;
    margin-top: 10px;
}
.vip-progress-next strong {
    color: var(--vip-color);
}

/* ── Benefits Grid ────────────────────────────────────── */
.vip-benefits-section {
    padding: 0 32px 28px;
}
.vip-benefits-section h4 {
    font-size: 16px;
    font-weight: 800;
    color: #e2e8f0;
    letter-spacing: 1px;
    margin: 0 0 16px;
}
.vip-benefits-list {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
}
.vip-benefit-tag {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 14px;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 10px;
    font-size: 12px;
    color: #cbd5e1;
    letter-spacing: 0.3px;
}
.vip-benefit-tag .vip-benefit-check {
    color: var(--vip-color);
    font-weight: 900;
}

/* ── Weekly Reload Section ────────────────────────────── */
.vip-reload-section {
    margin: 0 32px 28px;
    padding: 20px 24px;
    background: linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(6, 182, 212, 0.06) 100%);
    border: 1px solid rgba(16, 185, 129, 0.15);
    border-radius: 16px;
}
.vip-reload-section h4 {
    margin: 0 0 8px;
    font-size: 15px;
    font-weight: 800;
    color: #34d399;
    letter-spacing: 0.5px;
}
.vip-reload-section p {
    margin: 0 0 14px;
    font-size: 13px;
    color: #94a3b8;
    line-height: 1.5;
}
.vip-reload-btn {
    padding: 10px 28px;
    font-size: 13px;
    font-weight: 800;
    letter-spacing: 1px;
    border: none;
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.25s;
    text-transform: uppercase;
}
.vip-reload-btn--active {
    background: linear-gradient(135deg, #10b981, #059669);
    color: #fff;
    box-shadow: 0 4px 20px rgba(16, 185, 129, 0.3);
}
.vip-reload-btn--active:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 28px rgba(16, 185, 129, 0.45);
}
.vip-reload-btn--disabled {
    background: rgba(255,255,255,0.06);
    color: #475569;
    cursor: not-allowed;
}
.vip-reload-unavailable {
    font-size: 12px;
    color: #64748b;
    margin-top: 8px;
}

/* ── Cashback Summary ─────────────────────────────────── */
.vip-cashback-section {
    padding: 0 32px 28px;
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
}
.vip-cashback-card {
    flex: 1;
    min-width: 160px;
    padding: 18px 20px;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 14px;
    text-align: center;
}
.vip-cashback-card .vip-cashback-label {
    font-size: 11px;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 6px;
}
.vip-cashback-card .vip-cashback-value {
    font-size: 22px;
    font-weight: 900;
    color: #e2e8f0;
}
.vip-cashback-card .vip-cashback-value--accent {
    color: var(--vip-color);
}

/* ── Tier Comparison Table ────────────────────────────── */
.vip-table-section {
    padding: 0 32px 28px;
}
.vip-table-section h4 {
    font-size: 16px;
    font-weight: 800;
    color: #e2e8f0;
    letter-spacing: 1px;
    margin: 0 0 16px;
}
.vip-comparison-table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    font-size: 12px;
    overflow: hidden;
    border-radius: 12px;
    border: 1px solid rgba(255,255,255,0.06);
}
.vip-comparison-table th,
.vip-comparison-table td {
    padding: 12px 14px;
    text-align: center;
    border-bottom: 1px solid rgba(255,255,255,0.04);
}
.vip-comparison-table th {
    background: rgba(255,255,255,0.04);
    color: #94a3b8;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
    font-size: 10px;
}
.vip-comparison-table td {
    color: #cbd5e1;
}
.vip-comparison-table tr:last-child td {
    border-bottom: none;
}
.vip-comparison-table .vip-table-current {
    background: rgba(185, 242, 255, 0.06);
}
.vip-comparison-table .vip-table-tier-cell {
    font-weight: 800;
    letter-spacing: 1px;
}

/* ── Tips Section ─────────────────────────────────────── */
.vip-tips-section {
    padding: 0 32px 32px;
}
.vip-tips-section h4 {
    font-size: 16px;
    font-weight: 800;
    color: #e2e8f0;
    letter-spacing: 1px;
    margin: 0 0 14px;
}
.vip-tips-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 12px;
}
.vip-tip-item {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 14px 16px;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 12px;
    font-size: 12px;
    color: #94a3b8;
    line-height: 1.5;
}
.vip-tip-icon {
    font-size: 20px;
    flex-shrink: 0;
}
.vip-tip-text strong {
    color: #e2e8f0;
    display: block;
    margin-bottom: 2px;
    font-size: 13px;
}

/* ── VIP Badge (header) ───────────────────────────────── */
.vip-header-badge {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 4px 10px;
    border-radius: 8px;
    font-size: 10px;
    font-weight: 900;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    cursor: pointer;
    border: 1px solid;
    transition: all 0.25s;
    white-space: nowrap;
}
.vip-header-badge:hover {
    transform: translateY(-1px);
    filter: brightness(1.2);
}
.vip-header-badge-icon {
    font-size: 14px;
}

/* ── Responsive ───────────────────────────────────────── */
@media (max-width: 640px) {
    .vip-modal {
        border-radius: 16px;
    }
    .vip-tier-card { margin: 16px; padding: 20px; }
    .vip-progress-section,
    .vip-benefits-section,
    .vip-cashback-section,
    .vip-table-section,
    .vip-tips-section { padding-left: 16px; padding-right: 16px; }
    .vip-reload-section { margin-left: 16px; margin-right: 16px; }
    .vip-modal-header { padding: 20px 16px 16px; }
    .vip-modal-header h2 { font-size: 18px; }
    .vip-tier-icon { font-size: 36px; }
    .vip-tier-info h3 { font-size: 20px; }
    .vip-comparison-table { font-size: 10px; }
    .vip-comparison-table th,
    .vip-comparison-table td { padding: 8px 6px; }
}
`;
    document.head.appendChild(style);

    // ── HTML ─────────────────────────────────────────────────
    const wrapper = document.createElement('div');
    wrapper.className = 'vip-modal-wrapper';
    wrapper.id = 'vipModalWrapper';
    wrapper.setAttribute('role', 'dialog');
    wrapper.setAttribute('aria-label', 'VIP Rewards');
    wrapper.innerHTML = `<div class="vip-modal" id="vipModal"><div id="vipModalInner"></div></div>`;
    wrapper.addEventListener('click', function (e) {
        if (e.target === wrapper) hideVipModal();
    });
    document.body.appendChild(wrapper);
})();


// ═══════════════════════════════════════════════════════════════
// MODAL SHOW / HIDE
// ═══════════════════════════════════════════════════════════════

function showVipModal() {
    loadVipState();
    _renderVipModalContent();
    document.getElementById('vipModalWrapper').classList.add('active');
}

function hideVipModal() {
    document.getElementById('vipModalWrapper').classList.remove('active');
}


// ═══════════════════════════════════════════════════════════════
// MODAL CONTENT RENDERER
// ═══════════════════════════════════════════════════════════════

function _renderVipModalContent() {
    const tier = getVipTier();
    const tierIdx = getVipTierIndex();
    const nextTier = getNextVipTier();
    const progress = getVipProgress();
    const wagered = (stats && stats.totalWagered) || 0;

    const container = document.getElementById('vipModalInner');
    if (!container) return;

    container.innerHTML = `
        <!-- Header -->
        <div class="vip-modal-header">
            <h2>VIP REWARDS</h2>
            <button class="vip-close-btn" onclick="hideVipModal()" aria-label="Close">&times;</button>
        </div>

        <!-- Tier Card -->
        ${renderVipTierCard(tier)}

        <!-- Progress Bar -->
        ${_renderProgressSection(tier, nextTier, progress, wagered)}

        <!-- Current Benefits -->
        <div class="vip-benefits-section">
            <h4>YOUR BENEFITS</h4>
            <div class="vip-benefits-list">
                ${tier.benefits.map(b => `
                    <div class="vip-benefit-tag">
                        <span class="vip-benefit-check">\u2713</span> ${b}
                    </div>
                `).join('')}
            </div>
        </div>

        <!-- Weekly Reload -->
        ${_renderWeeklyReloadSection(tier)}

        <!-- Cashback Summary -->
        ${_renderCashbackSection(tier, wagered)}

        <!-- Tier Comparison Table -->
        ${_renderComparisonTable(tierIdx)}

        <!-- How to Level Up -->
        ${_renderTipsSection()}
    `;

    // Animate progress bar after DOM paint
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            const fill = container.querySelector('.vip-progress-fill');
            if (fill) fill.style.width = progress + '%';
        });
    });
}


// ═══════════════════════════════════════════════════════════════
// TIER CARD RENDERER (reusable)
// ═══════════════════════════════════════════════════════════════

/**
 * Renders a premium-looking VIP tier card.
 * @param {object} tier - A tier object from VIP_TIERS
 * @returns {string} HTML string
 */
function renderVipTierCard(tier) {
    return `
        <div class="vip-tier-card"
             style="--vip-color:${tier.color}; --vip-color-dark:${tier.colorDark};">
            <div class="vip-tier-card-border"></div>
            <div class="vip-tier-card-shimmer"></div>
            <div class="vip-tier-card-top">
                <div class="vip-tier-icon">${tier.icon}</div>
                <div class="vip-tier-info">
                    <h3>${tier.name}</h3>
                    <div class="vip-tier-subtitle">${currentUser ? currentUser.username || 'Player' : 'Player'} &bull; VIP Member</div>
                </div>
            </div>
            <div style="display:flex; gap:24px; flex-wrap:wrap;">
                <div>
                    <div style="font-size:10px; color:#64748b; text-transform:uppercase; letter-spacing:1px;">Cashback Rate</div>
                    <div style="font-size:22px; font-weight:900; color:${tier.color};">${tier.cashbackPct}%</div>
                </div>
                ${tier.weeklyReloadPct > 0 ? `
                <div>
                    <div style="font-size:10px; color:#64748b; text-transform:uppercase; letter-spacing:1px;">Weekly Reload</div>
                    <div style="font-size:22px; font-weight:900; color:${tier.color};">${tier.weeklyReloadPct}%</div>
                </div>
                ` : ''}
                <div>
                    <div style="font-size:10px; color:#64748b; text-transform:uppercase; letter-spacing:1px;">Total Wagered</div>
                    <div style="font-size:22px; font-weight:900; color:#e2e8f0;">${_vipFormatWagered((stats && stats.totalWagered) || 0)}</div>
                </div>
            </div>
        </div>
    `;
}


// ── Section Renderers ────────────────────────────────────────

function _renderProgressSection(tier, nextTier, progress, wagered) {
    if (!nextTier) {
        return `
            <div class="vip-progress-section" style="--vip-color:${tier.color}; --vip-color-dark:${tier.colorDark};">
                <div class="vip-progress-labels">
                    <span>Progress</span>
                    <span class="vip-progress-value" style="color:${tier.color};">MAX TIER ACHIEVED</span>
                </div>
                <div class="vip-progress-track">
                    <div class="vip-progress-fill" style="width:0%; background:linear-gradient(90deg,${tier.colorDark},${tier.color});"></div>
                </div>
                <div class="vip-progress-next" style="color:${tier.color}; font-weight:700;">
                    You have reached the pinnacle of VIP status!
                </div>
            </div>
        `;
    }

    const remaining = nextTier.minWagered - wagered;
    return `
        <div class="vip-progress-section" style="--vip-color:${nextTier.color}; --vip-color-dark:${nextTier.colorDark};">
            <div class="vip-progress-labels">
                <span>Progress to <strong style="color:${nextTier.color};">${nextTier.name}</strong></span>
                <span class="vip-progress-value">${progress.toFixed(1)}%</span>
            </div>
            <div class="vip-progress-track">
                <div class="vip-progress-fill" style="width:0%; background:linear-gradient(90deg,${tier.color},${nextTier.color});"></div>
            </div>
            <div class="vip-progress-next">
                Wager <strong>$${formatMoney(remaining)}</strong> more to reach <strong>${nextTier.name}</strong>
            </div>
        </div>
    `;
}

function _renderWeeklyReloadSection(tier) {
    if (tier.weeklyReloadPct <= 0) {
        return `
            <div class="vip-reload-section">
                <h4>WEEKLY RELOAD BONUS</h4>
                <p>Unlock the weekly reload bonus by reaching <strong style="color:${VIP_TIERS[1].color};">${VIP_TIERS[1].name}</strong> tier (wager $${formatMoney(VIP_TIERS[1].minWagered)}+).</p>
                <div class="vip-reload-unavailable">Currently available from Silver tier and above.</div>
            </div>
        `;
    }

    const cooldownMs = getWeeklyReloadCooldownRemaining();
    const canClaim = cooldownMs === 0;
    const bonusAmount = Math.min(
        (VIP_WEEKLY_RELOAD_BASE * tier.weeklyReloadPct) / 100,
        VIP_WEEKLY_RELOAD_MAX_BONUS
    );

    return `
        <div class="vip-reload-section">
            <h4>WEEKLY RELOAD BONUS</h4>
            <p>As a <span style="color:${tier.color}; font-weight:700;">${tier.name}</span> member, you receive a ${tier.weeklyReloadPct}% weekly reload — up to <strong>$${formatMoney(bonusAmount)}</strong>.</p>
            ${canClaim
                ? `<button class="vip-reload-btn vip-reload-btn--active" onclick="claimWeeklyReload()">CLAIM $${formatMoney(bonusAmount)}</button>`
                : `<button class="vip-reload-btn vip-reload-btn--disabled" disabled>CLAIMED</button>
                   <div class="vip-reload-unavailable">Next reload available in ${_vipFormatCooldown(cooldownMs)}</div>`
            }
        </div>
    `;
}

function _renderCashbackSection(tier, wagered) {
    const potentialCashback = calculateCashback(wagered);
    return `
        <div class="vip-cashback-section" style="--vip-color:${tier.color};">
            <div class="vip-cashback-card">
                <div class="vip-cashback-label">Cashback Rate</div>
                <div class="vip-cashback-value vip-cashback-value--accent">${tier.cashbackPct}%</div>
            </div>
            <div class="vip-cashback-card">
                <div class="vip-cashback-label">Lifetime Cashback Value</div>
                <div class="vip-cashback-value">$${formatMoney(potentialCashback)}</div>
            </div>
            <div class="vip-cashback-card">
                <div class="vip-cashback-label">Total Claimed</div>
                <div class="vip-cashback-value">$${formatMoney(vipState.totalCashbackClaimed)}</div>
            </div>
        </div>
    `;
}

function _renderComparisonTable(currentIdx) {
    const rows = VIP_TIERS.map((t, i) => {
        const isCurrent = i === currentIdx;
        const cls = isCurrent ? ' class="vip-table-current"' : '';
        return `
            <tr${cls}>
                <td class="vip-table-tier-cell" style="color:${t.color};">${t.icon} ${t.name}${isCurrent ? ' *' : ''}</td>
                <td>${t.minWagered === 0 ? '$0' : '$' + t.minWagered.toLocaleString()}${t.maxWagered === Infinity ? '+' : ' - $' + t.maxWagered.toLocaleString()}</td>
                <td style="color:${t.color}; font-weight:700;">${t.cashbackPct}%</td>
                <td>${t.weeklyReloadPct > 0 ? t.weeklyReloadPct + '%' : '--'}</td>
                <td>${t.benefits.length} perks</td>
            </tr>
        `;
    }).join('');

    return `
        <div class="vip-table-section">
            <h4>ALL VIP TIERS</h4>
            <div style="overflow-x:auto;">
                <table class="vip-comparison-table">
                    <thead>
                        <tr>
                            <th>Tier</th>
                            <th>Wagered</th>
                            <th>Cashback</th>
                            <th>Reload</th>
                            <th>Benefits</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        </div>
    `;
}

function _renderTipsSection() {
    return `
        <div class="vip-tips-section">
            <h4>HOW TO LEVEL UP</h4>
            <div class="vip-tips-list">
                <div class="vip-tip-item">
                    <div class="vip-tip-icon">\u{1F3B0}</div>
                    <div class="vip-tip-text">
                        <strong>Play More Games</strong>
                        Every wager counts toward your VIP tier. Try different slots to maximise variety and entertainment.
                    </div>
                </div>
                <div class="vip-tip-item">
                    <div class="vip-tip-icon">\u{1F4B0}</div>
                    <div class="vip-tip-text">
                        <strong>Increase Your Bet Size</strong>
                        Higher bets accelerate your progress through VIP tiers. Find a comfortable level and enjoy the ride.
                    </div>
                </div>
                <div class="vip-tip-item">
                    <div class="vip-tip-icon">\u{1F4C5}</div>
                    <div class="vip-tip-text">
                        <strong>Claim Weekly Reload</strong>
                        Silver tier and above earn weekly reload bonuses. Claim them every 7 days for free bonus funds.
                    </div>
                </div>
                <div class="vip-tip-item">
                    <div class="vip-tip-icon">\u{1F525}</div>
                    <div class="vip-tip-text">
                        <strong>Stay Consistent</strong>
                        Regular play builds your lifetime wagered total. VIP status never expires once earned.
                    </div>
                </div>
            </div>
        </div>
    `;
}


// ═══════════════════════════════════════════════════════════════
// VIP BADGE (header integration)
// ═══════════════════════════════════════════════════════════════

/**
 * Renders the VIP badge into the header.
 * Call this after page load and after each spin to keep it current.
 */
function renderVipBadge() {
    loadVipState();
    const tier = getVipTier();
    let badge = document.getElementById('vipHeaderBadge');

    if (!badge) {
        badge = document.createElement('button');
        badge.id = 'vipHeaderBadge';
        badge.className = 'vip-header-badge';
        badge.setAttribute('title', 'View VIP Rewards');
        badge.setAttribute('aria-label', 'VIP Rewards');
        badge.onclick = function () { showVipModal(); };

        // Insert before the WALLET button in header-actions
        const headerActions = document.querySelector('.header-actions');
        if (headerActions) {
            const walletBtn = headerActions.querySelector('.btn-deposit');
            if (walletBtn) {
                headerActions.insertBefore(badge, walletBtn);
            } else {
                headerActions.prepend(badge);
            }
        }
    }

    badge.style.borderColor = tier.color;
    badge.style.color = tier.color;
    badge.style.background = `linear-gradient(135deg, ${tier.color}15, ${tier.color}08)`;
    badge.innerHTML = `<span class="vip-header-badge-icon">${tier.icon}</span> ${tier.name.toUpperCase()}`;
}
