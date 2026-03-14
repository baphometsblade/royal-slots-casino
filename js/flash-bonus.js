(function() {
  var FlashBonus = {};

  // === STATE ===
  var state = {
    activeBonus: null,
    lastBonusEnd: 0,
    bonusesClaimed: 0,
    sessionStartTime: Date.now(),
    spinsSinceLastBonus: 0,
    userBonusHistory: []
  };

  // === BONUS TYPES ===
  var BONUS_TYPES = {
    HAPPY_HOUR: {
      id: 'happy-hour',
      name: 'Happy Hour',
      multiplier: 2,
      duration: 15 * 60 * 1000, // 15 minutes
      icon: '🎉',
      color: 'gold',
      description: '2x deposit match'
    },
    LIGHTNING_DEAL: {
      id: 'lightning-deal',
      name: 'Lightning Deal',
      multiplier: 3,
      duration: 5 * 60 * 1000, // 5 minutes
      icon: '⚡',
      color: 'red',
      description: '$10 deposit = $30 to play!'
    },
    VIP_FLASH: {
      id: 'vip-flash',
      name: 'VIP Flash',
      multiplier: 3,
      duration: 10 * 60 * 1000, // 10 minutes
      icon: '👑',
      color: 'gold',
      description: '3x deposit match for $50+ deposits'
    },
    WEEKEND_SPECIAL: {
      id: 'weekend-special',
      name: 'Weekend Special',
      multiplier: 1.5,
      duration: null, // persistent
      icon: '🎊',
      color: 'green',
      description: 'Extra 50% on any deposit'
    },
    NIGHT_OWL: {
      id: 'night-owl',
      name: 'Night Owl Bonus',
      multiplier: 1.75,
      duration: null, // until 4am
      icon: '🦉',
      color: 'gold',
      description: '75% extra for playing late'
    }
  };

  // === COLOR PALETTE ===
  var COLORS = {
    dark: '#0a0a1a',
    gold: '#d4af37',
    red: '#e74c3c',
    green: '#27ae60',
    white: '#ffffff',
    darkGold: '#b8960f'
  };

  // === UTILITY: Format time MM:SS ===
  var formatTime = function(ms) {
    var totalSeconds = Math.floor(ms / 1000);
    var minutes = Math.floor(totalSeconds / 60);
    var seconds = totalSeconds % 60;
    return (minutes < 10 ? '0' : '') + minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
  };

  // === UTILITY: Check if weekend ===
  var isWeekend = function() {
    var day = new Date().getDay();
    return day === 0 || day === 6; // Sunday or Saturday
  };

  // === UTILITY: Check if night owl hours (10pm-4am) ===
  var isNightOwlHours = function() {
    var hour = new Date().getHours();
    return hour >= 22 || hour < 4;
  };

  // === UTILITY: Create element with class and id ===
  var createElement = function(tag, className, id) {
    var el = document.createElement(tag);
    if (className) el.className = className;
    if (id) el.id = id;
    return el;
  };

  // === CREATE: Flash Banner ===
  var createFlashBanner = function() {
    var container = createElement('div', 'flash-bonus-banner-container', 'flash-bonus-banner');
    container.style.cssText = 'position:fixed;top:0;left:0;right:0;height:40px;z-index:9990;' +
      'background:linear-gradient(90deg,' + COLORS.gold + ',' + COLORS.red + ');' +
      'display:none;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.5);';

    var content = createElement('div', 'flash-banner-content');
    content.style.cssText = 'display:flex;align-items:center;justify-content:space-between;' +
      'height:100%;padding:0 20px;color:' + COLORS.dark + ';font-weight:bold;';

    var textContainer = createElement('div', 'flash-banner-text');
    textContainer.style.cssText = 'display:flex;align-items:center;gap:12px;flex:1;';

    var bonusText = createElement('span', 'flash-bonus-text');
    bonusText.style.cssText = 'font-size:14px;';
    bonusText.textContent = '⚡ FLASH BONUS: Loading...';

    var timerDisplay = createElement('span', 'flash-bonus-timer');
    timerDisplay.style.cssText = 'font-size:16px;font-weight:900;min-width:60px;';
    timerDisplay.textContent = '15:00';

    textContainer.appendChild(bonusText);
    textContainer.appendChild(timerDisplay);

    var claimBtn = createElement('button', 'flash-bonus-claim-btn');
    claimBtn.style.cssText = 'background:' + COLORS.dark + ';color:' + COLORS.gold + ';' +
      'border:none;padding:8px 16px;border-radius:4px;font-weight:bold;font-size:12px;' +
      'cursor:pointer;white-space:nowrap;margin-left:16px;' +
      'transition:all 0.3s ease;box-shadow:0 2px 8px rgba(0,0,0,0.4);';
    claimBtn.textContent = 'CLAIM NOW';
    claimBtn.onmouseover = function() {
      claimBtn.style.background = COLORS.darkGold;
      claimBtn.style.transform = 'scale(1.05)';
    };
    claimBtn.onmouseout = function() {
      claimBtn.style.background = COLORS.dark;
      claimBtn.style.transform = 'scale(1)';
    };
    claimBtn.onclick = handleClaimBonus;

    content.appendChild(textContainer);
    content.appendChild(claimBtn);
    container.appendChild(content);

    document.body.appendChild(container);
    return container;
  };

  // === CREATE: Flash Popup ===
  var createFlashPopup = function() {
    var overlay = createElement('div', 'flash-bonus-overlay', 'flash-bonus-popup');
    overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;' +
      'background:rgba(10,10,26,0.85);z-index:9995;display:none;' +
      'align-items:center;justify-content:center;backdrop-filter:blur(4px);';

    var card = createElement('div', 'flash-popup-card');
    card.style.cssText = 'background:' + COLORS.dark + ';border:2px solid ' + COLORS.gold + ';' +
      'border-radius:8px;padding:32px;max-width:400px;text-align:center;' +
      'box-shadow:0 8px 32px rgba(212,175,55,0.3);animation:flash-popup-enter 0.4s ease;';

    // Bonus icon and name
    var icon = createElement('div', 'flash-popup-icon');
    icon.style.cssText = 'font-size:48px;margin-bottom:16px;';
    icon.textContent = '⚡';

    var name = createElement('h2', 'flash-popup-name');
    name.style.cssText = 'color:' + COLORS.gold + ';margin:0 0 8px 0;font-size:24px;';
    name.textContent = 'Flash Bonus';

    // Timer display - large digital clock style
    var timerContainer = createElement('div', 'flash-popup-timer-container');
    timerContainer.style.cssText = 'background:rgba(212,175,55,0.1);border:2px solid ' +
      COLORS.gold + ';border-radius:6px;padding:16px;margin:20px 0;';

    var timerLabel = createElement('div', 'flash-popup-timer-label');
    timerLabel.style.cssText = 'color:' + COLORS.gold + ';font-size:11px;letter-spacing:1px;' +
      'text-transform:uppercase;margin-bottom:8px;';
    timerLabel.textContent = 'Time Remaining';

    var timerDisplay = createElement('div', 'flash-popup-timer-display');
    timerDisplay.style.cssText = 'color:' + COLORS.gold + ';font-size:48px;' +
      'font-weight:900;font-family:monospace;letter-spacing:4px;';
    timerDisplay.textContent = '15:00';

    timerContainer.appendChild(timerLabel);
    timerContainer.appendChild(timerDisplay);

    // Description
    var description = createElement('p', 'flash-popup-description');
    description.style.cssText = 'color:#ccc;font-size:14px;margin:16px 0;line-height:1.5;';
    description.textContent = '2x deposit match on all deposits';

    // Multiplier badge
    var badge = createElement('div', 'flash-popup-badge');
    badge.style.cssText = 'display:inline-block;background:' + COLORS.red + ';' +
      'color:white;padding:8px 16px;border-radius:4px;font-weight:bold;' +
      'margin:12px 0;font-size:18px;';
    badge.textContent = '2x';

    // Buttons
    var buttonContainer = createElement('div', 'flash-popup-buttons');
    buttonContainer.style.cssText = 'display:flex;gap:12px;margin-top:24px;';

    var depositBtn = createElement('button', 'flash-popup-deposit-btn');
    depositBtn.style.cssText = 'flex:1;background:' + COLORS.green + ';color:white;' +
      'border:none;padding:12px;border-radius:4px;font-weight:bold;font-size:14px;' +
      'cursor:pointer;transition:all 0.3s ease;';
    depositBtn.textContent = 'DEPOSIT NOW';
    depositBtn.onmouseover = function() {
      depositBtn.style.opacity = '0.9';
      depositBtn.style.transform = 'translateY(-2px)';
    };
    depositBtn.onmouseout = function() {
      depositBtn.style.opacity = '1';
      depositBtn.style.transform = 'translateY(0)';
    };
    depositBtn.onclick = handleClaimBonus;

    var skipBtn = createElement('button', 'flash-popup-skip-btn');
    skipBtn.style.cssText = 'flex:1;background:transparent;color:' + COLORS.gold + ';' +
      'border:1px solid ' + COLORS.gold + ';padding:12px;border-radius:4px;' +
      'font-weight:bold;font-size:14px;cursor:pointer;transition:all 0.3s ease;';
    skipBtn.textContent = 'Skip';
    skipBtn.onmouseover = function() {
      skipBtn.style.background = 'rgba(212,175,55,0.1)';
    };
    skipBtn.onmouseout = function() {
      skipBtn.style.background = 'transparent';
    };
    skipBtn.onclick = function() {
      hideFlashPopup();
    };

    buttonContainer.appendChild(depositBtn);
    buttonContainer.appendChild(skipBtn);

    card.appendChild(icon);
    card.appendChild(name);
    card.appendChild(timerContainer);
    card.appendChild(description);
    card.appendChild(badge);
    card.appendChild(buttonContainer);

    overlay.appendChild(card);
    document.body.appendChild(overlay);

    return overlay;
  };

  // === CREATE: Floating Timer Badge ===
  var createFloatingBadge = function() {
    var badge = createElement('div', 'flash-bonus-badge', 'flash-bonus-badge');
    badge.style.cssText = 'position:fixed;bottom:30px;right:30px;z-index:9991;' +
      'width:60px;height:60px;border-radius:50%;' +
      'background:' + COLORS.dark + ';border:3px solid ' + COLORS.gold + ';' +
      'display:none;align-items:center;justify-content:center;' +
      'flex-direction:column;cursor:pointer;box-shadow:0 4px 16px rgba(212,175,55,0.4);' +
      'transition:all 0.3s ease;';

    var timeText = createElement('span', 'badge-time');
    timeText.style.cssText = 'color:' + COLORS.gold + ';font-size:12px;font-weight:bold;' +
      'text-align:center;';
    timeText.textContent = '15:00';

    var labelText = createElement('span', 'badge-label');
    labelText.style.cssText = 'color:' + COLORS.gold + ';font-size:8px;' +
      'text-transform:uppercase;margin-top:2px;';
    labelText.textContent = 'Bonus';

    badge.appendChild(timeText);
    badge.appendChild(labelText);

    badge.onmouseover = function() {
      badge.style.transform = 'scale(1.1)';
      badge.style.background = 'rgba(212,175,55,0.1)';
    };
    badge.onmouseout = function() {
      badge.style.transform = 'scale(1)';
      badge.style.background = COLORS.dark;
    };
    badge.onclick = function() {
      var popup = document.getElementById('flash-bonus-popup');
      if (popup && popup.style.display === 'none') {
        showFlashPopup();
      }
    };

    document.body.appendChild(badge);
    return badge;
  };

  // === DOM GETTERS ===
  var getBanner = function() {
    return document.getElementById('flash-bonus-banner');
  };
  var getPopup = function() {
    return document.getElementById('flash-bonus-popup');
  };
  var getBadge = function() {
    return document.getElementById('flash-bonus-badge');
  };

  // === SHOW: Flash Banner ===
  var showFlashBanner = function() {
    var banner = getBanner();
    if (!banner) return;
    banner.style.display = 'block';
    banner.style.animation = 'flash-banner-slide-down 0.5s ease forwards';
    startBannerTimer();
  };

  // === HIDE: Flash Banner ===
  var hideFlashBanner = function() {
    var banner = getBanner();
    if (!banner) return;
    banner.style.animation = 'flash-banner-slide-up 0.5s ease forwards';
    setTimeout(function() {
      banner.style.display = 'none';
    }, 500);
  };

  // === SHOW: Flash Popup ===
  var showFlashPopup = function() {
    var popup = getPopup();
    if (!popup) return;
    popup.style.display = 'flex';
    popup.style.animation = 'flash-popup-fade-in 0.3s ease';
    startPopupTimer();
  };

  // === HIDE: Flash Popup ===
  var hideFlashPopup = function() {
    var popup = getPopup();
    if (!popup) return;
    popup.style.display = 'none';
  };

  // === UPDATE: Banner Timer ===
  var startBannerTimer = function() {
    if (!state.activeBonus) return;

    var timerDisplay = document.querySelector('.flash-bonus-timer');
    var bonusText = document.querySelector('.flash-bonus-text');
    var banner = getBanner();

    var remaining = state.activeBonus.endTime - Date.now();
    var interval = setInterval(function() {
      remaining -= 100;
      if (remaining <= 0) {
        clearInterval(interval);
        state.activeBonus = null;
        hideFlashBanner();
        hideBadge();
        return;
      }

      if (timerDisplay) {
        timerDisplay.textContent = formatTime(remaining);

        // Pulse animation when under 2 minutes
        if (remaining < 2 * 60 * 1000) {
          banner.style.animation = 'flash-banner-pulse 0.6s ease infinite';
        }
      }

      if (bonusText && state.activeBonus) {
        bonusText.textContent = '⚡ FLASH BONUS: ' + state.activeBonus.type.description;
      }
    }, 100);
  };

  // === UPDATE: Popup Timer ===
  var startPopupTimer = function() {
    if (!state.activeBonus) return;

    var timerDisplay = document.querySelector('.flash-popup-timer-display');

    var remaining = state.activeBonus.endTime - Date.now();
    var interval = setInterval(function() {
      remaining -= 100;
      if (remaining <= 0) {
        clearInterval(interval);
        hideFlashPopup();
        return;
      }

      if (timerDisplay) {
        timerDisplay.textContent = formatTime(remaining);
      }
    }, 100);
  };

  // === UPDATE: Badge Timer ===
  var updateBadgeTimer = function() {
    if (!state.activeBonus) return;

    var badge = getBadge();
    var timeText = badge ? badge.querySelector('.badge-time') : null;

    var remaining = state.activeBonus.endTime - Date.now();
    var interval = setInterval(function() {
      remaining -= 100;
      if (remaining <= 0) {
        clearInterval(interval);
        hideBadge();
        return;
      }

      if (timeText) {
        timeText.textContent = formatTime(remaining);
      }
    }, 100);
  };

  // === SHOW: Badge (when banner scrolled out) ===
  var showBadge = function() {
    var badge = getBadge();
    if (!badge) return;
    badge.style.display = 'flex';
    updateBadgeTimer();
  };

  // === HIDE: Badge ===
  var hideBadge = function() {
    var badge = getBadge();
    if (!badge) return;
    badge.style.display = 'none';
  };

  // === UPDATE: Popup UI ===
  var updatePopupUI = function(bonus) {
    var popup = getPopup();
    if (!popup) return;

    var icon = popup.querySelector('.flash-popup-icon');
    var name = popup.querySelector('.flash-popup-name');
    var description = popup.querySelector('.flash-popup-description');
    var badge = popup.querySelector('.flash-popup-badge');

    if (icon) icon.textContent = bonus.type.icon;
    if (name) name.textContent = bonus.type.name;
    if (description) description.textContent = bonus.type.description;
    if (badge) {
      badge.textContent = bonus.type.multiplier + 'x';
      if (bonus.type.multiplier >= 3) {
        badge.style.background = COLORS.red;
      } else {
        badge.style.background = COLORS.gold;
      }
    }
  };

  // === ACTIVATE: Bonus ===
  var activateBonus = function(bonusType) {
    // Cooldown check
    if (state.lastBonusEnd && Date.now() - state.lastBonusEnd < 60 * 1000) {
      console.warn('[FlashBonus] Bonus cooldown active, skipping');
      return false;
    }

    var duration = bonusType.duration || (60 * 60 * 1000); // Default 1 hour if no duration
    var now = Date.now();

    state.activeBonus = {
      type: bonusType,
      startTime: now,
      endTime: now + duration,
      claimed: false
    };

    // Track history
    state.userBonusHistory.push({
      type: bonusType.id,
      activatedAt: now,
      claimed: false
    });

    console.warn('[FlashBonus] Activated: ' + bonusType.name);

    // Update UI
    updatePopupUI(state.activeBonus);
    showFlashBanner();

    // Show popup only for high-value bonuses
    if (bonusType.id === 'lightning-deal' || bonusType.id === 'vip-flash') {
      showFlashPopup();
    } else {
      showBadge();
    }

    return true;
  };

  // === CLAIM: Bonus ===
  var handleClaimBonus = function() {
    if (!state.activeBonus) return;

    state.activeBonus.claimed = true;
    state.bonusesClaimed += 1;

    console.warn('[FlashBonus] Bonus claimed: ' + state.activeBonus.type.name);

    // Try to open wallet/deposit modal
    if (typeof window.openWalletModal === 'function') {
      window.openWalletModal();
    } else if (typeof window.showDepositModal === 'function') {
      window.showDepositModal();
    } else {
      console.warn('[FlashBonus] No deposit modal available');
    }

    // Show confirmation
    showClaimConfirmation();

    // Hide popup after short delay
    setTimeout(function() {
      hideFlashPopup();
    }, 2000);
  };

  // === CONFIRMATION: Show claim success ===
  var showClaimConfirmation = function() {
    var confirmation = createElement('div', 'flash-bonus-confirmation');
    confirmation.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);' +
      'background:' + COLORS.green + ';color:white;padding:20px 32px;border-radius:6px;' +
      'font-weight:bold;z-index:9999;animation:flash-confirm-fade 0.5s ease forwards;' +
      'box-shadow:0 8px 24px rgba(39,174,96,0.4);';
    confirmation.textContent = '✓ Bonus activated! Deposit within the time limit.';

    document.body.appendChild(confirmation);

    setTimeout(function() {
      confirmation.style.opacity = '0';
      confirmation.style.transition = 'opacity 0.3s ease';
      setTimeout(function() {
        confirmation.remove();
      }, 300);
    }, 3000);
  };

  // === TRIGGER: Happy Hour ===
  var triggerHappyHour = function() {
    var randomInterval = 30000 + Math.random() * 30000; // 30-60 seconds for testing
    setTimeout(function() {
      if (!state.activeBonus) {
        activateBonus(BONUS_TYPES.HAPPY_HOUR);
        // Schedule next happy hour
        triggerHappyHour();
      } else {
        triggerHappyHour();
      }
    }, randomInterval);
  };

  // === TRIGGER: Lightning Deal (after spins) ===
  var checkLightningTrigger = function() {
    if (state.spinsSinceLastBonus >= 20 && !state.activeBonus) {
      if (Math.random() < 0.3) { // 30% chance
        activateBonus(BONUS_TYPES.LIGHTNING_DEAL);
        state.spinsSinceLastBonus = 0;
      }
    }
  };

  // === TRIGGER: VIP Flash (after many spins) ===
  var checkVIPTrigger = function() {
    if (state.spinsSinceLastBonus >= 100 && !state.activeBonus) {
      if (Math.random() < 0.15) { // 15% chance
        activateBonus(BONUS_TYPES.VIP_FLASH);
        state.spinsSinceLastBonus = 0;
      }
    }
  };

  // === TRIGGER: Weekend Special ===
  var checkWeekendSpecial = function() {
    if (isWeekend() && !state.activeBonus) {
      var existingWeekend = state.userBonusHistory.find(function(h) {
        return h.type === 'weekend-special';
      });
      if (!existingWeekend) {
        activateBonus(BONUS_TYPES.WEEKEND_SPECIAL);
      }
    }
  };

  // === TRIGGER: Night Owl Bonus ===
  var checkNightOwl = function() {
    if (isNightOwlHours() && !state.activeBonus) {
      var existingNightOwl = state.userBonusHistory.find(function(h) {
        return h.type === 'night-owl';
      });
      if (!existingNightOwl) {
        activateBonus(BONUS_TYPES.NIGHT_OWL);
      }
    }
  };

  // === INJECT: Animations into DOM ===
  var injectAnimations = function() {
    if (document.getElementById('flash-bonus-animations')) return;

    var style = document.createElement('style');
    style.id = 'flash-bonus-animations';
    style.textContent = `
      @keyframes flash-banner-slide-down {
        from {
          transform: translateY(-40px);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }

      @keyframes flash-banner-slide-up {
        from {
          transform: translateY(0);
          opacity: 1;
        }
        to {
          transform: translateY(-40px);
          opacity: 0;
        }
      }

      @keyframes flash-banner-pulse {
        0%, 100% {
          box-shadow: 0 4px 12px rgba(212,175,55,0.3);
        }
        50% {
          box-shadow: 0 4px 24px rgba(212,175,55,0.8);
        }
      }

      @keyframes flash-popup-fade-in {
        from {
          opacity: 0;
          transform: scale(0.95);
        }
        to {
          opacity: 1;
          transform: scale(1);
        }
      }

      @keyframes flash-popup-enter {
        from {
          opacity: 0;
          transform: scale(0.9) translateY(-20px);
        }
        to {
          opacity: 1;
          transform: scale(1) translateY(0);
        }
      }

      @keyframes flash-confirm-fade {
        from {
          opacity: 0;
          transform: scale(0.8);
        }
        to {
          opacity: 1;
          transform: scale(1);
        }
      }
    `;
    document.head.appendChild(style);
  };

  // === INIT: Public initialization ===
  FlashBonus.init = function() {
    console.warn('[FlashBonus] Initializing...');

    // Inject animations
    injectAnimations();

    // Create DOM elements
    createFlashBanner();
    createFlashPopup();
    createFloatingBadge();

    // Update state
    state.sessionStartTime = Date.now();

    // Start random happy hour timer
    triggerHappyHour();

    // Check for weekend special
    checkWeekendSpecial();

    // Check for night owl
    checkNightOwl();

    // Set up scroll listener for badge visibility
    window.addEventListener('scroll', function() {
      var banner = getBanner();
      if (!banner || banner.style.display === 'none') return;

      var bannerBottom = banner.offsetHeight;
      var scrollTop = window.pageYOffset || document.documentElement.scrollTop;

      if (scrollTop > bannerBottom + 100) {
        showBadge();
      } else {
        hideBadge();
      }
    });

    console.warn('[FlashBonus] Initialized successfully');
  };

  // === HOOK: Spin event ===
  FlashBonus.onSpin = function() {
    state.spinsSinceLastBonus += 1;
    checkLightningTrigger();
    checkVIPTrigger();
  };

  // === EXPOSE: Public API ===
  FlashBonus.getState = function() {
    return JSON.parse(JSON.stringify(state));
  };

  FlashBonus.getActiveBonus = function() {
    return state.activeBonus;
  };

  FlashBonus.claimBonus = function() {
    handleClaimBonus();
  };

  FlashBonus.triggerBonus = function(bonusTypeId) {
    var bonus = Object.keys(BONUS_TYPES).map(function(key) {
      return BONUS_TYPES[key];
    }).find(function(b) {
      return b.id === bonusTypeId;
    });

    if (bonus) {
      activateBonus(bonus);
      return true;
    }
    return false;
  };

  FlashBonus.getBonusHistory = function() {
    return state.userBonusHistory;
  };

  FlashBonus.getClaimed = function() {
    return state.bonusesClaimed;
  };

  // === EXPOSE: Global ===
  window.FlashBonus = FlashBonus;
})();
