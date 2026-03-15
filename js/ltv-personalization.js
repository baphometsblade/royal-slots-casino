'use strict';

/**
 * LTV Personalization Engine
 *
 * Fetches player's LTV tier from backend and customizes UI/offers accordingly.
 *
 * Tier-based customizations:
 *   - Diamond/Platinum: VIP badge, VIP Lounge button, higher deposit match offers
 *   - Gold: Gold Member badge, exclusive game section unlock
 *   - Silver: Progress bar toward Gold, deposit benefit highlights
 *   - Bronze: Aggressive welcome CTAs, first-deposit emphasis, "Unlock VIP" messaging
 *
 * Exposes:
 *   - window.LTVPersonalization.init()
 *   - window.LTVPersonalization.getTier()
 *   - window.LTVPersonalization.getPersonalizedOffer()
 *   - window.LTVPersonalization.showTierElements()
 */

(function() {
  'use strict';

  var _tier = null;
  var _initDone = false;
  var _initPromise = null;

  /**
   * Tier-specific UI configurations
   */
  var TIER_CONFIG = {
    diamond: {
      badgeText: 'VIP Diamond',
      badgeColor: '#FFD700',
      badgeIcon: '💎',
      vipLounge: true,
      offers: [
        {
          type: 'personal_manager',
          title: 'Personal VIP Manager',
          description: 'Dedicated account manager for custom bonuses & exclusive events'
        },
        {
          type: 'high_roller_event',
          title: 'Exclusive High-Roller Events',
          description: 'Invitation-only tournaments with VIP prizes'
        },
        {
          type: 'custom_bonus',
          title: 'Custom Bonuses',
          description: 'Personalized bonus packages based on your preferences'
        }
      ],
      offerPriority: 'premium',
      depositMatchMultiplier: 3.0 // 300% match
    },

    platinum: {
      badgeText: 'VIP Platinum',
      badgeColor: '#E5E4E2',
      badgeIcon: '♣️',
      vipLounge: true,
      offers: [
        {
          type: 'priority_support',
          title: 'Priority Support',
          description: '24/7 priority customer support with <5min response'
        },
        {
          type: 'enhanced_cashback',
          title: 'Enhanced Cashback (10%)',
          description: '10% cashback on all losses'
        },
        {
          type: 'exclusive_tournament',
          title: 'Exclusive Tournaments',
          description: 'VIP-only tournaments with premium prizes'
        }
      ],
      offerPriority: 'high',
      depositMatchMultiplier: 2.5 // 250% match
    },

    gold: {
      badgeText: 'Gold Member',
      badgeColor: '#FFD700',
      badgeIcon: '⭐',
      vipLounge: false,
      offers: [
        {
          type: 'loyalty_multiplier',
          title: 'Loyalty Multiplier 2x',
          description: 'Earn 2x loyalty points on all spins'
        },
        {
          type: 'weekend_bonus',
          title: 'Weekend Deposit Bonuses',
          description: 'Extra bonuses on Friday-Sunday deposits'
        },
        {
          type: 'exclusive_games',
          title: 'Exclusive Games Access',
          description: 'Play exclusive Gold Member game variants'
        }
      ],
      offerPriority: 'medium',
      depositMatchMultiplier: 2.0 // 200% match
    },

    silver: {
      badgeText: 'Silver Member',
      badgeColor: '#C0C0C0',
      badgeIcon: '🥈',
      vipLounge: false,
      offers: [
        {
          type: 'standard_bonus',
          title: 'Daily Bonuses',
          description: 'Daily login incentives & bonuses'
        },
        {
          type: 'deposit_bonus',
          title: 'Deposit Bonuses',
          description: 'Get bonus on every deposit'
        },
        {
          type: 'progress_toward_gold',
          title: 'Path to Gold Status',
          description: 'See what you need to reach Gold Member status'
        }
      ],
      offerPriority: 'standard',
      depositMatchMultiplier: 1.5 // 150% match
    },

    bronze: {
      badgeText: null,
      badgeColor: null,
      badgeIcon: null,
      vipLounge: false,
      offers: [
        {
          type: 'welcome_offer',
          title: 'Massive Welcome Bonus',
          description: 'Get up to 200% match on your first deposit'
        },
        {
          type: 'low_barrier_deposit',
          title: 'Low Minimum Deposit',
          description: 'Start playing with just $1'
        },
        {
          type: 'gamification',
          title: 'Daily Challenges',
          description: 'Complete daily challenges and unlock rewards'
        },
        {
          type: 'unlock_vip',
          title: 'Unlock VIP Status',
          description: 'Deposit more to reach Silver, Gold, Platinum & Diamond tiers'
        }
      ],
      offerPriority: 'aggressive',
      depositMatchMultiplier: 1.0 // 100% match
    }
  };

  /**
   * Initialize LTV personalization engine
   * Fetches tier from backend and applies customizations
   */
  async function init() {
    if (_initDone) return Promise.resolve(_tier);
    if (_initPromise) return _initPromise;

    _initPromise = (async function() {
      try {
        var response = await fetch('/api/player-ltv/my-score', {
          method: 'GET',
          headers: {
            'Authorization': 'Bearer ' + (localStorage.getItem('auth_token') || ''),
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          console.warn('[LTVPersonalization] Failed to fetch tier:', response.status);
          _tier = 'bronze'; // Default tier if fetch fails
          _initDone = true;
          return _tier;
        }

        var data = await response.json();
        _tier = data.tier || 'bronze';
        _initDone = true;

        // Show tier-specific elements
        showTierElements(_tier);

        // Track personalization impression
        if (window.ABTesting && window.ABTesting.trackConversion) {
          window.ABTesting.trackConversion('ltv_personalization', { tier: _tier });
        }

        return _tier;
      } catch (err) {
        console.warn('[LTVPersonalization] Init error:', err);
        _tier = 'bronze';
        _initDone = true;
        return _tier;
      }
    })();

    return _initPromise;
  }

  /**
   * Get current player's tier (must call init() first)
   */
  function getTier() {
    if (!_initDone) {
      console.warn('[LTVPersonalization] init() not yet called; tier is undefined');
      return null;
    }
    return _tier;
  }

  /**
   * Get personalized offer for current tier
   */
  function getPersonalizedOffer() {
    var tier = getTier();
    if (!tier || !TIER_CONFIG[tier]) return null;

    var config = TIER_CONFIG[tier];
    var offers = config.offers;

    // Return primary offer (first in list)
    return offers.length > 0 ? offers[0] : null;
  }

  /**
   * Show tier-specific UI elements
   */
  function showTierElements(tier) {
    if (!tier || !TIER_CONFIG[tier]) return;

    var config = TIER_CONFIG[tier];

    // ── Add tier badge next to username ────────────────────────────────
    if (config.badgeText) {
      var usernameEl = document.querySelector('[data-user-display-name]');
      if (!usernameEl) {
        usernameEl = document.querySelector('.username-display');
      }

      if (usernameEl) {
        var existingBadge = usernameEl.querySelector('.ltv-tier-badge');
        if (!existingBadge) {
          var badge = document.createElement('span');
          badge.className = 'ltv-tier-badge';
          badge.style.marginLeft = '8px';
          badge.style.fontSize = '0.85em';
          badge.style.padding = '4px 12px';
          badge.style.borderRadius = '12px';
          badge.style.fontWeight = 'bold';
          badge.style.backgroundColor = config.badgeColor;
          badge.style.color = tier === 'gold' || tier === 'bronze' ? '#333' : '#fff';
          badge.innerHTML = config.badgeIcon + ' ' + config.badgeText;

          usernameEl.appendChild(badge);
        }
      }
    }

    // ── Show VIP Lounge button (Diamond/Platinum only) ──────────────────
    if (config.vipLounge) {
      var navEl = document.querySelector('[data-nav-primary]') || document.querySelector('nav');
      if (navEl && !document.querySelector('[data-vip-lounge-btn]')) {
        var loungeBtn = document.createElement('button');
        loungeBtn.setAttribute('data-vip-lounge-btn', 'true');
        loungeBtn.className = 'vip-lounge-btn';
        loungeBtn.style.padding = '10px 20px';
        loungeBtn.style.marginLeft = '10px';
        loungeBtn.style.backgroundColor = '#FFD700';
        loungeBtn.style.color = '#333';
        loungeBtn.style.border = 'none';
        loungeBtn.style.borderRadius = '6px';
        loungeBtn.style.fontWeight = 'bold';
        loungeBtn.style.cursor = 'pointer';
        loungeBtn.innerHTML = '🏰 VIP Lounge';
        loungeBtn.onclick = function(e) {
          e.preventDefault();
          window.location.href = '/vip-lounge';
        };

        navEl.appendChild(loungeBtn);
      }
    }

    // ── Show progress bar toward Gold (Silver only) ────────────────────
    if (tier === 'silver') {
      var progressContainer = document.querySelector('[data-tier-progress]');
      if (!progressContainer && document.querySelector('.sidebar')) {
        var sidebar = document.querySelector('.sidebar');
        progressContainer = document.createElement('div');
        progressContainer.setAttribute('data-tier-progress', 'true');
        progressContainer.style.padding = '12px';
        progressContainer.style.marginBottom = '16px';
        progressContainer.style.backgroundColor = '#f5f5f5';
        progressContainer.style.borderRadius = '8px';
        progressContainer.style.border = '1px solid #ddd';

        progressContainer.innerHTML = `
          <div style="font-weight: bold; margin-bottom: 8px; font-size: 0.9em;">
            ⭐ Progress to Gold Member
          </div>
          <div style="background: #e0e0e0; height: 8px; border-radius: 4px; overflow: hidden;">
            <div style="background: #FFD700; height: 100%; width: 60%;"></div>
          </div>
          <div style="font-size: 0.8em; color: #666; margin-top: 6px;">
            Deposit $500 more to reach Gold status
          </div>
        `;

        sidebar.insertBefore(progressContainer, sidebar.firstChild);
      }
    }

    // ── Adjust deposit offers based on tier ────────────────────────────
    var depositOffers = document.querySelectorAll('[data-deposit-offer]');
    depositOffers.forEach(function(offer) {
      var currentMatch = parseInt(offer.getAttribute('data-match-percent') || 100);
      var newMatch = Math.round(config.depositMatchMultiplier * 100);

      if (newMatch > currentMatch) {
        offer.setAttribute('data-match-percent', newMatch);
        var offerText = offer.querySelector('[data-offer-text]');
        if (offerText) {
          offerText.textContent = newMatch + '% match bonus';
        }
      }
    });

    // ── Show "Unlock Exclusive Games" CTA (Gold tier) ───────────────────
    if (tier === 'gold') {
      var gamesSection = document.querySelector('[data-exclusive-games]');
      if (!gamesSection && document.querySelector('.games-grid')) {
        var lockIcon = document.querySelector('[data-locked-games]');
        if (lockIcon) {
          lockIcon.style.display = 'none';
        }

        var unlockMsg = document.createElement('div');
        unlockMsg.style.padding = '12px';
        unlockMsg.style.backgroundColor = '#fff3cd';
        unlockMsg.style.borderRadius = '6px';
        unlockMsg.style.marginBottom = '12px';
        unlockMsg.innerHTML = '🔓 Exclusive games unlocked for Gold Members!';
        unlockMsg.style.fontSize = '0.9em';

        var gamesGrid = document.querySelector('.games-grid');
        if (gamesGrid) {
          gamesGrid.parentNode.insertBefore(unlockMsg, gamesGrid);
        }
      }
    }

    // ── Show aggressive CTAs for Bronze tier ──────────────────────────
    if (tier === 'bronze') {
      var welcomeSection = document.querySelector('[data-welcome-section]');
      if (!welcomeSection) {
        welcomeSection = document.createElement('div');
        welcomeSection.setAttribute('data-welcome-section', 'true');
        welcomeSection.style.padding = '16px';
        welcomeSection.style.backgroundColor = '#fff0f0';
        welcomeSection.style.borderRadius = '8px';
        welcomeSection.style.marginBottom = '16px';
        welcomeSection.style.textAlign = 'center';
        welcomeSection.style.border = '2px solid #ff4444';

        welcomeSection.innerHTML = `
          <div style="font-size: 1.2em; font-weight: bold; margin-bottom: 8px;">
            🎉 Massive Welcome Bonus
          </div>
          <div style="font-size: 0.95em; color: #666; margin-bottom: 12px;">
            Get up to 200% match on your first deposit!
          </div>
          <button style="padding: 10px 24px; background: #ff4444; color: white;
                        border: none; border-radius: 6px; font-weight: bold;
                        cursor: pointer; font-size: 1em;">
            CLAIM NOW
          </button>
        `;

        var mainContent = document.querySelector('[data-main-content]') || document.querySelector('.main-content');
        if (mainContent) {
          mainContent.insertBefore(welcomeSection, mainContent.firstChild);
        }
      }

      // Show "Unlock VIP" messaging
      var unlockVipMsg = document.querySelector('[data-unlock-vip-msg]');
      if (!unlockVipMsg) {
        unlockVipMsg = document.createElement('div');
        unlockVipMsg.setAttribute('data-unlock-vip-msg', 'true');
        unlockVipMsg.style.padding = '8px 12px';
        unlockVipMsg.style.backgroundColor = '#f0f0f0';
        unlockVipMsg.style.borderRadius = '4px';
        unlockVipMsg.style.fontSize = '0.85em';
        unlockVipMsg.style.marginTop = '8px';
        unlockVipMsg.innerHTML = '📈 Deposit to unlock Silver, Gold, Platinum & Diamond VIP tiers';

        var depositBtn = document.querySelector('[data-deposit-button]') || document.querySelector('.deposit-btn');
        if (depositBtn && depositBtn.parentNode) {
          depositBtn.parentNode.insertBefore(unlockVipMsg, depositBtn.nextSibling);
        }
      }
    }
  }

  /**
   * Export public API
   */
  window.LTVPersonalization = {
    init: init,
    getTier: getTier,
    getPersonalizedOffer: getPersonalizedOffer,
    showTierElements: showTierElements
  };
})();
