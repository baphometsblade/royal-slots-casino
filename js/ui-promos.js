// =====================================================================
// UI-PROMOS MODULE — Promotional Popup & Engagement Engine
// =====================================================================
//
// Loaded via <script> in global scope after ui-wallet.js, before qa-tools.js.
// Depends on globals: currentUser, balance, stats, formatMoney(), showToast(),
//   updateBalance(), saveBalance(), addFunds(), showWalletModal(),
//   playSound(), SoundManager, spinning, currentBet, _winStreak
//
// Public API:
//   initPromoEngine()          — bootstrap timers & hooks (call from app.js)
//   checkPromoTriggers(event, data) — evaluate all promo conditions
//   showPromoPopup(config)     — render a generic promo popup
//   dismissPromo(promoId)      — close & optionally suppress forever
// =====================================================================


// ─────────────────────────────────────────────────────────────────────
// 0. CSS INJECTION (self-contained IIFE)
// ─────────────────────────────────────────────────────────────────────
(function injectPromoStyles() {
    const style = document.createElement('style');
    style.id = 'promo-engine-styles';
    style.textContent = `
/* ── Promo Popup Container ────────────────────────────── */
.promo-popup-overlay {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    z-index:10400;
    pointer-events: none;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    padding: 24px;
}
.promo-popup-overlay.active {
    pointer-events: auto;
}
.promo-popup-overlay.active .promo-popup-backdrop {
    opacity: 1;
}

.promo-popup-backdrop {
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0, 0, 0, 0.35);
    opacity: 0;
    transition: opacity 0.35s ease;
}

/* ── Promo Card ───────────────────────────────────────── */
.promo-popup-card {
    position: relative;
    z-index:10400;
    width: 380px;
    max-width: calc(100vw - 48px);
    max-height: calc(100vh - 48px);
    overflow-y: auto;
    background: linear-gradient(
        135deg,
        rgba(15, 20, 40, 0.92) 0%,
        rgba(25, 30, 55, 0.96) 100%
    );
    backdrop-filter: blur(24px) saturate(1.6);
    -webkit-backdrop-filter: blur(24px) saturate(1.6);
    border: 1.5px solid rgba(251, 191, 36, 0.45);
    border-radius: 18px;
    box-shadow:
        0 0 40px rgba(251, 191, 36, 0.15),
        0 16px 48px rgba(0, 0, 0, 0.5),
        inset 0 1px 0 rgba(255, 255, 255, 0.06);
    padding: 28px 24px 22px;
    transform: translateX(120%);
    opacity: 0;
    transition: transform 0.5s cubic-bezier(0.22, 1, 0.36, 1),
                opacity 0.4s ease;
}
.promo-popup-overlay.active .promo-popup-card {
    transform: translateX(0);
    opacity: 1;
}
.promo-popup-card.exiting {
    transform: translateX(120%);
    opacity: 0;
    transition: transform 0.35s cubic-bezier(0.55, 0, 1, 0.45),
                opacity 0.25s ease;
}

/* ── Close Button ─────────────────────────────────────── */
.promo-close-btn {
    position: absolute;
    top: 12px; right: 14px;
    width: 30px; height: 30px;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 50%;
    color: #94a3b8;
    font-size: 16px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    line-height: 1;
    padding: 0;
}
.promo-close-btn:hover {
    background: rgba(239, 68, 68, 0.25);
    color: #fca5a5;
    border-color: rgba(239, 68, 68, 0.4);
}

/* ── Icon & Header ────────────────────────────────────── */
.promo-icon {
    font-size: 48px;
    text-align: center;
    margin-bottom: 12px;
    filter: drop-shadow(0 4px 12px rgba(251, 191, 36, 0.4));
    animation: promo-icon-bounce 2s ease-in-out infinite;
}
@keyframes promo-icon-bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-6px); }
}

.promo-title {
    font-size: 20px;
    font-weight: 800;
    text-align: center;
    margin-bottom: 8px;
    background: linear-gradient(135deg, #fbbf24, #f59e0b, #fcd34d);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    letter-spacing: -0.3px;
}

.promo-body {
    font-size: 14px;
    color: #cbd5e1;
    text-align: center;
    line-height: 1.55;
    margin-bottom: 18px;
}

.promo-highlight {
    color: #fbbf24;
    font-weight: 700;
}

/* ── Timer ─────────────────────────────────────────────── */
.promo-timer {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    margin-bottom: 16px;
    font-size: 13px;
    color: #f87171;
    font-weight: 600;
    letter-spacing: 0.5px;
}
.promo-timer-icon {
    animation: promo-timer-pulse 1s ease-in-out infinite;
}
@keyframes promo-timer-pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
}

/* ── CTA Button ───────────────────────────────────────── */
.promo-cta-btn {
    display: block;
    width: 100%;
    padding: 14px 20px;
    background: linear-gradient(135deg, #f59e0b, #d97706);
    color: #000;
    font-size: 15px;
    font-weight: 800;
    border: none;
    border-radius: 12px;
    cursor: pointer;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    transition: all 0.25s ease;
    box-shadow: 0 4px 16px rgba(245, 158, 11, 0.35);
    margin-bottom: 10px;
}
.promo-cta-btn:hover {
    background: linear-gradient(135deg, #fbbf24, #f59e0b);
    transform: translateY(-2px);
    box-shadow: 0 6px 24px rgba(251, 191, 36, 0.5);
}
.promo-cta-btn:active {
    transform: translateY(0);
}

/* ── Secondary / Quick Deposit Buttons ────────────────── */
.promo-quick-btns {
    display: flex;
    gap: 8px;
    margin-bottom: 10px;
}
.promo-quick-btn {
    flex: 1;
    padding: 10px 8px;
    background: rgba(251, 191, 36, 0.1);
    border: 1px solid rgba(251, 191, 36, 0.3);
    border-radius: 10px;
    color: #fbbf24;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s;
    text-align: center;
}
.promo-quick-btn:hover {
    background: rgba(251, 191, 36, 0.2);
    border-color: rgba(251, 191, 36, 0.55);
    transform: translateY(-1px);
}

/* ── Win Amount Display ───────────────────────────────── */
.promo-win-amount {
    font-size: 32px;
    font-weight: 900;
    text-align: center;
    margin: 8px 0 12px;
    background: linear-gradient(135deg, #34d399, #10b981);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    text-shadow: none;
}

/* ── Don't Show Again ─────────────────────────────────── */
.promo-suppress {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    margin-top: 8px;
    font-size: 11px;
    color: #64748b;
    cursor: pointer;
    user-select: none;
}
.promo-suppress input[type="checkbox"] {
    accent-color: #f59e0b;
    width: 14px;
    height: 14px;
    cursor: pointer;
}
.promo-suppress:hover {
    color: #94a3b8;
}

/* ── Coin Drop Animation ──────────────────────────────── */
.promo-coin-drop {
    position: fixed;
    font-size: 28px;
    z-index:10400;
    pointer-events: none;
    animation: promo-coin-fall 1.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
}
@keyframes promo-coin-fall {
    0% { transform: translateY(-60px) rotate(0deg); opacity: 1; }
    80% { opacity: 1; }
    100% { transform: translateY(calc(100vh + 40px)) rotate(720deg); opacity: 0; }
}

/* ── Happy Hour Banner ────────────────────────────────── */
.promo-happy-hour-bar {
    position: fixed;
    top: 0; left: 0; right: 0;
    z-index:10400;
    background: linear-gradient(90deg, #d97706, #f59e0b, #fbbf24, #f59e0b, #d97706);
    background-size: 200% 100%;
    animation: promo-hh-shimmer 3s linear infinite;
    color: #000;
    font-size: 13px;
    font-weight: 800;
    text-align: center;
    padding: 8px 16px;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    box-shadow: 0 2px 12px rgba(251, 191, 36, 0.5);
    transform: translateY(-100%);
    transition: transform 0.4s cubic-bezier(0.22, 1, 0.36, 1);
}
.promo-happy-hour-bar.active {
    transform: translateY(0);
}
@keyframes promo-hh-shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
}
.promo-hh-timer {
    display: inline-block;
    margin-left: 10px;
    font-variant-numeric: tabular-nums;
    color: #7c2d12;
}

/* ── Mobile Responsive ────────────────────────────────── */
@media (max-width: 480px) {
    .promo-popup-overlay {
        padding: 12px;
        justify-content: center;
        align-items: flex-end;
    }
    .promo-popup-card {
        width: 100%;
        max-width: 100%;
        border-radius: 18px 18px 8px 8px;
        transform: translateY(120%);
    }
    .promo-popup-overlay.active .promo-popup-card {
        transform: translateY(0);
    }
    .promo-popup-card.exiting {
        transform: translateY(120%);
    }
}
`;
    document.head.appendChild(style);
})();


// ─────────────────────────────────────────────────────────────────────
// 1. STORAGE KEYS & INTERNAL STATE
// ─────────────────────────────────────────────────────────────────────

const PROMO_STORAGE_PREFIX     = 'casinoPromo_';
const PROMO_KEY_FIRST_DEPOSIT  = PROMO_STORAGE_PREFIX + 'firstDeposit';
const PROMO_KEY_LOSS_RECOVERY  = PROMO_STORAGE_PREFIX + 'lossRecovery';
const PROMO_KEY_LOW_BALANCE    = PROMO_STORAGE_PREFIX + 'lowBalance';
const PROMO_KEY_WELCOME_BACK   = PROMO_STORAGE_PREFIX + 'welcomeBack';
const PROMO_KEY_LAST_VISIT     = PROMO_STORAGE_PREFIX + 'lastVisit';
const PROMO_KEY_PLAY_START     = PROMO_STORAGE_PREFIX + 'playStart';
const PROMO_KEY_HAPPY_HOUR_END = PROMO_STORAGE_PREFIX + 'happyHourEnd';
const PROMO_KEY_SUPPRESS       = PROMO_STORAGE_PREFIX + 'suppress_';

/** Internal promo engine state */
let _promoState = {
    consecutiveLosses: 0,
    sessionLosses: 0,
    lastSpinWasLoss: false,
    happyHourActive: false,
    happyHourTimer: null,
    happyHourBarTimer: null,
    happyHourCheckInterval: null,
    activePopup: null,       // currently displayed popup id (only one at a time)
    popupQueue: [],          // queued popups waiting to show
    initialized: false,
    lowBalanceShownThisSession: false,
    postWinShownThisSession: false,
};


// ─────────────────────────────────────────────────────────────────────
// 1b. ENHANCEMENT CSS INJECTION (id-guarded, injected once on load)
// ─────────────────────────────────────────────────────────────────────
(function injectPromoEnhancementStyles() {
    if (document.getElementById('promoEnhCss')) return;
    const s = document.createElement('style');
    s.id = 'promoEnhCss';
    s.textContent = `
.promo-progress-wrap {
  margin-top: 8px;
  background: rgba(255,255,255,0.08);
  border-radius: 4px;
  height: 6px;
  overflow: hidden;
  position: relative;
}
.promo-progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #7b61ff, #00bcd4);
  border-radius: 4px;
  transition: width 0.5s ease;
}
.promo-progress-label {
  font-size: 10px;
  color: rgba(255,255,255,0.5);
  margin-top: 3px;
  display: block;
}
.promo-expiring { color: #ffb74d; font-size: 11px; }
.promo-expiring-soon { color: #ff8a65; font-size: 11px; font-weight: 600; }
.promo-expiring-urgent { color: #ef5350; font-size: 11px; font-weight: 700; animation: pulse 1s infinite; }
.promo-expired { color: rgba(255,255,255,0.3); font-size: 11px; }
.promo-type-badge {
  display: inline-block;
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 6px;
}
.promo-type-deposit  { background: rgba(76,175,80,0.2);  color: #81c784; }
.promo-type-freespin { background: rgba(33,150,243,0.2); color: #64b5f6; }
.promo-type-cashback { background: rgba(255,152,0,0.2);  color: #ffb74d; }
.promo-type-vip      { background: rgba(156,39,176,0.2); color: #ce93d8; }
/* Colored left-border stripe per promo type */
.promo-popup-card[data-promo-type="deposit"]  { border-left: 4px solid #81c784; }
.promo-popup-card[data-promo-type="freespin"] { border-left: 4px solid #64b5f6; }
.promo-popup-card[data-promo-type="cashback"] { border-left: 4px solid #ffb74d; }
.promo-popup-card[data-promo-type="vip"]      { border-left: 4px solid #ce93d8; }
/* CLAIM / ACTIVE badge in top-left corner of card */
.promo-status-badge {
  position: absolute;
  top: 12px;
  left: 14px;
  font-size: 9px;
  font-weight: 800;
  padding: 2px 7px;
  border-radius: 8px;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  pointer-events: none;
}
.promo-status-badge.badge-claim  { background: rgba(245,158,11,0.25); color: #fbbf24; border: 1px solid rgba(245,158,11,0.4); }
.promo-status-badge.badge-active { background: rgba(52,211,153,0.2);  color: #34d399; border: 1px solid rgba(52,211,153,0.35); }
/* Countdown row inside card */
.promo-countdown-row {
  text-align: center;
  margin-top: 6px;
  margin-bottom: 2px;
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.45; }
}
`;
    document.head.appendChild(s);
})();


// ─────────────────────────────────────────────────────────────────────
// 2. SUPPRESSION HELPERS
// ─────────────────────────────────────────────────────────────────────

function _promoIsSuppressed(promoId) {
    return localStorage.getItem(PROMO_KEY_SUPPRESS + promoId) === '1';
}

function _promoSetSuppressed(promoId) {
    try { localStorage.setItem(PROMO_KEY_SUPPRESS + promoId, '1'); } catch (e) { /* ignore */ }
}

function _promoSessionFlag(key) {
    return sessionStorage.getItem(PROMO_STORAGE_PREFIX + key) === '1';
}

function _promoSetSessionFlag(key) {
    sessionStorage.setItem(PROMO_STORAGE_PREFIX + key, '1');
}


// ─────────────────────────────────────────────────────────────────────
// 2b. ENHANCEMENT HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────

/**
 * Returns countdown info for a given expiry date/string, or null if none.
 * @param {string|number|Date} expiresAt
 * @returns {{ text: string, cls: string }|null}
 */
function _promoTimeLeft(expiresAt) {
    if (!expiresAt) return null;
    const diff = new Date(expiresAt) - Date.now();
    if (diff <= 0) return { text: 'Expired', cls: 'promo-expired' };
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    if (d > 0) return { text: 'Expires in ' + d + 'd ' + h + 'h', cls: 'promo-expiring' };
    if (h > 0) return { text: 'Expires in ' + h + 'h ' + m + 'm', cls: 'promo-expiring-soon' };
    return { text: 'Expires in ' + m + 'm', cls: 'promo-expiring-urgent' };
}

/**
 * Returns visual metadata for a promo type string.
 * Supported types: 'deposit', 'freespin', 'cashback', 'vip'
 * Falls back to 'deposit' for unknown types.
 *
 * @param {string} [promoType]
 * @returns {{ type: string, badgeLabel: string, icon: string }}
 */
function _promoGetTypeMeta(promoType) {
    const type = (promoType || 'deposit').toLowerCase();
    const map = {
        deposit:  { type: 'deposit',  badgeLabel: 'Deposit Bonus', icon: '\uD83C\uDF81' },
        freespin: { type: 'freespin', badgeLabel: 'Free Spins',    icon: '\uD83C\uDFB0' },
        cashback: { type: 'cashback', badgeLabel: 'Cashback',      icon: '\uD83D\uDCAA' },
        vip:      { type: 'vip',      badgeLabel: 'VIP Offer',     icon: '\uD83D\uDC51' },
    };
    return map[type] || map['deposit'];
}

/**
 * Build the wagering-progress HTML block.
 * Returns empty string when insufficient data is present.
 *
 * @param {number|undefined} wagered  — amount already wagered
 * @param {number|undefined} required — total wagering requirement
 * @returns {string}
 */
