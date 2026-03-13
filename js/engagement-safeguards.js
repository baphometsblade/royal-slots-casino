/**
 * Engagement & Safeguards Module
 * Matrix Spins Casino - msaart.online
 *
 * Revenue-driving engagement features + responsible gambling safeguards.
 *
 * Features:
 * 1. Low-balance deposit nudge — prompts deposit at configurable thresholds
 * 2. Session time reality check — periodic reminders with session stats
 * 3. Win celebration with deposit upsell — after big wins, suggest depositing more
 * 4. Responsible gambling timer enforcement — enforces session_time limits
 *
 * Depends on: globals.js (balance, currentUser), ui-lobby.js (updateBalance),
 *             matrix-money.js (MatrixMoney.showPurchaseModal)
 */

const EngagementSafeguards = (() => {
  'use strict';

  // ─── Configuration ──────────────────────────────────────────────────────

  const CONFIG = {
    // Low-balance nudge
    lowBalanceThreshold: 50,           // Show nudge when balance drops below this
    criticalBalanceThreshold: 10,      // Show urgent nudge
    nudgeCooldownMs: 5 * 60 * 1000,   // Don't show more than once per 5 minutes
    nudgeDismissCountMax: 3,           // After 3 dismissals per session, stop showing

    // Session time reality checks (responsible gambling)
    realityCheckIntervalMs: 30 * 60 * 1000,  // Every 30 minutes
    sessionWarningMs: 60 * 60 * 1000,        // Warning at 1 hour
    sessionCriticalMs: 2 * 60 * 60 * 1000,   // Strong warning at 2 hours

    // Win celebration upsell
    bigWinMultiplier: 20,              // Win >= 20x bet triggers celebration
    upsellCooldownMs: 10 * 60 * 1000, // Don't upsell more than once per 10 min
  };

  // ─── State ──────────────────────────────────────────────────────────────

  let sessionStartTime = Date.now();
  let lastNudgeTime = 0;
  let nudgeDismissCount = 0;
  let lastRealityCheckTime = Date.now();
  let lastUpsellTime = 0;
  let realityCheckTimer = null;
  let isInitialized = false;
  let sessionSpinCount = 0;
  let sessionPnL = 0;

  // ─── Low-Balance Deposit Nudge ──────────────────────────────────────────

  /**
   * Check balance and show nudge if appropriate.
   * Call this after every spin or balance change.
   */
  function checkLowBalance(currentBalance) {
    if (!currentBalance && currentBalance !== 0) return;
    if (typeof currentUser === 'undefined' || !currentUser) return;
    if (currentUser.isGuest) return; // Don't nudge guests to deposit

    const now = Date.now();

    // Cooldown check
    if (now - lastNudgeTime < CONFIG.nudgeCooldownMs) return;
    // Dismiss limit
    if (nudgeDismissCount >= CONFIG.nudgeDismissCountMax) return;

    if (currentBalance <= CONFIG.criticalBalanceThreshold) {
      showLowBalanceNudge('critical', currentBalance);
    } else if (currentBalance <= CONFIG.lowBalanceThreshold) {
      showLowBalanceNudge('low', currentBalance);
    }
  }

  function showLowBalanceNudge(severity, currentBalance) {
    // Don't stack nudges
    if (document.getElementById('low-balance-nudge')) return;

    lastNudgeTime = Date.now();

    const isCritical = severity === 'critical';
    const borderColor = isCritical ? 'rgba(255,70,70,0.5)' : 'rgba(249,202,36,0.5)';
    const accentColor = isCritical ? '#ff4646' : '#f9ca24';
    const title = isCritical
      ? 'Balance Running Low!'
      : 'Top Up Your Balance';
    const message = isCritical
      ? `You have <strong>$${currentBalance.toFixed(2)}</strong> remaining. Add funds to keep playing!`
      : `Your balance is <strong>$${currentBalance.toFixed(2)}</strong>. Top up to unlock bigger bets and jackpot chances!`;

    const nudge = document.createElement('div');
    nudge.id = 'low-balance-nudge';
    nudge.style.cssText = `
      position: fixed; bottom: 20px; right: 20px; z-index: 9999;
      max-width: 360px; width: calc(100vw - 40px);
      background: rgba(15,23,42,0.95); border: 1px solid ${borderColor};
      border-radius: 12px; padding: 20px; color: #e0e0e0;
      box-shadow: 0 8px 32px rgba(0,0,0,0.5);
      animation: slideInRight 0.4s ease-out;
      backdrop-filter: blur(10px);
    `;

    nudge.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:12px;">
        <div style="font-size:16px;font-weight:700;color:${accentColor};">${title}</div>
        <button onclick="EngagementSafeguards.dismissNudge()" style="background:none;border:none;color:#666;font-size:18px;cursor:pointer;padding:0;line-height:1;">×</button>
      </div>
      <p style="color:#aaa;font-size:13px;margin-bottom:16px;line-height:1.5;">${message}</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        <button onclick="EngagementSafeguards.dismissNudge()" style="padding:10px;background:rgba(255,255,255,0.08);color:#aaa;border:1px solid rgba(255,255,255,0.15);border-radius:8px;font-weight:600;cursor:pointer;font-size:13px;">Later</button>
        <button onclick="EngagementSafeguards.openDeposit()" style="padding:10px;background:linear-gradient(135deg,#f9ca24,#f0932b);color:#000;border:none;border-radius:8px;font-weight:700;cursor:pointer;font-size:13px;">Deposit Now</button>
      </div>
    `;

    document.body.appendChild(nudge);

    // Auto-dismiss after 15 seconds
    setTimeout(() => {
      const el = document.getElementById('low-balance-nudge');
      if (el) {
        el.style.animation = 'slideOutRight 0.3s ease-in forwards';
        setTimeout(() => el.remove(), 300);
      }
    }, 15000);
  }

  function dismissNudge() {
    nudgeDismissCount++;
    const el = document.getElementById('low-balance-nudge');
    if (el) {
      el.style.animation = 'slideOutRight 0.3s ease-in forwards';
      setTimeout(() => el.remove(), 300);
    }
  }

  function openDeposit() {
    dismissNudge();
    if (typeof MatrixMoney !== 'undefined' && MatrixMoney.showPurchaseModal) {
      MatrixMoney.showPurchaseModal();
    } else if (typeof showWalletModal === 'function') {
      showWalletModal();
    }
  }

  // ─── Session Time Reality Check (Responsible Gambling) ──────────────────

  function startRealityCheckTimer() {
    if (realityCheckTimer) clearInterval(realityCheckTimer);

    realityCheckTimer = setInterval(() => {
      const elapsed = Date.now() - sessionStartTime;
      const minutesPlayed = Math.floor(elapsed / 60000);

      // Check user-set session time limit
      checkSessionTimeLimit(minutesPlayed);

      // Periodic reality check
      if (Date.now() - lastRealityCheckTime >= CONFIG.realityCheckIntervalMs) {
        showRealityCheck(minutesPlayed, elapsed);
        lastRealityCheckTime = Date.now();
      }
    }, 60000); // Check every minute
  }

  function checkSessionTimeLimit(minutesPlayed) {
    // Check if user has a session_time limit set via profile
    try {
      const limitsStr = localStorage.getItem('matrixSpins_sessionLimit');
      if (limitsStr) {
        const limitMinutes = parseInt(limitsStr);
        if (!isNaN(limitMinutes) && limitMinutes > 0 && minutesPlayed >= limitMinutes) {
          showSessionLimitReached(minutesPlayed, limitMinutes);
        }
      }
    } catch (e) { /* ignore */ }
  }

  function showRealityCheck(minutesPlayed, elapsedMs) {
    // Don't show if user hasn't been active (no spins in this interval)
    if (sessionSpinCount === 0) return;

    // Only show at meaningful intervals (30 min, 1 hr, 2 hr, etc.)
    if (minutesPlayed < 30) return;

    // Don't stack reality checks
    if (document.getElementById('reality-check-modal')) return;

    const hours = Math.floor(minutesPlayed / 60);
    const mins = minutesPlayed % 60;
    const timeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins} minutes`;

    const isCritical = elapsedMs >= CONFIG.sessionCriticalMs;
    const isWarning = elapsedMs >= CONFIG.sessionWarningMs;

    const borderColor = isCritical ? 'rgba(255,70,70,0.4)' : isWarning ? 'rgba(249,202,36,0.4)' : 'rgba(86,210,160,0.3)';
    const titleColor = isCritical ? '#ff4646' : isWarning ? '#f9ca24' : '#56d2a0';
    const title = isCritical ? 'Extended Session' : isWarning ? 'Session Check-In' : 'Reality Check';

    const pnlColor = sessionPnL >= 0 ? '#56d2a0' : '#ff4646';
    const pnlSign = sessionPnL >= 0 ? '+' : '';

    const overlay = document.createElement('div');
    overlay.id = 'reality-check-modal';
    overlay.className = 'modal-overlay active';
    overlay.style.zIndex = '100000';

    overlay.innerHTML = `
      <div style="max-width:440px;width:100%;background:rgba(15,23,42,0.97);border:1px solid ${borderColor};border-radius:14px;padding:28px;color:#e0e0e0;text-align:center;">
        <div style="font-size:36px;margin-bottom:12px;">${isCritical ? '⏰' : '⏱'}</div>
        <h2 style="font-size:20px;margin-bottom:16px;color:${titleColor};font-weight:700;">${title}</h2>

        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:20px;">
          <div style="background:rgba(86,210,160,0.1);border-radius:8px;padding:12px;">
            <div style="color:#56d2a0;font-size:18px;font-weight:700;">${timeStr}</div>
            <div style="color:#888;font-size:11px;margin-top:4px;">Session Time</div>
          </div>
          <div style="background:rgba(86,210,160,0.1);border-radius:8px;padding:12px;">
            <div style="color:#56d2a0;font-size:18px;font-weight:700;">${sessionSpinCount}</div>
            <div style="color:#888;font-size:11px;margin-top:4px;">Spins</div>
          </div>
          <div style="background:rgba(86,210,160,0.1);border-radius:8px;padding:12px;">
            <div style="color:${pnlColor};font-size:18px;font-weight:700;">${pnlSign}$${Math.abs(sessionPnL).toFixed(2)}</div>
            <div style="color:#888;font-size:11px;margin-top:4px;">Profit/Loss</div>
          </div>
        </div>

        <p style="color:#aaa;font-size:13px;margin-bottom:20px;line-height:1.6;">
          ${isCritical
            ? 'You\'ve been playing for over 2 hours. Consider taking a break to stay in control of your gaming.'
            : isWarning
            ? 'You\'ve been playing for over an hour. Remember to play responsibly and take regular breaks.'
            : 'Here\'s a summary of your session so far. Remember, gaming should be fun!'}
        </p>

        ${isCritical ? `
        <div style="background:rgba(255,70,70,0.1);border-left:3px solid #ff4646;padding:10px 12px;border-radius:6px;margin-bottom:16px;text-align:left;font-size:12px;">
          <strong style="color:#ff4646;">Need help?</strong>
          <p style="color:#aaa;margin-top:4px;">If you feel gaming is becoming a problem, you can set deposit limits or self-exclude in your Profile settings.</p>
        </div>` : ''}

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          ${isCritical ? `
          <button onclick="document.getElementById('reality-check-modal').remove()" style="padding:12px;background:rgba(255,70,70,0.2);color:#ff4646;border:1px solid rgba(255,70,70,0.3);border-radius:8px;font-weight:700;cursor:pointer;font-size:13px;">Take a Break</button>
          <button onclick="document.getElementById('reality-check-modal').remove()" style="padding:12px;background:rgba(255,255,255,0.08);color:#aaa;border:1px solid rgba(255,255,255,0.15);border-radius:8px;font-weight:600;cursor:pointer;font-size:13px;">Continue</button>
          ` : `
          <button onclick="document.getElementById('reality-check-modal').remove()" style="padding:12px;background:rgba(255,255,255,0.08);color:#aaa;border:1px solid rgba(255,255,255,0.15);border-radius:8px;font-weight:600;cursor:pointer;font-size:13px;">Take a Break</button>
          <button onclick="document.getElementById('reality-check-modal').remove()" style="padding:12px;background:linear-gradient(135deg,#56d2a0,#4ecdc4);color:#000;border:none;border-radius:8px;font-weight:700;cursor:pointer;font-size:13px;">Continue Playing</button>
          `}
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
  }

  function showSessionLimitReached(minutesPlayed, limitMinutes) {
    if (document.getElementById('session-limit-modal')) return;

    const overlay = document.createElement('div');
    overlay.id = 'session-limit-modal';
    overlay.className = 'modal-overlay active';
    overlay.style.zIndex = '100001';

    overlay.innerHTML = `
      <div style="max-width:440px;width:100%;background:rgba(15,23,42,0.97);border:1px solid rgba(255,70,70,0.5);border-radius:14px;padding:28px;color:#e0e0e0;text-align:center;">
        <div style="font-size:36px;margin-bottom:12px;">🛑</div>
        <h2 style="font-size:20px;margin-bottom:16px;color:#ff4646;font-weight:700;">Session Limit Reached</h2>
        <p style="color:#aaa;font-size:14px;margin-bottom:20px;line-height:1.6;">
          You set a session time limit of <strong style="color:#f9ca24;">${limitMinutes} minutes</strong>.<br>
          You've been playing for <strong style="color:#ff4646;">${minutesPlayed} minutes</strong>.
        </p>
        <p style="color:#aaa;font-size:13px;margin-bottom:20px;">We recommend taking a break. Your progress is saved.</p>
        <button onclick="document.getElementById('session-limit-modal').remove()" style="width:100%;padding:12px;background:linear-gradient(135deg,#56d2a0,#4ecdc4);color:#000;border:none;border-radius:8px;font-weight:700;cursor:pointer;font-size:14px;">I Understand</button>
      </div>
    `;

    document.body.appendChild(overlay);
    // Clear the limit so it doesn't keep popping up every minute
    localStorage.removeItem('matrixSpins_sessionLimit');
  }

  // ─── Big Win Deposit Upsell ─────────────────────────────────────────────

  /**
   * Call after a spin result to check for big win upsell opportunity
   */
  function checkWinUpsell(betAmount, winAmount) {
    if (!betAmount || !winAmount || winAmount <= 0) return;
    if (typeof currentUser === 'undefined' || !currentUser) return;
    if (currentUser.isGuest) return;

    const multiplier = winAmount / betAmount;
    const now = Date.now();

    if (multiplier >= CONFIG.bigWinMultiplier && (now - lastUpsellTime) > CONFIG.upsellCooldownMs) {
      lastUpsellTime = now;
      // Show after a short delay so the win animation plays first
      setTimeout(() => showWinUpsell(winAmount, multiplier), 3000);
    }
  }

  function showWinUpsell(winAmount, multiplier) {
    if (document.getElementById('win-upsell-nudge')) return;

    const nudge = document.createElement('div');
    nudge.id = 'win-upsell-nudge';
    nudge.style.cssText = `
      position: fixed; bottom: 20px; right: 20px; z-index: 9999;
      max-width: 360px; width: calc(100vw - 40px);
      background: rgba(15,23,42,0.95); border: 1px solid rgba(86,210,160,0.5);
      border-radius: 12px; padding: 20px; color: #e0e0e0;
      box-shadow: 0 8px 32px rgba(86,210,160,0.2);
      animation: slideInRight 0.4s ease-out;
      backdrop-filter: blur(10px);
    `;

    nudge.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:12px;">
        <div style="font-size:16px;font-weight:700;color:#56d2a0;">You're On a Roll!</div>
        <button onclick="document.getElementById('win-upsell-nudge').remove()" style="background:none;border:none;color:#666;font-size:18px;cursor:pointer;padding:0;line-height:1;">×</button>
      </div>
      <p style="color:#aaa;font-size:13px;margin-bottom:16px;line-height:1.5;">
        Amazing <strong style="color:#f9ca24;">${Math.round(multiplier)}x</strong> win of <strong style="color:#56d2a0;">$${winAmount.toFixed(2)}</strong>! Top up now while your luck is hot!
      </p>
      <button onclick="EngagementSafeguards.openDeposit(); document.getElementById('win-upsell-nudge').remove();" style="width:100%;padding:10px;background:linear-gradient(135deg,#f9ca24,#f0932b);color:#000;border:none;border-radius:8px;font-weight:700;cursor:pointer;font-size:13px;">Deposit & Play More</button>
    `;

    document.body.appendChild(nudge);

    // Auto-dismiss after 10 seconds
    setTimeout(() => {
      const el = document.getElementById('win-upsell-nudge');
      if (el) {
        el.style.animation = 'slideOutRight 0.3s ease-in forwards';
        setTimeout(() => el.remove(), 300);
      }
    }, 10000);
  }

  // ─── Spin Tracking Hook ─────────────────────────────────────────────────

  /**
   * Call after every spin completes with the result.
   * Tracks session stats and triggers appropriate nudges.
   */
  function onSpinComplete(betAmount, winAmount, newBalance) {
    sessionSpinCount++;
    sessionPnL += (winAmount - betAmount);

    // Check low balance
    checkLowBalance(newBalance);

    // Check big win upsell
    if (winAmount > 0) {
      checkWinUpsell(betAmount, winAmount);
    }
  }

  // ─── Initialization ─────────────────────────────────────────────────────

  function init() {
    if (isInitialized) return;
    isInitialized = true;

    sessionStartTime = Date.now();
    lastRealityCheckTime = Date.now();

    // Start reality check timer
    startRealityCheckTimer();

    // Inject CSS animations
    if (!document.getElementById('engagement-safeguards-css')) {
      const style = document.createElement('style');
      style.id = 'engagement-safeguards-css';
      style.textContent = `
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        @keyframes slideOutRight {
          from { transform: translateX(0);    opacity: 1; }
          to   { transform: translateX(100%); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }

    // Listen for spin:complete events dispatched by ui-slot.js
    window.addEventListener('spin:complete', (e) => {
      const detail = e.detail || {};
      const betAmount = detail.betAmount || 0;
      const winAmount = detail.winAmount || 0;
      const currentBalance = typeof balance !== 'undefined' ? balance : 0;
      onSpinComplete(betAmount, winAmount, currentBalance);
    });

    // Listen for session time limit changes from profile settings
    window.addEventListener('storage', (e) => {
      if (e.key === 'matrixSpins_sessionLimit' && e.newValue) {
        // User set a new limit; it will be checked by the interval
      }
    });

    console.log('[EngagementSafeguards] Initialized');
  }

  // ─── Public API ─────────────────────────────────────────────────────────

  return {
    init,
    onSpinComplete,
    checkLowBalance,
    dismissNudge,
    openDeposit,
    // Expose for testing
    getSessionStats: () => ({
      startTime: sessionStartTime,
      spinCount: sessionSpinCount,
      pnl: sessionPnL,
      minutesPlayed: Math.floor((Date.now() - sessionStartTime) / 60000)
    })
  };
})();

// Auto-initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  EngagementSafeguards.init();
});
