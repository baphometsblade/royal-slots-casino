'use strict';

/**
 * Lightweight A/B Testing Framework for Royal Slots Casino
 *
 * Provides:
 *  - window.ABTesting.init()           — Initialize user buckets from localStorage
 *  - window.ABTesting.getVariant()     — Get assigned variant for a test
 *  - window.ABTesting.trackConversion()— Record a conversion
 *
 * Tests are defined with variants; assignment is deterministic based on hash of userId + testName.
 * Conversions are sent to /api/ab/convert (fire-and-forget).
 */

(function() {
  'use strict';

  // Revenue-optimized test definitions
  var TESTS = {
    // Existing tests (3)
    deposit_cta_text: {
      variants: ['Deposit Now', 'Add Funds', 'Power Up Your Bankroll']
    },
    welcome_bonus_amount: {
      variants: ['$2,500', '$2,000 + Free Spins', 'Up to $2,500']
    },
    lobby_layout: {
      variants: ['grid', 'list']
    },

    // New revenue-focused tests (7)
    spin_button_color: {
      variants: ['#ff4444', '#00cc66', '#ffaa00']
    },
    loss_message_tone: {
      variants: ['encouraging', 'urgent', 'neutral']
    },
    deposit_nudge_timing: {
      variants: ['after_3_losses', 'after_5_losses', 'after_balance_50pct']
    },
    jackpot_display: {
      variants: ['progressive_counter', 'static_amount', 'countdown_timer']
    },
    free_spin_offer: {
      variants: ['5_spins', '10_spins', '3_spins_2x_multiplier']
    },
    social_proof_style: {
      variants: ['ticker', 'popup', 'sidebar']
    },
    exit_intent_offer: {
      variants: ['50_coins', '100_pct_match', 'free_spins']
    }
  };

  var STORAGE_KEY = 'matrixSpins_abTests';
  var WINNERS_STORAGE_KEY = 'matrixSpins_abWinners';

  /**
   * Simple deterministic hash based on userId + testName.
   * Returns a consistent integer between 0 and variants.length - 1.
   */
  function hashUserTest(userId, testName) {
    var str = String(userId) + testName;
    var hash = 0;
    for (var i = 0; i < str.length; i++) {
      var char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Load declared winners from localStorage.
   * Returns object mapping testName => winningVariant.
   */
  function _loadWinners() {
    try {
      var winnersJson = localStorage.getItem(WINNERS_STORAGE_KEY);
      if (winnersJson) {
        return JSON.parse(winnersJson);
      }
    } catch (e) {
      console.warn('[ABTesting] Failed to parse winners:', e.message);
    }
    return {};
  }

  /**
   * Initialize A/B testing buckets for current user.
   * Loads or creates persistent assignment from localStorage.
   * Respects declared winners by always assigning to that variant.
   */
  function init() {
    try {
      // Get current user (assumes global or window context provides user info)
      var userId = window.user ? window.user.id : null;
      if (!userId) {
        console.warn('[ABTesting] No user ID available, skipping init');
        return false;
      }

      var buckets = localStorage.getItem(STORAGE_KEY);
      if (buckets) {
        try {
          window._abBuckets = JSON.parse(buckets);
        } catch (e) {
          console.warn('[ABTesting] Failed to parse stored buckets, reinitializing:', e.message);
          window._abBuckets = {};
        }
      } else {
        window._abBuckets = {};
      }

      // Load declared winners
      var winners = _loadWinners();

      // Assign user to variant for each test if not already assigned
      var dirty = false;
      Object.keys(TESTS).forEach(function(testName) {
        if (!window._abBuckets[testName]) {
          var test = TESTS[testName];

          // Check if this test has a declared winner
          var variant;
          if (winners[testName]) {
            // Use winner variant if available
            variant = winners[testName];
          } else {
            // Assign via hash
            var hash = hashUserTest(userId, testName);
            var variantIndex = hash % test.variants.length;
            variant = test.variants[variantIndex];
          }

          window._abBuckets[testName] = {
            variant: variant,
            variantIndex: test.variants.indexOf(variant)
          };

          // Fire-and-forget: Send assignment to backend for persistence
          _sendAssignment(testName, variant, userId);

          dirty = true;
        }
      });

      // Persist to localStorage if new assignments made
      if (dirty) {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(window._abBuckets));
        } catch (e) {
          console.warn('[ABTesting] Failed to persist buckets to localStorage:', e.message);
        }
      }

      return true;
    } catch (err) {
      console.warn('[ABTesting] init() error:', err.message);
      return false;
    }
  }

  /**
   * Fire-and-forget: Send experiment assignment to backend.
   */
  function _sendAssignment(testName, variant, userId) {
    try {
      fetch('/api/ab/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testName: testName,
          variant: variant,
          userId: userId
        }),
        keepalive: true
      }).catch(function() {
        // Silently ignore network errors
      });
    } catch (err) {
      // Silently ignore
    }
  }

  /**
   * Get the assigned variant for a given test name.
   * Returns the variant string (e.g., 'Deposit Now') or null if not found.
   */
  function getVariant(testName) {
    try {
      if (!window._abBuckets || !window._abBuckets[testName]) {
        console.warn('[ABTesting] Test "' + testName + '" not found in buckets');
        return null;
      }
      return window._abBuckets[testName].variant;
    } catch (err) {
      console.warn('[ABTesting] getVariant() error:', err.message);
      return null;
    }
  }

  /**
   * Track a conversion for a given test.
   * Sends a fire-and-forget POST to /api/ab/convert.
   */
  function trackConversion(testName, conversionType) {
    try {
      if (!window._abBuckets || !window._abBuckets[testName]) {
        console.warn('[ABTesting] Cannot track conversion for unknown test "' + testName + '"');
        return;
      }

      var userId = window.user ? window.user.id : null;
      var variant = window._abBuckets[testName].variant;

      var payload = {
        testName: testName,
        variant: variant,
        conversionType: conversionType || 'generic',
        userId: userId
      };

      // Fire-and-forget POST
      fetch('/api/ab/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true
      }).catch(function() {
        // Silently ignore network errors
      });
    } catch (err) {
      console.warn('[ABTesting] trackConversion() error:', err.message);
    }
  }

  /**
   * Track revenue attribution to a test variant.
   * Fire-and-forget POST to /api/ab/revenue.
   */
  function trackRevenue(testName, amount) {
    try {
      if (!window._abBuckets || !window._abBuckets[testName]) {
        console.warn('[ABTesting] Cannot track revenue for unknown test "' + testName + '"');
        return;
      }

      if (typeof amount !== 'number' || amount <= 0) {
        console.warn('[ABTesting] Invalid revenue amount: ' + amount);
        return;
      }

      var userId = window.user ? window.user.id : null;
      var variant = window._abBuckets[testName].variant;

      var payload = {
        testName: testName,
        variant: variant,
        amount: amount,
        userId: userId
      };

      // Fire-and-forget POST
      fetch('/api/ab/revenue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true
      }).catch(function() {
        // Silently ignore network errors
      });
    } catch (err) {
      console.warn('[ABTesting] trackRevenue() error:', err.message);
    }
  }

  /**
   * Apply visual changes based on assigned variant.
   * Called after init() to modify UI elements.
   */
  function applyVariant(testName) {
    try {
      var variant = getVariant(testName);
      if (!variant) {
        console.warn('[ABTesting] applyVariant: no variant found for test "' + testName + '"');
        return;
      }

      switch (testName) {
        case 'spin_button_color':
          _applySpinButtonColor(variant);
          break;
        case 'loss_message_tone':
          _applyLossMessageTone(variant);
          break;
        case 'deposit_nudge_timing':
          _applyDepositNudgeTiming(variant);
          break;
        case 'jackpot_display':
          _applyJackpotDisplay(variant);
          break;
        case 'free_spin_offer':
          _applyFreeSpinOffer(variant);
          break;
        case 'social_proof_style':
          _applySocialProofStyle(variant);
          break;
        case 'exit_intent_offer':
          _applyExitIntentOffer(variant);
          break;
        case 'lobby_layout':
          _applyLobbyLayout(variant);
          break;
        default:
          // Test variant applied via template or conditional logic
          break;
      }
    } catch (err) {
      console.warn('[ABTesting] applyVariant("' + testName + '") error:', err.message);
    }
  }

  /**
   * Apply spin button color variant.
   */
  function _applySpinButtonColor(variant) {
    try {
      var colorMap = {
        '#ff4444': 'spin-button-red',
        '#00cc66': 'spin-button-green',
        '#ffaa00': 'spin-button-orange'
      };
      var cssClass = colorMap[variant];
      if (!cssClass) return;

      var spinBtns = document.querySelectorAll('[data-action="spin"], .spin-button, button.spin');
      spinBtns.forEach(function(btn) {
        btn.classList.add(cssClass);
        btn.style.backgroundColor = variant;
      });
    } catch (err) {
      console.warn('[ABTesting] _applySpinButtonColor error:', err.message);
    }
  }

  /**
   * Apply loss message tone variant.
   */
  function _applyLossMessageTone(variant) {
    try {
      // Store tone for use when displaying loss messages
      window._abLossTone = variant;
    } catch (err) {
      console.warn('[ABTesting] _applyLossMessageTone error:', err.message);
    }
  }

  /**
   * Apply deposit nudge timing variant.
   */
  function _applyDepositNudgeTiming(variant) {
    try {
      // Store timing preference for use in game logic
      window._abDepositNudgeTiming = variant;
    } catch (err) {
      console.warn('[ABTesting] _applyDepositNudgeTiming error:', err.message);
    }
  }

  /**
   * Apply jackpot display variant.
   */
  function _applyJackpotDisplay(variant) {
    try {
      // Store display preference for jackpot elements
      window._abJackpotDisplay = variant;

      var jackpotElements = document.querySelectorAll('[data-display="jackpot"], .jackpot-amount');
      jackpotElements.forEach(function(el) {
        el.setAttribute('data-display-variant', variant);
      });
    } catch (err) {
      console.warn('[ABTesting] _applyJackpotDisplay error:', err.message);
    }
  }

  /**
   * Apply free spin offer variant.
   */
  function _applyFreeSpinOffer(variant) {
    try {
      window._abFreeSpinOffer = variant;

      var offerElements = document.querySelectorAll('[data-type="free-spin-offer"]');
      offerElements.forEach(function(el) {
        el.setAttribute('data-offer-variant', variant);
      });
    } catch (err) {
      console.warn('[ABTesting] _applyFreeSpinOffer error:', err.message);
    }
  }

  /**
   * Apply social proof style variant.
   */
  function _applySocialProofStyle(variant) {
    try {
      window._abSocialProofStyle = variant;

      var proofElements = document.querySelectorAll('[data-component="social-proof"]');
      proofElements.forEach(function(el) {
        el.className = el.className.replace(/social-proof-\w+/, '');
        el.classList.add('social-proof-' + variant);
      });
    } catch (err) {
      console.warn('[ABTesting] _applySocialProofStyle error:', err.message);
    }
  }

  /**
   * Apply exit-intent offer variant.
   */
  function _applyExitIntentOffer(variant) {
    try {
      window._abExitIntentOffer = variant;
    } catch (err) {
      console.warn('[ABTesting] _applyExitIntentOffer error:', err.message);
    }
  }

  /**
   * Apply lobby layout variant.
   */
  function _applyLobbyLayout(variant) {
    try {
      var lobbyContainer = document.querySelector('[data-view="lobby"], .game-lobby, .games-container');
      if (lobbyContainer) {
        lobbyContainer.className = lobbyContainer.className.replace(/lobby-\w+/, '');
        lobbyContainer.classList.add('lobby-' + variant);
      }
    } catch (err) {
      console.warn('[ABTesting] _applyLobbyLayout error:', err.message);
    }
  }

  /**
   * Update declared winners from server (call after admin declares a winner).
   */
  function setWinner(testName, variant) {
    try {
      var winners = _loadWinners();
      winners[testName] = variant;
      localStorage.setItem(WINNERS_STORAGE_KEY, JSON.stringify(winners));
      console.warn('[ABTesting] Winner set locally for test "' + testName + '": ' + variant);
    } catch (err) {
      console.warn('[ABTesting] setWinner error:', err.message);
    }
  }

  // Export API
  window.ABTesting = {
    init: init,
    getVariant: getVariant,
    trackConversion: trackConversion,
    trackRevenue: trackRevenue,
    applyVariant: applyVariant,
    setWinner: setWinner
  };

})();