function _promoProgressHtml(wagered, required) {
    if (typeof required !== 'number' || required <= 0) return '';
    const w = Math.min(typeof wagered === 'number' ? wagered : 0, required);
    const pct = Math.round((w / required) * 100);
    const wFmt = (typeof formatMoney === 'function') ? formatMoney(w) : w.toFixed(2);
    const rFmt = (typeof formatMoney === 'function') ? formatMoney(required) : required.toFixed(2);
    return (
        '<div class="promo-progress-wrap">' +
            '<div class="promo-progress-bar" style="width:' + pct + '%"></div>' +
        '</div>' +
        '<span class="promo-progress-label">$' + wFmt + ' / $' + rFmt + ' wagered</span>'
    );
}


// ─────────────────────────────────────────────────────────────────────
// 3. GENERIC POPUP RENDERER
// ─────────────────────────────────────────────────────────────────────

/**
 * Show a promo popup with the given configuration.
 *
 * @param {Object} config
 * @param {string} config.id                   — unique promo identifier
 * @param {string} config.icon                 — emoji or HTML for the header icon
 * @param {string} config.title                — headline text
 * @param {string} config.body                 — description HTML
 * @param {string} [config.cta]                — CTA button label (omit to hide)
 * @param {Function} [config.onCta]            — CTA click handler
 * @param {string} [config.timer]              — countdown HTML (rendered in timer row)
 * @param {string} [config.extraHtml]          — extra HTML inserted before suppress checkbox
 * @param {boolean} [config.suppressible=true] — show "don't show again" checkbox
 * @param {Function} [config.onDismiss]        — called when popup is dismissed
 * @param {string} [config.promoType]          — 'deposit'|'freespin'|'cashback'|'vip'
 * @param {string|number|Date} [config.expiresAt] — expiry date for countdown display
 * @param {number} [config.wageredAmount]      — amount already wagered toward requirement
 * @param {number} [config.wageringRequired]   — total wagering requirement amount
 * @param {boolean} [config.isActive]          — true = show ACTIVE badge, false/undefined = CLAIM
 */
function showPromoPopup(config) {
    if (!config || !config.id) return;

    // Don't show during spin animation
    if (spinning) {
        // Queue it for after the spin
        if (!_promoState.popupQueue.find(p => p.id === config.id)) {
            _promoState.popupQueue.push(config);
        }
        return;
    }

    // Only one popup at a time — queue extras
    if (_promoState.activePopup) {
        if (!_promoState.popupQueue.find(p => p.id === config.id)) {
            _promoState.popupQueue.push(config);
        }
        return;
    }

    _promoState.activePopup = config.id;

    // ── Enhancement: resolve type metadata & optional enhancements ──
    const typeMeta    = _promoGetTypeMeta(config.promoType);
    const timeLeft    = _promoTimeLeft(config.expiresAt);
    const progressHtml = _promoProgressHtml(config.wageredAmount, config.wageringRequired);

    // Status badge: ACTIVE if the promo is already claimed/running, else CLAIM
    const statusBadgeClass = config.isActive ? 'badge-active' : 'badge-claim';
    const statusBadgeText  = config.isActive ? 'Active' : 'Claim';

    // Type badge HTML (always shown)
    const typeBadgeHtml = '<div class="promo-type-badge promo-type-' + typeMeta.type + '">' +
        typeMeta.badgeLabel + '</div>';

    // Countdown row HTML (only when expiry data exists)
    const countdownHtml = timeLeft
        ? '<div class="promo-countdown-row"><span class="' + timeLeft.cls + '">\u23F0 ' + timeLeft.text + '</span></div>'
        : '';

    // Use icon from typeMeta when no explicit icon is provided
    const resolvedIcon = config.icon || typeMeta.icon;

    // Build DOM
    const overlay = document.createElement('div');
    overlay.className = 'promo-popup-overlay';
    overlay.id = 'promoOverlay_' + config.id;
    overlay.setAttribute('data-promo-id', config.id);

    const suppressible = config.suppressible !== false;
    const suppressId = 'promoSuppress_' + config.id;

    overlay.innerHTML = `
        <div class="promo-popup-backdrop"></div>
        <div class="promo-popup-card" data-promo-type="${typeMeta.type}">
            <span class="promo-status-badge ${statusBadgeClass}">${statusBadgeText}</span>
            <button class="promo-close-btn" aria-label="Close" onclick="dismissPromo('${config.id}')">&times;</button>
            <div class="promo-icon">${resolvedIcon}</div>
            ${typeBadgeHtml}
            <div class="promo-title">${config.title || ''}</div>
            <div class="promo-body">${config.body || ''}</div>
            ${config.timer ? '<div class="promo-timer"><span class="promo-timer-icon">&#9200;</span> <span id="promoTimerText_' + config.id + '">' + config.timer + '</span></div>' : ''}
            ${countdownHtml}
            ${progressHtml}
            ${config.extraHtml || ''}
            ${config.cta ? '<button class="promo-cta-btn" id="promoCta_' + config.id + '">' + config.cta + '</button>' : ''}
            ${suppressible ? '<label class="promo-suppress"><input type="checkbox" id="' + suppressId + '"> Don\'t show this again</label>' : ''}
        </div>
    `;

    document.body.appendChild(overlay);

    // Wire CTA
    if (config.cta && config.onCta) {
        const ctaBtn = document.getElementById('promoCta_' + config.id);
        if (ctaBtn) {
            ctaBtn.addEventListener('click', function() {
                config.onCta();
                dismissPromo(config.id);
            });
        }
    }

    // Wire backdrop dismiss
    const backdrop = overlay.querySelector('.promo-popup-backdrop');
    if (backdrop) {
        backdrop.addEventListener('click', function() {
            dismissPromo(config.id);
        });
    }

    // Animate in (next frame to allow CSS transition)
    requestAnimationFrame(function() {
        requestAnimationFrame(function() {
            overlay.classList.add('active');
        });
    });

    // Play subtle notification sound
    _promoPlaySound();
}


/**
 * Dismiss (close) a promo popup by id.
 * If the "don't show again" checkbox is checked, permanently suppress it.
 */
function dismissPromo(promoId) {
    const overlay = document.getElementById('promoOverlay_' + promoId);
    if (!overlay) return;

    // Check suppress checkbox
    const suppressCb = document.getElementById('promoSuppress_' + promoId);
    if (suppressCb && suppressCb.checked) {
        _promoSetSuppressed(promoId);
    }

    // Animate out
    const card = overlay.querySelector('.promo-popup-card');
    if (card) card.classList.add('exiting');
    overlay.classList.remove('active');

    setTimeout(function() {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        if (_promoState.activePopup === promoId) {
            _promoState.activePopup = null;
        }
        // Process queue
        _promoProcessQueue();
    }, 400);
}


function _promoProcessQueue() {
    if (_promoState.activePopup) return;
    if (_promoState.popupQueue.length === 0) return;
    // Don't show during spin
    if (spinning) return;

    const next = _promoState.popupQueue.shift();
    if (next) {
        // Small delay between popups so they don't feel spammy
        setTimeout(function() {
            showPromoPopup(next);
        }, 800);
    }
}


function _promoPlaySound() {
    try {
        if (typeof SoundManager !== 'undefined' && SoundManager.soundEnabled && typeof playSound === 'function') {
            playSound('win');
        }
    } catch (e) { /* silent */ }
}


// ─────────────────────────────────────────────────────────────────────
// 4. INDIVIDUAL PROMO DEFINITIONS
// ─────────────────────────────────────────────────────────────────────

// ── 4a. First Deposit Bonus ──────────────────────────────────────────
function _promoCheckFirstDeposit() {
    const promoId = 'firstDeposit';
    if (_promoIsSuppressed(promoId)) return;
    if (localStorage.getItem(PROMO_KEY_FIRST_DEPOSIT) === 'shown') return;
    if (!currentUser) return;
    if (balance > 0) return; // only when balance is 0

    // Calculate countdown end: 24h from first trigger
    let deadline = localStorage.getItem(PROMO_KEY_FIRST_DEPOSIT + '_deadline');
    if (!deadline) {
        deadline = Date.now() + 24 * 60 * 60 * 1000;
        try { localStorage.setItem(PROMO_KEY_FIRST_DEPOSIT + '_deadline', String(deadline)); } catch (e) { /* ignore */ }
    } else {
        deadline = Number(deadline);
    }

    // Expired?
    if (Date.now() > deadline) {
        try { localStorage.setItem(PROMO_KEY_FIRST_DEPOSIT, 'shown'); } catch (e) { /* ignore */ }
        return;
    }

    const remaining = deadline - Date.now();
    const hours = Math.floor(remaining / 3600000);
    const mins  = Math.floor((remaining % 3600000) / 60000);
    const timerText = hours + 'h ' + mins + 'm remaining';

    showPromoPopup({
        id: promoId,
        icon: '\uD83C\uDF81',
        promoType: 'deposit',
        expiresAt: deadline,
        title: '🎁 Welcome Gift!',
        body: 'Make your first deposit and instantly receive <span class="promo-highlight">$5 bonus credits</span> + <span class="promo-highlight">1,000 gems</span> to get you started!',
        timer: timerText,
        cta: 'Deposit Now & Claim Bonus',
        onCta: function() {
            try { localStorage.setItem(PROMO_KEY_FIRST_DEPOSIT, 'shown'); } catch (e) { /* ignore */ }
            if (typeof showWalletModal === 'function' && currentUser) {
                showWalletModal();
            } else if (typeof addFunds === 'function') {
                addFunds();
            }
        },
        onDismiss: function() {
            try { localStorage.setItem(PROMO_KEY_FIRST_DEPOSIT, 'shown'); } catch (e) { /* ignore */ }
        }
    });

    // Start a live countdown updater
    _promoStartCountdown(promoId, deadline);
}


function _promoStartCountdown(promoId, deadline) {
    const intervalId = setInterval(function() {
        const el = document.getElementById('promoTimerText_' + promoId);
        if (!el) { clearInterval(intervalId); return; }
        const remaining = deadline - Date.now();
        if (remaining <= 0) {
            el.textContent = 'Offer expired!';
            clearInterval(intervalId);
            return;
        }
        const hours = Math.floor(remaining / 3600000);
        const mins  = Math.floor((remaining % 3600000) / 60000);
        const secs  = Math.floor((remaining % 60000) / 1000);
        el.textContent = hours + 'h ' + mins + 'm ' + secs + 's remaining';
    }, 1000);
}


// ── 4b. Loss Recovery Offer (escalating tiers) ──────────────────────
function _promoCheckLossRecovery() {
    const losses = _promoState.consecutiveLosses;
    if (losses < 5) return;

    // Determine tier: 5 losses = tier 1, 10 = tier 2, 15 = tier 3
    var tier = 0;
    if (losses >= 15 && !_promoSessionFlag('lossRecoveryT3')) tier = 3;
    else if (losses >= 10 && !_promoSessionFlag('lossRecoveryT2')) tier = 2;
    else if (losses >= 5 && !_promoSessionFlag('lossRecoveryT1')) tier = 1;
    else return;

    var promoId = 'lossRecovery';
    if (_promoIsSuppressed(promoId)) return;

    var pct = tier === 3 ? 0.20 : tier === 2 ? 0.15 : 0.10;
    var cashback = Math.max(1, Math.floor(_promoState.sessionLosses * pct * 100) / 100);
    var titles = ['', 'Cashback Offer!', 'Double Down Recovery!', 'Lucky Charm Rescue!'];
    var icons = ['', '\uD83D\uDCAA', '\u2728', '\uD83C\uDF1F'];
    var bodies = [
        '',
        'Rough streak! Here\'s <span class="promo-highlight">' + (pct * 100) + '% cashback</span> on your session losses!',
        losses + ' dry spins! Take <span class="promo-highlight">' + (pct * 100) + '% cashback</span> plus <span class="promo-highlight">3 free spins</span>!',
        'Hang in there! <span class="promo-highlight">' + (pct * 100) + '% cashback</span> plus your next win is <span class="promo-highlight">2x boosted</span>!'
    ];

    showPromoPopup({
        id: promoId,
        icon: icons[tier],
        promoType: 'cashback',
        title: titles[tier],
        body: bodies[tier],
        extraHtml: '<div class="promo-win-amount">$' + formatMoney(cashback) + '</div>',
        cta: 'Claim $' + formatMoney(cashback) + (tier >= 2 ? ' + Bonus' : ''),
        onCta: function() {
            balance += cashback;
            updateBalance();
            saveBalance();
            showToast('Cashback of $' + formatMoney(cashback) + ' added!', 'success');
            _promoSetSessionFlag('lossRecoveryT' + tier);
            _promoState.consecutiveLosses = 0;

            // Tier 2: award 3 free spins
            if (tier >= 2 && typeof freeSpinsRemaining !== 'undefined') {
                freeSpinsActive = true;
                freeSpinsRemaining += 3;
                freeSpinsMultiplier = 1;
                freeSpinsTotalWin = 0;
                showToast('3 Free Spins added!', 'success', 3000);
            }
            // Tier 3: activate 2x win boost for next 5 spins
            if (tier >= 3) {
                window._luckCharmSpins = 5;
                showToast('Lucky Charm active — next 5 wins are 2x!', 'success', 4000);
            }
        }
    });
}


// ── 4c. Low Balance Alert ────────────────────────────────────────────
function _promoCheckLowBalance() {
    const promoId = 'lowBalance';
    if (_promoIsSuppressed(promoId)) return;
    if (_promoState.lowBalanceShownThisSession) return;
    if (!currentUser) return;
    if (balance >= 5 || balance <= 0) return; // between 0 exclusive and 5

    _promoState.lowBalanceShownThisSession = true;

    showPromoPopup({
        id: promoId,
        icon: '\u26A0\uFE0F',
        promoType: 'deposit',
        title: 'Balance Running Low!',
        body: 'Your balance is <span class="promo-highlight">$' + formatMoney(balance) + '</span>. Top up now and get a <span class="promo-highlight">50% reload bonus</span>!',
        extraHtml: `
            <div class="promo-quick-btns">
                <button class="promo-quick-btn" onclick="dismissPromo('lowBalance'); _promoQuickDeposit(20);">$20</button>
                <button class="promo-quick-btn" onclick="dismissPromo('lowBalance'); _promoQuickDeposit(50);">$50</button>
                <button class="promo-quick-btn" onclick="dismissPromo('lowBalance'); _promoQuickDeposit(100);">$100</button>
            </div>
        `,
        cta: 'Open Cashier',
        onCta: function() {
            if (typeof showWalletModal === 'function' && currentUser) {
                showWalletModal();
            } else if (typeof addFunds === 'function') {
                addFunds();
            }
        }
    });
}

function _promoQuickDeposit(amount) {
    if (typeof showWalletModal === 'function' && currentUser) {
        showWalletModal();
    } else if (typeof addFunds === 'function') {
        addFunds();
    }
    showToast('Opening cashier for $' + amount + ' deposit...', 'info');
}


