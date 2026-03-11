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

    if (typeof isServerAuthToken !== 'function' || !isServerAuthToken()) return;
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

    // Track indicator
    var trackBadge = document.createElement('div');
    trackBadge.id = 'bpTrackBadge';
    trackBadge.style.cssText = 'text-align:center;margin-bottom:8px;';
    card.appendChild(trackBadge);

    // Buy premium button (only shown when not premium)
    var buyPremiumBtn = document.createElement('button');
    buyPremiumBtn.id = 'bpBuyPremiumBtn';
    buyPremiumBtn.className = 'bp-claim-btn';
    buyPremiumBtn.style.cssText = 'width:100%;margin-bottom:10px;display:none;';
    buyPremiumBtn.textContent = 'Buy Premium \u2014 500 Gems';
    buyPremiumBtn.addEventListener('click', function() {
        buyPremiumBtn.disabled = true;
        buyPremiumBtn.textContent = 'Purchasing\u2026';
        fetch('/api/battlepass/buy-premium', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            }
        }).then(function(r) { return r.json(); }).then(function(d) {
            if (d.success) {
                if (typeof showToast === 'function') showToast('\uD83C\uDF96\uFE0F Premium Unlocked!', 'win');
                _refreshBattlePass(token);
            } else {
                buyPremiumBtn.disabled = false;
                buyPremiumBtn.textContent = 'Buy Premium \u2014 500 Gems';
                if (typeof showToast === 'function') showToast(d.error || 'Purchase failed', 'error');
            }
        }).catch(function() {
            buyPremiumBtn.disabled = false;
            buyPremiumBtn.textContent = 'Buy Premium \u2014 500 Gems';
        });
    });
    card.appendChild(buyPremiumBtn);

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

        // Handle no active season
        if (data.error) {
            var titleEl = document.getElementById('bpTitle');
            if (titleEl) titleEl.textContent = '\uD83C\uDF96\uFE0F Battle Pass';
            var seasonEndEl = document.getElementById('bpSeasonEnd');
            if (seasonEndEl) seasonEndEl.textContent = 'No active season';
            var rewardsList = document.getElementById('bpRewardsList');
            if (rewardsList) {
                while (rewardsList.firstChild) rewardsList.removeChild(rewardsList.firstChild);
                var noSeasonEl = document.createElement('div');
                noSeasonEl.style.cssText = 'text-align:center;padding:8px;opacity:.5;font-size:12px;';
                noSeasonEl.textContent = 'Check back soon for the next season!';
                rewardsList.appendChild(noSeasonEl);
            }
            return;
        }

        var titleEl = document.getElementById('bpTitle');
        if (titleEl) {
            var seasonLabel = data.season ? 'Season ' + String(data.season) : '';
            titleEl.textContent = '\uD83C\uDF96\uFE0F Battle Pass' + (seasonLabel ? ' \u2014 ' + seasonLabel : '');
        }

        var seasonEndEl = document.getElementById('bpSeasonEnd');
        if (seasonEndEl) {
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

        // Track badge
        var trackBadge = document.getElementById('bpTrackBadge');
        if (trackBadge) {
            while (trackBadge.firstChild) trackBadge.removeChild(trackBadge.firstChild);
            var freeBadge = document.createElement('span');
            freeBadge.style.cssText = 'display:inline-block;padding:2px 8px;border-radius:8px;font-size:10px;font-weight:700;background:rgba(251,191,36,.15);color:#fbbf24;margin-right:4px;';
            freeBadge.textContent = 'FREE';
            trackBadge.appendChild(freeBadge);
            if (data.isPremium) {
                var premBadge = document.createElement('span');
                premBadge.style.cssText = 'display:inline-block;padding:2px 8px;border-radius:8px;font-size:10px;font-weight:700;background:rgba(167,139,250,.2);color:#c084fc;';
                premBadge.textContent = 'PREMIUM \u2714';
                trackBadge.appendChild(premBadge);
            }
        }

        // Show/hide buy premium button
        var buyPremiumBtn = document.getElementById('bpBuyPremiumBtn');
        if (buyPremiumBtn) {
            buyPremiumBtn.style.display = data.isPremium ? 'none' : 'block';
            buyPremiumBtn.disabled = false;
            buyPremiumBtn.textContent = 'Buy Premium \u2014 500 Gems';
        }

        var rewardsList = document.getElementById('bpRewardsList');
        if (rewardsList) {
            while (rewardsList.firstChild) rewardsList.removeChild(rewardsList.firstChild);

            var playerLevel = data.level || 1;
            var freeTier = data.freeTier || [];
            // Show unlocked unclaimed free rewards
            var claimableFree = freeTier.filter(function(r) {
                return !r.claimed && r.level <= playerLevel;
            });
            // Also show upcoming (locked) up to 3 total
            var upcomingFree = freeTier.filter(function(r) {
                return !r.claimed && r.level > playerLevel;
            });
            var freeToShow = claimableFree.concat(upcomingFree).slice(0, 4);

            if (freeToShow.length > 0) {
                var freeLabel = document.createElement('div');
                freeLabel.className = 'bp-rewards-label';
                freeLabel.textContent = 'Free Track';
                rewardsList.appendChild(freeLabel);

                freeToShow.forEach(function(r) {
                    var isUnlocked = playerLevel >= r.level;
                    var item = document.createElement('div');
                    item.className = 'bp-reward-item';

                    var tierBadge = document.createElement('div');
                    tierBadge.className = 'bp-tier-badge';
                    tierBadge.textContent = 'Lv ' + String(r.level);
                    item.appendChild(tierBadge);

                    var rewardInfo = document.createElement('div');
                    rewardInfo.className = 'bp-reward-info';
                    var rewardName = document.createElement('div');
                    rewardName.className = 'bp-reward-name';
                    var rewardText = 'Lv ' + String(r.level) + ' \u2014 ';
                    if (r.type === 'gems') {
                        rewardText += '\uD83D\uDC8E ' + String(r.amount) + ' gems';
                    } else if (r.type === 'credits' || r.type === 'cash') {
                        rewardText += '\uD83D\uDCB0 $' + parseFloat(r.amount).toFixed(2);
                    } else {
                        rewardText += String(r.type) + ' ' + String(r.amount);
                    }
                    rewardName.textContent = rewardText;
                    rewardInfo.appendChild(rewardName);
                    item.appendChild(rewardInfo);

                    if (isUnlocked) {
                        var claimBtn = document.createElement('button');
                        claimBtn.className = 'bp-claim-btn';
                        claimBtn.textContent = 'Claim';
                        (function(lvl) {
                            claimBtn.addEventListener('click', function() {
                                claimBtn.disabled = true;
                                fetch('/api/battlepass/claim/' + String(lvl), {
                                    method: 'POST',
                                    headers: {
                                        'Authorization': 'Bearer ' + token,
                                        'Content-Type': 'application/json'
                                    },
                                    body: JSON.stringify({ track: 'free' })
                                }).then(function(r2) { return r2.json(); }).then(function(d2) {
                                    if (d2.success) {
                                        var rwd = d2.reward || {};
                                        var msg = 'reward';
                                        if (rwd.type === 'gems') msg = String(rwd.amount) + ' gems';
                                        else if (rwd.type === 'credits' || rwd.type === 'cash') msg = '$' + parseFloat(rwd.amount).toFixed(2);
                                        if (typeof showToast === 'function') showToast('\uD83C\uDF96\uFE0F Lv ' + String(lvl) + ' reward: ' + msg, 'win');
                                        if (d2.newBalance !== undefined && typeof updateBalanceDisplay === 'function') updateBalanceDisplay(d2.newBalance);
                                        _refreshBattlePass(token);
                                    } else {
                                        claimBtn.disabled = false;
                                    }
                                }).catch(function() { claimBtn.disabled = false; });
                            });
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
            } else {
                var noneEl = document.createElement('div');
                noneEl.style.cssText = 'text-align:center;padding:8px;opacity:.5;font-size:12px;';
                noneEl.textContent = 'All free rewards claimed!';
                rewardsList.appendChild(noneEl);
            }

            // Premium track rewards (only if user has premium)
            if (data.isPremium) {
                var premTier = data.premiumTier || [];
                var claimablePrem = premTier.filter(function(r) {
                    return !r.claimed && r.level <= playerLevel;
                });
                if (claimablePrem.length > 0) {
                    var premLabel = document.createElement('div');
                    premLabel.className = 'bp-rewards-label';
                    premLabel.style.marginTop = '8px';
                    premLabel.textContent = 'Premium Track';
                    rewardsList.appendChild(premLabel);

                    claimablePrem.slice(0, 3).forEach(function(r) {
                        var item = document.createElement('div');
                        item.className = 'bp-reward-item';

                        var tierBadge = document.createElement('div');
                        tierBadge.className = 'bp-tier-badge';
                        tierBadge.style.background = 'rgba(167,139,250,.2)';
                        tierBadge.style.borderColor = 'rgba(167,139,250,.4)';
                        tierBadge.style.color = '#c084fc';
                        tierBadge.textContent = 'Lv ' + String(r.level);
                        item.appendChild(tierBadge);

                        var rewardInfo = document.createElement('div');
                        rewardInfo.className = 'bp-reward-info';
                        var rewardName = document.createElement('div');
                        rewardName.className = 'bp-reward-name';
                        var rewardText = 'Lv ' + String(r.level) + ' \u2014 ';
                        if (r.type === 'gems') {
                            rewardText += '\uD83D\uDC8E ' + String(r.amount) + ' gems';
                        } else if (r.type === 'credits' || r.type === 'cash') {
                            rewardText += '\uD83D\uDCB0 $' + parseFloat(r.amount).toFixed(2);
                        } else {
                            rewardText += String(r.type) + ' ' + String(r.amount);
                        }
                        rewardName.textContent = rewardText;
                        rewardInfo.appendChild(rewardName);
                        item.appendChild(rewardInfo);

                        var claimBtn = document.createElement('button');
                        claimBtn.className = 'bp-claim-btn';
                        claimBtn.style.background = 'linear-gradient(135deg,#7c3aed,#c084fc)';
                        claimBtn.textContent = 'Claim';
                        (function(lvl) {
                            claimBtn.addEventListener('click', function() {
                                claimBtn.disabled = true;
                                fetch('/api/battlepass/claim/' + String(lvl), {
                                    method: 'POST',
                                    headers: {
                                        'Authorization': 'Bearer ' + token,
                                        'Content-Type': 'application/json'
                                    },
                                    body: JSON.stringify({ track: 'premium' })
                                }).then(function(r2) { return r2.json(); }).then(function(d2) {
                                    if (d2.success) {
                                        var rwd = d2.reward || {};
                                        var msg = 'reward';
                                        if (rwd.type === 'gems') msg = String(rwd.amount) + ' gems';
                                        else if (rwd.type === 'credits' || rwd.type === 'cash') msg = '$' + parseFloat(rwd.amount).toFixed(2);
                                        if (typeof showToast === 'function') showToast('\uD83D\uDC8E Premium Lv ' + String(lvl) + ' reward: ' + msg, 'win');
                                        if (d2.newBalance !== undefined && typeof updateBalanceDisplay === 'function') updateBalanceDisplay(d2.newBalance);
                                        _refreshBattlePass(token);
                                    } else {
                                        claimBtn.disabled = false;
                                    }
                                }).catch(function() { claimBtn.disabled = false; });
                            });
                        }(r.level));
                        item.appendChild(claimBtn);

                        rewardsList.appendChild(item);
                    });
                }
            }
        }
    } catch (e) {
        // silent fail — card remains with loading state
        var rewardsList = document.getElementById('bpRewardsList');
        if (rewardsList) {
            while (rewardsList.firstChild) rewardsList.removeChild(rewardsList.firstChild);
            var errEl = document.createElement('div');
            errEl.style.cssText = 'text-align:center;padding:8px;color:#f87171;font-size:12px;';
            errEl.textContent = 'Could not load Battle Pass data';
            rewardsList.appendChild(errEl);
        }
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
            renderVipWheelCard(promosSidebar);
            renderScratchCardCard(promosSidebar);
            renderCasinoPassCard(promosSidebar);
            renderBoostCard(promosSidebar);
            renderTournamentCard(promosSidebar);
            renderDailyCashbackCard(promosSidebar);
            renderWagerRaceCard(promosSidebar);
            renderComebackBonusCard(promosSidebar);
            if (!window._fortuneWheelCardInit) { window._fortuneWheelCardInit = true; renderFortuneWheelCard(promosSidebar); }
            if (!window._firstDepositCardInit) { window._firstDepositCardInit = true; renderFirstDepositCard(promosSidebar); }
            if (!window._reloadBonusCardInit) { window._reloadBonusCardInit = true; renderReloadBonusCard(promosSidebar); }
            if (!window._birthdaySetCardInit) { window._birthdaySetCardInit = true; renderBirthdaySetCard(promosSidebar); }
            if (!window._coinflipCardInit) { window._coinflipCardInit = true; renderCoinflipCard(promosSidebar); }
            if (!window._diceCardInit) { window._diceCardInit = true; renderDiceCard(promosSidebar); }
            if (!window._lossStreakCardInit) { window._lossStreakCardInit = true; renderLossStreakCard(promosSidebar); }
            if (!window._referralCardInit) { window._referralCardInit = true; renderReferralCard(promosSidebar); }
            if (!window._crashGameCardInit) { window._crashGameCardInit = true; renderCrashGameCard(promosSidebar); }
            if (!window._plinkoCardInit) { window._plinkoCardInit = true; renderPlinkoCard(promosSidebar); }
            if (!window._scratchCardGameInit) { window._scratchCardGameInit = true; renderScratchCardGame(promosSidebar); }
            if (!window._baccaratCardInit) { window._baccaratCardInit = true; renderBaccaratCard(promosSidebar); }
            if (!window._dragonTigerInit) { window._dragonTigerInit = true; renderDragonTigerCard(promosSidebar); }
            if (!window._horseRacingInit) { window._horseRacingInit = true; renderHorseRacingCard(promosSidebar); }
            if (!window._caribbeanStudInit) { window._caribbeanStudInit = true; renderCaribbeanStudCard(promosSidebar); }
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


// ─── Weekly Wager Race card ───────────────────────────────────────────────────

async function renderWagerRaceCard(container) {
    if (!container) return;
    if (document.getElementById('wagerRaceCard')) return;

    // Inject CSS once
    if (!document.getElementById('wagerRaceCardStyles')) {
        var styleEl = document.createElement('style');
        styleEl.id = 'wagerRaceCardStyles';
        styleEl.textContent = [
            '.promo-wagerrace-card { background:linear-gradient(135deg,#0d0d2b,#1a0a3e); border:1px solid #6c63ff; border-radius:12px; padding:16px; margin-bottom:14px; color:#fff; }',
            '.promo-wagerrace-title { font-size:16px; font-weight:700; color:#c084fc; margin:0 0 4px; }',
            '.promo-wagerrace-timer { font-size:12px; color:#888; margin:0 0 10px; }',
            '.promo-race-prize-row { display:flex; align-items:center; gap:8px; margin-bottom:6px; font-size:13px; }',
            '.promo-race-prize-rank { font-size:16px; width:24px; }',
            '.promo-race-prize-amount { color:#ffd700; font-weight:700; }',
            '.promo-race-prize-gems { color:#c084fc; font-size:11px; }',
            '.promo-lb-row { display:flex; align-items:center; justify-content:space-between; padding:5px 0; border-bottom:1px solid #1a1a3a; font-size:12px; }',
            '.promo-lb-row.me { background:rgba(108,99,255,0.15); border-radius:4px; padding:5px 4px; }',
            '.promo-lb-rank { color:#888; width:20px; }',
            '.promo-lb-name { color:#e2e8f0; flex:1; margin-left:6px; }',
            '.promo-lb-wagered { color:#60a5fa; }',
            '.promo-myrank-section { background:rgba(108,99,255,0.1); border-radius:6px; padding:8px; margin-top:8px; font-size:12px; color:#a78bfa; text-align:center; }',
            '.promo-race-section-label { font-size:11px; font-weight:700; color:#6c63ff; text-transform:uppercase; letter-spacing:0.5px; margin:8px 0 6px; }',
            '.promo-race-empty { font-size:12px; color:#6b7280; font-style:italic; }'
        ].join('\n');
        document.head.appendChild(styleEl);
    }

    var card = document.createElement('div');
    card.id = 'wagerRaceCard';
    card.className = 'promo-card promo-wagerrace-card';

    var titleEl = document.createElement('div');
    titleEl.className = 'promo-wagerrace-title';
    titleEl.textContent = '\uD83C\uDFC1 Weekly Wager Race';
    card.appendChild(titleEl);

    var timerEl = document.createElement('div');
    timerEl.className = 'promo-wagerrace-timer';
    timerEl.textContent = 'Loading\u2026';
    card.appendChild(timerEl);

    container.appendChild(card);

    // Countdown interval handle (stored on card element for cleanup)
    var _countdownInterval = null;

    function _startCountdown(endsAt) {
        if (_countdownInterval) clearInterval(_countdownInterval);
        function _tick() {
            var diff = new Date(endsAt) - Date.now();
            if (diff <= 0) {
                timerEl.textContent = 'Race ended';
                clearInterval(_countdownInterval);
                return;
            }
            var h = Math.floor(diff / 3600000);
            var m = Math.floor((diff % 3600000) / 60000);
            var s = Math.floor((diff % 60000) / 1000);
            timerEl.textContent = 'Race ends in ' + String(h) + 'h ' + String(m) + 'm ' + String(s) + 's';
        }
        _tick();
        _countdownInterval = setInterval(_tick, 1000);
    }

    function _buildLeaderboard(data) {
        // Remove everything after title + timer
        var children = Array.prototype.slice.call(card.childNodes);
        for (var ci = 2; ci < children.length; ci++) {
            card.removeChild(children[ci]);
        }

        var race = data.race;
        var leaderboard = data.leaderboard || [];
        var myEntry = data.myEntry || null;

        if (!race || race.status !== 'active') {
            timerEl.textContent = '';
            var emptyEl = document.createElement('div');
            emptyEl.className = 'promo-race-empty';
            emptyEl.textContent = 'No active race \u2014 check back soon';
            card.appendChild(emptyEl);
            return;
        }

        _startCountdown(race.endsAt);

        // TOP PRIZES section
        var prizeLabel = document.createElement('div');
        prizeLabel.className = 'promo-race-section-label';
        prizeLabel.textContent = 'TOP PRIZES';
        card.appendChild(prizeLabel);

        var prizes = [
            { rankEmoji: '\uD83E\uDD47', amount: '$50', gems: '500\uD83D\uDC8E' },
            { rankEmoji: '\uD83E\uDD48', amount: '$25', gems: '300\uD83D\uDC8E' },
            { rankEmoji: '\uD83E\uDD49', amount: '$15', gems: '200\uD83D\uDC8E' }
        ];
        for (var pi = 0; pi < prizes.length; pi++) {
            var p = prizes[pi];
            var prizeRow = document.createElement('div');
            prizeRow.className = 'promo-race-prize-row';

            var rankSpan = document.createElement('span');
            rankSpan.className = 'promo-race-prize-rank';
            rankSpan.textContent = p.rankEmoji;

            var amountSpan = document.createElement('span');
            amountSpan.className = 'promo-race-prize-amount';
            amountSpan.textContent = p.amount;

            var gemsSpan = document.createElement('span');
            gemsSpan.className = 'promo-race-prize-gems';
            gemsSpan.textContent = '+ ' + p.gems;

            prizeRow.appendChild(rankSpan);
            prizeRow.appendChild(amountSpan);
            prizeRow.appendChild(gemsSpan);
            card.appendChild(prizeRow);
        }

        // LEADERBOARD section
        var lbLabel = document.createElement('div');
        lbLabel.className = 'promo-race-section-label';
        lbLabel.textContent = 'LEADERBOARD';
        card.appendChild(lbLabel);

        // Determine current user's username for highlighting
        var myUsername = (typeof currentUser !== 'undefined' && currentUser && currentUser.username)
            ? currentUser.username : null;

        var top5 = leaderboard.slice(0, 5);
        if (top5.length === 0) {
            var noEntrantsEl = document.createElement('div');
            noEntrantsEl.className = 'promo-race-empty';
            noEntrantsEl.textContent = 'No entries yet \u2014 be the first!';
            card.appendChild(noEntrantsEl);
        }
        for (var li = 0; li < top5.length; li++) {
            var entry = top5[li];
            var isMe = myUsername && entry.username === myUsername;
            var row = document.createElement('div');
            row.className = isMe ? 'promo-lb-row me' : 'promo-lb-row';

            var rankEl = document.createElement('span');
            rankEl.className = 'promo-lb-rank';
            rankEl.textContent = String(entry.rank);

            var nameEl = document.createElement('span');
            nameEl.className = 'promo-lb-name';
            nameEl.textContent = entry.username || 'Player';

            var wageredEl = document.createElement('span');
            wageredEl.className = 'promo-lb-wagered';
            wageredEl.textContent = '$' + Number(entry.totalWagered).toFixed(2);

            row.appendChild(rankEl);
            row.appendChild(nameEl);
            row.appendChild(wageredEl);
            card.appendChild(row);
        }

        // MY RANK section
        if (myEntry) {
            var mySection = document.createElement('div');
            mySection.className = 'promo-myrank-section';
            var myText = document.createElement('span');
            myText.textContent = 'MY RANK: #' + String(myEntry.rank) + ' \u2014 $' + Number(myEntry.totalWagered).toFixed(2) + ' wagered';
            mySection.appendChild(myText);
            card.appendChild(mySection);
        }
    }

    async function _fetchAndRender() {
        try {
            var res = await fetch('/api/wager-races');
            if (!res.ok) {
                timerEl.textContent = 'Race data unavailable';
                return;
            }
            var data = await res.json();
            _buildLeaderboard(data);
        } catch (e) {
            timerEl.textContent = 'Could not load race data';
        }
    }

    await _fetchAndRender();

    // Refresh leaderboard every 60 seconds
    setInterval(_fetchAndRender, 60000);
}


// ─── Comeback Bonus card ──────────────────────────────────────────────────────

async function renderComebackBonusCard(container) {
    if (!container) return;
    if (document.getElementById('comebackBonusCard')) return;

    // Skip if already dismissed this session
    if (sessionStorage.getItem('_comebackCardDismissed') === '1') return;

    // Auth required — check silently before rendering anything
    if (typeof isServerAuthToken !== 'function' || !isServerAuthToken()) return;
    var token = localStorage.getItem(typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken');
    if (!token) return;

    // Inject CSS once
    if (!document.getElementById('comebackBonusCardStyles')) {
        var styleEl = document.createElement('style');
        styleEl.id = 'comebackBonusCardStyles';
        styleEl.textContent = [
            '.promo-comeback-card { background:linear-gradient(135deg,#1a0808,#2d1010); border:2px solid #ef4444; border-radius:12px; padding:16px; margin-bottom:14px; color:#fff; }',
            '.promo-comeback-title { font-size:16px; font-weight:700; color:#ef4444; margin:0 0 6px; }',
            '.promo-comeback-msg { font-size:13px; color:#fca5a5; margin:0 0 8px; line-height:1.4; }',
            '.promo-comeback-tier { display:inline-block; padding:2px 8px; background:#7f1d1d; color:#fca5a5; border-radius:4px; font-size:11px; font-weight:700; margin-bottom:10px; }',
            '.promo-comeback-claim-btn { padding:8px 18px; background:linear-gradient(135deg,#ef4444,#dc2626); color:#fff; font-weight:700; border-radius:8px; border:none; cursor:pointer; font-size:14px; margin-right:8px; }',
            '.promo-comeback-claim-btn:hover { opacity:0.88; }',
            '.promo-comeback-later-btn { padding:8px 18px; background:transparent; color:#888; border:1px solid #333; border-radius:8px; cursor:pointer; font-size:13px; }',
            '.promo-comeback-later-btn:hover { color:#aaa; border-color:#555; }'
        ].join('\n');
        document.head.appendChild(styleEl);
    }

    // Fetch eligibility — only render if eligible
    var offerData = null;
    try {
        var res = await fetch('/api/user/comeback-bonus', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (!res.ok) return;
        var data = await res.json();
        if (!data.eligible || !data.offer) return;
        offerData = data.offer;
    } catch (e) {
        return;
    }

    // Build the card
    var card = document.createElement('div');
    card.id = 'comebackBonusCard';
    card.className = 'promo-card promo-comeback-card';

    var titleEl = document.createElement('div');
    titleEl.className = 'promo-comeback-title';
    titleEl.textContent = '\uD83D\uDD25 Comeback Bonus';
    card.appendChild(titleEl);

    var msgEl = document.createElement('div');
    msgEl.className = 'promo-comeback-msg';
    msgEl.textContent = offerData.message || 'Claim your comeback bonus!';
    card.appendChild(msgEl);

    // Tier badge label
    var tierRaw = (offerData.tier || 'bronze').toLowerCase();
    var tierLabel = tierRaw.charAt(0).toUpperCase() + tierRaw.slice(1) + ' Recovery';
    var tierEl = document.createElement('div');
    tierEl.className = 'promo-comeback-tier';
    tierEl.textContent = tierLabel;
    card.appendChild(tierEl);

    // Buttons row
    var btnRow = document.createElement('div');

    var claimBtn = document.createElement('button');
    claimBtn.className = 'promo-comeback-claim-btn';
    claimBtn.textContent = 'Claim Now';
    claimBtn.addEventListener('click', function() {
        // Open wallet modal for user to make the qualifying deposit
        if (typeof openWalletModal === 'function') {
            openWalletModal();
        } else if (typeof showWalletModal === 'function') {
            showWalletModal();
        }
        // Dismiss card for this session
        sessionStorage.setItem('_comebackCardDismissed', '1');
        card.style.display = 'none';
    });

    var laterBtn = document.createElement('button');
    laterBtn.className = 'promo-comeback-later-btn';
    laterBtn.textContent = 'Later';
    laterBtn.addEventListener('click', function() {
        sessionStorage.setItem('_comebackCardDismissed', '1');
        card.style.display = 'none';
    });

    btnRow.appendChild(claimBtn);
    btnRow.appendChild(laterBtn);
    card.appendChild(btnRow);

    container.appendChild(card);
}


// ─── VIP Wheel card ───────────────────────────────────────────────────────────

(function _injectVipWheelStyles() {
    if (document.getElementById('vipWheelCardStyles')) return;
    var s = document.createElement('style');
    s.id = 'vipWheelCardStyles';
    s.textContent = [
        '.promo-vipwheel-card{background:linear-gradient(145deg,rgba(15,5,40,.97),rgba(30,10,60,.98));',
        'border:1.5px solid rgba(167,139,250,.5);border-radius:16px;padding:18px 16px 14px;',
        'color:#e0e7ff;margin-bottom:16px;box-shadow:0 4px 24px rgba(167,139,250,.15);}',
        '.vwc-title{font-size:15px;font-weight:900;color:#c084fc;text-align:center;margin-bottom:10px;letter-spacing:.3px;}',
        '.vwc-level-badge{display:inline-block;padding:3px 10px;border-radius:10px;font-size:11px;font-weight:700;',
        'background:rgba(167,139,250,.2);color:#c084fc;border:1px solid rgba(167,139,250,.4);margin-bottom:8px;}',
        '.vwc-ineligible{text-align:center;font-size:12px;color:rgba(255,255,255,.5);padding:8px 0 4px;}',
        '.vwc-progress-hint{text-align:center;font-size:11px;color:#a78bfa;margin-bottom:10px;}',
        '.vwc-countdown{text-align:center;font-size:13px;color:#f87171;font-weight:600;margin-bottom:10px;}',
        '.vwc-spin-btn{display:block;width:100%;padding:11px 0;border:none;border-radius:10px;font-size:14px;font-weight:800;',
        'cursor:pointer;text-transform:uppercase;letter-spacing:.6px;',
        'background:linear-gradient(135deg,#7c3aed,#c084fc);color:#fff;',
        'box-shadow:0 4px 16px rgba(124,58,237,.35);margin-bottom:12px;transition:opacity .2s;}',
        '.vwc-spin-btn:hover{opacity:.88;}',
        '.vwc-spin-btn:disabled{opacity:.45;cursor:default;}',
        '.vwc-prize-result{text-align:center;font-size:14px;font-weight:700;color:#fbbf24;padding:6px 0 10px;}',
        '.vwc-prize-grid{display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-top:8px;}',
        '.vwc-prize-row{display:flex;justify-content:space-between;align-items:center;',
        'padding:4px 8px;border-radius:6px;background:rgba(255,255,255,.04);font-size:11px;}',
        '.vwc-prize-label{color:#d8b4fe;}',
        '.vwc-prize-pct{color:rgba(255,255,255,.4);font-size:10px;}'
    ].join('\n');
    document.head.appendChild(s);
})();

async function renderVipWheelCard(container) {
    if (!container) return;
    if (document.getElementById('vipWheelCard')) return;

    if (typeof isServerAuthToken !== 'function' || !isServerAuthToken()) return;
    var token = localStorage.getItem(typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken');
    if (!token) return;

    // Clear any existing refresh interval
    if (window._vipWheelInterval) {
        clearInterval(window._vipWheelInterval);
        window._vipWheelInterval = null;
    }

    var card = document.createElement('div');
    card.id = 'vipWheelCard';
    card.className = 'promo-card promo-vipwheel-card';

    var titleEl = document.createElement('div');
    titleEl.className = 'vwc-title';
    titleEl.textContent = '\uD83D\uDC8E VIP Wheel';
    card.appendChild(titleEl);

    // Level badge placeholder
    var levelBadge = document.createElement('div');
    levelBadge.style.cssText = 'text-align:center;margin-bottom:6px;';
    levelBadge.id = 'vwcLevelBadge';
    card.appendChild(levelBadge);

    // Main content area (status, button, countdown)
    var contentArea = document.createElement('div');
    contentArea.id = 'vwcContent';
    card.appendChild(contentArea);

    // Prize table (always visible)
    var prizeTableLabel = document.createElement('div');
    prizeTableLabel.style.cssText = 'font-size:10px;color:rgba(255,255,255,.4);text-transform:uppercase;letter-spacing:.5px;margin-top:6px;margin-bottom:4px;';
    prizeTableLabel.textContent = 'Prize Table';
    card.appendChild(prizeTableLabel);

    var prizeGrid = document.createElement('div');
    prizeGrid.className = 'vwc-prize-grid';
    var prizeSegments = [
        { label: '500 Gems', pct: '18%' },
        { label: '$2', pct: '17%' },
        { label: '1K Gems', pct: '15%' },
        { label: '$5', pct: '14%' },
        { label: '2.5K Gems', pct: '12%' },
        { label: '$10', pct: '10%' },
        { label: '5K Gems', pct: '8%' },
        { label: '$25', pct: '6%' }
    ];
    prizeSegments.forEach(function(seg) {
        var row = document.createElement('div');
        row.className = 'vwc-prize-row';
        var lbl = document.createElement('span');
        lbl.className = 'vwc-prize-label';
        lbl.textContent = seg.label;
        var pct = document.createElement('span');
        pct.className = 'vwc-prize-pct';
        pct.textContent = seg.pct;
        row.appendChild(lbl);
        row.appendChild(pct);
        prizeGrid.appendChild(row);
    });
    card.appendChild(prizeGrid);

    container.appendChild(card);

    // Countdown interval (stored so it can be cleared)
    var _countdownInterval = null;

    function _clearCountdown() {
        if (_countdownInterval) {
            clearInterval(_countdownInterval);
            _countdownInterval = null;
        }
    }

    function _renderIneligible(vipLevel, vipRequired) {
        _clearCountdown();
        var content = document.getElementById('vwcContent');
        if (!content) return;
        while (content.firstChild) content.removeChild(content.firstChild);

        var msgEl = document.createElement('div');
        msgEl.className = 'vwc-ineligible';
        msgEl.textContent = 'VIP Level ' + String(vipRequired) + '+ Required';
        content.appendChild(msgEl);

        var hintEl = document.createElement('div');
        hintEl.className = 'vwc-progress-hint';
        hintEl.textContent = 'Your Level: ' + String(vipLevel) + ' \u2014 ' + String(vipRequired - vipLevel) + ' more level(s) to unlock';
        content.appendChild(hintEl);
    }

    function _renderCooldown(cooldownEnds) {
        _clearCountdown();
        var content = document.getElementById('vwcContent');
        if (!content) return;
        while (content.firstChild) content.removeChild(content.firstChild);

        var cdEl = document.createElement('div');
        cdEl.className = 'vwc-countdown';
        cdEl.id = 'vwcCountdownText';
        content.appendChild(cdEl);

        function _tick() {
            var el = document.getElementById('vwcCountdownText');
            if (!el) { _clearCountdown(); return; }
            var diff = new Date(cooldownEnds) - Date.now();
            if (diff <= 0) {
                el.textContent = 'Ready to spin!';
                _clearCountdown();
                _fetchAndRender();
                return;
            }
            var h = Math.floor(diff / 3600000);
            var m = Math.floor((diff % 3600000) / 60000);
            var s = Math.floor((diff % 60000) / 1000);
            el.textContent = 'Next spin in ' + String(h) + 'h ' + String(m) + 'm ' + String(s) + 's';
        }
        _tick();
        _countdownInterval = setInterval(_tick, 1000);
    }

    function _renderSpinButton() {
        _clearCountdown();
        var content = document.getElementById('vwcContent');
        if (!content) return;
        while (content.firstChild) content.removeChild(content.firstChild);

        var prizeResult = document.createElement('div');
        prizeResult.className = 'vwc-prize-result';
        prizeResult.id = 'vwcPrizeResult';
        prizeResult.style.display = 'none';
        content.appendChild(prizeResult);

        var spinBtn = document.createElement('button');
        spinBtn.className = 'vwc-spin-btn';
        spinBtn.id = 'vwcSpinBtn';
        spinBtn.textContent = 'SPIN';
        spinBtn.addEventListener('click', function() {
            spinBtn.disabled = true;
            spinBtn.textContent = 'Spinning\u2026';
            fetch('/api/vipwheel/spin', {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Content-Type': 'application/json'
                }
            }).then(function(r) { return r.json(); }).then(function(d) {
                if (d.prize && d.prize.label) {
                    var resultEl = document.getElementById('vwcPrizeResult');
                    if (resultEl) {
                        resultEl.textContent = '\uD83C\uDF89 You won: ' + d.prize.label + '!';
                        resultEl.style.display = 'block';
                    }
                    if (typeof updateBalanceDisplay === 'function' && d.newBalance !== undefined) {
                        updateBalanceDisplay(d.newBalance);
                    }
                    if (typeof showToast === 'function') showToast('\uD83D\uDC8E VIP Wheel: ' + d.prize.label, 'win');
                    setTimeout(function() { _fetchAndRender(); }, 3000);
                } else if (d.status === 429 || (d.error && d.error.toLowerCase().indexOf('cooldown') !== -1)) {
                    if (typeof showToast === 'function') showToast('VIP Wheel cooldown active \u2014 try again later', 'info');
                    setTimeout(function() { _fetchAndRender(); }, 1500);
                } else if (d.status === 403 || (d.error && d.error.toLowerCase().indexOf('level') !== -1)) {
                    if (typeof showToast === 'function') showToast('VIP Level 3+ required for VIP Wheel', 'error');
                    setTimeout(function() { _fetchAndRender(); }, 1500);
                } else {
                    spinBtn.disabled = false;
                    spinBtn.textContent = 'SPIN';
                }
            }).catch(function() {
                spinBtn.disabled = false;
                spinBtn.textContent = 'SPIN';
            });
        });
        content.appendChild(spinBtn);
    }

    async function _fetchAndRender() {
        try {
            var res = await fetch('/api/vipwheel/status', {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            if (!res.ok) return;
            var data = await res.json();

            // Update level badge
            var badge = document.getElementById('vwcLevelBadge');
            if (badge) {
                while (badge.firstChild) badge.removeChild(badge.firstChild);
                var badgeSpan = document.createElement('span');
                badgeSpan.className = 'vwc-level-badge';
                badgeSpan.textContent = 'VIP Level ' + String(data.vipLevel || 0);
                badge.appendChild(badgeSpan);
            }

            if (!data.eligible) {
                _renderIneligible(data.vipLevel || 0, data.vipRequired || 3);
            } else if (!data.available && data.cooldownEnds) {
                _renderCooldown(data.cooldownEnds);
            } else {
                _renderSpinButton();
            }
        } catch (e) {
            var content = document.getElementById('vwcContent');
            if (content) {
                while (content.firstChild) content.removeChild(content.firstChild);
                var errEl = document.createElement('div');
                errEl.className = 'vwc-ineligible';
                errEl.textContent = 'Could not load VIP Wheel status';
                content.appendChild(errEl);
            }
        }
    }

    await _fetchAndRender();

    // Refresh status every 60 seconds
    window._vipWheelInterval = setInterval(function() {
        if (!document.getElementById('vipWheelCard')) {
            clearInterval(window._vipWheelInterval);
            window._vipWheelInterval = null;
            return;
        }
        _fetchAndRender();
    }, 60000);
}


// ─────────────────────────────────────────────────────────────────────
// FORTUNE WHEEL CARD
// ─────────────────────────────────────────────────────────────────────
async function renderFortuneWheelCard(container) {
    // Auth guard
    if (typeof isServerAuthToken !== 'function' || !isServerAuthToken()) return;
    var token = localStorage.getItem(typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken');
    if (!token) return;

    // Segment type colour map (static lookup — no variable interpolation)
    var segmentColors = { cash: '#f0b429', points: '#3b82f6', freespins: '#22c55e' };

    // Build card shell
    var card = document.createElement('div');
    card.className = 'promo-card fortune-wheel-card';
    card.id = 'fortuneWheelCard';

    // Header
    var header = document.createElement('div');
    header.className = 'promo-card-header';

    var title = document.createElement('h3');
    title.className = 'promo-card-title';
    title.textContent = '\uD83C\uDFA1 Daily Fortune Wheel';
    header.appendChild(title);

    var subtitle = document.createElement('p');
    subtitle.className = 'promo-card-subtitle';
    subtitle.textContent = 'Spin once a day for free rewards!';
    header.appendChild(subtitle);

    card.appendChild(header);

    // Segment grid (placeholder — populated after fetch)
    var segmentGrid = document.createElement('div');
    segmentGrid.className = 'fw-segment-grid';
    segmentGrid.id = 'fwSegmentGrid';
    card.appendChild(segmentGrid);

    // Result area
    var resultDiv = document.createElement('div');
    resultDiv.className = 'fw-result';
    resultDiv.id = 'fwResult';
    resultDiv.style.display = 'none';
    card.appendChild(resultDiv);

    // Countdown area
    var countdownDiv = document.createElement('div');
    countdownDiv.className = 'fw-countdown';
    countdownDiv.id = 'fwCountdown';
    countdownDiv.style.display = 'none';
    card.appendChild(countdownDiv);

    // Action button
    var actionBtn = document.createElement('button');
    actionBtn.className = 'promo-btn fw-spin-btn';
    actionBtn.id = 'fwSpinBtn';
    actionBtn.textContent = 'Loading\u2026';
    actionBtn.disabled = true;
    card.appendChild(actionBtn);

    // Inject static CSS once
    if (!document.getElementById('fw-card-css')) {
        var style = document.createElement('style');
        style.id = 'fw-card-css';
        style.textContent = [
            '.fortune-wheel-card { padding: 14px; border: 1px solid rgba(240,180,41,0.35); border-radius: 10px; background: rgba(240,180,41,0.06); margin-bottom: 12px; }',
            '.fw-segment-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin: 10px 0; }',
            '.fw-segment-tile { border-radius: 6px; padding: 6px 4px; text-align: center; font-size: 11px; font-weight: 600; color: #fff; min-height: 36px; display: flex; align-items: center; justify-content: center; }',
            '.fw-result { margin: 8px 0; padding: 8px; border-radius: 6px; background: rgba(34,197,94,0.15); color: #22c55e; font-weight: 700; text-align: center; font-size: 13px; }',
            '.fw-countdown { margin: 6px 0; text-align: center; font-size: 12px; color: #9ca3af; }',
            '.fw-spin-btn { width: 100%; padding: 10px; border-radius: 8px; border: none; background: #f0b429; color: #1a1a1a; font-weight: 700; font-size: 14px; cursor: pointer; transition: opacity 0.2s; }',
            '.fw-spin-btn:disabled { opacity: 0.5; cursor: not-allowed; }'
        ].join('\n');
        document.head.appendChild(style);
    }

    container.appendChild(card);

    // ── helpers ──────────────────────────────────────────────────────

    function _renderSegments(segments) {
        while (segmentGrid.firstChild) segmentGrid.removeChild(segmentGrid.firstChild);
        if (!Array.isArray(segments)) return;
        segments.forEach(function(seg) {
            var tile = document.createElement('div');
            tile.className = 'fw-segment-tile';
            var bg = segmentColors[seg.type] || '#6b7280';
            tile.style.background = bg;
            tile.textContent = seg.label || seg.type;
            segmentGrid.appendChild(tile);
        });
    }

    function _calcCountdown(lastSpinDate) {
        // lastSpinDate is 'YYYY-MM-DD' (UTC date of last spin)
        if (!lastSpinDate) return '';
        var parts = lastSpinDate.split('-');
        var spinDay = Date.UTC(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        var nextSpin = spinDay + 86400000; // +24h
        var remaining = nextSpin - Date.now();
        if (remaining <= 0) return '';
        var h = Math.floor(remaining / 3600000);
        var m = Math.floor((remaining % 3600000) / 60000);
        return 'Next spin in ' + h + 'h ' + m + 'm';
    }

    function _setAvailable() {
        actionBtn.textContent = 'SPIN NOW';
        actionBtn.disabled = false;
        countdownDiv.style.display = 'none';
        countdownDiv.textContent = '';
    }

    function _setUnavailable(lastSpin) {
        actionBtn.textContent = 'COME BACK TOMORROW';
        actionBtn.disabled = true;
        var msg = _calcCountdown(lastSpin);
        if (msg) {
            countdownDiv.textContent = msg;
            countdownDiv.style.display = 'block';
        } else {
            countdownDiv.style.display = 'none';
        }
    }

    // ── spin handler ─────────────────────────────────────────────────

    actionBtn.addEventListener('click', function() {
        if (actionBtn.disabled) return;
        actionBtn.disabled = true;
        actionBtn.textContent = 'Spinning\u2026';
        resultDiv.style.display = 'none';

        fetch('/api/fortunewheel/spin', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            }
        })
        .then(function(r) { return r.json(); })
        .then(function(d) {
            if (d.success && d.reward) {
                var label = d.reward.label || d.reward.type;
                resultDiv.textContent = '\uD83C\uDF89 You won: ' + label + '!';
                resultDiv.style.display = 'block';
                if (typeof updateBalanceDisplay === 'function' && d.newBalance !== undefined) {
                    updateBalanceDisplay(d.newBalance);
                }
                if (typeof showToast === 'function') {
                    showToast('\uD83C\uDFA1 Fortune Wheel: ' + label, 'win');
                }
                // Re-fetch status after 2s to update button state
                setTimeout(_fetchAndRender, 2000);
            } else if (d.error || d.status === 429) {
                resultDiv.textContent = d.error || 'Already spun today. Come back tomorrow!';
                resultDiv.style.display = 'block';
                setTimeout(_fetchAndRender, 1500);
            } else {
                actionBtn.disabled = false;
                actionBtn.textContent = 'SPIN NOW';
            }
        })
        .catch(function() {
            actionBtn.disabled = false;
            actionBtn.textContent = 'SPIN NOW';
        });
    });

    // ── fetch status and populate ────────────────────────────────────

    async function _fetchAndRender() {
        try {
            var res = await fetch('/api/fortunewheel/status', {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            if (!res.ok) return;
            var data = await res.json();

            _renderSegments(data.segments);

            if (data.available) {
                _setAvailable();
            } else {
                _setUnavailable(data.lastSpin || null);
            }
        } catch (e) {
            // Silently ignore — card remains in loading state
        }
    }

    await _fetchAndRender();

    // Refresh every 60 seconds (countdown tick & availability change)
    window._fortuneWheelInterval = setInterval(function() {
        if (!document.getElementById('fortuneWheelCard')) {
            clearInterval(window._fortuneWheelInterval);
            window._fortuneWheelInterval = null;
            return;
        }
        _fetchAndRender();
    }, 60000);
}


// ─────────────────────────────────────────────────────────────────────
// FIRST DEPOSIT BONUS CARD
// ─────────────────────────────────────────────────────────────────────

(function _injectFirstDepositCss() {
    if (document.getElementById('firstDeposit-css')) return;
    var s = document.createElement('style');
    s.id = 'firstDeposit-css';
    s.textContent = [
        '.fd-card { padding: 14px; border: 1px solid rgba(52,211,153,0.35); border-radius: 10px; background: rgba(52,211,153,0.06); margin-bottom: 12px; }',
        '.fd-card-header { margin-bottom: 10px; }',
        '.fd-card-title { font-size: 15px; font-weight: 700; color: #34d399; margin: 0 0 4px; }',
        '.fd-card-subtitle { font-size: 12px; color: #9ca3af; margin: 0; }',
        '.fd-reward-row { display: flex; align-items: center; gap: 8px; margin: 10px 0; padding: 10px; border-radius: 8px; background: rgba(52,211,153,0.10); }',
        '.fd-reward-icon { font-size: 22px; }',
        '.fd-reward-text { font-size: 14px; font-weight: 700; color: #d1fae5; }',
        '.fd-reward-sub { font-size: 11px; color: #6ee7b7; margin-top: 2px; }',
        '.fd-claim-btn { width: 100%; padding: 10px; border-radius: 8px; border: none; background: linear-gradient(135deg, #059669, #34d399); color: #fff; font-weight: 700; font-size: 14px; cursor: pointer; transition: opacity 0.2s; }',
        '.fd-claim-btn:hover { opacity: 0.85; }',
        '.fd-claim-btn:disabled { opacity: 0.5; cursor: not-allowed; }',
        '.fd-claimed-msg { text-align: center; padding: 10px 0; font-size: 13px; font-weight: 700; color: #34d399; }'
    ].join('\n');
    document.head.appendChild(s);
})();

async function renderFirstDepositCard(container) {
    if (!container) return;

    // Auth guard — same pattern as renderFortuneWheelCard
    if (typeof isServerAuthToken !== 'function' || !isServerAuthToken()) return;
    var token = localStorage.getItem(typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken');
    if (!token) return;

    // Fetch eligibility status first; only render if eligible and unclaimed
    var statusData = null;
    try {
        var statusRes = await fetch('/api/firstdeposit/status', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (!statusRes.ok) return;
        statusData = await statusRes.json();
    } catch (e) {
        return;
    }

    // Not eligible (no first deposit yet) or already claimed — nothing to show
    if (!statusData || !statusData.eligible || statusData.claimed) return;

    // Remove any pre-existing card
    var existing = document.getElementById('firstDepositCard');
    if (existing && existing.parentNode) existing.parentNode.removeChild(existing);

    // ── Build card ────────────────────────────────────────────────────

    var card = document.createElement('div');
    card.className = 'fd-card';
    card.id = 'firstDepositCard';

    // Header
    var header = document.createElement('div');
    header.className = 'fd-card-header';

    var title = document.createElement('h3');
    title.className = 'fd-card-title';
    title.textContent = '\uD83C\uDF81 First Deposit Bonus';
    header.appendChild(title);

    var subtitle = document.createElement('p');
    subtitle.className = 'fd-card-subtitle';
    subtitle.textContent = 'You made your first deposit! Claim your welcome bonus.';
    header.appendChild(subtitle);

    card.appendChild(header);

    // Reward display row
    var rewardRow = document.createElement('div');
    rewardRow.className = 'fd-reward-row';

    var rewardIcon = document.createElement('div');
    rewardIcon.className = 'fd-reward-icon';
    rewardIcon.textContent = '\uD83D\uDC8E';
    rewardRow.appendChild(rewardIcon);

    var rewardInfo = document.createElement('div');

    var rewardText = document.createElement('div');
    rewardText.className = 'fd-reward-text';
    rewardText.textContent = '+500 Gems & +$2.00 Credits';
    rewardInfo.appendChild(rewardText);

    var rewardSub = document.createElement('div');
    rewardSub.className = 'fd-reward-sub';
    rewardSub.textContent = 'One-time welcome bonus';
    rewardInfo.appendChild(rewardSub);

    rewardRow.appendChild(rewardInfo);
    card.appendChild(rewardRow);

    // Claim button
    var claimBtn = document.createElement('button');
    claimBtn.className = 'fd-claim-btn';
    claimBtn.id = 'fdClaimBtn';
    claimBtn.textContent = 'Claim Bonus';

    claimBtn.addEventListener('click', function() {
        if (claimBtn.disabled) return;
        claimBtn.disabled = true;
        claimBtn.textContent = 'Claiming\u2026';

        fetch('/api/firstdeposit/claim', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            }
        })
        .then(function(r) { return r.json(); })
        .then(function(d) {
            if (d && d.success) {
                // Update balance display
                if (typeof updateBalanceDisplay === 'function' && d.newBalance !== undefined) {
                    updateBalanceDisplay(d.newBalance);
                }
                // Show toast notification
                if (typeof showToast === 'function') {
                    var label = (d.reward && d.reward.gems)
                        ? '\uD83C\uDF81 Welcome bonus: +' + d.reward.gems + ' gems!'
                        : '\uD83C\uDF81 First deposit bonus claimed!';
                    showToast(label, 'win');
                }
                // Swap button area for success message
                if (claimBtn.parentNode) claimBtn.parentNode.removeChild(claimBtn);
                var claimedMsg = document.createElement('div');
                claimedMsg.className = 'fd-claimed-msg';
                claimedMsg.textContent = '\u2705 Claimed! Welcome to Matrix Spins.';
                card.appendChild(claimedMsg);
            } else {
                claimBtn.disabled = false;
                claimBtn.textContent = 'Claim Bonus';
                if (typeof showToast === 'function') {
                    showToast(d && d.error ? d.error : 'Could not claim bonus. Try again.', 'error');
                }
            }
        })
        .catch(function() {
            claimBtn.disabled = false;
            claimBtn.textContent = 'Claim Bonus';
        });
    });

    card.appendChild(claimBtn);
    container.appendChild(card);
}


// ─────────────────────────────────────────────────────────────────────
// RELOAD BONUS CARD
// ─────────────────────────────────────────────────────────────────────

(function _injectReloadBonusCss() {
    if (document.getElementById('reloadBonus-css')) return;
    var s = document.createElement('style');
    s.id = 'reloadBonus-css';
    s.textContent = [
        '.rb-card { padding: 14px; border: 1px solid rgba(251,191,36,0.35); border-radius: 10px; background: rgba(251,191,36,0.06); margin-bottom: 12px; }',
        '.rb-title { font-size: 15px; font-weight: 700; color: #fbbf24; margin: 0 0 4px; }',
        '.rb-subtitle { font-size: 12px; color: #9ca3af; margin: 0 0 10px; }',
        '.rb-claim-btn { width: 100%; padding: 10px; border-radius: 8px; border: none; background: linear-gradient(135deg, #d97706, #fbbf24); color: #1a1a2e; font-weight: 700; font-size: 14px; cursor: pointer; transition: opacity 0.2s; margin-bottom: 8px; display: block; }',
        '.rb-claim-btn:hover { opacity: 0.85; }',
        '.rb-claim-btn:disabled { opacity: 0.5; cursor: not-allowed; }',
        '.rb-cooldown-badge { display: inline-block; padding: 6px 12px; border-radius: 20px; background: rgba(107,114,128,0.25); color: #9ca3af; font-size: 12px; font-weight: 600; margin-bottom: 8px; }',
        '.rb-success-msg { text-align: center; padding: 10px 0; font-size: 13px; font-weight: 700; color: #fbbf24; margin-bottom: 8px; }',
        '.rb-terms { font-size: 10px; color: #6b7280; margin: 0; }'
    ].join('\n');
    document.head.appendChild(s);
})();

async function renderReloadBonusCard(container) {
    if (!container) return;

    // Auth guard
    if (typeof isServerAuthToken !== 'function' || !isServerAuthToken()) {
        // Show a minimal login-prompt card
        if (document.getElementById('reloadBonusCard')) return;
        var loginCard = document.createElement('div');
        loginCard.className = 'rb-card';
        loginCard.id = 'reloadBonusCard';
        var loginTitle = document.createElement('h3');
        loginTitle.className = 'rb-title';
        loginTitle.textContent = '\uD83D\uDD04 Reload Bonus';
        loginCard.appendChild(loginTitle);
        var loginMsg = document.createElement('p');
        loginMsg.className = 'rb-subtitle';
        loginMsg.textContent = 'Login to check your reload bonus eligibility.';
        loginCard.appendChild(loginMsg);
        var loginTerms = document.createElement('p');
        loginTerms.className = 'rb-terms';
        loginTerms.textContent = 'Min $5 deposit \u2022 7-day cooldown \u2022 25% match';
        loginCard.appendChild(loginTerms);
        container.appendChild(loginCard);
        return;
    }

    var token = localStorage.getItem(typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken');
    if (!token) return;

    // Fetch status
    var statusData = null;
    try {
        var statusRes = await fetch('/api/reloadbonus/status', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (!statusRes.ok) return;
        statusData = await statusRes.json();
    } catch (e) {
        return;
    }

    if (!statusData) return;

    // Remove any pre-existing card
    var existing = document.getElementById('reloadBonusCard');
    if (existing && existing.parentNode) existing.parentNode.removeChild(existing);

    // Build card
    var card = document.createElement('div');
    card.className = 'rb-card';
    card.id = 'reloadBonusCard';

    var title = document.createElement('h3');
    title.className = 'rb-title';
    title.textContent = '\uD83D\uDD04 Reload Bonus';
    card.appendChild(title);

    var subtitle = document.createElement('p');
    subtitle.className = 'rb-subtitle';
    subtitle.textContent = 'Get 25% back on your next deposit, up to $2.50';
    card.appendChild(subtitle);

    if (statusData.eligible) {
        // Eligible — show claim button
        var claimBtn = document.createElement('button');
        claimBtn.className = 'rb-claim-btn';
        claimBtn.id = 'rbClaimBtn';
        claimBtn.textContent = 'Claim Reload Bonus \u2192';

        claimBtn.addEventListener('click', function() {
            if (claimBtn.disabled) return;
            claimBtn.disabled = true;
            claimBtn.textContent = 'Claiming\u2026';

            fetch('/api/reloadbonus/claim', {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Content-Type': 'application/json'
                }
            })
            .then(function(r) { return r.json(); })
            .then(function(d) {
                if (d && d.success) {
                    if (typeof updateBalanceDisplay === 'function' && d.newBalance !== undefined) {
                        updateBalanceDisplay(d.newBalance);
                    }
                    if (typeof showToast === 'function') {
                        var bonusAmt = d.bonus !== undefined ? '$' + d.bonus.toFixed(2) : '';
                        showToast('\uD83D\uDD04 Reload bonus' + (bonusAmt ? ': +' + bonusAmt : '') + ' credited!', 'win');
                    }
                    if (claimBtn.parentNode) claimBtn.parentNode.removeChild(claimBtn);
                    var successMsg = document.createElement('div');
                    successMsg.className = 'rb-success-msg';
                    successMsg.textContent = '\u2705 Bonus credited to your account!';
                    card.insertBefore(successMsg, card.querySelector('.rb-terms'));
                } else {
                    claimBtn.disabled = false;
                    claimBtn.textContent = 'Claim Reload Bonus \u2192';
                    if (typeof showToast === 'function') {
                        showToast(d && d.error ? d.error : 'Could not claim reload bonus. Try again.', 'error');
                    }
                }
            })
            .catch(function() {
                claimBtn.disabled = false;
                claimBtn.textContent = 'Claim Reload Bonus \u2192';
            });
        });

        card.appendChild(claimBtn);
    } else if (statusData.cooldownActive) {
        // Cooldown active — show countdown badge
        var badge = document.createElement('div');
        badge.className = 'rb-cooldown-badge';
        var days = statusData.daysUntilNext !== undefined ? statusData.daysUntilNext : '?';
        badge.textContent = '\uD83D\uDD50 Available in ' + days + (days === 1 ? ' day' : ' days');
        card.appendChild(badge);
    }

    var terms = document.createElement('p');
    terms.className = 'rb-terms';
    terms.textContent = 'Min $5 deposit \u2022 7-day cooldown \u2022 25% match';
    card.appendChild(terms);

    container.appendChild(card);
}

// ─────────────────────────────────────────────────────────────────────────────
// Birthday Set Card
// ─────────────────────────────────────────────────────────────────────────────
async function renderBirthdaySetCard(container) {
    // Auth guard
    if (typeof isServerAuthToken !== 'function' || !isServerAuthToken()) return;
    var token = localStorage.getItem(typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken');
    if (!token) return;

    // Inject CSS once (static string, no variables)
    if (!document.getElementById('birthday-set-css')) {
        var s = document.createElement('style');
        s.id = 'birthday-set-css';
        s.textContent = '.birthday-set-card { background: linear-gradient(135deg, #2a1040 0%, #1a0830 100%); border: 1px solid #c084fc; border-radius: 12px; padding: 16px; margin-bottom: 12px; color: #f3e8ff; } .birthday-set-card h3 { margin: 0 0 8px 0; font-size: 1.1rem; color: #e879f9; } .birthday-set-card .bsc-desc { font-size: 0.85rem; color: #d8b4fe; margin: 0 0 10px 0; } .birthday-set-card .bsc-preview { font-size: 0.8rem; color: #a78bfa; background: rgba(167,139,250,0.1); border-radius: 6px; padding: 6px 10px; margin-bottom: 12px; } .birthday-set-card .bsc-selects { display: flex; gap: 8px; margin-bottom: 10px; } .birthday-set-card select { flex: 1; background: #1e0a3c; color: #f3e8ff; border: 1px solid #7c3aed; border-radius: 6px; padding: 6px 8px; font-size: 0.85rem; cursor: pointer; } .birthday-set-card .bsc-btn { width: 100%; padding: 10px; background: linear-gradient(135deg, #7c3aed, #a21caf); color: #fff; border: none; border-radius: 8px; font-size: 0.9rem; font-weight: 600; cursor: pointer; transition: opacity 0.2s; } .birthday-set-card .bsc-btn:disabled { opacity: 0.5; cursor: not-allowed; } .birthday-set-card .bsc-success { color: #86efac; font-size: 0.9rem; margin-top: 8px; } .birthday-set-card .bsc-error { color: #f87171; font-size: 0.85rem; margin-top: 6px; } .birthday-set-card .bsc-bonus-row { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 10px; } .birthday-set-card .bsc-bonus-chip { background: rgba(167,139,250,0.15); border: 1px solid #7c3aed; border-radius: 20px; padding: 4px 10px; font-size: 0.8rem; color: #d8b4fe; } .birthday-set-card .bsc-claimed { color: #86efac; font-size: 0.9rem; display: flex; align-items: center; gap: 6px; }';
        document.head.appendChild(s);
    }

    // Fetch status
    var statusData = null;
    try {
        var statusRes = await fetch('/api/birthday/status', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (!statusRes.ok) return;
        statusData = await statusRes.json();
    } catch (e) {
        console.error('[Birthday]', e);
        return;
    }
    if (!statusData) return;

    // Remove pre-existing card
    var existing = document.getElementById('birthdaySetCard');
    if (existing && existing.parentNode) existing.parentNode.removeChild(existing);

    // Build card shell
    var card = document.createElement('div');
    card.className = 'birthday-set-card';
    card.id = 'birthdaySetCard';

    var title = document.createElement('h3');

    if (statusData.hasBirthday === false) {
        // ── SETUP STATE ───────────────────────────────────────────────
        title.textContent = '\uD83C\uDF82 Set Your Birthday';
        card.appendChild(title);

        var desc = document.createElement('p');
        desc.className = 'bsc-desc';
        desc.textContent = 'Set your birthday once to unlock annual birthday bonuses!';
        card.appendChild(desc);

        var preview = document.createElement('div');
        preview.className = 'bsc-preview';
        preview.textContent = '+$10 Credits, +500 Gems, +10 Free Spins on your birthday';
        card.appendChild(preview);

        var selectWrap = document.createElement('div');
        selectWrap.className = 'bsc-selects';

        var monthSel = document.createElement('select');
        monthSel.setAttribute('aria-label', 'Birth month');
        var monthPlaceholder = document.createElement('option');
        monthPlaceholder.value = '';
        monthPlaceholder.textContent = 'Month';
        monthSel.appendChild(monthPlaceholder);
        var monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
        for (var m = 0; m < 12; m++) {
            var mo = document.createElement('option');
            mo.value = String(m + 1);
            mo.textContent = monthNames[m];
            monthSel.appendChild(mo);
        }

        var daySel = document.createElement('select');
        daySel.setAttribute('aria-label', 'Birth day');
        var dayPlaceholder = document.createElement('option');
        dayPlaceholder.value = '';
        dayPlaceholder.textContent = 'Day';
        daySel.appendChild(dayPlaceholder);
        for (var d = 1; d <= 31; d++) {
            var dy = document.createElement('option');
            dy.value = String(d);
            dy.textContent = String(d);
            daySel.appendChild(dy);
        }

        selectWrap.appendChild(monthSel);
        selectWrap.appendChild(daySel);
        card.appendChild(selectWrap);

        var submitBtn = document.createElement('button');
        submitBtn.className = 'bsc-btn';
        submitBtn.textContent = 'Save Birthday';

        var msgEl = document.createElement('div');

        submitBtn.addEventListener('click', function() {
            var month = monthSel.value;
            var day = daySel.value;
            if (!month || !day) {
                msgEl.className = 'bsc-error';
                msgEl.textContent = 'Please select both a month and a day.';
                return;
            }
            submitBtn.disabled = true;
            submitBtn.textContent = 'Saving\u2026';
            fetch('/api/birthday/set', {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ month: parseInt(month, 10), day: parseInt(day, 10) })
            })
            .then(function(r) { return r.json(); })
            .then(function(data) {
                if (data && data.success) {
                    selectWrap.style.display = 'none';
                    submitBtn.style.display = 'none';
                    msgEl.className = 'bsc-success';
                    msgEl.textContent = '\uD83C\uDF82 Birthday saved! Come back on your birthday for your bonus!';
                } else {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Save Birthday';
                    msgEl.className = 'bsc-error';
                    msgEl.textContent = (data && data.error) ? data.error : 'Could not save birthday. Please try again.';
                }
            })
            .catch(function(e) {
                console.error('[Birthday]', e);
                submitBtn.disabled = false;
                submitBtn.textContent = 'Save Birthday';
                msgEl.className = 'bsc-error';
                msgEl.textContent = 'Network error. Please try again.';
            });
        });

        card.appendChild(submitBtn);
        card.appendChild(msgEl);

    } else if (statusData.hasBirthday === true && !statusData.isBirthday) {
        // ── BIRTHDAY SET, NOT TODAY ───────────────────────────────────
        title.textContent = '\uD83C\uDF82 Birthday Set';
        card.appendChild(title);

        var waitDesc = document.createElement('p');
        waitDesc.className = 'bsc-desc';
        waitDesc.textContent = 'Your birthday bonus is ready and waiting!';
        card.appendChild(waitDesc);

        var bonusRow = document.createElement('div');
        bonusRow.className = 'bsc-bonus-row';

        var chip1 = document.createElement('span');
        chip1.className = 'bsc-bonus-chip';
        chip1.textContent = '+$10 Credits';
        var chip2 = document.createElement('span');
        chip2.className = 'bsc-bonus-chip';
        chip2.textContent = '+500 Gems';
        var chip3 = document.createElement('span');
        chip3.className = 'bsc-bonus-chip';
        chip3.textContent = '+10 Free Spins';
        bonusRow.appendChild(chip1);
        bonusRow.appendChild(chip2);
        bonusRow.appendChild(chip3);
        card.appendChild(bonusRow);

    } else if (statusData.isBirthday === true && !statusData.alreadyClaimed) {
        // ── HAPPY BIRTHDAY — CLAIM ────────────────────────────────────
        title.textContent = '\uD83C\uDF82 Happy Birthday!';
        card.appendChild(title);

        var bdayDesc = document.createElement('p');
        bdayDesc.className = 'bsc-desc';
        bdayDesc.textContent = 'Today is your birthday! Claim your special bonus now.';
        card.appendChild(bdayDesc);

        var claimBonusRow = document.createElement('div');
        claimBonusRow.className = 'bsc-bonus-row';

        var cb1 = document.createElement('span');
        cb1.className = 'bsc-bonus-chip';
        var credits = (statusData.bonusCredits !== undefined) ? statusData.bonusCredits : 10;
        cb1.textContent = '+$' + credits + ' Credits';

        var cb2 = document.createElement('span');
        cb2.className = 'bsc-bonus-chip';
        var gems = (statusData.bonusGems !== undefined) ? statusData.bonusGems : 500;
        cb2.textContent = '+' + gems + ' Gems';

        var cb3 = document.createElement('span');
        cb3.className = 'bsc-bonus-chip';
        var freeSpins = (statusData.bonusFreeSpins !== undefined) ? statusData.bonusFreeSpins : 10;
        cb3.textContent = '+' + freeSpins + ' Free Spins';

        claimBonusRow.appendChild(cb1);
        claimBonusRow.appendChild(cb2);
        claimBonusRow.appendChild(cb3);
        card.appendChild(claimBonusRow);

        var claimBtn = document.createElement('button');
        claimBtn.className = 'bsc-btn';
        claimBtn.textContent = '\uD83C\uDF81 Claim Birthday Bonus';

        var claimMsg = document.createElement('div');

        claimBtn.addEventListener('click', function() {
            if (claimBtn.disabled) return;
            claimBtn.disabled = true;
            claimBtn.textContent = 'Claiming\u2026';
            fetch('/api/birthday/claim', {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Content-Type': 'application/json'
                }
            })
            .then(function(r) { return r.json(); })
            .then(function(data) {
                if (data && data.success) {
                    if (typeof updateBalanceDisplay === 'function' && data.newBalance !== undefined) {
                        updateBalanceDisplay(data.newBalance);
                    }
                    if (typeof showToast === 'function') {
                        showToast('\uD83C\uDF82 Happy Birthday! Bonus claimed!', 'win');
                    }
                    claimBtn.style.display = 'none';
                    claimMsg.className = 'bsc-success';
                    claimMsg.textContent = '\u2705 Birthday bonus credited to your account!';
                } else {
                    claimBtn.disabled = false;
                    claimBtn.textContent = '\uD83C\uDF81 Claim Birthday Bonus';
                    claimMsg.className = 'bsc-error';
                    claimMsg.textContent = (data && data.error) ? data.error : 'Could not claim bonus. Please try again.';
                }
            })
            .catch(function(e) {
                console.error('[Birthday]', e);
                claimBtn.disabled = false;
                claimBtn.textContent = '\uD83C\uDF81 Claim Birthday Bonus';
                claimMsg.className = 'bsc-error';
                claimMsg.textContent = 'Network error. Please try again.';
            });
        });

        card.appendChild(claimBtn);
        card.appendChild(claimMsg);

    } else if (statusData.isBirthday === true && statusData.alreadyClaimed) {
        // ── ALREADY CLAIMED ───────────────────────────────────────────
        title.textContent = '\uD83C\uDF82 Happy Birthday!';
        card.appendChild(title);

        var claimedRow = document.createElement('div');
        claimedRow.className = 'bsc-claimed';

        var check = document.createElement('span');
        check.textContent = '\u2705';

        var claimedText = document.createElement('span');
        claimedText.textContent = 'Birthday bonus already claimed today';

        claimedRow.appendChild(check);
        claimedRow.appendChild(claimedText);
        card.appendChild(claimedRow);
    }

    container.appendChild(card);
}

// ─────────────────────────────────────────────────────────────────────────────
// renderCoinflipCard(container)
// Playable coinflip mini-game widget in the promo sidebar.
// POST /api/coinflip/play  { bet, pick }  → { result, win, payout, newBalance }
// ─────────────────────────────────────────────────────────────────────────────
function renderCoinflipCard(container) {
    // Auth guard
    if (typeof isServerAuthToken !== 'function' || !isServerAuthToken()) return;
    var token = localStorage.getItem(typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken');
    if (!token) return;
    if (document.getElementById('coinflipPromoCard')) return;

    // Inject CSS once
    if (!document.getElementById('coinflip-css')) {
        var style = document.createElement('style');
        style.id = 'coinflip-css';
        style.textContent = '#coinflipPromoCard { background:#0f1520; border:1px solid #3a3a6a; border-radius:12px; padding:16px; margin-bottom:14px; color:#fff; } #coinflipPromoCard h4 { color:#fbbf24; margin:0 0 6px 0; font-size:15px; } #coinflipPromoCard p { color:#aaa; font-size:12px; margin:0 0 12px 0; } .cf-bet-row { display:flex; align-items:center; gap:8px; margin-bottom:10px; font-size:13px; color:#ccc; } .cf-bet-input { background:#1a1f2e; border:1px solid #4a4a7a; color:#fff; padding:6px 10px; border-radius:6px; width:80px; font-size:13px; } .cf-buttons { display:flex; gap:10px; margin-bottom:10px; } .cf-btn { flex:1; padding:10px; border:none; border-radius:8px; font-weight:700; font-size:14px; cursor:pointer; transition:opacity 0.2s; } #cfHeadsBtn { background:linear-gradient(135deg,#d97706,#fbbf24); color:#000; } #cfTailsBtn { background:linear-gradient(135deg,#1d4ed8,#3b82f6); color:#fff; } .cf-btn:disabled { opacity:0.5; cursor:not-allowed; } .cf-result { text-align:center; padding:10px 0; } .cf-coin { font-size:36px; margin-bottom:6px; } .cf-result-msg { font-size:14px; font-weight:600; } .cf-result-msg.win { color:#4ade80; } .cf-result-msg.loss { color:#f87171; } .cf-balance { font-size:12px; color:#aaa; text-align:center; margin-top:6px; } .cf-balance strong { color:#fff; }';
        document.head.appendChild(style);
    }

    // Card root
    var card = document.createElement('div');
    card.id = 'coinflipPromoCard';

    // Title
    var title = document.createElement('h4');
    title.textContent = '\uD83E\uDE99 Coin Flip \u2014 2x Payout';
    card.appendChild(title);

    // Description
    var desc = document.createElement('p');
    desc.textContent = 'Pick heads or tails. Win 2x your bet!';
    card.appendChild(desc);

    // Bet row
    var betRow = document.createElement('div');
    betRow.className = 'cf-bet-row';

    var betLabel = document.createElement('label');
    betLabel.textContent = 'Bet: $';

    var betInput = document.createElement('input');
    betInput.type = 'number';
    betInput.min = '0.25';
    betInput.max = '1000';
    betInput.step = '0.25';
    betInput.value = '1.00';
    betInput.id = 'cfBetInput';
    betInput.className = 'cf-bet-input';

    betRow.appendChild(betLabel);
    betRow.appendChild(betInput);
    card.appendChild(betRow);

    // Heads / Tails buttons
    var buttonsRow = document.createElement('div');
    buttonsRow.className = 'cf-buttons';

    var headsBtn = document.createElement('button');
    headsBtn.id = 'cfHeadsBtn';
    headsBtn.className = 'cf-btn';
    headsBtn.textContent = '\uD83D\uDFE1 HEADS';

    var tailsBtn = document.createElement('button');
    tailsBtn.id = 'cfTailsBtn';
    tailsBtn.className = 'cf-btn';
    tailsBtn.textContent = '\uD83D\uDD35 TAILS';

    buttonsRow.appendChild(headsBtn);
    buttonsRow.appendChild(tailsBtn);
    card.appendChild(buttonsRow);

    // Result area
    var resultArea = document.createElement('div');
    resultArea.id = 'cfResult';
    resultArea.className = 'cf-result';
    resultArea.style.display = 'none';

    var coinEl = document.createElement('div');
    coinEl.id = 'cfCoin';
    coinEl.className = 'cf-coin';

    var resultMsg = document.createElement('div');
    resultMsg.id = 'cfResultMsg';
    resultMsg.className = 'cf-result-msg';

    resultArea.appendChild(coinEl);
    resultArea.appendChild(resultMsg);
    card.appendChild(resultArea);

    // Balance display
    var balanceRow = document.createElement('div');
    balanceRow.id = 'cfBalance';
    balanceRow.className = 'cf-balance';
    balanceRow.style.display = 'none';

    var balanceLabel = document.createElement('span');
    balanceLabel.textContent = 'Balance: $';

    var balanceAmt = document.createElement('strong');
    balanceAmt.id = 'cfBalanceAmt';

    balanceRow.appendChild(balanceLabel);
    balanceRow.appendChild(balanceAmt);
    card.appendChild(balanceRow);

    // ── Flip handler ──────────────────────────────────────────────────────────
    function doFlip(pick) {
        var rawBet = parseFloat(betInput.value);
        if (isNaN(rawBet) || rawBet < 0.25) rawBet = 1.00;
        if (rawBet > 1000) rawBet = 1000;
        var bet = Math.round(rawBet * 100) / 100;

        headsBtn.disabled = true;
        tailsBtn.disabled = true;

        resultArea.style.display = 'block';
        coinEl.textContent = '\uD83D\uDD04 Flipping\u2026';
        resultMsg.textContent = '';
        resultMsg.className = 'cf-result-msg';
        balanceRow.style.display = 'none';

        fetch('/api/coinflip/play', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ bet: bet, pick: pick })
        })
        .then(function(r) { return r.json(); })
        .then(function(data) {
            if (data && typeof data.result !== 'undefined') {
                coinEl.textContent = data.result === 'heads' ? '\uD83D\uDFE1' : '\uD83D\uDD35';

                if (data.win) {
                    resultMsg.className = 'cf-result-msg win';
                    var winMsg = document.createElement('span');
                    winMsg.textContent = '\u2705 You won $' + data.payout.toFixed(2) + '!';
                    resultMsg.appendChild(winMsg);
                } else {
                    resultMsg.className = 'cf-result-msg loss';
                    var lossMsg = document.createElement('span');
                    lossMsg.textContent = '\u274C You lost. Better luck next time!';
                    resultMsg.appendChild(lossMsg);
                }

                if (typeof data.newBalance !== 'undefined') {
                    balanceAmt.textContent = data.newBalance.toFixed(2);
                    balanceRow.style.display = 'block';
                    if (typeof updateBalanceDisplay === 'function') {
                        updateBalanceDisplay(data.newBalance);
                    }
                }
            } else {
                var errMsg = document.createElement('span');
                errMsg.textContent = (data && data.error) ? data.error : 'Unexpected error. Please try again.';
                resultMsg.className = 'cf-result-msg loss';
                resultMsg.appendChild(errMsg);
            }

            setTimeout(function() {
                headsBtn.disabled = false;
                tailsBtn.disabled = false;
            }, 1500);
        })
        .catch(function(err) {
            console.error('[CoinFlip]', err);
            coinEl.textContent = '\u26A0\uFE0F';
            var netErrMsg = document.createElement('span');
            netErrMsg.textContent = 'Network error. Please try again.';
            resultMsg.className = 'cf-result-msg loss';
            resultMsg.appendChild(netErrMsg);
            setTimeout(function() {
                headsBtn.disabled = false;
                tailsBtn.disabled = false;
            }, 1500);
        });
    }

    headsBtn.addEventListener('click', function() { doFlip('heads'); });
    tailsBtn.addEventListener('click', function() { doFlip('tails'); });

    container.appendChild(card);
}

// ─────────────────────────────────────────────────────────────────────────────
// renderDiceCard(container)
// Playable dice mini-game widget in the promo sidebar.
// POST /api/dice/roll  { bet, target, direction }
//   → { roll, won, payout, newBalance, chance, multiplier }
// ─────────────────────────────────────────────────────────────────────────────
function renderDiceCard(container) {
    // Auth guard
    if (typeof isServerAuthToken !== 'function' || !isServerAuthToken()) return;
    var token = localStorage.getItem(typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken');
    if (!token) return;
    if (document.getElementById('dicePromoCard')) return;

    // Inject CSS once
    if (!document.getElementById('dice-card-css')) {
        var style = document.createElement('style');
        style.id = 'dice-card-css';
        style.textContent = '#dicePromoCard { background:#1a1a2e; border:1px solid #3a3a6a; border-radius:12px; padding:16px; margin-bottom:14px; color:#fff; } #dicePromoCard h4 { color:#fbbf24; margin:0 0 4px 0; font-size:15px; } #dicePromoCard .dc-desc { color:#aaa; font-size:12px; margin:0 0 12px 0; } .dc-roll-display { font-size:3rem; font-family:monospace; color:#f59e0b; text-align:center; letter-spacing:2px; padding:10px 0; min-height:60px; line-height:1; } .dc-dir-row { display:flex; gap:8px; margin-bottom:10px; } .dc-dir-btn { flex:1; padding:8px; border:1px solid #4a4a7a; border-radius:7px; background:#0f1520; color:#aaa; font-weight:700; font-size:13px; cursor:pointer; transition:all 0.15s; } .dc-dir-btn.over-active { background:#16a34a; border-color:#22c55e; color:#fff; } .dc-dir-btn.under-active { background:#b91c1c; border-color:#ef4444; color:#fff; } .dc-target-row { margin-bottom:8px; } .dc-target-label { display:flex; justify-content:space-between; font-size:12px; color:#ccc; margin-bottom:4px; } .dc-target-val { color:#fbbf24; font-weight:700; } .dc-slider { width:100%; accent-color:#f59e0b; cursor:pointer; } .dc-chance { font-size:12px; color:#94a3b8; margin-bottom:10px; text-align:center; } .dc-bet-row { display:flex; align-items:center; gap:8px; margin-bottom:10px; } .dc-bet-label { font-size:13px; color:#ccc; white-space:nowrap; } .dc-bet-input { background:#0f1520; border:1px solid #4a4a7a; color:#fff; padding:6px 10px; border-radius:6px; width:80px; font-size:13px; flex-shrink:0; } .dc-roll-btn { flex:1; padding:9px; border:none; border-radius:8px; background:linear-gradient(135deg,#d97706,#fbbf24); color:#000; font-weight:700; font-size:14px; cursor:pointer; transition:opacity 0.2s; } .dc-roll-btn:disabled { opacity:0.5; cursor:not-allowed; } .dc-result { font-size:14px; font-weight:600; text-align:center; min-height:20px; margin-top:4px; } .dc-result.win { color:#4ade80; } .dc-result.loss { color:#f87171; } .dc-result.err { color:#fb923c; }';
        document.head.appendChild(style);
    }

    // Card root
    var card = document.createElement('div');
    card.id = 'dicePromoCard';

    // Title
    var title = document.createElement('h4');
    title.textContent = '\uD83C\uDFB2 Dice';
    card.appendChild(title);

    // Description
    var desc = document.createElement('p');
    desc.className = 'dc-desc';
    desc.textContent = 'Roll over or under your target. Multiplier scales with difficulty.';
    card.appendChild(desc);

    // Roll display
    var rollDisplay = document.createElement('div');
    rollDisplay.className = 'dc-roll-display';
    rollDisplay.textContent = '--';
    card.appendChild(rollDisplay);

    // Direction toggle
    var dirRow = document.createElement('div');
    dirRow.className = 'dc-dir-row';

    var overBtn = document.createElement('button');
    overBtn.className = 'dc-dir-btn over-active';
    overBtn.textContent = 'OVER';

    var underBtn = document.createElement('button');
    underBtn.className = 'dc-dir-btn';
    underBtn.textContent = 'UNDER';

    dirRow.appendChild(overBtn);
    dirRow.appendChild(underBtn);
    card.appendChild(dirRow);

    // Target slider row
    var targetRow = document.createElement('div');
    targetRow.className = 'dc-target-row';

    var targetLabel = document.createElement('div');
    targetLabel.className = 'dc-target-label';

    var targetLabelText = document.createElement('span');
    targetLabelText.textContent = 'Target:';

    var targetValEl = document.createElement('span');
    targetValEl.className = 'dc-target-val';
    targetValEl.textContent = '50';

    targetLabel.appendChild(targetLabelText);
    targetLabel.appendChild(targetValEl);
    targetRow.appendChild(targetLabel);

    var slider = document.createElement('input');
    slider.type = 'range';
    slider.min = '1';
    slider.max = '99';
    slider.value = '50';
    slider.className = 'dc-slider';
    targetRow.appendChild(slider);
    card.appendChild(targetRow);

    // Win chance display
    var chanceEl = document.createElement('div');
    chanceEl.className = 'dc-chance';
    card.appendChild(chanceEl);

    // Compute and display win chance
    var _direction = 'over';
    function updateChance() {
        var target = parseInt(slider.value, 10);
        var chance;
        if (_direction === 'over') {
            chance = (100 - target) / 100 * 97;
        } else {
            chance = target / 100 * 97;
        }
        targetValEl.textContent = String(target);
        chanceEl.textContent = 'Win chance: ' + chance.toFixed(2) + '%';
    }
    updateChance();

    slider.addEventListener('input', updateChance);

    overBtn.addEventListener('click', function() {
        _direction = 'over';
        overBtn.className = 'dc-dir-btn over-active';
        underBtn.className = 'dc-dir-btn';
        updateChance();
    });
    underBtn.addEventListener('click', function() {
        _direction = 'under';
        underBtn.className = 'dc-dir-btn under-active';
        overBtn.className = 'dc-dir-btn';
        updateChance();
    });

    // Bet row (bet input + roll button inline)
    var betRow = document.createElement('div');
    betRow.className = 'dc-bet-row';

    var betLabel = document.createElement('label');
    betLabel.className = 'dc-bet-label';
    betLabel.textContent = 'Bet: $';

    var betInput = document.createElement('input');
    betInput.type = 'number';
    betInput.min = '0.20';
    betInput.max = '1000';
    betInput.step = '0.20';
    betInput.value = '1.00';
    betInput.className = 'dc-bet-input';

    var rollBtn = document.createElement('button');
    rollBtn.className = 'dc-roll-btn';
    rollBtn.textContent = 'Roll';

    betRow.appendChild(betLabel);
    betRow.appendChild(betInput);
    betRow.appendChild(rollBtn);
    card.appendChild(betRow);

    // Result area
    var resultEl = document.createElement('div');
    resultEl.className = 'dc-result';
    card.appendChild(resultEl);

    // Roll handler
    rollBtn.addEventListener('click', function() {
        var bet = parseFloat(betInput.value);
        if (!bet || bet <= 0) {
            resultEl.className = 'dc-result err';
            var errMsg = document.createElement('span');
            errMsg.textContent = 'Enter a valid bet amount.';
            resultEl.textContent = '';
            resultEl.appendChild(errMsg);
            return;
        }

        var target = parseInt(slider.value, 10);
        var direction = _direction;

        rollBtn.disabled = true;
        resultEl.className = 'dc-result';
        resultEl.textContent = '';

        var spinFrames = 0;
        var spinMax = 12;
        var spinInterval = setInterval(function() {
            spinFrames++;
            rollDisplay.textContent = String(Math.floor(Math.random() * 100));
            if (spinFrames >= spinMax) clearInterval(spinInterval);
        }, 60);

        fetch('/api/dice/roll', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify({ bet: bet, target: target, direction: direction })
        })
        .then(function(res) { return res.json(); })
        .then(function(data) {
            clearInterval(spinInterval);

            if (data.error) {
                rollDisplay.textContent = '--';
                resultEl.className = 'dc-result err';
                var errSpan = document.createElement('span');
                errSpan.textContent = data.error;
                resultEl.appendChild(errSpan);
                rollBtn.disabled = false;
                return;
            }

            rollDisplay.textContent = String(data.roll);

            if (data.won) {
                resultEl.className = 'dc-result win';
                var winSpan = document.createElement('span');
                winSpan.textContent = 'WIN! +'  + (typeof data.payout === 'number' ? '$' + data.payout.toFixed(2) : '') + ' (' + (data.multiplier ? data.multiplier.toFixed(2) + 'x' : '') + ')';
                resultEl.appendChild(winSpan);
            } else {
                resultEl.className = 'dc-result loss';
                var lossSpan = document.createElement('span');
                lossSpan.textContent = 'LOSS! -$' + bet.toFixed(2);
                resultEl.appendChild(lossSpan);
            }

            if (typeof data.newBalance === 'number' && typeof updateBalanceDisplay === 'function') {
                updateBalanceDisplay(data.newBalance);
            }

            rollBtn.disabled = false;
        })
        .catch(function(err) {
            clearInterval(spinInterval);
            console.error('[Dice]', err);
            rollDisplay.textContent = '--';
            resultEl.className = 'dc-result err';
            var netErr = document.createElement('span');
            netErr.textContent = 'Network error. Please try again.';
            resultEl.appendChild(netErr);
            rollBtn.disabled = false;
        });
    });

    container.appendChild(card);
}

// ─────────────────────────────────────────────────────────────────────
// LOSS STREAK OFFER CARD
// ─────────────────────────────────────────────────────────────────────

function renderLossStreakCard(container) {
    // Auth check
    if (typeof isServerAuthToken !== 'function' || !isServerAuthToken()) return;
    var token = localStorage.getItem(typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken');
    if (!token) return;

    // ID guard — prevent duplicate cards
    if (document.getElementById('lossStreakCard')) return;

    // Inject CSS once
    if (!document.getElementById('loss-streak-css')) {
        var style = document.createElement('style');
        style.id = 'loss-streak-css';
        style.textContent = [
            '#lossStreakCard {',
            '  background: #1a1a2e;',
            '  border: 1px solid #e74c3c;',
            '  border-radius: 12px;',
            '  padding: 16px;',
            '  margin-bottom: 12px;',
            '  color: #fff;',
            '}',
            '#lossStreakCard .lsc-header {',
            '  display: flex;',
            '  align-items: center;',
            '  gap: 8px;',
            '  margin-bottom: 12px;',
            '}',
            '#lossStreakCard .lsc-title {',
            '  color: #e74c3c;',
            '  font-size: 16px;',
            '  font-weight: 700;',
            '  margin: 0;',
            '}',
            '#lossStreakCard .lsc-details {',
            '  list-style: none;',
            '  padding: 0;',
            '  margin: 0 0 12px 0;',
            '  display: flex;',
            '  flex-direction: column;',
            '  gap: 6px;',
            '}',
            '#lossStreakCard .lsc-details li {',
            '  font-size: 13px;',
            '  color: #ccc;',
            '}',
            '#lossStreakCard .lsc-input-row {',
            '  display: flex;',
            '  gap: 8px;',
            '  align-items: center;',
            '  margin-bottom: 10px;',
            '}',
            '#lossStreakCard .lsc-deposit-input {',
            '  background: #111;',
            '  border: 1px solid #444;',
            '  border-radius: 6px;',
            '  color: #fff;',
            '  padding: 6px 10px;',
            '  font-size: 14px;',
            '  width: 120px;',
            '}',
            '#lossStreakCard .lsc-claim-btn {',
            '  background: linear-gradient(135deg, #e74c3c, #c0392b);',
            '  color: #fff;',
            '  border: none;',
            '  border-radius: 6px;',
            '  padding: 8px 16px;',
            '  font-size: 14px;',
            '  font-weight: 600;',
            '  cursor: pointer;',
            '}',
            '#lossStreakCard .lsc-claim-btn:disabled {',
            '  opacity: 0.5;',
            '  cursor: not-allowed;',
            '}',
            '#lossStreakCard .lsc-result {',
            '  font-size: 13px;',
            '  min-height: 18px;',
            '}'
        ].join('\n');
        document.head.appendChild(style);
    }

    // Fetch eligibility
    fetch('/api/user/loss-streak-offer', {
        headers: { 'Authorization': 'Bearer ' + token }
    })
    .then(function(res) { return res.json(); })
    .then(function(data) {
        if (!data.eligible) return;

        var offer = data.offer;

        // Card wrapper
        var card = document.createElement('div');
        card.id = 'lossStreakCard';

        // Header row
        var header = document.createElement('div');
        header.className = 'lsc-header';

        var flame = document.createElement('span');
        flame.textContent = '\uD83D\uDD25';

        var title = document.createElement('h3');
        title.className = 'lsc-title';
        title.textContent = 'Loss Streak Offer';

        header.appendChild(flame);
        header.appendChild(title);
        card.appendChild(header);

        // Offer details list
        var details = document.createElement('ul');
        details.className = 'lsc-details';

        var liMatch = document.createElement('li');
        liMatch.textContent = '\uD83D\uDCC8 ' + offer.matchPct + '% Deposit Match';
        details.appendChild(liMatch);

        var liMax = document.createElement('li');
        liMax.textContent = '\uD83D\uDC8E Up to $' + offer.maxMatch;
        details.appendChild(liMax);

        var liMin = document.createElement('li');
        liMin.textContent = '\uD83D\uDCB3 Min Deposit: $' + offer.minDeposit;
        details.appendChild(liMin);

        card.appendChild(details);

        // Deposit input row
        var inputRow = document.createElement('div');
        inputRow.className = 'lsc-input-row';

        var depositInput = document.createElement('input');
        depositInput.type = 'number';
        depositInput.className = 'lsc-deposit-input';
        depositInput.min = String(offer.minDeposit);
        depositInput.value = String(offer.minDeposit);
        depositInput.step = '1';

        var claimBtn = document.createElement('button');
        claimBtn.className = 'lsc-claim-btn';
        claimBtn.textContent = 'Claim Offer';

        inputRow.appendChild(depositInput);
        inputRow.appendChild(claimBtn);
        card.appendChild(inputRow);

        // Result message div (initially empty)
        var resultDiv = document.createElement('div');
        resultDiv.className = 'lsc-result';
        card.appendChild(resultDiv);

        // Claim button handler
        claimBtn.addEventListener('click', function() {
            var depositAmount = parseFloat(depositInput.value);
            if (!depositAmount || depositAmount < offer.minDeposit) {
                resultDiv.style.color = '#e74c3c';
                resultDiv.textContent = '';
                var errMsg = document.createElement('span');
                errMsg.textContent = 'Minimum deposit is $' + offer.minDeposit;
                resultDiv.appendChild(errMsg);
                return;
            }

            claimBtn.disabled = true;
            resultDiv.textContent = '';

            fetch('/api/user/claim-loss-offer', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                },
                body: JSON.stringify({ depositAmount: depositAmount })
            })
            .then(function(res) { return res.json(); })
            .then(function(resp) {
                if (resp.error) {
                    resultDiv.style.color = '#e74c3c';
                    resultDiv.textContent = '';
                    var errSpan = document.createElement('span');
                    errSpan.textContent = resp.error;
                    resultDiv.appendChild(errSpan);
                    claimBtn.disabled = false;
                    return;
                }
                resultDiv.style.color = '#2ecc71';
                resultDiv.textContent = '';
                var okSpan = document.createElement('span');
                okSpan.textContent = 'Bonus granted: $' + (typeof resp.bonus === 'number' ? resp.bonus.toFixed(2) : resp.bonus) + ' added!';
                resultDiv.appendChild(okSpan);
                claimBtn.disabled = true;
                if (typeof resp.newBalance === 'number' && typeof updateBalanceDisplay === 'function') {
                    updateBalanceDisplay(resp.newBalance);
                }
            })
            .catch(function(err) {
                console.error('[LossStreakOffer]', err);
                resultDiv.style.color = '#e74c3c';
                resultDiv.textContent = '';
                var netErr = document.createElement('span');
                netErr.textContent = 'Network error. Please try again.';
                resultDiv.appendChild(netErr);
                claimBtn.disabled = false;
            });
        });

        container.appendChild(card);
    })
    .catch(function(err) {
        console.error('[LossStreakOffer] eligibility check failed', err);
    });
}

// ─────────────────────────────────────────────────────────────────────
// renderReferralCard — Referral Program card in the promos sidebar
// ─────────────────────────────────────────────────────────────────────
function renderReferralCard(container) {
    // Idempotency guard
    if (document.getElementById('referralCard')) return;

    // Auth guard
    if (typeof isServerAuthToken !== 'function' || !isServerAuthToken()) return;
    var token = localStorage.getItem(typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken');
    if (!token) return;

    // CSS injection
    if (!document.getElementById('referral-card-css')) {
        var s = document.createElement('style');
        s.id = 'referral-card-css';
        s.textContent = [
            '.ref-card { background: linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);',
            ' border: 1px solid #a855f7; border-radius: 12px; padding: 18px 16px; margin: 12px 0; color: #e2e8f0; }',
            '.ref-card-header { display:flex; align-items:center; gap:8px; margin-bottom:14px; }',
            '.ref-card-icon { font-size:22px; }',
            '.ref-card-title { font-size:15px; font-weight:700; color:#d8b4fe; letter-spacing:.5px; }',
            '.ref-code-block { background:#0f0f1a; border:1px dashed #7c3aed; border-radius:8px;',
            ' padding:10px 14px; display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; }',
            '.ref-code-text { font-size:20px; font-weight:800; color:#f0abfc; letter-spacing:3px; font-family:monospace; }',
            '.ref-copy-btn { background:#7c3aed; color:#fff; border:none; border-radius:6px;',
            ' padding:6px 12px; font-size:12px; font-weight:600; cursor:pointer; transition:background .2s; }',
            '.ref-copy-btn:hover { background:#9333ea; }',
            '.ref-link-btn { width:100%; background:linear-gradient(90deg,#7c3aed,#a855f7); color:#fff; border:none;',
            ' border-radius:8px; padding:10px; font-size:13px; font-weight:700; cursor:pointer;',
            ' margin-bottom:14px; transition:opacity .2s; }',
            '.ref-link-btn:hover { opacity:.85; }',
            '.ref-stats-row { display:flex; gap:8px; margin-bottom:14px; }',
            '.ref-stat { flex:1; background:#0f0f1a; border-radius:8px; padding:8px 4px; text-align:center; }',
            '.ref-stat-val { font-size:18px; font-weight:800; color:#f0abfc; }',
            '.ref-stat-lbl { font-size:10px; color:#94a3b8; margin-top:2px; }',
            '.ref-divider { border:none; border-top:1px solid #2d2d4e; margin:12px 0; }',
            '.ref-apply-title { font-size:12px; color:#94a3b8; margin-bottom:8px; }',
            '.ref-apply-row { display:flex; gap:8px; }',
            '.ref-apply-input { flex:1; background:#0f0f1a; border:1px solid #4c1d95; border-radius:6px;',
            ' color:#e2e8f0; padding:8px 10px; font-size:13px; outline:none; }',
            '.ref-apply-btn { background:#4c1d95; color:#fff; border:none; border-radius:6px;',
            ' padding:8px 12px; font-size:12px; font-weight:600; cursor:pointer; transition:background .2s; white-space:nowrap; }',
            '.ref-apply-btn:hover { background:#6d28d9; }',
            '.ref-apply-msg { font-size:12px; margin-top:6px; min-height:16px; }',
            '.ref-loading { color:#94a3b8; font-size:13px; text-align:center; padding:12px 0; }',
            '.ref-error { color:#f87171; font-size:13px; text-align:center; padding:12px 0; }'
        ].join('');
        document.head.appendChild(s);
    }

    // Outer card skeleton (static HTML — no variables in innerHTML)
    var card = document.createElement('div');
    card.id = 'referralCard';
    card.className = 'ref-card';

    var header = document.createElement('div');
    header.className = 'ref-card-header';
    var icon = document.createElement('span');
    icon.className = 'ref-card-icon';
    icon.textContent = '\uD83D\uDC65';
    var title = document.createElement('span');
    title.className = 'ref-card-title';
    title.textContent = 'REFERRAL PROGRAM';
    header.appendChild(icon);
    header.appendChild(title);
    card.appendChild(header);

    // Loading state
    var loadingEl = document.createElement('div');
    loadingEl.className = 'ref-loading';
    loadingEl.textContent = 'Loading referral info\u2026';
    card.appendChild(loadingEl);

    container.appendChild(card);

    // Fetch referral info
    fetch('/api/referral/info', {
        headers: { 'Authorization': 'Bearer ' + token }
    })
    .then(function(res) { return res.json(); })
    .then(function(data) {
        // Remove loading
        card.removeChild(loadingEl);

        if (data.error) {
            var errEl = document.createElement('div');
            errEl.className = 'ref-error';
            errEl.textContent = data.error || 'Unable to load referral info.';
            card.appendChild(errEl);
            return;
        }

        // ── Referral code block ──
        var codeBlock = document.createElement('div');
        codeBlock.className = 'ref-code-block';

        var codeText = document.createElement('span');
        codeText.className = 'ref-code-text';
        codeText.textContent = data.code || '------';

        var copyCodeBtn = document.createElement('button');
        copyCodeBtn.className = 'ref-copy-btn';
        copyCodeBtn.textContent = 'Copy Code';

        copyCodeBtn.addEventListener('click', function() {
            var codeVal = codeText.textContent;
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(codeVal).then(function() {
                    copyCodeBtn.textContent = 'Copied!';
                    setTimeout(function() { copyCodeBtn.textContent = 'Copy Code'; }, 2000);
                });
            } else {
                var ta = document.createElement('textarea');
                ta.value = codeVal;
                ta.style.position = 'fixed';
                ta.style.opacity = '0';
                document.body.appendChild(ta);
                ta.select();
                try { document.execCommand('copy'); } catch (e) { /* ignore */ }
                document.body.removeChild(ta);
                copyCodeBtn.textContent = 'Copied!';
                setTimeout(function() { copyCodeBtn.textContent = 'Copy Code'; }, 2000);
            }
        });

        codeBlock.appendChild(codeText);
        codeBlock.appendChild(copyCodeBtn);
        card.appendChild(codeBlock);

        // ── Copy Link button ──
        var linkBtn = document.createElement('button');
        linkBtn.className = 'ref-link-btn';
        linkBtn.textContent = '\uD83D\uDD17 Copy Referral Link';

        linkBtn.addEventListener('click', function() {
            var urlVal = data.referralUrl || window.location.origin;
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(urlVal).then(function() {
                    linkBtn.textContent = '\u2713 Link Copied!';
                    setTimeout(function() { linkBtn.textContent = '\uD83D\uDD17 Copy Referral Link'; }, 2500);
                });
            } else {
                var ta2 = document.createElement('textarea');
                ta2.value = urlVal;
                ta2.style.position = 'fixed';
                ta2.style.opacity = '0';
                document.body.appendChild(ta2);
                ta2.select();
                try { document.execCommand('copy'); } catch (e) { /* ignore */ }
                document.body.removeChild(ta2);
                linkBtn.textContent = '\u2713 Link Copied!';
                setTimeout(function() { linkBtn.textContent = '\uD83D\uDD17 Copy Referral Link'; }, 2500);
            }
        });

        card.appendChild(linkBtn);

        // ── Stats row ──
        var statsRow = document.createElement('div');
        statsRow.className = 'ref-stats-row';

        var statTotal = document.createElement('div');
        statTotal.className = 'ref-stat';
        var statTotalVal = document.createElement('div');
        statTotalVal.className = 'ref-stat-val';
        statTotalVal.textContent = String(typeof data.totalReferrals === 'number' ? data.totalReferrals : 0);
        var statTotalLbl = document.createElement('div');
        statTotalLbl.className = 'ref-stat-lbl';
        statTotalLbl.textContent = 'Total';
        statTotal.appendChild(statTotalVal);
        statTotal.appendChild(statTotalLbl);

        var statPending = document.createElement('div');
        statPending.className = 'ref-stat';
        var statPendingVal = document.createElement('div');
        statPendingVal.className = 'ref-stat-val';
        statPendingVal.textContent = String(typeof data.pendingReferrals === 'number' ? data.pendingReferrals : 0);
        var statPendingLbl = document.createElement('div');
        statPendingLbl.className = 'ref-stat-lbl';
        statPendingLbl.textContent = 'Pending';
        statPending.appendChild(statPendingVal);
        statPending.appendChild(statPendingLbl);

        var statEarned = document.createElement('div');
        statEarned.className = 'ref-stat';
        var statEarnedVal = document.createElement('div');
        statEarnedVal.className = 'ref-stat-val';
        var earnedAmt = typeof data.totalEarned === 'number' ? data.totalEarned : 0;
        statEarnedVal.textContent = '$' + earnedAmt.toFixed(2);
        var statEarnedLbl = document.createElement('div');
        statEarnedLbl.className = 'ref-stat-lbl';
        statEarnedLbl.textContent = 'Earned';
        statEarned.appendChild(statEarnedVal);
        statEarned.appendChild(statEarnedLbl);

        statsRow.appendChild(statTotal);
        statsRow.appendChild(statPending);
        statsRow.appendChild(statEarned);
        card.appendChild(statsRow);

        // ── Apply code section ──
        var hr = document.createElement('hr');
        hr.className = 'ref-divider';
        card.appendChild(hr);

        var applyTitle = document.createElement('div');
        applyTitle.className = 'ref-apply-title';
        applyTitle.textContent = 'Have a friend\'s referral code?';
        card.appendChild(applyTitle);

        var applyRow = document.createElement('div');
        applyRow.className = 'ref-apply-row';

        var applyInput = document.createElement('input');
        applyInput.type = 'text';
        applyInput.className = 'ref-apply-input';
        applyInput.placeholder = 'Enter code';
        applyInput.maxLength = 32;

        var applyBtn = document.createElement('button');
        applyBtn.className = 'ref-apply-btn';
        applyBtn.textContent = 'Apply';

        applyRow.appendChild(applyInput);
        applyRow.appendChild(applyBtn);
        card.appendChild(applyRow);

        var applyMsg = document.createElement('div');
        applyMsg.className = 'ref-apply-msg';
        card.appendChild(applyMsg);

        applyBtn.addEventListener('click', function() {
            var codeInput = applyInput.value.trim();
            if (!codeInput) return;

            applyBtn.disabled = true;
            applyMsg.style.color = '#94a3b8';
            applyMsg.textContent = 'Applying\u2026';

            fetch('/api/referral/apply', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                },
                body: JSON.stringify({ code: codeInput })
            })
            .then(function(res) { return res.json(); })
            .then(function(resp) {
                if (resp.success) {
                    applyMsg.style.color = '#4ade80';
                    applyMsg.textContent = '';
                    var okSpan = document.createElement('span');
                    okSpan.textContent = resp.message || 'Referral code applied!';
                    applyMsg.appendChild(okSpan);
                    applyInput.value = '';
                    applyBtn.disabled = true;
                } else {
                    applyMsg.style.color = '#f87171';
                    applyMsg.textContent = '';
                    var errSpan = document.createElement('span');
                    errSpan.textContent = resp.message || 'Could not apply code.';
                    applyMsg.appendChild(errSpan);
                    applyBtn.disabled = false;
                }
            })
            .catch(function(err) {
                console.error('[ReferralCard] apply error', err);
                applyMsg.style.color = '#f87171';
                applyMsg.textContent = '';
                var netSpan = document.createElement('span');
                netSpan.textContent = 'Network error. Please try again.';
                applyMsg.appendChild(netSpan);
                applyBtn.disabled = false;
            });
        });
    })
    .catch(function(err) {
        console.error('[ReferralCard] fetch error', err);
        card.removeChild(loadingEl);
        var errEl = document.createElement('div');
        errEl.className = 'ref-error';
        errEl.textContent = 'Failed to load referral info.';
        card.appendChild(errEl);
    });
}

/* ───────────────────────────────────────────────────
 *  Crash Mini-Game Card
 * ─────────────────────────────────────────────────── */
function renderCrashGameCard(container) {
    if (document.getElementById('crashGameCard')) return;

    // --- inject CSS (once) ---
    if (!document.getElementById('crash-game-css')) {
        var s = document.createElement('style');
        s.id = 'crash-game-css';
        s.textContent = [
            '.crash-card{background:linear-gradient(135deg,#1a1a2e,#16213e);border:1px solid #0f3460;border-radius:12px;padding:16px;margin-bottom:12px;font-family:inherit;color:#e0e0e0;}',
            '.crash-title{font-size:16px;font-weight:700;margin-bottom:10px;color:#ffd700;}',
            '.crash-bet-row{display:flex;gap:8px;align-items:center;margin-bottom:10px;}',
            '.crash-bet-input{flex:1;padding:6px 10px;border-radius:6px;border:1px solid #334;background:#0d1117;color:#e0e0e0;font-size:14px;outline:none;}',
            '.crash-bet-input:focus{border-color:#ffd700;}',
            '.crash-btn{padding:8px 16px;border:none;border-radius:6px;font-weight:700;font-size:14px;cursor:pointer;transition:opacity 0.15s;}',
            '.crash-btn:disabled{opacity:0.4;cursor:not-allowed;}',
            '.crash-btn-start{background:#22c55e;color:#000;}',
            '.crash-btn-cashout{background:#ef4444;color:#fff;}',
            '.crash-mult-display{text-align:center;font-size:32px;font-weight:900;margin:14px 0;color:#4ade80;min-height:44px;line-height:44px;letter-spacing:1px;text-shadow:0 0 12px rgba(74,222,128,0.5);}',
            '.crash-mult-display.crashed{color:#ef4444;text-shadow:0 0 12px rgba(239,68,68,0.5);}',
            '.crash-mult-display.cashed{color:#fbbf24;text-shadow:0 0 12px rgba(251,191,36,0.5);}',
            '.crash-result{text-align:center;font-size:13px;margin-top:8px;min-height:18px;}'
        ].join('\n');
        document.head.appendChild(s);
    }

    // --- build card DOM ---
    var card = document.createElement('div');
    card.id = 'crashGameCard';
    card.className = 'crash-card';

    var title = document.createElement('div');
    title.className = 'crash-title';
    title.textContent = '\uD83D\uDE80 Crash';
    card.appendChild(title);

    // bet row
    var betRow = document.createElement('div');
    betRow.className = 'crash-bet-row';

    var betLabel = document.createElement('span');
    betLabel.textContent = 'Bet $';
    betRow.appendChild(betLabel);

    var betInput = document.createElement('input');
    betInput.type = 'number';
    betInput.className = 'crash-bet-input';
    betInput.min = '0.25';
    betInput.step = '0.25';
    betInput.value = '1.00';
    betRow.appendChild(betInput);

    var startBtn = document.createElement('button');
    startBtn.className = 'crash-btn crash-btn-start';
    startBtn.textContent = 'START';
    betRow.appendChild(startBtn);

    card.appendChild(betRow);

    // multiplier display
    var multDisplay = document.createElement('div');
    multDisplay.className = 'crash-mult-display';
    multDisplay.textContent = '1.00x';
    card.appendChild(multDisplay);

    // cashout button row
    var cashoutRow = document.createElement('div');
    cashoutRow.style.textAlign = 'center';
    cashoutRow.style.display = 'none';

    var cashoutBtn = document.createElement('button');
    cashoutBtn.className = 'crash-btn crash-btn-cashout';
    cashoutBtn.textContent = 'CASH OUT';
    cashoutRow.appendChild(cashoutBtn);

    card.appendChild(cashoutRow);

    // result area
    var resultArea = document.createElement('div');
    resultArea.className = 'crash-result';
    card.appendChild(resultArea);

    container.appendChild(card);

    // --- game state ---
    var gameId = null;
    var currentMult = 1.00;
    var animInterval = null;
    var gameActive = false;
    var startTime = 0;
    var cashedOut = false;

    function resetUI() {
        gameId = null;
        currentMult = 1.00;
        gameActive = false;
        cashedOut = false;
        startTime = 0;
        if (animInterval) { clearInterval(animInterval); animInterval = null; }
        multDisplay.textContent = '1.00x';
        multDisplay.className = 'crash-mult-display';
        cashoutRow.style.display = 'none';
        startBtn.disabled = false;
        betInput.disabled = false;
    }

    function setResult(text, color) {
        resultArea.textContent = '';
        var sp = document.createElement('span');
        sp.style.color = color || '#e0e0e0';
        sp.textContent = text;
        resultArea.appendChild(sp);
    }

    // --- START ---
    startBtn.addEventListener('click', function() {
        if (gameActive) return;
        if (typeof isServerAuthToken !== 'function' || !isServerAuthToken()) {
            setResult('Login required to play.', '#f87171');
            return;
        }
        var token = localStorage.getItem(typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken');
        if (!token) { setResult('Login required.', '#f87171'); return; }

        var betVal = parseFloat(betInput.value);
        if (!betVal || betVal < 0.25) { setResult('Min bet $0.25', '#f87171'); return; }

        startBtn.disabled = true;
        betInput.disabled = true;
        setResult('', '');

        fetch('/api/crash/bet', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify({ bet: betVal })
        })
        .then(function(r) { return r.json(); })
        .then(function(data) {
            if (data.error) {
                setResult(data.error, '#f87171');
                startBtn.disabled = false;
                betInput.disabled = false;
                return;
            }
            gameId = data.gameId;
            gameActive = true;
            cashedOut = false;
            currentMult = 1.00;
            startTime = Date.now();
            cashoutRow.style.display = 'block';
            multDisplay.className = 'crash-mult-display';

            // animate multiplier climbing
            animInterval = setInterval(function() {
                if (!gameActive) return;
                var elapsed = (Date.now() - startTime) / 1000; // seconds
                // acceleration: start slow, speed up
                var increment = 0.01 + (elapsed * 0.002);
                currentMult += increment;
                multDisplay.textContent = currentMult.toFixed(2) + 'x';

                // auto-reveal after 30 seconds or mult >= 10x
                if (elapsed >= 30 || currentMult >= 10) {
                    revealCrash();
                }
            }, 100);
        })
        .catch(function(err) {
            console.error('[CrashCard] bet error', err);
            setResult('Network error.', '#f87171');
            startBtn.disabled = false;
            betInput.disabled = false;
        });
    });

    // --- CASH OUT ---
    cashoutBtn.addEventListener('click', function() {
        if (!gameActive || cashedOut || !gameId) return;
        var token = localStorage.getItem(typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken');
        if (!token) return;

        cashedOut = true;
        cashoutBtn.disabled = true;
        var cashMult = currentMult;

        fetch('/api/crash/cashout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify({ gameId: gameId, mult: cashMult })
        })
        .then(function(r) { return r.json(); })
        .then(function(data) {
            gameActive = false;
            if (animInterval) { clearInterval(animInterval); animInterval = null; }
            cashoutRow.style.display = 'none';

            if (data.error) {
                // already crashed
                multDisplay.className = 'crash-mult-display crashed';
                multDisplay.textContent = '\uD83D\uDCA5 CRASHED!';
                setResult('Too late! The game already crashed.', '#ef4444');
            } else {
                multDisplay.className = 'crash-mult-display cashed';
                multDisplay.textContent = cashMult.toFixed(2) + 'x';
                var profitText = '+$' + (data.profit != null ? parseFloat(data.profit).toFixed(2) : parseFloat(data.payout).toFixed(2));
                setResult('Cashed out! ' + profitText, '#4ade80');
                if (typeof updateBalanceDisplay === 'function' && data.newBalance != null) {
                    updateBalanceDisplay(data.newBalance);
                }
            }
            setTimeout(resetUI, 3000);
        })
        .catch(function(err) {
            console.error('[CrashCard] cashout error', err);
            setResult('Network error on cashout.', '#f87171');
            gameActive = false;
            if (animInterval) { clearInterval(animInterval); animInterval = null; }
            setTimeout(resetUI, 3000);
        });
    });

    // --- REVEAL CRASH (auto, when time/mult limit hit) ---
    function revealCrash() {
        if (!gameActive || cashedOut || !gameId) return;
        gameActive = false;
        if (animInterval) { clearInterval(animInterval); animInterval = null; }

        var token = localStorage.getItem(typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken');
        if (!token) { resetUI(); return; }

        fetch('/api/crash/result', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify({ gameId: gameId })
        })
        .then(function(r) { return r.json(); })
        .then(function(data) {
            cashoutRow.style.display = 'none';
            var crashAt = data.crashAt || currentMult;
            multDisplay.className = 'crash-mult-display crashed';
            multDisplay.textContent = '\uD83D\uDCA5 ' + parseFloat(crashAt).toFixed(2) + 'x';
            setResult('Crashed at ' + parseFloat(crashAt).toFixed(2) + 'x! You didn\'t cash out.', '#ef4444');
            setTimeout(resetUI, 3000);
        })
        .catch(function(err) {
            console.error('[CrashCard] result error', err);
            cashoutRow.style.display = 'none';
            multDisplay.className = 'crash-mult-display crashed';
            multDisplay.textContent = '\uD83D\uDCA5 CRASHED!';
            setResult('Game ended.', '#ef4444');
            setTimeout(resetUI, 3000);
        });
    }
}

// ─────────────────────────────────────────────────────────────────────
// PLINKO CARD
// ─────────────────────────────────────────────────────────────────────

function renderPlinkoCard(container) {
    // Auth guard
    if (typeof isServerAuthToken !== 'function' || !isServerAuthToken()) return;
    var token = localStorage.getItem(typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken');
    if (!token) return;
    if (document.getElementById('plinkoCard')) return;

    var MULT_TABLES = {
        low:    [5.6, 2.1, 1.1, 1.0, 0.5, 0.3, 0.2, 0.2, 0.2, 0.2, 0.2, 0.3, 0.5, 1.0, 1.1, 2.1, 5.6],
        medium: [110, 41, 10, 5, 3, 1.5, 1, 0.5, 0.3, 0.5, 1, 1.5, 3, 5, 10, 41, 110],
        high:   [1000, 130, 26, 9, 4, 2, 0.2, 0.2, 0.2, 0.2, 0.2, 2, 4, 9, 26, 130, 1000]
    };

    var selectedRisk = 'medium';

    // Inject CSS once
    if (!document.getElementById('plinko-card-css')) {
        var style = document.createElement('style');
        style.id = 'plinko-card-css';
        style.textContent = [
            '#plinkoCard { background: linear-gradient(135deg, #0c1a2e, #162040); border: 1px solid #3a4a7a; border-radius: 12px; padding: 16px; margin-bottom: 14px; color: #fff; }',
            '#plinkoCard .pk-title { color: #fbbf24; margin: 0 0 6px 0; font-size: 15px; font-weight: 800; }',
            '#plinkoCard .pk-desc { color: #aaa; font-size: 12px; margin: 0 0 12px 0; }',
            '.pk-bet-row { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; font-size: 13px; color: #ccc; }',
            '.pk-bet-input { background: #1a1f2e; border: 1px solid #4a4a7a; color: #fff; padding: 6px 10px; border-radius: 6px; width: 80px; font-size: 13px; }',
            '.pk-risk-row { display: flex; gap: 6px; margin-bottom: 10px; }',
            '.pk-risk-btn { flex: 1; padding: 7px 0; border: 1.5px solid #4a4a7a; border-radius: 6px; background: transparent; color: #aaa; font-size: 12px; font-weight: 700; cursor: pointer; transition: all 0.2s; text-align: center; }',
            '.pk-risk-btn.active-low { border-color: #22c55e; color: #22c55e; background: rgba(34,197,94,0.12); }',
            '.pk-risk-btn.active-medium { border-color: #f59e0b; color: #f59e0b; background: rgba(245,158,11,0.12); }',
            '.pk-risk-btn.active-high { border-color: #ef4444; color: #ef4444; background: rgba(239,68,68,0.12); }',
            '.pk-drop-btn { width: 100%; padding: 10px; border: none; border-radius: 8px; background: linear-gradient(135deg, #7c3aed, #a855f7); color: #fff; font-weight: 700; font-size: 14px; cursor: pointer; transition: opacity 0.2s; margin-bottom: 10px; }',
            '.pk-drop-btn:disabled { opacity: 0.5; cursor: not-allowed; }',
            '.pk-buckets { display: flex; gap: 2px; justify-content: center; margin-bottom: 10px; flex-wrap: nowrap; }',
            '.pk-bucket { flex: 1; min-width: 0; text-align: center; padding: 4px 0; border-radius: 4px; font-size: 9px; font-weight: 700; transition: all 0.3s; background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.5); line-height: 1.2; }',
            '.pk-bucket.pk-gold { background: rgba(251,191,36,0.15); color: #fbbf24; }',
            '.pk-bucket.pk-green { background: rgba(34,197,94,0.15); color: #4ade80; }',
            '.pk-bucket.pk-neutral { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.6); }',
            '.pk-bucket.pk-dim { background: rgba(255,255,255,0.04); color: rgba(255,255,255,0.35); }',
            '.pk-bucket.pk-hit { transform: scale(1.15); box-shadow: 0 0 12px rgba(251,191,36,0.6); z-index: 2; }',
            '.pk-bucket.pk-hit-win { background: rgba(34,197,94,0.5) !important; color: #fff !important; }',
            '.pk-bucket.pk-hit-loss { background: rgba(239,68,68,0.5) !important; color: #fff !important; }',
            '.pk-result { text-align: center; font-size: 13px; font-weight: 600; min-height: 20px; margin-top: 4px; }'
        ].join('\n');
        document.head.appendChild(style);
    }

    // Card root
    var card = document.createElement('div');
    card.id = 'plinkoCard';

    // Title
    var titleEl = document.createElement('h4');
    titleEl.className = 'pk-title';
    titleEl.textContent = '\uD83D\uDCCD Plinko';
    card.appendChild(titleEl);

    // Description
    var descEl = document.createElement('p');
    descEl.className = 'pk-desc';
    descEl.textContent = 'Drop the ball and hit a multiplier! Choose your risk level.';
    card.appendChild(descEl);

    // Bet row
    var betRow = document.createElement('div');
    betRow.className = 'pk-bet-row';

    var betLabel = document.createElement('label');
    betLabel.textContent = 'Bet: $';

    var betInput = document.createElement('input');
    betInput.type = 'number';
    betInput.min = '0.25';
    betInput.max = '1000';
    betInput.step = '0.25';
    betInput.value = '1.00';
    betInput.id = 'pkBetInput';
    betInput.className = 'pk-bet-input';

    betRow.appendChild(betLabel);
    betRow.appendChild(betInput);
    card.appendChild(betRow);

    // Risk selector row
    var riskRow = document.createElement('div');
    riskRow.className = 'pk-risk-row';

    var risks = ['low', 'medium', 'high'];
    var riskLabels = { low: 'Low', medium: 'Medium', high: 'High' };
    var riskBtns = {};

    risks.forEach(function(r) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'pk-risk-btn' + (r === selectedRisk ? ' active-' + r : '');
        btn.textContent = riskLabels[r];
        btn.setAttribute('data-risk', r);
        btn.addEventListener('click', function() {
            selectedRisk = r;
            risks.forEach(function(r2) {
                riskBtns[r2].className = 'pk-risk-btn' + (r2 === selectedRisk ? ' active-' + r2 : '');
            });
            renderBuckets();
        });
        riskBtns[r] = btn;
        riskRow.appendChild(btn);
    });
    card.appendChild(riskRow);

    // Drop button
    var dropBtn = document.createElement('button');
    dropBtn.type = 'button';
    dropBtn.className = 'pk-drop-btn';
    dropBtn.textContent = 'DROP';
    card.appendChild(dropBtn);

    // Buckets row
    var bucketsRow = document.createElement('div');
    bucketsRow.className = 'pk-buckets';
    card.appendChild(bucketsRow);

    // Result text
    var resultEl = document.createElement('div');
    resultEl.className = 'pk-result';
    card.appendChild(resultEl);

    container.appendChild(card);

    // --- helpers ---

    function getBucketClass(mult) {
        if (mult >= 10) return 'pk-gold';
        if (mult >= 2) return 'pk-green';
        if (mult >= 1) return 'pk-neutral';
        return 'pk-dim';
    }

    function renderBuckets(highlightIdx, isWin) {
        // clear
        while (bucketsRow.firstChild) bucketsRow.removeChild(bucketsRow.firstChild);

        var mults = MULT_TABLES[selectedRisk];
        mults.forEach(function(m, i) {
            var b = document.createElement('div');
            b.className = 'pk-bucket ' + getBucketClass(m);
            if (i === highlightIdx) {
                b.classList.add('pk-hit');
                b.classList.add(isWin ? 'pk-hit-win' : 'pk-hit-loss');
            }
            // Format multiplier label
            var label;
            if (m >= 100) {
                label = m + 'x';
            } else if (m >= 10) {
                label = m + 'x';
            } else {
                label = m + 'x';
            }
            b.textContent = label;
            bucketsRow.appendChild(b);
        });
    }

    // Initial render
    renderBuckets();

    // --- drop logic ---
    var dropping = false;

    dropBtn.addEventListener('click', function() {
        if (dropping) return;
        var bet = parseFloat(betInput.value);
        if (isNaN(bet) || bet < 0.25) {
            resultEl.textContent = 'Min bet is $0.25';
            resultEl.style.color = '#f87171';
            return;
        }

        dropping = true;
        dropBtn.disabled = true;
        dropBtn.textContent = 'DROPPING...';
        resultEl.textContent = '';
        resultEl.style.color = '';

        // Re-fetch token in case session refreshed
        var freshToken = localStorage.getItem(typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken');
        if (!freshToken) {
            dropping = false;
            dropBtn.disabled = false;
            dropBtn.textContent = 'DROP';
            resultEl.textContent = 'Not logged in.';
            resultEl.style.color = '#f87171';
            return;
        }

        fetch('/api/plinko/play', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + freshToken,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ bet: bet, risk: selectedRisk })
        })
        .then(function(res) { return res.json(); })
        .then(function(data) {
            if (data.error) {
                resultEl.textContent = data.error;
                resultEl.style.color = '#f87171';
                dropping = false;
                dropBtn.disabled = false;
                dropBtn.textContent = 'DROP';
                return;
            }

            var bucket = data.bucket;
            var multiplier = data.multiplier;
            var payout = data.payout;
            var path = data.path || [];
            var isWin = multiplier >= 1;

            // Animate: flash through path positions, then show final bucket
            var animStep = 0;
            var animInterval = setInterval(function() {
                if (animStep >= path.length) {
                    clearInterval(animInterval);
                    // Show final result
                    renderBuckets(bucket, isWin);

                    if (isWin) {
                        resultEl.style.color = '#4ade80';
                        resultEl.textContent = 'Ball landed on ' + multiplier + 'x! Won $' + parseFloat(payout).toFixed(2);
                    } else {
                        var lostAmt = bet - payout;
                        resultEl.style.color = '#f87171';
                        resultEl.textContent = 'Ball landed on ' + multiplier + 'x \u2014 lost $' + lostAmt.toFixed(2);
                    }

                    // Update balance
                    if (data.newBalance !== undefined && typeof updateBalanceDisplay === 'function') {
                        updateBalanceDisplay(data.newBalance);
                    }

                    dropping = false;
                    dropBtn.disabled = false;
                    dropBtn.textContent = 'DROP';
                    return;
                }

                // Flash: calculate intermediate bucket position from path so far
                var pos = 0;
                for (var p = 0; p <= animStep; p++) {
                    pos += (path[p] === 1) ? 1 : 0;
                }
                // Map partial path position to approximate bucket index (scale to 0-16)
                var approxBucket = Math.round((pos / (animStep + 1)) * 16);
                renderBuckets(approxBucket, true);
                animStep++;
            }, 50);
        })
        .catch(function(err) {
            console.error('[PlinkoCard] error', err);
            resultEl.textContent = 'Connection error. Try again.';
            resultEl.style.color = '#f87171';
            dropping = false;
            dropBtn.disabled = false;
            dropBtn.textContent = 'DROP';
        });
    });
}

// ─────────────────────────────────────────────────────────────────────
// SCRATCH CARD GAME (Tiered Buy/Reveal)
// ─────────────────────────────────────────────────────────────────────

(function _injectScratchGameStyles() {
    if (document.getElementById('scratchGameStyles')) return;
    var s = document.createElement('style');
    s.id = 'scratchGameStyles';
    s.textContent = [
        '.scratch-game-widget {',
        '  background: linear-gradient(135deg,#1a0a2e,#2a1040);',
        '  border: 1.5px solid rgba(168,85,247,0.5);',
        '  border-radius: 14px;',
        '  padding: 16px;',
        '  margin-bottom: 14px;',
        '  box-shadow: 0 4px 20px rgba(0,0,0,0.45);',
        '}',
        '.scratch-game-widget .sg-title {',
        '  font-size: 15px;',
        '  font-weight: 800;',
        '  background: linear-gradient(135deg,#c084fc,#e879f9);',
        '  -webkit-background-clip: text;',
        '  -webkit-text-fill-color: transparent;',
        '  background-clip: text;',
        '  margin-bottom: 12px;',
        '  text-align: center;',
        '}',
        '.scratch-game-widget .sg-tier-row {',
        '  display: flex;',
        '  gap: 6px;',
        '  justify-content: center;',
        '  margin-bottom: 10px;',
        '}',
        '.scratch-game-widget .sg-tier-btn {',
        '  flex: 1;',
        '  padding: 6px 0;',
        '  border-radius: 8px;',
        '  border: 1.5px solid rgba(168,85,247,0.4);',
        '  background: rgba(255,255,255,0.05);',
        '  color: #e2e8f0;',
        '  font-size: 12px;',
        '  font-weight: 700;',
        '  cursor: pointer;',
        '  transition: background 0.15s, border-color 0.15s;',
        '  text-align: center;',
        '}',
        '.scratch-game-widget .sg-tier-btn:hover {',
        '  background: rgba(168,85,247,0.15);',
        '}',
        '.scratch-game-widget .sg-tier-btn.selected {',
        '  background: rgba(168,85,247,0.3);',
        '  border-color: #a855f7;',
        '  color: #e9d5ff;',
        '}',
        '.scratch-game-widget .sg-buy-btn,',
        '.scratch-game-widget .sg-reveal-btn,',
        '.scratch-game-widget .sg-again-btn {',
        '  display: block;',
        '  width: 100%;',
        '  padding: 8px 0;',
        '  border-radius: 8px;',
        '  border: none;',
        '  font-size: 13px;',
        '  font-weight: 800;',
        '  letter-spacing: 1px;',
        '  cursor: pointer;',
        '  margin-bottom: 10px;',
        '  transition: opacity 0.15s;',
        '}',
        '.scratch-game-widget .sg-buy-btn {',
        '  background: linear-gradient(135deg,#7c3aed,#a855f7);',
        '  color: #fff;',
        '}',
        '.scratch-game-widget .sg-reveal-btn {',
        '  background: linear-gradient(135deg,#d946ef,#f472b6);',
        '  color: #fff;',
        '}',
        '.scratch-game-widget .sg-again-btn {',
        '  background: linear-gradient(135deg,#6d28d9,#7c3aed);',
        '  color: #e9d5ff;',
        '}',
        '.scratch-game-widget .sg-buy-btn:disabled,',
        '.scratch-game-widget .sg-reveal-btn:disabled,',
        '.scratch-game-widget .sg-again-btn:disabled {',
        '  opacity: 0.45;',
        '  cursor: not-allowed;',
        '}',
        '.scratch-game-widget .sg-grid {',
        '  display: grid;',
        '  grid-template-columns: repeat(3, 52px);',
        '  gap: 6px;',
        '  justify-content: center;',
        '  margin-bottom: 10px;',
        '}',
        '.scratch-game-widget .sg-cell {',
        '  width: 52px;',
        '  height: 52px;',
        '  border-radius: 8px;',
        '  display: flex;',
        '  align-items: center;',
        '  justify-content: center;',
        '  font-size: 13px;',
        '  font-weight: 700;',
        '  line-height: 1;',
        '  user-select: none;',
        '  transition: transform 0.25s, background 0.25s;',
        '}',
        '.scratch-game-widget .sg-cell.covered {',
        '  background: rgba(168,85,247,0.2);',
        '  border: 1.5px solid rgba(168,85,247,0.5);',
        '  color: rgba(255,255,255,0.4);',
        '  font-size: 20px;',
        '}',
        '.scratch-game-widget .sg-cell.revealed {',
        '  background: rgba(168,85,247,0.12);',
        '  border: 1.5px solid rgba(168,85,247,0.35);',
        '  color: #e9d5ff;',
        '  transform: scale(1.08);',
        '}',
        '.scratch-game-widget .sg-result {',
        '  text-align: center;',
        '  font-size: 13px;',
        '  font-weight: 700;',
        '  min-height: 20px;',
        '  margin-top: 4px;',
        '}'
    ].join('\n');
    document.head.appendChild(s);
})();

function renderScratchCardGame(container) {
    if (!container) return;
    if (document.getElementById('scratchCardGame')) return;

    if (typeof isServerAuthToken !== 'function' || !isServerAuthToken()) return;
    var token = localStorage.getItem(typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken');
    if (!token) return;

    var selectedTier = 1;
    var currentGameId = null;
    var busy = false;

    // --- Build card shell ---
    var card = document.createElement('div');
    card.id = 'scratchCardGame';
    card.className = 'promo-card scratch-game-widget';

    var titleEl = document.createElement('div');
    titleEl.className = 'sg-title';
    titleEl.textContent = '\uD83C\uDFAB Scratch Cards';
    card.appendChild(titleEl);

    // --- Tier selector row ---
    var tierRow = document.createElement('div');
    tierRow.className = 'sg-tier-row';
    var tiers = [
        { tier: 1, label: '$1' },
        { tier: 2, label: '$5' },
        { tier: 3, label: '$20' }
    ];
    var tierBtns = [];
    tiers.forEach(function(t) {
        var btn = document.createElement('button');
        btn.className = 'sg-tier-btn' + (t.tier === selectedTier ? ' selected' : '');
        btn.textContent = t.label;
        btn.addEventListener('click', function() {
            if (busy || currentGameId) return;
            selectedTier = t.tier;
            tierBtns.forEach(function(b) { b.className = 'sg-tier-btn'; });
            btn.className = 'sg-tier-btn selected';
        });
        tierRow.appendChild(btn);
        tierBtns.push(btn);
    });
    card.appendChild(tierRow);

    // --- Buy button ---
    var buyBtn = document.createElement('button');
    buyBtn.className = 'sg-buy-btn';
    buyBtn.textContent = 'BUY CARD';
    card.appendChild(buyBtn);

    // --- 3x3 grid ---
    var grid = document.createElement('div');
    grid.className = 'sg-grid';
    var cells = [];
    for (var i = 0; i < 9; i++) {
        var cell = document.createElement('div');
        cell.className = 'sg-cell covered';
        cell.textContent = '?';
        grid.appendChild(cell);
        cells.push(cell);
    }
    card.appendChild(grid);

    // --- Reveal button (hidden initially) ---
    var revealBtn = document.createElement('button');
    revealBtn.className = 'sg-reveal-btn';
    revealBtn.textContent = 'REVEAL ALL';
    revealBtn.style.display = 'none';
    card.appendChild(revealBtn);

    // --- Again button (hidden initially) ---
    var againBtn = document.createElement('button');
    againBtn.className = 'sg-again-btn';
    againBtn.textContent = 'Buy Another';
    againBtn.style.display = 'none';
    card.appendChild(againBtn);

    // --- Result text ---
    var resultEl = document.createElement('div');
    resultEl.className = 'sg-result';
    card.appendChild(resultEl);

    container.appendChild(card);

    // --- Reset grid to covered state ---
    function resetGrid() {
        for (var c = 0; c < 9; c++) {
            cells[c].className = 'sg-cell covered';
            cells[c].textContent = '?';
        }
        resultEl.textContent = '';
        resultEl.style.color = '';
        revealBtn.style.display = 'none';
        againBtn.style.display = 'none';
        buyBtn.style.display = 'block';
        buyBtn.disabled = false;
        buyBtn.textContent = 'BUY CARD';
        currentGameId = null;
        busy = false;
        // Re-enable tier buttons
        tierBtns.forEach(function(b) { b.style.opacity = '1'; b.style.pointerEvents = ''; });
    }

    // --- BUY handler ---
    buyBtn.addEventListener('click', function() {
        if (busy || currentGameId) return;
        busy = true;
        buyBtn.disabled = true;
        buyBtn.textContent = 'BUYING\u2026';
        // Disable tier changes during purchase
        tierBtns.forEach(function(b) { b.style.opacity = '0.5'; b.style.pointerEvents = 'none'; });

        fetch('/api/scratch/buy', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ tier: selectedTier })
        })
        .then(function(res) { return res.json(); })
        .then(function(data) {
            if (data.error) {
                resultEl.textContent = data.error || 'Purchase failed.';
                resultEl.style.color = '#f87171';
                busy = false;
                buyBtn.disabled = false;
                buyBtn.textContent = 'BUY CARD';
                tierBtns.forEach(function(b) { b.style.opacity = '1'; b.style.pointerEvents = ''; });
                return;
            }
            currentGameId = data.gameId;
            buyBtn.style.display = 'none';
            revealBtn.style.display = 'block';
            resultEl.textContent = '';
            resultEl.style.color = '';
            busy = false;
        })
        .catch(function() {
            resultEl.textContent = 'Connection error. Try again.';
            resultEl.style.color = '#f87171';
            busy = false;
            buyBtn.disabled = false;
            buyBtn.textContent = 'BUY CARD';
            tierBtns.forEach(function(b) { b.style.opacity = '1'; b.style.pointerEvents = ''; });
        });
    });

    // --- REVEAL handler ---
    revealBtn.addEventListener('click', function() {
        if (busy || !currentGameId) return;
        busy = true;
        revealBtn.disabled = true;
        revealBtn.textContent = 'REVEALING\u2026';

        fetch('/api/scratch/reveal', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ gameId: currentGameId })
        })
        .then(function(res) { return res.json(); })
        .then(function(data) {
            if (data.error) {
                resultEl.textContent = data.error || 'Reveal failed.';
                resultEl.style.color = '#f87171';
                busy = false;
                revealBtn.disabled = false;
                revealBtn.textContent = 'REVEAL ALL';
                return;
            }

            var cellSymbols = data.cells || [];
            var prize = data.prize || 0;

            // Staggered reveal animation
            revealBtn.style.display = 'none';
            var revealIndex = 0;
            var revealInterval = setInterval(function() {
                if (revealIndex >= 9) {
                    clearInterval(revealInterval);
                    // Show result
                    if (prize > 0) {
                        resultEl.textContent = '\uD83C\uDF89 Won $' + prize.toFixed(2) + '!';
                        resultEl.style.color = '#a78bfa';
                    } else {
                        resultEl.textContent = 'No luck this time';
                        resultEl.style.color = 'rgba(255,255,255,0.45)';
                    }
                    // Update balance
                    if (typeof data.newBalance === 'number') {
                        if (typeof updateBalanceDisplay === 'function') {
                            updateBalanceDisplay(data.newBalance);
                        }
                    }
                    // Show "Buy Another"
                    againBtn.style.display = 'block';
                    busy = false;
                    return;
                }
                var sym = cellSymbols[revealIndex] || '?';
                cells[revealIndex].className = 'sg-cell revealed';
                cells[revealIndex].textContent = sym;
                revealIndex++;
            }, 100);
        })
        .catch(function() {
            resultEl.textContent = 'Connection error. Try again.';
            resultEl.style.color = '#f87171';
            busy = false;
            revealBtn.disabled = false;
            revealBtn.textContent = 'REVEAL ALL';
        });
    });

    // --- BUY ANOTHER handler ---
    againBtn.addEventListener('click', function() {
        resetGrid();
    });
}

