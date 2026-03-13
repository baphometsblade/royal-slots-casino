/**
 * PWA Install Prompt Module
 * Manages the "Install Matrix Spins" native browser prompt and custom install banner
 * Features: engagement tracking, dismissal memory (7 days), standalone mode detection
 */

window.PwaInstall = (() => {
  // Private state
  let deferredPrompt = null;
  let installBannerShown = false;
  let engagementTime = 0;
  let spinCount = 0;
  const ENGAGEMENT_THRESHOLD = 60000; // 60 seconds in milliseconds
  const SPIN_THRESHOLD = 5;
  const DISMISSAL_STORAGE_KEY = 'pwa_install_dismissed_at';
  const DISMISSAL_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

  // CSS for install banner
  const bannerStyles = `
    .pwa-install-banner {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      border-top: 2px solid #fbbf24;
      padding: 16px;
      display: flex;
      align-items: center;
      gap: 16px;
      box-shadow: 0 -8px 32px rgba(251, 191, 36, 0.15);
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      animation: slideUp 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    }

    @media (min-width: 768px) {
      .pwa-install-banner {
        position: fixed;
        bottom: 24px;
        left: auto;
        right: 24px;
        width: 360px;
        border-radius: 12px;
        border: 1px solid rgba(251, 191, 36, 0.3);
        border-top: 2px solid #fbbf24;
      }
    }

    @keyframes slideUp {
      from {
        transform: translateY(100%);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }

    .pwa-install-banner__content {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .pwa-install-banner__icon {
      width: 48px;
      height: 48px;
      flex-shrink: 0;
      background: linear-gradient(135deg, #fbbf24, #f59e0b);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
    }

    .pwa-install-banner__text {
      flex: 1;
    }

    .pwa-install-banner__title {
      color: #fbbf24;
      font-weight: 600;
      font-size: 14px;
      margin: 0;
      line-height: 1.3;
    }

    .pwa-install-banner__buttons {
      display: flex;
      gap: 8px;
      align-items: center;
    }

    .pwa-install-banner__install-btn {
      background: linear-gradient(135deg, #fbbf24, #f59e0b);
      color: #0a0a1a;
      border: none;
      border-radius: 6px;
      padding: 8px 16px;
      font-weight: 600;
      font-size: 13px;
      cursor: pointer;
      transition: all 0.3s ease;
      white-space: nowrap;
    }

    .pwa-install-banner__install-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(251, 191, 36, 0.3);
    }

    .pwa-install-banner__install-btn:active {
      transform: translateY(0);
    }

    .pwa-install-banner__dismiss {
      background: none;
      border: none;
      color: #999;
      cursor: pointer;
      padding: 4px;
      font-size: 20px;
      line-height: 1;
      flex-shrink: 0;
      transition: color 0.2s ease;
    }

    .pwa-install-banner__dismiss:hover {
      color: #fbbf24;
    }

    @media (min-width: 768px) {
      .pwa-install-banner__dismiss {
        position: absolute;
        top: 8px;
        right: 8px;
      }

      .pwa-install-banner__buttons {
        margin-top: 8px;
      }
    }
  `;

  /**
   * Create and inject the banner styles into the document
   */
  function injectStyles() {
    if (document.querySelector('#pwa-install-styles')) {
      return;
    }

    const styleEl = document.createElement('style');
    styleEl.id = 'pwa-install-styles';
    styleEl.textContent = bannerStyles;
    document.head.appendChild(styleEl);
  }

  /**
   * Check if dismissal period is still active
   */
  function isDismissalActive() {
    const dismissedAt = localStorage.getItem(DISMISSAL_STORAGE_KEY);
    if (!dismissedAt) {
      return false;
    }

    const dismissTime = parseInt(dismissedAt, 10);
    const now = Date.now();
    return now - dismissTime < DISMISSAL_DURATION;
  }

  /**
   * Mark the install prompt as dismissed for 7 days
   */
  function markAsDismissed() {
    localStorage.setItem(DISMISSAL_STORAGE_KEY, Date.now().toString());
  }

  /**
   * Check if app is running in standalone mode (already installed)
   */
  function isStandaloneMode() {
    return window.navigator.standalone === true ||
           window.matchMedia('(display-mode: standalone)').matches;
  }

  /**
   * Create the install banner DOM element
   */
  function createBanner() {
    const banner = document.createElement('div');
    banner.className = 'pwa-install-banner';
    banner.setAttribute('role', 'alert');
    banner.setAttribute('aria-label', 'Install Matrix Spins application');

    banner.innerHTML = `
      <div class="pwa-install-banner__content">
        <div class="pwa-install-banner__icon" aria-hidden="true">
          ⬇️
        </div>
        <div class="pwa-install-banner__text">
          <p class="pwa-install-banner__title">Install Matrix Spins for a better experience</p>
        </div>
      </div>
      <div class="pwa-install-banner__buttons">
        <button class="pwa-install-banner__install-btn" data-action="install">
          Install
        </button>
        <button class="pwa-install-banner__dismiss" data-action="dismiss" aria-label="Dismiss">
          ✕
        </button>
      </div>
    `;

    return banner;
  }

  /**
   * Show the install banner
   */
  function showBanner() {
    if (installBannerShown || isDismissalActive() || isStandaloneMode() || !deferredPrompt) {
      return;
    }

    injectStyles();

    const banner = createBanner();
    document.body.appendChild(banner);
    installBannerShown = true;

    // Handle install button click
    banner.querySelector('[data-action="install"]').addEventListener('click', () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult) => {
          if (choiceResult.outcome === 'accepted') {
            console.warn('[PwaInstall] User accepted install prompt');
            removeBanner();
          } else {
            console.warn('[PwaInstall] User dismissed install prompt');
          }
          deferredPrompt = null;
        });
      }
    });

    // Handle dismiss button click
    banner.querySelector('[data-action="dismiss"]').addEventListener('click', () => {
      markAsDismissed();
      removeBanner();
      console.warn('[PwaInstall] User dismissed install banner (7-day cooldown applied)');
    });

    console.warn('[PwaInstall] Install banner displayed');
  }

  /**
   * Remove the install banner from the DOM
   */
  function removeBanner() {
    const banner = document.querySelector('.pwa-install-banner');
    if (banner) {
      banner.style.animation = 'slideUp 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94) reverse';
      setTimeout(() => {
        banner.remove();
        installBannerShown = false;
      }, 400);
    }
  }

  /**
   * Track user engagement (time + spin count)
   */
  function trackEngagement() {
    if (engagementTime === 0) {
      engagementTime = Date.now();
    }
  }

  /**
   * Check if engagement threshold has been met
   */
  function hasReachedEngagementThreshold() {
    if (spinCount >= SPIN_THRESHOLD) {
      return true;
    }

    if (engagementTime > 0) {
      const elapsed = Date.now() - engagementTime;
      if (elapsed >= ENGAGEMENT_THRESHOLD) {
        return true;
      }
    }

    return false;
  }

  /**
   * Attempt to show the banner if engagement threshold is met
   */
  function checkAndShowBanner() {
    if (hasReachedEngagementThreshold()) {
      showBanner();
    }
  }

  /**
   * Register a spin event (increments spin counter)
   */
  function recordSpin() {
    spinCount++;
    trackEngagement();
    checkAndShowBanner();
  }

  /**
   * Public API - Initialize PWA install prompt
   */
  function init() {
    // Skip initialization if already in standalone mode
    if (isStandaloneMode()) {
      console.warn('[PwaInstall] App running in standalone mode - install prompt disabled');
      return;
    }

    // Skip if dismissal is still active
    if (isDismissalActive()) {
      console.warn('[PwaInstall] Install prompt dismissed - will retry in 7 days');
      return;
    }

    // Capture beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      console.warn('[PwaInstall] beforeinstallprompt event captured');

      // Try to show banner immediately if engagement threshold is already met
      checkAndShowBanner();
    });

    // Track user engagement via click events
    document.addEventListener('click', trackEngagement, { passive: true });

    // Track user engagement via scroll events (debounced)
    let scrollTimeout;
    document.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(trackEngagement, 500);
    }, { passive: true });

    // Set up global spin tracking hook
    if (window.GameEngine && typeof window.GameEngine.onSpinComplete === 'function') {
      const originalOnSpinComplete = window.GameEngine.onSpinComplete;
      window.GameEngine.onSpinComplete = function(...args) {
        recordSpin();
        return originalOnSpinComplete.apply(this, args);
      };
    }

    // Fallback: Listen for custom spin events if available
    window.addEventListener('game:spin:complete', () => {
      recordSpin();
    });

    console.warn('[PwaInstall] PWA install module initialized');
  }

  // Public API
  return {
    init,
    // Expose for testing/manual control
    recordSpin,
    showBanner,
    removeBanner,
    isDismissalActive,
    isStandaloneMode
  };
})();
