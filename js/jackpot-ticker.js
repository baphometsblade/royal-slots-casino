'use strict';

/**
 * Jackpot Ticker Component
 * Displays progressive jackpot tiers with animated counting
 * Fetches from GET /api/jackpot/status
 */

const JACKPOT_TIERS = ['mini', 'major', 'grand'];
const TICKER_UPDATE_INTERVAL = 30000; // Refresh API every 30s (counter animation smooths between fetches)
const COUNTER_TICK_INTERVAL = 50; // Smooth counting animation every 50ms
const SIMULATED_INCREMENT = 0.85; // Cents per tick when simulating

let jackpotState = {
  mini: 0,
  major: 0,
  grand: 0,
  lastFetch: null,
  isSimulating: false,
};

let counterAnimations = {
  mini: null,
  major: null,
  grand: null,
};

/**
 * Initialize the jackpot ticker on page load
 */
function initJackpotTicker() {
  const tickerContainer = document.getElementById('jackpotTickerContainer');
  if (!tickerContainer) {
    console.warn('[Jackpot Ticker] Container not found. Ensure jackpotTickerContainer exists in DOM.');
    return;
  }

  renderJackpotTicker();
  fetchJackpotStatus();

  // Periodic refresh from API
  setInterval(fetchJackpotStatus, TICKER_UPDATE_INTERVAL);

  // Smooth counter animation tick
  setInterval(tickAllCounters, COUNTER_TICK_INTERVAL);
}

/**
 * Fetch current jackpot values from /api/jackpot/status
 */
async function fetchJackpotStatus() {
  try {
    const response = await fetch('/api/jackpot/status');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    if (!data.pools || !Array.isArray(data.pools)) {
      throw new Error('Invalid API response format');
    }

    // Build new state from API response
    const newState = { mini: 0, major: 0, grand: 0 };
    data.pools.forEach(pool => {
      if (pool.tier && pool.currentAmount !== undefined) {
        newState[pool.tier] = parseFloat(pool.currentAmount) || 0;
      }
    });

    jackpotState.lastFetch = Date.now();
    jackpotState.isSimulating = false;

    // Update counters with new values
    JACKPOT_TIERS.forEach(tier => {
      const oldVal = jackpotState[tier];
      const newVal = newState[tier];

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
 * Animate counter from current value to target
 */
function animateCounterToValue(tier, targetValue) {
  const currentValue = jackpotState[tier];
  const difference = targetValue - currentValue;
  const steps = Math.max(20, Math.min(60, Math.floor(difference / 100)));
  const stepSize = difference / steps;
  let currentStep = 0;

  // Cancel any existing animation for this tier
  if (counterAnimations[tier]) {
    clearInterval(counterAnimations[tier]);
  }

  counterAnimations[tier] = setInterval(() => {
    currentStep++;
    const newValue = currentValue + (stepSize * currentStep);

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

  JACKPOT_TIERS.forEach(tier => {
    jackpotState[tier] += SIMULATED_INCREMENT;
    updateCounterDisplay(tier);
  });
}

/**
 * Update the displayed value for a tier counter
 */
function updateCounterDisplay(tier) {
  const element = document.getElementById(`jackpotAmount_${tier}`);
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
  const container = document.getElementById('jackpotTickerContainer');
  if (!container) return;

  const tiers = [
    { key: 'mini', label: 'Mini Jackpot', icon: '💰' },
    { key: 'major', label: 'Major Jackpot', icon: '🎯' },
    { key: 'grand', label: 'Grand Prize', icon: '👑' },
  ];

  container.innerHTML = `
    <div class="jackpot-ticker">
      <div class="jackpot-ticker-header">
        <span class="jackpot-ticker-title">⚡ Progressive Jackpots</span>
      </div>
      <div class="jackpot-tiers">
        ${tiers.map(tier => `
          <div class="jackpot-tier" data-tier="${tier.key}">
            <div class="tier-icon">${tier.icon}</div>
            <div class="tier-info">
              <div class="tier-label">${tier.label}</div>
              <div class="tier-amount" id="jackpotAmount_${tier.key}">
                ${formatCurrency(jackpotState[tier.key])}
              </div>
            </div>
            <div class="tier-glow"></div>
          </div>
        `).join('')}
      </div>
      <div class="jackpot-ticker-footer">
        <span class="ticker-pulse">●</span>
        <span class="ticker-text">Live Updates</span>
      </div>
    </div>
  `;

  injectJackpotTickerStyles();
}

/**
 * Inject styles for the jackpot ticker
 */
function injectJackpotTickerStyles() {
  if (document.getElementById('jackpotTickerStyles')) return; // Already injected

  const style = document.createElement('style');
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