// ─────────────────────────────────────────────────────────────────────
// BACCARAT CARD WIDGET
// ─────────────────────────────────────────────────────────────────────

function renderBaccaratCard(container) {
    // Auth guard
    if (typeof isServerAuthToken !== 'function' || !isServerAuthToken()) return;
    var token = localStorage.getItem(typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken');
    if (!token) return;
    if (document.getElementById('baccaratCard')) return;

    var ranks = ['','A','2','3','4','5','6','7','8','9','10','J','Q','K'];
    var suitMap = {H:'\u2665',D:'\u2666',C:'\u2663',S:'\u2660'};

    var selectedBet = 'player';

    // Helper: clear all children from an element
    function clearChildren(el) {
        while (el.firstChild) { el.removeChild(el.firstChild); }
    }

    // Inject CSS once
    if (!document.getElementById('baccarat-card-css')) {
        var style = document.createElement('style');
        style.id = 'baccarat-card-css';
        style.textContent = [
            '#baccaratCard { background: linear-gradient(135deg, #0a1628, #162040); border: 1px solid #2a5a3a; border-radius: 12px; padding: 16px; margin-bottom: 14px; color: #fff; }',
            '#baccaratCard .bc-title { color: #fbbf24; margin: 0 0 6px 0; font-size: 15px; font-weight: 800; }',
            '#baccaratCard .bc-desc { color: #aaa; font-size: 12px; margin: 0 0 12px 0; }',
            '.bc-bet-row { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; font-size: 13px; color: #ccc; }',
            '.bc-bet-input { background: #1a1f2e; border: 1px solid #4a4a7a; color: #fff; padding: 6px 10px; border-radius: 6px; width: 80px; font-size: 13px; }',
            '.bc-beton-row { display: flex; gap: 6px; margin-bottom: 10px; }',
            '.bc-beton-btn { flex: 1; padding: 8px 0; border: 1.5px solid #4a4a7a; border-radius: 6px; background: transparent; color: #aaa; font-size: 12px; font-weight: 700; cursor: pointer; transition: all 0.2s; text-align: center; }',
            '.bc-beton-btn.bc-active-player { border-color: #3b82f6; color: #3b82f6; background: rgba(59,130,246,0.12); }',
            '.bc-beton-btn.bc-active-banker { border-color: #ef4444; color: #ef4444; background: rgba(239,68,68,0.12); }',
            '.bc-beton-btn.bc-active-tie { border-color: #22c55e; color: #22c55e; background: rgba(34,197,94,0.12); }',
            '.bc-deal-btn { width: 100%; padding: 10px; border: none; border-radius: 8px; background: linear-gradient(135deg, #065f46, #10b981); color: #fff; font-weight: 700; font-size: 14px; cursor: pointer; transition: opacity 0.2s; margin-bottom: 10px; }',
            '.bc-deal-btn:disabled { opacity: 0.5; cursor: not-allowed; }',
            '.bc-hands { display: flex; gap: 10px; margin-bottom: 10px; }',
            '.bc-hand { flex: 1; background: rgba(255,255,255,0.04); border-radius: 8px; padding: 10px 6px; text-align: center; }',
            '.bc-hand-label { font-size: 11px; font-weight: 700; color: #94a3b8; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px; }',
            '.bc-cards-area { display: flex; gap: 4px; justify-content: center; margin-bottom: 6px; min-height: 54px; align-items: center; }',
            '.bc-card { width: 36px; height: 50px; background: #fff; border-radius: 4px; display: flex; flex-direction: column; align-items: center; justify-content: center; font-weight: 700; box-shadow: 0 2px 6px rgba(0,0,0,0.3); }',
            '.bc-card-rank { font-size: 13px; line-height: 1; }',
            '.bc-card-suit { font-size: 14px; line-height: 1; }',
            '.bc-card.bc-red { color: #dc2626; }',
            '.bc-card.bc-black { color: #1a1a1a; }',
            '.bc-total { font-size: 18px; font-weight: 800; color: #e2e8f0; }',
            '.bc-result { text-align: center; font-size: 13px; font-weight: 600; min-height: 20px; margin-top: 4px; }'
        ].join('\n');
        document.head.appendChild(style);
    }

    // Card root
    var card = document.createElement('div');
    card.id = 'baccaratCard';

    var title = document.createElement('p');
    title.className = 'bc-title';
    title.textContent = '\uD83C\uDCB4 Baccarat';
    card.appendChild(title);

    var desc = document.createElement('p');
    desc.className = 'bc-desc';
    desc.textContent = 'Player 1:1 \u2022 Banker 0.95:1 \u2022 Tie 8:1';
    card.appendChild(desc);

    // Bet input row
    var betRow = document.createElement('div');
    betRow.className = 'bc-bet-row';
    var betLabel = document.createElement('span');
    betLabel.textContent = 'Bet $';
    betRow.appendChild(betLabel);
    var betInput = document.createElement('input');
    betInput.type = 'number';
    betInput.className = 'bc-bet-input';
    betInput.min = '0.50';
    betInput.step = '0.50';
    betInput.value = '1.00';
    betRow.appendChild(betInput);
    card.appendChild(betRow);

    // Bet-on buttons
    var betonRow = document.createElement('div');
    betonRow.className = 'bc-beton-row';

    var btnPlayer = document.createElement('button');
    btnPlayer.className = 'bc-beton-btn bc-active-player';
    btnPlayer.textContent = 'Player';
    btnPlayer.setAttribute('data-bet', 'player');

    var btnBanker = document.createElement('button');
    btnBanker.className = 'bc-beton-btn';
    btnBanker.textContent = 'Banker';
    btnBanker.setAttribute('data-bet', 'banker');

    var btnTie = document.createElement('button');
    btnTie.className = 'bc-beton-btn';
    btnTie.textContent = 'Tie';
    btnTie.setAttribute('data-bet', 'tie');

    betonRow.appendChild(btnPlayer);
    betonRow.appendChild(btnBanker);
    betonRow.appendChild(btnTie);
    card.appendChild(betonRow);

    var allBetonBtns = [btnPlayer, btnBanker, btnTie];
    var activeClasses = { player: 'bc-active-player', banker: 'bc-active-banker', tie: 'bc-active-tie' };

    function updateBetonHighlight() {
        for (var i = 0; i < allBetonBtns.length; i++) {
            var btn = allBetonBtns[i];
            var betVal = btn.getAttribute('data-bet');
            btn.className = 'bc-beton-btn';
            if (betVal === selectedBet) {
                btn.className += ' ' + activeClasses[betVal];
            }
        }
    }

    allBetonBtns.forEach(function(btn) {
        btn.addEventListener('click', function() {
            selectedBet = btn.getAttribute('data-bet');
            updateBetonHighlight();
        });
    });

    // Deal button
    var dealBtn = document.createElement('button');
    dealBtn.className = 'bc-deal-btn';
    dealBtn.textContent = 'DEAL';
    card.appendChild(dealBtn);

    // Hands area
    var handsDiv = document.createElement('div');
    handsDiv.className = 'bc-hands';

    // Player hand
    var playerHand = document.createElement('div');
    playerHand.className = 'bc-hand';
    var playerLabel = document.createElement('div');
    playerLabel.className = 'bc-hand-label';
    playerLabel.textContent = 'Player';
    playerHand.appendChild(playerLabel);
    var playerCardsArea = document.createElement('div');
    playerCardsArea.className = 'bc-cards-area';
    playerHand.appendChild(playerCardsArea);
    var playerTotalEl = document.createElement('div');
    playerTotalEl.className = 'bc-total';
    playerTotalEl.textContent = '-';
    playerHand.appendChild(playerTotalEl);

    // Banker hand
    var bankerHand = document.createElement('div');
    bankerHand.className = 'bc-hand';
    var bankerLabelEl = document.createElement('div');
    bankerLabelEl.className = 'bc-hand-label';
    bankerLabelEl.textContent = 'Banker';
    bankerHand.appendChild(bankerLabelEl);
    var bankerCardsArea = document.createElement('div');
    bankerCardsArea.className = 'bc-cards-area';
    bankerHand.appendChild(bankerCardsArea);
    var bankerTotalEl = document.createElement('div');
    bankerTotalEl.className = 'bc-total';
    bankerTotalEl.textContent = '-';
    bankerHand.appendChild(bankerTotalEl);

    handsDiv.appendChild(playerHand);
    handsDiv.appendChild(bankerHand);
    card.appendChild(handsDiv);

    // Result
    var resultEl = document.createElement('div');
    resultEl.className = 'bc-result';
    card.appendChild(resultEl);

    container.appendChild(card);

    // Helper: create a card DOM element
    function makeCardEl(c) {
        var el = document.createElement('div');
        var isRed = (c.s === 'H' || c.s === 'D');
        el.className = 'bc-card ' + (isRed ? 'bc-red' : 'bc-black');
        var rankSpan = document.createElement('div');
        rankSpan.className = 'bc-card-rank';
        rankSpan.textContent = ranks[c.v] || String(c.v);
        el.appendChild(rankSpan);
        var suitSpan = document.createElement('div');
        suitSpan.className = 'bc-card-suit';
        suitSpan.textContent = suitMap[c.s] || c.s;
        el.appendChild(suitSpan);
        return el;
    }

    // Helper: render cards into an area with staggered animation
    function renderCards(area, cards, cb) {
        clearChildren(area);
        var idx = 0;
        var interval = setInterval(function() {
            if (idx >= cards.length) {
                clearInterval(interval);
                if (cb) cb();
                return;
            }
            area.appendChild(makeCardEl(cards[idx]));
            idx++;
        }, 200);
    }

    var busy = false;

    // DEAL handler
    dealBtn.addEventListener('click', function() {
        if (busy) return;
        var bet = parseFloat(betInput.value);
        if (isNaN(bet) || bet < 0.50) {
            resultEl.textContent = 'Min bet is $0.50';
            resultEl.style.color = '#f87171';
            return;
        }

        busy = true;
        dealBtn.disabled = true;
        dealBtn.textContent = 'DEALING...';
        resultEl.textContent = '';
        resultEl.style.color = '';
        clearChildren(playerCardsArea);
        clearChildren(bankerCardsArea);
        playerTotalEl.textContent = '-';
        bankerTotalEl.textContent = '-';

        var currentToken = localStorage.getItem(typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken');
        if (!currentToken) {
            resultEl.textContent = 'Not authenticated.';
            resultEl.style.color = '#f87171';
            busy = false;
            dealBtn.disabled = false;
            dealBtn.textContent = 'DEAL';
            return;
        }

        fetch('/api/baccarat/play', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + currentToken,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ bet: bet, betOn: selectedBet })
        })
        .then(function(res) { return res.json(); })
        .then(function(data) {
            if (!data.success) {
                resultEl.textContent = data.error || 'Deal failed.';
                resultEl.style.color = '#f87171';
                busy = false;
                dealBtn.disabled = false;
                dealBtn.textContent = 'DEAL';
                return;
            }

            // Render player cards, then banker cards, then show result
            renderCards(playerCardsArea, data.playerCards || [], function() {
                playerTotalEl.textContent = String(data.playerTotal);

                renderCards(bankerCardsArea, data.bankerCards || [], function() {
                    bankerTotalEl.textContent = String(data.bankerTotal);

                    // Show result
                    var winnerText = '';
                    if (data.winner === 'player') {
                        winnerText = 'Player Wins!';
                    } else if (data.winner === 'banker') {
                        winnerText = 'Banker Wins!';
                    } else {
                        winnerText = 'Tie!';
                    }

                    var payout = data.payout || 0;
                    if (payout > 0) {
                        resultEl.textContent = winnerText + ' +$' + payout.toFixed(2);
                        resultEl.style.color = '#4ade80';
                    } else {
                        resultEl.textContent = winnerText + ' -$' + bet.toFixed(2);
                        resultEl.style.color = '#f87171';
                    }

                    // Update balance
                    if (typeof data.newBalance === 'number') {
                        if (typeof updateBalanceDisplay === 'function') {
                            updateBalanceDisplay(data.newBalance);
                        }
                    }

                    busy = false;
                    dealBtn.disabled = false;
                    dealBtn.textContent = 'DEAL';
                });
            });
        })
        .catch(function() {
            resultEl.textContent = 'Connection error. Try again.';
            resultEl.style.color = '#f87171';
            busy = false;
            dealBtn.disabled = false;
            dealBtn.textContent = 'DEAL';
        });
    });
}