// ── 4d. Welcome Back Bonus ───────────────────────────────────────────
function _promoCheckWelcomeBack() {
    const promoId = 'welcomeBack';
    if (_promoIsSuppressed(promoId)) return;
    if (_promoSessionFlag('welcomeBackClaimed')) return;
    if (!currentUser) return;

    const lastVisit = localStorage.getItem(PROMO_KEY_LAST_VISIT);
    if (!lastVisit) return; // First visit ever — no welcome back

    const elapsed = Date.now() - Number(lastVisit);
    const sixHours = 6 * 60 * 60 * 1000;
    const twentyFourHours = 24 * 60 * 60 * 1000;

    // Golden hour: if away 6+ hours, auto-activate 1-hour happy hour
    if (elapsed >= sixHours && !_promoSessionFlag('goldenHourTriggered')) {
        _promoSetSessionFlag('goldenHourTriggered');
        const existingEnd = localStorage.getItem(PROMO_KEY_HAPPY_HOUR_END);
        if (!existingEnd || Date.now() >= Number(existingEnd)) {
            const goldenEndTime = Date.now() + 60 * 60 * 1000; // 1 hour
            try { localStorage.setItem(PROMO_KEY_HAPPY_HOUR_END, String(goldenEndTime)); } catch (e) { /* ignore */ }
            _promoActivateHappyHour(goldenEndTime);
            showToast('Golden Hour activated! All wins boosted 1.5x for 60 minutes!', 'success', 6000);
        }
    }

    // Full welcome back bonus only after 24 hours
    if (elapsed < twentyFourHours) return;

    const bonusAmount = 5;

    showPromoPopup({
        id: promoId,
        icon: '\uD83C\uDF1F',
        promoType: 'deposit',
        title: 'Welcome Back!',
        body: 'We missed you! Here\'s a free <span class="promo-highlight">$' + formatMoney(bonusAmount) + ' bonus</span> to get you started.',
        cta: 'Claim $' + formatMoney(bonusAmount) + ' Bonus',
        onCta: function() {
            balance += bonusAmount;
            updateBalance();
            saveBalance();
            showToast('Welcome back bonus of $' + formatMoney(bonusAmount) + ' added!', 'success');
            _promoSetSessionFlag('welcomeBackClaimed');
            _promoCoinDropEffect();
        },
        suppressible: true
    });
}


function _promoCoinDropEffect() {
    const coins = ['\uD83E\uDE99', '\uD83D\uDCB0', '\uD83E\uDE99', '\uD83D\uDCB0', '\uD83E\uDE99', '\uD83D\uDCB0'];
    coins.forEach(function(coin, i) {
        setTimeout(function() {
            const el = document.createElement('div');
            el.className = 'promo-coin-drop';
            el.textContent = coin;
            el.style.left = (15 + Math.random() * 70) + '%';
            el.style.animationDuration = (1.2 + Math.random() * 1.0) + 's';
            document.body.appendChild(el);
            setTimeout(function() {
                if (el.parentNode) el.parentNode.removeChild(el);
            }, 2500);
        }, i * 150);
    });
}


// ── 4e. Happy Hour ───────────────────────────────────────────────────
function _promoCheckHappyHour() {
    const promoId = 'happyHour';
    if (_promoIsSuppressed(promoId)) return;

    const playStart = localStorage.getItem(PROMO_KEY_PLAY_START);
    if (!playStart) return;

    const elapsed = Date.now() - Number(playStart);
    const twoHours = 2 * 60 * 60 * 1000;

    // Happy hour triggers every 2 hours of play
    if (elapsed < twoHours) return;

    // Already in happy hour?
    const existingEnd = localStorage.getItem(PROMO_KEY_HAPPY_HOUR_END);
    if (existingEnd && Date.now() < Number(existingEnd)) {
        // Restore happy hour state
        if (!_promoState.happyHourActive) {
            _promoActivateHappyHour(Number(existingEnd));
        }
        return;
    }

    // Don't re-show the popup if we already triggered one in this 2h cycle
    if (_promoSessionFlag('happyHourTriggered')) return;
    _promoSetSessionFlag('happyHourTriggered');

    const durationMs = 30 * 60 * 1000; // 30 minutes
    const endTime = Date.now() + durationMs;

    showPromoPopup({
        id: promoId,
        icon: '\uD83C\uDF89',
        promoType: 'freespin',
        expiresAt: endTime,
        title: 'Happy Hour!',
        body: 'All wins are <span class="promo-highlight">boosted 1.5x</span> for the next <span class="promo-highlight">30 minutes</span>! Make the most of it!',
        cta: 'Start Playing!',
        onCta: function() {
            try { localStorage.setItem(PROMO_KEY_HAPPY_HOUR_END, String(endTime)); } catch (e) { /* ignore */ }
            _promoActivateHappyHour(endTime);
            // Reset play timer for next cycle
            try { localStorage.setItem(PROMO_KEY_PLAY_START, String(Date.now())); } catch (e) { /* ignore */ }
        },
        suppressible: true
    });
}


function _promoActivateHappyHour(endTime) {
    _promoState.happyHourActive = true;

    // Show top banner
    let bar = document.getElementById('promoHappyHourBar');
    if (!bar) {
        bar = document.createElement('div');
        bar.id = 'promoHappyHourBar';
        bar.className = 'promo-happy-hour-bar';
        bar.innerHTML = '\uD83C\uDF89 HAPPY HOUR \u2014 All wins boosted 1.5x! <span class="promo-hh-timer" id="promoHHTimer"></span>';
        document.body.appendChild(bar);
    }

    requestAnimationFrame(function() {
        requestAnimationFrame(function() {
            bar.classList.add('active');
        });
    });

    // Update timer
    if (_promoState.happyHourBarTimer) clearInterval(_promoState.happyHourBarTimer);
    _promoState.happyHourBarTimer = setInterval(function() {
        const remaining = endTime - Date.now();
        const timerEl = document.getElementById('promoHHTimer');
        if (remaining <= 0 || !timerEl) {
            _promoDeactivateHappyHour();
            return;
        }
        const mins = Math.floor(remaining / 60000);
        const secs = Math.floor((remaining % 60000) / 1000);
        timerEl.textContent = mins + ':' + String(secs).padStart(2, '0');
    }, 1000);
}


function _promoDeactivateHappyHour() {
    _promoState.happyHourActive = false;
    try { localStorage.removeItem(PROMO_KEY_HAPPY_HOUR_END); } catch (e) { /* ignore */ }

    if (_promoState.happyHourBarTimer) {
        clearInterval(_promoState.happyHourBarTimer);
        _promoState.happyHourBarTimer = null;
    }

    const bar = document.getElementById('promoHappyHourBar');
    if (bar) {
        bar.classList.remove('active');
        setTimeout(function() {
            if (bar.parentNode) bar.parentNode.removeChild(bar);
        }, 500);
    }

    showToast('Happy Hour has ended. See you next time!', 'info');
}


/**
 * Returns the current happy hour multiplier.
 * Other modules can call this to check if happy hour is active.
 */
function getHappyHourMultiplier() {
    if (!_promoState.happyHourActive) return 1;
    const end = Number(localStorage.getItem(PROMO_KEY_HAPPY_HOUR_END) || 0);
    if (Date.now() > end) {
        _promoDeactivateHappyHour();
        return 1;
    }
    return 1.5;
}


// ── 4f. Post-Win Upsell ──────────────────────────────────────────────
function _promoCheckPostWin(winAmount, betAmount) {
    const promoId = 'postWinUpsell';
    if (_promoIsSuppressed(promoId)) return;
    if (_promoState.postWinShownThisSession) return;
    if (!currentUser) return;
    if (!winAmount || !betAmount || betAmount <= 0) return;

    const multiplier = winAmount / betAmount;
    if (multiplier < 10) return; // only 10x+ wins

    _promoState.postWinShownThisSession = true;

    showPromoPopup({
        id: promoId,
        icon: '\uD83C\uDF86',
        promoType: 'deposit',
        title: 'Incredible Win!',
        body: 'You just won <span class="promo-highlight">' + multiplier.toFixed(1) + 'x</span> your bet! Double down with a deposit and get <span class="promo-highlight">25% extra</span>!',
        extraHtml: '<div class="promo-win-amount">$' + formatMoney(winAmount) + '</div>',
        cta: 'Deposit & Get 25% Bonus',
        onCta: function() {
            if (typeof showWalletModal === 'function' && currentUser) {
                showWalletModal();
            } else if (typeof addFunds === 'function') {
                addFunds();
            }
        }
    });
}


// ─────────────────────────────────────────────────────────────────────
// 5. TRIGGER DISPATCHER
// ─────────────────────────────────────────────────────────────────────

/**
 * Check all promo conditions based on an event.
 * Call this after spins, deposits, logins, etc.
 *
 * @param {string} event — 'spin_result', 'login', 'deposit', 'page_load', 'balance_change'
 * @param {Object} [data] — event-specific data
 *   For 'spin_result': { won: boolean, winAmount: number, betAmount: number }
 */
function checkPromoTriggers(event, data) {
    if (!_promoState.initialized) return;

    const d = data || {};

    switch (event) {
        case 'spin_result':
            if (d.won) {
                _promoState.consecutiveLosses = 0;
                // Lucky charm 2x boost (from tier 3 loss recovery)
                if (window._luckCharmSpins && window._luckCharmSpins > 0 && d.winAmount > 0) {
                    var charmBonus = d.winAmount; // double the win
                    balance += charmBonus;
                    if (typeof updateBalance === 'function') updateBalance();
                    if (typeof saveBalance === 'function') saveBalance();
                    if (typeof showToast === 'function') showToast('🍀 Lucky Charm Active! +$' + charmBonus.toFixed(2) + ' bonus!', 'win', 3000);
                    window._luckCharmSpins--;
                    if (window._luckCharmSpins <= 0) {
                        showToast('Lucky Charm expired', 'info', 2000);
                    }
                }
                _promoCheckPostWin(d.winAmount, d.betAmount);
            } else {
                _promoState.consecutiveLosses++;
                _promoState.sessionLosses += (d.betAmount || 0);
                _promoState.lastSpinWasLoss = true;

                // Loss recovery — escalating tiers at 5, 10, 15 losses
                if (_promoState.consecutiveLosses >= 5) {
                    _promoCheckLossRecovery();
                }
                // Lucky charm win boost (set by tier 3 loss recovery)
                if (window._luckCharmSpins && window._luckCharmSpins > 0) {
                    // decrement on loss too so it doesn't last forever
                    window._luckCharmSpins--;
                }
            }
            // Low balance after any spin
            _promoCheckLowBalance();
            break;

        case 'login':
            _promoCheckWelcomeBack();
            // Slight delay so login transition settles
            setTimeout(function() { _promoCheckFirstDeposit(); }, 2000);
            break;

        case 'page_load':
            _promoCheckWelcomeBack();
            // Restore happy hour if still active
            _promoCheckHappyHour();
            break;

        case 'deposit':
            // After deposit, mark first deposit promo as used
            try { localStorage.setItem(PROMO_KEY_FIRST_DEPOSIT, 'shown'); } catch (e) { /* ignore */ }
            _promoState.lowBalanceShownThisSession = false; // allow re-trigger
            break;

        case 'balance_change':
            _promoCheckLowBalance();
            break;

        default:
            break;
    }
}


// ─────────────────────────────────────────────────────────────────────
// 4g. Deposit Streak Promo Card
// ─────────────────────────────────────────────────────────────────────

var _STREAK_REWARDS_STATIC = {
    1: { gems: 100,  credits: 0,     label: 'Day 1 Bonus' },
    2: { gems: 150,  credits: 0,     label: 'Day 2 Bonus' },
    3: { gems: 300,  credits: 2.00,  label: 'Day 3 Bonus' },
    4: { gems: 300,  credits: 0,     label: 'Day 4 Bonus' },
    5: { gems: 500,  credits: 5.00,  label: 'Day 5 Bonus' },
    6: { gems: 500,  credits: 0,     label: 'Day 6 Bonus' },
    7: { gems: 1000, credits: 10.00, label: 'Day 7 MEGA Bonus' }
};

(function _injectDepositStreakStyles() {
    if (document.getElementById('depositStreakCss')) return;
    var s = document.createElement('style');
    s.id = 'depositStreakCss';
    s.textContent =
        '.ds-card{background:linear-gradient(145deg,rgba(10,10,30,.95),rgba(20,10,50,.98));' +
        'border:1.5px solid rgba(251,191,36,.45);border-radius:16px;padding:18px 16px 14px;' +
        'color:#e0e7ff;margin-bottom:16px;box-shadow:0 4px 24px rgba(251,191,36,.12);}' +
        '.ds-title{font-size:15px;font-weight:900;color:#fbbf24;text-align:center;margin-bottom:12px;letter-spacing:.3px;}' +
        '.ds-circles{display:flex;justify-content:space-between;gap:4px;margin-bottom:10px;}' +
        '.ds-day{flex:1;min-width:0;text-align:center;border-radius:8px;padding:6px 2px;cursor:default;transition:transform .15s;}' +
        '.ds-day-done{background:linear-gradient(135deg,#d97706,#fbbf24);border:1px solid #fbbf24;color:#000;}' +
        '.ds-day-today{background:rgba(251,191,36,.15);border:2px solid #fbbf24;color:#fbbf24;' +
        'animation:dsPulse 1.4s ease-in-out infinite;box-shadow:0 0 12px rgba(251,191,36,.5);}' +
        '.ds-day-mega{background:rgba(167,139,250,.12);border:1.5px solid rgba(167,139,250,.5);color:#a78bfa;}' +
        '.ds-day-dim{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);color:rgba(255,255,255,.3);}' +
        '.ds-day-num{font-size:13px;font-weight:800;line-height:1.2;}' +
        '.ds-day-gem{font-size:8px;margin-top:2px;opacity:.75;}' +
        '.ds-status{font-size:11px;text-align:center;margin:6px 0 10px;line-height:1.5;color:rgba(255,255,255,.65);}' +
        '.ds-status-active{color:#34d399;}' +
        '.ds-status-info{color:rgba(255,255,255,.6);}' +
        '.ds-mega-hint{color:#a78bfa;font-weight:700;display:block;margin-top:2px;}' +
        '.ds-cta-btn{width:100%;padding:9px;border:none;border-radius:8px;font-size:13px;font-weight:800;cursor:pointer;' +
        'background:linear-gradient(135deg,#d97706,#fbbf24);color:#000;transition:opacity .2s;}' +
        '.ds-cta-btn:hover{opacity:.85;}' +
        '.ds-cta-done{background:rgba(255,255,255,.08);color:rgba(255,255,255,.4);cursor:not-allowed;}' +
        '.ds-cta-done:hover{opacity:1;}' +
        '@keyframes dsPulse{0%,100%{box-shadow:0 0 8px rgba(251,191,36,.4);}50%{box-shadow:0 0 18px rgba(251,191,36,.8);}}';
    document.head.appendChild(s);
})();

(function _injectDailyMissionStyles() {
    if (document.getElementById('dailyMissionCss')) return;
    var s = document.createElement('style');
    s.id = 'dailyMissionCss';
    s.textContent =
        '.dm-card{background:linear-gradient(145deg,rgba(10,10,30,.95),rgba(5,20,40,.98));' +
        'border:1.5px solid rgba(99,102,241,.45);border-radius:16px;padding:18px 16px 14px;' +
        'color:#e0e7ff;margin-bottom:16px;box-shadow:0 4px 24px rgba(99,102,241,.12);}' +
        '.dm-title{font-size:15px;font-weight:900;color:#818cf8;text-align:center;margin-bottom:12px;letter-spacing:.3px;}' +
        '.dm-mission{display:flex;align-items:center;gap:10px;padding:8px 6px;border-radius:8px;margin-bottom:6px;background:rgba(255,255,255,.03);}' +
        '.dm-mission-info{flex:1;min-width:0;}' +
        '.dm-mission-label{font-size:12px;color:#c7d2fe;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}' +
        '.dm-mission-progress{font-size:10px;color:rgba(255,255,255,.4);margin-top:2px;}' +
        '.dm-bar-track{height:4px;background:rgba(255,255,255,.1);border-radius:2px;margin-top:4px;}' +
        '.dm-bar-fill{height:100%;border-radius:2px;background:linear-gradient(90deg,#6366f1,#818cf8);transition:width .4s;}' +
        '.dm-claim-btn{flex-shrink:0;padding:5px 10px;border:none;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer;' +
        'background:linear-gradient(135deg,#6366f1,#818cf8);color:#fff;}' +
        '.dm-claim-btn:disabled{background:rgba(255,255,255,.1);color:rgba(255,255,255,.3);cursor:not-allowed;}' +
        '.dm-claimed{flex-shrink:0;font-size:18px;}' +
        '.dm-reward{font-size:10px;color:#a5b4fc;margin-top:2px;}';
    document.head.appendChild(s);
})();

