(function() {
  'use strict';

  // Configuration
  const LOSS_THRESHOLDS = [
    { threshold: 50, rate: 0.25, tier: '25' },
    { threshold: 100, rate: 0.35, tier: '35' },
    { threshold: 250, rate: 0.50, tier: '50' }
  ];

  // Session state (resets on page refresh)
  let sessionLosses = 0;
  let shownTiers = new Set();
  let isInitialized = false;

  /**
   * Helper to make authenticated API requests
   */
  async function api(path, opts = {}) {
    if (typeof apiRequest === 'function') return apiRequest(path, opts);
    const tokenKey = typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken';
    const token = localStorage.getItem(tokenKey);
    if (!token) return null;
    const res = await fetch(path, {
      ...opts,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
        ...(opts.headers || {})
      }
    });
    return res.json();
  }

  /**
   * Inject popup styles
   */
  function injectStyles() {
    if (document.getElementById('loss-cashback-styles')) {
      return;
    }

    const style = document.createElement('style');
    style.id = 'loss-cashback-styles';
    style.textContent = `
      .loss-cashback-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.6);
        backdrop-filter: blur(4px);
        -webkit-backdrop-filter: blur(4px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        animation: fadeIn 0.3s ease-out;
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }

      .loss-cashback-popup {
        background: linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.05) 100%);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 16px;
        padding: 40px;
        max-width: 420px;
        width: 90%;
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        text-align: center;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
        animation: slideUp 0.4s ease-out;
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

      .loss-cashback-title {
        color: #ffd700;
        font-size: 28px;
        font-weight: 700;
        margin-bottom: 12px;
        text-shadow: 0 2px 8px rgba(255, 215, 0, 0.3);
      }

      .loss-cashback-subtitle {
        color: rgba(255, 255, 255, 0.9);
        font-size: 16px;
        margin-bottom: 24px;
        line-height: 1.5;
      }

      .loss-cashback-stats {
        background: rgba(255, 255, 255, 0.05);
        border-radius: 10px;
        padding: 16px;
        margin-bottom: 24px;
        border: 1px solid rgba(255, 215, 0, 0.2);
      }

      .loss-cashback-stat-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
        color: rgba(255, 255, 255, 0.8);
        font-size: 14px;
      }

      .loss-cashback-stat-row:last-child {
        margin-bottom: 0;
      }

      .loss-cashback-stat-label {
        text-align: left;
      }

      .loss-cashback-stat-value {
        color: #ffd700;
        font-weight: 600;
      }

      .loss-cashback-buttons {
        display: flex;
        gap: 12px;
        justify-content: center;
        flex-wrap: wrap;
      }

      .loss-cashback-claim-btn {
        flex: 1;
        min-width: 140px;
        background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
        color: #1a1a2e;
        border: none;
        border-radius: 8px;
        padding: 14px 24px;
        font-size: 15px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
        box-shadow: 0 4px 15px rgba(255, 215, 0, 0.3);
      }

      .loss-cashback-claim-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(255, 215, 0, 0.4);
      }

      .loss-cashback-claim-btn:active {
        transform: translateY(0);
      }

      .loss-cashback-dismiss-btn {
        flex: 1;
        min-width: 140px;
        background: rgba(255, 255, 255, 0.1);
        color: rgba(255, 255, 255, 0.8);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 8px;
        padding: 14px 24px;
        font-size: 15px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
      }

      .loss-cashback-dismiss-btn:hover {
        background: rgba(255, 255, 255, 0.15);
        border-color: rgba(255, 255, 255, 0.3);
      }

      .loss-cashback-close-icon {
        position: absolute;
        top: 16px;
        right: 16px;
        width: 28px;
        height: 28px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        color: rgba(255, 255, 255, 0.6);
        font-size: 20px;
        transition: color 0.2s ease;
      }

      .loss-cashback-close-icon:hover {
        color: rgba(255, 255, 255, 0.9);
      }
    `;

    document.head.appendChild(style);
  }

  /**
   * Get the current cashback tier based on session losses
   */
  function getCurrentTier() {
    for (let i = LOSS_THRESHOLDS.length - 1; i >= 0; i--) {
      if (sessionLosses >= LOSS_THRESHOLDS[i].threshold) {
        return LOSS_THRESHOLDS[i];
      }
    }
    return null;
  }

  /**
   * Show the cashback popup
   */
  function showPopup(tier) {
    if (shownTiers.has(tier.tier)) {
      return; // Already shown this tier in this session
    }

    injectStyles();

    const overlay = document.createElement('div');
    overlay.className = 'loss-cashback-overlay';
    overlay.id = 'loss-cashback-overlay-' + tier.tier;

    const popup = document.createElement('div');
    popup.className = 'loss-cashback-popup';
    popup.style.position = 'relative';

    const closeIcon = document.createElement('div');
    closeIcon.className = 'loss-cashback-close-icon';
    closeIcon.innerHTML = '×';
    closeIcon.addEventListener('click', function() {
      closePopup(overlay);
    });
    popup.appendChild(closeIcon);

    const title = document.createElement('h2');
    title.className = 'loss-cashback-title';
    title.textContent = tier.rate * 100 + '% Cashback Available';
    popup.appendChild(title);

    const subtitle = document.createElement('p');
    subtitle.className = 'loss-cashback-subtitle';
    subtitle.textContent = 'Your session losses have reached $' + tier.threshold.toFixed(2) + '! Claim your cashback on your next deposit.';
    popup.appendChild(subtitle);

    const stats = document.createElement('div');
    stats.className = 'loss-cashback-stats';

    const lossesRow = document.createElement('div');
    lossesRow.className = 'loss-cashback-stat-row';
    lossesRow.innerHTML = '<span class="loss-cashback-stat-label">Session Losses</span>' +
                          '<span class="loss-cashback-stat-value">$' + sessionLosses.toFixed(2) + '</span>';
    stats.appendChild(lossesRow);

    const tierRow = document.createElement('div');
    tierRow.className = 'loss-cashback-stat-row';
    tierRow.innerHTML = '<span class="loss-cashback-stat-label">Cashback Tier</span>' +
                        '<span class="loss-cashback-stat-value">' + tier.rate * 100 + '%</span>';
    stats.appendChild(tierRow);

    popup.appendChild(stats);

    const buttons = document.createElement('div');
    buttons.className = 'loss-cashback-buttons';

    const claimBtn = document.createElement('button');
    claimBtn.className = 'loss-cashback-claim-btn';
    claimBtn.textContent = 'Go to Deposit';
    claimBtn.addEventListener('click', function() {
      // Navigate to deposit section
      const depositSection = document.getElementById('deposit-section') || document.querySelector('[data-section="deposit"]');
      if (depositSection) {
        depositSection.scrollIntoView({ behavior: 'smooth' });
      } else {
        // Fallback: try to navigate via app router or trigger event
        if (typeof window.navigateToSection === 'function') {
          window.navigateToSection('deposit');
        }
      }
      closePopup(overlay);
    });
    buttons.appendChild(claimBtn);

    const dismissBtn = document.createElement('button');
    dismissBtn.className = 'loss-cashback-dismiss-btn';
    dismissBtn.textContent = 'Dismiss';
    dismissBtn.addEventListener('click', function() {
      closePopup(overlay);
    });
    buttons.appendChild(dismissBtn);

    popup.appendChild(buttons);
    overlay.appendChild(popup);

    document.body.appendChild(overlay);

    // Mark this tier as shown
    shownTiers.add(tier.tier);
  }

  /**
   * Close the popup with animation
   */
  function closePopup(overlay) {
    overlay.style.animation = 'fadeIn 0.3s ease-out reverse';
    setTimeout(function() {
      overlay.remove();
    }, 300);
  }

  /**
   * Handle spin:complete event to track losses
   */
  function onSpinComplete(event) {
    const detail = event.detail || {};
    const betAmount = parseFloat(detail.bet) || 0;
    const winAmount = parseFloat(detail.win) || 0;

    if (betAmount > 0) {
      const loss = betAmount - winAmount;
      if (loss > 0) {
        sessionLosses += loss;
      }

      // Check if we've crossed a new tier threshold
      const currentTier = getCurrentTier();
      if (currentTier && !shownTiers.has(currentTier.tier)) {
        showPopup(currentTier);
      }
    }
  }

  /**
   * Initialize the loss cashback module
   */
  function init() {
    if (isInitialized) {
      return;
    }

    injectStyles();

    // Listen for spin:complete events
    document.addEventListener('spin:complete', onSpinComplete);

    isInitialized = true;

    console.warn('[LossCashback] Initialized - tracking session losses');
  }

  /**
   * Get current session stats (for debugging/display)
   */
  function getSessionStats() {
    return {
      losses: sessionLosses,
      currentTier: getCurrentTier(),
      shownTiers: Array.from(shownTiers)
    };
  }

  /**
   * Expose public API
   */
  window.LossCashback = {
    init: init,
    getSessionStats: getSessionStats
  };

})();
