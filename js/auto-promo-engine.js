/**
 * Matrix Spins Casino - Auto Promo Engine
 * Manages time-based and event-based automatic promotions
 * IIFE module exposing window.AutoPromoEngine
 */
(function() {
  'use strict';

  var COLORS = {
    gold: '#ffd700',
    green: '#00ff41',
    purple: '#9d4edd',
    blue: '#4361ee',
    darkBg: '#1a1a2e'
  };

  var PROMO_SCHEDULE = {
    happyHour: {
      name: 'Happy Hour Double XP',
      message: 'HAPPY HOUR! 2X XP ON ALL SPINS',
      type: 'time',
      startHour: 18,
      endHour: 20,
      days: [0, 1, 2, 3, 4, 5, 6],
      color: COLORS.gold,
      theme: 'gold'
    },
    weekendWarrior: {
      name: 'Weekend Warrior Bonus',
      message: 'WEEKEND BONUS: 25% Extra on all deposits today!',
      type: 'time',
      days: [6, 0],
      allDay: true,
      color: COLORS.gold,
      theme: 'gold'
    },
    lateNightLegends: {
      name: 'Late Night Legends',
      message: 'NIGHT OWL BONUS: 50 Free Gems just for playing!',
      type: 'time',
      startHour: 23,
      endHour: 2,
      days: [0, 1, 2, 3, 4, 5, 6],
      color: COLORS.purple,
      theme: 'purple'
    },
    mondayReload: {
      name: 'Monday Reload',
      message: 'MONDAY BLUES CURE: 100% Reload Bonus Today',
      type: 'time',
      days: [1],
      allDay: true,
      color: COLORS.blue,
      theme: 'blue'
    },
    firstSpin: {
      name: 'First Spin of the Day',
      message: 'Your first spin today is BOOSTED! 3X winnings on your next spin!',
      type: 'event',
      color: COLORS.green,
      theme: 'green'
    },
    milestone100: {
      name: 'Milestone Celebration - 100 Spins',
      message: 'Congratulations! You\'ve reached 100 spins!',
      type: 'event',
      milestone: 100,
      color: COLORS.gold,
      theme: 'gold'
    },
    milestone500: {
      name: 'Milestone Celebration - 500 Spins',
      message: 'Epic! 500 spins! Claim 100 bonus gems!',
      type: 'event',
      milestone: 500,
      reward: 100,
      color: COLORS.gold,
      theme: 'gold'
    },
    milestone1000: {
      name: 'Milestone Celebration - 1000 Spins',
      message: 'LEGENDARY! 1000 spins! Claim 500 bonus gems!',
      type: 'event',
      milestone: 1000,
      reward: 500,
      color: COLORS.gold,
      theme: 'gold'
    }
  };

  var state = {
    activePromos: [],
    activeToast: null,
    bannerVisible: true,
    currentBannerIndex: 0,
    firstSpinBoostedToday: false,
    checkInterval: null,
    lastSpinCount: 0
  };

  // Utility: Check if QA mode or bonus suppression is enabled
  var isQAMode = function() {
    return window._qaMode || (window.location.search || '').indexOf('noBonus') !== -1;
  };

  // Utility: Get current local hour
  var getCurrentHour = function() {
    return new Date().getHours();
  };

  // Utility: Get current local day of week (0=Sunday, 6=Saturday)
  var getCurrentDayOfWeek = function() {
    return new Date().getDay();
  };

  // Utility: Check if an hour range spans midnight (e.g., 23-2)
  var isTimeInMidnightRange = function(currentHour, startHour, endHour) {
    if (startHour < endHour) {
      return currentHour >= startHour && currentHour < endHour;
    }
    // Spans midnight
    return currentHour >= startHour || currentHour < endHour;
  };

  // Utility: Check if a time-based promo should be active now
  var isPromoActiveNow = function(promo) {
    if (promo.type !== 'time') return false;

    var currentDay = getCurrentDayOfWeek();
    var dayMatch = promo.days.indexOf(currentDay) !== -1;
    if (!dayMatch) return false;

    if (promo.allDay) {
      return true;
    }

    var currentHour = getCurrentHour();
    return isTimeInMidnightRange(currentHour, promo.startHour, promo.endHour);
  };

  // Check all promos and update active list
  var checkPromos = function() {
    if (isQAMode()) return;

    var newActivePromos = [];
    var keys = Object.keys(PROMO_SCHEDULE);

    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      var promo = PROMO_SCHEDULE[key];

      if (promo.type === 'time' && isPromoActiveNow(promo)) {
        newActivePromos.push({ key: key, promo: promo });
      }
    }

    // Check first spin promo
    if (state.firstSpinBoostedToday) {
      var firstSpinPromo = PROMO_SCHEDULE.firstSpin;
      newActivePromos.push({ key: 'firstSpin', promo: firstSpinPromo });
    }

    // Compare with previous active promos to detect new activations
    var previousActiveKeys = state.activePromos.map(function(p) { return p.key; });
    var currentActiveKeys = newActivePromos.map(function(p) { return p.key; });

    for (var j = 0; j < currentActiveKeys.length; j++) {
      var key = currentActiveKeys[j];
      if (previousActiveKeys.indexOf(key) === -1) {
        // New promo activated
        showPromoToast(newActivePromos.find(function(p) { return p.key === key; }));
      }
    }

    state.activePromos = newActivePromos;
    updateBannerStrip();
  };

  // Get all active promotions
  var getActivePromos = function() {
    return state.activePromos;
  };

  // Show a toast notification when a promo activates
  var showPromoToast = function(activePromo) {
    var message = 'NEW PROMO ACTIVE: ' + activePromo.promo.name;

    // Clear existing toast if any
    if (state.activeToast) {
      clearPromoToast();
    }

    var toast = document.createElement('div');
    toast.id = 'promo-toast';
    toast.style.cssText = [
      'position: fixed',
      'right: -400px',
      'top: 60px',
      'background: ' + activePromo.promo.color,
      'color: ' + COLORS.darkBg,
      'padding: 12px 16px',
      'border-radius: 4px',
      'z-index: 10000',
      'font-weight: bold',
      'font-family: Arial, sans-serif',
      'font-size: 13px',
      'box-shadow: 0 2px 8px rgba(0,0,0,0.3)',
      'transition: right 0.3s ease-out'
    ].join(';');
    toast.textContent = message;

    document.body.appendChild(toast);
    state.activeToast = toast;

    // Slide in
    setTimeout(function() {
      toast.style.right = '16px';
    }, 10);

    // Auto-dismiss after 5 seconds
    setTimeout(function() {
      clearPromoToast();
    }, 5000);
  };

  // Clear the promo toast
  var clearPromoToast = function() {
    if (state.activeToast) {
      state.activeToast.style.right = '-400px';
      setTimeout(function() {
        if (state.activeToast && state.activeToast.parentNode) {
          state.activeToast.parentNode.removeChild(state.activeToast);
        }
        state.activeToast = null;
      }, 300);
    }
  };

  // Update the banner strip with active promos
  var updateBannerStrip = function() {
    var container = document.getElementById('promo-banner-strip');
    if (!container) return;

    if (state.activePromos.length === 0) {
      container.style.display = 'none';
      return;
    }

    container.style.display = 'flex';

    // Clear existing content
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }

    // Create banner for current promo
    var currentPromo = state.activePromos[state.currentBannerIndex % state.activePromos.length];
    var banner = document.createElement('div');
    banner.className = 'promo-banner-item';
    banner.style.cssText = [
      'flex: 1',
      'background: linear-gradient(90deg, ' + currentPromo.promo.color + '22, ' + currentPromo.promo.color + '11)',
      'border-left: 3px solid ' + currentPromo.promo.color,
      'padding: 10px 16px',
      'color: ' + currentPromo.promo.color,
      'font-weight: bold',
      'font-family: Arial, sans-serif',
      'font-size: 12px',
      'text-transform: uppercase',
      'letter-spacing: 0.5px',
      'display: flex',
      'align-items: center',
      'justify-content: space-between'
    ].join(';');

    var messageSpan = document.createElement('span');
    messageSpan.textContent = currentPromo.promo.message;
    banner.appendChild(messageSpan);

    // Dismiss button
    var dismissBtn = document.createElement('button');
    dismissBtn.textContent = '✕';
    dismissBtn.style.cssText = [
      'background: none',
      'border: none',
      'color: ' + currentPromo.promo.color,
      'font-size: 14px',
      'cursor: pointer',
      'padding: 0 8px',
      'margin-left: 8px'
    ].join(';');

    dismissBtn.onclick = function() {
      state.bannerVisible = false;
      container.style.display = 'none';
    };
    banner.appendChild(dismissBtn);

    container.appendChild(banner);
  };

  // Rotate banner to next promo every 5 seconds
  var startBannerCycle = function() {
    setInterval(function() {
      if (state.activePromos.length > 1 && state.bannerVisible) {
        state.currentBannerIndex = (state.currentBannerIndex + 1) % state.activePromos.length;
        updateBannerStrip();
      }
    }, 5000);
  };

  // Check for first spin of the day
  var checkFirstSpinOfDay = function() {
    var today = new Date().toDateString();
    var lastSpinDate = localStorage.getItem('lastSpinDate');
    var isNewDay = lastSpinDate !== today;

    if (isNewDay) {
      state.firstSpinBoostedToday = true;
      localStorage.setItem('lastSpinDate', today);
      updateBannerStrip();
    }
  };

  // Check for milestone achievements
  var checkMilestones = function(spinCount) {
    var milestones = [100, 500, 1000];

    for (var i = 0; i < milestones.length; i++) {
      var milestone = milestones[i];
      if (spinCount > 0 && spinCount % milestone === 0 && spinCount !== state.lastSpinCount) {
        var key = 'milestone' + milestone;
        var promo = PROMO_SCHEDULE[key];

        if (promo) {
          showPromoToast({ key: key, promo: promo });
        }
      }
    }

    state.lastSpinCount = spinCount;
  };

  // Listen for milestone events from the game
  var setupEventListeners = function() {
    if (document.addEventListener) {
      document.addEventListener('spinMilestone', function(event) {
        var spinCount = event.detail ? event.detail.spinCount : 0;
        checkMilestones(spinCount);
      });

      document.addEventListener('spinEvent', function(event) {
        checkFirstSpinOfDay();
      });
    }
  };

  // Check if first spin boost is active
  var isFirstSpinBoosted = function() {
    return state.firstSpinBoostedToday;
  };

  // Clear first spin boost (called after spin completes)
  var clearFirstSpinBoost = function() {
    state.firstSpinBoostedToday = false;
    updateBannerStrip();
  };

  // Initialize the module
  var init = function() {
    if (isQAMode()) {
      console.warn('AutoPromoEngine: QA Mode detected, promotions suppressed');
      return;
    }

    console.warn('AutoPromoEngine: Initializing');

    // Create banner strip if it doesn't exist
    if (!document.getElementById('promo-banner-strip')) {
      var bannerStrip = document.createElement('div');
      bannerStrip.id = 'promo-banner-strip';
      bannerStrip.style.cssText = [
        'position: fixed',
        'top: 0',
        'left: 0',
        'right: 0',
        'height: 40px',
        'background: ' + COLORS.darkBg,
        'border-bottom: 1px solid ' + COLORS.gold,
        'z-index: 9999',
        'display: none'
      ].join(';');
      document.body.insertBefore(bannerStrip, document.body.firstChild);
    }

    // Initial promo check
    checkFirstSpinOfDay();
    checkPromos();

    // Set up event listeners
    setupEventListeners();

    // Start banner cycling
    startBannerCycle();

    // Re-check promos every 60 seconds (handles hour transitions)
    state.checkInterval = setInterval(function() {
      checkPromos();
    }, 60000);

    console.warn('AutoPromoEngine: Initialization complete');
  };

  // Expose public API
  window.AutoPromoEngine = {
    init: init,
    checkPromos: checkPromos,
    getActivePromos: getActivePromos,
    isFirstSpinBoosted: isFirstSpinBoosted,
    clearFirstSpinBoost: clearFirstSpinBoost
  };

})();