function _buildDepositStreakCardEl(data) {
    var streak         = (data && typeof data.streak === 'number')  ? data.streak  : 0;
    var nextDay        = (data && typeof data.nextDay === 'number') ? data.nextDay : 1;
    var depositedToday = data ? !!data.depositedToday : false;
    var rewards        = (data && data.rewards) ? data.rewards : _STREAK_REWARDS_STATIC;
    var isStatic       = !data;

    var card = document.createElement('div');
    card.className = 'ds-card';
    card.id = 'depositStreakCard';

    var title = document.createElement('div');
    title.className = 'ds-title';
    title.textContent = '\uD83D\uDCB0 Daily Deposit Streak';
    card.appendChild(title);

    var circles = document.createElement('div');
    circles.className = 'ds-circles';
    for (var d = 1; d <= 7; d++) {
        var isDone   = (d <= streak && !isStatic);
        var isToday  = (!isStatic && d === nextDay && !depositedToday);
        var isMega   = (d === 7);
        var r        = rewards[d] || { gems: 0, credits: 0 };

        var dayEl = document.createElement('div');
        var cls = 'ds-day';
        if (isDone)       cls += ' ds-day-done';
        else if (isToday) cls += ' ds-day-today';
        else if (isMega)  cls += ' ds-day-mega';
        else              cls += ' ds-day-dim';
        dayEl.className = cls;
        dayEl.title = r.gems + ' gems' + (r.credits > 0 ? ' + $' + r.credits.toFixed(0) : '');

        var dayNum = document.createElement('div');
        dayNum.className = 'ds-day-num';
        dayNum.textContent = (d === 7) ? '\uD83D\uDC8E' : String(d);

        var dayGem = document.createElement('div');
        dayGem.className = 'ds-day-gem';
        dayGem.textContent = String(r.gems);

        dayEl.appendChild(dayNum);
        dayEl.appendChild(dayGem);
        circles.appendChild(dayEl);
    }
    card.appendChild(circles);

    var statusEl = document.createElement('div');
    statusEl.className = 'ds-status';
    if (isStatic) {
        statusEl.className += ' ds-status-info';
        statusEl.appendChild(document.createTextNode('Deposit daily to build your streak!'));
        statusEl.appendChild(document.createElement('br'));
        var hint = document.createElement('span');
        hint.className = 'ds-mega-hint';
        hint.textContent = 'Day 7 MEGA = 1000 gems + $10 credits!';
        statusEl.appendChild(hint);
    } else if (depositedToday) {
        statusEl.className += ' ds-status-active';
        statusEl.textContent = '\u2705 Streak active! Day ' + streak + ' complete \u2014 come back tomorrow!';
    } else if (streak === 0) {
        statusEl.className += ' ds-status-info';
        statusEl.textContent = 'Start fresh \u2014 Day 1 gives you 100 gems!';
    } else {
        statusEl.className += ' ds-status-info';
        var nextReward = rewards[nextDay] || { gems: 100, credits: 0 };
        var preview = nextReward.gems + ' gems' + (nextReward.credits > 0 ? ' + $' + nextReward.credits.toFixed(0) + ' credits' : '');
        statusEl.textContent = 'Deposit today \u2192 earn ' + preview + '!';
    }
    card.appendChild(statusEl);

    var ctaDone = (!isStatic && depositedToday);
    var ctaBtn = document.createElement('button');
    ctaBtn.className = 'ds-cta-btn' + (ctaDone ? ' ds-cta-done' : '');
    ctaBtn.id = 'dsCtaBtn';
    ctaBtn.textContent = ctaDone ? '\u23F0 Come back tomorrow' : '\uD83D\uDCB3 Deposit Now';
    if (!ctaDone) {
        ctaBtn.addEventListener('click', function() {
            if (typeof showWalletModal === 'function' && typeof currentUser !== 'undefined' && currentUser) {
                showWalletModal();
            } else if (typeof addFunds === 'function') {
                addFunds();
            }
        });
    }
    card.appendChild(ctaBtn);

    return card;
}

function renderDepositStreakCard(container) {
    if (!container) return;

    var existing = document.getElementById('depositStreakCard');
    if (existing && existing.parentNode) existing.parentNode.removeChild(existing);

    var token = null;
    try {
        var tokenKey = (typeof STORAGE_KEY_AUTH_TOKEN !== 'undefined')
            ? STORAGE_KEY_AUTH_TOKEN
            : 'matrix_auth_token';
        token = localStorage.getItem(tokenKey) || localStorage.getItem('matrix_auth_token');
    } catch (e) {}

    function _insertCard(data) {
        var card = _buildDepositStreakCardEl(data);
        if (container.firstChild) {
            container.insertBefore(card, container.firstChild);
        } else {
            container.appendChild(card);
        }
    }

    if (!token) {
        _insertCard(null);
        return;
    }

    fetch('/api/deposit-streak/status', {
        headers: { 'Authorization': 'Bearer ' + token }
    }).then(function(res) {
        if (!res.ok) { _insertCard(null); return; }
        return res.json();
    }).then(function(data) {
        if (data !== undefined) _insertCard(data);
    }).catch(function() {
        _insertCard(null);
    });
}


// ─────────────────────────────────────────────────────────────────────
// 4g-bis. Daily Missions Card — CSS (promo-missions-css)
// ─────────────────────────────────────────────────────────────────────
(function _injectPromoMissionsCss() {
    if (document.getElementById('promo-missions-css')) return;
    var s = document.createElement('style');
    s.id = 'promo-missions-css';
    s.textContent = [
        '.promo-missions-card{background:linear-gradient(135deg,#0a0a1a,#111128);border:1px solid #2a2a4a;border-radius:12px;padding:16px;margin-bottom:14px;color:#fff;}',
        '.promo-missions-title{font-size:16px;font-weight:700;color:#ffd700;margin:0 0 4px;}',
        '.promo-missions-subtitle{font-size:12px;color:#888;margin:0 0 12px;}',
        '.pm-mission-row{display:flex;flex-direction:column;gap:4px;margin-bottom:10px;padding-bottom:10px;border-bottom:1px solid #1a1a3a;}',
        '.pm-mission-row:last-child{border-bottom:none;margin-bottom:0;padding-bottom:0;}',
        '.pm-mission-label{font-size:13px;color:#ccc;}',
        '.pm-mission-progress-bar{height:6px;background:#222;border-radius:3px;overflow:hidden;}',
        '.pm-mission-progress-fill{height:100%;background:linear-gradient(90deg,#6c63ff,#a78bfa);border-radius:3px;transition:width 0.3s;}',
        '.pm-mission-meta{display:flex;align-items:center;justify-content:space-between;font-size:11px;}',
        '.pm-mission-count{color:#888;}',
        '.pm-mission-reward-cash{color:#4ade80;font-weight:700;}',
        '.pm-mission-reward-pts{color:#60a5fa;font-weight:700;}',
        '.pm-claim-btn{padding:4px 12px;background:linear-gradient(135deg,#22c55e,#16a34a);color:#fff;font-weight:700;font-size:12px;border-radius:6px;border:none;cursor:pointer;}',
        '.pm-claimed-text{color:#555;font-size:12px;}',
        '.pm-challenge-row{display:flex;flex-direction:column;gap:4px;margin-bottom:10px;padding-bottom:10px;border-bottom:1px solid #1a1a3a;}',
        '.pm-challenge-row:last-child{border-bottom:none;margin-bottom:0;padding-bottom:0;}',
        '.pm-challenge-title{font-size:13px;font-weight:600;color:#e2e8f0;}',
        '.pm-challenge-desc{font-size:11px;color:#888;}',
        '.pm-challenge-claim-btn{padding:4px 12px;background:linear-gradient(135deg,#f59e0b,#d97706);color:#000;font-weight:700;font-size:12px;border-radius:6px;border:none;cursor:pointer;}',
        '.pm-streak-badge{font-size:12px;color:#f59e0b;font-weight:700;margin-bottom:8px;}'
    ].join('');
    document.head.appendChild(s);
})();

// ─────────────────────────────────────────────────────────────────────
// 4g. Daily Missions Card
// ─────────────────────────────────────────────────────────────────────