// ─────────────────────────────────────────────────────────────────────
// DRAGON TIGER CARD WIDGET
// ─────────────────────────────────────────────────────────────────────

function renderDragonTigerCard(container) {
    // Auth guard
    if (typeof isServerAuthToken !== 'function' || !isServerAuthToken()) return;
    var token = localStorage.getItem(typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken');
    if (!token) return;
    // Idempotency
    if (document.getElementById('dragonTigerCard')) return;

    var suitSymbols = { hearts: '\u2665', diamonds: '\u2666', clubs: '\u2663', spades: '\u2660' };
    var redSuits = { hearts: true, diamonds: true };
    var selectedBet = 'dragon';
    var busy = false;

    // Helper: clear children
    function clearChildren(el) {
        while (el.firstChild) { el.removeChild(el.firstChild); }
    }

    // Inject CSS once
    if (!document.getElementById('dragon-tiger-css')) {
        var style = document.createElement('style');
        style.id = 'dragon-tiger-css';
        style.textContent = [
            '#dragonTigerCard { background: linear-gradient(135deg, #1a0a0a, #2d1020); border: 1px solid #8b2252; border-radius: 12px; padding: 16px; margin-bottom: 14px; color: #fff; }',
            '#dragonTigerCard .dt-title { color: #fbbf24; margin: 0 0 6px 0; font-size: 15px; font-weight: 800; text-align: center; }',
            '#dragonTigerCard .dt-desc { color: #aaa; font-size: 12px; margin: 0 0 12px 0; text-align: center; }',
            '#dragonTigerCard .dt-bet-row { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; font-size: 13px; color: #ccc; justify-content: center; }',
            '#dragonTigerCard .dt-bet-input { background: #1a1f2e; border: 1px solid #4a4a7a; color: #fff; padding: 6px 10px; border-radius: 6px; width: 80px; font-size: 13px; text-align: center; }',
            '#dragonTigerCard .dt-beton-row { display: flex; gap: 6px; margin-bottom: 10px; }',
            '#dragonTigerCard .dt-beton-btn { flex: 1; padding: 8px 0; border: 1.5px solid #4a4a7a; border-radius: 6px; background: transparent; color: #aaa; font-size: 12px; font-weight: 700; cursor: pointer; transition: all 0.2s; text-align: center; }',
            '#dragonTigerCard .dt-beton-btn.dt-active-dragon { border-color: #ef4444; color: #ef4444; background: rgba(239,68,68,0.12); }',
            '#dragonTigerCard .dt-beton-btn.dt-active-tiger { border-color: #3b82f6; color: #3b82f6; background: rgba(59,130,246,0.12); }',
            '#dragonTigerCard .dt-beton-btn.dt-active-tie { border-color: #22c55e; color: #22c55e; background: rgba(34,197,94,0.12); }',
            '#dragonTigerCard .dt-play-btn { width: 100%; padding: 10px; border: none; border-radius: 8px; background: linear-gradient(135deg, #7f1d1d, #dc2626); color: #fff; font-weight: 700; font-size: 14px; cursor: pointer; transition: opacity 0.2s; margin-bottom: 10px; }',
            '#dragonTigerCard .dt-play-btn:disabled { opacity: 0.5; cursor: not-allowed; }',
            '#dragonTigerCard .dt-hands { display: flex; gap: 10px; margin-bottom: 10px; }',
            '#dragonTigerCard .dt-hand { flex: 1; background: rgba(255,255,255,0.04); border-radius: 8px; padding: 10px 6px; text-align: center; }',
            '#dragonTigerCard .dt-hand-label { font-size: 11px; font-weight: 700; color: #94a3b8; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px; }',
            '#dragonTigerCard .dt-card-area { display: flex; justify-content: center; min-height: 54px; align-items: center; }',
            '#dragonTigerCard .dt-card { width: 44px; height: 60px; background: #fff; border-radius: 5px; display: flex; flex-direction: column; align-items: center; justify-content: center; font-weight: 700; box-shadow: 0 2px 8px rgba(0,0,0,0.35); }',
            '#dragonTigerCard .dt-card-rank { font-size: 16px; line-height: 1; }',
            '#dragonTigerCard .dt-card-suit { font-size: 16px; line-height: 1; }',
            '#dragonTigerCard .dt-card.dt-red { color: #dc2626; }',
            '#dragonTigerCard .dt-card.dt-black { color: #1a1a1a; }',
            '#dragonTigerCard .dt-result { text-align: center; font-size: 13px; font-weight: 600; min-height: 20px; margin-top: 4px; }',
            '#dragonTigerCard .dt-again-btn { width: 100%; padding: 8px; border: 1px solid #8b2252; border-radius: 6px; background: transparent; color: #d4a0b0; font-size: 12px; font-weight: 600; cursor: pointer; margin-top: 6px; display: none; }'
        ].join('\n');
        document.head.appendChild(style);
    }

    // Card root
    var card = document.createElement('div');
    card.id = 'dragonTigerCard';

    // Title
    var titleEl = document.createElement('div');
    titleEl.className = 'dt-title';
    titleEl.textContent = '\uD83D\uDC09 Dragon Tiger';
    card.appendChild(titleEl);

    // Description
    var descEl = document.createElement('p');
    descEl.className = 'dt-desc';
    descEl.textContent = 'One card each. Higher card wins. Tie pays 8:1!';
    card.appendChild(descEl);

    // Bet row
    var betRow = document.createElement('div');
    betRow.className = 'dt-bet-row';
    var betLabel = document.createElement('span');
    betLabel.textContent = 'Bet $';
    betRow.appendChild(betLabel);
    var betInput = document.createElement('input');
    betInput.type = 'number';
    betInput.className = 'dt-bet-input';
    betInput.min = '1';
    betInput.max = '1000';
    betInput.value = '10';
    betRow.appendChild(betInput);
    card.appendChild(betRow);

    // Bet-on row (Dragon / Tiger / Tie)
    var betonRow = document.createElement('div');
    betonRow.className = 'dt-beton-row';

    function createBetonBtn(label, value) {
        var btn = document.createElement('button');
        btn.className = 'dt-beton-btn';
        btn.textContent = label;
        btn.setAttribute('data-bet', value);
        btn.addEventListener('click', function() {
            selectedBet = value;
            updateBetonHighlight();
        });
        return btn;
    }

    var dragonBtn = createBetonBtn('Dragon', 'dragon');
    var tigerBtn = createBetonBtn('Tiger', 'tiger');
    var tieBtn = createBetonBtn('Tie', 'tie');
    betonRow.appendChild(dragonBtn);
    betonRow.appendChild(tigerBtn);
    betonRow.appendChild(tieBtn);
    card.appendChild(betonRow);

    function updateBetonHighlight() {
        dragonBtn.className = 'dt-beton-btn' + (selectedBet === 'dragon' ? ' dt-active-dragon' : '');
        tigerBtn.className = 'dt-beton-btn' + (selectedBet === 'tiger' ? ' dt-active-tiger' : '');
        tieBtn.className = 'dt-beton-btn' + (selectedBet === 'tie' ? ' dt-active-tie' : '');
    }
    updateBetonHighlight();

    // Play button
    var playBtn = document.createElement('button');
    playBtn.className = 'dt-play-btn';
    playBtn.textContent = 'PLAY';
    card.appendChild(playBtn);

    // Hands area
    var handsDiv = document.createElement('div');
    handsDiv.className = 'dt-hands';

    // Dragon hand
    var dragonHand = document.createElement('div');
    dragonHand.className = 'dt-hand';
    var dragonLabel = document.createElement('div');
    dragonLabel.className = 'dt-hand-label';
    dragonLabel.textContent = '\uD83D\uDC09 Dragon';
    dragonHand.appendChild(dragonLabel);
    var dragonCardArea = document.createElement('div');
    dragonCardArea.className = 'dt-card-area';
    dragonHand.appendChild(dragonCardArea);

    // Tiger hand
    var tigerHand = document.createElement('div');
    tigerHand.className = 'dt-hand';
    var tigerLabel = document.createElement('div');
    tigerLabel.className = 'dt-hand-label';
    tigerLabel.textContent = '\uD83D\uDC05 Tiger';
    tigerHand.appendChild(tigerLabel);
    var tigerCardArea = document.createElement('div');
    tigerCardArea.className = 'dt-card-area';
    tigerHand.appendChild(tigerCardArea);

    handsDiv.appendChild(dragonHand);
    handsDiv.appendChild(tigerHand);
    card.appendChild(handsDiv);

    // Result
    var resultEl = document.createElement('div');
    resultEl.className = 'dt-result';
    card.appendChild(resultEl);

    // Play Again button
    var againBtn = document.createElement('button');
    againBtn.className = 'dt-again-btn';
    againBtn.textContent = 'Play Again';
    card.appendChild(againBtn);

    container.appendChild(card);

    // Render a single card into an area
    function renderSingleCard(area, cardData) {
        clearChildren(area);
        if (!cardData) return;
        var el = document.createElement('div');
        var suitChar = suitSymbols[cardData.suit] || cardData.suit || '';
        var isRed = redSuits[cardData.suit] || false;
        el.className = 'dt-card' + (isRed ? ' dt-red' : ' dt-black');

        var rankSpan = document.createElement('span');
        rankSpan.className = 'dt-card-rank';
        rankSpan.textContent = cardData.rank || '';
        el.appendChild(rankSpan);

        var suitSpan = document.createElement('span');
        suitSpan.className = 'dt-card-suit';
        suitSpan.textContent = suitChar;
        el.appendChild(suitSpan);

        area.appendChild(el);
    }

    // Reset for new round
    function resetRound() {
        clearChildren(dragonCardArea);
        clearChildren(tigerCardArea);
        resultEl.textContent = '';
        resultEl.style.color = '';
        againBtn.style.display = 'none';
        playBtn.style.display = '';
    }

    againBtn.addEventListener('click', function() {
        resetRound();
    });

    // Play handler
    playBtn.addEventListener('click', function() {
        if (busy) return;
        var bet = parseFloat(betInput.value);
        if (isNaN(bet) || bet < 1) {
            resultEl.textContent = 'Minimum bet is $1.';
            resultEl.style.color = '#f87171';
            return;
        }

        busy = true;
        playBtn.disabled = true;
        playBtn.textContent = 'DEALING...';
        resultEl.textContent = '';
        clearChildren(dragonCardArea);
        clearChildren(tigerCardArea);

        var currentToken = localStorage.getItem(typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken');
        if (!currentToken) {
            resultEl.textContent = 'Not authenticated.';
            resultEl.style.color = '#f87171';
            busy = false;
            playBtn.disabled = false;
            playBtn.textContent = 'PLAY';
            return;
        }

        fetch('/api/dragontiger/play', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + currentToken,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ bet: bet, betOn: selectedBet })
        })
        .then(function(res) { return res.json(); })
        .then(function(data) {
            if (!data.success && data.error) {
                resultEl.textContent = data.error || 'Play failed.';
                resultEl.style.color = '#f87171';
                busy = false;
                playBtn.disabled = false;
                playBtn.textContent = 'PLAY';
                return;
            }

            // Render dragon card
            renderSingleCard(dragonCardArea, data.dragonCard);

            // Short delay then render tiger card
            setTimeout(function() {
                renderSingleCard(tigerCardArea, data.tigerCard);

                // Show result
                var winnerText = '';
                if (data.winner === 'dragon') {
                    winnerText = 'Dragon Wins!';
                } else if (data.winner === 'tiger') {
                    winnerText = 'Tiger Wins!';
                } else {
                    winnerText = 'Tie!';
                }

                var payout = data.payout || 0;
                if (payout > 0) {
                    resultEl.textContent = winnerText + ' +$' + payout.toFixed(2);
                    resultEl.style.color = '#4ade80';
                } else {
                    resultEl.textContent = winnerText + ' -$' + bet.toFixed(2);
                    resultEl.style.color = '#f87171';
                }

                // Update balance
                if (typeof data.newBalance === 'number') {
                    if (typeof updateBalanceDisplay === 'function') {
                        updateBalanceDisplay(data.newBalance);
                    }
                }

                busy = false;
                playBtn.disabled = false;
                playBtn.textContent = 'PLAY';
                playBtn.style.display = 'none';
                againBtn.style.display = '';
            }, 400);
        })
        .catch(function() {
            resultEl.textContent = 'Connection error. Try again.';
            resultEl.style.color = '#f87171';
            busy = false;
            playBtn.disabled = false;
            playBtn.textContent = 'PLAY';
        });
    });
}

