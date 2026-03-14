'use strict';

/**
 * Jackpot Ticker Component
 * Displays progressive jackpot tiers with animated counting
 * Includes recent winners ticker and celebration animations
 * Fetches from GET /api/jackpot/status and /api/jackpot/winners
 */

(function() {
  var JACKPOT_TIERS = ['mini', 'major', 'grand'];
  var TICKER_UPDATE_INTERVAL = 30000; // Refresh API every 30s
  var COUNTER_TICK_INTERVAL = 50; // Smooth counting animation every 50ms
  var SIMULATED_INCREMENT = 0.85; // Cents per tick when simulating
  var WINNERS_UPDATE_INTERVAL = 45000; // Fetch winners every 45s
  var WINNERS_SCROLL_SPEED = 30; // Pixels per second

  var jackpotState = {
    mini: 0,
    major: 0,
    grand: 0,
    lastFetch: null,
    isSimulating: false,
    userContributed: 0,
  };

  var counterAnimations = {
    mini: null,
    major: null,
    grand: null,
  };

  var winnersData = [];
  var winnersScrollPos = 0;

  /**
   * Initialize the jackpot ticker on page load
   */
  function initJackpotTicker() {
    var tickerContainer = document.getElementById('jackpotTickerContainer');
    if (!tickerContainer) {
      console.warn('[Jackpot Ticker] Container not found. Ensure jackpotTickerContainer exists in DOM.');
      return;
    }

    renderJackpotTicker();
    fetchJackpotStatus();
    fetchRecentWinners();

    // Periodic refresh from API
    setInterval(fetchJackpotStatus, TICKER_UPDATE_INTERVAL);
    setInterval(fetchRecentWinners, WINNERS_UPDATE_INTERVAL);

    // Smooth counter animation tick
    setInterval(tickAllCounters, COUNTER_TICK_INTERVAL);

    // Scroll recent winners
    setInterval(scrollWinnersTicker, 100);

    // Expose public API to window
    window.JackpotPool = {
      contribute: contributeToJackpot,
      showCelebration: showJackpotCelebration,
      getState: function() { return jackpotState; }
    };
  }

  /**
   * Fetch current jackpot values from /api/jackpot/status
   */
  async function fetchJackpotStatus() {
    try {
      var response = await fetch('/api/jackpot/status');
      if (!response.ok) throw new Error('HTTP ' + response.status);

      var data = await response.json();
      if (!data.pools || !Array.isArray(data.pools)) {
        throw new Error('Invalid API response format');
      }

      // Build new state from API response
      var newState = { mini: 0, major: 0, grand: 0 };
      data.pools.forEach(function(pool) {
        if (pool.tier && pool.currentAmount !== undefined) {
          newState[pool.tier] = parseFloat(pool.currentAmount) || 0;
        }
      });

      jackpotState.lastFetch = Date.now();
      jackpotState.isSimulating = false;

      // Update counters with new values
      JACKPOT_TIERS.forEach(function(tier) {
        var oldVal = jackpotState[tier];
        var newVal = newState[tier];

        if (newVal > oldVal) {
          // Animate to new value
          animateCounterToValue(tier, newVal);
        } else {
          jackpotState[tier] = newVal;
          updateCounterDisplay(tier);
        }
      });
    } catch (err) {
      console.warn('[Jackpot Ticker] Failed to fetch status:', err.message);
      // Start simulating if not already
      if (!jackpotState.isSimulating) {
        jackpotState.isSimulating = true;
      }
    }
  }

  /**
   * Fetch recent jackpot winners
   */
  async function fetchRecentWinners() {
    try {
      var response = await fetch('/api/jackpot/winners');
      if (!response.ok) throw new Error('HTTP ' + response.status);

      var data = await response.json();
      if (data.winners && Array.isArray(data.winners)) {
        winnersData = data.winners;
        updateWinnersDisplay();
      }
    } catch (err) {
      console.warn('[Jackpot Ticker] Failed to fetch winners:', err.message);
    }
  }

  /**
   * Update the winners ticker display
   */
  function updateWinnersDisplay() {
    var container = document.getElementById('jackpotWinnersContent');
    if (!container) return;

    if (winnersData.length === 0) {
      container.innerHTML = '<div class="winner-item">No winners yet</div>';
      return;
    }

    var html = winnersData.map(function(w) {
      return '<div class="winner-item">' +
        '<span class="winner-tier">' + (w.tier === 'grand' ? '👑' : w.tier === 'major' ? '🎯' : '💰') + ' ' +
        w.tier.toUpperCase() + '</span>' +
        '<span class="winner-name">' + w.winner + '</span>' +
        '<span class="winner-amount">$' + formatCurrencyNumber(w.amount) + '</span>' +
        '</div>';
    }).join('');

    container.innerHTML = html;
  }

  /**
   * Scroll the winners ticker smoothly
   */
  function scrollWinnersTicker() {
    var container = document.getElementById('jackpotWinnersContainer');
    if (!container) return;

    var content = document.getElementById('jackpotWinnersContent');
    if (!content || content.children.length === 0) return;

    // Calculate total scroll width
    var itemHeight = 24; // Height of each winner item
    var totalHeight = content.children.length * itemHeight;

    winnersScrollPos += (WINNERS_SCROLL_SPEED / 1000) * 100;
    if (winnersScrollPos > totalHeight) {
      winnersScrollPos = 0;
    }

    container.scrollTop = winnersScrollPos;
  }

  /**
   * Contribute bet amount to jackpot pools
   * Called from ui-slot.js after each spin
   */
  async function contributeToJackpot(betAmount) {
    try {
      if (!betAmount || betAmount <= 0) return null;

      var token = localStorage.getItem('token');
      if (!token) return null;

      var response = await fetch('/api/jackpot/contribute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({ betAmount: betAmount })
      });

      if (!response.ok) throw new Error('HTTP ' + response.status);

      var data = await response.json();

      // Track user contribution
      var contrib = Math.round(betAmount * 0.005 * 100) / 100; // 0.5% contribution rate
      jackpotState.userContributed = (jackpotState.userContributed || 0) + contrib;
      updateContributionDisplay();

      // If there's a win, show celebration
      if (data.win) {
        showJackpotCelebration(data.win);
        // Refresh status immediately
        setTimeout(fetchJackpotStatus, 100);
      }

      return data.win || null;
    } catch (err) {
      console.warn('[Jackpot] Contribution error:', err.message);
      return null;
    }
  }

  /**
   * Show jackpot celebration animation
   */
  function showJackpotCelebration(win) {
    if (!win || !win.tier) return;

    var overlay = document.createElement('div');
    overlay.id = 'jackpot-win-overlay';
    overlay.className = 'jackpot-celebration-overlay';
    overlay.innerHTML =
      '<div class="jackpot-celebration-content">' +
      '<div class="celebration-icon">' + (win.tier === 'grand' ? '👑' : win.tier === 'major' ? '🎯' : '💰') + '</div>' +
      '<div class="celebration-title">' + win.tier.toUpperCase() + ' JACKPOT!</div>' +
      '<div class="celebration-amount">$' + formatCurrencyNumber(win.amount) + '</div>' +
      '<div class="celebration-message">You won!</div>' +
      '</div>';

    document.body.appendChild(overlay);

    // Auto-remove after 4 seconds
    setTimeout(function() {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }, 4000);

    // Play sound if available
    try {
      var audio = new Audio('data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQIAAAAAAA==');
      audio.play().catch(function() {});
    } catch (e) {}
  }

  /**
   * Update contribution counter display
   */
  function updateContributionDisplay() {
    var el = document.getElementById('jackpotContributionAmount');
    if (el) {
      el.textContent = '$' + formatCurrencyNumber(jackpotState.userContributed);
    }
  }

  /**
   * Format a number as currency (no $)
   */
  function formatCurrencyNumber(value) {
    return parseFloat(value).toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });
  }

  /**
   * Animate counter from current value to target
   */
  function animateCounterToValue(tier, targetValue) {
    var currentValue = jackpotState[tier];
    var difference = targetValue - currentValue;
    var steps = Math.max(20, Math.min(60, Math.floor(difference / 100)));
    var stepSize = difference / steps;
    var currentStep = 0;

    // Cancel any existing animation for this tier
    if (counterAnimations[tier]) {
      clearInterval(counterAnimations[tier]);
    }

    counterAnimations[tier] = setInterval(function() {
      currentStep++;
      var newValue = currentValue + (stepSize * currentStep);

      if (currentStep >= steps) {
        jackpotState[tier] = targetValue;
        clearInterval(counterAnimations[tier]);
        counterAnimations[tier] = null;
      } else {
        jackpotState[tier] = newValue;
      }

      updateCounterDisplay(tier);
    }, 50);
  }

  /**
   * Tick all counters up slightly (for simulated growth)
   */
  function tickAllCounters() {
    if (!jackpotState.isSimulating) return;

    JACKPOT_TIERS.forEach(function(tier) {
      jackpotState[tier] += SIMULATED_INCREMENT;
      updateCounterDisplay(tier);
    });
  }

  /**
   * Update the displayed value for a tier counter
   */
  function updateCounterDisplay(tier) {
    var element = document.getElementById('jackpotAmount_' + tier);
    if (element) {
      element.textContent = formatCurrency(jackpotState[tier]);
    }
  }

  /**
   * Format value as currency (e.g., "$1,234.56")
   */
  function formatCurrency(value) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }

  /**
   * Render the jackpot ticker HTML into the container
   */
  function renderJackpotTicker() {
    var container = document.getElementById('jackpotTickerContainer');
    if (!container) return;

    var tiers = [
      { key: 'mini', label: 'Mini Jackpot', icon: '💰' },
      { key: 'major', label: 'Major Jackpot', icon: '🎯' },
      { key: 'grand', label: 'Grand Prize', icon: '👑' },
    ];

    var tiersHtml = tiers.map(function(tier) {
      return '<div class="jackpot-tier" data-tier="' + tier.key + '">' +
        '<div class="tier-icon">' + tier.icon + '</div>' +
        '<div class="tier-info">' +
        '<div class="tier-label">' + tier.label + '</div>' +
        '<div class="tier-amount" id="jackpotAmount_' + tier.key + '">' +
        formatCurrency(jackpotState[tier.key]) +
        '</div>' +
        '</div>' +
        '<div class="tier-glow"></div>' +
        '</div>';
    }).join('');

    container.innerHTML =
      '<div class="jackpot-ticker">' +
      '<div class="jackpot-ticker-header">' +
      '<span class="jackpot-ticker-title">⚡ Progressive Jackpots</span>' +
      '</div>' +
      '<div class="jackpot-tiers">' +
      tiersHtml +
      '</div>' +
      '<div class="jackpot-ticker-footer">' +
      '<span class="ticker-pulse">●</span>' +
      '<span class="ticker-text">Live Updates</span>' +
      '</div>' +
      '<div class="jackpot-winners-section">' +
      '<div class="jackpot-winners-title">🏆 Recent Winners</div>' +
      '<div class="jackpot-winners-container" id="jackpotWinnersContainer">' +
      '<div class="jackpot-winners-content" id="jackpotWinnersContent"></div>' +
      '</div>' +
      '</div>' +
      '<div class="jackpot-contribution-section">' +
      '<span class="contribution-label">You contributed:</span>' +
      '<span class="contribution-amount" id="jackpotContributionAmount">$0</span>' +
      '</div>' +
      '</div>';

    injectJackpotTickerStyles();
  }

  /**
   * Inject styles for the jackpot ticker
   */
  function injectJackpotTickerStyles() {
    if (document.getElementById('jackpotTickerStyles')) return; // Already injected

    var style = document.createElement('style');
    style.id = 'jackpotTickerStyles';
    style.textContent = `
    #jackpotTickerContainer {
      margin: 24px 0;
      padding: 0;
    }

    .jackpot-ticker {
      background: linear-gradient(135deg, rgba(255, 193, 7, 0.1), rgba(255, 152, 0, 0.1));
      border: 2px solid rgba(255, 193, 7, 0.4);
      border-radius: 12px;
      padding: 20px;
      backdrop-filter: blur(8px);
      box-shadow:
        0 0 30px rgba(255, 193, 7, 0.2),
        inset 0 0 20px rgba(255, 255, 255, 0.05);
      animation: jackpotGlowPulse 3s ease-in-out infinite;
    }

    @keyframes jackpotGlowPulse {
      0%, 100% {
        box-shadow:
          0 0 30px rgba(255, 193, 7, 0.2),
          inset 0 0 20px rgba(255, 255, 255, 0.05);
      }
      50% {
        box-shadow:
          0 0 50px rgba(255, 193, 7, 0.4),
          inset 0 0 30px rgba(255, 255, 255, 0.1);
      }
    }

    .jackpot-ticker-header {
      text-align: center;
      margin-bottom: 16px;
    }

    .jackpot-ticker-title {
      font-size: 14px;
      font-weight: 600;
      color: #ffc107;
      text-shadow: 0 0 10px rgba(255, 193, 7, 0.6);
      letter-spacing: 0.5px;
    }

    .jackpot-tiers {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 12px;
      margin-bottom: 12px;
    }

    .jackpot-tier {
      position: relative;
      background: rgba(45, 45, 50, 0.8);
      border: 1px solid rgba(255, 193, 7, 0.3);
      border-radius: 8px;
      padding: 12px;
      text-align: center;
      overflow: hidden;
      transition: all 0.3s ease;
      cursor: pointer;
    }

    .jackpot-tier:hover {
      border-color: rgba(255, 193, 7, 0.6);
      background: rgba(45, 45, 50, 1);
      transform: translateY(-2px);
    }

    .jackpot-tier::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(
        135deg,
        rgba(255, 193, 7, 0.1),
        transparent
      );
      pointer-events: none;
    }

    .tier-glow {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: radial-gradient(
        circle at center,
        rgba(255, 193, 7, 0.2),
        transparent
      );
      opacity: 0;
      animation: tierGlowPulse 2s ease-in-out infinite;
    }

    @keyframes tierGlowPulse {
      0%, 100% { opacity: 0; }
      50% { opacity: 1; }
    }

    .tier-icon {
      font-size: 24px;
      margin-bottom: 6px;
      display: block;
    }

    .tier-info {
      position: relative;
      z-index: 1;
    }

    .tier-label {
      font-size: 11px;
      color: rgba(255, 193, 7, 0.7);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
      font-weight: 600;
    }

    .tier-amount {
      font-size: 18px;
      font-weight: 700;
      background: linear-gradient(135deg, #ffc107, #ffb300);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      font-family: 'Monaco', 'Courier New', monospace;
      letter-spacing: 0.5px;
      min-height: 24px;
    }

    .jackpot-ticker-footer {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      font-size: 12px;
      color: rgba(255, 193, 7, 0.6);
    }

    .ticker-pulse {
      display: inline-block;
      color: #ff5722;
      animation: pulse 1.5s ease-in-out infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 0.3; }
      50% { opacity: 1; }
    }

    /* Recent Winners Section */
    .jackpot-winners-section {
      margin-top: 16px;
      padding-top: 12px;
      border-top: 1px solid rgba(255, 193, 7, 0.2);
    }

    .jackpot-winners-title {
      font-size: 12px;
      font-weight: 600;
      color: #ffc107;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
      text-align: center;
    }

    .jackpot-winners-container {
      height: 72px;
      overflow: hidden;
      background: rgba(0, 0, 0, 0.3);
      border-radius: 6px;
      padding: 0;
      border: 1px solid rgba(255, 193, 7, 0.2);
    }

    .jackpot-winners-content {
      padding: 6px 0;
    }

    .winner-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 24px;
      padding: 0 12px;
      font-size: 11px;
      color: rgba(255, 193, 7, 0.8);
      border-bottom: 1px solid rgba(255, 193, 7, 0.1);
      white-space: nowrap;
    }

    .winner-item:last-child {
      border-bottom: none;
    }

    .winner-tier {
      font-weight: 600;
      min-width: 50px;
    }

    .winner-name {
      flex: 1;
      text-align: center;
      padding: 0 8px;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .winner-amount {
      font-weight: 700;
      color: #fff;
      min-width: 50px;
      text-align: right;
    }

    /* Contribution Section */
    .jackpot-contribution-section {
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid rgba(255, 193, 7, 0.2);
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12px;
    }

    .contribution-label {
      color: rgba(255, 193, 7, 0.7);
      font-weight: 600;
    }

    .contribution-amount {
      color: #ffc107;
      font-weight: 700;
      font-size: 14px;
    }

    /* Jackpot Celebration Overlay */
    .jackpot-celebration-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: radial-gradient(circle at center, rgba(255, 193, 7, 0.4), rgba(0, 0, 0, 0.8));
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      animation: celebrationFadeIn 0.3s ease-out;
    }

    @keyframes celebrationFadeIn {
      from {
        opacity: 0;
        transform: scale(0.8);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }

    .jackpot-celebration-content {
      text-align: center;
      animation: celebrationBounce 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
    }

    @keyframes celebrationBounce {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.1); }
    }

    .celebration-icon {
      font-size: 120px;
      margin-bottom: 20px;
      animation: spin 2s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .celebration-title {
      font-size: 48px;
      font-weight: 900;
      color: #ffc107;
      text-shadow: 0 0 20px rgba(255, 193, 7, 0.8);
      letter-spacing: 2px;
      margin-bottom: 16px;
      animation: glowPulse 1s ease-in-out infinite;
    }

    @keyframes glowPulse {
      0%, 100% { text-shadow: 0 0 20px rgba(255, 193, 7, 0.8); }
      50% { text-shadow: 0 0 40px rgba(255, 193, 7, 1); }
    }

    .celebration-amount {
      font-size: 64px;
      font-weight: 900;
      color: #ffeb3b;
      text-shadow: 0 0 30px rgba(255, 235, 59, 0.9);
      margin-bottom: 20px;
      font-family: 'Monaco', monospace;
    }

    .celebration-message {
      font-size: 24px;
      color: #fff;
      font-weight: 700;
      letter-spacing: 1px;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .jackpot-tiers {
        grid-template-columns: 1fr;
      }

      .jackpot-ticker {
        padding: 16px;
      }

      .tier-amount {
        font-size: 16px;
      }

      .celebration-icon {
        font-size: 80px;
      }

      .celebration-title {
        font-size: 32px;
      }

      .celebration-amount {
        font-size: 48px;
      }

      .celebration-message {
        font-size: 18px;
      }
    }
  `;

    document.head.appendChild(style);
  }

  // Auto-init when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initJackpotTicker);
  } else {
    initJackpotTicker();
  }
})();