async function renderDailyMissionsCard(container) {
    if (!container) return;
    if (document.getElementById('dailyMissionsCard')) return;

    if (typeof isServerAuthToken === 'function' && !isServerAuthToken()) return;
    var token = localStorage.getItem(typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken');
    if (!token) return;

    // Build card shell using createElement only
    var card = document.createElement('div');
    card.id = 'dailyMissionsCard';
    card.className = 'promo-missions-card';

    var titleEl = document.createElement('p');
    titleEl.className = 'promo-missions-title';
    titleEl.textContent = '\uD83D\uDCCB Daily Missions';
    card.appendChild(titleEl);

    var subtitleEl = document.createElement('p');
    subtitleEl.className = 'promo-missions-subtitle';
    subtitleEl.textContent = "Today's Tasks";
    card.appendChild(subtitleEl);

    var listEl = document.createElement('div');
    listEl.id = 'dmMissionList';
    var loadingEl = document.createElement('div');
    loadingEl.style.cssText = 'text-align:center;padding:8px;opacity:.5;font-size:12px;';
    loadingEl.textContent = 'Loading\u2026';
    listEl.appendChild(loadingEl);
    card.appendChild(listEl);

    container.insertBefore(card, container.firstChild);

    await _refreshDailyMissions(token);

    // Refresh every 30 seconds
    var _dmInterval = setInterval(function() {
        if (!document.getElementById('dailyMissionsCard')) {
            clearInterval(_dmInterval);
            return;
        }
        _refreshDailyMissions(token);
    }, 30000);
}

async function _refreshDailyMissions(token) {
    var list = document.getElementById('dmMissionList');
    if (!list) return;
    try {
        var res = await fetch('/api/dailymissions', { headers: { 'Authorization': 'Bearer ' + token } });
        if (!res.ok) {
            while (list.firstChild) list.removeChild(list.firstChild);
            return;
        }
        var data = await res.json();
        var missions = data.missions || [];

        while (list.firstChild) list.removeChild(list.firstChild);

        if (missions.length === 0) {
            var emptyEl = document.createElement('div');
            emptyEl.style.cssText = 'text-align:center;padding:8px;opacity:.5;font-size:12px;';
            emptyEl.textContent = 'No missions today';
            list.appendChild(emptyEl);
            return;
        }

        missions.forEach(function(m) {
            var pct = m.target > 0 ? Math.min(100, Math.round((m.progress / m.target) * 100)) : 0;
            var done = !!m.completed;
            var claimed = !!m.claimed;

            var row = document.createElement('div');
            row.className = 'pm-mission-row';

            // Label
            var labelEl = document.createElement('div');
            labelEl.className = 'pm-mission-label';
            labelEl.textContent = m.label || 'Mission';
            row.appendChild(labelEl);

            // Progress bar
            var barOuter = document.createElement('div');
            barOuter.className = 'pm-mission-progress-bar';
            var barFill = document.createElement('div');
            barFill.className = 'pm-mission-progress-fill';
            barFill.style.width = String(pct) + '%';
            barOuter.appendChild(barFill);
            row.appendChild(barOuter);

            // Meta row: count + reward/action
            var metaEl = document.createElement('div');
            metaEl.className = 'pm-mission-meta';

            var countEl = document.createElement('span');
            countEl.className = 'pm-mission-count';
            countEl.textContent = String(m.progress) + ' / ' + String(m.target);
            metaEl.appendChild(countEl);

            if (claimed) {
                var claimedEl = document.createElement('span');
                claimedEl.className = 'pm-claimed-text';
                claimedEl.textContent = '\u2705 Claimed';
                metaEl.appendChild(claimedEl);
            } else if (done) {
                // Reward badge
                var rewardBadge = document.createElement('span');
                if (m.reward_type === 'cash' || m.reward_type === 'credits') {
                    rewardBadge.className = 'pm-mission-reward-cash';
                    rewardBadge.textContent = '$' + parseFloat(m.reward_amount).toFixed(2);
                } else if (m.reward_type === 'points') {
                    rewardBadge.className = 'pm-mission-reward-pts';
                    rewardBadge.textContent = String(m.reward_amount) + ' pts';
                } else {
                    rewardBadge.className = 'pm-mission-reward-cash';
                    rewardBadge.textContent = String(m.reward_amount);
                }
                metaEl.appendChild(rewardBadge);

                var claimBtn = document.createElement('button');
                claimBtn.className = 'pm-claim-btn';
                claimBtn.textContent = m.reward_type === 'cash' || m.reward_type === 'credits'
                    ? 'Claim $' + parseFloat(m.reward_amount).toFixed(2)
                    : 'Claim';
                (function(slot) {
                    claimBtn.addEventListener('click', function() { claimDailyMission(slot); });
                }(m.slot));
                metaEl.appendChild(claimBtn);
            } else {
                // Not yet complete — show reward badge only
                var rewardOnly = document.createElement('span');
                if (m.reward_type === 'cash' || m.reward_type === 'credits') {
                    rewardOnly.className = 'pm-mission-reward-cash';
                    rewardOnly.textContent = '$' + parseFloat(m.reward_amount).toFixed(2);
                } else if (m.reward_type === 'points') {
                    rewardOnly.className = 'pm-mission-reward-pts';
                    rewardOnly.textContent = String(m.reward_amount) + ' pts';
                } else {
                    rewardOnly.className = 'pm-mission-reward-cash';
                    rewardOnly.textContent = String(m.reward_amount);
                }
                metaEl.appendChild(rewardOnly);
            }

            row.appendChild(metaEl);
            list.appendChild(row);
        });
    } catch (e) {
        // Silently fail
    }
}

async function claimDailyMission(slot) {
    if (typeof isServerAuthToken === 'function' && !isServerAuthToken()) return;
    var token = localStorage.getItem(typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken');
    if (!token) return;
    try {
        var res = await fetch('/api/dailymissions/claim/' + String(slot), {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + token }
        });
        var data = await res.json();
        if (data.success) {
            var rewardMsg;
            if (data.reward_type === 'gems') {
                rewardMsg = String(data.reward_amount) + ' gems!';
            } else if (data.reward_type === 'credits' || data.reward_type === 'cash') {
                rewardMsg = '$' + parseFloat(data.reward_amount).toFixed(2) + ' credited!';
            } else {
                rewardMsg = 'reward!';
            }
            if (typeof showToast === 'function') showToast('\uD83D\uDCCB Mission complete! You earned ' + rewardMsg, 'win');
            if (data.newBalance !== undefined && typeof updateBalanceDisplay === 'function') {
                updateBalanceDisplay(data.newBalance);
            }
            await _refreshDailyMissions(token);
        }
    } catch (e) {}
}

// ─────────────────────────────────────────────────────────────────────
// 4h. Daily Challenges Card
// ─────────────────────────────────────────────────────────────────────

(function _injectChallengeStyles() {
    if (document.getElementById('dailyChallengeCss')) return;
    var s = document.createElement('style');
    s.id = 'dailyChallengeCss';
    s.textContent =
        '.dch-card{background:linear-gradient(145deg,rgba(20,5,40,.96),rgba(30,10,60,.98));' +
        'border:1.5px solid rgba(167,139,250,.45);border-radius:16px;padding:18px 16px 14px;' +
        'color:#e0e7ff;margin-bottom:16px;box-shadow:0 4px 24px rgba(167,139,250,.12);}' +
        '.dch-title{font-size:15px;font-weight:900;color:#c084fc;text-align:center;margin-bottom:12px;letter-spacing:.3px;}' +
        '.dch-item{display:flex;align-items:center;gap:10px;padding:8px 6px;border-radius:8px;margin-bottom:6px;background:rgba(255,255,255,.03);}' +
        '.dch-info{flex:1;min-width:0;}' +
        '.dch-desc{font-size:12px;color:#d8b4fe;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}' +
        '.dch-prog-text{font-size:10px;color:rgba(255,255,255,.4);margin-top:2px;}' +
        '.dch-bar-track{height:4px;background:rgba(255,255,255,.1);border-radius:2px;margin-top:4px;}' +
        '.dch-bar-fill{height:100%;border-radius:2px;background:linear-gradient(90deg,#a855f7,#c084fc);transition:width .4s;}' +
        '.dch-reward-badge{font-size:10px;color:#c084fc;margin-top:2px;}' +
        '.dch-claim-btn{flex-shrink:0;padding:5px 10px;border:none;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer;' +
        'background:linear-gradient(135deg,#9333ea,#c084fc);color:#fff;transition:opacity .2s;}' +
        '.dch-claim-btn:hover{opacity:.85;}' +
        '.dch-claimed{flex-shrink:0;font-size:18px;}' +
        '.dch-streak{font-size:11px;text-align:center;margin-top:8px;color:#a78bfa;font-weight:600;}';
    document.head.appendChild(s);
})();

async function renderDailyChallengesCard(container) {
    if (!container) return;
    if (document.getElementById('dailyChallengesCard')) return;

    if (typeof isServerAuthToken === 'function' && !isServerAuthToken()) return;
    var token = localStorage.getItem(typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken');
    if (!token) return;

    var card = document.createElement('div');
    card.id = 'dailyChallengesCard';
    card.className = 'promo-missions-card';

    var titleEl = document.createElement('p');
    titleEl.className = 'promo-missions-title';
    titleEl.textContent = '\uD83C\uDFC6 Daily Challenges';
    card.appendChild(titleEl);

    // Streak badge (populated after fetch)
    var streakEl = document.createElement('div');
    streakEl.id = 'dchStreakRow';
    streakEl.className = 'pm-streak-badge';
    card.appendChild(streakEl);

    var listEl = document.createElement('div');
    listEl.id = 'dchChallengeList';
    var loadingEl = document.createElement('div');
    loadingEl.style.cssText = 'text-align:center;padding:8px;opacity:.5;font-size:12px;';
    loadingEl.textContent = 'Loading\u2026';
    listEl.appendChild(loadingEl);
    card.appendChild(listEl);

    container.insertBefore(card, container.firstChild);

    await _refreshDailyChallenges(token);

    // Refresh every 30 seconds
    var _dchInterval = setInterval(function() {
        if (!document.getElementById('dailyChallengesCard')) {
            clearInterval(_dchInterval);
            return;
        }
        _refreshDailyChallenges(token);
    }, 30000);
}

async function _refreshDailyChallenges(token) {
    var list = document.getElementById('dchChallengeList');
    var streakRow = document.getElementById('dchStreakRow');
    if (!list) return;

    try {
        var res = await fetch('/api/challenges', { headers: { 'Authorization': 'Bearer ' + token } });
        if (!res.ok) {
            while (list.firstChild) list.removeChild(list.firstChild);
            return;
        }
        var data = await res.json();
        var challenges = data.challenges || [];

        while (list.firstChild) list.removeChild(list.firstChild);

        // Update streak badge
        if (streakRow) {
            var streak = data.streak || 0;
            if (streak > 0) {
                streakRow.textContent = 'Day Streak: ' + String(streak) + ' \uD83D\uDD25';
            } else {
                streakRow.textContent = '';
            }
        }

        if (challenges.length === 0) {
            var emptyEl = document.createElement('div');
            emptyEl.style.cssText = 'text-align:center;padding:8px;opacity:.5;font-size:12px;';
            emptyEl.textContent = 'No challenges today';
            list.appendChild(emptyEl);
        } else {
            challenges.forEach(function(ch) {
                var pct = ch.target > 0 ? Math.min(100, Math.round((ch.progress / ch.target) * 100)) : 0;

                var row = document.createElement('div');
                row.className = 'pm-challenge-row';

                // Title
                var titleEl = document.createElement('div');
                titleEl.className = 'pm-challenge-title';
                titleEl.textContent = ch.title || 'Challenge';
                row.appendChild(titleEl);

                // Description
                var descEl = document.createElement('div');
                descEl.className = 'pm-challenge-desc';
                descEl.textContent = ch.description || '';
                row.appendChild(descEl);

                // Progress bar
                var barOuter = document.createElement('div');
                barOuter.className = 'pm-mission-progress-bar';
                var barFill = document.createElement('div');
                barFill.className = 'pm-mission-progress-fill';
                barFill.style.width = String(pct) + '%';
                barOuter.appendChild(barFill);
                row.appendChild(barOuter);

                // Meta row: progress count + reward/action
                var metaEl = document.createElement('div');
                metaEl.className = 'pm-mission-meta';

                var countEl = document.createElement('span');
                countEl.className = 'pm-mission-count';
                countEl.textContent = String(ch.progress) + ' / ' + String(ch.target);
                metaEl.appendChild(countEl);

                // Reward display
                var rewardParts = [];
                if (ch.reward_gems) rewardParts.push('\uD83D\uDC8E ' + String(ch.reward_gems) + ' gems');
                if (ch.reward_credits) rewardParts.push('$' + parseFloat(ch.reward_credits).toFixed(2));
                var rewardEl = document.createElement('span');
                rewardEl.className = 'pm-mission-reward-cash';
                rewardEl.textContent = rewardParts.join(' + ');
                metaEl.appendChild(rewardEl);

                row.appendChild(metaEl);

                // Action: claimed / claim button / no button
                if (ch.claimed) {
                    var doneEl = document.createElement('span');
                    doneEl.className = 'pm-claimed-text';
                    doneEl.textContent = '\u2705 Done';
                    row.appendChild(doneEl);
                } else if (ch.completed) {
                    var claimBtn = document.createElement('button');
                    claimBtn.className = 'pm-challenge-claim-btn';
                    claimBtn.textContent = 'Claim';
                    (function(id) {
                        claimBtn.addEventListener('click', function() { claimChallenge(id); });
                    }(ch.id));
                    row.appendChild(claimBtn);
                }

                list.appendChild(row);
            });
        }
    } catch (e) {
        while (list.firstChild) list.removeChild(list.firstChild);
    }
}


// ─────────────────────────────────────────────────────────────────────
// 4i. Battle Pass Card
// ─────────────────────────────────────────────────────────────────────

(function _injectBattlePassStyles() {
    if (document.getElementById('battlePassCss')) return;
    var s = document.createElement('style');
    s.id = 'battlePassCss';
    s.textContent =
        '.bp-card{background:linear-gradient(145deg,rgba(5,15,40,.96),rgba(10,25,55,.98));' +
        'border:1.5px solid rgba(251,191,36,.45);border-radius:16px;padding:18px 16px 14px;' +
        'color:#e0e7ff;margin-bottom:16px;box-shadow:0 4px 24px rgba(251,191,36,.1);}' +
        '.bp-title{font-size:14px;font-weight:900;color:#fbbf24;text-align:center;margin-bottom:4px;letter-spacing:.3px;}' +
        '.bp-season-end{font-size:10px;color:rgba(255,255,255,.45);text-align:center;margin-bottom:10px;}' +
        '.bp-level-row{display:flex;align-items:baseline;justify-content:center;gap:6px;margin-bottom:6px;}' +
        '.bp-level-num{font-size:22px;font-weight:900;color:#fbbf24;}' +
        '.bp-level-label{font-size:11px;color:rgba(255,255,255,.5);}' +
        '.bp-xp-text{font-size:10px;color:rgba(255,255,255,.4);text-align:center;margin-bottom:4px;}' +
        '.bp-xp-track{height:6px;background:rgba(255,255,255,.08);border-radius:3px;margin-bottom:12px;overflow:hidden;}' +
        '.bp-xp-fill{height:100%;background:linear-gradient(90deg,#d97706,#fbbf24);border-radius:3px;transition:width .5s;}' +
        '.bp-rewards-label{font-size:10px;color:rgba(255,255,255,.4);text-transform:uppercase;letter-spacing:.6px;margin-bottom:6px;}' +
        '.bp-reward-item{display:flex;align-items:center;gap:10px;padding:7px 6px;border-radius:8px;margin-bottom:5px;background:rgba(255,255,255,.03);}' +
        '.bp-tier-badge{flex-shrink:0;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;' +
        'font-size:11px;font-weight:800;background:rgba(251,191,36,.15);border:1px solid rgba(251,191,36,.35);color:#fbbf24;}' +
        '.bp-reward-info{flex:1;min-width:0;}' +
        '.bp-reward-name{font-size:11px;color:#fde68a;}' +
        '.bp-claim-btn{flex-shrink:0;padding:5px 10px;border:none;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer;' +
        'background:linear-gradient(135deg,#d97706,#fbbf24);color:#000;transition:opacity .2s;}' +
        '.bp-claim-btn:hover{opacity:.85;}' +
        '.bp-claimed-mark{flex-shrink:0;font-size:16px;}' +
        '.bp-locked{flex-shrink:0;font-size:14px;opacity:.4;}';
    document.head.appendChild(s);
})();

async function renderBattlePassCard(container) {
    if (!container) return;
    if (document.getElementById('battlePassCard')) return;

    var token = localStorage.getItem(typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken');
    if (!token) return;

    var card = document.createElement('div');
    card.id = 'battlePassCard';
    card.className = 'bp-card';

    var titleEl = document.createElement('div');
    titleEl.className = 'bp-title';
    titleEl.id = 'bpTitle';
    titleEl.textContent = '\uD83C\uDF96\uFE0F Battle Pass';
    card.appendChild(titleEl);

    var seasonEndEl = document.createElement('div');
    seasonEndEl.className = 'bp-season-end';
    seasonEndEl.id = 'bpSeasonEnd';
    seasonEndEl.textContent = 'Loading\u2026';
    card.appendChild(seasonEndEl);

    var levelRow = document.createElement('div');
    levelRow.className = 'bp-level-row';
    var levelNum = document.createElement('div');
    levelNum.className = 'bp-level-num';
    levelNum.id = 'bpLevelNum';
    levelNum.textContent = '\u2014';
    var levelLabel = document.createElement('div');
    levelLabel.className = 'bp-level-label';
    levelLabel.textContent = 'Level';
    levelRow.appendChild(levelNum);
    levelRow.appendChild(levelLabel);
    card.appendChild(levelRow);

    var xpText = document.createElement('div');
    xpText.className = 'bp-xp-text';
    xpText.id = 'bpXpText';
    card.appendChild(xpText);

    var xpTrack = document.createElement('div');
    xpTrack.className = 'bp-xp-track';
    var xpFill = document.createElement('div');
    xpFill.className = 'bp-xp-fill';
    xpFill.id = 'bpXpFill';
    xpFill.style.width = '0%';
    xpTrack.appendChild(xpFill);
    card.appendChild(xpTrack);

    var rewardsLabel = document.createElement('div');
    rewardsLabel.className = 'bp-rewards-label';
    rewardsLabel.textContent = 'Upcoming Free Rewards';
    card.appendChild(rewardsLabel);

    var rewardsList = document.createElement('div');
    rewardsList.id = 'bpRewardsList';
    card.appendChild(rewardsList);

    container.insertBefore(card, container.firstChild);

    await _refreshBattlePass(token);
}

async function _refreshBattlePass(token) {
    try {
        var res = await fetch('/api/battlepass', { headers: { Authorization: 'Bearer ' + token } });
        if (!res.ok) return;
        var data = await res.json();

        var titleEl = document.getElementById('bpTitle');
        if (titleEl) {
            var seasonName = (data.season && data.season.name) ? data.season.name : '';
            titleEl.textContent = '\uD83C\uDF96\uFE0F Battle Pass' + (seasonName ? ' \u2014 ' + seasonName : '');
        }

        var seasonEndEl = document.getElementById('bpSeasonEnd');
        if (seasonEndEl && data.season && data.season.endsAt) {
            var endsAt = new Date(data.season.endsAt);
            var diff = endsAt - Date.now();
            var daysLeft = Math.max(0, Math.ceil(diff / 86400000));
            seasonEndEl.textContent = 'Season ends in ' + String(daysLeft) + ' day' + (daysLeft === 1 ? '' : 's');
        } else if (seasonEndEl) {
            seasonEndEl.textContent = '';
        }

        var levelNum = document.getElementById('bpLevelNum');
        if (levelNum) levelNum.textContent = String(data.level || 1);

        var xpText = document.getElementById('bpXpText');
        var xpFill = document.getElementById('bpXpFill');
        var currentXp = data.xp || 0;
        var xpToNext = data.xpToNext || 1;
        if (xpText) xpText.textContent = String(currentXp) + ' / ' + String(xpToNext) + ' XP';
        if (xpFill) {
            var xpPct = Math.min(100, Math.round((currentXp / xpToNext) * 100));
            xpFill.style.width = xpPct + '%';
        }

        var rewardsList = document.getElementById('bpRewardsList');
        if (rewardsList) {
            while (rewardsList.firstChild) rewardsList.removeChild(rewardsList.firstChild);

            var freeRewards = data.freeRewards || [];
            var playerLevel = data.level || 1;
            var upcoming = freeRewards.filter(function(r) { return !r.claimed; }).slice(0, 3);

            if (upcoming.length === 0) {
                var noneEl = document.createElement('div');
                noneEl.style.cssText = 'text-align:center;padding:8px;opacity:.5;font-size:12px;';
                noneEl.textContent = 'All rewards claimed!';
                rewardsList.appendChild(noneEl);
            } else {
                upcoming.forEach(function(r) {
                    var isUnlocked = playerLevel >= r.level;

                    var item = document.createElement('div');
                    item.className = 'bp-reward-item';

                    var tierBadge = document.createElement('div');
                    tierBadge.className = 'bp-tier-badge';
                    tierBadge.textContent = String(r.level);
                    item.appendChild(tierBadge);

                    var rewardInfo = document.createElement('div');
                    rewardInfo.className = 'bp-reward-info';
                    var rewardName = document.createElement('div');
                    rewardName.className = 'bp-reward-name';
                    var rewardText = '';
                    if (r.reward_type === 'gems') {
                        rewardText = '\uD83D\uDC8E ' + String(r.reward_amount) + ' gems';
                    } else if (r.reward_type === 'credits') {
                        rewardText = '\uD83D\uDCB0 $' + parseFloat(r.reward_amount).toFixed(2);
                    } else {
                        rewardText = String(r.reward_amount);
                    }
                    rewardName.textContent = rewardText;
                    rewardInfo.appendChild(rewardName);
                    item.appendChild(rewardInfo);

                    if (isUnlocked) {
                        var claimBtn = document.createElement('button');
                        claimBtn.className = 'bp-claim-btn';
                        claimBtn.textContent = 'Claim';
                        (function(lvl) {
                            claimBtn.addEventListener('click', function() { claimBattlePassReward(lvl); });
                        }(r.level));
                        item.appendChild(claimBtn);
                    } else {
                        var lockEl = document.createElement('span');
                        lockEl.className = 'bp-locked';
                        lockEl.textContent = '\uD83D\uDD12';
                        item.appendChild(lockEl);
                    }

                    rewardsList.appendChild(item);
                });
            }
        }
    } catch (e) {
        // silent fail — card remains with loading state
    }
}


// ─────────────────────────────────────────────────────────────────────
// 6. ENGINE INITIALISATION
// ─────────────────────────────────────────────────────────────────────

/**
 * Initialise the promotional engine.
 * Call once from app.js during initAllSystems().
 */
function initPromoEngine() {
    if (_promoState.initialized) return;
    _promoState.initialized = true;

    // Record play session start time
    if (!localStorage.getItem(PROMO_KEY_PLAY_START)) {
        try { localStorage.setItem(PROMO_KEY_PLAY_START, String(Date.now())); } catch (e) { /* ignore */ }
    }

    // Render deposit-streak card into the Bonuses & Promos sidebar section
    setTimeout(function() {
        var promosSidebar = document.querySelector('#csbDdPromos .csb-dd-body');
        if (promosSidebar) {
            renderDepositStreakCard(promosSidebar);
            renderDailyMissionsCard(promosSidebar);
            renderDailyChallengesCard(promosSidebar);
            renderBattlePassCard(promosSidebar);
            renderScratchCardCard(promosSidebar);
            renderCasinoPassCard(promosSidebar);
            renderBoostCard(promosSidebar);
            renderTournamentCard(promosSidebar);
            renderDailyCashbackCard(promosSidebar);
        }
    }, 4000);

    // Update last visit timestamp (read first for welcome-back check)
    const prevVisit = localStorage.getItem(PROMO_KEY_LAST_VISIT);

    // Trigger page_load promos (with delay so page settles)
    const urlParams = new URLSearchParams(window.location.search);
    const suppressPromos = urlParams.get('qaTools') === '1' || urlParams.get('qaTools') === 'true'
        || urlParams.get('noBonus') === '1' || urlParams.get('autoSpin') === '1';

    if (!suppressPromos) {
        setTimeout(function() {
            // Skip page_load popup triggers if we are still in the post-login
            // grace period (daily bonus may still be showing).
            if (window._postLoginGracePeriod) return;
            checkPromoTriggers('page_load');
        }, 3000);
    }

    // Now update last visit (after reading for welcome-back)
    try { localStorage.setItem(PROMO_KEY_LAST_VISIT, String(Date.now())); } catch (e) { /* ignore */ }

    // Happy hour check interval (every 5 minutes)
    _promoState.happyHourCheckInterval = setInterval(function() {
        if (!suppressPromos) {
            _promoCheckHappyHour();
        }
    }, 5 * 60 * 1000);

    // Process any queued popups when spin ends
    // We hook into the spinning state via a polling interval (lightweight)
    let _wasSpinning = false;
    setInterval(function() {
        if (_wasSpinning && !spinning) {
            // Spin just ended — check queue
            _promoProcessQueue();
        }
        _wasSpinning = spinning;
    }, 300);
}


// ─────────────────────────────────────────────────────────────────────
// 7. PUBLIC API SUMMARY
// ─────────────────────────────────────────────────────────────────────
// All functions below are globally available (no modules):
//
//   initPromoEngine()                — call from app.js initAllSystems
//   checkPromoTriggers(event, data)  — call after spin results, login, deposit
//   showPromoPopup(config)           — render a custom promo popup
//   dismissPromo(promoId)            — close popup (and optionally suppress)
//   getHappyHourMultiplier()         — returns 1.0 or 1.5 (for win calculation)
//   claimChallenge(id)               — POST /api/challenges/:id/claim
//   claimBattlePassReward(level)     — POST /api/battlepass/claim/:level
// ─────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────
// 7b. DAILY SCRATCH CARD WIDGET
// ─────────────────────────────────────────────────────────────────────

(function _injectScratchStyles() {
    if (document.getElementById('scratchCardStyles')) return;
    var s = document.createElement('style');
    s.id = 'scratchCardStyles';
    s.textContent = [
        '.scratch-card-widget {',
        '  background: linear-gradient(135deg,#1a0533,#2d0a4e);',
        '  border: 1.5px solid rgba(251,191,36,0.45);',
        '  border-radius: 14px;',
        '  padding: 16px;',
        '  margin-bottom: 14px;',
        '  box-shadow: 0 4px 20px rgba(0,0,0,0.4);',
        '}',
        '.scratch-card-widget .sc-title {',
        '  font-size: 15px;',
        '  font-weight: 800;',
        '  background: linear-gradient(135deg,#fbbf24,#fcd34d);',
        '  -webkit-background-clip: text;',
        '  -webkit-text-fill-color: transparent;',
        '  background-clip: text;',
        '  margin-bottom: 12px;',
        '  text-align: center;',
        '}',
        '.scratch-card-widget .sc-loading {',
        '  text-align: center;',
        '  font-size: 12px;',
        '  color: rgba(255,255,255,0.4);',
        '  padding: 12px 0;',
        '}',
        '.scratch-card-widget .sc-grid {',
        '  display: grid;',
        '  grid-template-columns: repeat(3, 48px);',
        '  gap: 6px;',
        '  justify-content: center;',
        '  margin-bottom: 10px;',
        '}',
        '.scratch-card-widget .sc-tile {',
        '  width: 48px;',
        '  height: 48px;',
        '  border-radius: 8px;',
        '  border: 1.5px solid rgba(251,191,36,0.5);',
        '  display: flex;',
        '  align-items: center;',
        '  justify-content: center;',
        '  font-size: 22px;',
        '  line-height: 1;',
        '  user-select: none;',
        '}',
        '.scratch-card-widget .sc-tile.unrevealed {',
        '  background: rgba(255,255,255,0.05);',
        '  color: rgba(255,255,255,0.35);',
        '  font-size: 18px;',
        '  cursor: pointer;',
        '  transition: background 0.15s;',
        '}',
        '.scratch-card-widget .sc-tile.unrevealed:hover {',
        '  background: rgba(255,255,255,0.1);',
        '}',
        '.scratch-card-widget .sc-tile.revealed {',
        '  background: rgba(255,200,0,0.15);',
        '  cursor: default;',
        '}',
        '.scratch-card-widget .sc-prize {',
        '  text-align: center;',
        '  font-size: 13px;',
        '  color: #fbbf24;',
        '  font-weight: 700;',
        '  min-height: 18px;',
        '}',
        '.scratch-card-widget .sc-already {',
        '  text-align: center;',
        '  font-size: 11px;',
        '  color: rgba(255,255,255,0.4);',
        '  margin-top: 4px;',
        '}'
    ].join('\n');
    document.head.appendChild(s);
})();

var _scratchRevealPending = false;

function _scratchReveal(container, token) {
    if (_scratchRevealPending) return;
    _scratchRevealPending = true;

    fetch('/api/scratchcard/scratch', {
        method: 'POST',
        headers: {
            Authorization: 'Bearer ' + token,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
    }).then(function(res) {
        return res.json();
    }).then(function(res) {
        _scratchRevealPending = false;
        if (!res.success) return;

        var grid = container.querySelector('.sc-grid');
        if (grid) {
            var tiles = grid.querySelectorAll('.sc-tile');
            var tileArr = res.tiles || [];
            tiles.forEach(function(tile, i) {
                tile.className = 'sc-tile revealed';
                tile.removeAttribute('data-scratch');
                var sym = (tileArr[i] && tileArr[i].symbol) ? tileArr[i].symbol : '?';
                tile.textContent = sym;
            });
        }

        var prizeEl = container.querySelector('.sc-prize');
        if (prizeEl && res.prize && res.prize.label) {
            prizeEl.textContent = 'Prize: ' + res.prize.label;
        }

        var alreadyEl = container.querySelector('.sc-already');
        if (alreadyEl) {
            alreadyEl.textContent = 'Come back tomorrow for another card!';
        }

        if (typeof res.newBalance === 'number') {
            if (typeof balance !== 'undefined') {
                balance = res.newBalance;
            }
            if (typeof updateBalance === 'function') updateBalance();
            if (typeof saveBalance === 'function') saveBalance();
        }

        if (res.prize && res.prize.label) {
            if (typeof showWinToast === 'function') {
                showWinToast('\uD83C\uDF9F\uFE0F Scratch Card: ' + res.prize.label);
            } else if (typeof showToast === 'function') {
                showToast('\uD83C\uDF9F\uFE0F Scratch Card: ' + res.prize.label, 'win');
            }
        }
    }).catch(function() {
        _scratchRevealPending = false;
    });
}

async function renderScratchCardCard(container) {
    if (!container) return;
    if (document.getElementById('scratchCardCard')) return;

    if (typeof isServerAuthToken !== 'function' || !isServerAuthToken()) return;
    var token = localStorage.getItem(typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken');
    if (!token) return;

    var card = document.createElement('div');
    card.id = 'scratchCardCard';
    card.className = 'promo-card scratch-card-widget';

    var titleEl = document.createElement('div');
    titleEl.className = 'sc-title';
    titleEl.textContent = '\uD83C\uDF9F\uFE0F Daily Scratch Card';
    card.appendChild(titleEl);

    var loadingEl = document.createElement('div');
    loadingEl.className = 'sc-loading';
    loadingEl.textContent = 'Loading\u2026';
    card.appendChild(loadingEl);

    container.appendChild(card);

    try {
        var res = await fetch('/api/scratchcard/today', {
            headers: { Authorization: 'Bearer ' + token }
        });
        if (!res.ok) {
            loadingEl.textContent = 'Not available today.';
            return;
        }
        var data = await res.json();

        card.removeChild(loadingEl);

        var grid = document.createElement('div');
        grid.className = 'sc-grid';

        if (data.alreadyScratched && data.result) {
            var existingTiles = data.result.tiles || [];
            for (var i = 0; i < 9; i++) {
                var tile = document.createElement('div');
                tile.className = 'sc-tile revealed';
                var sym = (existingTiles[i] && existingTiles[i].symbol) ? existingTiles[i].symbol : '?';
                tile.textContent = sym;
                grid.appendChild(tile);
            }
            card.appendChild(grid);

            var prizeEl = document.createElement('div');
            prizeEl.className = 'sc-prize';
            if (data.result.prize && data.result.prize.label) {
                prizeEl.textContent = 'Prize: ' + data.result.prize.label;
            }
            card.appendChild(prizeEl);

            var alreadyEl = document.createElement('div');
            alreadyEl.className = 'sc-already';
            alreadyEl.textContent = 'Come back tomorrow for another card!';
            card.appendChild(alreadyEl);

        } else if (data.available) {
            var scratchPending = false;

            for (var j = 0; j < 9; j++) {
                var uTile = document.createElement('div');
                uTile.className = 'sc-tile unrevealed';
                uTile.setAttribute('data-scratch', '1');
                uTile.textContent = '?';
                (function(tileEl) {
                    tileEl.addEventListener('click', function() {
                        if (scratchPending) return;
                        scratchPending = true;
                        _scratchReveal(card, token);
                    });
                }(uTile));
                grid.appendChild(uTile);
            }
            card.appendChild(grid);

            var prizeHolder = document.createElement('div');
            prizeHolder.className = 'sc-prize';
            card.appendChild(prizeHolder);

            var alreadyHolder = document.createElement('div');
            alreadyHolder.className = 'sc-already';
            card.appendChild(alreadyHolder);

        } else {
            var naEl = document.createElement('div');
            naEl.className = 'sc-loading';
            naEl.textContent = 'No scratch card available today.';
            card.appendChild(naEl);
        }
    } catch (e) {
        loadingEl.textContent = 'Could not load scratch card.';
    }
}


// ─────────────────────────────────────────────────────────────────────
// 7c. CASINO PASS SUBSCRIPTION CARD
// ─────────────────────────────────────────────────────────────────────

(function _injectCasinoPassStyles() {
    if (document.getElementById('casinoPassStyles')) return;
    var s = document.createElement('style');
    s.id = 'casinoPassStyles';
    s.textContent = [
        '.casino-pass-card {',
        '  background: linear-gradient(135deg,#0d1b2a,#1a2d3e);',
        '  border: 1.5px solid rgba(0,200,200,0.45);',
        '  border-radius: 14px;',
        '  padding: 16px;',
        '  margin-bottom: 14px;',
        '  box-shadow: 0 4px 20px rgba(0,0,0,0.4);',
        '}',
        '.casino-pass-card .cp-title {',
        '  font-size: 15px;',
        '  font-weight: 800;',
        '  background: linear-gradient(135deg,#00d4ff,#00ffcc);',
        '  -webkit-background-clip: text;',
        '  -webkit-text-fill-color: transparent;',
        '  background-clip: text;',
        '  margin-bottom: 12px;',
        '  text-align: center;',
        '}',
        '.casino-pass-card .cp-loading {',
        '  text-align: center;',
        '  font-size: 12px;',
        '  color: rgba(255,255,255,0.4);',
        '  padding: 12px 0;',
        '}',
        '.casino-pass-card .cp-badge-active {',
        '  display: inline-block;',
        '  background: #166534;',
        '  color: #86efac;',
        '  font-size: 10px;',
        '  font-weight: 800;',
        '  letter-spacing: 1px;',
        '  padding: 2px 10px;',
        '  border-radius: 20px;',
        '  border: 1px solid #22c55e;',
        '  margin-bottom: 8px;',
        '}',
        '.casino-pass-card .cp-tier-name {',
        '  font-size: 14px;',
        '  font-weight: 700;',
        '  color: #e2e8f0;',
        '  margin-bottom: 4px;',
        '}',
        '.casino-pass-card .cp-expiry {',
        '  font-size: 11px;',
        '  color: rgba(255,255,255,0.45);',
        '  margin-bottom: 12px;',
        '}',
        '.casino-pass-card .cp-separator {',
        '  border: none;',
        '  border-top: 1px solid rgba(0,200,200,0.2);',
        '  margin: 10px 0;',
        '}',
        '.casino-pass-card .cp-claim-btn {',
        '  width: 100%;',
        '  padding: 9px 0;',
        '  border-radius: 8px;',
        '  border: none;',
        '  background: linear-gradient(135deg,#0d9488,#0891b2);',
        '  color: #fff;',
        '  font-size: 13px;',
        '  font-weight: 700;',
        '  cursor: pointer;',
        '  transition: opacity 0.15s;',
        '}',
        '.casino-pass-card .cp-claim-btn:hover {',
        '  opacity: 0.85;',
        '}',
        '.casino-pass-card .cp-claimed-note {',
        '  text-align: center;',
        '  font-size: 12px;',
        '  color: rgba(255,255,255,0.45);',
        '  padding: 6px 0;',
        '}',
        '.casino-pass-card .cp-plans {',
        '  display: flex;',
        '  gap: 8px;',
        '}',
        '.casino-pass-card .cp-plan {',
        '  flex: 1;',
        '  background: rgba(255,255,255,0.04);',
        '  border: 1.5px solid rgba(0,200,200,0.3);',
        '  border-radius: 10px;',
        '  padding: 10px 8px;',
        '  display: flex;',
        '  flex-direction: column;',
        '  gap: 4px;',
        '}',
        '.casino-pass-card .cp-plan.cp-plan-premium {',
        '  border-color: rgba(251,191,36,0.55);',
        '}',
        '.casino-pass-card .cp-plan-name {',
        '  font-size: 12px;',
        '  font-weight: 800;',
        '  color: #e2e8f0;',
        '}',
        '.casino-pass-card .cp-plan-desc {',
        '  font-size: 10px;',
        '  color: rgba(255,255,255,0.5);',
        '  line-height: 1.4;',
        '  flex: 1;',
        '}',
        '.casino-pass-card .cp-sub-btn {',
        '  margin-top: 6px;',
        '  padding: 6px 0;',
        '  border-radius: 7px;',
        '  border: none;',
        '  font-size: 11px;',
        '  font-weight: 700;',
        '  cursor: pointer;',
        '  transition: opacity 0.15s;',
        '}',
        '.casino-pass-card .cp-sub-btn:hover {',
        '  opacity: 0.82;',
        '}',
        '.casino-pass-card .cp-sub-btn-basic {',
        '  background: linear-gradient(135deg,#0d9488,#0891b2);',
        '  color: #fff;',
        '}',
        '.casino-pass-card .cp-sub-btn-premium {',
        '  background: linear-gradient(135deg,#b45309,#d97706,#fbbf24);',
        '  color: #0f172a;',
        '}'
    ].join('\n');
    document.head.appendChild(s);
})();

async function _casinoPassClaimDaily(card, token) {
    try {
        var res = await fetch('/api/subscription/claim-daily', {
            method: 'POST',
            headers: {
                Authorization: 'Bearer ' + token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({})
        });
        var data = await res.json();
        if (data.success) {
            if (typeof gems !== 'undefined') {
                gems = (gems || 0) + (data.gemsAwarded || 0);
            }
            if (typeof showToast === 'function') {
                showToast('\u2705 +' + String(data.gemsAwarded || 0) + ' gems claimed!', 'win');
            }
            renderCasinoPassCard._rerender(card, token);
        } else {
            if (typeof showToast === 'function') {
                showToast('Could not claim gems. Try again later.', 'error');
            }
        }
    } catch (e) {
        if (typeof showToast === 'function') {
            showToast('Could not claim gems. Try again later.', 'error');
        }
    }
}

async function _casinoPassActivate(card, token, tier) {
    var price = tier === 'premium' ? 24.99 : 9.99;
    var currentBalance = (typeof balance !== 'undefined') ? balance : 0;
    if (currentBalance < price) {
        if (typeof showToast === 'function') {
            showToast('Insufficient balance', 'error');
        }
        return;
    }
    try {
        var res = await fetch('/api/subscription/activate', {
            method: 'POST',
            headers: {
                Authorization: 'Bearer ' + token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ tier: tier })
        });
        var data = await res.json();
        if (data.success) {
            if (typeof balance !== 'undefined' && typeof data.newBalance === 'number') {
                balance = data.newBalance;
            }
            if (typeof updateBalance === 'function') updateBalance();
            if (typeof showToast === 'function') {
                showToast('\uD83C\uDF89 Casino Pass activated!', 'win');
            }
            renderCasinoPassCard._rerender(card, token);
        } else {
            if (typeof showToast === 'function') {
                showToast('Could not activate pass. Try again later.', 'error');
            }
        }
    } catch (e) {
        if (typeof showToast === 'function') {
            showToast('Could not activate pass. Try again later.', 'error');
        }
    }
}

function _buildCasinoPassActive(card, data, token) {
    var cfg = data.config || {};

    var badgeEl = document.createElement('div');
    badgeEl.className = 'cp-badge-active';
    badgeEl.textContent = 'ACTIVE';
    card.appendChild(badgeEl);

    var tierEl = document.createElement('div');
    tierEl.className = 'cp-tier-name';
    tierEl.textContent = cfg.name || ('Casino Pass ' + (data.tier ? (data.tier.charAt(0).toUpperCase() + data.tier.slice(1)) : ''));
    card.appendChild(tierEl);

    if (data.expiresAt) {
        var expiryEl = document.createElement('div');
        expiryEl.className = 'cp-expiry';
        var expiryDate = new Date(data.expiresAt);
        expiryEl.textContent = 'Expires: ' + expiryDate.toLocaleDateString();
        card.appendChild(expiryEl);
    }

    var sep = document.createElement('hr');
    sep.className = 'cp-separator';
    card.appendChild(sep);

    if (!data.dailyClaimedToday) {
        var claimBtn = document.createElement('button');
        claimBtn.className = 'cp-claim-btn';
        var gemsPerDay = cfg.gemsPerDay || 0;
        claimBtn.textContent = 'Claim ' + String(gemsPerDay) + ' Daily Gems';
        claimBtn.addEventListener('click', function() {
            claimBtn.disabled = true;
            claimBtn.textContent = 'Claiming\u2026';
            _casinoPassClaimDaily(card, token);
        });
        card.appendChild(claimBtn);
    } else {
        var claimedNote = document.createElement('div');
        claimedNote.className = 'cp-claimed-note';
        claimedNote.textContent = '\u2705 Daily gems collected today';
        card.appendChild(claimedNote);
    }
}

function _buildCasinoPassInactive(card, token) {
    var plansRow = document.createElement('div');
    plansRow.className = 'cp-plans';

    // Basic plan
    var basicCard = document.createElement('div');
    basicCard.className = 'cp-plan';

    var basicName = document.createElement('div');
    basicName.className = 'cp-plan-name';
    basicName.textContent = 'Basic';
    basicCard.appendChild(basicName);

    var basicPrice = document.createElement('div');
    basicPrice.className = 'cp-plan-name';
    basicPrice.style.color = '#94a3b8';
    basicPrice.style.fontSize = '11px';
    basicPrice.textContent = '$9.99/mo';
    basicCard.appendChild(basicPrice);

    var basicDesc = document.createElement('div');
    basicDesc.className = 'cp-plan-desc';
    basicDesc.textContent = '100 gems/day + 5% deposit bonus';
    basicCard.appendChild(basicDesc);

    var basicBtn = document.createElement('button');
    basicBtn.className = 'cp-sub-btn cp-sub-btn-basic';
    basicBtn.textContent = 'Subscribe $9.99';
    basicBtn.addEventListener('click', function() {
        basicBtn.disabled = true;
        basicBtn.textContent = 'Activating\u2026';
        _casinoPassActivate(card, token, 'basic');
    });
    basicCard.appendChild(basicBtn);
    plansRow.appendChild(basicCard);

    // Premium plan
    var premCard = document.createElement('div');
    premCard.className = 'cp-plan cp-plan-premium';

    var premName = document.createElement('div');
    premName.className = 'cp-plan-name';
    premName.textContent = 'Premium';
    premCard.appendChild(premName);

    var premPrice = document.createElement('div');
    premPrice.className = 'cp-plan-name';
    premPrice.style.color = '#fbbf24';
    premPrice.style.fontSize = '11px';
    premPrice.textContent = '$24.99/mo';
    premCard.appendChild(premPrice);

    var premDesc = document.createElement('div');
    premDesc.className = 'cp-plan-desc';
    premDesc.textContent = '300 gems/day + 10% deposit bonus';
    premCard.appendChild(premDesc);

    var premBtn = document.createElement('button');
    premBtn.className = 'cp-sub-btn cp-sub-btn-premium';
    premBtn.textContent = 'Subscribe $24.99';
    premBtn.addEventListener('click', function() {
        premBtn.disabled = true;
        premBtn.textContent = 'Activating\u2026';
        _casinoPassActivate(card, token, 'premium');
    });
    premCard.appendChild(premBtn);
    plansRow.appendChild(premCard);

    card.appendChild(plansRow);
}

async function renderCasinoPassCard(container) {
    if (!container) return;
    if (document.getElementById('casinoPassCard')) return;

    if (typeof isServerAuthToken !== 'function' || !isServerAuthToken()) return;
    var token = localStorage.getItem(typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken');
    if (!token) return;

    var card = document.createElement('div');
    card.id = 'casinoPassCard';
    card.className = 'promo-card casino-pass-card';

    var titleEl = document.createElement('div');
    titleEl.className = 'cp-title';
    titleEl.textContent = '\uD83C\uDF9F\uFE0F Casino Pass';
    card.appendChild(titleEl);

    var loadingEl = document.createElement('div');
    loadingEl.className = 'cp-loading';
    loadingEl.textContent = 'Loading\u2026';
    card.appendChild(loadingEl);

    container.appendChild(card);

    renderCasinoPassCard._rerender = function(existingCard, tok) {
        while (existingCard.childNodes.length > 1) {
            existingCard.removeChild(existingCard.lastChild);
        }
        var ld = document.createElement('div');
        ld.className = 'cp-loading';
        ld.textContent = 'Loading\u2026';
        existingCard.appendChild(ld);

        fetch('/api/subscription/status', {
            headers: { Authorization: 'Bearer ' + tok }
        }).then(function(r) { return r.json(); }).then(function(d) {
            existingCard.removeChild(ld);
            if (d.active) {
                _buildCasinoPassActive(existingCard, d, tok);
            } else {
                _buildCasinoPassInactive(existingCard, tok);
            }
        }).catch(function() {
            ld.textContent = 'Could not load Casino Pass.';
        });
    };

    try {
        var res = await fetch('/api/subscription/status', {
            headers: { Authorization: 'Bearer ' + token }
        });
        if (!res.ok) {
            loadingEl.textContent = 'Not available.';
            return;
        }
        var data = await res.json();

        card.removeChild(loadingEl);

        if (data.active) {
            _buildCasinoPassActive(card, data, token);
        } else {
            _buildCasinoPassInactive(card, token);
        }
    } catch (e) {
        loadingEl.textContent = 'Could not load Casino Pass.';
    }
}

async function claimChallenge(id) {
    if (typeof isServerAuthToken === 'function' && !isServerAuthToken()) return;
    var token = localStorage.getItem(typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken');
    if (!token) return;
    try {
        var res = await fetch('/api/challenges/' + String(id) + '/claim', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + token }
        });
        var data = await res.json();
        if (data.success) {
            if (data.gemsAwarded && typeof showToast === 'function') {
                showToast('\uD83D\uDC8E +' + String(data.gemsAwarded) + ' gems claimed!', 'win');
            } else if (data.credits && typeof showToast === 'function') {
                showToast('$' + parseFloat(data.credits).toFixed(2) + ' credited!', 'win');
            } else if (typeof showToast === 'function') {
                showToast('\uD83C\uDFC6 Challenge claimed!', 'win');
            }
            await _refreshDailyChallenges(token);
        }
    } catch (e) {}
}

async function claimBattlePassReward(level) {
    var token = localStorage.getItem(typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken');
    if (!token) return;
    try {
        var res = await fetch('/api/battlepass/claim/' + level, {
            method: 'POST',
            headers: {
                Authorization: 'Bearer ' + token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ track: 'free' })
        });
        var data = await res.json();
        if (data.success) {
            var reward = data.reward || {};
            var rewardMsg = '';
            if (reward.reward_type === 'gems') {
                rewardMsg = String(reward.reward_amount) + ' gems';
            } else if (reward.reward_type === 'credits') {
                rewardMsg = '$' + parseFloat(reward.reward_amount).toFixed(2) + ' credits';
            } else {
                rewardMsg = 'reward';
            }
            if (typeof showToast === 'function') showToast('\uD83C\uDF96\uFE0F Battle Pass Level ' + String(level) + ' reward claimed! ' + rewardMsg, 'win');
            await _refreshBattlePass(token);
        }
    } catch (e) {}
}

// ─── Power Boosts card ────────────────────────────────────────────────────────

async function renderBoostCard(container) {
    if (!container) return;
    if (document.getElementById('boostCard')) return;

    // Inject CSS once
    if (!document.getElementById('boostCardStyles')) {
        var styleEl = document.createElement('style');
        styleEl.id = 'boostCardStyles';
        styleEl.textContent = [
            '.promo-boost-card { background: linear-gradient(135deg,#1a0a2e,#0d1a3a); border: 1px solid #6c3fc5; border-radius: 12px; padding: 14px; margin-bottom: 12px; }',
            '.pbc-title { font-size: 1rem; font-weight: 700; color: #c084fc; margin-bottom: 10px; }',
            '.pbc-loading { color: #8888aa; font-size: 0.85rem; }',
            '.pbc-boost-row { display: flex; align-items: center; gap: 8px; padding: 7px 0; border-bottom: 1px solid #2a1a4a; }',
            '.pbc-boost-row:last-child { border-bottom: none; }',
            '.pbc-boost-info { flex: 1; min-width: 0; }',
            '.pbc-boost-name { font-size: 0.88rem; font-weight: 600; color: #e0d0ff; }',
            '.pbc-boost-desc { font-size: 0.75rem; color: #9a87cc; margin-top: 1px; }',
            '.pbc-boost-cost { font-size: 0.82rem; color: #a78bfa; white-space: nowrap; }',
            '.pbc-active-badge { font-size: 0.75rem; background: #14532d; color: #86efac; border-radius: 6px; padding: 2px 7px; white-space: nowrap; }',
            '.pbc-buy-btn { font-size: 0.78rem; background: #6c3fc5; color: #fff; border: none; border-radius: 6px; padding: 4px 10px; cursor: pointer; white-space: nowrap; }',
            '.pbc-buy-btn:disabled { opacity: 0.5; cursor: default; }',
            '.pbc-error { font-size: 0.78rem; color: #f87171; margin-top: 6px; }'
        ].join('\n');
        document.head.appendChild(styleEl);
    }

    var card = document.createElement('div');
    card.id = 'boostCard';
    card.className = 'promo-card promo-boost-card';

    var titleEl = document.createElement('div');
    titleEl.className = 'pbc-title';
    titleEl.textContent = '\u26A1 Power Boosts';
    card.appendChild(titleEl);

    var loadingEl = document.createElement('div');
    loadingEl.className = 'pbc-loading';
    loadingEl.textContent = 'Loading\u2026';
    card.appendChild(loadingEl);

    container.appendChild(card);

    // Fetch available boost definitions (no auth needed)
    var availableBoosts = [];
    try {
        var availRes = await fetch('/api/boosts/available');
        if (availRes.ok) {
            var availData = await availRes.json();
            availableBoosts = availData.boosts || [];
        }
    } catch (e) {
        loadingEl.textContent = 'Could not load boosts.';
        return;
    }

    // Fetch active boosts for the authenticated user (auth required)
    var activeMap = {};
    if (typeof isServerAuthToken === 'function' && isServerAuthToken()) {
        var authToken = localStorage.getItem(typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken');
        if (authToken) {
            try {
                var activeRes = await fetch('/api/boosts', {
                    headers: { Authorization: 'Bearer ' + authToken }
                });
                if (activeRes.ok) {
                    var activeData = await activeRes.json();
                    var activeBoosts = activeData.boosts || [];
                    for (var ai = 0; ai < activeBoosts.length; ai++) {
                        activeMap[activeBoosts[ai].type] = activeBoosts[ai];
                    }
                }
            } catch (e) { /* silent — show purchase buttons anyway */ }
        }
    }

    card.removeChild(loadingEl);

    if (!availableBoosts.length) {
        var emptyEl = document.createElement('div');
        emptyEl.className = 'pbc-loading';
        emptyEl.textContent = 'No boosts available right now.';
        card.appendChild(emptyEl);
        return;
    }

    // Build a row per boost
    for (var bi = 0; bi < availableBoosts.length; bi++) {
        (function(boost) {
            var row = document.createElement('div');
            row.className = 'pbc-boost-row';

            var info = document.createElement('div');
            info.className = 'pbc-boost-info';

            var nameEl = document.createElement('div');
            nameEl.className = 'pbc-boost-name';
            nameEl.textContent = boost.name || boost.type;

            var descEl = document.createElement('div');
            descEl.className = 'pbc-boost-desc';
            descEl.textContent = boost.desc || '';

            info.appendChild(nameEl);
            info.appendChild(descEl);
            row.appendChild(info);

            var costEl = document.createElement('div');
            costEl.className = 'pbc-boost-cost';
            costEl.textContent = String(boost.gemCost) + '\uD83D\uDC8E';
            row.appendChild(costEl);

            var activeBoost = activeMap[boost.type];

            if (activeBoost) {
                // Show active badge with time remaining
                var badge = document.createElement('div');
                badge.className = 'pbc-active-badge';
                var remaining = '';
                if (activeBoost.expiresAt) {
                    var msLeft = new Date(activeBoost.expiresAt).getTime() - Date.now();
                    if (msLeft > 0) {
                        var minsLeft = Math.ceil(msLeft / 60000);
                        if (minsLeft >= 60) {
                            remaining = ' (' + Math.floor(minsLeft / 60) + 'h ' + (minsLeft % 60) + 'm)';
                        } else {
                            remaining = ' (' + String(minsLeft) + 'm)';
                        }
                    }
                }
                badge.textContent = '\u2705 Active' + remaining;
                row.appendChild(badge);
            } else {
                // Show purchase button
                var buyBtn = document.createElement('button');
                buyBtn.className = 'pbc-buy-btn';
                buyBtn.textContent = 'Purchase';

                buyBtn.addEventListener('click', function() {
                    if (!isServerAuthToken || !isServerAuthToken()) {
                        if (typeof showToast === 'function') showToast('Please log in to purchase boosts.', 'info');
                        return;
                    }
                    var tok = localStorage.getItem(typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken');
                    if (!tok) {
                        if (typeof showToast === 'function') showToast('Please log in to purchase boosts.', 'info');
                        return;
                    }

                    buyBtn.disabled = true;
                    buyBtn.textContent = 'Purchasing\u2026';

                    // Remove any prior error
                    var prevErr = row.querySelector('.pbc-error');
                    if (prevErr) row.removeChild(prevErr);

                    fetch('/api/boosts/purchase', {
                        method: 'POST',
                        headers: {
                            Authorization: 'Bearer ' + tok,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ boostType: boost.type })
                    }).then(function(r) { return r.json(); }).then(function(d) {
                        if (d.success) {
                            buyBtn.textContent = '\u2705 Active';
                            buyBtn.disabled = true;
                            if (typeof showToast === 'function') {
                                showToast('\u26A1 ' + (boost.name || boost.type) + ' activated!', 'win');
                            }
                        } else {
                            buyBtn.disabled = false;
                            buyBtn.textContent = 'Purchase';
                            var errEl = document.createElement('div');
                            errEl.className = 'pbc-error';
                            errEl.textContent = d.error || 'Purchase failed. Check gem balance.';
                            row.appendChild(errEl);
                        }
                    }).catch(function() {
                        buyBtn.disabled = false;
                        buyBtn.textContent = 'Purchase';
                        var errEl = document.createElement('div');
                        errEl.className = 'pbc-error';
                        errEl.textContent = 'Network error. Please try again.';
                        row.appendChild(errEl);
                    });
                });

                row.appendChild(buyBtn);
            }

            card.appendChild(row);
        })(availableBoosts[bi]);
    }
}

async function renderTournamentCard(container) {
    if (!container) return;
    if (document.getElementById('tournamentCard')) return;

    // Inject CSS once
    if (!document.getElementById('tournamentCardStyles')) {
        var styleEl = document.createElement('style');
        styleEl.id = 'tournamentCardStyles';
        styleEl.textContent = [
            '.promo-tournament-card { background: linear-gradient(135deg,#1a0d00,#0d1a10); border: 1px solid #b45309; border-radius: 12px; padding: 14px; margin-bottom: 12px; }',
            '.ptc-title { font-size: 1rem; font-weight: 700; color: #fbbf24; margin-bottom: 8px; }',
            '.ptc-prizes { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 10px; }',
            '.ptc-prize-chip { font-size: 0.78rem; background: rgba(251,191,36,0.12); border: 1px solid #92400e; border-radius: 6px; padding: 2px 7px; color: #fcd34d; white-space: nowrap; }',
            '.ptc-section-label { font-size: 0.75rem; font-weight: 600; color: #92400e; text-transform: uppercase; letter-spacing: 0.04em; margin: 8px 0 4px; }',
            '.ptc-my-row { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 8px; }',
            '.ptc-my-stat { font-size: 0.82rem; color: #e0c070; }',
            '.ptc-my-stat span { color: #fbbf24; font-weight: 700; }',
            '.ptc-lb-row { display: flex; align-items: center; gap: 8px; padding: 5px 0; border-bottom: 1px solid #2a1a00; font-size: 0.82rem; }',
            '.ptc-lb-row:last-child { border-bottom: none; }',
            '.ptc-lb-rank { width: 22px; text-align: center; font-weight: 700; color: #fbbf24; }',
            '.ptc-lb-user { flex: 1; color: #d4b483; }',
            '.ptc-lb-score { color: #86efac; font-weight: 600; white-space: nowrap; }',
            '.ptc-countdown { font-size: 0.78rem; color: #7c6a40; margin-top: 8px; }',
            '.ptc-loading { color: #8888aa; font-size: 0.85rem; }'
        ].join('\n');
        document.head.appendChild(styleEl);
    }

    var card = document.createElement('div');
    card.id = 'tournamentCard';
    card.className = 'promo-card promo-tournament-card';

    var titleEl = document.createElement('div');
    titleEl.className = 'ptc-title';
    titleEl.textContent = '\uD83C\uDFC6 Weekly Tournament';
    card.appendChild(titleEl);

    var loadingEl = document.createElement('div');
    loadingEl.className = 'ptc-loading';
    loadingEl.textContent = 'Loading\u2026';
    card.appendChild(loadingEl);

    container.appendChild(card);

    // Fetch leaderboard (no auth required)
    var leaderboard = [];
    var weekStart = '';
    var nextReset = null;
    var prizes = [];
    try {
        var lbRes = await fetch('/api/tournament/leaderboard');
        if (lbRes.ok) {
            var lbData = await lbRes.json();
            leaderboard = lbData.leaderboard || [];
            weekStart = lbData.weekStart || '';
        }
    } catch (e) {
        loadingEl.textContent = 'Could not load tournament data.';
        return;
    }

    // Fetch my stats if authenticated
    var myStats = null;
    if (typeof isServerAuthToken === 'function' && isServerAuthToken()) {
        var token = localStorage.getItem(typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken');
        if (token) {
            try {
                var myRes = await fetch('/api/tournament/mystats', {
                    headers: { Authorization: 'Bearer ' + token }
                });
                if (myRes.ok) {
                    var myData = await myRes.json();
                    myStats = myData.myStats || null;
                    prizes = myData.prizes || [];
                    nextReset = myData.nextReset || null;
                }
            } catch (e) { /* silent — show leaderboard without personal stats */ }
        }
    }

    card.removeChild(loadingEl);

    // Use prizes from mystats if available, otherwise use defaults
    var prizeList = prizes.length ? prizes : [
        { position: 1, amount: 15 },
        { position: 2, amount: 8 },
        { position: 3, amount: 4 }
    ];

    // Prizes row (top 3)
    var prizesRow = document.createElement('div');
    prizesRow.className = 'ptc-prizes';
    var medalEmojis = ['\uD83E\uDD47', '\uD83E\uDD48', '\uD83E\uDD49'];
    for (var pi = 0; pi < Math.min(3, prizeList.length); pi++) {
        var chip = document.createElement('div');
        chip.className = 'ptc-prize-chip';
        var medal = medalEmojis[pi] || String(prizeList[pi].position) + '.';
        chip.textContent = medal + ' ' + String(prizeList[pi].position) + (prizeList[pi].position === 1 ? 'st' : prizeList[pi].position === 2 ? 'nd' : 'rd') + ': $' + String(prizeList[pi].amount);
        prizesRow.appendChild(chip);
    }
    card.appendChild(prizesRow);

    // My Standing section (auth only)
    if (myStats) {
        var myLabel = document.createElement('div');
        myLabel.className = 'ptc-section-label';
        myLabel.textContent = 'My Standing';
        card.appendChild(myLabel);

        var myRow = document.createElement('div');
        myRow.className = 'ptc-my-row';

        var rankStat = document.createElement('div');
        rankStat.className = 'ptc-my-stat';
        var rankSpan = document.createElement('span');
        rankSpan.textContent = myStats.rank != null ? String(myStats.rank) : '\u2014';
        rankStat.textContent = 'Rank: ';
        rankStat.appendChild(rankSpan);
        myRow.appendChild(rankStat);

        var scoreStat = document.createElement('div');
        scoreStat.className = 'ptc-my-stat';
        var scoreSpan = document.createElement('span');
        scoreSpan.textContent = myStats.score != null ? String(myStats.score.toFixed(1)) : '0.0';
        scoreStat.textContent = 'Score: ';
        scoreStat.appendChild(scoreSpan);
        myRow.appendChild(scoreStat);

        var multStat = document.createElement('div');
        multStat.className = 'ptc-my-stat';
        var multSpan = document.createElement('span');
        multSpan.textContent = myStats.bestMultiplier != null ? String(myStats.bestMultiplier.toFixed(1)) + 'x' : '0.0x';
        multStat.textContent = 'Best Multi: ';
        multStat.appendChild(multSpan);
        myRow.appendChild(multStat);

        card.appendChild(myRow);
    }

    // Leaderboard top 5
    if (leaderboard.length) {
        var lbLabel = document.createElement('div');
        lbLabel.className = 'ptc-section-label';
        lbLabel.textContent = 'Leaderboard';
        card.appendChild(lbLabel);

        var top5 = leaderboard.slice(0, 5);
        for (var li = 0; li < top5.length; li++) {
            var entry = top5[li];
            var row = document.createElement('div');
            row.className = 'ptc-lb-row';

            var rankEl = document.createElement('div');
            rankEl.className = 'ptc-lb-rank';
            rankEl.textContent = String(entry.rank || li + 1);
            row.appendChild(rankEl);

            var userEl = document.createElement('div');
            userEl.className = 'ptc-lb-user';
            userEl.textContent = entry.username || 'Player';
            row.appendChild(userEl);

            var scoreEl = document.createElement('div');
            scoreEl.className = 'ptc-lb-score';
            var scoreVal = entry.score != null ? entry.score : 0;
            scoreEl.textContent = String(typeof scoreVal === 'number' ? scoreVal.toFixed(1) : scoreVal);
            row.appendChild(scoreEl);

            card.appendChild(row);
        }
    }

    // Countdown to reset
    var resetDate = nextReset ? new Date(nextReset) : null;
    if (!resetDate && weekStart) {
        // Fallback: next Monday from weekStart
        var ws = new Date(weekStart);
        ws.setDate(ws.getDate() + 7);
        resetDate = ws;
    }
    if (resetDate) {
        var msUntil = resetDate.getTime() - Date.now();
        if (msUntil > 0) {
            var totalHours = Math.floor(msUntil / 3600000);
            var days = Math.floor(totalHours / 24);
            var hours = totalHours % 24;
            var countdownEl = document.createElement('div');
            countdownEl.className = 'ptc-countdown';
            countdownEl.textContent = 'Resets in ' + String(days) + 'd ' + String(hours) + 'h';
            card.appendChild(countdownEl);
        }
    }
}

async function renderDailyCashbackCard(container) {
    if (!container) return;
    if (document.getElementById('dailyCashbackCard')) return;

    // Inject CSS once
    if (!document.getElementById('dailyCashbackCardStyles')) {
        var styleEl = document.createElement('style');
        styleEl.id = 'dailyCashbackCardStyles';
        styleEl.textContent = [
            '.promo-cashback-card { background: linear-gradient(135deg,#0a1a12,#0d1a2a); border: 1px solid #16a34a; border-radius: 12px; padding: 14px; margin-bottom: 12px; }',
            '.dcc-title { font-size: 1rem; font-weight: 700; color: #4ade80; margin-bottom: 6px; }',
            '.dcc-tier { font-size: 0.8rem; color: #86efac; margin-bottom: 10px; }',
            '.dcc-amount { font-size: 1.05rem; font-weight: 700; color: #a3e635; margin-bottom: 10px; }',
            '.dcc-claim-btn { width: 100%; padding: 9px 0; background: #16a34a; color: #fff; border: none; border-radius: 8px; font-size: 0.9rem; font-weight: 700; cursor: pointer; transition: background 0.2s; }',
            '.dcc-claim-btn:hover { background: #15803d; }',
            '.dcc-claim-btn:disabled { opacity: 0.5; cursor: default; }',
            '.dcc-claimed { font-size: 0.85rem; color: #86efac; }',
            '.dcc-no-losses { font-size: 0.85rem; color: #6b7280; }',
            '.dcc-success { font-size: 0.88rem; color: #4ade80; margin-top: 8px; font-weight: 600; }',
            '.dcc-error { font-size: 0.78rem; color: #f87171; margin-top: 6px; }',
            '.dcc-loading { color: #8888aa; font-size: 0.85rem; }'
        ].join('\n');
        document.head.appendChild(styleEl);
    }

    var card = document.createElement('div');
    card.id = 'dailyCashbackCard';
    card.className = 'promo-card promo-cashback-card';

    var titleEl = document.createElement('div');
    titleEl.className = 'dcc-title';
    titleEl.textContent = '\uD83D\uDCB0 Daily Cashback';
    card.appendChild(titleEl);

    var loadingEl = document.createElement('div');
    loadingEl.className = 'dcc-loading';
    loadingEl.textContent = 'Loading\u2026';
    card.appendChild(loadingEl);

    container.appendChild(card);

    // Auth required
    if (typeof isServerAuthToken !== 'function' || !isServerAuthToken()) {
        loadingEl.textContent = 'Sign in to view cashback.';
        return;
    }
    var token = localStorage.getItem(typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken');
    if (!token) {
        loadingEl.textContent = 'Sign in to view cashback.';
        return;
    }

    // Fetch cashback status
    var status = null;
    try {
        var res = await fetch('/api/dailycashback/status', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (!res.ok) {
            loadingEl.textContent = 'Cashback unavailable.';
            return;
        }
        status = await res.json();
    } catch (e) {
        loadingEl.textContent = 'Could not load cashback.';
        return;
    }

    // Remove loading placeholder
    card.removeChild(loadingEl);

    // VIP tier label
    var tierEl = document.createElement('div');
    tierEl.className = 'dcc-tier';
    var vipLabel = status.vipLabel || 'Standard';
    var rateDisplay = String(Math.round((status.rate || 0) * 100));
    tierEl.textContent = vipLabel + ' Tier \u2014 ' + rateDisplay + '% cashback';
    card.appendChild(tierEl);

    // State: already claimed
    if (status.claimed && status.claimedAt) {
        var claimedEl = document.createElement('div');
        claimedEl.className = 'dcc-claimed';
        var claimedAt = new Date(status.claimedAt);
        var nextAvail = new Date(claimedAt.getTime() + 24 * 3600 * 1000);
        var msLeft = nextAvail.getTime() - Date.now();
        if (msLeft > 0) {
            var hoursLeft = Math.floor(msLeft / 3600000);
            var minsLeft = Math.floor((msLeft % 3600000) / 60000);
            claimedEl.textContent = '\u2705 Next cashback available in ' + String(hoursLeft) + 'h ' + String(minsLeft) + 'm';
        } else {
            claimedEl.textContent = '\u2705 Claimed. Refresh to check eligibility.';
        }
        card.appendChild(claimedEl);
        return;
    }

    // State: eligible — show amount and claim button
    if (status.eligible && status.amount > 0) {
        var amountEl = document.createElement('div');
        amountEl.className = 'dcc-amount';
        amountEl.textContent = 'You can claim $' + Number(status.amount).toFixed(2) + ' back!';
        card.appendChild(amountEl);

        var claimBtn = document.createElement('button');
        claimBtn.className = 'dcc-claim-btn';
        claimBtn.textContent = 'Claim Cashback';
        card.appendChild(claimBtn);

        var msgEl = document.createElement('div');
        card.appendChild(msgEl);

        claimBtn.addEventListener('click', async function() {
            claimBtn.disabled = true;
            claimBtn.textContent = 'Claiming\u2026';
            msgEl.textContent = '';
            msgEl.className = '';
            try {
                var claimRes = await fetch('/api/dailycashback/claim', {
                    method: 'POST',
                    headers: {
                        'Authorization': 'Bearer ' + token,
                        'Content-Type': 'application/json'
                    }
                });
                var claimData = await claimRes.json();
                if (claimRes.ok && claimData.success) {
                    claimBtn.style.display = 'none';
                    amountEl.style.display = 'none';
                    msgEl.className = 'dcc-success';
                    msgEl.textContent = '\u2705 $' + Number(claimData.credited).toFixed(2) + ' credited! New balance: $' + Number(claimData.newBalance).toFixed(2);
                    // Refresh displayed balance if the global update function exists
                    if (typeof refreshBalance === 'function') refreshBalance();
                    else if (typeof updateBalanceDisplay === 'function') updateBalanceDisplay();
                } else {
                    msgEl.className = 'dcc-error';
                    msgEl.textContent = (claimData && claimData.error) ? claimData.error : 'Claim failed. Try again.';
                    claimBtn.disabled = false;
                    claimBtn.textContent = 'Claim Cashback';
                }
            } catch (err) {
                msgEl.className = 'dcc-error';
                msgEl.textContent = 'Network error. Please try again.';
                claimBtn.disabled = false;
                claimBtn.textContent = 'Claim Cashback';
            }
        });
        return;
    }

    // State: not eligible (no losses)
    var noLossEl = document.createElement('div');
    noLossEl.className = 'dcc-no-losses';
    noLossEl.textContent = 'No losses in last 24h to recover';
    card.appendChild(noLossEl);
}
