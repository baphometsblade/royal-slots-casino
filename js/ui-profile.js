// ═══════════════════════════════════════════════════════
// PROFILE / ACCOUNT MODULE
// ═══════════════════════════════════════════════════════
//
// Client-side profile & account management modal.
// Depends on: constants.js, globals.js (formatMoney, balance,
//   currentUser, stats), auth.js (apiRequest, logout),
//   ui-modals.js (showToast, addFunds)
//
// All functions are in the global scope (no ES modules).


// ── State ────────────────────────────────────────────────
let profileData = null;
let profileActiveTab = 'overview'; // 'overview' | 'security' | 'verification' | 'limits' | 'history'
let profileHistoryPage = 1;
let profileHistoryFilter = 'all';
const PROFILE_HISTORY_PAGE_SIZE = 15;

// ── Avatar colour palette keyed by first letter ─────────
const PROFILE_AVATAR_GRADIENTS = {
    A: ['#f97316', '#ef4444'], B: ['#8b5cf6', '#6366f1'], C: ['#06b6d4', '#3b82f6'],
    D: ['#ec4899', '#f43f5e'], E: ['#10b981', '#059669'], F: ['#f59e0b', '#d97706'],
    G: ['#14b8a6', '#0d9488'], H: ['#e11d48', '#be123c'], I: ['#6366f1', '#4f46e5'],
    J: ['#22c55e', '#16a34a'], K: ['#f472b6', '#db2777'], L: ['#a855f7', '#9333ea'],
    M: ['#fb923c', '#ea580c'], N: ['#2dd4bf', '#14b8a6'], O: ['#60a5fa', '#3b82f6'],
    P: ['#c084fc', '#a855f7'], Q: ['#4ade80', '#22c55e'], R: ['#f87171', '#ef4444'],
    S: ['#fbbf24', '#f59e0b'], T: ['#38bdf8', '#0ea5e9'], U: ['#818cf8', '#6366f1'],
    V: ['#fb7185', '#f43f5e'], W: ['#a78bfa', '#8b5cf6'], X: ['#34d399', '#10b981'],
    Y: ['#fcd34d', '#fbbf24'], Z: ['#f472b6', '#ec4899']
};

function getAvatarGradient(username) {
    const letter = (username || 'A').charAt(0).toUpperCase();
    const pair = PROFILE_AVATAR_GRADIENTS[letter] || ['#fbbf24', '#f59e0b'];
    return `linear-gradient(135deg, ${pair[0]}, ${pair[1]})`;
}

function getAvatarInitials(username) {
    if (!username) return '?';
    const parts = username.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return username.substring(0, 2).toUpperCase();
}


// ═══════════════════════════════════════════════════════
// INJECT MODAL HTML + STYLES (once)
// ═══════════════════════════════════════════════════════