function renderHorseRacingCard(container) {
    if (document.getElementById('horseRacingCard')) return;

    if (typeof isServerAuthToken !== 'function' || !isServerAuthToken()) return;
    var token = localStorage.getItem(typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken');
    if (!token) return;

    if (!document.getElementById('horse-racing-css')) {
        var styleEl = document.createElement('style');
        styleEl.id = 'horse-racing-css';
        styleEl.textContent = [
            '#horseRacingCard { background: linear-gradient(135deg, #1a3a1a 0%, #2d4a2d 40%, #3b2a1a 100%); border-radius: 16px; padding: 20px; margin-bottom: 18px; border: 2px solid #4a7a3a; position: relative; overflow: hidden; }',
            '#horseRacingCard::before { content: ""; position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: repeating-linear-gradient(0deg, transparent, transparent 18px, rgba(255,255,255,0.02) 18px, rgba(255,255,255,0.02) 20px); pointer-events: none; }',
            '.hr-title-bar { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; }',
            '.hr-title { font-size: 20px; font-weight: 700; color: #d4e8c4; text-shadow: 0 2px 6px rgba(0,0,0,0.5); }',
            '.hr-subtitle { font-size: 12px; color: #8ab878; margin-bottom: 14px; }',
            '.hr-section-label { font-size: 12px; font-weight: 600; color: #a0c090; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; margin-top: 14px; }',
            '.hr-horses { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-bottom: 10px; }',
            '.hr-horse-btn { background: rgba(74,122,58,0.3); border: 2px solid #4a6a3a; border-radius: 10px; padding: 10px 6px; text-align: center; cursor: pointer; transition: all 0.2s; color: #c8e0b8; font-size: 13px; font-weight: 600; }',
            '.hr-horse-btn:hover { background: rgba(74,122,58,0.6); border-color: #7ab868; transform: translateY(-1px); }',
            '.hr-horse-btn.selected { background: rgba(120,200,90,0.35); border-color: #7cd860; box-shadow: 0 0 12px rgba(120,200,90,0.3); color: #e0ffd0; }',
            '.hr-horse-btn.selected-second { background: rgba(200,160,60,0.35); border-color: #d0b040; box-shadow: 0 0 12px rgba(200,160,60,0.3); color: #fff0c0; }',
            '.hr-horse-id { font-size: 10px; color: #6a9a5a; display: block; margin-top: 2px; }',
            '.hr-bet-types { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }',
            '.hr-bet-type-btn { background: rgba(90,70,40,0.5); border: 2px solid #6a5530; border-radius: 8px; padding: 8px 10px; cursor: pointer; transition: all 0.2s; color: #d4c8a0; font-size: 12px; font-weight: 600; flex: 1; min-width: 70px; text-align: center; }',
            '.hr-bet-type-btn:hover { background: rgba(140,110,60,0.5); border-color: #a08840; }',
            '.hr-bet-type-btn.active { background: rgba(180,140,50,0.4); border-color: #d4b040; color: #fff8d0; box-shadow: 0 0 10px rgba(180,140,50,0.3); }',
            '.hr-bet-payout { font-size: 10px; color: #a09070; display: block; margin-top: 2px; }',
            '.hr-amount-row { display: flex; align-items: center; gap: 8px; margin-bottom: 14px; }',
            '.hr-amount-input { flex: 1; background: rgba(0,0,0,0.3); border: 2px solid #4a6a3a; border-radius: 8px; padding: 10px 12px; color: #d4e8c4; font-size: 16px; font-weight: 700; text-align: center; outline: none; }',
            '.hr-amount-input:focus { border-color: #7ab868; box-shadow: 0 0 8px rgba(120,200,90,0.3); }',
            '.hr-quick-btn { background: rgba(74,122,58,0.3); border: 1px solid #4a6a3a; border-radius: 6px; padding: 6px 10px; color: #a0c090; font-size: 11px; cursor: pointer; transition: all 0.15s; }',
            '.hr-quick-btn:hover { background: rgba(74,122,58,0.6); color: #d4e8c4; }',
            '.hr-race-btn { width: 100%; background: linear-gradient(135deg, #2a7a1a, #4a9a30); border: 2px solid #5ab840; border-radius: 12px; padding: 14px; color: #fff; font-size: 18px; font-weight: 800; cursor: pointer; text-transform: uppercase; letter-spacing: 2px; transition: all 0.2s; text-shadow: 0 2px 4px rgba(0,0,0,0.4); }',
            '.hr-race-btn:hover { background: linear-gradient(135deg, #3a9a2a, #5ab840); transform: translateY(-1px); box-shadow: 0 4px 16px rgba(90,184,64,0.4); }',
            '.hr-race-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; box-shadow: none; }',
            '.hr-race-track { margin-top: 16px; background: rgba(0,0,0,0.25); border-radius: 12px; padding: 14px; border: 1px solid rgba(74,122,58,0.3); display: none; }',
            '.hr-track-title { font-size: 14px; font-weight: 700; color: #d4b040; margin-bottom: 10px; text-align: center; text-transform: uppercase; letter-spacing: 1px; }',
            '.hr-finish-lane { display: flex; align-items: center; gap: 10px; padding: 8px 12px; border-radius: 8px; margin-bottom: 4px; transition: all 0.4s; opacity: 0; transform: translateX(-30px); }',
            '.hr-finish-lane.visible { opacity: 1; transform: translateX(0); }',
            '.hr-finish-pos { font-size: 18px; font-weight: 800; min-width: 28px; text-align: center; }',
            '.hr-finish-pos.gold { color: #ffd700; text-shadow: 0 0 8px rgba(255,215,0,0.5); }',
            '.hr-finish-pos.silver { color: #c0c0c0; text-shadow: 0 0 6px rgba(192,192,192,0.4); }',
            '.hr-finish-pos.bronze { color: #cd7f32; text-shadow: 0 0 6px rgba(205,127,50,0.4); }',
            '.hr-finish-name { flex: 1; font-size: 14px; font-weight: 600; color: #c8e0b8; }',
            '.hr-finish-icon { font-size: 20px; }',
            '.hr-bet-results { margin-top: 12px; }',
            '.hr-bet-result { display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; border-radius: 8px; margin-bottom: 4px; font-size: 13px; }',
            '.hr-bet-result.won { background: rgba(80,200,60,0.15); border: 1px solid rgba(80,200,60,0.3); color: #80e850; }',
            '.hr-bet-result.lost { background: rgba(200,60,60,0.1); border: 1px solid rgba(200,60,60,0.2); color: #e07070; }',
            '.hr-summary { margin-top: 12px; text-align: center; padding: 12px; border-radius: 10px; font-size: 16px; font-weight: 700; }',
            '.hr-summary.profit { background: rgba(80,200,60,0.15); border: 1px solid rgba(80,200,60,0.3); color: #70e850; }',
            '.hr-summary.loss { background: rgba(200,60,60,0.12); border: 1px solid rgba(200,60,60,0.25); color: #e07070; }',
            '.hr-summary.even { background: rgba(200,200,200,0.1); border: 1px solid rgba(200,200,200,0.2); color: #c0c0c0; }',
            '.hr-error { color: #f87171; font-size: 13px; margin-top: 8px; text-align: center; }',
            '.hr-selection-info { font-size: 12px; color: #8ab878; text-align: center; margin-bottom: 6px; font-style: italic; }'
        ].join('\n');
        document.head.appendChild(styleEl);
    }

    var HORSES = [
        { id: 0, name: 'Thunder', emoji: '\uD83C\uDFC7' },
        { id: 1, name: 'Lightning', emoji: '\u26A1' },
        { id: 2, name: 'Storm', emoji: '\uD83C\uDF29' },
        { id: 3, name: 'Blaze', emoji: '\uD83D\uDD25' },
        { id: 4, name: 'Shadow', emoji: '\uD83C\uDF11' },
        { id: 5, name: 'Comet', emoji: '\u2604\uFE0F' }
    ];

    var BET_TYPES = [
        { type: 'win', label: 'Win', payout: '6x', desc: '1st place' },
        { type: 'place', label: 'Place', payout: '2.5x', desc: 'Top 2' },
        { type: 'show', label: 'Show', payout: '1.5x', desc: 'Top 3' },
        { type: 'exacta', label: 'Exacta', payout: '25x', desc: '1st+2nd exact' },
        { type: 'quinella', label: 'Quinella', payout: '10x', desc: '1st+2nd any' }
    ];

    var selectedHorse = -1;
    var selectedHorse2 = -1;
    var selectedBetType = 'win';
    var racing = false;

    function fmtMoney(x) {
        return typeof formatMoney === 'function' ? formatMoney(x) : '$' + x.toFixed(2);
    }

    function needsTwoHorses(bt) {
        return bt === 'exacta' || bt === 'quinella';
    }

    var card = document.createElement('div');
    card.id = 'horseRacingCard';
    card.style.position = 'relative';

    // Title bar
    var titleBar = document.createElement('div');
    titleBar.className = 'hr-title-bar';
    var titleIcon = document.createElement('span');
    titleIcon.textContent = '\uD83C\uDFC7';
    titleIcon.style.fontSize = '28px';
    titleBar.appendChild(titleIcon);
    var titleText = document.createElement('span');
    titleText.className = 'hr-title';
    titleText.textContent = 'Horse Racing';
    titleBar.appendChild(titleText);
    card.appendChild(titleBar);

    var subtitle = document.createElement('div');
    subtitle.className = 'hr-subtitle';
    subtitle.textContent = 'Pick your horse, place your bet, and watch them race!';
    card.appendChild(subtitle);

    // Horse selection section
    var horseSectionLabel = document.createElement('div');
    horseSectionLabel.className = 'hr-section-label';
    horseSectionLabel.textContent = 'Select Horse';
    card.appendChild(horseSectionLabel);

    var selectionInfo = document.createElement('div');
    selectionInfo.className = 'hr-selection-info';
    selectionInfo.textContent = 'Tap a horse to select';
    card.appendChild(selectionInfo);

    var horsesGrid = document.createElement('div');
    horsesGrid.className = 'hr-horses';
    var horseButtons = [];

    HORSES.forEach(function(h) {
        var btn = document.createElement('div');
        btn.className = 'hr-horse-btn';
        btn.setAttribute('data-horse-id', h.id);

        var nameSpan = document.createElement('span');
        nameSpan.textContent = h.emoji + ' ' + h.name;
        btn.appendChild(nameSpan);

        var idSpan = document.createElement('span');
        idSpan.className = 'hr-horse-id';
        idSpan.textContent = '#' + (h.id + 1);
        btn.appendChild(idSpan);

        btn.addEventListener('click', function() {
            if (racing) return;
            var twoMode = needsTwoHorses(selectedBetType);

            if (twoMode) {
                if (selectedHorse === h.id) {
                    selectedHorse = -1;
                } else if (selectedHorse2 === h.id) {
                    selectedHorse2 = -1;
                } else if (selectedHorse === -1) {
                    selectedHorse = h.id;
                } else if (selectedHorse2 === -1 && h.id !== selectedHorse) {
                    selectedHorse2 = h.id;
                } else {
                    selectedHorse2 = h.id;
                    if (selectedHorse2 === selectedHorse) selectedHorse = -1;
                }
            } else {
                selectedHorse = (selectedHorse === h.id) ? -1 : h.id;
                selectedHorse2 = -1;
            }
            updateHorseButtons();
        });

        horseButtons.push(btn);
        horsesGrid.appendChild(btn);
    });
    card.appendChild(horsesGrid);

    function updateHorseButtons() {
        horseButtons.forEach(function(btn, i) {
            btn.classList.remove('selected', 'selected-second');
            if (i === selectedHorse) btn.classList.add('selected');
            if (i === selectedHorse2) btn.classList.add('selected-second');
        });
        var twoMode = needsTwoHorses(selectedBetType);
        if (twoMode) {
            if (selectedHorse === -1 && selectedHorse2 === -1) {
                selectionInfo.textContent = 'Select 1st and 2nd horse';
            } else if (selectedHorse >= 0 && selectedHorse2 === -1) {
                selectionInfo.textContent = '1st: ' + HORSES[selectedHorse].name + ' \u2014 now pick 2nd horse';
            } else if (selectedHorse >= 0 && selectedHorse2 >= 0) {
                selectionInfo.textContent = '1st: ' + HORSES[selectedHorse].name + ', 2nd: ' + HORSES[selectedHorse2].name;
            }
        } else {
            if (selectedHorse === -1) {
                selectionInfo.textContent = 'Tap a horse to select';
            } else {
                selectionInfo.textContent = 'Selected: ' + HORSES[selectedHorse].emoji + ' ' + HORSES[selectedHorse].name;
            }
        }
    }

    // Bet type selector
    var betSectionLabel = document.createElement('div');
    betSectionLabel.className = 'hr-section-label';
    betSectionLabel.textContent = 'Bet Type';
    card.appendChild(betSectionLabel);

    var betTypesRow = document.createElement('div');
    betTypesRow.className = 'hr-bet-types';
    var betTypeButtons = [];

    BET_TYPES.forEach(function(bt) {
        var btn = document.createElement('div');
        btn.className = 'hr-bet-type-btn';
        if (bt.type === selectedBetType) btn.classList.add('active');

        var labelSpan = document.createElement('span');
        labelSpan.textContent = bt.label;
        btn.appendChild(labelSpan);

        var payoutSpan = document.createElement('span');
        payoutSpan.className = 'hr-bet-payout';
        payoutSpan.textContent = bt.payout + ' \u2014 ' + bt.desc;
        btn.appendChild(payoutSpan);

        btn.addEventListener('click', function() {
            if (racing) return;
            selectedBetType = bt.type;
            betTypeButtons.forEach(function(b) { b.classList.remove('active'); });
            btn.classList.add('active');

            if (!needsTwoHorses(bt.type)) {
                selectedHorse2 = -1;
            }
            updateHorseButtons();
        });

        betTypeButtons.push(btn);
        betTypesRow.appendChild(btn);
    });
    card.appendChild(betTypesRow);

    // Bet amount
    var amountLabel = document.createElement('div');
    amountLabel.className = 'hr-section-label';
    amountLabel.textContent = 'Bet Amount';
    card.appendChild(amountLabel);

    var amountRow = document.createElement('div');
    amountRow.className = 'hr-amount-row';

    var amountInput = document.createElement('input');
    amountInput.type = 'number';
    amountInput.className = 'hr-amount-input';
    amountInput.min = '0.25';
    amountInput.max = '500';
    amountInput.step = '0.25';
    amountInput.value = '5.00';
    amountInput.setAttribute('placeholder', '$0.25 - $500');
    amountRow.appendChild(amountInput);

    var quickAmounts = [1, 5, 25, 100];
    quickAmounts.forEach(function(amt) {
        var qBtn = document.createElement('button');
        qBtn.className = 'hr-quick-btn';
        qBtn.textContent = '$' + amt;
        qBtn.addEventListener('click', function() {
            if (racing) return;
            amountInput.value = amt.toFixed(2);
        });
        amountRow.appendChild(qBtn);
    });
    card.appendChild(amountRow);

    // Race button
    var raceBtn = document.createElement('button');
    raceBtn.className = 'hr-race-btn';
    raceBtn.textContent = '\uD83C\uDFC1 RACE!';
    card.appendChild(raceBtn);

    // Error display
    var errorEl = document.createElement('div');
    errorEl.className = 'hr-error';
    card.appendChild(errorEl);

    // Race track (results area)
    var raceTrack = document.createElement('div');
    raceTrack.className = 'hr-race-track';

    var trackTitle = document.createElement('div');
    trackTitle.className = 'hr-track-title';
    trackTitle.textContent = 'Race Results';
    raceTrack.appendChild(trackTitle);

    var finishArea = document.createElement('div');
    finishArea.id = 'hrFinishArea';
    raceTrack.appendChild(finishArea);

    var betResultsArea = document.createElement('div');
    betResultsArea.className = 'hr-bet-results';
    raceTrack.appendChild(betResultsArea);

    var summaryEl = document.createElement('div');
    summaryEl.className = 'hr-summary';
    summaryEl.style.display = 'none';
    raceTrack.appendChild(summaryEl);

    card.appendChild(raceTrack);

    // Race handler
    raceBtn.addEventListener('click', function() {
        if (racing) return;
        errorEl.textContent = '';

        var amount = parseFloat(amountInput.value);
        if (isNaN(amount) || amount < 0.25 || amount > 500) {
            errorEl.textContent = 'Bet must be between $0.25 and $500';
            return;
        }

        if (selectedHorse < 0) {
            errorEl.textContent = 'Please select a horse';
            return;
        }

        if (needsTwoHorses(selectedBetType) && selectedHorse2 < 0) {
            errorEl.textContent = 'Select a 2nd horse for ' + selectedBetType + ' bet';
            return;
        }

        racing = true;
        raceBtn.disabled = true;
        raceBtn.textContent = '\uD83C\uDFC7 Racing...';

        // Clear previous results
        while (finishArea.firstChild) finishArea.removeChild(finishArea.firstChild);
        while (betResultsArea.firstChild) betResultsArea.removeChild(betResultsArea.firstChild);
        summaryEl.style.display = 'none';
        raceTrack.style.display = 'block';
        trackTitle.textContent = '\uD83C\uDFC7 Horses on the track...';

        var betPayload = {
            type: selectedBetType,
            horse: selectedHorse,
            amount: amount
        };
        if (needsTwoHorses(selectedBetType)) {
            betPayload.horse2 = selectedHorse2;
        }

        var currentToken = localStorage.getItem(typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken');

        fetch('/api/horseracing/race', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + currentToken
            },
            body: JSON.stringify({ bets: [betPayload] })
        })
        .then(function(resp) {
            if (!resp.ok) {
                return resp.json().then(function(errData) {
                    throw new Error(errData.error || 'Race failed');
                });
            }
            return resp.json();
        })
        .then(function(data) {
            trackTitle.textContent = '\uD83C\uDFC1 Race Finished!';

            var race = data.race;
            var finishOrder = race.finishOrder || [];
            var posLabels = ['1st', '2nd', '3rd', '4th', '5th', '6th'];
            var posClasses = ['gold', 'silver', 'bronze', '', '', ''];
            var trophies = ['\uD83E\uDD47', '\uD83E\uDD48', '\uD83E\uDD49', '', '', ''];

            finishOrder.forEach(function(horseId, idx) {
                var lane = document.createElement('div');
                lane.className = 'hr-finish-lane';
                lane.style.transitionDelay = (idx * 200) + 'ms';

                var posEl = document.createElement('span');
                posEl.className = 'hr-finish-pos';
                if (posClasses[idx]) posEl.classList.add(posClasses[idx]);
                posEl.textContent = posLabels[idx];
                lane.appendChild(posEl);

                var iconEl = document.createElement('span');
                iconEl.className = 'hr-finish-icon';
                var horse = HORSES[horseId] || { emoji: '\uD83D\uDC0E', name: 'Horse ' + horseId };
                iconEl.textContent = horse.emoji;
                lane.appendChild(iconEl);

                var nameEl = document.createElement('span');
                nameEl.className = 'hr-finish-name';
                nameEl.textContent = horse.name;
                if (trophies[idx]) {
                    nameEl.textContent = horse.name + ' ' + trophies[idx];
                }
                lane.appendChild(nameEl);

                finishArea.appendChild(lane);

                // Stagger the reveal animation
                setTimeout(function() {
                    lane.classList.add('visible');
                }, 100 + idx * 250);
            });

            // Show bet results after finish reveal
            var revealDelay = 100 + finishOrder.length * 250 + 300;

            setTimeout(function() {
                var betResults = data.betResults || [];
                betResults.forEach(function(br) {
                    var row = document.createElement('div');
                    row.className = 'hr-bet-result ' + (br.won ? 'won' : 'lost');

                    var descEl = document.createElement('span');
                    descEl.textContent = br.description || (br.type + ' on ' + (br.horseName || 'Horse'));
                    row.appendChild(descEl);

                    var payEl = document.createElement('span');
                    if (br.won) {
                        payEl.textContent = '+' + fmtMoney(br.payout);
                        payEl.style.fontWeight = '700';
                    } else {
                        payEl.textContent = '-' + fmtMoney(amount);
                    }
                    row.appendChild(payEl);

                    betResultsArea.appendChild(row);
                });

                // Show summary
                var summary = data.summary || {};
                var net = summary.netResult || 0;
                summaryEl.style.display = 'block';
                summaryEl.className = 'hr-summary';
                if (net > 0) {
                    summaryEl.classList.add('profit');
                    summaryEl.textContent = '\uD83C\uDF89 Won ' + fmtMoney(net) + '!';
                } else if (net < 0) {
                    summaryEl.classList.add('loss');
                    summaryEl.textContent = 'Lost ' + fmtMoney(Math.abs(net));
                } else {
                    summaryEl.classList.add('even');
                    summaryEl.textContent = 'Break even';
                }

                // Update balance
                if (typeof data.balance === 'number' && typeof updateBalanceDisplay === 'function') {
                    updateBalanceDisplay(data.balance);
                }

                racing = false;
                raceBtn.disabled = false;
                raceBtn.textContent = '\uD83C\uDFC1 RACE!';
            }, revealDelay);
        })
        .catch(function(err) {
            errorEl.textContent = err.message || 'Connection error. Try again.';
            trackTitle.textContent = 'Race Results';
            raceTrack.style.display = 'none';
            racing = false;
            raceBtn.disabled = false;
            raceBtn.textContent = '\uD83C\uDFC1 RACE!';
        });
    });

    container.appendChild(card);
}

