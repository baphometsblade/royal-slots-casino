/**
 * Smart Loss-Streak Intervention System
 * Detects players on losing streaks and intervenes with tailored offers
 * Includes three intervention tiers with escalating urgency
 * Tracks balance drain and offers deposit incentives
 */

(function() {
  'use strict';

  var state = {
    consecutiveLosses: 0,
    totalLossAmount: 0,
    currentBet: 0,
    sessionPeakBalance: 0,
    currentBalance: 0,
    interventionsShown: 0,
    lastInterventionTime: 0,
    lastGameCategory: 'slots'
  };

  var INTERVENTION_COOLDOWN = 60000; // 60 seconds between interventions
  var MAX_INTERVENTIONS_PER_SESSION = 3;
  var LOSS_THRESHOLD_TIER_1 = 5;
  var LOSS_THRESHOLD_TIER_2 = 10;
  var LOSS_THRESHOLD_TIER_3 = 15;
  var LOW_BALANCE_THRESHOLD = 0.2; // 20% of session peak
  var TIER_1_AUTO_DISMISS = 8000; // 8 seconds

  /**
   * Initialize the module
   */
  function init() {
    state.consecutiveLosses = 0;
    state.totalLossAmount = 0;
    state.currentBet = 0;
    state.sessionPeakBalance = 0;
    state.currentBalance = 0;
    state.interventionsShown = 0;
    state.lastInterventionTime = 0;

    injectStyles();

    console.warn('[LossStreakIntervention] Module initialized');
  }

  /**
   * Inject CSS styles for all intervention UIs
   */
  function injectStyles() {
    if (document.getElementById('loss-streak-intervention-styles')) {
      return;
    }

    var style = document.createElement('style');
    style.id = 'loss-streak-intervention-styles';
    style.textContent = `
      /* Cooling Off Banner (Tier 1) */
      .loss-streak-banner {
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
        border: 2px solid #00ff88;
        border-radius: 12px;
        padding: 16px 24px;
        max-width: 500px;
        width: calc(100% - 40px);
        z-index: 9990;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        box-shadow: 0 8px 32px rgba(0, 255, 136, 0.2);
        animation: slideInUp 0.5s ease-out;
      }

      .loss-streak-banner-text {
        color: #ffffff;
        font-size: 15px;
        font-weight: 500;
        line-height: 1.4;
      }

      .loss-streak-banner-suggestion {
        color: #00ff88;
        font-weight: 600;
        margin-top: 8px;
      }

      /* Lucky Boost Modal (Tier 2) */
      .loss-streak-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.75);
        backdrop-filter: blur(6px);
        -webkit-backdrop-filter: blur(6px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9990;
        animation: fadeIn 0.3s ease-out;
      }

      .loss-streak-modal {
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
        border: 2px solid #ff6b6b;
        border-radius: 16px;
        padding: 40px;
        max-width: 480px;
        width: 90%;
        text-align: center;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        box-shadow: 0 20px 60px rgba(255, 107, 107, 0.3);
        animation: popIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
      }

      .loss-streak-modal-title {
        color: #ff6b6b;
        font-size: 28px;
        font-weight: 700;
        margin-bottom: 12px;
      }

      .loss-streak-modal-subtitle {
        color: #cccccc;
        font-size: 14px;
        margin-bottom: 24px;
        line-height: 1.5;
      }

      .loss-streak-boost-section {
        background: rgba(255, 107, 107, 0.1);
        border: 2px dashed #ff6b6b;
        border-radius: 12px;
        padding: 20px;
        margin-bottom: 24px;
      }

      .loss-streak-boost-icon {
        font-size: 32px;
        margin-bottom: 12px;
      }

      .loss-streak-boost-text {
        color: #00ff88;
        font-size: 16px;
        font-weight: 600;
        margin-bottom: 8px;
      }

      .loss-streak-boost-details {
        color: #aaaaaa;
        font-size: 13px;
        line-height: 1.4;
      }

      .loss-streak-button-group {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .loss-streak-button {
        padding: 14px 24px;
        border: none;
        border-radius: 8px;
        font-size: 15px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
        font-family: inherit;
      }

      .loss-streak-button-primary {
        background: linear-gradient(135deg, #ff6b6b 0%, #ff5252 100%);
        color: #ffffff;
      }

      .loss-streak-button-primary:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 20px rgba(255, 107, 107, 0.4);
      }

      .loss-streak-button-secondary {
        background: rgba(0, 255, 136, 0.15);
        color: #00ff88;
        border: 1px solid #00ff88;
      }

      .loss-streak-button-secondary:hover {
        background: rgba(0, 255, 136, 0.25);
        transform: translateY(-2px);
      }

      .loss-streak-button-tertiary {
        background: transparent;
        color: #aaaaaa;
        border: 1px solid #555555;
        font-size: 14px;
      }

      .loss-streak-button-tertiary:hover {
        color: #cccccc;
        border-color: #777777;
      }

      /* Recovery Package (Tier 3) */
      .loss-streak-fullscreen-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.85);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9990;
        animation: fadeIn 0.3s ease-out;
      }

      .loss-streak-recovery-modal {
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
        border: 3px solid #ff6b6b;
        border-radius: 20px;
        padding: 50px;
        max-width: 520px;
        width: 90%;
        text-align: center;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        box-shadow: 0 30px 80px rgba(255, 107, 107, 0.4);
        animation: scaleIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
      }

      .loss-streak-recovery-title {
        color: #ff6b6b;
        font-size: 32px;
        font-weight: 700;
        margin-bottom: 16px;
      }

      .loss-streak-recovery-subtitle {
        color: #aaaaaa;
        font-size: 15px;
        margin-bottom: 32px;
        line-height: 1.6;
      }

      .loss-streak-options {
        display: flex;
        flex-direction: column;
        gap: 14px;
      }

      .loss-streak-option {
        padding: 18px;
        border-radius: 12px;
        border: 2px solid rgba(0, 255, 136, 0.2);
        background: rgba(0, 255, 136, 0.05);
        cursor: pointer;
        transition: all 0.3s ease;
        text-align: left;
      }

      .loss-streak-option.highlighted {
        border-color: #ff6b6b;
        background: rgba(255, 107, 107, 0.15);
      }

      .loss-streak-option:hover {
        border-color: #00ff88;
        background: rgba(0, 255, 136, 0.1);
        transform: translateX(4px);
      }

      .loss-streak-option-title {
        color: #00ff88;
        font-weight: 600;
        font-size: 16px;
        margin-bottom: 6px;
      }

      .loss-streak-option.highlighted .loss-streak-option-title {
        color: #ff6b6b;
      }

      .loss-streak-option-description {
        color: #aaaaaa;
        font-size: 13px;
        line-height: 1.4;
      }

      /* Low Balance Alert */
      .loss-streak-low-balance-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        backdrop-filter: blur(6px);
        -webkit-backdrop-filter: blur(6px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9990;
        animation: fadeIn 0.3s ease-out;
      }

      .loss-streak-low-balance-modal {
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
        border: 2px solid #ff6b6b;
        border-radius: 16px;
        padding: 36px;
        max-width: 420px;
        width: 90%;
        text-align: center;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        box-shadow: 0 20px 60px rgba(255, 107, 107, 0.3);
        animation: slideUp 0.5s ease-out;
      }

      .loss-streak-low-balance-icon {
        font-size: 48px;
        margin-bottom: 16px;
      }

      .loss-streak-low-balance-title {
        color: #ff6b6b;
        font-size: 24px;
        font-weight: 700;
        margin-bottom: 12px;
      }

      .loss-streak-low-balance-text {
        color: #cccccc;
        font-size: 14px;
        margin-bottom: 24px;
        line-height: 1.5;
      }

      .loss-streak-low-balance-cta {
        background: linear-gradient(135deg, #ff6b6b 0%, #ff5252 100%);
        color: #ffffff;
        padding: 14px 24px;
        border: none;
        border-radius: 8px;
        font-size: 15px;
        font-weight: 600;
        cursor: pointer;
        margin-bottom: 12px;
        transition: all 0.3s ease;
        width: 100%;
      }

      .loss-streak-low-balance-cta:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 20px rgba(255, 107, 107, 0.4);
      }

      .loss-streak-low-balance-link {
        color: #00ff88;
        font-size: 13px;
        text-decoration: none;
        cursor: pointer;
        transition: color 0.3s ease;
      }

      .loss-streak-low-balance-link:hover {
        color: #00ff99;
      }

      .loss-streak-close-btn {
        position: absolute;
        top: 16px;
        right: 16px;
        background: transparent;
        border: none;
        color: #aaaaaa;
        font-size: 28px;
        cursor: pointer;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: color 0.3s ease;
      }

      .loss-streak-close-btn:hover {
        color: #ffffff;
      }

      @keyframes slideInUp {
        from {
          transform: translateX(-50%) translateY(20px);
          opacity: 0;
        }
        to {
          transform: translateX(-50%) translateY(0);
          opacity: 1;
        }
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }

      @keyframes popIn {
        0% {
          transform: scale(0.85);
          opacity: 0;
        }
        100% {
          transform: scale(1);
          opacity: 1;
        }
      }

      @keyframes scaleIn {
        0% {
          transform: scale(0.8);
          opacity: 0;
        }
        100% {
          transform: scale(1);
          opacity: 1;
        }
      }

      @keyframes slideUp {
        from {
          transform: translateY(30px);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }
    `;

    document.head.appendChild(style);
  }

  /**
   * Check if we should suppress UI (QA mode)
   */
  function shouldSuppressUI() {
    return window._qaMode === true;
  }

  /**
   * Check if we can show another intervention
   */
  function canShowIntervention() {
    // Don't exceed max interventions per session
    if (state.interventionsShown >= MAX_INTERVENTIONS_PER_SESSION) {
      return false;
    }

    // Enforce cooldown period
    var timeSinceLastIntervention = Date.now() - state.lastInterventionTime;
    if (timeSinceLastIntervention < INTERVENTION_COOLDOWN) {
      return false;
    }

    return true;
  }

  /**
   * Track intervention as shown
   */
  function recordInterventionShown() {
    state.interventionsShown++;
    state.lastInterventionTime = Date.now();

    if (typeof window.FunnelTracker !== 'undefined' && window.FunnelTracker.trackEvent) {
      try {
        window.FunnelTracker.trackEvent('loss_intervention_shown', state.consecutiveLosses);
      } catch (e) {
        console.warn('[LossStreakIntervention] FunnelTracker error:', e.message);
      }
    }
  }

  /**
   * Tier 1: Cooling Off - Subtle bottom banner (5 consecutive losses)
   */
  function showCoolingOffBanner() {
    if (shouldSuppressUI() || !canShowIntervention()) {
      return;
    }

    recordInterventionShown();

    var banner = document.createElement('div');
    banner.className = 'loss-streak-banner';
    banner.innerHTML = '<div class="loss-streak-banner-text">Take a breath. Maybe try <span class="loss-streak-banner-suggestion">' + getAlternativeGameCategory() + '</span> for a change of luck?</div>';

    document.body.appendChild(banner);

    // Auto-dismiss after 8 seconds
    setTimeout(function() {
      if (banner.parentNode) {
        banner.remove();
      }
    }, TIER_1_AUTO_DISMISS);

    console.warn('[LossStreakIntervention] Tier 1 (Cooling Off) shown at ' + state.consecutiveLosses + ' losses');
  }

  /**
   * Get an alternative game category
   */
  function getAlternativeGameCategory() {
    var alternatives = {
      'slots': 'table games',
      'table': 'slots',
      'roulette': 'blackjack',
      'blackjack': 'roulette',
      'crash': 'slots',
      'other': 'a different game'
    };

    var current = state.lastGameCategory || 'slots';
    return alternatives[current] || 'a different game';
  }

  /**
   * Tier 2: Lucky Boost - Modal with multiplier offer (10 consecutive losses)
   */
  function showLuckyBoostModal() {
    if (shouldSuppressUI() || !canShowIntervention()) {
      return;
    }

    recordInterventionShown();

    var overlay = document.createElement('div');
    overlay.className = 'loss-streak-overlay';

    var modal = document.createElement('div');
    modal.className = 'loss-streak-modal';

    modal.innerHTML = '<div class="loss-streak-modal-title">🍀 Lucky Boost!</div>' +
      '<div class="loss-streak-modal-subtitle">Tough streak? Here\'s a helping hand.</div>' +
      '<div class="loss-streak-boost-section">' +
      '<div class="loss-streak-boost-icon">⭐</div>' +
      '<div class="loss-streak-boost-text">1.5x MULTIPLIER on next 3 spins</div>' +
      '<div class="loss-streak-boost-details">All wins get a 50% boost to help turn things around</div>' +
      '</div>' +
      '<div class="loss-streak-button-group">' +
      '<button class="loss-streak-button loss-streak-button-primary" id="lsi-activate-boost">Activate Boost</button>' +
      '<button class="loss-streak-button loss-streak-button-secondary" id="lsi-deposit-offer">Deposit for Better Odds</button>' +
      '<button class="loss-streak-button loss-streak-button-tertiary" id="lsi-close-tier2">No Thanks</button>' +
      '</div>';

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Event handlers using closures
    var activateBtn = modal.querySelector('#lsi-activate-boost');
    if (activateBtn) {
      activateBtn.addEventListener('click', function() {
        window._lossStreakBoost = {
          spinsLeft: 3,
          multiplier: 1.5
        };

        if (typeof window.ABTesting !== 'undefined' && window.ABTesting.trackConversion) {
          try {
            window.ABTesting.trackConversion('loss_message_tone');
          } catch (e) {
            console.warn('[LossStreakIntervention] ABTesting error:', e.message);
          }
        }

        overlay.remove();
        console.warn('[LossStreakIntervention] Lucky Boost activated');
      });
    }

    var depositBtn = modal.querySelector('#lsi-deposit-offer');
    if (depositBtn) {
      depositBtn.addEventListener('click', function() {
        if (typeof window.UIModals !== 'undefined' && window.UIModals.showDepositModal) {
          window.UIModals.showDepositModal();
        }
        overlay.remove();
      });
    }

    var closeBtn = modal.querySelector('#lsi-close-tier2');
    if (closeBtn) {
      closeBtn.addEventListener('click', function() {
        overlay.remove();
      });
    }

    console.warn('[LossStreakIntervention] Tier 2 (Lucky Boost) shown at ' + state.consecutiveLosses + ' losses');
  }

  /**
   * Tier 3: Recovery Package - Full-screen with multiple options (15 consecutive losses)
   */
  function showRecoveryPackageModal() {
    if (shouldSuppressUI() || !canShowIntervention()) {
      return;
    }

    recordInterventionShown();

    var overlay = document.createElement('div');
    overlay.className = 'loss-streak-fullscreen-overlay';

    var modal = document.createElement('div');
    modal.className = 'loss-streak-recovery-modal';

    var hasRecentDeposit = checkRecentDeposit();
    var optionBClass = !hasRecentDeposit ? 'highlighted' : '';

    modal.innerHTML = '<div class="loss-streak-recovery-title">We\'ve Got Your Back! 💪</div>' +
      '<div class="loss-streak-recovery-subtitle">Choose your recovery path and get back in the game stronger.</div>' +
      '<div class="loss-streak-options">' +
      '<div class="loss-streak-option" id="lsi-option-a">' +
      '<div class="loss-streak-option-title">🎁 Free 50 Coins</div>' +
      '<div class="loss-streak-option-description">Play immediately with instant bonus coins</div>' +
      '</div>' +
      '<div class="loss-streak-option ' + optionBClass + '" id="lsi-option-b">' +
      '<div class="loss-streak-option-title">💰 200% Deposit Match</div>' +
      '<div class="loss-streak-option-description">Deposit $10, get $30 to play with</div>' +
      '</div>' +
      '<div class="loss-streak-option" id="lsi-option-c">' +
      '<div class="loss-streak-option-title">⏸️ Take a Break</div>' +
      '<div class="loss-streak-option-description">15-minute cooldown to clear your head</div>' +
      '</div>' +
      '</div>';

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Option A: Free coins
    var optionA = modal.querySelector('#lsi-option-a');
    if (optionA) {
      optionA.addEventListener('click', function() {
        if (typeof window.ABTesting !== 'undefined' && window.ABTesting.trackConversion) {
          try {
            window.ABTesting.trackConversion('loss_streak_recovery', { choice: 'free_coins' });
          } catch (e) {
            console.warn('[LossStreakIntervention] ABTesting error:', e.message);
          }
        }

        // Award coins to player
        if (typeof window.PlayerWallet !== 'undefined' && window.PlayerWallet.addBonus) {
          window.PlayerWallet.addBonus(50, 'loss_streak_recovery_free_coins');
        }

        overlay.remove();
        console.warn('[LossStreakIntervention] Recovery Package: Free coins selected');
      });
    }

    // Option B: Deposit match
    var optionB = modal.querySelector('#lsi-option-b');
    if (optionB) {
      optionB.addEventListener('click', function() {
        if (typeof window.ABTesting !== 'undefined' && window.ABTesting.trackConversion) {
          try {
            window.ABTesting.trackConversion('loss_streak_recovery', { choice: 'deposit_match' });
          } catch (e) {
            console.warn('[LossStreakIntervention] ABTesting error:', e.message);
          }
        }

        if (typeof window.UIModals !== 'undefined' && window.UIModals.showDepositModal) {
          window.UIModals.showDepositModal();
        }

        overlay.remove();
        console.warn('[LossStreakIntervention] Recovery Package: Deposit match selected');
      });
    }

    // Option C: Take a break
    var optionC = modal.querySelector('#lsi-option-c');
    if (optionC) {
      optionC.addEventListener('click', function() {
        if (typeof window.ABTesting !== 'undefined' && window.ABTesting.trackConversion) {
          try {
            window.ABTesting.trackConversion('loss_streak_recovery', { choice: 'break' });
          } catch (e) {
            console.warn('[LossStreakIntervention] ABTesting error:', e.message);
          }
        }

        // Trigger cooldown
        showCooldownTimer(15 * 60); // 15 minutes

        overlay.remove();
        console.warn('[LossStreakIntervention] Recovery Package: Cooldown selected');
      });
    }

    console.warn('[LossStreakIntervention] Tier 3 (Recovery Package) shown at ' + state.consecutiveLosses + ' losses');
  }

  /**
   * Check if player has deposited recently
   */
  function checkRecentDeposit() {
    var lastDepositTime = localStorage.getItem('lastDepositTime');
    if (!lastDepositTime) {
      return false;
    }

    var depositTime = parseInt(lastDepositTime, 10);
    var hoursSinceDeposit = (Date.now() - depositTime) / (1000 * 60 * 60);

    return hoursSinceDeposit < 24; // Recently = within 24 hours
  }

  /**
   * Show cooldown timer modal
   */
  function showCooldownTimer(seconds) {
    var overlay = document.createElement('div');
    overlay.className = 'loss-streak-overlay';

    var modal = document.createElement('div');
    modal.className = 'loss-streak-modal';
    modal.style.minWidth = '300px';

    var remaining = seconds;
    var timerEl = document.createElement('div');
    timerEl.style.fontSize = '48px';
    timerEl.style.fontWeight = '700';
    timerEl.style.color = '#00ff88';
    timerEl.style.marginBottom = '16px';

    modal.innerHTML = '<div class="loss-streak-modal-title">Taking a Break 🧘</div>' +
      '<div class="loss-streak-modal-subtitle">Take some time to relax. You\'ll be back in:</div>';

    modal.appendChild(timerEl);

    modal.innerHTML += '<div class="loss-streak-modal-subtitle" style="margin-top: 16px;">We recommend setting a loss limit next time to keep things fun.</div>';

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    function updateTimer() {
      var mins = Math.floor(remaining / 60);
      var secs = remaining % 60;
      timerEl.textContent = (mins < 10 ? '0' : '') + mins + ':' + (secs < 10 ? '0' : '') + secs;

      if (remaining <= 0) {
        overlay.remove();
        console.warn('[LossStreakIntervention] Cooldown period ended');
        return;
      }

      remaining--;
      setTimeout(updateTimer, 1000);
    }

    updateTimer();
  }

  /**
   * Show low balance alert
   */
  function showLowBalanceAlert() {
    if (shouldSuppressUI() || !canShowIntervention()) {
      return;
    }

    recordInterventionShown();

    var overlay = document.createElement('div');
    overlay.className = 'loss-streak-low-balance-overlay';

    var modal = document.createElement('div');
    modal.className = 'loss-streak-low-balance-modal';
    modal.style.position = 'relative';

    modal.innerHTML = '<button class="loss-streak-close-btn" id="lsi-low-balance-close">&times;</button>' +
      '<div class="loss-streak-low-balance-icon">⚠️</div>' +
      '<div class="loss-streak-low-balance-title">Balance Getting Low</div>' +
      '<div class="loss-streak-low-balance-text">Your balance is only ' + Math.round(state.currentBalance) + ' coins. Top up now with a 150% match!</div>' +
      '<button class="loss-streak-low-balance-cta" id="lsi-low-balance-deposit">Top Up Now</button>' +
      '<a href="javascript:void(0);" class="loss-streak-low-balance-link" id="lsi-low-balance-continue">Continue Playing</a>';

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    var depositBtn = modal.querySelector('#lsi-low-balance-deposit');
    if (depositBtn) {
      depositBtn.addEventListener('click', function() {
        if (typeof window.UIModals !== 'undefined' && window.UIModals.showDepositModal) {
          window.UIModals.showDepositModal();
        }
        overlay.remove();
      });
    }

    var closeBtn = modal.querySelector('#lsi-low-balance-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', function() {
        overlay.remove();
      });
    }

    var continueLink = modal.querySelector('#lsi-low-balance-continue');
    if (continueLink) {
      continueLink.addEventListener('click', function() {
        overlay.remove();
      });
    }

    console.warn('[LossStreakIntervention] Low balance alert shown (balance: ' + state.currentBalance + ')');
  }

  /**
   * Process spin result and trigger interventions
   */
  function onSpinResult(result) {
    if (!result || typeof result !== 'object') {
      return;
    }

    // Update state
    state.currentBet = result.bet || 0;
    state.currentBalance = result.balance || 0;

    // Track session peak balance
    if (state.currentBalance > state.sessionPeakBalance || state.sessionPeakBalance === 0) {
      state.sessionPeakBalance = state.currentBalance;
    }

    // Handle win
    if (result.won) {
      reset();
      console.warn('[LossStreakIntervention] Win detected, streak reset');
      return;
    }

    // Handle loss
    state.consecutiveLosses++;
    state.totalLossAmount += result.bet || 0;

    console.warn('[LossStreakIntervention] Loss #' + state.consecutiveLosses + ', total lost: ' + state.totalLossAmount);

    // Check low balance alert (before other interventions)
    if (state.sessionPeakBalance > 0) {
      var balanceRatio = state.currentBalance / state.sessionPeakBalance;
      if (balanceRatio < LOW_BALANCE_THRESHOLD && balanceRatio > 0) {
        showLowBalanceAlert();
        return; // Show only one intervention per spin
      }
    }

    // Trigger interventions based on loss count
    if (state.consecutiveLosses === LOSS_THRESHOLD_TIER_1) {
      showCoolingOffBanner();
    } else if (state.consecutiveLosses === LOSS_THRESHOLD_TIER_2) {
      showLuckyBoostModal();
    } else if (state.consecutiveLosses === LOSS_THRESHOLD_TIER_3) {
      showRecoveryPackageModal();
    }
  }

  /**
   * Reset streak state (called after a win or deposit)
   */
  function reset() {
    state.consecutiveLosses = 0;
    state.totalLossAmount = 0;
  }

  /**
   * Public API
   */
  window.LossStreakIntervention = {
    init: init,
    onSpinResult: onSpinResult,
    reset: reset,
    getState: function() {
      return Object.assign({}, state);
    }
  };

})();