(function injectProfileModal() {
    // ── CSS ──────────────────────────────────────────────
    const style = document.createElement('style');
    style.textContent = `
/* ── Profile Modal ─────────────────────────────────── */
.profile-modal-wrapper {
    display: none;
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.92);
    z-index: 2000;
    overflow-y: auto;
    padding: 20px;
    animation: profile-fadeIn 0.25s ease-out;
}
.profile-modal-wrapper.active {
    display: flex;
    align-items: flex-start;
    justify-content: center;
}

@keyframes profile-fadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
}

.profile-modal {
    display: flex;
    width: 100%;
    max-width: 960px;
    min-height: 560px;
    background: linear-gradient(160deg, #0f172a 0%, #1e1b3a 100%);
    border: 1px solid rgba(251, 191, 36, 0.25);
    border-radius: 20px;
    overflow: hidden;
    box-shadow: 0 24px 80px rgba(0, 0, 0, 0.7), 0 0 40px rgba(251, 191, 36, 0.08);
    margin-top: 30px;
    margin-bottom: 30px;
}

/* ── Sidebar ───────────────────────────────────────── */
.profile-sidebar {
    width: 220px;
    min-width: 220px;
    background: rgba(15, 23, 42, 0.8);
    border-right: 1px solid rgba(251, 191, 36, 0.15);
    padding: 28px 0 20px;
    display: flex;
    flex-direction: column;
}

.profile-sidebar-avatar {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 28px;
    font-weight: 800;
    color: #fff;
    margin: 0 auto 12px;
    border: 3px solid rgba(251, 191, 36, 0.5);
    box-shadow: 0 4px 20px rgba(251, 191, 36, 0.2);
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.4);
    letter-spacing: 2px;
}

.profile-sidebar-name {
    text-align: center;
    font-size: 15px;
    font-weight: 700;
    color: #e2e8f0;
    margin-bottom: 4px;
    padding: 0 12px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.profile-sidebar-email {
    text-align: center;
    font-size: 11px;
    color: #64748b;
    margin-bottom: 24px;
    padding: 0 12px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.profile-nav {
    list-style: none;
    padding: 0;
    margin: 0;
    flex: 1;
}

.profile-nav-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 20px;
    font-size: 13px;
    font-weight: 600;
    color: #94a3b8;
    cursor: pointer;
    transition: all 0.2s;
    border-left: 3px solid transparent;
}

.profile-nav-item:hover {
    color: #e2e8f0;
    background: rgba(251, 191, 36, 0.06);
}

.profile-nav-item.active {
    color: #fbbf24;
    background: rgba(251, 191, 36, 0.1);
    border-left-color: #fbbf24;
}

.profile-nav-item .profile-nav-icon {
    font-size: 16px;
    width: 22px;
    text-align: center;
}

.profile-sidebar-footer {
    padding: 16px 20px 0;
    border-top: 1px solid rgba(100, 116, 139, 0.2);
    margin-top: 12px;
}

.profile-sidebar-footer button {
    width: 100%;
    padding: 10px;
    border: 1px solid #dc2626;
    border-radius: 8px;
    background: rgba(220, 38, 38, 0.1);
    color: #fca5a5;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s;
}

.profile-sidebar-footer button:hover {
    background: rgba(220, 38, 38, 0.25);
    color: #fff;
}

/* ── Main Content ──────────────────────────────────── */
.profile-content {
    flex: 1;
    padding: 32px;
    overflow-y: auto;
    max-height: 80vh;
}

.profile-close-btn {
    position: absolute;
    top: 16px;
    right: 20px;
    background: none;
    border: none;
    color: #94a3b8;
    font-size: 28px;
    cursor: pointer;
    line-height: 1;
    z-index: 10;
    transition: color 0.2s;
}
.profile-close-btn:hover { color: #fbbf24; }

.profile-section-title {
    font-size: 20px;
    font-weight: 800;
    color: #fbbf24;
    margin-bottom: 20px;
    letter-spacing: 0.5px;
}

.profile-card {
    background: rgba(30, 41, 59, 0.6);
    border: 1px solid rgba(100, 116, 139, 0.2);
    border-radius: 14px;
    padding: 20px;
    margin-bottom: 20px;
}

.profile-card-title {
    font-size: 12px;
    font-weight: 700;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 14px;
}

/* ── Overview Tab ──────────────────────────────────── */
.profile-overview-header {
    display: flex;
    align-items: center;
    gap: 24px;
    margin-bottom: 24px;
}

.profile-avatar-large {
    width: 100px;
    height: 100px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 36px;
    font-weight: 800;
    color: #fff;
    border: 4px solid rgba(251, 191, 36, 0.5);
    box-shadow: 0 6px 28px rgba(251, 191, 36, 0.25);
    text-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
    letter-spacing: 2px;
    flex-shrink: 0;
}

.profile-header-info {
    flex: 1;
    min-width: 0;
}

.profile-header-username {
    font-size: 22px;
    font-weight: 800;
    color: #f1f5f9;
    margin-bottom: 2px;
}

.profile-header-meta {
    font-size: 12px;
    color: #64748b;
    margin-bottom: 8px;
}

.profile-header-balance {
    display: flex;
    align-items: center;
    gap: 12px;
}

.profile-balance-amount {
    font-size: 24px;
    font-weight: 800;
    color: #fbbf24;
}

.profile-deposit-btn {
    padding: 6px 16px;
    border: 1px solid rgba(251, 191, 36, 0.4);
    border-radius: 8px;
    background: rgba(251, 191, 36, 0.12);
    color: #fbbf24;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s;
}
.profile-deposit-btn:hover {
    background: rgba(251, 191, 36, 0.25);
}

.profile-kyc-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 11px;
    font-weight: 700;
    margin-top: 6px;
}
.profile-kyc-badge.unverified { background: rgba(239, 68, 68, 0.15); color: #fca5a5; border: 1px solid rgba(239, 68, 68, 0.3); }
.profile-kyc-badge.pending    { background: rgba(251, 191, 36, 0.15); color: #fbbf24; border: 1px solid rgba(251, 191, 36, 0.3); }
.profile-kyc-badge.verified   { background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); }

/* Quick Stats */
.profile-quick-stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    margin-bottom: 20px;
}

.profile-stat-box {
    background: rgba(15, 23, 42, 0.6);
    border: 1px solid rgba(100, 116, 139, 0.15);
    border-radius: 12px;
    padding: 14px;
    text-align: center;
}

.profile-stat-value {
    font-size: 18px;
    font-weight: 800;
    color: #fbbf24;
    margin-bottom: 4px;
}

.profile-stat-label {
    font-size: 10px;
    font-weight: 600;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

/* ── Form Elements ─────────────────────────────────── */
.profile-form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
}

.profile-field {
    display: flex;
    flex-direction: column;
    gap: 5px;
}

.profile-field.full-width {
    grid-column: 1 / -1;
}

.profile-field label {
    font-size: 11px;
    font-weight: 700;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.profile-field input,
.profile-field select {
    background: rgba(15, 23, 42, 0.8);
    border: 1px solid rgba(100, 116, 139, 0.3);
    border-radius: 8px;
    padding: 10px 12px;
    font-size: 13px;
    color: #e2e8f0;
    outline: none;
    transition: border-color 0.2s;
    font-family: inherit;
}

.profile-field input:focus,
.profile-field select:focus {
    border-color: rgba(251, 191, 36, 0.5);
    box-shadow: 0 0 0 3px rgba(251, 191, 36, 0.08);
}

.profile-field input::placeholder { color: #475569; }

.profile-btn {
    padding: 10px 24px;
    border: none;
    border-radius: 10px;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s;
    letter-spacing: 0.3px;
}

.profile-btn-primary {
    background: linear-gradient(135deg, #fbbf24, #f59e0b);
    color: #000;
}
.profile-btn-primary:hover {
    background: linear-gradient(135deg, #fcd34d, #fbbf24);
    transform: translateY(-1px);
    box-shadow: 0 4px 16px rgba(251, 191, 36, 0.3);
}

.profile-btn-danger {
    background: rgba(220, 38, 38, 0.15);
    color: #fca5a5;
    border: 1px solid rgba(220, 38, 38, 0.3);
}
.profile-btn-danger:hover {
    background: rgba(220, 38, 38, 0.3);
    color: #fff;
}

.profile-btn-outline {
    background: transparent;
    color: #94a3b8;
    border: 1px solid rgba(100, 116, 139, 0.3);
}
.profile-btn-outline:hover {
    background: rgba(100, 116, 139, 0.1);
    color: #e2e8f0;
}

.profile-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none !important;
}

/* ── Security Tab ──────────────────────────────────── */
.profile-pw-form {
    display: flex;
    flex-direction: column;
    gap: 12px;
    max-width: 380px;
}

.profile-session-info {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 16px;
    background: rgba(15, 23, 42, 0.6);
    border-radius: 10px;
    border: 1px solid rgba(100, 116, 139, 0.15);
    font-size: 12px;
    color: #94a3b8;
}

.profile-session-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #22c55e;
    box-shadow: 0 0 8px rgba(34, 197, 94, 0.5);
}

/* ── Verification Tab ──────────────────────────────── */
.profile-verify-status {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 20px;
    border-radius: 14px;
    margin-bottom: 20px;
}
.profile-verify-status.unverified { background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.2); }
.profile-verify-status.pending    { background: rgba(251, 191, 36, 0.08); border: 1px solid rgba(251, 191, 36, 0.2); }
.profile-verify-status.verified   { background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.2); }

.profile-verify-icon {
    font-size: 36px;
}

.profile-verify-text h3 {
    font-size: 16px;
    font-weight: 700;
    color: #e2e8f0;
    margin: 0 0 4px;
}

.profile-verify-text p {
    font-size: 12px;
    color: #94a3b8;
    margin: 0;
}

.profile-benefits-list {
    list-style: none;
    padding: 0;
    margin: 0 0 20px;
}

.profile-benefits-list li {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 0;
    font-size: 13px;
    color: #cbd5e1;
    border-bottom: 1px solid rgba(100, 116, 139, 0.1);
}

.profile-benefits-list li:last-child { border-bottom: none; }

.profile-benefit-check {
    color: #22c55e;
    font-weight: 700;
}

/* ── Limits Tab ────────────────────────────────────── */
.profile-limits-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
}

.profile-limit-field {
    display: flex;
    flex-direction: column;
    gap: 5px;
}

.profile-limit-field label {
    font-size: 11px;
    font-weight: 700;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.profile-limit-field input,
.profile-limit-field select {
    background: rgba(15, 23, 42, 0.8);
    border: 1px solid rgba(100, 116, 139, 0.3);
    border-radius: 8px;
    padding: 10px 12px;
    font-size: 13px;
    color: #e2e8f0;
    outline: none;
    transition: border-color 0.2s;
    font-family: inherit;
}

.profile-limit-field input:focus,
.profile-limit-field select:focus {
    border-color: rgba(251, 191, 36, 0.5);
}

.profile-self-exclude-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}

.profile-self-exclude-btn {
    padding: 8px 16px;
    border: 1px solid rgba(239, 68, 68, 0.3);
    border-radius: 8px;
    background: rgba(239, 68, 68, 0.08);
    color: #fca5a5;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
}

.profile-self-exclude-btn:hover {
    background: rgba(239, 68, 68, 0.2);
    color: #fff;
}

.profile-rg-notice {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 14px 16px;
    background: rgba(59, 130, 246, 0.08);
    border: 1px solid rgba(59, 130, 246, 0.2);
    border-radius: 12px;
    font-size: 12px;
    color: #93c5fd;
    line-height: 1.5;
}

.profile-rg-notice a {
    color: #60a5fa;
    text-decoration: underline;
}

/* ── History Tab ───────────────────────────────────── */
.profile-history-filters {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    margin-bottom: 16px;
}

.profile-filter-btn {
    padding: 6px 14px;
    border: 1px solid rgba(100, 116, 139, 0.25);
    border-radius: 20px;
    background: transparent;
    color: #94a3b8;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    text-transform: uppercase;
    letter-spacing: 0.3px;
}

.profile-filter-btn:hover {
    border-color: rgba(251, 191, 36, 0.3);
    color: #e2e8f0;
}

.profile-filter-btn.active {
    background: rgba(251, 191, 36, 0.15);
    color: #fbbf24;
    border-color: rgba(251, 191, 36, 0.4);
}

.profile-history-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
}

.profile-history-table th {
    text-align: left;
    padding: 10px 12px;
    font-size: 10px;
    font-weight: 700;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    border-bottom: 1px solid rgba(100, 116, 139, 0.2);
}

.profile-history-table td {
    padding: 10px 12px;
    color: #cbd5e1;
    border-bottom: 1px solid rgba(100, 116, 139, 0.08);
}

.profile-history-table tr:hover td {
    background: rgba(251, 191, 36, 0.03);
}

.profile-history-type {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
}

.profile-history-type.deposit    { background: rgba(16, 185, 129, 0.15); color: #34d399; }
.profile-history-type.withdrawal { background: rgba(239, 68, 68, 0.15); color: #fca5a5; }
.profile-history-type.spin       { background: rgba(99, 102, 241, 0.15); color: #a5b4fc; }
.profile-history-type.bonus      { background: rgba(251, 191, 36, 0.15); color: #fbbf24; }
.profile-history-type.win        { background: rgba(16, 185, 129, 0.15); color: #34d399; }

.profile-pagination {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    margin-top: 16px;
}

.profile-page-btn {
    padding: 6px 14px;
    border: 1px solid rgba(100, 116, 139, 0.25);
    border-radius: 8px;
    background: transparent;
    color: #94a3b8;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
}
.profile-page-btn:hover { background: rgba(100, 116, 139, 0.1); color: #e2e8f0; }
.profile-page-btn:disabled { opacity: 0.3; cursor: not-allowed; }

.profile-page-info {
    font-size: 12px;
    color: #64748b;
}

/* ── Empty state ───────────────────────────────────── */
.profile-empty {
    text-align: center;
    padding: 40px 20px;
    color: #64748b;
    font-size: 13px;
}

.profile-empty-icon {
    font-size: 40px;
    margin-bottom: 12px;
    opacity: 0.5;
}

/* ── Loading spinner ───────────────────────────────── */
.profile-loading {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 60px 20px;
}

.profile-spinner {
    width: 36px;
    height: 36px;
    border: 3px solid rgba(251, 191, 36, 0.15);
    border-top-color: #fbbf24;
    border-radius: 50%;
    animation: profile-spin 0.8s linear infinite;
}

@keyframes profile-spin {
    to { transform: rotate(360deg); }
}

/* ── Responsible gambling banner ───────────────────── */
.profile-rg-banner {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    background: rgba(251, 191, 36, 0.06);
    border: 1px solid rgba(251, 191, 36, 0.15);
    border-radius: 10px;
    font-size: 11px;
    color: #94a3b8;
    margin-top: 20px;
}

.profile-rg-banner strong {
    color: #fbbf24;
}

/* ── Mobile: horizontal tab bar ────────────────────── */
.profile-mobile-tabs {
    display: none;
    overflow-x: auto;
    gap: 4px;
    padding: 12px 16px;
    border-bottom: 1px solid rgba(100, 116, 139, 0.15);
    background: rgba(15, 23, 42, 0.6);
    -webkit-overflow-scrolling: touch;
}

.profile-mobile-tab {
    flex-shrink: 0;
    padding: 8px 14px;
    border: 1px solid rgba(100, 116, 139, 0.2);
    border-radius: 20px;
    background: transparent;
    color: #94a3b8;
    font-size: 11px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;
}

.profile-mobile-tab:hover { color: #e2e8f0; }
.profile-mobile-tab.active {
    background: rgba(251, 191, 36, 0.15);
    color: #fbbf24;
    border-color: rgba(251, 191, 36, 0.4);
}

@media (max-width: 680px) {
    .profile-modal {
        flex-direction: column;
        min-height: auto;
        margin-top: 10px;
    }
    .profile-sidebar { display: none; }
    .profile-mobile-tabs { display: flex; }
    .profile-content { padding: 20px 16px; max-height: none; }
    .profile-overview-header { flex-direction: column; text-align: center; }
    .profile-header-balance { justify-content: center; }
    .profile-quick-stats { grid-template-columns: 1fr; }
    .profile-form-grid { grid-template-columns: 1fr; }
    .profile-limits-grid { grid-template-columns: 1fr; }
}
    `;
    document.head.appendChild(style);

    // ── HTML shell ───────────────────────────────────────
    const wrapper = document.createElement('div');
    wrapper.id = 'profileModal';
    wrapper.className = 'profile-modal-wrapper';
    wrapper.setAttribute('role', 'dialog');
    wrapper.setAttribute('aria-label', 'Account profile');
    wrapper.innerHTML = `
        <div class="profile-modal" style="position:relative;">
            <button class="profile-close-btn" onclick="hideProfileModal()" title="Close" aria-label="Close profile">&times;</button>

            <!-- Sidebar (desktop) -->
            <nav class="profile-sidebar" id="profileSidebar"></nav>

            <div style="flex:1; display:flex; flex-direction:column; min-width:0;">
                <!-- Mobile tab bar -->
                <div class="profile-mobile-tabs" id="profileMobileTabs"></div>

                <!-- Main body -->
                <div class="profile-content" id="profileContent">
                    <div class="profile-loading"><div class="profile-spinner"></div></div>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(wrapper);

    // Close on backdrop click
    wrapper.addEventListener('click', function (e) {
        if (e.target === wrapper) hideProfileModal();
    });
})();


// ═══════════════════════════════════════════════════════
// SHOW / HIDE
// ═══════════════════════════════════════════════════════

function showProfileModal() {
    if (!currentUser) {
        showToast('Please log in to view your profile.', 'error');
        return;
    }
    const modal = document.getElementById('profileModal');
    modal.classList.add('active');
    profileActiveTab = 'overview';
    renderProfileSidebar();
    renderMobileTabs();
    loadProfile();
}

function hideProfileModal() {
    document.getElementById('profileModal').classList.remove('active');
}


// ═══════════════════════════════════════════════════════
// SIDEBAR + MOBILE TABS
// ═══════════════════════════════════════════════════════

const PROFILE_TABS = [
    { id: 'overview',     icon: '\u{1F464}', label: 'Overview' },
    { id: 'referrals',    icon: '\u{1F517}', label: 'Referrals' },
    { id: 'security',     icon: '\u{1F512}', label: 'Security' },
    { id: 'verification', icon: '\u{2705}',  label: 'Verification' },
    { id: 'limits',       icon: '\u{1F6E1}\uFE0F', label: 'Responsible Play' },
    { id: 'history',      icon: '\u{1F4CB}', label: 'History' },
    { id: 'badges',       icon: '\u{1F3C5}', label: 'Badges' }
];

function renderProfileSidebar() {
    const sidebar = document.getElementById('profileSidebar');
    const uname = currentUser ? currentUser.username : 'Guest';
    const email = currentUser ? (currentUser.email || '') : '';
    const grad = getAvatarGradient(uname);
    const initials = getAvatarInitials(uname);

    sidebar.innerHTML = `
        <div class="profile-sidebar-avatar" style="background:${grad};">${initials}</div>
        <div class="profile-sidebar-name">${escapeHtml(uname)}</div>
        <div class="profile-sidebar-email">${escapeHtml(email)}</div>
        <ul class="profile-nav">
            ${PROFILE_TABS.map(t => `
                <li class="profile-nav-item ${t.id === profileActiveTab ? 'active' : ''}" onclick="switchProfileTab('${t.id}')">
                    <span class="profile-nav-icon">${t.icon}</span>
                    <span>${t.label}</span>
                </li>
            `).join('')}
        </ul>
        <div class="profile-sidebar-footer">
            <button onclick="profileLogout()">Sign Out</button>
        </div>
    `;
}

function renderMobileTabs() {
    const bar = document.getElementById('profileMobileTabs');
    bar.innerHTML = PROFILE_TABS.map(t => `
        <button class="profile-mobile-tab ${t.id === profileActiveTab ? 'active' : ''}" onclick="switchProfileTab('${t.id}')">
            ${t.icon} ${t.label}
        </button>
    `).join('');
}

function switchProfileTab(tab) {
    profileActiveTab = tab;
    // Reset history pagination when switching tabs
    if (tab === 'history') {
        profileHistoryPage = 1;
        profileHistoryFilter = 'all';
    }
    renderProfileSidebar();
    renderMobileTabs();
    renderProfileContent();
}


// ═══════════════════════════════════════════════════════
// LOAD PROFILE DATA
// ═══════════════════════════════════════════════════════

async function loadProfile() {
    const content = document.getElementById('profileContent');
    content.innerHTML = '<div class="profile-loading"><div class="profile-spinner"></div></div>';

    try {
        const data = await apiRequest('/api/user/profile', { requireAuth: true });
        profileData = data;
    } catch (err) {
        // Build local profile from client state when server is unreachable
        profileData = {
            username: currentUser ? currentUser.username : 'Guest',
            email: currentUser ? (currentUser.email || '') : '',
            display_name: '',
            phone: '',
            country: '',
            date_of_birth: '',
            currency: 'USD',
            member_since: null,
            kyc_status: 'unverified',
            limits: { daily_deposit: '', weekly_deposit: '', monthly_deposit: '', daily_loss: '', session_time: '' },
            transactions: []
        };
    }

    renderProfileContent();
}


// ═══════════════════════════════════════════════════════
// MASTER RENDER
// ═══════════════════════════════════════════════════════

function renderProfileContent() {
    switch (profileActiveTab) {
        case 'overview':      renderProfileOverview(); break;
        case 'referrals':     renderReferralsTab(); break;
        case 'security':      renderSecurityTab(); break;
        case 'verification':  renderVerificationTab(); break;
        case 'limits':        renderLimitsTab(); break;
        case 'history':       renderHistoryTab(); break;
        case 'badges':        renderBadgeGallery(); break;
        default:              renderProfileOverview();
    }
}


// ═══════════════════════════════════════════════════════
// REFERRALS TAB
// ═══════════════════════════════════════════════════════

function _makeRewardCard(amount, label) {
    var card = document.createElement('div');
    card.className = 'referral-reward-card';
    var amtEl = document.createElement('div');
    amtEl.className = 'referral-reward-amount';
    amtEl.textContent = '$' + formatMoney(amount);
    card.appendChild(amtEl);
    var lblEl = document.createElement('div');
    lblEl.className = 'referral-reward-label';
    lblEl.textContent = label;
    card.appendChild(lblEl);
    return card;
}

function _makeStatCard(value, label) {
    var card = document.createElement('div');
    card.className = 'referral-stat-card';
    var valEl = document.createElement('div');
    valEl.className = 'referral-stat-value';
    valEl.textContent = value;
    card.appendChild(valEl);
    var lblEl = document.createElement('div');
    lblEl.className = 'referral-stat-label';
    lblEl.textContent = label;
    card.appendChild(lblEl);
    return card;
}

async function renderReferralsTab() {
    var el = document.getElementById('profileContent');
    el.textContent = '';
    var spinner = document.createElement('div');
    spinner.className = 'profile-loading';
    var sp = document.createElement('div');
    sp.className = 'profile-spinner';
    spinner.appendChild(sp);
    el.appendChild(spinner);

    var data = null;
    try {
        data = await apiRequest('/api/user/referral', { requireAuth: true });
    } catch (e) { /* offline */ }

    var code = (data && data.referralCode) ? data.referralCode : '---';
    var count = (data && data.referralCount) ? data.referralCount : 0;
    var earned = (data && data.totalEarned) ? data.totalEarned : 0;
    var perRef = (data && data.bonusPerReferral) ? data.bonusPerReferral : 500;
    var refBonus = (data && data.refereeBonusAmount) ? data.refereeBonusAmount : 250;
    var origin = window.location.origin || 'https://www.msaart.online';
    var shareLink = origin + '?ref=' + code;

    el.textContent = '';

    var header = document.createElement('h2');
    header.className = 'profile-section-title';
    header.textContent = 'Invite Friends & Earn';
    el.appendChild(header);

    var desc = document.createElement('p');
    desc.style.cssText = 'color:#94a3b8; margin-bottom:20px; font-size:14px; line-height:1.5;';
    desc.textContent = 'Share your referral code with friends. When they sign up and make their first deposit ($' +
        (typeof REFERRAL_MIN_DEPOSIT !== 'undefined' ? REFERRAL_MIN_DEPOSIT : 10) + '+), you both earn bonus cash!';
    el.appendChild(desc);

    // Rewards info cards
    var rewardsRow = document.createElement('div');
    rewardsRow.style.cssText = 'display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:24px;';
    rewardsRow.appendChild(_makeRewardCard(perRef, 'You receive'));
    rewardsRow.appendChild(_makeRewardCard(refBonus, 'Friend receives'));
    el.appendChild(rewardsRow);

    // Referral code display + copy button
    var codeSection = document.createElement('div');
    codeSection.className = 'referral-code-section';

    var codeLabel = document.createElement('label');
    codeLabel.textContent = 'Your Referral Code';
    codeLabel.style.cssText = 'color:#e2e8f0; font-size:12px; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:8px; display:block;';
    codeSection.appendChild(codeLabel);

    var codeRow = document.createElement('div');
    codeRow.style.cssText = 'display:flex; gap:8px; align-items:center;';

    var codeDisplay = document.createElement('div');
    codeDisplay.className = 'referral-code-display';
    codeDisplay.textContent = code;
    codeRow.appendChild(codeDisplay);

    var copyBtn = document.createElement('button');
    copyBtn.className = 'referral-copy-btn';
    copyBtn.textContent = 'COPY';
    copyBtn.onclick = function() {
        navigator.clipboard.writeText(code).then(function() {
            copyBtn.textContent = 'COPIED!';
            setTimeout(function() { copyBtn.textContent = 'COPY'; }, 2000);
        });
    };
    codeRow.appendChild(copyBtn);
    codeSection.appendChild(codeRow);
    el.appendChild(codeSection);

    // Share link
    var linkSection = document.createElement('div');
    linkSection.style.cssText = 'margin-top:16px;';

    var linkLabel = document.createElement('label');
    linkLabel.textContent = 'Share Link';
    linkLabel.style.cssText = 'color:#e2e8f0; font-size:12px; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:8px; display:block;';
    linkSection.appendChild(linkLabel);

    var linkRow = document.createElement('div');
    linkRow.style.cssText = 'display:flex; gap:8px; align-items:center;';

    var linkInput = document.createElement('input');
    linkInput.type = 'text';
    linkInput.readOnly = true;
    linkInput.value = shareLink;
    linkInput.className = 'referral-link-input';
    linkRow.appendChild(linkInput);

    var linkCopy = document.createElement('button');
    linkCopy.className = 'referral-copy-btn';
    linkCopy.textContent = 'COPY';
    linkCopy.onclick = function() {
        navigator.clipboard.writeText(shareLink).then(function() {
            linkCopy.textContent = 'COPIED!';
            setTimeout(function() { linkCopy.textContent = 'COPY'; }, 2000);
        });
    };
    linkRow.appendChild(linkCopy);
    linkSection.appendChild(linkRow);
    el.appendChild(linkSection);

    // Stats
    var statsSection = document.createElement('div');
    statsSection.style.cssText = 'margin-top:24px; display:grid; grid-template-columns:1fr 1fr; gap:12px;';
    statsSection.appendChild(_makeStatCard(String(count), 'Friends Referred'));
    statsSection.appendChild(_makeStatCard('$' + formatMoney(earned), 'Total Earned'));
    el.appendChild(statsSection);
}

// ═══════════════════════════════════════════════════════
// OVERVIEW TAB
// ═══════════════════════════════════════════════════════

function renderProfileOverview() {
    const el = document.getElementById('profileContent');
    const d = profileData || {};
    const uname = d.username || (currentUser ? currentUser.username : 'Guest');
    const email = d.email || (currentUser ? (currentUser.email || '') : '');
    const memberSince = d.member_since ? new Date(d.member_since).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A';
    const kycStatus = d.kyc_status || 'unverified';
    const kycLabels = { unverified: 'Unverified', pending: 'Pending Review', verified: 'Verified' };
    const kycIcons  = { unverified: '\u26A0\uFE0F', pending: '\u23F3', verified: '\u2705' };

    const totalWagered = stats ? stats.totalWagered : 0;
    const totalWon     = stats ? stats.totalWon : 0;
    const biggestWin   = stats ? stats.biggestWin : 0;

    // --- Extra stats ---
    const winRate    = stats && stats.totalSpins > 0 ? Math.round((stats.totalWins || 0) / stats.totalSpins * 100) : 0;
    const totalSpins = stats && stats.totalSpins || 0;

    // --- Net P&L ---
    const pnl        = totalWon - totalWagered;
    const pnlClass   = pnl > 0 ? 'pos' : pnl < 0 ? 'neg' : 'neutral';
    const pnlSign    = pnl >= 0 ? '+' : '';
    const pnlArrow   = pnl > 0 ? '▲' : pnl < 0 ? '▼' : '';
    const returnRate = totalWagered > 0 ? Math.round((totalWon / totalWagered) * 100) : 0;
    const rrClass    = returnRate >= 100 ? 'pos' : returnRate > 0 ? 'neutral' : 'neg';

    // --- XP progress ---
    let xpData = { level: 1, xp: 0, totalXp: 0 };
    try { const raw = localStorage.getItem('matrixXP'); if (raw) xpData = JSON.parse(raw); } catch(e) {}
    const xpForLevel  = (xpData.level || 1) * 1000;
    const xpInLevel   = (xpData.xp || 0) % xpForLevel;
    const xpPct       = Math.round((xpInLevel / xpForLevel) * 100);
    const toNextLevel = xpForLevel - xpInLevel;

    // --- CSS injection (once) ---
    if (!document.getElementById('profileEnhCss')) {
        const s = document.createElement('style');
        s.id = 'profileEnhCss';
        s.textContent = `
.profile-quick-stats { flex-wrap: wrap; }
.profile-stat-box { min-width: 80px; }
.profile-pnl-row {
  display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
  padding: 8px 12px; margin: 8px 0;
  background: rgba(255,255,255,0.03); border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.07); font-size: 12px;
}
.profile-pnl-label { color: rgba(255,255,255,0.5); }
.profile-pnl-pos { color: #66bb6a; font-weight: 700; }
.profile-pnl-neg { color: #ef5350; font-weight: 700; }
.profile-pnl-neutral { color: rgba(255,255,255,0.5); }
.profile-pnl-divider { color: rgba(255,255,255,0.2); }
.profile-xp-section {
  padding: 10px 12px; margin: 8px 0;
  background: rgba(255,255,255,0.03); border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.07);
}
.profile-xp-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; font-size:12px; }
.profile-xp-level-badge { font-weight:700; color:#ffd54f; }
.profile-xp-next-label { color:rgba(255,255,255,0.4); font-size:11px; }
.profile-xp-bar-track { height:7px; background:rgba(255,255,255,0.1); border-radius:4px; overflow:hidden; margin-bottom:5px; }
.profile-xp-bar-fill { height:100%; border-radius:4px; background:linear-gradient(90deg,#7b61ff,#00bcd4); transition:width 0.7s ease; width:0%; }
.profile-xp-counts { display:flex; justify-content:space-between; font-size:10px; color:rgba(255,255,255,0.4); }
        `;
        document.head.appendChild(s);
    }

    el.innerHTML = `
        <div class="profile-section-title">Account Overview</div>

        <div class="profile-overview-header">
            <div class="profile-avatar-large" style="background:${getAvatarGradient(uname)};">
                ${getAvatarInitials(uname)}
            </div>
            <div class="profile-header-info">
                <div class="profile-header-username">${escapeHtml(uname)}</div>
                <div class="profile-header-meta">${escapeHtml(email)} &middot; Member since ${memberSince}</div>
                <div class="profile-header-balance">
                    <span class="profile-balance-amount">$${formatMoney(balance)}</span>
                    <button class="profile-deposit-btn" onclick="hideProfileModal(); addFunds();">Deposit</button>
                </div>
                <span class="profile-kyc-badge ${kycStatus}">${kycIcons[kycStatus]} ${kycLabels[kycStatus]}</span>
            </div>
        </div>

        <div class="profile-quick-stats">
            <div class="profile-stat-box">
                <div class="profile-stat-value">$${formatMoney(totalWagered)}</div>
                <div class="profile-stat-label">Total Wagered</div>
            </div>
            <div class="profile-stat-box">
                <div class="profile-stat-value">$${formatMoney(totalWon)}</div>
                <div class="profile-stat-label">Total Won</div>
            </div>
            <div class="profile-stat-box">
                <div class="profile-stat-value">$${formatMoney(biggestWin)}</div>
                <div class="profile-stat-label">Biggest Win</div>
            </div>
            <div class="profile-stat-box">
                <div class="profile-stat-value">${winRate}%</div>
                <div class="profile-stat-label">Win Rate</div>
            </div>
            <div class="profile-stat-box">
                <div class="profile-stat-value">${totalSpins.toLocaleString()}</div>
                <div class="profile-stat-label">Total Spins</div>
            </div>
        </div>

        <div class="profile-pnl-row">
            <span class="profile-pnl-label">Net P&amp;L:</span>
            <span class="profile-pnl-${pnlClass}">${pnlSign}$${formatMoney(Math.abs(pnl))} ${pnlArrow}</span>
            <span class="profile-pnl-divider">|</span>
            <span class="profile-pnl-label">Return Rate:</span>
            <span class="profile-pnl-${rrClass}">${returnRate}%</span>
        </div>

        <div class="profile-xp-section">
            <div class="profile-xp-header">
                <span class="profile-xp-level-badge">⭐ Level ${xpData.level}</span>
                <span class="profile-xp-next-label">${toNextLevel.toLocaleString()} XP to next level</span>
            </div>
            <div class="profile-xp-bar-track">
                <div class="profile-xp-bar-fill" style="width:0%"></div>
            </div>
            <div class="profile-xp-counts">
                <span>${xpInLevel.toLocaleString()} XP</span>
                <span>${xpForLevel.toLocaleString()} XP</span>
            </div>
        </div>

        <div class="profile-card">
            <div class="profile-card-title">Edit Profile</div>
            <div class="profile-form-grid">
                <div class="profile-field">
                    <label for="profileDisplayName">Display Name</label>
                    <input type="text" id="profileDisplayName" placeholder="Your display name" value="${escapeAttr(d.display_name || '')}" maxlength="40">
                </div>
                <div class="profile-field">
                    <label for="profilePhone">Phone</label>
                    <input type="tel" id="profilePhone" placeholder="+1 (555) 000-0000" value="${escapeAttr(d.phone || '')}" maxlength="20">
                </div>
                <div class="profile-field">
                    <label for="profileCountry">Country</label>
                    <select id="profileCountry">
                        <option value="">Select country</option>
                        ${buildCountryOptions(d.country)}
                    </select>
                </div>
                <div class="profile-field">
                    <label for="profileDOB">Date of Birth</label>
                    <input type="date" id="profileDOB" value="${escapeAttr(d.date_of_birth || '')}">
                </div>
                <div class="profile-field">
                    <label for="profileCurrency">Preferred Currency</label>
                    <select id="profileCurrency">
                        ${['USD','EUR','GBP','CAD','AUD','JPY'].map(c => `<option value="${c}" ${d.currency === c ? 'selected' : ''}>${c}</option>`).join('')}
                    </select>
                </div>
            </div>
            <div style="margin-top:16px; display:flex; gap:10px;">
                <button class="profile-btn profile-btn-primary" onclick="saveProfile()">Save Changes</button>
            </div>
        </div>

        <div class="profile-rg-banner">
            <strong>18+</strong>
            <span>Gambling can be addictive. Play responsibly. If you need help, visit the
            <span style="color:#fbbf24; cursor:pointer; text-decoration:underline;" onclick="switchProfileTab('limits')">Responsible Play</span> section.</span>
        </div>
    `;

    // Animate XP bar after layout settles
    requestAnimationFrame(() => requestAnimationFrame(() => {
        const fill = el.querySelector('.profile-xp-bar-fill');
        if (fill) fill.style.width = xpPct + '%';
    }));
}


// ═══════════════════════════════════════════════════════
// SECURITY TAB
// ═══════════════════════════════════════════════════════

function renderSecurityTab() {
    const el = document.getElementById('profileContent');
    el.innerHTML = `
        <div class="profile-section-title">Security</div>

        <div class="profile-card">
            <div class="profile-card-title">Change Password</div>
            <div class="profile-pw-form">
                <div class="profile-field">
                    <label for="profileCurrentPw">Current Password</label>
                    <input type="password" id="profileCurrentPw" placeholder="Enter current password" autocomplete="current-password">
                </div>
                <div class="profile-field">
                    <label for="profileNewPw">New Password</label>
                    <input type="password" id="profileNewPw" placeholder="Min 6 characters" autocomplete="new-password">
                </div>
                <div class="profile-field">
                    <label for="profileConfirmPw">Confirm New Password</label>
                    <input type="password" id="profileConfirmPw" placeholder="Repeat new password" autocomplete="new-password">
                </div>
                <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
                    <button class="profile-btn profile-btn-primary" onclick="changePassword()">Update Password</button>
                    <button class="profile-btn profile-btn-outline" onclick="requestPasswordReset()">Forgot Password?</button>
                </div>
            </div>
        </div>

        <div class="profile-card">
            <div class="profile-card-title">Active Session</div>
            <div class="profile-session-info">
                <span class="profile-session-dot"></span>
                <span>Current session is active &mdash; logged in as <strong style="color:#e2e8f0;">${escapeHtml(currentUser ? currentUser.username : 'N/A')}</strong></span>
            </div>
            <p style="font-size:11px; color:#64748b; margin-top:10px;">
                Your session token (JWT) is stored locally. Logging out will clear this token and end your session on this device.
            </p>
        </div>

        <div class="profile-card" style="border-color: rgba(220, 38, 38, 0.3);">
            <div class="profile-card-title" style="color:#fca5a5;">Danger Zone</div>
            <p style="font-size:12px; color:#94a3b8; margin-bottom:14px;">
                Closing your account is permanent and cannot be undone. All your data, balance, and history will be lost.
            </p>
            <button class="profile-btn profile-btn-danger" onclick="confirmCloseAccount()">Close My Account</button>
        </div>
    `;
}


// ═══════════════════════════════════════════════════════
// VERIFICATION TAB
// ═══════════════════════════════════════════════════════

function renderVerificationTab() {
    const el = document.getElementById('profileContent');
    const kycStatus = (profileData && profileData.kyc_status) || 'unverified';
    const statusConfig = {
        unverified: { icon: '\u26A0\uFE0F', title: 'Not Verified', desc: 'Complete verification to unlock full features.' },
        pending:    { icon: '\u23F3',       title: 'Pending Review', desc: 'Your verification request is being reviewed. This usually takes 1-3 business days.' },
        verified:   { icon: '\u2705',       title: 'Verified',       desc: 'Your identity has been verified. You have access to all features.' }
    };
    const cfg = statusConfig[kycStatus] || statusConfig.unverified;

    el.innerHTML = `
        <div class="profile-section-title">Identity Verification (KYC)</div>

        <div class="profile-verify-status ${kycStatus}">
            <div class="profile-verify-icon">${cfg.icon}</div>
            <div class="profile-verify-text">
                <h3>${cfg.title}</h3>
                <p>${cfg.desc}</p>
            </div>
        </div>

        <div class="profile-card">
            <div class="profile-card-title">Benefits of Verification</div>
            <ul class="profile-benefits-list">
                <li><span class="profile-benefit-check">\u2713</span> Higher deposit and withdrawal limits</li>
                <li><span class="profile-benefit-check">\u2713</span> Faster withdrawal processing</li>
                <li><span class="profile-benefit-check">\u2713</span> Access to VIP promotions and tournaments</li>
                <li><span class="profile-benefit-check">\u2713</span> Enhanced account security</li>
                <li><span class="profile-benefit-check">\u2713</span> Priority customer support</li>
            </ul>
        </div>

        ${kycStatus !== 'verified' ? `
        <div class="profile-card">
            <div class="profile-card-title">Submit Verification Request</div>
            <p style="font-size:12px; color:#94a3b8; margin-bottom:14px;">
                Select the type of identification document you would like to use for verification.
            </p>
            <div class="profile-field" style="max-width:300px; margin-bottom:16px;">
                <label for="profileDocType">Document Type</label>
                <select id="profileDocType">
                    <option value="drivers_license">Driver's License</option>
                    <option value="passport">Passport</option>
                    <option value="national_id">National ID Card</option>
                </select>
            </div>
            <button class="profile-btn profile-btn-primary" onclick="submitVerification()" ${kycStatus === 'pending' ? 'disabled' : ''}>
                ${kycStatus === 'pending' ? 'Request Pending' : 'Submit Verification Request'}
            </button>
            <p style="font-size:11px; color:#64748b; margin-top:12px; font-style:italic;">
                Document upload coming soon &mdash; currently processed via manual review. Our team will contact you with next steps.
            </p>
        </div>
        ` : ''}

        <div class="profile-rg-banner">
            <strong>Privacy</strong>
            <span>Your personal data is encrypted and stored securely. We comply with applicable data protection regulations.</span>
        </div>
    `;
}


// ═══════════════════════════════════════════════════════
// RESPONSIBLE GAMBLING / LIMITS TAB
// ═══════════════════════════════════════════════════════

function renderLimitsTab() {
    const el = document.getElementById('profileContent');
    const lim = (profileData && profileData.limits) || {};

    el.innerHTML = `
        <div class="profile-section-title">Responsible Gambling</div>

        <div class="profile-rg-notice" style="margin-bottom:20px;">
            <span style="font-size:18px;">\u{2139}\uFE0F</span>
            <span>
                Gambling should be fun, not a source of stress. Set limits that work for you.
                If you feel you are losing control, please take a break or seek help.
                <strong>You are always in control.</strong>
            </span>
        </div>

        <div class="profile-card">
            <div class="profile-card-title">Deposit Limits</div>
            <div class="profile-limits-grid">
                <div class="profile-limit-field">
                    <label for="profileLimitDailyDeposit">Daily Limit ($)</label>
                    <input type="number" id="profileLimitDailyDeposit" placeholder="No limit" min="0" step="1" value="${escapeAttr(lim.daily_deposit || '')}">
                </div>
                <div class="profile-limit-field">
                    <label for="profileLimitWeeklyDeposit">Weekly Limit ($)</label>
                    <input type="number" id="profileLimitWeeklyDeposit" placeholder="No limit" min="0" step="1" value="${escapeAttr(lim.weekly_deposit || '')}">
                </div>
                <div class="profile-limit-field">
                    <label for="profileLimitMonthlyDeposit">Monthly Limit ($)</label>
                    <input type="number" id="profileLimitMonthlyDeposit" placeholder="No limit" min="0" step="1" value="${escapeAttr(lim.monthly_deposit || '')}">
                </div>
                <div class="profile-limit-field">
                    <label for="profileLimitDailyLoss">Daily Loss Limit ($)</label>
                    <input type="number" id="profileLimitDailyLoss" placeholder="No limit" min="0" step="1" value="${escapeAttr(lim.daily_loss || '')}">
                </div>
            </div>
        </div>

        <div class="profile-card">
            <div class="profile-card-title">Session Time Limit</div>
            <div class="profile-limit-field" style="max-width:280px;">
                <label for="profileSessionTime">Remind me after</label>
                <select id="profileSessionTime">
                    <option value="" ${!lim.session_time ? 'selected' : ''}>No limit</option>
                    <option value="30" ${lim.session_time === '30' || lim.session_time === 30 ? 'selected' : ''}>30 minutes</option>
                    <option value="60" ${lim.session_time === '60' || lim.session_time === 60 ? 'selected' : ''}>1 hour</option>
                    <option value="120" ${lim.session_time === '120' || lim.session_time === 120 ? 'selected' : ''}>2 hours</option>
                    <option value="240" ${lim.session_time === '240' || lim.session_time === 240 ? 'selected' : ''}>4 hours</option>
                    <option value="480" ${lim.session_time === '480' || lim.session_time === 480 ? 'selected' : ''}>8 hours</option>
                </select>
            </div>
        </div>

        <div style="margin-bottom:20px;">
            <button class="profile-btn profile-btn-primary" onclick="saveLimits()">Save Limits</button>
        </div>

        <div class="profile-card" style="border-color: rgba(239, 68, 68, 0.3);">
            <div class="profile-card-title" style="color:#fca5a5;">Self-Exclusion</div>
            <p style="font-size:12px; color:#94a3b8; margin-bottom:14px;">
                If you need a break from gambling, you can temporarily exclude yourself. During exclusion, you will not be able to log in or place bets.
                <strong>This action takes effect immediately and cannot be reversed until the period expires.</strong>
            </p>
            <div class="profile-self-exclude-row">
                <button class="profile-self-exclude-btn" onclick="selfExclude(24)">24 Hours</button>
                <button class="profile-self-exclude-btn" onclick="selfExclude(48)">48 Hours</button>
                <button class="profile-self-exclude-btn" onclick="selfExclude(72)">72 Hours</button>
                <button class="profile-self-exclude-btn" onclick="selfExclude(168)">1 Week</button>
                <button class="profile-self-exclude-btn" onclick="selfExclude(720)">30 Days</button>
            </div>
        </div>

        <div class="profile-rg-notice">
            <span style="font-size:18px;">\u{1F4DE}</span>
            <span>
                Need help? Contact these resources:<br>
                <a href="https://www.ncpgambling.org/" target="_blank" rel="noopener">National Council on Problem Gambling</a> &mdash; 1-800-522-4700<br>
                <a href="https://www.begambleaware.org/" target="_blank" rel="noopener">BeGambleAware</a> &mdash; 0808-8020-133<br>
                <a href="https://www.gamblingtherapy.org/" target="_blank" rel="noopener">Gambling Therapy</a> &mdash; Free online support
            </span>
        </div>
    `;
}


// ═══════════════════════════════════════════════════════
// HISTORY TAB
// ═══════════════════════════════════════════════════════

function renderHistoryTab() {
    const el = document.getElementById('profileContent');
    const allTx = (profileData && profileData.transactions) || [];
    const filters = ['all', 'deposit', 'withdrawal', 'spin', 'bonus'];

    const filtered = profileHistoryFilter === 'all'
        ? allTx
        : allTx.filter(tx => tx.type === profileHistoryFilter);

    const totalPages = Math.max(1, Math.ceil(filtered.length / PROFILE_HISTORY_PAGE_SIZE));
    if (profileHistoryPage > totalPages) profileHistoryPage = totalPages;
    const start = (profileHistoryPage - 1) * PROFILE_HISTORY_PAGE_SIZE;
    const page = filtered.slice(start, start + PROFILE_HISTORY_PAGE_SIZE);

    el.innerHTML = `
        <div class="profile-section-title">Transaction History</div>

        <div class="profile-history-filters">
            ${filters.map(f => `
                <button class="profile-filter-btn ${f === profileHistoryFilter ? 'active' : ''}" onclick="setHistoryFilter('${f}')">
                    ${f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
            `).join('')}
        </div>

        ${page.length === 0 ? `
            <div class="profile-empty">
                <div class="profile-empty-icon">\u{1F4C4}</div>
                <div>No transactions found${profileHistoryFilter !== 'all' ? ' for this filter' : ''}.</div>
            </div>
        ` : `
            <div style="overflow-x:auto;">
                <table class="profile-history-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Type</th>
                            <th>Amount</th>
                            <th>Balance After</th>
                            <th>Reference</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${page.map(tx => {
                            const date = tx.date ? new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';
                            const amt = Number(tx.amount) || 0;
                            const amtColor = amt >= 0 ? '#34d399' : '#fca5a5';
                            const amtStr = (amt >= 0 ? '+' : '') + '$' + formatMoney(Math.abs(amt));
                            const balAfter = tx.balance_after != null ? '$' + formatMoney(tx.balance_after) : '-';
                            const ref = tx.reference || '-';
                            return `
                                <tr>
                                    <td>${date}</td>
                                    <td><span class="profile-history-type ${tx.type || ''}">${escapeHtml(tx.type || 'other')}</span></td>
                                    <td style="color:${amtColor}; font-weight:700;">${amtStr}</td>
                                    <td>${balAfter}</td>
                                    <td style="font-size:11px; color:#64748b;">${escapeHtml(ref)}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>

            <div class="profile-pagination">
                <button class="profile-page-btn" onclick="profileHistoryPrev()" ${profileHistoryPage <= 1 ? 'disabled' : ''}>Prev</button>
                <span class="profile-page-info">Page ${profileHistoryPage} of ${totalPages}</span>
                <button class="profile-page-btn" onclick="profileHistoryNext()" ${profileHistoryPage >= totalPages ? 'disabled' : ''}>Next</button>
            </div>
        `}
    `;
}


// ═══════════════════════════════════════════════════════
// API ACTIONS
// ═══════════════════════════════════════════════════════

async function saveProfile() {
    const displayName = document.getElementById('profileDisplayName')?.value?.trim() || '';
    const phone       = document.getElementById('profilePhone')?.value?.trim() || '';
    const country     = document.getElementById('profileCountry')?.value || '';
    const dob         = document.getElementById('profileDOB')?.value || '';
    const currency    = document.getElementById('profileCurrency')?.value || 'USD';

    try {
        await apiRequest('/api/user/profile', {
            method: 'PUT',
            requireAuth: true,
            body: { display_name: displayName, phone, country, date_of_birth: dob, currency }
        });

        // Update local state
        if (profileData) {
            profileData.display_name = displayName;
            profileData.phone = phone;
            profileData.country = country;
            profileData.date_of_birth = dob;
            profileData.currency = currency;
        }

        showToast('Profile updated successfully.', 'success');
    } catch (err) {
        showToast(err.message || 'Failed to save profile.', 'error');
    }
}

async function changePassword() {
    const currentPw = document.getElementById('profileCurrentPw')?.value || '';
    const newPw     = document.getElementById('profileNewPw')?.value || '';
    const confirmPw = document.getElementById('profileConfirmPw')?.value || '';

    if (!currentPw || !newPw) {
        showToast('Please fill in all password fields.', 'error');
        return;
    }
    if (newPw.length < 6) {
        showToast('New password must be at least 6 characters.', 'error');
        return;
    }
    if (newPw !== confirmPw) {
        showToast('New passwords do not match.', 'error');
        return;
    }

    try {
        await apiRequest('/api/user/change-password', {
            method: 'PUT',
            requireAuth: true,
            body: { current_password: currentPw, new_password: newPw }
        });

        // Clear fields
        document.getElementById('profileCurrentPw').value = '';
        document.getElementById('profileNewPw').value = '';
        document.getElementById('profileConfirmPw').value = '';

        showToast('Password changed successfully.', 'success');
    } catch (err) {
        showToast(err.message || 'Failed to change password.', 'error');
    }
}

async function requestPasswordReset() {
    const email = currentUser ? currentUser.email : '';
    if (!email) {
        showToast('No email address on file. Please contact support.', 'error');
        return;
    }

    try {
        await apiRequest('/api/user/forgot-password', {
            method: 'POST',
            body: { email }
        });
        showToast('Password reset link sent to your email.', 'success');
    } catch (err) {
        showToast(err.message || 'Failed to send reset link.', 'error');
    }
}

function confirmCloseAccount() {
    const confirmed = confirm(
        'WARNING: Closing your account is PERMANENT.\n\n' +
        'All your balance, history, and personal data will be deleted.\n' +
        'This action cannot be undone.\n\n' +
        'Are you sure you want to close your account?'
    );
    if (!confirmed) return;

    const doubleConfirm = confirm(
        'Final confirmation:\n\n' +
        'Type OK to permanently close your account and lose all data.\n\n' +
        'Press OK to proceed or Cancel to abort.'
    );
    if (!doubleConfirm) return;

    closeAccount();
}

async function closeAccount() {
    try {
        await apiRequest('/api/user/close-account', {
            method: 'DELETE',
            requireAuth: true
        });
        hideProfileModal();
        logout();
        showToast('Your account has been closed.', 'info');
    } catch (err) {
        showToast(err.message || 'Failed to close account.', 'error');
    }
}

async function submitVerification() {
    const docType = document.getElementById('profileDocType')?.value || 'drivers_license';

    try {
        await apiRequest('/api/user/verification', {
            method: 'POST',
            requireAuth: true,
            body: { document_type: docType }
        });

        if (profileData) profileData.kyc_status = 'pending';
        showToast('Verification request submitted. We will review your request within 1-3 business days.', 'success');
        renderVerificationTab();
        renderProfileSidebar();
    } catch (err) {
        showToast(err.message || 'Failed to submit verification request.', 'error');
    }
}

async function saveLimits() {
    const dailyDeposit   = document.getElementById('profileLimitDailyDeposit')?.value || '';
    const weeklyDeposit  = document.getElementById('profileLimitWeeklyDeposit')?.value || '';
    const monthlyDeposit = document.getElementById('profileLimitMonthlyDeposit')?.value || '';
    const dailyLoss      = document.getElementById('profileLimitDailyLoss')?.value || '';
    const sessionTime    = document.getElementById('profileSessionTime')?.value || '';

    try {
        await apiRequest('/api/payment/limits', {
            method: 'PUT',
            requireAuth: true,
            body: {
                daily_deposit: dailyDeposit ? Number(dailyDeposit) : null,
                weekly_deposit: weeklyDeposit ? Number(weeklyDeposit) : null,
                monthly_deposit: monthlyDeposit ? Number(monthlyDeposit) : null,
                daily_loss: dailyLoss ? Number(dailyLoss) : null,
                session_time: sessionTime ? Number(sessionTime) : null
            }
        });

        if (profileData) {
            profileData.limits = {
                daily_deposit: dailyDeposit,
                weekly_deposit: weeklyDeposit,
                monthly_deposit: monthlyDeposit,
                daily_loss: dailyLoss,
                session_time: sessionTime
            };
        }

        showToast('Limits saved successfully. Changes take effect immediately.', 'success');
    } catch (err) {
        showToast(err.message || 'Failed to save limits.', 'error');
    }
}

async function selfExclude(hours) {
    const labels = { 24: '24 hours', 48: '48 hours', 72: '72 hours', 168: '1 week', 720: '30 days' };
    const label = labels[hours] || hours + ' hours';

    const confirmed = confirm(
        `Self-Exclusion: ${label}\n\n` +
        'During this period you will NOT be able to:\n' +
        '- Log in to your account\n' +
        '- Place any bets\n' +
        '- Access your balance\n\n' +
        'This cannot be reversed until the period expires.\n\n' +
        'Are you sure you want to self-exclude?'
    );
    if (!confirmed) return;

    try {
        await apiRequest('/api/payment/self-exclude', {
            method: 'POST',
            requireAuth: true,
            body: { hours }
        });
        hideProfileModal();
        logout();
        showToast(`Self-exclusion activated for ${label}. Take care of yourself.`, 'info');
    } catch (err) {
        showToast(err.message || 'Failed to activate self-exclusion.', 'error');
    }
}


// ═══════════════════════════════════════════════════════
// HISTORY PAGINATION & FILTER
// ═══════════════════════════════════════════════════════

function setHistoryFilter(filter) {
    profileHistoryFilter = filter;
    profileHistoryPage = 1;
    renderHistoryTab();
}

function profileHistoryPrev() {
    if (profileHistoryPage > 1) {
        profileHistoryPage--;
        renderHistoryTab();
    }
}

function profileHistoryNext() {
    const total = ((profileData && profileData.transactions) || []).length;
    const filtered = profileHistoryFilter === 'all'
        ? total
        : ((profileData && profileData.transactions) || []).filter(tx => tx.type === profileHistoryFilter).length;
    const totalPages = Math.max(1, Math.ceil(filtered / PROFILE_HISTORY_PAGE_SIZE));
    if (profileHistoryPage < totalPages) {
        profileHistoryPage++;
        renderHistoryTab();
    }
}


// ═══════════════════════════════════════════════════════
// BADGES TAB
// ═══════════════════════════════════════════════════════

// Canonical achievement definitions mirrored from ui-modals.js.
// These must stay in sync with ACH_DEFS in that file.
const BADGE_ACH_DEFS = [
    // Spin milestones
    { id: 'first_spin',    icon: '🎰', name: 'First Spin',       desc: 'Play your first spin',               reqType: 'spins'   },
    { id: 'spin_10',       icon: '🔄', name: 'Getting Started',  desc: 'Complete 10 spins',                  reqType: 'spins'   },
    { id: 'spin_100',      icon: '💫', name: 'Spin Master',      desc: 'Complete 100 spins',                 reqType: 'spins'   },
    { id: 'spin_500',      icon: '⚡', name: 'Centurion',        desc: 'Complete 500 spins',                 reqType: 'spins'   },
    { id: 'spin_1000',     icon: '🌀', name: 'Reel Veteran',     desc: 'Complete 1,000 spins',               reqType: 'spins'   },
    // Win milestones
    { id: 'first_win',     icon: '🏆', name: 'First Win',        desc: 'Win your first spin',                reqType: 'wins'    },
    { id: 'win_10',        icon: '💰', name: 'On a Roll',        desc: 'Win 10 times',                       reqType: 'wins'    },
    { id: 'win_50',        icon: '🤑', name: 'Lucky Streak',     desc: 'Win 50 times',                       reqType: 'wins'    },
    { id: 'win_200',       icon: '🥇', name: 'Win Connoisseur',  desc: 'Win 200 times',                      reqType: 'wins'    },
    // Big win multipliers
    { id: 'big_win',       icon: '💥', name: 'Big Winner',       desc: 'Win over 100x your bet',             reqType: 'bigWin'  },
    { id: 'mega_win',      icon: '🌟', name: 'Mega Winner',      desc: 'Win over 500x your bet',             reqType: 'bigWin'  },
    { id: 'epic_win',      icon: '🔥', name: 'Epic Winner',      desc: 'Win over 1,000x your bet',           reqType: 'bigWin'  },
    // Game variety
    { id: 'games_5',       icon: '🎮', name: 'Explorer',         desc: 'Try 5 different games',              reqType: 'games'   },
    { id: 'games_20',      icon: '🗺️', name: 'Adventurer',      desc: 'Try 20 different games',             reqType: 'games'   },
    { id: 'games_50',      icon: '🌍', name: 'Globe Trotter',    desc: 'Try 50 different games',             reqType: 'games'   },
    { id: 'games_all',     icon: '👑', name: 'Master of All',    desc: 'Try all 122 games',                  reqType: 'games'   },
    // Balance milestones
    { id: 'balance_500',   icon: '💎', name: 'Getting Rich',     desc: 'Reach a balance of $500',            reqType: 'balance' },
    { id: 'balance_1000',  icon: '💰', name: 'High Balance',     desc: 'Reach a balance of $1,000',          reqType: 'balance' },
    { id: 'balance_5000',  icon: '🏦', name: 'Bank Breaker',     desc: 'Reach a balance of $5,000',          reqType: 'balance' },
    // Wager milestones
    { id: 'wager_1k',      icon: '📊', name: 'Regular',          desc: 'Wager $1,000 total',                 reqType: 'wager'   },
    { id: 'wager_10k',     icon: '📈', name: 'Whale',            desc: 'Wager $10,000 total',                reqType: 'wager'   },
    // Bonus triggers
    { id: 'bonus_5',       icon: '🎁', name: 'Bonus Seeker',     desc: 'Trigger 5 bonus rounds',             reqType: 'bonuses' },
    { id: 'bonus_25',      icon: '🎯', name: 'Bonus Hunter',     desc: 'Trigger 25 bonus rounds',            reqType: 'bonuses' },
    // Win streak
    { id: 'streak_5',      icon: '🔥', name: 'Hot Hand',         desc: 'Win 5 spins in a row',               reqType: 'streak'  },
    { id: 'streak_10',     icon: '💠', name: 'Unstoppable',      desc: 'Win 10 spins in a row',              reqType: 'streak'  },
];

const BADGE_CATEGORY_ORDER = [
    { key: 'spins',   label: '🎰 Spin Milestones' },
    { key: 'wins',    label: '🏆 Win Milestones' },
    { key: 'bigWin',  label: '💥 Big Wins' },
    { key: 'games',   label: '🗺️ Explorer' },
    { key: 'balance', label: '💎 Balance' },
    { key: 'wager',   label: '📊 Wager' },
    { key: 'bonuses', label: '🎁 Bonus Rounds' },
    { key: 'streak',  label: '🔥 Win Streaks' },
];

function renderBadgeGallery() {
    const el = document.getElementById('profileContent');

    // Load which achievements are unlocked from localStorage
    var unlocked = [];
    try {
        var saved = JSON.parse(localStorage.getItem('matrixAchievements') || '{}');
        unlocked = Array.isArray(saved.unlocked) ? saved.unlocked : [];
    } catch(e) {}

    // Group by reqType preserving category order
    var grouped = {};
    BADGE_CATEGORY_ORDER.forEach(function(cat) { grouped[cat.key] = []; });
    BADGE_ACH_DEFS.forEach(function(ach) {
        if (grouped[ach.reqType]) grouped[ach.reqType].push(ach);
        else { grouped[ach.reqType] = [ach]; }
    });

    var earnedCount = BADGE_ACH_DEFS.filter(function(a) { return unlocked.includes(a.id); }).length;

    var html = `
        <h3 class="profile-section-title">Achievement Badges</h3>
        <p style="color:#94a3b8;font-size:12px;margin-bottom:16px;">
            ${earnedCount} / ${BADGE_ACH_DEFS.length} earned
        </p>
        <div id="profileBadgesGrid" class="badges-container">`;

    BADGE_CATEGORY_ORDER.forEach(function(cat) {
        var achs = grouped[cat.key];
        if (!achs || achs.length === 0) return;
        html += `<div class="badge-category-header">${cat.label}</div>`;
        html += `<div class="badge-grid">`;
        achs.forEach(function(ach) {
            var earned = unlocked.includes(ach.id);
            var cls = 'badge-item' + (earned ? ' earned' : ' locked');
            var tip = earned
                ? escapeAttr(ach.name + ': ' + ach.desc)
                : 'Keep playing to unlock!';
            html += `<div class="${cls}" title="${tip}">`;
            html += `<div class="badge-icon">${ach.icon}</div>`;
            html += `<div class="badge-name">${earned ? escapeHtml(ach.name) : '???'}</div>`;
            html += `</div>`;
        });
        html += `</div>`;
    });

    html += `</div>`;
    el.innerHTML = html;
}


// ═══════════════════════════════════════════════════════
// LOGOUT FROM PROFILE
// ═══════════════════════════════════════════════════════

function profileLogout() {
    hideProfileModal();
    if (typeof logout === 'function') {
        logout();
    }
}


// ═══════════════════════════════════════════════════════
// UTILITY HELPERS
// ═══════════════════════════════════════════════════════

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
}

function escapeAttr(str) {
    return (str || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function buildCountryOptions(selected) {
    const countries = [
        'US', 'GB', 'CA', 'AU', 'DE', 'FR', 'ES', 'IT', 'NL', 'BE',
        'AT', 'CH', 'SE', 'NO', 'DK', 'FI', 'IE', 'PT', 'NZ', 'JP',
        'KR', 'SG', 'BR', 'MX', 'IN', 'ZA', 'AE', 'PL', 'CZ', 'GR'
    ];
    const labels = {
        US: 'United States', GB: 'United Kingdom', CA: 'Canada', AU: 'Australia',
        DE: 'Germany', FR: 'France', ES: 'Spain', IT: 'Italy', NL: 'Netherlands',
        BE: 'Belgium', AT: 'Austria', CH: 'Switzerland', SE: 'Sweden', NO: 'Norway',
        DK: 'Denmark', FI: 'Finland', IE: 'Ireland', PT: 'Portugal', NZ: 'New Zealand',
        JP: 'Japan', KR: 'South Korea', SG: 'Singapore', BR: 'Brazil', MX: 'Mexico',
        IN: 'India', ZA: 'South Africa', AE: 'United Arab Emirates', PL: 'Poland',
        CZ: 'Czech Republic', GR: 'Greece'
    };
    return countries.map(code =>
        `<option value="${code}" ${selected === code ? 'selected' : ''}>${labels[code] || code}</option>`
    ).join('');
}
