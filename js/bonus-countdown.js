/**
 * Bonus Countdown Widget
 * Displays time-limited deposit bonus offers in the lobby with a countdown timer
 * Resets daily with different offers based on day of week
 */

(function() {
  'use strict';

  // Offer templates by day of week
  const DAILY_OFFERS = [
    { day: 0, title: 'Sunday Cashback', description: '20% Loss Cashback' },
    { day: 1, title: '100% Match', description: '100% Match up to $500' },
    { day: 2, title: '50 Free Spins', description: '50 Free Spins on your next deposit' },
    { day: 3, title: '75% + Free Spins', description: '75% Match + 25 Free Spins' },
    { day: 4, title: 'Double XP Day', description: '2x XP on all spins' },
    { day: 5, title: 'Weekend Warmup', description: '125% Match' },
    { day: 6, title: 'Saturday Super Spin', description: '150% Match up to $1000' }
  ];

  const STORAGE_KEY = 'bonusCountdown_dismissed';
  const DISMISS_DURATION = 4 * 60 * 60 * 1000; // 4 hours in milliseconds
  let countdownInterval = null;
  let banner = null;
  let timerElement = null;

  /**
   * Get the current day's offer
   */
  function getDailyOffer() {
    const day = new Date().getUTCDay();
    return DAILY_OFFERS[day];
  }

  /**
   * Calculate seconds remaining until midnight UTC
   */
  function getSecondsUntilMidnight() {
    const now = new Date();
    const utcNow = new Date(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds());
    const midnight = new Date(utcNow);
    midnight.setUTCDate(midnight.getUTCDate() + 1);
    midnight.setUTCHours(0, 0, 0, 0);

    return Math.floor((midnight - utcNow) / 1000);
  }

  /**
   * Format seconds as HH:MM:SS
   */
  function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  /**
   * Check if banner is currently dismissed
   */
  function isDismissed() {
    const dismissData = localStorage.getItem(STORAGE_KEY);
    if (!dismissData) return false;

    const dismissTime = parseInt(dismissData, 10);
    const now = Date.now();

    if (now - dismissTime > DISMISS_DURATION) {
      localStorage.removeItem(STORAGE_KEY);
      return false;
    }

    return true;
  }

  /**
   * Set banner as dismissed
   */
  function setDismissed() {
    localStorage.setItem(STORAGE_KEY, Date.now().toString());
  }

  /**
   * Update the countdown timer display
   */
  function updateTimer() {
    if (!timerElement) return;

    const secondsLeft = getSecondsUntilMidnight();
    const timeString = formatTime(secondsLeft);
    timerElement.textContent = timeString;

    // Add pulse class when under 1 hour
    if (secondsLeft < 3600) {
      if (!banner.classList.contains('pulse')) {
        banner.classList.add('pulse');
      }
    } else {
      banner.classList.remove('pulse');
    }

    // Reset offer if midnight has passed
    if (secondsLeft <= 0) {
      stopCountdown();
      init();
    }
  }

  /**
   * Start the countdown timer
   */
  function startCountdown() {
    if (countdownInterval) clearInterval(countdownInterval);
    updateTimer(); // Initial call
    countdownInterval = setInterval(updateTimer, 1000);
  }

  /**
   * Stop the countdown timer
   */
  function stopCountdown() {
    if (countdownInterval) {
      clearInterval(countdownInterval);
      countdownInterval = null;
    }
  }

  /**
   * Create the banner HTML
   */
  function createBanner() {
    const offer = getDailyOffer();
    const container = document.createElement('div');
    container.className = 'bonus-countdown-container';
    container.innerHTML = `
      <div class="bonus-countdown-banner">
        <div class="bonus-countdown-content">
          <div class="bonus-countdown-text">
            <span class="bonus-countdown-flame">🔥</span>
            <span class="bonus-countdown-title">Limited Time: ${offer.title}</span>
            <span class="bonus-countdown-separator">—</span>
            <span class="bonus-countdown-description">${offer.description}</span>
            <span class="bonus-countdown-expires">Expires in <span class="bonus-countdown-timer">00:00:00</span></span>
          </div>
          <button class="bonus-countdown-cta" aria-label="Deposit now">Deposit Now</button>
          <button class="bonus-countdown-close" aria-label="Dismiss bonus banner">✕</button>
        </div>
      </div>
      <style>
        .bonus-countdown-container {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 999;
          padding-top: 60px;
          pointer-events: none;
        }

        .bonus-countdown-banner {
          background: linear-gradient(135deg, #ff4444 0%, #ff8c00 50%, #ffaa00 100%);
          padding: 16px 20px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
          pointer-events: auto;
        }

        .bonus-countdown-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          max-width: 1200px;
          margin: 0 auto;
          flex-wrap: wrap;
        }

        .bonus-countdown-text {
          display: flex;
          align-items: center;
          gap: 8px;
          flex: 1;
          min-width: 300px;
          color: white;
          font-size: 16px;
          font-weight: 600;
          line-height: 1.4;
          flex-wrap: wrap;
        }

        .bonus-countdown-flame {
          font-size: 20px;
          animation: flame-flicker 1.5s infinite;
        }

        @keyframes flame-flicker {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }

        .bonus-countdown-title {
          font-weight: 700;
          color: #fff;
        }

        .bonus-countdown-separator {
          opacity: 0.8;
        }

        .bonus-countdown-description {
          font-size: 14px;
          opacity: 0.95;
        }

        .bonus-countdown-expires {
          font-size: 14px;
          opacity: 0.9;
          margin-left: auto;
        }

        .bonus-countdown-timer {
          font-weight: 700;
          font-family: 'Courier New', monospace;
          letter-spacing: 2px;
        }

        .bonus-countdown-cta {
          background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
          color: #000;
          border: none;
          padding: 12px 24px;
          border-radius: 6px;
          font-weight: 700;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.3s ease;
          white-space: nowrap;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        }

        .bonus-countdown-cta:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }

        .bonus-countdown-cta:active {
          transform: translateY(0);
        }

        .bonus-countdown-close {
          background: rgba(255, 255, 255, 0.2);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.3);
          width: 36px;
          height: 36px;
          border-radius: 50%;
          font-size: 20px;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          flex-shrink: 0;
        }

        .bonus-countdown-close:hover {
          background: rgba(255, 255, 255, 0.3);
          border-color: rgba(255, 255, 255, 0.5);
        }

        .bonus-countdown-close:active {
          background: rgba(255, 255, 255, 0.25);
        }

        /* Pulse animation when under 1 hour */
        .bonus-countdown-banner.pulse {
          animation: bonus-pulse 1.5s infinite;
        }

        @keyframes bonus-pulse {
          0%, 100% {
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
          }
          50% {
            box-shadow: 0 4px 24px rgba(255, 68, 68, 0.6), 0 0 20px rgba(255, 136, 0, 0.4);
          }
        }

        /* Mobile responsive */
        @media (max-width: 768px) {
          .bonus-countdown-container {
            padding-top: 50px;
          }

          .bonus-countdown-banner {
            padding: 12px 16px;
          }

          .bonus-countdown-content {
            gap: 12px;
            padding: 0 8px;
          }

          .bonus-countdown-text {
            min-width: auto;
            font-size: 14px;
            gap: 6px;
          }

          .bonus-countdown-flame {
            font-size: 18px;
          }

          .bonus-countdown-description {
            display: none;
          }

          .bonus-countdown-expires {
            margin-left: 0;
            width: 100%;
            font-size: 13px;
          }

          .bonus-countdown-cta {
            padding: 10px 16px;
            font-size: 13px;
            white-space: nowrap;
          }

          .bonus-countdown-close {
            width: 32px;
            height: 32px;
            font-size: 18px;
          }
        }

        @media (max-width: 480px) {
          .bonus-countdown-banner {
            padding: 10px 12px;
          }

          .bonus-countdown-content {
            gap: 8px;
            padding: 0 4px;
          }

          .bonus-countdown-text {
            font-size: 12px;
            gap: 4px;
          }

          .bonus-countdown-title {
            font-size: 13px;
          }

          .bonus-countdown-separator {
            display: none;
          }

          .bonus-countdown-expires {
            font-size: 12px;
          }

          .bonus-countdown-cta {
            padding: 8px 12px;
            font-size: 12px;
          }
        }
      </style>
    `;

    banner = container.querySelector('.bonus-countdown-banner');
    timerElement = container.querySelector('.bonus-countdown-timer');

    // Close button handler
    const closeBtn = container.querySelector('.bonus-countdown-close');
    closeBtn.addEventListener('click', function() {
      hide();
      setDismissed();
    });

    // CTA button handler
    const ctaBtn = container.querySelector('.bonus-countdown-cta');
    ctaBtn.addEventListener('click', function() {
      // Dispatch custom event for wallet/deposit modal
      const event = new CustomEvent('bonusCountdown:depositClick', {
        detail: { offer: getDailyOffer() }
      });
      document.dispatchEvent(event);

      // Fallback: attempt to open deposit modal if available
      if (window.WalletModal && typeof window.WalletModal.open === 'function') {
        window.WalletModal.open('deposit');
      } else if (window.DepositModal && typeof window.DepositModal.open === 'function') {
        window.DepositModal.open();
      } else {
        console.warn('BonusCountdown: No deposit modal handler found. Make sure WalletModal or DepositModal is initialized.');
      }
    });

    return container;
  }

  /**
   * Initialize and display the banner
   */
  function init() {
    // Don't show if dismissed
    if (isDismissed()) {
      return;
    }

    // Remove existing banner if present
    const existing = document.querySelector('.bonus-countdown-container');
    if (existing) {
      existing.remove();
    }

    // Create and insert new banner
    const newBanner = createBanner();
    document.body.insertBefore(newBanner, document.body.firstChild);

    // Start countdown
    startCountdown();
  }

  /**
   * Show the banner
   */
  function show() {
    const container = document.querySelector('.bonus-countdown-container');
    if (container) {
      container.style.display = '';
      startCountdown();
    } else {
      init();
    }
  }

  /**
   * Hide the banner
   */
  function hide() {
    const container = document.querySelector('.bonus-countdown-container');
    if (container) {
      container.style.display = 'none';
    }
    stopCountdown();
  }

  /**
   * Cleanup on page unload
   */
  function cleanup() {
    stopCountdown();
  }

  // Expose public API
  window.BonusCountdown = {
    init: init,
    show: show,
    hide: hide
  };

  // Cleanup on page unload
  window.addEventListener('beforeunload', cleanup);
})();
