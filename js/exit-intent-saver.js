(function() {
  'use strict';

  // Exit Intent Saver - Detects player churn and offers retention incentives
  var ExitIntentSaver = {
    // Configuration
    config: {
      minSessionTime: 60000,           // Don't show within first 60 seconds
      idleTimeout: 90000,              // Show nudge after 90 seconds of inactivity
      offerExpiryTime: 120000,         // Offer expires in 2 minutes
      noOfferIfDepositedWithin: 5 * 60 * 1000,  // Don't show if deposited in last 5 min
      sessionStorageKey: 'exitOfferShown',
      timerInterval: 100               // Update countdown every 100ms
    },

    // State tracking
    state: {
      offerShown: false,
      offerShownTime: null,
      lastInteractionTime: Date.now(),
      isSpinning: false,
      overlayElement: null,
      timerInterval: null
    },

    // Initialize the module
    init: function() {
      // Check QA mode first
      if (this.isQAMode()) {
        console.warn('[ExitIntentSaver] QA mode detected, exit intent disabled');
        return;
      }

      // Restore session state
      if (sessionStorage.getItem(this.config.sessionStorageKey)) {
        this.state.offerShown = true;
      }

      // Setup event listeners
      this.setupEventListeners();
      this.setupIdleDetection();

      console.warn('[ExitIntentSaver] Module initialized');
    },

    // Check if QA mode is enabled
    isQAMode: function() {
      return window._qaMode || (window.location.search || '').indexOf('noBonus') !== -1;
    },

    // Setup primary exit detection listeners
    setupEventListeners: function() {
      var self = this;

      // Mouse leaves viewport from top (desktop only)
      document.addEventListener('mouseleave', function(e) {
        if (self.shouldTriggerOffer() && e.clientY < 0) {
          console.warn('[ExitIntentSaver] Mouse exit detected from top');
          self.triggerOffer('mouse-exit');
        }
      });

      // Tab visibility change
      document.addEventListener('visibilitychange', function() {
        if (document.hidden && self.shouldTriggerOffer()) {
          console.warn('[ExitIntentSaver] Tab hidden detected');
          self.triggerOffer('visibility-change');
        }
      });

      // Before unload (back button or navigation)
      window.addEventListener('beforeunload', function() {
        if (self.shouldTriggerOffer()) {
          console.warn('[ExitIntentSaver] Unload intent detected');
          self.recordUnloadIntent();
        }
        // Note: We don't prevent navigation, just record it
      });

      // Track user interactions for idle detection
      document.addEventListener('mousemove', function() {
        self.state.lastInteractionTime = Date.now();
      });

      document.addEventListener('keydown', function() {
        self.state.lastInteractionTime = Date.now();
      });

      document.addEventListener('touchstart', function() {
        self.state.lastInteractionTime = Date.now();
      });

      // Listen for spin start/end events if they exist
      document.addEventListener('spinStart', function() {
        self.state.isSpinning = true;
      });

      document.addEventListener('spinEnd', function() {
        self.state.isSpinning = false;
      });
    },

    // Setup idle detection with timeout
    setupIdleDetection: function() {
      var self = this;

      setInterval(function() {
        var timeSinceInteraction = Date.now() - self.state.lastInteractionTime;

        // Show nudge after 90 seconds of inactivity
        if (timeSinceInteraction > self.config.idleTimeout && self.shouldTriggerOffer()) {
          console.warn('[ExitIntentSaver] Idle timeout detected');
          self.triggerOffer('idle-timeout');
        }
      }, 5000);  // Check every 5 seconds
    },

    // Determine if offer should be triggered
    shouldTriggerOffer: function() {
      // Already shown in this session
      if (this.state.offerShown) {
        return false;
      }

      // Still within grace period after session start
      if (Date.now() - window._sessionStartTime < this.config.minSessionTime) {
        return false;
      }

      // Player is actively spinning
      if (this.state.isSpinning) {
        return false;
      }

      // Check if player deposited recently
      var lastDepositTime = localStorage.getItem('lastDepositTime');
      if (lastDepositTime && Date.now() - parseInt(lastDepositTime) < this.config.noOfferIfDepositedWithin) {
        return false;
      }

      return true;
    },

    // Trigger the exit offer
    triggerOffer: function(trigger) {
      if (this.state.offerShown) {
        return;
      }

      this.state.offerShown = true;
      this.state.offerShownTime = Date.now();
      sessionStorage.setItem(this.config.sessionStorageKey, 'true');

      // Determine player tier and show appropriate offer
      var playerTier = this.getPlayerTier();
      console.warn('[ExitIntentSaver] Showing ' + playerTier + ' offer (trigger: ' + trigger + ')');

      this.showOverlay(playerTier);
    },

    // Determine player tier based on play history
    getPlayerTier: function() {
      var totalSpins = parseInt(localStorage.getItem('totalSpins') || '0');

      if (totalSpins >= 200) {
        return 'whale';
      } else if (totalSpins >= 50) {
        return 'regular';
      } else {
        return 'casual';
      }
    },

    // Create and show the offer overlay
    showOverlay: function(playerTier) {
      var self = this;

      // Create overlay container
      var overlay = document.createElement('div');
      overlay.id = 'exitIntentOverlay';
      overlay.style.cssText = this.getOverlayStyles();

      // Create card based on tier
      var card = document.createElement('div');
      card.style.cssText = this.getCardStyles();

      // Build offer content based on tier
      var offerData = this.getOfferData(playerTier);
      card.innerHTML = this.buildCardHTML(offerData);

      overlay.appendChild(card);
      document.body.appendChild(overlay);

      this.state.overlayElement = overlay;

      // Setup button handlers
      var stayButton = overlay.querySelector('.exit-stay-btn');
      var leaveButton = overlay.querySelector('.exit-leave-btn');

      stayButton.addEventListener('click', function() {
        self.handleStay(offerData);
      });

      leaveButton.addEventListener('click', function() {
        self.handleLeave();
      });

      // Start countdown timer
      this.startCountdown(overlay, offerData);

      // Prevent closing on overlay click
      overlay.addEventListener('click', function(e) {
        if (e.target === overlay) {
          // Don't close on overlay background click
          return;
        }
      });
    },

    // Get offer data based on player tier
    getOfferData: function(tier) {
      if (tier === 'whale') {
        return {
          tier: 'whale',
          headline: 'EXCLUSIVE: Your Personal VIP Offer',
          description: 'Your dedicated VIP host has a special offer just for you:',
          bonus: '200% Match up to $5,000',
          subtext: 'This exclusive deal is only available for the next 2 minutes',
          buttonText: 'CLAIM VIP OFFER'
        };
      } else if (tier === 'regular') {
        return {
          tier: 'regular',
          headline: 'DON\'T GO! Comeback Bonus Waiting',
          description: 'Activate your exclusive:',
          bonus: '50% Comeback Bonus',
          subtext: 'On your next deposit—available for 2 minutes only',
          buttonText: 'CLAIM & KEEP PLAYING'
        };
      } else {
        return {
          tier: 'casual',
          headline: 'WAIT! Free Gems Inside',
          description: 'Claim your bonus now:',
          bonus: '100 FREE GEMS',
          subtext: 'Use them on your favorite slots—expires in 2 minutes',
          buttonText: 'CLAIM & KEEP PLAYING'
        };
      }
    },

    // Build HTML for the offer card
    buildCardHTML: function(offerData) {
      var html = '<div class="exit-card-inner">';

      // Close button
      html += '<button class="exit-close-btn" aria-label="Close offer">&times;</button>';

      // Animated border
      html += '<div class="exit-animated-border"></div>';

      // Header
      html += '<h2 class="exit-headline">' + offerData.headline + '</h2>';

      // Description
      html += '<p class="exit-description">' + offerData.description + '</p>';

      // Bonus highlight
      html += '<div class="exit-bonus-highlight">' + offerData.bonus + '</div>';

      // Subtext
      html += '<p class="exit-subtext">' + offerData.subtext + '</p>';

      // Timer
      html += '<div class="exit-timer"><span class="exit-timer-label">Offer expires in:</span> <span class="exit-countdown">2:00</span></div>';

      // Buttons
      html += '<button class="exit-stay-btn">' + offerData.buttonText + '</button>';
      html += '<button class="exit-leave-btn">No thanks</button>';

      html += '</div>';
      return html;
    },

    // Get overlay styles
    getOverlayStyles: function() {
      return 'position:fixed;' +
             'top:0;' +
             'left:0;' +
             'width:100%;' +
             'height:100%;' +
             'background:rgba(10,10,26,0.85);' +
             'display:flex;' +
             'align-items:center;' +
             'justify-content:center;' +
             'z-index:99999;' +
             'font-family:Arial,sans-serif;';
    },

    // Get card styles
    getCardStyles: function() {
      return 'position:relative;' +
             'width:100%;' +
             'max-width:500px;' +
             'margin:20px;' +
             'background:linear-gradient(135deg, #1a1a2e 0%, #0f0f1e 100%);' +
             'border:2px solid #d4af37;' +
             'border-radius:12px;' +
             'padding:40px;' +
             'box-shadow:0 0 40px rgba(212,175,55,0.3),0 0 80px rgba(0,255,65,0.1);' +
             'text-align:center;' +
             'color:#ffffff;' +
             'animation:slideIn 0.4s ease-out;';
    },

    // Start countdown timer
    startCountdown: function(overlay, offerData) {
      var self = this;
      var expiryTime = this.state.offerShownTime + this.config.offerExpiryTime;
      var countdownElement = overlay.querySelector('.exit-countdown');

      var updateCountdown = function() {
        var timeRemaining = expiryTime - Date.now();

        if (timeRemaining <= 0) {
          self.handleExpired(overlay);
          return;
        }

        var minutes = Math.floor(timeRemaining / 60000);
        var seconds = Math.floor((timeRemaining % 60000) / 1000);
        var display = minutes + ':' + (seconds < 10 ? '0' : '') + seconds;

        if (countdownElement) {
          countdownElement.textContent = display;
        }
      };

      updateCountdown();
      this.state.timerInterval = setInterval(updateCountdown, this.config.timerInterval);
    },

    // Handle stay action
    handleStay: function(offerData) {
      console.warn('[ExitIntentSaver] Player accepted ' + offerData.tier + ' offer');

      // Record the offer acceptance
      localStorage.setItem('exitOfferAccepted', JSON.stringify({
        tier: offerData.tier,
        timestamp: Date.now()
      }));

      // Trigger appropriate action based on tier
      if (offerData.tier === 'casual') {
        this.applyCasualBonus();
      } else if (offerData.tier === 'regular') {
        this.applyRegularBonus();
      } else if (offerData.tier === 'whale') {
        this.applyWhaleBonus();
      }

      this.closeOverlay();
    },

    // Handle leave action
    handleLeave: function() {
      console.warn('[ExitIntentSaver] Player declined offer');
      this.closeOverlay();
    },

    // Handle offer expiry
    handleExpired: function(overlay) {
      console.warn('[ExitIntentSaver] Offer expired');
      this.closeOverlay();
    },

    // Apply casual player bonus
    applyCasualBonus: function() {
      // Emit event that deposit or gem system can listen to
      document.dispatchEvent(new CustomEvent('exitBonusActivated', {
        detail: { type: 'casual', gems: 100 }
      }));

      // Update UI
      var balanceEl = document.querySelector('[data-balance]');
      if (balanceEl) {
        var currentBalance = parseFloat(balanceEl.textContent || '0');
        balanceEl.textContent = (currentBalance + 100).toFixed(2);
      }
    },

    // Apply regular player bonus
    applyRegularBonus: function() {
      // Set flag for deposit system
      sessionStorage.setItem('comebackBonusActive', 'true');

      document.dispatchEvent(new CustomEvent('exitBonusActivated', {
        detail: { type: 'regular', bonusPercent: 50 }
      }));
    },

    // Apply whale player bonus
    applyWhaleBonus: function() {
      // Premium offer - show VIP modal or store for next deposit
      sessionStorage.setItem('vipOfferActive', 'true');

      document.dispatchEvent(new CustomEvent('exitBonusActivated', {
        detail: { type: 'whale', bonusPercent: 200, maxBonus: 5000 }
      }));
    },

    // Close the overlay
    closeOverlay: function() {
      if (this.state.timerInterval) {
        clearInterval(this.state.timerInterval);
        this.state.timerInterval = null;
      }

      if (this.state.overlayElement) {
        this.state.overlayElement.style.animation = 'slideOut 0.3s ease-in';

        var self = this;
        setTimeout(function() {
          if (self.state.overlayElement && self.state.overlayElement.parentNode) {
            self.state.overlayElement.parentNode.removeChild(self.state.overlayElement);
          }
          self.state.overlayElement = null;
        }, 300);
      }
    },

    // Record unload intent (for analytics)
    recordUnloadIntent: function() {
      localStorage.setItem('lastUnloadIntent', JSON.stringify({
        timestamp: Date.now(),
        offerShown: this.state.offerShown
      }));
    }
  };

  // Inject CSS animations
  function injectStyles() {
    var style = document.createElement('style');
    style.textContent = '@keyframes slideIn {' +
      'from { opacity:0; transform:translateY(20px); }' +
      'to { opacity:1; transform:translateY(0); }' +
      '}' +
      '@keyframes slideOut {' +
      'from { opacity:1; transform:translateY(0); }' +
      'to { opacity:0; transform:translateY(20px); }' +
      '}' +
      '@keyframes rotateBorder {' +
      'from { transform:rotate(0deg); }' +
      'to { transform:rotate(360deg); }' +
      '}' +
      '.exit-card-inner { position:relative; z-index:1; }' +
      '.exit-animated-border {' +
      'position:absolute;' +
      'top:-2px;' +
      'left:-2px;' +
      'right:-2px;' +
      'bottom:-2px;' +
      'background:linear-gradient(45deg, #ffd700, #d4af37, #ffd700);' +
      'border-radius:12px;' +
      'animation:rotateBorder 3s linear infinite;' +
      'opacity:0.5;' +
      'z-index:-1;' +
      '}' +
      '.exit-close-btn {' +
      'position:absolute;' +
      'top:15px;' +
      'right:15px;' +
      'background:none;' +
      'border:none;' +
      'color:#d4af37;' +
      'font-size:32px;' +
      'cursor:pointer;' +
      'padding:0;' +
      'width:44px;' +
      'height:44px;' +
      'display:flex;' +
      'align-items:center;' +
      'justify-content:center;' +
      'z-index:10;' +
      '}' +
      '.exit-headline {' +
      'font-size:28px;' +
      'font-weight:bold;' +
      'margin:20px 0 10px 0;' +
      'color:#ffd700;' +
      'text-shadow:0 0 10px rgba(255,215,0,0.5);' +
      '}' +
      '.exit-description {' +
      'font-size:16px;' +
      'margin:10px 0;' +
      'color:#cccccc;' +
      '}' +
      '.exit-bonus-highlight {' +
      'background:linear-gradient(90deg, rgba(0,255,65,0.2), rgba(212,175,55,0.2));' +
      'border:2px solid #00ff41;' +
      'border-radius:8px;' +
      'padding:20px;' +
      'margin:20px 0;' +
      'font-size:32px;' +
      'font-weight:bold;' +
      'color:#00ff41;' +
      'text-shadow:0 0 10px rgba(0,255,65,0.5);' +
      '}' +
      '.exit-subtext {' +
      'font-size:14px;' +
      'color:#999999;' +
      'margin:15px 0;' +
      'font-style:italic;' +
      '}' +
      '.exit-timer {' +
      'margin:20px 0;' +
      'font-size:16px;' +
      'color:#d4af37;' +
      '}' +
      '.exit-countdown {' +
      'font-weight:bold;' +
      'font-size:20px;' +
      'color:#00ff41;' +
      '}' +
      '.exit-stay-btn {' +
      'display:block;' +
      'width:100%;' +
      'padding:16px;' +
      'margin:20px 0 10px 0;' +
      'background:linear-gradient(135deg, #00ff41, #00cc33);' +
      'border:none;' +
      'border-radius:8px;' +
      'color:#000000;' +
      'font-size:16px;' +
      'font-weight:bold;' +
      'cursor:pointer;' +
      'min-height:44px;' +
      'transition:all 0.3s ease;' +
      'box-shadow:0 0 20px rgba(0,255,65,0.4);' +
      '}' +
      '.exit-stay-btn:hover {' +
      'background:linear-gradient(135deg, #00ff41, #00dd3a);' +
      'box-shadow:0 0 30px rgba(0,255,65,0.6);' +
      'transform:translateY(-2px);' +
      '}' +
      '.exit-leave-btn {' +
      'background:none;' +
      'border:none;' +
      'color:#666666;' +
      'font-size:12px;' +
      'cursor:pointer;' +
      'padding:10px;' +
      'text-decoration:none;' +
      'transition:color 0.2s;' +
      'min-height:44px;' +
      'display:flex;' +
      'align-items:center;' +
      'justify-content:center;' +
      'width:100%;' +
      '}' +
      '.exit-leave-btn:hover {' +
      'color:#888888;' +
      '}';
    document.head.appendChild(style);
  }

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      injectStyles();
      ExitIntentSaver.init();
    });
  } else {
    injectStyles();
    ExitIntentSaver.init();
  }

  // Set session start time if not already set
  if (!window._sessionStartTime) {
    window._sessionStartTime = Date.now();
  }

  // Expose public API
  window.ExitIntentSaver = ExitIntentSaver;
})();
