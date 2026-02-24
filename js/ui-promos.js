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
    z-index: 10050;
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
    z-index: 2;
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
    z-index: 10051;
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
    z-index: 10040;
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
    localStorage.setItem(PROMO_KEY_SUPPRESS + promoId, '1');
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
        localStorage.setItem(PROMO_KEY_FIRST_DEPOSIT + '_deadline', String(deadline));
    } else {
        deadline = Number(deadline);
    }

    // Expired?
    if (Date.now() > deadline) {
        localStorage.setItem(PROMO_KEY_FIRST_DEPOSIT, 'shown');
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
        title: 'First Deposit Bonus!',
        body: 'Match your first deposit <span class="promo-highlight">100% up to $500</span>! Double your starting balance and hit the reels with confidence.',
        timer: timerText,
        cta: 'Deposit Now & Claim Bonus',
        onCta: function() {
            localStorage.setItem(PROMO_KEY_FIRST_DEPOSIT, 'shown');
            if (typeof showWalletModal === 'function' && currentUser) {
                showWalletModal();
            } else if (typeof addFunds === 'function') {
                addFunds();
            }
        },
        onDismiss: function() {
            localStorage.setItem(PROMO_KEY_FIRST_DEPOSIT, 'shown');
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


// ── 4b. Loss Recovery Offer ──────────────────────────────────────────
function _promoCheckLossRecovery() {
    const promoId = 'lossRecovery';
    if (_promoIsSuppressed(promoId)) return;
    if (_promoSessionFlag('lossRecoveryClaimed')) return;
    if (_promoState.consecutiveLosses < 5) return;

    const cashback = Math.max(1, Math.floor(_promoState.sessionLosses * 0.10 * 100) / 100);

    showPromoPopup({
        id: promoId,
        icon: '\uD83D\uDCAA',
        promoType: 'cashback',
        title: 'Cashback Offer!',
        body: 'Looks like luck isn\'t on your side right now. Here\'s <span class="promo-highlight">10% cashback</span> on your session losses!',
        extraHtml: '<div class="promo-win-amount">$' + formatMoney(cashback) + '</div>',
        cta: 'Claim $' + formatMoney(cashback) + ' Cashback',
        onCta: function() {
            balance += cashback;
            updateBalance();
            saveBalance();
            showToast('Cashback of $' + formatMoney(cashback) + ' added!', 'success');
            _promoSetSessionFlag('lossRecoveryClaimed');
            _promoState.consecutiveLosses = 0;
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
    const twentyFourHours = 24 * 60 * 60 * 1000;
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
            localStorage.setItem(PROMO_KEY_HAPPY_HOUR_END, String(endTime));
            _promoActivateHappyHour(endTime);
            // Reset play timer for next cycle
            localStorage.setItem(PROMO_KEY_PLAY_START, String(Date.now()));
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
    localStorage.removeItem(PROMO_KEY_HAPPY_HOUR_END);

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
                _promoCheckPostWin(d.winAmount, d.betAmount);
            } else {
                _promoState.consecutiveLosses++;
                _promoState.sessionLosses += (d.betAmount || 0);
                _promoState.lastSpinWasLoss = true;

                // Loss recovery after 5 consecutive losses
                if (_promoState.consecutiveLosses >= 5) {
                    _promoCheckLossRecovery();
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
            localStorage.setItem(PROMO_KEY_FIRST_DEPOSIT, 'shown');
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
        localStorage.setItem(PROMO_KEY_PLAY_START, String(Date.now()));
    }

    // Update last visit timestamp (read first for welcome-back check)
    const prevVisit = localStorage.getItem(PROMO_KEY_LAST_VISIT);

    // Trigger page_load promos (with delay so page settles)
    const urlParams = new URLSearchParams(window.location.search);
    const suppressPromos = urlParams.get('qaTools') === '1' || urlParams.get('qaTools') === 'true'
        || urlParams.get('noBonus') === '1' || urlParams.get('autoSpin') === '1';

    if (!suppressPromos) {
        setTimeout(function() {
            checkPromoTriggers('page_load');
        }, 3000);
    }

    // Now update last visit (after reading for welcome-back)
    localStorage.setItem(PROMO_KEY_LAST_VISIT, String(Date.now()));

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
// ─────────────────────────────────────────────────────────────────────