// ─────────────────────────────────────────────────────────────────────
// CARIBBEAN STUD POKER CARD
// ─────────────────────────────────────────────────────────────────────

function renderCaribbeanStudCard(container) {
    // Auth gate
    if (typeof isServerAuthToken !== 'function' || !isServerAuthToken()) return;
    var token = localStorage.getItem(typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken');
    if (!token) return;

    // Idempotency
    if (document.getElementById('caribbeanStudCard')) return;

    var fmtMoney = typeof formatMoney === 'function' ? formatMoney : function(x) { return '$' + x.toFixed(2); };

    // ── CSS injection ──
    if (!document.getElementById('caribbeanStudStyles')) {
        var styleEl = document.createElement('style');
        styleEl.id = 'caribbeanStudStyles';
        styleEl.textContent = [
            '.cs-card-widget {',
            '  background: linear-gradient(135deg, #0a2e3d, #0d4a5c, #0a3345);',
            '  border: 1.5px solid rgba(0, 210, 211, 0.45);',
            '  border-radius: 14px;',
            '  padding: 16px;',
            '  margin-bottom: 14px;',
            '  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.45);',
            '  font-family: inherit;',
            '}',
            '.cs-card-widget .cs-title {',
            '  font-size: 16px;',
            '  font-weight: 800;',
            '  background: linear-gradient(135deg, #00d2d3, #54e0c1);',
            '  -webkit-background-clip: text;',
            '  -webkit-text-fill-color: transparent;',
            '  background-clip: text;',
            '  margin-bottom: 10px;',
            '  text-align: center;',
            '}',
            '.cs-bet-row {',
            '  display: flex;',
            '  align-items: center;',
            '  gap: 8px;',
            '  margin-bottom: 10px;',
            '}',
            '.cs-bet-row label {',
            '  color: #7dd3d6;',
            '  font-size: 12px;',
            '  font-weight: 600;',
            '  min-width: 40px;',
            '}',
            '.cs-bet-input {',
            '  flex: 1;',
            '  background: rgba(0, 0, 0, 0.35);',
            '  border: 1px solid rgba(0, 210, 211, 0.3);',
            '  border-radius: 8px;',
            '  color: #e0f7fa;',
            '  padding: 7px 10px;',
            '  font-size: 14px;',
            '  font-weight: 700;',
            '  text-align: center;',
            '  outline: none;',
            '}',
            '.cs-bet-input:focus {',
            '  border-color: #00d2d3;',
            '  box-shadow: 0 0 8px rgba(0, 210, 211, 0.3);',
            '}',
            '.cs-deal-btn {',
            '  width: 100%;',
            '  padding: 10px;',
            '  border: none;',
            '  border-radius: 10px;',
            '  font-size: 14px;',
            '  font-weight: 800;',
            '  cursor: pointer;',
            '  background: linear-gradient(135deg, #00b4d8, #0096c7);',
            '  color: #fff;',
            '  text-transform: uppercase;',
            '  letter-spacing: 1px;',
            '  transition: all 0.2s;',
            '  box-shadow: 0 3px 12px rgba(0, 180, 216, 0.35);',
            '}',
            '.cs-deal-btn:hover:not(:disabled) {',
            '  background: linear-gradient(135deg, #00c9e8, #00acd7);',
            '  transform: translateY(-1px);',
            '  box-shadow: 0 5px 18px rgba(0, 180, 216, 0.5);',
            '}',
            '.cs-deal-btn:disabled {',
            '  opacity: 0.5;',
            '  cursor: not-allowed;',
            '}',
            '.cs-action-row {',
            '  display: flex;',
            '  gap: 8px;',
            '  margin-top: 10px;',
            '}',
            '.cs-call-btn {',
            '  flex: 1;',
            '  padding: 10px;',
            '  border: none;',
            '  border-radius: 10px;',
            '  font-size: 13px;',
            '  font-weight: 800;',
            '  cursor: pointer;',
            '  background: linear-gradient(135deg, #10b981, #059669);',
            '  color: #fff;',
            '  text-transform: uppercase;',
            '  letter-spacing: 0.5px;',
            '  transition: all 0.2s;',
            '}',
            '.cs-call-btn:hover:not(:disabled) {',
            '  background: linear-gradient(135deg, #34d399, #10b981);',
            '  transform: translateY(-1px);',
            '}',
            '.cs-fold-btn {',
            '  flex: 1;',
            '  padding: 10px;',
            '  border: none;',
            '  border-radius: 10px;',
            '  font-size: 13px;',
            '  font-weight: 800;',
            '  cursor: pointer;',
            '  background: linear-gradient(135deg, #ef4444, #dc2626);',
            '  color: #fff;',
            '  text-transform: uppercase;',
            '  letter-spacing: 0.5px;',
            '  transition: all 0.2s;',
            '}',
            '.cs-fold-btn:hover:not(:disabled) {',
            '  background: linear-gradient(135deg, #f87171, #ef4444);',
            '  transform: translateY(-1px);',
            '}',
            '.cs-cards-area {',
            '  margin-top: 10px;',
            '  min-height: 40px;',
            '}',
            '.cs-hand-label {',
            '  font-size: 11px;',
            '  font-weight: 700;',
            '  color: #7dd3d6;',
            '  margin-bottom: 4px;',
            '  text-transform: uppercase;',
            '  letter-spacing: 0.5px;',
            '}',
            '.cs-cards-row {',
            '  display: flex;',
            '  gap: 4px;',
            '  flex-wrap: wrap;',
            '  margin-bottom: 8px;',
            '  justify-content: center;',
            '}',
            '.cs-card-item {',
            '  background: linear-gradient(145deg, #fff, #f0f0f0);',
            '  border: 1.5px solid #ccc;',
            '  border-radius: 6px;',
            '  min-width: 38px;',
            '  height: 52px;',
            '  display: flex;',
            '  flex-direction: column;',
            '  align-items: center;',
            '  justify-content: center;',
            '  font-weight: 800;',
            '  font-size: 13px;',
            '  line-height: 1.1;',
            '  box-shadow: 0 2px 6px rgba(0,0,0,0.15);',
            '}',
            '.cs-card-item.red { color: #dc2626; }',
            '.cs-card-item.black { color: #1a1a1a; }',
            '.cs-card-item.facedown {',
            '  background: linear-gradient(135deg, #1e40af, #3b82f6);',
            '  border-color: #1e40af;',
            '  color: #fff;',
            '  font-size: 18px;',
            '}',
            '.cs-hand-name {',
            '  text-align: center;',
            '  font-size: 13px;',
            '  font-weight: 700;',
            '  color: #00d2d3;',
            '  margin-top: 2px;',
            '  margin-bottom: 6px;',
            '}',
            '.cs-result-msg {',
            '  text-align: center;',
            '  font-size: 14px;',
            '  font-weight: 800;',
            '  padding: 8px;',
            '  border-radius: 8px;',
            '  margin-top: 8px;',
            '}',
            '.cs-result-msg.win {',
            '  background: rgba(16, 185, 129, 0.15);',
            '  color: #34d399;',
            '  border: 1px solid rgba(16, 185, 129, 0.3);',
            '}',
            '.cs-result-msg.lose {',
            '  background: rgba(239, 68, 68, 0.15);',
            '  color: #f87171;',
            '  border: 1px solid rgba(239, 68, 68, 0.3);',
            '}',
            '.cs-result-msg.push {',
            '  background: rgba(234, 179, 8, 0.15);',
            '  color: #fbbf24;',
            '  border: 1px solid rgba(234, 179, 8, 0.3);',
            '}',
            '.cs-error {',
            '  color: #f87171;',
            '  font-size: 12px;',
            '  text-align: center;',
            '  margin-top: 6px;',
            '  min-height: 16px;',
            '}',
            '.cs-paytable {',
            '  margin-top: 10px;',
            '  border-top: 1px solid rgba(0, 210, 211, 0.15);',
            '  padding-top: 8px;',
            '}',
            '.cs-paytable-toggle {',
            '  background: none;',
            '  border: none;',
            '  color: #7dd3d6;',
            '  font-size: 11px;',
            '  cursor: pointer;',
            '  padding: 2px 0;',
            '  text-decoration: underline;',
            '  font-weight: 600;',
            '}',
            '.cs-paytable-body {',
            '  display: none;',
            '  margin-top: 6px;',
            '}',
            '.cs-paytable-body.open { display: block; }',
            '.cs-pt-row {',
            '  display: flex;',
            '  justify-content: space-between;',
            '  font-size: 11px;',
            '  color: #a0d2d4;',
            '  padding: 2px 0;',
            '  border-bottom: 1px solid rgba(0, 210, 211, 0.07);',
            '}',
            '.cs-pt-row span:last-child {',
            '  color: #00d2d3;',
            '  font-weight: 700;',
            '}',
        ].join('\n');
        document.head.appendChild(styleEl);
    }

    // ── Build card ──
    var card = document.createElement('div');
    card.className = 'cs-card-widget';
    card.id = 'caribbeanStudCard';

    var title = document.createElement('div');
    title.className = 'cs-title';
    title.textContent = '\uD83C\uDFDD\uFE0F Caribbean Stud';
    card.appendChild(title);

    // Bet row
    var betRow = document.createElement('div');
    betRow.className = 'cs-bet-row';
    var betLabel = document.createElement('label');
    betLabel.textContent = 'Ante:';
    var betInput = document.createElement('input');
    betInput.type = 'number';
    betInput.className = 'cs-bet-input';
    betInput.min = '0.50';
    betInput.max = '250';
    betInput.step = '0.50';
    betInput.value = '5.00';
    betRow.appendChild(betLabel);
    betRow.appendChild(betInput);
    card.appendChild(betRow);

    // Deal button
    var dealBtn = document.createElement('button');
    dealBtn.className = 'cs-deal-btn';
    dealBtn.textContent = '\uD83C\uDCCF DEAL';
    card.appendChild(dealBtn);

    // Cards area
    var cardsArea = document.createElement('div');
    cardsArea.className = 'cs-cards-area';
    card.appendChild(cardsArea);

    // Action row (call/fold) — hidden until dealt
    var actionRow = document.createElement('div');
    actionRow.className = 'cs-action-row';
    actionRow.style.display = 'none';
    var callBtn = document.createElement('button');
    callBtn.className = 'cs-call-btn';
    callBtn.textContent = '\u2714 CALL (2x)';
    var foldBtn = document.createElement('button');
    foldBtn.className = 'cs-fold-btn';
    foldBtn.textContent = '\u2716 FOLD';
    actionRow.appendChild(callBtn);
    actionRow.appendChild(foldBtn);
    card.appendChild(actionRow);

    // Result message
    var resultMsg = document.createElement('div');
    resultMsg.className = 'cs-result-msg';
    resultMsg.style.display = 'none';
    card.appendChild(resultMsg);

    // Error
    var errorEl = document.createElement('div');
    errorEl.className = 'cs-error';
    card.appendChild(errorEl);

    // Paytable
    var paytable = document.createElement('div');
    paytable.className = 'cs-paytable';
    var ptToggle = document.createElement('button');
    ptToggle.className = 'cs-paytable-toggle';
    ptToggle.textContent = '\u25B6 Paytable';
    var ptBody = document.createElement('div');
    ptBody.className = 'cs-paytable-body';

    var payouts = [
        ['Royal Flush', '100:1'],
        ['Straight Flush', '50:1'],
        ['Four of a Kind', '20:1'],
        ['Full House', '7:1'],
        ['Flush', '5:1'],
        ['Straight', '4:1'],
        ['Three of a Kind', '3:1'],
        ['Two Pair', '2:1'],
        ['One Pair', '1:1'],
    ];
    for (var pi = 0; pi < payouts.length; pi++) {
        var ptRow = document.createElement('div');
        ptRow.className = 'cs-pt-row';
        var ptName = document.createElement('span');
        ptName.textContent = payouts[pi][0];
        var ptOdds = document.createElement('span');
        ptOdds.textContent = payouts[pi][1];
        ptRow.appendChild(ptName);
        ptRow.appendChild(ptOdds);
        ptBody.appendChild(ptRow);
    }

    ptToggle.addEventListener('click', function() {
        var isOpen = ptBody.classList.contains('open');
        if (isOpen) {
            ptBody.classList.remove('open');
            ptToggle.textContent = '\u25B6 Paytable';
        } else {
            ptBody.classList.add('open');
            ptToggle.textContent = '\u25BC Paytable';
        }
    });
    paytable.appendChild(ptToggle);
    paytable.appendChild(ptBody);
    card.appendChild(paytable);

    // ── State ──
    var currentGameId = null;
    var currentBet = 0;
    var busy = false;

    // ── Helpers ──
    function buildCardEl(cardData, facedown) {
        var el = document.createElement('div');
        if (facedown) {
            el.className = 'cs-card-item facedown';
            el.textContent = '?';
            return el;
        }
        var suit = cardData.suit || '';
        var rank = cardData.rank || '';
        var isRed = suit === '\u2665' || suit === '\u2666' ||
                    suit === 'hearts' || suit === 'diamonds' ||
                    suit === 'Hearts' || suit === 'Diamonds' ||
                    suit === '\u2665\uFE0F' || suit === '\u2666\uFE0F';
        el.className = 'cs-card-item ' + (isRed ? 'red' : 'black');

        var suitSymbol = suit;
        if (suit === 'hearts' || suit === 'Hearts') suitSymbol = '\u2665';
        else if (suit === 'diamonds' || suit === 'Diamonds') suitSymbol = '\u2666';
        else if (suit === 'spades' || suit === 'Spades') suitSymbol = '\u2660';
        else if (suit === 'clubs' || suit === 'Clubs') suitSymbol = '\u2663';

        var rankSpan = document.createElement('span');
        rankSpan.textContent = rank;
        var suitSpan = document.createElement('span');
        suitSpan.textContent = suitSymbol;
        suitSpan.style.fontSize = '14px';
        el.appendChild(rankSpan);
        el.appendChild(suitSpan);
        return el;
    }

    function renderHand(parentEl, labelText, cards, facedownIndices) {
        var label = document.createElement('div');
        label.className = 'cs-hand-label';
        label.textContent = labelText;
        parentEl.appendChild(label);

        var row = document.createElement('div');
        row.className = 'cs-cards-row';
        for (var ci = 0; ci < cards.length; ci++) {
            var isFacedown = facedownIndices && facedownIndices.indexOf(ci) !== -1;
            row.appendChild(buildCardEl(cards[ci], isFacedown));
        }
        parentEl.appendChild(row);
    }

    function setActionState(state) {
        // state: 'deal' | 'action' | 'busy'
        if (state === 'deal') {
            dealBtn.style.display = '';
            dealBtn.disabled = false;
            dealBtn.textContent = '\uD83C\uDCCF DEAL';
            actionRow.style.display = 'none';
            betInput.disabled = false;
        } else if (state === 'action') {
            dealBtn.style.display = 'none';
            actionRow.style.display = 'flex';
            callBtn.disabled = false;
            foldBtn.disabled = false;
            betInput.disabled = true;
        } else if (state === 'busy') {
            dealBtn.disabled = true;
            callBtn.disabled = true;
            foldBtn.disabled = true;
            betInput.disabled = true;
        }
    }

    function clearResults() {
        cardsArea.innerHTML = '';
        resultMsg.style.display = 'none';
        resultMsg.className = 'cs-result-msg';
        errorEl.textContent = '';
    }

    function showResult(data) {
        cardsArea.innerHTML = '';

        // Player hand
        if (data.playerHand && data.playerHand.cards) {
            renderHand(cardsArea, 'Your Hand', data.playerHand.cards, null);
            if (data.playerHand.name) {
                var pName = document.createElement('div');
                pName.className = 'cs-hand-name';
                pName.textContent = data.playerHand.name;
                cardsArea.appendChild(pName);
            }
        }

        // Dealer hand
        if (data.dealerHand && data.dealerHand.cards) {
            renderHand(cardsArea, 'Dealer\'s Hand', data.dealerHand.cards, null);
            if (data.dealerHand.name) {
                var dName = document.createElement('div');
                dName.className = 'cs-hand-name';
                dName.textContent = data.dealerHand.name;
                cardsArea.appendChild(dName);
            }
        } else if (data.dealerCards) {
            renderHand(cardsArea, 'Dealer\'s Hand', data.dealerCards, null);
        }

        // Result message
        var profit = typeof data.profit === 'number' ? data.profit : 0;
        var payout = typeof data.payout === 'number' ? data.payout : 0;
        resultMsg.style.display = '';

        if (data.result === 'win') {
            resultMsg.className = 'cs-result-msg win';
            resultMsg.textContent = '\uD83C\uDF89 You Win! +' + fmtMoney(profit);
        } else if (data.result === 'lose') {
            resultMsg.className = 'cs-result-msg lose';
            resultMsg.textContent = '\u274C You Lose ' + fmtMoney(Math.abs(profit));
        } else if (data.result === 'tie' || data.result === 'push') {
            resultMsg.className = 'cs-result-msg push';
            resultMsg.textContent = '\uD83E\uDD1D Push \u2014 Bet Returned';
        } else if (data.result === 'no-qualify') {
            resultMsg.className = 'cs-result-msg win';
            var nqText = 'Dealer Doesn\'t Qualify \u2014 Ante Wins';
            if (profit > 0) nqText += ' +' + fmtMoney(profit);
            resultMsg.textContent = nqText;
        } else if (data.result === 'fold') {
            resultMsg.className = 'cs-result-msg lose';
            resultMsg.textContent = '\uD83D\uDCA8 Folded \u2014 ' + fmtMoney(Math.abs(profit));
        }

        // Update balance
        if (typeof data.newBalance === 'number' && typeof updateBalanceDisplay === 'function') {
            updateBalanceDisplay(data.newBalance);
        }
    }

    // ── DEAL ──
    dealBtn.addEventListener('click', function() {
        if (busy) return;

        var bet = parseFloat(betInput.value);
        if (isNaN(bet) || bet < 0.50) {
            errorEl.textContent = 'Minimum ante is $0.50';
            return;
        }
        if (bet > 250) {
            errorEl.textContent = 'Maximum ante is $250';
            return;
        }

        busy = true;
        clearResults();
        setActionState('busy');
        dealBtn.textContent = 'Dealing...';

        fetch('/api/caribbeanstud/deal', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({ bet: bet })
        })
        .then(function(res) {
            if (!res.ok) {
                return res.json().then(function(d) {
                    throw new Error(d.error || d.message || 'Deal failed');
                });
            }
            return res.json();
        })
        .then(function(data) {
            currentGameId = data.gameId;
            currentBet = bet;
            busy = false;

            // Show player cards
            cardsArea.innerHTML = '';
            if (data.playerCards && data.playerCards.length > 0) {
                renderHand(cardsArea, 'Your Hand (5 Cards)', data.playerCards, null);
            }

            // Show dealer up card + 4 facedown
            if (data.dealerUp) {
                var dealerPartial = [data.dealerUp, {}, {}, {}, {}];
                renderHand(cardsArea, 'Dealer (1 Showing)', dealerPartial, [1, 2, 3, 4]);
            }

            // Show call cost
            callBtn.textContent = '\u2714 CALL (' + fmtMoney(bet * 2) + ')';
            setActionState('action');
        })
        .catch(function(err) {
            errorEl.textContent = err.message || 'Connection error';
            busy = false;
            setActionState('deal');
        });
    });

    // ── CALL ──
    callBtn.addEventListener('click', function() {
        if (busy || !currentGameId) return;
        busy = true;
        setActionState('busy');
        callBtn.textContent = 'Revealing...';

        fetch('/api/caribbeanstud/call', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({ gameId: currentGameId })
        })
        .then(function(res) {
            if (!res.ok) {
                return res.json().then(function(d) {
                    throw new Error(d.error || d.message || 'Call failed');
                });
            }
            return res.json();
        })
        .then(function(data) {
            busy = false;
            currentGameId = null;
            showResult(data);
            setActionState('deal');
        })
        .catch(function(err) {
            errorEl.textContent = err.message || 'Connection error';
            busy = false;
            setActionState('deal');
        });
    });

    // ── FOLD ──
    foldBtn.addEventListener('click', function() {
        if (busy || !currentGameId) return;
        busy = true;
        setActionState('busy');
        foldBtn.textContent = 'Folding...';

        fetch('/api/caribbeanstud/fold', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({ gameId: currentGameId })
        })
        .then(function(res) {
            if (!res.ok) {
                return res.json().then(function(d) {
                    throw new Error(d.error || d.message || 'Fold failed');
                });
            }
            return res.json();
        })
        .then(function(data) {
            busy = false;
            currentGameId = null;
            showResult(data);
            setActionState('deal');
        })
        .catch(function(err) {
            errorEl.textContent = err.message || 'Connection error';
            busy = false;
            setActionState('deal');
        });
    });

    container.appendChild(card);
}
