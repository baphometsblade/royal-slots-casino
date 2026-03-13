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

  // Built-in test definitions
  const TESTS = {
    deposit_cta_text: {
      variants: ['Deposit Now', 'Add Funds', 'Power Up Your Bankroll']
    },
    welcome_bonus_amount: {
      variants: ['$2,500', '$2,000 + Free Spins', 'Up to $2,500']
    },
    lobby_layout: {
      variants: ['grid', 'list']
    }
  };

  const STORAGE_KEY = 'matrixSpins_abTests';

  /**
   * Simple deterministic hash based on userId + testName.
   * Returns a consistent integer between 0 and variants.length - 1.
   */
  function hashUserTest(userId, testName) {
    const str = String(userId) + testName;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Initialize A/B testing buckets for current user.
   * Loads or creates persistent assignment from localStorage.
   */
  function init() {
    try {
      // Get current user (assumes global or window context provides user info)
      const userId = window.user ? window.user.id : null;
      if (!userId) {
        console.warn('[ABTesting] No user ID available, skipping init');
        return false;
      }

      let buckets = localStorage.getItem(STORAGE_KEY);
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

      // Assign user to variant for each test if not already assigned
      let dirty = false;
      Object.keys(TESTS).forEach(function(testName) {
        if (!window._abBuckets[testName]) {
          const test = TESTS[testName];
          const hash = hashUserTest(userId, testName);
          const variantIndex = hash % test.variants.length;
          window._abBuckets[testName] = {
            variant: test.variants[variantIndex],
            variantIndex: variantIndex
          };
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
   * Silently fails if endpoint doesn't exist or network issue occurs.
   */
  function trackConversion(testName) {
    try {
      if (!window._abBuckets || !window._abBuckets[testName]) {
        console.warn('[ABTesting] Cannot track conversion for unknown test "' + testName + '"');
        return;
      }

      const userId = window.user ? window.user.id : null;
      const variant = window._abBuckets[testName].variant;

      const payload = {
        testName: testName,
        variant: variant,
        userId: userId
      };

      // Fire-and-forget POST (no await, no error handling)
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

  // Export API
  window.ABTesting = {
    init: init,
    getVariant: getVariant,
    trackConversion: trackConversion
  };

})();
